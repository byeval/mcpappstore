import { getEnvValue } from "@/lib/cloudflare";
import { markRevalidated } from "@/lib/data";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-revalidate-token");
  const expected = await getEnvValue("REVALIDATE_TOKEN");

  if (expected && token !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const paths = url.searchParams.getAll("path");
  await markRevalidated(paths);

  return Response.json({ ok: true, paths });
}
