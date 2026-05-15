import { NextResponse, type NextRequest } from "next/server";

import { isAdminRequestAuthorized } from "@/lib/auth";
import {
  detectLocaleFromAcceptLanguage,
  localeCookieName,
  localeFromPath,
  normalizeLocale,
  stripLocaleFromPath,
} from "@/lib/i18n";

function isBypassedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/sitemaps/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/rss.xml" ||
    pathname === "/sitemap.xml" ||
    pathname === "/llms.txt" ||
    pathname === "/llms-full.txt" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

function mapAppsPathToStore(pathname: string): string | null {
  if (pathname === "/apps") {
    return "/store";
  }

  if (pathname.startsWith("/apps/")) {
    return pathname.replace(/^\/apps\//, "/store/");
  }

  if (pathname === "/store-of-mcp-app") {
    return "/store";
  }

  if (pathname.startsWith("/store-of-mcp-app/")) {
    return pathname.replace(/^\/store-of-mcp-app\//, "/store/");
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const protocol = request.nextUrl.protocol;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isPrimaryHost = hostname === "mcpapp.net" || hostname === "www.mcpapp.net";
  const shouldRedirectToCanonicalHost = hostname === "www.mcpapp.net";
  const shouldRedirectToHttps = protocol === "http:" || forwardedProto === "http";

  if (isPrimaryHost && (shouldRedirectToHttps || shouldRedirectToCanonicalHost)) {
    const redirectUrl = new URL(request.url);
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = "mcpapp.net";
    redirectUrl.port = "";
    return NextResponse.redirect(redirectUrl, 308);
  }

  const originalPathname = request.nextUrl.pathname;

  if (isBypassedPath(originalPathname)) {
    return NextResponse.next();
  }

  const pathLocale = localeFromPath(originalPathname);
  const internalPathname = stripLocaleFromPath(originalPathname);
  const pathLocaleSegment = originalPathname.replace(/^\/+/, "").split("/")[0];

  if (pathLocale && pathLocaleSegment !== pathLocale) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = internalPathname === "/" ? `/${pathLocale}` : `/${pathLocale}${internalPathname}`;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const storeRedirectPath = mapAppsPathToStore(internalPathname);

  if (storeRedirectPath) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = pathLocale ? `/${pathLocale}${storeRedirectPath}` : storeRedirectPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const locale =
    pathLocale ??
    normalizeLocale(request.cookies.get(localeCookieName)?.value) ??
    detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mcp-locale", locale);
  requestHeaders.set("x-mcp-pathname", originalPathname);
  requestHeaders.set("x-mcp-internal-pathname", internalPathname);

  if (!internalPathname.startsWith("/admin")) {
    const response = pathLocale
      ? NextResponse.rewrite(
          new URL(`${internalPathname}${request.nextUrl.search}`, request.url),
          {
            request: {
              headers: requestHeaders,
            },
          },
        )
      : NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

    response.cookies.set(localeCookieName, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "Lax",
    });

    return response;
  }

  const authorized = await isAdminRequestAuthorized(request, request.nextUrl.hostname);

  if (authorized) {
    const response = pathLocale
      ? NextResponse.rewrite(
          new URL(`${internalPathname}${request.nextUrl.search}`, request.url),
          {
            request: {
              headers: requestHeaders,
            },
          },
        )
      : NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

    response.cookies.set(localeCookieName, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "Lax",
    });

    return response;
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="MCP App Store Admin"',
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next|sitemaps|.*\\..*).*)"],
};
