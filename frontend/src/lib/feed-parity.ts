// Original LLM format retained; all records come from the verified public snapshot.
import { appCollections as allCollections, listCollectionApps, type AppCollection } from './collections';
import { learnArticles as allArticles, type LearnArticle, type LearnSection } from './learn';
import { apps as snapshotApps, categories, supportedLocales, visibleApps, blockedPaths, pathFor, categoryApps, pageSize } from './catalog';
import { visibleSkills, skillPath } from './skills';
import snapshot from '../data/catalog.json';
import { isRemovedContentPath } from './content-removals';
import { categoryIndexable } from './parity';
import {publicPaths} from './public-pages';
import type { CatalogApp, CategorySummary } from './types';
import type { Locale } from './i18n';

export const origin = 'https://mcpapp.net';
const absoluteUrl=(path:string)=>new URL(path,origin).href;
export function allowedPath(path:string){
 try{const decoded=decodeURIComponent(new URL(path,origin).pathname).replace(/\/+$/,'')||'/';return !isRemovedContentPath(decoded)&&!blockedPaths.some(p=>decodeURIComponent(p).replace(/\/+$/,'')===decoded);}catch{return false;}
}
const appCollections=allCollections.filter(c=>allowedPath(`/collections/${c.slug}`));
const learnArticles=allArticles.filter(a=>allowedPath(`/learn/${a.slug}`));
const listPublishedApps=async()=>visibleApps('en') as unknown as CatalogApp[];
const getCategorySummaries=async()=>categories.map(c=>({...c,count:categoryApps('en',c.slug).length})).filter(c=>allowedPath(`/category/${c.slug}`)&&categoryIndexable(c.slug,c.count));
const formatCategoryName=(s:string)=>s.replace(/-/g,' ').replace(/\b[a-z]/g,c=>c.toUpperCase());
function appKindPhrase(app:CatalogApp){const p=new Set((app.surfaces??[]).map(s=>s.platform));return p.has('claude')?(p.has('chatgpt')?'MCP app and connector':'MCP connector'):'MCP app';}
function appPlatformPhrase(app:CatalogApp){return [...new Set((app.surfaces??[]).map(s=>s.platform==='claude'?'Claude':'ChatGPT'))].join(' and ');}
function safeRelated(href:string){try{const u=new URL(href,origin);if(!['http:','https:'].includes(u.protocol))return false;if(u.origin!==origin)return true;if(!allowedPath(u.pathname))return false;const app=u.pathname.match(/^\/app\/([^/]+)$/);return !app||visibleApps('en').some(a=>a.id===app[1]);}catch{return false;}}
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
  const related = article.relatedLinks.filter(link=>safeRelated(link.href)).map((link) => `- [${link.label}](${link.href.startsWith("http") ? link.href : absoluteUrl(link.href)})`).join("\n");
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
  const related = collection.relatedLinks.filter(link=>safeRelated(link.href)).map((link) => `- [${link.label}](${link.href.startsWith("http") ? link.href : absoluteUrl(link.href)})`).join("\n");
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

