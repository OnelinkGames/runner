import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApplicationWithStatus, Group, Settings } from "@devdesk/shared";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });
}

export function useApplications() {
  const settings = useSettings();
  const interval = settings.data?.statusPollIntervalMs ?? 3000;

  return useQuery({
    queryKey: ["applications"],
    queryFn: api.listApplications,
    refetchInterval: interval,
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: api.listGroups,
  });
}

export function useApplication(id: number | undefined) {
  return useQuery({
    queryKey: ["applications", id],
    queryFn: () => api.getApplication(id!),
    enabled: typeof id === "number",
  });
}

export type { ApplicationWithStatus, Group, Settings };
