import type { Metadata } from "next";

import { defaultLocale, localeDetails, localizedPath, supportedLocales, type Locale } from "@/lib/i18n";
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

export function siteNameForLocale(locale?: Locale): string {
  if (locale === "ru") {
    return "Магазин MCP-приложений";
  }

  if (locale === "zh-hans") {
    return "MCP 应用商店";
  }

  if (locale === "ja") {
    return "MCP アプリストア";
  }

  if (locale === "ko") {
    return "MCP 앱 스토어";
  }

  return siteName;
}

export function truncateMeta(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const candidate = normalized.slice(0, maxLength - 1).trimEnd();
  const minimumBreak = Math.floor(maxLength * 0.65);
  const sentenceBreak = Math.max(
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("! "),
    candidate.lastIndexOf("? "),
    candidate.lastIndexOf("。"),
    candidate.lastIndexOf("！"),
    candidate.lastIndexOf("？"),
  );
  if (sentenceBreak >= minimumBreak) {
    return candidate.slice(0, sentenceBreak + 1).trimEnd();
  }

  const wordBreak = candidate.lastIndexOf(" ");
  const clipped = wordBreak >= minimumBreak ? candidate.slice(0, wordBreak) : candidate;
  return `${clipped.replace(/[,:;\-–—]+$/, "").trimEnd()}…`;
}

function pageTitleMaxLength(locale?: Locale): number {
  return Math.max(32, 68 - siteNameForLocale(locale).length - 3);
}

