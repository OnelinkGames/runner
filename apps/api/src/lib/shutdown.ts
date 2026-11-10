import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getDataDir } from "../config.js";

function pidFilePath(): string {
  return path.join(getDataDir(), "devdesk.pid");
}

function readPid(filePath: string): number | null {
  try {
    const pid = Number(fs.readFileSync(filePath, "utf8").trim());
    if (!Number.isInteger(pid) || pid <= 1) return null;
    return pid;
  } catch {
    return null;
  }
}

function cmdline(pid: number): string {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ");
  } catch {
    return "";
  }
}

function parentPid(pid: number): number | null {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const match = status.match(/^PPid:\s+(\d+)/m);
    const ppid = Number(match?.[1]);
    return Number.isInteger(ppid) && ppid > 0 ? ppid : null;
  } catch {
    return null;
  }
}

function killPid(pid: number): void {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // processo já encerrado
  }
}

function childPids(pid: number): number[] {
  try {
    const text = execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim();
    if (!text) return [];
    return text
      .split(/\s+/)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 1);
  } catch {
    return [];
  }
}

function killTree(pid: number, seen = new Set<number>()): void {
  if (seen.has(pid) || pid <= 1) return;
  seen.add(pid);
  for (const child of childPids(pid)) {
    killTree(child, seen);
  }
  killPid(pid);
}

function pidsOnPort(port: number): number[] {
  try {
    const text = execFileSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
    }).trim();
    if (!text) return [];
    return text
      .split(/\s+/)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 1);
  } catch {
    try {
      execFileSync("fuser", ["-k", "-TERM", `${port}/tcp`], { stdio: "ignore" });
    } catch {
      // fuser ausente ou nada na porta
    }
    return [];
  }
}

function findStackRoot(): number | null {
  const fromFile = readPid(pidFilePath());
  if (fromFile) return fromFile;

  let pid: number | null = process.ppid;
  let found: number | null = null;
  for (let i = 0; i < 12 && pid && pid > 1; i += 1) {
    const cmd = cmdline(pid);
    if (
      cmd.includes("concurrently") ||
      cmd.includes("npm run dev") ||
      (/\bnpm\b/.test(cmd) && cmd.includes("dev"))
    ) {
      found = pid;
    }
    pid = parentPid(pid);
  }
  return found ?? process.ppid;
}

export function scheduleDevdeskShutdown(): void {
  setTimeout(() => {
    const root = findStackRoot();
    for (const pid of pidsOnPort(5174)) {
      killTree(pid);
    }
    if (root) killTree(root);
    try {
      fs.unlinkSync(pidFilePath());
    } catch {
      // arquivo ausente
    }
    process.exit(0);
  }, 200);
}
