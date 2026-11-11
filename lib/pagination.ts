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

export function paginationWindow(current:number,total:number): (number|null)[] {
  const selected = new Set([1,total,current-1,current,current+1].filter(n=>n>=1&&n<=total));
  const sorted=[...selected].sort((a,b)=>a-b);
  const result:(number|null)[]=[];
  for(const n of sorted){const previous=result[result.length-1];if(typeof previous === "number" && n-previous>1) result.push(null);result.push(n);}
  return result;
}
