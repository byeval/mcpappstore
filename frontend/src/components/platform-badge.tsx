import type { AppSurface } from "../lib/types";
import { surfaceLabel } from "../lib/surfaces";

export function PlatformBadge({ label, surface }: { label?: string; surface: Pick<AppSurface, "platform" | "type"> }) {
  const resolvedLabel = label ?? surfaceLabel(surface);

  return (
    <span aria-label={resolvedLabel} className={`surface-badge ${surface.platform}`} role="img" title={resolvedLabel}>
      <span aria-hidden="true" className="platform-icon">{surface.platform === "claude" ? "C" : "G"}</span>
      <span className="sr-only">{resolvedLabel}</span>
    </span>
  );
}
