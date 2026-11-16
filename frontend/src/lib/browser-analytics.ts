export const ANALYTICS_DISABLED_KEY = "mcpapp:analytics:disabled";
export const SUBMISSION_RECEIPT_COOKIE = "mcpapp_submission_received";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    googleAnalyticsInitialized?: boolean;
    googleAnalyticsLastPageView?: string;
    __MCPAPP_DISABLE_ANALYTICS__?: boolean;
  }
}

// Test isolation, not a claim that all bots can be detected client-side.
export function analyticsAllowed(): boolean {
  if (typeof window === "undefined" || !["mcpapp.net", "www.mcpapp.net"].includes(window.location.hostname)) return false;
  if (window.navigator.webdriver || window.__MCPAPP_DISABLE_ANALYTICS__) return false;
  try {
    return window.sessionStorage.getItem(ANALYTICS_DISABLED_KEY) !== "1";
  } catch {
    return true;
  }
}

export function analyticsUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    // Never send form errors, submission IDs, inspector credentials, search text or fragments.
    for (const key of [...url.searchParams.keys()]) {
      if (!/^utm_(source|medium|campaign|content|term)$/.test(key) && key !== "page") url.searchParams.delete(key);
    }
    url.hash = "";
    url.username = "";
    url.password = "";
    return url.href;
  } catch {
    return "";
  }
}

export type CatalogEvent = "app_open" | "mcp_copy" | "generate_lead";
export type CatalogEventParams = { app_id?: string; platform?: string; copy_type?: "endpoint" | "install" | "config" | "prompt" };

export function startCloudflareAnalytics(token: string): void {
  if (!analyticsAllowed() || document.querySelector('script[src*="static.cloudflareinsights.com/beacon.min.js"]')) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.dataset.cfBeacon = JSON.stringify({ token });
  document.head.appendChild(script);
}

export function trackCatalogEvent(event: CatalogEvent, params: CatalogEventParams = {}): void {
  if (!analyticsAllowed() || !window.gtag || !window.googleAnalyticsInitialized) return;
  window.gtag("event", event, { ...params, page_location: analyticsUrl(window.location.href) });
}

export function startGoogleAnalytics(measurementId: string): () => void {
  if (!analyticsAllowed()) return () => {};
  window.dataLayer = window.dataLayer || [];
  window.gtag ??= function gtag() { window.dataLayer.push(arguments); };

  if (!window.googleAnalyticsInitialized) {
    window.gtag("js", new Date());
    window.googleAnalyticsInitialized = true;
  }

  if (!document.getElementById("google-analytics")) {
    const script = document.createElement("script");
    script.id = "google-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  const sendPageView = () => {
    if (!analyticsAllowed()) return;
    const pageLocation = analyticsUrl(window.location.href);
    if (window.googleAnalyticsLastPageView === pageLocation) return;
    const pageReferrer = window.googleAnalyticsLastPageView ?? analyticsUrl(document.referrer);
    window.googleAnalyticsLastPageView = pageLocation;
    const url = new URL(pageLocation);
    // Refresh the tag's context as well as the explicit view, so later automatic
    // engagement events do not retain the previous route's URL or title.
    window.gtag?.("config", measurementId, {
      send_page_view: false,
      page_location: pageLocation,
      page_referrer: pageReferrer,
      page_title: document.title,
    });
    window.gtag?.("event", "page_view", {
      page_path: url.pathname + url.search,
      page_location: pageLocation,
      page_referrer: pageReferrer,
      page_title: document.title,
      send_to: measurementId,
    });
    // A successful POST issues this short-lived receipt; opening the thank-you URL is not a lead.
    if (/\/submit\/success\/?$/.test(url.pathname) && document.cookie.split("; ").includes(`${SUBMISSION_RECEIPT_COOKIE}=1`)) {
      document.cookie = `${SUBMISSION_RECEIPT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
      trackCatalogEvent("generate_lead");
    }
  };

  let pendingFrame = 0;
  const schedulePageView = () => {
    window.cancelAnimationFrame(pendingFrame);
    // Allow the route and document title to commit before measuring the view.
    pendingFrame = window.requestAnimationFrame(() => {
      pendingFrame = window.requestAnimationFrame(sendPageView);
    });
  };
  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  const push: History["pushState"] = function (this: History, ...args) { originalPush.apply(this, args); schedulePageView(); };
  const replace: History["replaceState"] = function (this: History, ...args) { originalReplace.apply(this, args); schedulePageView(); };
  window.history.pushState = push;
  window.history.replaceState = replace;
  window.addEventListener("popstate", schedulePageView);

  const onClick = (event: MouseEvent) => {
    if (!event.isTrusted || (event.type === "auxclick" && event.button !== 1)) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-analytics-app]") : null;
    if (link) trackCatalogEvent("app_open", { app_id: link.dataset.analyticsApp, platform: link.dataset.analyticsPlatform });
  };
  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", onClick);
  sendPageView();

  return () => {
    window.cancelAnimationFrame(pendingFrame);
    if (window.history.pushState === push) window.history.pushState = originalPush;
    if (window.history.replaceState === replace) window.history.replaceState = originalReplace;
    window.removeEventListener("popstate", schedulePageView);
    document.removeEventListener("click", onClick);
    document.removeEventListener("auxclick", onClick);
  };
}
