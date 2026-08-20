import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => ({
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  server: {
    host: "::",
    port: 8080,
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 1_000,
        pollInterval: 100,
      },
    },
  },
  plugins: [
    mode === "development"
      ? devtools({
          logging: false,
          eventBusConfig: { enabled: false },
          enhancedLogs: { enabled: false },
          consolePiping: { enabled: false },
          removeDevtoolsOnBuild: false,
          injectSource: { enabled: true },
        })
      : undefined,
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // Keep the generic SSR error wrapper as the server entry.
      server: { entry: "server" },
    }),
    command === "build" ? nitro({ defaultPreset: "cloudflare-module" }) : undefined,
    react(),
  ],
}));
