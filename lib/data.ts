import seedCatalog from "@/seed/chatgpt-apps.json";
import seedSkillAssociations from "@/seed/app-skill-associations.json";
import seedSkills from "@/seed/skills.json";

import { getBucket, getDb, getEnvValue, getKv } from "@/lib/cloudflare";
import type {
  AppPlatform,
  AppPreview,
  AppSkill,
  AppSurface,
  AppTool,
  CatalogApp,
  CatalogSkill,
  CategorySummary,
  SeedSkillAssociation,
  SkillAppRef,
  ReviewInput,
  SeedCatalog,
  SeedSkillRegistry,
  SubmissionAssets,
  SubmissionInput,
} from "@/lib/types";
import { absoluteUrl, safeJsonParse, slugify } from "@/lib/utils";

const FALLBACK_CATALOG = seedCatalog as SeedCatalog;
const FALLBACK_SKILL_REGISTRY = seedSkills as SeedSkillRegistry;
const FALLBACK_SKILL_ASSOCIATIONS = seedSkillAssociations as SeedSkillAssociation[];
const fallbackSkillById = new Map(FALLBACK_SKILL_REGISTRY.skills.map((skill) => [skill.id, skill]));
const FEATURED_APP_LIMIT = 3;
const HOME_APP_LIMIT = 36;
export const CATEGORY_APP_PAGE_SIZE = 36;
export const PLATFORM_APP_PAGE_SIZE = 36;
const publicCacheTtlSeconds = 60 * 60;
const publicCacheVersion = "v10";

interface HydrateAppRowsOptions {
  includePreviews?: boolean;
  includeSurfacePreviews?: boolean;
  includeTags?: boolean;
  includeTools?: boolean;
  includeSkills?: boolean;
  includeSubmission?: boolean;
}

const fullHydration: Required<HydrateAppRowsOptions> = {
  includePreviews: true,
  includeSurfacePreviews: true,
  includeTags: true,
  includeTools: true,
  includeSkills: true,
  includeSubmission: true,
};

const listHydration: Required<HydrateAppRowsOptions> = {
  includePreviews: false,
  includeSurfacePreviews: false,
  includeTags: false,
  includeTools: false,
  includeSkills: false,
  includeSubmission: false,
};

async function readPublicCache<T>(key: string): Promise<T | null> {
  const kv = await getKv();
  if (!kv) {
    return null;
  }

  try {
    return await kv.get<T>(`${publicCacheVersion}:${key}`, "json");
  } catch {
    return null;
  }
}

async function writePublicCache(key: string, value: unknown): Promise<void> {
  const kv = await getKv();
  if (!kv) {
    return;
  }

  try {
    await kv.put(`${publicCacheVersion}:${key}`, JSON.stringify(value), {
      expirationTtl: publicCacheTtlSeconds,
    });
  } catch {
    // Cache writes are best effort; D1 remains the source of truth.
  }
}

async function getAssetCdnUrl(): Promise<string | undefined> {
  const value = await getEnvValue("ASSET_CDN_URL");
  return value?.replace(/\/+$/, "");
}

function assetRouteUrl(key: string): string {
  return `/api/assets?key=${encodeURIComponent(key)}`;
}

