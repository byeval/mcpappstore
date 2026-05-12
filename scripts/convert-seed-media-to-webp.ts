import { access, mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import sharp from "sharp";

const mediaRoot = resolve(process.cwd(), "seed/media");
const defaultCatalogPath = resolve(process.cwd(), "seed/chatgpt-apps.json");
const rasterExtensions = new Set([".png", ".jpg", ".jpeg"]);

interface CliOptions {
  catalogPath: string;
  deleteOriginals: boolean;
  dryRun: boolean;
}

interface ConvertResult {
  converted: number;
  skipped: number;
  failed: number;
  bytesBefore: number;
  bytesAfter: number;
  keyMap: Map<string, string>;
}

function parseOptions(argv: string[]): CliOptions {
  const positional: string[] = [];
  let deleteOriginals = false;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--delete-originals") {
      deleteOriginals = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    positional.push(arg);
  }

  return {
    catalogPath: resolve(process.cwd(), positional[0] ?? defaultCatalogPath),
    deleteOriginals,
    dryRun,
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listRasterFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRasterFiles(path)));
      continue;
    }
    if (entry.isFile() && rasterExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(path);
    }
  }

  return files;
}

function toMediaKey(path: string): string {
  return relative(mediaRoot, path).split("\\").join("/");
}

function webpPathFor(path: string): string {
  return path.replace(/\.[^.]+$/, ".webp");
}

function webpOptionsForKey(key: string): sharp.WebpOptions {
  if (key.startsWith("icons/")) {
    return {
      effort: 5,
      quality: 90,
      smartSubsample: true,
    };
  }

  return {
    effort: 5,
    quality: 82,
    smartSubsample: true,
  };
}

