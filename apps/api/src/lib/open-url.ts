import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BROWSERS = [
  "google-chrome-stable",
  "google-chrome",
  "chromium-browser",
  "chromium",
  "brave-browser",
  "microsoft-edge-stable",
  "microsoft-edge",
];

export function findChromium(): string | null {
  const dirs = (process.env.PATH ?? "").split(path.delimiter);
  for (const name of BROWSERS) {
    for (const dir of dirs) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export async function openApplicationUrl(
  url: string,
  options?: { asApp?: boolean; className?: string },
): Promise<void> {
  if (options?.asApp) {
    const browser = findChromium();
    if (browser) {
      const args = [`--app=${url}`];
      if (options.className) args.push(`--class=${options.className}`);
      spawn(browser, args, { detached: true, stdio: "ignore" }).unref();
      return;
    }
  }

  const { default: open } = await import("open");
  await open(url);
}
