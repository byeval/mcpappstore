"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    googleAnalyticsInitialized?: boolean;
    googleAnalyticsLastPageView?: string;
  }
}

export function GoogleAnalyticsPageTracker({ measurementId }: { measurementId: string }) {
  useEffect(() => {
    const scriptId = "google-analytics";

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];

    if (typeof window.gtag !== "function") {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
    }

    if (!window.googleAnalyticsInitialized) {
      window.gtag("js", new Date());
      window.gtag("config", measurementId, { send_page_view: false });
      window.googleAnalyticsInitialized = true;
    }

    const sendPageView = () => {
      if (typeof window.gtag !== "function" || !window.googleAnalyticsInitialized) {
        return;
      }

      const pageLocation = window.location.href;
      if (window.googleAnalyticsLastPageView === pageLocation) {
        return;
      }

      window.googleAnalyticsLastPageView = pageLocation;
      window.gtag("event", "page_view", {
        page_path: `${window.location.pathname}${window.location.search}`,
        page_location: pageLocation,
        page_title: document.title,
        send_to: measurementId,
      });
    };

    const navigationEvent = "mcpapp:navigation";
    const notifyNavigation = () => window.dispatchEvent(new Event(navigationEvent));
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      notifyNavigation();
      return result;
    };
    window.history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      notifyNavigation();
      return result;
    };

    sendPageView();
    window.addEventListener("popstate", notifyNavigation);
    window.addEventListener(navigationEvent, sendPageView);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", notifyNavigation);
      window.removeEventListener(navigationEvent, sendPageView);
    };
  }, [measurementId]);

  return null;
}
