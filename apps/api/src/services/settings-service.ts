import { z } from "zod";
import type { Settings } from "@devdesk/shared";
import * as settingsRepo from "../db/settings.js";

export const settingsPatchSchema = z.object({
  backendPort: z.number().int().min(1).max(65535).optional(),
  defaultAppPort: z.number().int().min(1).max(65535).optional(),
  statusPollIntervalMs: z.number().int().min(1000).max(60_000).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  autoStartEnabled: z.boolean().optional(),
});

export function getSettings(): Settings {
  return settingsRepo.getSettings();
}

export function updateSettings(patch: Partial<Settings>): Settings {
  return settingsRepo.updateSettings(patch);
}
