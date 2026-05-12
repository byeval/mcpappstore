import type { AppPreview } from "@/lib/types";

export function PreviewBubbles({ previews }: { previews: AppPreview[] }) {
  if (previews.length === 0) {
    return null;
  }

  return (
    <section className="preview-gallery">
      <div className="preview-grid detail-preview-grid">
        {previews.map((preview) => (
          <article className="pv" key={`${preview.sort}-${preview.prompt}`}>
            <div className="pv-prompt">{preview.prompt}</div>
            <div className="pv-card">
              <div className="pv-mockup">
                {preview.imageUrl ? (
                  <img
                    alt={preview.caption ?? preview.prompt}
                    className="preview-image"
                    height={540}
                    loading="lazy"
                    src={preview.imageUrl}
                    width={720}
                  />
                ) : (
                  <div className="preview-art-inner">
                    <span>Mockup</span>
                  </div>
                )}
              </div>
              {preview.caption ? <div className="pv-caption">{preview.caption}</div> : null}
              {preview.ctaLabel && preview.ctaUrl ? (
                <a className="pv-cta" href={preview.ctaUrl} rel="noreferrer" target="_blank">
                  {preview.ctaLabel}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
