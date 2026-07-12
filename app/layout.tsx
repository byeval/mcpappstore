import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { GoogleAnalyticsPageTracker } from "@/components/google-analytics";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getEnvValue } from "@/lib/cloudflare";
import { localeDetails, localizedPath } from "@/lib/i18n";
import { getI18n, getRequestPathname } from "@/lib/i18n-server";
import { defaultOgImagePath } from "@/lib/og-image";
import { siteNameForLocale } from "@/lib/seo";
import { siteOrigin } from "@/lib/utils";

import "./globals.css";

const defaultDescription =
  "Browse ChatGPT apps and Claude interactive connectors backed by MCP, with tools, previews, categories, and platform-specific capabilities.";
const defaultOgImage = defaultOgImagePath();

export const viewport: Viewport = {
  themeColor: "#fffdf7",
  colorScheme: "light",
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const siteName = siteNameForLocale(locale);

  return {
    metadataBase: new URL(siteOrigin()),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    applicationName: siteName,
    description: defaultDescription,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    alternates: {
      canonical: "/",
      types: {
        "application/rss+xml": "/rss.xml",
      },
    },
    appleWebApp: {
      capable: true,
      title: siteName,
      statusBarStyle: "default",
    },
    openGraph: {
      type: "website",
      siteName,
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [
        {
          url: defaultOgImage,
          alt: siteName,
        },
      ],
    },
  };
}

