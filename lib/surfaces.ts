import type { AppPlatform, AppPreview, AppSurface, AppSurfaceType, AppTool, AuthType, McpTransport } from "@/lib/types";

export function platformLabel(platform: AppPlatform): string {
  return platform === "claude" ? "Claude" : "ChatGPT";
}

export function surfaceTypeLabel(type: AppSurfaceType): string {
  if (type === "interactive_connector") return "Interactive Connector";
  if (type === "connector") return "Connector";
  return "App";
}

export function surfaceLabel(surface: Pick<AppSurface, "platform" | "type">): string {
  return `${platformLabel(surface.platform)} ${surfaceTypeLabel(surface.type)}`;
}

export function primarySurface(surfaces: AppSurface[]): AppSurface | undefined {
  return surfaces.find((surface) => surface.isPrimary) ?? surfaces[0];
}

export interface SurfaceResolvedDetails {
  tagline: string;
  description: string;
  capabilities: string[];
  examplePrompts: string[];
  tools: AppTool[];
  previews: AppPreview[];
  mcpEndpoint?: string;
  mcpTransport: McpTransport;
  installCmd?: string;
  authType: AuthType;
}

export function surfaceDetails(
  surface: AppSurface | undefined,
  fallback: SurfaceResolvedDetails,
): SurfaceResolvedDetails {
  return {
    tagline: surface?.tagline ?? fallback.tagline,
    description: surface?.description ?? fallback.description,
    capabilities: surface?.capabilities?.length ? surface.capabilities : fallback.capabilities,
    examplePrompts: surface?.examplePrompts?.length ? surface.examplePrompts : fallback.examplePrompts,
    tools: surface?.tools?.length ? surface.tools : fallback.tools,
    previews: surface?.previews?.length ? surface.previews : fallback.previews,
    mcpEndpoint: surface?.mcpEndpoint ?? fallback.mcpEndpoint,
    mcpTransport: surface?.mcpTransport ?? fallback.mcpTransport,
    installCmd: surface?.installCmd ?? fallback.installCmd,
    authType: surface?.authType ?? fallback.authType,
  };
}
