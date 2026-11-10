import fs from "node:fs";
import path from "node:path";
import type { Service, ServiceEnvVar } from "@devdesk/shared";
import { readEnvFile, resolveEnvFilePath } from "./env-file.js";

const PORT_KEYS = [
  "PORT",
  "FRONTEND_PORT",
  "VITE_PORT",
  "VITE_DEV_PORT",
  "APP_PORT",
  "SERVER_PORT",
  "HTTP_PORT",
];
const ENV_FILES = [".env", ".env.local", ".env.development", ".env.development.local"];
const VITE_CONFIGS = ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"];

function parsePort(value: string | undefined | null): number | null {
  if (!value) return null;
  const port = Number(String(value).trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

function envMapFromFiles(directory: string, envFile: string): Map<string, string> {
  const map = new Map<string, string>();
  const names = [envFile, ...ENV_FILES];
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    try {
      const file = readEnvFile(resolveEnvFilePath(directory, key));
      for (const entry of file.entries) {
        if (!map.has(entry.key)) map.set(entry.key, entry.value);
      }
    } catch {
      // arquivo inválido ou inexistente
    }
  }
  return map;
}

function portFromUrl(url: string | null | undefined): number | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    return parsePort(parsed.port);
  } catch {
    return null;
  }
}

function portFromViteConfig(directory: string): number | null {
  for (const fileName of VITE_CONFIGS) {
    const filePath = path.join(directory, fileName);
    if (!fs.existsSync(filePath)) continue;
    try {
      const text = fs.readFileSync(filePath, "utf8");
      const match = text.match(/\bport\s*:\s*(\d{2,5})\b/);
      if (match) {
        const port = parsePort(match[1]);
        if (port) return port;
      }
    } catch {
      // arquivo ilegível
    }
  }
  return null;
}

export function resolveConfiguredPort(service: Service, envVars: ServiceEnvVar[]): number {
  const extras = new Map(envVars.map((item) => [item.key, item.value]));
  const fileEnv = envMapFromFiles(service.directory, service.envFile);
  const keys = [
    service.portConfig === "env" ? service.portConfigKey : null,
    service.portConfigKey,
    ...PORT_KEYS,
  ].filter((key): key is string => Boolean(key));

  for (const key of keys) {
    const fromExtra = parsePort(extras.get(key));
    if (fromExtra) return fromExtra;
    const fromFile = parsePort(fileEnv.get(key));
    if (fromFile) return fromFile;
  }

  return portFromUrl(service.url) ?? portFromViteConfig(service.directory) ?? service.port;
}
