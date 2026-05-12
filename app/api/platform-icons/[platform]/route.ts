const PLATFORM_ICON_URLS = {
  chatgpt: "https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico",
  claude: "https://claude.ai/favicon.ico",
} as const;

const iconCacheControl = "public, max-age=31536000, immutable";

type Platform = keyof typeof PLATFORM_ICON_URLS;

function isPlatform(value: string): value is Platform {
  return value === "chatgpt" || value === "claude";
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ platform: string }>;
  },
) {
  const { platform } = await context.params;
  if (!isPlatform(platform)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(PLATFORM_ICON_URLS[platform], {
    headers: {
      "user-agent": "mcpapp/1.0",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Icon unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/x-icon",
      "cache-control": iconCacheControl,
    },
  });
}
