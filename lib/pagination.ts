export function pageFromSearchParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function offsetForPage(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export function paginatedPath(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}
