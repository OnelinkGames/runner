import fs from "node:fs";
import path from "node:path";
import { AppError } from "../errors.js";

const ENV_FILE_RE = /^\.env(?:\.[A-Za-z0-9._-]+)?$/;

export function assertSafeEnvFileName(name: string): string {
  const trimmed = name.trim() || ".env";
  if (!ENV_FILE_RE.test(trimmed) || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    throw new AppError(
      400,
      "O arquivo de ambiente deve ser um .env no diretório do serviço (ex.: .env, .env.local).",
      "INVALID_ENV_FILE",
    );
  }
  return trimmed;
}

export function resolveEnvFilePath(directory: string, fileName: string): string {
  return path.join(directory, assertSafeEnvFileName(fileName));
}

export function parseEnvEntries(content: string): { key: string; value: string }[] {
  const entries: { key: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (seen.has(parsed.key)) {
      const index = entries.findIndex((item) => item.key === parsed.key);
      if (index >= 0) entries[index] = parsed;
    } else {
      seen.add(parsed.key);
      entries.push(parsed);
    }
  }
  return entries;
}

export function readEnvFile(filePath: string): { exists: boolean; entries: { key: string; value: string }[] } {
  if (!fs.existsSync(filePath)) {
    return { exists: false, entries: [] };
  }
  const content = fs.readFileSync(filePath, "utf8");
  return { exists: true, entries: parseEnvEntries(content) };
}

export function upsertEnvFile(filePath: string, updates: Record<string, string>): void {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const next = upsertEnvContent(current, updates);
  fs.writeFileSync(filePath, next, "utf8");
}

export function writeEnvFile(filePath: string, entries: { key: string; value: string }[]): void {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const updates: Record<string, string> = {};
  for (const item of entries) {
    const key = item.key.trim();
    if (key) updates[key] = item.value;
  }
  const next = upsertEnvContent(current, updates, true);
  fs.writeFileSync(filePath, next, "utf8");
}

export function upsertEnvContent(
  content: string,
  updates: Record<string, string>,
  removeMissing = false,
): string {
  const lines = content.length ? content.split(/\r?\n/) : [];
  const used = new Set<string>();
  const output: string[] = [];

  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      output.push(line);
      continue;
    }
    if (parsed.key in updates) {
      output.push(`${parsed.key}=${formatEnvValue(updates[parsed.key])}`);
      used.add(parsed.key);
    } else if (!removeMissing) {
      output.push(line);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!used.has(key)) {
      output.push(`${key}=${formatEnvValue(value)}`);
    }
  }

  const text = output.join("\n").replace(/\n+$/, "");
  return text ? `${text}\n` : "";
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  return { key: match[1], value: unquoteEnvValue(match[2]) };
}

function unquoteEnvValue(raw: string): string {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  const withoutComment = value.replace(/\s+#.*$/, "");
  return withoutComment;
}

function formatEnvValue(value: string): string {
  if (value === "") return "";
  if (/[\s#"']/.test(value)) {
    return `"${value.replaceAll('"', '\\"')}"`;
  }
  return value;
}
