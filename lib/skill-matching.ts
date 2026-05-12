import type { CatalogApp, CatalogSkill, SeedRejectedSkillAssociation, SeedSkillAssociation } from "./types";

export interface SkillAssociationCandidate {
  appId: string;
  appName: string;
  skillId: string;
  skillName: string;
  relationType: "recommended" | "related";
  confidence: number;
  score: number;
  reason: string;
  signals: string[];
  curated: boolean;
  rejected: boolean;
}

const genericTokens = new Set([
  "app",
  "apps",
  "mcp",
  "server",
  "connector",
  "connectors",
  "platform",
  "productivity",
  "workflow",
  "workflows",
  "tools",
  "tool",
  "data",
  "code",
  "cloud",
  "and",
  "for",
  "from",
  "how",
  "into",
  "the",
  "this",
  "use",
  "using",
  "when",
  "with",
  "work",
  "works",
  "external",
  "unknown",
  "inc",
  "ltd",
  "llc",
  "com",
  "www",
]);

export function associationKey(appId: string, skillId: string): string {
  return `${appId}:${skillId}`;
}

export function normalizeSkillMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalizeSkillMatchText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !genericTokens.has(token));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function appUrls(app: CatalogApp): string[] {
  return [
    app.homepageUrl,
    app.repoUrl,
    app.publisherUrl,
    app.mcpEndpoint,
    ...app.surfaces.flatMap((surface) => [surface.url, surface.mcpEndpoint]),
  ].filter((value): value is string => Boolean(value));
}

function hostnameTokens(urls: string[]): string[] {
  const tokens: string[] = [];

  for (const rawUrl of urls) {
    try {
      const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
      tokens.push(...url.hostname.split("."));
    } catch {
      // Ignore malformed catalog URLs; the app text still contributes signals.
    }
  }

  return unique(tokens.map((token) => normalizeSkillMatchText(token)).filter((token) => token && !genericTokens.has(token)));
}

function appSearchText(app: CatalogApp): string {
  return [
    app.id,
    app.name,
    app.tagline,
    app.description,
    app.publisher,
    app.homepageUrl,
    app.repoUrl,
    app.mcpEndpoint,
    ...app.categories,
    ...app.tags,
    ...app.capabilities,
    ...app.examplePrompts,
    ...app.tools.flatMap((tool) => [tool.name, tool.description ?? ""]),
    ...app.surfaces.flatMap((surface) => [
      surface.platform,
      surface.type,
      surface.displayName ?? "",
      surface.tagline ?? "",
      surface.description ?? "",
      surface.mcpEndpoint ?? "",
      surface.installCmd ?? "",
      ...(surface.capabilities ?? []),
      ...(surface.examplePrompts ?? []),
      ...(surface.tools ?? []).flatMap((tool) => [tool.name, tool.description ?? ""]),
    ]),
  ].join(" ");
}

function skillSearchText(skill: CatalogSkill): string {
  return [
    skill.id,
    skill.name,
    skill.displayName,
    skill.description,
    skill.sourceUrl,
    skill.installUrl,
    skill.skillPath,
    ...(skill.platforms ?? []),
    ...skill.categories,
    ...skill.tags,
  ].join(" ");
}

