import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AppSurface, AppSurfaceType, AuthType, CatalogApp, CategoryRecord, McpTransport, SeedCatalog } from "../lib/types";
import { slugify } from "../lib/utils";

interface PublicClaudeConnector {
  page: number;
  name: string;
  slug: string;
  href: string;
  tagline?: string;
  iconUrl?: string;
  categories: string[];
  worksWith: string[];
  date?: string;
  detail?: PublicClaudeConnectorDetail;
}

interface PublicClaudeConnectorDetail {
  name?: string;
  tagline?: string;
  iconUrl?: string;
  capabilities: string[];
  directoryLinks: Array<{
    id: string;
    href: string;
    label?: string;
  }>;
  installCmd?: string;
  documentationUrl?: string;
  privacyUrl?: string;
  supportUrl?: string;
}

interface CliOptions {
  catalogPath: string;
  rawPath: string;
}

const sourceUrl = "https://claude.com/connectors";
const requestTimeoutMs = 20_000;
const detailConcurrency = Number(process.env.CLAUDE_CONNECTOR_DETAIL_CONCURRENCY ?? "8");

function parseCliOptions(argv: string[]): CliOptions {
  return {
    catalogPath: resolve(process.cwd(), argv[0] ?? "seed/chatgpt-apps.json"),
    rawPath: resolve(process.cwd(), argv[1] ?? "tmp-claude-public-connectors.json"),
  };
}

function decodeHtml(value: string | undefined): string {
  return (value ?? "")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string | undefined): string {
  return decodeHtml((value ?? "").replace(/<[^>]+>/g, ""));
}

function readAttribute(html: string, name: string): string | undefined {
  const match = html.match(new RegExp(`${name}="([^"]*)"`));
  const value = decodeHtml(match?.[1]);
  return value || undefined;
}

function allFields(html: string, field: string): string[] {
  return [...html.matchAll(new RegExp(`<div fs-list-field="${field}"[^>]*>([\\s\\S]*?)<\\/div>`, "g"))]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
}

function oneField(html: string, field: string): string | undefined {
  return allFields(html, field)[0];
}

function absoluteConnectorHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `https://claude.com${href.startsWith("/") ? href : `/${href}`}`;
}

function connectorSlugFromHref(href: string | undefined): string | undefined {
  return href?.split("/").filter(Boolean).at(-1);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; mcpapp-crawler/1.0)" },
    redirect: "follow",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractTotalPages(html: string): number {
  const pages = [...html.matchAll(/\b(\d+)\s*\/\s*(\d+)\b/g)].map((match) => Number(match[2]));
  return Math.max(1, ...pages.filter(Number.isFinite));
}

function extractConnectorCards(html: string, page: number): PublicClaudeConnector[] {
  const connectors: PublicClaudeConnector[] = [];
  const itemPattern =
    /<div role="listitem" class="stories_cms_item w-dyn-item">([\s\S]*?)(?=<div role="listitem" class="stories_cms_item w-dyn-item">|<div role="navigation"|<\/main>|$)/g;

  for (const match of html.matchAll(itemPattern)) {
    const block = match[1];
    const anchorStart = block.indexOf('<a fs-list-element="item-link"');
    if (anchorStart === -1) continue;

    const anchor = block.slice(anchorStart);
    const href = absoluteConnectorHref(readAttribute(anchor, "href"));
    const name = oneField(anchor, "name") ?? readAttribute(anchor, "data-cta-copy");
    const slug = connectorSlugFromHref(href);
    if (!href || !name || !slug) continue;

    const tagline = stripTags(anchor.match(/<p class="u-text-style-caption[^>]*>([\s\S]*?)<\/p>/)?.[1]);
    const iconUrl = decodeHtml(anchor.match(/<img[^>]*\ssrc="([^"]*)"/)?.[1]);

    connectors.push({
      page,
      name,
      slug,
      href,
      tagline: tagline || undefined,
      iconUrl: iconUrl || undefined,
      categories: allFields(block, "usecase"),
      worksWith: allFields(block, "works-with"),
      date: oneField(block, "date"),
    });
  }

  return connectors;
}

function parseDetail(html: string): PublicClaudeConnectorDetail {
  const title = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]);
  const tagline = decodeHtml(html.match(/<meta content="([^"]*)" name="description"/)?.[1]);
  const iconUrl = decodeHtml(html.match(/<div class="hero_connector_icon[\s\S]*?<img[^>]*\ssrc="([^"]*)"/)?.[1]);
  const directoryLinks: PublicClaudeConnectorDetail["directoryLinks"] = [];

  for (const match of html.matchAll(/<a[^>]*href="(https:\/\/claude\.ai\/directory\/([^"]+))"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = decodeHtml(match[1]);
    const id = decodeHtml(match[2]);
    const label = stripTags(match[3]);
    if (id && !directoryLinks.some((link) => link.id === id)) {
      directoryLinks.push({ id, href, label: label || undefined });
    }
  }

  const installCmd = decodeHtml(html.match(/data-copy="([^"]+)"/)?.[1]);
  const links = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: decodeHtml(match[1]),
    label: stripTags(match[2]).toLowerCase(),
  }));

  return {
    name: title || undefined,
    tagline: tagline || undefined,
    iconUrl: iconUrl || undefined,
    capabilities: allFields(html, "capabilities"),
    directoryLinks,
    installCmd: installCmd || undefined,
    documentationUrl: links.find((link) => link.label.includes("documentation"))?.href,
    privacyUrl: links.find((link) => link.label.includes("privacy"))?.href,
    supportUrl: links.find((link) => link.label.includes("support"))?.href,
  };
}

