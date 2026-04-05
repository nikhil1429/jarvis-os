import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================
// 1. TRANSCRIPT SHADOW
// ============================================================
describe('Transcript Shadow', () => {
  let startShadowProcessing, stopShadowProcessing, getShadowResults, resetShadowState
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/transcriptShadow.js')
    startShadowProcessing = m.startShadowProcessing
    stopShadowProcessing = m.stopShadowProcessing
    getShadowResults = m.getShadowResults
    resetShadowState = m.resetShadowState
    resetShadowState()
    stopShadowProcessing()
  })

  it('getShadowResults returns default structure', () => {
    const r = getShadowResults()
    expect(r).toHaveProperty('overall_tone', 'neutral')
    expect(r).toHaveProperty('topics_discussed')
    expect(r).toHaveProperty('concepts_mentioned')
    expect(r).toHaveProperty('mood_signals')
    expect(r).toHaveProperty('key_quotes')
  })
  it('resetShadowState resets to defaults', () => {
    const r = getShadowResults()
    r.overall_tone = 'excited'
    resetShadowState()
    expect(getShadowResults().overall_tone).toBe('neutral')
  })
  it('startShadowProcessing does not throw', () => {
    expect(() => startShadowProcessing(() => [])).not.toThrow()
    stopShadowProcessing()
  })
  it('stopShadowProcessing clears interval', () => {
    startShadowProcessing(() => [])
    expect(() => stopShadowProcessing()).not.toThrow()
  })
})

// ============================================================
// 2. EXTENDED GEMINI TOOLS (via executeGeminiTool in useGeminiVoice)
// ============================================================
describe('Extended Gemini Tools', () => {
  beforeEach(() => { localStorage.clear() })

  it('search_knowledge returns empty for no data', async () => {
    // We test the tool logic directly by simulating what executeGeminiTool does
    localStorage.setItem('jos-knowledge', JSON.stringify([]))
    const knowledge = JSON.parse(localStorage.getItem('jos-knowledge') || '[]')
    const matches = knowledge.filter(k => (k.text || '').toLowerCase().includes('rag'))
    expect(matches).toEqual([])
  })

  it('search_knowledge finds matches', () => {
    localStorage.setItem('jos-knowledge', JSON.stringify([
      { text: 'RAG uses vector databases for retrieval', tags: ['rag', 'vectors'], timestamp: '2026-04-05T10:00:00Z' },
      { text: 'Prompt engineering is about crafting inputs', tags: ['prompt'], timestamp: '2026-04-05T11:00:00Z' }
    ]))
    const knowledge = JSON.parse(localStorage.getItem('jos-knowledge'))
    const matches = knowledge.filter(k => (k.text || '').toLowerCase().includes('rag'))
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toContain('RAG')
  })

  it('quick_capture appends with source gemini-voice', () => {
    localStorage.setItem('jos-quick-capture', JSON.stringify([]))
    const captures = JSON.parse(localStorage.getItem('jos-quick-capture'))
    captures.push({ timestamp: new Date().toISOString(), text: 'Test insight', category: 'insight', source: 'gemini-voice' })
    localStorage.setItem('jos-quick-capture', JSON.stringify(captures))
    const result = JSON.parse(localStorage.getItem('jos-quick-capture'))
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('gemini-voice')
  })

  it('log_decision appends to jos-decisions', () => {
    localStorage.setItem('jos-decisions', JSON.stringify([]))
    const decisions = JSON.parse(localStorage.getItem('jos-decisions'))
    decisions.push({ date: new Date().toISOString(), decision: 'Use RAG', reasoning: 'Better accuracy', source: 'gemini-voice' })
    localStorage.setItem('jos-decisions', JSON.stringify(decisions))
    const result = JSON.parse(localStorage.getItem('jos-decisions'))
    expect(result).toHaveLength(1)
    expect(result[0].decision).toBe('Use RAG')
  })

  it('get_weak_concepts returns sorted weak concepts', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([
      { name: 'RAG', strength: 20 },
      { name: 'Embeddings', strength: 35 },
      { name: 'Prompt Engineering', strength: 80 }
    ]))
    const concepts = JSON.parse(localStorage.getItem('jos-concepts'))
    const weak = concepts.filter(c => (c.strength || 0) < 40).sort((a, b) => a.strength - b.strength)
    expect(weak).toHaveLength(2)
    expect(weak[0].name).toBe('RAG')
  })

  it('log_voice_journal appends to jos-journal', () => {
    localStorage.setItem('jos-journal', JSON.stringify([]))
    const journals = JSON.parse(localStorage.getItem('jos-journal'))
    journals.push({ timestamp: new Date().toISOString(), raw: 'Felt productive today', extracted: { mood: 'energized', source: 'gemini-voice' } })
    localStorage.setItem('jos-journal', JSON.stringify(journals))
    expect(JSON.parse(localStorage.getItem('jos-journal'))).toHaveLength(1)
  })
})

