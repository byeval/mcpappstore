import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import type { SkillAssociationCandidate } from "../lib/skill-matching";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`);
  }
}

function runIfPossible(command: string, args: string[]): boolean {
  try {
    run(command, args);
    return true;
  } catch (error) {
    console.warn(
      `Skipping ${command} ${args.join(" ")} and keeping the existing skill registry: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

function markdownForCandidates(candidates: SkillAssociationCandidate[], threshold: number): string {
  const lines = [
    "# Skill Association Candidates",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Threshold: ${threshold}`,
    `Open candidates: ${candidates.length}`,
    "",
    "These are suggestions only. Use the review CLI to accept or reject them, then run `npm run seed`.",
    "",
  ];

  for (const candidate of candidates.slice(0, 80)) {
    lines.push(
      `## ${candidate.appName} -> ${candidate.skillName}`,
      "",
      `- App: \`${candidate.appId}\``,
      `- Skill: \`${candidate.skillId}\``,
      `- Score: ${candidate.score}`,
      `- Confidence: ${Math.round(candidate.confidence * 100)}%`,
      `- Reason: ${candidate.reason}`,
      `- Accept: \`npm run skills:review -- --accept ${candidate.appId} ${candidate.skillId}\``,
      `- Reject: \`npm run skills:review -- --reject ${candidate.appId} ${candidate.skillId}\``,
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

async function main() {
  const threshold = Number(argValue("--threshold") ?? 120);
  const limit = argValue("--limit") ?? "250";
  const enrich = argValue("--enrich") ?? "25";
  const minInstalls = argValue("--min-installs") ?? "0";
  const candidateJsonPath = argValue("--candidates") ?? "reports/skill-association-candidates.json";
  const candidateMarkdownPath = argValue("--report") ?? "reports/skill-association-candidates.md";
  const skipImport = process.argv.includes("--skip-import");
  const skipSeed = process.argv.includes("--skip-seed");

  if (!skipImport) {
    runIfPossible("npm", [
      "run",
      "skills:import:skills-sh",
      "--",
      "--limit",
      limit,
      "--enrich",
      enrich,
      "--min-installs",
      minInstalls,
    ]);
  }

  await mkdir(dirname(resolve(process.cwd(), candidateJsonPath)), { recursive: true });
  run("npm", [
    "run",
    "skills:suggest",
    "--",
    "--threshold",
    String(Number.isFinite(threshold) ? threshold : 120),
    "--output",
    candidateJsonPath,
  ]);

  const candidates = JSON.parse(await readFile(resolve(process.cwd(), candidateJsonPath), "utf8")) as SkillAssociationCandidate[];
  await mkdir(dirname(resolve(process.cwd(), candidateMarkdownPath)), { recursive: true });
  await writeFile(
    resolve(process.cwd(), candidateMarkdownPath),
    markdownForCandidates(candidates, Number.isFinite(threshold) ? threshold : 120),
    "utf8",
  );

  if (!skipSeed) {
    run("npm", ["run", "seed"]);
  }

  console.log(`Wrote ${candidates.length} skill association candidate(s).`);
  console.log(`JSON: ${candidateJsonPath}`);
  console.log(`Report: ${candidateMarkdownPath}`);
}

await main();
