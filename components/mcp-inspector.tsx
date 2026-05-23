"use client";

import { useMemo, useRef, useState } from "react";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type CheckStatus = "idle" | "running" | "ok" | "warn" | "error";

interface JsonRpcError {
  code: number;
  message: string;
  data?: JsonValue;
}

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: JsonValue;
  result?: JsonValue;
  error?: JsonRpcError;
}

interface InspectorCheck {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

interface LogEntry {
  id: number;
  direction: "request" | "response" | "note" | "error";
  title: string;
  body?: string;
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: JsonValue;
}

interface McpPrompt {
  name: string;
  description?: string;
}

interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

interface InitializeResult {
  protocolVersion?: string;
  capabilities?: Record<string, JsonValue>;
  serverInfo?: {
    name?: string;
    version?: string;
  };
  instructions?: string;
}

const protocolVersions = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const initialChecks: InspectorCheck[] = [
  { key: "url", label: "Endpoint URL", status: "idle", detail: "Waiting for an MCP endpoint." },
  { key: "cors", label: "Browser access", status: "idle", detail: "Checks whether this page can reach the server." },
  { key: "initialize", label: "Initialize", status: "idle", detail: "Negotiates protocol version and capabilities." },
  { key: "initialized", label: "Initialized notification", status: "idle", detail: "Sends the ready notification after initialize." },
  { key: "ping", label: "Ping", status: "idle", detail: "Runs an MCP liveness request." },
  { key: "tools", label: "Tools", status: "idle", detail: "Lists available tools." },
  { key: "prompts", label: "Prompts", status: "idle", detail: "Lists prompt templates if supported." },
  { key: "resources", label: "Resources", status: "idle", detail: "Lists readable resources if supported." },
  { key: "app", label: "App preview", status: "idle", detail: "Optional browser preview for the app surface." },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonRpcMessage(value: unknown): value is JsonRpcMessage {
  return isRecord(value) && value.jsonrpc === "2.0";
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]));
  }

  return String(value);
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonObject(value: string, label: string): Record<string, JsonValue> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, toJsonValue(item)]));
}

function parseToolArguments(value: string): Record<string, JsonValue> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }

  return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, toJsonValue(item)]));
}

function absoluteUrl(value: string, base?: string): string {
  return new URL(value.trim(), base).toString();
}

function statusLabel(status: CheckStatus): string {
  if (status === "ok") return "Pass";
  if (status === "warn") return "Note";
  if (status === "error") return "Fail";
  if (status === "running") return "Running";
  return "Idle";
}

function resultCount(value: JsonValue | undefined, key: "tools" | "prompts" | "resources"): number {
  if (!isRecord(value)) {
    return 0;
  }

  const items = value[key];
  return Array.isArray(items) ? items.length : 0;
}

function coerceTools(value: JsonValue | undefined): McpTool[] {
  if (!isRecord(value) || !Array.isArray(value.tools)) {
    return [];
  }

  return value.tools.flatMap((tool) => {
    if (!isRecord(tool)) {
      return [];
    }

    return [{
      name: typeof tool.name === "string" ? tool.name : "unnamed_tool",
      description: typeof tool.description === "string" ? tool.description : undefined,
      inputSchema: tool.inputSchema === undefined ? undefined : toJsonValue(tool.inputSchema),
    }];
  });
}

function coercePrompts(value: JsonValue | undefined): McpPrompt[] {
  if (!isRecord(value) || !Array.isArray(value.prompts)) {
    return [];
  }

  return value.prompts.flatMap((prompt) => {
    if (!isRecord(prompt)) {
      return [];
    }

    return [{
      name: typeof prompt.name === "string" ? prompt.name : "unnamed_prompt",
      description: typeof prompt.description === "string" ? prompt.description : undefined,
    }];
  });
}

