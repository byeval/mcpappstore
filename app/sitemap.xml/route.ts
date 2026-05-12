import { sitemapIndexXml, sitemapXmlResponse } from "@/lib/sitemap";

export function GET() {
  return sitemapXmlResponse(sitemapIndexXml());
}
