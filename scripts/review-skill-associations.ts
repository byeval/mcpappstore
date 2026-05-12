import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import curatedAssociationsJson from "../seed/app-skill-associations.json" with { type: "json" };
import catalogJson from "../seed/chatgpt-apps.json" with { type: "json" };
import rejectedAssociationsJson from "../seed/rejected-skill-associations.json" with { type: "json" };
import skillRegistryJson from "../seed/skills.json" with { type: "json" };
import { associationKey, suggestSkillAssociations } from "../lib/skill-matching";
import type { SeedCatalog, SeedRejectedSkillAssociation, SeedSkillAssociation, SeedSkillRegistry, SkillRelationType } from "../lib/types";

const associationsPath = resolve(process.cwd(), "seed/app-skill-associations.json");
const rejectedPath = resolve(process.cwd(), "seed/rejected-skill-associations.json");
const catalog = catalogJson as SeedCatalog;
const skills = skillRegistryJson as SeedSkillRegistry;
const curatedAssociations = curatedAssociationsJson as SeedSkillAssociation[];
const rejectedAssociations = rejectedAssociationsJson as SeedRejectedSkillAssociation[];

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positionalAfter(flag: string): [string, string] {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1] || !process.argv[index + 2]) {
    throw new Error(`Expected ${flag} <appId> <skillId>`);
  }

  return [process.argv[index + 1], process.argv[index + 2]];
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function candidateFor(appId: string, skillId: string) {
  return suggestSkillAssociations({
    apps: catalog.apps,
    skills: skills.skills,
    curatedAssociations,
    rejectedAssociations,
    threshold: 0,
    includeCurated: true,
    includeRejected: true,
  }).find((candidate) => candidate.appId === appId && candidate.skillId === skillId);
}

async function acceptAssociation(appId: string, skillId: string): Promise<void> {
  const associations = await readJsonFile<SeedSkillAssociation[]>(associationsPath);
  const existingKeys = new Set(associations.map((association) => associationKey(association.appId, association.skillId)));
  const key = associationKey(appId, skillId);
  if (existingKeys.has(key)) {
    console.log(`${key} is already curated.`);
    return;
  }

  const candidate = candidateFor(appId, skillId);
  if (!candidate) {
    throw new Error(`No app/skill candidate found for ${key}.`);
  }

  const relationType = (argValue("--relation") as SkillRelationType | undefined) ?? candidate.relationType;
  const confidence = Number(argValue("--confidence") ?? candidate.confidence);
  const reason = argValue("--reason") ?? candidate.reason;

  associations.push({
    appId,
    skillId,
    relationType,
    confidence: Number.isFinite(confidence) ? Number(confidence.toFixed(2)) : candidate.confidence,
    reason,
  });
  associations.sort((left, right) => left.appId.localeCompare(right.appId) || left.skillId.localeCompare(right.skillId));
  await writeJsonFile(associationsPath, associations);

  const rejected = await readJsonFile<SeedRejectedSkillAssociation[]>(rejectedPath);
  await writeJsonFile(rejectedPath, rejected.filter((association) => associationKey(association.appId, association.skillId) !== key));
  console.log(`Accepted ${key}.`);
}

async function rejectAssociation(appId: string, skillId: string): Promise<void> {
  const rejected = await readJsonFile<SeedRejectedSkillAssociation[]>(rejectedPath);
  const key = associationKey(appId, skillId);
  if (rejected.some((association) => associationKey(association.appId, association.skillId) === key)) {
    console.log(`${key} is already rejected.`);
    return;
  }

  rejected.push({
    appId,
    skillId,
    reason: argValue("--reason") ?? "Rejected during skill association review.",
    rejectedAt: new Date().toISOString(),
  });
  rejected.sort((left, right) => left.appId.localeCompare(right.appId) || left.skillId.localeCompare(right.skillId));
  await writeJsonFile(rejectedPath, rejected);
  console.log(`Rejected ${key}.`);
}

async function listCandidates(): Promise<void> {
  const threshold = Number(argValue("--threshold") ?? 120);
  const limit = Number(argValue("--limit") ?? 25);
  const candidates = suggestSkillAssociations({
    apps: catalog.apps,
    skills: skills.skills,
    curatedAssociations,
    rejectedAssociations,
    threshold: Number.isFinite(threshold) ? threshold : 120,
  }).slice(0, Number.isFinite(limit) ? limit : 25);

  for (const candidate of candidates) {
    console.log(`${candidate.score}\t${candidate.appId}\t${candidate.skillId}\t${candidate.reason}`);
  }
}

async function main() {
  if (process.argv.includes("--accept")) {
    await acceptAssociation(...positionalAfter("--accept"));
    return;
  }

  if (process.argv.includes("--reject")) {
    await rejectAssociation(...positionalAfter("--reject"));
    return;
  }

  await listCandidates();
}

await main();