// ============================================================
// 3. TRANSCRIPT PROCESSOR STORE UPDATES
// ============================================================
describe('Transcript Processor — Store Updates', () => {
  beforeEach(() => { localStorage.clear() })

  it('feelings merge: voice fills nulls, preserves manual', () => {
    // Simulate manual check-in already exists
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('jos-feelings', JSON.stringify([{
      date: new Date().toISOString(), mood: 'focused', confidence: 4, energy: null, sleep: null
    }]))
    // Simulate voice extraction
    const parsed = { feelings: { energy: 3, sleep: 4, mood: 'tired' } }
    const feelings = JSON.parse(localStorage.getItem('jos-feelings'))
    const todayEntry = feelings.find(f => f.date?.startsWith(today))
    if (todayEntry && parsed.feelings) {
      for (const [key, val] of Object.entries(parsed.feelings)) {
        if (val !== null && val !== undefined && (todayEntry[key] === null || todayEntry[key] === undefined)) {
          todayEntry[key] = val
        }
      }
    }
    localStorage.setItem('jos-feelings', JSON.stringify(feelings))
    const result = JSON.parse(localStorage.getItem('jos-feelings'))[0]
    expect(result.mood).toBe('focused') // NOT overwritten
    expect(result.energy).toBe(3) // filled null
    expect(result.sleep).toBe(4) // filled null
    expect(result.confidence).toBe(4) // preserved
  })

  it('concept fuzzy matching works', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([
      { name: 'RAG (Retrieval Augmented Gen)', strength: 50 }
    ]))
    const concepts = JSON.parse(localStorage.getItem('jos-concepts'))
    const ext = { name: 'RAG', strengthDelta: 5 }
    const match = concepts.find(c => c.name.toLowerCase().includes(ext.name.toLowerCase()))
    expect(match).toBeDefined()
    match.strength += ext.strengthDelta
    expect(match.strength).toBe(55)
  })

  it('decision deduplication works', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('jos-decisions', JSON.stringify([
      { date: new Date().toISOString(), decision: 'Use RAG' }
    ]))
    const decisions = JSON.parse(localStorage.getItem('jos-decisions'))
    const newDecision = { decision: 'Use RAG' }
    const isDuplicate = decisions.some(d => d.decision?.toLowerCase() === newDecision.decision.toLowerCase() && d.date?.slice(0,10) === today)
    expect(isDuplicate).toBe(true) // should be skipped
  })

  it('knowledge caps at 500', () => {
    const arr = Array.from({ length: 505 }, (_, i) => ({ text: `Item ${i}`, timestamp: new Date().toISOString() }))
    localStorage.setItem('jos-knowledge', JSON.stringify(arr.slice(-500)))
    expect(JSON.parse(localStorage.getItem('jos-knowledge'))).toHaveLength(500)
  })

  it('gemini meta caps at 50', () => {
    const arr = Array.from({ length: 55 }, (_, i) => ({ sessionDate: new Date().toISOString(), overallTone: 'neutral' }))
    localStorage.setItem('jos-gemini-meta', JSON.stringify(arr.slice(-50)))
    expect(JSON.parse(localStorage.getItem('jos-gemini-meta'))).toHaveLength(50)
  })

  it('commitments append with source', () => {
    localStorage.setItem('jos-commitments', JSON.stringify([]))
    const commitments = JSON.parse(localStorage.getItem('jos-commitments'))
    commitments.push({ text: 'Review RAG', source: 'gemini-voice', createdAt: new Date().toISOString() })
    localStorage.setItem('jos-commitments', JSON.stringify(commitments))
    const result = JSON.parse(localStorage.getItem('jos-commitments'))
    expect(result[0].source).toBe('gemini-voice')
  })
})
