import type { CategorySummary } from "@/lib/types";

export const MIN_INDEXABLE_CATEGORY_APP_COUNT = 3;
const nonIndexableCategorySlugs = new Set(["featured"]);

export const appSlugRedirects: Record<string, string> = {
  factset: "factset-ai-ready-data",
  gmail: "gmail-gmailmcp",
  "google-drive-drivemcp": "google-drive",
  "intuit-quickbooks": "quickbooks",
  "linear-mcp-server": "linear",
  "moody-s": "moodys-analytics",
};

const appPathRedirects: Record<string, string> = {
  "alton-towers-tickets": "/category/entertainment",
};

const categorySlugRedirects: Record<string, string> = {
  options: "/collections/mcp-apps-for-finance-teams",
  slides: "/collections/chatgpt-apps-for-productivity",
  sql: "/collections/claude-connectors-for-databases",
};

export function redirectedAppPath(slug: string): string | null {
  const pathTarget = appPathRedirects[slug];
  if (pathTarget) {
    return pathTarget;
  }

  const target = appSlugRedirects[slug];
  return target ? `/app/${target}` : null;
}

export function redirectedCategoryPath(slug: string): string | null {
  return categorySlugRedirects[slug] ?? null;
}

export function isIndexableCategory(
  category: Pick<CategorySummary, "count" | "slug"> | null | undefined,
): boolean {
  return Boolean(
    category &&
      !nonIndexableCategorySlugs.has(category.slug) &&
      category.count >= MIN_INDEXABLE_CATEGORY_APP_COUNT,
  );
}
