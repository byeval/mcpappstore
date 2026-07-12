import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const requestTimeoutMs = 20_000;
const userAgent = "mcpapp-github-discovery/1.0 (+https://mcpapp.net)";

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

interface GithubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GithubRepo[];
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": userAgent,
    "x-github-api-version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function repoScore(repo: GithubRepo): number {
  const recencyDays = Math.max(0, Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000));
  const recencyScore = Math.max(0, 60 - Math.floor(recencyDays / 7));
  const topicScore = (repo.topics ?? []).filter((topic) => /mcp|model-context/.test(topic)).length * 20;
  return repo.stargazers_count * 2 + repo.forks_count + recencyScore + topicScore;
}

function markdownReport(repos: Array<GithubRepo & { score: number }>, generatedAt: string): string {
  const lines = [
    "# GitHub MCP Discovery",
    "",
    `Generated: ${generatedAt}`,
    "",
    "These candidates are discovery leads only. Review licenses, README quality, maintenance, and actual MCP compatibility before adding them to the main catalog.",
    "",
    "| Repo | Stars | Language | Pushed | Topics | Description |",
    "| --- | ---: | --- | --- | --- | --- |",
  ];

  for (const repo of repos) {
    lines.push(
      `| [${repo.full_name}](${repo.html_url}) | ${repo.stargazers_count} | ${repo.language ?? ""} | ${repo.pushed_at.slice(0, 10)} | ${(repo.topics ?? []).join(", ")} | ${(repo.description ?? "").replace(/\|/g, "\\|")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const queries = (argValue("--query") ?? [
    "topic:mcp-server",
    "topic:model-context-protocol",
    "topic:modelcontextprotocol",
    "model context protocol mcp server in:name",
    "model context protocol mcp server in:description",
    "mcp server in:name",
    "awesome mcp servers in:name",
  ].join(","))
    .split(",")
    .map((query) => query.trim())
    .filter(Boolean);
  const limit = Number(argValue("--limit") ?? 50);
  const outputPath = argValue("--output") ?? "reports/github-mcp-discovery.json";
  const markdownPath = argValue("--report") ?? "reports/github-mcp-discovery.md";

  const results = await Promise.all(queries.map(async (query) => {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", query);
    url.searchParams.set("sort", "updated");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(Math.min(Math.max(limit, 1), 100)));
    return { query, result: await fetchJson<GithubSearchResponse>(url.toString()) };
  }));

  const repoByName = new Map<string, GithubRepo>();
  for (const { result } of results) {
    for (const repo of result.items) {
      repoByName.set(repo.full_name, repo);
    }
  }

  const repos = [...repoByName.values()]
    .map((repo) => ({ ...repo, score: repoScore(repo) }))
    .sort((left, right) => right.score - left.score || right.stargazers_count - left.stargazers_count)
    .slice(0, limit);
  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    queries,
    totalCount: results.reduce((sum, item) => sum + item.result.total_count, 0),
    incompleteResults: results.some((item) => item.result.incomplete_results),
    repos,
  };

  await mkdir(dirname(resolve(process.cwd(), outputPath)), { recursive: true });
  await writeFile(resolve(process.cwd(), outputPath), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(resolve(process.cwd(), markdownPath), markdownReport(repos, generatedAt), "utf8");
  console.log(JSON.stringify({ queries, totalCount: payload.totalCount, repos: repos.length, output: outputPath }, null, 2));
}

await main();
