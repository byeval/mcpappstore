import Link from "next/link";

import type { CatalogApp } from "@/lib/types";
import { PlatformBadge } from "@/components/platform-badge";
import { getMessages, localizedPath, surfaceLabelFor, type I18nMessages, type Locale } from "@/lib/i18n";
import { optimizedImageUrl } from "@/lib/image-urls";
import { primarySurface, surfaceDetails } from "@/lib/surfaces";
import { initials } from "@/lib/utils";

function stripLeadingMention(prompt: string, appName: string): string {
  const mention = `@${appName}`;
  if (prompt.toLowerCase().startsWith(mention.toLowerCase())) {
    return prompt.slice(mention.length).trimStart();
  }

  return prompt.replace(/^@\S+\s*/, "");
}

function previewThumbnailUrl(imageUrl: string): string {
  if (imageUrl.includes("/api/assets?")) {
    const url = new URL(imageUrl, "https://mcpapp.local");
    const key = url.searchParams.get("key");
    if (key?.startsWith("previews/") && key.endsWith(".webp") && !key.endsWith(".thumb.webp")) {
      url.searchParams.set("key", key.replace(/\.webp$/, ".thumb.webp"));
      return `${url.pathname}?${url.searchParams.toString()}`;
    }
  }

  if (imageUrl.includes("/previews/") && imageUrl.endsWith(".webp") && !imageUrl.endsWith(".thumb.webp")) {
    return imageUrl.replace(/\.webp$/, ".thumb.webp");
  }

  return imageUrl;
}

export function HeroCarousel({
  apps,
  locale = "en",
  messages,
}: {
  apps: CatalogApp[];
  locale?: Locale;
  messages?: I18nMessages;
}) {
  if (apps.length === 0) {
    return null;
  }

  const t = messages ?? getMessages(locale);
  const activeApp = apps[0]!;
  const activeSurface = primarySurface(activeApp.surfaces);
  const activeDetails = surfaceDetails(activeSurface, {
    tagline: activeApp.tagline,
    description: activeApp.description,
    capabilities: activeApp.capabilities,
    examplePrompts: activeApp.examplePrompts,
    tools: activeApp.tools,
    previews: activeApp.previews,
    mcpEndpoint: activeApp.mcpEndpoint,
    mcpTransport: activeApp.mcpTransport,
    installCmd: activeApp.installCmd,
    authType: activeApp.authType,
  });
  const primaryPreview = activeDetails.previews[0];
  const thumbnailUrl = primaryPreview?.imageUrl ? previewThumbnailUrl(primaryPreview.imageUrl) : undefined;

  return (
    <section className="hero-carousel">
      <div className="hero-inner">
        <div className="hero-left">
          <div className="hero-icon">
            {activeApp.iconUrl ? (
              <img
                alt={`${activeApp.name} icon`}
                decoding="async"
                fetchPriority="high"
                height={256}
                loading="eager"
                sizes="88px"
                src={optimizedImageUrl(activeApp.iconUrl)}
                width={256}
              />
            ) : (
              <span>{initials(activeApp.name).slice(0, 1)}</span>
            )}
          </div>
          <div className="hero-title-group">
            <div className="surface-badges hero-surfaces" aria-label={t.common.availableSurfaces}>
              {activeApp.surfaces.slice(0, 2).map((surface, index) => (
                <PlatformBadge
                  key={`${surface.platform}-${surface.type}-${index}`}
                  label={surfaceLabelFor(surface, t.surface)}
                  surface={surface}
                />
              ))}
            </div>
            <h2 className="hero-title">{activeApp.name}</h2>
          </div>
          <p className="hero-sub">{activeDetails.tagline}</p>
          <Link className="hero-cta" href={localizedPath(`/app/${activeApp.id}`, locale)} prefetch={false}>
            {t.hero.view} {activeApp.name}
          </Link>
        </div>
        <div className="hero-right">
          <div className="bubble-stack">
            {primaryPreview ? (
              <div className="bubble-prompt">
                <b>@{activeApp.name}</b> {stripLeadingMention(primaryPreview.prompt, activeApp.name)}
              </div>
            ) : null}
            {primaryPreview && thumbnailUrl ? (
              <div className="bubble-card">
                <div className="bubble-gallery single">
                  <div className="bubble-thumb">
                    <img
                      alt={primaryPreview.caption ?? primaryPreview.prompt}
                      decoding="async"
                      fetchPriority="high"
                      height={540}
                      loading="eager"
                      sizes="(max-width: 640px) 78vw, 360px"
                      src={optimizedImageUrl(thumbnailUrl)}
                      width={720}
                    />
                  </div>
                </div>
                <div className="bubble-text">
                  {primaryPreview.caption ?? activeDetails.examplePrompts[0] ?? activeDetails.tagline}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="hero-dots" aria-hidden="true">
        {apps.map((app, index) => (
          <span className={index === 0 ? "dot active" : "dot"} key={app.id} />
        ))}
      </div>
    </section>
  );
}
