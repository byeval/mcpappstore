import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const requestTimeoutMs = 15_000;
const userAgent = "mcpapp-data-health/1.0 (+https://mcpapp.net)";

interface SourceCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  localCount?: number;
  remoteCount?: number;
  expectedLocalMinimum?: number;
  generatedAt?: string;
  notes: string[];
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function fetchText(url: string, accept = "*/*"): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept,
        "user-agent": userAgent,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function daysSince(value: string | number | undefined): number | undefined {
  if (!value) return undefined;
  const time = typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(time)) return undefined;
  return Math.floor((Date.now() - time) / 86_400_000);
}

function statusForAge(days: number | undefined, warnAfterDays: number): "ok" | "warn" {
  return days !== undefined && days > warnAfterDays ? "warn" : "ok";
}

function parseSkillsCount(html: string): number {
  const normalized = html.replace(/\\"/g, "\"").replace(/\\u002F/g, "/");
  const pattern = /\{"source":"([^"]+)","skillId":"([^"]+)","name":"([^"]+)","installs":(\d+)(?:,[^{}]*)?\}/g;
  return new Set([...normalized.matchAll(pattern)].map((match) => `${match[1]}/${match[2]}`)).size;
}

function parseMcpClientCount(markdown: string): number {
  return [...markdown.matchAll(/^###\s+(.+)$/gm)].length;
}

async function maybeRemoteCount(check: SourceCheck, url: string, parser: (text: string) => number, accept?: string) {
  try {
    check.remoteCount = parser(await fetchText(url, accept));
    const expectedMinimum = check.expectedLocalMinimum;
    if (
      check.localCount !== undefined &&
      check.remoteCount !== undefined &&
      check.localCount !== check.remoteCount &&
      (expectedMinimum === undefined || check.localCount < Math.min(check.remoteCount, expectedMinimum))
    ) {
      check.status = "warn";
      check.notes.push(`Remote count differs from local count (${check.remoteCount} vs ${check.localCount}).`);
    } else if (check.localCount !== undefined && check.remoteCount !== undefined && check.localCount !== check.remoteCount) {
      check.notes.push(`Remote has ${check.remoteCount}; local intentionally keeps ${check.localCount}.`);
    }
  } catch (error) {
    check.status = "warn";
    check.notes.push(`Remote check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function markdownReport(checks: SourceCheck[]): string {
  const lines = [
    "# Data Source Health",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Source | Status | Local | Remote | Generated | Notes |",
    "| --- | --- | ---: | ---: | --- | --- |",
  ];

  for (const check of checks) {
    lines.push(
      `| ${check.label} | ${check.status} | ${check.localCount ?? ""} | ${check.remoteCount ?? ""} | ${check.generatedAt ?? ""} | ${check.notes.join("<br>") || ""} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const outputPath = argValue("--output") ?? "reports/data-source-health.json";
  const markdownPath = argValue("--report") ?? "reports/data-source-health.md";
  const skipRemote = process.argv.includes("--skip-remote");

  const catalog = JSON.parse(await readFile(resolve(process.cwd(), "seed/chatgpt-apps.json"), "utf8"));
  const skills = JSON.parse(await readFile(resolve(process.cwd(), "seed/skills.json"), "utf8"));
  const clients = JSON.parse(await readFile(resolve(process.cwd(), "seed/awesome-mcp-clients.json"), "utf8"));

  const apps = catalog.apps ?? [];
  const sourceCounts = apps.reduce((counts: Record<string, number>, app: { source?: string }) => {
    const source = app.source ?? "unknown";
    counts[source] = (counts[source] ?? 0) + 1;
    return counts;
  }, {});
  const latestAppUpdatedAt = Math.max(...apps.map((app: { updatedAt?: number }) => app.updatedAt ?? 0));
  const appAge = daysSince(latestAppUpdatedAt);
  const skillExternalCount = skills.skills.filter((skill: { id: string }) => skill.id.startsWith("skills-sh:")).length;

  const checks: SourceCheck[] = [
    {
      id: "catalog",
      label: "App catalog seed",
      status: statusForAge(appAge, 14),
      localCount: apps.length,
      generatedAt: latestAppUpdatedAt ? new Date(latestAppUpdatedAt).toISOString() : undefined,
      notes: [
        `chatgpt_seed=${sourceCounts.chatgpt_seed ?? 0}`,
        `claude_seed=${sourceCounts.claude_seed ?? 0}`,
        `user=${sourceCounts.user ?? 0}`,
        appAge !== undefined ? `latest app update ${appAge} day(s) ago` : "missing app update timestamp",
      ],
    },
    {
      id: "skills-sh",
      label: "skills.sh",
      status: "ok",
      localCount: skillExternalCount,
      expectedLocalMinimum: 250,
      notes: [`total skills=${skills.skills.length}`, "importer keeps top 250 plus pinned associations"],
    },
    {
      id: "mcp-clients",
      label: "awesome-mcp-clients",
      status: statusForAge(daysSince(clients.generatedAt), 30),
      localCount: clients.clients.length,
      generatedAt: clients.generatedAt,
      notes: [`generated ${daysSince(clients.generatedAt) ?? "unknown"} day(s) ago`],
    },
  ];

  if (!skipRemote) {
    await maybeRemoteCount(checks[1], "https://skills.sh/", parseSkillsCount, "text/html,*/*;q=0.8");
    await maybeRemoteCount(
      checks[2],
      clients.source.readmeUrl,
      parseMcpClientCount,
      "text/markdown,text/plain,*/*;q=0.8",
    );
  }

  await mkdir(dirname(resolve(process.cwd(), outputPath)), { recursive: true });
  await writeFile(resolve(process.cwd(), outputPath), `${JSON.stringify({ generatedAt: new Date().toISOString(), checks }, null, 2)}\n`, "utf8");
  await writeFile(resolve(process.cwd(), markdownPath), markdownReport(checks), "utf8");

  const failing = checks.filter((check) => check.status === "fail");
  console.log(JSON.stringify({ checks: checks.length, warn: checks.filter((check) => check.status === "warn").length, fail: failing.length }, null, 2));
  if (failing.length > 0) process.exit(1);
}

await main();
