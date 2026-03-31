// vite.config.js — Vite configuration with Anthropic API proxy
// WHY: The browser can't call api.anthropic.com directly due to CORS restrictions.
// Vite's dev proxy forwards /api/claude requests to Anthropic's endpoint, injecting
// the API key and required headers server-side. This means our frontend code just
// calls fetch('/api/claude', ...) and it works without CORS issues.
// In production, Vercel serverless functions (api/claude.js) handle this instead.

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // WHY loadEnv: Vite only exposes VITE_ prefixed vars to client code by default.
  // We need the API key on the server (proxy) side, so we load it explicitly here.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/claude': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => '/v1/messages',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // WHY remove origin/referer: Anthropic's API rejects requests with
              // browser origin headers (CORS protection). Stripping them makes the
              // proxy request look like a server-to-server call.
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
              proxyReq.setHeader('x-api-key', env.VITE_ANTHROPIC_API_KEY || '')
              proxyReq.setHeader('anthropic-version', '2023-06-01')
              proxyReq.setHeader('content-type', 'application/json')
            })
          },
        },
      },
    },
  }
})
