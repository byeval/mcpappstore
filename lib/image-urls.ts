export function optimizedImageUrl(src: string, _width: number, _quality = 75): string {
  return src;
}

export function optimizedImageSrcSet(src: string, widths: readonly number[], _quality = 75): string {
  return widths.map((width) => `${src} ${width}w`).join(", ");
}
