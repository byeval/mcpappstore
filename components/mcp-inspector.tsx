"use client";

import { useMemo, useRef, useState } from "react";

import { formatMessage, type Locale } from "@/lib/i18n";
import { staticPageCopy } from "@/lib/static-page-i18n";

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
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
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
const defaultRequestTimeoutMs = "30000";

function initialChecks(copy: ReturnType<typeof staticPageCopy>["mcpInspector"]): InspectorCheck[] {
  return [
    { key: "url", label: copy.checks.url.label, status: "idle", detail: copy.checks.url.detail },
    { key: "cors", label: copy.checks.cors.label, status: "idle", detail: copy.checks.cors.detail },
    { key: "initialize", label: copy.checks.initialize.label, status: "idle", detail: copy.checks.initialize.detail },
    { key: "initialized", label: copy.checks.initialized.label, status: "idle", detail: copy.checks.initialized.detail },
    { key: "ping", label: copy.checks.ping.label, status: "idle", detail: copy.checks.ping.detail },
    { key: "tools", label: copy.checks.tools.label, status: "idle", detail: copy.checks.tools.detail },
    { key: "prompts", label: copy.checks.prompts.label, status: "idle", detail: copy.checks.prompts.detail },
    { key: "resources", label: copy.checks.resources.label, status: "idle", detail: copy.checks.resources.detail },
    { key: "app", label: copy.checks.app.label, status: "idle", detail: copy.checks.app.detail },
  ];
}

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

function parsePromptArguments(value: string): Record<string, string> {
  const args = parseJsonObject(value, "Prompt arguments");
  const invalidKey = Object.entries(args).find(([, item]) => item !== null && typeof item !== "string")?.[0];
  if (invalidKey) {
    throw new Error(`Prompt argument "${invalidKey}" must be a string or null.`);
  }

  return Object.fromEntries(
    Object.entries(args)
      .filter(([, item]) => item !== null)
      .map(([key, item]) => [key, item as string]),
  );
}

function absoluteUrl(value: string, base?: string): string {
  return new URL(value.trim(), base).toString();
}

function positiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function queryValue(names: string[], fallback = ""): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  const searchParams = new URLSearchParams(window.location.search);
  for (const name of names) {
    const value = searchParams.get(name);
    if (value) {
      return value;
    }
  }

  return fallback;
}

