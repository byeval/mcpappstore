import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { CatalogApp, SeedCatalog } from "../lib/types";

const defaultGithubDiscoveryPath = "reports/github-mcp-discovery.json";
const defaultNpmDiscoveryPath = "reports/npm-mcp-discovery.json";
const defaultSeedPath = "seed/chatgpt-apps.json";
const defaultOutputPath = "data/discovery-index.json";
const defaultReportPath = "reports/discovery-index.md";

type DiscoveryCandidateStatus = "verified" | "indexed" | "candidate" | "duplicate" | "rejected";

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

interface GithubDiscoveryReport {
  generatedAt: string;
  queries: string[];
  totalCount: number;
  repos: GithubRepo[];
}

interface DiscoveryCandidate {
  id: string;
  source: "github" | "npm";
  sourceId: string;
  name: string;
  url: string;
  repoUrl: string;
  description?: string;
  status: DiscoveryCandidateStatus;
  qualityScore: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
  duplicateOf?: string;
  stars?: number;
  forks?: number;
  language?: string;
  license?: string;
  topics: string[];
  categories: string[];
  lastActivityAt?: string;
  discoveredAt: string;
}

interface DiscoveryIndex {
  generatedAt: string;
  sources: Array<{
    id: string;
    type: string;
    sourcePath: string;
    totalCount?: number;
    importedCount: number;
  }>;
  stats: {
    totalCandidates: number;
    verified: number;
    indexed: number;
    candidates: number;
    duplicates: number;
    rejected: number;
    existingCatalogApps: number;
  };
  candidates: DiscoveryCandidate[];
}

interface NpmDiscoveryPackage {
  qualityScore?: number;
  package: {
    name: string;
    version: string;
    description?: string;
    keywords?: string[];
    date: string;
    links?: {
      npm?: string;
      homepage?: string;
      repository?: string;
    };
    publisher?: {
      username?: string;
    };
  };
  score?: {
    final?: number;
  };
}

