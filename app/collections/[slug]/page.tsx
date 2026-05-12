import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppCard } from "@/components/app-card";
import {
  COLLECTION_APP_LIMIT,
  appCollections,
  getAppCollection,
  listCollectionApps,
} from "@/lib/collections";
import { localizedCategoryName, localizedGetAppCollection } from "@/lib/content-i18n";
import { listPublishedApps } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return appCollections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ locale }, { slug }] = await Promise.all([getI18n(), params]);
  const collection = locale === "en" ? getAppCollection(slug) : localizedGetAppCollection(slug, locale);
  if (!collection) {
    return {};
  }

  return pageMetadata({
    title: collection.title,
    description: collection.description,
    path: `/collections/${collection.slug}`,
  });
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ locale, messages: t }, { slug }] = await Promise.all([getI18n(), params]);
  const href = (path: string) => localizedPath(path, locale);
  const collection = localizedGetAppCollection(slug, locale);

  if (!collection) {
    notFound();
  }

  const allApps = await listPublishedApps();
  const matchingApps = listCollectionApps(collection, allApps);
  const visibleApps = matchingApps.slice(0, COLLECTION_APP_LIMIT);

  return (
    <div className="page-stack">
      <nav className="crumbs">
        <Link href={href("/")}>{t.common.apps}</Link>
        <svg fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <Link href={href("/collections")}>{t.collectionDetail.crumbsCollections}</Link>
        <svg fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <span>{collection.title}</span>
      </nav>

      <section className="collection-detail-hero">
        <div>
          <p className="eyebrow">{collection.eyebrow}</p>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
          <div className="collection-hero-actions">
            <div className="collection-hero-meta" aria-label={t.collectionDetail.summaryAria}>
              <span>{formatMessage(t.collectionDetail.matchingListings, { count: matchingApps.length })}</span>
              <span>{formatMessage(t.common.updated, { date: collection.updatedAt })}</span>
            </div>
            <div className="learn-actions">
              <Link className="primary-link" href={href(`/category/${collection.primaryCategorySlug}`)}>
                {t.collectionDetail.browseSourceCategory}
              </Link>
              <Link className="secondary-link" href={href("/submit")}>
                {t.common.submitYourMcp}
              </Link>
            </div>
          </div>
        </div>
        <aside className="collection-filter-card" aria-label={t.collectionDetail.filtersAria}>
          <p className="eyebrow">{t.collectionDetail.matchedBy}</p>
          <div className="collection-chip-list">
            {collection.platform ? <span>{collection.platform === "claude" ? "Claude" : "ChatGPT"}</span> : null}
            {collection.categorySlugs.slice(0, 8).map((categorySlug) => (
              <span key={categorySlug}>{localizedCategoryName(categorySlug, categorySlug.replace(/-/g, " "), locale)}</span>
            ))}
          </div>
        </aside>
      </section>

      <section className="collection-layout">
        <aside className="collection-sidebar">
          <div>
            <p className="eyebrow">{t.collectionDetail.howToChoose}</p>
            <ul>
              {collection.checkpoints.map((checkpoint) => (
                <li key={checkpoint}>{checkpoint}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">{t.collectionDetail.related}</p>
            <div className="article-link-list">
              {collection.relatedLinks.map((link) =>
                link.href.startsWith("http") ? (
                  <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
                    {link.label}
                  </a>
                ) : (
                  <Link href={href(link.href)} key={link.href}>
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        </aside>

        <div className="collection-main">
          <section className="collection-apps-section">
            <div className="collection-apps-head">
              <div>
                <p className="eyebrow">{t.collectionDetail.directoryMatches}</p>
                <h2>{t.collectionDetail.appsInCollection}</h2>
              </div>
              {matchingApps.length > visibleApps.length ? (
                <span>
                  {formatMessage(t.collectionDetail.showing, { visible: visibleApps.length, total: matchingApps.length })}
                </span>
              ) : null}
            </div>
            {visibleApps.length > 0 ? (
              <div className="app-grid">
                {visibleApps.map((app) => (
                  <AppCard
                    app={app}
                    contextCategorySlug={collection.primaryCategorySlug}
                    key={app.id}
                    locale={locale}
                    messages={t}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-collection">
                <h2>{t.collectionDetail.emptyTitle}</h2>
                <p>{t.collectionDetail.emptyCopy}</p>
                <Link className="primary-link" href={href("/submit")}>
                  {t.common.submitYourMcp}
                </Link>
              </div>
            )}
          </section>

          <section className="article-faq" id="faq">
            <div className="section-head compact">
              <p className="eyebrow">{t.common.faq}</p>
              <h2>{t.collectionDetail.faqTitle}</h2>
            </div>
            <div className="faq-list">
              {collection.faqs.map((item) => (
                <details className="faq-item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript([
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: t.collectionDetail.crumbsCollections, path: "/collections" },
            { name: collection.title, path: `/collections/${collection.slug}` },
          ]),
          itemListJsonLd(
            visibleApps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            collection.title,
          ),
          faqJsonLd(collection.faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
