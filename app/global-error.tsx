"use client";

import { getMessages, localeDetails } from "@/lib/i18n";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const t = getMessages("en");

  return (
    <html lang={localeDetails.en.htmlLang}>
      <body>
        <div className="page-stack">
          <section className="catalog-shell compact-shell">
            <div className="panel success-panel">
              <p className="eyebrow">{t.error.globalEyebrow}</p>
              <h1>{t.error.globalTitle}</h1>
              <p>{error.message}</p>
            </div>
          </section>
        </div>
      </body>
    </html>
  );
}
