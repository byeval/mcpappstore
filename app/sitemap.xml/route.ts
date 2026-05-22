import { sitemapIndexXml, sitemapXmlResponse } from "@/lib/sitemap";

export async function GET() {
  return sitemapXmlResponse(await sitemapIndexXml());
}
