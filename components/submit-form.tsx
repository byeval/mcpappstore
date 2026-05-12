"use client";

import { useEffect, useState } from "react";

import { PlatformBadge } from "@/components/platform-badge";
import type { I18nMessages, Locale } from "@/lib/i18n";
import type { AppSurface } from "@/lib/types";

const capabilityOptions = ["Interactive", "Reads", "Writes", "Streaming", "Tools"];
const categoryOptions = ["featured", "productivity", "developer-tools", "design", "research"];

interface PreviewForm {
  prompt: string;
  caption: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  filePreviewUrl?: string;
}

interface ImportedApp {
  source: "catalog" | "metadata";
  name?: string;
  tagline?: string;
  description?: string;
  publisher?: string;
  homepageUrl?: string;
  repoUrl?: string;
  publisherUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  supportUrl?: string;
  version?: string;
  iconUrl?: string;
  capabilities?: string[];
  categories?: string[];
  tags?: string[];
  tools?: Array<{ name: string; description?: string }>;
  previews?: Array<Partial<PreviewForm>>;
  examplePrompts?: string[];
  chatgptEnabled?: boolean;
  claudeEnabled?: boolean;
  chatgptUrl?: string;
  claudeUrl?: string;
  mcpEndpoint?: string;
  mcpTransport?: "stdio" | "sse" | "http";
  installCmd?: string;
  authType?: "none" | "oauth" | "api_key";
}

function createTool() {
  return { name: "", description: "" };
}

function createPreview(): PreviewForm {
  return { prompt: "", caption: "", imageUrl: "", ctaLabel: "", ctaUrl: "" };
}

function createSurfaces({
  name,
  chatgptEnabled,
  claudeEnabled,
  chatgptUrl,
  claudeUrl,
}: {
  name: string;
  chatgptEnabled: boolean;
  claudeEnabled: boolean;
  chatgptUrl: string;
  claudeUrl: string;
}): AppSurface[] {
  const surfaces: AppSurface[] = [];
  if (chatgptEnabled) {
    surfaces.push({
      platform: "chatgpt",
      type: "app",
      displayName: name || undefined,
      url: chatgptUrl.trim() || undefined,
      isPrimary: surfaces.length === 0,
      status: "available",
    });
  }
  if (claudeEnabled) {
    surfaces.push({
      platform: "claude",
      type: "interactive_connector",
      displayName: name || undefined,
      url: claudeUrl.trim() || undefined,
      isPrimary: surfaces.length === 0,
      status: "available",
    });
  }
  return surfaces.length > 0
    ? surfaces
    : [
        {
          platform: "chatgpt",
          type: "app",
          displayName: name || undefined,
          isPrimary: true,
          status: "available",
        },
      ];
}

