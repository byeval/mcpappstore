import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaginatedAppGrid } from "@/components/app-pagination";
import {
  PLATFORM_APP_PAGE_SIZE,
  countAppsByPlatform,
  latestPlatformAppTimestamp,
  listAppsByPlatformPage,
} from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { offsetForPage, pageFromSearchParam, paginatedPath } from "@/lib/pagination";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const [{ locale, messages: t }, { page: pageParam }] = await Promise.all([getI18n(), searchParams]);
  const page = pageFromSearchParam(pageParam);
  const pageSuffix = page > 1 ? (locale === "zh-hans" ? ` - 第 ${page} 页` : ` - Page ${page}`) : "";

  return pageMetadata({
    title: `${t.platformPages.claudeTitle} - MCP${pageSuffix}`,
    description: t.platformPages.claudeGuideBody1,
    path: paginatedPath("/claude-connectors", page),
    locale,
  });
}

export default async function ClaudeConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale, messages: t }, { page: pageParam }] = await Promise.all([getI18n(), searchParams]);
  const href = (path: string) => localizedPath(path, locale);
  const page = pageFromSearchParam(pageParam);
  const offset = offsetForPage(page, PLATFORM_APP_PAGE_SIZE);
  const claudeConnectorFaqs = [
    {
      question: t.platformPages.claudeFaqQuestion1,
      answer: t.platformPages.claudeFaqAnswer1,
    },
    {
      question: t.platformPages.claudeFaqQuestion2,
      answer: t.platformPages.claudeFaqAnswer2,
    },
  ];
  const [apps, totalCount, latestTimestamp] = await Promise.all([
    listAppsByPlatformPage("claude", { limit: PLATFORM_APP_PAGE_SIZE, offset }),
    countAppsByPlatform("claude"),
    latestPlatformAppTimestamp("claude"),
  ]);
  const lastUpdatedIso = new Date(latestTimestamp || Date.now()).toISOString();
  const lastUpdatedDate = lastUpdatedIso.slice(0, 10);

  if (page > 1 && apps.length === 0) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.platformPages.eyebrow}</p>
          <h1>{t.platformPages.claudeTitle}</h1>
          <p className="section-copy">{formatMessage(t.platformPages.claudeCopy, { count: totalCount })}</p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>
        <section className="category-guide" aria-labelledby="claude-connectors-guide">
          <div className="category-guide-copy">
            <p className="eyebrow">{t.platformPages.claudeGuideEyebrow}</p>
            <h2 id="claude-connectors-guide">{t.platformPages.claudeGuideTitle}</h2>
            <p>{t.platformPages.claudeGuideBody1}</p>
            <p>{t.platformPages.claudeGuideBody2}</p>
            <div className="category-related-links">
              <Link href={href("/learn/chatgpt-apps-vs-claude-connectors")} prefetch={false}>{t.platformPages.claudeRelatedComparison}</Link>
              <Link href={href("/learn/claude-connectors-for-databases")} prefetch={false}>{t.platformPages.claudeRelatedDatabases}</Link>
              <Link href={href("/learn/best-claude-connectors-for-productivity")} prefetch={false}>{t.platformPages.claudeRelatedProductivity}</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">{t.platformPages.compareFirst}</p>
            <ul>
              <li>{t.platformPages.claudeChecklist1}</li>
              <li>{t.platformPages.claudeChecklist2}</li>
              <li>{t.platformPages.claudeChecklist3}</li>
            </ul>
          </div>
        </section>
        <PaginatedAppGrid
          apps={apps}
          basePath="/claude-connectors"
          locale={locale}
          messages={t}
          page={page}
          pageSize={PLATFORM_APP_PAGE_SIZE}
          totalCount={totalCount}
        />
        <section className="article-faq category-faq" id="faq">
          <div className="section-head compact">
            <p className="eyebrow">{t.platformPages.faqEyebrow}</p>
            <h2>{t.platformPages.claudeFaqTitle}</h2>
          </div>
          <div className="faq-list">
            {claudeConnectorFaqs.map((item) => (
              <details className="faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t.platformPages.claudeTitle,
            url: absoluteUrl(href(paginatedPath("/claude-connectors", page))),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: t.platformPages.claudeTitle,
              numberOfItems: totalCount,
            },
          },
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: t.platformPages.claudeTitle, path: "/claude-connectors" },
          ]),
          itemListJsonLd(
            apps.slice(0, 50).map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            t.platformPages.claudeTitle,
            offset + 1,
          ),
          faqJsonLd(claudeConnectorFaqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
