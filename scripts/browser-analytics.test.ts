import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { analyticsAllowed, analyticsUrl, startGoogleAnalytics, startCloudflareAnalytics, trackCatalogEvent } from "../lib/browser-analytics";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
afterEach(() => {
  for (const [key, descriptor] of [["window", originalWindow], ["document", originalDocument]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
function browser(url = "https://mcpapp.net/", options: { webdriver?: boolean; disabled?: boolean; receipt?: boolean } = {}) {
  let location = new URL(url);
  let cookie = options.receipt ? "mcpapp_submission_received=1" : "";
  const scripts: Array<Record<string, unknown>> = [];
  const listeners = new Map<string, EventListener>();
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  const state = {
    get location() { return location; },
    navigator: { webdriver: options.webdriver ?? false },
    sessionStorage: { getItem: () => options.disabled ? "1" : null },
    dataLayer: [] as unknown[],
    history: {
      pushState(_data: unknown, _unused: string, target?: string | URL | null) { if (target) location = new URL(target, location); },
      replaceState(_data: unknown, _unused: string, target?: string | URL | null) { if (target) location = new URL(target, location); },
    },
    requestAnimationFrame(callback: FrameRequestCallback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
    addEventListener(name: string, callback: EventListener) { listeners.set(name, callback); },
    removeEventListener(name: string) { listeners.delete(name); },
  };
  const documentStub = {
    title: "Directory", referrer: "https://www.google.com/search?q=private",
    get cookie() { return cookie; },
    set cookie(value: string) { cookie = value.includes("Max-Age=0") ? "" : value; },
    getElementById(id: string) { return scripts.find(script => script.id === id); },
    querySelector() { return scripts.find(script => String(script.src).includes("cloudflareinsights")); },
    createElement() { return { dataset: {} }; },
    head: { appendChild(script: Record<string, unknown>) { scripts.push(script); } },
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: state });
  Object.defineProperty(globalThis, "document", { configurable: true, value: documentStub });
  return {
    state, scripts, document: documentStub, listeners,
    navigateBack(target: string) { location = new URL(target); listeners.get("popstate")?.(new Event("popstate")); },
    flush() { while (frames.size) { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(0)); } },
    events(name: string) { return state.dataLayer.map(value => Array.from(value as ArrayLike<unknown>)).filter(value => value[0] === "event" && value[1] === name); },
  };
}

test("local, preview and explicit automation never load either analytics library", () => {
  for (const [url, options] of [
    ["http://localhost:3001/", {}], ["https://mcpapp-preview.byeval.workers.dev/", {}],
    ["https://mcpapp.net/", { webdriver: true }], ["https://mcpapp.net/", { disabled: true }],
  ] as const) {
    const b = browser(url, options);
    assert.equal(analyticsAllowed(), false);
    startGoogleAnalytics("G-TEST"); startCloudflareAnalytics("test");
    trackCatalogEvent("app_open", { app_id: "example" });
    assert.equal(b.scripts.length, 0); assert.equal(b.state.dataLayer.length, 0);
  }
});

test("one view per committed route including back; hash and same-route replacement do not duplicate", () => {
  const b = browser(); const originalPush = b.state.history.pushState;
  const stop = startGoogleAnalytics("G-TEST");
  assert.equal(b.events("page_view").length, 1);
  b.state.history.pushState({}, "", "/app/example"); b.document.title = "Example"; b.flush();
  b.state.history.replaceState({}, "", "/app/example#tools"); b.flush();
  assert.equal(b.events("page_view").length, 2);
  assert.equal((b.events("page_view")[1][2] as Record<string, unknown>).page_title, "Example");
  assert.equal((b.events("page_view")[1][2] as Record<string, unknown>).page_referrer, "https://mcpapp.net/");
  b.navigateBack("https://mcpapp.net/"); b.flush();
  assert.equal(b.events("page_view").length, 3);
  stop(); assert.equal(b.state.history.pushState, originalPush);
  startGoogleAnalytics("G-TEST")();
  assert.equal(b.events("page_view").length, 3); assert.equal(b.scripts.length, 1);
});

test("page parameters omit submission data and inspector secrets but preserve campaign attribution", () => {
  assert.equal(analyticsUrl("https://mcpapp.net/submit/success?id=secret&error=email%40example.com&utm_source=partner#token"), "https://mcpapp.net/submit/success?utm_source=partner");
  assert.equal(analyticsUrl("https://mcpapp.net/mcp-inspector?url=https://private.example&token=secret"), "https://mcpapp.net/mcp-inspector");
  assert.equal(analyticsUrl("https://mcpapp.net/store?page=2"), "https://mcpapp.net/store?page=2");
});

test("only a successful submission receipt creates a lead, once, without the submission ID", () => {
  let b = browser("https://mcpapp.net/submit/success?id=example");
  startGoogleAnalytics("G-TEST")(); assert.equal(b.events("generate_lead").length, 0);
  b = browser("https://mcpapp.net/zh-hans/submit/success?id=example", { receipt: true });
  startGoogleAnalytics("G-TEST")();
  assert.equal(b.events("generate_lead").length, 1); assert.equal(b.document.cookie, "");
  assert.ok(!JSON.stringify(b.events("generate_lead")).includes("example"));
  startGoogleAnalytics("G-TEST")(); assert.equal(b.events("generate_lead").length, 1);
});
