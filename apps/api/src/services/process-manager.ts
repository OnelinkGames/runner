import fs from "node:fs";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import type { FastifyReply } from "fastify";
import type { BulkActionResult, Service } from "@devdesk/shared";
import { AppError } from "../errors.js";
import * as applicationRepo from "../db/applications.js";
import * as envVarRepo from "../db/env-vars.js";
import * as processRepo from "../db/processes.js";
import * as serviceRepo from "../db/services.js";
import { parseCommand, pm2NameFor } from "../lib/command.js";
import { assertValidDirectory } from "../lib/directory.js";
import { readEnvFile, resolveEnvFilePath, upsertEnvFile } from "../lib/env-file.js";
import { findAvailablePort, isPortAvailable } from "../lib/port.js";
import { resolveConfiguredPort } from "../lib/resolve-port.js";
import {
  deletePm2,
  describePm2,
  getPm2LogPaths,
  mapPm2Status,
  startPm2,
  stopPm2,
} from "../lib/pm2.js";
import { getApplicationOrThrow, getServiceOrThrow } from "./application-service.js";

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilStopped(name: string, timeoutMs = 12_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const proc = await describePm2(name);
    const status = mapPm2Status(proc?.pm2_env?.status);
    if (!proc || status === "stopped" || status === "error") return;
    await wait(250);
  }
}

function inheritEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

function buildStartConfig(service: Service, port: number) {
  const parsed = parseCommand(service.command);
  const env: Record<string, string> = inheritEnv();
  const envPath = resolveEnvFilePath(service.directory, service.envFile);
  for (const item of readEnvFile(envPath).entries) {
    env[item.key] = item.value;
  }
  for (const item of envVarRepo.listEnvVars(service.id)) {
    env[item.key] = item.value;
  }

  const args = [...parsed.args];

  if (service.portConfig === "env") {
    const key = service.portConfigKey || "PORT";
    env[key] = String(port);
  } else if (service.portConfig === "arg") {
    const flag = service.portConfigKey || "--port";
    args.push(flag, String(port));
  }

  return {
    name: pm2NameFor(service.id),
    script: parsed.script,
    args: args.join(" "),
    cwd: service.directory,
    interpreter: "none",
    exec_mode: "fork",
    autorestart: false,
    env,
  };
}

async function resolvePort(service: Service): Promise<number> {
  const configured =
    service.portConfig === "arg"
      ? service.port
      : resolveConfiguredPort(service, envVarRepo.listEnvVars(service.id));
  const available = await isPortAvailable(configured);
  if (available) return configured;

  if (service.autoPort && service.portConfig !== "none") {
    return findAvailablePort(configured);
  }

  throw new AppError(
    409,
    `A porta ${configured} está sendo utilizada por outro processo.`,
    "PORT_IN_USE",
  );
}

function syncPortToEnvFile(service: Service, port: number): void {
  if (!service.syncEnvFile) return;
  const updates: Record<string, string> = {};
  for (const item of envVarRepo.listEnvVars(service.id)) {
    updates[item.key] = item.value;
  }
  if (service.portConfig === "env") {
    updates[service.portConfigKey || "PORT"] = String(port);
  } else {
    updates.PORT = String(port);
  }
  upsertEnvFile(resolveEnvFilePath(service.directory, service.envFile), updates);
}

