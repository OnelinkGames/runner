import fs from "node:fs";
import type { FastifyReply } from "fastify";
import { resolveApplicationUrl } from "@devdesk/shared";
import { AppError } from "../errors.js";
import * as applicationRepo from "../db/applications.js";
import { getApplicationOrThrow, getServiceOrThrow } from "./application-service.js";
import {
  assertSafeIconFile,
  extractIconHrefs,
  findProjectFavicon,
  isLocalHttpUrl,
  contentTypeFor,
} from "../lib/favicon.js";

const LIVE_PATHS = [
  "/favicon.svg",
  "/favicon.ico",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/icon.svg",
  "/icon.png",
  "/logo.svg",
  "/logo.png",
];

export async function sendServiceIcon(serviceId: number, reply: FastifyReply): Promise<void> {
  const service = getServiceOrThrow(serviceId);
  const app = applicationRepo.getApplication(service.applicationId);
  if (app?.iconPath) {
    sendStored(reply, app.iconPath);
    return;
  }

  const fromDisk = findProjectFavicon(service.directory);
  if (fromDisk) {
    sendFile(reply, fromDisk.filePath, fromDisk.contentType);
    return;
  }

  const live = await fetchLiveIcon(resolveApplicationUrl(service.url, service.port));
  if (live) {
    reply.header("Cache-Control", "no-cache");
    return reply.type(live.contentType).send(live.body);
  }

  throw new AppError(404, "Favicon não encontrado.", "ICON_NOT_FOUND");
}

export async function sendApplicationIcon(applicationId: number, reply: FastifyReply): Promise<void> {
  const app = await getApplicationOrThrow(applicationId);
  if (app.iconPath) {
    sendStored(reply, app.iconPath);
    return;
  }

  const ordered = [
    ...app.services.filter((service) => service.openInBrowser),
    ...app.services,
  ];
  const seen = new Set<number>();
  for (const service of ordered) {
    if (seen.has(service.id)) continue;
    seen.add(service.id);
    const fromDisk = findProjectFavicon(service.directory);
    if (fromDisk) {
      sendFile(reply, fromDisk.filePath, fromDisk.contentType);
      return;
    }
  }

  for (const service of ordered) {
    const live = await fetchLiveIcon(service.urlResolved);
    if (live) {
      reply.header("Cache-Control", "no-cache");
      return reply.type(live.contentType).send(live.body);
    }
  }

  throw new AppError(404, "Favicon não encontrado.", "ICON_NOT_FOUND");
}

function sendStored(reply: FastifyReply, filePath: string): void {
  const hit = assertSafeIconFile(filePath);
  sendFile(reply, hit.filePath, hit.contentType);
}

function sendFile(reply: FastifyReply, filePath: string, contentType: string): void {
  reply.header("Cache-Control", "no-cache");
  reply.type(contentType).send(fs.readFileSync(filePath));
}

async function fetchLiveIcon(
  baseUrl: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  if (!isLocalHttpUrl(baseUrl)) return null;
  const origin = new URL(baseUrl).origin;

  for (const route of LIVE_PATHS) {
    const hit = await getIcon(`${origin}${route}`);
    if (hit) return hit;
  }

  try {
    const page = await fetch(`${origin}/`, {
      signal: AbortSignal.timeout(1200),
      headers: { Accept: "text/html" },
    });
    if (!page.ok) return null;
    const html = await page.text();
    for (const href of extractIconHrefs(html)) {
      const absolute = new URL(href, `${origin}/`).toString();
      if (!isLocalHttpUrl(absolute)) continue;
      const hit = await getIcon(absolute);
      if (hit) return hit;
    }
    return null;
  } catch {
    return null;
  }
}

async function getIcon(url: string): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const urlName = new URL(url).pathname.split("/").pop()?.toLowerCase() ?? "";
    if (["vite.svg", "next.svg", "vercel.svg", "react.svg"].includes(urlName)) return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? contentTypeFor(url);
    if (!type.startsWith("image/") && type !== "image/x-icon" && !type.includes("svg")) {
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length < 16 || body.length > 2_000_000) return null;
    return { body, contentType: type.split(";")[0] };
  } catch {
    return null;
  }
}
