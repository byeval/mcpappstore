import type { Metadata } from "next";

import { McpInspector } from "@/components/mcp-inspector";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

const description =
  "Test an MCP server from the browser with a Streamable HTTP inspector for initialize, tools, prompts, resources, tool calls, and app preview checks.";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();

  return pageMetadata({
    title: "MCP Inspector: browser MCP server tester",
    description,
    path: "/mcp-inspector",
    locale,
    keywords: [
      "MCP inspector",
      "MCP server tester",
      "Model Context Protocol inspector",
      "MCP tools list",
      "MCP Streamable HTTP",
    ],
  });
}

export default function McpInspectorPage() {
  return <McpInspector />;
}
