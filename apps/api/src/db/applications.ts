import type { Application } from "@devdesk/shared";
import { getDb } from "./index.js";
import { mapApplication, type ApplicationRow } from "./mappers.js";

const SELECT = `
  SELECT id, name, description, group_id, run_mode, auto_start, icon_path, open_as_app,
         created_at, updated_at
  FROM applications
`;

export function listApplications(): Application[] {
  const rows = getDb().prepare(`${SELECT} ORDER BY name COLLATE NOCASE`).all() as ApplicationRow[];
  return rows.map(mapApplication);
}

export function getApplication(id: number): Application | null {
  const row = getDb().prepare(`${SELECT} WHERE id = ?`).get(id) as ApplicationRow | undefined;
  return row ? mapApplication(row) : null;
}

export function createApplication(input: {
  name: string;
  description: string | null;
  groupId: number | null;
  runMode: "single" | "services";
  autoStart: boolean;
  iconPath: string | null;
  openAsApp: boolean;
}): Application {
  const result = getDb()
    .prepare(
      `INSERT INTO applications (
        name, description, group_id, run_mode, auto_start, icon_path, open_as_app
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.description,
      input.groupId,
      input.runMode,
      input.autoStart ? 1 : 0,
      input.iconPath,
      input.openAsApp ? 1 : 0,
    );

  return getApplication(Number(result.lastInsertRowid))!;
}

export function updateApplication(
  id: number,
  input: {
    name: string;
    description: string | null;
    groupId: number | null;
    runMode: "single" | "services";
    autoStart: boolean;
    iconPath: string | null;
    openAsApp: boolean;
  },
): Application {
  getDb()
    .prepare(
      `UPDATE applications SET
        name = ?, description = ?, group_id = ?, run_mode = ?, auto_start = ?, icon_path = ?,
        open_as_app = ?, updated_at = datetime('now')
      WHERE id = ?`,
    )
    .run(
      input.name,
      input.description,
      input.groupId,
      input.runMode,
      input.autoStart ? 1 : 0,
      input.iconPath,
      input.openAsApp ? 1 : 0,
      id,
    );

  return getApplication(id)!;
}

export function deleteApplication(id: number): void {
  getDb().prepare("DELETE FROM applications WHERE id = ?").run(id);
}

export function listApplicationsByGroup(groupId: number): Application[] {
  const rows = getDb()
    .prepare(`${SELECT} WHERE group_id = ? ORDER BY name COLLATE NOCASE`)
    .all(groupId) as ApplicationRow[];
  return rows.map(mapApplication);
}
