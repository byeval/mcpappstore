import Link from "next/link";

import type { CatalogApp } from "@/lib/types";
import { PlatformBadge } from "@/components/platform-badge";
import { getMessages, localizedPath, surfaceLabelFor, type I18nMessages, type Locale } from "@/lib/i18n";
import { optimizedImageUrl } from "@/lib/image-urls";
import { primarySurface, surfaceDetails } from "@/lib/surfaces";
import { initials } from "@/lib/utils";

export function AppCard({
  app,
  locale = "en",
  messages,
}: {
  app: CatalogApp;
  contextCategorySlug?: string;
  locale?: Locale;
  messages?: I18nMessages;
}) {
  const t = messages ?? getMessages(locale);
  const primary = primarySurface(app.surfaces);
  const details = surfaceDetails(primary, {
    tagline: app.tagline,
    description: app.description,
    capabilities: app.capabilities,
    examplePrompts: app.examplePrompts,
    tools: app.tools,
    previews: app.previews,
    mcpEndpoint: app.mcpEndpoint,
    mcpTransport: app.mcpTransport,
    installCmd: app.installCmd,
    authType: app.authType,
  });

  return (
    <Link className="app-row" href={localizedPath(`/app/${app.id}`, locale)} prefetch={false}>
      <div className="app-icon">
        <div className="app-icon-inner">
          {app.iconUrl ? (
            <img
              alt={`${app.name} icon`}
              decoding="async"
              height={256}
              loading="lazy"
              sizes="48px"
              src={optimizedImageUrl(app.iconUrl)}
              width={256}
            />
          ) : (
            <span>{initials(app.name)}</span>
          )}
        </div>
      </div>
      <div className="app-meta">
        <p className="app-name">
          {app.name}
          <span className="surface-badges" aria-label={t.common.availableSurfaces}>
            {app.surfaces.slice(0, 2).map((surface, index) => (
              <PlatformBadge
                key={`${surface.platform}-${surface.type}-${index}`}
                label={surfaceLabelFor(surface, t.surface)}
                surface={surface}
              />
            ))}
          </span>
        </p>
        <p className="app-tag">{details.tagline}</p>
      </div>
      <span className="app-category" aria-hidden="true">{app.categories[0]?.replaceAll("-", " ") ?? "MCP"}</span>
      <svg aria-hidden="true" className="app-chev" fill="none" viewBox="0 0 24 24">
        <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </Link>
  );
}
