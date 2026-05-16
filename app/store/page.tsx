import type { Metadata } from "next";

import { listSitemapAppEntries } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const totalListings = (await listSitemapAppEntries()).length;
  const listingText = totalListings.toLocaleString("en-US");

  return pageMetadata({
    title: `MCP directory: ${listingText} MCP servers for ChatGPT & Claude`,
    description:
      `Browse ${listingText} MCP servers in the mcpapp MCP directory for ChatGPT apps and Claude connectors, with tools, auth, prompts, categories, and integration details.`,
    path: "/store",
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
