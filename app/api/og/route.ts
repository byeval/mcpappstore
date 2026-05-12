import { ogImageResponse } from "@/lib/og-image";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? "MCP App Store";
  const description =
    url.searchParams.get("description") ??
    "Discover MCP apps, ChatGPT apps, Claude connectors, and MCP servers.";
  const path = url.searchParams.get("path") ?? "/";

  return ogImageResponse({
    title,
    description,
    footer: path === "/" ? url.host : `${url.host}${path}`,
  });
}
