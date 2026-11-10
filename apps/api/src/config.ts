import os from "node:os";
import path from "node:path";

export function getDataDir(): string {
  return process.env.DEVDESK_DATA_DIR ?? path.join(os.homedir(), ".devdesk");
}

export function getDatabasePath(): string {
  return path.join(getDataDir(), "devdesk.sqlite");
}

export const HOST = "127.0.0.1";
export const DEFAULT_LISTEN_PORT = 3002;
