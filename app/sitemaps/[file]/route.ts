import { buildAppsSitemapEntries, buildSkillsSitemapEntries, sitemapXmlResponse, urlsetXml } from "@/lib/sitemap";

function chunkFromFile(file: string, kind: "apps" | "skills"): number | undefined {
  const match = new RegExp(`^${kind}-(\\d+)\\.xml$`).exec(file);
  return match ? Number.parseInt(match[1]!, 10) : undefined;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ file: string }>;
  },
) {
  const { file } = await context.params;
  const appsChunk = chunkFromFile(file, "apps");
  if (appsChunk !== undefined) {
    const entries = await buildAppsSitemapEntries({ chunk: appsChunk });
    return entries.length > 0 ? sitemapXmlResponse(urlsetXml(entries)) : new Response("Not found", { status: 404 });
  }

  const skillsChunk = chunkFromFile(file, "skills");
  if (skillsChunk !== undefined) {
    const entries = await buildSkillsSitemapEntries({ chunk: skillsChunk });
    return entries.length > 0 ? sitemapXmlResponse(urlsetXml(entries)) : new Response("Not found", { status: 404 });
  }

  return new Response("Not found", { status: 404 });
}
