import type { Metadata } from "next";

import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of use",
  description:
    "Terms for MCP App Store directory listings, publisher responsibilities, moderation, and linked MCP endpoints.",
  path: "/terms",
});

export default async function TermsPage() {
  const { messages: t } = await getI18n();

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <article className="panel prose-grid">
          <div className="section-head compact">
            <p className="eyebrow">{t.terms.eyebrow}</p>
            <h1>{t.terms.title}</h1>
          </div>
          <p>{t.terms.body1}</p>
          <p>{t.terms.body2}</p>
        </article>
      </section>
    </div>
  );
}
