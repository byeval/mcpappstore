import type { Metadata } from "next";
import Link from "next/link";

import { countAppsByPlatform, latestPlatformAppTimestamp } from "@/lib/data";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, chatgptCount] = await Promise.all([getI18n(), countAppsByPlatform("chatgpt")]);
  const listingText = chatgptCount.toLocaleString("en-US");

  return pageMetadata({
    title: `ChatGPT connectors directory: ${listingText} integrations and apps`,
    description:
      `Compare ${listingText} ChatGPT connectors and apps, with categories, tool coverage, auth patterns, and setup guidance for production workflows.`,
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
  const href = (path: string) => localizedPath(path, locale);
  const lastUpdatedIso = new Date(latestTimestamp || Date.now()).toISOString();
  const lastUpdatedDate = lastUpdatedIso.slice(0, 10);
  const connectorFaqs = [
    {
      question: "Are ChatGPT connectors different from ChatGPT apps?",
      answer:
        "In ChatGPT, connectors were renamed to apps. The integration model is the same concept: connect external tools, search or act on data, and run workflows inside chat.",
    },
    {
      question: "How should teams evaluate ChatGPT connectors for production?",
      answer:
        "Prioritize scope control (read-only vs write), auth model, update cadence, publisher transparency, and failure handling before enabling connectors in real workflows.",
    },
  ];

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">ChatGPT connectors</p>
          <h1>ChatGPT connectors are now ChatGPT apps</h1>
          <p className="section-copy">
            Compare ChatGPT integrations by workflow, permissions, and operational fit before connecting them to user-facing tasks.
          </p>
          <p className="section-copy">{formatMessage(t.common.updated, { date: lastUpdatedDate })}</p>
        </div>
        <section className="category-guide" aria-labelledby="chatgpt-connectors-guide">
          <div className="category-guide-copy">
            <p className="eyebrow">Directory snapshot</p>
            <h2 id="chatgpt-connectors-guide">{chatgptCount.toLocaleString("en-US")} ChatGPT apps and connector-style integrations</h2>
            <p>
              Use this page when people search for ChatGPT connectors. For the complete browsable listing index, use the ChatGPT apps directory.
            </p>
            <p>
              If you are comparing ChatGPT against Claude, evaluate the same workflow across both surfaces and check transport, auth, and tool parity.
            </p>
            <div className="category-related-links">
              <Link href={href("/chatgpt-apps")} prefetch={false}>Browse all ChatGPT apps</Link>
              <Link href={href("/mcp-directory")} prefetch={false}>Browse the full MCP directory</Link>
              <Link href={href("/claude-connectors")} prefetch={false}>Compare with Claude connectors</Link>
              <Link href={href("/learn/chatgpt-apps-vs-claude-connectors")} prefetch={false}>Read ChatGPT vs Claude connector guidance</Link>
            </div>
          </div>
          <div className="category-checklist">
            <p className="eyebrow">Evaluate first</p>
            <ul>
              <li>Task type: retrieval-only research vs write-capable execution.</li>
              <li>Risk controls: account scope, approval points, and error recovery.</li>
              <li>Ownership: clear publisher profile, docs, and support trail.</li>
            </ul>
          </div>
        </section>
        <section className="article-faq category-faq" id="faq">
          <div className="section-head compact">
            <p className="eyebrow">FAQ</p>
            <h2>ChatGPT connectors FAQ</h2>
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
            name: "ChatGPT connectors directory",
            url: absoluteUrl(href("/chatgpt-connectors")),
            dateModified: lastUpdatedIso,
            about: "ChatGPT connectors and apps",
          },
          breadcrumbJsonLd([
            { name: t.common.apps, path: "/" },
            { name: "ChatGPT connectors", path: "/chatgpt-connectors" },
          ]),
          faqJsonLd(connectorFaqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}
