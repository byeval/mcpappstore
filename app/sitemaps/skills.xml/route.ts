import { legacyCatalogSitemapXml, sitemapXmlResponse } from "@/lib/sitemap";

export async function GET() {
  return sitemapXmlResponse(await legacyCatalogSitemapXml("skills"));
}
