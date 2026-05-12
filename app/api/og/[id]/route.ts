import { getAppById } from "@/lib/data";
import { ogImageResponse } from "@/lib/og-image";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const app = await getAppById(id);
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
