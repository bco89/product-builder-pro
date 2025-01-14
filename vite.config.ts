import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { UserConfig } from 'vite';

installGlobals({ nativeFetch: true });

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname;

interface HmrConfig {
  protocol: 'ws' | 'wss';
  host: string;
  port: number;
  clientPort: number;
}

const hmrConfig: HmrConfig = host === "localhost"
  ? {
      protocol: "ws",
      host: "localhost",
      port: 64999,
      clientPort: 64999,
    }
  : {
      protocol: "wss",
      host: host,
      port: parseInt(process.env.FRONTEND_PORT || '8002'),
      clientPort: 443,
    };

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      serverModuleFormat: "esm",
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
        v3_routeConfig: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
  esbuild: {
    target: 'es2020',
  },
}) as UserConfig; 