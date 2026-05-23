import type { CatalogApp } from "@/lib/types";

export function formatDirectoryNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function hasAppPlatform(app: CatalogApp, platform: "chatgpt" | "claude"): boolean {
  return app.surfaces.some((surface) => surface.platform === platform);
}

export function appPlatformLabel(app: CatalogApp): string {
  const labels = [
    hasAppPlatform(app, "chatgpt") ? "ChatGPT" : "",
    hasAppPlatform(app, "claude") ? "Claude" : "",
  ].filter(Boolean);

  return labels.join(" + ");
}

export function appMetadataSignal(app: CatalogApp): string {
  if (app.tools.length > 0) return `${app.tools.length} tools`;
  if (app.examplePrompts.length > 0) return `${app.examplePrompts.length} prompts`;
  if (app.previews.length > 0) return `${app.previews.length} previews`;
  if (app.repoUrl) return "GitHub repo";
  if (app.installCmd) return "install command";
  if (app.mcpEndpoint) return "endpoint listed";
  return "metadata available";
}
