import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { getBucket } from "@/lib/cloudflare";

const staticAssetCacheControl = "public, max-age=31536000, immutable";
const mutableAssetCacheControl = "public, max-age=86400, stale-while-revalidate=604800";

function escapeSvg(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function contentTypeFromExtension(path: string): string {
  const extension = extname(path).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function labelFromPreviewKey(key: string): { appName: string; previewLabel: string } {
  const [, slug = "app", file = "preview"] = key.split("/");
  const appName = slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  const previewNumber = Number.parseInt(file, 10);

  return {
    appName: appName || "MCP App",
    previewLabel: Number.isFinite(previewNumber) ? `Preview ${previewNumber + 1}` : "Preview",
  };
}

function colorPairForKey(key: string): [string, string] {
  const pairs: Array<[string, string]> = [
    ["#56a8ff", "#ffe789"],
    ["#7c5cff", "#22d3ee"],
    ["#22c55e", "#d9f99d"],
    ["#f97316", "#fed7aa"],
    ["#0f172a", "#93c5fd"],
  ];
  const hash = [...key].reduce((total, char) => total + char.charCodeAt(0), 0);
  return pairs[hash % pairs.length]!;
}

function labelFromIconKey(key: string): { appName: string; initial: string } {
  const file = key.split("/").at(-1) ?? "app";
  const name = file.replace(/\.[^.]+$/, "");
  const appName = name
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

  return {
    appName: appName || "MCP App",
    initial: (appName || "M").slice(0, 1).toUpperCase(),
  };
}

function generatedIconAsset(key: string): Response {
  const { appName, initial } = labelFromIconKey(key);
  const [start, end] = colorPairForKey(key);
  const svg = `<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="58" fill="${start}"/>
  <rect width="256" height="256" rx="58" fill="url(#wash)"/>
  <text x="128" y="151" text-anchor="middle" fill="white" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="96" font-weight="750">${escapeSvg(initial)}</text>
  <title>${escapeSvg(appName)}</title>
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff" stop-opacity=".18"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
  </defs>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": staticAssetCacheControl,
    },
  });
}

function generatedPreviewAsset(key: string): Response {
  const { appName, previewLabel } = labelFromPreviewKey(key);
  const [start, end] = colorPairForKey(key);
  const svg = `<svg width="720" height="540" viewBox="0 0 720 540" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="540" fill="${start}"/>
  <rect width="720" height="540" fill="url(#wash)"/>
  <rect x="76" y="70" width="568" height="400" rx="34" fill="white" fill-opacity=".9"/>
  <rect x="116" y="126" width="184" height="20" rx="10" fill="#111827" fill-opacity=".18"/>
  <rect x="116" y="168" width="488" height="42" rx="21" fill="#dbeafe"/>
  <rect x="116" y="232" width="232" height="154" rx="24" fill="#fff1e6"/>
  <rect x="372" y="232" width="232" height="154" rx="24" fill="#eef2ff"/>
  <rect x="116" y="414" width="320" height="18" rx="9" fill="#111827" fill-opacity=".14"/>
  <text x="360" y="318" text-anchor="middle" fill="#111827" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="38" font-weight="700">${escapeSvg(appName)}</text>
  <text x="360" y="356" text-anchor="middle" fill="#4b5563" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="600">${escapeSvg(previewLabel)}</text>
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="720" y2="540" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff" stop-opacity=".1"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
  </defs>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": staticAssetCacheControl,
    },
  });
}

function missingAssetResponse(key: string): Response {
  if (key.startsWith("previews/")) {
    return generatedPreviewAsset(key);
  }

  if (key.startsWith("icons/")) {
    return generatedIconAsset(key);
  }

  return new Response("Not found", { status: 404 });
}

async function readLocalSeedAsset(key: string): Promise<Response | null> {
  const mediaRoot = resolve(process.cwd(), "seed/media");
  const assetPath = resolve(mediaRoot, key);

  if (!assetPath.startsWith(mediaRoot)) {
    return new Response("Invalid key", { status: 400 });
  }

  try {
    const file = await readFile(assetPath);
    return new Response(file, {
      headers: {
        "content-type": contentTypeFromExtension(assetPath),
        "cache-control": staticAssetCacheControl,
      },
    });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const bucket = await getBucket();
  if (!bucket) {
    const localAsset = await readLocalSeedAsset(key);
    return localAsset ?? missingAssetResponse(key);
  }

  const object = await bucket.get(key);
  if (!object) {
    const localAsset = await readLocalSeedAsset(key);
    return localAsset ?? missingAssetResponse(key);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", mutableAssetCacheControl);

  return new Response(object.body, { headers });
}
