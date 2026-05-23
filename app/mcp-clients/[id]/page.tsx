import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  MCP_CLIENTS_SOURCE,
  MCP_CLIENTS_UPDATED_AT,
  getMcpClientById,
  listMcpClients,
  relatedMcpClients,
  type McpClient,
} from "@/lib/mcp-clients";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScript, pageMetadata, truncateMeta } from "@/lib/seo";
import { absoluteUrl, initials } from "@/lib/utils";

function clientDescription(client: McpClient): string {
  return truncateMeta(
    `${client.name} MCP client. ${client.summary} Compare platform support, license, pricing, source links, and screenshots from the awesome MCP clients list.`,
  );
}

function primaryClientUrl(client: McpClient): string {
  return client.websiteUrl ?? client.githubUrl ?? client.sourceUrl;
}

function primaryClientAction(client: McpClient): string {
  if (client.websiteUrl) return "Open website";
  if (client.githubUrl) return "Open GitHub";
  return "Open source entry";
}

function displayValue(value: string | undefined): string {
  return value?.trim() || "Not listed";
}

function clientMeta(client: McpClient): string {
  return [client.type, client.platforms.slice(0, 2).join(", "), client.pricing].filter(Boolean).join(" · ");
}

function RelatedClientRow({ client, href }: { client: McpClient; href: string }) {
  return (
    <Link className="app-row" href={href} prefetch={false}>
      <div className="app-icon">
        <div className="app-icon-inner mcp-client-icon">
          <span>{initials(client.name)}</span>
        </div>
      </div>
      <div className="app-meta">
        <p className="app-name">{client.name}</p>
        <p className="app-tag">{clientMeta(client) || client.summary}</p>
      </div>
      <svg className="app-chev" fill="none" viewBox="0 0 24 24">
        <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </Link>
  );
}

