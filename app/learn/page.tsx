import type { Metadata } from "next";
import Link from "next/link";

import {
  localizedAppCollections,
  localizedFeaturedLearnArticles,
  localizedLearnArticles,
} from "@/lib/content-i18n";
import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { itemListJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { messages: t } = await getI18n();

  return pageMetadata({
    title: t.learnPage.title,
    description: t.learnPage.copy,
    path: "/learn",
  });
}

export default async function LearnPage() {
  const { locale, messages: t } = await getI18n();
  const href = (path: string) => localizedPath(path, locale);
  const trackLabels = {
    guide: t.learnPage.trackGuide,
    tutorial: t.learnPage.trackTutorial,
    faq: t.learnPage.trackFaq,
    "use-case": t.learnPage.trackUseCase,
  } as const;
  const articles = localizedLearnArticles(locale);
  const collections = localizedAppCollections(locale);
  const featured = localizedFeaturedLearnArticles(locale);
  const [leadArticle, ...restFeatured] = featured;

  return (
    <div className="page-stack">
      <section className="learn-hero">
        <div className="learn-hero-copy">
          <p className="eyebrow">{t.learnPage.eyebrow}</p>
          <h1>{t.learnPage.title}</h1>
          <p>{t.learnPage.copy}</p>
          <div className="learn-actions">
            <Link className="primary-link" href={href("/learn/build-your-first-mcp-app")}>
              {t.common.buildFirstApp}
            </Link>
            <Link className="secondary-link" href={href("/faq")}>
              {t.common.readFaq}
            </Link>
          </div>
        </div>
        <div className="learn-hero-index" aria-label={t.learnPage.tracksAria}>
          <span>{t.learnPage.track1}</span>
          <span>{t.learnPage.track2}</span>
          <span>{t.learnPage.track3}</span>
          <span>{t.learnPage.track4}</span>
        </div>
      </section>

      {leadArticle ? (
        <section className="learn-feature">
          <div>
            <p className="eyebrow">{trackLabels[leadArticle.intent]}</p>
            <h2>{leadArticle.title}</h2>
            <p>{leadArticle.summary}</p>
          </div>
          <Link className="primary-link" href={href(`/learn/${leadArticle.slug}`)}>
            {t.learnPage.startHere}
          </Link>
        </section>
      ) : null}

      <section className="learn-section">
        <div className="section-head">
          <p className="eyebrow">{t.learnPage.guidesEyebrow}</p>
          <h2>{t.learnPage.guidesTitle}</h2>
          <p className="section-copy">{t.learnPage.guidesCopy}</p>
        </div>
        <div className="learn-card-grid">
          {restFeatured.map((article) => (
            <Link className="learn-card" href={href(`/learn/${article.slug}`)} key={article.slug}>
              <span className="learn-card-type">{trackLabels[article.intent]}</span>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <span className="learn-card-meta">{article.readingTime}</span>
            </Link>
          ))}
          <Link className="learn-card" href={href("/faq")}>
            <span className="learn-card-type">{t.common.faq}</span>
            <h3>{t.learnPage.faqCardTitle}</h3>
            <p>{t.learnPage.faqCardCopy}</p>
            <span className="learn-card-meta">{t.learnPage.minRead}</span>
          </Link>
        </div>
      </section>

      <section className="learn-section">
        <div className="section-head">
          <p className="eyebrow">{t.learnPage.collectionsEyebrow}</p>
          <h2>{t.learnPage.collectionsTitle}</h2>
          <p className="section-copy">{t.learnPage.collectionsCopy}</p>
        </div>
        <div className="learn-topic-grid">
          {collections.slice(0, 8).map((collection) => (
            <Link className="learn-topic" href={href(`/collections/${collection.slug}`)} key={collection.slug}>
              <strong>{collection.title}</strong>
              <span>{collection.summary}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="learn-section">
        <div className="section-head">
          <p className="eyebrow">{t.learnPage.topicsEyebrow}</p>
          <h2>{t.learnPage.topicsTitle}</h2>
        </div>
        <div className="learn-topic-grid">
          {articles
            .filter((article) => article.intent === "use-case")
            .map((article) => (
              <Link className="learn-topic" href={href(`/learn/${article.slug}`)} key={article.slug}>
                <strong>{article.title}</strong>
                <span>{article.description}</span>
              </Link>
            ))}
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(
            [
              ...articles.map((article) => ({
                name: article.title,
                path: `/learn/${article.slug}`,
              })),
              { name: t.learnPage.faqCardTitle, path: "/faq" },
              ...collections.map((collection) => ({
                name: collection.title,
                path: `/collections/${collection.slug}`,
              })),
            ],
            t.learnPage.title,
          ),
        )}
        type="application/ld+json"
      />
    </div>
  );
}
