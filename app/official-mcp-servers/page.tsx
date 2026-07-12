import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedApps } from "@/lib/data";
import { appMetadataSignal, appPlatformLabel, formatDirectoryNumber as formatNumber } from "@/lib/directory-content";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

const officialSignals = ["official", "github", "google", "cloudflare", "stripe", "supabase", "atlassian", "linear", "notion", "slack"];

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return pageMetadata({
    title: "Official MCP servers and verified product connectors",
    description:
      "Browse official and first-party MCP servers, ChatGPT apps, and Claude connectors from product teams and trusted publishers.",
    path: "/official-mcp-servers",
    locale,
    keywords: ["official MCP servers", "verified MCP", "first party MCP", "official Claude connectors"],
  });
}

export default async function OfficialMcpServersPage() {
  const [{ locale }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const href = (path: string) => localizedPath(path, locale);
  const officialApps = apps
    .filter((app) => {
      const text = [app.name, app.publisher, app.tagline, app.description, app.homepageUrl, app.repoUrl, ...app.tags].join(" ").toLowerCase();
      return app.isFeatured || officialSignals.some((signal) => text.includes(signal));
    })
    .sort((left, right) => Number(right.isFeatured) - Number(left.isFeatured) || right.updatedAt - left.updatedAt);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">Official MCP servers</p>
          <h1>First-party and trusted product connectors</h1>
          <p className="section-copy">
            Start here when publisher trust matters. These listings surface official-looking signals, featured status, first-party product names, or strong publisher metadata for review.
          </p>
        </div>
        <div className="app-index-metrics" aria-label="Official MCP server metrics">
          <div><strong>{formatNumber(officialApps.length)}</strong><span>trusted-signal listings</span></div>
          <div><strong>{formatNumber(officialApps.filter((app) => app.repoUrl).length)}</strong><span>with repositories</span></div>
          <div><strong>{formatNumber(officialApps.filter((app) => app.mcpEndpoint).length)}</strong><span>with endpoints</span></div>
        </div>
        <section className="directory-content-section" aria-labelledby="official-list-title">
          <div className="directory-section-head">
            <p className="eyebrow">Review list</p>
            <h2 id="official-list-title">Verify publisher, auth, and write scope before rollout</h2>
          </div>
          <div className="directory-example-list">
            {officialApps.slice(0, 80).map((app) => (
              <Link href={href(`/app/${app.id}`)} key={app.id} prefetch={false}>
                <strong>{app.name}</strong>
                <span>{app.tagline}</span>
                <small>{appPlatformLabel(app)} · {app.publisher} · {appMetadataSignal(app)}</small>
              </Link>
            ))}
          </div>
        </section>
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(officialApps.slice(0, 100).map((app) => ({ name: app.name, path: `/app/${app.id}` })), "Official MCP servers"),
        )}
        type="application/ld+json"
      />
    </div>
  );
}