export function generateStaticParams() {
  return listMcpClients().map((client) => ({ id: client.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const [{ id }, { locale }] = await Promise.all([params, getI18n()]);
  const client = getMcpClientById(id);
  if (!client) {
    return {};
  }

  return pageMetadata({
    title: `${client.name} MCP client`,
    description: clientDescription(client),
    path: `/mcp-clients/${client.id}`,
    locale,
    openGraphType: "article",
    keywords: [
      client.name,
      `${client.name} MCP`,
      `${client.name} MCP client`,
      "MCP clients",
      "Model Context Protocol clients",
    ],
  });
}

export default async function McpClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { locale }] = await Promise.all([params, getI18n()]);
  const client = getMcpClientById(id);

  if (!client) {
    notFound();
  }

  const href = (path: string) => localizedPath(path, locale);
  const relatedClients = relatedMcpClients(client, 6);
  const primaryUrl = primaryClientUrl(client);
  const sameAs = [client.websiteUrl, client.githubUrl, client.sourceUrl].filter(Boolean);
  const metadataRows = [
    { key: "Client type", value: displayValue(client.type) },
    { key: "Pricing", value: displayValue(client.pricing) },
    { key: "License", value: displayValue(client.license) },
  ];

  return (
    <div className="page-stack">
      <nav className="crumbs">
        <Link href={href("/")} prefetch={false}>Apps</Link>
        <svg fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <Link href={href("/mcp-clients")} prefetch={false}>MCP clients</Link>
        <svg fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <span>{client.name}</span>
      </nav>

      <header className="app-head">
        <div className="app-avatar detail-avatar mcp-client-detail-avatar">
          <span>{initials(client.name)}</span>
        </div>
        <div className="app-head-text">
          <h1>{client.name}</h1>
          <p>{client.summary}</p>
          <div className="collection-chip-list detail-surfaces" aria-label={`${client.name} metadata`}>
            {client.type ? <span>{client.type}</span> : null}
            {client.platforms.slice(0, 4).map((platform) => (
              <span key={platform}>{platform}</span>
            ))}
          </div>
        </div>
        <div className="app-head-cta">
          {client.githubUrl ? (
            <a className="btn-ghost" href={client.githubUrl} rel="noreferrer" target="_blank">
              GitHub
            </a>
          ) : null}
          <a className="btn-connect" href={primaryUrl} rel="noreferrer" target="_blank">
            {primaryClientAction(client)}
          </a>
        </div>
      </header>

      <section className="detail-section prose-grid">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{client.descriptionMarkdown}</ReactMarkdown>
      </section>

      <section className="detail-section" aria-labelledby="mcp-client-facts">
        <h2 className="section-title" id="mcp-client-facts">Client facts</h2>
        <div className="info-table">
          {metadataRows.map((row) => (
            <div className="info-row" key={row.key}>
              <span className="info-key">{row.key}</span>
              <span className="info-val">{row.value}</span>
            </div>
          ))}
          <div className="info-row">
            <span className="info-key">Platforms</span>
            <span className="info-val surface-list">
              {client.platforms.length > 0 ? client.platforms.map((platform) => <span key={platform}>{platform}</span>) : "Not listed"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Languages</span>
            <span className="info-val surface-list">
              {client.programmingLanguages.length > 0
                ? client.programmingLanguages.map((language) => <span key={language}>{language}</span>)
                : "Not listed"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Website</span>
            <span className="info-val">
              {client.websiteUrl ? <a href={client.websiteUrl} rel="noreferrer" target="_blank">{client.websiteUrl}</a> : "Not listed"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Repository</span>
            <span className="info-val">
              {client.githubUrl ? <a href={client.githubUrl} rel="noreferrer" target="_blank">{client.githubUrl}</a> : "Not listed"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Source entry</span>
            <span className="info-val">
              <a href={client.sourceUrl} rel="noreferrer" target="_blank">{MCP_CLIENTS_SOURCE.name}</a>
            </span>
          </div>
        </div>
      </section>

      {client.installCommands.length > 0 ? (
        <section className="detail-section prose-grid" aria-labelledby="mcp-client-install">
          <h2 className="section-title" id="mcp-client-install">Install command</h2>
          {client.installCommands.map((command) => (
            <pre key={command}>
              <code>{command}</code>
            </pre>
          ))}
        </section>
      ) : null}

      {client.screenshots.length > 0 ? (
        <section className="detail-section" aria-labelledby="mcp-client-screenshots">
          <h2 className="section-title" id="mcp-client-screenshots">Screenshots</h2>
          <div className="mcp-client-screenshot-grid">
            {client.screenshots.map((screenshot) => (
              <figure className="mcp-client-screenshot" key={screenshot.url}>
                <img alt={screenshot.alt} decoding="async" loading="lazy" src={screenshot.url} />
                <figcaption>{screenshot.alt}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="detail-section" aria-labelledby="mcp-client-adoption">
        <h2 className="section-title" id="mcp-client-adoption">Before adopting {client.name}</h2>
        <ul className="tool-list tool-table">
          <li>
            <strong>Match the working surface</strong>
            <span>Confirm that {client.name} runs where users actually work: desktop, browser, IDE, terminal, chat, or hosted web app.</span>
          </li>
          <li>
            <strong>Check server compatibility</strong>
            <span>Review how the client connects to MCP servers, how credentials are stored, and whether remote or local servers are supported.</span>
          </li>
          <li>
            <strong>Review trust and maintenance</strong>
            <span>Use the source links to inspect license, update cadence, docs, issue activity, and support channels before production use.</span>
          </li>
        </ul>
      </section>

      {relatedClients.length > 0 ? (
        <section className="detail-section" aria-labelledby="related-mcp-clients">
          <h2 className="section-title" id="related-mcp-clients">Related MCP clients</h2>
          <div className="app-grid related-app-grid">
            {relatedClients.map((related) => (
              <RelatedClientRow client={related} href={href(`/mcp-clients/${related.id}`)} key={related.id} />
            ))}
          </div>
        </section>
      ) : null}

      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: client.name,
            applicationCategory: client.type ?? "MCP client",
            operatingSystem: client.platforms.join(", ") || "Not listed",
            description: clientDescription(client),
            url: absoluteUrl(href(`/mcp-clients/${client.id}`)),
            sameAs,
            isBasedOn: client.sourceUrl,
            dateModified: MCP_CLIENTS_UPDATED_AT,
          },
          breadcrumbJsonLd([
            { name: "MCP App Store", path: "/" },
            { name: "MCP clients", path: "/mcp-clients" },
            { name: client.name, path: `/mcp-clients/${client.id}` },
          ]),
          itemListJsonLd(
            relatedClients.map((related) => ({ name: related.name, path: `/mcp-clients/${related.id}` })),
            `Related MCP clients for ${client.name}`,
          ),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
