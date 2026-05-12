import Link from "next/link";

import { localizedPath } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";

export default async function NotFound() {
  const { locale, messages: t } = await getI18n();

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="panel success-panel">
          <p className="eyebrow">{t.notFound.eyebrow}</p>
          <h1>{t.notFound.title}</h1>
          <Link className="primary-link" href={localizedPath("/", locale)}>
            {t.notFound.action}
          </Link>
        </div>
      </section>
    </div>
  );
}
