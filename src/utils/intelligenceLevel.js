// intelligenceLevel.js — Pure function to calculate intelligence confidence level
// WHY: JARVIS should communicate differently based on how much data it has.
// Early on: "Based on ADHD research..." (cautious, using priors)
// Later: "Based on your data..." (confident, using personal patterns)
// This function takes raw data counts and returns the appropriate level + confidence.
// It's a pure function (no side effects, no hooks) so it's testable and reusable.

// WHY these thresholds: Each level requires progressively more data points.
// The numbers are calibrated so that:
// - Day 1: PRIORS_SEED (just research defaults)
// - Week 1: EMERGING (a few check-ins)
// - Week 2-3: LEARNING (consistent daily data)
// - Month 1-2: CALIBRATED (enough for reliable patterns)
// - Month 3+: LOCKED_IN (high confidence, personalized)
const LEVELS = [
  { name: 'PRIORS_SEED',  confidence: 0.40, minDataPoints: 0,  languagePrefix: 'Based on ADHD research' },
  { name: 'EMERGING',     confidence: 0.55, minDataPoints: 5,  languagePrefix: 'Based on your emerging patterns' },
  { name: 'LEARNING',     confidence: 0.70, minDataPoints: 15, languagePrefix: 'Based on your recent patterns' },
  { name: 'CALIBRATED',   confidence: 0.85, minDataPoints: 40, languagePrefix: 'Based on your data' },
  { name: 'LOCKED_IN',    confidence: 0.95, minDataPoints: 90, languagePrefix: 'Based on your established patterns' },
]

/**
 * getIntelligenceLevel — Given a feature name and data count, returns level info
 * @param {string} featureName — The feature being assessed (e.g., 'energy', 'mood', 'focus')
 * @param {number} dataPoints — How many relevant data entries exist for this feature
 * @returns {{ level: string, confidence: number, languagePrefix: string, source: string }}
 */
export function getIntelligenceLevel(featureName, dataPoints) {
  // Walk backwards through levels to find the highest one we qualify for
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (dataPoints >= LEVELS[i].minDataPoints) {
      return {
        level: LEVELS[i].name,
        confidence: LEVELS[i].confidence,
        languagePrefix: LEVELS[i].languagePrefix,
        source: dataPoints > 0 ? 'personal' : 'priors',
      }
    }
  }

  // Fallback (should never reach here since PRIORS_SEED requires 0)
  return LEVELS[0]
}

export { LEVELS }