export function escapeXml(value:string){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
export function buildRss(){
 const latest=[...visibleApps('en')].sort((a,b)=>Number(b.publishedAt??b.updatedAt)-Number(a.publishedAt??a.updatedAt)).slice(0,20);
 const date=(value:number|string)=>new Date(value).toUTCString();
 const last=latest.length?date(Math.max(...latest.map(a=>Number(a.updatedAt)))):new Date(0).toUTCString();
 return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>MCP App Store</title><link>${origin}/</link><atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/><description>Newly published MCP apps.</description><lastBuildDate>${last}</lastBuildDate>${latest.map(a=>`<item><title>${escapeXml(a.name)}</title><link>${origin}/app/${escapeXml(a.id)}</link><description>${escapeXml(a.tagline)}</description><pubDate>${date(a.publishedAt??a.updatedAt)}</pubDate><guid>${origin}/app/${escapeXml(a.id)}</guid></item>`).join('')}</channel></rss>`;
}
export function robotsPolicy(production=false){
 if(!production)return 'User-agent: *\nDisallow: /\n# Preview build: never index\n';
 const restricted=['/admin','/api/import','/api/submit','/api/categories/','/api/platforms/','/_revalidate'];
 const group=(agents:string[],allow:boolean)=>agents.map(a=>`User-agent: ${a}`).join('\n')+'\n'+(allow?'Allow: /\n'+restricted.map(p=>`Disallow: ${p}`).join('\n'):'Disallow: /');
 return [group(['OAI-SearchBot','Claude-SearchBot','PerplexityBot'],true),group(['ChatGPT-User','Claude-User','Perplexity-User','Meta-ExternalFetcher'],true),group(['GPTBot','ClaudeBot','Google-Extended','Applebot-Extended','CCBot','Meta-ExternalAgent','Bytespider'],false),group(['*'],true),`Sitemap: ${origin}/sitemap.xml\nHost: ${origin}`].join('\n\n')+'\n';
}
export const sitemapKinds=['static','apps','skills','categories','collections','learn'] as const;
export type SitemapKind=typeof sitemapKinds[number];
export function sitemapPaths(kind:SitemapKind,locale:Locale){
 switch(kind){
 case 'apps': return visibleApps(locale).map(a=>`/app/${a.id}`);
 case 'skills':return visibleSkills(locale).map(s=>skillPath(s.id));
 case 'learn':return ['/learn',...allArticles.map(a=>`/learn/${a.slug}`)];
 case 'collections':return ['/collections',...allCollections.map(c=>`/collections/${c.slug}`)];
 case 'categories':return categories.flatMap(c=>{const n=categoryApps(locale,c.slug).length;return categoryIndexable(c.slug,n)?Array.from({length:Math.ceil(n/pageSize)},(_,i)=>`/category/${c.slug}${i?`?page=${i+1}`:''}`):[];});
 case 'static': return ['/','/skills','/submit',...publicPaths(locale)];
 }
}
export const sitemapAppChunkSize=45000;
export function appSitemapKinds(){return supportedLocales.flatMap(locale=>Array.from({length:Math.max(1,Math.ceil(visibleApps(locale).length/sitemapAppChunkSize))},(_,i)=>`apps-${locale}${i?`-${i+1}`:''}`));}
export function sitemapIndexKinds(){return [...sitemapKinds.filter(k=>k!=='apps'&&k!=='skills'),...catalogIndexKinds('apps'),...catalogIndexKinds('skills')];}
export function sitemapEndpointKinds(){return [...sitemapKinds,...appSitemapKinds(),...numberedSitemapKinds('apps'),...numberedSitemapKinds('skills')];}
// Match current production chunking: source record first, then its locales.
// Do not merge historical seed fallback: only verified public snapshot records.
export const sitemapSourceChunkSize=Math.max(1,Math.floor(50000/supportedLocales.length));
const sourceMemo=new Map<string,string[][]>();
function sourceGroups(kind:'apps'|'skills'){
 if(!sourceMemo.has(kind)){
  const appRows=[...snapshotApps].filter(a=>a.status==='published').sort((a,b)=>Number((b as {isFeatured?:boolean}).isFeatured??false)-Number((a as {isFeatured?:boolean}).isFeatured??false)||(Number(b.publishedAt??b.updatedAt)-Number(a.publishedAt??a.updatedAt)));
  const rank:Record<string,number>={bundled:0,local:1,external:2};
  const skillRows=[...snapshot.skills].sort((a,b)=>(rank[a.sourceType]??3)-(rank[b.sourceType]??3)||a.displayName.localeCompare(b.displayName));
  const paths=kind==='apps'?appRows.map(a=>`/app/${a.id}`):skillRows.map(s=>skillPath(s.id));
  sourceMemo.set(kind,paths.map(p=>supportedLocales.map(locale=>pathFor(locale,p)).filter(allowedPath)));
 }
 return sourceMemo.get(kind)!;
}
export function numberedSitemapKinds(kind:'apps'|'skills'){return Array.from({length:Math.max(1,Math.ceil(sourceGroups(kind).length/sitemapSourceChunkSize))},(_,i)=>`${kind}-${i}`);}
function catalogIndexKinds(kind:'apps'|'skills'){const keys=numberedSitemapKinds(kind);return keys.length>1?keys:[kind];}
function numberedUrls(kind:'apps'|'skills',chunk:number){const start=chunk*sitemapSourceChunkSize;return sourceGroups(kind).slice(start,start+sitemapSourceChunkSize).flat();}
export function sitemapIndex(kinds:string[]){return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${kinds.map(kind=>`<sitemap><loc>${origin}/sitemaps/${escapeXml(kind)}.xml</loc></sitemap>`).join('')}</sitemapindex>`;}
export function urlset(urls:string[]){
 const unique=[...new Set(urls)];if(unique.length>50000)throw Error('Sitemap exceeds 50,000 URLs');
 const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${unique.map(p=>`<url><loc>${escapeXml(absoluteUrl(p))}</loc></url>`).join('')}</urlset>`;
 if(new TextEncoder().encode(xml).byteLength>52428800)throw Error('Sitemap exceeds 50 MiB uncompressed');return xml;
}
export function sitemapShard(kind:string){
 // Keep old /sitemaps/apps.xml usable as an index, but never nest that index
 // inside the primary index: the root lists its leaf locale shards directly.
 if(kind==='apps'||kind==='skills'){const keys=numberedSitemapKinds(kind);return keys.length>1?sitemapIndex(keys):urlset(numberedUrls(kind,0));}
 const numbered=kind.match(/^(apps|skills)-(0|[1-9][0-9]*)$/);
 if(numbered){const type=numbered[1] as 'apps'|'skills';if(!numberedSitemapKinds(type).includes(kind))throw Error('Unknown sitemap chunk');return urlset(numberedUrls(type,Number(numbered[2])));}
 for(const locale of supportedLocales){const base=`apps-${locale}`;if(kind===base||kind.startsWith(`${base}-`)){const suffix=kind.slice(base.length);if(suffix&&!/^-[1-9][0-9]*$/.test(suffix))continue;const start=(Number(suffix.slice(1)||1)-1)*sitemapAppChunkSize;return urlset(visibleApps(locale).slice(start,start+sitemapAppChunkSize).map(a=>pathFor(locale,`/app/${a.id}`)).filter(allowedPath));}}
 if(!sitemapKinds.includes(kind as SitemapKind))throw Error('Unknown sitemap');
 return urlset(supportedLocales.flatMap(locale=>sitemapPaths(kind as SitemapKind,locale).map(p=>pathFor(locale,p)).filter(allowedPath)));
}
