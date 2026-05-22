import { defineConfig, type ViteDevServer } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import rsc from "@vitejs/plugin-rsc";
import vinext from "vinext";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const vinextErrorBoundaryPath = path.join(rootDir, "node_modules/vinext/dist/shims/error-boundary.js");
const localErrorBoundaryPath = path.join(rootDir, "lib/vinext-error-boundary-shim.tsx");
const boundaryProxyPrefix = "/@id/__x00__virtual:vite-rsc/client-in-server-package-proxy/";

function boundaryProxyModule(): string {
  return `
export * from "/lib/vinext-error-boundary-shim.tsx";
import * as __all__ from "/lib/vinext-error-boundary-shim.tsx";
export default __all__.default;
`;
}

function vinextErrorBoundaryShim() {
  return {
    name: "mcpapp-vinext-error-boundary-shim",
    enforce: "pre" as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (!pathname?.startsWith(boundaryProxyPrefix)) {
          next();
          return;
        }

        const decodedPath = decodeURIComponent(pathname.slice(boundaryProxyPrefix.length));
        if (decodedPath !== vinextErrorBoundaryPath) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/javascript");
        res.setHeader("Cache-Control", "no-cache");
        res.end(boundaryProxyModule());
      });
    },
    resolveId(id: string) {
      if (id === vinextErrorBoundaryPath || id.endsWith("/node_modules/vinext/dist/shims/error-boundary.js")) {
        return localErrorBoundaryPath;
      }

      return null;
    },
  };
}

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    build: {
      rollupOptions: {
        external: ["cloudflare:workers"],
      },
    },
    optimizeDeps: {
      exclude: ["cloudflare:workers"],
    },
    ssr: {
      external: ["cloudflare:workers"],
    },
    plugins: isDev
      ? [vinextErrorBoundaryShim(), vinext()]
      : [
          vinext({
            rsc: false,
          }),
          rsc({
            entries: {
              rsc: "virtual:vinext-rsc-entry",
              ssr: "virtual:vinext-app-ssr-entry",
              client: "virtual:vinext-app-browser-entry",
            },
          }),
          cloudflare({
            viteEnvironment: {
              name: "rsc",
              childEnvironments: ["ssr"],
            },
          }),
        ],
  };
});