function coerceResources(value: JsonValue | undefined): McpResource[] {
  if (!isRecord(value) || !Array.isArray(value.resources)) {
    return [];
  }

  return value.resources.flatMap((resource) => {
    if (!isRecord(resource)) {
      return [];
    }

    return [{
      uri: typeof resource.uri === "string" ? resource.uri : "unknown:",
      name: typeof resource.name === "string" ? resource.name : undefined,
      description: typeof resource.description === "string" ? resource.description : undefined,
      mimeType: typeof resource.mimeType === "string" ? resource.mimeType : undefined,
    }];
  });
}

function readServerInfo(value: JsonValue | undefined): InitializeResult {
  if (!isRecord(value)) {
    return {};
  }

  const capabilities = isRecord(value.capabilities)
    ? Object.fromEntries(Object.entries(value.capabilities).map(([key, item]) => [key, toJsonValue(item)]))
    : undefined;
  const serverInfo = isRecord(value.serverInfo)
    ? {
        name: typeof value.serverInfo.name === "string" ? value.serverInfo.name : undefined,
        version: typeof value.serverInfo.version === "string" ? value.serverInfo.version : undefined,
      }
    : undefined;

  return {
    protocolVersion: typeof value.protocolVersion === "string" ? value.protocolVersion : undefined,
    capabilities,
    serverInfo,
    instructions: typeof value.instructions === "string" ? value.instructions : undefined,
  };
}

function appendJsonRpcEvent(events: JsonRpcMessage[], rawEvent: string): JsonRpcMessage[] {
  const dataLines = rawEvent
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) {
    return events;
  }

  try {
    const parsed = JSON.parse(dataLines.join("\n")) as unknown;
    if (isJsonRpcMessage(parsed)) {
      events.push(parsed);
    }
  } catch {
    // Ignore non-JSON SSE events while continuing to read the stream.
  }

  return events;
}

