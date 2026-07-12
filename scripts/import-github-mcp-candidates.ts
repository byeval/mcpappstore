import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { CatalogApp, CategoryRecord, McpTransport, SeedCatalog } from "../lib/types";

const defaultDiscoveryPath = "reports/github-mcp-discovery.json";
const defaultOutputPath = "seed/chatgpt-apps.json";
const defaultReportPath = "reports/github-mcp-import-candidates.md";
const defaultJsonReportPath = "reports/github-mcp-import-candidates.json";
const defaultUserAgent = "mcpapp-github-mcp-importer/1.0 (+https://mcpapp.net)";
const requestTimeoutMs = 20_000;

interface GithubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  pushed_at: string;
  updated_at: string;
  license?: { spdx_id?: string | null } | null;
}

interface DiscoveryReport {
  generatedAt: string;
  repos: GithubRepo[];
}

interface ImportOptions {
  discoveryPath: string;
  outputPath: string;
  reportPath: string;
  jsonReportPath: string;
  limit: number;
  minScore: number;
  minStars: number;
  apply: boolean;
}

interface ScoredCandidate {
  repo: GithubRepo;
  id: string;
  name: string;
  score: number;
  reasons: string[];
  categories: string[];
  tags: string[];
  tools: string[];
  installCmd?: string;
  transport: McpTransport;
  authType: "none" | "oauth" | "api_key";
  readmeSnippet?: string;
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseOptions(): ImportOptions {
  const limit = Number(argValue("--limit") ?? 20);
  const minScore = Number(argValue("--min-score") ?? 140);
  const minStars = Number(argValue("--min-stars") ?? 25);

  return {
    discoveryPath: argValue("--discovery") ?? defaultDiscoveryPath,
    outputPath: argValue("--output") ?? defaultOutputPath,
    reportPath: argValue("--report") ?? defaultReportPath,
    jsonReportPath: argValue("--json-report") ?? defaultJsonReportPath,
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20,
    minScore: Number.isFinite(minScore) && minScore > 0 ? Math.floor(minScore) : 140,
    minStars: Number.isFinite(minStars) && minStars >= 0 ? Math.floor(minStars) : 25,
    apply: process.argv.includes("--apply"),
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function titleize(input: string): string {
  return input
    .replace(/^mcp[-_ ]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\b(Api|Aws|Cli|Db|Mcp|Pdf|Sql|Ui)\b/g, (word) => word.toUpperCase())
    .replace(/\bCircleci\b/g, "CircleCI")
    .replace(/\bNotebooklm\b/g, "NotebookLM")
    .replace(/\bSequentialthinking\b/g, "Sequential Thinking");
}

function repoDisplayName(repo: GithubRepo): string {
  const repoName = repo.full_name.split("/")[1] ?? repo.full_name;
  const cleaned = repoName
    .replace(/^mcp[-_]?server[-_]?/i, "")
    .replace(/^mcp[-_]/i, "")
    .replace(/[-_]?mcp[-_]?server$/i, "")
    .replace(/[-_]?server[-_]?mcp$/i, "")
    .replace(/[-_]?mcp$/i, "");
  const displayName = titleize(cleaned);

  return displayName.length <= 3 ? `${displayName.toUpperCase()} MCP Server` : displayName;
}

async function fetchReadme(repo: GithubRepo): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const headers: Record<string, string> = {
    accept: "application/vnd.github.raw+json",
    "user-agent": defaultUserAgent,
    "x-github-api-version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, { headers, signal: controller.signal });
    if (!response.ok) {
      return undefined;
    }
    return (await response.text()).slice(0, 80_000);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function includesAny(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

function extractInstallCmd(readme: string | undefined, repo: GithubRepo): string | undefined {
  const text = readme ?? "";
  const codeBlocks = [...text.matchAll(/```(?:bash|sh|shell|zsh|json|toml)?\n([\s\S]*?)```/gi)].map((match) => match[1].trim());
  const commands = codeBlocks
    .flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.replace(/^\s*\$\s*/, "").trim())
    .filter((line) => /^(npx|uvx|pipx|docker run|claude mcp add|npm i|npm install|pnpm dlx|bunx)\b/i.test(line));

  const serverCommand = commands.find((line) => /mcp|server|uvx|npx|docker/i.test(line));
  if (serverCommand) {
    return serverCommand.slice(0, 240);
  }

  if (repo.language === "Python") {
    return `uvx ${repo.full_name.split("/")[1]}`;
  }

  if (repo.language === "TypeScript" || repo.language === "JavaScript") {
    return `npx -y ${repo.full_name.split("/")[1]}`;
  }

  return undefined;
}

function extractTools(readme: string | undefined, repo: GithubRepo): string[] {
  const haystack = `${repo.full_name} ${repo.description ?? ""} ${repo.topics?.join(" ") ?? ""} ${readme?.slice(0, 12000) ?? ""}`.toLowerCase();
  const toolPairs: Array<[RegExp, string]> = [
    [/aws|cloudformation|lambda|s3|dynamodb|bedrock/, "aws"],
    [/github|pull request|issues?/, "github"],
    [/browser|playwright|puppeteer|chrome/, "browser"],
    [/postgres|postgresql|mysql|sqlite|database|sql\b/, "query"],
    [/filesystem|file system|\bfiles?\b/, "filesystem"],
    [/fetch|http|openapi|api/, "fetch"],
    [/search|brave|web search|tavily/, "search"],
    [/slack|discord|teams/, "message"],
    [/notion|docs?|document|pdf/, "read_document"],
    [/kubernetes|docker|terraform|devops/, "inspect_infra"],
  ];

  return Array.from(new Set(toolPairs.filter(([pattern]) => pattern.test(haystack)).map(([, tool]) => tool))).slice(0, 6);
}

function inferCategories(repo: GithubRepo, readme: string | undefined): string[] {
  const haystack = `${repo.full_name} ${repo.description ?? ""} ${repo.topics?.join(" ") ?? ""} ${readme?.slice(0, 12000) ?? ""}`.toLowerCase();
  const categories = ["mcp", "developer-tools"];
  const rules: Array<[RegExp, string]> = [
    [/aws|azure|gcp|cloudflare|kubernetes|terraform|docker|devops/, "devops"],
    [/postgres|mysql|sqlite|database|sql\b|redis|mongodb/, "data"],
    [/browser|playwright|puppeteer|chrome|web scraping|scraper/, "browser"],
    [/security|snyk|vulnerab|audit|threat/, "security"],
    [/finance|stripe|payment|billing|stock|crypto/, "finance"],
    [/pdf|document|notion|google drive|docs?/, "documents"],
    [/figma|design|image|creative/, "design"],
    [/slack|gmail|email|calendar|productivity/, "productivity"],
    [/search|rag|vector|knowledge|retrieval/, "search"],
  ];

  for (const [pattern, category] of rules) {
    if (pattern.test(haystack)) categories.push(category);
  }

  return Array.from(new Set(categories)).slice(0, 8);
}

function inferTransport(readme: string | undefined): McpTransport {
  const haystack = (readme ?? "").toLowerCase();
  if (/streamable http|\/mcp\b|--transport http|transport["': ]+http/.test(haystack)) return "http";
  if (/server-sent events|\bsse\b|--transport sse/.test(haystack)) return "sse";
  return "stdio";
}

function inferAuthType(readme: string | undefined, repo: GithubRepo): "none" | "oauth" | "api_key" {
  const haystack = `${repo.description ?? ""} ${readme?.slice(0, 12000) ?? ""}`.toLowerCase();
  if (/oauth/.test(haystack)) return "oauth";
  if (/api[_ -]?key|token|secret|credential/.test(haystack)) return "api_key";
  return "none";
}

function scoreCandidate(repo: GithubRepo, readme: string | undefined, existingRepoUrls: Set<string>, existingIds: Set<string>): ScoredCandidate | null {
  const name = repoDisplayName(repo);
  const id = slugify(repo.full_name.replace("/", "-").replace(/-mcp-server$/i, "").replace(/-server$/i, ""));
  if (!id || existingIds.has(id) || existingRepoUrls.has(repo.html_url.toLowerCase())) {
    return null;
  }

  const topics = repo.topics ?? [];
  const haystack = `${repo.full_name} ${repo.description ?? ""} ${topics.join(" ")} ${readme?.slice(0, 20000) ?? ""}`.toLowerCase();
  const repositoryName = repo.full_name.split("/")[1]?.toLowerCase() ?? repo.full_name.toLowerCase();
  const looksLikeAggregate = includesAny(haystack, [
    /awesome[- ]mcp/,
    /collection of mcp/,
    /curated list/,
    /\bcurriculum\b/,
    /\btutorial\b/,
    /\bexamples? only\b/,
    /\binspector\b/,
    /\bdirectory\b/,
    /\bhub\b/,
    /\bgateway\b/,
    /\bframework\b/,
    /\bclient\b/,
  ]);
  const focusedServerName = /\bmcp[-_ ]?.*server\b|\bserver[-_ ]?.*mcp\b|mcpserver|mcp[-_]/i.test(repositoryName);
  const serverImplementationSignal = includesAny(haystack, [
    /claude_desktop_config/,
    /claude mcp add/,
    /mcp\.server/,
    /fastmcp/,
    /stdio/,
    /streamable http/,
  ]);

  if (looksLikeAggregate || (!focusedServerName && !serverImplementationSignal)) {
    return null;
  }

  const reasons: string[] = [];
  let score = 0;

  if (includesAny(haystack, [/\bmcp server\b/, /model context protocol/, /\bmodelcontextprotocol\b/])) {
    score += 70;
    reasons.push("mentions MCP server or Model Context Protocol");
  }
  if (topics.some((topic) => /^(mcp-server|mcp-servers|model-context-protocol|modelcontextprotocol)$/.test(topic))) {
    score += 45;
    reasons.push("has MCP server topic metadata");
  }
  if (readme && includesAny(readme.toLowerCase(), [/claude_desktop_config|claude mcp add|mcp\.server|fastmcp|stdio|streamable http/])) {
    score += 45;
    reasons.push("README includes MCP setup or server implementation signals");
  }
  if (repo.stargazers_count >= 5000) score += 35;
  else if (repo.stargazers_count >= 1000) score += 25;
  else if (repo.stargazers_count >= 250) score += 15;
  else if (repo.stargazers_count >= 50) score += 8;
  if (repo.forks_count >= 100) score += 10;
  if (repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION") {
    score += 10;
    reasons.push(`license: ${repo.license.spdx_id}`);
  }

  const pushedDays = Math.max(0, Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000));
  if (pushedDays <= 30) score += 20;
  else if (pushedDays <= 120) score += 10;
  else if (pushedDays > 365) score -= 25;

  if (!includesAny(haystack, [/\bmcp server\b/, /\bserver\b/, /fastmcp|stdio|streamable http/])) {
    score -= 40;
  }

  const tags = Array.from(new Set([
    "github-discovery",
    "mcp-server",
    repo.language?.toLowerCase(),
    ...(repo.topics ?? []),
    `stars-${repo.stargazers_count}`,
  ].filter(Boolean) as string[])).slice(0, 18);

  return {
    repo,
    id,
    name,
    score,
    reasons,
    categories: inferCategories(repo, readme),
    tags,
    tools: extractTools(readme, repo),
    installCmd: extractInstallCmd(readme, repo),
    transport: inferTransport(readme),
    authType: inferAuthType(readme, repo),
    readmeSnippet: readme?.slice(0, 500),
  };
}

function appForCandidate(candidate: ScoredCandidate, now: number): CatalogApp {
  const description = candidate.repo.description?.trim() || `${candidate.name} is an open-source MCP server discovered from GitHub. Review the repository README before enabling it in production agents.`;
  const tagline = description.length > 120 ? `${description.slice(0, 117).trim()}...` : description;
  const capabilities = Array.from(new Set([
    "Claude",
    "Claude Code",
    "Open source",
    "MCP server",
    candidate.transport === "stdio" ? "Local MCP" : "Remote MCP",
    candidate.authType === "none" ? "No auth" : candidate.authType === "oauth" ? "OAuth" : "API key",
  ]));
  const examplePrompts = [
    `Use ${candidate.name} to inspect available MCP tools and summarize what it can do.`,
    `Configure ${candidate.name} for a local Claude-compatible MCP client.`,
    `Review ${candidate.name}'s repository metadata before using it in a production agent.`,
  ];

  return {
    id: candidate.id,
    name: candidate.name,
    tagline,
    description,
    homepageUrl: candidate.repo.html_url,
    repoUrl: candidate.repo.html_url,
    mcpTransport: candidate.transport,
    installCmd: candidate.installCmd,
    authType: candidate.authType,
    publisher: candidate.repo.full_name.split("/")[0] ?? candidate.name,
    publisherUrl: `https://github.com/${candidate.repo.full_name.split("/")[0]}`,
    capabilities,
    version: undefined,
    status: "published",
    isFeatured: false,
    examplePrompts,
    source: "claude_seed",
    createdAt: now,
    updatedAt: new Date(candidate.repo.pushed_at).getTime() || now,
    publishedAt: now,
    surfaces: [
      {
        platform: "claude",
        type: "connector",
        displayName: candidate.name,
        tagline,
        description,
        url: candidate.repo.html_url,
        mcpTransport: candidate.transport,
        installCmd: candidate.installCmd,
        authType: candidate.authType,
        capabilities,
        examplePrompts,
        tools: candidate.tools.map((name) => ({ name })),
        previews: [],
        isPrimary: true,
        status: "available",
      },
    ],
    categories: candidate.categories,
    tags: candidate.tags,
    tools: candidate.tools.map((name) => ({ name })),
    previews: [],
  };
}

function ensureCategories(catalog: SeedCatalog, apps: CatalogApp[]): CategoryRecord[] {
  const bySlug = new Map(catalog.categories.map((category) => [category.slug, category]));
  const maxSort = Math.max(...catalog.categories.map((category) => category.sort), 0);
  let nextSort = maxSort + 10;

  for (const slug of new Set(apps.flatMap((app) => app.categories))) {
    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        slug,
        name: titleize(slug),
        sort: nextSort,
      });
      nextSort += 10;
    }
  }

  return [...bySlug.values()].sort((left, right) => left.sort - right.sort || left.slug.localeCompare(right.slug));
}

function markdownReport(candidates: ScoredCandidate[], options: ImportOptions): string {
  const lines = [
    "# GitHub MCP Import Candidates",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${options.apply ? "applied" : "review only"}`,
    `Minimum score: ${options.minScore}`,
    `Minimum stars: ${options.minStars}`,
    `Candidates: ${candidates.length}`,
    "",
    "| Candidate | Score | Stars | Pushed | Transport | Auth | Categories | Reasons |",
    "| --- | ---: | ---: | --- | --- | --- | --- | --- |",
  ];

  for (const candidate of candidates) {
    lines.push(
      `| [${candidate.repo.full_name}](${candidate.repo.html_url}) | ${candidate.score} | ${candidate.repo.stargazers_count} | ${candidate.repo.pushed_at.slice(0, 10)} | ${candidate.transport} | ${candidate.authType} | ${candidate.categories.join(", ")} | ${candidate.reasons.join("; ").replace(/\|/g, "\\|")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseOptions();
  const [catalogRaw, discoveryRaw] = await Promise.all([
    readFile(resolve(process.cwd(), options.outputPath), "utf8"),
    readFile(resolve(process.cwd(), options.discoveryPath), "utf8"),
  ]);
  const catalog = JSON.parse(catalogRaw) as SeedCatalog;
  const baseApps = options.apply ? catalog.apps.filter((app) => !app.tags.includes("github-discovery")) : catalog.apps;
  const baseCatalog: SeedCatalog = { ...catalog, apps: baseApps };
  const discovery = JSON.parse(discoveryRaw) as DiscoveryReport;
  const existingRepoUrls = new Set(baseApps.map((app) => app.repoUrl?.toLowerCase()).filter(Boolean) as string[]);
  const existingIds = new Set(baseApps.map((app) => app.id));
  const scored: ScoredCandidate[] = [];

  for (const repo of discovery.repos) {
    const readme = await fetchReadme(repo);
    const candidate = scoreCandidate(repo, readme, existingRepoUrls, existingIds);
    if (candidate && candidate.score >= options.minScore && repo.stargazers_count >= options.minStars) {
      scored.push(candidate);
    }
  }

  const selected = scored
    .sort((left, right) => right.score - left.score || right.repo.stargazers_count - left.repo.stargazers_count)
    .slice(0, options.limit);

  await mkdir(dirname(resolve(process.cwd(), options.reportPath)), { recursive: true });
  await writeFile(resolve(process.cwd(), options.reportPath), markdownReport(selected, options), "utf8");
  await writeFile(
    resolve(process.cwd(), options.jsonReportPath),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), applied: options.apply, candidates: selected }, null, 2)}\n`,
    "utf8",
  );

  if (options.apply) {
    const now = Date.now();
    const apps = selected.map((candidate) => appForCandidate(candidate, now));
    const next: SeedCatalog = {
      categories: ensureCategories(baseCatalog, apps),
      apps: [...baseApps, ...apps],
    };
    await writeFile(resolve(process.cwd(), options.outputPath), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        discovery: options.discoveryPath,
        output: options.outputPath,
        report: options.reportPath,
        reviewedRepos: discovery.repos.length,
        candidates: selected.length,
        applied: options.apply,
      },
      null,
      2,
    ),
  );
}

await main();
