import type { AppSurface } from "@/lib/types";
import { surfaceLabel } from "@/lib/surfaces";

function platformIconUrl(platform: AppSurface["platform"]): string {
  return `/api/platform-icons/${platform}`;
}

export function PlatformBadge({ label, surface }: { label?: string; surface: Pick<AppSurface, "platform" | "type"> }) {
  const resolvedLabel = label ?? surfaceLabel(surface);

  return (
    <span aria-label={resolvedLabel} className={`surface-badge ${surface.platform}`} role="img" title={resolvedLabel}>
      <img
        alt=""
        className="platform-icon"
        decoding="async"
        height={32}
        loading="lazy"
        src={platformIconUrl(surface.platform)}
        width={32}
      />
      <span className="sr-only">{resolvedLabel}</span>
    </span>
  );
}
