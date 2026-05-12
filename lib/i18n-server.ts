import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  detectLocaleFromAcceptLanguage,
  getMessages,
  localeCookieName,
  localeFromPath,
  normalizeLocale,
  stripLocaleFromPath,
  type Locale,
} from "@/lib/i18n";

export async function getRequestPathname(): Promise<string> {
  const headerStore = await headers();
  return headerStore.get("x-mcp-pathname") ?? "/";
}

export async function getRequestLocale(): Promise<Locale> {
  const headerStore = await headers();
  const headerLocale = normalizeLocale(headerStore.get("x-mcp-locale"));
  if (headerLocale) {
    return headerLocale;
  }

  const pathLocale = localeFromPath(headerStore.get("x-mcp-pathname") ?? "");
  if (pathLocale) {
    return pathLocale;
  }

  const cookieStore = await cookies();
  const cookieLocale = normalizeLocale(cookieStore.get(localeCookieName)?.value);
  if (cookieLocale) {
    return cookieLocale;
  }

  return detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ?? defaultLocale;
}

export async function getI18n() {
  const locale = await getRequestLocale();
  return {
    locale,
    messages: getMessages(locale),
  };
}

export async function getCanonicalRequestPathname(): Promise<string> {
  return stripLocaleFromPath(await getRequestPathname());
}
