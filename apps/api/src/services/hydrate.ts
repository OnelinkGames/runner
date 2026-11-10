import {
  aggregateStatus,
  pickOpenService,
  type Application,
  type ApplicationWithStatus,
  type Service,
  type ServiceWithStatus,
} from "@devdesk/shared";
import * as envVarRepo from "../db/env-vars.js";
import * as groupRepo from "../db/groups.js";
import * as processRepo from "../db/processes.js";
import * as serviceRepo from "../db/services.js";
import { listPm2Processes, mapPm2Status } from "../lib/pm2.js";
import { pm2NameFor } from "../lib/command.js";
import { resolveConfiguredPort } from "../lib/resolve-port.js";

export function hydrateService(
  service: Service,
  byName: Map<string | undefined, Awaited<ReturnType<typeof listPm2Processes>>[number]>,
): ServiceWithStatus {
  const name = pm2NameFor(service.id);
  const proc = byName.get(name);
  const cached = processRepo.getProcess(service.id);
  const liveStatus = proc ? mapPm2Status(proc.pm2_env?.status) : "stopped";
  const envVars = envVarRepo.listEnvVars(service.id);
  const configuredPort = resolveConfiguredPort(service, envVars);
  const livePort = liveStatus === "running" ? (cached?.currentPort ?? configuredPort) : configuredPort;

  if (proc || cached) {
    processRepo.upsertProcess({
      serviceId: service.id,
      pm2ProcessName: name,
      pid: proc?.pid && proc.pid > 0 ? proc.pid : null,
      status: liveStatus,
      currentPort: liveStatus === "running" ? livePort : cached?.currentPort ?? null,
      startedAt:
        liveStatus === "running"
          ? (cached?.startedAt ?? new Date().toISOString())
          : cached?.startedAt ?? null,
      errorMessage:
        liveStatus === "error"
          ? cached?.errorMessage ?? "A aplicação foi encerrada inesperadamente."
          : null,
    });
  }

  return {
    ...service,
    status: liveStatus,
    currentPort: livePort,
    configuredPort,
    pid: proc?.pid && proc.pid > 0 ? proc.pid : null,
    urlResolved: `http://localhost:${configuredPort}`,
    envVars,
    errorMessage:
      liveStatus === "error"
        ? cached?.errorMessage ?? "A aplicação foi encerrada inesperadamente."
        : null,
    iconUrl: `/api/services/${service.id}/icon?t=${encodeURIComponent(service.updatedAt)}`,
  };
}

export async function hydrateApplications(apps: Application[]): Promise<ApplicationWithStatus[]> {
  let pm2List: Awaited<ReturnType<typeof listPm2Processes>> = [];
  try {
    pm2List = await listPm2Processes();
  } catch {
    pm2List = [];
  }

  const byName = new Map(pm2List.map((proc) => [proc.name, proc]));
  const groups = new Map(groupRepo.listGroups().map((group) => [group.id, group.name]));

  return apps.map((app) => {
    const services = serviceRepo
      .listServices(app.id)
      .map((service) => hydrateService(service, byName));
    const status = aggregateStatus(services.map((service) => service.status));
    const running = services.filter((service) => service.status === "running");
    const primary = pickOpenService(services);
    const port = primary?.configuredPort ?? null;

    return {
      ...app,
      status,
      groupName: app.groupId ? groups.get(app.groupId) ?? null : null,
      urlResolved: port ? `http://localhost:${port}` : "",
      currentPort: port,
      runningCount: running.length,
      serviceCount: services.length,
      services,
      errorMessage: services.find((service) => service.errorMessage)?.errorMessage ?? null,
      iconUrl: `/api/applications/${app.id}/icon?t=${encodeURIComponent(app.updatedAt)}`,
    };
  });
}
