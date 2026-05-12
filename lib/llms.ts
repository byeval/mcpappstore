import { appCollections, listCollectionApps, type AppCollection } from "@/lib/collections";
import { getCategorySummaries, listPublishedApps } from "@/lib/data";
import { learnArticles, type LearnArticle, type LearnSection } from "@/lib/learn";
import { appKindPhrase, appPlatformPhrase, formatCategoryName } from "@/lib/seo";
import type { CatalogApp, CategorySummary } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

const highSignalArticleSlugs = [
  "what-is-an-mcp-app",
  "build-your-first-mcp-app",
  "tldraw-mcp-app",
  "brand24-mcp",
  "morningstar-mcp",
  "anthropic-pdf-viewer-mcp",
  "n8n-mcp",
  "calendly-to-claude",
  "pyroscope-mcp",
  "chatgpt-apps-vs-claude-connectors",
  "best-mcp-apps-for-coding-agents",
  "claude-connectors-for-databases",
  "best-claude-connectors-for-productivity",
  "best-mcp-apps-for-spreadsheets",
  "mcp-app-directory-for-teams",
];

const highSignalCollectionSlugs = [
  "mcp-apps-for-developers",
  "mcp-apps-for-productivity",
  "chatgpt-apps-for-design",
  "claude-connectors-for-databases",
  "chatgpt-apps-for-productivity",
  "mcp-apps-for-finance-teams",
  "mcp-apps-for-marketing-analytics",
  "mcp-apps-for-observability",
  "mcp-apps-for-voice-and-media",
];

function siteUrl() {
  return absoluteUrl("/").replace(/\/$/, "");
}

