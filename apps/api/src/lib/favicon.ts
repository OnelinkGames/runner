import fs from "node:fs";
import path from "node:path";
import { AppError } from "../errors.js";

const IMAGE_EXTS = new Set([".svg", ".png", ".ico", ".webp", ".jpg", ".jpeg", ".gif"]);

const SKIP_NAMES = new Set([
  "vite.svg",
  "next.svg",
  "vercel.svg",
  "react.svg",
  "placeholder.svg",
  "placeholder.png",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  "out",
  ".turbo",
  ".cache",
  "tmp",
]);

const CANDIDATES = [
  "favicon.svg",
  "favicon.png",
  "favicon.ico",
  "favicon.webp",
  "apple-touch-icon.png",
  "icon.svg",
  "icon.png",
  "logo.svg",
  "logo.png",
  "public/favicon.svg",
  "public/favicon.png",
  "public/favicon.ico",
  "public/icon.svg",
  "public/icon.png",
  "public/logo.svg",
  "public/logo.png",
  "public/apple-touch-icon.png",
  "src/favicon.svg",
  "src/favicon.ico",
  "src/app/favicon.ico",
  "src/app/icon.png",
  "src/app/icon.svg",
  "src/app/apple-icon.png",
  "src/assets/favicon.svg",
  "src/assets/logo.svg",
  "src/assets/logo.png",
  "src/assets/icon.svg",
  "src/assets/icon.png",
  "app/favicon.ico",
  "app/icon.png",
  "app/icon.svg",
  "app/apple-icon.png",
  "assets/logo.svg",
  "assets/logo.png",
  "assets/favicon.svg",
  "static/favicon.ico",
  "static/favicon.svg",
  "static/logo.svg",
  "client/public/favicon.svg",
  "client/public/favicon.ico",
  "frontend/public/favicon.svg",
  "frontend/public/favicon.ico",
  "web/public/favicon.svg",
  "web/public/favicon.ico",
];

const HTML_FILES = [
  "index.html",
  "public/index.html",
  "src/index.html",
  "src/app/layout.tsx",
  "app/layout.tsx",
  "client/index.html",
];

const MANIFEST_FILES = [
  "site.webmanifest",
  "manifest.json",
  "manifest.webmanifest",
  "public/site.webmanifest",
  "public/manifest.json",
  "public/manifest.webmanifest",
];

const SCAN_DIRS = [
  "public",
  "src/assets",
  "src/app",
  "app",
  "assets",
  "static",
  "images",
  "src/images",
  "client/public",
  "frontend/public",
  "web/public",
];

const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

export interface FaviconHit {
  filePath: string;
  contentType: string;
}

export interface IconCandidate {
  path: string;
  name: string;
  relativePath: string;
  score: number;
}

export function findProjectFavicon(directory: string): FaviconHit | null {
  const [best] = listProjectIcons([directory]);
  return best ? asHit(best.path) : null;
}

export function listProjectIcons(directories: string[]): IconCandidate[] {
  const byReal = new Map<string, IconCandidate>();

  for (const directory of directories) {
    const root = directory.trim();
    if (!root || !fs.existsSync(root)) continue;
    try {
      if (!fs.statSync(root).isDirectory()) continue;
    } catch {
      continue;
    }

    for (const relative of CANDIDATES) {
      addCandidate(byReal, root, path.join(root, relative));
    }

    for (const relative of HTML_FILES) {
      const htmlPath = path.join(root, relative);
      if (!fs.existsSync(htmlPath)) continue;
      try {
        const hrefs = extractIconHrefs(fs.readFileSync(htmlPath, "utf8"));
        for (const href of hrefs) {
          const resolved = resolveHref(root, path.dirname(htmlPath), href);
          addCandidate(byReal, root, resolved);
        }
      } catch {
        // arquivo ilegível
      }
    }

    for (const relative of MANIFEST_FILES) {
      const manifestPath = path.join(root, relative);
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const json = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { icons?: Array<{ src?: string }> };
        for (const icon of json.icons ?? []) {
          if (!icon.src) continue;
          addCandidate(byReal, root, resolveHref(root, path.dirname(manifestPath), icon.src));
        }
      } catch {
        // manifesto inválido
      }
    }

    for (const relative of SCAN_DIRS) {
      walkIcons(byReal, root, path.join(root, relative), 0);
    }
  }

  return [...byReal.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function contentTypeFor(filePath: string): string {
  return TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

export function assertSafeIconFile(filePath: string): FaviconHit {
  const trimmed = filePath.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) {
    throw new AppError(400, "Informe o caminho absoluto do ícone.", "ICON_PATH_INVALID");
  }
  const hit = asHit(trimmed, { allowPlaceholders: true });
  if (!hit) {
    throw new AppError(400, "O arquivo de ícone não foi encontrado ou não é uma imagem válida.", "ICON_NOT_FOUND");
  }
  return hit;
}

export function asHit(filePath: string, options?: { allowPlaceholders?: boolean }): FaviconHit | null {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) return null;
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
    const size = fs.statSync(filePath).size;
    if (size <= 0 || size > 2_000_000) return null;
    if (!options?.allowPlaceholders && SKIP_NAMES.has(path.basename(filePath).toLowerCase())) return null;
    return { filePath, contentType: contentTypeFor(filePath) };
  } catch {
    return null;
  }
}

