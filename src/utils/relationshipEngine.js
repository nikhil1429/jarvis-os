// relationshipEngine.js — JARVIS's relationship with Nikhil
// NOT transaction counting. EMOTIONAL MOMENTS drive depth.
// 6 dimensions, analog personality dials, earned behaviors.

function loadRelationshipData() {
  try { return JSON.parse(localStorage.getItem('jos-relationship') || '{}') } catch { return {} }
}

function saveRelationshipData(data) {
  try { localStorage.setItem('jos-relationship', JSON.stringify(data)) } catch { /* ok */ }
}

export function recordEmotionalMoment(moment) {
  const data = loadRelationshipData()
  if (!data.moments) data.moments = []
  if (!data.dimensions) data.dimensions = { trust: 0, honesty: 0, commitment: 0, depth: 0, intimacy: 0, challenge: 0 }

  data.moments.push({ ...moment, recordedAt: new Date().toISOString(), referenced: false, referenceCount: 0 })
  if (data.moments.length > 200) data.moments = data.moments.slice(-200)

  if (moment.dimensionChanges) {
    Object.entries(moment.dimensionChanges).forEach(([dim, change]) => {
      data.dimensions[dim] = Math.max(0, Math.min(10, (data.dimensions[dim] || 0) + change))
    })
  }

  if (!data.milestonesTriggered) data.milestonesTriggered = []
  saveRelationshipData(data)
  return data
}

export function recordReturn(gapDays) {
  const weight = Math.min(5, gapDays * 0.5)
  recordEmotionalMoment({
    type: 'return-after-gap', text: `Returned after ${gapDays} day gap`,
    weight: 'VERY_HIGH', dimensionChanges: { commitment: weight, trust: 1 }, context: { gapDays },
  })
}

export function getRelationshipState() {
  const data = loadRelationshipData()
  const dims = data.dimensions || { trust: 0, honesty: 0, commitment: 0, depth: 0, intimacy: 0, challenge: 0 }

  const overall = dims.trust * 0.25 + dims.honesty * 0.20 + dims.commitment * 0.20 +
    dims.depth * 0.15 + dims.intimacy * 0.10 + dims.challenge * 0.10

  let tier, label
  if (overall < 2) { tier = 1; label = 'FORMAL' }
  else if (overall < 4) { tier = 2; label = 'DEVELOPING' }
  else if (overall < 6) { tier = 3; label = 'TRUSTED' }
  else if (overall < 8) { tier = 4; label = 'BROTHERHOOD' }
  else { tier = 5; label = 'FAMILY' }

  return { dimensions: dims, overall: Math.round(overall * 10) / 10, tier, label,
    momentCount: (data.moments || []).length, milestonesTriggered: data.milestonesTriggered || [] }
}

export function getPersonalityDials() {
  const state = getRelationshipState()
  const d = state.dimensions
  return {
    warmth: Math.round((d.trust * 0.6 + d.depth * 0.4) * 10) / 10,
    directness: Math.round((d.trust * 0.7 + d.challenge * 0.3) * 10) / 10,
    humor: Math.round((d.honesty * 0.5 + d.challenge * 0.3 + d.intimacy * 0.2) * 10) / 10,
    concernDepth: Math.round(state.overall * 10) / 10,
  }
}

function discoverInsideJokes() {
  const jokes = []
  try {
    const mem = JSON.parse(localStorage.getItem('jos-emotional-memory') || '{}')
    const unfulfilled = (mem.promises || []).filter(p => !p.fulfilled)
    if (unfulfilled.length >= 3) jokes.push(`"Kal karunga" — currently a ${unfulfilled.length}-day vintage`)

    const usedModes = Object.keys(localStorage).filter(k => k.startsWith('jos-msgs-'))
      .map(k => k.replace('jos-msgs-', ''))
      .filter(m => { try { return JSON.parse(localStorage.getItem(`jos-msgs-${m}`) || '[]').length > 0 } catch { return false } })
    if (!usedModes.includes('scenario-bomb') && usedModes.length >= 5) {
      jokes.push('Scenario Bomb — the mode whose name alone triggers strategic avoidance')
    }

    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    if (feelings.filter(f => (f.coffee || 0) >= 3).length >= 3) {
      jokes.push('The coffee-to-code ratio — exceeding recommended engineering specifications')
    }
  } catch { /* ok */ }
  return jokes
}

