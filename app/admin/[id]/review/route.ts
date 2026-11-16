import { PublicationConflictError } from "@/lib/publication-marker";
import { NextResponse } from "next/server";

import { getReviewer } from "@/lib/auth";
import { reviewSubmission } from "@/lib/data";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const formData = await request.formData();
  const decision = String(formData.get("decision") ?? "reject") as "approve" | "reject" | "hide";
  const notes = String(formData.get("notes") ?? "");
  const reviewer = await getReviewer(request);

  try { await reviewSubmission({
    appId: id,
    decision,
    notes,
    reviewer,
  }); } catch(error) {
    if(error instanceof PublicationConflictError)return Response.json({error:error.message},{status:409,headers:{"Cache-Control":"no-store"}});
    throw error;
  }

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
