import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const requestTimeoutMs = 20_000;
const userAgent = "mcpapp-npm-discovery/1.0 (+https://mcpapp.net)";

interface NpmSearchPackage {
  name: string;
  scope?: string;
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
    email?: string;
  };
  maintainers?: Array<{ username?: string; email?: string }>;
}

interface NpmSearchObject {
  package: NpmSearchPackage;
  score?: {
    final?: number;
    detail?: Record<string, number>;
  };
  searchScore?: number;
}

interface NpmSearchResponse {
  objects: NpmSearchObject[];
  total: number;
  time: string;
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": userAgent,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`npm request failed: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function packageScore(item: NpmSearchObject): number {
  const pkg = item.package;
  const haystack = `${pkg.name} ${pkg.description ?? ""} ${(pkg.keywords ?? []).join(" ")}`.toLowerCase();
  const baseScore = item.score?.final ?? 0;
  let score = Math.round(baseScore <= 1 ? baseScore * 100 : Math.min(baseScore / 5, 120));
  if (/\bmcp\b|model context protocol/.test(haystack)) score += 50;
  if (/server/.test(haystack)) score += 25;
  if (/claude|cursor|agent|llm/.test(haystack)) score += 10;
  if (/client|inspector|sdk|framework|awesome|template/.test(haystack)) score -= 20;
  return score;
}

function markdownReport(items: Array<NpmSearchObject & { qualityScore: number }>, generatedAt: string): string {
  const lines = [
    "# npm MCP Discovery",
    "",
    `Generated: ${generatedAt}`,
    "",
    "| Package | Score | Version | Updated | Keywords | Description |",
    "| --- | ---: | --- | --- | --- | --- |",
  ];

  for (const item of items) {
    const pkg = item.package;
    lines.push(
      `| [${pkg.name}](${pkg.links?.npm ?? `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`}) | ${item.qualityScore} | ${pkg.version} | ${pkg.date.slice(0, 10)} | ${(pkg.keywords ?? []).join(", ")} | ${(pkg.description ?? "").replace(/\|/g, "\\|")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const queries = (argValue("--query") ?? [
    "mcp server",
    "model context protocol",
    "claude mcp",
    "cursor mcp",
    "mcp tools",
  ].join(","))
    .split(",")
    .map((query) => query.trim())
    .filter(Boolean);
  const size = Math.min(Math.max(Number(argValue("--size") ?? 250), 1), 250);
  const pages = Math.min(Math.max(Number(argValue("--pages") ?? 3), 1), 10);
  const limit = Math.max(Number(argValue("--limit") ?? 500), 1);
  const outputPath = argValue("--output") ?? "reports/npm-mcp-discovery.json";
  const markdownPath = argValue("--report") ?? "reports/npm-mcp-discovery.md";
  const warnings: Array<{ query: string; message: string }> = [];
  const byName = new Map<string, NpmSearchObject>();
  let totalCount = 0;

  for (const query of queries) {
    for (let page = 0; page < pages; page += 1) {
      const url = new URL("https://registry.npmjs.org/-/v1/search");
      url.searchParams.set("text", query);
      url.searchParams.set("size", String(size));
      url.searchParams.set("from", String(page * size));
      url.searchParams.set("quality", "0.65");
      url.searchParams.set("popularity", "0.2");
      url.searchParams.set("maintenance", "0.15");

      try {
        const result = await fetchJson<NpmSearchResponse>(url.toString());
        if (page === 0) {
          totalCount += result.total;
        }
        for (const item of result.objects) {
          byName.set(item.package.name, item);
        }
        if (result.objects.length < size) {
          break;
        }
      } catch (error) {
        warnings.push({ query, message: error instanceof Error ? error.message : String(error) });
        break;
      }
    }
  }

  const packages = [...byName.values()]
    .map((item) => ({ ...item, qualityScore: packageScore(item) }))
    .sort((left, right) => right.qualityScore - left.qualityScore || left.package.name.localeCompare(right.package.name))
    .slice(0, limit);
  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    queries,
    totalCount,
    pages,
    warnings,
    packages,
  };

  await mkdir(dirname(resolve(process.cwd(), outputPath)), { recursive: true });
  await writeFile(resolve(process.cwd(), outputPath), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(resolve(process.cwd(), markdownPath), markdownReport(packages, generatedAt), "utf8");
  console.log(JSON.stringify({ queries, totalCount, pages, packages: packages.length, warnings: warnings.length, output: outputPath }, null, 2));
}

await main();