function normalizeMarkdown(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function truncateMarkdown(value: string, maxLength: number) {
  const normalized = normalizeMarkdown(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength);
  const lastBreak = truncated.lastIndexOf("\n\n");
  return `${truncated.slice(0, lastBreak > 400 ? lastBreak : maxLength).trim()}\n\n...`;
}

function markdownLink(title: string, path: string) {
  return `- [${title}](${absoluteUrl(path)})`;
}

function priorityIndex(slug: string, prioritySlugs: string[]) {
  const index = prioritySlugs.indexOf(slug);
  return index === -1 ? prioritySlugs.length + 1 : index;
}

function prioritizedLearnArticles() {
  return [...learnArticles].sort((a, b) => {
    const priorityDelta = priorityIndex(a.slug, highSignalArticleSlugs) - priorityIndex(b.slug, highSignalArticleSlugs);
    return priorityDelta || a.title.localeCompare(b.title);
  });
}

function prioritizedCollections() {
  return [...appCollections].sort((a, b) => {
    const priorityDelta = priorityIndex(a.slug, highSignalCollectionSlugs) - priorityIndex(b.slug, highSignalCollectionSlugs);
    return priorityDelta || a.title.localeCompare(b.title);
  });
}

function sectionMarkdown(section: LearnSection) {
  return normalizeMarkdown(`## ${section.title}

${section.body.join("\n\n")}
${section.bullets?.length ? `\n\n${section.bullets.map((item) => `- ${item}`).join("\n")}` : ""}
${section.steps?.length ? `\n\n${section.steps.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : ""}
${section.code ? `\n\n\`\`\`json\n${section.code}\n\`\`\`` : ""}
${section.callout ? `\n\n> ${section.callout}` : ""}`);
}

function appLine(app: CatalogApp) {
  const platforms = appPlatformPhrase(app);
  const categories = app.categories.slice(0, 5).map((category) => category.replace(/-/g, " ")).join(", ");
  return `- [${app.name}](${absoluteUrl(`/app/${app.id}`)}): ${appKindPhrase(app)}${platforms ? ` for ${platforms}` : ""}. ${app.tagline} Categories: ${categories || "not listed"}.`;
}

function categoryLine(category: CategorySummary) {
  return `- [${formatCategoryName(category.name)}](${absoluteUrl(`/category/${category.slug}`)}): ${category.count} MCP apps and connectors.`;
}

function buildLearnList(limit: number) {
  return prioritizedLearnArticles()
    .slice(0, limit)
    .map((article) => {
      return [
        `- [${article.title}](${absoluteUrl(`/learn/${article.slug}`)})`,
        `  - Summary: ${article.summary}`,
        `  - Markdown: ${absoluteUrl(`/learn/${article.slug}/markdown`)}`,
        `  - Updated: ${article.updatedAt}`,
      ].join("\n");
    })
    .join("\n");
}

function buildCollectionList(limit: number) {
  return prioritizedCollections()
    .slice(0, limit)
    .map((collection) => {
      return [
        `- [${collection.title}](${absoluteUrl(`/collections/${collection.slug}`)})`,
        `  - Summary: ${collection.summary}`,
        `  - Markdown: ${absoluteUrl(`/collections/${collection.slug}/markdown`)}`,
        `  - Updated: ${collection.updatedAt}`,
      ].join("\n");
    })
    .join("\n");
}

export function serializeLearnArticleMarkdown(article: LearnArticle) {
  const related = article.relatedLinks.map((link) => `- [${link.label}](${link.href.startsWith("http") ? link.href : absoluteUrl(link.href)})`).join("\n");
  const sources = article.sources.map((source) => `- [${source.label}](${source.url})`).join("\n");
  const faqs = article.faqs?.map((item) => `### ${item.question}\n\n${item.answer}`).join("\n\n") ?? "";

  return normalizeMarkdown(`# ${article.title}

> ${article.description}

- Site: MCP App Store
- Canonical: ${absoluteUrl(`/learn/${article.slug}`)}
- Content type: ${article.intent}
- Topics: ${article.topics.join(", ")}
- Reading time: ${article.readingTime}
- Last updated: ${article.updatedAt}

${article.sections.map(sectionMarkdown).join("\n\n")}

${faqs ? `## FAQ\n\n${faqs}` : ""}

## Related

${related}

## Sources

${sources}`);
}

export function serializeCollectionMarkdown(collection: AppCollection, apps: CatalogApp[]) {
  const related = collection.relatedLinks.map((link) => `- [${link.label}](${link.href.startsWith("http") ? link.href : absoluteUrl(link.href)})`).join("\n");
  const faqs = collection.faqs.map((item) => `### ${item.question}\n\n${item.answer}`).join("\n\n");

  return normalizeMarkdown(`# ${collection.title}

> ${collection.description}

- Site: MCP App Store
- Canonical: ${absoluteUrl(`/collections/${collection.slug}`)}
- Primary category: ${collection.primaryCategorySlug}
- Platform focus: ${collection.platform ?? "all MCP hosts"}
- Last updated: ${collection.updatedAt}
- Matching listings in this export: ${apps.length}

## How to Choose

${collection.checkpoints.map((checkpoint) => `- ${checkpoint}`).join("\n")}

## Matching Apps and Connectors

${apps.slice(0, 36).map(appLine).join("\n") || "No matching listings yet."}

## Related

${related}

## FAQ

${faqs}`);
}

export async function buildLlmsTxt() {
  const [categories, apps] = await Promise.all([getCategorySummaries(), listPublishedApps()]);
  const topCategories = [...categories].sort((a, b) => b.count - a.count).slice(0, 18);
  const featuredApps = apps.slice(0, 18);

  return normalizeMarkdown(`# MCP App Store

> mcpapp is a directory for discovering and comparing MCP apps, ChatGPT apps, Claude connectors, MCP servers, and AI assistant integrations.

MCP App Store focuses on practical evaluation: what host an app supports, which tools it exposes, whether it reads or writes data, how auth and transport work, who publishes it, and where users can connect or learn more.

## AI-readable resources

- [Full LLM context](${siteUrl()}/llms-full.txt)
- [Sitemap](${siteUrl()}/sitemap.xml)
- [Robots policy](${siteUrl()}/robots.txt)
- [RSS feed](${siteUrl()}/rss.xml)
- [Learn hub](${siteUrl()}/learn)
- [Collections hub](${siteUrl()}/collections)

## Core directory pages

${markdownLink("Browse all MCP apps", "/")}
${markdownLink("All MCP apps A-Z", "/store")}
${markdownLink("ChatGPT apps directory", "/chatgpt-apps")}
${markdownLink("Claude connectors directory", "/claude-connectors")}
${markdownLink("MCP app learning guides", "/learn")}
${markdownLink("Curated MCP app collections", "/collections")}
${markdownLink("Submit an MCP listing", "/submit")}

## High-signal guides

${buildLearnList(12)}

## Curated collections

${buildCollectionList(8)}

## Major category pages

${topCategories.map(categoryLine).join("\n")}

## Representative listings

${featuredApps.map(appLine).join("\n")}

## Topic areas

- MCP basics: what an MCP app is, how MCP servers work, and how ChatGPT apps differ from Claude connectors.
- Builder workflows: first MCP app planning, tool contracts, auth, review, and listing guidance.
- Evaluation workflows: compare apps by host support, tools, auth type, transport, previews, publisher links, privacy, and write permissions.
- Common verticals: productivity, developer tools, design, data, finance, travel, marketing, spreadsheets, coding agents, and databases.`);
}

export async function buildLlmsFullTxt() {
  const [categories, apps] = await Promise.all([getCategorySummaries(), listPublishedApps()]);
  const learnSections = prioritizedLearnArticles()
    .map((article) => {
      return normalizeMarkdown(`## ${article.title}

- URL: ${absoluteUrl(`/learn/${article.slug}`)}
- Markdown: ${absoluteUrl(`/learn/${article.slug}/markdown`)}
- Type: ${article.intent}
- Summary: ${article.summary}
- Updated: ${article.updatedAt}

${truncateMarkdown(serializeLearnArticleMarkdown(article), 2200)}`);
    })
    .join("\n\n");

  const collectionSections = prioritizedCollections()
    .map((collection) => {
      const collectionApps = listCollectionApps(collection, apps);
      return normalizeMarkdown(`## ${collection.title}

- URL: ${absoluteUrl(`/collections/${collection.slug}`)}
- Markdown: ${absoluteUrl(`/collections/${collection.slug}/markdown`)}
- Summary: ${collection.summary}
- Matching listings: ${collectionApps.length}

${truncateMarkdown(serializeCollectionMarkdown(collection, collectionApps), 1800)}`);
    })
    .join("\n\n");

  return normalizeMarkdown(`# MCP App Store full LLM context

> MCP App Store is a discovery and evaluation directory for MCP apps, ChatGPT apps, Claude connectors, MCP servers, and assistant integrations.

## Site positioning

mcpapp helps users and teams compare AI assistant integrations before connecting them. Listings emphasize supported host surfaces, tool scope, auth type, transport, publisher identity, support/privacy links, example prompts, previews, and related apps.

Important search intents covered by the site include: "what is an MCP app", "how to build your first MCP app", "ChatGPT apps", "Claude connectors", "{app name} MCP", "best MCP apps for developers", "Claude connectors for databases", "ChatGPT apps for design", and "MCP app directory for teams".

## Primary URL map

- Home: ${absoluteUrl("/")}
- All apps A-Z: ${absoluteUrl("/store")}
- ChatGPT apps: ${absoluteUrl("/chatgpt-apps")}
- Claude connectors: ${absoluteUrl("/claude-connectors")}
- Learn: ${absoluteUrl("/learn")}
- Collections: ${absoluteUrl("/collections")}
- Submit: ${absoluteUrl("/submit")}
- Docs: ${absoluteUrl("/docs")}
- FAQ: ${absoluteUrl("/faq")}

## Category inventory

${[...categories].sort((a, b) => b.count - a.count).map(categoryLine).join("\n")}

## Representative app listings

${apps.slice(0, 80).map(appLine).join("\n")}

## Learn article inventory

${learnSections}

## Collection inventory

${collectionSections}`);
}
