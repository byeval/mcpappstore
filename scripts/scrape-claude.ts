import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import type { AppPreview, AppSurfaceType, AuthType, CatalogApp, CategoryRecord, McpTransport, SeedCatalog } from "../lib/types";
import { slugify } from "../lib/utils";

interface ClaudeDirectoryResponse {
  servers?: ClaudeServer[];
}

interface ClaudeServer {
  id: string;
  name: string;
  display_name?: string | null;
  one_liner?: string | null;
  description?: string | null;
  icon_url?: string | null;
  image_urls?: Array<string | { prompt?: string | null; image_url?: string | null }> | null;
  author?: {
    name?: string | null;
    url?: string | null;
  } | null;
  tool_names?: string[] | null;
  categories?: string[] | null;
  documentation?: string | null;
  directory_url?: string | null;
  permissions?: string | null;
  claude_code_copy_text?: string | null;
  has_mcp_app?: boolean | null;
  support?: string | null;
  privacy_policy?: string | null;
  slug?: string | null;
  remote?: {
    url?: string | null;
    transport?: string | null;
    is_authless?: boolean | null;
  } | null;
}

interface AssetResult {
  key?: string;
  downloaded: boolean;
}

interface CliOptions {
  directoryPath: string;
  interactiveNamesPath: string;
  catalogPath: string;
}

const mediaRoot = resolve(process.cwd(), "seed/media");
const mediaExtensions = ["png", "jpg", "jpeg", "webp", "avif", "gif", "svg", "ico"];
const mediaDownloadTimeoutMs = 15_000;

function parseCliOptions(argv: string[]): CliOptions {
  return {
    directoryPath: resolve(process.cwd(), argv[0] ?? "tmp-claude-directory-servers.network-response"),
    interactiveNamesPath: resolve(process.cwd(), argv[1] ?? "tmp-claude-interactive-connectors.json"),
    catalogPath: resolve(process.cwd(), argv[2] ?? "seed/chatgpt-apps.json"),
  };
}

function normalizeText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/jpeg")) return "jpg";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/avif")) return "avif";
  if (contentType.includes("image/gif")) return "gif";
  if (contentType.includes("image/svg+xml")) return "svg";
  if (contentType.includes("image/x-icon") || contentType.includes("image/vnd.microsoft.icon")) return "ico";
  return null;
}

function extensionFromUrl(url: string | undefined): string | null {
  if (!url) return null;

  try {
    const extension = extname(new URL(url).pathname).replace(/^\./, "").toLowerCase();
    return extension || null;
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findExistingMediaKey(keyBase: string, hintedExtension: string): Promise<string | undefined> {
  const extensions = [hintedExtension, ...mediaExtensions.filter((extension) => extension !== hintedExtension)];

  for (const extension of extensions) {
    const key = `${keyBase}.${extension}`;
    if (await fileExists(resolve(mediaRoot, key))) {
      return key;
    }
  }

  return undefined;
}

function isImageUrlCandidate(url: string | undefined): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const extension = extensionFromUrl(url);
    if (extension && mediaExtensions.includes(extension)) return true;
    return (
      parsed.hostname.endsWith("storage.googleapis.com") ||
      parsed.hostname === "t0.gstatic.com" ||
      parsed.hostname === "raw.githubusercontent.com" ||
      parsed.hostname === "claude.ai" ||
      parsed.pathname.includes("/icons/")
    );
  } catch {
    return false;
  }
}

