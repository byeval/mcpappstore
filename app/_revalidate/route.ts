import { PublicationConflictError } from "@/lib/publication-marker";
import { getEnvValue } from "@/lib/cloudflare";
import { markRevalidated } from "@/lib/data";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-revalidate-token");
  const expected = await getEnvValue("REVALIDATE_TOKEN");

  if (!expected || token !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: {"Cache-Control":"no-store"} });
  }

  const paths = url.searchParams.getAll("path");
  try { await markRevalidated(paths); } catch(error) {
    if(error instanceof PublicationConflictError)return Response.json({ok:false,error:error.message},{status:409,headers:{"Cache-Control":"no-store"}});
    throw error;
  }

  return Response.json({ ok: true, paths }, {headers:{"Cache-Control":"no-store"}});
}
