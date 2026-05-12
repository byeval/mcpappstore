import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import rsc from "@vitejs/plugin-rsc";
import vinext from "vinext";

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
      ? [vinext()]
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
