import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pickOpenService } from "@devdesk/shared";
import { AppError } from "../errors.js";
import { applicationInputSchema } from "../services/application-service.js";
import * as applicationService from "../services/application-service.js";
import * as processManager from "../services/process-manager.js";
import * as iconService from "../services/icon-service.js";
import { assertValidDirectory } from "../lib/directory.js";
import { openApplicationUrl } from "../lib/open-url.js";

export async function registerApplicationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/applications", async () => {
    return applicationService.listApplications();
  });

  app.get("/api/applications/:id", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return applicationService.getApplicationOrThrow(id);
  });

  app.post("/api/applications", async (request, reply) => {
    const parsed = applicationInputSchema.parse(request.body);
    const created = await applicationService.createApplication(parsed);
    return reply.code(201).send(created);
  });

  app.put("/api/applications/:id", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = applicationInputSchema.parse(request.body);
    return applicationService.updateApplication(id, parsed);
  });

  app.delete("/api/applications/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    await applicationService.removeApplication(id);
    return reply.code(204).send();
  });

  app.get("/api/applications/:id/icon", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    await iconService.sendApplicationIcon(id, reply);
    return reply;
  });

  app.post("/api/applications/:id/start", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return processManager.startApplication(id);
  });

  app.post("/api/applications/:id/stop", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return processManager.stopApplication(id);
  });

  app.post("/api/applications/:id/restart", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return processManager.restartApplication(id);
  });

  app.post("/api/applications/:id/open", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const appRecord = await applicationService.getApplicationOrThrow(id);
    const target = pickOpenService(appRecord.services);
    if (!target) {
      throw new AppError(400, "Nenhum serviço com URL para abrir.", "NO_URL");
    }
    const url = appRecord.urlResolved || target.urlResolved;
    if (!url) {
      throw new AppError(400, "Nenhum serviço com URL para abrir.", "NO_URL");
    }
    await openApplicationUrl(url, {
      asApp: appRecord.openAsApp,
      className: `DevDeskApp-${appRecord.id}`,
    });
    return { ok: true, url };
  });

  app.post("/api/applications/start-many", async (request) => {
    const ids = parseIds(request.body);
    return processManager.startMany(ids);
  });

  app.post("/api/applications/stop-many", async (request) => {
    const ids = parseIds(request.body);
    return processManager.stopMany(ids);
  });

  app.post("/api/applications/start-all", async () => processManager.startAll());
  app.post("/api/applications/stop-all", async () => processManager.stopAll());

  app.post("/api/services/:id/start", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return processManager.startService(id);
  });

  app.post("/api/services/:id/stop", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return processManager.stopService(id);
  });

  app.post("/api/services/:id/restart", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return processManager.restartService(id);
  });

  app.post("/api/services/:id/open", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const service = applicationService.getServiceOrThrow(id);
    const appRecord = await applicationService.getApplicationOrThrow(service.applicationId);
    const live = appRecord.services.find((item) => item.id === id);
    const resolved = live?.urlResolved ?? appRecord.urlResolved ?? `http://localhost:${live?.configuredPort ?? service.port}`;
    await openApplicationUrl(resolved, {
      asApp: appRecord.openAsApp,
      className: `DevDeskApp-${appRecord.id}`,
    });
    return { ok: true, url: resolved };
  });

  app.post("/api/services/:id/open-folder", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const service = applicationService.getServiceOrThrow(id);
    assertValidDirectory(service.directory);
    const { default: open } = await import("open");
    await open(service.directory);
    return { ok: true, path: service.directory };
  });

  app.get("/api/services/:id/icon", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    await iconService.sendServiceIcon(id, reply);
    return reply;
  });

  app.get("/api/services/:id/logs", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const lines = Number((request.query as { lines?: string }).lines ?? 200);
    const content = await processManager.readLogs(id, Number.isFinite(lines) ? lines : 200);
    return { content };
  });

  app.get("/api/services/:id/logs/stream", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    await processManager.streamLogs(id, reply);
    return reply;
  });

  app.get("/api/services/:id/env-file", async (request) => {
    const id = Number((request.params as { id: string }).id);
    return applicationService.readServiceEnvFile(id);
  });

  app.put("/api/services/:id/env-file", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = z
      .object({
        entries: z.array(z.object({ key: z.string(), value: z.string() })),
      })
      .parse(request.body);
    return applicationService.writeServiceEnvFile(id, parsed.entries);
  });
}

function parseIds(body: unknown): number[] {
  const ids = (body as { ids?: unknown })?.ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "number")) {
    throw new AppError(400, "Informe a lista de aplicações.", "INVALID_IDS");
  }
  return ids;
}