export function extractIconHrefs(html: string): string[] {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const hrefs: string[] = [];
  for (const tag of tags) {
    if (!/rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(tag) && !/rel\s*=\s*["']apple-touch-icon/i.test(tag)) {
      continue;
    }
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith("data:")) continue;
    hrefs.push(href);
  }
  return hrefs;
}

export function isLocalHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1")
    );
  } catch {
    return false;
  }
}

function addCandidate(map: Map<string, IconCandidate>, root: string, filePath: string): void {
  const hit = asHit(filePath);
  if (!hit) return;
  let real = hit.filePath;
  try {
    real = fs.realpathSync(hit.filePath);
  } catch {
    // usa o caminho original
  }
  if (map.has(real)) return;
  map.set(real, {
    path: real,
    name: path.basename(real),
    relativePath: path.relative(root, real) || path.basename(real),
    score: scoreIcon(real),
  });
}

function walkIcons(map: Map<string, IconCandidate>, root: string, dir: string, depth: number): void {
  if (depth > 2) return;
  if (!fs.existsSync(dir)) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkIcons(map, root, full, depth + 1);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    if (!/favicon|apple-touch|apple-icon|icon|logo|brand/i.test(entry.name)) continue;
    addCandidate(map, root, full);
  }
}

function scoreIcon(filePath: string): number {
  const name = path.basename(filePath).toLowerCase();
  const dir = filePath.toLowerCase();
  const ext = path.extname(name);
  let score = 0;
  if (name.includes("favicon")) score += 50;
  if (name.includes("apple-touch") || name.includes("apple-icon")) score += 40;
  if (/(^|[-_])logo([-_.]|$)/.test(name)) score += 35;
  if (name === "icon.svg" || name === "icon.png") score += 25;
  if (name.includes("brand")) score += 18;
  if (ext === ".svg") score += 16;
  if (ext === ".png") score += 12;
  if (ext === ".webp") score += 8;
  if (ext === ".ico") score += 4;
  if (dir.includes(`${path.sep}public${path.sep}`) || dir.includes(`${path.sep}app${path.sep}`)) score += 10;
  if (dir.includes(`${path.sep}assets${path.sep}`)) score += 6;
  try {
    const size = fs.statSync(filePath).size;
    if (size < 300) score -= 12;
    else if (size > 1500) score += 6;
    if (size > 8000) score += 4;
  } catch {
    // ignora
  }
  return score;
}

function resolveHref(projectRoot: string, htmlDir: string, href: string): string {
  const clean = href.split("?")[0].split("#")[0].replace("%PUBLIC_URL%/", "").replace(/^~\//, "");
  if (path.isAbsolute(clean) && fs.existsSync(clean)) return clean;
  const relative = clean.replace(/^\.\//, "").replace(/^\//, "");
  return (
    [
      path.join(htmlDir, relative),
      path.join(projectRoot, relative),
      path.join(projectRoot, "public", relative),
    ].find((candidate) => fs.existsSync(candidate)) ?? path.join(projectRoot, relative)
  );
}
