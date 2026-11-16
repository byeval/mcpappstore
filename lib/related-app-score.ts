import type {CatalogApp} from "./types";
const genericCategories = new Set(["featured", "productivity", "other", "developer-tools", "new-and-noteworthy"]);
const genericCapabilities = new Set(["claude", "claude code", "interactive", "reads", "remote mcp", "writes"]);

function overlapCount(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.reduce((count, item) => count + (rightSet.has(item.toLowerCase()) ? 1 : 0), 0);
}

function removeGenericTerms(items: readonly string[], genericTerms: Set<string>): string[] {
  return items.filter((item) => !genericTerms.has(item.toLowerCase()));
}

export function relatedAppScore(app: CatalogApp, candidate: CatalogApp): number {
  const appCategories = removeGenericTerms(app.categories, genericCategories);
  const candidateCategories = removeGenericTerms(candidate.categories, genericCategories);
  const categoryOverlap = overlapCount(appCategories, candidateCategories);
  const appCapabilities = removeGenericTerms(app.capabilities, genericCapabilities);
  const candidateCapabilities = removeGenericTerms(candidate.capabilities, genericCapabilities);
  const capabilityOverlap = overlapCount(appCapabilities, candidateCapabilities);
  const appSurfaceKeys = app.surfaces.map((surface) => `${surface.platform}:${surface.type}`);
  const candidateSurfaceKeys = candidate.surfaces.map((surface) => `${surface.platform}:${surface.type}`);
  const appPlatforms = app.surfaces.map((surface) => surface.platform);
  const candidatePlatforms = candidate.surfaces.map((surface) => surface.platform);
  const samePrimaryCategory = appCategories[0] && appCategories[0] === candidateCategories[0] ? 3 : 0;
  const sameSource = app.source === candidate.source ? 1 : 0;

  if (categoryOverlap === 0 && capabilityOverlap === 0) {
    return 0;
  }

  return (
    categoryOverlap * 10 +
    capabilityOverlap * 4 +
    overlapCount(appSurfaceKeys, candidateSurfaceKeys) * 2 +
    overlapCount(appPlatforms, candidatePlatforms) +
    samePrimaryCategory +
    sameSource
  );
}


export function relatedCandidateTerms(app:CatalogApp){return {categories:removeGenericTerms(app.categories,genericCategories).map(x=>x.toLowerCase()),capabilities:removeGenericTerms(app.capabilities,genericCapabilities).map(x=>x.toLowerCase())};}
