import type { Metadata } from "next";

import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "Privacy details for MCP App Store submissions, publisher metadata, optional submitter emails, rate limiting, and moderation data.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  const { messages: t } = await getI18n();

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <article className="panel prose-grid">
          <div className="section-head compact">
            <p className="eyebrow">{t.privacy.eyebrow}</p>
            <h1>{t.privacy.title}</h1>
          </div>
          <p>{t.privacy.body1}</p>
          <p>{t.privacy.body2}</p>
        </article>
      </section>
    </div>
  );
}