function cdnAssetUrl(key: string, assetCdnUrl: string): string {
  const encodedKey = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${assetCdnUrl}/${encodedKey}`;
}

function assetUrlForKey(key: string, assetCdnUrl: string | undefined): string {
  return assetCdnUrl ? cdnAssetUrl(key, assetCdnUrl) : assetRouteUrl(key);
}

function resolveAssetUrl(key: string | undefined, fallbackUrl: string | undefined, assetCdnUrl: string | undefined) {
  if (key) {
    return assetUrlForKey(key, assetCdnUrl);
  }

  return fallbackUrl;
}

function withResolvedMediaUrls(app: CatalogApp, assetCdnUrl: string | undefined): CatalogApp {
  return {
    ...app,
    iconUrl: resolveAssetUrl(app.iconKey, app.iconUrl, assetCdnUrl),
    surfaces: app.surfaces.map((surface) => ({
      ...surface,
      previews: surface.previews?.map((preview) => ({
        ...preview,
        imageUrl: resolveAssetUrl(preview.imageKey, preview.imageUrl, assetCdnUrl),
      })),
      tools: surface.tools?.map((tool) => ({ ...tool })),
      capabilities: surface.capabilities ? [...surface.capabilities] : undefined,
      examplePrompts: surface.examplePrompts ? [...surface.examplePrompts] : undefined,
    })),
    previews: app.previews.map((preview) => ({
      ...preview,
      imageUrl: resolveAssetUrl(preview.imageKey, preview.imageUrl, assetCdnUrl),
    })),
    skills: app.skills?.map(cloneAppSkill),
  };
}

function listAppPayload(app: CatalogApp): CatalogApp {
  return {
    ...app,
    previews: [],
    tags: [],
    tools: [],
    skills: [],
    examplePrompts: [],
    surfaces: app.surfaces.map((surface) => ({
      ...surface,
      previews: undefined,
      tools: undefined,
      examplePrompts: undefined,
    })),
  };
}

function cloneAppSkill(skill: AppSkill): AppSkill {
  return {
    ...skill,
    platforms: skill.platforms ? [...skill.platforms] : undefined,
    categories: [...skill.categories],
    tags: [...skill.tags],
    surface: skill.surface ? { ...skill.surface } : undefined,
  };
}

function cloneSkill(skill: AppSkill | CatalogSkill): CatalogSkill {
  return {
    ...skill,
    platforms: skill.platforms ? [...skill.platforms] : undefined,
    categories: [...skill.categories],
    tags: [...skill.tags],
  };
}

function sortSkills(skills: CatalogSkill[]): CatalogSkill[] {
  return [...skills].sort((left, right) => {
    const sourceRank = { bundled: 0, local: 1, external: 2 } as const;
    const sourceDelta = sourceRank[left.sourceType] - sourceRank[right.sourceType];
    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

function skillsForAppFromSeed(appId: string): AppSkill[] {
  const associatedSkills: AppSkill[] = [];

  for (const association of FALLBACK_SKILL_ASSOCIATIONS) {
    if (association.appId !== appId) {
      continue;
    }

    const skill = fallbackSkillById.get(association.skillId);
    if (!skill) {
      continue;
    }

    associatedSkills.push({
      ...skill,
      platforms: skill.platforms ? [...skill.platforms] : undefined,
      categories: [...skill.categories],
      tags: [...skill.tags],
      relationType: association.relationType,
      reason: association.reason,
      confidence: association.confidence,
      surface: association.surface ? { ...association.surface } : undefined,
    });
  }

  return associatedSkills.sort((left, right) => {
    const relationRank = { required: 0, recommended: 1, related: 2 } as const;
    const relationDelta = relationRank[left.relationType] - relationRank[right.relationType];
    if (relationDelta !== 0) {
      return relationDelta;
    }

    return (right.confidence ?? 0) - (left.confidence ?? 0) || left.displayName.localeCompare(right.displayName);
  });
}

function defaultAppSurfaces(app: Pick<CatalogApp, "source" | "name" | "homepageUrl">): AppSurface[] {
  return [
    {
      platform: app.source === "claude_seed" ? "claude" : "chatgpt",
      type: app.source === "claude_seed" ? "connector" : "app",
      displayName: app.name,
      url: app.homepageUrl,
      isPrimary: true,
      status: "available",
      tagline: undefined,
      description: undefined,
      capabilities: undefined,
      examplePrompts: undefined,
      tools: undefined,
      previews: undefined,
    },
  ];
}

function cloneApp(app: CatalogApp): CatalogApp {
  return {
    ...app,
    capabilities: [...app.capabilities],
    surfaces: (app.surfaces?.length ? app.surfaces : defaultAppSurfaces(app)).map((surface) => ({
      ...surface,
      capabilities: surface.capabilities ? [...surface.capabilities] : undefined,
      examplePrompts: surface.examplePrompts ? [...surface.examplePrompts] : undefined,
      tools: surface.tools?.map((tool) => ({ ...tool })),
      previews: surface.previews?.map((preview) => ({ ...preview })),
    })),
    categories: [...app.categories],
    tags: [...app.tags],
    tools: app.tools.map((tool) => ({ ...tool })),
    previews: app.previews.map((preview) => ({ ...preview })),
    skills: (app.skills?.length ? app.skills : skillsForAppFromSeed(app.id)).map(cloneAppSkill),
    examplePrompts: [...app.examplePrompts],
  };
}

async function getAppSurfacesFromDb(
  appId: string,
  app: Pick<CatalogApp, "source" | "name" | "homepageUrl">,
  assetCdnUrl: string | undefined,
  options: Pick<Required<HydrateAppRowsOptions>, "includeSurfacePreviews"> = fullHydration,
): Promise<AppSurface[]> {
  const db = await getDb();
  if (!db) {
    return defaultAppSurfaces(app);
  }

  try {
    const rows = await db
      .prepare(
        `SELECT platform, surface_type, display_name, surface_url, external_id, is_primary, status
              , tagline, description, mcp_endpoint, mcp_transport, install_cmd, auth_type, capabilities, example_prompts, tools
              ${options.includeSurfacePreviews ? ", previews" : ""}
         FROM app_surfaces
         WHERE app_id = ?
         ORDER BY is_primary DESC, platform ASC, surface_type ASC, external_id ASC`,
      )
      .bind(appId)
      .all<{
        platform: AppSurface["platform"];
        surface_type: AppSurface["type"];
        display_name?: string;
        tagline?: string;
        description?: string;
        surface_url?: string;
        external_id?: string;
        mcp_endpoint?: string;
        mcp_transport?: AppSurface["mcpTransport"];
        install_cmd?: string;
        auth_type?: AppSurface["authType"];
        capabilities?: string;
        example_prompts?: string;
        tools?: string;
        previews?: string;
        is_primary?: number;
        status?: AppSurface["status"];
      }>();

    if (rows.results.length === 0) {
      return defaultAppSurfaces(app);
    }

    return rows.results.map((surface): AppSurface => ({
      platform: surface.platform,
      type: surface.surface_type,
      displayName: surface.display_name,
      tagline: surface.tagline,
      description: surface.description,
      url: surface.surface_url,
      externalId: surface.external_id,
      mcpEndpoint: surface.mcp_endpoint,
      mcpTransport: surface.mcp_transport,
      installCmd: surface.install_cmd,
      authType: surface.auth_type,
      capabilities: surface.capabilities ? safeJsonParse<string[]>(surface.capabilities, []) : undefined,
      examplePrompts: surface.example_prompts ? safeJsonParse<string[]>(surface.example_prompts, []) : undefined,
      tools: surface.tools ? safeJsonParse<AppTool[]>(surface.tools, []) : undefined,
      previews: surface.previews
        ? safeJsonParse<AppPreview[]>(surface.previews, []).map((preview) => ({
            ...preview,
            imageUrl: preview.imageKey ? assetUrlForKey(preview.imageKey, assetCdnUrl) : preview.imageUrl,
          }))
        : undefined,
      isPrimary: Number(surface.is_primary ?? 0) === 1,
      status: surface.status ?? "available",
    }));
  } catch {
    return defaultAppSurfaces(app);
  }
}

async function getAppSkillsFromDb(appId: string): Promise<AppSkill[]> {
  const db = await getDb();
  if (!db) {
    return skillsForAppFromSeed(appId);
  }

  try {
    const rows = await db
      .prepare(
        `SELECT
          sk.id, sk.name, sk.display_name, sk.description, sk.source_type, sk.source_url, sk.install_url,
          sk.skill_path, sk.platforms, sk.categories, sk.tags, sk.status,
          ask.relation_type, ask.reason, ask.confidence
         FROM app_skills ask
         INNER JOIN skills sk ON sk.id = ask.skill_id
         WHERE ask.app_id = ?
         ORDER BY
          CASE ask.relation_type WHEN 'required' THEN 0 WHEN 'recommended' THEN 1 ELSE 2 END,
          ask.confidence DESC,
          sk.display_name ASC`,
      )
      .bind(appId)
      .all<{
        id: string;
        name: string;
        display_name: string;
        description: string;
        source_type: AppSkill["sourceType"];
        source_url?: string;
        install_url?: string;
        skill_path?: string;
        platforms?: string;
        categories?: string;
        tags?: string;
        status: AppSkill["status"];
        relation_type: AppSkill["relationType"];
        reason?: string;
        confidence?: number;
      }>();

    if (rows.results.length === 0) {
      return skillsForAppFromSeed(appId);
    }

    return rows.results.map((row): AppSkill => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      installUrl: row.install_url,
      skillPath: row.skill_path,
      platforms: row.platforms ? safeJsonParse<AppPlatform[]>(row.platforms, []) : undefined,
      categories: row.categories ? safeJsonParse<string[]>(row.categories, []) : [],
      tags: row.tags ? safeJsonParse<string[]>(row.tags, []) : [],
      status: row.status,
      relationType: row.relation_type,
      reason: row.reason,
      confidence: row.confidence === undefined || row.confidence === null ? undefined : Number(row.confidence),
    }));
  } catch {
    return skillsForAppFromSeed(appId);
  }
}

function skillFromDbRow(row: {
  id: string;
  name: string;
  display_name: string;
  description: string;
  source_type: CatalogSkill["sourceType"];
  source_url?: string;
  install_url?: string;
  skill_path?: string;
  platforms?: string;
  categories?: string;
  tags?: string;
  status: CatalogSkill["status"];
}): CatalogSkill {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    installUrl: row.install_url,
    skillPath: row.skill_path,
    platforms: row.platforms ? safeJsonParse<AppPlatform[]>(row.platforms, []) : undefined,
    categories: row.categories ? safeJsonParse<string[]>(row.categories, []) : [],
    tags: row.tags ? safeJsonParse<string[]>(row.tags, []) : [],
    status: row.status,
  };
}

async function listSkillsFromDb(): Promise<CatalogSkill[] | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const rows = await db
      .prepare(
        `SELECT id, name, display_name, description, source_type, source_url, install_url,
          skill_path, platforms, categories, tags, status
         FROM skills
         WHERE status = 'available'
         ORDER BY source_type ASC, display_name ASC`,
      )
      .all<{
        id: string;
        name: string;
        display_name: string;
        description: string;
        source_type: CatalogSkill["sourceType"];
        source_url?: string;
        install_url?: string;
        skill_path?: string;
        platforms?: string;
        categories?: string;
        tags?: string;
        status: CatalogSkill["status"];
      }>();

    return sortSkills(rows.results.map(skillFromDbRow));
  } catch {
    return null;
  }
}

async function getSkillFromDb(id: string): Promise<CatalogSkill | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const row = await db
      .prepare(
        `SELECT id, name, display_name, description, source_type, source_url, install_url,
          skill_path, platforms, categories, tags, status
         FROM skills
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(id)
      .first<{
        id: string;
        name: string;
        display_name: string;
        description: string;
        source_type: CatalogSkill["sourceType"];
        source_url?: string;
        install_url?: string;
        skill_path?: string;
        platforms?: string;
        categories?: string;
        tags?: string;
        status: CatalogSkill["status"];
      }>();

    return row ? skillFromDbRow(row) : null;
  } catch {
    return null;
  }
}

