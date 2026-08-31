import { headers } from "next/headers";

import {
  defaultLocale,
  getMessages,
  localeFromPath,
  normalizeLocale,
  stripLocaleFromPath,
  type Locale,
} from "@/lib/i18n";

function cleanRequestPathname(value: string | null): string {
  const pathname = value?.split(/[?#]/, 1)[0] || "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export async function getRequestPathname(): Promise<string> {
  const headerStore = await headers();
  return cleanRequestPathname(headerStore.get("x-mcp-pathname"));
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

  return defaultLocale;
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
