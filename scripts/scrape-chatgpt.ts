import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import type { AuthType, CatalogApp, CategoryRecord, McpTransport, SeedCatalog } from "../lib/types";
import { slugify } from "../lib/utils";

interface LegacyRawRecord {
  name: string;
  tagline?: string;
  description?: string;
  iconUrl?: string;
  homepageUrl?: string;
  version?: string;
  developer?: string;
  category?: string | string[];
  capabilities?: string[];
  prompts?: string[];
  tools?: Array<{ name: string; description?: string }>;
  previews?: Array<{
    prompt: string;
    caption?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }>;
  privacyUrl?: string;
  termsUrl?: string;
  supportUrl?: string;
}

interface ChatgptDetailResponse {
  apps?: ChatgptDetailApp[];
}

interface ChatgptDirectoryResponse {
  featured?: {
    apps?: ChatgptDirectoryApp[];
  };
  categories?: Array<{
    id?: string | null;
    name?: string | null;
  }>;
}

interface ChatgptDirectoryBrowseResponse {
  apps?: ChatgptDirectoryApp[];
  category?: string;
  page?: {
    has_more?: boolean;
    cursor?: string | null;
  };
}

interface ChatgptDirectoryCrawlResponse {
  apps?: ChatgptDirectoryApp[];
  details?: ChatgptDetailApp[];
}

interface ChatgptDirectoryApp {
  id?: string;
  display_name?: string | null;
  developer_name?: string | null;
  subtitle?: string | null;
  distribution_channel?: string | null;
  labels?: Record<string, string | null> | null;
  logo_url?: string | null;
  logo_dark_url?: string | null;
  icon_assets?: Record<string, string | null> | null;
  icon_dark_assets?: Record<string, string | null> | null;
  categories?: string[];
}

interface ChatgptDetailApp {
  id?: string;
  name?: string;
  description?: string;
  base_url?: string | null;
  status?: string | null;
  connector_type?: string | null;
  labels?: Record<string, string | null> | null;
  supported_auth?: Array<{ type?: string | null }> | null;
  logo_url?: string | null;
  logo_url_dark?: string | null;
  icon_assets?: Record<string, string | null> | null;
  branding?: {
    category?: string | null;
    developer?: string | null;
    website?: string | null;
    privacy_policy?: string | null;
    terms_of_service?: string | null;
  } | null;
  app_metadata?: {
    review?: {
      status?: string | null;
    } | null;
    categories?: string[] | null;
    sub_categories?: string[] | null;
    seo_description?: string | null;
    subtitle?: string | null;
    screenshots?: Array<{
      url?: string | null;
      cdn_url?: string | null;
      file_id?: string | null;
      user_prompt?: string | null;
    }> | null;
    developer?: string | null;
    version?: string | null;
    customer_support?: string | null;
  } | null;
  actions?: unknown;
}

interface CliOptions {
  inputPath: string;
  outputPath: string;
  uploadR2: boolean;
  bucketName?: string;
  envName?: string;
}

interface AssetResult {
  key?: string;
  downloaded: boolean;
  uploaded: boolean;
}

const mediaRoot = resolve(process.cwd(), "seed/media");
const defaultInputPath = resolve(process.cwd(), "seed/raw-chatgpt-apps.json");
const defaultOutputPath = resolve(process.cwd(), "seed/chatgpt-apps.json");
const mediaExtensions = ["png", "jpg", "jpeg", "webp", "avif", "gif", "svg", "ico"];
const mediaDownloadTimeoutMs = 15_000;