export async function startService(serviceId: number) {
  const service = getServiceOrThrow(serviceId);

  try {
    assertValidDirectory(service.directory);
  } catch {
    throw new AppError(
      400,
      "Não foi possível iniciar a aplicação.\n\nO diretório configurado não existe.",
      "DIRECTORY_MISSING",
    );
  }

  const name = pm2NameFor(service.id);
  const existing = await describePm2(name);
  if (existing && mapPm2Status(existing.pm2_env?.status) === "running") {
    return getApplicationOrThrow(service.applicationId);
  }

  const port = await resolvePort(service);
  processRepo.upsertProcess({
    serviceId: service.id,
    pm2ProcessName: name,
    pid: null,
    status: "starting",
    currentPort: port,
    startedAt: null,
    errorMessage: null,
  });
  try {
    syncPortToEnvFile(service, port);
  } catch {
    throw new AppError(
      500,
      `Não foi possível atualizar o arquivo ${service.envFile} com a porta ${port}.`,
      "ENV_WRITE_FAILED",
    );
  }
  await deletePm2(name);
  const config = buildStartConfig(service, port);

  try {
    const proc = await startPm2(config);
    const status = mapPm2Status(proc?.pm2_env?.status);
    if (status === "error" || status === "stopped") {
      throw new AppError(
        500,
        "Não foi possível iniciar a aplicação.\n\nO comando retornou um erro.",
        "START_FAILED",
      );
    }

    processRepo.upsertProcess({
      serviceId: service.id,
      pm2ProcessName: name,
      pid: proc?.pid && proc.pid > 0 ? proc.pid : null,
      status: status === "starting" ? "starting" : "running",
      currentPort: port,
      startedAt: new Date().toISOString(),
      errorMessage: null,
    });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Não foi possível iniciar a aplicação.\n\nO comando retornou um erro.";
    processRepo.upsertProcess({
      serviceId: service.id,
      pm2ProcessName: name,
      pid: null,
      status: "error",
      currentPort: port,
      startedAt: null,
      errorMessage: message,
    });
    if (error instanceof AppError) throw error;
    throw new AppError(500, message, "START_FAILED");
  }

  return getApplicationOrThrow(service.applicationId);
}

export async function stopService(serviceId: number) {
  const service = getServiceOrThrow(serviceId);
  const name = pm2NameFor(service.id);

  processRepo.upsertProcess({
    serviceId: service.id,
    pm2ProcessName: name,
    pid: null,
    status: "stopping",
    currentPort: processRepo.getProcess(service.id)?.currentPort ?? service.port,
    startedAt: processRepo.getProcess(service.id)?.startedAt ?? null,
    errorMessage: null,
  });

  await stopPm2(name);
  await waitUntilStopped(name);
  await deletePm2(name);

  processRepo.upsertProcess({
    serviceId: service.id,
    pm2ProcessName: name,
    pid: null,
    status: "stopped",
    currentPort: service.port,
    startedAt: null,
    errorMessage: null,
  });

  return getApplicationOrThrow(service.applicationId);
}

export async function restartService(serviceId: number) {
  await stopService(serviceId);
  return startService(serviceId);
}

export async function startApplication(id: number) {
  const app = applicationRepo.getApplication(id);
  if (!app) {
    throw new AppError(404, "Aplicação não encontrada.", "NOT_FOUND");
  }
  const services = serviceRepo.listServices(id).filter((service) => service.enabled);
  if (services.length === 0) {
    throw new AppError(400, "Esta aplicação não possui serviços habilitados.", "NO_SERVICES");
  }
  for (const service of services) {
    await startService(service.id);
  }
  return getApplicationOrThrow(id);
}

export async function stopApplication(id: number) {
  const app = applicationRepo.getApplication(id);
  if (!app) {
    throw new AppError(404, "Aplicação não encontrada.", "NOT_FOUND");
  }
  for (const service of serviceRepo.listServices(id)) {
    await stopService(service.id);
  }
  return getApplicationOrThrow(id);
}

export async function restartApplication(id: number) {
  await stopApplication(id);
  return startApplication(id);
}

export async function startMany(ids: number[]): Promise<BulkActionResult[]> {
  const results: BulkActionResult[] = [];
  for (const id of ids) {
    try {
      const app = await startApplication(id);
      results.push({ id, ok: true, port: app.currentPort ?? undefined });
    } catch (error) {
      results.push({
        id,
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao iniciar.",
      });
    }
  }
  return results;
}

