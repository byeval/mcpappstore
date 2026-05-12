"use client";

import { getMessages } from "@/lib/i18n";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = getMessages("en");

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="panel success-panel">
          <p className="eyebrow">{t.error.eyebrow}</p>
          <h1>{t.error.title}</h1>
          <p>{error.message}</p>
          <button className="primary-link" onClick={() => reset()} type="button">
            {t.error.retry}
          </button>
        </div>
      </section>
    </div>
  );
}
