import type { Metadata } from "next";

import { localeDetails, localizedPath, supportedLocales, type Locale } from "@/lib/i18n";
import { defaultOgImagePath } from "@/lib/og-image";
import type { CatalogApp, CategoryRecord } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

const siteName = "MCP App Store";
const defaultDescription =
  "Browse ChatGPT apps and Claude interactive connectors backed by MCP, with tools, previews, categories, and platform-specific capabilities.";
const categoryAcronyms: Record<string, string> = {
  ai: "AI",
  api: "API",
  csv: "CSV",
  db: "DB",
  pdf: "PDF",
  mcp: "MCP",
  seo: "SEO",
  sql: "SQL",
  ui: "UI",
};
const categoryMinorWords = new Set(["and", "as", "by", "for", "in", "of", "on", "or", "to", "with"]);

export function truncateMeta(value: string, maxLength = 155): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function pageMetadata({
  title,
  description = defaultDescription,
  path,
  locale,
  imagePath,
  keywords,
  robots,
}: {
  title: string;
  description?: string;
  path: string;
  locale?: Locale;
  imagePath?: string;
  keywords?: Metadata["keywords"];
  robots?: Metadata["robots"];
}): Metadata {
  const canonicalPath = locale ? localizedPath(path, locale) : path;
  const canonical = absoluteUrl(canonicalPath);
  const metaDescription = truncateMeta(description);
  const images = [absoluteUrl(imagePath ?? defaultOgImagePath({ title, description: metaDescription, path: canonicalPath }))];

  return {
    title,
    description: metaDescription,
    keywords,
    alternates: {
      canonical,
      languages: Object.fromEntries(
        supportedLocales.map((locale) => [localeDetails[locale].htmlLang, absoluteUrl(localizedPath(path, locale))]),
      ),
    },
    openGraph: {
      title,
      description: metaDescription,
      url: canonical,
      siteName,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images,
    },
    robots,
  };
}

function uniqueValues(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function joinPhrase(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function normalizeSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[.。]+$/, "");
}

export function formatCategoryName(value: string): string {
  const words = value
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (categoryAcronyms[lower]) {
        return categoryAcronyms[lower];
      }

      if (index > 0 && categoryMinorWords.has(lower)) {
        return lower;
      }

      return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

export function appKindPhrase(app: Pick<CatalogApp, "surfaces">): string {
  const hasChatGpt = app.surfaces.some((surface) => surface.platform === "chatgpt");
  const hasClaude = app.surfaces.some((surface) => surface.platform === "claude");

  if (hasChatGpt && hasClaude) {
    return "MCP app and connector";
  }

  if (hasClaude) {
    return "MCP connector";
  }

  return "MCP app";
}

export function appPlatformPhrase(app: Pick<CatalogApp, "surfaces">): string {
  return joinPhrase(
    uniqueValues(app.surfaces.map((surface) => (surface.platform === "claude" ? "Claude" : "ChatGPT"))),
  );
}

export function appSeoTitle(app: Pick<CatalogApp, "name" | "surfaces">): string {
  const kind = appKindPhrase(app);
  const platformText = appPlatformPhrase(app);
  const kindText = /\bmcp\b/i.test(app.name) ? kind.replace(/^MCP /, "") : kind;

  return `${app.name} ${kindText}${platformText ? ` for ${platformText}` : ""}`;
}

export function appDescription(app: CatalogApp): string {
  const summary = normalizeSentence(app.tagline || app.description);
  return truncateMeta(
    `${appSeoTitle(app)}. ${summary}. Compare tools, prompts, auth, transport, and publisher details.`,
  );
}

export function appJsonLd(app: CatalogApp) {
  const image = app.iconUrl?.startsWith("http") ? app.iconUrl : app.iconUrl ? absoluteUrl(app.iconUrl) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    applicationCategory: app.categories.join(", "),
    applicationSubCategory: app.surfaces.map((surface) => surface.type).join(", "),
    operatingSystem: "Web",
    description: appDescription(app),
    image,
    author: {
      "@type": "Organization",
      name: app.publisher,
      url: app.publisherUrl,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    url: absoluteUrl(`/app/${app.id}`),
    sameAs: [app.homepageUrl, app.repoUrl].filter(Boolean),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(items: Array<{ name: string; path: string }>, name: string, startPosition = 1) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: startPosition + index,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MCP App Store",
    alternateName: ["mcpapp", "mcpappstore", "MCPAppStore"],
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
  };
}

export function articleJsonLd({
  title,
  description,
  path,
  dateModified,
}: {
  title: string;
  description: string;
  path: string;
  dateModified: string;
}) {
  const url = absoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    dateModified,
    datePublished: dateModified,
    mainEntityOfPage: url,
    author: {
      "@type": "Organization",
      name: "MCP App Store",
      url: absoluteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: "MCP App Store",
      url: absoluteUrl("/"),
    },
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function categoryDescription(category: Pick<CategoryRecord, "name">, count: number): string {
  const name = formatCategoryName(category.name);

  return `Compare ${count} ${name} MCP apps, ChatGPT apps, Claude connectors, and MCP servers by tools, platform support, previews, and integration details.`;
}

export function jsonLdScript(data: unknown) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
