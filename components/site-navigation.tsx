"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { discoveryCopy } from "@/lib/discovery-copy";
import { localizedPath, type Locale, type I18nMessages } from "@/lib/i18n";

export function SiteNavigation({
  locale,
  messages: t,
  pathname,
}: {
  locale: Locale;
  messages: I18nMessages;
  pathname: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const copy = discoveryCopy(locale);
  const href = (path: string) => localizedPath(path, locale);
  const close = () =>
    root.current
      ?.querySelectorAll("details[open]")
      .forEach((el) => el.removeAttribute("open"));
  useEffect(close, [pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const links = (items: [string, string][]) =>
    items.map(([path, label]) => (
      <Link href={href(path)} key={path} prefetch={false} onClick={close}>
        {label}
      </Link>
    ));
  const discover: [string, string][] = [
    ["/store", t.common.apps],
    ["/chatgpt-apps", t.nav.chatgpt],
    ["/claude-connectors", t.nav.claude],
    ["/remote-mcp-servers", "Remote MCP"],
  ];
  const developer: [string, string][] = [
    ["/mcp-clients", t.nav.clients],
    ["/mcp-inspector", t.nav.inspector],
    ["/docs", t.common.docs],
  ];
  return (
    <div
      ref={root}
      className="site-navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          const details = (event.target as HTMLElement).closest("details");
          close();
          details?.querySelector("summary")?.focus();
        }
      }}
    >
      <nav className="nav-right" aria-label={copy.discover}>
        <details className="nav-group">
          <summary>{copy.discover}</summary>
          <div className="nav-group-panel">{links(discover)}</div>
        </details>
        <Link className="nav-link" href={href("/collections")} prefetch={false}>
          {copy.workflows}
        </Link>
        <Link className="nav-link" href={href("/skills")} prefetch={false}>
          {t.nav.skills}
        </Link>
        <Link className="nav-link" href={href("/learn")} prefetch={false}>
          {t.nav.learn}
        </Link>
        <details className="nav-group">
          <summary>{copy.developers}</summary>
          <div className="nav-group-panel">{links(developer)}</div>
        </details>
        <LanguageSwitcher locale={locale} messages={t} pathname={pathname} />
        <Link className="btn-primary" href={href("/submit")} prefetch={false}>
          {t.common.submitYourMcpLong}
        </Link>
      </nav>
      <details className="mobile-nav-menu">
        <summary>{t.nav.browse}</summary>
        <nav className="mobile-nav-panel" aria-label={copy.discover}>
          <strong>{copy.discover}</strong>
          {links(discover)}
          {links([
            ["/collections", copy.workflows],
            ["/topics", "MCP topics"],
            ["/skills", t.nav.skills],
            ["/learn", t.nav.learn],
          ])}
          <strong>{copy.developers}</strong>
          {links(developer)}
          {links([["/submit", t.common.submitYourMcp]])}
          <LanguageSwitcher locale={locale} messages={t} pathname={pathname} />
        </nav>
      </details>
    </div>
  );
}
