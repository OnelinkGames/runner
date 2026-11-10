import type { ServiceEnvVar } from "@devdesk/shared";
import { getDb } from "./index.js";
import { mapEnvVar, type EnvVarRow } from "./mappers.js";

export function listEnvVars(serviceId: number): ServiceEnvVar[] {
  const rows = getDb()
    .prepare("SELECT id, service_id, key, value FROM service_env_vars WHERE service_id = ? ORDER BY key")
    .all(serviceId) as EnvVarRow[];
  return rows.map(mapEnvVar);
}

export function replaceEnvVars(
  serviceId: number,
  vars: { key: string; value: string }[],
): ServiceEnvVar[] {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM service_env_vars WHERE service_id = ?").run(serviceId);
    const insert = db.prepare(
      "INSERT INTO service_env_vars (service_id, key, value) VALUES (?, ?, ?)",
    );
    for (const item of vars) {
      const key = item.key.trim();
      if (!key) continue;
      insert.run(serviceId, key, item.value);
    }
  });
  tx();
  return listEnvVars(serviceId);
}
