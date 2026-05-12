import seedCatalog from "@/seed/chatgpt-apps.json";

import type { AppPreview, AppTool, CatalogApp, SeedCatalog } from "@/lib/types";
import { absoluteUrl, slugify } from "@/lib/utils";

const catalog = seedCatalog as SeedCatalog;

interface ImportedPreview {
  prompt: string;
  caption?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

interface ImportedApp {
  source: "catalog" | "metadata";
  name: string;
  tagline: string;
  description: string;
  publisher: string;
  homepageUrl?: string;
  repoUrl?: string;
  publisherUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  supportUrl?: string;
  version?: string;
  iconUrl?: string;
  capabilities: string[];
  categories: string[];
  tags: string[];
  tools: AppTool[];
  previews: ImportedPreview[];
  examplePrompts: string[];
  chatgptEnabled: boolean;
  claudeEnabled: boolean;
  chatgptUrl: string;
  claudeUrl: string;
  mcpEndpoint?: string;
  mcpTransport?: string;
  installCmd?: string;
  authType?: string;
}

function normalizeComparableUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function attributeValue(tag: string, attribute: string): string | undefined {
  const pattern = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = tag.match(pattern);
  return match?.[1] ? decodeEntities(match[1]) : undefined;
}

function metaContent(html: string, key: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = attributeValue(tag, "property") ?? attributeValue(tag, "name");
    if (property?.toLowerCase() === key.toLowerCase()) {
      const content = attributeValue(tag, "content");
      if (content) {
        return content;
      }
    }
  }

  return undefined;
}

function titleFromHtml(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1]) : undefined;
}

function iconFromHtml(html: string, baseUrl: URL): string | undefined {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const iconLink = links.find((tag) => attributeValue(tag, "rel")?.toLowerCase().includes("icon"));
  const href = iconLink ? attributeValue(iconLink, "href") : undefined;

  if (!href) {
    return undefined;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function cleanTitle(title: string, url: URL): string {
  const host = url.hostname.replace(/^www\./, "");
  return title
    .replace(/\s+[|–-]\s+ChatGPT.*$/i, "")
    .replace(/\s+[|–-]\s+Claude.*$/i, "")
    .replace(new RegExp(`\\s+[|–-]\\s+${host.replace(/\./g, "\\.")}$`, "i"), "")
    .trim();
}

function publisherFromUrl(url: URL): string {
  return url.hostname
    .replace(/^www\./, "")
    .split(".")[0]
    ?.split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ") || "Unknown";
}

function isBlockedHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    return true;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    const [first = 0, second = 0] = host.split(".").map((part) => Number.parseInt(part, 10));
    return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
  }

  return false;
}

function chatgptSlug(url: URL): string | undefined {
  const [, section, slug] = url.pathname.split("/");
  return section === "apps" ? slug : undefined;
}

function claudeDirectoryId(url: URL): string | undefined {
  const [, section, id] = url.pathname.split("/");
  return section === "directory" ? id : undefined;
}

function matchingCatalogApp(url: URL): CatalogApp | undefined {
  const comparable = normalizeComparableUrl(url.toString());
  const chatgptAppSlug = chatgptSlug(url);
  const claudeId = claudeDirectoryId(url);

  return catalog.apps.find((app) => {
    const urls = [app.homepageUrl, ...app.surfaces.map((surface) => surface.url)].map(normalizeComparableUrl);
    if (urls.includes(comparable)) {
      return true;
    }

    if (chatgptAppSlug && (app.id === chatgptAppSlug || slugify(app.name) === chatgptAppSlug)) {
      return true;
    }

    if (
      chatgptAppSlug &&
      app.surfaces.some(
        (surface) => surface.platform === "chatgpt" && normalizeComparableUrl(surface.url)?.includes(`/apps/${chatgptAppSlug}/`),
      )
    ) {
      return true;
    }

    if (claudeId && app.surfaces.some((surface) => surface.platform === "claude" && surface.externalId === claudeId)) {
      return true;
    }

    return false;
  });
}

function imageUrlForPreview(preview: AppPreview): string | undefined {
  if (preview.imageUrl) {
    return preview.imageUrl;
  }

  return preview.imageKey ? absoluteUrl(`/api/assets?key=${encodeURIComponent(preview.imageKey)}`) : undefined;
}

