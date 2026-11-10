export type ApplicationStatus =
  | "running"
  | "stopped"
  | "starting"
  | "stopping"
  | "error";

export type PortConfig = "none" | "env" | "arg";

export type RunMode = "single" | "services";

export type Theme = "dark" | "light";

export interface ServiceEnvVar {
  id: number;
  serviceId: number;
  key: string;
  value: string;
}

export interface Service {
  id: number;
  applicationId: number;
  name: string;
  directory: string;
  command: string;
  port: number;
  url: string | null;
  autoPort: boolean;
  portConfig: PortConfig;
  portConfigKey: string;
  autoStart: boolean;
  enabled: boolean;
  openInBrowser: boolean;
  envFile: string;
  syncEnvFile: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceWithStatus extends Service {
  status: ApplicationStatus;
  currentPort: number | null;
  configuredPort: number;
  pid: number | null;
  urlResolved: string;
  envVars: ServiceEnvVar[];
  errorMessage: string | null;
  iconUrl: string;
}

export interface Application {
  id: number;
  name: string;
  description: string | null;
  groupId: number | null;
  runMode: RunMode;
  autoStart: boolean;
  iconPath: string | null;
  openAsApp: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: number;
  name: string;
  createdAt: string;
}

export interface ProcessState {
  serviceId: number;
  pm2ProcessName: string;
  pid: number | null;
  status: ApplicationStatus;
  currentPort: number | null;
  startedAt: string | null;
  updatedAt: string;
  errorMessage: string | null;
}

export interface ApplicationWithStatus extends Application {
  status: ApplicationStatus;
  groupName: string | null;
  urlResolved: string;
  currentPort: number | null;
  runningCount: number;
  serviceCount: number;
  services: ServiceWithStatus[];
  errorMessage: string | null;
  iconUrl: string;
}

export interface EnvVarInput {
  key: string;
  value: string;
}

export interface ServiceInput {
  id?: number;
  name: string;
  directory: string;
  command: string;
  port: number;
  url?: string | null;
  autoPort?: boolean;
  portConfig?: PortConfig;
  portConfigKey?: string;
  autoStart?: boolean;
  enabled?: boolean;
  openInBrowser?: boolean;
  envFile?: string;
  syncEnvFile?: boolean;
  envVars?: EnvVarInput[];
}

export interface ApplicationInput {
  name: string;
  description?: string | null;
  groupId?: number | null;
  runMode?: RunMode;
  autoStart?: boolean;
  iconPath?: string | null;
  openAsApp?: boolean;
  services: ServiceInput[];
}

export interface IconCandidate {
  path: string;
  name: string;
  relativePath: string;
  score: number;
}

export interface Settings {
  backendPort: number;
  defaultAppPort: number;
  statusPollIntervalMs: number;
  theme: Theme;
  autoStartEnabled: boolean;
}

export interface BulkActionResult {
  id: number;
  ok: boolean;
  error?: string;
  port?: number;
}

export interface DirectoryValidation {
  valid: boolean;
  message?: string;
}

export interface PortCheckResult {
  port: number;
  available: boolean;
}

export interface EnvFilePayload {
  path: string;
  exists: boolean;
  entries: EnvVarInput[];
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  running: "Rodando",
  stopped: "Parado",
  starting: "Iniciando",
  stopping: "Parando",
  error: "Erro",
};

export const RUN_MODE_LABELS: Record<RunMode, string> = {
  single: "Um comando",
  services: "Vários serviços",
};

export const DEFAULT_SETTINGS: Settings = {
  backendPort: 3002,
  defaultAppPort: 3000,
  statusPollIntervalMs: 3000,
  theme: "dark",
  autoStartEnabled: true,
};

export function resolveApplicationUrl(
  url: string | null | undefined,
  port: number,
): string {
  const trimmed = url?.trim();
  if (trimmed) return trimmed;
  return `http://localhost:${port}`;
}

export function pickOpenService<T extends {
  portConfig: PortConfig;
  openInBrowser: boolean;
  status?: ApplicationStatus;
}>(services: T[]): T | undefined {
  return (
    services.find((service) => service.portConfig === "env" && service.openInBrowser && service.status === "running") ??
    services.find((service) => service.portConfig === "env" && service.openInBrowser) ??
    services.find((service) => service.portConfig === "env") ??
    services.find((service) => service.openInBrowser && service.status === "running") ??
    services.find((service) => service.openInBrowser) ??
    services[0]
  );
}

export function serviceStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "running":
      return "Ativo";
    case "stopped":
      return "Parado";
    case "starting":
      return "Iniciando";
    case "stopping":
      return "Parando";
    case "error":
      return "Erro";
  }
}

export function aggregateStatus(statuses: ApplicationStatus[]): ApplicationStatus {
  if (statuses.length === 0) return "stopped";
  if (statuses.some((status) => status === "starting")) return "starting";
  if (statuses.some((status) => status === "stopping")) return "stopping";
  if (statuses.every((status) => status === "running")) return "running";
  if (statuses.some((status) => status === "running")) return "running";
  if (statuses.some((status) => status === "error")) return "error";
  return "stopped";
}
