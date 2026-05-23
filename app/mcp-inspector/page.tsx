import type { Metadata } from "next";

import { McpInspector } from "@/components/mcp-inspector";
import { getI18n } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";
import { staticPageCopy } from "@/lib/static-page-i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const copy = staticPageCopy(locale).mcpInspector;

  return pageMetadata({
    title: copy.metaTitle,
    description: copy.description,
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

export default async function McpInspectorPage() {
  const { locale } = await getI18n();
  return <McpInspector locale={locale} />;
}
