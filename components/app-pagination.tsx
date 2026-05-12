import { AppCard } from "@/components/app-card";
import { formatMessage, getMessages, localizedPath, type I18nMessages, type Locale } from "@/lib/i18n";
import { paginatedPath } from "@/lib/pagination";
import type { CatalogApp } from "@/lib/types";

function pageRange(totalPages: number): number[] {
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

export function PaginatedAppGrid({
  apps,
  basePath,
  page,
  pageSize,
  totalCount,
  locale = "en",
  messages,
  contextCategorySlug,
}: {
  apps: CatalogApp[];
  basePath: string;
  page: number;
  pageSize: number;
  totalCount: number;
  locale?: Locale;
  messages?: I18nMessages;
  contextCategorySlug?: string;
}) {
  const t = messages ?? getMessages(locale);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const firstItem = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastItem = Math.min(totalCount, firstItem + apps.length - 1);
  const previousPage = safePage > 1 ? safePage - 1 : undefined;
  const nextPage = safePage < totalPages ? safePage + 1 : undefined;

  return (
    <>
      <div className="app-grid">
        {apps.map((app) => (
          <AppCard app={app} contextCategorySlug={contextCategorySlug} key={app.id} locale={locale} messages={t} />
        ))}
      </div>
      {totalPages > 1 ? (
        <nav aria-label={t.pagination.aria} className="pagination-nav">
          <p className="pagination-summary">
            {formatMessage(t.pagination.summary, { first: firstItem, last: lastItem, total: totalCount })}
          </p>
          <div className="pagination-pages">
            {previousPage ? (
              <a className="pagination-edge" href={localizedPath(paginatedPath(basePath, previousPage), locale)} rel="prev">
                {t.pagination.previous}
              </a>
            ) : null}
            {pageRange(totalPages).map((pageNumber) => (
              <a
                aria-current={pageNumber === safePage ? "page" : undefined}
                className={pageNumber === safePage ? "pagination-link active" : "pagination-link"}
                href={localizedPath(paginatedPath(basePath, pageNumber), locale)}
                key={pageNumber}
              >
                {pageNumber}
              </a>
            ))}
            {nextPage ? (
              <a className="pagination-edge" href={localizedPath(paginatedPath(basePath, nextPage), locale)} rel="next">
                {t.pagination.next}
              </a>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
