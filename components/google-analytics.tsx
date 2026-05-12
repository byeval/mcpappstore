"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    googleAnalyticsInitialized?: boolean;
  }
}

export function GoogleAnalyticsPageTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      window.gtag = (...args: unknown[]) => {
        window.dataLayer.push(args);
      };
    }

    if (!window.googleAnalyticsInitialized) {
      window.gtag("js", new Date());
      window.gtag("config", measurementId, { send_page_view: false });
      window.googleAnalyticsInitialized = true;
    }
  }, [measurementId]);

  useEffect(() => {
    if (typeof window.gtag !== "function" || !window.googleAnalyticsInitialized) {
      return;
    }

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("config", measurementId, {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}