interface NpmDiscoveryReport {
  generatedAt: string;
  queries: string[];
  totalCount: number;
  packages: NpmDiscoveryPackage[];
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function includesAny(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

function inferCategories(repo: GithubRepo): string[] {
  const haystack = `${repo.full_name} ${repo.description ?? ""} ${(repo.topics ?? []).join(" ")}`.toLowerCase();
  const categories = ["mcp"];
  const rules: Array<[RegExp, string]> = [
    [/github|gitlab|code|developer|sdk|api/, "developer-tools"],
    [/aws|azure|gcp|cloudflare|kubernetes|terraform|docker|devops|circleci/, "devops"],
    [/postgres|mysql|sqlite|database|sql\b|redis|mongodb|falkordb|vector/, "data"],
    [/browser|playwright|puppeteer|chrome|scrap/, "browser"],
    [/security|snyk|vulnerab|audit|threat|scan/, "security"],
    [/finance|stripe|payment|billing|stock|crypto/, "finance"],
    [/pdf|document|notion|mediawiki|excel|spreadsheet|drive|docs?/, "documents"],
    [/figma|design|image|creative|drawio/, "design"],
    [/slack|gmail|email|calendar|toggl|productivity/, "productivity"],
    [/search|rag|vector|knowledge|retrieval/, "search"],
  ];

  for (const [pattern, category] of rules) {
    if (pattern.test(haystack)) categories.push(category);
  }

  return Array.from(new Set(categories)).slice(0, 8);
}

function scoreGithubRepo(repo: GithubRepo): Pick<DiscoveryCandidate, "qualityScore" | "confidence" | "reasons" | "warnings" | "status"> {
  const topics = repo.topics ?? [];
  const haystack = `${repo.full_name} ${repo.description ?? ""} ${topics.join(" ")}`.toLowerCase();
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  if (includesAny(haystack, [/\bmcp server\b/, /model context protocol/, /\bmodelcontextprotocol\b/])) {
    score += 65;
    reasons.push("MCP or Model Context Protocol signal");
  }

  if (topics.some((topic) => /^(mcp-server|mcp-servers|model-context-protocol|modelcontextprotocol)$/.test(topic))) {
    score += 45;
    reasons.push("GitHub topic indicates MCP server");
  }

  if (/mcp[-_]?.*server|server[-_]?.*mcp|mcpserver/.test(repo.full_name.toLowerCase())) {
    score += 25;
    reasons.push("repository name looks server-focused");
  }

  if (repo.stargazers_count >= 5000) score += 35;
  else if (repo.stargazers_count >= 1000) score += 25;
  else if (repo.stargazers_count >= 250) score += 15;
  else if (repo.stargazers_count >= 50) score += 8;
  else if (repo.stargazers_count < 10) warnings.push("very low GitHub stars");

  if (repo.forks_count >= 100) score += 10;
  if (repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION") {
    score += 10;
    reasons.push(`license: ${repo.license.spdx_id}`);
  } else {
    warnings.push("missing license metadata");
  }

  const pushedDays = Math.max(0, Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000));
  if (pushedDays <= 30) score += 20;
  else if (pushedDays <= 120) score += 10;
  else if (pushedDays > 365) {
    score -= 25;
    warnings.push("stale repository activity");
  }

  const aggregateSignal = includesAny(haystack, [/awesome[- ]mcp|collection of mcp|curated list|curriculum|tutorial|examples? only/]);
  const toolingSignal = includesAny(haystack, [/\binspector\b|\bdirectory\b|\bhub\b|\bgateway\b|\bframework\b|\bclient\b/]);

  if (aggregateSignal) {
    score -= 60;
    warnings.push("looks like a list, tutorial, or examples collection");
  }

  if (toolingSignal) {
    score -= 35;
    warnings.push("may be tooling, client, framework, hub, or directory rather than a server");
  }

  const confidence = Math.max(0.05, Math.min(0.99, score / 220));
  let status: DiscoveryCandidateStatus =
    score >= 170 && warnings.length === 0 ? "verified" :
    score >= 120 ? "indexed" :
    score >= 70 ? "candidate" :
    "rejected";
  if ((aggregateSignal || toolingSignal) && status === "indexed") {
    status = "candidate";
  }

  return { qualityScore: score, confidence, reasons, warnings, status };
}

function existingMaps(apps: CatalogApp[]) {
  const repoUrlToAppId = new Map<string, string>();
  const installPackageToAppId = new Map<string, string>();
  const appIds = new Set<string>();

  for (const app of apps) {
    appIds.add(app.id);
    const normalized = normalizeUrl(app.repoUrl);
    if (normalized) {
      repoUrlToAppId.set(normalized, app.id);
    }
    const installPackage = app.installCmd?.match(/(?:npx|npm i|npm install|pnpm dlx|bunx)\s+(?:-y\s+)?(@?[\w.-]+\/?[\w.-]*)/i)?.[1];
    if (installPackage) {
      installPackageToAppId.set(installPackage.toLowerCase(), app.id);
    }
  }

  return { repoUrlToAppId, installPackageToAppId, appIds };
}

function githubCandidate(repo: GithubRepo, catalog: SeedCatalog, discoveredAt: string): DiscoveryCandidate {
  const { repoUrlToAppId } = existingMaps(catalog.apps);
  const normalizedRepoUrl = normalizeUrl(repo.html_url);
  const duplicateOf = normalizedRepoUrl ? repoUrlToAppId.get(normalizedRepoUrl) : undefined;
  const scored = scoreGithubRepo(repo);
  const status: DiscoveryCandidateStatus = duplicateOf ? "duplicate" : scored.status;
  const warnings = duplicateOf ? [...scored.warnings, "already present in the main catalog"] : scored.warnings;

  return {
    id: `github:${slugify(repo.full_name)}`,
    source: "github",
    sourceId: repo.full_name,
    name: repo.full_name,
    url: repo.html_url,
    repoUrl: repo.html_url,
    description: repo.description ?? undefined,
    status,
    qualityScore: scored.qualityScore,
    confidence: scored.confidence,
    reasons: scored.reasons,
    warnings,
    duplicateOf,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language ?? undefined,
    license: repo.license?.spdx_id ?? undefined,
    topics: repo.topics ?? [],
    categories: inferCategories(repo),
    lastActivityAt: repo.pushed_at,
    discoveredAt,
  };
}

function scoreNpmPackage(item: NpmDiscoveryPackage): Pick<DiscoveryCandidate, "qualityScore" | "confidence" | "reasons" | "warnings" | "status"> {
  const pkg = item.package;
  const haystack = `${pkg.name} ${pkg.description ?? ""} ${(pkg.keywords ?? []).join(" ")}`.toLowerCase();
  const reasons: string[] = [];
  const warnings: string[] = [];
  const baseScore = item.score?.final ?? 0;
  let score = Math.round(baseScore <= 1 ? baseScore * 100 : Math.min(baseScore / 5, 120));

  if (/\bmcp\b|model context protocol/.test(haystack)) {
    score += 45;
    reasons.push("package metadata mentions MCP");
  }
  if (/server/.test(haystack)) {
    score += 25;
    reasons.push("package metadata indicates server");
  }
  if (/claude|cursor|agent|llm/.test(haystack)) {
    score += 8;
    reasons.push("agent/client ecosystem signal");
  }
  if (/client|inspector|sdk|framework|awesome|template|example/.test(haystack)) {
    score -= 30;
    warnings.push("may be a client, SDK, framework, template, or example");
  }
  if (!pkg.links?.repository) {
    warnings.push("missing repository link");
  }

  const updatedDays = Math.max(0, Math.floor((Date.now() - new Date(pkg.date).getTime()) / 86_400_000));
  if (updatedDays <= 30) score += 15;
  else if (updatedDays <= 180) score += 8;
  else if (updatedDays > 540) {
    score -= 20;
    warnings.push("stale package activity");
  }

  const confidence = Math.max(0.05, Math.min(0.99, score / 220));
  let status: DiscoveryCandidateStatus =
    score >= 170 && warnings.length === 0 ? "verified" :
    score >= 120 ? "indexed" :
    score >= 70 ? "candidate" :
    "rejected";
  if (warnings.some((warning) => /client|SDK|framework|template|example/i.test(warning)) && status === "indexed") {
    status = "candidate";
  }

  return { qualityScore: score, confidence, reasons, warnings, status };
}

function npmCategories(item: NpmDiscoveryPackage): string[] {
  const haystack = `${item.package.name} ${item.package.description ?? ""} ${(item.package.keywords ?? []).join(" ")}`.toLowerCase();
  const categories = ["mcp"];
  const rules: Array<[RegExp, string]> = [
    [/github|gitlab|code|developer|sdk|api/, "developer-tools"],
    [/aws|azure|gcp|cloudflare|kubernetes|terraform|docker|devops|circleci/, "devops"],
    [/postgres|mysql|sqlite|database|sql\b|redis|mongodb|vector/, "data"],
    [/browser|playwright|puppeteer|chrome|scrap/, "browser"],
    [/security|audit|threat|scan/, "security"],
    [/finance|stripe|payment|billing|stock|crypto/, "finance"],
    [/pdf|document|notion|excel|spreadsheet|drive|docs?/, "documents"],
    [/figma|design|image|creative|drawio/, "design"],
    [/slack|gmail|email|calendar|productivity/, "productivity"],
    [/search|rag|vector|knowledge|retrieval/, "search"],
  ];

  for (const [pattern, category] of rules) {
    if (pattern.test(haystack)) categories.push(category);
  }

  return Array.from(new Set(categories)).slice(0, 8);
}

function npmCandidate(item: NpmDiscoveryPackage, catalog: SeedCatalog, discoveredAt: string): DiscoveryCandidate {
  const { repoUrlToAppId, installPackageToAppId } = existingMaps(catalog.apps);
  const pkg = item.package;
  const normalizedRepoUrl = normalizeUrl(pkg.links?.repository);
  const duplicateOf = (normalizedRepoUrl ? repoUrlToAppId.get(normalizedRepoUrl) : undefined) ?? installPackageToAppId.get(pkg.name.toLowerCase());
  const scored = scoreNpmPackage(item);
  const status: DiscoveryCandidateStatus = duplicateOf ? "duplicate" : scored.status;
  const warnings = duplicateOf ? [...scored.warnings, "already present in the main catalog"] : scored.warnings;

  return {
    id: `npm:${slugify(pkg.name)}`,
    source: "npm",
    sourceId: pkg.name,
    name: pkg.name,
    url: pkg.links?.npm ?? `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`,
    repoUrl: pkg.links?.repository ?? pkg.links?.npm ?? `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`,
    description: pkg.description,
    status,
    qualityScore: scored.qualityScore,
    confidence: scored.confidence,
    reasons: scored.reasons,
    warnings,
    duplicateOf,
    language: "JavaScript",
    topics: pkg.keywords ?? [],
    categories: npmCategories(item),
    lastActivityAt: pkg.date,
    discoveredAt,
  };
}

function markdownReport(index: DiscoveryIndex): string {
  const lines = [
    "# MCP Discovery Index",
    "",
    `Generated: ${index.generatedAt}`,
    "",
    `Total candidates: ${index.stats.totalCandidates}`,
    `Verified: ${index.stats.verified}`,
    `Indexed: ${index.stats.indexed}`,
    `Candidate: ${index.stats.candidates}`,
    `Duplicate: ${index.stats.duplicates}`,
    `Rejected: ${index.stats.rejected}`,
    "",
    "## Top Non-Duplicate Candidates",
    "",
    "| Candidate | Status | Score | Stars | Updated | Categories | Warnings |",
    "| --- | --- | ---: | ---: | --- | --- | --- |",
  ];

  for (const candidate of index.candidates.filter((item) => item.status !== "duplicate").slice(0, 40)) {
    lines.push(
      `| [${candidate.name}](${candidate.url}) | ${candidate.status} | ${candidate.qualityScore} | ${candidate.stars ?? 0} | ${candidate.lastActivityAt?.slice(0, 10) ?? ""} | ${candidate.categories.join(", ")} | ${candidate.warnings.join("; ").replace(/\|/g, "\\|")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const githubDiscoveryPath = argValue("--github") ?? defaultGithubDiscoveryPath;
  const npmDiscoveryPath = argValue("--npm") ?? defaultNpmDiscoveryPath;
  const seedPath = argValue("--seed") ?? defaultSeedPath;
  const outputPath = argValue("--output") ?? defaultOutputPath;
  const reportPath = argValue("--report") ?? defaultReportPath;
  const [catalogRaw, githubRaw, npmRaw] = await Promise.all([
    readFile(resolve(process.cwd(), seedPath), "utf8"),
    readFile(resolve(process.cwd(), githubDiscoveryPath), "utf8"),
    readFile(resolve(process.cwd(), npmDiscoveryPath), "utf8").catch(() => ""),
  ]);
  const catalog = JSON.parse(catalogRaw) as SeedCatalog;
  const github = JSON.parse(githubRaw) as GithubDiscoveryReport;
  const npm = npmRaw ? JSON.parse(npmRaw) as NpmDiscoveryReport : undefined;
  const generatedAt = new Date().toISOString();
  const candidates = [
    ...github.repos.map((repo) => githubCandidate(repo, catalog, generatedAt)),
    ...(npm?.packages ?? []).map((item) => npmCandidate(item, catalog, generatedAt)),
  ]
    .sort((left, right) => {
      const statusRank: Record<DiscoveryCandidateStatus, number> = {
        verified: 0,
        indexed: 1,
        candidate: 2,
        duplicate: 3,
        rejected: 4,
      };
      return statusRank[left.status] - statusRank[right.status] || right.qualityScore - left.qualityScore || (right.stars ?? 0) - (left.stars ?? 0);
    });

  const stats = {
    totalCandidates: candidates.length,
    verified: candidates.filter((candidate) => candidate.status === "verified").length,
    indexed: candidates.filter((candidate) => candidate.status === "indexed").length,
    candidates: candidates.filter((candidate) => candidate.status === "candidate").length,
    duplicates: candidates.filter((candidate) => candidate.status === "duplicate").length,
    rejected: candidates.filter((candidate) => candidate.status === "rejected").length,
    existingCatalogApps: catalog.apps.length,
  };
  const index: DiscoveryIndex = {
    generatedAt,
    sources: [
      {
        id: "github-mcp-discovery",
        type: "github-search",
        sourcePath: githubDiscoveryPath,
        totalCount: github.totalCount,
        importedCount: github.repos.length,
      },
      ...(npm ? [{
        id: "npm-mcp-discovery",
        type: "npm-search",
        sourcePath: npmDiscoveryPath,
        totalCount: npm.totalCount,
        importedCount: npm.packages.length,
      }] : []),
    ],
    stats,
    candidates,
  };

  await mkdir(dirname(resolve(process.cwd(), outputPath)), { recursive: true });
  await mkdir(dirname(resolve(process.cwd(), reportPath)), { recursive: true });
  await writeFile(resolve(process.cwd(), outputPath), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(resolve(process.cwd(), reportPath), markdownReport(index), "utf8");
  console.log(JSON.stringify({ output: outputPath, report: reportPath, stats }, null, 2));
}

await main();
