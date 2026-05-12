import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "MCP App Store | MCP Server Directory for ChatGPT & Claude",
  description:
    "Discover and compare MCP servers, ChatGPT apps, and Claude connectors. Browse tools, categories, prompts, auth, publishers, and integration details.",
  path: "/store",
  keywords: [
    "MCP app store",
    "MCP server directory",
    "Model Context Protocol apps",
    "ChatGPT apps",
    "Claude connectors",
    "MCP servers",
    "MCP tools",
  ],
});

export { default } from "@/app/apps/page";
