// Exact original UI label helpers from 6512b537d020ffdb5f25dcfc6815c9fedf740071. Test-only baseline.
import type {CatalogApp} from "../../lib/types";
import type {I18nMessages,Locale} from "../../lib/i18n";
function appKindLabel(app: CatalogApp, copy: I18nMessages["appKind"]): string {
  const hasChatGpt = app.surfaces.some((surface) => surface.platform === "chatgpt");
  const hasClaude = app.surfaces.some((surface) => surface.platform === "claude");

  if (hasChatGpt && hasClaude) return copy.appAndConnector;
  return hasClaude ? copy.connector : copy.app;
}

function appPlatformLabel(app: CatalogApp, locale: Locale): string {
  const platforms = Array.from(new Set(app.surfaces.map((surface) => (surface.platform === "claude" ? "Claude" : "ChatGPT"))));

  if (locale === "ja" || locale === "zh-hans") return platforms.join("、");
  if (locale === "es" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} y ${platforms[platforms.length - 1]}`;
  if (locale === "fr" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} et ${platforms[platforms.length - 1]}`;
  if (locale === "de" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} und ${platforms[platforms.length - 1]}`;
  if (locale === "ru" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} и ${platforms[platforms.length - 1]}`;
  if (locale === "ko" && platforms.length > 1) return `${platforms.slice(0, -1).join(", ")} 및 ${platforms[platforms.length - 1]}`;
  return platforms.join(" and ");
}

function appSummaryLine(app: CatalogApp, locale: Locale, t: I18nMessages): string {
  const kind = appKindLabel(app, t.appKind);
  const platform = appPlatformLabel(app, locale);

  if (!platform) return kind;
  if (locale === "ja") return `${platform} 向け ${kind}`;
  if (locale === "zh-hans") return `${platform} 版${kind}`;
  if (locale === "ko") return `${platform}용 ${kind}`;
  return `${kind} ${t.common.for} ${platform}`;
}

