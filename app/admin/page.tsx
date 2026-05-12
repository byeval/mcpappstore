import type { Metadata } from "next";
import Link from "next/link";

import { listPendingApps } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pending submissions | MCP App Store",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminQueuePage() {
  const pendingApps = await listPendingApps();

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">Moderation</p>
          <h1>Pending submissions</h1>
          <p className="section-copy">Protected by Cloudflare Access or basic auth in middleware and backed by D1.</p>
        </div>
        <div className="queue-list">
          {pendingApps.length === 0 ? (
            <div className="panel">
              <p>No pending submissions yet. Configure D1 and start posting to `/api/submit`.</p>
            </div>
          ) : (
            pendingApps.map((app) => (
              <article className="queue-item" key={app.id}>
                <div>
                  <p className="eyebrow">{formatDate(app.createdAt)}</p>
                  <h2>{app.name}</h2>
                  <p>{app.tagline}</p>
                </div>
                <div className="queue-actions">
                  <Link className="secondary-link inline-link" href={`/admin/${app.id}`}>
                    Review
                  </Link>
                  <form action={`/admin/${app.id}/review`} method="post">
                    <input name="decision" type="hidden" value="approve" />
                    <button className="primary-link" type="submit">
                      Approve
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
