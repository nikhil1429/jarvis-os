// geminiStateSync.js — Pushes UI events into active Gemini WebSocket
// WHY: Task completion, tab switch, check-in — Gemini knows immediately.

let listeners = []
let lastSyncTime = 0
let pendingSyncTimer = null

const SYNC_EVENTS = [
  { event: 'jarvis-task-toggled', build: () => { try { const c = JSON.parse(localStorage.getItem('jos-core')||'{}'); return `[STATE: Task completed. Total: ${(c.completedTasks||[]).length}/82.]` } catch { return null } } },
  { event: 'jarvis-checkin-complete', build: () => { try { const f = JSON.parse(localStorage.getItem('jos-feelings')||'[]'); const l = f[f.length-1]; return l ? `[STATE: Check-in done. Mood: ${l.mood||'?'}, Energy: ${l.energy||'?'}/5.]` : null } catch { return null } } },
  { event: 'jarvis-tab-changed', build: (e) => { const t = e.detail?.tab; const n = { cmd:'Command Center', train:'Training', log:'Daily Log', dna:'Concept DNA', stats:'Stats', wins:'Achievements' }; return `[STATE: Switched to ${n[t]||t} tab.]` } },
]

function sendSync(getWs, message) {
  if (!message) return
  const ws = typeof getWs === 'function' ? getWs() : getWs
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  const now = Date.now()
  if (now - lastSyncTime < 10000) {
    // Throttle: queue latest, overwrite pending
    if (pendingSyncTimer) clearTimeout(pendingSyncTimer)
    pendingSyncTimer = setTimeout(() => sendSync(getWs, message), 10000 - (now - lastSyncTime))
    return
  }
  lastSyncTime = now
  ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: message }] }], turnComplete: true } }))
}

export function startStateSync(getWs) {
  stopStateSync()
  SYNC_EVENTS.forEach(({ event, build }) => {
    const handler = (e) => sendSync(getWs, build(e))
    window.addEventListener(event, handler)
    listeners.push({ event, handler })
  })
}

export function stopStateSync() {
  listeners.forEach(({ event, handler }) => window.removeEventListener(event, handler))
  listeners = []
  if (pendingSyncTimer) { clearTimeout(pendingSyncTimer); pendingSyncTimer = null }
}
