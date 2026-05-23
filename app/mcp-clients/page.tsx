import type { Metadata } from "next";
import Link from "next/link";

import {
  MCP_CLIENTS_SOURCE,
  MCP_CLIENTS_UPDATED_AT,
  listMcpClientPlatformSummaries,
  listMcpClientTypeSummaries,
  listMcpClients,
  type McpClient,
} from "@/lib/mcp-clients";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { absoluteUrl, initials } from "@/lib/utils";

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function hasDesktopPlatform(client: McpClient): boolean {
  return client.platforms.some((platform) => /windows|macos|linux/i.test(platform)) || /desktop/i.test(client.type ?? "");
}

function ClientRow({ client, href }: { client: McpClient; href: string }) {
  return (
    <Link className="app-row" href={href} prefetch={false}>
      <div className="app-icon">
        <div className="app-icon-inner mcp-client-icon">
          <span>{initials(client.name)}</span>
        </div>
      </div>
      <div className="app-meta">
        <p className="app-name">{client.name}</p>
        <p className="app-tag">{client.summary}</p>
      </div>
      <span className="app-side-meta">{client.type ?? client.platforms[0] ?? "Client"}</span>
      <svg className="app-chev" fill="none" viewBox="0 0 24 24">
        <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </Link>
  );
}

const pageDescription =
  "Browse awesome MCP clients for desktop, web, CLI, IDE, and agent workflows, with detail pages sourced from punkpeye/awesome-mcp-clients.";

