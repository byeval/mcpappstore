import type { Metadata } from "next";

import { SubmitForm } from "@/components/submit-form";
import { getEnvValue } from "@/lib/cloudflare";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Submit an MCP app or connector",
  description:
    "Submit an MCP app, ChatGPT app, or Claude connector for review with metadata, previews, tools, and platform details.",
  path: "/submit",
});

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, siteKey, { locale, messages: t }] = await Promise.all([
    searchParams,
    getEnvValue("TURNSTILE_SITE_KEY"),
    getI18n(),
  ]);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <SubmitForm action={localizedPath("/api/submit", locale)} error={error} locale={locale} messages={t.submitForm} siteKey={siteKey} />
      </section>
    </div>
  );
}