export async function stopMany(ids: number[]): Promise<BulkActionResult[]> {
  const results: BulkActionResult[] = [];
  for (const id of ids) {
    try {
      await stopApplication(id);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({
        id,
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao parar.",
      });
    }
  }
  return results;
}

export async function startAll(): Promise<BulkActionResult[]> {
  return startMany(applicationRepo.listApplications().map((app) => app.id));
}

export async function stopAll(): Promise<BulkActionResult[]> {
  return stopMany(applicationRepo.listApplications().map((app) => app.id));
}

export async function startGroup(groupId: number): Promise<BulkActionResult[]> {
  return startMany(applicationRepo.listApplicationsByGroup(groupId).map((app) => app.id));
}

export async function stopGroup(groupId: number): Promise<BulkActionResult[]> {
  return stopMany(applicationRepo.listApplicationsByGroup(groupId).map((app) => app.id));
}

export async function autoStartApplications(): Promise<void> {
  const services = serviceRepo.listAutoStartServices();
  for (const service of services) {
    try {
      await startService(service.id);
    } catch (error) {
      console.error(`[devdesk] Falha no auto-start de ${service.name}:`, error);
    }
  }
}

export async function readLogs(serviceId: number, lines = 200): Promise<string> {
  getServiceOrThrow(serviceId);
  const name = pm2NameFor(serviceId);
  const proc = await describePm2(name);
  const paths = getPm2LogPaths(proc);
  const chunks: string[] = [];

  if (paths.out && fs.existsSync(paths.out)) {
    chunks.push(await tailFile(paths.out, lines));
  }
  if (paths.err && fs.existsSync(paths.err)) {
    const errTail = await tailFile(paths.err, Math.min(80, lines));
    if (errTail.trim()) chunks.push(errTail);
  }

  if (chunks.length === 0) {
    return "Nenhum log disponível ainda. Inicie o serviço para gerar logs.";
  }

  return chunks.join("\n");
}

export async function streamLogs(serviceId: number, reply: FastifyReply): Promise<void> {
  getServiceOrThrow(serviceId);
  const name = pm2NameFor(serviceId);
  const proc = await describePm2(name);
  const paths = getPm2LogPaths(proc);
  const targets = [paths.out, paths.err].filter((value): value is string =>
    Boolean(value && fs.existsSync(value)),
  );

  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const watchers: fs.FSWatcher[] = [];
  const positions = new Map<string, number>();

  const send = (line: string) => {
    reply.raw.write(`data: ${JSON.stringify(line)}\n\n`);
  };

  if (targets.length === 0) {
    send("Nenhum log disponível ainda. Inicie o serviço para gerar logs.");
  }

  for (const file of targets) {
    const initial = await tailFile(file, 120);
    for (const line of initial.split("\n")) {
      if (line) send(line);
    }
    positions.set(file, fs.statSync(file).size);
    const watcher = fs.watch(file, () => {
      try {
        const size = fs.statSync(file).size;
        const last = positions.get(file) ?? 0;
        if (size < last) {
          positions.set(file, size);
          return;
        }
        const fd = fs.openSync(file, "r");
        const length = size - last;
        const buffer = Buffer.alloc(length);
        fs.readSync(fd, buffer, 0, length, last);
        fs.closeSync(fd);
        positions.set(file, size);
        for (const line of buffer.toString("utf8").split("\n")) {
          if (line) send(line);
        }
      } catch {
        // ignore truncated/rotated logs
      }
    });
    watchers.push(watcher);
  }

  const heartbeat = setInterval(() => {
    reply.raw.write(": ping\n\n");
  }, 15_000);

  reply.raw.on("close", () => {
    clearInterval(heartbeat);
    for (const watcher of watchers) watcher.close();
  });
}

async function tailFile(filePath: string, maxLines: number): Promise<string> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const buffer: string[] = [];
  for await (const line of rl) {
    buffer.push(line);
    if (buffer.length > maxLines) buffer.shift();
  }
  return buffer.join("\n");
}
