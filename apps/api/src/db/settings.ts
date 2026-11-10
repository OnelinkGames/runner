import type { Settings } from "@devdesk/shared";
import { getDb } from "./index.js";
import { mapSettings } from "./mappers.js";

export function getSettings(): Settings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  return mapSettings(rows);
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const current = getSettings();
  const next: Settings = { ...current, ...patch };
  const upsert = getDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );

  const tx = getDb().transaction(() => {
    upsert.run("backendPort", String(next.backendPort));
    upsert.run("defaultAppPort", String(next.defaultAppPort));
    upsert.run("statusPollIntervalMs", String(next.statusPollIntervalMs));
    upsert.run("theme", next.theme);
    upsert.run("autoStartEnabled", next.autoStartEnabled ? "1" : "0");
  });
  tx();

  return getSettings();
}
