export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

export function formatDate(timestamp?: number | null): string {
  if (!timestamp) {
    return "Not published";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(timestamp));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

const defaultProductionSiteUrl = "https://mcpapp.net";
const defaultDevelopmentSiteUrl = "http://localhost:3000";

export function siteOrigin(siteUrl?: string): string {
  const configured = (siteUrl ?? process.env.SITE_URL)?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return process.env.NODE_ENV === "production" ? defaultProductionSiteUrl : defaultDevelopmentSiteUrl;
}

export function absoluteUrl(path: string, siteUrl?: string): string {
  const base = siteOrigin(siteUrl);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function normalizeOptionalUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