function delayedAnalyticsScript(token: string): string {
  const beaconConfig = JSON.stringify({ token });

  return `window.addEventListener("load",function(){window.setTimeout(function(){var script=document.createElement("script");script.defer=true;script.src="https://static.cloudflareinsights.com/beacon.min.js";script.dataset.cfBeacon=${JSON.stringify(
    beaconConfig,
  )};document.head.appendChild(script);},6000);});`;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ locale, messages: t }, analyticsToken, pathname] = await Promise.all([
    getI18n(),
    getEnvValue("CLOUDFLARE_ANALYTICS_TOKEN"),
    getRequestPathname(),
  ]);
  const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID ?? "G-17PKWX92D6";
  const localeDetail = localeDetails[locale];
  const href = (path: string) => localizedPath(path, locale);
  const currentYear = new Date().getUTCFullYear();

  return (
    <html dir={localeDetail.dir} lang={localeDetail.htmlLang}>
      <body>
        <a className="skip-link" href="#main-content">
          {t.nav.browse}
        </a>
        <div className="page-chrome">
          <header className="topnav">
            <Link className="brand" href={href("/")} prefetch={false}>
              <span className="brand-mark" />
              <span>{t.common.brand}</span>
            </Link>
            <Link className="mobile-submit" href={href("/submit")} prefetch={false}>
              {t.common.submitYourMcp}
            </Link>
            <details className="mobile-nav-menu">
              <summary>{t.nav.browse}</summary>
              <nav aria-label={t.nav.browse} className="mobile-nav-panel">
                <Link href={href("/")} prefetch={false}>{t.nav.browse}</Link>
                <Link href={href("/store")} prefetch={false}>{t.nav.apps}</Link>
                <Link href={href("/mcp-clients")} prefetch={false}>{t.nav.clients}</Link>
                <Link href={href("/mcp-inspector")} prefetch={false}>{t.nav.inspector}</Link>
                <Link href={href("/remote-mcp-servers")} prefetch={false}>Remote</Link>
                <Link href={href("/topics")} prefetch={false}>Topics</Link>
                <Link href={href("/skills")} prefetch={false}>{t.nav.skills}</Link>
                <Link href={href("/chatgpt-apps")} prefetch={false}>{t.nav.chatgpt}</Link>
                <Link href={href("/claude-connectors")} prefetch={false}>{t.nav.claude}</Link>
                <Link href={href("/learn")} prefetch={false}>{t.nav.learn}</Link>
                <Link className="mobile-nav-submit" href={href("/submit")} prefetch={false}>{t.common.submitYourMcp}</Link>
                <LanguageSwitcher locale={locale} messages={t} pathname={pathname} />
              </nav>
            </details>
            <nav className="nav-right">
              <Link className="nav-link" href={href("/")} prefetch={false}>
                {t.nav.browse}
              </Link>
              <Link className="nav-link" href={href("/store")} prefetch={false}>
                {t.nav.apps}
              </Link>
              <Link className="nav-link" href={href("/mcp-clients")} prefetch={false}>
                {t.nav.clients}
              </Link>
              <Link className="nav-link" href={href("/mcp-inspector")} prefetch={false}>
                {t.nav.inspector}
              </Link>
              <Link className="nav-link" href={href("/remote-mcp-servers")} prefetch={false}>
                Remote
              </Link>
              <Link className="nav-link" href={href("/topics")} prefetch={false}>
                Topics
              </Link>
              <Link className="nav-link" href={href("/skills")} prefetch={false}>
                {t.nav.skills}
              </Link>
              <Link className="nav-link" href={href("/chatgpt-apps")} prefetch={false}>
                {t.nav.chatgpt}
              </Link>
              <Link className="nav-link" href={href("/claude-connectors")} prefetch={false}>
                {t.nav.claude}
              </Link>
              <Link className="nav-link" href={href("/learn")} prefetch={false}>
                {t.nav.learn}
              </Link>
              <LanguageSwitcher locale={locale} messages={t} pathname={pathname} />
              <Link className="btn-primary" href={href("/submit")} prefetch={false}>
                {t.common.submitYourMcpLong}
              </Link>
            </nav>
          </header>
          <main id="main-content">{children}</main>
          <footer className="footer">
            <div className="footer-main">
              <div className="footer-brand-copy">
                <Link className="footer-brand" href={href("/")} prefetch={false}>
                  <span className="brand-mark" />
                  <span>{t.common.brand}</span>
                </Link>
                <p>{defaultDescription}</p>
              </div>
              <nav aria-label="Footer" className="footer-links">
                <div className="footer-link-group">
                  <Link className="footer-link" href={href("/store")} prefetch={false}>{t.nav.apps}</Link>
                  <Link className="footer-link" href={href("/mcp-clients")} prefetch={false}>{t.nav.clients}</Link>
                  <Link className="footer-link" href={href("/mcp-inspector")} prefetch={false}>{t.nav.inspector}</Link>
                  <Link className="footer-link" href={href("/remote-mcp-servers")} prefetch={false}>Remote MCP servers</Link>
                  <Link className="footer-link" href={href("/topics")} prefetch={false}>MCP topics</Link>
                  <Link className="footer-link" href={href("/skills")} prefetch={false}>{t.nav.skills}</Link>
                  <Link className="footer-link" href={href("/collections")} prefetch={false}>{t.common.collections}</Link>
                </div>
                <div className="footer-link-group">
                  <Link className="footer-link" href={href("/learn")} prefetch={false}>{t.nav.learn}</Link>
                  <Link className="footer-link" href={href("/docs")} prefetch={false}>{t.common.docs}</Link>
                  <Link className="footer-link" href={href("/faq")} prefetch={false}>{t.common.faq}</Link>
                  <Link className="footer-link" href={href("/terms")} prefetch={false}>{t.nav.terms}</Link>
                  <Link className="footer-link" href={href("/privacy")} prefetch={false}>{t.nav.privacy}</Link>
                  <Link className="footer-link" href="/rss.xml" prefetch={false}>{t.nav.rss}</Link>
                  <a className="footer-link" href="https://github.com/byeval/mcpappstore" rel="noreferrer" target="_blank">GitHub</a>
                </div>
              </nav>
            </div>
            <div className="footer-meta">
              <span>© {currentYear} {t.common.brand}</span>
              <Link className="footer-submit" href={href("/submit")} prefetch={false}>
                {t.common.submitYourMcpLong} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </footer>
        </div>
        <GoogleAnalyticsPageTracker measurementId={googleAnalyticsId} />
        {analyticsToken ? <script dangerouslySetInnerHTML={{ __html: delayedAnalyticsScript(analyticsToken) }} /> : null}
      </body>
    </html>
  );
}
