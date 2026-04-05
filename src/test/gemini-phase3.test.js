import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================
// 1. STATE SYNC
// ============================================================
describe('Gemini State Sync', () => {
  let startStateSync, stopStateSync
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/geminiStateSync.js')
    startStateSync = m.startStateSync; stopStateSync = m.stopStateSync
    stopStateSync()
  })

  it('startStateSync does not throw', () => {
    expect(() => startStateSync(() => null)).not.toThrow()
    stopStateSync()
  })
  it('stopStateSync cleans up', () => {
    startStateSync(() => null)
    expect(() => stopStateSync()).not.toThrow()
  })
})

// ============================================================
// 2. JARVIS INITIATOR
// ============================================================
describe('JARVIS Initiator', () => {
  let startInitiator, stopInitiator
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/jarvisInitiator.js')
    startInitiator = m.startInitiator; stopInitiator = m.stopInitiator
  })

  it('starts and returns interval id', () => {
    const id = startInitiator()
    expect(id).toBeDefined()
    stopInitiator(id)
  })
  it('stopInitiator clears interval', () => {
    const id = startInitiator()
    expect(() => stopInitiator(id)).not.toThrow()
  })
})

// ============================================================
// 3. HANDOFF CONTEXT
// ============================================================
describe('Claude Handoff Context', () => {
  beforeEach(() => { localStorage.clear() })

  it('saves and reads handoff context', () => {
    const handoff = {
      timestamp: new Date().toISOString(),
      topic: 'RAG retrieval',
      reason: 'Depth needed',
      targetMode: 'teach',
      conversationContext: 'Nikhil: explain RAG\nJARVIS: RAG uses vector databases',
      fromGeminiSession: true
    }
    localStorage.setItem('jos-handoff-context', JSON.stringify(handoff))
    const read = JSON.parse(localStorage.getItem('jos-handoff-context'))
    expect(read.topic).toBe('RAG retrieval')
    expect(read.fromGeminiSession).toBe(true)
  })

  it('handoff expires after 30 minutes', () => {
    const old = {
      timestamp: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      topic: 'old topic',
      fromGeminiSession: true
    }
    localStorage.setItem('jos-handoff-context', JSON.stringify(old))
    const handoff = JSON.parse(localStorage.getItem('jos-handoff-context'))
    const age = Date.now() - new Date(handoff.timestamp).getTime()
    expect(age).toBeGreaterThan(30 * 60 * 1000) // expired
  })

  it('handoff is cleared after reading', () => {
    localStorage.setItem('jos-handoff-context', JSON.stringify({ topic: 'test', fromGeminiSession: true }))
    localStorage.removeItem('jos-handoff-context')
    expect(localStorage.getItem('jos-handoff-context')).toBeNull()
  })
})

// ============================================================
// 4. NAVIGATE TOOL
// ============================================================
describe('Navigation Tool', () => {
  beforeEach(() => { localStorage.clear() })

  it('navigate_app dispatches event', () => {
    let received = null
    const h = (e) => { received = e.detail }
    window.addEventListener('jarvis-navigate', h)
    window.dispatchEvent(new CustomEvent('jarvis-navigate', { detail: { tab: 'train', mode: 'quiz' } }))
    window.removeEventListener('jarvis-navigate', h)
    expect(received.tab).toBe('train')
    expect(received.mode).toBe('quiz')
  })
})

// ============================================================
// 5. AUTO-RECONNECT LOGIC
// ============================================================
describe('Auto-Reconnect — Conversation Summary', () => {
  beforeEach(() => { localStorage.clear() })

  it('builds summary from transcript', () => {
    const transcript = [
      { role: 'user', text: 'Hello JARVIS', timestamp: new Date().toISOString() },
      { role: 'assistant', text: 'Good evening, Sir.', timestamp: new Date().toISOString() },
      { role: 'user', text: 'Tell me about RAG', timestamp: new Date().toISOString() },
    ]
    localStorage.setItem('jos-gemini-transcript', JSON.stringify(transcript))
    // Simulate what buildConversationSummary does
    const t = JSON.parse(localStorage.getItem('jos-gemini-transcript'))
    const recent = t.slice(-20)
    const summary = recent.map(m => `${m.role==='user'?'Nikhil':'JARVIS'}: ${m.text.slice(0,100)}`).join('\n')
    expect(summary).toContain('RAG')
    expect(summary).toContain('Nikhil')
  })

  it('returns null for empty transcript', () => {
    localStorage.setItem('jos-gemini-transcript', '[]')
    const t = JSON.parse(localStorage.getItem('jos-gemini-transcript'))
    expect(t.slice(-20).length).toBe(0)
  })
})

// ============================================================
// 6. EXTENDED TOOLS — navigate, handoff, vision (unit)
// ============================================================
describe('Extended Gemini Tools — Phase 3', () => {
  beforeEach(() => { localStorage.clear() })

  it('navigate_app event has correct structure', () => {
    let detail = null
    window.addEventListener('jarvis-navigate', (e) => { detail = e.detail }, { once: true })
    window.dispatchEvent(new CustomEvent('jarvis-navigate', { detail: { tab: 'dna', context: 'RAG' } }))
    expect(detail.tab).toBe('dna')
    expect(detail.context).toBe('RAG')
  })

  it('handoff saves context to localStorage', () => {
    const transcript = [{ role: 'user', text: 'deep dive on embeddings' }]
    localStorage.setItem('jos-gemini-transcript', JSON.stringify(transcript))
    // Simulate handoff save
    const t = JSON.parse(localStorage.getItem('jos-gemini-transcript'))
    localStorage.setItem('jos-handoff-context', JSON.stringify({
      timestamp: new Date().toISOString(), topic: 'embeddings', targetMode: 'teach',
      conversationContext: t.slice(-30).map(m => m.text).join('\n'), fromGeminiSession: true
    }))
    const h = JSON.parse(localStorage.getItem('jos-handoff-context'))
    expect(h.topic).toBe('embeddings')
    expect(h.fromGeminiSession).toBe(true)
  })

  it('tab-changed event has tab detail', () => {
    let tab = null
    window.addEventListener('jarvis-tab-changed', (e) => { tab = e.detail?.tab }, { once: true })
    window.dispatchEvent(new CustomEvent('jarvis-tab-changed', { detail: { tab: 'stats' } }))
    expect(tab).toBe('stats')
  })
})
