import type {
  ApplicationInput,
  ApplicationWithStatus,
  BulkActionResult,
  DirectoryValidation,
  EnvFilePayload,
  Group,
  PortCheckResult,
  Settings,
  IconCandidate,
} from "@devdesk/shared";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers });
  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }
  return data;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  listApplications: () => request<ApplicationWithStatus[]>("/api/applications"),
  getApplication: (id: number) => request<ApplicationWithStatus>(`/api/applications/${id}`),
  createApplication: (input: ApplicationInput) =>
    request<ApplicationWithStatus>("/api/applications", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateApplication: (id: number, input: ApplicationInput) =>
    request<ApplicationWithStatus>(`/api/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  deleteApplication: (id: number) =>
    request<void>(`/api/applications/${id}`, { method: "DELETE" }),
  startApplication: (id: number) =>
    request<ApplicationWithStatus>(`/api/applications/${id}/start`, { method: "POST" }),
  stopApplication: (id: number) =>
    request<ApplicationWithStatus>(`/api/applications/${id}/stop`, { method: "POST" }),
  restartApplication: (id: number) =>
    request<ApplicationWithStatus>(`/api/applications/${id}/restart`, { method: "POST" }),
  openApplication: (id: number) =>
    request<{ ok: boolean; url: string }>(`/api/applications/${id}/open`, { method: "POST" }),
  startMany: (ids: number[]) =>
    request<BulkActionResult[]>("/api/applications/start-many", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  stopMany: (ids: number[]) =>
    request<BulkActionResult[]>("/api/applications/stop-many", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  startAll: () => request<BulkActionResult[]>("/api/applications/start-all", { method: "POST" }),
  stopAll: () => request<BulkActionResult[]>("/api/applications/stop-all", { method: "POST" }),
  startService: (id: number) =>
    request<ApplicationWithStatus>(`/api/services/${id}/start`, { method: "POST" }),
  stopService: (id: number) =>
    request<ApplicationWithStatus>(`/api/services/${id}/stop`, { method: "POST" }),
  restartService: (id: number) =>
    request<ApplicationWithStatus>(`/api/services/${id}/restart`, { method: "POST" }),
  openService: (id: number) =>
    request<{ ok: boolean; url: string }>(`/api/services/${id}/open`, { method: "POST" }),
  openServiceFolder: (id: number) =>
    request<{ ok: boolean; path: string }>(`/api/services/${id}/open-folder`, { method: "POST" }),
  previewEnvFile: (directory: string, envFile?: string) =>
    request<EnvFilePayload>("/api/env-files/preview", {
      method: "POST",
      body: JSON.stringify({ directory, envFile }),
    }),
  writeEnvFile: (serviceId: number, entries: { key: string; value: string }[]) =>
    request<EnvFilePayload>(`/api/services/${serviceId}/env-file`, {
      method: "PUT",
      body: JSON.stringify({ entries }),
    }),
  listGroups: () => request<Group[]>("/api/groups"),
  createGroup: (name: string) =>
    request<Group>("/api/groups", { method: "POST", body: JSON.stringify({ name }) }),
  updateGroup: (id: number, name: string) =>
    request<Group>(`/api/groups/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteGroup: (id: number) => request<void>(`/api/groups/${id}`, { method: "DELETE" }),
  startGroup: (id: number) =>
    request<BulkActionResult[]>(`/api/groups/${id}/start`, { method: "POST" }),
  stopGroup: (id: number) =>
    request<BulkActionResult[]>(`/api/groups/${id}/stop`, { method: "POST" }),
  getSettings: () => request<Settings>("/api/settings"),
  updateSettings: (patch: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),
  validateDirectory: (path: string) =>
    request<DirectoryValidation>("/api/directories/validate", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  pickDirectory: (initialDir?: string) =>
    request<{ path: string | null; canceled: boolean }>("/api/directories/pick", {
      method: "POST",
      body: JSON.stringify({ initialDir }),
    }),
  scanIcons: (directories: string[]) =>
    request<{ icons: IconCandidate[] }>("/api/icons/scan", {
      method: "POST",
      body: JSON.stringify({ directories }),
    }),
  pickIcon: (initialDir?: string) =>
    request<{ path: string | null; canceled: boolean }>("/api/icons/pick", {
      method: "POST",
      body: JSON.stringify({ initialDir }),
    }),
  iconPreviewUrl: (filePath: string) => `/api/icons/preview?path=${encodeURIComponent(filePath)}`,
  checkPort: (port: number) => request<PortCheckResult>(`/api/ports/check?port=${port}`),
  shutdown: () => request<{ ok: boolean }>("/api/shutdown", { method: "POST" }),
};