function parseCliOptions(argv: string[]): CliOptions {
  const positional: string[] = [];
  let uploadR2 = process.env.SCRAPE_UPLOAD_R2 === "1";
  let bucketName = process.env.R2_BUCKET_NAME;
  let envName = process.env.CLOUDFLARE_ENV;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--upload-r2") {
      uploadR2 = true;
      continue;
    }
    if (arg === "--no-upload-r2") {
      uploadR2 = false;
      continue;
    }
    if (arg === "--bucket") {
      bucketName = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--bucket=")) {
      bucketName = arg.slice("--bucket=".length);
      continue;
    }
    if (arg === "--env") {
      envName = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--env=")) {
      envName = arg.slice("--env=".length);
      continue;
    }

    positional.push(arg);
  }

  return {
    inputPath: resolve(process.cwd(), positional[0] ?? defaultInputPath),
    outputPath: resolve(process.cwd(), positional[1] ?? defaultOutputPath),
    uploadR2,
    bucketName,
    envName,
  };
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }

  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/jpeg")) return "jpg";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/avif")) return "avif";
  if (contentType.includes("image/gif")) return "gif";
  if (contentType.includes("image/svg+xml")) return "svg";
  if (contentType.includes("image/x-icon") || contentType.includes("image/vnd.microsoft.icon")) return "ico";

  return null;
}

