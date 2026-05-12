import { buildLearnSitemapEntries, sitemapXmlResponse, urlsetXml } from "@/lib/sitemap";

export function GET() {
  return sitemapXmlResponse(urlsetXml(buildLearnSitemapEntries()));
}
