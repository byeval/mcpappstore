export function skillPath(skillId: string): string {
  return `/skills/${skillId.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export function skillIdFromSegments(segments: string[] | undefined): string {
  return (segments ?? []).map((segment) => decodeURIComponent(segment)).join("/");
}
