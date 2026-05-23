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
import { formatMessage } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { staticPageCopy } from "@/lib/static-page-i18n";
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

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const copy = staticPageCopy(locale).mcpClients;
  const totalClients = listMcpClients().length;

  return pageMetadata({
    title: formatMessage(copy.metaTitle, { count: formatNumber(totalClients) }),
    description: copy.pageDescription,
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
  const pageCopy = staticPageCopy(locale);
  const copy = pageCopy.mcpClients;
  const commonCopy = pageCopy.common;
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
  const faqs = copy.faqs;

  return (
    <div className="page-stack">
      <section className="collection-hero awesome-hero mcp-clients-hero">
        <div className="mcp-clients-hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <div className="collection-hero-meta mcp-clients-hero-meta" aria-label={copy.metadataAria}>
            <span>{formatMessage(commonCopy.clientsCount, { count: formatNumber(totalClients) })}</span>
            <span>{formatMessage(copy.updated, { date: lastUpdatedDate })}</span>
          </div>
        </div>
        <aside className="collection-hero-panel awesome-hero-panel">
          <span>{copy.importedSource}</span>
          <strong>{formatNumber(totalClients)}</strong>
          <span>{copy.importedSummary}</span>
        </aside>
      </section>

      <div className="app-index-metrics" aria-label={copy.metricsAria}>
        <div>
          <strong>{formatNumber(githubCount)}</strong>
          <span>{copy.withGithub}</span>
        </div>
        <div>
          <strong>{formatNumber(desktopCount)}</strong>
          <span>{copy.desktopCapable}</span>
        </div>
        <div>
          <strong>{formatNumber(webCount)}</strong>
          <span>{copy.webClients}</span>
        </div>
      </div>

      <section className="catalog-shell compact-shell" aria-labelledby="mcp-client-types-title">
        <div className="section-head compact">
          <p className="eyebrow">{copy.typesEyebrow}</p>
          <h2 id="mcp-client-types-title">{copy.typesTitle}</h2>
          <p className="section-copy">{copy.typesBody}</p>
        </div>
        <div className="directory-card-grid">
          {typeSummaries.map((item) => (
            <div className="directory-card" key={item.type}>
              <span>{formatMessage(commonCopy.clientsCount, { count: formatNumber(item.count) })}</span>
              <strong>{item.type}</strong>
              <p>{copy.typeCardBody}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="category-guide" aria-labelledby="mcp-client-platforms-title">
        <div className="category-guide-copy">
          <p className="eyebrow">{copy.platformEyebrow}</p>
          <h2 id="mcp-client-platforms-title">{copy.platformTitle}</h2>
          <p>{copy.platformBody}</p>
          <div className="category-related-links">
            <Link href={href("/mcp-directory")} prefetch={false}>{copy.relatedDirectory}</Link>
            <Link href={href("/mcp-servers")} prefetch={false}>{copy.relatedServers}</Link>
            <Link href={href("/awesome-mcp-apps")} prefetch={false}>{copy.relatedAwesomeApps}</Link>
            <Link href={href("/submit")} prefetch={false}>{copy.relatedSubmit}</Link>
          </div>
        </div>
        <div className="category-checklist">
          <p className="eyebrow">{copy.signalsEyebrow}</p>
          <ul>
            <li>{formatMessage(copy.cliSignal, { count: formatNumber(cliCount) })}</li>
            <li>{formatMessage(copy.screenshotSignal, { count: formatNumber(screenshotCount) })}</li>
            <li>{formatMessage(copy.platformSignal, { items: platformSummaries.slice(0, 3).map((platform) => `${platform.platform} (${platform.count})`).join(", ") })}</li>
          </ul>
        </div>
      </section>

      <section className="catalog-shell compact-shell" id="clients" aria-labelledby="mcp-clients-list-title">
        <div className="section-head compact">
          <p className="eyebrow">{copy.allClientsEyebrow}</p>
          <h2 id="mcp-clients-list-title">{formatMessage(copy.allClientsTitle, { count: formatNumber(totalClients) })}</h2>
          <p className="section-copy">{copy.allClientsBody}</p>
        </div>
        <div className="app-grid">
          {clients.map((client) => (
            <ClientRow client={client} href={href(`/mcp-clients/${client.id}`)} key={client.id} />
          ))}
        </div>
      </section>

      <section className="article-faq category-faq" id="faq">
        <div className="section-head compact">
          <p className="eyebrow">{commonCopy.faq}</p>
          <h2>{copy.faqTitle}</h2>
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
            name: copy.eyebrow,
            url: absoluteUrl(href("/mcp-clients")),
            dateModified: MCP_CLIENTS_UPDATED_AT,
            mainEntity: {
              "@type": "ItemList",
              name: copy.collectionName,
              numberOfItems: totalClients,
            },
            isBasedOn: MCP_CLIENTS_SOURCE.repoUrl,
          },
          breadcrumbJsonLd([
            { name: "MCP App Store", path: "/" },
            { name: commonCopy.mcpClients, path: "/mcp-clients" },
          ]),
          itemListJsonLd(
            clients.map((client) => ({ name: client.name, path: `/mcp-clients/${client.id}` })),
            copy.collectionName,
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
