import { CatalogCopyButton } from "./catalog-copy-button";
import { discoveryCopy } from "@/lib/discovery-copy";
import { editorialFor } from "@/lib/app-editorial";
import type { Locale, I18nMessages } from "@/lib/i18n";
import type { CatalogApp } from "@/lib/types";
import { primarySurface, surfaceDetails } from "@/lib/surfaces";

export function AppEvidence({
  app,
  locale,
  messages: t,
}: {
  app: CatalogApp;
  locale: Locale;
  messages: I18nMessages;
}) {
  const editorial = editorialFor(app.id, locale);
  const details = surfaceDetails(primarySurface(app.surfaces), app);
  const zh = locale === "zh-hans";
  const sources = Array.from(
    new Set(
      [
        editorial?.sourceUrl,
        app.repoUrl,
        app.homepageUrl,
        ...app.surfaces.map((s) => s.url),
      ].filter((x): x is string => Boolean(x)),
    ),
  );
  return (
    <>
      <section aria-label={t.appDetail.information}>
        <dl className="catalog-facts">
          <div>
            <dt>{t.appDetail.developer}</dt>
            <dd>
              {app.publisher && app.publisher !== "Unknown"
                ? app.publisher
                : t.common.notProvided}
            </dd>
          </div>
          <div>
            <dt>{t.appDetail.availableIn}</dt>
            <dd>
              {Array.from(
                new Set(
                  app.surfaces.map((s) =>
                    s.platform === "claude" ? "Claude" : "ChatGPT",
                  ),
                ),
              ).join(" · ") || t.common.notProvided}
            </dd>
          </div>
          <div>
            <dt>{t.appDetail.transport}</dt>
            <dd>{details.mcpTransport || t.common.notProvided}</dd>
          </div>
          <div>
            <dt>{zh ? "目录标注的认证" : "Listed authentication"}</dt>
            <dd>
              {details.authType === "oauth"
                ? "OAuth"
                : details.authType === "api_key"
                  ? "API key"
                  : zh
                    ? "未标注认证要求"
                    : "No authentication requirement listed"}
            </dd>
          </div>
          <div>
            <dt>{discoveryCopy(locale).synced}</dt>
            <dd>
              <time dateTime={new Date(app.updatedAt).toISOString()}>
                {new Date(app.updatedAt).toISOString().slice(0, 10)}
              </time>
            </dd>
          </div>
          <div>
            <dt>{zh ? "接入测试" : "Connection test"}</dt>
            <dd>
              {zh ? "未进行账号接入测试" : "No connected-account test recorded"}
            </dd>
          </div>
        </dl>
        <p className="evidence-note">{discoveryCopy(locale).evidence}</p>
      </section>
      {editorial ? (
        <section
          className="detail-section editorial-guide"
          lang={editorial.lang}
          aria-labelledby="selection-guide"
        >
          <h2 className="section-title" id="selection-guide">
            {zh ? "适用场景与首次使用" : "Workflow and first use"}
          </h2>
          <p>{editorial.useCase}</p>
          <ol>
            <li>
              {zh
                ? "选择上方对应平台的入口，核对服务名称和账号，再完成授权。"
                : "Choose the matching platform link above, confirm the service and account, then authorize the connection."}
            </li>
            <li>{editorial.check}</li>
            <li>
              {zh
                ? "尝试下面的小任务，并打开返回的原始记录核对结果。"
                : "Try the small task below and open the original records to check the result."}
            </li>
          </ol>
          <p>
            <strong>{zh ? "建议试用请求" : "Suggested first request"}</strong>
          </p>
          <blockquote>{editorial.prompt}</blockquote>
          <CatalogCopyButton
            appId={app.id}
            kind="prompt"
            locale={locale}
            value={editorial.prompt}
          />
          <p className="evidence-note">
            {zh ? "公开文档核对" : "Public documentation reviewed"}:{" "}
            <time dateTime={editorial.reviewedAt}>{editorial.reviewedAt}</time>.{" "}
            {zh
              ? "这不是登录测试或跨平台功能保证。"
              : "This is not a signed-in test or a guarantee of feature parity across platforms."}{" "}
            <a href={editorial.sourceUrl} target="_blank" rel="noreferrer">
              {zh ? "查看来源" : "Read source"} ↗
            </a>
          </p>
        </section>
      ) : null}
      <details className="listing-sources">
        <summary>
          {zh ? "目录来源与接入资料" : "Listing sources and setup references"}
        </summary>
        <ul>
          {sources.map((url) => (
            <li key={url}>
              <a href={url} rel="noreferrer" target="_blank">
                {url}
              </a>
            </li>
          ))}
        </ul>
        {sources.length === 0 ? <p>{t.common.notProvided}</p> : null}
      </details>
    </>
  );
}
