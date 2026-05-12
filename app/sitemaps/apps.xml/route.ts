import { buildAppsSitemapEntries, sitemapXmlResponse, urlsetXml } from "@/lib/sitemap";

export async function GET() {
  return sitemapXmlResponse(urlsetXml(await buildAppsSitemapEntries()));
}
