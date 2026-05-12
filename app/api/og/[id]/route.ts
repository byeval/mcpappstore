import { getAppById } from "@/lib/data";
import { ogImageResponse } from "@/lib/og-image";

function appIdFromParam(id: string): string {
  return id.replace(/\.png$/i, "");
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const normalizedId = appIdFromParam(id);

  if (normalizedId === "default" || normalizedId === "mcpapp") {
    const url = new URL(request.url);
    return ogImageResponse({
      title: "MCP App Store",
      description: "Discover MCP apps, ChatGPT apps, Claude connectors, and MCP servers.",
      footer: url.host,
    });
  }

  const app = await getAppById(normalizedId);
  if (!app) {
    return new Response("Not found", { status: 404 });
  }

  return ogImageResponse({
    title: app.name,
    description: app.tagline,
    eyebrow: "MCP App",
    footer: new URL(request.url).host,
    metrics: [`Transport: ${app.mcpTransport}`, `Tools: ${app.tools.length}`, `Publisher: ${app.publisher}`],
  });
}
