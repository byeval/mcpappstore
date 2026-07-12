export interface LearnSource {
  label: string;
  url: string;
}

export interface LearnLink {
  label: string;
  href: string;
}

export interface LearnSection {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
  steps?: string[];
  code?: string;
  callout?: string;
}

export interface LearnFaq {
  question: string;
  answer: string;
}

export interface LearnArticle {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  readingTime: string;
  updatedAt: string;
  intent: "guide" | "tutorial" | "faq" | "use-case";
  topics: string[];
  featuredAppIds?: string[];
  primaryCta?: LearnLink;
  secondaryCta?: LearnLink;
  relatedLinks: LearnLink[];
  sections: LearnSection[];
  faqs?: LearnFaq[];
  sources: LearnSource[];
}

export const learnArticles: LearnArticle[] = [
  {
    slug: "what-is-an-mcp-app",
    eyebrow: "MCP basics",
    title: "What is an MCP app?",
    description:
      "A plain-language guide to MCP apps, MCP servers, ChatGPT apps, and Claude connectors.",
    summary:
      "Understand the difference between the user-facing app, the MCP server behind it, and the host where the app runs.",
    readingTime: "5 min read",
    updatedAt: "2026-07-12",
    intent: "guide",
    topics: ["MCP", "ChatGPT apps", "Claude connectors"],
    primaryCta: { label: "Browse MCP apps", href: "/" },
    secondaryCta: { label: "Submit your MCP", href: "/submit" },
    relatedLinks: [
      { label: "How to build your first MCP app", href: "/learn/build-your-first-mcp-app" },
      { label: "Best MCP app collections", href: "/collections" },
      { label: "MCP app FAQ", href: "/faq" },
      { label: "Listing guidance", href: "/docs" },
    ],
    sections: [
      {
        id: "definition",
        title: "The short definition",
        body: [
          "An MCP app is a product experience that lets an AI assistant reach outside the chat window. It usually combines a name, description, tools, permissions, and sometimes an embedded UI. The technical layer underneath is an MCP server.",
          "The server exposes capabilities through the Model Context Protocol, while a host such as ChatGPT, Claude, Claude Code, desktop clients, or another MCP-compatible client decides how those capabilities appear to the user.",
        ],
        callout:
          "On this directory, we use app for the listing people browse, and server for the backend endpoint that exposes tools.",
      },
      {
        id: "parts",
        title: "The three parts",
        body: [
          "Most MCP apps have three practical layers. Keeping them separate makes the whole ecosystem easier to understand.",
        ],
        bullets: [
          "The app listing: name, icon, tagline, categories, examples, links, and platform surfaces.",
          "The MCP server: tools, auth, transport, schemas, and the code that reads or writes external systems.",
          "The host surface: ChatGPT apps, Claude connectors, Claude Code, IDEs, or other clients that connect to the server.",
        ],
      },
      {
        id: "why-it-matters",
        title: "Why MCP matters",
        body: [
          "Before MCP, every AI app often needed a custom integration path. MCP gives builders a common way to expose tools, data, and workflows to multiple AI hosts.",
          "That means a calendar, database, design tool, CRM, codebase, or analytics product can be made available to assistants in a predictable way instead of rebuilding the same connector again and again.",
        ],
      },
      {
        id: "chatgpt-vs-claude",
        title: "ChatGPT apps vs Claude connectors",
        body: [
          "A ChatGPT app is a ChatGPT-facing experience built on an MCP server, and it can optionally include an embedded UI. A Claude connector is a Claude-facing connection to an MCP server or service that gives Claude access to external context and tools. Some newer listings, such as MCP360-style gateways, are best evaluated by the surfaces they expose rather than by a single host label.",
          "Many products can support both. The useful question is not which label is better, but which host your users already work in and which actions your server can safely perform.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is an MCP app the same thing as an MCP server?",
        answer:
          "No. The MCP server is the technical backend that exposes tools and data. The app is the user-facing product surface that people discover, evaluate, and connect.",
      },
      {
        question: "Do MCP apps need a visual UI?",
        answer:
          "No. A tool-only server can still be useful. A UI helps when users need to inspect, compare, select, or edit structured results.",
      },
      {
        question: "Can one MCP server work across multiple AI clients?",
        answer:
          "Yes, that is the point of the protocol. Hosts may differ in capabilities and review rules, but the server contract can be shared.",
      },
    ],
    sources: [
      {
        label: "Model Context Protocol introduction",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
      {
        label: "OpenAI Apps SDK overview",
        url: "https://developers.openai.com/apps-sdk",
      },
      {
        label: "OpenAI Apps SDK MCP concept",
        url: "https://developers.openai.com/apps-sdk/concepts/mcp-server",
      },
    ],
  },
  {
    slug: "build-your-first-mcp-app",
    eyebrow: "Builder tutorial",
    title: "How to build your first MCP app",
    description:
      "A practical first-build checklist for planning an MCP server, defining tools, adding an optional ChatGPT UI, and preparing a listing.",
    summary:
      "Start with one safe workflow, define a small tool contract, add auth and testing, then package the result for discovery.",
    readingTime: "8 min read",
    updatedAt: "2026-07-12",
    intent: "tutorial",
    topics: ["MCP server", "Apps SDK", "builder checklist"],
    primaryCta: { label: "Submit a listing", href: "/submit" },
    secondaryCta: { label: "Read listing guidance", href: "/docs" },
    relatedLinks: [
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
      { label: "Best MCP apps for developers", href: "/collections/mcp-apps-for-developers" },
      { label: "OpenAI Apps SDK quickstart", href: "https://developers.openai.com/apps-sdk/quickstart" },
      { label: "Official MCP SDKs", href: "https://modelcontextprotocol.io/docs/sdk" },
    ],
    sections: [
      {
        id: "pick-workflow",
        title: "1. Pick one workflow",
        body: [
          "The easiest first app is not a whole product. It is one narrow workflow with a clear before and after: search records, summarize a project, create a task, update a design, or query a database.",
          "Write the user promise in one sentence before you write code. If the promise needs more than one sentence, split it into smaller tools. Recent submissions such as LatLng and MCP360 are good reminders that small, clearly-scoped utility apps can be more useful than broad bundles.",
        ],
        bullets: [
          "Good first workflow: Search open support tickets and summarize the top blockers.",
          "Risky first workflow: Give the model full access to every customer system and hope it chooses safely.",
          "Best first milestone: One read-only tool, one happy path, one useful result shape.",
        ],
      },
      {
        id: "tool-contract",
        title: "2. Define the tool contract",
        body: [
          "An MCP tool should have a name the model can understand, a concise description, and a typed input schema. The description is part of the product surface because the model uses it to decide when the tool is relevant.",
        ],
        code: `{
  "name": "search_projects",
  "description": "Search active projects by customer, owner, status, or keyword.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "status": { "type": "string", "enum": ["active", "blocked", "done"] }
    },
    "required": ["query"]
  }
}`,
      },
      {
        id: "server",
        title: "3. Build the server",
        body: [
          "Use an official MCP SDK when possible. The official MCP docs list SDKs for TypeScript, Python, C#, Go, Java, Rust, and other languages.",
          "For a ChatGPT app, OpenAI's Apps SDK flow expects an MCP server and can render an optional iframe UI. Start locally, then deploy the server over an HTTP transport when you are ready to connect from hosted clients.",
        ],
        steps: [
          "Create the MCP server project.",
          "Register your first read-only tool.",
          "Return structured content that the model and UI can both use.",
          "Add auth only after the tool shape is stable.",
          "Log tool calls and errors without storing unnecessary user data.",
        ],
      },
      {
        id: "ui",
        title: "4. Add UI only where it helps",
        body: [
          "A UI is useful when users need to inspect structured output, compare options, or make a precise selection. It is not required for every MCP app.",
          "For ChatGPT apps, the UI runs in an iframe and communicates with the host through the MCP Apps bridge. Keep the UI focused: one result view, one clear action, and no hidden surprises.",
        ],
      },
      {
        id: "ship",
        title: "5. Prepare for review and discovery",
        body: [
          "Your listing should explain what the app can read, what it can write, which platforms it supports, what auth it uses, and which examples prove the workflow.",
          "Good SEO and good review materials overlap: precise title, plain-language description, screenshots or previews, privacy links, support links, and honest capability labels.",
        ],
        bullets: [
          "Add homepage, privacy, terms, and support URLs.",
          "List every platform surface separately: ChatGPT app, Claude connector, Claude Code, desktop client, or another host.",
          "Include example prompts that show real use, not marketing claims.",
          "Prefer least-privilege OAuth scopes and read-only first releases.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should my first MCP app be read-only?",
        answer:
          "Usually yes. Read-only tools are easier to test, review, and trust. Add write actions after you have clear confirmations and auth boundaries.",
      },
      {
        question: "Which language should I use?",
        answer:
          "Use the language your backend team can maintain. The official MCP docs list SDKs for TypeScript, Python, C#, Go, Java, Rust, and more.",
      },
      {
        question: "Do I need a ChatGPT UI component?",
        answer:
          "Only if the workflow benefits from an embedded interface. Search results, galleries, comparison tables, editors, and dashboards are good UI candidates.",
      },
    ],
    sources: [
      {
        label: "OpenAI Apps SDK quickstart",
        url: "https://developers.openai.com/apps-sdk/quickstart",
      },
      {
        label: "OpenAI guide to building an MCP server",
        url: "https://developers.openai.com/apps-sdk/build/mcp-server",
      },
      {
        label: "Official MCP SDKs",
        url: "https://modelcontextprotocol.io/docs/sdk",
      },
    ],
  },
  {
    slug: "chatgpt-apps-for-design",
    eyebrow: "Use-case guide",
    title: "ChatGPT apps for design teams",
    description:
      "A guide to design-focused ChatGPT apps for briefs, assets, diagrams, image editing, brand work, and design-to-code workflows.",
    summary:
      "Compare design app patterns and know when to use a visual ChatGPT app instead of a general prompt.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["ChatGPT apps", "design", "creative workflows"],
    featuredAppIds: ["canva", "figma", "adobe-express", "adobe-photoshop", "shutterstock", "miro"],
    primaryCta: { label: "Browse design apps", href: "/category/design" },
    secondaryCta: { label: "Browse ChatGPT apps", href: "/chatgpt-apps" },
    relatedLinks: [
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
      { label: "Best ChatGPT apps for design teams", href: "/collections/chatgpt-apps-for-design" },
      { label: "Build your first MCP app", href: "/learn/build-your-first-mcp-app" },
      { label: "Submit a design MCP", href: "/submit" },
    ],
    sections: [
      {
        id: "when-to-use",
        title: "When a design app is better than a prompt",
        body: [
          "A design-focused ChatGPT app is useful when the work needs assets, previews, project context, or an action inside a design system. A normal prompt can draft ideas, but an app can search files, open brand assets, modify images, create diagrams, or hand off structured output.",
          "The best apps reduce hand-copying. They turn a conversation into a concrete object that a designer, marketer, or product manager can keep working with.",
        ],
      },
      {
        id: "patterns",
        title: "Common design workflows",
        body: [
          "Most useful design apps fit into a few repeatable patterns. Use the pattern to choose the app, then judge the result by how little cleanup it needs.",
          "The directory now also tracks skills and client surfaces, so design teams can compare a visual ChatGPT app with a coding or frontend-design skill when the work ends in production UI.",
        ],
        bullets: [
          "Brief to first draft: turn a campaign idea into a post, deck, wireframe, or moodboard.",
          "Asset search: find stock images, brand files, icons, references, or prior work.",
          "Design editing: remove backgrounds, resize, retouch, rewrite copy, or generate variants.",
          "Diagramming: create flows, maps, slide outlines, and system diagrams from a natural-language brief.",
          "Design-to-code: convert visual direction into HTML, CSS, components, or product prototypes.",
        ],
      },
      {
        id: "evaluation",
        title: "How to evaluate design apps",
        body: [
          "Do not judge only the first image or first draft. Judge the app by control, reversibility, export paths, brand safety, and whether the result can be edited in the system where your team already works.",
        ],
        bullets: [
          "Does it preserve brand colors, fonts, and approved assets?",
          "Can you inspect or edit the result after generation?",
          "Does it link back to the source design or file?",
          "Can it explain what changed?",
          "Does it avoid writing to production assets without confirmation?",
        ],
      },
    ],
    faqs: [
      {
        question: "Are ChatGPT design apps only for image generation?",
        answer:
          "No. Many design workflows are about search, editing, diagrams, presentations, asset management, and design-to-code handoff.",
      },
      {
        question: "Which design app should I try first?",
        answer:
          "Start with the app that already matches your system of record. Canva, Figma, Adobe tools, Miro, and stock libraries solve different parts of the workflow.",
      },
    ],
    sources: [
      {
        label: "OpenAI Apps SDK UI guidance",
        url: "https://developers.openai.com/apps-sdk/build/chatgpt-ui",
      },
      {
        label: "MCP Apps compatibility in ChatGPT",
        url: "https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt",
      },
    ],
  },
  {
    slug: "claude-connectors-for-databases",
    eyebrow: "Use-case guide",
    title: "Claude connectors for databases and data teams",
    description:
      "How to evaluate Claude connectors and MCP servers for databases, warehouses, analytics tools, and internal data workflows.",
    summary:
      "Use Claude connectors for data access when you need governed context, scoped tools, and conversational analysis.",
    readingTime: "7 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["Claude connectors", "databases", "analytics"],
    featuredAppIds: ["airtable", "bigquery", "motherduck", "neon-postgres", "supabase", "notion"],
    primaryCta: { label: "Browse data apps", href: "/category/data" },
    secondaryCta: { label: "Browse Claude connectors", href: "/claude-connectors" },
    relatedLinks: [
      { label: "Build your first MCP app", href: "/learn/build-your-first-mcp-app" },
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
      { label: "Best Claude connectors for databases", href: "/collections/claude-connectors-for-databases" },
      { label: "Submit a data connector", href: "/submit" },
    ],
    sections: [
      {
        id: "fit",
        title: "Where database connectors fit",
        body: [
          "Database and analytics connectors let Claude answer questions with live or governed context instead of relying on pasted exports. The connector should expose specific tools, not unrestricted database access.",
          "For teams, the value is not just asking questions. It is keeping permissions, auditability, and repeatable tool contracts around the data Claude can reach.",
        ],
      },
      {
        id: "safe-shape",
        title: "A safe shape for data tools",
        body: [
          "Good data connectors start with narrow read-only tools, then add write actions only where the user can review and confirm the change. The model should not need raw credentials, and users should not need to paste sensitive database dumps into chat.",
        ],
        bullets: [
          "Use scoped auth tied to the user's identity.",
          "Prefer curated query tools over arbitrary SQL at first.",
          "Return summarized tables with source IDs so users can inspect details.",
          "Log tool calls and errors for debugging and audit.",
          "Add row, workspace, or project limits before broad rollout.",
        ],
      },
      {
        id: "workflows",
        title: "High-value workflows",
        body: [
          "The best database connectors help users ask better operational questions, not just run queries. They combine search, structured retrieval, and explanation.",
        ],
        bullets: [
          "Ask why a metric moved and pull the supporting slices.",
          "Summarize customer records before a meeting.",
          "Find stale projects, blocked tasks, or missing owners.",
          "Generate a draft SQL query, explain assumptions, and show the result.",
          "Compare warehouse data with docs, tickets, or CRM context.",
        ],
      },
      {
        id: "evaluation",
        title: "What to check before connecting",
        body: [
          "Data connectors deserve stricter review than simple content apps. Before you connect a production database, check the transport, auth type, permission model, privacy policy, support path, and the exact tools exposed by the MCP server.",
          "The current catalog includes both product connectors and skill-driven data workflows, including Databricks-related skills, so teams should evaluate the host, the data boundary, and the execution environment together.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should a database MCP server allow arbitrary SQL?",
        answer:
          "Not by default. Start with scoped, read-only tools and curated queries. Arbitrary SQL can be useful for expert workflows, but it needs strong auth, logging, limits, and review.",
      },
      {
        question: "Can one data connector work in both Claude and ChatGPT?",
        answer:
          "Often yes. MCP is designed as a shared protocol, but each host can have different UI, auth, and review requirements.",
      },
    ],
    sources: [
      {
        label: "Model Context Protocol introduction",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
      {
        label: "Anthropic MCP connector documentation",
        url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector",
      },
      {
        label: "OpenAI Apps SDK MCP concept",
        url: "https://developers.openai.com/apps-sdk/concepts/mcp-server",
      },
    ],
  },
  {
    slug: "best-mcp-apps-for-spreadsheets",
    eyebrow: "Use-case guide",
    title: "Best MCP apps for spreadsheets",
    description:
      "How to evaluate MCP apps for spreadsheet work, financial models, reports, tables, CSV files, and collaborative planning workflows.",
    summary:
      "Use spreadsheet MCP apps when the assistant needs to inspect tables, explain formulas, draft reports, or update planning data with review.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["spreadsheets", "productivity", "finance"],
    featuredAppIds: ["smartsheet", "microsoft-365", "google-drive", "google-drive-drivemcp", "word-by-anthropic"],
    primaryCta: { label: "Browse productivity apps", href: "/category/productivity" },
    secondaryCta: { label: "Browse finance apps", href: "/category/finance" },
    relatedLinks: [
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
      { label: "Finance collection", href: "/collections/mcp-apps-for-finance-teams" },
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
      { label: "Submit a spreadsheet MCP", href: "/submit" },
    ],
    sections: [
      {
        id: "fit",
        title: "Where spreadsheet MCP apps fit",
        body: [
          "Spreadsheet workflows usually mix structured data with human judgment. An MCP app is useful when the assistant can inspect sheets, CSVs, tables, or reports and return a result that keeps rows, formulas, and source files understandable.",
          "The best first use cases are read-heavy: explain a model, summarize changes, find unusual values, transform a table, or draft a report from spreadsheet data.",
        ],
      },
      {
        id: "safe-actions",
        title: "Treat edits as a separate permission",
        body: [
          "Reading a sheet and changing a sheet are different risk levels. For planning, finance, and operations workflows, write actions should require explicit review before the assistant changes formulas, statuses, owners, or records.",
        ],
        bullets: [
          "Prefer apps that show exactly which sheet, table, range, or file they can access.",
          "Use read-only tools for summaries, variance checks, and formula explanations.",
          "Require confirmations for bulk edits, row creation, formula changes, and exports.",
          "Check whether the result can be downloaded, copied, or opened in the source spreadsheet tool.",
        ],
      },
      {
        id: "evaluation",
        title: "How to evaluate a spreadsheet app",
        body: [
          "A strong listing should explain supported file types, workspace boundaries, auth, example prompts, and whether the app works with live files or uploaded copies.",
        ],
        bullets: [
          "Can it preserve column names, formulas, currencies, dates, and IDs?",
          "Does it cite the source rows behind an answer?",
          "Can users review proposed edits before save?",
          "Does it handle large sheets with sensible limits?",
        ],
      },
    ],
    faqs: [
      {
        question: "Should spreadsheet MCP apps edit live files?",
        answer:
          "They can, but live edits should require clear confirmation. Start with read-only analysis when the sheet affects finance, operations, or customer data.",
      },
      {
        question: "What spreadsheet workflows fit MCP best?",
        answer:
          "Summaries, table cleanup, variance analysis, formula explanation, report drafting, and data extraction are strong first workflows.",
      },
    ],
    sources: [
      {
        label: "Model Context Protocol introduction",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
      {
        label: "OpenAI Apps SDK MCP server guide",
        url: "https://developers.openai.com/apps-sdk/build/mcp-server",
      },
    ],
  },
  {
    slug: "best-mcp-apps-for-coding-agents",
    eyebrow: "Developer guide",
    title: "Best MCP apps for coding agents",
    description:
      "How to choose MCP apps for coding agents, code review, GitHub issues, docs, deployments, logs, browser automation, and developer tools.",
    summary:
      "Coding agents benefit most from MCP apps that expose the right project context with safe operating boundaries.",
    readingTime: "7 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["coding agents", "developer tools", "Claude Code"],
    featuredAppIds: ["github", "linear", "openai-developers", "sourcegraph", "retool", "latlng", "xquik"],
    primaryCta: { label: "Browse developer apps", href: "/category/developer-tools" },
    secondaryCta: { label: "Developer collection", href: "/collections/mcp-apps-for-developers" },
    relatedLinks: [
      { label: "Build your first MCP app", href: "/learn/build-your-first-mcp-app" },
      { label: "Developer apps collection", href: "/collections/mcp-apps-for-developers" },
      { label: "Claude connectors", href: "/claude-connectors" },
      { label: "Submit a developer MCP", href: "/submit" },
    ],
    sections: [
      {
        id: "agent-context",
        title: "Good agents need the right context",
        body: [
          "A coding agent becomes more useful when it can inspect the systems around the code: issues, docs, pull requests, logs, deployments, browsers, and project files.",
          "MCP apps create a repeatable contract for that access. Instead of pasting context into chat, the agent can call specific tools with predictable inputs and outputs.",
        ],
      },
      {
        id: "boundaries",
        title: "Separate read tools from write tools",
        body: [
          "The safest developer integrations start with read-only tools. Let the agent search docs, inspect issues, retrieve logs, or read deployment metadata before allowing changes to files, tickets, infrastructure, or production state.",
        ],
        bullets: [
          "Docs search, issue lookup, log retrieval, and repo inspection are good read-only tools.",
          "File edits, deploys, database changes, and ticket updates need confirmations.",
          "Project-scoped credentials are easier to reason about than broad personal tokens.",
          "Tool outputs should be compact enough for coding context windows.",
        ],
      },
      {
        id: "evaluation",
        title: "What to check in a listing",
        body: [
          "A strong developer listing should state the host surface, transport, auth type, tools exposed, and whether actions run locally, remotely, or against production systems.",
          "Recent directory additions also show two common developer-facing shapes: remote API connectors such as Xquik for social data workflows, and geospatial utility servers such as LatLng for maps, places, and coordinate lookups.",
        ],
        bullets: [
          "Does it work in your agent host, such as Claude Code, ChatGPT, or an IDE?",
          "Can the agent inspect enough context without reading secrets?",
          "Are destructive actions gated by user review?",
          "Does the app provide support and privacy links?",
        ],
      },
    ],
    faqs: [
      {
        question: "What MCP tools should coding agents get first?",
        answer:
          "Start with docs search, issue lookup, repository inspection, and log retrieval. Add write actions only after confirmations and permissions are clear.",
      },
      {
        question: "Do coding-agent MCP apps need local access?",
        answer:
          "Not always. Some work best as remote HTTP servers, while local tools are useful when the agent needs files, terminals, or project-specific credentials.",
      },
    ],
    sources: [
      {
        label: "Claude Code MCP documentation",
        url: "https://docs.anthropic.com/en/docs/claude-code/mcp",
      },
      {
        label: "OpenAI Apps SDK MCP server guide",
        url: "https://developers.openai.com/apps-sdk/build/mcp-server",
      },
      {
        label: "Model Context Protocol introduction",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
    ],
  },
  {
    slug: "best-claude-connectors-for-productivity",
    eyebrow: "Claude guide",
    title: "Best Claude connectors for productivity",
    description:
      "How to evaluate Claude connectors for files, calendars, docs, tasks, meetings, messages, and everyday team workflows.",
    summary:
      "Claude productivity connectors are most useful when they bring trusted workspace context into chat without over-broad permissions.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["Claude connectors", "productivity", "team workflows"],
    featuredAppIds: ["google-drive", "google-calendar", "gmail", "notion", "linear", "dropbox"],
    primaryCta: { label: "Browse Claude connectors", href: "/claude-connectors" },
    secondaryCta: { label: "Productivity category", href: "/category/productivity" },
    relatedLinks: [
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
      { label: "ChatGPT productivity apps", href: "/collections/chatgpt-apps-for-productivity" },
      { label: "Claude database connectors", href: "/learn/claude-connectors-for-databases" },
      { label: "Submit a connector", href: "/submit" },
    ],
    sections: [
      {
        id: "workflows",
        title: "Where Claude productivity connectors help",
        body: [
          "Productivity connectors let Claude use work context that would otherwise be pasted manually: files, meetings, tasks, messages, calendars, docs, and project records.",
          "The best workflows are specific. Ask Claude to summarize a folder, prepare for a meeting, draft follow-up tasks, find related notes, or compare project status across systems.",
        ],
      },
      {
        id: "permissions",
        title: "Start with workspace boundaries",
        body: [
          "A connector should make boundaries clear before it becomes part of daily work. Users need to know which account, workspace, folder, project, or channel Claude can access.",
        ],
        bullets: [
          "Prefer connectors that use the user's identity and existing workspace permissions.",
          "Separate search and summarization from actions that create, send, or update work.",
          "Check whether OAuth, support, and privacy links are present.",
          "Review example prompts to see whether results are specific or generic.",
        ],
      },
      {
        id: "team-rollout",
        title: "How teams should roll out connectors",
        body: [
          "Pilot with read-only workflows and a small set of trusted users. Once the team knows the connector returns useful, explainable results, add write actions with clear review steps.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is a Claude productivity connector?",
        answer:
          "It is a Claude-facing integration that lets Claude access or act on productivity systems such as files, calendars, docs, tasks, or messages.",
      },
      {
        question: "Should teams enable every productivity connector at once?",
        answer:
          "No. Start with the highest-value source of context, verify permissions, and expand after users understand the connector's behavior.",
      },
    ],
    sources: [
      {
        label: "Anthropic MCP connector documentation",
        url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector",
      },
      {
        label: "Anthropic MCP overview",
        url: "https://docs.anthropic.com/en/docs/build-with-claude/mcp",
      },
    ],
  },
  {
    slug: "chatgpt-apps-vs-claude-connectors",
    eyebrow: "Comparison guide",
    title: "ChatGPT apps vs Claude connectors",
    description:
      "A practical comparison of ChatGPT apps and Claude connectors for teams choosing where to build, publish, or connect MCP-backed workflows.",
    summary:
      "The right surface depends on where users work, what the MCP server can do, and how much UI or workflow control the experience needs.",
    readingTime: "7 min read",
    updatedAt: "2026-07-12",
    intent: "guide",
    topics: ["ChatGPT apps", "Claude connectors", "MCP"],
    primaryCta: { label: "Browse ChatGPT apps", href: "/chatgpt-apps" },
    secondaryCta: { label: "Browse Claude connectors", href: "/claude-connectors" },
    relatedLinks: [
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
      { label: "Build your first MCP app", href: "/learn/build-your-first-mcp-app" },
      { label: "Design ChatGPT apps", href: "/learn/chatgpt-apps-for-design" },
      { label: "Claude data connectors", href: "/learn/claude-connectors-for-databases" },
    ],
    sections: [
      {
        id: "shared-layer",
        title: "The shared layer is MCP",
        body: [
          "ChatGPT apps and Claude connectors can both be backed by MCP servers. The server exposes tools and data; the host decides how those capabilities appear to the user.",
          "That means builders should separate the core server contract from the product surface. One product can support multiple hosts if the auth, tools, and user experience fit each host's rules.",
        ],
      },
      {
        id: "chatgpt-apps",
        title: "When ChatGPT apps are a strong fit",
        body: [
          "ChatGPT apps are useful when the workflow benefits from a visible app experience inside ChatGPT. That can include previews, selection UI, editing surfaces, commerce flows, or structured outputs users need to inspect.",
        ],
        bullets: [
          "Use ChatGPT apps for visual, consumer, productivity, design, shopping, and guided workflows.",
          "Add UI when users need to compare options, edit results, or confirm a choice.",
          "Optimize app metadata and examples so ChatGPT can call the app at the right moment.",
        ],
      },
      {
        id: "claude-connectors",
        title: "When Claude connectors are a strong fit",
        body: [
          "Claude connectors are useful when users want Claude to reach external tools, data, or work systems while staying in a conversational or agentic workflow.",
        ],
        bullets: [
          "Use Claude connectors for files, databases, project systems, internal tools, coding agents, and research workflows.",
          "Make permissions clear, especially for write actions or sensitive data.",
          "Check whether the workflow belongs in Claude chat, Claude Code, or an API-based assistant.",
        ],
      },
      {
        id: "decision",
        title: "How to decide",
        body: [
          "Choose the host your users already trust for the job. If the workflow needs visual review or a consumer-facing app surface, start with ChatGPT. If it needs deep workspace context, code workflows, or internal data access, evaluate Claude connectors as well.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can the same MCP server power both a ChatGPT app and a Claude connector?",
        answer:
          "Often yes. The MCP server contract can be shared, but each host may require different metadata, auth handling, UI, testing, and review steps.",
      },
      {
        question: "Which surface is better for teams?",
        answer:
          "It depends on the workflow. Teams should choose the surface where users already do the work and where permissions can be managed clearly.",
      },
    ],
    sources: [
      {
        label: "OpenAI Apps SDK overview",
        url: "https://developers.openai.com/apps-sdk",
      },
      {
        label: "Anthropic MCP connector documentation",
        url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector",
      },
      {
        label: "Model Context Protocol introduction",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
    ],
  },
  {
    slug: "mcp-app-directory-for-teams",
    eyebrow: "Buyer guide",
    title: "MCP app directory for teams",
    description:
      "How teams can use an MCP app directory to evaluate apps, connectors, permissions, publishers, platform support, and workflow fit.",
    summary:
      "A directory helps teams compare MCP apps before they connect sensitive tools, data, or workflows to an assistant.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "guide",
    topics: ["MCP directory", "teams", "governance"],
    primaryCta: { label: "Browse the directory", href: "/" },
    secondaryCta: { label: "Read the FAQ", href: "/faq" },
    relatedLinks: [
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
      { label: "Collections", href: "/collections" },
      { label: "Listing guidance", href: "/docs" },
      { label: "Submit your MCP", href: "/submit" },
    ],
    sections: [
      {
        id: "why-directory",
        title: "Why teams need a directory",
        body: [
          "MCP makes it easier for assistants to connect to tools and data. That creates a discovery problem: teams need to know what an app does, where it runs, what it can access, and who publishes it before they connect it.",
          "A directory gives buyers and admins a place to compare categories, platform surfaces, example prompts, tools, auth types, privacy links, and related alternatives.",
          "This is especially important now that ChatGPT apps and Claude connectors are converging around the same product names: Google Drive, Google Calendar, Gmail, GitHub, Notion, Linear, and other tools may appear as different host surfaces with different permissions.",
        ],
      },
      {
        id: "evaluation",
        title: "What teams should compare",
        body: [
          "The best comparison is practical. Do not stop at the app name. Compare the workflow, permissions, platform support, data sensitivity, and support path.",
        ],
        bullets: [
          "Platform surface: ChatGPT app, Claude connector, Claude Code, or another MCP host.",
          "Capability level: read-only, write-capable, interactive, local, remote, or API-backed.",
          "Trust signals: publisher, homepage, privacy policy, terms, support, and version details.",
          "Workflow evidence: previews, example prompts, tools, related listings, and whether the listing was last refreshed from a current host directory.",
        ],
      },
      {
        id: "rollout",
        title: "A simple team rollout path",
        body: [
          "Start with one workflow and one trusted user group. Validate that the app returns useful results, respects permissions, and has a clear support path. Then expand to adjacent workflows or additional host surfaces.",
        ],
        steps: [
          "Shortlist apps by category or collection.",
          "Check privacy, terms, support, and auth type.",
          "Test read-only workflows first.",
          "Document approved apps and owners.",
          "Review write actions before broader rollout.",
        ],
      },
    ],
    faqs: [
      {
        question: "What should teams check before approving an MCP app?",
        answer:
          "Check platform support, permissions, publisher details, privacy and support links, example prompts, and whether the app can write to important systems.",
      },
      {
        question: "Is a directory only useful for buyers?",
        answer:
          "No. Builders can use it to understand categories, listing quality, metadata expectations, and adjacent apps they may need to differentiate from.",
      },
    ],
    sources: [
      {
        label: "OpenAI Apps SDK app submission guidelines",
        url: "https://developers.openai.com/apps-sdk/app-submission-guidelines",
      },
      {
        label: "OpenAI Apps SDK security and privacy",
        url: "https://developers.openai.com/apps-sdk/guides/security-privacy",
      },
      {
        label: "Model Context Protocol introduction",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
    ],
  },
  {
    slug: "tldraw-mcp-app",
    eyebrow: "Search guide",
    title: "tldraw MCP app: how to use tldraw with Claude",
    description:
      "A practical guide to the tldraw MCP app for Claude, including diagram workflows, live canvas collaboration, prompts, and evaluation checks.",
    summary:
      "Use tldraw with Claude when a visual workflow needs a shared canvas for diagrams, wireframes, architecture sketches, or mind maps.",
    readingTime: "5 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["tldraw", "Claude connectors", "diagrams", "design"],
    featuredAppIds: ["tldraw", "figma", "miro", "canva"],
    primaryCta: { label: "View tldraw listing", href: "/app/tldraw" },
    secondaryCta: { label: "Browse design apps", href: "/collections/chatgpt-apps-for-design" },
    relatedLinks: [
      { label: "tldraw listing", href: "/app/tldraw" },
      { label: "ChatGPT apps for design", href: "/learn/chatgpt-apps-for-design" },
      { label: "Design collection", href: "/collections/chatgpt-apps-for-design" },
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
    ],
    sections: [
      {
        id: "what-it-does",
        title: "What the tldraw MCP app does",
        body: [
          "The tldraw MCP app connects Claude to a drawing canvas so the assistant can help create and revise visual work instead of only describing it in text.",
          "It is strongest when the answer should become a diagram, sketch, flowchart, wireframe, architecture map, or mind map that a user can inspect and keep editing.",
        ],
      },
      {
        id: "best-workflows",
        title: "Best workflows for tldraw and Claude",
        body: [
          "tldraw is a good fit when the user wants Claude to reason visually and then keep the result in a canvas. The value is not just generating a first draft; it is being able to adjust the visual object and continue the conversation from that shared state. Compare it with design apps and frontend skills when the work needs to move from sketch to production UI.",
        ],
        bullets: [
          "Turn a product idea into a wireframe or user flow.",
          "Map an architecture, API flow, or internal system.",
          "Create a mind map for research, planning, or education.",
          "Sketch alternatives before moving work into a design or documentation tool.",
        ],
      },
      {
        id: "evaluation",
        title: "What to check before using it",
        body: [
          "Before you use tldraw for team work, check whether the workflow needs a temporary sketch, a durable project file, or an export that can move into another design system.",
        ],
        bullets: [
          "Confirm whether Claude can see edits you make on the canvas.",
          "Check export, sharing, and ownership expectations for the drawing.",
          "Use small prompts first so the canvas does not become hard to edit.",
          "Compare with Figma, Miro, Canva, or other design apps when the final artifact belongs there.",
        ],
      },
      {
        id: "example-prompts",
        title: "Example prompts",
        body: [
          "Start with prompts that specify the artifact and the level of detail. A visual assistant works better when it knows whether you want a sketch, a production diagram, or a rough thinking board.",
        ],
        bullets: [
          "Create a flowchart for a user signing up, connecting an MCP app, and reviewing permissions.",
          "Draw a simple architecture diagram for a web app, database, queue, and background worker.",
          "Make a mind map of launch tasks for an MCP app directory.",
          "Turn these notes into a wireframe with a header, filters, list, and detail panel.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is tldraw an MCP app or a Claude connector?",
        answer:
          "The listing is a Claude interactive connector backed by MCP-style tool access. Users evaluate it as an app experience because it creates a visible drawing workflow.",
      },
      {
        question: "When should I use tldraw instead of a text-only prompt?",
        answer:
          "Use it when the output needs spatial layout, visual review, or continued editing. Text-only prompts are enough for outlines, but diagrams and wireframes benefit from a canvas.",
      },
    ],
    sources: [
      { label: "MCP App Store tldraw listing", url: "https://mcpapp.net/app/tldraw" },
      { label: "Design app collection", url: "https://mcpapp.net/collections/chatgpt-apps-for-design" },
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
    ],
  },
  {
    slug: "brand24-mcp",
    eyebrow: "Search guide",
    title: "Brand24 MCP app for brand monitoring and social listening",
    description:
      "How to evaluate the Brand24 MCP app for ChatGPT, brand monitoring, sentiment analysis, media coverage, and marketing reporting workflows.",
    summary:
      "Brand24 is useful when marketing or PR teams want an assistant to summarize brand mentions, sentiment, trends, and online conversations.",
    readingTime: "5 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["Brand24", "ChatGPT apps", "brand monitoring", "marketing analytics"],
    featuredAppIds: ["brand24", "semrush", "ahrefs", "supermetrics", "peec-ai"],
    primaryCta: { label: "View Brand24 listing", href: "/app/brand24" },
    secondaryCta: { label: "Marketing analytics collection", href: "/collections/mcp-apps-for-marketing-analytics" },
    relatedLinks: [
      { label: "Brand24 listing", href: "/app/brand24" },
      { label: "Marketing analytics collection", href: "/collections/mcp-apps-for-marketing-analytics" },
      { label: "Sales and marketing apps", href: "/collections/mcp-apps-for-sales-and-marketing" },
      { label: "ChatGPT apps vs Claude connectors", href: "/learn/chatgpt-apps-vs-claude-connectors" },
    ],
    sections: [
      {
        id: "what-it-does",
        title: "What the Brand24 MCP app does",
        body: [
          "The Brand24 listing describes a ChatGPT app for exploring brand mentions, sentiment, media coverage, online discussions, and trend changes from conversational prompts.",
          "That makes it a search-led app for marketing, PR, and reputation workflows where the assistant needs current brand context instead of a generic marketing answer.",
        ],
      },
      {
        id: "best-workflows",
        title: "Best workflows for Brand24 in ChatGPT",
        body: [
          "Brand monitoring becomes more useful when the assistant can compare, summarize, and explain what changed. The strongest prompts ask for a specific brand, market, time window, or competitor set.",
        ],
        bullets: [
          "Summarize recent brand mentions and group them by theme.",
          "Compare sentiment across competitors or campaign launches.",
          "Find topics that are growing in online discussions.",
          "Prepare a PR or social listening brief for a weekly meeting.",
        ],
      },
      {
        id: "evaluation",
        title: "What to check before connecting",
        body: [
          "Marketing analytics apps should make sources and time windows clear. The assistant should not just say that sentiment improved; it should help the user understand which conversations, channels, or periods support the answer.",
        ],
        bullets: [
          "Check whether answers cite mentions, media sources, campaigns, or date ranges.",
          "Separate read-only analysis from actions that publish, reply, or change campaigns.",
          "Compare Brand24 with SEO, AI visibility, social-data, and campaign analytics tools when the question crosses channels.",
          "Use recurring report prompts only after the first manual results look reliable.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is Brand24 MCP used for?",
        answer:
          "It is used for brand monitoring, social listening, sentiment summaries, trend analysis, and marketing or PR reporting inside ChatGPT.",
      },
      {
        question: "Is Brand24 better for SEO or social listening?",
        answer:
          "Brand24 is primarily useful for online discussions, mentions, reputation, and sentiment. Pair it with SEO tools when the workflow needs keyword, ranking, or search visibility data.",
      },
    ],
    sources: [
      { label: "MCP App Store Brand24 listing", url: "https://mcpapp.net/app/brand24" },
      { label: "Marketing analytics collection", url: "https://mcpapp.net/collections/mcp-apps-for-marketing-analytics" },
      { label: "OpenAI Apps SDK overview", url: "https://developers.openai.com/apps-sdk" },
    ],
  },
  {
    slug: "morningstar-mcp",
    eyebrow: "Search guide",
    title: "Morningstar MCP app for market research and investment data",
    description:
      "How to use and evaluate the Morningstar MCP app for ChatGPT and Claude, including market research, analyst context, screening, and finance workflows.",
    summary:
      "Morningstar is a finance-focused MCP app and connector for market insight workflows that need trusted investment context and careful review.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["Morningstar", "finance", "market data", "Claude connectors"],
    featuredAppIds: ["morningstar", "factset-ai-ready-data", "pitchbook", "aiera", "massive-market-data"],
    primaryCta: { label: "View Morningstar listing", href: "/app/morningstar" },
    secondaryCta: { label: "Finance collection", href: "/collections/mcp-apps-for-finance-teams" },
    relatedLinks: [
      { label: "Morningstar listing", href: "/app/morningstar" },
      { label: "Finance collection", href: "/collections/mcp-apps-for-finance-teams" },
      { label: "Claude data connector guide", href: "/learn/claude-connectors-for-databases" },
      { label: "Spreadsheet MCP apps", href: "/learn/best-mcp-apps-for-spreadsheets" },
    ],
    sections: [
      {
        id: "what-it-does",
        title: "What the Morningstar MCP app does",
        body: [
          "The Morningstar listing describes access to Morningstar AI-ready capabilities, including analyst research, market analysis, and investment data for workflows across ChatGPT and Claude. The finance collection now also groups market-data, company-data, and spreadsheet-adjacent tools for comparison.",
          "For SEO and discovery, the important distinction is that this is not a generic finance chatbot. It is a connected app or connector that can support market research workflows from a trusted financial data context.",
        ],
      },
      {
        id: "best-workflows",
        title: "Best workflows for Morningstar MCP",
        body: [
          "Finance workflows need source-aware answers and careful language. Use Morningstar-style tools for research support, screening, comparison, and preparation rather than unreviewed investment decisions.",
        ],
        bullets: [
          "Screen equities, funds, or market segments against a stated criterion.",
          "Summarize analyst context before a meeting or research note.",
          "Compare company or fund fundamentals with explicit assumptions.",
          "Draft a research brief that a human analyst can review and edit.",
        ],
      },
      {
        id: "controls",
        title: "Controls to check before using finance apps",
        body: [
          "Finance apps deserve stricter review than general productivity apps. The user should understand the data source, freshness, permission scope, and whether the assistant is summarizing information or recommending action.",
        ],
        bullets: [
          "Check whether the app supports ChatGPT, Claude, or both for your workflow.",
          "Look for source links, market data timestamps, and clear assumptions.",
          "Keep investment, accounting, and payment actions separate from read-only research.",
          "Treat generated analysis as a draft that needs qualified review.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is Morningstar MCP good for?",
        answer:
          "Morningstar MCP is useful for market research, investment data exploration, analyst context, and finance workflows where the assistant needs trusted source material.",
      },
      {
        question: "Can Morningstar MCP make investment decisions?",
        answer:
          "Use it for research and summarization, not as an automated decision maker. Finance outputs should be reviewed by a qualified human before action.",
      },
    ],
    sources: [
      { label: "MCP App Store Morningstar listing", url: "https://mcpapp.net/app/morningstar" },
      { label: "Finance MCP app collection", url: "https://mcpapp.net/collections/mcp-apps-for-finance-teams" },
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
    ],
  },
  {
    slug: "anthropic-pdf-viewer-mcp",
    eyebrow: "Search guide",
    title: "Anthropic PDF viewer MCP: compare PDF viewers and document tools",
    description:
      "A practical guide to PDF viewer MCP apps for Claude and ChatGPT, including reading, annotations, extraction, conversion, and safe document workflows.",
    summary:
      "PDF viewer MCP apps help assistants inspect documents, extract text, navigate files, and support review workflows without turning every PDF into pasted chat text.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["PDF", "Anthropic", "Claude connectors", "documents"],
    featuredAppIds: ["ant-dir-gh-anthropic-pdf-server-mcp", "pdf-viewer", "smallpdf", "anypdf-your-pdf-converter", "pdf-tools-view-fill-merge-split-manage-pages-extract"],
    primaryCta: { label: "View pdf-viewer listing", href: "/app/ant-dir-gh-anthropic-pdf-server-mcp" },
    secondaryCta: { label: "Browse productivity apps", href: "/category/productivity" },
    relatedLinks: [
      { label: "pdf-viewer listing", href: "/app/ant-dir-gh-anthropic-pdf-server-mcp" },
      { label: "PDF Viewer listing", href: "/app/pdf-viewer" },
      { label: "Spreadsheet and document guide", href: "/learn/best-mcp-apps-for-spreadsheets" },
      { label: "Claude productivity connectors", href: "/learn/best-claude-connectors-for-productivity" },
    ],
    sections: [
      {
        id: "what-it-does",
        title: "What a PDF viewer MCP app does",
        body: [
          "A PDF viewer MCP app connects an assistant to document viewing or document utility actions. Depending on the listing, that may include reading, search, navigation, annotations, form filling, conversion, compression, merge, split, or extraction.",
          "The search phrase Anthropic PDF viewer usually points to Claude-facing PDF workflows, but the directory also includes ChatGPT PDF apps, document skills, and knowledge-base connectors. The right page depends on whether you need interactive viewing, document conversion, or structured extraction.",
        ],
      },
      {
        id: "workflow-types",
        title: "Common PDF workflows",
        body: [
          "PDF workflows are easy to over-broaden. Start by identifying whether the user needs to read a document, modify a document, convert a file, or extract structured data.",
        ],
        bullets: [
          "Read and navigate a PDF with page-level context.",
          "Search inside a document and cite the relevant section.",
          "Extract text, tables, or images for review.",
          "Annotate or fill forms when the tool supports interactive actions.",
          "Compress, convert, merge, or split PDFs for operational workflows.",
        ],
      },
      {
        id: "safety",
        title: "What to check before connecting documents",
        body: [
          "Document apps can touch sensitive contracts, reports, invoices, applications, and research. Before connecting a PDF workflow, review where files are read, whether they are uploaded, and what the app can write back.",
        ],
        bullets: [
          "Use allowed-source or scoped-file workflows for sensitive documents.",
          "Check whether the app stores, uploads, or only renders the file.",
          "Separate reading and extraction from edits, form filling, or conversion.",
          "Prefer answers that cite page numbers, sections, or extracted source text.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is an Anthropic PDF viewer MCP app?",
        answer:
          "It is a Claude-facing or Anthropic-oriented MCP workflow for viewing, reading, or interacting with PDF files through a connected assistant.",
      },
      {
        question: "Should I use a PDF viewer or a PDF converter app?",
        answer:
          "Use a viewer when you need navigation, review, search, or annotation. Use a converter or utility app when you need compression, merge, split, OCR, or file format changes.",
      },
    ],
    sources: [
      { label: "MCP App Store pdf-viewer listing", url: "https://mcpapp.net/app/ant-dir-gh-anthropic-pdf-server-mcp" },
      { label: "MCP App Store PDF Viewer listing", url: "https://mcpapp.net/app/pdf-viewer" },
      { label: "Anthropic MCP overview", url: "https://docs.anthropic.com/en/docs/build-with-claude/mcp" },
    ],
  },
  {
    slug: "n8n-mcp",
    eyebrow: "Search guide",
    title: "n8n MCP connector for Claude automation workflows",
    description:
      "How to evaluate the n8n MCP connector for Claude, including workflow search, automation management, testing, permissions, and rollout checks.",
    summary:
      "n8n MCP is useful when Claude needs to inspect, run, or manage automation workflows without making every automation step manual.",
    readingTime: "5 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["n8n", "Claude connectors", "automation", "workflows"],
    featuredAppIds: ["n8n", "zapier", "tray-ai", "apify", "coupler-io"],
    primaryCta: { label: "View n8n listing", href: "/app/n8n" },
    secondaryCta: { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
    relatedLinks: [
      { label: "n8n listing", href: "/app/n8n" },
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
      { label: "Claude productivity connectors", href: "/learn/best-claude-connectors-for-productivity" },
      { label: "Developer apps collection", href: "/collections/mcp-apps-for-developers" },
    ],
    sections: [
      {
        id: "what-it-does",
        title: "What the n8n MCP connector does",
        body: [
          "The n8n listing describes a Claude connector that lets users talk to an n8n instance, create and test automations, and manage resources such as workflows, data tables, and projects. It belongs beside gateway-style listings such as MCP360 when teams compare automation coverage across hosts.",
          "That makes n8n a good candidate when the assistant should understand automation context and help operate workflow systems rather than only draft instructions.",
        ],
      },
      {
        id: "best-workflows",
        title: "Best workflows for n8n and Claude",
        body: [
          "Automation connectors should start with discovery and testing before production changes. Claude can be useful for explaining workflows, finding broken steps, drafting variants, and preparing a safe change plan.",
        ],
        bullets: [
          "Find existing workflows that touch a specific app, webhook, or data table.",
          "Explain what a workflow does and identify risky steps.",
          "Draft a new automation from a plain-language process.",
          "Test a workflow and summarize failed nodes or missing inputs.",
        ],
      },
      {
        id: "permissions",
        title: "Permissions to check before connecting",
        body: [
          "Automation platforms can trigger external actions, write records, and move data between systems. Treat run, create, update, and delete actions separately from read-only search.",
        ],
        bullets: [
          "Start with workflow search and explanation before write actions.",
          "Confirm which n8n workspace or project Claude can reach.",
          "Require review before running workflows that send messages, update data, or call production APIs.",
          "Check whether tool calls are logged for audit and debugging.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is n8n MCP used for?",
        answer:
          "n8n MCP is used to let Claude inspect, create, test, or manage n8n automations and related workflow resources through a connected tool interface.",
      },
      {
        question: "Should Claude be allowed to run n8n workflows?",
        answer:
          "Only after the team has reviewed permissions and risk. Start with read-only inspection, then require confirmations for workflows that send data or affect production systems.",
      },
    ],
    sources: [
      { label: "MCP App Store n8n listing", url: "https://mcpapp.net/app/n8n" },
      { label: "Productivity MCP app collection", url: "https://mcpapp.net/collections/mcp-apps-for-productivity" },
      { label: "Anthropic MCP connector documentation", url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector" },
    ],
  },
  {
    slug: "calendly-to-claude",
    eyebrow: "Search guide",
    title: "Calendly to Claude: scheduling workflows with an MCP connector",
    description:
      "How to connect Calendly-style scheduling workflows to Claude, including availability, event types, booking links, permissions, and meeting preparation.",
    summary:
      "Calendly in Claude is useful when scheduling needs conversational context, event type management, availability checks, and booking workflow review.",
    readingTime: "5 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["Calendly", "Claude connectors", "calendar", "productivity"],
    featuredAppIds: ["calendly", "google-calendar-calendarmcp", "microsoft-365", "motion", "busycal"],
    primaryCta: { label: "View Calendly listing", href: "/app/calendly" },
    secondaryCta: { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
    relatedLinks: [
      { label: "Calendly listing", href: "/app/calendly" },
      { label: "Claude productivity connectors", href: "/learn/best-claude-connectors-for-productivity" },
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
      { label: "ChatGPT apps vs Claude connectors", href: "/learn/chatgpt-apps-vs-claude-connectors" },
    ],
    sections: [
      {
        id: "what-it-does",
        title: "What Calendly to Claude means",
        body: [
          "The Calendly listing describes a Claude connector for scheduling workflows such as managing event types, availability, bookings, and scheduling links from conversation.",
          "This is useful when scheduling is not just a calendar lookup. The assistant can help reason through meeting type, audience, availability, and follow-up context before an action is taken. Compare Calendly with broader workspace connectors when the workflow also needs email, docs, or CRM context.",
        ],
      },
      {
        id: "best-workflows",
        title: "Best scheduling workflows",
        body: [
          "Scheduling connectors work best when the assistant has a clear goal and the user reviews the final action. A good prompt names the meeting type, audience, duration, time constraints, and whether the assistant should only draft or actually update a booking workflow.",
        ],
        bullets: [
          "Find the right event type for a customer, candidate, or partner meeting.",
          "Draft a scheduling link message with context from the conversation.",
          "Review availability rules before sharing a link.",
          "Prepare follow-up tasks after a meeting is booked.",
        ],
      },
      {
        id: "controls",
        title: "What to review before connecting",
        body: [
          "Calendar and scheduling tools can expose availability and personal or team meeting data. Before connecting, confirm which account, calendar, event types, and booking actions Claude can access.",
        ],
        bullets: [
          "Separate reading availability from creating, updating, or canceling bookings.",
          "Check whether the connector uses the user's own permissions.",
          "Review default time zones, buffers, booking limits, and external sharing rules.",
          "Require confirmation before sending links or changing event types.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can Claude manage Calendly bookings?",
        answer:
          "The Calendly connector listing describes scheduling workflow support. Teams should still review exact permissions before allowing booking updates or shared links.",
      },
      {
        question: "Is Calendly to Claude different from a normal calendar connector?",
        answer:
          "Yes. A calendar connector usually focuses on calendar events, while Calendly-style workflows also include event types, booking links, availability rules, and scheduling pages.",
      },
    ],
    sources: [
      { label: "MCP App Store Calendly listing", url: "https://mcpapp.net/app/calendly" },
      { label: "Claude productivity connector guide", url: "https://mcpapp.net/learn/best-claude-connectors-for-productivity" },
      { label: "Anthropic MCP connector documentation", url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector" },
    ],
  },
  {
    slug: "pyroscope-mcp",
    eyebrow: "Search guide",
    title: "Pyroscope MCP with Grafana: profiling and observability workflows",
    description:
      "How to evaluate Pyroscope MCP workflows through Grafana MCP Server, including profiling, dashboards, metrics, logs, alerts, and incident response checks.",
    summary:
      "Pyroscope-related MCP workflows are strongest when profiling data sits next to dashboards, logs, metrics, alerts, and incident context.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["Pyroscope", "Grafana", "observability", "Claude connectors"],
    featuredAppIds: ["grafana-mcp-server", "honeycomb", "dynatrace-mcp-server", "incident-io", "pagerduty"],
    primaryCta: { label: "View Grafana MCP listing", href: "/app/grafana-mcp-server" },
    secondaryCta: { label: "Observability collection", href: "/collections/mcp-apps-for-observability" },
    relatedLinks: [
      { label: "Grafana MCP Server listing", href: "/app/grafana-mcp-server" },
      { label: "Observability collection", href: "/collections/mcp-apps-for-observability" },
      { label: "Developer apps collection", href: "/collections/mcp-apps-for-developers" },
      { label: "Coding agent apps", href: "/learn/best-mcp-apps-for-coding-agents" },
    ],
    sections: [
      {
        id: "what-it-does",
        title: "Where Pyroscope fits in MCP workflows",
        body: [
          "Pyroscope is represented in this directory through the Grafana MCP Server listing, which includes observability categories such as dashboards, metrics, logs, alerting, incidents, and profiling. Developer skills such as Firecrawl and cloud-platform skills now sit alongside these app listings when teams plan incident and diagnostics workflows.",
          "For searchers looking for Pyroscope MCP, the practical question is whether the connector can help an assistant inspect profiling context alongside the rest of the incident or performance picture.",
        ],
      },
      {
        id: "best-workflows",
        title: "Best observability workflows",
        body: [
          "Profiling data is most useful when the assistant can connect it to a concrete performance question. Keep prompts specific: service, time window, symptom, dashboard, alert, or deployment change.",
        ],
        bullets: [
          "Investigate why CPU, memory, or latency changed after a release.",
          "Summarize profile evidence alongside logs and metrics.",
          "Find related dashboards or alerts for a performance issue.",
          "Prepare an incident summary with source links and time windows.",
        ],
      },
      {
        id: "controls",
        title: "What to check before connecting observability tools",
        body: [
          "Observability connectors often touch production signals. Start read-only and make sure the assistant returns enough source context to verify each claim.",
        ],
        bullets: [
          "Confirm which Grafana instances, datasources, dashboards, or projects are in scope.",
          "Use time-windowed prompts instead of broad searches.",
          "Separate diagnostic read tools from actions that mutate alerts, dashboards, or incidents.",
          "Prefer answers that include dashboard links, query names, or incident identifiers.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is there a Pyroscope MCP app?",
        answer:
          "The directory currently surfaces Pyroscope-related workflows through Grafana MCP Server, which includes profiling alongside Grafana dashboards, datasources, alerting, and observability context.",
      },
      {
        question: "What should I ask a Pyroscope MCP workflow?",
        answer:
          "Ask focused performance questions with a service, time window, and symptom, then verify the answer against source dashboards, profiles, logs, or metrics.",
      },
    ],
    sources: [
      { label: "MCP App Store Grafana MCP Server listing", url: "https://mcpapp.net/app/grafana-mcp-server" },
      { label: "Observability MCP app collection", url: "https://mcpapp.net/collections/mcp-apps-for-observability" },
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
    ],
  },
  {
    slug: "mcp-app-security-checklist",
    eyebrow: "Trust guide",
    title: "MCP app security checklist for teams",
    description:
      "A practical checklist for evaluating MCP apps, MCP servers, ChatGPT apps, and Claude connectors before connecting sensitive tools or data.",
    summary:
      "Review permissions, auth, data flow, publisher trust, logging, and write actions before rolling MCP apps into team workflows.",
    readingTime: "7 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["MCP security", "permissions", "team governance"],
    featuredAppIds: [
      "rapid7-bulk-export",
      "socket",
      "miggo",
      "defense-com-threat-analysis",
      "conviso-mcp-server",
      "zscaler-mcp-server",
      "malwarebytes",
    ],
    primaryCta: { label: "Browse security MCP apps", href: "/category/security" },
    secondaryCta: { label: "Read team directory guide", href: "/learn/mcp-app-directory-for-teams" },
    relatedLinks: [
      { label: "MCP app directory for teams", href: "/learn/mcp-app-directory-for-teams" },
      { label: "MCP servers directory", href: "/mcp-servers" },
      { label: "Developer MCP apps", href: "/collections/mcp-apps-for-developers" },
      { label: "Submit a secure MCP listing", href: "/submit" },
    ],
    sections: [
      {
        id: "why-security-matters",
        title: "Why MCP app security needs its own review",
        body: [
          "MCP apps can make assistants more useful because they connect chat to tools, files, systems, and workflows. That same reach means teams should evaluate them like production integrations, not like ordinary browser bookmarks.",
          "A good review separates discovery from connection. Browse listings freely, then check permissions, authentication, data handling, and write actions before adding the app to a real workspace.",
        ],
      },
      {
        id: "permission-scope",
        title: "1. Start with permission scope",
        body: [
          "The first question is not whether the app is useful. It is what the assistant can read, what it can write, and whose account those actions use.",
        ],
        bullets: [
          "Prefer read-only tools for first trials.",
          "Separate search, summarize, create, update, delete, and external-send actions.",
          "Check whether permissions are user-scoped, workspace-scoped, or shared through a service account.",
          "Confirm whether the app can reach production systems, customer data, financial data, or private repositories.",
        ],
      },
      {
        id: "auth-and-data",
        title: "2. Review auth, transport, and data flow",
        body: [
          "Authentication is part of the product boundary. A trustworthy listing should make it clear how accounts connect, where the MCP server runs, and whether the server stores user content.",
          "If a workflow touches sensitive data, ask for the same details you would ask from any integration vendor: privacy link, support path, retention policy, and failure behavior.",
          "Remote HTTP MCP endpoints can return a healthy 401 or auth-required response when unauthenticated; treat that as a signal to review the auth model, not as proof that the tool is safe to connect.",
        ],
        bullets: [
          "Look for clear OAuth or account-connection language.",
          "Avoid broad API keys when scoped auth is available.",
          "Check whether tool results include source links or IDs so users can verify answers.",
          "Confirm how logs, prompts, files, and tool outputs are retained.",
        ],
      },
      {
        id: "write-actions",
        title: "3. Treat write actions as a rollout milestone",
        body: [
          "Write-capable MCP apps can save time, but they need a stronger rollout path. The assistant should not silently mutate tickets, records, calendars, repos, campaigns, or payments without a clear user checkpoint.",
        ],
        bullets: [
          "Start in a sandbox, test workspace, or limited project.",
          "Require confirmation before writes, sends, deletes, or purchases.",
          "Use narrow tools instead of one broad action that can do everything.",
          "Log action IDs and source records for audit and rollback.",
        ],
      },
      {
        id: "team-rollout",
        title: "4. Roll out with owners and review dates",
        body: [
          "Once a team adopts an MCP app, assign an owner and revisit the connection after the first real workflow. The app may be safe for one group and too broad for another.",
          "The best governance pattern is lightweight but explicit: approved users, approved workflows, owner, review date, and a place to report issues.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should teams allow write-capable MCP apps?",
        answer:
          "Yes, but only with scoped permissions, confirmation points, logging, and a rollout path that starts with low-risk workflows.",
      },
      {
        question: "What is the safest first MCP app to connect?",
        answer:
          "A read-only app with clear publisher metadata, scoped auth, source links in outputs, and a workflow that does not expose sensitive production data.",
      },
    ],
    sources: [
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
      { label: "OpenAI guide to building an MCP server", url: "https://developers.openai.com/apps-sdk/build/mcp-server" },
      { label: "Anthropic MCP connector documentation", url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector" },
    ],
  },
  {
    slug: "mcp-apps-for-documents-and-knowledge",
    eyebrow: "Knowledge guide",
    title: "Best MCP apps for documents and knowledge bases",
    description:
      "How to evaluate MCP apps for Google Drive, Microsoft 365, PDFs, notes, docs, knowledge bases, and document-heavy team workflows.",
    summary:
      "Use document MCP apps when assistants need governed access to files, source documents, notes, PDFs, and shared knowledge systems.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["documents", "knowledge bases", "PDF", "files"],
    featuredAppIds: [
      "google-drive",
      "google-calendar",
      "gmail",
      "microsoft-365",
      "sharepoint",
      "box",
      "dropbox",
      "notion",
      "docling-mcp",
      "word-by-anthropic",
      "pdf-tools-view-fill-merge-split-manage-pages-extract",
    ],
    primaryCta: { label: "Browse productivity MCP apps", href: "/collections/mcp-apps-for-productivity" },
    secondaryCta: { label: "Compare PDF viewer tools", href: "/learn/anthropic-pdf-viewer-mcp" },
    relatedLinks: [
      { label: "PDF viewer MCP guide", href: "/learn/anthropic-pdf-viewer-mcp" },
      { label: "Productivity MCP app collection", href: "/collections/mcp-apps-for-productivity" },
      { label: "Claude productivity connectors", href: "/learn/best-claude-connectors-for-productivity" },
      { label: "MCP app security checklist", href: "/learn/mcp-app-security-checklist" },
    ],
    sections: [
      {
        id: "where-they-help",
        title: "Where document MCP apps help",
        body: [
          "Document and knowledge MCP apps are useful when an assistant needs to find, compare, summarize, or update source material that already lives in a team's systems. The newer ChatGPT plugin surface makes this especially visible for Drive, email, calendar, notes, and project-management tools.",
          "The strongest workflows keep source context attached. Users should be able to open the file, page, note, ticket, or PDF that supports an answer.",
        ],
      },
      {
        id: "common-workflows",
        title: "Common document workflows",
        body: [
          "A document app should reduce switching between chat, search, file storage, and editors. The goal is not just summarization; it is traceable work on the right source material.",
        ],
        bullets: [
          "Find policy, contract, research, or project documents by natural language.",
          "Summarize a folder, meeting pack, customer file, or product spec with source links.",
          "Extract tables, dates, owners, obligations, or action items from PDFs and docs.",
          "Draft an update while preserving the original source and review path.",
          "Compare versions or related documents before a decision.",
        ],
      },
      {
        id: "evaluation",
        title: "How to evaluate a document MCP app",
        body: [
          "Document workflows often touch private files. Before connecting, check account boundaries, folder scope, file types, retention, and whether write actions need confirmation.",
        ],
        bullets: [
          "Confirm which drives, folders, workspaces, or libraries are in scope.",
          "Prefer apps that return citations, file IDs, or direct source links.",
          "Separate read/search tools from edit/export/share tools.",
          "Check support for PDFs, docs, spreadsheets, slides, images, or OCR if those formats matter.",
        ],
      },
      {
        id: "prompting",
        title: "Prompts that work well",
        body: [
          "Name the source boundary and desired output. A strong prompt says which folder, date range, customer, project, or file type the assistant should inspect.",
        ],
        bullets: [
          "Find the latest renewal contract for this customer and summarize the renewal risks with source links.",
          "Compare the product brief and launch checklist, then list mismatched owners or dates.",
          "Extract all action items from the meeting notes folder for this week.",
          "Create a first draft, but do not edit or share the source document yet.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are document MCP apps safer than pasting files into chat?",
        answer:
          "They can be, because access can be scoped and source links can remain attached. Teams still need to review permissions, retention, and file boundaries before connecting.",
      },
      {
        question: "Should document MCP apps be allowed to edit files?",
        answer:
          "Start with read-only search and summarization. Add edits later when the app provides clear review, confirmation, and rollback paths.",
      },
    ],
    sources: [
      { label: "MCP App Store productivity collection", url: "https://mcpapp.net/collections/mcp-apps-for-productivity" },
      { label: "MCP App Store PDF viewer guide", url: "https://mcpapp.net/learn/anthropic-pdf-viewer-mcp" },
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
    ],
  },
  {
    slug: "mcp-apps-for-sales-teams",
    eyebrow: "Revenue guide",
    title: "Best MCP apps for sales teams",
    description:
      "A sales workflow guide for MCP apps across CRM, prospecting, account research, outreach, customer context, and revenue operations.",
    summary:
      "Sales teams should use MCP apps to bring account context, CRM records, research, and outreach workflows into the assistant with clear permission boundaries.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["sales", "CRM", "prospecting", "revenue operations"],
    featuredAppIds: ["sales", "hubspot", "attio", "clay", "intercom", "highspot", "salesloft", "xquik"],
    primaryCta: { label: "Browse sales and marketing apps", href: "/collections/mcp-apps-for-sales-and-marketing" },
    secondaryCta: { label: "Open marketing analytics apps", href: "/collections/mcp-apps-for-marketing-analytics" },
    relatedLinks: [
      { label: "Sales and marketing MCP app collection", href: "/collections/mcp-apps-for-sales-and-marketing" },
      { label: "Marketing analytics MCP apps", href: "/collections/mcp-apps-for-marketing-analytics" },
      { label: "Brand24 MCP guide", href: "/learn/brand24-mcp" },
      { label: "MCP app security checklist", href: "/learn/mcp-app-security-checklist" },
    ],
    sections: [
      {
        id: "fit",
        title: "Where sales MCP apps fit",
        body: [
          "Sales MCP apps are strongest when the assistant can pull together customer records, account research, messages, meetings, and tasks without asking the seller to copy data between tools.",
          "The goal is better context before the human acts. For outbound, pipeline, and customer workflows, keep the assistant's write permissions explicit.",
        ],
      },
      {
        id: "workflows",
        title: "High-value sales workflows",
        body: [
          "Useful sales workflows usually combine retrieval and drafting. The assistant can find context, summarize it, and prepare a next step while the seller reviews the final action.",
          "Social and market-signal connectors can complement CRM tools when teams need account context from public channels before drafting or prioritizing outreach.",
        ],
        bullets: [
          "Prepare an account brief from CRM, notes, website context, and recent conversations.",
          "Find similar customers, relevant case studies, or active expansion signals.",
          "Draft outreach with account-specific context without sending automatically.",
          "Summarize pipeline risks, stuck deals, missing next steps, or stale owners.",
          "Update CRM records only after the seller confirms the change.",
        ],
      },
      {
        id: "evaluation",
        title: "How to choose sales MCP apps",
        body: [
          "Sales systems often contain customer data and outbound channels. Evaluate apps by source access, account scope, write controls, and whether they can show which records supported the answer.",
        ],
        bullets: [
          "Check whether the app can read contacts, companies, deals, activities, or email history.",
          "Separate drafting from sending, logging, creating, or updating records.",
          "Use team templates and approved messaging where possible.",
          "Confirm whether the app respects CRM ownership, territory, and workspace permissions.",
        ],
      },
      {
        id: "rollout",
        title: "A simple rollout path",
        body: [
          "Start with one low-risk workflow such as account research or pipeline summarization. Once sellers trust the output and managers trust the controls, add carefully reviewed record updates or task creation.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can MCP apps send sales emails automatically?",
        answer:
          "Some sales tools may support sending or outreach actions, but teams should require explicit review before external messages are sent.",
      },
      {
        question: "What is the best first sales MCP workflow?",
        answer:
          "Account research or pipeline summarization is usually a good first workflow because it is useful, mostly read-only, and easy to verify.",
      },
    ],
    sources: [
      { label: "Sales and marketing MCP app collection", url: "https://mcpapp.net/collections/mcp-apps-for-sales-and-marketing" },
      { label: "Marketing analytics MCP app collection", url: "https://mcpapp.net/collections/mcp-apps-for-marketing-analytics" },
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
    ],
  },
  {
    slug: "mcp-apps-for-research-and-education",
    eyebrow: "Research guide",
    title: "Best MCP apps for research and education",
    description:
      "How students, analysts, educators, and research teams can evaluate MCP apps for literature search, learning platforms, citations, datasets, and scientific workflows.",
    summary:
      "Research MCP apps are most useful when they return source-backed context, help compare evidence, and keep citations or records attached to each claim.",
    readingTime: "6 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["research", "education", "citations", "science"],
    featuredAppIds: [
      "consensus",
      "scite",
      "pubmed",
      "scholar-gateway",
      "clinical-trials",
      "biorxiv",
      "coursera",
      "datacamp",
      "udemy-business",
      "open-targets",
    ],
    primaryCta: { label: "Browse education MCP apps", href: "/category/education" },
    secondaryCta: { label: "Browse life sciences apps", href: "/category/life-sciences" },
    relatedLinks: [
      { label: "Data and analytics apps", href: "/category/data" },
      { label: "Document and knowledge apps", href: "/learn/mcp-apps-for-documents-and-knowledge" },
      { label: "Claude database connectors", href: "/learn/claude-connectors-for-databases" },
      { label: "MCP app security checklist", href: "/learn/mcp-app-security-checklist" },
    ],
    sections: [
      {
        id: "fit",
        title: "Where research MCP apps help",
        body: [
          "Research and education workflows need traceability. The assistant should help users discover, compare, and summarize sources while keeping enough metadata to verify the result.",
          "These apps are useful for literature search, course discovery, citation review, scientific databases, clinical trial context, and internal research libraries. The refreshed catalog also makes it easier to compare app listings with relevant skills and MCP clients for research workflows.",
        ],
      },
      {
        id: "workflows",
        title: "High-value research workflows",
        body: [
          "A good research workflow narrows the question, gathers source-backed evidence, and explains uncertainty. It should not collapse all sources into an unsupported answer.",
        ],
        bullets: [
          "Find recent papers or educational resources for a focused topic.",
          "Compare claims across abstracts, citations, course modules, or datasets.",
          "Summarize a research area with source links and open questions.",
          "Extract study design, population, intervention, outcome, or limitation details.",
          "Turn a learning goal into a course, reading, or practice plan.",
        ],
      },
      {
        id: "evaluation",
        title: "How to evaluate research MCP apps",
        body: [
          "Look for source visibility first. Users should be able to inspect the paper, dataset, course, clinical record, or documentation page that backs the assistant's answer.",
        ],
        bullets: [
          "Prefer answers with citations, IDs, links, or source names.",
          "Check coverage by domain, date range, language, and source type.",
          "Avoid medical, legal, or financial conclusions without expert review.",
          "Separate search and summarization from actions like enrollment, sharing, or record updates.",
        ],
      },
      {
        id: "prompting",
        title: "Prompts that work well",
        body: [
          "Use focused prompts with a topic, population, date range, difficulty level, or evidence standard. Ask the app to show sources and uncertainty.",
        ],
        bullets: [
          "Find studies from the last five years about this topic and group them by evidence type.",
          "Compare these two claims and show where the sources agree or conflict.",
          "Build a two-week learning plan using beginner-friendly resources only.",
          "Summarize this clinical or scientific topic for a non-specialist, with source links.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can research MCP apps replace expert review?",
        answer:
          "No. They can help find and summarize source material, but high-stakes conclusions still need domain expert review.",
      },
      {
        question: "What should a research MCP app return?",
        answer:
          "It should return concise summaries plus source links, identifiers, citations, or enough metadata for users to verify the answer.",
      },
    ],
    sources: [
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
      { label: "MCP App Store data category", url: "https://mcpapp.net/category/data" },
      { label: "MCP App Store life sciences category", url: "https://mcpapp.net/category/life-sciences" },
    ],
  },
  {
    slug: "mcp-browser-automation-tools",
    eyebrow: "Automation guide",
    title: "MCP browser automation tools for agents",
    description:
      "How to compare MCP apps for browser control, web scraping, web testing, desktop automation, and agentic workflows that need to operate in real interfaces.",
    summary:
      "Browser automation MCP tools help assistants inspect pages, collect structured data, test workflows, and operate web UIs when APIs are not enough.",
    readingTime: "7 min read",
    updatedAt: "2026-07-12",
    intent: "use-case",
    topics: ["browser automation", "web scraping", "testing", "agents"],
    featuredAppIds: [
      "control-chrome",
      "firefox-control",
      "brave-applescript",
      "apify",
      "kapture-browser-automation",
      "desktop-commander",
      "windows-mcp",
      "macos",
    ],
    primaryCta: { label: "Browse developer MCP apps", href: "/collections/mcp-apps-for-developers" },
    secondaryCta: { label: "Compare coding agent apps", href: "/learn/best-mcp-apps-for-coding-agents" },
    relatedLinks: [
      { label: "Coding agent MCP apps", href: "/learn/best-mcp-apps-for-coding-agents" },
      { label: "Developer MCP app collection", href: "/collections/mcp-apps-for-developers" },
      { label: "MCP app security checklist", href: "/learn/mcp-app-security-checklist" },
      { label: "MCP servers directory", href: "/mcp-servers" },
    ],
    sections: [
      {
        id: "why-browser",
        title: "Why browser automation belongs in MCP",
        body: [
          "Some workflows do not have a clean API, or the API does not show what a user actually sees. Browser automation MCP tools let assistants inspect pages, fill forms, run tests, capture evidence, and interact with web apps through controlled tools. With the refreshed skills data, teams can compare browser apps with browser-oriented skills before choosing a runtime.",
          "The best use cases are bounded. Give the assistant a site, task, and stopping condition instead of an open-ended command to browse the web.",
        ],
      },
      {
        id: "workflows",
        title: "Common browser automation workflows",
        body: [
          "Browser automation is useful when visual state, logged-in sessions, or web-only flows matter. Keep each workflow small enough that a user can review the result.",
        ],
        bullets: [
          "Test a signup, checkout, dashboard, or admin workflow in a real browser.",
          "Collect structured data from pages where no stable API is available.",
          "Inspect a local web app, reproduce a bug, and capture console or screenshot evidence.",
          "Operate internal tools with clear instructions and confirmation before submitting changes.",
          "Compare browser-visible results against backend records or documentation.",
        ],
      },
      {
        id: "controls",
        title: "Controls to require",
        body: [
          "Browser and desktop tools can reach real accounts, sessions, and interfaces. Treat them as high-capability tools with explicit scope and review points.",
        ],
        bullets: [
          "Specify allowed domains, accounts, and actions.",
          "Separate read-only inspection from clicks that submit, delete, buy, or publish.",
          "Capture evidence such as screenshots, URLs, console logs, or extracted records.",
          "Respect site terms, rate limits, robots policies, and sensitive data boundaries.",
        ],
      },
      {
        id: "agent-fit",
        title: "When to choose browser tools over APIs",
        body: [
          "Use an API when the workflow is stable, authorized, and structured. Use browser automation when the real UI is the source of truth, when you need visual verification, or when a user-facing flow must be tested end to end.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are browser automation MCP tools only for scraping?",
        answer:
          "No. They can support QA, debugging, local app inspection, form workflows, evidence capture, and controlled operation of web interfaces.",
      },
      {
        question: "What is the biggest risk with browser automation agents?",
        answer:
          "They can act in real logged-in sessions. Limit scope, require confirmation before irreversible actions, and capture enough evidence for review.",
      },
    ],
    sources: [
      { label: "Developer MCP app collection", url: "https://mcpapp.net/collections/mcp-apps-for-developers" },
      { label: "MCP App Store browser automation category", url: "https://mcpapp.net/category/browser" },
      { label: "Model Context Protocol introduction", url: "https://modelcontextprotocol.io/docs/getting-started/intro" },
    ],
  },
];

export const siteFaqItems: LearnFaq[] = [
  {
    question: "What is MCP App Store?",
    answer:
      "MCP App Store is a directory for discovering MCP-backed apps, ChatGPT apps, Claude connectors, and related platform surfaces.",
  },
  {
    question: "What is the difference between a ChatGPT app and a Claude connector?",
    answer:
      "Both can be backed by MCP servers, but they appear in different hosts. A ChatGPT app is built for ChatGPT, while a Claude connector is built for Claude or Claude API workflows.",
  },
  {
    question: "Can I submit my own MCP app?",
    answer:
      "Yes. Use the submit page to provide the name, description, platform surfaces, MCP details, links, tools, and preview examples for moderation.",
  },
  {
    question: "Do you host the MCP servers?",
    answer:
      "No. The directory lists apps and connectors. Publishers are responsible for operating their own endpoints and support paths.",
  },
  {
    question: "Are all listed apps reviewed?",
    answer:
      "Submissions are moderated before publication, but users should still review permissions, privacy links, and publisher details before connecting an app.",
  },
  {
    question: "What should a good listing include?",
    answer:
      "A good listing includes a clear tagline, plain-language description, platform support, capabilities, auth type, privacy and support URLs, and example prompts.",
  },
];

export function getLearnArticle(slug: string): LearnArticle | undefined {
  return learnArticles.find((article) => article.slug === slug);
}

export function featuredLearnArticles(): LearnArticle[] {
  return learnArticles.slice(0, 4);
}
