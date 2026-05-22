import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/utils";

const apiDisallow = [
  "/admin",
  "/api/import",
  "/api/submit",
  "/api/categories/",
  "/api/platforms/",
  "/_revalidate",
];

const aiSearchBots = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"];
const aiUserBots = ["ChatGPT-User", "Claude-User", "Perplexity-User", "Meta-ExternalFetcher"];
// Keep retrieval/search bots separate from training crawlers; product policy allows answer surfaces but blocks model training use.
const aiTrainingBots = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "Bytespider",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = absoluteUrl("/").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: aiSearchBots,
        allow: "/",
        disallow: apiDisallow,
      },
      {
        userAgent: aiUserBots,
        allow: "/",
        disallow: apiDisallow,
      },
      {
        userAgent: aiTrainingBots,
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: apiDisallow,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
