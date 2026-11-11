import { discoveryCopy } from "@/lib/discovery-copy";
import { localizedPath, type Locale, type I18nMessages } from "@/lib/i18n";
export function CatalogSearch({
  locale,
  messages: t,
  platform = "",
  query = "",
}: {
  locale: Locale;
  messages: I18nMessages;
  platform?: string;
  query?: string;
}) {
  return (
    <form
      action={localizedPath("/search", locale)}
      className="search-form catalog-search"
      role="search"
    >
      <label className="sr-only" htmlFor="catalog-query">
        {t.common.search}
      </label>
      <input
        id="catalog-query"
        name="q"
        type="search"
        defaultValue={query}
        placeholder={t.searchPage.placeholder}
      />
      <label className="sr-only" htmlFor="catalog-platform">
        {t.common.availableSurfaces}
      </label>
      <select id="catalog-platform" name="platform" defaultValue={platform}>
        <option value="">{discoveryCopy(locale).allPlatforms}</option>
        <option value="chatgpt">ChatGPT</option>
        <option value="claude">Claude</option>
      </select>
      <button className="primary-link" type="submit">
        {t.searchPage.submit}
      </button>
    </form>
  );
}
