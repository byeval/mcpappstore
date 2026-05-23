import type { Metadata } from "next";
import Link from "next/link";

import { AppCard } from "@/components/app-card";
import { countAppsByPlatform, listPublishedApps, listSitemapAppEntries } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

const pageTitle = "Awesome MCP Apps";
const pageDescription =
  "A GitHub-friendly awesome list for MCP apps, MCP servers, ChatGPT apps, and Claude connectors, backed by the MCP App Store catalog.";

const hubLinks = [
  {
    href: "/store",
    label: "Full MCP app index",
    summary: "Browse every published MCP app and connector in A-Z form.",
  },
  {
    href: "/mcp-directory",
    label: "MCP directory",
    summary: "Compare MCP servers, ChatGPT apps, and Claude connectors from one hub.",
  },
  {
    href: "/mcp-servers",
    label: "MCP servers",
    summary: "Review server-style integrations by platform fit and operational scope.",
  },
  {
    href: "/mcp-clients",
    label: "MCP clients",
    summary: "Browse desktop, web, CLI, IDE, and agent clients that connect to MCP servers.",
  },
  {
    href: "/chatgpt-apps",
    label: "ChatGPT apps",
    summary: "Find MCP-backed apps built for ChatGPT workflows and UI surfaces.",
  },
  {
    href: "/claude-connectors",
    label: "Claude connectors",
    summary: "Browse Claude-ready MCP connectors and interactive connector listings.",
  },
  {
    href: "/collections",
    label: "Curated collections",
    summary: "Jump into developer, productivity, design, finance, and observability routes.",
  },
];

const appTypeLinks = [
  {
    href: "/category/design",
    label: "Diagrams & visualization",
    summary: "Diagram editors, whiteboards, design canvases, and visual reasoning tools.",
  },
  {
    href: "/category/3d",
    label: "3D & creative",
    summary: "3D viewers, creative coding, CAD-style workflows, and rich visual tools.",
  },
  {
    href: "/category/productivity",
    label: "Productivity",
    summary: "Tasks, notes, docs, calendars, writing, meetings, and workspace automation.",
  },
  {
    href: "/category/data-analysis",
    label: "Data & analytics",
    summary: "Dashboards, charts, BI, spreadsheets, logs, metrics, and data exploration.",
  },
  {
    href: "/category/media",
    label: "Media",
    summary: "Audio, video, image, PDF, music, and document viewing or generation.",
  },
  {
    href: "/category/developer-tools",
    label: "Developer tools",
    summary: "Coding agents, browser automation, terminals, deploys, testing, and debugging.",
  },
];

const builderResourceGroups = [
  {
    label: "Official references",
    summary: "Start with the protocol and host UI guidance.",
    links: [
      { href: "https://modelcontextprotocol.io/docs/extensions/apps", label: "MCP Apps docs" },
      { href: "https://github.com/modelcontextprotocol/ext-apps", label: "ext-apps spec & SDK" },
      { href: "https://developers.openai.com/apps-sdk/concepts/ui-guidelines", label: "ChatGPT UI guidelines" },
      { href: "https://claude.com/docs/connectors/building/mcp-apps/design-guidelines", label: "Claude design guidelines" },
    ],
  },
  {
    label: "Examples",
    summary: "Matched examples open our detail pages; unmatched ones stay on GitHub.",
    links: [
      { href: "https://github.com/modelcontextprotocol/ext-apps/tree/main/examples", label: "Official examples" },
      { href: "/app/excalidraw-app-demo", label: "Excalidraw MCP" },
      { href: "/app/threejs-3d-viewer", label: "Three.js 3D Viewer" },
      { href: "/app/play-sheet-music", label: "Play Sheet Music" },
      { href: "/app/pdf-viewer", label: "PDF Viewer" },
      { href: "https://github.com/jgraph/drawio-mcp", label: "draw.io MCP" },
      { href: "https://github.com/psylch/mermaid-mcp-app", label: "Mermaid MCP app" },
    ],
  },
  {
    label: "Frameworks",
    summary: "Libraries and kits for building app-style MCP surfaces.",
    links: [
      { href: "https://github.com/mcp-use/mcp-use", label: "mcp-use" },
      { href: "https://github.com/alpic-ai/skybridge", label: "Skybridge" },
      { href: "https://github.com/AndurilCode/mcp-apps-kit", label: "mcp-apps-kit" },
      { href: "https://github.com/epicweb-dev/mcp-ui", label: "mcp-ui" },
    ],
  },
  {
    label: "Tools & templates",
    summary: "Inspectors, starters, and source lists for builders.",
    links: [
      { href: "https://github.com/MCPJam/inspector", label: "MCPJam Inspector" },
      { href: "https://github.com/sebderhy/mcp-app-template", label: "MCP app template" },
      { href: "https://github.com/vardior/mcp-app-fastmcp-example", label: "FastMCP example" },
      { href: "https://github.com/psylch/awesome-mcp-apps", label: "Source awesome list" },
    ],
  },
];