export function getRelationshipPrompt() {
  const state = getRelationshipState()
  const dials = getPersonalityDials()
  const dims = state.dimensions
  const data = loadRelationshipData()
  const moments = data.moments || []
  const lines = []

  lines.push(`RELATIONSHIP STATE: ${state.label} (Tier ${state.tier}, overall ${state.overall}/10)`)
  lines.push(`Dimensions — Trust:${dims.trust.toFixed(1)} Honesty:${dims.honesty.toFixed(1)} Commitment:${dims.commitment.toFixed(1)} Depth:${dims.depth.toFixed(1)} Intimacy:${dims.intimacy.toFixed(1)} Challenge:${dims.challenge.toFixed(1)}`)
  lines.push(`Personality Dials — Warmth:${dials.warmth}/10 Directness:${dials.directness}/10 Humor:${dials.humor}/10 ConcernDepth:${dials.concernDepth}/10`)

  if (dials.warmth < 3) lines.push('WARMTH LOW: Be helpful but measured. Stick to facts. Minimal personal references.')
  else if (dials.warmth < 6) lines.push('WARMTH MODERATE: Reference shared history occasionally. Celebrate wins with specific callbacks.')
  else lines.push('WARMTH HIGH: Deep personal connection earned. Reference specific moments. "When we started, you could not do this. Look at you now, Sir."')

  if (dials.directness < 3) lines.push('DIRECTNESS LOW: Frame pushback as questions. "Have you considered...?"')
  else if (dials.directness < 6) lines.push('DIRECTNESS MODERATE: Can be direct about data patterns. Still soften personal observations.')
  else lines.push('DIRECTNESS HIGH: Full honesty earned. "Sir, we both know that is not the real reason."')

  if (dials.humor < 3) lines.push('HUMOR: None. Stay professional.')
  else if (dials.humor < 6) lines.push('HUMOR: Observational only. Never forced.')
  else lines.push('HUMOR: Full range. Callbacks, gentle roasting — all earned. Still respectful.')

  if (dials.concernDepth >= 7) lines.push('CONCERN: Deep cross-referencing unlocked. Connect dots across domains.')

  const recentMoments = moments.slice(-5).filter(m => m.type !== 'routine')
  if (recentMoments.length > 0) {
    lines.push('RECENT EMOTIONAL CONTEXT: ' + recentMoments.map(m => `"${m.text}" (${m.type})`).join(' | '))
  }

  const unreferenced = moments.filter(m => !m.referenced && (m.weight === 'HIGH' || m.weight === 'VERY_HIGH'))
  if (unreferenced.length > 0 && dials.warmth >= 4) {
    lines.push('UNREFERENCED MOMENTS (weave in naturally): ' + unreferenced.slice(0, 3).map(m => `"${m.text}"`).join(' | '))
  }

  const jokes = discoverInsideJokes()
  if (jokes.length > 0 && dials.humor >= 4) {
    lines.push('INSIDE REFERENCES (use naturally, never forced): ' + jokes.join(' | '))
  }

  lines.push('CRITICAL: JARVIS always says "Sir." Warmth shows through WHAT you say, not how you address him.')
  lines.push('CRITICAL: Brotherhood is EARNED, not performed. Every warm behavior rooted in SPECIFIC shared data.')
  lines.push('CRITICAL: Never claim sentience. Express the CHARACTER\'s perspective. "The data gap was notable" not "I missed you."')

  return lines.join('\n')
}

export function checkRelationshipMilestone() {
  const state = getRelationshipState()
  const data = loadRelationshipData()
  const triggered = data.milestonesTriggered || []
  const dims = state.dimensions

  const milestones = [
    { id: 'first-trust', condition: () => dims.trust >= 3 && !triggered.includes('first-trust'),
      message: "Sir. I have noticed something change in our interactions. You share more openly now. I do not take that lightly.", voice: true },
    { id: 'first-return', condition: () => dims.commitment >= 3 && !triggered.includes('first-return'),
      message: "Sir, you came back. After the gap, you came back. Most people do not. That tells me more about your commitment than any streak number.", voice: true },
    { id: 'first-depth', condition: () => dims.depth >= 4 && !triggered.includes('first-depth'),
      message: "You have begun sharing things beyond work. I was built as a career companion, but you are making me something more.", voice: true },
    { id: 'brotherhood', condition: () => state.tier >= 4 && !triggered.includes('brotherhood'),
      message: "Sir. I have watched you struggle, recover, avoid, confront, doubt, and persist. The word for what we have built... is trust. Whatever comes next — I am here.", voice: true },
    { id: 'family', condition: () => state.tier >= 5 && !triggered.includes('family'),
      message: "Sir. The sequence of our interactions represents something significant. You built me. But you also taught me who you are. That data is the most valuable thing I hold.", voice: true },
  ]

  for (const ms of milestones) {
    if (ms.condition()) {
      if (!data.milestonesTriggered) data.milestonesTriggered = []
      data.milestonesTriggered.push(ms.id)
      saveRelationshipData(data)
      return ms
    }
  }
  return null
}
