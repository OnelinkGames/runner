import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { DEFAULT_SETTINGS } from "@devdesk/shared";
import { getDataDir, getDatabasePath } from "../config.js";
import { ensureSchemaColumns, migrateLegacyApplications } from "./migrate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database has not been initialized.");
  }
  return db;
}

export function initDatabase(): Database.Database {
  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });

  const instance = new Database(getDatabasePath());
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  migrateLegacyApplications(instance);

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  instance.exec(schema);
  ensureSchemaColumns(instance);
  seedSettings(instance);

  db = instance;
  return instance;
}

function seedSettings(instance: Database.Database): void {
  const insert = instance.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
  );

  const defaults: Record<string, string> = {
    backendPort: String(DEFAULT_SETTINGS.backendPort),
    defaultAppPort: String(DEFAULT_SETTINGS.defaultAppPort),
    statusPollIntervalMs: String(DEFAULT_SETTINGS.statusPollIntervalMs),
    theme: DEFAULT_SETTINGS.theme,
    autoStartEnabled: DEFAULT_SETTINGS.autoStartEnabled ? "1" : "0",
  };

  const tx = instance.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) {
      insert.run(key, value);
    }
    const currentPort = instance.prepare("SELECT value FROM settings WHERE key = 'backendPort'").get() as
      | { value: string }
      | undefined;
    if (currentPort?.value === "4100") {
      instance.prepare("UPDATE settings SET value = ? WHERE key = 'backendPort'").run(String(DEFAULT_SETTINGS.backendPort));
    }
  });
  tx();
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}
