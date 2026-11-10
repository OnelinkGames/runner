CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  run_mode TEXT NOT NULL DEFAULT 'single',
  auto_start INTEGER NOT NULL DEFAULT 0,
  icon_path TEXT,
  open_as_app INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS service_env_vars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_processes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  pm2_process_name TEXT NOT NULL,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'stopped',
  current_port INTEGER,
  started_at TEXT,
  error_message TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
