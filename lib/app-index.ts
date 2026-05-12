import type { CatalogApp } from "@/lib/types";

export const appIndexKeys = [
  "0-9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

export type AppIndexKey = (typeof appIndexKeys)[number];

export function appIndexPath(key: AppIndexKey): string {
  return `/store/${key.toLowerCase()}`;
}

export function appIndexTitle(key: AppIndexKey): string {
  return key === "0-9" ? "0-9" : key;
}

export function normalizeAppIndexParam(value: string): AppIndexKey | null {
  const normalized = decodeURIComponent(value).trim().toUpperCase();
  if (normalized === "0-9" || normalized === "0" || normalized === "NUMBER" || normalized === "NUMBERS") {
    return "0-9";
  }

  if (/^[A-Z]$/.test(normalized)) {
    return normalized as AppIndexKey;
  }

  return null;
}

export function appIndexKeyForName(name: string): AppIndexKey {
  const first = name.trim().charAt(0).toUpperCase();
  if (/^[A-Z]$/.test(first)) {
    return first as AppIndexKey;
  }

  return "0-9";
}

export function groupAppsByIndexKey(apps: CatalogApp[]): Record<AppIndexKey, CatalogApp[]> {
  const groups = appIndexKeys.reduce(
    (accumulator, key) => {
      accumulator[key] = [];
      return accumulator;
    },
    {} as Record<AppIndexKey, CatalogApp[]>,
  );

  for (const app of apps) {
    groups[appIndexKeyForName(app.name)].push(app);
  }

  for (const key of appIndexKeys) {
    groups[key].sort((left, right) => left.name.localeCompare(right.name));
  }

  return groups;
}

export function activeAppIndexKeys(apps: Array<Pick<CatalogApp, "name">>): AppIndexKey[] {
  const active = new Set(apps.map((app) => appIndexKeyForName(app.name)));
  return appIndexKeys.filter((key) => active.has(key));
}
