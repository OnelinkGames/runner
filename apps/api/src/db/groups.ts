import type { Group } from "@devdesk/shared";
import { getDb } from "./index.js";
import { mapGroup, type GroupRow } from "./mappers.js";

export function listGroups(): Group[] {
  const rows = getDb()
    .prepare("SELECT id, name, created_at FROM groups ORDER BY name COLLATE NOCASE")
    .all() as GroupRow[];
  return rows.map(mapGroup);
}

export function getGroup(id: number): Group | null {
  const row = getDb()
    .prepare("SELECT id, name, created_at FROM groups WHERE id = ?")
    .get(id) as GroupRow | undefined;
  return row ? mapGroup(row) : null;
}

export function createGroup(name: string): Group {
  const result = getDb().prepare("INSERT INTO groups (name) VALUES (?)").run(name);
  return getGroup(Number(result.lastInsertRowid))!;
}

export function updateGroup(id: number, name: string): Group {
  getDb().prepare("UPDATE groups SET name = ? WHERE id = ?").run(name, id);
  return getGroup(id)!;
}

export function deleteGroup(id: number): void {
  getDb().prepare("DELETE FROM groups WHERE id = ?").run(id);
}
