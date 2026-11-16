// Approved Viator removals only. Catalog data and media remain recoverable.
// JA: f60b0458b9ec025b; EN: 9e6e8735a45a32e1; ES: 69070d6d396b4441.
// /app/viator is the default English canonical URL used by localizedPath().
const removedContentPaths = new Set([
  "/ja/app/viator",
  "/en/app/viator",
  "/app/viator",
  "/es/app/viator",
]);
// Keep this policy in code so catalog imports and daily refreshes cannot restore it.
export function isRemovedContentPath(pathname: string): boolean {
  try {
    return removedContentPaths.has(decodeURIComponent(pathname.split(/[?#]/, 1)[0]!).replace(/\/+$/, ""));
  } catch {
    return false;
  }
}

export function removedContentResponse(): Response {
  return new Response("Gone", {
    status: 410,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
