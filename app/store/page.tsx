import type { Metadata } from "next";

import { getDirectoryCount } from "@/lib/directory-data";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, apps] = await Promise.all([getI18n(), getDirectoryCount()]);
  const totalListings = apps;
  const listingText = totalListings.toLocaleString("en-US");

  return pageMetadata({
    title: `MCP directory: ${listingText} MCP servers for ChatGPT & Claude`,
    description:
      `Browse ${listingText} MCP servers in the mcpapp MCP directory for ChatGPT apps and Claude connectors, with tools, auth, prompts, categories, and integration details.`,
    path: "/store",
    locale,
    keywords: [
      "MCP app store",
      "MCP directory",
      "MCP server directory",
      "Model Context Protocol apps",
      "ChatGPT apps",
      "Claude connectors",
      "MCP servers",
      "MCP tools",
    ],
  });
}

export { default } from "@/app/apps/page";
