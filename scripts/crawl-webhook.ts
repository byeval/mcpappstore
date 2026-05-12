import { createServer, type IncomingMessage } from "node:http";
import { spawn } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const port = Number.parseInt(process.env.CRAWL_PORT ?? "8789", 10);
const secret = process.env.CRAWL_WEBHOOK_SECRET;
const command = process.env.CRAWL_COMMAND ?? "npm run crawl:daily";
const logPath = resolve(process.cwd(), process.env.CRAWL_LOG_PATH ?? "logs/daily-crawl.log");

let running = false;

async function log(message: string) {
  const line = `${new Date().toISOString()} ${message}\n`;
  process.stdout.write(line);
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, line, "utf8");
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        request.destroy(new Error("Request body too large."));
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function isAuthorized(authHeader: string | undefined) {
  if (!secret) {
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}

function runCrawler() {
  return new Promise<number>((resolveRun) => {
    const child = spawn(command, {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
    });

    child.stdout.on("data", (chunk) => void log(`[stdout] ${String(chunk).trimEnd()}`));
    child.stderr.on("data", (chunk) => void log(`[stderr] ${String(chunk).trimEnd()}`));
    child.on("close", (code) => resolveRun(code ?? 1));
  });
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, running }));
    return;
  }

  if (request.method !== "POST" || request.url !== "/run") {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not found");
    return;
  }

  if (!isAuthorized(request.headers.authorization)) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
    return;
  }

  if (running) {
    response.writeHead(409, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Crawler already running" }));
    return;
  }

  const body = await readBody(request).catch(() => "");
  await log(`[trigger] ${body || "{}"}`);
  running = true;

  void runCrawler()
    .then(async (code) => {
      await log(`[done] exit=${code}`);
    })
    .catch(async (error: unknown) => {
      await log(`[failed] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    })
    .finally(() => {
      running = false;
    });

  response.writeHead(202, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: true, started: true }));
});

server.listen(port, "127.0.0.1", () => {
  void log(`crawl webhook listening on http://127.0.0.1:${port}/run`);
});
