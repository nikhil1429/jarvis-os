// avoidanceDetector.js — Tracks what Nikhil is NOT doing
// WHY: SubtextAnalyzer reads what he says. This reads what he AVOIDS.
// Mode avoidance, concept avoidance, check-in field skipping, topic drops.
// "I notice we haven't touched Scenario Bomb in 22 days, Sir."

import CONCEPTS_DATA from '../data/concepts.js'

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

const ALL_MODES = [
  'chat', 'quiz', 'presser', 'timed', 'speed', 'battle', 'teach',
  'body-double', 'alter-ego', 'recruiter-ghost', 'forensics', 'akshay-qs',
  'time-machine', 'code-autopsy', 'scenario-bomb', 'interview-sim',
  'impostor-killer', 'weakness-radar'
]
const HARD_MODES = ['presser', 'battle', 'scenario-bomb', 'code-autopsy', 'interview-sim', 'recruiter-ghost']

/**
 * Detect all avoidance patterns sorted by severity.
 * @returns {Array<{ type, target, severity, message }>}
 */
export function detectAvoidance() {
  const avoidances = []
  const now = Date.now()

  // === MODE AVOIDANCE ===
  ALL_MODES.forEach(mode => {
    const msgs = safeGet(`jos-msgs-${mode}`, [])
    if (msgs.length === 0) {
      // Never used — only flag hard modes as high severity
      if (HARD_MODES.includes(mode)) {
        avoidances.push({
          type: 'mode-never-used',
          target: mode,
          severity: 'high',
          message: `${mode.replace(/-/g, ' ')} — never entered. This may be fear-based avoidance.`,
        })
      }
    } else {
      const lastMsg = msgs[msgs.length - 1]
      const daysSince = lastMsg?.timestamp
        ? (now - new Date(lastMsg.timestamp).getTime()) / 86400000
        : 999
      if (daysSince >= 14) {
        avoidances.push({
          type: 'mode-avoided',
          target: mode,
          daysSince: Math.round(daysSince),
          severity: daysSince > 30 ? 'high' : 'medium',
          message: `${mode.replace(/-/g, ' ')} — ${Math.round(daysSince)} days since last use.`,
        })
      }
    }
  })

  // === CONCEPT AVOIDANCE ===
  const concepts = safeGet('jos-concepts', [])
  CONCEPTS_DATA.forEach(c => {
    const saved = concepts.find(x => x.id === c.id)
    if (!saved || !saved.lastReviewed) {
      avoidances.push({
        type: 'concept-untouched',
        target: c.name,
        severity: c.priority === 1 || c.week <= 2 ? 'high' : 'low',
        message: `${c.name} — never reviewed.${c.priority === 1 ? ' Core concept — cannot avoid.' : ''}`,
      })
    }
  })

  // === CHECK-IN FIELD SKIPPING ===
  const feelings = safeGet('jos-feelings', [])
  if (feelings.length >= 7) {
    const fields = ['sleep', 'food', 'confidence', 'focus', 'motivation']
    const recent14 = feelings.slice(-14)
    fields.forEach(field => {
      const skipped = recent14.filter(f => f[field] === undefined || f[field] === null).length
      if (skipped >= 10) {
        avoidances.push({
          type: 'checkin-field-skipped',
          target: field,
          skipRate: Math.round(skipped / recent14.length * 100),
          severity: field === 'sleep' ? 'high' : 'medium',
          message: `${field} — skipped in ${Math.round(skipped / recent14.length * 100)}% of check-ins.${field === 'sleep' ? ' Avoiding sleep data often signals poor sleep.' : ''}`,
        })
      }
    })
  }

  // === TOPIC DROPS ===
  const topicKeywords = {
    finops: ['finops', 'invoice', 'tds', 'compliance', 'extraction'],
    interview: ['interview', 'presser', 'hire', 'job', 'apply'],
    dsa: ['leetcode', 'dsa', 'algorithm', 'array', 'sorting'],
    concepts: ['concept', 'rag', 'embedding', 'prompt engineering'],
  }

  // Collect user messages from last 14 days
  const allRecentMsgs = []
  ALL_MODES.forEach(mode => {
    const msgs = safeGet(`jos-msgs-${mode}`, [])
    msgs.filter(m => m.role === 'user' && m.timestamp).forEach(m => {
      const age = (now - new Date(m.timestamp).getTime()) / 86400000
      if (age <= 14) allRecentMsgs.push({ content: m.content || '', ageDays: age })
    })
  })

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    const thisWeek = allRecentMsgs.filter(m => m.ageDays <= 7)
    const lastWeek = allRecentMsgs.filter(m => m.ageDays > 7 && m.ageDays <= 14)

    const recentMentions = thisWeek.filter(m => keywords.some(k => m.content.toLowerCase().includes(k))).length
    const previousMentions = lastWeek.filter(m => keywords.some(k => m.content.toLowerCase().includes(k))).length

    if (previousMentions >= 3 && recentMentions === 0) {
      avoidances.push({
        type: 'topic-dropped',
        target: topic,
        severity: 'medium',
        message: `"${topic}" — mentioned ${previousMentions} times last week, zero this week.`,
      })
    }
  })

  return avoidances.sort((a, b) => {
    const sev = { high: 3, medium: 2, low: 1 }
    return (sev[b.severity] || 0) - (sev[a.severity] || 0)
  })
}

/**
 * Get avoidance patterns as system prompt context.
 * Only surfaces high-severity items to avoid prompt bloat.
 */
export function getAvoidancePrompt() {
  const avoidances = detectAvoidance()
  const high = avoidances.filter(a => a.severity === 'high')
  if (high.length === 0) return ''

  let prompt = 'AVOIDANCE PATTERNS DETECTED:\n'
  high.slice(0, 3).forEach(a => { prompt += `- ${a.message}\n` })
  prompt += 'Surface these GENTLY when natural. Do not list them. Weave one into conversation when relevant. "I notice we haven\'t touched X in a while, Sir."'
  return prompt
}
