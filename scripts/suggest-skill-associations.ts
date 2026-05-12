import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import curatedAssociationsJson from "../seed/app-skill-associations.json" with { type: "json" };
import catalogJson from "../seed/chatgpt-apps.json" with { type: "json" };
import rejectedAssociationsJson from "../seed/rejected-skill-associations.json" with { type: "json" };
import skillRegistryJson from "../seed/skills.json" with { type: "json" };
import { suggestSkillAssociations } from "../lib/skill-matching";
import type { CatalogSkill, SeedCatalog, SeedRejectedSkillAssociation, SeedSkillAssociation, SeedSkillRegistry } from "../lib/types";

const catalog = catalogJson as SeedCatalog;
const skillRegistry = skillRegistryJson as SeedSkillRegistry;
const curatedAssociations = curatedAssociationsJson as SeedSkillAssociation[];
const rejectedAssociations = rejectedAssociationsJson as SeedRejectedSkillAssociation[];

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function frontmatterValue(frontmatter: string, key: string): string | undefined {
  const line = frontmatter
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${key}:`));

  return line?.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

async function discoverLocalSkills(): Promise<CatalogSkill[]> {
  const root = resolve(process.cwd(), "skills");
  if (!existsSync(root)) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const skills: CatalogSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }

    const skillPath = join(root, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) {
      continue;
    }

    const body = await readFile(skillPath, "utf8");
    const frontmatter = body.startsWith("---") ? body.split("---", 3)[1] ?? "" : "";
    const name = frontmatterValue(frontmatter, "name") ?? entry.name;
    const description = frontmatterValue(frontmatter, "description") ?? "";
    const tokens = normalizeText(`${entry.name} ${name} ${description}`)
      .split(/\s+/)
      .filter((token) => token.length > 1)
      .slice(0, 12);

    skills.push({
      id: entry.name,
      name,
      displayName: name
        .split(/[-_:]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      description,
      sourceType: "local",
      skillPath: relative(process.cwd(), join(root, entry.name)),
      categories: [],
      tags: Array.from(new Set(tokens)),
      status: "available",
    });
  }

  return skills;
}

async function main() {
  const threshold = Number(argValue("--threshold") ?? 55);
  const outputPath = argValue("--output");
  const includeCurated = process.argv.includes("--include-curated");
  const includeRejected = process.argv.includes("--include-rejected");
  const localSkills = await discoverLocalSkills();
  const skillsById = new Map<string, CatalogSkill>();

  for (const skill of [...skillRegistry.skills, ...localSkills]) {
    skillsById.set(skill.id, skill);
  }

  const candidates = suggestSkillAssociations({
    apps: catalog.apps,
    skills: [...skillsById.values()],
    curatedAssociations,
    rejectedAssociations,
    threshold: Number.isFinite(threshold) ? threshold : 55,
    includeCurated,
    includeRejected,
  });

  const payload = JSON.stringify(candidates, null, 2);
  if (outputPath) {
    await writeFile(resolve(process.cwd(), outputPath), `${payload}\n`, "utf8");
    console.error(`Wrote ${candidates.length} candidate skill association(s) to ${outputPath}`);
    return;
  }

  console.log(payload);
}

await main();