async function listAppsForSkillFromDb(skillId: string): Promise<SkillAppRef[] | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const rows = await db
      .prepare(
        `SELECT a.*, ask.relation_type AS skill_relation_type, ask.reason AS skill_reason, ask.confidence AS skill_confidence
         FROM app_skills ask
         INNER JOIN apps a ON a.id = ask.app_id
         WHERE ask.skill_id = ? AND a.status = 'published'
         ORDER BY
          CASE ask.relation_type WHEN 'required' THEN 0 WHEN 'recommended' THEN 1 ELSE 2 END,
          ask.confidence DESC,
          a.name ASC`,
      )
      .bind(skillId)
      .all<Record<string, unknown>>();

    const relationByAppId = new Map(
      rows.results.map((row) => [
        String(row.id),
        {
          relationType: String(row.skill_relation_type ?? "related") as SkillAppRef["skillRelationType"],
          reason: row.skill_reason ? String(row.skill_reason) : undefined,
          confidence: row.skill_confidence === undefined || row.skill_confidence === null ? undefined : Number(row.skill_confidence),
        },
      ]),
    );
    const apps = await hydrateAppRows(rows.results, {
      ...listHydration,
      includeSkills: true,
    });

    return apps.map((app) => {
      const relation = relationByAppId.get(app.id);
      return {
        ...app,
        skillRelationType: relation?.relationType,
        skillReason: relation?.reason,
        skillConfidence: relation?.confidence,
      };
    });
  } catch {
    return null;
  }
}

function sortApps(apps: CatalogApp[]): CatalogApp[] {
  return [...apps].sort((left, right) => {
    if (Number(right.isFeatured) !== Number(left.isFeatured)) {
      return Number(right.isFeatured) - Number(left.isFeatured);
    }

    return (right.publishedAt ?? right.updatedAt) - (left.publishedAt ?? left.updatedAt);
  });
}

async function uploadFileToR2(key: string, file: File | null | undefined): Promise<string | undefined> {
  if (!file) {
    return undefined;
  }

  const bucket = await getBucket();
  if (!bucket) {
    return undefined;
  }

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || undefined,
    },
  });

  return key;
}

function isRemoteImageUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function uploadRemoteImageToR2(key: string, imageUrl: string | undefined): Promise<string | undefined> {
  if (!isRemoteImageUrl(imageUrl)) {
    return undefined;
  }

  const bucket = await getBucket();
  if (!bucket) {
    return undefined;
  }

  const response = await fetch(imageUrl, {
    headers: {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.8",
      "user-agent": "MCPAppBot/1.0 (+https://mcpapp.net)",
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (!contentType?.startsWith("image/")) {
    return undefined;
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > 8 * 1024 * 1024) {
    return undefined;
  }

  await bucket.put(key, buffer, {
    httpMetadata: {
      contentType,
    },
  });

  return key;
}

async function hydrateAppRows(
  rows: Array<Record<string, unknown>>,
  options: HydrateAppRowsOptions = fullHydration,
): Promise<CatalogApp[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }
  const hydration = { ...fullHydration, ...options };
  const assetCdnUrl = await getAssetCdnUrl();

  const apps = await Promise.all(
    rows.map(async (row) => {
      const id = String(row.id);
      const categories = await db
        .prepare(
          "SELECT category_slug FROM app_categories WHERE app_id = ? ORDER BY category_slug ASC",
        )
        .bind(id)
        .all<{ category_slug: string }>();
      const tags = hydration.includeTags
        ? await db
            .prepare("SELECT tag_slug FROM app_tags WHERE app_id = ? ORDER BY tag_slug ASC")
            .bind(id)
            .all<{ tag_slug: string }>()
        : { results: [] };
      const tools = hydration.includeTools
        ? await db
            .prepare("SELECT tool_name, description FROM app_tools WHERE app_id = ? ORDER BY tool_name ASC")
            .bind(id)
            .all<{ tool_name: string; description?: string }>()
        : { results: [] };
      const previews = hydration.includePreviews
        ? await db
            .prepare(
              "SELECT sort, prompt, caption, image_key, cta_label, cta_url FROM app_previews WHERE app_id = ? ORDER BY sort ASC",
            )
            .bind(id)
            .all<{
              sort: number;
              prompt: string;
              caption?: string;
              image_key: string;
              cta_label?: string;
              cta_url?: string;
            }>()
        : { results: [] };
      const submission = hydration.includeSubmission
        ? await db
            .prepare(
              "SELECT id, submitter_email, submitter_ip, reviewed_by, review_notes FROM submissions WHERE app_id = ? ORDER BY id DESC LIMIT 1",
            )
            .bind(id)
            .first<{
              id: number;
              submitter_email?: string;
              submitter_ip?: string;
              reviewed_by?: string;
              review_notes?: string;
            }>()
        : null;
      const skills = hydration.includeSkills ? await getAppSkillsFromDb(id) : [];

      const baseApp = {
        id,
        name: String(row.name),
        tagline: String(row.tagline),
        description: String(row.description ?? ""),
        iconKey: row.icon_key ? String(row.icon_key) : undefined,
        iconUrl: row.icon_key ? assetUrlForKey(String(row.icon_key), assetCdnUrl) : undefined,
        heroKey: row.hero_key ? String(row.hero_key) : undefined,
        homepageUrl: row.homepage_url ? String(row.homepage_url) : undefined,
        repoUrl: row.repo_url ? String(row.repo_url) : undefined,
        mcpEndpoint: row.mcp_endpoint ? String(row.mcp_endpoint) : undefined,
        mcpTransport: String(row.mcp_transport ?? "http") as CatalogApp["mcpTransport"],
        installCmd: row.install_cmd ? String(row.install_cmd) : undefined,
        authType: String(row.auth_type ?? "none") as CatalogApp["authType"],
        publisher: String(row.publisher ?? "Unknown"),
        publisherUrl: row.publisher_url ? String(row.publisher_url) : undefined,
        capabilities: safeJsonParse<string[]>(String(row.capabilities ?? "[]"), []),
        version: row.version ? String(row.version) : undefined,
        privacyUrl: row.privacy_url ? String(row.privacy_url) : undefined,
        termsUrl: row.terms_url ? String(row.terms_url) : undefined,
        supportUrl: row.support_url ? String(row.support_url) : undefined,
        status: String(row.status) as CatalogApp["status"],
        isFeatured: Number(row.is_featured ?? 0) === 1,
        examplePrompts: safeJsonParse<string[]>(String(row.example_prompts ?? "[]"), []),
        source: String(row.source ?? "user") as CatalogApp["source"],
        createdAt: Number(row.created_at ?? Date.now()),
        updatedAt: Number(row.updated_at ?? Date.now()),
        publishedAt: row.published_at ? Number(row.published_at) : null,
        surfaces: [],
        categories: categories.results.map((item) => item.category_slug),
        tags: tags.results.map((item) => item.tag_slug),
        tools: tools.results.map(
          (tool): AppTool => ({
            name: tool.tool_name,
            description: tool.description,
          }),
        ),
        previews: previews.results.map(
          (preview): AppPreview => ({
            sort: Number(preview.sort ?? 0),
            prompt: preview.prompt,
            caption: preview.caption,
            imageKey: preview.image_key,
            imageUrl: preview.image_key ? assetUrlForKey(preview.image_key, assetCdnUrl) : undefined,
            ctaLabel: preview.cta_label,
            ctaUrl: preview.cta_url,
          }),
        ),
        submitterEmail: submission?.submitter_email,
        submitterIp: submission?.submitter_ip,
        reviewedBy: submission?.reviewed_by,
        reviewNotes: submission?.review_notes,
        skills,
      } satisfies CatalogApp;

      return {
        ...baseApp,
        surfaces: await getAppSurfacesFromDb(id, baseApp, assetCdnUrl, hydration),
      } satisfies CatalogApp;
    }),
  );

  return sortApps(apps);
}

async function listAppsFromDb(
  status: CatalogApp["status"] = "published",
  options: HydrateAppRowsOptions = fullHydration,
  limit?: number,
): Promise<CatalogApp[] | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const query = `SELECT * FROM apps
      WHERE status = ?
      ORDER BY is_featured DESC, COALESCE(published_at, updated_at) DESC
      ${limit ? "LIMIT ?" : ""}`;
    const statement = db.prepare(query);
    const rows = limit
      ? await statement.bind(status, limit).all<Record<string, unknown>>()
      : await statement.bind(status).all<Record<string, unknown>>();

    return hydrateAppRows(rows.results, options);
  } catch {
    return null;
  }
}

