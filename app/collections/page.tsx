import type { Metadata } from "next";
import Link from "next/link";

import { listCollectionApps } from "@/lib/collections";
import { localizedAppCollections } from "@/lib/content-i18n";
import { listPublishedApps } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { messages: t } = await getI18n();

  return pageMetadata({
    title: t.collectionsPage.title,
    description: t.collectionsPage.copy,
    path: "/collections",
  });
}

export default async function CollectionsPage() {
  const [{ locale, messages: t }, apps] = await Promise.all([getI18n(), listPublishedApps()]);
  const href = (path: string) => localizedPath(path, locale);
  const collections = localizedAppCollections(locale);
  const collectionCards = collections.map((collection) => ({
    collection,
    count: listCollectionApps(collection, apps).length,
  }));

  return (
    <div className="page-stack">
      <section className="collection-hero">
        <div>
          <p className="eyebrow">{t.collectionsPage.eyebrow}</p>
          <h1>{t.collectionsPage.title}</h1>
          <p>{t.collectionsPage.copy}</p>
        </div>
        <div className="collection-hero-panel">
          <strong>{apps.length}</strong>
          <span>{t.collectionsPage.count}</span>
        </div>
      </section>

      <section className="collection-card-grid" aria-label={t.collectionsPage.gridAria}>
        {collectionCards.map(({ collection, count }) => (
          <Link className="collection-card" href={href(`/collections/${collection.slug}`)} key={collection.slug}>
            <span className="learn-card-type">{collection.eyebrow}</span>
            <h2>{collection.title}</h2>
            <p>{collection.summary}</p>
            <span className="collection-card-count">{formatMessage(t.collectionsPage.matchingListings, { count })}</span>
          </Link>
        ))}
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(
            collections.map((collection) => ({
              name: collection.title,
              path: `/collections/${collection.slug}`,
            })),
            t.collectionsPage.title,
          ),
        )}
        type="application/ld+json"
      />
    </div>
  );
}
