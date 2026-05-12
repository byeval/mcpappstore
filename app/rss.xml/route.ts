import { listHomeApps } from "@/lib/data";
import { absoluteUrl } from "@/lib/utils";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const apps = await listHomeApps();
  const latest = apps.slice(0, 20);
  const feedUrl = absoluteUrl("/rss.xml");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MCP App Store</title>
    <link>${absoluteUrl("/")}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <description>Newly published MCP apps.</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${latest
      .map(
        (app) => `
    <item>
      <title>${escapeXml(app.name)}</title>
      <link>${absoluteUrl(`/app/${app.id}`)}</link>
      <description>${escapeXml(app.tagline)}</description>
      <pubDate>${new Date(app.publishedAt ?? app.updatedAt).toUTCString()}</pubDate>
      <guid>${absoluteUrl(`/app/${app.id}`)}</guid>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
