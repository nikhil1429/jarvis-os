// modelRouter.js — Three-Brain Auto-Router with 10 priority rules
// WHY: JARVIS uses 3 AI brains (Sonnet/Opus/Opus Extended) at different costs.
// Most calls use Sonnet (~$0.02). The router auto-upgrades to Opus when the
// situation demands deeper analysis — weak concepts, hard modes, low quiz scores,
// strategic days. Priority order means first match wins, preventing double-upgrades.
// Every routing decision is logged so we can audit cost vs. value.

const SONNET = 'claude-sonnet-4-6'
const OPUS = 'claude-opus-4-6'

// WHY: Extended modes that need Opus with extended thinking
const EXTENDED_MODES = ['monthly-analysis', 'quarterly-report', 'tomorrow-simulation']

// WHY: Strategic operations that always use Opus
const STRATEGIC_OPS = ['mood-oracle', 'weakness-radar', 'newsletter', 'portfolio-narrator', 'career-forensics', 'interview-brief']

// WHY: Hard training modes that auto-upgrade to Opus
const HARD_MODES = ['presser', 'battle', 'scenario-bomb', 'interview-sim', 'forensics', 'code-autopsy', 'alter-ego', 'recruiter-ghost']

// WHY: Intent keywords that signal the user needs deeper analysis
const INTENT_KEYWORDS = ['deep dive', 'samjhao', 'confused', 'break it down', 'interview prep', 'explain in detail', 'why does']

/**
 * getModel — Routes to the right brain based on 10 priority rules
 * WHY: First match wins. Order matters — extended modes beat strategic ops,
 * which beat contextual triggers, which beat hard modes, which fall back to Sonnet.
 *
 * @param {string} mode — The current training/feature mode
 * @param {Object} context — Contextual data for routing decisions
 * @returns {{ model: string, tier: number, reason: string, estimatedCost: number, autoUpgraded: boolean }}
 */
export function getModel(mode, context = {}) {
  const {
    weekNumber = 1,
    activeConcept = null,
    lastQuizScore = null,
    dayOfWeek = new Date().getDay(),
    userIntent = '',
    streakRecovery = false,
  } = context

  // Rule 1: Extended modes → OPUS EXTENDED (tier 3)
  if (EXTENDED_MODES.includes(mode)) {
    return {
      model: OPUS,
      tier: 3,
      reason: `Extended mode: ${mode}`,
      estimatedCost: 1.0,
      autoUpgraded: true,
      extended: true,
    }
  }

  // Rule 2: Strategic operations → OPUS (tier 2)
  if (STRATEGIC_OPS.includes(mode)) {
    return {
      model: OPUS,
      tier: 2,
      reason: `Strategic operation: ${mode}`,
      estimatedCost: 0.10,
      autoUpgraded: true,
    }
  }

  // Rule 3: Interview within 24 hours → OPUS
  // WHY: Interview pressure mode — no time for Sonnet-level responses
  if (context.interviewWithin24h) {
    return {
      model: OPUS,
      tier: 2,
      reason: 'Interview within 24 hours',
      estimatedCost: 0.10,
      autoUpgraded: true,
    }
  }

  // Rule 4: Sunday war council — DISABLED (War Council runs manually via claude.ai)
  // if (dayOfWeek === 0) {
  //   return { model: OPUS, tier: 2, reason: 'Sunday war council', estimatedCost: 0.10, autoUpgraded: true }
  // }

  // Rule 5: Weak concept being discussed (strength < 40%) → OPUS
  if (activeConcept && activeConcept.strength < 40) {
    return {
      model: OPUS,
      tier: 2,
      reason: `Weak concept: ${activeConcept.name} (${activeConcept.strength}%)`,
      estimatedCost: 0.10,
      autoUpgraded: true,
    }
  }

  // Rule 6: Quiz score below 5/10 → OPUS
  if (lastQuizScore !== null && lastQuizScore < 5) {
    return {
      model: OPUS,
      tier: 2,
      reason: `Low quiz score: ${lastQuizScore}/10`,
      estimatedCost: 0.10,
      autoUpgraded: true,
    }
  }

  // Rule 7: Streak recovery day → OPUS
  if (streakRecovery) {
    return {
      model: OPUS,
      tier: 2,
      reason: 'Streak recovery day',
      estimatedCost: 0.10,
      autoUpgraded: true,
    }
  }

  // Rule 8: Intent keywords → OPUS
  const intentLower = userIntent.toLowerCase()
  const matchedKeyword = INTENT_KEYWORDS.find(kw => intentLower.includes(kw))
  if (matchedKeyword) {
    return {
      model: OPUS,
      tier: 2,
      reason: `Intent keyword: "${matchedKeyword}"`,
      estimatedCost: 0.10,
      autoUpgraded: true,
    }
  }

  // Rule 9: Hard training modes → OPUS
  if (HARD_MODES.includes(mode)) {
    return {
      model: OPUS,
      tier: 2,
      reason: `Hard training mode: ${mode}`,
      estimatedCost: 0.10,
      autoUpgraded: true,
    }
  }

  // Rule 10: DEFAULT → SONNET
  return {
    model: SONNET,
    tier: 1,
    reason: 'Default routing',
    estimatedCost: 0.02,
    autoUpgraded: false,
  }
}
