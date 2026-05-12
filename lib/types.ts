export type AppStatus = "pending" | "published" | "rejected" | "hidden";
export type AppSource = "user" | "chatgpt_seed" | "claude_seed" | "admin";
export type AppPlatform = "chatgpt" | "claude";
export type AppSurfaceType = "app" | "connector" | "interactive_connector";
export type McpTransport = "stdio" | "sse" | "http";
export type AuthType = "none" | "oauth" | "api_key";
export type SkillStatus = "available" | "pending" | "unknown";
export type SkillSourceType = "local" | "bundled" | "external";
export type SkillRelationType = "recommended" | "required" | "related";

export interface CategoryRecord {
  slug: string;
  name: string;
  sort: number;
}

export interface AppTool {
  name: string;
  description?: string;
}

export interface AppPreview {
  sort: number;
  prompt: string;
  caption?: string;
  imageKey: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface AppSurface {
  platform: AppPlatform;
  type: AppSurfaceType;
  displayName?: string;
  tagline?: string;
  description?: string;
  url?: string;
  externalId?: string;
  mcpEndpoint?: string;
  mcpTransport?: McpTransport;
  installCmd?: string;
  authType?: AuthType;
  capabilities?: string[];
  examplePrompts?: string[];
  tools?: AppTool[];
  previews?: AppPreview[];
  isPrimary: boolean;
  status: "available" | "pending" | "unknown";
}

export interface SkillSurfaceRef {
  platform: AppPlatform;
  type: AppSurfaceType;
  externalId?: string;
}

export interface CatalogSkill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  sourceType: SkillSourceType;
  sourceUrl?: string;
  installUrl?: string;
  skillPath?: string;
  platforms?: AppPlatform[];
  categories: string[];
  tags: string[];
  status: SkillStatus;
}

export interface AppSkill extends CatalogSkill {
  relationType: SkillRelationType;
  reason?: string;
  confidence?: number;
  surface?: SkillSurfaceRef;
}

export interface SkillAppRef extends CatalogApp {
  skillRelationType?: SkillRelationType;
  skillReason?: string;
  skillConfidence?: number;
}

export interface CatalogApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  iconKey?: string;
  iconUrl?: string;
  heroKey?: string;
  heroUrl?: string;
  homepageUrl?: string;
  repoUrl?: string;
  mcpEndpoint?: string;
  mcpTransport: McpTransport;
  installCmd?: string;
  authType: AuthType;
  publisher: string;
  publisherUrl?: string;
  capabilities: string[];
  version?: string;
  privacyUrl?: string;
  termsUrl?: string;
  supportUrl?: string;
  status: AppStatus;
  isFeatured: boolean;
  examplePrompts: string[];
  source: AppSource;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number | null;
  surfaces: AppSurface[];
  categories: string[];
  tags: string[];
  tools: AppTool[];
  previews: AppPreview[];
  skills?: AppSkill[];
  submitterEmail?: string;
  submitterIp?: string;
  reviewNotes?: string | null;
  reviewedBy?: string | null;
}

export interface SeedCatalog {
  categories: CategoryRecord[];
  apps: CatalogApp[];
}

export interface SeedSkillRegistry {
  skills: CatalogSkill[];
}

export interface SeedSkillAssociation {
  appId: string;
  skillId: string;
  relationType: SkillRelationType;
  reason?: string;
  confidence?: number;
  surface?: SkillSurfaceRef;
}

export interface SeedRejectedSkillAssociation {
  appId: string;
  skillId: string;
  reason?: string;
  rejectedAt?: string;
}

export interface CategorySummary extends CategoryRecord {
  count: number;
}

export interface SubmissionInput {
  name: string;
  tagline: string;
  description: string;
  homepageUrl?: string;
  repoUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  supportUrl?: string;
  mcpEndpoint?: string;
  mcpTransport: McpTransport;
  installCmd?: string;
  authType: AuthType;
  publisher: string;
  publisherUrl?: string;
  version?: string;
  capabilities: string[];
  surfaces: AppSurface[];
  categories: string[];
  tags: string[];
  examplePrompts: string[];
  tools: AppTool[];
  previews: Array<Omit<AppPreview, "sort" | "imageKey">>;
  submitterEmail?: string;
}

export interface SubmissionAssets {
  iconFile?: File | null;
  iconUrl?: string;
  previewFiles: Array<File | null>;
}

export interface ReviewInput {
  appId: string;
  decision: "approve" | "reject" | "hide";
  notes?: string;
  reviewer?: string;
}
