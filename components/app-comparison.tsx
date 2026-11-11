import Link from "next/link";
import { discoveryCopy } from "@/lib/discovery-copy";
import { editorialFor } from "@/lib/app-editorial";
import { localizedPath, type Locale, type I18nMessages } from "@/lib/i18n";
import type { CatalogApp } from "@/lib/types";
export function AppComparison({
  apps,
  locale,
  messages: t,
}: {
  apps: CatalogApp[];
  locale: Locale;
  messages: I18nMessages;
}) {
  if (!apps.length) return null;
  return (
    <section className="detail-section">
      <h2>{discoveryCopy(locale).compare}</h2>
      <div
        className="compare-scroll"
        tabIndex={0}
        role="region"
        aria-label={discoveryCopy(locale).compare}
      >
        <table className="compare-table">
          <caption>{discoveryCopy(locale).evidence}</caption>
          <thead>
            <tr>
              <th scope="col">{t.common.apps}</th>
              <th scope="col">{t.appDetail.availableIn}</th>
              <th scope="col">{t.appDetail.capabilities}</th>
              <th scope="col">{t.appDetail.developer}</th>
            </tr>
          </thead>
          <tbody>
            {apps.slice(0, 8).map((app) => {
              const note = editorialFor(app.id, locale);
              return (
                <tr key={app.id}>
                  <th scope="row">
                    <Link href={localizedPath(`/app/${app.id}`, locale)}>
                      {app.name}
                    </Link>
                  </th>
                  <td>
                    {Array.from(
                      new Set(
                        app.surfaces.map((s) =>
                          s.platform === "claude" ? "Claude" : "ChatGPT",
                        ),
                      ),
                    ).join(" · ")}
                  </td>
                  <td lang={note?.lang}>
                    {note?.useCase ?? app.tagline}
                    {note ? (
                      <p>
                        <a
                          href={note.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {new URL(note.sourceUrl).hostname} ↗
                        </a>
                      </p>
                    ) : null}
                  </td>
                  <td>
                    {app.publisher && app.publisher !== "Unknown"
                      ? app.publisher
                      : t.common.notProvided}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
