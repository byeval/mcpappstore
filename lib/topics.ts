import type { CatalogApp } from "@/lib/types";

export interface McpTopic {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  summary: string;
  keywords: string[];
  categorySlugs: string[];
  matchTerms: string[];
  checks: string[];
  prompts: string[];
}

export const mcpTopics: McpTopic[] = [
  {
    slug: "browser-automation-mcp",
    title: "Browser Automation MCP",
    shortTitle: "Browser automation",
    description: "Find MCP apps and servers for browser control, screenshots, scraping, web QA, and logged-in workflow automation.",
    summary: "Compare browser automation tools for agents that need to inspect real pages, collect evidence, and operate web interfaces.",
    keywords: ["browser", "chrome", "playwright", "web scraping", "screenshot", "automation"],
    categorySlugs: ["browser", "web-automation", "web-scraping", "testing", "developer-tools"],
    matchTerms: ["browser", "chrome", "playwright", "scrape", "screenshot", "web automation", "web scraping"],
    checks: [
      "Separate page inspection from clicks that submit, buy, delete, or publish.",
      "Prefer tools that return URLs, screenshots, console logs, or extracted records.",
      "Check whether the workflow uses a local browser session, remote browser, or hosted scraping API.",
    ],
    prompts: [
      "Open this page, inspect the signup flow, and summarize any broken UI states with screenshots.",
      "Extract product names and prices from this page, then return a structured table with source URLs.",
    ],
  },
  {
    slug: "rag-mcp",
    title: "RAG MCP",
    shortTitle: "RAG",
    description: "Compare MCP apps for retrieval-augmented generation, vector search, embeddings, knowledge bases, and source-grounded answers.",
    summary: "RAG MCP tools help assistants retrieve current or private context before answering.",
    keywords: ["rag", "retrieval", "vector", "embeddings", "knowledge base", "search"],
    categorySlugs: ["search", "data", "documents", "knowledge-base", "cloud-storage"],
    matchTerms: ["rag", "retrieval", "vector", "embedding", "knowledge", "semantic", "search"],
    checks: [
      "Confirm whether answers include citations, document IDs, or source links.",
      "Check indexing boundaries before connecting private workspaces.",
      "Review retention and deletion behavior for embedded documents.",
    ],
    prompts: [
      "Find the policy documents that answer this question and cite each source.",
      "Compare these two internal docs and list conflicting guidance with links.",
    ],
  },
  {
    slug: "openapi-mcp",
    title: "OpenAPI MCP",
    shortTitle: "OpenAPI",
    description: "Find MCP servers that turn OpenAPI specs, REST APIs, developer docs, and schemas into agent-usable tools.",
    summary: "OpenAPI MCP servers are useful when agents need safe, typed access to product APIs.",
    keywords: ["openapi", "api", "swagger", "rest", "developer docs"],
    categorySlugs: ["api", "developer-tools", "code"],
    matchTerms: ["openapi", "swagger", "api", "rest", "schema", "developer docs"],
    checks: [
      "Prefer narrow endpoint groups over one broad API executor.",
      "Make auth scopes visible before exposing write endpoints.",
      "Verify rate limits and error reporting in tool responses.",
    ],
    prompts: [
      "Read this API schema and identify the safest tool set for a read-only assistant.",
      "Call the docs/search endpoint, then explain the returned object shape.",
    ],
  },
  {
    slug: "pdf-mcp",
    title: "PDF MCP",
    shortTitle: "PDF",
    description: "Compare MCP apps for PDF parsing, extraction, OCR, conversion, summarization, annotations, and document review.",
    summary: "PDF MCP tools help agents inspect file content while keeping source documents and page context visible.",
    keywords: ["pdf", "ocr", "document", "extraction", "converter"],
    categorySlugs: ["documents", "pdf", "productivity"],
    matchTerms: ["pdf", "ocr", "document", "extract", "converter", "annotation"],
    checks: [
      "Confirm whether the app uploads, stores, or only reads files.",
      "Prefer page citations for legal, finance, or research documents.",
      "Separate read/extract workflows from edit, sign, or share actions.",
    ],
    prompts: [
      "Summarize this PDF with page-level citations and unresolved questions.",
      "Extract all dates, parties, obligations, and payment terms into a table.",
    ],
  },
  {
    slug: "coding-agent-mcp",
    title: "Coding Agent MCP",
    shortTitle: "Coding agents",
    description: "Build a practical MCP stack for coding agents with repository context, docs search, browser QA, deployment tools, and issue workflows.",
    summary: "Coding agent MCP tools reduce context switching across repos, docs, CI, browsers, and deployment systems.",
    keywords: ["coding agent", "github", "code", "developer tools", "docs", "testing"],
    categorySlugs: ["developer-tools", "code", "testing", "version-control"],
    matchTerms: ["github", "code", "repo", "pull request", "docs", "testing", "browser", "deploy"],
    checks: [
      "Keep file mutation tools separate from read-only repo context.",
      "Check whether commands run locally, remotely, or in a sandbox.",
      "Require evidence for bug reproduction and test results.",
    ],
    prompts: [
      "Find the code path for this bug, inspect related issues, and propose a test plan.",
      "Open the local app, reproduce the UI issue, and capture screenshot evidence.",
    ],
  },
  {
    slug: "database-mcp",
    title: "Database MCP",
    shortTitle: "Database",
    description: "Compare MCP connectors for Postgres, warehouses, SQL, BI tools, schema inspection, and governed data workflows.",
    summary: "Database MCP tools let assistants answer with live structured data while preserving auth and audit boundaries.",
    keywords: ["database", "sql", "postgres", "bigquery", "warehouse", "analytics"],
    categorySlugs: ["data", "database", "sql", "analytics", "business-intelligence"],
    matchTerms: ["database", "sql", "postgres", "bigquery", "warehouse", "analytics", "schema"],
    checks: [
      "Start with read-only tools and curated queries.",
      "Confirm row, workspace, table, or project-level scoping.",
      "Log query text, result limits, and user identity for audits.",
    ],
    prompts: [
      "Inspect the schema and draft a read-only query for this metric.",
      "Explain why this metric changed using source tables and time windows.",
    ],
  },
  {
    slug: "workflow-automation-mcp",
    title: "Workflow Automation MCP",
    shortTitle: "Workflow automation",
    description: "Compare MCP tools for multi-step business workflows, approvals, n8n, Zapier, Make, and action orchestration.",
    summary: "Workflow automation MCP servers help assistants inspect, draft, and operate automations with approval points.",
    keywords: ["workflow", "automation", "zapier", "n8n", "make", "actions"],
    categorySlugs: ["automation", "productivity", "developer-tools"],
    matchTerms: ["workflow", "automation", "zapier", "n8n", "make", "scenario", "actions"],
    checks: [
      "Separate workflow search and explanation from run/update/delete actions.",
      "Require confirmations for automations that send messages or mutate production data.",
      "Check event triggers, connected accounts, and audit logs.",
    ],
    prompts: [
      "Find automations touching this app and summarize risky steps.",
      "Draft a new workflow, but do not enable it until I approve each action.",
    ],
  },
  {
    slug: "devops-mcp",
    title: "DevOps MCP",
    shortTitle: "DevOps",
    description: "Find MCP apps for deployments, cloud accounts, CI/CD, containers, infrastructure, logs, incidents, and runtime operations.",
    summary: "DevOps MCP tools give agents operational context without handing over broad production control.",
    keywords: ["devops", "cloud", "deployment", "infrastructure", "kubernetes", "ci"],
    categorySlugs: ["devops", "cloud", "infrastructure", "observability", "developer-tools"],
    matchTerms: ["deploy", "cloud", "infrastructure", "kubernetes", "docker", "ci", "logs", "incident"],
    checks: [
      "Start with read-only inspection of environments, logs, and config.",
      "Separate deploy/restart/delete actions behind explicit confirmation.",
      "Keep production and sandbox credentials distinct.",
    ],
    prompts: [
      "Summarize the failed deployment and list source logs or checks.",
      "Find related incidents, dashboards, and recent config changes for this service.",
    ],
  },
  {
    slug: "security-mcp",
    title: "Security MCP",
    shortTitle: "Security",
    description: "Compare MCP apps for security scanning, compliance context, secrets, identity, malware checks, and policy review.",
    summary: "Security MCP tools should be evaluated by scope, evidence, and whether they can alter protected systems.",
    keywords: ["security", "compliance", "secrets", "malware", "identity", "policy"],
    categorySlugs: ["security", "developer-tools"],
    matchTerms: ["security", "compliance", "secret", "malware", "identity", "policy", "vulnerability"],
    checks: [
      "Keep detection, triage, and remediation tools separately permissioned.",
      "Require source evidence for risk claims.",
      "Review how sensitive findings are logged or retained.",
    ],
    prompts: [
      "Scan this dependency report and rank vulnerabilities by exploitability and fix path.",
      "Check this URL, email, or file indicator and show the evidence behind the verdict.",
    ],
  },
  {
    slug: "finance-mcp",
    title: "Finance MCP",
    shortTitle: "Finance",
    description: "Find MCP apps for accounting, payments, invoices, market data, credit, taxes, and financial operations.",
    summary: "Finance MCP tools need strong source clarity, read/write separation, and human review before money movement.",
    keywords: ["finance", "market data", "payments", "accounting", "invoices", "tax"],
    categorySlugs: ["finance", "financial-services", "market-data", "payments"],
    matchTerms: ["finance", "market", "payment", "invoice", "accounting", "tax", "stock", "credit"],
    checks: [
      "Separate research and summaries from payment or trading actions.",
      "Check timestamps and source links for market data.",
      "Require human review for regulated or money-moving workflows.",
    ],
    prompts: [
      "Summarize this account's recent transactions and flag unusual changes.",
      "Compare market data for these companies with source timestamps.",
    ],
  },
  {
    slug: "marketing-automation-mcp",
    title: "Marketing Automation MCP",
    shortTitle: "Marketing automation",
    description: "Compare MCP tools for campaigns, SEO, ads, content workflows, social listening, and marketing analytics.",
    summary: "Marketing MCP tools help agents bring campaign, search, social, and analytics context into planning workflows.",
    keywords: ["marketing", "seo", "ads", "campaign", "social", "analytics"],
    categorySlugs: ["marketing", "sales-and-marketing", "analytics", "social-media"],
    matchTerms: ["marketing", "seo", "ad", "campaign", "social", "brand", "analytics"],
    checks: [
      "Separate analytics and drafting from publish/send actions.",
      "Check source channels and date windows before trusting summaries.",
      "Use approved brand and compliance guidance for generated copy.",
    ],
    prompts: [
      "Summarize brand mentions from this week and group them by theme.",
      "Draft campaign variants using our approved messaging, but do not publish.",
    ],
  },
  {
    slug: "customer-operations-mcp",
    title: "Customer Operations MCP",
    shortTitle: "Customer ops",
    description: "Find MCP apps for CRM, support, customer success, email, billing, account research, and revenue workflows.",
    summary: "Customer operations MCP tools connect agents to account context while keeping external communication reviewed.",
    keywords: ["crm", "support", "sales", "customer success", "billing", "email"],
    categorySlugs: ["sales-and-marketing", "crm", "customer-support", "communication"],
    matchTerms: ["crm", "customer", "support", "sales", "billing", "email", "account", "deal"],
    checks: [
      "Separate drafting from sending customer messages.",
      "Respect CRM ownership, territory, and workspace permissions.",
      "Prefer answers that link to source records and conversation history.",
    ],
    prompts: [
      "Prepare an account brief from CRM, notes, support tickets, and recent meetings.",
      "Find stale deals or open customer risks and suggest next actions.",
    ],
  },
];

