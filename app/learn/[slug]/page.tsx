import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppCard } from "@/components/app-card";
import { localizedGetLearnArticle } from "@/lib/content-i18n";
import { getAppById } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { getLearnArticle, learnArticles } from "@/lib/learn";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return learnArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ locale }, { slug }] = await Promise.all([getI18n(), params]);
  const article = locale === "en" ? getLearnArticle(slug) : localizedGetLearnArticle(slug, locale);
  if (!article) {
    return {};
  }

  return pageMetadata({
    title: article.title,
    description: article.description,
    path: `/learn/${article.slug}`,
  });
}

export default async function LearnArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ locale, messages: t }, { slug }] = await Promise.all([getI18n(), params]);
  const href = (path: string) => localizedPath(path, locale);
  const article = localizedGetLearnArticle(slug, locale);

  if (!article) {
    notFound();
  }

  const apps = article.featuredAppIds
    ? (
        await Promise.all(article.featuredAppIds.map((appId) => getAppById(appId)))
      ).filter((app) => app !== null)
    : [];

  const jsonLd = [
    articleJsonLd({
      title: article.title,
      description: article.description,
      path: `/learn/${article.slug}`,
      dateModified: article.updatedAt,
    }),
    breadcrumbJsonLd([
      { name: t.common.apps, path: "/" },
      { name: t.common.learn, path: "/learn" },
      { name: article.title, path: `/learn/${article.slug}` },
    ]),
    ...(article.faqs ? [faqJsonLd(article.faqs)] : []),
  ];

  return (
    <div className="page-stack">
      <nav className="crumbs">
        <Link href={href("/")}>{t.common.apps}</Link>
        <svg fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <Link href={href("/learn")}>{t.common.learn}</Link>
        <svg fill="none" viewBox="0 0 24 24">
          <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <span>{article.title}</span>
      </nav>

      <article className="article-layout">
        <aside className="article-sidebar">
          <p className="eyebrow">{t.learnArticle.onThisPage}</p>
          <nav aria-label={t.learnArticle.sectionsAria}>
            {article.sections.map((section) => (
              <a href={`#${section.id}`} key={section.id}>
                {section.title}
              </a>
            ))}
            {article.faqs ? <a href="#faq">FAQ</a> : null}
          </nav>
        </aside>

        <div className="article-main">
          <header className="article-head">
            <p className="eyebrow">{article.eyebrow}</p>
            <h1>{article.title}</h1>
            <p>{article.description}</p>
            <div className="article-meta">
              <span>{article.readingTime}</span>
              <span>{formatMessage(t.common.updated, { date: article.updatedAt })}</span>
            </div>
            <div className="learn-actions">
              {article.primaryCta ? (
                <Link className="primary-link" href={href(article.primaryCta.href)}>
                  {article.primaryCta.label}
                </Link>
              ) : null}
              {article.secondaryCta ? (
                <Link className="secondary-link" href={href(article.secondaryCta.href)}>
                  {article.secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </header>

          <div className="article-body">
            {article.sections.map((section) => (
              <section className="article-section" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {section.steps ? (
                  <ol>
                    {section.steps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : null}
                {section.code ? <pre><code>{section.code}</code></pre> : null}
                {section.callout ? <p className="article-callout">{section.callout}</p> : null}
              </section>
            ))}
          </div>

          {apps.length > 0 ? (
            <section className="article-apps">
              <div className="section-head compact">
                <p className="eyebrow">{t.learnArticle.featuredListings}</p>
                <h2>{t.learnArticle.relevantApps}</h2>
              </div>
              <div className="app-grid">
                {apps.map((app) => (
                  <AppCard app={app} key={app.id} locale={locale} messages={t} />
                ))}
              </div>
            </section>
          ) : null}

          {article.faqs ? (
            <section className="article-faq" id="faq">
              <div className="section-head compact">
                <p className="eyebrow">{t.common.faq}</p>
                <h2>{t.learnArticle.shortAnswers}</h2>
              </div>
              <div className="faq-list">
                {article.faqs.map((item) => (
                  <details className="faq-item" key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <footer className="article-footer">
            <div className="article-footer-group">
              <p className="eyebrow">{t.learnArticle.related}</p>
              <div className="article-footer-links">
                {article.relatedLinks.map((link) =>
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
            <div className="article-footer-group">
              <p className="eyebrow">{t.learnArticle.sources}</p>
              <div className="article-footer-links">
                {article.sources.map((source) => (
                  <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
                    {source.label}
                  </a>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </article>

      <script dangerouslySetInnerHTML={jsonLdScript(jsonLd)} type="application/ld+json" />
    </div>
  );
}
