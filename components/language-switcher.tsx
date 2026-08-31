import Link from "next/link";

import { formatMessage, localeDetails, localizedPath, supportedLocales, type I18nMessages, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  messages,
  pathname,
}: {
  locale: Locale;
  messages: I18nMessages;
  pathname: string;
}) {
  return (
    <details className="language-switcher">
      <summary aria-label={messages.language.label} title={messages.language.label}>
        <span>{localeDetails[locale].shortLabel}</span>
      </summary>
      <div className="language-menu">
        {supportedLocales.map((item) => {
          const detail = localeDetails[item];
          const isCurrent = item === locale;

          return (
            <Link
              aria-current={isCurrent ? "true" : undefined}
              href={localizedPath(pathname, item)}
              hrefLang={detail.htmlLang}
              key={item}
              prefetch={false}
              title={formatMessage(isCurrent ? messages.language.current : messages.language.switchTo, {
                language: detail.nativeLabel,
              })}
            >
              <span>{detail.nativeLabel}</span>
              <small>{detail.shortLabel}</small>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