async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  map: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;

  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await map(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

async function scrapeConnectors(): Promise<PublicClaudeConnector[]> {
  const firstHtml = await fetchText(sourceUrl);
  const totalPages = extractTotalPages(firstHtml);
  const pages = [{ page: 1, html: firstHtml }];

  for (let page = 2; page <= totalPages; page += 1) {
    pages.push({
      page,
      html: await fetchText(`${sourceUrl}?cc61befa_page=${page}`),
    });
  }

  const connectors = pages.flatMap(({ page, html }) => extractConnectorCards(html, page));
  const unique = new Map(connectors.map((connector) => [connector.href, connector]));
  const detailed = await mapConcurrent([...unique.values()], detailConcurrency, async (connector) => {
    try {
      return {
        ...connector,
        detail: parseDetail(await fetchText(connector.href)),
      };
    } catch (error) {
      console.warn(`Skipping Claude connector detail for ${connector.name}: ${error instanceof Error ? error.message : String(error)}`);
      return connector;
    }
  });

  return detailed;
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

function normalizeCategories(connector: PublicClaudeConnector): string[] {
  const categories = connector.categories.map((category) => slugify(category)).filter(Boolean);
  return categories.length > 0 ? categories : ["productivity"];
}

function inferCapabilities(connector: PublicClaudeConnector): string[] {
  const capabilities = new Set<string>(["Claude"]);
  const detailCapabilities = connector.detail?.capabilities ?? [];
  const installCmd = connector.detail?.installCmd ?? "";
  const endpoint = endpointFromInstallCmd(installCmd);

  if (connector.worksWith.some((item) => item.toLowerCase().includes("claude code")) || installCmd) {
    capabilities.add("Claude Code");
  }
  if (detailCapabilities.some((item) => item.toLowerCase().includes("interactive"))) {
    capabilities.add("Interactive");
  }
  if (detailCapabilities.some((item) => item.toLowerCase().includes("read"))) {
    capabilities.add("Reads");
  }
  if (detailCapabilities.some((item) => item.toLowerCase().includes("write"))) {
    capabilities.add("Writes");
  }
  if (endpoint) {
    capabilities.add("Remote MCP");
  }

  return [...capabilities];
}

function inferSurfaceType(connector: PublicClaudeConnector): AppSurfaceType {
  return (connector.detail?.capabilities ?? []).some((item) => item.toLowerCase().includes("interactive"))
    ? "interactive_connector"
    : "connector";
}

function endpointFromInstallCmd(installCmd: string | undefined): string | undefined {
  const match = installCmd?.match(/https?:\/\/(?:"[^"]+"|[^\s"']+)/);
  return match?.[0]?.replace(/^"|"$/g, "");
}

function parsePublishedAt(date: string | undefined, fallback: number): number {
  if (!date) return fallback;
  const parsed = Date.parse(`${date} UTC`);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function appIndexes(apps: CatalogApp[]) {
  const byId = new Map<string, CatalogApp>();
  const byName = new Map<string, CatalogApp>();
  const byClaudeExternalId = new Map<string, CatalogApp>();

  for (const app of apps) {
    byId.set(app.id, app);
    byName.set(slugify(app.name), app);
    for (const surface of app.surfaces) {
      if (surface.platform !== "claude") continue;
      if (surface.displayName) byName.set(slugify(surface.displayName), app);
      if (surface.externalId) byClaudeExternalId.set(surface.externalId, app);
    }
  }

  return { byId, byName, byClaudeExternalId };
}

function findExistingApp(catalog: SeedCatalog, connector: PublicClaudeConnector): CatalogApp | undefined {
  const indexes = appIndexes(catalog.apps);
  const directoryIds = connector.detail?.directoryLinks.map((link) => link.id) ?? [];

  for (const id of directoryIds) {
    const match = indexes.byClaudeExternalId.get(id);
    if (match) return match;
  }

  return indexes.byId.get(slugify(connector.slug)) ?? indexes.byName.get(slugify(connector.name));
}

function surfaceForConnector(
  connector: PublicClaudeConnector,
  externalId: string,
  url: string,
  isPrimary: boolean,
): AppSurface {
  const installCmd = connector.detail?.installCmd;
  const endpoint = endpointFromInstallCmd(installCmd);
  const capabilities = inferCapabilities(connector);
  const tagline = connector.detail?.tagline ?? connector.tagline;

  return {
    platform: "claude",
    type: inferSurfaceType(connector),
    displayName: connector.detail?.name ?? connector.name,
    tagline,
    description: tagline,
    url,
    externalId,
    mcpEndpoint: endpoint,
    mcpTransport: "http" satisfies McpTransport,
    installCmd,
    authType: "oauth" satisfies AuthType,
    capabilities,
    examplePrompts: [],
    tools: [],
    previews: [],
    isPrimary,
    status: "available",
  };
}

function mergePublicConnectors(catalog: SeedCatalog, connectors: PublicClaudeConnector[]) {
  const now = Date.now();
  let addedApps = 0;
  let addedSurfaces = 0;
  let skippedExisting = 0;

  for (const connector of connectors) {
    const existing = findExistingApp(catalog, connector);
    const directoryLinks = connector.detail?.directoryLinks ?? [];
    const externalLinks =
      directoryLinks.length > 0
        ? directoryLinks.map((link) => ({ externalId: link.id, url: link.href }))
        : [{ externalId: `claude.com/connectors:${connector.slug}`, url: connector.href }];

    if (existing) {
      let changed = false;
      for (const link of externalLinks) {
        if (existing.surfaces.some((surface) => surface.platform === "claude" && surface.externalId === link.externalId)) {
          skippedExisting += 1;
          continue;
        }

        existing.surfaces.push(surfaceForConnector(connector, link.externalId, link.url, false));
        existing.capabilities = [...new Set([...existing.capabilities, ...inferCapabilities(connector)])];
        existing.categories = [...new Set([...existing.categories, ...normalizeCategories(connector)])];
        existing.tools = existing.tools ?? [];
        changed = true;
        addedSurfaces += 1;
      }

      if (changed) {
        existing.iconUrl = existing.iconUrl ?? connector.detail?.iconUrl ?? connector.iconUrl;
        existing.homepageUrl = existing.homepageUrl ?? connector.href;
        existing.privacyUrl = existing.privacyUrl ?? connector.detail?.privacyUrl;
        existing.supportUrl = existing.supportUrl ?? connector.detail?.supportUrl;
        existing.updatedAt = now;
      }
      continue;
    }

    const externalLink = externalLinks[0];
    const tagline = connector.detail?.tagline ?? connector.tagline ?? "Connector for Claude.";
    const publishedAt = parsePublishedAt(connector.date, now);
    const capabilities = inferCapabilities(connector);

    catalog.apps.push({
      id: slugify(connector.slug),
      name: connector.detail?.name ?? connector.name,
      tagline,
      description: tagline || `Connect ${connector.name} to Claude.`,
      iconUrl: connector.detail?.iconUrl ?? connector.iconUrl,
      homepageUrl: connector.href,
      mcpEndpoint: endpointFromInstallCmd(connector.detail?.installCmd),
      mcpTransport: "http",
      installCmd: connector.detail?.installCmd,
      authType: "oauth",
      publisher: "Unknown",
      capabilities,
      privacyUrl: connector.detail?.privacyUrl,
      termsUrl: undefined,
      supportUrl: connector.detail?.supportUrl,
      status: "published",
      isFeatured: false,
      examplePrompts: [],
      source: "claude_seed",
      createdAt: now,
      updatedAt: now,
      publishedAt,
      surfaces: [surfaceForConnector(connector, externalLink.externalId, externalLink.url, true)],
      categories: normalizeCategories(connector),
      tags: [],
      tools: [],
      previews: [],
    });
    addedApps += 1;
  }

  catalog.categories = categoryRecords(catalog.apps);
  return { addedApps, addedSurfaces, skippedExisting };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const connectors = await scrapeConnectors();
  const catalog = JSON.parse(await readFile(options.catalogPath, "utf8")) as SeedCatalog;
  const result = mergePublicConnectors(catalog, connectors);

  await writeFile(options.rawPath, `${JSON.stringify({ crawledAt: new Date().toISOString(), sourceUrl, connectors }, null, 2)}\n`, "utf8");
  await writeFile(options.catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(`Fetched ${connectors.length} public Claude connector(s).`);
  console.log(`Added ${result.addedApps} Claude connector app(s).`);
  console.log(`Added ${result.addedSurfaces} Claude surface(s) to existing app(s).`);
  console.log(`Skipped ${result.skippedExisting} already indexed Claude surface(s).`);
}

await main();