function statusLabel(status: CheckStatus, copy: ReturnType<typeof staticPageCopy>["mcpInspector"]): string {
  return copy.statuses[status];
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

    const args = Array.isArray(prompt.arguments)
      ? prompt.arguments.flatMap((item) => {
          if (!isRecord(item)) {
            return [];
          }

          return [{
            name: typeof item.name === "string" ? item.name : "argument",
            description: typeof item.description === "string" ? item.description : undefined,
            required: typeof item.required === "boolean" ? item.required : undefined,
          }];
        })
      : undefined;

    return [{
      name: typeof prompt.name === "string" ? prompt.name : "unnamed_prompt",
      description: typeof prompt.description === "string" ? prompt.description : undefined,
      arguments: args,
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

export function McpInspector({ locale }: { locale: Locale }) {
  const copy = useMemo(() => staticPageCopy(locale).mcpInspector, [locale]);
  const baseChecks = useMemo(() => initialChecks(copy), [copy]);
  const [endpointUrl, setEndpointUrl] = useState(() => queryValue(["serverUrl", "endpoint"]));
  const [appUrl, setAppUrl] = useState("");
  const [protocolVersion, setProtocolVersion] = useState(() => queryValue(["protocolVersion"], protocolVersions[0]));
  const [authToken, setAuthToken] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(() => queryValue(["timeoutMs"], defaultRequestTimeoutMs));
  const [checks, setChecks] = useState<InspectorCheck[]>(baseChecks);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [negotiatedVersion, setNegotiatedVersion] = useState("");
  const [serverInfo, setServerInfo] = useState<InitializeResult>({});
  const [tools, setTools] = useState<McpTool[]>([]);
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);
  const [resources, setResources] = useState<McpResource[]>([]);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [selectedPromptName, setSelectedPromptName] = useState("");
  const [selectedResourceUri, setSelectedResourceUri] = useState("");
  const [toolArguments, setToolArguments] = useState("{}");
  const [promptArguments, setPromptArguments] = useState("{}");
  const [toolResult, setToolResult] = useState<JsonValue | undefined>(undefined);
  const [promptResult, setPromptResult] = useState<JsonValue | undefined>(undefined);
  const [resourceResult, setResourceResult] = useState<JsonValue | undefined>(undefined);
  const [toolError, setToolError] = useState("");
  const [promptError, setPromptError] = useState("");
  const [resourceError, setResourceError] = useState("");
  const [configStatus, setConfigStatus] = useState("");
  const [configPreview, setConfigPreview] = useState("");
  const [isCallingTool, setIsCallingTool] = useState(false);
  const [isGettingPrompt, setIsGettingPrompt] = useState(false);
  const [isReadingResource, setIsReadingResource] = useState(false);
  const endpointUrlRef = useRef<HTMLInputElement>(null);
  const appUrlRef = useRef<HTMLInputElement>(null);
  const protocolVersionRef = useRef<HTMLSelectElement>(null);
  const authTokenRef = useRef<HTMLInputElement>(null);
  const headersTextRef = useRef<HTMLTextAreaElement>(null);
  const requestTimeoutRef = useRef<HTMLInputElement>(null);
  const toolArgumentsRef = useRef<HTMLTextAreaElement>(null);
  const promptArgumentsRef = useRef<HTMLTextAreaElement>(null);
  const logIdRef = useRef(0);

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.name === selectedToolName) ?? tools[0],
    [selectedToolName, tools],
  );
  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.name === selectedPromptName) ?? prompts[0],
    [selectedPromptName, prompts],
  );
  const selectedResource = useMemo(
    () => resources.find((resource) => resource.uri === selectedResourceUri) ?? resources[0],
    [selectedResourceUri, resources],
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

  const currentEndpointUrl = () => endpointUrlRef.current?.value.trim() || endpointUrl.trim();

  const currentRequestTimeoutMs = () =>
    positiveInteger(requestTimeoutRef.current?.value ?? requestTimeoutMs, Number.parseInt(defaultRequestTimeoutMs, 10));

  const createConfigHeaders = () => {
    const headers: Record<string, string> = {};
    const token = (authTokenRef.current?.value ?? authToken).trim();
    if (token) {
      headers.Authorization = token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
    }

    const customHeaders = parseJsonObject(headersTextRef.current?.value ?? headersText, "Custom headers");
    for (const [key, value] of Object.entries(customHeaders)) {
      if (typeof value !== "string") {
        throw new Error(`Custom header "${key}" must be a string value.`);
      }
      headers[key] = value;
    }

    return headers;
  };

  const createServerEntry = () => {
    const url = absoluteUrl(currentEndpointUrl());
    const headers = createConfigHeaders();
    const entry: Record<string, JsonValue> = {
      type: "streamable-http",
      url,
      note: "For Streamable HTTP connections, add this URL directly in your MCP client.",
    };

    if (Object.keys(headers).length > 0) {
      entry.headers = headers;
    }

    return entry;
  };

  const writeClipboardText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        if (!document.execCommand("copy")) {
          throw new Error("Clipboard copy was blocked by the browser.");
        }
      } finally {
        textarea.remove();
      }
    }
  };

  const copyConfig = async (mode: "entry" | "file") => {
    try {
      const entry = createServerEntry();
      const payload = mode === "entry" ? entry : { mcpServers: { "default-server": entry } };
      const text = prettyJson(payload);

      try {
        await writeClipboardText(text);
        setConfigPreview("");
        setConfigStatus(mode === "entry" ? "Server entry copied." : "mcp.json copied.");
      } catch (copyError) {
        setConfigPreview(text);
        setConfigStatus(
          copyError instanceof Error
            ? `${copyError.message} Config shown below.`
            : "Could not copy config. Config shown below.",
        );
      }
    } catch (error) {
      setConfigPreview("");
      setConfigStatus(
        error instanceof Error
          ? error.message
          : "Could not copy config.",
      );
    }
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

    for (const [key, value] of Object.entries(createConfigHeaders())) {
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

  const fetchWithTimeout = async (url: string, options: RequestInit) => {
    const timeoutMs = currentRequestTimeoutMs();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs} ms.`);
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
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

    const response = await fetchWithTimeout(url, {
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
    const response = await fetchWithTimeout(url, {
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
    setChecks(baseChecks.map((check) => ({ ...check, status: "idle" as const })));
    setTools([]);
    setPrompts([]);
    setResources([]);
    setServerInfo({});
    setSessionId("");
    setNegotiatedVersion("");
    setSelectedToolName("");
    setSelectedPromptName("");
    setSelectedResourceUri("");
    setToolResult(undefined);
    setPromptResult(undefined);
    setResourceResult(undefined);
    setToolError("");
    setPromptError("");
    setResourceError("");
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
        const nextPrompts = coercePrompts(promptsResponse.payload?.result);
        setPrompts(nextPrompts);
        setSelectedPromptName(nextPrompts[0]?.name ?? "");
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
        const nextResources = coerceResources(resourcesResponse.payload?.result);
        setResources(nextResources);
        setSelectedResourceUri(nextResources[0]?.uri ?? "");
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

  const getSelectedPrompt = async () => {
    if (!selectedPrompt) {
      setPromptError("Choose a prompt first.");
      return;
    }

    setIsGettingPrompt(true);
    setPromptError("");
    setPromptResult(undefined);

    try {
      const url = absoluteUrl(currentEndpointUrl());
      const args = parsePromptArguments(promptArgumentsRef.current?.value ?? promptArguments);
      const params: Record<string, JsonValue> = { name: selectedPrompt.name };
      if (Object.keys(args).length > 0) {
        params.arguments = args;
      }

      const response = await sendRequest({
        url,
        message: makeJsonRpc(Date.now(), "prompts/get", params),
        includeProtocol: true,
        includeSession: true,
      });

      setPromptResult(response.payload?.result);
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : "Prompt request failed.");
    } finally {
      setIsGettingPrompt(false);
    }
  };

  const readSelectedResource = async () => {
    if (!selectedResource) {
      setResourceError("Choose a resource first.");
      return;
    }

    setIsReadingResource(true);
    setResourceError("");
    setResourceResult(undefined);

    try {
      const response = await sendRequest({
        url: absoluteUrl(currentEndpointUrl()),
        message: makeJsonRpc(Date.now(), "resources/read", { uri: selectedResource.uri }),
        includeProtocol: true,
        includeSession: true,
      });

      setResourceResult(response.payload?.result);
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : "Resource request failed.");
    } finally {
      setIsReadingResource(false);
    }
  };

  const resetInspector = () => {
    setChecks(baseChecks);
    setLogs([]);
    setTools([]);
    setPrompts([]);
    setResources([]);
    setServerInfo({});
    setSessionId("");
    setNegotiatedVersion("");
    setSelectedToolName("");
    setSelectedPromptName("");
    setSelectedResourceUri("");
    setToolArguments("{}");
    setPromptArguments("{}");
    setToolResult(undefined);
    setPromptResult(undefined);
    setResourceResult(undefined);
    setToolError("");
    setPromptError("");
    setResourceError("");
    setConfigStatus("");
    setConfigPreview("");
  };

  return (
    <div className="page-stack">
      <section className="inspector-hero">
        <div>
          <p className="eyebrow">{copy.heroEyebrow}</p>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroBody}</p>
          <div className="inspector-hero-actions">
            <a className="primary-link" href="#inspector-workbench">
              {copy.startTesting}
            </a>
            <a className="secondary-link" href="https://modelcontextprotocol.io/specification/2025-11-25/basic/transports" rel="noreferrer" target="_blank">
              {copy.transportSpec}
            </a>
          </div>
        </div>
        <div className="inspector-trace" aria-label={copy.protocolSequenceAria}>
          <span>{copy.traceInitialize}</span>
          <span>{copy.traceInitialized}</span>
          <span>{copy.traceToolsList}</span>
          <span>{copy.traceToolsCall}</span>
        </div>
      </section>

      <section className="inspector-layout" id="inspector-workbench">
        <div className="inspector-panel inspector-config">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.connectionEyebrow}</p>
            <h2>{copy.endpointSettings}</h2>
          </div>

          <label className="field">
            <span>{copy.endpointUrl}</span>
            <input
              className="input"
              onChange={(event) => setEndpointUrl(event.target.value)}
              placeholder="https://example.com/mcp"
              ref={endpointUrlRef}
              type="url"
              value={endpointUrl}
            />
          </label>

          <div className="row-3">
            <label className="field">
              <span>{copy.protocolVersion}</span>
              <select className="input" onChange={(event) => setProtocolVersion(event.target.value)} ref={protocolVersionRef} value={protocolVersion}>
                {protocolVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{copy.timeoutMs}</span>
              <input
                className="input"
                min="1000"
                onChange={(event) => setRequestTimeoutMs(event.target.value)}
                ref={requestTimeoutRef}
                step="1000"
                type="number"
                value={requestTimeoutMs}
              />
            </label>
            <label className="field">
              <span>{copy.bearerToken}</span>
              <input
                className="input"
                onChange={(event) => setAuthToken(event.target.value)}
                placeholder={copy.optional}
                ref={authTokenRef}
                type="password"
                value={authToken}
              />
            </label>
          </div>

          <label className="field">
            <span>{copy.customHeaders}</span>
            <textarea
              className="textarea inspector-small-textarea"
              onChange={(event) => setHeadersText(event.target.value)}
              placeholder={'{"X-Workspace": "demo"}'}
              ref={headersTextRef}
              value={headersText}
            />
            <span className="hint">{copy.headersHint}</span>
          </label>

          <label className="field">
            <span>{copy.appUrl}</span>
            <input
              className="input"
              onChange={(event) => setAppUrl(event.target.value)}
              placeholder="https://example.com/app"
              ref={appUrlRef}
              type="url"
              value={appUrl}
            />
            <span className="hint">{copy.appUrlHint}</span>
          </label>

          <div className="inspector-actions">
            <button className="primary-link" disabled={isRunning} onClick={inspectServer} type="button">
              {isRunning ? copy.testing : copy.runInspection}
            </button>
            <button className="secondary-link" disabled={isRunning || isCallingTool} onClick={resetInspector} type="button">
              {copy.reset}
            </button>
          </div>

          <div className="inspector-privacy-note">
            <strong>{copy.privacyTitle}</strong>
            <span>{copy.privacyBody}</span>
          </div>

          <div className="inspector-result">
            <span>{copy.clientConfig}</span>
            <p className="inspector-empty">
              {copy.clientConfigBody}
            </p>
            <div className="inspector-actions">
              <button className="secondary-link" onClick={() => void copyConfig("entry")} type="button">
                {copy.copyServerEntry}
              </button>
              <button className="secondary-link" onClick={() => void copyConfig("file")} type="button">
                {copy.copyMcpJson}
              </button>
            </div>
            {configStatus ? <p className="import-status">{configStatus}</p> : null}
            {configPreview ? <pre>{configPreview}</pre> : null}
          </div>
        </div>

        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.checksEyebrow}</p>
            <h2>{copy.checksTitle}</h2>
          </div>
          <div className="inspector-checks">
            {checks.map((check) => (
              <div className="inspector-check" key={check.key}>
                <span className={`inspector-status ${check.status}`}>{statusLabel(check.status, copy)}</span>
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
          <span>{copy.summaryServer}</span>
          <strong>{serverInfo.serverInfo?.name ?? copy.notInitialized}</strong>
          <p>{serverInfo.serverInfo?.version ? formatMessage(copy.version, { version: serverInfo.serverInfo.version }) : copy.runToReadServerInfo}</p>
        </article>
        <article className="inspector-summary-card">
          <span>{copy.summaryProtocol}</span>
          <strong>{negotiatedVersion || "-"}</strong>
          <p>{sessionId ? copy.sessionCaptured : copy.noSessionYet}</p>
        </article>
        <article className="inspector-summary-card">
          <span>{copy.summaryCapabilities}</span>
          <strong>{serverInfo.capabilities ? Object.keys(serverInfo.capabilities).join(", ") || copy.none : "-"}</strong>
          <p>{serverInfo.instructions ? serverInfo.instructions : copy.instructionsPlaceholder}</p>
        </article>
      </section>

      <section className="inspector-layout inspector-results-layout">
        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.inventoryEyebrow}</p>
            <h2>{copy.inventoryTitle}</h2>
          </div>

          <div className="inspector-tabs">
            <span>{formatMessage(copy.toolsCount, { count: tools.length })}</span>
            <span>{formatMessage(copy.promptsCount, { count: prompts.length })}</span>
            <span>{formatMessage(copy.resourcesCount, { count: resources.length })}</span>
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
                  <span>{tool.description ?? copy.noDescription}</span>
                </button>
              ))
            ) : (
              <p className="inspector-empty">{copy.noTools}</p>
            )}
          </div>

          {prompts.length || resources.length ? (
            <div className="inspector-secondary-lists">
              {prompts.slice(0, 6).map((prompt) => (
                <button
                  className={`inspector-tool-row ${selectedPrompt?.name === prompt.name ? "active" : ""}`}
                  key={`prompt-${prompt.name}`}
                  onClick={() => setSelectedPromptName(prompt.name)}
                  type="button"
                >
                  <strong>{prompt.name}</strong>
                  <span>{prompt.description ?? copy.promptTemplate}</span>
                </button>
              ))}
              {resources.slice(0, 6).map((resource) => (
                <button
                  className={`inspector-tool-row ${selectedResource?.uri === resource.uri ? "active" : ""}`}
                  key={`resource-${resource.uri}`}
                  onClick={() => setSelectedResourceUri(resource.uri)}
                  type="button"
                >
                  <strong>{resource.name ?? resource.uri}</strong>
                  <span>{resource.mimeType ?? resource.description ?? resource.uri}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.toolCallEyebrow}</p>
            <h2>{selectedTool?.name ?? copy.selectTool}</h2>
          </div>

          {selectedTool?.inputSchema ? (
            <details className="inspector-schema">
              <summary>{copy.inputSchema}</summary>
              <pre>{prettyJson(selectedTool.inputSchema)}</pre>
            </details>
          ) : (
            <p className="inspector-empty">{copy.toolSchemaEmpty}</p>
          )}

          <label className="field">
            <span>{copy.toolArguments}</span>
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
            {isCallingTool ? copy.calling : copy.callTool}
          </button>

          {toolError ? <p className="import-status error">{toolError}</p> : null}
          {toolResult !== undefined ? (
            <div className="inspector-result">
              <span>{copy.result}</span>
              <pre>{prettyJson(toolResult)}</pre>
            </div>
          ) : null}
        </div>
      </section>

      <section className="inspector-layout inspector-results-layout">
        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.promptGetEyebrow}</p>
            <h2>{selectedPrompt?.name ?? copy.selectPrompt}</h2>
          </div>

          {selectedPrompt?.arguments?.length ? (
            <div className="inspector-secondary-lists">
              {selectedPrompt.arguments.map((argument) => (
                <div key={argument.name}>
                  <strong>{argument.name}{argument.required ? " *" : ""}</strong>
                  <span>{argument.description ?? copy.promptArgument}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="inspector-empty">{copy.promptEmpty}</p>
          )}

          <label className="field">
            <span>{copy.promptArguments}</span>
            <textarea
              className="textarea inspector-args"
              onChange={(event) => setPromptArguments(event.target.value)}
              ref={promptArgumentsRef}
              spellCheck={false}
              value={promptArguments}
            />
          </label>

          <button
            className="primary-link"
            disabled={!selectedPrompt || !canUseSession || isGettingPrompt}
            onClick={getSelectedPrompt}
            type="button"
          >
            {isGettingPrompt ? copy.getting : copy.getPrompt}
          </button>

          {promptError ? <p className="import-status error">{promptError}</p> : null}
          {promptResult !== undefined ? (
            <div className="inspector-result">
              <span>{copy.result}</span>
              <pre>{prettyJson(promptResult)}</pre>
            </div>
          ) : null}
        </div>

        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.resourceReadEyebrow}</p>
            <h2>{selectedResource?.name ?? selectedResource?.uri ?? copy.selectResource}</h2>
          </div>

          {selectedResource ? (
            <div className="inspector-result">
              <span>{copy.resourceUri}</span>
              <pre>{selectedResource.uri}</pre>
            </div>
          ) : (
            <p className="inspector-empty">{copy.resourceEmpty}</p>
          )}

          <button
            className="primary-link"
            disabled={!selectedResource || !canUseSession || isReadingResource}
            onClick={readSelectedResource}
            type="button"
          >
            {isReadingResource ? copy.reading : copy.readResource}
          </button>

          {resourceError ? <p className="import-status error">{resourceError}</p> : null}
          {resourceResult !== undefined ? (
            <div className="inspector-result">
              <span>{copy.result}</span>
              <pre>{prettyJson(resourceResult)}</pre>
            </div>
          ) : null}
        </div>
      </section>

      <section className="inspector-layout inspector-results-layout">
        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.protocolLogEyebrow}</p>
            <h2>{copy.protocolLogTitle}</h2>
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
              <p className="inspector-empty">{copy.protocolLogEmpty}</p>
            )}
          </div>
        </div>

        <div className="inspector-panel">
          <div className="inspector-panel-head">
            <p className="eyebrow">{copy.appSurfaceEyebrow}</p>
            <h2>{copy.browserPreview}</h2>
          </div>
          {appUrl.trim() ? (
            <iframe
              className="inspector-app-frame"
              referrerPolicy="no-referrer"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
              src={appUrl}
              title={copy.previewTitle}
            />
          ) : (
            <div className="inspector-app-empty">{copy.previewEmpty}</div>
          )}
        </div>
      </section>
    </div>
  );
}
