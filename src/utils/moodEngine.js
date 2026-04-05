// moodEngine.js — Mood state reader + PREDICTION engine
// WHY: JARVIS doesn't just read mood — he PREDICTS it. "Your Tuesdays typically
// run at energy 3.2." Over time, prediction accuracy improves. Eerily smart.

// ============================================================
// EXISTING: Mood state reader (unchanged)
// ============================================================

export function getMoodState() {
  let energy = 3, confidence = 3, mood = 'neutral', streak = 0
  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    energy = core.energy || 3
    streak = core.streak || 0
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    const latest = feelings[feelings.length - 1]
    if (latest) { confidence = latest.confidence || 3; mood = latest.mood || 'neutral' }
  } catch { /* ok */ }
  const hour = new Date().getHours()
  return { energy, confidence, mood, streak, isLateNight: hour >= 23 || hour < 5 }
}

export function getMoodColors(state) {
  if (state.isLateNight) return { primary: '#d4a853', secondary: '#8b6914', particleGold: 0.4 }
  if (state.energy <= 2) return { primary: '#ef4444', secondary: '#991b1b', particleGold: 0.1 }
  if (state.energy >= 4 && state.confidence >= 4) return { primary: '#00f0ff', secondary: '#d4a853', particleGold: 0.3 }
  if (state.streak >= 7) return { primary: '#00b4d8', secondary: '#d4a853', particleGold: 0.25 }
  return { primary: '#00b4d8', secondary: '#00f0ff', particleGold: 0.15 }
}

export function getMoodSpeed(state) {
  if (state.energy <= 2) return 0.5
  if (state.energy >= 4) return 1.5
  return 1.0
}

// ============================================================
// NEW: Mood prediction engine
// ============================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Predict today's mood BEFORE check-in.
 * Uses day-of-week historical patterns + recent trend.
 */
export function predictMood() {
  try {
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    if (feelings.length < 7) return null

    const today = new Date()
    const dayOfWeek = today.getDay()

    // Find same-day-of-week historical data
    const sameDayData = feelings.filter(f => {
      const d = new Date(f.date || f.timestamp)
      return d.getDay() === dayOfWeek
    })

    if (sameDayData.length < 3) return null

    const avgEnergy = round1(avg(sameDayData, 'energy'))
    const avgFocus = round1(avg(sameDayData, 'focus'))
    const avgConfidence = round1(avg(sameDayData, 'confidence'))

    // Recent trend (last 3 days)
    const last3 = feelings.slice(-3)
    const trendEnergy = avg(last3, 'energy')
    const trending = trendEnergy > avgEnergy + 0.3 ? 'up' : trendEnergy < avgEnergy - 0.3 ? 'down' : 'stable'

    const dayName = DAY_NAMES[dayOfWeek]
    let insight = `Your ${dayName}s typically run at energy ${avgEnergy}, focus ${avgFocus}.`
    if (trending === 'up') insight += ' Recent trend is upward.'
    else if (trending === 'down') insight += ' Recent trend is downward — be gentle today.'
    else insight += ' Holding steady.'

    return {
      predictedEnergy: avgEnergy,
      predictedFocus: avgFocus,
      predictedConfidence: avgConfidence,
      basedOn: sameDayData.length,
      dayName,
      trending,
      insight,
    }
  } catch { return null }
}

/**
 * Compare prediction with actual check-in. Track accuracy over time.
 */
export function scorePrediction(predicted, actual) {
  if (!predicted || !actual) return null
  const energyDiff = Math.abs(predicted.predictedEnergy - (actual.energy || 3))
  const focusDiff = Math.abs(predicted.predictedFocus - (actual.focus || 3))
  const accuracy = Math.round((1 - (energyDiff + focusDiff) / 10) * 100)

  try {
    const log = JSON.parse(localStorage.getItem('jos-mood-predictions') || '[]')
    log.push({
      date: new Date().toISOString(),
      predicted: { energy: predicted.predictedEnergy, focus: predicted.predictedFocus },
      actual: { energy: actual.energy, focus: actual.focus },
      accuracy,
    })
    if (log.length > 100) log.splice(0, log.length - 100)
    localStorage.setItem('jos-mood-predictions', JSON.stringify(log))
  } catch { /* ok */ }

  return accuracy
}

/**
 * Get JARVIS's prediction accuracy over time.
 */
export function getPredictionAccuracy() {
  try {
    const log = JSON.parse(localStorage.getItem('jos-mood-predictions') || '[]')
    if (log.length < 5) return null
    const avgAcc = Math.round(log.reduce((s, l) => s + l.accuracy, 0) / log.length)
    return { accuracy: avgAcc, predictions: log.length }
  } catch { return null }
}

/**
 * Get mood prediction as system prompt context.
 */
export function getMoodPredictionPrompt() {
  const prediction = predictMood()
  const accuracy = getPredictionAccuracy()
  if (!prediction) return ''

  let text = `MOOD PREDICTION: I predict today (${prediction.dayName}) will be energy ~${prediction.predictedEnergy}, focus ~${prediction.predictedFocus}. Based on ${prediction.basedOn} similar days.`
  if (prediction.trending === 'down') text += ' Trend is downward — be extra supportive today.'
  if (accuracy) text += ` My prediction accuracy: ${accuracy.accuracy}% across ${accuracy.predictions} predictions.`
  return text
}

// ============================================================
// HELPERS
// ============================================================

function round1(n) { return Math.round(n * 10) / 10 }

function avg(arr, field) {
  if (!arr.length) return 3
  if (field) {
    const vals = arr.map(x => x[field] || 3)
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }
  return arr.reduce((s, v) => s + v, 0) / arr.length
}
