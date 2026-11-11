import { localizedGetAppCollection } from "@/lib/content-i18n";
import { getI18n } from "@/lib/i18n-server";
import { listCollectionApps } from "@/lib/collections";
import { listPublishedApps } from "@/lib/data";
import { serializeCollectionMarkdown } from "@/lib/llms";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ slug: string }>;
  },
) {
  const { slug } = await context.params;
  const { locale } = await getI18n();
  const collection = localizedGetAppCollection(slug,locale);

  if (!collection) {
    return new Response("Not found", { status: 404 });
  }

  const apps = listCollectionApps(collection, await listPublishedApps());

  return new Response(serializeCollectionMarkdown(collection, apps, locale), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
