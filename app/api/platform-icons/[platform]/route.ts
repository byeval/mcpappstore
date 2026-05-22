const PLATFORM_ICONS = {
  chatgpt: {
    contentType: "image/svg+xml; charset=utf-8",
    body: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="10" fill="#111827"/>
  <path d="M16 6.25a4.88 4.88 0 0 1 4.875 4.875v.256a4.88 4.88 0 0 1 3.375 4.666 4.88 4.88 0 0 1-3.375 4.666v.162A4.88 4.88 0 0 1 16 25.75a4.88 4.88 0 0 1-4.875-4.875v-.162a4.88 4.88 0 0 1-3.375-4.666 4.88 4.88 0 0 1 3.375-4.666v-.256A4.88 4.88 0 0 1 16 6.25Zm0 2.25a2.63 2.63 0 0 0-2.625 2.625v1.624l-1.406.812a2.63 2.63 0 0 0 0 4.558l1.406.812v1.994A2.63 2.63 0 0 0 16 23.5a2.63 2.63 0 0 0 2.625-2.625v-1.994l1.406-.812a2.63 2.63 0 0 0 0-4.558l-1.406-.812v-1.624A2.63 2.63 0 0 0 16 8.5Z" fill="#10A37F"/>
  <path d="M16 10.75a5.25 5.25 0 0 1 4.547 2.625l-1.95 1.125A3 3 0 0 0 16 13a3 3 0 0 0-2.598 1.5l-1.95-1.125A5.25 5.25 0 0 1 16 10.75Zm2.598 6.75 1.95 1.125A5.25 5.25 0 0 1 16 21.25a5.25 5.25 0 0 1-4.547-2.625l1.95-1.125A3 3 0 0 0 16 19a3 3 0 0 0 2.598-1.5Z" fill="#E5FFF8"/>
</svg>`,
  },
  claude: {
    contentType: "image/svg+xml; charset=utf-8",
    body: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="10" fill="#F97316"/>
  <path d="M21.218 10.089c-1.7-.886-3.634-1.339-5.798-1.339-2.9 0-5.214.748-6.938 2.244C6.761 12.491 5.9 14.502 5.9 17.028c0 2.454.837 4.393 2.51 5.818 1.673 1.424 3.86 2.136 6.563 2.136 2.4 0 4.444-.551 6.132-1.654v-3.52c-1.53 1.235-3.376 1.852-5.537 1.852-1.646 0-2.975-.387-3.988-1.16-1.014-.773-1.6-1.849-1.761-3.228H22.1v-1.984c0-2.403-.96-4.136-2.882-5.199Zm-5.637 1.73c1.27 0 2.32.311 3.15.933.83.621 1.31 1.49 1.44 2.606h-8.208c.176-1.129.69-2.001 1.544-2.616.853-.616 1.878-.923 3.074-.923Z" fill="#FFF7ED"/>
</svg>`,
  },
} as const;

const iconCacheControl = "public, max-age=31536000, immutable";

type Platform = keyof typeof PLATFORM_ICONS;

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

  const icon = PLATFORM_ICONS[platform];
  return new Response(icon.body, {
    headers: {
      "content-type": icon.contentType,
      "cache-control": iconCacheControl,
    },
  });
}