async function getFeaturedAppsFromDb(): Promise<CatalogApp[] | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const rows = await db
      .prepare(
        `SELECT * FROM apps
         WHERE status = 'published' AND is_featured = 1
         ORDER BY COALESCE(published_at, updated_at) DESC
         LIMIT ?`,
      )
      .bind(FEATURED_APP_LIMIT)
      .all<Record<string, unknown>>();

    return hydrateAppRows(rows.results, {
      ...fullHydration,
      includeTags: false,
      includeTools: false,
      includeSubmission: false,
    });
  } catch {
    return null;
  }
}

async function getAppFromDb(id: string): Promise<CatalogApp | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare("SELECT * FROM apps WHERE id = ? LIMIT 1").bind(id).first<Record<string, unknown>>();
    if (!row) {
      return null;
    }

    const apps = await hydrateAppRows([row]);
    return apps[0] ?? null;
  } catch {
    return null;
  }
}

async function listCategoriesFromDb(): Promise<CategorySummary[] | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const rows = await db
      .prepare(
        `SELECT c.slug, c.name, c.sort, COUNT(a.id) AS count, MAX(COALESCE(a.published_at, a.updated_at)) AS latest_updated_at
         FROM categories c
         LEFT JOIN app_categories ac ON c.slug = ac.category_slug
         LEFT JOIN apps a ON a.id = ac.app_id AND a.status = 'published'
         GROUP BY c.slug, c.name, c.sort
         ORDER BY c.sort ASC, c.name ASC`,
      )
      .all<{ slug: string; name: string; sort: number; count: number; latest_updated_at?: number }>();

    return rows.results.map((row) => ({
      slug: row.slug,
      name: row.name,
      sort: Number(row.sort ?? 0),
      count: Number(row.count ?? 0),
      latestUpdatedAt: Number(row.latest_updated_at ?? 0) || undefined,
    }));
  } catch {
    return null;
  }
}

export async function listPublishedApps(): Promise<CatalogApp[]> {
  const cached = await readPublicCache<CatalogApp[]>("published-apps");
  if (cached) {
    return cached;
  }

  const dbApps = await listAppsFromDb("published", listHydration);
  if (dbApps) {
    await writePublicCache("published-apps", dbApps);
    return dbApps;
  }

  const assetCdnUrl = await getAssetCdnUrl();
  const fallbackApps = sortApps(
    FALLBACK_CATALOG.apps
      .filter((app) => app.status === "published")
      .map(cloneApp)
      .map((app) => listAppPayload(withResolvedMediaUrls(app, assetCdnUrl))),
  );
  await writePublicCache("published-apps", fallbackApps);
  return fallbackApps;
}

export async function listHomeApps(): Promise<CatalogApp[]> {
  const cached = await readPublicCache<CatalogApp[]>("home-apps");
  if (cached) {
    return cached;
  }

  const dbApps = await listAppsFromDb("published", listHydration, HOME_APP_LIMIT);
  if (dbApps) {
    await writePublicCache("home-apps", dbApps);
    return dbApps;
  }

  const assetCdnUrl = await getAssetCdnUrl();
  const fallbackApps = sortApps(
    FALLBACK_CATALOG.apps
      .filter((app) => app.status === "published")
      .map(cloneApp)
      .map((app) => listAppPayload(withResolvedMediaUrls(app, assetCdnUrl))),
  ).slice(0, HOME_APP_LIMIT);
  await writePublicCache("home-apps", fallbackApps);
  return fallbackApps;
}

export async function listSitemapAppEntries(): Promise<Array<{ id: string; name: string; updatedAt: number }>> {
  const db = await getDb();

  if (db) {
    try {
      const rows = await db
        .prepare("SELECT id, name, updated_at FROM apps WHERE status = 'published' ORDER BY updated_at DESC")
        .all<{ id: string; name: string; updated_at: number }>();

      return rows.results.map((row) => ({
        id: row.id,
        name: row.name,
        updatedAt: Number(row.updated_at ?? Date.now()),
      }));
    } catch {
      // Fall through to the seed catalog.
    }
  }

  return FALLBACK_CATALOG.apps
    .filter((app) => app.status === "published")
    .map((app) => ({
      id: app.id,
      name: app.name,
      updatedAt: app.updatedAt,
    }));
}

export async function listSitemapSkillEntries(): Promise<Array<{ id: string; name: string; updatedAt: number }>> {
  const skills = await listSkills();
  const updatedAt = Math.max(...FALLBACK_CATALOG.apps.map((app) => app.updatedAt), 0);
  return skills.map((skill) => ({
    id: skill.id,
    name: skill.displayName,
    updatedAt: updatedAt || Date.now(),
  }));
}

export async function listPendingApps(): Promise<CatalogApp[]> {
  const dbApps = await listAppsFromDb("pending");
  return dbApps ?? [];
}

export async function getFeaturedApps(): Promise<CatalogApp[]> {
  const cached = await readPublicCache<CatalogApp[]>("featured-apps");
  if (cached) {
    return cached;
  }

  const dbApps = await getFeaturedAppsFromDb();
  if (dbApps) {
    await writePublicCache("featured-apps", dbApps);
    return dbApps;
  }

  const assetCdnUrl = await getAssetCdnUrl();
  const fallbackApps = sortApps(
    FALLBACK_CATALOG.apps
      .filter((app) => app.status === "published" && app.isFeatured)
      .slice(0, FEATURED_APP_LIMIT)
      .map(cloneApp)
      .map((app) => withResolvedMediaUrls(app, assetCdnUrl)),
  );
  await writePublicCache("featured-apps", fallbackApps);
  return fallbackApps;
}

