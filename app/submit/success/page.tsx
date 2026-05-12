import type { Metadata } from "next";

import { formatMessage } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Submission received",
  description: "Confirmation that an MCP app or connector submission was received for moderation.",
  path: "/submit/success",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function SubmitSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [{ id }, { messages: t }] = await Promise.all([searchParams, getI18n()]);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="panel success-panel">
          <p className="eyebrow">{t.submitSuccess.eyebrow}</p>
          <h1>{t.submitSuccess.title}</h1>
          <p>
            {id
              ? formatMessage(t.submitSuccess.withId, { id })
              : t.submitSuccess.withoutId}
          </p>
        </div>
      </section>
    </div>
  );
}
