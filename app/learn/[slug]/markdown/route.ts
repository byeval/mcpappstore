import { getLearnArticle, learnArticles } from "@/lib/learn";
import { serializeLearnArticleMarkdown } from "@/lib/llms";

export function generateStaticParams() {
  return learnArticles.map((article) => ({ slug: article.slug }));
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ slug: string }>;
  },
) {
  const { slug } = await context.params;
  const article = getLearnArticle(slug);

  if (!article) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(serializeLearnArticleMarkdown(article), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