export async function getCategorySummaries(): Promise<CategorySummary[]> {
  const cached = await readPublicCache<CategorySummary[]>("category-summaries");
  if (cached) {
    return cached;
  }

  const dbCategories = await listCategoriesFromDb();
  if (dbCategories) {
    await writePublicCache("category-summaries", dbCategories);
    return dbCategories;
  }

  const fallbackCategories = FALLBACK_CATALOG.categories
    .map((category) => ({
      ...category,
      count: FALLBACK_CATALOG.apps.filter(
        (app) => app.status === "published" && app.categories.includes(category.slug),
      ).length,
      latestUpdatedAt: FALLBACK_CATALOG.apps.reduce(
        (max, app) => app.status === "published" && app.categories.includes(category.slug)
          ? Math.max(max, app.publishedAt ?? 0, app.updatedAt)
          : max,
        0,
      ) || undefined,
    }))
    .sort((left, right) => left.sort - right.sort);
  await writePublicCache("category-summaries", fallbackCategories);
  return fallbackCategories;
}

export async function listSkills(): Promise<CatalogSkill[]> {
  const cached = await readPublicCache<CatalogSkill[]>("skills");
  if (cached) {
    return cached;
  }

  const dbSkills = await listSkillsFromDb();
  if (dbSkills) {
    await writePublicCache("skills", dbSkills);
    return dbSkills;
  }

  const fallbackSkills = sortSkills(FALLBACK_SKILL_REGISTRY.skills.map(cloneSkill));
  await writePublicCache("skills", fallbackSkills);
  return fallbackSkills;
}

export async function getSkillById(id: string): Promise<CatalogSkill | null> {
  const cached = await readPublicCache<CatalogSkill>(`skill:${id}`);
  if (cached) {
    return cached;
  }

  const dbSkill = await getSkillFromDb(id);
  if (dbSkill) {
    await writePublicCache(`skill:${id}`, dbSkill);
    return dbSkill;
  }

  const fallback = FALLBACK_SKILL_REGISTRY.skills.find((skill) => skill.id === id);
  if (!fallback) {
    return null;
  }

  const fallbackSkill = cloneSkill(fallback);
  await writePublicCache(`skill:${id}`, fallbackSkill);
  return fallbackSkill;
}

export async function listAppsForSkill(skillId: string): Promise<SkillAppRef[]> {
  const cached = await readPublicCache<SkillAppRef[]>(`skill-apps:${skillId}`);
  if (cached) {
    return cached;
  }

  const dbApps = await listAppsForSkillFromDb(skillId);
  if (dbApps) {
    await writePublicCache(`skill-apps:${skillId}`, dbApps);
    return dbApps;
  }

  const relationByAppId = new Map(
    FALLBACK_SKILL_ASSOCIATIONS
      .filter((association) => association.skillId === skillId)
      .map((association) => [association.appId, association]),
  );
  const assetCdnUrl = await getAssetCdnUrl();
  const fallbackApps = sortApps(
    FALLBACK_CATALOG.apps
      .filter((app) => app.status === "published" && relationByAppId.has(app.id))
      .map(cloneApp)
      .map((app) => withResolvedMediaUrls(app, assetCdnUrl)),
  ).map((app): SkillAppRef => {
    const relation = relationByAppId.get(app.id);
    return {
      ...app,
      skillRelationType: relation?.relationType,
      skillReason: relation?.reason,
      skillConfidence: relation?.confidence,
    };
  });
  await writePublicCache(`skill-apps:${skillId}`, fallbackApps);
  return fallbackApps;
}

export async function getAppById(id: string): Promise<CatalogApp | null> {
  const cached = await readPublicCache<CatalogApp>(`app:${id}`);
  if (cached) {
    return cached;
  }

  const dbApp = await getAppFromDb(id);
  if (dbApp) {
    await writePublicCache(`app:${id}`, dbApp);
    return dbApp;
  }

  const fallback = FALLBACK_CATALOG.apps.find((app) => app.id === id);
  if (!fallback) {
    return null;
  }

  const fallbackApp = withResolvedMediaUrls(cloneApp(fallback), await getAssetCdnUrl());
  await writePublicCache(`app:${id}`, fallbackApp);
  return fallbackApp;
}

export async function listAppsByCategory(category: string): Promise<CatalogApp[]> {
  const apps = await listPublishedApps();
  return apps.filter((app) => app.categories.includes(category));
}