function faviconUrlForWebsite(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }

    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(parsed.href)}&size=128`;
  } catch {
    return undefined;
  }
}

function iconAssetUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (isImageUrlCandidate(url)) return url;
  return faviconUrlForWebsite(url);
}

async function downloadMediaAsset(
  url: string | undefined,
  keyBase: string,
  fallbackExtension: string,
): Promise<AssetResult> {
  if (!url) {
    return { key: undefined, downloaded: false };
  }

  const hintedExtension = extensionFromUrl(url) ?? fallbackExtension;
  const existingKey = await findExistingMediaKey(keyBase, hintedExtension);
  if (existingKey) {
    return { key: existingKey, downloaded: false };
  }

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(mediaDownloadTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  const actualExtension = extensionFromContentType(contentType) ?? extensionFromUrl(response.url) ?? hintedExtension;
  if (!actualExtension || !mediaExtensions.includes(actualExtension)) {
    throw new Error(`Skipped non-image asset ${url}`);
  }

  const assetKey = `${keyBase}.${actualExtension}`;
  const assetPath = resolve(mediaRoot, assetKey);

  await mkdir(dirname(assetPath), { recursive: true });
  await writeFile(assetPath, Buffer.from(await response.arrayBuffer()));

  return { key: assetKey, downloaded: true };
}

function inferTransport(transport: string | null | undefined): McpTransport {
  const normalized = transport?.toLowerCase() ?? "";
  if (normalized.includes("sse")) return "sse";
  if (normalized.includes("stdio")) return "stdio";
  return "http";
}

function inferAuthType(server: ClaudeServer): AuthType {
  return server.remote?.is_authless ? "none" : "oauth";
}

function normalizeCategories(server: ClaudeServer): string[] {
  const categories = (server.categories ?? [])
    .map((category) => slugify(category.replaceAll("_", " ")))
    .filter(Boolean);
  return categories.length > 0 ? categories : ["productivity"];
}

function normalizeCapabilities(server: ClaudeServer): string[] {
  const capabilities = new Set<string>(["Claude"]);
  const permissions = server.permissions?.toLowerCase() ?? "";

  if (server.has_mcp_app) {
    capabilities.add("Interactive");
  }
  if (server.remote?.url) {
    capabilities.add("Remote MCP");
  }
  if (server.claude_code_copy_text) {
    capabilities.add("Claude Code");
  }
  if (permissions.includes("read")) {
    capabilities.add("Reads");
  }
  if (permissions.includes("write")) {
    capabilities.add("Writes");
  }

  return [...capabilities];
}

function displayName(server: ClaudeServer): string {
  return server.display_name ?? server.name;
}

function surfaceType(server: ClaudeServer, interactiveNames: Set<string>): AppSurfaceType {
  return server.has_mcp_app === true && interactiveNames.has(server.name) ? "interactive_connector" : "connector";
}

function categoryRecords(apps: CatalogApp[]): CategoryRecord[] {
  const seen = new Map<string, CategoryRecord>();

  apps.flatMap((app) => app.categories).forEach((category, index) => {
    if (!seen.has(category)) {
      seen.set(category, {
        slug: category,
        name: category.replace(/-/g, " "),
        sort: index,
      });
    }
  });

  return [...seen.values()];
}

function findExistingApp(apps: CatalogApp[], server: ClaudeServer, duplicateNames: Set<string>): CatalogApp | undefined {
  const serverSlug = slugify(server.slug ?? server.name);
  const serverNameSlug = slugify(displayName(server));

  return apps.find((app) => {
    if (app.id === serverSlug) {
      return true;
    }
    if (duplicateNames.has(serverNameSlug)) {
      return false;
    }
    return slugify(app.name) === serverNameSlug;
  });
}

function appIdForServer(server: ClaudeServer, duplicateNames: Set<string>): string {
  const nameSlug = slugify(displayName(server));
  const slug = slugify(server.slug ?? "");
  const idSlug = slugify(server.id);

  if (slug) {
    return slug;
  }
  if (duplicateNames.has(nameSlug) && idSlug) {
    return idSlug;
  }

  return nameSlug || idSlug;
}

function surfaceUrl(server: ClaudeServer): string | undefined {
  return normalizeText(server.directory_url) ?? `https://claude.ai/directory/${server.id}`;
}

