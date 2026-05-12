export interface CategoryContent {
  eyebrow: string;
  title: string;
  metaDescription: string;
  body: string[];
  checkpoints: string[];
  relatedLinks: Array<{ label: string; href: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

function pluralizeApp(count: number): string {
  return count === 1 ? "app or connector" : "apps and connectors";
}

export const categoryContentBySlug: Record<string, CategoryContent> = {
  productivity: {
    eyebrow: "Productivity guide",
    title: "Choose productivity MCP apps by the work artifact they touch.",
    metaDescription:
      "Compare productivity MCP apps for documents, files, notes, calendars, tasks, meetings, and team workflows.",
    body: [
      "Productivity MCP apps are most useful when the assistant can work with the systems where daily work already lives: documents, tasks, calendars, notes, meetings, files, and collaboration tools.",
      "Start with the artifact you need to create or update, then check whether the app only reads context or can safely write changes back to the source system.",
    ],
    checkpoints: [
      "Prefer read-only access for search, summarization, and retrieval workflows.",
      "Use write-capable apps when users can review the final document, task, file, or message before it is saved.",
      "Check whether the app supports the workspace, folder, project, or account boundaries your team needs.",
    ],
    relatedLinks: [
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
      { label: "ChatGPT productivity apps", href: "/collections/chatgpt-apps-for-productivity" },
      { label: "Build your first MCP app", href: "/learn/build-your-first-mcp-app" },
    ],
    faqs: [
      {
        question: "What makes an MCP app useful for productivity?",
        answer:
          "It should connect the assistant to a concrete work surface such as files, notes, tasks, meetings, or documents, then return structured results users can inspect.",
      },
      {
        question: "Should productivity apps be allowed to write changes?",
        answer:
          "Only when the app has clear confirmations and narrow permissions. Drafting is usually safer than saving or sending automatically.",
      },
    ],
  },
  design: {
    eyebrow: "Design guide",
    title: "Look for apps that preserve visual context and editability.",
    metaDescription:
      "Compare design MCP apps for visual assets, diagrams, slides, image editing, design systems, and design-to-code workflows.",
    body: [
      "Design MCP apps work best when they can see or create the real artifact, not just describe it. Strong listings show previews, brand-aware actions, export paths, and the design system or editor where the result can continue.",
      "For teams, the deciding factor is control. A good design app should make it easy to inspect variants, preserve source files, and keep brand or accessibility constraints visible.",
    ],
    checkpoints: [
      "Check whether outputs remain editable in Canva, Figma, Adobe tools, Miro, or the target editor.",
      "Prefer apps with previews for image, slide, diagram, or layout workflows.",
      "Look for permissions that separate asset search from destructive edits.",
    ],
    relatedLinks: [
      { label: "Design collection", href: "/collections/chatgpt-apps-for-design" },
      { label: "ChatGPT apps for design teams", href: "/learn/chatgpt-apps-for-design" },
      { label: "All ChatGPT apps", href: "/chatgpt-apps" },
    ],
    faqs: [
      {
        question: "Are design MCP apps only for image generation?",
        answer:
          "No. Design apps can search assets, create diagrams, edit images, generate slides, resize content, or hand off work to a design editor.",
      },
      {
        question: "What should I check before connecting a design app?",
        answer:
          "Check where the output is saved, whether it is editable, what assets the app can read, and whether write actions require confirmation.",
      },
    ],
  },
  data: {
    eyebrow: "Data guide",
    title: "Prioritize governed access over broad database reach.",
    metaDescription:
      "Compare data MCP apps and Claude connectors for databases, warehouses, analytics, BI tools, and governed reporting workflows.",
    body: [
      "Data MCP apps should make live context safer to use, not less controlled. The strongest listings expose narrow tools, scoped auth, clear row or workspace limits, and result shapes that cite the source of the answer.",
      "Teams should start with read-only analysis and move toward write or automation workflows only after logging, permission boundaries, and review paths are clear.",
    ],
    checkpoints: [
      "Prefer curated query tools before arbitrary SQL access.",
      "Check whether the app uses the user's identity and workspace permissions.",
      "Look for auditability: tool names, source IDs, limits, and error handling.",
    ],
    relatedLinks: [
      { label: "Claude database connectors", href: "/collections/claude-connectors-for-databases" },
      { label: "Data teams guide", href: "/learn/claude-connectors-for-databases" },
      { label: "Claude connectors", href: "/claude-connectors" },
    ],
    faqs: [
      {
        question: "Should a data MCP app allow arbitrary SQL?",
        answer:
          "Not for most teams at first. Curated, read-only tools are easier to secure, review, and explain than unrestricted SQL access.",
      },
      {
        question: "What is the best first data workflow?",
        answer:
          "Start with search, summaries, metric explanation, or report retrieval before allowing the assistant to update records or write queries to production systems.",
      },
    ],
  },
  "developer-tools": {
    eyebrow: "Developer guide",
    title: "Choose developer MCP apps by the boundary they can operate safely.",
    metaDescription:
      "Compare developer MCP apps for code, docs, browsers, terminals, issue trackers, deployments, and coding agents.",
    body: [
      "Developer MCP apps can be high leverage because they let coding agents inspect docs, issues, logs, deployments, browsers, files, and repositories without constant context switching.",
      "They also carry more risk. The right app should make the operating boundary obvious: what it can read, what it can change, where confirmations happen, and how the work is logged.",
    ],
    checkpoints: [
      "Separate read tools such as docs search and log lookup from write tools such as deploys or file edits.",
      "Prefer project-scoped credentials and environment-specific permissions.",
      "Check whether the app works in the host where your team codes, such as Claude Code, ChatGPT, or an IDE.",
    ],
    relatedLinks: [
      { label: "Developer collection", href: "/collections/mcp-apps-for-developers" },
      { label: "Coding agent apps guide", href: "/learn/best-mcp-apps-for-coding-agents" },
      { label: "Submit a developer MCP", href: "/submit" },
    ],
    faqs: [
      {
        question: "What is a developer MCP app?",
        answer:
          "It is an MCP-backed app or connector that gives an assistant structured access to developer systems such as repos, docs, logs, terminals, browsers, or project tools.",
      },
      {
        question: "Which developer tools should be read-only?",
        answer:
          "Docs, logs, issue search, and repository inspection are good read-only starters. Deploys, file edits, and database changes need stronger confirmations.",
      },
    ],
  },
  finance: {
    eyebrow: "Finance guide",
    title: "Treat financial data and write actions as separate decisions.",
    metaDescription:
      "Compare finance MCP apps for accounting, payments, market data, tax, banking, invoices, reporting, and financial analysis.",
    body: [
      "Finance MCP apps can connect assistants to books, invoices, reports, payments, market data, tax tools, and banking workflows. The useful question is not only what the app can answer, but what it can change.",
      "A finance app that reads reports has a very different risk profile from one that creates invoices, files forms, updates accounting records, or moves money.",
    ],
    checkpoints: [
      "Start with read-only reports, balances, market data, or invoice lookup.",
      "Require explicit confirmation for payment, tax, accounting, or record updates.",
      "Look for audit trails, scoped auth, support links, and clear publisher details.",
    ],
    relatedLinks: [
      { label: "Finance collection", href: "/collections/mcp-apps-for-finance-teams" },
      { label: "Financial services", href: "/category/financial-services" },
      { label: "Data collection", href: "/collections/claude-connectors-for-databases" },
    ],
    faqs: [
      {
        question: "What finance MCP workflows are safest to start with?",
        answer:
          "Reporting, lookup, reconciliation review, market research, and invoice search are safer first workflows than payments or accounting writes.",
      },
      {
        question: "Can finance MCP apps update records?",
        answer:
          "Some can, but write actions should have scoped permissions, clear confirmations, and logs that make the change traceable.",
      },
    ],
  },
  travel: {
    eyebrow: "Travel guide",
    title: "Use travel MCP apps for comparison before confirmation.",
    metaDescription:
      "Compare travel MCP apps for flights, hotels, maps, tours, rentals, itinerary planning, reservations, and destination research.",
    body: [
      "Travel MCP apps are helpful when a trip has many moving parts: destination research, route options, hotels, rentals, tours, availability, budgets, and preferences.",
      "The assistant can narrow options quickly, but final booking decisions still need careful review of dates, location, cancellation rules, fees, and traveler details.",
    ],
    checkpoints: [
      "Use apps that can compare options, not just search one provider.",
      "Keep booking, payment, and reservation changes behind explicit confirmation.",
      "Check whether the app handles dates, locations, budgets, and traveler constraints clearly.",
    ],
    relatedLinks: [
      { label: "Travel collection", href: "/collections/mcp-apps-for-travel-planning" },
      { label: "Lifestyle category", href: "/category/lifestyle" },
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
    ],
    faqs: [
      {
        question: "Can travel MCP apps book trips directly?",
        answer:
          "Some can hand users into booking flows, but users should always review dates, prices, policies, and traveler details before confirming.",
      },
      {
        question: "What travel workflows fit MCP best?",
        answer:
          "Research, comparison, itinerary drafting, availability checks, map-based planning, and activity shortlists fit MCP especially well.",
      },
    ],
  },
  "text-to-speech": {
    eyebrow: "Audio guide",
    title: "Compare text to speech MCP apps by voice quality, exports, and review controls.",
    metaDescription:
      "Compare text to speech MCP apps for voice generation, audio previews, narration, accessibility, and content workflows.",
    body: [
      "Text to speech MCP apps are useful when an assistant needs to turn drafts, documents, lessons, or support content into audio that a user can review.",
      "The best listings make the output format, voice controls, preview flow, and export path obvious before a user connects the app.",
    ],
    checkpoints: [
      "Check whether users can preview audio before exporting or publishing.",
      "Look for controls for language, voice, tone, speed, and file format.",
      "Use explicit confirmations before an app posts, sends, or saves generated audio.",
    ],
    relatedLinks: [
      { label: "Productivity apps", href: "/category/productivity" },
      { label: "ChatGPT apps", href: "/chatgpt-apps" },
      { label: "What is an MCP app?", href: "/learn/what-is-an-mcp-app" },
    ],
    faqs: [
      {
        question: "What is a text to speech MCP app?",
        answer:
          "It is an MCP-backed app or connector that lets an assistant create, preview, transform, or export spoken audio from text.",
      },
      {
        question: "What should I compare first?",
        answer:
          "Start with voice quality, language support, review controls, export formats, and whether the app can write back to a content tool.",
      },
    ],
  },
  marketing: {
    eyebrow: "Marketing guide",
    title: "Choose marketing MCP apps by channel, data access, and campaign control.",
    metaDescription:
      "Compare marketing MCP apps for analytics, social listening, SEO, campaigns, content workflows, research, and reporting.",
    body: [
      "Marketing MCP apps can help assistants search campaign data, draft content, compare audiences, summarize analytics, and prepare reports across the tools a team already uses.",
      "The important distinction is whether the app only reads context or can publish, update, or spend against a live marketing account.",
    ],
    checkpoints: [
      "Prefer read-only analytics, search, and research workflows at first.",
      "Require review before publishing content, changing campaigns, or exporting contacts.",
      "Check whether the app cites source campaigns, channels, posts, or reports.",
    ],
    relatedLinks: [
      { label: "ChatGPT apps", href: "/chatgpt-apps" },
      { label: "Data apps", href: "/category/data" },
      { label: "Productivity collection", href: "/collections/mcp-apps-for-productivity" },
    ],
    faqs: [
      {
        question: "What marketing workflows fit MCP best?",
        answer:
          "Research, reporting, social listening, SEO analysis, content drafts, and campaign summaries are strong early workflows.",
      },
      {
        question: "Should a marketing MCP app publish automatically?",
        answer:
          "Publishing should require explicit user review because mistakes can affect brand, spend, compliance, or customer communication.",
      },
    ],
  },
  visualization: {
    eyebrow: "Visualization guide",
    title: "Look for visualization MCP apps that keep charts explainable.",
    metaDescription:
      "Compare visualization MCP apps for charts, diagrams, dashboards, BI workflows, data storytelling, and visual analysis.",
    body: [
      "Visualization MCP apps are strongest when they connect data, chart output, and explanation in one workflow. Users should be able to see where a chart came from and continue editing it.",
      "For teams, the best apps preserve labels, units, filters, and source references so generated visuals do not become hard-to-audit screenshots.",
    ],
    checkpoints: [
      "Check whether charts stay editable in the target tool.",
      "Prefer apps that cite data sources, filters, and assumptions.",
      "Use previews before exporting diagrams, slides, dashboards, or reports.",
    ],
    relatedLinks: [
      { label: "Design apps", href: "/category/design" },
      { label: "Data apps", href: "/category/data" },
      { label: "Claude database connectors", href: "/collections/claude-connectors-for-databases" },
    ],
    faqs: [
      {
        question: "What is a visualization MCP app?",
        answer:
          "It is an MCP-backed app or connector that helps an assistant create, inspect, or edit charts, diagrams, dashboards, or visual reports.",
      },
      {
        question: "What makes a generated chart trustworthy?",
        answer:
          "The app should keep source data, filters, units, and assumptions visible so users can verify the chart before sharing it.",
      },
    ],
  },
  csv: {
    eyebrow: "CSV guide",
    title: "Use CSV MCP apps for structured cleanup, review, and export workflows.",
    metaDescription:
      "Compare CSV MCP apps for table cleanup, extraction, spreadsheet workflows, data import, reporting, and file conversion.",
    body: [
      "CSV MCP apps help assistants work with simple structured files without losing columns, IDs, dates, currencies, or row-level context.",
      "They are especially useful for cleanup, extraction, summaries, import preparation, and spreadsheet handoffs where a user needs a reviewable table.",
    ],
    checkpoints: [
      "Check whether the app preserves headers, IDs, dates, and numeric formats.",
      "Prefer previews for transformations before a file is exported.",
      "Use source-row citations for summaries or anomaly checks.",
    ],
    relatedLinks: [
      { label: "Spreadsheet guide", href: "/learn/best-mcp-apps-for-spreadsheets" },
      { label: "Data apps", href: "/category/data" },
      { label: "Productivity apps", href: "/category/productivity" },
    ],
    faqs: [
      {
        question: "What can a CSV MCP app do?",
        answer:
          "It can help inspect, clean, summarize, transform, or prepare CSV data for another spreadsheet, database, or reporting workflow.",
      },
      {
        question: "What should users review before export?",
        answer:
          "Users should check headers, row counts, IDs, date formats, currencies, and any changed values before saving or importing the result.",
      },
    ],
  },
  "mcp-server": {
    eyebrow: "MCP server guide",
    title: "Compare MCP servers by host support, transport, tools, and permissions.",
    metaDescription:
      "Compare MCP servers for ChatGPT apps, Claude connectors, Claude Code, remote MCP, local tools, auth, and transports.",
    body: [
      "MCP server listings should make the underlying integration contract clear: where it runs, which host can use it, what tools it exposes, and how auth works.",
      "For builders and teams, the best comparison starts with transport, supported hosts, permissions, and whether the server can read, write, or execute actions.",
    ],
    checkpoints: [
      "Check whether the server uses HTTP, SSE, or stdio transport.",
      "Match the server to the host surface: ChatGPT, Claude, Claude Code, or another MCP client.",
      "Review tool names, auth type, support links, and write-action confirmations.",
    ],
    relatedLinks: [
      { label: "Build your first MCP app", href: "/learn/build-your-first-mcp-app" },
      { label: "Coding agent apps", href: "/learn/best-mcp-apps-for-coding-agents" },
      { label: "Claude connectors", href: "/claude-connectors" },
    ],
    faqs: [
      {
        question: "What is an MCP server?",
        answer:
          "An MCP server exposes tools or data through the Model Context Protocol so an assistant host can call those capabilities in a structured way.",
      },
      {
        question: "What should I compare between MCP servers?",
        answer:
          "Compare host support, transport, auth, tool scope, permissions, logging, and whether write actions require user review.",
      },
    ],
  },
};

export function genericCategoryContent(name: string, count: number): CategoryContent {
  const lowerName = name.toLowerCase();

  return {
    eyebrow: "Category guide",
    title: `Compare ${lowerName} MCP apps by platform, tools, and trust signals.`,
    metaDescription: `Compare ${lowerName} MCP apps, ChatGPT apps, Claude connectors, and MCP servers by platform support, tools, previews, and permissions.`,
    body: [
      `This category currently includes ${count} ${pluralizeApp(count)} related to ${lowerName}. Use it to compare how each listing fits ChatGPT, Claude, Claude Code, or another MCP host.`,
      "A useful MCP listing should make the workflow, platform surface, auth type, tools, and support links clear before a user connects it.",
    ],
    checkpoints: [
      "Check whether the app supports the assistant host your team uses.",
      "Compare read-only tools separately from write-capable or interactive actions.",
      "Review publisher, privacy, support, auth, and transport details before rollout.",
    ],
    relatedLinks: [
      { label: "ChatGPT apps", href: "/chatgpt-apps" },
      { label: "Claude connectors", href: "/claude-connectors" },
      { label: "MCP basics", href: "/learn/what-is-an-mcp-app" },
    ],
    faqs: [
      {
        question: `What is a ${lowerName} MCP app?`,
        answer: `It is an MCP-backed app, connector, or server listed for ${lowerName} workflows, with details such as supported host, tools, auth, and publisher links.`,
      },
      {
        question: `How should I choose between ${lowerName} MCP apps?`,
        answer:
          "Start with host support, tool scope, permissions, previews, and whether important write actions require explicit review.",
      },
    ],
  };
}

export function getCategoryContent(slug: string, name?: string, count?: number): CategoryContent | undefined {
  return categoryContentBySlug[slug] ?? (name && typeof count === "number" ? genericCategoryContent(name, count) : undefined);
}
