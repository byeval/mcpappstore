import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const defaultSourceUrl = "https://raw.githubusercontent.com/punkpeye/awesome-mcp-clients/main/README.md";
const defaultOutputPath = "seed/awesome-mcp-clients.json";
const requestTimeoutMs = 20_000;
const userAgent = "mcpapp-client-importer/1.0 (+https://mcpapp.net)";

interface McpClientScreenshot {
  alt: string;
  url: string;
}

interface McpClient {
  id: string;
  name: string;
  summary: string;
  descriptionMarkdown: string;
  githubUrl?: string;
  websiteUrl?: string;
  license?: string;
  type?: string;
  platforms: string[];
  pricing?: string;
  programmingLanguages: string[];
  installCommands: string[];
  screenshots: McpClientScreenshot[];
  sourceUrl: string;
}

interface McpClientSeed {
  source: {
    name: string;
    repoUrl: string;
    readmeUrl: string;
  };
  generatedAt: string;
  clients: McpClient[];
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripMarkdown(value: string): string {
  return decodeHtml(value)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitList(value: string | undefined): string[] {
  if (!value || value === "-" || /^n\/a$/i.test(value)) return [];

  return value
    .split(/,|\||<br\s*\/?>/gi)
    .map((item) => stripMarkdown(item))
    .filter(Boolean);
}

function normalizeUrl(value: string | undefined): string | undefined {
  const clean = stripMarkdown(value ?? "");
  return clean && clean !== "-" && !/^n\/a$/i.test(clean) ? clean : undefined;
}

function parseTable(section: string): Record<string, string> {
  const table: Record<string, string> = {};
  const rowPattern = /<tr><th[^>]*>([\s\S]*?)<\/th><td>([\s\S]*?)<\/td><\/tr>/g;

  for (const match of section.matchAll(rowPattern)) {
    table[stripMarkdown(match[1]).toLowerCase()] = stripMarkdown(match[2]);
  }

  return table;
}

function extractDescription(section: string): string {
  const afterTable = section.replace(/<table>[\s\S]*?<\/table>/, "").trim();
  const withoutImages = afterTable.replace(/!\[[^\]]*\]\([^)]+\)/g, "").trim();
  const paragraphs = withoutImages
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !paragraph.startsWith("<") && !/^###\s/.test(paragraph));

  return paragraphs.join("\n\n").trim();
}

function summaryFromMarkdown(markdown: string, fallback: string): string {
  const text = stripMarkdown(markdown);
  const sentence = text.match(/^.{30,220}?(?:\.|\?|!)(?:\s|$)/)?.[0]?.trim();
  if (sentence) return sentence;
  const clipped = text.slice(0, 240).replace(/\s+\S*$/, "").trim();
  return clipped ? `${clipped.replace(/[.,;:!?]+$/, "")}.` : fallback;
}

function extractInstallCommands(section: string): string[] {
  return [...section.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
    .flatMap((match) => match[1].split("\n"))
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function extractScreenshots(section: string, sourceUrl: string): McpClientScreenshot[] {
  const screenshots: McpClientScreenshot[] = [];

  for (const match of section.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    const [, alt, rawUrl] = match;
    const url = rawUrl.startsWith("http")
      ? rawUrl
      : new URL(rawUrl.replace(/^\.\//, ""), sourceUrl.replace(/README\.md$/, "")).toString();
    screenshots.push({ alt: stripMarkdown(alt) || "Screenshot", url });
  }

  return screenshots;
}

function stringifyJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2).replace(/[^\x00-\x7F]/g, (character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) return "";
    if (codePoint <= 0xffff) return `\\u${codePoint.toString(16).padStart(4, "0")}`;
    const offset = codePoint - 0x10000;
    const high = 0xd800 + (offset >> 10);
    const low = 0xdc00 + (offset & 0x3ff);
    return `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
  })}\n`;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/markdown,text/plain,*/*;q=0.8",
        "user-agent": userAgent,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseClients(markdown: string, sourceUrl: string): McpClient[] {
  const headingPattern = /^###\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingPattern)].map((match) => ({
    name: stripMarkdown(match[1]),
    start: match.index ?? 0,
  }));

  const idCounts = new Map<string, number>();

  return headings.map((heading, index) => {
    const next = headings[index + 1]?.start ?? markdown.length;
    const section = markdown.slice(heading.start, next).trim();
    const table = parseTable(section);
    const descriptionMarkdown = extractDescription(section) || heading.name;
    const baseId = slugify(heading.name);
    const previousCount = idCounts.get(baseId) ?? 0;
    idCounts.set(baseId, previousCount + 1);
    const id = previousCount === 0 ? baseId : `${baseId}-${previousCount + 1}`;

    return {
      id,
      name: heading.name,
      summary: summaryFromMarkdown(descriptionMarkdown, heading.name),
      descriptionMarkdown,
      githubUrl: normalizeUrl(table.github),
      websiteUrl: normalizeUrl(table.website),
      license: table.license && table.license !== "-" ? table.license : undefined,
      type: table.type && table.type !== "-" ? table.type : undefined,
      platforms: splitList(table.platforms),
      pricing: table.pricing && table.pricing !== "-" ? table.pricing : undefined,
      programmingLanguages: splitList(table["programming languages"]),
      installCommands: extractInstallCommands(section),
      screenshots: extractScreenshots(section, sourceUrl),
      sourceUrl: `https://github.com/punkpeye/awesome-mcp-clients#${id}`,
    };
  });
}

async function main() {
  const sourceUrl = argValue("--source") ?? defaultSourceUrl;
  const outputPath = argValue("--output") ?? defaultOutputPath;
  const dryRun = process.argv.includes("--dry-run");
  const replaceExisting = process.argv.includes("--replace");
  const markdown = await fetchText(sourceUrl);
  const parsedClients = parseClients(markdown, sourceUrl);

  if (parsedClients.length === 0) {
    throw new Error("No MCP clients were found in the awesome-mcp-clients README.");
  }

  let clients = parsedClients;
  let preserved = 0;
  let added = parsedClients.length;
  let currentSeed: McpClientSeed | undefined;
  try {
    currentSeed = JSON.parse(await readFile(resolve(process.cwd(), outputPath), "utf8")) as McpClientSeed;
    const currentById = new Map(currentSeed.clients.map((client) => [client.id, client]));
    const parsedIds = new Set(parsedClients.map((client) => client.id));
    clients = parsedClients.map((client) => {
      const existing = currentById.get(client.id);
      if (existing && !replaceExisting) {
        preserved += 1;
        return existing;
      }
      return client;
    });

    for (const existing of currentSeed.clients) {
      if (!parsedIds.has(existing.id)) {
        preserved += 1;
        clients.push(existing);
      }
    }

    added = parsedClients.filter((client) => !currentById.has(client.id)).length;
  } catch (error) {
    if (!replaceExisting && !dryRun) {
      console.warn(`Could not read existing client seed; writing parsed clients only: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const next: McpClientSeed = {
    source: {
      name: "punkpeye/awesome-mcp-clients",
      repoUrl: "https://github.com/punkpeye/awesome-mcp-clients",
      readmeUrl: sourceUrl,
    },
    generatedAt: currentSeed && added === 0 && !replaceExisting ? currentSeed.generatedAt : new Date().toISOString(),
    clients,
  };

  if (!dryRun) {
    await writeFile(resolve(process.cwd(), outputPath), stringifyJson(next), "utf8");
  }

  console.log(JSON.stringify({ source: sourceUrl, output: outputPath, clients: clients.length, added, preserved, replaceExisting, dryRun }, null, 2));
}

await main();