function contentTypeFromPath(path: string): string {
  switch (extname(path).toLowerCase()) {
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

function extensionFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

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

function normalizeText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeSentenceCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueSlug(base: string, fallback: string, seenIds: Set<string>): string {
  const normalizedBase = slugify(base) || slugify(fallback) || crypto.randomUUID().slice(0, 8);
  if (!seenIds.has(normalizedBase)) {
    seenIds.add(normalizedBase);
    return normalizedBase;
  }

  const suffix = slugify(fallback).slice(-12) || crypto.randomUUID().slice(0, 6);
  const next = `${normalizedBase}-${suffix}`.slice(0, 64);
  if (!seenIds.has(next)) {
    seenIds.add(next);
    return next;
  }

  const randomValue = `${normalizedBase}-${crypto.randomUUID().slice(0, 6)}`.slice(0, 64);
  seenIds.add(randomValue);
  return randomValue;
}

function normalizeCategories(records: CatalogApp[]): CategoryRecord[] {
  const seen = new Map<string, CategoryRecord>();
  records.flatMap((record) => record.categories).forEach((category, index) => {
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

function normalizeLabelCapabilities(labels: Record<string, string | null> | null | undefined): string[] {
  const capabilities = new Set<string>();

  if (labels?.interactive?.toLowerCase() === "true") {
    capabilities.add("Interactive");
  }
  if (labels?.consequential?.toLowerCase() === "true") {
    capabilities.add("Writes");
  }
  if (labels?.retrievable?.toLowerCase() === "true") {
    capabilities.add("Reads");
  }

  return [...capabilities];
}

function normalizeCapabilities(app: ChatgptDetailApp): string[] {
  return normalizeLabelCapabilities(app.labels);
}

function hasInteractiveLabel(app: ChatgptDetailApp): boolean {
  return app.labels?.interactive?.toLowerCase() === "true";
}

function hasInteractiveCapability(record: LegacyRawRecord): boolean {
  return (record.capabilities ?? []).some((capability) => capability.toLowerCase() === "interactive");
}

function hasPreviewImageUrl(preview: { imageUrl?: string | null; url?: string | null; cdn_url?: string | null }): boolean {
  return Boolean(normalizeText(preview.cdn_url ?? preview.url ?? preview.imageUrl ?? undefined));
}

function inferTransport(baseUrl: string | undefined): McpTransport {
  if (!baseUrl) {
    return "http";
  }

  const normalized = baseUrl.toLowerCase();
  if (normalized.includes("/sse")) {
    return "sse";
  }
  if (normalized.startsWith("stdio:")) {
    return "stdio";
  }

  return "http";
}

function inferAuthType(app: ChatgptDetailApp): AuthType {
  const authTypes = (app.supported_auth ?? [])
    .map((item) => item.type?.toUpperCase())
    .filter((value): value is string => Boolean(value));

  if (authTypes.includes("OAUTH")) {
    return "oauth";
  }
  if (authTypes.includes("API_KEY")) {
    return "api_key";
  }
  if (authTypes.includes("NONE")) {
    return "none";
  }

  return "oauth";
}

function normalizePrompt(prompt: string | null | undefined, appName: string): string | undefined {
  const trimmed = normalizeText(prompt);
  if (!trimmed) {
    return undefined;
  }

  const escapedName = appName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return trimmed.replace(new RegExp(`^@${escapedName}\\s+`, "i"), "").trim();
}

function extractTools(actions: unknown): Array<{ name: string; description?: string }> {
  if (!Array.isArray(actions)) {
    return [];
  }

  const tools: Array<{ name: string; description?: string }> = [];

  actions.forEach((action) => {
      if (!action || typeof action !== "object") {
        return;
      }

      const record = action as Record<string, unknown>;
      const name =
        normalizeText(typeof record.name === "string" ? record.name : undefined) ??
        normalizeText(typeof record.key === "string" ? record.key : undefined) ??
        normalizeText(typeof record.id === "string" ? record.id : undefined);
      if (!name) {
        return;
      }

      tools.push({
        name,
        description:
          normalizeText(typeof record.description === "string" ? record.description : undefined) ??
          normalizeText(typeof record.title === "string" ? record.title : undefined),
      });
    });

  return tools;
}

function selectIconUrl(app: ChatgptDetailApp): string | undefined {
  return (
    normalizeText(app.icon_assets?.["256_square"] ?? undefined) ??
    normalizeText(app.icon_assets?.["256_circle"] ?? undefined) ??
    normalizeText(app.logo_url ?? undefined) ??
    normalizeText(app.logo_url_dark ?? undefined)
  );
}

function selectDirectoryIconUrl(app: ChatgptDirectoryApp): string | undefined {
  return (
    normalizeText(app.icon_assets?.["256_square"] ?? undefined) ??
    normalizeText(app.icon_assets?.["256_circle"] ?? undefined) ??
    normalizeText(app.logo_url ?? undefined) ??
    normalizeText(app.logo_dark_url ?? undefined) ??
    normalizeText(app.icon_dark_assets?.["256_square"] ?? undefined) ??
    normalizeText(app.icon_dark_assets?.["256_circle"] ?? undefined)
  );
}

function normalizeDirectoryCategory(value: string | undefined): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  return slugify(normalized.replaceAll("_", " ")) || undefined;
}

function detailPreviews(app: ChatgptDetailApp, appName: string, id: string): CatalogApp["previews"] {
  return (app.app_metadata?.screenshots ?? []).filter(hasPreviewImageUrl).map((screenshot, previewIndex) => ({
    sort: previewIndex,
    prompt: screenshot.user_prompt?.trim() || `@${appName}`,
    caption: undefined,
    imageKey: `previews/${id}/${previewIndex + 1}.jpg`,
    imageUrl: normalizeText(screenshot.cdn_url ?? screenshot.url ?? undefined),
    ctaLabel: undefined,
    ctaUrl: undefined,
  }));
}

function parseLegacyRecords(source: LegacyRawRecord[]): CatalogApp[] {
  const now = Date.now();

  return source
    .filter((record) => hasInteractiveCapability(record))
    .filter((record) => (record.previews ?? []).some(hasPreviewImageUrl))
    .map((record, index) => {
      const id = slugify(record.name) || crypto.randomUUID().slice(0, 8);
      const categories = (Array.isArray(record.category) ? record.category : [record.category ?? "featured"]).map(
        (category) => slugify(category || "featured"),
      );
      const previews: CatalogApp["previews"] = (record.previews ?? [])
        .filter(hasPreviewImageUrl)
        .map((preview, previewIndex) => ({
          sort: previewIndex,
          prompt: preview.prompt,
          caption: preview.caption,
          imageKey: `previews/${id}/${previewIndex + 1}.jpg`,
          imageUrl: normalizeText(preview.imageUrl),
          ctaLabel: preview.ctaLabel,
          ctaUrl: preview.ctaUrl,
        }));

      return {
        id,
        name: record.name,
        tagline: record.tagline ?? "Imported from the ChatGPT apps directory.",
        description: record.description ?? record.tagline ?? "",
        iconKey: undefined,
        iconUrl: record.iconUrl,
        homepageUrl: record.homepageUrl,
        repoUrl: undefined,
        mcpEndpoint: undefined,
        mcpTransport: "http",
        installCmd: undefined,
        authType: "oauth",
        publisher: record.developer ?? "Unknown",
        publisherUrl: record.homepageUrl,
        capabilities: record.capabilities ?? [],
        version: record.version,
        privacyUrl: record.privacyUrl,
        termsUrl: record.termsUrl,
        supportUrl: record.supportUrl,
        status: "published",
        isFeatured: index < 6,
        examplePrompts: record.prompts ?? [],
        source: "chatgpt_seed",
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        surfaces: [
          {
            platform: "chatgpt",
            type: "app",
            displayName: record.name,
            tagline: record.tagline ?? "Imported from the ChatGPT apps directory.",
            description: record.description ?? record.tagline ?? "",
            url: record.homepageUrl,
            mcpTransport: "http",
            authType: "oauth",
            capabilities: record.capabilities ?? [],
            examplePrompts: record.prompts ?? [],
            tools: (record.tools ?? []).map((tool) => ({
              name: tool.name,
              description: tool.description,
            })),
            previews,
            isPrimary: true,
            status: "available",
          },
        ],
        categories,
        tags: [],
        tools: (record.tools ?? []).map((tool) => ({
          name: tool.name,
          description: tool.description,
        })),
        previews,
      } satisfies CatalogApp;
    });
}

function parseDetailResponse(source: ChatgptDetailResponse | ChatgptDetailApp[]): CatalogApp[] {
  const apps = Array.isArray(source) ? source : source.apps ?? [];
  const seenIds = new Set<string>();
  const now = Date.now();
  const normalizedApps: CatalogApp[] = [];

  for (const [index, app] of apps.entries()) {
    const appName = normalizeText(app.name);
    const iconUrl = selectIconUrl(app);
    const isInteractive = hasInteractiveLabel(app);
    const isReleased = app.app_metadata?.review?.status?.toUpperCase() === "RELEASED";
    const isEnabled = app.status?.toUpperCase() === "ENABLED";

    if (!appName || !isInteractive || !isReleased || !isEnabled) {
      continue;
    }

    const fallbackId = normalizeText(app.id) ?? appName;
    const id = uniqueSlug(appName, fallbackId, seenIds);
    const categoryTokens = [
      ...(app.app_metadata?.categories ?? []),
      ...(app.app_metadata?.sub_categories ?? []),
      ...(app.branding?.category ? [app.branding.category] : []),
    ]
      .map((value) => normalizeText(value))
      .filter((value): value is string => Boolean(value));
    const categories = (categoryTokens.length > 0 ? categoryTokens : ["featured"]).map((category) =>
      slugify(category.replaceAll("_", " ")) || "featured",
    );
    const homepageUrl = normalizeText(app.branding?.website ?? undefined);
    const description =
      normalizeText(app.description) ??
      normalizeText(app.app_metadata?.seo_description) ??
      normalizeText(app.app_metadata?.subtitle) ??
      "";
    const previews = detailPreviews(app, appName, id);
    const examplePrompts = previews
      .map((preview) => normalizePrompt(preview.prompt, appName))
      .filter((value): value is string => Boolean(value));

    normalizedApps.push({
      id,
      name: appName,
      tagline:
        normalizeText(app.app_metadata?.subtitle) ??
        normalizeText(app.app_metadata?.seo_description) ??
        "Imported from the ChatGPT apps directory.",
      description,
      iconKey: undefined,
      iconUrl,
      homepageUrl,
      repoUrl: undefined,
      mcpEndpoint: normalizeText(app.base_url ?? undefined),
      mcpTransport: inferTransport(normalizeText(app.base_url ?? undefined)),
      installCmd: undefined,
      authType: inferAuthType(app),
      publisher:
        normalizeText(app.app_metadata?.developer ?? undefined) ??
        normalizeText(app.branding?.developer ?? undefined) ??
        "Unknown",
      publisherUrl: homepageUrl,
      capabilities: normalizeCapabilities(app),
      version: normalizeText(app.app_metadata?.version ?? undefined),
      privacyUrl: normalizeText(app.branding?.privacy_policy ?? undefined),
      termsUrl: normalizeText(app.branding?.terms_of_service ?? undefined),
      supportUrl: normalizeText(app.app_metadata?.customer_support ?? undefined),
      status: "published",
      isFeatured: previews.length > 0 && (categories.includes("featured") || index < 6),
      examplePrompts,
      source: "chatgpt_seed",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      surfaces: [
        {
          platform: "chatgpt",
          type: "app",
          displayName: appName,
          tagline:
            normalizeText(app.app_metadata?.subtitle) ??
            normalizeText(app.app_metadata?.seo_description) ??
            "Imported from the ChatGPT apps directory.",
          description,
          url: `https://chatgpt.com/apps/${id}/${fallbackId}`,
          externalId: fallbackId,
          mcpEndpoint: normalizeText(app.base_url ?? undefined),
          mcpTransport: inferTransport(normalizeText(app.base_url ?? undefined)),
          authType: inferAuthType(app),
          capabilities: normalizeCapabilities(app),
          examplePrompts,
          tools: extractTools(app.actions),
          previews,
          isPrimary: true,
          status: "available",
        },
      ],
      categories,
      tags: [],
      tools: extractTools(app.actions),
      previews,
    });
  }

  return normalizedApps;
}

function parseDirectoryApps(cards: ChatgptDirectoryApp[], details: ChatgptDetailApp[] = []): CatalogApp[] {
  const now = Date.now();
  const seenIds = new Set<string>();
  const detailByExternalId = new Map(details.map((detail) => [detail.id, detail]));
  const normalizedApps: CatalogApp[] = [];

  for (const [index, card] of cards.entries()) {
    const externalId = normalizeText(card.id);
    const appName = normalizeText(card.display_name);

    if (!externalId || !appName) {
      continue;
    }

    const detail = detailByExternalId.get(externalId);
    const fallbackId = normalizeText(detail?.id) ?? externalId;
    const id = uniqueSlug(appName, fallbackId, seenIds);
    const sourceCategories = [
      ...(card.categories ?? []),
      ...(detail?.app_metadata?.categories ?? []),
      ...(detail?.app_metadata?.sub_categories ?? []),
      ...(detail?.branding?.category ? [detail.branding.category] : []),
    ]
      .map((category) => normalizeDirectoryCategory(category))
      .filter((category): category is string => Boolean(category));
    const categories = [...new Set(sourceCategories.length > 0 ? sourceCategories : ["featured"])];
    const previews = detail ? detailPreviews(detail, appName, id) : [];
    const examplePrompts = previews
      .map((preview) => normalizePrompt(preview.prompt, appName))
      .filter((value): value is string => Boolean(value));
    const homepageUrl = normalizeText(detail?.branding?.website ?? undefined);
    const tagline =
      normalizeText(detail?.app_metadata?.subtitle ?? undefined) ??
      normalizeText(card.subtitle) ??
      normalizeText(detail?.app_metadata?.seo_description ?? undefined) ??
      "Imported from the ChatGPT apps directory.";
    const description =
      normalizeText(detail?.description) ??
      normalizeText(detail?.app_metadata?.seo_description ?? undefined) ??
      normalizeText(card.subtitle) ??
      tagline;
    const capabilities = detail ? normalizeCapabilities(detail) : normalizeLabelCapabilities(card.labels);
    const tools = detail ? extractTools(detail.actions) : [];

    normalizedApps.push({
      id,
      name: appName,
      tagline,
      description,
      iconKey: undefined,
      iconUrl: detail ? selectIconUrl(detail) : selectDirectoryIconUrl(card),
      homepageUrl,
      repoUrl: undefined,
      mcpEndpoint: normalizeText(detail?.base_url ?? undefined),
      mcpTransport: inferTransport(normalizeText(detail?.base_url ?? undefined)),
      installCmd: undefined,
      authType: detail ? inferAuthType(detail) : "oauth",
      publisher:
        normalizeText(detail?.app_metadata?.developer ?? undefined) ??
        normalizeText(detail?.branding?.developer ?? undefined) ??
        normalizeText(card.developer_name) ??
        "Unknown",
      publisherUrl: homepageUrl,
      capabilities,
      version: normalizeText(detail?.app_metadata?.version ?? undefined),
      privacyUrl: normalizeText(detail?.branding?.privacy_policy ?? undefined),
      termsUrl: normalizeText(detail?.branding?.terms_of_service ?? undefined),
      supportUrl: normalizeText(detail?.app_metadata?.customer_support ?? undefined),
      status: "published",
      isFeatured: previews.length > 0 && (categories.includes("featured") || index < 6),
      examplePrompts,
      source: "chatgpt_seed",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      surfaces: [
        {
          platform: "chatgpt",
          type: "app",
          displayName: appName,
          tagline,
          description,
          url: `https://chatgpt.com/apps/${slugify(appName)}/${fallbackId}`,
          externalId: fallbackId,
          mcpEndpoint: normalizeText(detail?.base_url ?? undefined),
          mcpTransport: inferTransport(normalizeText(detail?.base_url ?? undefined)),
          authType: detail ? inferAuthType(detail) : "oauth",
          capabilities,
          examplePrompts,
          tools,
          previews,
          isPrimary: true,
          status: "available",
        },
      ],
      categories,
      tags: [],
      tools,
      previews,
    });
  }

  return normalizedApps;
}

function toCatalogApps(source: unknown): CatalogApp[] {
  if (Array.isArray(source) && source.every((item) => item && typeof item === "object" && "app_metadata" in item)) {
    return parseDetailResponse(source as ChatgptDetailApp[]);
  }

  if (
    source &&
    typeof source === "object" &&
    Array.isArray((source as ChatgptDirectoryCrawlResponse).apps) &&
    ((source as ChatgptDirectoryCrawlResponse).apps ?? []).some((item) => "display_name" in item)
  ) {
    const crawl = source as ChatgptDirectoryCrawlResponse;
    return parseDirectoryApps(crawl.apps ?? [], crawl.details ?? []);
  }

  if (source && typeof source === "object" && Array.isArray((source as ChatgptDirectoryResponse).featured?.apps)) {
    const directory = source as ChatgptDirectoryResponse;
    return parseDirectoryApps(
      (directory.featured?.apps ?? []).map((app) => ({
        ...app,
        categories: ["featured"],
      })),
    );
  }

  if (
    source &&
    typeof source === "object" &&
    Array.isArray((source as ChatgptDirectoryBrowseResponse).apps) &&
    ((source as ChatgptDirectoryBrowseResponse).apps ?? []).some((item) => "display_name" in item)
  ) {
    const browse = source as ChatgptDirectoryBrowseResponse;
    return parseDirectoryApps(
      (browse.apps ?? []).map((app) => ({
        ...app,
        categories: [browse.category ?? "featured"],
      })),
    );
  }

  if (
    source &&
    typeof source === "object" &&
    Array.isArray((source as ChatgptDetailResponse).apps)
  ) {
    return parseDetailResponse(source as ChatgptDetailResponse);
  }

  if (Array.isArray(source)) {
    return parseLegacyRecords(source as LegacyRawRecord[]);
  }

  throw new Error("Unsupported input shape. Expected a ChatGPT detail payload or the legacy raw records array.");
}

function detectBucketName(configText: string): string | undefined {
  const match = configText.match(/"bucket_name"\s*:\s*"([^"]+)"/);
  return match?.[1];
}

async function uploadFileToR2(
  assetPath: string,
  key: string,
  options: Pick<CliOptions, "bucketName" | "envName">,
): Promise<void> {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const bucketName =
    options.bucketName ??
    detectBucketName(await readFile(resolve(process.cwd(), "wrangler.jsonc"), "utf8"));

  if (!bucketName) {
    throw new Error("Could not resolve an R2 bucket. Pass --bucket <name> or set R2_BUCKET_NAME.");
  }

  const args = [
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucketName}/${key}`,
    "--file",
    assetPath,
    "--content-type",
    contentTypeFromPath(assetPath),
    "--remote",
    "--force",
  ];

  if (options.envName) {
    args.push("--env", options.envName);
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(npxCommand, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(stderr.trim() || `wrangler r2 object put exited with code ${code}`));
    });
  });
}

async function downloadMediaAsset(
  url: string | undefined,
  keyBase: string,
  fallbackExtension: string,
  options: Pick<CliOptions, "uploadR2" | "bucketName" | "envName">,
): Promise<AssetResult> {
  if (!url) {
    return { key: undefined, downloaded: false, uploaded: false };
  }

  const hintedExtension = extensionFromUrl(url) ?? fallbackExtension;
  const existingKey = await findExistingMediaKey(keyBase, hintedExtension);
  if (existingKey) {
    let uploaded = false;
    if (options.uploadR2) {
      await uploadFileToR2(resolve(mediaRoot, existingKey), existingKey, options);
      uploaded = true;
    }
    return { key: existingKey, downloaded: false, uploaded };
  }

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(mediaDownloadTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  const actualExtension =
    extensionFromContentType(contentType) ?? extensionFromUrl(response.url) ?? hintedExtension;
  const assetKey = `${keyBase}.${actualExtension}`;
  const assetPath = resolve(mediaRoot, assetKey);

  await mkdir(dirname(assetPath), { recursive: true });
  await writeFile(assetPath, Buffer.from(await response.arrayBuffer()));

  let uploaded = false;
  if (options.uploadR2) {
    await uploadFileToR2(assetPath, assetKey, options);
    uploaded = true;
  }

  return { key: assetKey, downloaded: true, uploaded };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  let rawSource: unknown;
  try {
    rawSource = JSON.parse(await readFile(options.inputPath, "utf8")) as unknown;
  } catch (error) {
    console.error(`Missing scrape input at ${options.inputPath}.`);
    console.error("Export the /backend-anon/apps/content?detail=full response to JSON first, then rerun:");
    console.error("  npm run scrape -- seed/raw-chatgpt-apps.json seed/chatgpt-apps.json --upload-r2");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }

  const source = toCatalogApps(rawSource);
  let downloadedIcons = 0;
  let downloadedPreviews = 0;
  let uploadedIcons = 0;
  let uploadedPreviews = 0;
  let keptWithoutPreviews = 0;
  let skippedPreviewAssets = 0;

  const apps: CatalogApp[] = [];

  for (const app of source) {
    let iconAsset: AssetResult = { key: undefined, downloaded: false, uploaded: false };
    try {
      iconAsset = await downloadMediaAsset(app.iconUrl, `icons/${app.id}`, "png", options);
    } catch (error) {
      console.warn(`Skipping icon for ${app.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (iconAsset.downloaded) {
      downloadedIcons += 1;
    }
    if (iconAsset.uploaded) {
      uploadedIcons += 1;
    }

    const previews: CatalogApp["previews"] = [];
    for (const preview of app.previews) {
      let previewAsset: AssetResult;
      try {
        previewAsset = await downloadMediaAsset(
          preview.imageUrl,
          `previews/${app.id}/${preview.sort + 1}`,
          "jpg",
          options,
        );
      } catch (error) {
        skippedPreviewAssets += 1;
        console.warn(`Skipping preview for ${app.name}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      if (!previewAsset.key) {
        skippedPreviewAssets += 1;
        continue;
      }
      if (previewAsset.downloaded) {
        downloadedPreviews += 1;
      }
      if (previewAsset.uploaded) {
        uploadedPreviews += 1;
      }

      previews.push({
        ...preview,
        sort: previews.length,
        imageKey: previewAsset.key,
      });
    }

    if (previews.length === 0) {
      keptWithoutPreviews += 1;
    }

    apps.push({
      ...app,
      iconKey: iconAsset.key,
      isFeatured: app.isFeatured && previews.length > 0,
      surfaces: app.surfaces.map((surface) =>
        surface.platform === "chatgpt"
          ? {
              ...surface,
              previews,
            }
          : surface,
      ),
      previews,
    });
  }

  const catalog: SeedCatalog = {
    categories: normalizeCategories(apps),
    apps,
  };

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(`Wrote normalized catalog JSON to ${options.outputPath}`);
  console.log(`Kept ${apps.length} ChatGPT app(s).`);
  console.log(`Kept ${keptWithoutPreviews} app(s) without usable preview images for SEO only.`);
  console.log(`Downloaded ${downloadedIcons} icon(s) and ${downloadedPreviews} preview image(s) into ${mediaRoot}`);
  if (skippedPreviewAssets > 0) {
    console.log(`Skipped ${skippedPreviewAssets} preview asset(s) that had no usable image.`);
  }
  if (options.uploadR2) {
    console.log(`Uploaded ${uploadedIcons} icon(s) and ${uploadedPreviews} preview image(s) to R2.`);
  }
}

await main();