export async function listAppsByCategoryPage(
  category: string,
  { limit = CATEGORY_APP_PAGE_SIZE, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<CatalogApp[]> {
  const safeLimit = Math.max(1, Math.min(limit, 72));
  const safeOffset = Math.max(0, offset);
  const db = await getDb();

  if (db) {
    try {
      const rows = await db
        .prepare(
          `SELECT a.*
           FROM apps a
           INNER JOIN app_categories ac ON ac.app_id = a.id
           WHERE a.status = 'published' AND ac.category_slug = ?
           ORDER BY a.is_featured DESC, COALESCE(a.published_at, a.updated_at) DESC
           LIMIT ? OFFSET ?`,
        )
        .bind(category, safeLimit, safeOffset)
        .all<Record<string, unknown>>();

      return hydrateAppRows(rows.results, listHydration);
    } catch {
      // Fall through to the in-memory catalog.
    }
  }

  const apps = await listPublishedApps();
  return apps.filter((app) => app.categories.includes(category)).slice(safeOffset, safeOffset + safeLimit);
}

export async function listAppsByPlatform(platform: "chatgpt" | "claude"): Promise<CatalogApp[]> {
  const apps = await listPublishedApps();
  return apps.filter((app) => app.surfaces.some((surface) => surface.platform === platform));
}

export async function countAppsByPlatform(platform: "chatgpt" | "claude"): Promise<number> {
  const db = await getDb();

  if (db) {
    try {
      const row = await db
        .prepare(
          `SELECT COUNT(DISTINCT a.id) AS count
           FROM apps a
           INNER JOIN app_surfaces s ON s.app_id = a.id
           WHERE a.status = 'published' AND s.platform = ?`,
        )
        .bind(platform)
        .first<{ count?: number }>();

      return Number(row?.count ?? 0);
    } catch {
      // Fall through to the in-memory catalog.
    }
  }

  const apps = await listAppsByPlatform(platform);
  return apps.length;
}

export async function latestPlatformAppTimestamp(platform: "chatgpt" | "claude"): Promise<number> {
  const db = await getDb();

  if (db) {
    try {
      const row = await db
        .prepare(
          `SELECT MAX(COALESCE(a.published_at, a.updated_at)) AS latest
           FROM apps a
           INNER JOIN app_surfaces s ON s.app_id = a.id
           WHERE a.status = 'published' AND s.platform = ?`,
        )
        .bind(platform)
        .first<{ latest?: number }>();

      const latest = Number(row?.latest ?? 0);
      if (latest > 0) {
        return latest;
      }
    } catch {
      // Fall through to the in-memory catalog.
    }
  }

  const apps = await listAppsByPlatform(platform);
  return apps.reduce((max, app) => Math.max(max, app.publishedAt ?? 0, app.updatedAt), 0) || Date.now();
}

export async function listAppsByPlatformPage(
  platform: "chatgpt" | "claude",
  { limit = PLATFORM_APP_PAGE_SIZE, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<CatalogApp[]> {
  const safeLimit = Math.max(1, Math.min(limit, 72));
  const safeOffset = Math.max(0, offset);
  const db = await getDb();

  if (db) {
    try {
      const rows = await db
        .prepare(
          `SELECT DISTINCT a.*
           FROM apps a
           INNER JOIN app_surfaces s ON s.app_id = a.id
           WHERE a.status = 'published' AND s.platform = ?
           ORDER BY a.is_featured DESC, COALESCE(a.published_at, a.updated_at) DESC
           LIMIT ? OFFSET ?`,
        )
        .bind(platform, safeLimit, safeOffset)
        .all<Record<string, unknown>>();

      return hydrateAppRows(rows.results, listHydration);
    } catch {
      // Fall through to the in-memory catalog.
    }
  }

  const apps = await listPublishedApps();
  return apps
    .filter((app) => app.surfaces.some((surface) => surface.platform === platform))
    .slice(safeOffset, safeOffset + safeLimit);
}

export async function searchApps(query: string): Promise<CatalogApp[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const db = await getDb();
  const likeQuery = `%${normalized}%`;
  if (db) {
    try {
      const rows = await db
        .prepare(
          `SELECT DISTINCT a.*
           FROM apps a
           LEFT JOIN app_surfaces s ON s.app_id = a.id
           LEFT JOIN app_categories ac ON ac.app_id = a.id
           LEFT JOIN app_tags tag ON tag.app_id = a.id
           LEFT JOIN app_tools tool ON tool.app_id = a.id
           LEFT JOIN app_skills ask ON ask.app_id = a.id
           LEFT JOIN skills skill ON skill.id = ask.skill_id
           WHERE a.status = 'published'
             AND (
              LOWER(a.id) LIKE ?
              OR LOWER(a.name) LIKE ?
              OR LOWER(a.tagline) LIKE ?
              OR LOWER(a.description) LIKE ?
              OR LOWER(a.publisher) LIKE ?
              OR LOWER(COALESCE(ac.category_slug, '')) LIKE ?
              OR LOWER(COALESCE(tag.tag_slug, '')) LIKE ?
              OR LOWER(COALESCE(tool.tool_name, '')) LIKE ?
              OR LOWER(COALESCE(tool.description, '')) LIKE ?
              OR LOWER(COALESCE(s.display_name, '')) LIKE ?
              OR LOWER(COALESCE(s.tagline, '')) LIKE ?
              OR LOWER(COALESCE(s.description, '')) LIKE ?
              OR LOWER(COALESCE(s.tools, '')) LIKE ?
              OR LOWER(COALESCE(skill.id, '')) LIKE ?
              OR LOWER(COALESCE(skill.name, '')) LIKE ?
              OR LOWER(COALESCE(skill.display_name, '')) LIKE ?
              OR LOWER(COALESCE(skill.description, '')) LIKE ?
              OR LOWER(COALESCE(skill.categories, '')) LIKE ?
              OR LOWER(COALESCE(skill.tags, '')) LIKE ?
             )
           ORDER BY a.is_featured DESC, COALESCE(a.published_at, a.updated_at) DESC
           LIMIT 96`,
        )
        .bind(...Array.from({ length: 19 }, () => likeQuery))
        .all<Record<string, unknown>>();

      return hydrateAppRows(rows.results, listHydration);
    } catch {
      // Fall through to the in-memory catalog.
    }
  }

  const apps = await listPublishedApps();
  return apps.filter((app) => {
    const appSkills = app.skills?.length ? app.skills : skillsForAppFromSeed(app.id);
    const haystack = [
      app.name,
      app.tagline,
      app.description,
      app.publisher,
      ...app.surfaces.map((surface) =>
        [
          surface.platform,
          surface.type,
          surface.displayName ?? "",
          surface.tagline ?? "",
          surface.description ?? "",
          ...(surface.capabilities ?? []),
          ...(surface.examplePrompts ?? []),
          ...(surface.tools ?? []).map((tool) => `${tool.name} ${tool.description ?? ""}`),
          ...(surface.previews ?? []).map((preview) => `${preview.prompt} ${preview.caption ?? ""}`),
        ].join(" "),
      ),
      ...app.categories,
      ...app.tags,
      ...app.capabilities,
      ...app.tools.map((tool) => `${tool.name} ${tool.description ?? ""}`),
      ...appSkills.map((skill) => [
        skill.id,
        skill.name,
        skill.displayName,
        skill.description,
        ...skill.categories,
        ...skill.tags,
      ].join(" ")),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export async function createSubmission(
  input: SubmissionInput,
  assets: SubmissionAssets,
  submitterIp?: string,
): Promise<{ appId: string }> {
  const db = await getDb();
  if (!db) {
    throw new Error("D1 is not configured. Bind DB to enable submissions.");
  }

  const now = Date.now();
  let appId = slugify(input.name);
  if (!appId) {
    appId = crypto.randomUUID().slice(0, 8);
  }

  const existing = await db.prepare("SELECT id FROM apps WHERE id = ? LIMIT 1").bind(appId).first();
  if (existing) {
    appId = `${appId}-${crypto.randomUUID().slice(0, 6)}`;
  }

  const iconKey =
    (await uploadFileToR2(`submissions/${appId}/icon`, assets.iconFile)) ??
    (await uploadRemoteImageToR2(`submissions/${appId}/icon`, assets.iconUrl));
  const previewKeys = await Promise.all(
    input.previews.map(async (preview, index) => {
      const key = `submissions/${appId}/preview-${index + 1}`;
      return (await uploadFileToR2(key, assets.previewFiles[index])) ?? uploadRemoteImageToR2(key, preview.imageUrl);
    }),
  );

  await db
    .prepare(
      `INSERT INTO apps (
        id, name, tagline, description, icon_key, homepage_url, repo_url,
        mcp_endpoint, mcp_transport, install_cmd, auth_type, publisher, publisher_url,
        capabilities, version, privacy_url, terms_url, support_url,
        status, is_featured, example_prompts, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, 'user', ?, ?)`,
    )
    .bind(
      appId,
      input.name,
      input.tagline,
      input.description,
      iconKey ?? null,
      input.homepageUrl ?? null,
      input.repoUrl ?? null,
      input.mcpEndpoint ?? null,
      input.mcpTransport,
      input.installCmd ?? null,
      input.authType,
      input.publisher,
      input.publisherUrl ?? null,
      JSON.stringify(input.capabilities),
      input.version ?? null,
      input.privacyUrl ?? null,
      input.termsUrl ?? null,
      input.supportUrl ?? null,
      JSON.stringify(input.examplePrompts),
      now,
      now,
    )
    .run();

  for (const [index, surface] of input.surfaces.entries()) {
    await db
      .prepare(
        `INSERT INTO app_surfaces (
          app_id, platform, surface_type, display_name, tagline, description, surface_url, external_id,
          mcp_endpoint, mcp_transport, install_cmd, auth_type, capabilities, example_prompts, tools, previews,
          is_primary, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        appId,
        surface.platform,
        surface.type,
        surface.displayName ?? input.name,
        surface.tagline ?? null,
        surface.description ?? null,
        surface.url ?? null,
        surface.externalId ?? "",
        surface.mcpEndpoint ?? null,
        surface.mcpTransport ?? null,
        surface.installCmd ?? null,
        surface.authType ?? null,
        surface.capabilities ? JSON.stringify(surface.capabilities) : null,
        surface.examplePrompts ? JSON.stringify(surface.examplePrompts) : null,
        surface.tools ? JSON.stringify(surface.tools) : null,
        surface.previews ? JSON.stringify(surface.previews) : null,
        surface.isPrimary || index === 0 ? 1 : 0,
        surface.status,
      )
      .run();
  }

  for (const category of input.categories) {
    await db
      .prepare("INSERT OR IGNORE INTO categories (slug, name, sort) VALUES (?, ?, 999)")
      .bind(category, category.replace(/-/g, " "))
      .run();
    await db.prepare("INSERT INTO app_categories (app_id, category_slug) VALUES (?, ?)").bind(appId, category).run();
  }

  for (const tag of input.tags) {
    await db.prepare("INSERT OR IGNORE INTO tags (slug, name) VALUES (?, ?)").bind(tag, tag.replace(/-/g, " ")).run();
    await db.prepare("INSERT INTO app_tags (app_id, tag_slug) VALUES (?, ?)").bind(appId, tag).run();
  }

  for (const tool of input.tools) {
    await db
      .prepare("INSERT INTO app_tools (app_id, tool_name, description) VALUES (?, ?, ?)")
      .bind(appId, tool.name, tool.description ?? null)
      .run();
  }

  for (const [index, preview] of input.previews.entries()) {
    await db
      .prepare(
        "INSERT INTO app_previews (app_id, sort, prompt, caption, image_key, cta_label, cta_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        appId,
        index,
        preview.prompt,
        preview.caption ?? null,
        previewKeys[index] ?? `submissions/${appId}/preview-${index + 1}`,
        preview.ctaLabel ?? null,
        preview.ctaUrl ?? null,
      )
      .run();
  }

  await db
    .prepare(
      "INSERT INTO submissions (app_id, submitter_email, submitter_ip, raw_payload, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(appId, input.submitterEmail ?? null, submitterIp ?? null, JSON.stringify(input), now)
    .run();

  return { appId };
}

export async function reviewSubmission(input: ReviewInput): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("D1 is not configured. Bind DB to enable moderation.");
  }

  const status =
    input.decision === "approve" ? "published" : input.decision === "hide" ? "hidden" : "rejected";
  const now = Date.now();

  await db
    .prepare(
      "UPDATE apps SET status = ?, updated_at = ?, published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END WHERE id = ?",
    )
    .bind(status, now, status, now, input.appId)
    .run();

  await db
    .prepare("UPDATE submissions SET reviewed_by = ?, review_notes = ? WHERE app_id = ?")
    .bind(input.reviewer ?? "admin", input.notes ?? null, input.appId)
    .run();
}

export async function markRevalidated(paths: string[]): Promise<void> {
  const kv = await getKv();
  if (!kv) {
    return;
  }

  await kv.put(
    "catalog:revalidated",
    JSON.stringify({
      paths,
      at: Date.now(),
    }),
  );
}
