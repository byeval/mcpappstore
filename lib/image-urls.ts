export function optimizedImageUrl(src: string, width: number, quality = 75): string {
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality),
  });

  return `/_vinext/image?${params.toString()}`;
}

export function optimizedImageSrcSet(src: string, widths: readonly number[], quality = 75): string {
  return widths.map((width) => `${optimizedImageUrl(src, width, quality)} ${width}w`).join(", ");
}
