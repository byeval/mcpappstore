"use client";

import { useEffect } from "react";
import { startCloudflareAnalytics, startGoogleAnalytics } from "@/lib/browser-analytics";

export function GoogleAnalyticsPageTracker({ measurementId, cloudflareToken }: { measurementId: string; cloudflareToken?: string }) {
  useEffect(() => {
    if (cloudflareToken) startCloudflareAnalytics(cloudflareToken);
    return startGoogleAnalytics(measurementId);
  }, [measurementId, cloudflareToken]);
  return null;
}