export function getMcpTopic(slug: string): McpTopic | undefined {
  return mcpTopics.find((topic) => topic.slug === slug);
}

function appSearchText(app: CatalogApp): string {
  return [
    app.id,
    app.name,
    app.tagline,
    app.description,
    app.publisher,
    app.mcpEndpoint,
    app.installCmd,
    app.repoUrl,
    ...app.categories,
    ...app.tags,
    ...app.capabilities,
    ...app.tools.map((tool) => `${tool.name} ${tool.description ?? ""}`),
    ...app.surfaces.flatMap((surface) => [
      surface.displayName ?? "",
      surface.tagline ?? "",
      surface.description ?? "",
      ...(surface.capabilities ?? []),
      ...(surface.examplePrompts ?? []),
      ...(surface.tools ?? []).map((tool) => `${tool.name} ${tool.description ?? ""}`),
    ]),
  ].join(" ").toLowerCase();
}

export function listTopicApps(topic: McpTopic, apps: CatalogApp[], limit?: number): CatalogApp[] {
  const scored = apps
    .map((app) => {
      const text = appSearchText(app);
      const categoryScore = topic.categorySlugs.filter((slug) => app.categories.includes(slug)).length * 12;
      const termScore = topic.matchTerms.filter((term) => text.includes(term.toLowerCase())).length * 5;
      const metadataScore = (app.tools.length > 0 ? 3 : 0) + (app.mcpEndpoint ? 2 : 0) + (app.repoUrl ? 1 : 0);
      return { app, score: categoryScore + termScore + metadataScore };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.app.updatedAt - left.app.updatedAt || left.app.name.localeCompare(right.app.name));

  return scored.slice(0, limit ?? scored.length).map((item) => item.app);
}

export const popularSearches = [
  "Atlassian",
  "AWS",
  "Chrome DevTools",
  "Cloudflare",
  "Datadog",
  "Figma",
  "GitHub",
  "Gmail",
  "Google Drive",
  "Jira",
  "Linear",
  "n8n",
  "Notion",
  "Playwright",
  "Postgres",
  "Salesforce",
  "Sentry",
  "Slack",
  "Stripe",
  "Supabase",
  "Zapier",
];
