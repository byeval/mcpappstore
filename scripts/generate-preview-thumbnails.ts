import { access, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import sharp from "sharp";

const previewRoot = resolve(process.cwd(), "seed/media/previews");
const thumbnailWidth = 360;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listPreviewImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPreviewImages(path)));
      continue;
    }

    if (entry.isFile() && extname(entry.name).toLowerCase() === ".webp" && !entry.name.endsWith(".thumb.webp")) {
      files.push(path);
    }
  }

  return files;
}

function thumbnailPathFor(path: string): string {
  return path.replace(/\.webp$/, ".thumb.webp");
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const files = await listPreviewImages(previewRoot);
let created = 0;
let reused = 0;
let failed = 0;
let bytes = 0;

for (const file of files) {
  const target = thumbnailPathFor(file);
  if (await fileExists(target)) {
    reused += 1;
    bytes += (await stat(target)).size;
    continue;
  }

  try {
    await mkdir(dirname(target), { recursive: true });
    await sharp(file)
      .resize({ width: thumbnailWidth, withoutEnlargement: true })
      .webp({ effort: 5, quality: 76, smartSubsample: true })
      .toFile(target);
    created += 1;
    bytes += (await stat(target)).size;
  } catch (error) {
    failed += 1;
    const key = relative(previewRoot, file).split("\\").join("/");
    console.warn(`Failed to create thumbnail for ${key}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`Created ${created} preview thumbnail(s).`);
console.log(`Reused ${reused} existing preview thumbnail(s).`);
if (failed > 0) {
  console.log(`Failed to create ${failed} preview thumbnail(s).`);
}
console.log(`Preview thumbnail size: ${formatBytes(bytes)}.`);
