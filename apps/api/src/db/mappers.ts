import type {
  Application,
  ApplicationStatus,
  Group,
  PortConfig,
  ProcessState,
  RunMode,
  Service,
  ServiceEnvVar,
  Settings,
  Theme,
} from "@devdesk/shared";

export interface ApplicationRow {
  id: number;
  name: string;
  description: string | null;
  group_id: number | null;
  run_mode: string;
  auto_start: number;
  icon_path: string | null;
  open_as_app: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceRow {
  id: number;
  application_id: number;
  name: string;
  directory: string;
  command: string;
  port: number;
  url: string | null;
  auto_port: number;
  port_config: string;
  port_config_key: string;
  auto_start: number;
  enabled: number;
  open_in_browser: number;
  env_file: string;
  sync_env_file: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EnvVarRow {
  id: number;
  service_id: number;
  key: string;
  value: string;
}

export interface GroupRow {
  id: number;
  name: string;
  created_at: string;
}

export interface ProcessRow {
  id: number;
  service_id: number;
  pm2_process_name: string;
  pid: number | null;
  status: string;
  current_port: number | null;
  started_at: string | null;
  error_message: string | null;
  updated_at: string;
}

export function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    groupId: row.group_id,
    runMode: (row.run_mode as RunMode) || "single",
    autoStart: Boolean(row.auto_start),
    iconPath: row.icon_path,
    openAsApp: row.open_as_app == null ? true : Boolean(row.open_as_app),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapService(row: ServiceRow): Service {
  return {
    id: row.id,
    applicationId: row.application_id,
    name: row.name,
    directory: row.directory,
    command: row.command,
    port: row.port,
    url: row.url,
    autoPort: Boolean(row.auto_port),
    portConfig: row.port_config as PortConfig,
    portConfigKey: row.port_config_key,
    autoStart: Boolean(row.auto_start),
    enabled: Boolean(row.enabled),
    openInBrowser: Boolean(row.open_in_browser),
    envFile: row.env_file,
    syncEnvFile: Boolean(row.sync_env_file),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEnvVar(row: EnvVarRow): ServiceEnvVar {
  return {
    id: row.id,
    serviceId: row.service_id,
    key: row.key,
    value: row.value,
  };
}

export function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function mapProcess(row: ProcessRow): ProcessState {
  return {
    serviceId: row.service_id,
    pm2ProcessName: row.pm2_process_name,
    pid: row.pid,
    status: row.status as ApplicationStatus,
    currentPort: row.current_port,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    errorMessage: row.error_message,
  };
}

export function mapSettings(rows: { key: string; value: string }[]): Settings {
  const dict = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    backendPort: Number(dict.backendPort ?? 3002),
    defaultAppPort: Number(dict.defaultAppPort ?? 3000),
    statusPollIntervalMs: Number(dict.statusPollIntervalMs ?? 3000),
    theme: (dict.theme as Theme) ?? "dark",
    autoStartEnabled: dict.autoStartEnabled === "1" || dict.autoStartEnabled === "true",
  };
}