function catalogImport(app: CatalogApp): ImportedApp {
  const chatgptSurface = app.surfaces.find((surface) => surface.platform === "chatgpt");
  const claudeSurface = app.surfaces.find((surface) => surface.platform === "claude");
  const surfaceWithDetails = app.surfaces.find(
    (surface) => surface.previews?.length || surface.tools?.length || surface.examplePrompts?.length,
  );
  const previews = (surfaceWithDetails?.previews?.length ? surfaceWithDetails.previews : app.previews).slice(0, 3);
  const tools = (surfaceWithDetails?.tools?.length ? surfaceWithDetails.tools : app.tools).slice(0, 12);
  const examplePrompts = (
    surfaceWithDetails?.examplePrompts?.length ? surfaceWithDetails.examplePrompts : app.examplePrompts
  ).slice(0, 6);

  return {
    source: "catalog",
    name: app.name,
    tagline: surfaceWithDetails?.tagline ?? app.tagline,
    description: surfaceWithDetails?.description ?? app.description,
    publisher: app.publisher,
    homepageUrl: app.homepageUrl,
    repoUrl: app.repoUrl,
    publisherUrl: app.publisherUrl,
    privacyUrl: app.privacyUrl,
    termsUrl: app.termsUrl,
    supportUrl: app.supportUrl,
    version: app.version,
    iconUrl: app.iconUrl ?? (app.iconKey ? absoluteUrl(`/api/assets?key=${encodeURIComponent(app.iconKey)}`) : undefined),
    capabilities: [...new Set([...(surfaceWithDetails?.capabilities ?? []), ...app.capabilities])].slice(0, 8),
    categories: app.categories.slice(0, 4),
    tags: app.tags.slice(0, 8),
    tools,
    previews: previews.map((preview) => ({
      prompt: preview.prompt,
      caption: preview.caption,
      imageUrl: imageUrlForPreview(preview),
      ctaLabel: preview.ctaLabel,
      ctaUrl: preview.ctaUrl,
    })),
    examplePrompts,
    chatgptEnabled: Boolean(chatgptSurface),
    claudeEnabled: Boolean(claudeSurface),
    chatgptUrl: chatgptSurface?.url ?? "",
    claudeUrl: claudeSurface?.url ?? "",
    mcpEndpoint: surfaceWithDetails?.mcpEndpoint ?? app.mcpEndpoint,
    mcpTransport: surfaceWithDetails?.mcpTransport ?? app.mcpTransport,
    installCmd: surfaceWithDetails?.installCmd ?? app.installCmd,
    authType: surfaceWithDetails?.authType ?? app.authType,
  };
}

async function metadataImport(url: URL): Promise<ImportedApp> {
  const response = await fetch(url.toString(), {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "MCPAppBot/1.0 (+https://mcpapp.net)",
    },
  });

  if (!response.ok) {
    throw new Error(`Import failed with HTTP ${response.status}.`);
  }

  const html = await response.text();
  const rawTitle = metaContent(html, "og:title") ?? metaContent(html, "twitter:title") ?? titleFromHtml(html);
  const inferredName =
    rawTitle && !/^(chatgpt|claude)$/i.test(rawTitle) ? cleanTitle(rawTitle, url) : chatgptSlug(url)?.replace(/-/g, " ");
  const name = inferredName || publisherFromUrl(url);
  const description =
    metaContent(html, "og:description") ??
    metaContent(html, "twitter:description") ??
    metaContent(html, "description") ??
    `Imported metadata for ${name}. Review and add the MCP-specific details before submitting.`;
  const imageUrl = metaContent(html, "og:image") ?? metaContent(html, "twitter:image") ?? iconFromHtml(html, url);
  const normalizedImageUrl = imageUrl ? new URL(imageUrl, url).toString() : undefined;
  const isChatgpt = url.hostname.endsWith("chatgpt.com");
  const isClaude = url.hostname.endsWith("claude.ai");

  return {
    source: "metadata",
    name,
    tagline: description.slice(0, 140),
    description: description.length >= 40 ? description : `${description} Add more detail about what users can do with this MCP integration.`,
    publisher: publisherFromUrl(url),
    homepageUrl: isChatgpt || isClaude ? undefined : url.origin,
    publisherUrl: isChatgpt || isClaude ? undefined : url.origin,
    iconUrl: normalizedImageUrl,
    capabilities: isClaude || isChatgpt ? ["Interactive", "Tools"] : ["Tools"],
    categories: ["productivity"],
    tags: [],
    tools: [],
    previews: normalizedImageUrl
      ? [
          {
            prompt: `Use ${name} to complete a real workflow`,
            caption: description.slice(0, 160),
            imageUrl: normalizedImageUrl,
          },
        ]
      : [],
    examplePrompts: [`Use ${name} to complete a real workflow`],
    chatgptEnabled: isChatgpt,
    claudeEnabled: isClaude,
    chatgptUrl: isChatgpt ? url.toString() : "",
    claudeUrl: isClaude ? url.toString() : "",
    mcpTransport: "http",
    authType: "oauth",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return Response.json({ message: "URL is required." }, { status: 400 });
    }

    const url = new URL(body.url);
    if (url.protocol !== "https:" || isBlockedHost(url)) {
      return Response.json({ message: "Use a public https URL." }, { status: 400 });
    }

    const catalogApp = matchingCatalogApp(url);
    const imported = catalogApp ? catalogImport(catalogApp) : await metadataImport(url);

    return Response.json(imported, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return Response.json({ message }, { status: 400 });
  }
}
