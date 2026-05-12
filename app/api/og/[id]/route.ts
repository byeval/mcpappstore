import { getAppById } from "@/lib/data";

function escapeSvg(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

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

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#f7f1e5"/>
    <rect x="42" y="42" width="1116" height="546" rx="36" fill="#fffdf6" stroke="#2f2419" stroke-width="2"/>
    <circle cx="170" cy="162" r="72" fill="#2f2419"/>
    <text x="170" y="179" fill="#fffdf6" font-size="64" text-anchor="middle" font-family="Georgia, serif">${escapeSvg(app.name.slice(0, 1).toUpperCase())}</text>
    <text x="270" y="164" fill="#2f2419" font-size="72" font-weight="700" font-family="Georgia, serif">${escapeSvg(app.name)}</text>
    <text x="88" y="288" fill="#5b4a39" font-size="32" font-family="ui-sans-serif, system-ui">${escapeSvg(app.tagline)}</text>
    <text x="88" y="520" fill="#2f2419" font-size="28" font-family="ui-sans-serif, system-ui">Transport: ${escapeSvg(app.mcpTransport)}   •   Tools: ${app.tools.length}   •   Publisher: ${escapeSvg(app.publisher)}</text>
    <text x="88" y="565" fill="#6d5a47" font-size="24" font-family="ui-sans-serif, system-ui">${escapeSvg(new URL(request.url).host)}</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
