import type { CatalogApp } from "./types";
// These aliases were compared against the 2026-11-11 catalog. Both sides have
// the same platform/type/externalId, not merely the same display name.
export const reviewedCanonicalAliases: Record<
  string,
  { target: string; externalId: string }
> = {
  "adobe-formerly-photoshop": {
    target: "adobe",
    externalId: "plugin_asdk_app_69312da8e4dc81919370cb86fd172b6c",
  },
  "data-analytics": {
    target: "data",
    externalId: "Plugin_fc9843a6fb34819195d6c7802398a8a7",
  },
};
export function canonicalAppId(app: CatalogApp): string {
  const alias = reviewedCanonicalAliases[app.id];
  return alias &&
    app.surfaces.length === 1 &&
    app.surfaces[0].externalId === alias.externalId
    ? alias.target
    : app.id;
}
export function entitySignature(app: CatalogApp): string | null {
  if (!app.surfaces.length || app.surfaces.some((s) => !s.externalId))
    return null;
  return app.surfaces
    .map((s) => `${s.platform}:${s.type}:${s.externalId}`)
    .sort()
    .join("|");
}
