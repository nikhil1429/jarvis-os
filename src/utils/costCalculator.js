// costCalculator.js — Token-to-cost conversion for Anthropic models
// WHY: We log every API call's cost to track spending. Different models have different
// pricing per million tokens. This function does the math so apiLogger.js stays clean.
// Prices are per 1M tokens: input (what we send) is cheaper, output (what Claude generates) costs more.

const PRICING = {
  // Sonnet: the workhorse — used for 92% of calls (training modes, chat, briefings)
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-sonnet-4-6': { input: 3, output: 15 },

  // Opus: the deep thinker — used for 6% (mood oracle, newsletters, complex analysis)
  'claude-opus-4-6': { input: 15, output: 75 },

  // Opus Extended: Opus + extended thinking — used for 2% (monthly analysis, deep dives)
  // Same base price but thinking tokens are billed as output tokens
  'claude-opus-4-6-extended': { input: 15, output: 75 },
}

/**
 * calculateCost — Given model + token counts, returns cost in USD
 * WHY: Enables the API cost dashboard and budget alerts.
 * @param {string} model — Model identifier
 * @param {number} inputTokens — Tokens sent to the API
 * @param {number} outputTokens — Tokens received from the API
 * @returns {number} Cost in USD (e.g., 0.0045)
 */
export function calculateCost(model, inputTokens, outputTokens) {
  const pricing = PRICING[model] || PRICING['claude-sonnet-4-6']
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000
}

export { PRICING }
