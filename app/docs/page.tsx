import type { Metadata } from "next";
import Link from "next/link";

import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();

  return pageMetadata({
    title: "MCP app listing guidance",
    description:
      "Submission guidance for MCP apps and connectors, including platform surfaces, metadata, previews, and review expectations.",
    path: "/docs",
    locale,
  });
}

export default async function DocsPage() {
  const { locale, messages: t } = await getI18n();
  const href = (path: string) => localizedPath(path, locale);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.docs.eyebrow}</p>
          <h1>{t.docs.title}</h1>
          <p className="section-copy">{t.docs.copy}</p>
        </div>
        <div className="info-table docs-table">
          <div className="info-row">
            <div className="info-key">{t.docs.surfacesKey}</div>
            <div className="info-val">{t.docs.surfacesValue}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.docs.basicsKey}</div>
            <div className="info-val">{t.docs.basicsValue}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.docs.previewsKey}</div>
            <div className="info-val">{t.docs.previewsValue}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.docs.mcpDetailsKey}</div>
            <div className="info-val">{t.docs.mcpDetailsValue}</div>
          </div>
          <div className="info-row">
            <div className="info-key">{t.docs.reviewKey}</div>
            <div className="info-val">{t.docs.reviewValue}</div>
          </div>
        </div>
        <div className="learn-actions">
          <Link className="primary-link" href={href("/learn/build-your-first-mcp-app")}>
            {t.common.buildFirstApp}
          </Link>
          <Link className="secondary-link" href={href("/faq")}>
            {t.common.readFaq}
          </Link>
        </div>
      </section>
    </div>
  );
}
