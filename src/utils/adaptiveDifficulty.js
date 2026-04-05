// adaptiveDifficulty.js — Dynamic quiz/training difficulty based on performance
// WHY: Static difficulty wastes time. If Nikhil scores 9/10 at 85% strength,
// questions should be harder — edge cases, production gotchas. If scoring 3/10,
// questions should be simpler — definitions, analogies, basics.

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

const LEVELS = {
  FOUNDATIONS: {
    name: 'Foundations',
    promptModifier: 'Ask BASIC questions: definitions, "what is X?", simple use cases, analogies. Be patient. One concept at a time. If he gets it wrong, explain gently before next question.',
  },
  STANDARD: {
    name: 'Standard',
    promptModifier: 'Ask STANDARD questions: "how does X work?", "when would you use X vs Y?", implementation steps, tradeoffs. Expect structured answers.',
  },
  ADVANCED: {
    name: 'Advanced',
    promptModifier: 'Ask ADVANCED questions: edge cases, failure modes, "what breaks if X?", production considerations, scale implications. Push for depth.',
  },
  EXPERT: {
    name: 'Expert',
    promptModifier: 'Ask EXPERT questions: "Design a system that...", "Debug this production issue...", "Your interviewer challenges your approach — defend it." Multi-step scenarios. Deliberately find gaps.',
  },
}

/**
 * Determine difficulty level for a concept.
 * @param {string} conceptName — concept name (fuzzy matched)
 * @returns {{ name, promptModifier }}
 */
export function getDifficultyLevel(conceptName) {
  if (!conceptName) return LEVELS.STANDARD

  const concepts = safeGet('jos-concepts', [])
  const concept = concepts.find(c =>
    c.name && c.name.toLowerCase().includes(conceptName.toLowerCase())
  )
  const strength = concept?.strength || 0

  // Check rolling quiz average (last 5 scores for this concept)
  const quizHistory = safeGet('jos-quiz-scores', {})
  // Try matching by concept name
  const key = Object.keys(quizHistory).find(k =>
    k.toLowerCase().includes(conceptName.toLowerCase()) ||
    conceptName.toLowerCase().includes(k.toLowerCase())
  )
  const scores = key ? (quizHistory[key] || []).slice(-5) : []
  const avgScore = scores.length > 0
    ? scores.reduce((s, x) => s + (x.score || 5), 0) / scores.length
    : 5

  if (strength < 40 || avgScore < 4) return LEVELS.FOUNDATIONS
  if (strength < 70 || avgScore < 7) return LEVELS.STANDARD
  if (strength < 90 || avgScore < 9) return LEVELS.ADVANCED
  return LEVELS.EXPERT
}

/**
 * Record a quiz score for a concept.
 * @param {string} conceptName
 * @param {number} score — 1-10
 */
export function recordQuizScore(conceptName, score) {
  if (!conceptName || !score) return
  const history = safeGet('jos-quiz-scores', {})
  const key = conceptName.trim()
  if (!history[key]) history[key] = []
  history[key].push({
    score,
    date: new Date().toISOString(),
    difficulty: getDifficultyLevel(conceptName).name,
  })
  // Keep last 20 per concept
  if (history[key].length > 20) history[key] = history[key].slice(-20)
  localStorage.setItem('jos-quiz-scores', JSON.stringify(history))
}

/**
 * Generate difficulty prompt for system prompt injection.
 * @param {string} mode — current training mode
 * @param {string} activeConcept — concept being discussed (if known)
 * @returns {string} — prompt modifier or empty string
 */
export function getDifficultyPrompt(mode, activeConcept) {
  if (!['quiz', 'presser', 'battle', 'scenario-bomb', 'code-autopsy', 'forensics'].includes(mode)) return ''

  // If we know the active concept, get specific difficulty
  if (activeConcept) {
    const level = getDifficultyLevel(activeConcept)
    const quizHistory = safeGet('jos-quiz-scores', {})
    const key = Object.keys(quizHistory).find(k =>
      k.toLowerCase().includes(activeConcept.toLowerCase())
    )
    const scores = key ? (quizHistory[key] || []).slice(-5) : []

    let prompt = `ADAPTIVE DIFFICULTY: ${level.name}\n${level.promptModifier}`

    if (scores.length >= 3) {
      const trend = scores[scores.length - 1].score - scores[0].score
      if (trend > 2) prompt += '\nTREND: Scores rising rapidly. Push harder — find the ceiling.'
      else if (trend < -2) prompt += '\nTREND: Scores falling. Slow down, reinforce foundations.'
    }

    return prompt
  }

  // No specific concept — give general adaptive instruction
  const concepts = safeGet('jos-concepts', [])
  const weakest = concepts.filter(c => (c.strength || 0) > 0).sort((a, b) => (a.strength || 0) - (b.strength || 0))
  const strongest = concepts.filter(c => (c.strength || 0) >= 60).sort((a, b) => (b.strength || 0) - (a.strength || 0))

  let prompt = 'ADAPTIVE DIFFICULTY: Adjust question difficulty to concept strength.'
  if (weakest.length > 0) {
    prompt += `\nWeakest concepts (ask easier questions): ${weakest.slice(0, 3).map(c => `${c.name} ${c.strength}%`).join(', ')}`
  }
  if (strongest.length > 0) {
    prompt += `\nStrongest concepts (ask harder questions): ${strongest.slice(0, 3).map(c => `${c.name} ${c.strength}%`).join(', ')}`
  }

  return prompt
}
