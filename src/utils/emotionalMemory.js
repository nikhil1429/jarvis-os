// emotionalMemory.js — Concern threads, promise tracking, mood trajectory
// WHY: JARVIS remembers what worries you and what you promised to do.
// KEY: jos-emotional-memory

export function saveConcern(concern) {
  try {
    const mem = JSON.parse(localStorage.getItem('jos-emotional-memory') || '{}')
    if (!mem.concerns) mem.concerns = []
    mem.concerns.push({
      text: concern,
      detectedAt: new Date().toISOString(),
      resolved: false,
      referencedCount: 0,
    })
    mem.concerns = mem.concerns.filter(c => !c.resolved).slice(-20)
    localStorage.setItem('jos-emotional-memory', JSON.stringify(mem))
  } catch { /* ok */ }
}

export function savePromise(promise) {
  try {
    const mem = JSON.parse(localStorage.getItem('jos-emotional-memory') || '{}')
    if (!mem.promises) mem.promises = []
    mem.promises.push({
      text: promise,
      madeAt: new Date().toISOString(),
      dueBy: new Date(Date.now() + 86400000).toISOString(),
      checked: false,
      fulfilled: null,
    })
    mem.promises = mem.promises.slice(-30)
    localStorage.setItem('jos-emotional-memory', JSON.stringify(mem))
  } catch { /* ok */ }
}

export function getUnresolvedConcerns() {
  try {
    const mem = JSON.parse(localStorage.getItem('jos-emotional-memory') || '{}')
    return (mem.concerns || []).filter(c => !c.resolved)
  } catch { return [] }
}

export function getUncheckedPromises() {
  try {
    const mem = JSON.parse(localStorage.getItem('jos-emotional-memory') || '{}')
    return (mem.promises || []).filter(p => !p.checked && new Date(p.dueBy) <= new Date())
  } catch { return [] }
}

export function getMoodTrajectory() {
  try {
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    if (feelings.length < 3) return null

    const recent = feelings.slice(-14)
    const trajectory = {
      confidence: recent.map(f => ({ date: f.date, value: f.confidence || 0 })),
      focus: recent.map(f => ({ date: f.date, value: f.focus || 0 })),
      energy: recent.map(f => ({ date: f.date, value: f.energy || 0 })),
    }

    const calcTrend = (arr) => {
      if (arr.length < 3) return 'insufficient'
      const first = arr.slice(0, Math.ceil(arr.length / 2))
      const second = arr.slice(Math.ceil(arr.length / 2))
      const avgFirst = first.reduce((s, x) => s + x.value, 0) / first.length
      const avgSecond = second.reduce((s, x) => s + x.value, 0) / second.length
      const diff = avgSecond - avgFirst
      if (diff > 0.5) return 'improving'
      if (diff < -0.5) return 'declining'
      return 'stable'
    }

    trajectory.trends = {
      confidence: calcTrend(trajectory.confidence),
      focus: calcTrend(trajectory.focus),
      energy: calcTrend(trajectory.energy),
    }

    return trajectory
  } catch { return null }
}
