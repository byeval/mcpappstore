import { buildLlmsFullTxt } from "@/lib/llms";

export async function GET() {
  return new Response(await buildLlmsFullTxt(), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