const faqs = [
  {
    question: "What is Awesome MCP Apps?",
    answer:
      "Awesome MCP Apps is a shareable, GitHub-friendly landing page for MCP apps, MCP servers, ChatGPT apps, and Claude connectors in the MCP App Store catalog.",
  },
  {
    question: "How is this different from a normal GitHub awesome list?",
    answer:
      "A static awesome list is usually maintained by hand. This page uses the same catalog data as MCP App Store, so counts and featured listings can refresh with the directory.",
  },
  {
    question: "Can I submit an MCP app for this list?",
    answer:
      "Yes. Submit the MCP app, server, or connector with publisher, platform, auth, tools, and workflow details so it can be reviewed for the directory.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), listSitemapAppEntries()]);
  const listingText = apps.length.toLocaleString("en-US");

  return pageMetadata({
    title: `Awesome MCP Apps: ${listingText} MCP apps, servers, and connectors`,
    description: pageDescription,
    path: "/awesome-mcp-apps",
    locale,
    keywords: [
      "awesome MCP apps",
      "awesome-mcp-apps",
      "awesome MCP servers",
      "MCP awesome list",
      "MCP apps GitHub",
      "Model Context Protocol apps",
      "ChatGPT apps",
      "Claude connectors",
    ],
  });
}

export default async function AwesomeMcpAppsPage() {
  const [{ locale, messages: t }, apps, chatgptCount, claudeCount] = await Promise.all([
    getI18n(),
    listPublishedApps(),
    countAppsByPlatform("chatgpt"),
    countAppsByPlatform("claude"),
  ]);
  const href = (path: string) => localizedPath(path, locale);
  const totalListings = apps.length;
  const lastUpdated = apps.reduce((max, app) => Math.max(max, app.publishedAt ?? 0, app.updatedAt), 0);
  const lastUpdatedIso = new Date(lastUpdated || Date.now()).toISOString();
  const lastUpdatedDate = lastUpdatedIso.slice(0, 10);
  const featuredApps = apps.slice(0, 24);

  return (
    <div className="page-stack">
      <section className="collection-hero awesome-hero">
        <div>
          <p className="eyebrow">{pageTitle}</p>
          <h1>Awesome MCP apps for GitHub readers and AI builders</h1>
          <p>
            A README-friendly route for people looking for the best MCP apps, MCP servers, ChatGPT apps, and Claude connectors without digging through scattered repos.
          </p>
          <div className="collection-hero-actions awesome-hero-actions">
            <Link className="primary-link" href={href("/store")} prefetch={false}>
              Browse all listings
            </Link>
            <Link className="secondary-link" href={href("/submit")} prefetch={false}>
              Submit an MCP app
            </Link>
          </div>
          <div className="collection-hero-meta" aria-label="Awesome MCP Apps page metadata">
            <span>awesome-mcp-apps</span>
            <span>{formatMessage(t.common.updated, { date: lastUpdatedDate })}</span>
            <span>GitHub-friendly</span>
          </div>
        </div>
        <aside className="collection-hero-panel awesome-hero-panel">
          <span>Share this route from READMEs</span>
          <strong>{totalListings}</strong>
          <span>MCP apps, servers, and connectors indexed from the directory catalog.</span>
          <a href="https://github.com/byeval/mcpappstore" rel="noreferrer" target="_blank">
            Open the GitHub repo
          </a>
        </aside>
      </section>

      <div className="app-index-metrics" aria-label="Awesome MCP Apps directory counts">
        <div>
          <strong>{totalListings}</strong>
          <span>Total MCP listings</span>
        </div>
        <div>
          <strong>{chatgptCount}</strong>
          <span>ChatGPT app listings</span>
        </div>
        <div>
          <strong>{claudeCount}</strong>
          <span>Claude connector listings</span>
        </div>
      </div>

      <section className="catalog-shell compact-shell" aria-labelledby="awesome-types-title">
        <div className="section-head compact">
          <p className="eyebrow">Browse by app type</p>
          <h2 id="awesome-types-title">Find the kind of MCP app you need</h2>
          <p className="section-copy">
            Jump straight into the directory routes that match the strongest categories from the awesome MCP apps ecosystem.
          </p>
        </div>
        <div className="collection-card-grid awesome-link-grid">
          {appTypeLinks.map((link) => (
            <Link className="collection-card" href={href(link.href)} key={link.href} prefetch={false}>
              <span className="learn-card-type">MCP app type</span>
              <h2>{link.label}</h2>
              <p>{link.summary}</p>
              <span className="collection-card-count">Browse category</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="catalog-shell compact-shell" aria-labelledby="awesome-builder-title">
        <div className="section-head compact">
          <p className="eyebrow">Builder resources</p>
          <h2 id="awesome-builder-title">Useful links from the MCP app ecosystem</h2>
          <p className="section-copy">
            Official docs, examples, frameworks, and templates for people who want to inspect or build interactive MCP apps.
          </p>
        </div>
        <div className="collection-card-grid awesome-resource-grid">
          {builderResourceGroups.map((group) => (
            <div className="collection-card awesome-resource-card" key={group.label}>
              <span className="learn-card-type">Resource group</span>
              <h2>{group.label}</h2>
              <p>{group.summary}</p>
              <div className="awesome-resource-list">
                {group.links.map((link) => (
                  link.href.startsWith("/") ? (
                    <Link href={href(link.href)} key={link.href} prefetch={false}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
                      {link.label}
                    </a>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="collection-card-grid awesome-link-grid" aria-label="Awesome MCP Apps sections">
        {hubLinks.map((link) => (
          <Link className="collection-card" href={href(link.href)} key={link.href} prefetch={false}>
            <span className="learn-card-type">Awesome MCP route</span>
            <h2>{link.label}</h2>
            <p>{link.summary}</p>
            <span className="collection-card-count">Open section</span>
          </Link>
        ))}
      </section>

      <section className="catalog-shell compact-shell" aria-labelledby="awesome-mcp-app-list">
        <div className="section-head compact">
          <p className="eyebrow">Fresh from the catalog</p>
          <h2 id="awesome-mcp-app-list">Featured MCP apps to start with</h2>
          <p className="section-copy">
            A compact starting list for GitHub visitors. Open any listing for tools, prompts, platform support, and publisher details.
          </p>
        </div>
        <div className="app-grid">
          {featuredApps.map((app) => (
            <AppCard app={app} key={app.id} locale={locale} messages={t} />
          ))}
        </div>
      </section>

      <section className="article-faq category-faq" id="faq">
        <div className="section-head compact">
          <p className="eyebrow">FAQ</p>
          <h2>Awesome MCP Apps FAQ</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: pageTitle,
            description: pageDescription,
            url: absoluteUrl(href("/awesome-mcp-apps")),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: pageTitle,
              numberOfItems: totalListings,
            },
          },
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: pageTitle, path: "/awesome-mcp-apps" },
          ]),
          itemListJsonLd(
            featuredApps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            pageTitle,
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
