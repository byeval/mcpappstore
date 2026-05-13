import { getAppById } from "@/lib/data";
import { ogImageResponse } from "@/lib/og-image";

function appIdFromParam(id: string): string {
  return id.replace(/\.png$/i, "");
}

function isOgSupportedImageUrl(url: string | undefined): url is string {
  return Boolean(url && /\.(png|jpe?g|svg)(?:[?#].*)?$/i.test(url));
}

function ogIconPath(app: { iconKey?: string; iconUrl?: string; id: string }): string | undefined {
  const iconSlug = app.iconKey?.startsWith("icons/")
    ? app.iconKey.split("/").at(-1)?.replace(/\.[^.]+$/, "")
    : undefined;

  if (iconSlug) {
    return `/og-icons/${iconSlug}.png`;
  }

  return isOgSupportedImageUrl(app.iconUrl) ? app.iconUrl : undefined;
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

  const logoPath = ogIconPath(app);

  return ogImageResponse({
    title: app.name,
    description: app.tagline,
    eyebrow: "MCP App",
    footer: new URL(request.url).host,
    logoAlt: `${app.name} logo`,
    logoUrl: logoPath ? new URL(logoPath, request.url).toString() : undefined,
    metrics: [`Transport: ${app.mcpTransport}`, `Tools: ${app.tools.length}`, `Publisher: ${app.publisher}`],
  });
}
