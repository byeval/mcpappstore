export function publicServerUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return undefined;
    if (/\bzpk[a-z0-9_-]{20,}/i.test(value)) return undefined;
    if ([...url.searchParams.keys()].some((key) => /key|token|secret|password|auth/i.test(key))) return undefined;
    return value;
  } catch {
    return undefined;
  }
}
