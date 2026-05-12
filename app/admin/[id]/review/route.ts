import { NextResponse } from "next/server";

import { getReviewer } from "@/lib/auth";
import { markRevalidated, reviewSubmission } from "@/lib/data";

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

  await reviewSubmission({
    appId: id,
    decision,
    notes,
    reviewer,
  });
  await markRevalidated(["/", `/app/${id}`]);

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