async function createPreviews(server: ClaudeServer, id: string, existingCount: number): Promise<{
  previews: AppPreview[];
  downloaded: number;
  skipped: number;
}> {
  const previews: AppPreview[] = [];
  let downloaded = 0;
  let skipped = 0;

  for (const [index, image] of (server.image_urls ?? []).entries()) {
    const imageUrl = typeof image === "string" ? image : image.image_url;
    const prompt = typeof image === "string" ? undefined : normalizeText(image.prompt);
    try {
      const asset = await downloadMediaAsset(
        normalizeText(imageUrl),
        `previews/${id}/claude-${index + 1}`,
        "jpg",
      );
      if (!asset.key) {
        skipped += 1;
        continue;
      }
      if (asset.downloaded) {
        downloaded += 1;
      }
      previews.push({
        sort: existingCount + previews.length,
        prompt: prompt ?? `Use ${server.name} in Claude`,
        caption: normalizeText(server.one_liner),
        imageKey: asset.key,
        imageUrl: normalizeText(imageUrl),
      });
    } catch (error) {
      skipped += 1;
      console.warn(`Skipping preview for ${server.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { previews, downloaded, skipped };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const directory = JSON.parse(await readFile(options.directoryPath, "utf8")) as ClaudeDirectoryResponse;
  const interactiveNames = new Set(JSON.parse(await readFile(options.interactiveNamesPath, "utf8")) as string[]);
  const catalog = JSON.parse(await readFile(options.catalogPath, "utf8")) as SeedCatalog;
  catalog.apps = catalog.apps
    .filter((app) => app.source !== "claude_seed")
    .map((app) => ({
      ...app,
      surfaces: app.surfaces.filter((surface) => surface.platform !== "claude"),
      previews: app.previews.filter((preview) => !preview.imageKey.includes("/claude-")),
    }));
  const servers = directory.servers ?? [];
  const nameCounts = new Map<string, number>();
  for (const server of servers) {
    const key = slugify(displayName(server));
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const duplicateNames = new Set([...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
  const now = Date.now();
  let downloadedIcons = 0;
  let downloadedPreviews = 0;
  let skippedPreviews = 0;
  let mergedApps = 0;
  let addedApps = 0;
  let interactiveSurfaces = 0;
  let connectorSurfaces = 0;

  for (const server of servers) {
    const id = appIdForServer(server, duplicateNames);
    const existing = findExistingApp(catalog.apps, server, duplicateNames);
    const appId = existing?.id ?? id;
    const sourceIconUrl = normalizeText(server.icon_url);
    const iconUrl = iconAssetUrl(sourceIconUrl);
    let iconKey: string | undefined;

    if (iconUrl) {
      try {
        const icon = await downloadMediaAsset(iconUrl, `icons/${appId}`, "png");
        iconKey = icon.key;
        if (icon.downloaded) {
          downloadedIcons += 1;
        }
      } catch (error) {
        console.warn(`Skipping icon for ${server.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const existingPreviewCount = existing?.previews.length ?? 0;
    const previewResult = await createPreviews(server, appId, existingPreviewCount);
    downloadedPreviews += previewResult.downloaded;
    skippedPreviews += previewResult.skipped;

    const type = surfaceType(server, interactiveNames);
    if (type === "interactive_connector") {
      interactiveSurfaces += 1;
    } else {
      connectorSurfaces += 1;
    }

    const surface = {
      platform: "claude" as const,
      type,
      displayName: displayName(server),
      tagline: normalizeText(server.one_liner),
      description: normalizeText(server.description),
      url: surfaceUrl(server),
      externalId: server.id,
      mcpEndpoint: normalizeText(server.remote?.url ?? undefined),
      mcpTransport: inferTransport(server.remote?.transport),
      installCmd: normalizeText(server.claude_code_copy_text),
      authType: inferAuthType(server),
      capabilities: normalizeCapabilities(server),
      examplePrompts: previewResult.previews.map((preview) => preview.prompt),
      tools: (server.tool_names ?? []).map((toolName) => ({ name: toolName })),
      previews: previewResult.previews,
      isPrimary: !existing,
      status: "available" as const,
    };

    if (existing) {
      if (!existing.iconKey && iconKey) {
        existing.iconKey = iconKey;
      }
      if (!existing.iconUrl && iconUrl) {
        existing.iconUrl = iconUrl;
      }
      existing.surfaces = [
        ...existing.surfaces.filter(
          (item) => !(item.platform === "claude" && item.externalId === server.id),
        ),
        surface,
      ];
      existing.capabilities = [...new Set([...existing.capabilities, ...normalizeCapabilities(server)])];
      existing.categories = [...new Set([...existing.categories, ...normalizeCategories(server)])];
      existing.updatedAt = now;
      mergedApps += 1;
      continue;
    }

    catalog.apps.push({
      id: appId,
      name: displayName(server),
      tagline: normalizeText(server.one_liner) ?? "Connector for Claude.",
      description: normalizeText(server.description) ?? normalizeText(server.one_liner) ?? "",
      iconKey,
      iconUrl,
      homepageUrl: normalizeText(server.author?.url ?? undefined) ?? sourceIconUrl,
      repoUrl: undefined,
      mcpEndpoint: normalizeText(server.remote?.url ?? undefined),
      mcpTransport: inferTransport(server.remote?.transport),
      installCmd: normalizeText(server.claude_code_copy_text),
      authType: inferAuthType(server),
      publisher: normalizeText(server.author?.name ?? undefined) ?? "Unknown",
      publisherUrl: normalizeText(server.author?.url ?? undefined),
      capabilities: normalizeCapabilities(server),
      privacyUrl: normalizeText(server.privacy_policy),
      termsUrl: undefined,
      supportUrl: normalizeText(server.support),
      status: "published",
      isFeatured: false,
      examplePrompts: [],
      source: "claude_seed",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      surfaces: [surface],
      categories: normalizeCategories(server),
      tags: [],
      tools: (server.tool_names ?? []).map((toolName) => ({ name: toolName })),
      previews: previewResult.previews,
    });
    addedApps += 1;
  }

  catalog.categories = categoryRecords(catalog.apps);

  await writeFile(options.catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(`Merged ${mergedApps} Claude surface(s) into existing app(s).`);
  console.log(`Added ${addedApps} Claude connector app(s).`);
  console.log(`Kept ${interactiveSurfaces} interactive Claude connector surface(s).`);
  console.log(`Kept ${connectorSurfaces} non-interactive Claude connector surface(s).`);
  console.log(`Downloaded ${downloadedIcons} icon(s) and ${downloadedPreviews} preview image(s).`);
  if (skippedPreviews > 0) {
    console.log(`Skipped ${skippedPreviews} preview image(s).`);
  }
}

await main();
