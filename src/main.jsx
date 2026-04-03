// main.jsx — JARVIS OS Entry Point
// WHY: This is where React mounts. We import global.css here (not in App.jsx)
// because styles need to load before any component renders.

import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  // Only send errors, not performance data (free tier friendly)
  tracesSampleRate: 0,
  // Don't send in dev unless DSN is set
  beforeSend(event) {
    // Strip localStorage data from error context (privacy)
    if (event.extra) {
      Object.keys(event.extra).forEach(k => {
        if (k.startsWith('jos-')) delete event.extra[k]
      })
    }
    return event
  },
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