export function pageMetadata({
  title,
  description = defaultDescription,
  path,
  locale,
  imagePath,
  keywords,
  robots,
  openGraphType = "website",
}: {
  title: string;
  description?: string;
  path: string;
  locale?: Locale;
  imagePath?: string;
  keywords?: Metadata["keywords"];
  robots?: Metadata["robots"];
  openGraphType?: string;
}): Metadata {
  const canonicalPath = locale ? localizedPath(path, locale) : path;
  const canonical = absoluteUrl(canonicalPath);
  const metaDescription = truncateMeta(description);
  const imageUrl = absoluteUrl(imagePath ?? defaultOgImagePath());
  const localizedSiteName = siteNameForLocale(locale);
  const imageAlt = `${title} on ${localizedSiteName}`;

  return {
    title,
    description: metaDescription,
    keywords,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          supportedLocales.map((locale) => [localeDetails[locale].htmlLang, absoluteUrl(localizedPath(path, locale))]),
        ),
        "x-default": absoluteUrl(localizedPath(path, defaultLocale)),
      },
    },
    openGraph: {
      title,
      description: metaDescription,
      url: canonical,
      siteName: localizedSiteName,
      type: openGraphType,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
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

export function localizedAppKind(app: Pick<CatalogApp, "surfaces">, locale: Locale): string {
  const hasChatGpt = app.surfaces.some((surface) => surface.platform === "chatgpt");
  const hasClaude = app.surfaces.some((surface) => surface.platform === "claude");

  const kinds: Record<Locale, { app: string; connector: string; both: string }> = {
    en: { app: "MCP app", connector: "MCP connector", both: "MCP app and connector" },
    es: { app: "app MCP", connector: "conector MCP", both: "app y conector MCP" },
    fr: { app: "app MCP", connector: "connecteur MCP", both: "app et connecteur MCP" },
    de: { app: "MCP-App", connector: "MCP-Connector", both: "MCP-App und Connector" },
    ru: { app: "MCP-приложение", connector: "MCP-коннектор", both: "MCP-приложение и коннектор" },
    "zh-hans": { app: "MCP 应用", connector: "MCP 连接器", both: "MCP 应用和连接器" },
    ja: { app: "MCP アプリ", connector: "MCP コネクタ", both: "MCP アプリとコネクタ" },
    ko: { app: "MCP 앱", connector: "MCP 커넥터", both: "MCP 앱 및 커넥터" },
  };

  return hasChatGpt && hasClaude ? kinds[locale].both : hasClaude ? kinds[locale].connector : kinds[locale].app;
}

export function localizedAppPlatformPhrase(app: Pick<CatalogApp, "surfaces">, locale: Locale): string {
  const platforms = uniqueValues(
    app.surfaces.map((surface) => (surface.platform === "claude" ? "Claude" : "ChatGPT")),
  );
  if (platforms.length <= 1) {
    return platforms[0] ?? "";
  }

  const conjunction: Record<Locale, string> = {
    en: "and",
    es: "y",
    fr: "et",
    de: "und",
    ru: "и",
    "zh-hans": "和",
    ja: "・",
    ko: "및",
  };
  return platforms.join(` ${conjunction[locale]} `);
}

function appTitleName(app: Pick<CatalogApp, "name" | "publisher">): string {
  return app.name;
}

function fitAppTitle(name: string, qualifier: string, locale: Locale): string {
  const separator = locale === "zh-hans" || locale === "ja" ? "：" : ": ";
  const maxLength = pageTitleMaxLength(locale);
  const fittedQualifier = truncateMeta(qualifier, maxLength - separator.length - 10);
  const nameLength = maxLength - separator.length - fittedQualifier.length;
  return `${truncateMeta(name, nameLength)}${separator}${fittedQualifier}`;
}

function appTitleQualifier(app: Pick<CatalogApp, "publisher" | "surfaces">, locale: Locale): string {
  const platforms = localizedAppPlatformPhrase(app, locale);
  const qualifiers: Record<Locale, string> = {
    en: platforms ? `MCP for ${platforms}` : "MCP app",
    es: platforms ? `MCP para ${platforms}` : "app MCP",
    fr: platforms ? `MCP pour ${platforms}` : "app MCP",
    de: platforms ? `MCP für ${platforms}` : "MCP-App",
    ru: platforms ? `MCP для ${platforms}` : "MCP-приложение",
    "zh-hans": platforms ? `${platforms} MCP 应用` : "MCP 应用",
    ja: platforms ? `${platforms}向けMCP` : "MCP アプリ",
    ko: platforms ? `${platforms}용 MCP` : "MCP 앱",
  };
  const publisher = app.publisher && app.publisher !== "Unknown" ? truncateMeta(app.publisher, 18) : "";
  return `${qualifiers[locale]}${publisher ? ` · ${publisher}` : ""}`;
}

export function appSeoTitle(app: Pick<CatalogApp, "name" | "publisher" | "surfaces">): string {
  return fitAppTitle(appTitleName(app), appTitleQualifier(app, defaultLocale), defaultLocale);
}

export function localizedAppSeoTitle(app: Pick<CatalogApp, "name" | "publisher" | "surfaces">, locale: Locale): string {
  if (locale === defaultLocale) {
    return appSeoTitle(app);
  }

  return fitAppTitle(appTitleName(app), appTitleQualifier(app, locale), locale);
}

export function appDescription(app: CatalogApp): string {
  const summary = normalizeSentence(app.tagline || app.description);
  return truncateMeta(
    `${appSeoTitle(app)}. ${summary}. Compare tools, prompts, auth, transport, and publisher details.`,
  );
}

export function localizedAppDescription(app: CatalogApp, locale: Locale): string {
  if (locale === defaultLocale) {
    return appDescription(app);
  }

  const title = localizedAppSeoTitle(app, locale);
  const publisher = app.publisher || app.name;
  const descriptions: Record<Exclude<Locale, "en">, string> = {
    es: `${title}. Compara herramientas, prompts, autenticación, transporte y detalles del editor ${publisher}.`,
    fr: `${title}. Comparez les outils, prompts, modes d’authentification, transports et informations de l’éditeur ${publisher}.`,
    de: `${title}. Vergleiche Tools, Prompts, Authentifizierung, Transport und Angaben des Anbieters ${publisher}.`,
    ru: `${title}. Сравните инструменты, промпты, аутентификацию, транспорт и сведения издателя ${publisher}.`,
    "zh-hans": `${title}。比较工具、提示词、认证、传输方式和发布者 ${publisher} 的详细信息。`,
    ja: `${title}。ツール、プロンプト、認証、トランスポート、公開者 ${publisher} の情報を比較できます。`,
    ko: `${title}. 도구, 프롬프트, 인증, 전송 방식과 게시자 ${publisher} 정보를 비교하세요.`,
  };
  return truncateMeta(descriptions[locale]);
}

export function appJsonLd(app: CatalogApp, locale: Locale = defaultLocale) {
  const image = app.iconUrl?.startsWith("http") ? app.iconUrl : app.iconUrl ? absoluteUrl(app.iconUrl) : undefined;
  const features = uniqueValues([
    ...app.capabilities,
    ...app.tools.map((tool) => tool.name),
  ]).slice(0, 20);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    applicationCategory: app.categories.join(", "),
    applicationSubCategory: app.surfaces.map((surface) => surface.type).join(", "),
    operatingSystem: "Web",
    description: localizedAppDescription(app, locale),
    image,
    dateCreated: new Date(app.createdAt).toISOString(),
    dateModified: new Date(app.updatedAt).toISOString(),
    softwareVersion: app.version,
    featureList: features.length > 0 ? features : undefined,
    author: {
      "@type": "Organization",
      name: app.publisher,
      url: app.publisherUrl,
    },
    publisher: {
      "@type": "Organization",
      name: app.publisher,
      url: app.publisherUrl,
    },
    url: absoluteUrl(localizedPath(`/app/${app.id}`, locale)),
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
