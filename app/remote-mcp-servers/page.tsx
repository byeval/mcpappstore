import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedApps } from "@/lib/data";
import { appMetadataSignal, appPlatformLabel, formatDirectoryNumber as formatNumber } from "@/lib/directory-content";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return pageMetadata({
    title: "Remote MCP servers for Claude, ChatGPT, and coding agents",
    description:
      "Browse hosted and remote MCP servers with HTTP or SSE transports, auth details, install commands, and compatible ChatGPT or Claude surfaces.",
    path: "/remote-mcp-servers",
    locale,
    keywords: ["remote MCP servers", "hosted MCP", "HTTP MCP", "SSE MCP", "Claude MCP", "ChatGPT MCP"],
  });
}

function isRemoteApp(app: Awaited<ReturnType<typeof listPublishedApps>>[number]): boolean {
  const endpoint = app.mcpEndpoint?.toLowerCase() ?? "";
  return app.mcpTransport === "http" || app.mcpTransport === "sse" || endpoint.startsWith("https://");
}

export default async function RemoteMcpServersPage() {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const href = (path: string) => localizedPath(path, locale);
  const remoteApps = apps.filter(isRemoteApp);
  const featured = remoteApps
    .filter((app) => app.isFeatured || app.source === "claude_seed" || app.source === "chatgpt_seed")
    .slice(0, 18);
  const latest = [...remoteApps].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 36);
  const httpCount = remoteApps.filter((app) => app.mcpTransport === "http").length;
  const sseCount = remoteApps.filter((app) => app.mcpTransport === "sse").length;
  const oauthCount = remoteApps.filter((app) => app.authType === "oauth").length;
  const apiKeyCount = remoteApps.filter((app) => app.authType === "api_key").length;

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">Remote MCP Servers</p>
          <h1>Hosted MCP servers without local setup</h1>
          <p className="section-copy">
            Compare MCP endpoints that can be connected from Claude, ChatGPT, Cursor, Codex, and other clients without installing a local server first.
          </p>
        </div>

        <div className="app-index-metrics" aria-label="Remote MCP server metrics">
          <div>
            <strong>{formatNumber(remoteApps.length)}</strong>
            <span>remote-ready listings</span>
          </div>
          <div>
            <strong>{formatNumber(httpCount)} / {formatNumber(sseCount)}</strong>
            <span>HTTP / SSE transports</span>
          </div>
          <div>
            <strong>{formatNumber(oauthCount + apiKeyCount)}</strong>
            <span>authenticated endpoints</span>
          </div>
        </div>

        <section className="category-guide" aria-labelledby="remote-guide-title">
          <div className="category-guide-copy">
            <p className="eyebrow">Connection model</p>
            <h2 id="remote-guide-title">Use this page when install friction matters</h2>
            <p>
              Remote MCP servers are best for teams that want hosted auth, stable endpoints, and fast onboarding across multiple AI clients.
              Local stdio servers are still useful for filesystem, browser, and private-machine workflows.
            </p>
            <div className="category-related-links">
              <Link href={href("/mcp-servers")} prefetch={false}>All MCP servers</Link>
              <Link href={href("/claude-connectors")} prefetch={false}>Claude connectors</Link>
              <Link href={href("/chatgpt-apps")} prefetch={false}>ChatGPT apps</Link>
              <Link href={href("/topics")} prefetch={false}>MCP topics</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">Review before connecting</p>
            <ul>
              <li>Check whether auth is OAuth, API key, or no-auth.</li>
              <li>Confirm which tools can write, send, delete, buy, deploy, or update data.</li>
              <li>Prefer source-linked outputs for data, finance, legal, and production workflows.</li>
            </ul>
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="remote-featured-title">
          <div className="directory-section-head">
            <p className="eyebrow">Featured remote endpoints</p>
            <h2 id="remote-featured-title">Good starting points</h2>
          </div>
          <div className="directory-example-list">
            {featured.map((app) => (
              <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <strong>{app.name}</strong>
                <span>{app.tagline}</span>
                <small>{appPlatformLabel(app)} · {app.mcpTransport.toUpperCase()} · {app.authType}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-content-section" aria-labelledby="remote-latest-title">
          <div className="directory-section-head">
            <p className="eyebrow">Latest remote MCPs</p>
            <h2 id="remote-latest-title">Recently refreshed listings</h2>
          </div>
          <div className="directory-link-grid">
            {latest.map((app) => (
              <Link className="directory-link-card" href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <span>{appPlatformLabel(app) || "MCP"} · {app.mcpTransport.toUpperCase()}</span>
                <strong>{app.name}</strong>
                <p>{app.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(latest.slice(0, 100).map((app) => ({ name: app.name, path: `/app/${app.id}` })), "Remote MCP servers"),
        )}
        type="application/ld+json"
      />
    </div>
  );
}
