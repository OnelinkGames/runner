import { createRequire } from "node:module";
import type { ApplicationStatus } from "@devdesk/shared";
import { AppError } from "../errors.js";

const require = createRequire(import.meta.url);
const pm2 = require("pm2") as Pm2Client;

interface Pm2Process {
  name?: string;
  pid?: number;
  pm2_env?: {
    status?: string;
    pm_out_log_path?: string;
    pm_err_log_path?: string;
    exit_code?: number;
  };
}

interface Pm2Client {
  connect(cb: (err: Error | null) => void): void;
  disconnect(cb?: () => void): void;
  list(cb: (err: Error | null, list: Pm2Process[]) => void): void;
  start(config: Record<string, unknown>, cb: (err: Error | null, proc: Pm2Process[]) => void): void;
  stop(name: string, cb: (err: Error | null) => void): void;
  restart(name: string, cb: (err: Error | null) => void): void;
  delete(name: string, cb: (err: Error | null) => void): void;
  describe(name: string, cb: (err: Error | null, proc: Pm2Process[]) => void): void;
}

let connected = false;
let connecting: Promise<void> | null = null;

export async function connectPm2(): Promise<void> {
  if (connected) return;
  if (connecting) return connecting;

  connecting = new Promise((resolve, reject) => {
    pm2.connect((err) => {
      connecting = null;
      if (err) {
        connected = false;
        reject(
          new AppError(
            503,
            "O gerenciador de processos não está disponível. Verifique a instalação do PM2.",
            "PM2_UNAVAILABLE",
          ),
        );
        return;
      }
      connected = true;
      resolve();
    });
  });

  return connecting;
}

export function disconnectPm2(): Promise<void> {
  return new Promise((resolve) => {
    if (!connected) {
      resolve();
      return;
    }
    pm2.disconnect(() => {
      connected = false;
      resolve();
    });
  });
}

export async function listPm2Processes(): Promise<Pm2Process[]> {
  await connectPm2();
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) reject(wrapPm2Error(err));
      else resolve(list ?? []);
    });
  });
}

export async function describePm2(name: string): Promise<Pm2Process | null> {
  await connectPm2();
  return new Promise((resolve, reject) => {
    pm2.describe(name, (err, procs) => {
      if (err) {
        reject(wrapPm2Error(err));
        return;
      }
      resolve(procs?.[0] ?? null);
    });
  });
}

export async function startPm2(config: Record<string, unknown>): Promise<Pm2Process> {
  await connectPm2();
  return new Promise((resolve, reject) => {
    pm2.start(config, (err, procs) => {
      if (err) {
        reject(wrapPm2Error(err));
        return;
      }
      const proc = Array.isArray(procs) ? procs[0] : procs;
      resolve(proc);
    });
  });
}

export async function stopPm2(name: string): Promise<void> {
  await connectPm2();
  return new Promise((resolve, reject) => {
    pm2.stop(name, (err) => {
      if (err && !isUnknownProcess(err)) reject(wrapPm2Error(err));
      else resolve();
    });
  });
}

export async function restartPm2(name: string): Promise<void> {
  await connectPm2();
  return new Promise((resolve, reject) => {
    pm2.restart(name, (err) => {
      if (err) reject(wrapPm2Error(err));
      else resolve();
    });
  });
}

export async function deletePm2(name: string): Promise<void> {
  await connectPm2();
  return new Promise((resolve) => {
    pm2.delete(name, () => resolve());
  });
}

export function mapPm2Status(pm2Status?: string): ApplicationStatus {
  switch (pm2Status) {
    case "online":
      return "running";
    case "launching":
    case "one-launch-status":
      return "starting";
    case "stopping":
      return "stopping";
    case "errored":
      return "error";
    case "stopped":
    default:
      return "stopped";
  }
}

export function getPm2LogPaths(proc: Pm2Process | null): { out?: string; err?: string } {
  return {
    out: proc?.pm2_env?.pm_out_log_path,
    err: proc?.pm2_env?.pm_err_log_path,
  };
}

function isUnknownProcess(err: Error): boolean {
  return /process(es)? (not found|doesn't exist)/i.test(err.message);
}

function wrapPm2Error(err: Error): AppError {
  if (err instanceof AppError) return err;
  return new AppError(
    503,
    "O gerenciador de processos não está disponível. Verifique a instalação do PM2.",
    "PM2_UNAVAILABLE",
  );
}
