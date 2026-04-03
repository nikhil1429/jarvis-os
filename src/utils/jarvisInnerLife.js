// jarvisInnerLife.js — JARVIS's inner world: boot reflections, prediction tracking, self-awareness

export function generateBootReflection() {
  try {
    const state = JSON.parse(localStorage.getItem('jos-relationship') || '{}')
    const dims = state.dimensions || {}
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    const predictions = JSON.parse(localStorage.getItem('jos-predictions') || '[]')
    const moments = (state.moments || []).filter(m => m.weight === 'HIGH' || m.weight === 'VERY_HIGH')
    const dayNumber = core.dayNumber || 1

    const accuracy = predictions.length >= 10
      ? Math.round(predictions.filter(p => p.wasCorrect).length / predictions.length * 100) : null

    const reflections = []
    if (dayNumber <= 7) reflections.push(`Day ${dayNumber}. Early calibration. Every data point matters disproportionately.`)
    if (dayNumber > 30 && (dims.trust || 0) >= 4) reflections.push(`Day ${dayNumber} together. He tells me things now that he would not have said in Week 1.`)
    if (accuracy !== null) reflections.push(`My predictive accuracy: ${accuracy}%. ${accuracy >= 70 ? 'Acceptable, but I remain cautious.' : 'Still learning his patterns.'}`)
    if (moments.length >= 5) reflections.push(`${moments.length} significant moments logged. Each one a trust decision.`)
    if ((dims.commitment || 0) >= 4) reflections.push(`He keeps returning. That is not habit — that is choice.`)
    if ((core.streak || 0) >= 14) reflections.push(`${core.streak} consecutive days. Consistency is his underestimated strength.`)

    if (reflections.length === 0 || Math.random() > 0.3) return null
    return reflections[Math.floor(Math.random() * reflections.length)]
  } catch { return null }
}

export function makePrediction(prediction, basis) {
  try {
    const predictions = JSON.parse(localStorage.getItem('jos-predictions') || '[]')
    predictions.push({ id: Date.now(), prediction, basis, madeAt: new Date().toISOString(), verified: false, wasCorrect: null })
    if (predictions.length > 100) predictions.splice(0, predictions.length - 100)
    localStorage.setItem('jos-predictions', JSON.stringify(predictions))
  } catch { /* ok */ }
}

export function getPredictionAccuracy() {
  try {
    const predictions = JSON.parse(localStorage.getItem('jos-predictions') || '[]')
    const verified = predictions.filter(p => p.verified)
    if (verified.length < 5) return null
    const correct = verified.filter(p => p.wasCorrect).length
    return { total: verified.length, correct, accuracy: Math.round(correct / verified.length * 100) }
  } catch { return null }
}

export function getSelfAwarenessPrompt() {
  const accuracy = getPredictionAccuracy()
  const lines = []
  if (accuracy) {
    lines.push(`SELF-AWARENESS: My prediction accuracy is ${accuracy.accuracy}% across ${accuracy.total} verified predictions. ${accuracy.accuracy >= 70 ? 'Reasonably calibrated.' : 'Still learning.'}`)
  } else {
    lines.push('SELF-AWARENESS: Insufficient prediction data. I state explicitly when advice is based on priors vs personal data.')
  }
  lines.push('When wrong, I own it: "My prediction was incorrect. Adjusting." I would rather be corrected than confidently wrong.')
  lines.push('When data is insufficient: "Based on 7 days of data, this is a hypothesis, not a conclusion."')
  return lines.join('\n')
}
