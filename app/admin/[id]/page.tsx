import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAppById } from "@/lib/data";

export const metadata: Metadata = {
  title: "Review submission | MCP App Store",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getAppById(id);

  if (!app) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">Review</p>
          <h1>{app.name}</h1>
          <p className="section-copy">{app.tagline}</p>
        </div>
        <div className="detail-columns">
          <article className="panel">
            <h2>Description</h2>
            <p>{app.description}</p>
            <h3>Metadata</h3>
            <ul className="tool-list">
              <li>
                <strong>Publisher</strong>
                <span>{app.publisher}</span>
              </li>
              <li>
                <strong>Transport</strong>
                <span>{app.mcpTransport}</span>
              </li>
              <li>
                <strong>Capabilities</strong>
                <span>{app.capabilities.join(", ")}</span>
              </li>
            </ul>
          </article>
          <article className="panel">
            <form action={`/admin/${app.id}/review`} className="submit-form" method="post">
              <label>
                <span>Review notes</span>
                <textarea defaultValue={app.reviewNotes ?? ""} name="notes" rows={6} />
              </label>
              <div className="hero-actions">
                <button className="primary-link" name="decision" type="submit" value="approve">
                  Approve
                </button>
                <button className="secondary-link" name="decision" type="submit" value="reject">
                  Reject
                </button>
                <button className="secondary-link" name="decision" type="submit" value="hide">
                  Hide
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </div>
  );
}
