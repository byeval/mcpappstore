import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { CatalogSkill, SeedSkillAssociation, SeedSkillRegistry } from "../lib/types";

const defaultSourceUrl = "https://skills.sh/";
const defaultOutputPath = "seed/skills.json";
const importedIdPrefix = "skills-sh:";
const requestTimeoutMs = 15_000;
const defaultUserAgent = "mcpapp-skill-importer/1.0 (+https://mcpapp.net)";

interface SkillsShEntry {
  source: string;
  skillId: string;
  name: string;
  installs: number;
}

interface ImportOptions {
  sourceUrl: string;
  outputPath: string;
  limit: number;
  enrich: number;
  dryRun: boolean;
  minInstalls: number;
  associationsPath: string;
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseOptions(): ImportOptions {
  const limit = Number(argValue("--limit") ?? 250);
  const enrich = Number(argValue("--enrich") ?? 25);
  const minInstalls = Number(argValue("--min-installs") ?? 0);

  return {
    sourceUrl: argValue("--source") ?? defaultSourceUrl,
    outputPath: argValue("--output") ?? defaultOutputPath,
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 250,
    enrich: Number.isFinite(enrich) && enrich > 0 ? Math.floor(enrich) : 0,
    minInstalls: Number.isFinite(minInstalls) && minInstalls > 0 ? Math.floor(minInstalls) : 0,
    associationsPath: argValue("--associations") ?? "seed/app-skill-associations.json",
    dryRun: process.argv.includes("--dry-run"),
  };
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#<!-- -->x2F;", "/")
    .replaceAll("<!-- -->", "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function displayNameForSkill(name: string): string {
  const normalized = name.replace(/[_:]+/g, "-");
  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (["ai", "api", "cli", "css", "csv", "db", "d1", "docx", "html", "http", "json", "kv", "mcp", "pdf", "r2", "sdk", "seo", "sql", "ui", "ux", "xml"].includes(part.toLowerCase())) {
        return upper;
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function tokensForEntry(entry: SkillsShEntry): string[] {
  const sourceParts = entry.source.split(/[/-]/g);
  const skillParts = entry.name.split(/[-_:]/g);
  const tokens = [...sourceParts, ...skillParts, "skills.sh"]
    .map((token) => token.toLowerCase().trim())
    .filter((token) => token.length > 1 && !["skills", "skill", "agent"].includes(token));

  return Array.from(new Set(tokens)).slice(0, 12);
}

function categoriesForEntry(entry: SkillsShEntry): string[] {
  const haystack = `${entry.source} ${entry.name}`.toLowerCase();
  const categories: string[] = [];

  if (/(figma|design|ui|ux|frontend|css|react)/.test(haystack)) categories.push("design");
  if (/(github|git|code|developer|api|testing|deploy|vercel|cloudflare|supabase|firebase|azure|wrangler|next|react|vue|python|javascript|typescript|rust|go|node)/.test(haystack)) categories.push("developer-tools");
  if (/(gmail|email|calendar|workspace|slack|teams|meet)/.test(haystack)) categories.push("productivity");
  if (/(docx|pdf|xlsx|pptx|sheet|slides|document|spreadsheet|presentation)/.test(haystack)) categories.push("documents");
  if (/(finance|stripe|stock|payment|billing)/.test(haystack)) categories.push("finance");
  if (/(marketing|seo|content|copy|growth|sales)/.test(haystack)) categories.push("marketing");

  return Array.from(new Set(categories.length > 0 ? categories : ["productivity"]));
}

function skillsShDetailUrl(entry: Pick<SkillsShEntry, "source" | "skillId">): string {
  return `https://skills.sh/${entry.source}/${entry.skillId}`;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": defaultUserAgent,
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

function parseLeaderboardEntries(html: string): SkillsShEntry[] {
  const normalized = html.replace(/\\"/g, "\"").replace(/\\u002F/g, "/");
  const entries = new Map<string, SkillsShEntry>();
  const pattern = /\{"source":"([^"]+)","skillId":"([^"]+)","name":"([^"]+)","installs":(\d+)\}/g;

  for (const match of normalized.matchAll(pattern)) {
    const [, source, skillId, name, installs] = match;
    const key = `${source}/${skillId}`;

    if (!entries.has(key)) {
      entries.set(key, {
        source,
        skillId,
        name,
        installs: Number(installs),
      });
    }
  }

  return Array.from(entries.values()).sort((left, right) => right.installs - left.installs);
}

function extractSummary(html: string): string | undefined {
  const summaryStart = html.indexOf(">Summary</div>");
  if (summaryStart < 0) {
    return undefined;
  }

  const skillStart = html.indexOf(">SKILL.md</span>", summaryStart);
  const section = html.slice(summaryStart, skillStart > summaryStart ? skillStart : summaryStart + 8000);
  const text = normalizeWhitespace(
    decodeHtml(
      section
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<style[\s\S]*?<\/style>/g, " ")
        .replace(/<li[^>]*>/g, " - ")
        .replace(/<[^>]+>/g, " "),
    ),
  );

  const withoutHeading = text.replace(/^>?\s*Summary\s*/i, "").trim();
  return withoutHeading.length > 20 ? withoutHeading.slice(0, 900) : undefined;
}

async function enrichEntries(entries: SkillsShEntry[], enrichLimit: number): Promise<Map<string, string>> {
  const summaries = new Map<string, string>();
  const selected = entries.slice(0, enrichLimit);

  for (const entry of selected) {
    const url = skillsShDetailUrl(entry);
    try {
      const html = await fetchText(url);
      const summary = extractSummary(html);
      if (summary) {
        summaries.set(`${entry.source}/${entry.skillId}`, summary);
      }
    } catch (error) {
      console.warn(`Skipped detail enrichment for ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return summaries;
}

function skillForEntry(entry: SkillsShEntry, summary: string | undefined): CatalogSkill {
  const detailUrl = skillsShDetailUrl(entry);
  const tags = tokensForEntry(entry);

  return {
    id: `${importedIdPrefix}${entry.source}/${entry.skillId}`,
    name: entry.name,
    displayName: displayNameForSkill(entry.name),
    description:
      summary ??
      `Imported from skills.sh. Published by ${entry.source}; ${entry.installs.toLocaleString("en-US")} all-time installs on the skills.sh leaderboard.`,
    sourceType: "external",
    sourceUrl: detailUrl,
    categories: categoriesForEntry(entry),
    tags: Array.from(new Set([...tags, `installs-${entry.installs}`])),
    status: "available",
  };
}

async function main() {
  const options = parseOptions();
  const html = await fetchText(options.sourceUrl);
  const entries = parseLeaderboardEntries(html)
    .filter((entry) => entry.installs >= options.minInstalls)
    .slice(0, options.limit);

  if (entries.length === 0) {
    throw new Error("No skills.sh leaderboard entries were found in the fetched page.");
  }

  const summaries = await enrichEntries(entries, Math.min(options.enrich, entries.length));
  const importedSkills = entries.map((entry) => skillForEntry(entry, summaries.get(`${entry.source}/${entry.skillId}`)));
  const outputPath = resolve(process.cwd(), options.outputPath);
  const current = JSON.parse(await readFile(outputPath, "utf8")) as SeedSkillRegistry;
  const associations = JSON.parse(
    await readFile(resolve(process.cwd(), options.associationsPath), "utf8"),
  ) as SeedSkillAssociation[];
  const pinnedExternalSkillIds = new Set(
    associations
      .map((association) => association.skillId)
      .filter((skillId) => skillId.startsWith(importedIdPrefix)),
  );
  const importedSkillIds = new Set(importedSkills.map((skill) => skill.id));
  const localSkills = current.skills.filter((skill) => !skill.id.startsWith(importedIdPrefix));
  const preservedExternalSkills = current.skills.filter(
    (skill) =>
      skill.id.startsWith(importedIdPrefix) &&
      pinnedExternalSkillIds.has(skill.id) &&
      !importedSkillIds.has(skill.id),
  );
  const next: SeedSkillRegistry = {
    skills: [...localSkills, ...importedSkills, ...preservedExternalSkills].sort((left, right) => left.id.localeCompare(right.id)),
  };

  if (!options.dryRun) {
    await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        source: options.sourceUrl,
        output: options.outputPath,
        imported: importedSkills.length,
        preservedExternal: preservedExternalSkills.length,
        enriched: summaries.size,
        totalSkills: next.skills.length,
        dryRun: options.dryRun,
      },
      null,
      2,
    ),
  );
}

await main();
