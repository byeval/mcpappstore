// Owner instruction: remove Viator globally. Keep stored data recoverable.
// This code-level ID guard survives future imports of published catalog records.
export const removedPublicAppIds = new Set(['viator']);
export function isRemovedContentPath(pathname: string): boolean {
 try {
  const decoded=decodeURIComponent(pathname.split(/[?#]/,1)[0]!).replace(/\\/g,'/').replace(/\/+/g,'/').replace(/\/+$/,'').toLowerCase();
  return /(?:^|\/)apps?\/viator(?:\/|\.rsc$|$)/.test(decoded)||/^\/api\/og\/viator(?:\/|\.rsc$|$)/.test(decoded);
 } catch {return false;}
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