export function SubmitForm({
  action,
  siteKey,
  error,
  locale,
  messages,
}: {
  action: string;
  siteKey?: string;
  error?: string;
  locale: Locale;
  messages: I18nMessages["submitForm"];
}) {
  const t = messages;
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [publisher, setPublisher] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [publisherUrl, setPublisherUrl] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [version, setVersion] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [installCmd, setInstallCmd] = useState("");
  const [mcpTransport, setMcpTransport] = useState<"stdio" | "sse" | "http">("sse");
  const [authType, setAuthType] = useState<"none" | "oauth" | "api_key">("oauth");
  const [tools, setTools] = useState([createTool()]);
  const [previews, setPreviews] = useState([createPreview()]);
  const [examplePrompts, setExamplePrompts] = useState([""]);
  const [capabilities, setCapabilities] = useState<string[]>(["Interactive", "Reads"]);
  const [categories, setCategories] = useState<string[]>(["productivity"]);
  const [tags, setTags] = useState<string[]>([]);
  const [iconUrl, setIconUrl] = useState("");
  const [iconPreviewUrl, setIconPreviewUrl] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [chatgptEnabled, setChatgptEnabled] = useState(true);
  const [claudeEnabled, setClaudeEnabled] = useState(true);
  const [chatgptUrl, setChatgptUrl] = useState("");
  const [claudeUrl, setClaudeUrl] = useState("");
  const surfaces = createSurfaces({ name, chatgptEnabled, claudeEnabled, chatgptUrl, claudeUrl });
  const avatarImageUrl = iconPreviewUrl || iconUrl;

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    const existing = document.querySelector('script[data-turnstile="true"]');
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    document.head.appendChild(script);
  }, [siteKey]);

  useEffect(() => {
    return () => {
      if (iconPreviewUrl) {
        URL.revokeObjectURL(iconPreviewUrl);
      }
    };
  }, [iconPreviewUrl]);

  const applyImportedApp = (payload: ImportedApp) => {
    setName(payload.name ?? "");
    setTagline(payload.tagline ?? "");
    setDescription(payload.description ?? "");
    setPublisher(payload.publisher ?? "");
    setHomepageUrl(payload.homepageUrl ?? "");
    setRepoUrl(payload.repoUrl ?? "");
    setPublisherUrl(payload.publisherUrl ?? "");
    setPrivacyUrl(payload.privacyUrl ?? "");
    setTermsUrl(payload.termsUrl ?? "");
    setSupportUrl(payload.supportUrl ?? "");
    setVersion(payload.version ?? "");
    setIconUrl(payload.iconUrl ?? "");
    setIconPreviewUrl("");
    setCapabilities(payload.capabilities?.length ? payload.capabilities.slice(0, 8) : ["Interactive", "Tools"]);
    setCategories(payload.categories?.length ? payload.categories.slice(0, 4) : ["productivity"]);
    setTags(payload.tags?.slice(0, 8) ?? []);
    setTools(payload.tools?.length ? payload.tools.map((tool) => ({ name: tool.name, description: tool.description ?? "" })) : [createTool()]);
    setPreviews(
      payload.previews?.length
        ? payload.previews.slice(0, 3).map((preview) => ({
            prompt: preview.prompt ?? "",
            caption: preview.caption ?? "",
            imageUrl: preview.imageUrl ?? "",
            ctaLabel: preview.ctaLabel ?? "",
            ctaUrl: preview.ctaUrl ?? "",
          }))
        : [createPreview()],
    );
    setExamplePrompts(payload.examplePrompts?.length ? payload.examplePrompts : [""]);
    setChatgptEnabled(Boolean(payload.chatgptEnabled));
    setClaudeEnabled(Boolean(payload.claudeEnabled));
    setChatgptUrl(payload.chatgptUrl ?? "");
    setClaudeUrl(payload.claudeUrl ?? "");
    setMcpEndpoint(payload.mcpEndpoint ?? "");
    setInstallCmd(payload.installCmd ?? "");
    setMcpTransport(payload.mcpTransport ?? "http");
    setAuthType(payload.authType ?? "oauth");
  };

  const importListing = () => {
    const trimmedUrl = importUrl.trim();
    if (!trimmedUrl) {
      setImportError(t.importEmpty);
      return;
    }

    setIsImporting(true);
    setImportError("");
    setImportStatus("");

    void fetch("/api/import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: trimmedUrl }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as ImportedApp & { message?: string };
        if (!response.ok) {
          throw new Error(payload.message ?? t.importFailed);
        }

        applyImportedApp(payload);
        setImportStatus(payload.source === "catalog" ? t.importCatalog : t.importMetadata);
      })
      .catch((importFailure: unknown) => {
        setImportError(importFailure instanceof Error ? importFailure.message : t.importFailed);
      })
      .finally(() => setIsImporting(false));
  };

  const previewJson = previews
    .filter((preview) => preview.prompt.trim())
    .map(({ filePreviewUrl: _filePreviewUrl, ...preview }) => preview);

  const saveDraft = () => {
    const draft = {
      name,
      tagline,
      description,
      publisher,
      homepageUrl,
      repoUrl,
      publisherUrl,
      privacyUrl,
      termsUrl,
      supportUrl,
      version,
      mcpEndpoint,
      installCmd,
      mcpTransport,
      authType,
      tools,
      previews: previewJson,
      examplePrompts,
      capabilities,
      categories,
      tags,
      iconUrl,
      chatgptEnabled,
      claudeEnabled,
      chatgptUrl,
      claudeUrl,
    };
    localStorage.setItem("mcpapp-submit-draft", JSON.stringify(draft));
    setImportStatus(t.draftSaved);
    setImportError("");
  };

  return (
    <>
      <header className="page-head">
        <h1>{t.headerTitle}</h1>
        <p>{t.headerCopy}</p>
      </header>

      <section className="import-card">
        <div className="import-inner">
          <span className="import-label">
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="m13 2-3 9h5l-3 11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
            </svg>
            {t.quickImport}
          </span>
          <h2>{t.importTitle}</h2>
          <p>{t.importCopy}</p>
          <div className="import-input">
            <input
              aria-label={t.importAria}
              className="url"
              onChange={(event) => setImportUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  importListing();
                }
              }}
              placeholder="https://chatgpt.com/apps/... or https://claude.ai/directory/..."
              type="url"
              value={importUrl}
            />
            <button className="import-btn" disabled={isImporting} onClick={importListing} type="button">
              {isImporting ? t.importingButton : t.importButton}
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
          {importStatus ? <p className="import-status">{importStatus}</p> : null}
          {importError ? <p className="import-status error">{importError}</p> : null}
          <div className="import-hints">
            <span className="hint-chip">chatgpt.com/apps/{`{slug}`}</span>
            <span className="hint-chip">claude.ai/directory/{`{id}`}</span>
            <span className="hint-chip">{t.metadataFallback}</span>
          </div>
        </div>
      </section>

      <div className="or-divider">{t.divider}</div>

      <div className="layout">
        <form action={action} className="form" encType="multipart/form-data" method="post">
          {error ? <p className="form-alert">{error}</p> : null}

          <section className="card">
            <div className="step">
              <span className="step-dot" />
              {t.step1}
            </div>
            <h2>{t.basicsTitle}</h2>
            <p className="card-sub">{t.basicsCopy}</p>

            <div className="field">
              <label>
                {t.appName}<span className="req">*</span>
              </label>
              <input className="input" name="name" onChange={(event) => setName(event.target.value)} placeholder="Canva" required value={name} />
            </div>

            <div className="field">
              <label>
                {t.tagline}<span className="req">*</span>
              </label>
              <input
                className="input"
                name="tagline"
                onChange={(event) => setTagline(event.target.value)}
                placeholder="Search, create, edit designs"
                required
                value={tagline}
              />
              <span className="hint">{t.taglineHint}</span>
            </div>

            <div className="field">
              <label>
                {t.longDescription}<span className="req">*</span>
              </label>
              <textarea
                className="textarea"
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t.descriptionPlaceholder}
                required
                rows={6}
                value={description}
              />
              <span className="hint">{t.markdownSupported}</span>
            </div>

            <div className="field">
              <label>
                {t.avatar}<span className="req">*</span>
              </label>
              <label className={avatarImageUrl || name ? "avatar-upload filled" : "avatar-upload"}>
                <div className={avatarImageUrl ? "avatar-preview image" : name ? "avatar-preview canva" : "avatar-preview"}>
	                  {avatarImageUrl ? <img alt="" height={256} src={avatarImageUrl} width={256} /> : name ? name[0]?.toUpperCase() : "M"}
                </div>
                <div className="avatar-copy">
                  <strong>{name || t.uploadAvatar}</strong>
                  <span>{t.avatarHint}</span>
                </div>
                <input
                  accept="image/*"
                  name="icon_file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setIconPreviewUrl("");
                      return;
                    }

                    if (iconPreviewUrl) {
                      URL.revokeObjectURL(iconPreviewUrl);
                    }
                    setIconPreviewUrl(URL.createObjectURL(file));
                    setIconUrl("");
                  }}
                  type="file"
                />
              </label>
            </div>
          </section>

          <section className="card">
            <div className="step">
              <span className="step-dot" />
              {t.step2}
            </div>
            <h2>{t.publisherTitle}</h2>
            <p className="card-sub">{t.publisherCopy}</p>

            <div className="field">
              <label>
                {t.platformSurfaces}<span className="req">*</span>
              </label>
              <div className="surface-options">
                <label className={chatgptEnabled ? "surface-option active" : "surface-option"}>
                  <input
                    checked={chatgptEnabled}
                    onChange={(event) => setChatgptEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{t.chatgptApp}</strong>
                    <small>{t.chatgptAppHint}</small>
                  </span>
                </label>
                <label className={claudeEnabled ? "surface-option active" : "surface-option"}>
                  <input
                    checked={claudeEnabled}
                    onChange={(event) => setClaudeEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{t.claudeConnector}</strong>
                    <small>{t.claudeConnectorHint}</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="row-2">
              <div className="field">
                <label>{t.chatgptUrl}</label>
                <input
                  className="input"
                  onChange={(event) => setChatgptUrl(event.target.value)}
                  placeholder="https://chatgpt.com/apps/..."
                  type="url"
                  value={chatgptUrl}
                />
              </div>
              <div className="field">
                <label>{t.claudeUrl}</label>
                <input
                  className="input"
                  onChange={(event) => setClaudeUrl(event.target.value)}
                  placeholder="https://claude.ai/directory/..."
                  type="url"
                  value={claudeUrl}
                />
              </div>
            </div>

            <div className="row-2">
              <div className="field">
                <label>
                  {t.developer}<span className="req">*</span>
                </label>
                <input className="input" name="publisher" onChange={(event) => setPublisher(event.target.value)} placeholder="Canva Pty Ltd" required value={publisher} />
              </div>
              <div className="field">
                <label>
                  {t.website}<span className="req">*</span>
                </label>
                <input className="input" name="homepage_url" onChange={(event) => setHomepageUrl(event.target.value)} placeholder="https://canva.com" type="url" value={homepageUrl} />
              </div>
              <div className="field">
                <label>{t.repoUrl}</label>
                <input
                  className="input"
                  name="repo_url"
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/acme/server"
                  type="url"
                  value={repoUrl}
                />
              </div>
              <div className="field">
                <label>{t.publisherUrl}</label>
                <input
                  className="input"
                  name="publisher_url"
                  onChange={(event) => setPublisherUrl(event.target.value)}
                  placeholder="https://acme.dev"
                  type="url"
                  value={publisherUrl}
                />
              </div>
              <div className="field">
                <label>{t.privacyUrl}</label>
                <input
                  className="input"
                  name="privacy_url"
                  onChange={(event) => setPrivacyUrl(event.target.value)}
                  placeholder="https://example.com/privacy"
                  type="url"
                  value={privacyUrl}
                />
              </div>
              <div className="field">
                <label>{t.termsUrl}</label>
                <input
                  className="input"
                  name="terms_url"
                  onChange={(event) => setTermsUrl(event.target.value)}
                  placeholder="https://example.com/terms"
                  type="url"
                  value={termsUrl}
                />
              </div>
              <div className="field">
                <label>{t.supportUrl}</label>
                <input
                  className="input"
                  name="support_url"
                  onChange={(event) => setSupportUrl(event.target.value)}
                  placeholder="https://example.com/support"
                  type="url"
                  value={supportUrl}
                />
              </div>
              <div className="field">
                <label>{t.version}</label>
                <input className="input" name="version" onChange={(event) => setVersion(event.target.value)} placeholder="2.8.1" value={version} />
              </div>
            </div>

            <div className="field">
              <label>
                {t.category}<span className="req">*</span>
              </label>
              <div className="chips">
                {categoryOptions.map((option) => (
                  <button
                    className={categories.includes(option) ? "chip-opt active" : "chip-opt"}
                    key={option}
                    onClick={() =>
                      setCategories((current) =>
                        current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
                      )
                    }
                    type="button"
                  >
                    {option.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t.capabilities}</label>
              <div className="chips">
                {capabilityOptions.map((option) => (
                  <button
                    className={capabilities.includes(option) ? "chip-opt active" : "chip-opt"}
                    key={option}
                    onClick={() =>
                      setCapabilities((current) =>
                        current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
                      )
                    }
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <span className="hint">{t.capabilitiesHint}</span>
            </div>

            <div className="field">
              <label>{t.tags}</label>
              <input
                className="input"
                name="tags_csv"
                onChange={(event) =>
                  setTags(
                    event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="design, slides, brand-kit"
                value={tags.join(", ")}
              />
            </div>
          </section>

          <section className="card">
            <div className="step">
              <span className="step-dot" />
              {t.step3}
            </div>
            <h2>{t.mcpTitle}</h2>
            <p className="card-sub">{t.mcpCopy}</p>
            <div className="row-2">
              <div className="field">
                <label>{t.mcpEndpoint}</label>
                <input
                  className="input"
                  name="mcp_endpoint"
                  onChange={(event) => setMcpEndpoint(event.target.value)}
                  placeholder="https://example.com/sse"
                  type="url"
                  value={mcpEndpoint}
                />
              </div>
              <div className="field">
                <label>{t.installCommand}</label>
                <input
                  className="input"
                  name="install_cmd"
                  onChange={(event) => setInstallCmd(event.target.value)}
                  placeholder="npx -y @acme/mcp"
                  value={installCmd}
                />
              </div>
              <div className="field">
                <label>{t.transport}</label>
                <select
                  className="input"
                  name="mcp_transport"
                  onChange={(event) => setMcpTransport(event.target.value as "stdio" | "sse" | "http")}
                  value={mcpTransport}
                >
                  <option value="stdio">stdio</option>
                  <option value="sse">sse</option>
                  <option value="http">http</option>
                </select>
              </div>
              <div className="field">
                <label>{t.auth}</label>
                <select
                  className="input"
                  name="auth_type"
                  onChange={(event) => setAuthType(event.target.value as "none" | "oauth" | "api_key")}
                  value={authType}
                >
                  <option value="none">none</option>
                  <option value="oauth">oauth</option>
                  <option value="api_key">api_key</option>
                </select>
              </div>
            </div>

          </section>

          <section className="card">
            <div className="step">
              <span className="step-dot" />
              {t.step4}
            </div>
            <h2>{t.previewsTitle}</h2>
            <p className="card-sub">{t.previewsCopy}</p>
            <div className="preview-rep">
              {previews.map((preview, index) => (
                <div className={preview.imageUrl || preview.filePreviewUrl ? "pv-rep-card filled" : "pv-rep-card"} key={`preview-${index}`}>
                  <label className={preview.imageUrl || preview.filePreviewUrl ? "pv-image-drop filled" : "pv-image-drop"}>
                    {preview.imageUrl || preview.filePreviewUrl ? (
	                      <img alt="" className="preview-image" height={540} src={preview.filePreviewUrl || preview.imageUrl} width={720} />
                    ) : (
                      <span>{t.previewImage}</span>
                    )}
                    <input
                      accept="image/*"
                      name={`preview_image_${index}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }

                        const filePreviewUrl = URL.createObjectURL(file);
                        setPreviews((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, filePreviewUrl, imageUrl: "" } : item,
                          ),
                        );
                      }}
                      type="file"
                    />
                  </label>
                  <div className="pv-rep-fields">
                    <div className="field">
                      <label>{t.promptBubble}</label>
                      <input
                        className="input"
                        onChange={(event) =>
                          setPreviews((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, prompt: event.target.value } : item,
                            ),
                          )
                        }
                        value={preview.prompt}
                      />
                    </div>
                    <div className="row-2">
                      <div className="field">
                        <label>{t.caption}</label>
                        <input
                          className="input"
                          onChange={(event) =>
                            setPreviews((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, caption: event.target.value } : item,
                              ),
                            )
                          }
                          value={preview.caption}
                        />
                      </div>
                      <div className="field">
                        <label>{t.imageUrl}</label>
                        <input
                          className="input"
                          onChange={(event) =>
                            setPreviews((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, imageUrl: event.target.value, filePreviewUrl: "" } : item,
                              ),
                            )
                          }
                          type="url"
                          value={preview.imageUrl}
                        />
                      </div>
                    </div>
                    <div className="row-2">
                      <div className="field">
                        <label>{t.ctaLabel}</label>
                        <input
                          className="input"
                          onChange={(event) =>
                            setPreviews((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, ctaLabel: event.target.value } : item,
                              ),
                            )
                          }
                          value={preview.ctaLabel}
                        />
                      </div>
                      <div className="field">
                        <label>{t.ctaUrl}</label>
                        <input
                          className="input"
                          onChange={(event) =>
                            setPreviews((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, ctaUrl: event.target.value } : item,
                              ),
                            )
                          }
                          type="url"
                          value={preview.ctaUrl}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    className="pv-rep-del"
                    onClick={() =>
                      setPreviews((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current))
                    }
                    type="button"
                  >
                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                className="rep-add"
                onClick={() => setPreviews((current) => (current.length < 3 ? [...current, createPreview()] : current))}
                type="button"
              >
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                {t.addPreview}
              </button>
            </div>
          </section>

          <section className="card">
            <div className="step">
              <span className="step-dot" />
              {t.step5}
            </div>
            <h2>{t.toolsTitle}</h2>
            <p className="card-sub">{t.toolsCopy}</p>
            <div className="repeater">
              {tools.map((tool, index) => (
                <div className="row-2" key={`tool-${index}`}>
                  <div className="field">
                    <label>{t.toolName}</label>
                    <input
                      className="input"
                      onChange={(event) =>
                        setTools((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                      value={tool.name}
                    />
                  </div>
                  <div className="field">
                    <label>{t.description}</label>
                    <input
                      className="input"
                      onChange={(event) =>
                        setTools((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, description: event.target.value } : item,
                          ),
                        )
                      }
                      value={tool.description}
                    />
                  </div>
                </div>
              ))}
              <button className="rep-add" onClick={() => setTools((current) => [...current, createTool()])} type="button">
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                {t.addTool}
              </button>
            </div>

            <h2 className="card-subhead">{t.promptTitle}</h2>
            <div className="repeater">
              {examplePrompts.map((prompt, index) => (
                <div className="field" key={`prompt-${index}`}>
                  <label>{t.promptLabel.replace("{number}", String(index + 1))}</label>
                  <input
                    className="input"
                    onChange={(event) =>
                      setExamplePrompts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                      )
                    }
                    value={prompt}
                  />
                </div>
              ))}
              <button className="rep-add" onClick={() => setExamplePrompts((current) => [...current, ""])} type="button">
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                {t.addPrompt}
              </button>
            </div>
          </section>

          <section className="card">
            <div className="step">
              <span className="step-dot" />
              {t.step6}
            </div>
            <h2>{t.contactTitle}</h2>
            <p className="card-sub">{t.contactCopy}</p>
            <div className="field">
              <label>{t.email}</label>
              <input className="input" name="submitter_email" placeholder="you@company.com" type="email" />
            </div>

            {siteKey ? (
              <div className="captcha-slot">
                <div className="cf-turnstile" data-sitekey={siteKey} />
              </div>
            ) : (
              <div className="turnstile">
                <span className="tick" />
                {t.turnstileMissing}
              </div>
            )}
          </section>

          <div className="submit-bar">
            <div className="meta">{t.submitMeta}</div>
            <div className="actions">
              <button className="btn-ghost" onClick={saveDraft} type="button">
                {t.saveDraft}
              </button>
              <button className="btn-primary" type="submit">
                {t.submitForReview}
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>

          <input id="capabilities-json" name="capabilities_json" type="hidden" value={JSON.stringify(capabilities)} />
          <input name="locale" type="hidden" value={locale} />
          <input id="surfaces-json" name="surfaces_json" type="hidden" value={JSON.stringify(surfaces)} />
          <input id="categories-json" name="categories_json" type="hidden" value={JSON.stringify(categories)} />
          <input id="tags-json" name="tags_json" type="hidden" value={JSON.stringify(tags)} />
          <input id="icon-url" name="icon_url" type="hidden" value={iconUrl} />
          <input id="tools-json" name="tools_json" type="hidden" value={JSON.stringify(tools.filter((tool) => tool.name.trim()))} />
          <input id="previews-json" name="previews_json" type="hidden" value={JSON.stringify(previewJson)} />
          <input id="prompts-json" name="example_prompts_json" type="hidden" value={JSON.stringify(examplePrompts.map((prompt) => prompt.trim()).filter(Boolean))} />
        </form>

        <aside className="sidebar">
          <div className="preview-card">
            <p className="preview-label">{t.listingPreview}</p>
            <div className="preview-head">
              <div className={avatarImageUrl ? "preview-avatar image" : "preview-avatar"}>
	                {avatarImageUrl ? <img alt="" height={256} src={avatarImageUrl} width={256} /> : name ? name[0]?.toUpperCase() : "M"}
              </div>
              <div>
                <p className="preview-name">{name || t.yourAppName}</p>
                <p className="preview-tag">{tagline || t.taglineFallback}</p>
                <div className="surface-badges preview-surfaces">
                  {surfaces.map((surface) => (
                    <PlatformBadge key={`${surface.platform}-${surface.type}`} surface={surface} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="preview-card">
            <p className="preview-label">{t.completion}</p>
            <div className="checklist">
              <div className={name && tagline ? "chk-item done" : "chk-item"}>
                <span className="chk-dot" />
                {t.completionBasics}
              </div>
              <div className={publisher && homepageUrl ? "chk-item done" : "chk-item"}>
                <span className="chk-dot" />
                {t.completionPublisher}
              </div>
              <div className={surfaces.length > 0 ? "chk-item done" : "chk-item"}>
                <span className="chk-dot" />
                {t.completionSurfaces}
              </div>
              <div className={previews[0]?.prompt ? "chk-item done" : "chk-item"}>
                <span className="chk-dot" />
                {t.completionPreview}
              </div>
              <div className={description ? "chk-item done" : "chk-item"}>
                <span className="chk-dot" />
                {t.completionDescription}
              </div>
            </div>
          </div>
          <div className="preview-card review-card">
            <p className="preview-label">{t.reviewTimeline}</p>
            <p className="review-time">{t.reviewTime}</p>
            <p className="review-copy">{t.reviewCopy}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
