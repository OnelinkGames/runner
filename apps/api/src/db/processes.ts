import type { ApplicationStatus, ProcessState } from "@devdesk/shared";
import { getDb } from "./index.js";
import { mapProcess, type ProcessRow } from "./mappers.js";

export function getProcess(serviceId: number): ProcessState | null {
  const row = getDb()
    .prepare(
      `SELECT id, service_id, pm2_process_name, pid, status, current_port,
              started_at, error_message, updated_at
       FROM service_processes WHERE service_id = ?`,
    )
    .get(serviceId) as ProcessRow | undefined;
  return row ? mapProcess(row) : null;
}

export function upsertProcess(state: {
  serviceId: number;
  pm2ProcessName: string;
  pid: number | null;
  status: ApplicationStatus;
  currentPort: number | null;
  startedAt: string | null;
  errorMessage: string | null;
}): ProcessState {
  getDb()
    .prepare(
      `INSERT INTO service_processes (
         service_id, pm2_process_name, pid, status, current_port,
         started_at, error_message, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(service_id) DO UPDATE SET
         pm2_process_name = excluded.pm2_process_name,
         pid = excluded.pid,
         status = excluded.status,
         current_port = excluded.current_port,
         started_at = excluded.started_at,
         error_message = excluded.error_message,
         updated_at = datetime('now')`,
    )
    .run(
      state.serviceId,
      state.pm2ProcessName,
      state.pid,
      state.status,
      state.currentPort,
      state.startedAt,
      state.errorMessage,
    );

  return getProcess(state.serviceId)!;
}

export function deleteProcess(serviceId: number): void {
  getDb().prepare("DELETE FROM service_processes WHERE service_id = ?").run(serviceId);
}