export function scoreSkillAssociation(app: CatalogApp, skill: CatalogSkill): { score: number; signals: string[] } {
  const appText = normalizeSkillMatchText(appSearchText(app));
  const skillText = normalizeSkillMatchText(skillSearchText(skill));
  const appTokens = new Set(tokenize(appSearchText(app)));
  const skillTokens = new Set(tokenize(skillSearchText(skill)));
  const appHostTokens = hostnameTokens(appUrls(app));
  const signals: string[] = [];
  let score = 0;

  const normalizedAppName = normalizeSkillMatchText(app.name);
  const normalizedSkillName = normalizeSkillMatchText(skill.displayName);
  const appId = normalizeSkillMatchText(app.id);
  const skillId = normalizeSkillMatchText(skill.id.split(":").pop() ?? skill.id);

  if (normalizedAppName && normalizedSkillName && normalizedAppName === normalizedSkillName) {
    score += 60;
    signals.push("exact app and skill name match");
  } else if (normalizedAppName && normalizedSkillName && (normalizedAppName.includes(normalizedSkillName) || normalizedSkillName.includes(normalizedAppName))) {
    score += 44;
    signals.push("app and skill names overlap");
  }

  if (appId && skillId && (appId === skillId || appId.includes(skillId) || skillId.includes(appId))) {
    score += 36;
    signals.push("app id and skill id overlap");
  }

  const sharedCategoryCount = app.categories.filter((category) => skill.categories.includes(category)).length;
  if (sharedCategoryCount > 0) {
    score += Math.min(24, sharedCategoryCount * 8);
    signals.push(`${sharedCategoryCount} shared categor${sharedCategoryCount === 1 ? "y" : "ies"}`);
  }

  const sharedTags = unique([...app.categories, ...app.tags, ...app.capabilities].filter((tag) => skillTokens.has(normalizeSkillMatchText(tag))));
  if (sharedTags.length > 0) {
    score += Math.min(24, sharedTags.length * 6);
    signals.push(`shared catalog terms: ${sharedTags.slice(0, 4).join(", ")}`);
  }

  const sharedHostTokens = appHostTokens.filter((token) => skillTokens.has(token));
  if (sharedHostTokens.length > 0) {
    score += Math.min(32, sharedHostTokens.length * 16);
    signals.push(`domain signal: ${sharedHostTokens.slice(0, 3).join(", ")}`);
  }

  const sharedImportantTokens = unique([...appTokens].filter((token) => skillTokens.has(token))).slice(0, 8);
  if (sharedImportantTokens.length > 0) {
    score += Math.min(30, sharedImportantTokens.length * 5);
    signals.push(`text overlap: ${sharedImportantTokens.slice(0, 5).join(", ")}`);
  }

  for (const phrase of [skill.id, skill.name, skill.displayName]) {
    const normalizedPhrase = normalizeSkillMatchText(phrase);
    if (normalizedPhrase.length > 3 && appText.includes(normalizedPhrase)) {
      score += 22;
      signals.push(`app text mentions "${phrase}"`);
      break;
    }
  }

  for (const phrase of [app.name, app.publisher]) {
    const normalizedPhrase = normalizeSkillMatchText(phrase);
    if (normalizedPhrase.length > 3 && skillText.includes(normalizedPhrase)) {
      score += 22;
      signals.push(`skill text mentions "${phrase}"`);
      break;
    }
  }

  return { score, signals };
}

export function suggestSkillAssociations({
  apps,
  skills,
  curatedAssociations,
  rejectedAssociations = [],
  threshold = 55,
  includeCurated = false,
  includeRejected = false,
}: {
  apps: CatalogApp[];
  skills: CatalogSkill[];
  curatedAssociations: SeedSkillAssociation[];
  rejectedAssociations?: SeedRejectedSkillAssociation[];
  threshold?: number;
  includeCurated?: boolean;
  includeRejected?: boolean;
}): SkillAssociationCandidate[] {
  const curatedKeys = new Set(curatedAssociations.map((association) => associationKey(association.appId, association.skillId)));
  const rejectedKeys = new Set(rejectedAssociations.map((association) => associationKey(association.appId, association.skillId)));
  const candidates: SkillAssociationCandidate[] = [];

  for (const app of apps) {
    for (const skill of skills) {
      const key = associationKey(app.id, skill.id);
      const curated = curatedKeys.has(key);
      const rejected = rejectedKeys.has(key);
      if ((curated && !includeCurated) || (rejected && !includeRejected)) {
        continue;
      }

      const { score, signals } = scoreSkillAssociation(app, skill);
      if (score < threshold && !curated && !rejected) {
        continue;
      }

      candidates.push({
        appId: app.id,
        appName: app.name,
        skillId: skill.id,
        skillName: skill.displayName,
        relationType: score >= 80 ? "recommended" : "related",
        confidence: Number(Math.min(0.99, Math.max(0.5, score / 100)).toFixed(2)),
        score,
        reason: signals.length > 0
          ? `Candidate match from ${signals.slice(0, 3).join("; ")}.`
          : "Candidate match from an existing review state.",
        signals,
        curated,
        rejected,
      });
    }
  }

  return candidates.sort((left, right) => (
    right.score - left.score ||
    left.appName.localeCompare(right.appName) ||
    left.skillName.localeCompare(right.skillName)
  ));
}
