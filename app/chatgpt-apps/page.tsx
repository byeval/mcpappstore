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
    title: `${t.platformPages.chatgptTitle} - MCP${pageSuffix}`,
    description: t.platformPages.chatgptGuideBody1,
    path: paginatedPath("/chatgpt-apps", page),
    locale,
  });
}

export default async function ChatgptAppsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale, messages: t }, { page: pageParam }] = await Promise.all([getI18n(), searchParams]);
  const href = (path: string) => localizedPath(path, locale);
  const page = pageFromSearchParam(pageParam);
  const offset = offsetForPage(page, PLATFORM_APP_PAGE_SIZE);
  const chatgptAppsFaqs = [
    {
      question: t.platformPages.chatgptFaqQuestion1,
      answer: t.platformPages.chatgptFaqAnswer1,
    },
    {
      question: t.platformPages.chatgptFaqQuestion2,
      answer: t.platformPages.chatgptFaqAnswer2,
    },
  ];
  const [apps, totalCount, latestTimestamp] = await Promise.all([
    listAppsByPlatformPage("chatgpt", { limit: PLATFORM_APP_PAGE_SIZE, offset }),
    countAppsByPlatform("chatgpt"),
    latestPlatformAppTimestamp("chatgpt"),
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
          <h1>{t.platformPages.chatgptTitle}</h1>
          <p className="section-copy">{formatMessage(t.platformPages.chatgptCopy, { count: totalCount })}</p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>
        <section className="category-guide" aria-labelledby="chatgpt-apps-guide">
          <div className="category-guide-copy">
            <p className="eyebrow">{t.platformPages.chatgptGuideEyebrow}</p>
            <h2 id="chatgpt-apps-guide">{t.platformPages.chatgptGuideTitle}</h2>
            <p>{t.platformPages.chatgptGuideBody1}</p>
            <p>{t.platformPages.chatgptGuideBody2}</p>
            <div className="category-related-links">
              <Link href={href("/learn/what-is-an-mcp-app")} prefetch={false}>{t.platformPages.chatgptRelatedWhatIs}</Link>
              <Link href={href("/learn/chatgpt-apps-vs-claude-connectors")} prefetch={false}>{t.platformPages.chatgptRelatedComparison}</Link>
              <Link href={href("/collections/chatgpt-apps-for-productivity")} prefetch={false}>{t.platformPages.chatgptRelatedProductivity}</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">{t.platformPages.compareFirst}</p>
            <ul>
              <li>{t.platformPages.chatgptChecklist1}</li>
              <li>{t.platformPages.chatgptChecklist2}</li>
              <li>{t.platformPages.chatgptChecklist3}</li>
            </ul>
          </div>
        </section>
        <PaginatedAppGrid
          apps={apps}
          basePath="/chatgpt-apps"
          locale={locale}
          messages={t}
          page={page}
          pageSize={PLATFORM_APP_PAGE_SIZE}
          totalCount={totalCount}
        />
        <section className="article-faq category-faq" id="faq">
          <div className="section-head compact">
            <p className="eyebrow">{t.platformPages.faqEyebrow}</p>
            <h2>{t.platformPages.chatgptFaqTitle}</h2>
          </div>
          <div className="faq-list">
            {chatgptAppsFaqs.map((item) => (
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
            name: t.platformPages.chatgptTitle,
            url: absoluteUrl(href(paginatedPath("/chatgpt-apps", page))),
            dateModified: lastUpdatedIso,
            mainEntity: {
              "@type": "ItemList",
              name: t.platformPages.chatgptTitle,
              numberOfItems: totalCount,
            },
          },
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: t.platformPages.chatgptTitle, path: "/chatgpt-apps" },
          ]),
          itemListJsonLd(
            apps.slice(0, 50).map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            t.platformPages.chatgptTitle,
            offset + 1,
          ),
          faqJsonLd(chatgptAppsFaqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
