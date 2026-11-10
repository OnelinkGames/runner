import { z } from "zod";
import type { ApplicationInput, ApplicationWithStatus, EnvFilePayload } from "@devdesk/shared";
import { AppError } from "../errors.js";
import * as applicationRepo from "../db/applications.js";
import * as envVarRepo from "../db/env-vars.js";
import { getGroup } from "../db/groups.js";
import * as serviceRepo from "../db/services.js";
import { assertValidDirectory } from "../lib/directory.js";
import { assertSafeEnvFileName, readEnvFile, resolveEnvFilePath, writeEnvFile } from "../lib/env-file.js";
import { assertSafeIconFile } from "../lib/favicon.js";
import { deletePm2 } from "../lib/pm2.js";
import { pm2NameFor } from "../lib/command.js";
import { hydrateApplications } from "./hydrate.js";

const envVarSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

function asOptionalPositiveId(value: unknown): number | undefined {
  if (value == null || value === "" || value === "none") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export const serviceInputSchema = z.object({
  id: z.preprocess(asOptionalPositiveId, z.number().int().positive().optional()),
  name: z.string().trim().min(1, "O nome do serviço não pode estar vazio."),
  directory: z.string().trim().min(1, "A pasta informada não foi encontrada."),
  command: z.string().trim().min(1, "O comando não pode estar vazio."),
  port: z.number().int().min(1).max(65535, "A porta deve estar entre 1 e 65535."),
  url: z.string().trim().nullable().optional(),
  autoPort: z.boolean().optional(),
  portConfig: z.enum(["none", "env", "arg"]).optional(),
  portConfigKey: z.string().trim().optional(),
  autoStart: z.boolean().optional(),
  enabled: z.boolean().optional(),
  openInBrowser: z.boolean().optional(),
  envFile: z.string().trim().optional(),
  syncEnvFile: z.boolean().optional(),
  envVars: z.array(envVarSchema).optional(),
});

export const applicationInputSchema = z.object({
  name: z.string().trim().min(1, "O nome não pode estar vazio."),
  description: z.string().trim().nullable().optional(),
  groupId: z.preprocess(
    (value) => asOptionalPositiveId(value) ?? null,
    z.number().int().positive().nullable().optional(),
  ),
  runMode: z.enum(["single", "services"]).optional(),
  autoStart: z.boolean().optional(),
  iconPath: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (typeof value === "string" && value.length === 0 ? null : value)),
  openAsApp: z.boolean().optional(),
  services: z.array(serviceInputSchema).min(1, "Informe pelo menos um serviço ou comando."),
});

function normalizeApplication(input: ApplicationInput) {
  if (input.groupId) {
    const group = getGroup(input.groupId);
    if (!group) {
      throw new AppError(400, "O grupo informado não existe.", "GROUP_NOT_FOUND");
    }
  }

  const runMode = input.runMode ?? (input.services.length > 1 ? "services" : "single");
  const services = runMode === "single" ? input.services.slice(0, 1) : input.services;

  for (const service of services) {
    assertValidDirectory(service.directory);
    assertSafeEnvFileName(service.envFile?.trim() || ".env");
  }

  const iconPath = input.iconPath?.trim() || null;
  if (iconPath) assertSafeIconFile(iconPath);

  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    groupId: input.groupId ?? null,
    runMode,
    autoStart: input.autoStart ?? false,
    iconPath,
    openAsApp: input.openAsApp ?? true,
    services,
  };
}

export async function listApplications(): Promise<ApplicationWithStatus[]> {
  return hydrateApplications(applicationRepo.listApplications());
}

export async function getApplicationOrThrow(id: number): Promise<ApplicationWithStatus> {
  const app = applicationRepo.getApplication(id);
  if (!app) {
    throw new AppError(404, "Aplicação não encontrada.", "NOT_FOUND");
  }
  const [hydrated] = await hydrateApplications([app]);
  return hydrated;
}

async function syncServices(applicationId: number, inputs: ApplicationInput["services"]): Promise<void> {
  const existing = serviceRepo.listServices(applicationId);
  const keptIds = new Set<number>();

  for (const [index, input] of inputs.entries()) {
    const record = serviceRepo.normalizeServiceInput(input);
    if (input.id && existing.some((item) => item.id === input.id)) {
      serviceRepo.updateService(input.id, record, index);
      envVarRepo.replaceEnvVars(input.id, input.envVars ?? []);
      keptIds.add(input.id);
    } else {
      const created = serviceRepo.createService(applicationId, record, index);
      envVarRepo.replaceEnvVars(created.id, input.envVars ?? []);
      keptIds.add(created.id);
    }
  }

  for (const service of existing) {
    if (!keptIds.has(service.id)) {
      await deletePm2(pm2NameFor(service.id));
      serviceRepo.deleteService(service.id);
    }
  }
}

export async function createApplication(input: ApplicationInput): Promise<ApplicationWithStatus> {
  const data = normalizeApplication(input);
  const created = applicationRepo.createApplication(data);
  await syncServices(created.id, data.services);
  return getApplicationOrThrow(created.id);
}

export async function updateApplication(
  id: number,
  input: ApplicationInput,
): Promise<ApplicationWithStatus> {
  const existing = applicationRepo.getApplication(id);
  if (!existing) {
    throw new AppError(404, "Aplicação não encontrada.", "NOT_FOUND");
  }
  const data = normalizeApplication(input);
  applicationRepo.updateApplication(id, data);
  await syncServices(id, data.services);
  return getApplicationOrThrow(id);
}

export async function removeApplication(id: number): Promise<void> {
  const existing = applicationRepo.getApplication(id);
  if (!existing) {
    throw new AppError(404, "Aplicação não encontrada.", "NOT_FOUND");
  }
  for (const service of serviceRepo.listServices(id)) {
    await deletePm2(pm2NameFor(service.id));
  }
  applicationRepo.deleteApplication(id);
}

export function getServiceOrThrow(id: number) {
  const service = serviceRepo.getService(id);
  if (!service) {
    throw new AppError(404, "Serviço não encontrado.", "NOT_FOUND");
  }
  return service;
}

export function readServiceEnvFile(serviceId: number): EnvFilePayload {
  const service = getServiceOrThrow(serviceId);
  const filePath = resolveEnvFilePath(service.directory, service.envFile);
  const file = readEnvFile(filePath);
  return {
    path: filePath,
    exists: file.exists,
    entries: file.entries,
  };
}

export function writeServiceEnvFile(
  serviceId: number,
  entries: { key: string; value: string }[],
): EnvFilePayload {
  const service = getServiceOrThrow(serviceId);
  assertValidDirectory(service.directory);
  const filePath = resolveEnvFilePath(service.directory, service.envFile);
  writeEnvFile(filePath, entries);
  return readServiceEnvFile(serviceId);
}
