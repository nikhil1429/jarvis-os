// vite.config.js — Vite configuration with API proxy, PWA, and code splitting

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: "CacheFirst",
              options: { cacheName: "google-fonts" },
            },
            {
              urlPattern: /\/api\//,
              handler: "NetworkFirst",
              options: { cacheName: "api-cache", networkTimeoutSeconds: 10 },
            },
          ],
        },
        manifest: false, // using public/manifest.json
      }),
    ],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ["three"],
            recharts: ["recharts"],
            supabase: ["@supabase/supabase-js"],
            jspdf: ["jspdf"],
            sentry: ["@sentry/react"],
          },
        },
      },
    },
    server: {
      proxy: {
        "/api/claude": {
          target: "https://api.anthropic.com",
          changeOrigin: true,
          rewrite: (path) => "/v1/messages",
          configure: (proxy) => {
            console.log(
              "PROXY: API key loaded:",
              env.VITE_ANTHROPIC_API_KEY
                ? "YES (" + env.VITE_ANTHROPIC_API_KEY.substring(0, 10) + "...)"
                : "NO KEY",
            );
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("origin");
              proxyReq.removeHeader("referer");
              proxyReq.setHeader("x-api-key", env.VITE_ANTHROPIC_API_KEY || "");
              proxyReq.setHeader("anthropic-version", "2023-06-01");
              proxyReq.setHeader("content-type", "application/json");
            });
          },
        },
      },
    },
  };
});
