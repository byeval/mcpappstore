import Link from "next/link";

import { localizedCategoryName } from "@/lib/content-i18n";
import { getMessages, localizedPath, type I18nMessages, type Locale } from "@/lib/i18n";
import { isIndexableCategory } from "@/lib/seo-indexing";
import type { CategorySummary } from "@/lib/types";

export function CategoryTabs({
  categories,
  activeSlug,
  maxVisible = 11,
  locale = "en",
  messages,
}: {
  categories: CategorySummary[];
  activeSlug?: string;
  maxVisible?: number;
  locale?: Locale;
  messages?: I18nMessages;
}) {
  const t = messages ?? getMessages(locale);
  const browsableCategories = categories.filter(
    (category) => category.slug !== "featured" && isIndexableCategory(category),
  );
  const visibleCategories = browsableCategories.slice(0, maxVisible);
  const activeCategory = activeSlug ? categories.find((category) => category.slug === activeSlug) : undefined;
  const tabs =
    activeCategory && !visibleCategories.some((category) => category.slug === activeCategory.slug)
      ? [...visibleCategories, activeCategory]
      : visibleCategories;

  return (
    <nav aria-label={t.categoryTabs.aria} className="tabs">
      <Link className={!activeSlug ? "tab active" : "tab"} href={localizedPath("/", locale)} prefetch={false}>
        {t.categoryTabs.featured}
      </Link>
      {tabs.map((category) => (
        <Link
          className={activeSlug === category.slug ? "tab active" : "tab"}
          href={localizedPath(`/category/${category.slug}`, locale)}
          key={category.slug}
          prefetch={false}
        >
          {localizedCategoryName(category.slug, category.name, locale)}
        </Link>
      ))}
    </nav>
  );
}
