import type Database from "better-sqlite3";

function columnNames(db: Database.Database, table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((row) => row.name);
}

function tableExists(db: Database.Database, table: string): boolean {
  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(table) as { name: string } | undefined;
  return Boolean(row);
}

export function ensureSchemaColumns(db: Database.Database): void {
  if (!tableExists(db, "applications")) return;
  const columns = columnNames(db, "applications");
  if (!columns.includes("icon_path")) {
    db.exec("ALTER TABLE applications ADD COLUMN icon_path TEXT");
  }
  if (!columns.includes("open_as_app")) {
    db.exec("ALTER TABLE applications ADD COLUMN open_as_app INTEGER NOT NULL DEFAULT 1");
  }
}

export function migrateLegacyApplications(db: Database.Database): void {
  if (!tableExists(db, "applications")) return;
  const columns = columnNames(db, "applications");
  if (!columns.includes("directory")) return;

  db.pragma("foreign_keys = OFF");
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      directory TEXT NOT NULL,
      command TEXT NOT NULL,
      port INTEGER NOT NULL,
      url TEXT,
      auto_port INTEGER NOT NULL DEFAULT 0,
      port_config TEXT NOT NULL DEFAULT 'none',
      port_config_key TEXT NOT NULL DEFAULT 'PORT',
      auto_start INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      open_in_browser INTEGER NOT NULL DEFAULT 1,
      env_file TEXT NOT NULL DEFAULT '.env',
      sync_env_file INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const apps = db
    .prepare(
      `SELECT id, directory, command, port, url, auto_port, port_config, port_config_key,
              auto_start, enabled, created_at, updated_at FROM applications`,
    )
    .all() as Array<{
      id: number;
      directory: string;
      command: string;
      port: number;
      url: string | null;
      auto_port: number;
      port_config: string;
      port_config_key: string;
      auto_start: number;
      enabled: number;
      created_at: string;
      updated_at: string;
    }>;

  const insertService = db.prepare(
    `INSERT INTO services (
      application_id, name, directory, command, port, url, auto_port, port_config,
      port_config_key, auto_start, enabled, open_in_browser, env_file, sync_env_file, sort_order,
      created_at, updated_at
    ) VALUES (?, 'Principal', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '.env', 0, 0, ?, ?)`,
  );

  const serviceByApp = new Map<number, number>();
  for (const app of apps) {
    const result = insertService.run(
      app.id,
      app.directory,
      app.command,
      app.port,
      app.url,
      app.auto_port,
      app.port_config,
      app.port_config_key,
      app.auto_start,
      app.enabled,
      app.created_at,
      app.updated_at,
    );
    serviceByApp.set(app.id, Number(result.lastInsertRowid));
  }

  db.exec(`
    CREATE TABLE applications_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      group_id INTEGER,
      run_mode TEXT NOT NULL DEFAULT 'single',
      auto_start INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO applications_new (id, name, description, group_id, run_mode, auto_start, created_at, updated_at)
    SELECT id, name, description, group_id, 'single', auto_start, created_at, updated_at FROM applications;
    DROP TABLE applications;
    ALTER TABLE applications_new RENAME TO applications;
  `);

  if (tableExists(db, "application_env_vars")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_env_vars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL
      );
    `);
    const vars = db
      .prepare("SELECT application_id, key, value FROM application_env_vars")
      .all() as { application_id: number; key: string; value: string }[];
    const insertVar = db.prepare(
      "INSERT INTO service_env_vars (service_id, key, value) VALUES (?, ?, ?)",
    );
    for (const item of vars) {
      const serviceId = serviceByApp.get(item.application_id);
      if (serviceId) insertVar.run(serviceId, item.key, item.value);
    }
    db.exec("DROP TABLE application_env_vars");
  }

  if (tableExists(db, "application_processes")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_processes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER NOT NULL UNIQUE,
        pm2_process_name TEXT NOT NULL,
        pid INTEGER,
        status TEXT NOT NULL DEFAULT 'stopped',
        current_port INTEGER,
        started_at TEXT,
        error_message TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    const procs = db
      .prepare(
        `SELECT application_id, pm2_process_name, pid, status, current_port, started_at, error_message, updated_at
         FROM application_processes`,
      )
      .all() as Array<{
        application_id: number;
        pm2_process_name: string;
        pid: number | null;
        status: string;
        current_port: number | null;
        started_at: string | null;
        error_message: string | null;
        updated_at: string;
      }>;
    const insertProc = db.prepare(
      `INSERT INTO service_processes (
        service_id, pm2_process_name, pid, status, current_port, started_at, error_message, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const proc of procs) {
      const serviceId = serviceByApp.get(proc.application_id);
      if (!serviceId) continue;
      insertProc.run(
        serviceId,
        `devdesk-svc-${serviceId}`,
        proc.pid,
        proc.status,
        proc.current_port,
        proc.started_at,
        proc.error_message,
        proc.updated_at,
      );
    }
    db.exec("DROP TABLE application_processes");
  }

  db.pragma("foreign_keys = ON");
}
