import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { PaginatedAppGrid } from "@/components/app-pagination";
import { CategoryTabs } from "@/components/category-tabs";
import { localizedCategoryContent, localizedCategoryName } from "@/lib/content-i18n";
import { CATEGORY_APP_PAGE_SIZE, getCategorySummaries, listAppsByCategoryPage } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { offsetForPage, pageFromSearchParam, paginatedPath } from "@/lib/pagination";
import { isIndexableCategory, redirectedCategoryPath } from "@/lib/seo-indexing";
import {
  breadcrumbJsonLd,
  categoryDescription,
  faqJsonLd,
  formatCategoryName,
  itemListJsonLd,
  jsonLdScript,
  pageMetadata,
} from "@/lib/seo";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const [{ locale, messages: t }, { slug }, { page: pageParam }] = await Promise.all([getI18n(), params, searchParams]);
  const page = pageFromSearchParam(pageParam);
  const categories = await getCategorySummaries();
  const category = categories.find((item) => item.slug === slug);
  if (!category) {
    return {};
  }
  const displayName = localizedCategoryName(slug, formatCategoryName(category.name), locale);
  const content = localizedCategoryContent(slug, displayName, category.count, locale);
  const pageSuffix = page > 1 ? (locale === "zh-hans" ? ` - 第 ${page} 页` : ` - Page ${page}`) : "";

  return pageMetadata({
    title: `${formatMessage(t.categoryPage.title, { category: displayName })}${pageSuffix}`,
    description: content?.metaDescription ?? categoryDescription(category, category.count),
    path: paginatedPath(`/category/${slug}`, page),
    robots: isIndexableCategory(category)
      ? undefined
      : {
          index: false,
          follow: true,
        },
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale, messages: t }, { slug }, { page: pageParam }] = await Promise.all([getI18n(), params, searchParams]);
  const href = (path: string) => localizedPath(path, locale);
  const redirectPath = redirectedCategoryPath(slug);

  if (redirectPath) {
    permanentRedirect(href(redirectPath));
  }

  const page = pageFromSearchParam(pageParam);
  const offset = offsetForPage(page, CATEGORY_APP_PAGE_SIZE);
  const [categories, apps] = await Promise.all([
    getCategorySummaries(),
    listAppsByCategoryPage(slug, { limit: CATEGORY_APP_PAGE_SIZE, offset }),
  ]);
  const category = categories.find((item) => item.slug === slug);

  if (!category || (page > 1 && apps.length === 0)) {
    notFound();
  }
  const displayName = localizedCategoryName(slug, formatCategoryName(category.name), locale);
  const content = localizedCategoryContent(slug, displayName, category.count, locale);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{t.categoryPage.eyebrow}</p>
          <h1>{formatMessage(t.categoryPage.title, { category: displayName })}</h1>
          <p className="section-copy">{formatMessage(t.categoryPage.copy, { count: category.count })}</p>
        </div>
        <CategoryTabs activeSlug={slug} categories={categories} locale={locale} messages={t} />
        {content ? (
          <section className="category-guide" aria-labelledby="category-guide-title">
            <div className="category-guide-copy">
              <p className="eyebrow">{content.eyebrow}</p>
              <h2 id="category-guide-title">{content.title}</h2>
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="category-related-links">
                {content.relatedLinks.map((link) => (
                  <Link href={href(link.href)} key={link.href} prefetch={false}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="category-checklist">
              <p className="eyebrow">{t.categoryPage.chooseEyebrow}</p>
              <ul>
                {content.checkpoints.map((checkpoint) => (
                  <li key={checkpoint}>{checkpoint}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
        <PaginatedAppGrid
          apps={apps}
          basePath={`/category/${slug}`}
          contextCategorySlug={slug}
          locale={locale}
          messages={t}
          page={page}
          pageSize={CATEGORY_APP_PAGE_SIZE}
          totalCount={category.count}
        />
        {content ? (
          <section className="article-faq category-faq" id="faq">
            <div className="section-head compact">
              <p className="eyebrow">{t.common.faq}</p>
              <h2>{formatMessage(t.categoryPage.faqTitle, { category: displayName.toLowerCase() })}</h2>
            </div>
            <div className="faq-list">
              {content.faqs.map((item) => (
                <details className="faq-item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: displayName, path: `/category/${slug}` },
          ]),
          itemListJsonLd(
            apps.slice(0, 50).map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            formatMessage(t.categoryPage.title, { category: displayName }),
            offset + 1,
          ),
          ...(content ? [faqJsonLd(content.faqs)] : []),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
