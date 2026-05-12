import { z } from "zod";

import type { SubmissionAssets, SubmissionInput } from "@/lib/types";
import { normalizeOptionalUrl } from "@/lib/utils";

const toolSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
});

const previewSchema = z.object({
  prompt: z.string().trim().min(3).max(160),
  caption: z.string().trim().max(160).optional(),
  imageUrl: z.url().optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaUrl: z.url().optional(),
});

const surfaceSchema = z.object({
  platform: z.enum(["chatgpt", "claude"]),
  type: z.enum(["app", "connector", "interactive_connector"]),
  displayName: z.string().trim().max(80).optional(),
  url: z.url().optional(),
  externalId: z.string().trim().max(120).optional(),
  isPrimary: z.boolean(),
  status: z.enum(["available", "pending", "unknown"]),
});

export const submissionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(8).max(140),
  description: z.string().trim().min(40).max(8000),
  homepageUrl: z.url().optional(),
  repoUrl: z.url().optional(),
  privacyUrl: z.url().optional(),
  termsUrl: z.url().optional(),
  supportUrl: z.url().optional(),
  mcpEndpoint: z.url().optional(),
  mcpTransport: z.enum(["stdio", "sse", "http"]),
  installCmd: z.string().trim().max(240).optional(),
  authType: z.enum(["none", "oauth", "api_key"]),
  publisher: z.string().trim().min(2).max(80),
  publisherUrl: z.url().optional(),
  version: z.string().trim().max(40).optional(),
  capabilities: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  surfaces: z.array(surfaceSchema).min(1).max(4),
  categories: z.array(z.string().trim().min(1).max(40)).min(1).max(4),
  tags: z.array(z.string().trim().min(1).max(32)).max(8),
  examplePrompts: z.array(z.string().trim().min(2).max(120)).max(8),
  tools: z.array(toolSchema).max(20),
  previews: z.array(previewSchema).max(3),
  submitterEmail: z.email().optional(),
  turnstileToken: z.string().optional(),
});

function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseSubmissionForm(formData: FormData): {
  data: SubmissionInput;
  assets: SubmissionAssets;
  turnstileToken?: string;
} {
  const previews = parseJsonField<Array<Record<string, string>>>(formData.get("previews_json"), []);
  const tools = parseJsonField<Array<Record<string, string>>>(formData.get("tools_json"), []);
  const capabilities = parseJsonField<string[]>(formData.get("capabilities_json"), []);
  const surfaces = parseJsonField<Array<Record<string, unknown>>>(formData.get("surfaces_json"), []);
  const categories = parseJsonField<string[]>(formData.get("categories_json"), []);
  const tags = parseJsonField<string[]>(formData.get("tags_json"), []);
  const examplePrompts = parseJsonField<string[]>(formData.get("example_prompts_json"), []);

  const parsed = submissionSchema.parse({
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    homepageUrl: normalizeOptionalUrl(formData.get("homepage_url")?.toString()),
    repoUrl: normalizeOptionalUrl(formData.get("repo_url")?.toString()),
    privacyUrl: normalizeOptionalUrl(formData.get("privacy_url")?.toString()),
    termsUrl: normalizeOptionalUrl(formData.get("terms_url")?.toString()),
    supportUrl: normalizeOptionalUrl(formData.get("support_url")?.toString()),
    mcpEndpoint: normalizeOptionalUrl(formData.get("mcp_endpoint")?.toString()),
    mcpTransport: formData.get("mcp_transport"),
    installCmd: formData.get("install_cmd")?.toString().trim() || undefined,
    authType: formData.get("auth_type"),
    publisher: formData.get("publisher"),
    publisherUrl: normalizeOptionalUrl(formData.get("publisher_url")?.toString()),
    version: formData.get("version")?.toString().trim() || undefined,
    capabilities,
    surfaces:
      surfaces.length > 0
        ? surfaces
        : [
            {
              platform: "chatgpt",
              type: "app",
              displayName: formData.get("name")?.toString() || undefined,
              isPrimary: true,
              status: "available",
            },
          ],
    categories,
    tags,
    examplePrompts,
    tools,
    previews,
    submitterEmail: normalizeOptionalUrl(formData.get("submitter_email")?.toString()),
    turnstileToken: formData.get("cf-turnstile-response")?.toString().trim() || undefined,
  });

  const previewFiles = parsed.previews.map((_, index) => {
    const file = formData.get(`preview_image_${index}`);
    return file instanceof File && file.size > 0 ? file : null;
  });

  const iconFile = formData.get("icon_file");

  return {
    data: {
      ...parsed,
      previews: parsed.previews.map((preview) => ({
        prompt: preview.prompt,
        caption: preview.caption,
        imageUrl: preview.imageUrl,
        ctaLabel: preview.ctaLabel,
        ctaUrl: preview.ctaUrl,
      })),
    },
    assets: {
      iconFile: iconFile instanceof File && iconFile.size > 0 ? iconFile : null,
      iconUrl: normalizeOptionalUrl(formData.get("icon_url")?.toString()),
      previewFiles,
    },
    turnstileToken: parsed.turnstileToken,
  };
}
