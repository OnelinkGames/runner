import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import { getSettings, settingsPatchSchema, updateSettings } from "../services/settings-service.js";
import { validateDirectory } from "../lib/directory.js";
import { assertSafeEnvFileName, readEnvFile, resolveEnvFilePath } from "../lib/env-file.js";
import { pickDirectory, pickImageFile } from "../lib/folder-picker.js";
import { listProjectIcons, assertSafeIconFile } from "../lib/favicon.js";
import { isPortAvailable } from "../lib/port.js";
import { AppError } from "../errors.js";
import { z } from "zod";
import { scheduleDevdeskShutdown } from "../lib/shutdown.js";

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/settings", async () => getSettings());

  app.put("/api/settings", async (request) => {
    const parsed = settingsPatchSchema.parse(request.body);
    return updateSettings(parsed);
  });
}

export async function registerUtilityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({ ok: true, service: "devdesk-api" }));

  app.post("/api/shutdown", async () => {
    scheduleDevdeskShutdown();
    return { ok: true };
  });

  app.post("/api/directories/pick", async (request) => {
    const parsed = z.object({ initialDir: z.string().optional() }).parse(request.body ?? {});
    const selected = await pickDirectory(parsed.initialDir);
    return { path: selected, canceled: !selected };
  });

  app.post("/api/icons/scan", async (request) => {
    const parsed = z.object({ directories: z.array(z.string()).default([]) }).parse(request.body ?? {});
    return { icons: listProjectIcons(parsed.directories) };
  });

  app.post("/api/icons/pick", async (request) => {
    const parsed = z.object({ initialDir: z.string().optional() }).parse(request.body ?? {});
    const selected = await pickImageFile(parsed.initialDir);
    if (selected) assertSafeIconFile(selected);
    return { path: selected, canceled: !selected };
  });

  app.get("/api/icons/preview", async (request, reply) => {
    const parsed = z.object({ path: z.string().min(1) }).parse(request.query);
    const hit = assertSafeIconFile(parsed.path);
    reply.header("Cache-Control", "no-cache");
    return reply.type(hit.contentType).send(fs.readFileSync(hit.filePath));
  });

  app.post("/api/directories/validate", async (request) => {
    const parsed = z.object({ path: z.string() }).parse(request.body);
    return validateDirectory(parsed.path);
  });

  app.post("/api/env-files/preview", async (request) => {
    const parsed = z
      .object({
        directory: z.string().min(1),
        envFile: z.string().optional(),
      })
      .parse(request.body);
    const dir = validateDirectory(parsed.directory);
    if (!dir.valid) {
      throw new AppError(400, dir.message ?? "Diretório inválido.", "DIRECTORY_MISSING");
    }
    const fileName = assertSafeEnvFileName(parsed.envFile || ".env");
    const filePath = resolveEnvFilePath(parsed.directory, fileName);
    const file = readEnvFile(filePath);
    return { path: filePath, exists: file.exists, entries: file.entries };
  });

  app.get("/api/ports/check", async (request) => {
    const port = Number((request.query as { port?: string }).port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new AppError(400, "A porta deve estar entre 1 e 65535.", "INVALID_PORT");
    }
    const available = await isPortAvailable(port);
    return { port, available };
  });
}