const faqs = [
  {
    question: "What is an MCP client?",
    answer:
      "An MCP client is the app, IDE, chatbot, agent framework, or command-line tool that connects to Model Context Protocol servers and lets users invoke those server capabilities.",
  },
  {
    question: "Where does this MCP clients list come from?",
    answer:
      "The initial client data is imported from the punkpeye/awesome-mcp-clients GitHub repository and normalized into detail pages for easier browsing.",
  },
  {
    question: "How should I choose an MCP client?",
    answer:
      "Start with the environment you need, such as desktop, web, CLI, IDE, or team chat, then compare license, pricing, platform support, language ecosystem, and whether the client supports your preferred MCP server transport.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const totalClients = listMcpClients().length;

  return pageMetadata({
    title: `Awesome MCP Clients: ${formatNumber(totalClients)} MCP clients`,
    description: pageDescription,
    path: "/mcp-clients",
    locale,
    keywords: [
      "MCP clients",
      "awesome MCP clients",
      "Model Context Protocol clients",
      "MCP client directory",
      "MCP desktop clients",
      "MCP CLI clients",
      "MCP IDE clients",
    ],
  });
}

export default async function McpClientsPage() {
  const { locale } = await getI18n();
  const href = (path: string) => localizedPath(path, locale);
  const clients = listMcpClients();
  const typeSummaries = listMcpClientTypeSummaries(6);
  const platformSummaries = listMcpClientPlatformSummaries(10);
  const totalClients = clients.length;
  const lastUpdatedDate = MCP_CLIENTS_UPDATED_AT.slice(0, 10);
  const githubCount = clients.filter((client) => client.githubUrl).length;
  const webCount = clients.filter((client) => client.platforms.some((platform) => /^web$/i.test(platform)) || /web/i.test(client.type ?? "")).length;
  const desktopCount = clients.filter(hasDesktopPlatform).length;
  const cliCount = clients.filter((client) => /cli|terminal|command/i.test(client.type ?? "")).length;
  const screenshotCount = clients.filter((client) => client.screenshots.length > 0).length;

  return (
    <div className="page-stack">
      <section className="collection-hero awesome-hero mcp-clients-hero">
        <div className="mcp-clients-hero-copy">
          <p className="eyebrow">Awesome MCP Clients</p>
          <h1>MCP clients for desktop apps, IDEs, terminals, agents, and team chat</h1>
          <p>
            A browsable version of the awesome MCP clients list, normalized into search-friendly cards and detail pages
            for every imported client.
          </p>
          <div className="awesome-hero-actions mcp-clients-hero-actions">
            <Link className="primary-link" href="#clients" prefetch={false}>
              Browse clients
            </Link>
            <a className="secondary-link" href={MCP_CLIENTS_SOURCE.repoUrl} rel="noreferrer" target="_blank">
              Open source list
            </a>
          </div>
          <div className="collection-hero-meta mcp-clients-hero-meta" aria-label="MCP clients page metadata">
            <span>{formatNumber(totalClients)} clients</span>
            <span>Updated {lastUpdatedDate}</span>
            <span>{MCP_CLIENTS_SOURCE.name}</span>
          </div>
        </div>
        <aside className="collection-hero-panel awesome-hero-panel">
          <span>Imported source</span>
          <strong>{formatNumber(totalClients)}</strong>
          <span>Client entries with normalized platform, pricing, license, language, and source links.</span>
          <a href={MCP_CLIENTS_SOURCE.readmeUrl} rel="noreferrer" target="_blank">
            View raw README
          </a>
        </aside>
      </section>

      <div className="app-index-metrics" aria-label="Awesome MCP clients counts">
        <div>
          <strong>{formatNumber(githubCount)}</strong>
          <span>with GitHub links</span>
        </div>
        <div>
          <strong>{formatNumber(desktopCount)}</strong>
          <span>desktop-capable</span>
        </div>
        <div>
          <strong>{formatNumber(webCount)}</strong>
          <span>web clients</span>
        </div>
      </div>

      <section className="catalog-shell compact-shell" aria-labelledby="mcp-client-types-title">
        <div className="section-head compact">
          <p className="eyebrow">Client types</p>
          <h2 id="mcp-client-types-title">Start from the surface where users already work</h2>
          <p className="section-copy">
            The source list spans desktop apps, web apps, CLIs, IDEs, browser extensions, bots, and agent frameworks.
          </p>
        </div>
        <div className="directory-card-grid">
          {typeSummaries.map((item) => (
            <div className="directory-card" key={item.type}>
              <span>{formatNumber(item.count)} clients</span>
              <strong>{item.type}</strong>
              <p>Compare platform coverage, license, pricing, and language stack before adopting this client type.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="category-guide" aria-labelledby="mcp-client-platforms-title">
        <div className="category-guide-copy">
          <p className="eyebrow">Platform coverage</p>
          <h2 id="mcp-client-platforms-title">Desktop, web, and automation clients in one list</h2>
          <p>
            Use the client detail pages to see repository links, source-list anchors, install commands when available,
            screenshots, and the platforms each client claims to support.
          </p>
          <div className="category-related-links">
            <Link href={href("/mcp-directory")} prefetch={false}>Open MCP directory</Link>
            <Link href={href("/mcp-servers")} prefetch={false}>Browse MCP servers</Link>
            <Link href={href("/awesome-mcp-apps")} prefetch={false}>Awesome MCP apps</Link>
            <Link href={href("/submit")} prefetch={false}>Submit an MCP listing</Link>
          </div>
        </div>
        <div className="category-checklist">
          <p className="eyebrow">Quick signals</p>
          <ul>
            <li>{formatNumber(cliCount)} CLI or terminal-oriented clients.</li>
            <li>{formatNumber(screenshotCount)} entries include screenshots.</li>
            <li>{platformSummaries.slice(0, 3).map((platform) => `${platform.platform} (${platform.count})`).join(", ")} lead platform coverage.</li>
          </ul>
        </div>
      </section>

      <section className="catalog-shell compact-shell" id="clients" aria-labelledby="mcp-clients-list-title">
        <div className="section-head compact">
          <p className="eyebrow">All clients</p>
          <h2 id="mcp-clients-list-title">{formatNumber(totalClients)} awesome MCP clients</h2>
          <p className="section-copy">
            Entries are kept in the upstream awesome-list order so the page stays close to the source repository.
          </p>
        </div>
        <div className="app-grid">
          {clients.map((client) => (
            <ClientRow client={client} href={href(`/mcp-clients/${client.id}`)} key={client.id} />
          ))}
        </div>
      </section>

      <section className="article-faq category-faq" id="faq">
        <div className="section-head compact">
          <p className="eyebrow">FAQ</p>
          <h2>MCP clients FAQ</h2>
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
            name: "Awesome MCP Clients",
            url: absoluteUrl(href("/mcp-clients")),
            dateModified: MCP_CLIENTS_UPDATED_AT,
            mainEntity: {
              "@type": "ItemList",
              name: "Awesome MCP clients",
              numberOfItems: totalClients,
            },
            isBasedOn: MCP_CLIENTS_SOURCE.repoUrl,
          },
          breadcrumbJsonLd([
            { name: "MCP App Store", path: "/" },
            { name: "MCP clients", path: "/mcp-clients" },
          ]),
          itemListJsonLd(
            clients.map((client) => ({ name: client.name, path: `/mcp-clients/${client.id}` })),
            "Awesome MCP clients",
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