async function parseSseResponse(response: Response, expectedId?: number | string): Promise<JsonRpcMessage | undefined> {
  if (!response.body) {
    return undefined;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: JsonRpcMessage[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let splitIndex = buffer.search(/\r?\n\r?\n/);
    while (splitIndex >= 0) {
      const rawEvent = buffer.slice(0, splitIndex);
      buffer = buffer.slice(splitIndex + (buffer[splitIndex] === "\r" ? 4 : 2));
      appendJsonRpcEvent(events, rawEvent);

      const match = events.find((event) => event.id === expectedId);
      if (match) {
        await reader.cancel().catch(() => undefined);
        return match;
      }

      splitIndex = buffer.search(/\r?\n\r?\n/);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    appendJsonRpcEvent(events, buffer);
  }

  return expectedId === undefined ? events[0] : events.find((event) => event.id === expectedId);
}

function makeJsonRpc(id: number, method: string, params?: JsonValue): JsonRpcMessage {
  return params === undefined ? { jsonrpc: "2.0", id, method } : { jsonrpc: "2.0", id, method, params };
}

function makeNotification(method: string, params?: JsonValue): JsonRpcMessage {
  return params === undefined ? { jsonrpc: "2.0", method } : { jsonrpc: "2.0", method, params };
}

export function McpInspector() {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [protocolVersion, setProtocolVersion] = useState(protocolVersions[0]);
  const [authToken, setAuthToken] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [checks, setChecks] = useState<InspectorCheck[]>(initialChecks);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [negotiatedVersion, setNegotiatedVersion] = useState("");
  const [serverInfo, setServerInfo] = useState<InitializeResult>({});
  const [tools, setTools] = useState<McpTool[]>([]);
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);
  const [resources, setResources] = useState<McpResource[]>([]);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [toolArguments, setToolArguments] = useState("{}");
  const [toolResult, setToolResult] = useState<JsonValue | undefined>(undefined);
  const [toolError, setToolError] = useState("");
  const [isCallingTool, setIsCallingTool] = useState(false);
  const endpointUrlRef = useRef<HTMLInputElement>(null);
  const appUrlRef = useRef<HTMLInputElement>(null);
  const protocolVersionRef = useRef<HTMLSelectElement>(null);
  const authTokenRef = useRef<HTMLInputElement>(null);
  const headersTextRef = useRef<HTMLTextAreaElement>(null);
  const toolArgumentsRef = useRef<HTMLTextAreaElement>(null);
  const logIdRef = useRef(0);

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.name === selectedToolName) ?? tools[0],
    [selectedToolName, tools],
  );
  const canUseSession = Boolean(negotiatedVersion);

  const addLog = (entry: Omit<LogEntry, "id">) => {
    logIdRef.current += 1;
    const nextLogId = logIdRef.current;
    setLogs((current) => {
      if (current.some((log) => log.id === nextLogId)) {
        return current;
      }

      return [
        { ...entry, id: nextLogId },
        ...current,
      ].slice(0, 80);
    });
  };

  const updateCheck = (key: string, status: CheckStatus, detail: string) => {
    setChecks((current) => current.map((check) => (check.key === key ? { ...check, status, detail } : check)));
  };

  const createHeaders = (
    options: {
      includeProtocol?: boolean;
      includeSession?: boolean;
      protocolVersionHeader?: string;
      sessionIdHeader?: string;
    } = {},
  ) => {
    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("accept", "application/json, text/event-stream");

    const token = (authTokenRef.current?.value ?? authToken).trim();
    if (token) {
      headers.set("authorization", token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`);
    }

    const customHeaders = parseJsonObject(headersTextRef.current?.value ?? headersText, "Custom headers");
    for (const [key, value] of Object.entries(customHeaders)) {
      if (typeof value !== "string") {
        throw new Error(`Custom header "${key}" must be a string value.`);
      }
      headers.set(key, value);
    }

    const protocolHeader = options.protocolVersionHeader ?? negotiatedVersion;
    if (options.includeProtocol && protocolHeader) {
      headers.set("MCP-Protocol-Version", protocolHeader);
    }

    const sessionHeader = options.sessionIdHeader ?? sessionId;
    if (options.includeSession && sessionHeader) {
      headers.set("MCP-Session-Id", sessionHeader);
    }

    return headers;
  };

  const sendRequest = async ({
    url,
    message,
    includeProtocol,
    includeSession,
    protocolVersionHeader,
    sessionIdHeader,
  }: {
    url: string;
    message: JsonRpcMessage;
    includeProtocol?: boolean;
    includeSession?: boolean;
    protocolVersionHeader?: string;
    sessionIdHeader?: string;
  }): Promise<{ payload?: JsonRpcMessage; sessionHeader?: string }> => {
    addLog({ direction: "request", title: `POST ${message.method ?? "response"}`, body: prettyJson(message) });

    const response = await fetch(url, {
      body: JSON.stringify(message),
      headers: createHeaders({ includeProtocol, includeSession, protocolVersionHeader, sessionIdHeader }),
      method: "POST",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const sessionHeader = response.headers.get("MCP-Session-Id") ?? response.headers.get("Mcp-Session-Id") ?? undefined;
    let payload: JsonRpcMessage | undefined;

    if (contentType.includes("text/event-stream")) {
      payload = await parseSseResponse(response, message.id);
    } else if (response.status !== 202 && response.status !== 204) {
      const text = await response.text();
      if (text.trim()) {
        const parsed = JSON.parse(text) as unknown;
        if (isJsonRpcMessage(parsed)) {
          payload = parsed;
        }
      }
    }

    addLog({
      direction: response.ok ? "response" : "error",
      title: `${response.status} ${response.statusText || "Response"}${contentType ? ` (${contentType})` : ""}`,
      body: payload ? prettyJson(payload) : "No response body.",
    });

    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `HTTP ${response.status} from MCP endpoint.`);
    }

    if (payload?.error) {
      throw new Error(`${payload.error.message} (${payload.error.code})`);
    }

    return { payload, sessionHeader };
  };

  const sendNotification = async (url: string, method: string, protocolVersionHeader?: string, sessionIdHeader?: string) => {
    const message = makeNotification(method);
    addLog({ direction: "request", title: `POST ${method}`, body: prettyJson(message) });
    const response = await fetch(url, {
      body: JSON.stringify(message),
      headers: createHeaders({ includeProtocol: true, includeSession: true, protocolVersionHeader, sessionIdHeader }),
      method: "POST",
    });

    addLog({
      direction: response.ok ? "response" : "error",
      title: `${response.status} ${response.statusText || "Response"}`,
      body: response.status === 202 || response.status === 204 ? "Accepted." : await response.text().catch(() => ""),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while sending ${method}.`);
    }
  };

  const inspectServer = async () => {
    setIsRunning(true);
    setChecks(initialChecks.map((check) => ({ ...check, status: "idle" as const })));
    setTools([]);
    setPrompts([]);
    setResources([]);
    setServerInfo({});
    setSessionId("");
    setNegotiatedVersion("");
    setSelectedToolName("");
    setToolResult(undefined);
    setToolError("");
    setLogs([]);

    let requestId = 1;

    try {
      updateCheck("url", "running", "Validating the endpoint URL.");
      const currentEndpointUrl = endpointUrlRef.current?.value ?? endpointUrl;
      const currentAppUrl = appUrlRef.current?.value ?? appUrl;
      const currentProtocolVersion = protocolVersionRef.current?.value ?? protocolVersion;
      const url = absoluteUrl(currentEndpointUrl);
      setEndpointUrl(currentEndpointUrl);
      setAppUrl(currentAppUrl);
      setProtocolVersion(currentProtocolVersion);
      updateCheck("url", "ok", url);

      if (currentAppUrl.trim()) {
        updateCheck("app", "ok", "Preview loaded below. Some apps block iframe embedding, which is also useful to see.");
      } else {
        updateCheck("app", "warn", "No app URL supplied.");
      }

      updateCheck("cors", "running", "Sending a browser fetch to the MCP endpoint.");
      updateCheck("initialize", "running", `Sending initialize with protocol ${currentProtocolVersion}.`);

      const initializeMessage = makeJsonRpc(requestId++, "initialize", {
        protocolVersion: currentProtocolVersion,
        capabilities: {},
        clientInfo: {
          name: "mcpapp-browser-inspector",
          version: "0.1.0",
        },
      });
      const initializeResponse = await sendRequest({ url, message: initializeMessage });
      const initResult = readServerInfo(initializeResponse.payload?.result);
      const nextVersion = initResult.protocolVersion ?? currentProtocolVersion;
      const nextSessionId = initializeResponse.sessionHeader ?? "";

      setNegotiatedVersion(nextVersion);
      setSessionId(nextSessionId);
      setServerInfo(initResult);
      updateCheck("cors", "ok", "The browser reached the MCP endpoint and read a response.");
      updateCheck(
        "initialize",
        "ok",
        `${initResult.serverInfo?.name ?? "Server"} negotiated ${nextVersion}${nextSessionId ? " with a session id." : "."}`,
      );

      if (!nextSessionId) {
        addLog({
          direction: "note",
          title: "No MCP-Session-Id header was readable",
          body: "Stateless servers are fine. Stateful browser-compatible servers should expose MCP-Session-Id with Access-Control-Expose-Headers.",
        });
      }

      setNegotiatedVersion(nextVersion);
      if (nextSessionId) {
        setSessionId(nextSessionId);
      }

      updateCheck("initialized", "running", "Sending notifications/initialized.");
      await sendNotification(url, "notifications/initialized", nextVersion, nextSessionId);
      updateCheck("initialized", "ok", "Server accepted the initialized notification.");

      updateCheck("ping", "running", "Sending ping.");
      await sendRequest({
        url,
        message: makeJsonRpc(requestId++, "ping"),
        includeProtocol: true,
        includeSession: true,
        protocolVersionHeader: nextVersion,
        sessionIdHeader: nextSessionId,
      });
      updateCheck("ping", "ok", "Ping completed.");

      updateCheck("tools", "running", "Requesting tools/list.");
      try {
        const toolsResponse = await sendRequest({
          url,
          message: makeJsonRpc(requestId++, "tools/list"),
          includeProtocol: true,
          includeSession: true,
          protocolVersionHeader: nextVersion,
          sessionIdHeader: nextSessionId,
        });
        const nextTools = coerceTools(toolsResponse.payload?.result);
        setTools(nextTools);
        setSelectedToolName(nextTools[0]?.name ?? "");
        updateCheck("tools", "ok", `${resultCount(toolsResponse.payload?.result, "tools")} tools found.`);
      } catch (error) {
        updateCheck("tools", "warn", error instanceof Error ? error.message : "tools/list was not available.");
      }

      updateCheck("prompts", "running", "Requesting prompts/list.");
      try {
        const promptsResponse = await sendRequest({
          url,
          message: makeJsonRpc(requestId++, "prompts/list"),
          includeProtocol: true,
          includeSession: true,
          protocolVersionHeader: nextVersion,
          sessionIdHeader: nextSessionId,
        });
        setPrompts(coercePrompts(promptsResponse.payload?.result));
        updateCheck("prompts", "ok", `${resultCount(promptsResponse.payload?.result, "prompts")} prompts found.`);
      } catch (error) {
        updateCheck("prompts", "warn", error instanceof Error ? error.message : "prompts/list was not available.");
      }

      updateCheck("resources", "running", "Requesting resources/list.");
      try {
        const resourcesResponse = await sendRequest({
          url,
          message: makeJsonRpc(requestId++, "resources/list"),
          includeProtocol: true,
          includeSession: true,
          protocolVersionHeader: nextVersion,
          sessionIdHeader: nextSessionId,
        });
        setResources(coerceResources(resourcesResponse.payload?.result));
        updateCheck("resources", "ok", `${resultCount(resourcesResponse.payload?.result, "resources")} resources found.`);
      } catch (error) {
        updateCheck("resources", "warn", error instanceof Error ? error.message : "resources/list was not available.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inspection failed.";
      addLog({ direction: "error", title: "Inspection failed", body: message });
      if (message.includes("Invalid URL")) {
        updateCheck("url", "error", "Enter a full MCP endpoint URL, such as https://example.com/mcp.");
      }
      if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
        updateCheck("cors", "error", "The browser could not read the endpoint. Check CORS, HTTPS, Origin validation, and auth.");
      }
      updateCheck("initialize", "error", message);
    } finally {
      setIsRunning(false);
    }
  };

  const callSelectedTool = async () => {
    if (!selectedTool) {
      setToolError("Choose a tool first.");
      return;
    }

    setIsCallingTool(true);
    setToolError("");
    setToolResult(undefined);

    try {
      const url = absoluteUrl(endpointUrlRef.current?.value ?? endpointUrl);
      const args = parseToolArguments(toolArgumentsRef.current?.value ?? toolArguments);
      const response = await sendRequest({
        url,
        message: makeJsonRpc(Date.now(), "tools/call", {
          name: selectedTool.name,
          arguments: args,
        }),
        includeProtocol: true,
        includeSession: true,
      });

      setToolResult(response.payload?.result);
    } catch (error) {
      setToolError(error instanceof Error ? error.message : "Tool call failed.");
    } finally {
      setIsCallingTool(false);
    }
  };

  const resetInspector = () => {
    setChecks(initialChecks);
    setLogs([]);
    setTools([]);
    setPrompts([]);
    setResources([]);
    setServerInfo({});
    setSessionId("");
    setNegotiatedVersion("");
    setSelectedToolName("");
    setToolArguments("{}");
    setToolResult(undefined);
    setToolError("");
  };

  return (
    <div className="page-stack">
      <section className="inspector-hero">
        <div>
          <p className="eyebrow">MCP Inspector</p>
          <h1>Test an MCP server from the same browser your users run</h1>
          <p>
            Initialize a Streamable HTTP endpoint, verify browser access, inspect tools, prompts, and resources, then
            call a tool with JSON arguments.
          </p>
          <div className="inspector-hero-actions">
            <a className="primary-link" href="#inspector-workbench">
              Start testing
            </a>
            <a className="secondary-link" href="https://modelcontextprotocol.io/specification/2025-11-25/basic/transports" rel="noreferrer" target="_blank">
              MCP transport spec
            </a>
          </div>
        </div>
        <div className="inspector-trace" aria-label="MCP inspector protocol sequence">
          <span>POST initialize</span>
          <span>notifications/initialized</span>
          <span>tools/list</span>
          <span>tools/call</span>
        </div>
      </section>

      <section className="inspector-layout" id="inspector-workbench">
        <div className="inspector-panel inspector-config">
          <div className="inspector-panel-head">
            <p className="eyebrow">Connection</p>
            <h2>Endpoint settings</h2>
          </div>

          <label className="field">
            <span>MCP endpoint URL</span>
            <input
              className="input"
              onChange={(event) => setEndpointUrl(event.target.value)}
              placeholder="https://example.com/mcp"
              ref={endpointUrlRef}
              type="url"
              value={endpointUrl}
            />
          </label>

          <div className="row-2">
            <label className="field">
              <span>Protocol version</span>
              <select className="input" onChange={(event) => setProtocolVersion(event.target.value)} ref={protocolVersionRef} value={protocolVersion}>
                {protocolVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Bearer token</span>
              <input
                className="input"
                onChange={(event) => setAuthToken(event.target.value)}
                placeholder="Optional"
                ref={authTokenRef}
                type="password"
                value={authToken}
              />
            </label>
          </div>

          <label className="field">
            <span>Custom headers JSON</span>
            <textarea
              className="textarea inspector-small-textarea"
              onChange={(event) => setHeadersText(event.target.value)}
              placeholder={'{"X-Workspace": "demo"}'}
              ref={headersTextRef}
              value={headersText}
            />
            <span className="hint">Header values must be strings. They are sent from this browser only.</span>
          </label>

          <label className="field">
            <span>App URL</span>
            <input
              className="input"
              onChange={(event) => setAppUrl(event.target.value)}
              placeholder="https://example.com/app"
              ref={appUrlRef}
              type="url"
              value={appUrl}
            />
            <span className="hint">Optional. The preview below helps catch framing and browser runtime issues.</span>
          </label>

          <div className="inspector-actions">
            <button className="primary-link" disabled={isRunning} onClick={inspectServer} type="button">
              {isRunning ? "Testing..." : "Run inspection"}
            </button>
            <button className="secondary-link" disabled={isRunning || isCallingTool} onClick={resetInspector} type="button">
              Reset
            </button>
          </div>

          <div className="inspector-privacy-note">
            <strong>Browser-only test</strong>
            <span>Endpoint URLs, tokens, and tool arguments are not submitted to mcpapp.</span>
          </div>
        </div>

        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">Checks</p>
            <h2>Inspection results</h2>
          </div>
          <div className="inspector-checks">
            {checks.map((check) => (
              <div className="inspector-check" key={check.key}>
                <span className={`inspector-status ${check.status}`}>{statusLabel(check.status)}</span>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="inspector-summary-grid">
        <article className="inspector-summary-card">
          <span>Server</span>
          <strong>{serverInfo.serverInfo?.name ?? "Not initialized"}</strong>
          <p>{serverInfo.serverInfo?.version ? `Version ${serverInfo.serverInfo.version}` : "Run inspection to read server info."}</p>
        </article>
        <article className="inspector-summary-card">
          <span>Protocol</span>
          <strong>{negotiatedVersion || "-"}</strong>
          <p>{sessionId ? "Session header captured." : "No readable session header yet."}</p>
        </article>
        <article className="inspector-summary-card">
          <span>Capabilities</span>
          <strong>{serverInfo.capabilities ? Object.keys(serverInfo.capabilities).join(", ") || "None" : "-"}</strong>
          <p>{serverInfo.instructions ? serverInfo.instructions : "Server instructions appear here when provided."}</p>
        </article>
      </section>

      <section className="inspector-layout inspector-results-layout">
        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">Inventory</p>
            <h2>Tools, prompts, and resources</h2>
          </div>

          <div className="inspector-tabs">
            <span>{tools.length} tools</span>
            <span>{prompts.length} prompts</span>
            <span>{resources.length} resources</span>
          </div>

          <div className="inspector-inventory">
            {tools.length ? (
              tools.map((tool) => (
                <button
                  className={`inspector-tool-row ${selectedTool?.name === tool.name ? "active" : ""}`}
                  key={tool.name}
                  onClick={() => setSelectedToolName(tool.name)}
                  type="button"
                >
                  <strong>{tool.name}</strong>
                  <span>{tool.description ?? "No description supplied."}</span>
                </button>
              ))
            ) : (
              <p className="inspector-empty">No tools loaded yet.</p>
            )}
          </div>

          {prompts.length || resources.length ? (
            <div className="inspector-secondary-lists">
              {prompts.slice(0, 6).map((prompt) => (
                <div key={`prompt-${prompt.name}`}>
                  <strong>{prompt.name}</strong>
                  <span>{prompt.description ?? "Prompt template"}</span>
                </div>
              ))}
              {resources.slice(0, 6).map((resource) => (
                <div key={`resource-${resource.uri}`}>
                  <strong>{resource.name ?? resource.uri}</strong>
                  <span>{resource.mimeType ?? resource.description ?? resource.uri}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">Tool call</p>
            <h2>{selectedTool?.name ?? "Select a tool"}</h2>
          </div>

          {selectedTool?.inputSchema ? (
            <details className="inspector-schema">
              <summary>Input schema</summary>
              <pre>{prettyJson(selectedTool.inputSchema)}</pre>
            </details>
          ) : (
            <p className="inspector-empty">Run inspection and select a tool to see its input schema.</p>
          )}

          <label className="field">
            <span>Arguments JSON</span>
            <textarea
              className="textarea inspector-args"
              onChange={(event) => setToolArguments(event.target.value)}
              ref={toolArgumentsRef}
              spellCheck={false}
              value={toolArguments}
            />
          </label>

          <button
            className="primary-link"
            disabled={!selectedTool || !canUseSession || isCallingTool}
            onClick={callSelectedTool}
            type="button"
          >
            {isCallingTool ? "Calling..." : "Call tool"}
          </button>

          {toolError ? <p className="import-status error">{toolError}</p> : null}
          {toolResult !== undefined ? (
            <div className="inspector-result">
              <span>Result</span>
              <pre>{prettyJson(toolResult)}</pre>
            </div>
          ) : null}
        </div>
      </section>

      <section className="inspector-layout inspector-results-layout">
        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">Protocol log</p>
            <h2>Request and response trace</h2>
          </div>
          <div className="inspector-log" aria-live="polite">
            {logs.length ? (
              logs.map((entry) => (
                <article className={`inspector-log-entry ${entry.direction}`} key={entry.id}>
                  <strong>{entry.title}</strong>
                  {entry.body ? <pre>{entry.body}</pre> : null}
                </article>
              ))
            ) : (
              <p className="inspector-empty">Run an inspection to see JSON-RPC traffic.</p>
            )}
          </div>
        </div>

        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">App surface</p>
            <h2>Browser preview</h2>
          </div>
          {appUrl.trim() ? (
            <iframe
              className="inspector-app-frame"
              referrerPolicy="no-referrer"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
              src={appUrl}
              title="MCP app browser preview"
            />
          ) : (
            <div className="inspector-app-empty">Add an app URL to preview the user-facing surface.</div>
          )}
        </div>
      </section>
    </div>
  );
}
