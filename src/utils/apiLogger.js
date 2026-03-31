// apiLogger.js — API call logger for JARVIS OS
// WHY: Every API call must be logged (CLAUDE.md rule). This creates a complete audit trail
// of model usage, costs, latency, and prompt versions. Powers the API dashboard and helps
// detect cost spikes, slow responses, or prompt regressions.

import { calculateCost } from './costCalculator.js'

const STORAGE_KEY = 'jos-api-logs'

/**
 * logAPICall — Appends a structured log entry to jos-api-logs in localStorage
 * WHY: Having a complete log lets us build cost charts, latency graphs, and track
 * which prompt versions perform best per mode.
 *
 * @param {Object} params
 * @param {string} params.model — Which Claude model was used
 * @param {string} params.mode — Which feature/mode triggered the call (e.g., 'mood-oracle', 'briefing')
 * @param {number} params.inputTokens — Tokens sent
 * @param {number} params.outputTokens — Tokens received
 * @param {number} params.latencyMs — Round-trip time in milliseconds
 * @param {string} params.promptVersion — Version tag for the system prompt used
 */
export function logAPICall({ model, mode, inputTokens, outputTokens, latencyMs, promptVersion, autoUpgraded, reason }) {
  try {
    const cost = calculateCost(model, inputTokens, outputTokens)

    const entry = {
      timestamp: new Date().toISOString(),
      model,
      mode,
      inputTokens,
      outputTokens,
      latencyMs,
      cost,
      promptVersion: promptVersion || 'v1',
      autoUpgraded: autoUpgraded || false,
      reason: reason || '',
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    const logs = raw ? JSON.parse(raw) : []
    logs.push(entry)

    // WHY cap at 1000: localStorage has ~5MB limit, and old logs lose relevance.
    // We keep the most recent 1000 entries — enough for ~2 weeks of heavy usage.
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
    return entry
  } catch (err) {
    console.error('[apiLogger] Failed to log API call:', err)
    return null
  }
}
