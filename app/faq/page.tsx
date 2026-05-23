import type { Metadata } from "next";
import Link from "next/link";

import { localizedSiteFaqItems } from "@/lib/content-i18n";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages: t } = await getI18n();

  return pageMetadata({
    title: t.learnPage.faqCardTitle,
    description: t.faqPage.copy,
    path: "/faq",
    locale,
  });
}

export default async function FaqPage() {
  const { locale, messages: t } = await getI18n();
  const href = (path: string) => localizedPath(path, locale);
  const faqs = localizedSiteFaqItems(locale);

  return (
    <div className="page-stack">
      <nav className="crumbs">
        <Link href={href("/")}>{t.common.apps}</Link>
        <svg fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <span>{t.common.faq}</span>
      </nav>

      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.common.faq}</p>
          <h1>{t.faqPage.title}</h1>
          <p className="section-copy">{t.faqPage.copy}</p>
        </div>
        <div className="faq-list wide">
          {faqs.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
        <div className="learn-actions">
          <Link className="primary-link" href={href("/learn/what-is-an-mcp-app")}>
            {t.common.learnMcpBasics}
          </Link>
          <Link className="secondary-link" href={href("/submit")}>
            {t.common.submitYourMcp}
          </Link>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript([
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
