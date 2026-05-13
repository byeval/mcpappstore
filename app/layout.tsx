import type { Metadata } from "next";
import Link from "next/link";

import { GoogleAnalyticsPageTracker } from "@/components/google-analytics";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getEnvValue } from "@/lib/cloudflare";
import { localeDetails, localizedPath, supportedLocales } from "@/lib/i18n";
import { getI18n, getRequestPathname } from "@/lib/i18n-server";
import { defaultOgImagePath } from "@/lib/og-image";
import { absoluteUrl } from "@/lib/utils";

import "./globals.css";

const defaultDescription =
  "Browse ChatGPT apps and Claude interactive connectors backed by MCP, with tools, previews, categories, and platform-specific capabilities.";
const defaultOgImage = defaultOgImagePath();

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "MCP App Store",
    template: "%s | MCP App Store",
  },
  description: defaultDescription,
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
  openGraph: {
    type: "website",
    siteName: "MCP App Store",
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "MCP App Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: defaultOgImage,
        alt: "MCP App Store",
      },
    ],
  },
};

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

  return (
    <html dir={localeDetail.dir} lang={localeDetail.htmlLang}>
      <head>
        <link href="/favicon.ico" rel="icon" sizes="16x16 32x32 48x48" />
        <link href="/icon.svg" rel="icon" type="image/svg+xml" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" sizes="180x180" />
        {supportedLocales.map((item) => (
          <link href={absoluteUrl(localizedPath(pathname, item))} hrefLang={localeDetails[item].htmlLang} key={item} rel="alternate" />
        ))}
        <link href={absoluteUrl(localizedPath(pathname, "en"))} hrefLang="x-default" rel="alternate" />
      </head>
      <body>
        <div className="page-chrome">
          <header className="topnav">
            <Link className="brand" href={href("/")} prefetch={false}>
              <span className="brand-mark" />
              <span>{t.common.brand}</span>
            </Link>
            <Link className="mobile-submit" href={href("/submit")} prefetch={false}>
              {t.common.submitYourMcp}
            </Link>
            <nav className="nav-right">
              <Link className="nav-link" href={href("/")} prefetch={false}>
                {t.nav.browse}
              </Link>
              <Link className="nav-link" href={href("/store")} prefetch={false}>
                {t.nav.apps}
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
          <main>{children}</main>
          <footer className="footer">
            <div className="footer-links">
              <Link className="submit-cta" href={href("/submit")} prefetch={false}>
                {t.common.submitYourMcpLong}
              </Link>
              <Link className="footer-link" href={href("/terms")} prefetch={false}>
                {t.nav.terms}
              </Link>
              <Link className="footer-link" href={href("/learn")} prefetch={false}>
                {t.nav.learn}
              </Link>
              <Link className="footer-link" href={href("/store")} prefetch={false}>
                {t.nav.apps}
              </Link>
              <Link className="footer-link" href={href("/skills")} prefetch={false}>
                {t.nav.skills}
              </Link>
              <Link className="footer-link" href={href("/collections")} prefetch={false}>
                {t.common.collections}
              </Link>
              <Link className="footer-link" href={href("/docs")} prefetch={false}>
                {t.common.docs}
              </Link>
              <Link className="footer-link" href={href("/faq")} prefetch={false}>
                {t.common.faq}
              </Link>
              <Link className="footer-link" href={href("/privacy")} prefetch={false}>
                {t.nav.privacy}
              </Link>
              <Link className="footer-link" href="/rss.xml" prefetch={false}>
                {t.nav.rss}
              </Link>
              <a className="footer-link" href="https://github.com/byeval/mcpappstore" rel="noreferrer" target="_blank">
                GitHub
              </a>
            </div>
          </footer>
        </div>
        <GoogleAnalyticsPageTracker measurementId={googleAnalyticsId} />
        {analyticsToken ? <script dangerouslySetInnerHTML={{ __html: delayedAnalyticsScript(analyticsToken) }} /> : null}
      </body>
    </html>
  );
}
