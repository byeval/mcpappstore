import type { CatalogApp } from "@/lib/types";

export interface AppCollection {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  updatedAt: string;
  platform?: "chatgpt" | "claude";
  categorySlugs: string[];
  appIds?: string[];
  matchTerms: string[];
  primaryCategorySlug: string;
  relatedLinks: Array<{ label: string; href: string }>;
  checkpoints: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export const COLLECTION_APP_LIMIT = 24;

export const appCollections: AppCollection[] = [
  {
    slug: "chatgpt-apps-for-design",
    eyebrow: "Design collection",
    title: "Best ChatGPT apps for design teams",
    description:
      "Explore ChatGPT apps and MCP-backed tools for design briefs, images, diagrams, brand assets, prototypes, and design-to-code workflows.",
    summary:
      "A focused collection for teams that want visual workflows inside ChatGPT, from asset creation to design system support.",
    updatedAt: "2026-07-12",
    platform: "chatgpt",
    categorySlugs: ["design", "figma", "prototyping", "design-to-code", "images", "presentations", "slides"],
    appIds: [
      "canva",
      "figma",
      "adobe-express",
      "adobe-photoshop",
      "shutterstock",
      "beautiful-ai",
      "awesome-slides",
      "slidesgpt",
      "genspark-ai-slides",
      "cloudinary",
    ],
    matchTerms: ["figma", "canva", "photoshop", "prototype", "diagram", "image"],
    primaryCategorySlug: "design",
    relatedLinks: [
      { label: "ChatGPT apps for design guide", href: "/learn/chatgpt-apps-for-design" },
      { label: "All ChatGPT apps", href: "/chatgpt-apps" },
      { label: "Design category", href: "/category/design" },
    ],
    checkpoints: [
      "Look for visual previews or embedded UI when the workflow depends on reviewing images, diagrams, or layouts.",
      "Prefer tools with scoped actions for edits, exports, and asset creation.",
      "Check whether the app can pass structured design data back to the assistant, not just screenshots.",
    ],
    faqs: [
      {
        question: "What makes a good ChatGPT app for design?",
        answer:
          "A strong design app gives ChatGPT structured access to assets, files, or editing actions while keeping the user in control of visual choices and final exports.",
      },
      {
        question: "Do design MCP apps need an embedded UI?",
        answer:
          "Not always, but embedded UI is especially useful for selecting variants, reviewing previews, editing structured outputs, and confirming visual changes.",
      },
    ],
  },
  {
    slug: "claude-connectors-for-databases",
    eyebrow: "Data collection",
    title: "Best Claude connectors for databases and analytics",
    description:
      "Browse Claude connectors and MCP servers for databases, warehouses, analytics dashboards, BI tools, and governed data workflows.",
    summary:
      "A practical shortlist for data teams that want Claude to query, summarize, and explain business or operational data.",
    updatedAt: "2026-07-12",
    platform: "claude",
    categorySlugs: [
      "data",
      "data-analysis",
      "analytics",
      "business-intelligence",
      "sql",
      "dashboard",
      "dashboards",
      "visualization",
      "data-science",
      "data-extraction",
      "dataset",
      "company-data",
      "market-data",
    ],
    appIds: ["airtable", "bigquery", "motherduck", "neon-postgres", "supabase", "snowflake", "databricks", "mcp360"],
    matchTerms: ["postgres", "bigquery", "snowflake", "databricks", "analytics", "dashboard", "warehouse", "sql"],
    primaryCategorySlug: "data",
    relatedLinks: [
      { label: "Claude connectors for databases guide", href: "/learn/claude-connectors-for-databases" },
      { label: "All Claude connectors", href: "/claude-connectors" },
      { label: "Data category", href: "/category/data" },
    ],
    checkpoints: [
      "Confirm whether the connector is read-only or can write back to the source system.",
      "Check auth, workspace scoping, and which tables, dashboards, or datasets Claude can reach.",
      "Prefer connectors that return structured results with enough context for follow-up analysis.",
      "Compare direct database connectors with gateway-style options when one endpoint needs to cover multiple systems.",
    ],
    faqs: [
      {
        question: "Should database connectors be read-only?",
        answer:
          "Most teams should start read-only. Write actions need clear confirmations, least-privilege access, and strong audit trails.",
      },
      {
        question: "Can Claude use MCP for analytics workflows?",
        answer:
          "Yes. MCP lets Claude connect to tools and data sources, so analytics workflows can include querying, summarizing, comparing, and explaining data when the host and connector support those actions.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-developers",
    eyebrow: "Developer collection",
    title: "Best MCP apps for developers",
    description:
      "Find MCP apps and connectors for coding, API work, testing, observability, infrastructure, browser automation, and developer workflows.",
    summary:
      "Developer-focused MCP apps help assistants read code context, inspect services, search docs, automate browsers, and operate tools with narrower context switching.",
    updatedAt: "2026-07-12",
    categorySlugs: [
      "developer-tools",
      "code",
      "write-code",
      "agentic-coding",
      "api",
      "testing",
      "devops",
      "observability",
      "monitoring",
      "logs",
      "metrics",
      "security",
      "kubernetes",
      "docker",
      "containers",
      "cloud",
      "infrastructure",
      "terminal",
      "dependencies",
      "browser",
      "web-automation",
    ],
    appIds: ["github", "openai-developers", "sourcegraph", "retool", "swagger", "latlng", "xquik", "mcp360", "databricks"],
    matchTerms: ["github", "api", "deploy", "browser", "terminal", "security", "geocoding", "social api", "gateway", "databricks"],
    primaryCategorySlug: "developer-tools",
    relatedLinks: [
      { label: "Build your first MCP app", href: "/learn/build-your-first-mcp-app" },
      { label: "Developer tools category", href: "/category/developer-tools" },
      { label: "Code category", href: "/category/code" },
    ],
    checkpoints: [
      "Look for precise tool descriptions so the assistant knows when to call each action.",
      "Prefer integrations with clear read/write boundaries for repos, tickets, deployments, and environments.",
      "Check whether local tools require install commands, remote auth, or workspace-specific setup.",
      "For gateway or multi-tool apps, verify each downstream permission instead of approving the gateway as one broad capability.",
    ],
    faqs: [
      {
        question: "Are developer MCP apps only for coding agents?",
        answer:
          "No. They can also help with docs, API exploration, monitoring, QA, release work, and infrastructure tasks.",
      },
      {
        question: "What should developers check before installing an MCP app?",
        answer:
          "Review permissions, transport, auth type, source links, and whether actions can modify files, tickets, cloud resources, or production data.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-productivity",
    eyebrow: "Workflow collection",
    title: "Best MCP apps for productivity workflows",
    description:
      "Compare MCP apps for notes, calendars, documents, project management, automation, communication, meetings, and daily work.",
    summary:
      "Productivity MCP apps are useful when assistant work needs live context from tasks, documents, meetings, or team systems.",
    updatedAt: "2026-07-12",
    categorySlugs: [
      "productivity",
      "automation",
      "project-management",
      "task-management",
      "calendar",
      "tasks",
      "meetings",
      "meeting-notes",
      "notes",
      "documents",
      "pdf",
      "docx",
      "excel",
      "email",
      "communication",
      "collaboration",
      "workflow",
    ],
    appIds: [
      "google-drive",
      "google-calendar",
      "gmail",
      "notion",
      "linear",
      "clickup",
      "dropbox",
      "asana",
      "superhuman-mail",
      "zoom",
    ],
    matchTerms: ["calendar", "notes", "meeting", "document", "workflow", "automation", "drive", "email"],
    primaryCategorySlug: "productivity",
    relatedLinks: [
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
      { label: "n8n MCP guide", href: "/learn/n8n-mcp" },
      { label: "Calendly to Claude guide", href: "/learn/calendly-to-claude" },
      { label: "Productivity category", href: "/category/productivity" },
      { label: "Automation category", href: "/category/automation" },
    ],
    checkpoints: [
      "Separate apps that only retrieve context from apps that can create, update, or send work.",
      "Check whether the app supports personal accounts, team workspaces, or both.",
      "Use example prompts to confirm the workflow matches how your team actually works.",
    ],
    faqs: [
      {
        question: "Which productivity workflows fit MCP best?",
        answer:
          "MCP fits workflows where the assistant needs live context, such as finding tasks, summarizing notes, creating follow-ups, checking calendars, or drafting from documents.",
      },
      {
        question: "How should teams evaluate productivity MCP apps?",
        answer:
          "Start with one workflow, review permissions, test example prompts, and confirm that the app returns enough context for reliable follow-up work.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-sales-and-marketing",
    eyebrow: "Growth collection",
    title: "Best MCP apps for sales and marketing",
    description:
      "Browse MCP apps for CRM, prospecting, customer research, email workflows, marketing analytics, campaign work, and sales operations.",
    summary:
      "Sales and marketing MCP apps can connect assistants to the systems where customer, campaign, and pipeline context already lives.",
    updatedAt: "2026-07-12",
    categorySlugs: [
      "sales",
      "sales-and-marketing",
      "marketing",
      "lead-generation",
      "leads",
      "b2b-data",
      "contact-data",
      "company-data",
      "email",
      "analytics",
      "business-insights",
    ],
    appIds: ["sales", "hubspot", "attio", "clay", "intercom", "highspot", "salesloft", "xquik"],
    matchTerms: ["crm", "sales", "marketing", "lead", "prospect", "campaign", "customer", "pipeline", "social"],
    primaryCategorySlug: "sales-and-marketing",
    relatedLinks: [
      { label: "Brand24 MCP guide", href: "/learn/brand24-mcp" },
      { label: "Sales and marketing category", href: "/category/sales-and-marketing" },
      { label: "Business category", href: "/category/business" },
      { label: "Submit your MCP", href: "/submit" },
    ],
    checkpoints: [
      "Check whether the app reads CRM data, writes updates, or both.",
      "Review permission scopes for customer records, email actions, and enrichment data.",
      "Look for example prompts that match real rep, marketer, or ops workflows.",
    ],
    faqs: [
      {
        question: "Can MCP apps update CRM records?",
        answer:
          "Some can, but write actions should be explicitly scoped and confirmed. Read-only research and summarization are usually safer first workflows.",
      },
      {
        question: "What is the best sales MCP app?",
        answer:
          "The best fit depends on the system of record, the permission model, and whether the workflow needs research, drafting, enrichment, or CRM updates.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-marketing-analytics",
    eyebrow: "Marketing analytics collection",
    title: "Best MCP apps for marketing analytics and SEO",
    description:
      "Compare MCP apps for brand monitoring, SEO research, AI visibility, campaign analytics, social listening, and marketing reporting workflows.",
    summary:
      "A search-focused collection for teams that want assistants to inspect marketing performance, brand visibility, and SEO signals from live tools.",
    updatedAt: "2026-07-12",
    categorySlugs: [
      "marketing",
      "sales-and-marketing",
      "seo",
      "analytics",
      "brand-monitoring",
      "social-listening",
      "social-media",
      "campaigns",
      "visibility",
      "search",
      "reporting",
      "metrics",
    ],
    appIds: [
      "brand24",
      "semrush",
      "ahrefs",
      "peec-ai",
      "supermetrics",
      "windsor-ai",
      "serpstat",
      "ubersuggest",
      "posthog",
      "polar-analytics",
      "xquik",
    ],
    matchTerms: [
      "brand24",
      "semrush",
      "ahrefs",
      "seo",
      "marketing analytics",
      "brand monitoring",
      "ai visibility",
      "campaign",
      "x",
      "twitter",
      "search analytics",
    ],
    primaryCategorySlug: "sales-and-marketing",
    relatedLinks: [
      { label: "Brand24 MCP guide", href: "/learn/brand24-mcp" },
      { label: "Sales and marketing apps", href: "/collections/mcp-apps-for-sales-and-marketing" },
      { label: "Data analytics connectors", href: "/collections/claude-connectors-for-databases" },
      { label: "Sales and marketing category", href: "/category/sales-and-marketing" },
    ],
    checkpoints: [
      "Check whether the app returns raw metrics, interpreted insights, or both.",
      "Prefer integrations that cite campaign, keyword, domain, or brand sources in the answer.",
      "Separate read-only research from actions that update campaigns, publish content, or change reporting data.",
    ],
    faqs: [
      {
        question: "Which MCP apps are useful for marketing analytics?",
        answer:
          "Useful marketing analytics apps connect assistants to SEO, brand monitoring, campaign, social listening, or reporting systems so teams can ask follow-up questions against live data.",
      },
      {
        question: "Can MCP apps help with AI visibility and GEO?",
        answer:
          "Yes, when the app exposes brand, search, citation, or visibility data. Start by comparing read-only analytics before letting assistants change marketing assets or campaigns.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-observability",
    eyebrow: "Observability collection",
    title: "Best MCP apps for observability and incident response",
    description:
      "Browse MCP apps and connectors for observability, monitoring, logs, metrics, incidents, Kubernetes, security operations, and infrastructure troubleshooting.",
    summary:
      "A developer and operations collection for teams that want assistants to inspect systems, explain incidents, and summarize operational signals.",
    updatedAt: "2026-07-12",
    categorySlugs: [
      "observability",
      "monitoring",
      "logs",
      "metrics",
      "incidents",
      "incident-response",
      "kubernetes",
      "security",
      "infrastructure",
      "devops",
      "threats",
      "pyroscope",
      "clickhouse",
    ],
    appIds: [
      "grafana-mcp-server",
      "honeycomb",
      "dynatrace-mcp-server",
      "incident-io",
      "pagerduty",
      "kubernetes-mcp-server",
      "zscaler-mcp-server",
      "panos-mcp",
      "rapid7-bulk-export",
      "mcp-instana-server",
    ],
    matchTerms: [
      "grafana",
      "pyroscope",
      "clickhouse",
      "observability",
      "monitoring",
      "incident",
      "logs",
      "metrics",
      "kubernetes",
      "zscaler",
    ],
    primaryCategorySlug: "developer-tools",
    relatedLinks: [
      { label: "Pyroscope MCP guide", href: "/learn/pyroscope-mcp" },
      { label: "Developer apps", href: "/collections/mcp-apps-for-developers" },
      { label: "Data connectors", href: "/collections/claude-connectors-for-databases" },
      { label: "Developer tools category", href: "/category/developer-tools" },
    ],
    checkpoints: [
      "Start with read-only access to dashboards, alerts, logs, and incidents before allowing remediation actions.",
      "Check whether the assistant sees the same permissions as the user or a shared service account.",
      "Prefer tools that return source links, time windows, query limits, and incident identifiers.",
    ],
    faqs: [
      {
        question: "How can MCP help observability workflows?",
        answer:
          "MCP can let an assistant query monitoring tools, summarize incidents, inspect logs, or explain metrics while keeping each action scoped to explicit tools.",
      },
      {
        question: "Should incident response MCP apps write back to systems?",
        answer:
          "Most teams should begin read-only. Write-back actions such as acknowledging incidents, changing config, or restarting services need approvals and audit trails.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-voice-and-media",
    eyebrow: "Voice and media collection",
    title: "Best MCP apps for voice, audio, and media workflows",
    description:
      "Find MCP apps for text-to-speech, transcription, voice agents, music, video, media search, creative assets, and audio-driven workflows.",
    summary:
      "A media-focused collection for assistant workflows that need speech, audio, video, creative assets, or media libraries.",
    updatedAt: "2026-07-12",
    categorySlugs: [
      "text-to-speech",
      "speech",
      "voice",
      "audio",
      "music",
      "video",
      "media",
      "transcription",
      "creative",
      "assets",
    ],
    appIds: [
      "elevenlabs-player",
      "elevenlabs-agents-mcp-app",
      "ai-voice-generator",
      "sider-recorder-transcriber",
      "speechify",
      "heygen",
      "invideo",
      "veed-fabric",
      "cloudinary",
      "apple-music",
      "spotify",
    ],
    matchTerms: [
      "text to speech",
      "text-to-speech",
      "voice",
      "audio",
      "transcription",
      "speech",
      "video",
      "media",
      "music",
      "elevenlabs",
    ],
    primaryCategorySlug: "entertainment",
    relatedLinks: [
      { label: "ChatGPT apps for design", href: "/collections/chatgpt-apps-for-design" },
      { label: "Productivity apps", href: "/collections/mcp-apps-for-productivity" },
      { label: "Entertainment category", href: "/category/entertainment" },
    ],
    checkpoints: [
      "Check whether the app creates media, searches media, transcribes media, or only opens a provider workflow.",
      "Review rights, export limits, and whether generated audio or video can be used commercially.",
      "Prefer apps with previews or examples when voice quality, timing, or media output matters.",
    ],
    faqs: [
      {
        question: "What are voice and media MCP apps good for?",
        answer:
          "They can help assistants create voice assets, transcribe audio, search media libraries, draft video workflows, or connect to entertainment and creative tools.",
      },
      {
        question: "Should teams review generated media before publishing?",
        answer:
          "Yes. Voice, audio, and video workflows should keep human review in the loop for rights, accuracy, brand fit, and final publishing decisions.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-finance-teams",
    eyebrow: "Finance collection",
    title: "Best MCP apps for finance teams",
    description:
      "Compare MCP apps for accounting, market research, business finance, payments, tax workflows, banking, and financial analysis.",
    summary:
      "A finance-focused collection for teams that need assistant access to live numbers, documents, analysis, and financial systems.",
    updatedAt: "2026-07-12",
    categorySlugs: [
      "finance",
      "financial-services",
      "accounting",
      "invoicing",
      "bookkeeping",
      "reconciliation",
      "tax",
      "invoice",
      "market-data",
      "stocks",
      "trading",
      "crypto",
      "business-insights",
    ],
    appIds: [
      "quickbooks",
      "intuit-turbotax",
      "paypal",
      "ramp",
      "brex",
      "bankrate",
      "morningstar",
      "pitchbook",
      "quartr",
      "aiera",
      "kraken",
      "cube",
      "daloopa",
      "gusto",
    ],
    matchTerms: ["accounting", "finance", "financial", "invoice", "tax", "payment", "market", "stock", "trading"],
    primaryCategorySlug: "finance",
    relatedLinks: [
      { label: "Morningstar MCP guide", href: "/learn/morningstar-mcp" },
      { label: "Finance category", href: "/category/finance" },
      { label: "Financial services category", href: "/category/financial-services" },
      { label: "Data collection", href: "/collections/claude-connectors-for-databases" },
    ],
    checkpoints: [
      "Check whether the app is read-only or can move money, update books, or change financial records.",
      "Prefer tools with clear audit trails and scoped access to accounts, reports, invoices, or market data.",
      "Use example prompts to confirm that the app explains assumptions behind financial analysis.",
    ],
    faqs: [
      {
        question: "What makes a finance MCP app useful?",
        answer:
          "A useful finance app connects assistants to trusted financial data or workflows while keeping permissions narrow, auditable, and easy to review.",
      },
      {
        question: "Should finance MCP apps allow write actions?",
        answer:
          "Start with read-only access when possible. Write actions such as sending payments, updating books, or filing forms need explicit confirmation and strong controls.",
      },
    ],
  },
  {
    slug: "mcp-apps-for-travel-planning",
    eyebrow: "Travel collection",
    title: "Best MCP apps for travel planning",
    description:
      "Browse MCP apps for flights, hotels, tours, maps, rentals, reservations, itinerary planning, and destination research.",
    summary:
      "Travel MCP apps help assistants move from broad trip ideas to concrete options across places to stay, ways to get around, and things to do.",
    updatedAt: "2026-07-12",
    categorySlugs: ["travel", "lifestyle", "maps", "routing", "geocoding", "vacation-rental", "airbnb"],
    appIds: [
      "booking-com",
      "expedia",
      "airbnb-search-listings",
      "tripadvisor",
      "skyscanner",
      "getyourguide",
      "viator",
      "klook",
      "omio",
      "priceline",
      "hyatt",
      "alltrails",
      "atlys",
      "makemytrip",
      "latlng",
    ],
    matchTerms: ["travel", "hotel", "flight", "trip", "itinerary", "booking", "rental", "tour", "maps", "geocoding", "places"],
    primaryCategorySlug: "travel",
    relatedLinks: [
      { label: "Travel category", href: "/category/travel" },
      { label: "Lifestyle category", href: "/category/lifestyle" },
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
    ],
    checkpoints: [
      "Check whether the app can compare options or only search one provider.",
      "Look for clear location, date, budget, and preference handling before booking or reserving.",
      "Prefer apps that keep confirmation steps explicit for purchases, reservations, or itinerary changes.",
    ],
    faqs: [
      {
        question: "Can MCP apps book travel directly?",
        answer:
          "Some travel apps can send users into booking flows, while others focus on search and comparison. Always review final prices, dates, and policies before confirming.",
      },
      {
        question: "Which travel workflows fit MCP best?",
        answer:
          "MCP fits itinerary research, comparing hotels or activities, finding routes, checking availability, and turning preferences into shortlists.",
      },
    ],
  },
  {
    slug: "chatgpt-apps-for-productivity",
    eyebrow: "ChatGPT collection",
    title: "Best ChatGPT apps for productivity",
    description:
      "Find ChatGPT apps for documents, notes, slides, files, project work, task workflows, collaboration, and everyday productivity.",
    summary:
      "A ChatGPT-focused shortlist for people who want the assistant to create, organize, summarize, and act on daily work artifacts.",
    updatedAt: "2026-07-12",
    platform: "chatgpt",
    categorySlugs: [
      "productivity",
      "documents",
      "document",
      "pdf",
      "presentations",
      "slides",
      "notes",
      "tasks",
      "project-management",
      "collaboration",
      "communication",
      "automation",
    ],
    appIds: [
      "adobe-acrobat",
      "google-drive",
      "canva",
      "ace-knowledge-graph",
      "ace-quiz-maker",
      "awesome-slides",
      "beautiful-ai",
      "box",
      "dropbox",
      "asana",
      "notion",
      "google-calendar",
      "gmail",
      "linear",
      "clickup",
      "slack",
    ],
    matchTerms: ["document", "pdf", "slides", "notes", "task", "calendar", "drive", "workspace", "meeting"],
    primaryCategorySlug: "productivity",
    relatedLinks: [
      { label: "All ChatGPT apps", href: "/chatgpt-apps" },
      { label: "Productivity category", href: "/category/productivity" },
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
    ],
    checkpoints: [
      "Separate apps that create new work from apps that only retrieve or summarize existing work.",
      "Check whether the app supports the files, workspaces, or team systems you already use.",
      "Look for examples that show the assistant returning structured outputs, not just generic summaries.",
    ],
    faqs: [
      {
        question: "What is a productivity ChatGPT app?",
        answer:
          "It is an app that lets ChatGPT work with everyday tasks such as files, documents, notes, slides, messages, or project data through a supported integration.",
      },
      {
        question: "How should I choose a productivity app for ChatGPT?",
        answer:
          "Start from the work artifact you use most often, then check permissions, example prompts, and whether the app can create or update work safely.",
      },
    ],
  },
];

export function getAppCollection(slug: string): AppCollection | undefined {
  return appCollections.find((collection) => collection.slug === slug);
}

export function featuredAppCollections(limit = 4): AppCollection[] {
  return appCollections.slice(0, limit);
}

function searchableAppText(app: CatalogApp): string {
  return [
    app.name,
    app.tagline,
    app.publisher,
    ...app.categories,
    ...app.capabilities,
    ...app.surfaces.flatMap((surface) => [
      surface.platform,
      surface.type,
      surface.displayName ?? "",
      surface.tagline ?? "",
      ...(surface.capabilities ?? []),
      ...(surface.tools ?? []).map((tool) => tool.name),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function includesSearchTerm(text: string, term: string): boolean {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

export function collectionMatchesApp(collection: AppCollection, app: CatalogApp): boolean {
  if (collection.platform && !app.surfaces.some((surface) => surface.platform === collection.platform)) {
    return false;
  }

  if (collection.appIds?.includes(app.id)) {
    return true;
  }

  const categories = new Set(app.categories);
  if (collection.categorySlugs.some((slug) => categories.has(slug))) {
    return true;
  }

  const text = searchableAppText(app);
  return collection.matchTerms.some((term) => includesSearchTerm(text, term));
}

export function listCollectionApps(collection: AppCollection, apps: CatalogApp[]): CatalogApp[] {
  return apps.filter((app) => collectionMatchesApp(collection, app));
}
