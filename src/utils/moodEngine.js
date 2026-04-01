// moodEngine.js — Reads energy, confidence, time to determine JARVIS visual mood
// WHY: Reactor, particles, colors reflect your emotional state. JARVIS FEELS alive.

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
