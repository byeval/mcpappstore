import { getAppById } from "@/lib/data";
import { ogImageResponse } from "@/lib/og-image";

const ogIconRawBaseUrl = "https://raw.githubusercontent.com/byeval/mcpappstore/main/public/og-icons";

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
    return `${ogIconRawBaseUrl}/${encodeURIComponent(iconSlug)}.png`;
  }

  return isOgSupportedImageUrl(app.iconUrl) ? app.iconUrl : undefined;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function imageDataUri(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "image/png";
    if (!/^image\/(?:png|jpe?g|svg\+xml)$/i.test(contentType)) {
      return undefined;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    return `data:${contentType};base64,${bytesToBase64(bytes)}`;
  } catch {
    return undefined;
  }
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
  const logoUrl = logoPath ? new URL(logoPath, request.url).toString() : undefined;

  return ogImageResponse({
    title: app.name,
    description: app.tagline,
    eyebrow: "App profile",
    footer: new URL(request.url).host,
    logoAlt: `${app.name} logo`,
    logoUrl: logoUrl ? await imageDataUri(logoUrl) : undefined,
    metrics: [`Transport: ${app.mcpTransport}`, `Tools: ${app.tools.length}`, `Publisher: ${app.publisher}`],
  });
}
