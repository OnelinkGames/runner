import type { Service, ServiceInput } from "@devdesk/shared";
import { getDb } from "./index.js";
import { mapService, type ServiceRow } from "./mappers.js";

const SELECT = `
  SELECT id, application_id, name, directory, command, port, url, auto_port, port_config,
         port_config_key, auto_start, enabled, open_in_browser, env_file, sync_env_file,
         sort_order, created_at, updated_at
  FROM services
`;

export function listServices(applicationId: number): Service[] {
  const rows = getDb()
    .prepare(`${SELECT} WHERE application_id = ? ORDER BY sort_order, id`)
    .all(applicationId) as ServiceRow[];
  return rows.map(mapService);
}

export function listAllServices(): Service[] {
  const rows = getDb().prepare(`${SELECT} ORDER BY application_id, sort_order, id`).all() as ServiceRow[];
  return rows.map(mapService);
}

export function getService(id: number): Service | null {
  const row = getDb().prepare(`${SELECT} WHERE id = ?`).get(id) as ServiceRow | undefined;
  return row ? mapService(row) : null;
}

export type ServiceRecord = {
  name: string;
  directory: string;
  command: string;
  port: number;
  url: string | null;
  autoPort: boolean;
  portConfig: string;
  portConfigKey: string;
  autoStart: boolean;
  enabled: boolean;
  openInBrowser: boolean;
  envFile: string;
  syncEnvFile: boolean;
};

export function createService(applicationId: number, input: ServiceRecord, sortOrder: number): Service {
  const result = getDb()
    .prepare(
      `INSERT INTO services (
        application_id, name, directory, command, port, url, auto_port, port_config,
        port_config_key, auto_start, enabled, open_in_browser, env_file, sync_env_file, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      applicationId,
      input.name,
      input.directory,
      input.command,
      input.port,
      input.url,
      input.autoPort ? 1 : 0,
      input.portConfig,
      input.portConfigKey,
      input.autoStart ? 1 : 0,
      input.enabled ? 1 : 0,
      input.openInBrowser ? 1 : 0,
      input.envFile,
      input.syncEnvFile ? 1 : 0,
      sortOrder,
    );

  return getService(Number(result.lastInsertRowid))!;
}

export function updateService(id: number, input: ServiceRecord, sortOrder: number): Service {
  getDb()
    .prepare(
      `UPDATE services SET
        name = ?, directory = ?, command = ?, port = ?, url = ?, auto_port = ?, port_config = ?,
        port_config_key = ?, auto_start = ?, enabled = ?, open_in_browser = ?, env_file = ?,
        sync_env_file = ?, sort_order = ?, updated_at = datetime('now')
      WHERE id = ?`,
    )
    .run(
      input.name,
      input.directory,
      input.command,
      input.port,
      input.url,
      input.autoPort ? 1 : 0,
      input.portConfig,
      input.portConfigKey,
      input.autoStart ? 1 : 0,
      input.enabled ? 1 : 0,
      input.openInBrowser ? 1 : 0,
      input.envFile,
      input.syncEnvFile ? 1 : 0,
      sortOrder,
      id,
    );

  return getService(id)!;
}

export function deleteService(id: number): void {
  getDb().prepare("DELETE FROM services WHERE id = ?").run(id);
}

export function listAutoStartServices(): Service[] {
  const rows = getDb()
    .prepare(
      `${SELECT}
       WHERE enabled = 1 AND (
         auto_start = 1 OR application_id IN (SELECT id FROM applications WHERE auto_start = 1)
       )
       ORDER BY application_id, sort_order, id`,
    )
    .all() as ServiceRow[];
  return rows.map(mapService);
}

export function normalizeServiceInput(input: ServiceInput): ServiceRecord {
  return {
    name: input.name.trim(),
    directory: input.directory.trim(),
    command: input.command.trim(),
    port: input.port,
    url: input.url?.trim() || null,
    autoPort: input.autoPort ?? false,
    portConfig: input.portConfig ?? "none",
    portConfigKey:
      input.portConfigKey?.trim() || (input.portConfig === "arg" ? "--port" : "PORT"),
    autoStart: input.autoStart ?? false,
    enabled: input.enabled ?? true,
    openInBrowser: input.openInBrowser ?? true,
    envFile: input.envFile?.trim() || ".env",
    syncEnvFile: input.syncEnvFile ?? false,
  };
}