function escapeSvg(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function labelForKey(key: string): string {
  const parts = key.split("/");
  const slug = parts.at(-2) ?? parts.at(-1)?.replace(/\.[^.]+$/, "") ?? "app";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function placeholderSvgForKey(key: string): string {
  if (key.startsWith("icons/")) {
    const label = labelForKey(key);
    const initial = label.slice(0, 1).toUpperCase() || "M";
    return `<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="58" fill="#4f46e5"/>
  <rect width="256" height="256" rx="58" fill="url(#wash)"/>
  <text x="128" y="151" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="96" font-weight="750">${escapeSvg(initial)}</text>
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5eead4" stop-opacity=".9"/>
      <stop offset="1" stop-color="#7c3aed" stop-opacity=".85"/>
    </linearGradient>
  </defs>
</svg>`;
  }

  const label = labelForKey(key) || "MCP App";
  return `<svg width="720" height="540" viewBox="0 0 720 540" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="540" fill="#58a9ff"/>
  <rect width="720" height="540" fill="url(#wash)"/>
  <rect x="76" y="70" width="568" height="400" rx="34" fill="white" fill-opacity=".9"/>
  <rect x="116" y="126" width="184" height="20" rx="10" fill="#111827" fill-opacity=".18"/>
  <rect x="116" y="168" width="488" height="42" rx="21" fill="#dbeafe"/>
  <rect x="116" y="232" width="232" height="154" rx="24" fill="#fff1e6"/>
  <rect x="372" y="232" width="232" height="154" rx="24" fill="#eef2ff"/>
  <rect x="116" y="414" width="320" height="18" rx="9" fill="#111827" fill-opacity=".14"/>
  <text x="360" y="326" text-anchor="middle" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700">${escapeSvg(label)}</text>
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="720" y2="540" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff" stop-opacity=".12"/>
      <stop offset="1" stop-color="#ffe789"/>
    </linearGradient>
  </defs>
</svg>`;
}

async function writePlaceholderWebp(key: string, targetPath: string): Promise<void> {
  await sharp(Buffer.from(placeholderSvgForKey(key))).webp(webpOptionsForKey(key)).toFile(targetPath);
}

async function convertMedia(options: CliOptions): Promise<ConvertResult> {
  const files = await listRasterFiles(mediaRoot);
  const keyMap = new Map<string, string>();
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const file of files) {
    const sourceKey = toMediaKey(file);
    const targetPath = webpPathFor(file);
    const targetKey = toMediaKey(targetPath);
    const sourceStat = await stat(file);
    bytesBefore += sourceStat.size;

    if (await fileExists(targetPath)) {
      const targetStat = await stat(targetPath);
      bytesAfter += targetStat.size;
      keyMap.set(sourceKey, targetKey);
      skipped += 1;
      continue;
    }

    try {
      if (!options.dryRun) {
        await mkdir(dirname(targetPath), { recursive: true });
        await sharp(file).rotate().webp(webpOptionsForKey(sourceKey)).toFile(targetPath);
      }

      const targetSize = options.dryRun ? sourceStat.size : (await stat(targetPath)).size;
      bytesAfter += targetSize;
      keyMap.set(sourceKey, targetKey);
      converted += 1;
    } catch (error) {
      if (options.dryRun) {
        failed += 1;
        console.warn(`Failed to convert ${sourceKey}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      try {
        await writePlaceholderWebp(sourceKey, targetPath);
        const targetSize = (await stat(targetPath)).size;
        bytesAfter += targetSize;
        keyMap.set(sourceKey, targetKey);
        converted += 1;
        console.warn(
          `Generated placeholder for ${sourceKey}: ${error instanceof Error ? error.message : String(error)}`,
        );
      } catch (placeholderError) {
        failed += 1;
        console.warn(
          `Failed to convert ${sourceKey}: ${
            placeholderError instanceof Error ? placeholderError.message : String(placeholderError)
          }`,
        );
      }
    }
  }

  return { converted, skipped, failed, bytesBefore, bytesAfter, keyMap };
}

function replaceMediaKeys(value: unknown, keyMap: Map<string, string>): { value: unknown; replacements: number } {
  if (typeof value === "string") {
    const replacement = keyMap.get(value);
    return {
      value: replacement ?? value,
      replacements: replacement ? 1 : 0,
    };
  }

  if (Array.isArray(value)) {
    let replacements = 0;
    const updated = value.map((item) => {
      const result = replaceMediaKeys(item, keyMap);
      replacements += result.replacements;
      return result.value;
    });
    return { value: updated, replacements };
  }

  if (value && typeof value === "object") {
    let replacements = 0;
    const updated: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const result = replaceMediaKeys(item, keyMap);
      replacements += result.replacements;
      updated[key] = result.value;
    }
    return { value: updated, replacements };
  }

  return { value, replacements: 0 };
}

async function updateCatalog(options: CliOptions, keyMap: Map<string, string>): Promise<number> {
  const catalog = JSON.parse(await readFile(options.catalogPath, "utf8")) as unknown;
  const result = replaceMediaKeys(catalog, keyMap);

  if (!options.dryRun) {
    await writeFile(options.catalogPath, `${JSON.stringify(result.value, null, 2)}\n`, "utf8");
  }

  return result.replacements;
}

async function deleteOriginals(keyMap: Map<string, string>, options: CliOptions): Promise<number> {
  if (!options.deleteOriginals || options.dryRun) {
    return 0;
  }

  let deleted = 0;
  for (const key of keyMap.keys()) {
    await unlink(resolve(mediaRoot, key));
    deleted += 1;
  }
  return deleted;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const options = parseOptions(process.argv.slice(2));
const result = await convertMedia(options);
const replacements = await updateCatalog(options, result.keyMap);
const deleted = await deleteOriginals(result.keyMap, options);

console.log(`Converted ${result.converted} seed asset(s) to WebP.`);
console.log(`Reused ${result.skipped} existing WebP asset(s).`);
if (result.failed > 0) {
  console.log(`Failed to convert ${result.failed} asset(s).`);
}
console.log(`Updated ${replacements} catalog media reference(s).`);
console.log(`Seed raster size: ${formatBytes(result.bytesBefore)} -> ${formatBytes(result.bytesAfter)}.`);
if (deleted > 0) {
  console.log(`Deleted ${deleted} original raster asset(s).`);
}
