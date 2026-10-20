import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

interface SourceResult {
  checkedAt: string;
  status: "ok" | "partial" | "failed";
  lastSuccessAt?: string;
  message: string;
}

const reportPath = "reports/data-sync.json";
const sources: Record<string, SourceResult> = {};
let previous: { sources?: Record<string, SourceResult> } = {};
try {
  previous = JSON.parse(await readFile(reportPath, "utf8"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await mkdir("reports", { recursive: true });
const startedAt = new Date().toISOString();
const sourcesIndex = process.argv.indexOf("--sources");
const selectedSources = sourcesIndex < 0 ? undefined : process.argv[sourcesIndex + 1]?.split(",");
if (sourcesIndex >= 0 && (!selectedSources?.length || selectedSources.some((id) => !["chatgpt", "claude", "skills", "clients", "github", "npm"].includes(id)))) {
  throw new Error("--sources requires comma-separated known source names");
}
Object.assign(sources, previous.sources);

async function save() {
  await writeFile(reportPath, JSON.stringify({ startedAt, sources }, null, 2) + "\n");
}

async function refresh(id: string, command: string[], validate?: () => Promise<void>) {
  if (selectedSources && !selectedSources.includes(id)) return;
  const checkedAt = new Date().toISOString();
  try {
    if (validate) await validate();
    const env = { ...process.env };
    if (id === "github" && !env.GITHUB_TOKEN) {
      const auth = spawnSync("gh", ["auth", "token"], { encoding: "utf8", timeout: 5_000 });
      if (auth.status === 0) env.GITHUB_TOKEN = auth.stdout.trim();
    }
    const result = spawnSync(command[0], command.slice(1), {
      stdio: "inherit",
      timeout: 10 * 60_000,
      env,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Exited with ${result.status ?? result.signal}`);
    let warnings = 0;
    if (id === "github" || id === "npm") {
      const report = JSON.parse(await readFile(`reports/${id}-mcp-discovery.json`, "utf8"));
      warnings = report.warnings?.length ?? 0;
    }
    if (id === "chatgpt") {
      const capture = JSON.parse(await readFile("seed/raw-chatgpt-apps.json", "utf8"));
      warnings = Object.values(capture.categories).filter((entry) => {
        const value = entry as { status: number; complete: boolean };
        return value.status !== 200 || value.complete !== true;
      }).length;
    }
    sources[id] = {
      checkedAt,
      status: warnings ? "partial" : "ok",
      lastSuccessAt: warnings ? previous.sources?.[id]?.lastSuccessAt : new Date().toISOString(),
      message: warnings ? `${warnings} incomplete queries/categories; retained historical records` : "Fresh source fetched and merged",
    };
    if (id === "claude") {
      const capture = JSON.parse(await readFile("tmp-claude-public-connectors.json", "utf8"));
      sources[id].message += ` (${capture.connectors.length} public connectors captured; unverified local extensions retained for review)`;
    }
  } catch (error) {
    sources[id] = {
      checkedAt,
      status: "failed",
      lastSuccessAt: previous.sources?.[id]?.lastSuccessAt,
      message: error instanceof Error ? error.message : String(error),
    };
    console.warn(`${id}: ${sources[id].message}`);
  }
  await save();
}

const beforeApps = JSON.parse(await readFile("seed/chatgpt-apps.json", "utf8"));
const beforeSkills = JSON.parse(await readFile("seed/skills.json", "utf8"));
await refresh("chatgpt", ["npm", "run", "scrape", "--", "seed/raw-chatgpt-apps.json", "seed/chatgpt-apps.json", "--no-download-media", "--allow-partial", ...(process.env.PROTECTED_APPS_PATH ? ["--protected-apps", process.env.PROTECTED_APPS_PATH] : [])], async () => {
  const capture = JSON.parse(await readFile("seed/raw-chatgpt-apps.json", "utf8"));
  const capturedAt = Date.parse(capture.capturedAt ?? "");
  const age = Date.now() - capturedAt;
  if (!Number.isFinite(age) || age < -300_000 || age > 24 * 60 * 60_000) {
    throw new Error(`ChatGPT browser capture is missing or older than 24 hours (${capture.capturedAt ?? "unknown"}); capture fresh public categories first`);
  }
  const entries = Object.values(capture.categories ?? {}) as Array<{ status?: number; complete?: boolean; data?: { plugins?: unknown[]; pagination?: { next_page_token?: string } } }>;
  if (!entries.some((entry) => entry.status === 200 && entry.complete === true && Array.isArray(entry.data?.plugins) && !entry.data?.pagination?.next_page_token)) {
    throw new Error("ChatGPT capture has no complete category pages");
  }
});
await refresh("claude", ["npm", "run", "scrape:claude-connectors"]);
await refresh("skills", ["npm", "run", "skills:import:skills-sh", "--", "--limit", "600", "--enrich", "25"]);
await refresh("clients", ["npm", "run", "clients:import"]);
await refresh("github", ["npm", "run", "discover:github-mcp", "--", "--limit", "1500", "--pages", "10", "--per-page", "100", "--resume"]);
await refresh("npm", ["npm", "run", "discover:npm-mcp", "--", "--limit", "5000", "--pages", "10", "--resume"]);

for (const [file, before, key] of [
  ["seed/chatgpt-apps.json", beforeApps, "apps"],
  ["seed/skills.json", beforeSkills, "skills"],
] as const) {
  const after = JSON.parse(await readFile(file, "utf8"));
  const ids = new Set(after[key].map((item: { id: string }) => item.id));
  if (ids.size !== after[key].length || before[key].some((item: { id: string }) => !ids.has(item.id))) {
    throw new Error(`Duplicate or removed IDs in ${file}; publication stopped`);
  }
}
for (const script of ["discovery:index", "data:health", "seed"]) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit", timeout: 120_000 });
  if (result.status !== 0) throw new Error(`${script} failed`);
}
console.log(JSON.stringify({ sources }, null, 2));
const catalog = JSON.parse(await readFile("seed/chatgpt-apps.json", "utf8"));
const skills = JSON.parse(await readFile("seed/skills.json", "utf8"));
const dataModule = await readFile("lib/data.ts", "utf8");
const cacheVersion = dataModule.match(/const publicCacheVersion = "([^"]+)"/)?.[1];
if (!cacheVersion) throw new Error("Cannot determine public cache version");
const keys = [
  "published-apps", "home-apps", "featured-apps", "category-summaries", "catalog-quality-stats", "skills",
  ...catalog.apps.map((app: { id: string }) => `app:${app.id}`),
  ...skills.skills.flatMap((skill: { id: string }) => [`skill:${skill.id}`, `skill-apps:${skill.id}`]),
];
await writeFile("reports/public-cache-keys.json", JSON.stringify(keys.map((key) => `${cacheVersion}:${key}`)) + "\n");
if (Object.values(sources).every((source) => source.status === "failed")) process.exitCode = 1;
