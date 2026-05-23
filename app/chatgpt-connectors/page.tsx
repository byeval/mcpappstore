import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, latestPlatformAppTimestamp } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { staticPageCopy } from "@/lib/static-page-i18n";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, chatgptCount] = await Promise.all([getI18n(), countAppsByPlatform("chatgpt")]);
  const copy = staticPageCopy(locale).chatgptConnectors;
  const listingText = chatgptCount.toLocaleString("en-US");

  return pageMetadata({
    title: formatMessage(copy.metaTitle, { count: listingText }),
    description: formatMessage(copy.metaDescription, { count: listingText }),
    path: "/chatgpt-connectors",
    locale,
    keywords: [
      "ChatGPT connectors",
      "ChatGPT integrations",
      "ChatGPT apps",
      "ChatGPT connectors directory",
      "MCP apps",
      "MCP directory",
    ],
  });
}

export default async function ChatgptConnectorsPage() {
  const [{ locale, messages: t }, chatgptCount, latestTimestamp] = await Promise.all([
    getI18n(),
    countAppsByPlatform("chatgpt"),
    latestPlatformAppTimestamp("chatgpt"),
  ]);
  const pageCopy = staticPageCopy(locale);
  const copy = pageCopy.chatgptConnectors;
  const commonCopy = pageCopy.common;
  const href = (path: string) => localizedPath(path, locale);
  const lastUpdatedIso = new Date(latestTimestamp || Date.now()).toISOString();
  const lastUpdatedDate = lastUpdatedIso.slice(0, 10);
  const connectorFaqs = copy.faqs;

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="section-copy">{copy.intro}</p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>
        <section className="category-guide" aria-labelledby="chatgpt-connectors-guide">
          <div className="category-guide-copy">
            <p className="eyebrow">{copy.snapshotEyebrow}</p>
            <h2 id="chatgpt-connectors-guide">{formatMessage(copy.snapshotTitle, { count: chatgptCount.toLocaleString("en-US") })}</h2>
            <p>{copy.snapshotBody1}</p>
            <p>{copy.snapshotBody2}</p>
            <div className="category-related-links">
              <Link href={href("/chatgpt-apps")} prefetch={false}>{copy.browseChatgptApps}</Link>
              <Link href={href("/mcp-directory")} prefetch={false}>{copy.browseDirectory}</Link>
              <Link href={href("/claude-connectors")} prefetch={false}>{copy.compareClaude}</Link>
              <Link href={href("/learn/chatgpt-apps-vs-claude-connectors")} prefetch={false}>{copy.guidance}</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">{copy.evaluateFirst}</p>
            <ul>
              {copy.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className="article-faq category-faq" id="faq">
          <div className="section-head compact">
            <p className="eyebrow">{commonCopy.faq}</p>
            <h2>{copy.faqTitle}</h2>
          </div>
          <div className="faq-list">
            {connectorFaqs.map((item) => (
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
            "@type": "WebPage",
            name: copy.jsonLdName,
            url: absoluteUrl(href("/chatgpt-connectors")),
            dateModified: lastUpdatedIso,
            about: copy.about,
          },
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: copy.eyebrow, path: "/chatgpt-connectors" },
          ]),
          faqJsonLd(connectorFaqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
