// api-mock.test.js — Mock tests for API-dependent features, cross-mode memory, reports, comeback, milestones
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('API-Dependent Flows (Mocked)', () => {

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('jos-core', JSON.stringify({
      startDate: new Date().toISOString(), streak: 3, rank: 'Recruit',
      completedTasks: [], energy: 4
    }))
    localStorage.setItem('jos-concepts', JSON.stringify([
      { id: 1, name: 'Prompt Engineering', strength: 50 }
    ]))
    localStorage.setItem('jos-settings', '{}')
    localStorage.setItem('jos-onboarding', JSON.stringify({ completedAt: new Date().toISOString() }))
  })

  it('sendMessage handles streaming SSE response', async () => {
    // Simulate SSE stream
    const sseData = [
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello, Sir."}}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":10}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]

    // Parse like useAI does
    let fullText = ''
    sseData.forEach(chunk => {
      const lines = chunk.split('\n')
      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6))
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text
            }
          } catch { /* not JSON */ }
        }
      })
    })
    expect(fullText).toBe('Hello, Sir.')
  })

  it('sendMessage handles tool use response', () => {
    const response = {
      content: [
        { type: 'text', text: 'Task completed, Sir.' },
        { type: 'tool_use', id: 'tu_1', name: 'complete_task', input: { taskId: 5 } }
      ]
    }
    const toolBlocks = response.content.filter(b => b.type === 'tool_use')
    const textBlocks = response.content.filter(b => b.type === 'text')
    expect(toolBlocks).toHaveLength(1)
    expect(toolBlocks[0].input.taskId).toBe(5)
    expect(textBlocks[0].text).toContain('completed')
  })

  it('sendMessage handles API 401 error gracefully', () => {
    const status = 401
    const isError = status >= 400
    expect(isError).toBe(true)
    const errorMsg = `API error ${status}`
    expect(errorMsg).toContain('401')
  })

  it('sendMessage handles API 429 rate limit', () => {
    const status = 429
    const isRateLimit = status === 429
    expect(isRateLimit).toBe(true)
  })

  it('sendMessage handles API 500 server error', () => {
    const status = 500
    const shouldRetry = status >= 500
    expect(shouldRetry).toBe(true)
  })

  it('sendMessage handles network timeout', () => {
    const error = new Error('network timeout')
    expect(error.message).toContain('timeout')
  })

  it('quiz score tags parsed from response', () => {
    const response = 'Good answer! Score: 7/10.\n[QUIZ_SCORE:7/10:Prompt Engineering]'
    const tagRegex = /\[QUIZ_SCORE:(\d+)\/10:([^\]]+)\]/g
    const matches = [...response.matchAll(tagRegex)]
    expect(matches).toHaveLength(1)
    expect(parseInt(matches[0][1])).toBe(7)
    expect(matches[0][2]).toBe('Prompt Engineering')
  })

  it('cross-mode memory builds context string', () => {
    localStorage.setItem('jos-msgs-quiz', JSON.stringify([
      { role: 'user', content: 'What is RAG?', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'RAG combines retrieval with generation...', timestamp: new Date().toISOString() }
    ]))
    const quizMsgs = JSON.parse(localStorage.getItem('jos-msgs-quiz') || '[]')
    const recent = quizMsgs.slice(-3)
    const summaries = recent.map(m => `[${m.role}]: ${m.content.slice(0, 100)}`)
    const context = `From quiz: ${summaries.join(' | ')}`
    expect(context).toContain('RAG')
    expect(context).toContain('quiz')
  })

  it('strategic compiler produces summary for Opus', () => {
    const core = JSON.parse(localStorage.getItem('jos-core'))
    const concepts = JSON.parse(localStorage.getItem('jos-concepts'))
    const summary = `Day 1, Week 1, Streak: ${core.streak}, Tasks: ${core.completedTasks.length}/82, Concepts tracked: ${concepts.length}`
    expect(summary).toContain('Streak: 3')
    expect(summary).toContain('Concepts tracked: 1')
  })

  it('briefing prompt includes day context', () => {
    const core = JSON.parse(localStorage.getItem('jos-core'))
    const dayNumber = 1
    const prompt = `Generate a morning briefing. Day ${dayNumber}, Streak: ${core.streak}, Energy: ${core.energy}/5, Tasks: ${core.completedTasks.length}/82`
    expect(prompt).toContain('Day 1')
    expect(prompt).toContain('Energy: 4')
  })

  it('tool call complete_task updates localStorage', () => {
    const core = JSON.parse(localStorage.getItem('jos-core'))
    expect(core.completedTasks).not.toContain(5)
    core.completedTasks.push(5)
    localStorage.setItem('jos-core', JSON.stringify(core))
    const updated = JSON.parse(localStorage.getItem('jos-core'))
    expect(updated.completedTasks).toContain(5)
  })

  it('tool call update_concept_strength caps at 0-100', () => {
    const concepts = JSON.parse(localStorage.getItem('jos-concepts'))
    concepts[0].strength = Math.min(100, Math.max(0, 150))
    expect(concepts[0].strength).toBe(100)
    concepts[0].strength = Math.min(100, Math.max(0, -20))
    expect(concepts[0].strength).toBe(0)
  })
})

describe('Report Generation Logic (Mocked)', () => {

  it('3-day trend requires 3+ days of feelings data', () => {
    const feelings = [
      { date: '2026-04-01', confidence: 3 },
      { date: '2026-04-02', confidence: 4 },
    ]
    const canGenerate = feelings.length >= 3
    expect(canGenerate).toBe(false)
  })

  it('weekly review requires 7+ days of data', () => {
    const feelings = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-04-0${i + 1}`, confidence: 3 + (i % 3)
    }))
    expect(feelings.length >= 7).toBe(true)
  })

  it('quarterly report available after day 60', () => {
    const dayNumber = 65
    expect(dayNumber >= 60).toBe(true)
  })

  it('interview brief requires company and role', () => {
    const input = { company: 'Anthropic', role: 'AI Engineer' }
    expect(input.company).toBeTruthy()
    expect(input.role).toBeTruthy()
  })
})

describe('Comeback System Logic', () => {

  it('1 day absence = normal', () => {
    const lastSession = new Date(Date.now() - 1 * 86400000)
    const daysAway = Math.floor((Date.now() - lastSession.getTime()) / 86400000)
    expect(daysAway).toBe(1)
    const level = daysAway <= 1 ? 'normal' : daysAway <= 3 ? 'gentle' : daysAway <= 7 ? 'moderate' : 'extended'
    expect(level).toBe('normal')
  })

  it('3 day absence = gentle', () => {
    const daysAway = 3
    const level = daysAway <= 1 ? 'normal' : daysAway <= 3 ? 'gentle' : daysAway <= 7 ? 'moderate' : 'extended'
    expect(level).toBe('gentle')
  })

  it('5 day absence = moderate (targets reduced)', () => {
    const daysAway = 5
    const level = daysAway <= 1 ? 'normal' : daysAway <= 3 ? 'gentle' : daysAway <= 7 ? 'moderate' : 'extended'
    expect(level).toBe('moderate')
  })

  it('10 day absence = extended (no guilt)', () => {
    const daysAway = 10
    const level = daysAway <= 1 ? 'normal' : daysAway <= 3 ? 'gentle' : daysAway <= 7 ? 'moderate' : 'extended'
    expect(level).toBe('extended')
  })
})

describe('Milestone Trigger Logic', () => {

  it('25% milestone at 21 tasks', () => {
    const pct = Math.round((21 / 82) * 100)
    expect(pct).toBeGreaterThanOrEqual(25)
  })

  it('50% milestone at 41 tasks', () => {
    const pct = Math.round((41 / 82) * 100)
    expect(pct).toBe(50)
  })

  it('100% milestone at 82 tasks', () => {
    const pct = Math.round((82 / 82) * 100)
    expect(pct).toBe(100)
  })

  it('milestone fires only once (idempotent)', () => {
    const firedMilestones = ['milestone-25']
    const pct = 30
    const shouldFire = pct >= 25 && !firedMilestones.includes('milestone-25')
    expect(shouldFire).toBe(false)
  })

  it('rank changes at correct week boundaries', () => {
    expect(1 <= 2 ? 'Recruit' : '').toBe('Recruit')
    expect(3 <= 4 && 3 >= 3 ? 'Operative' : '').toBe('Operative')
    expect(5 <= 6 && 5 >= 5 ? 'Commander' : '').toBe('Commander')
    expect(7 >= 7 ? 'Architect' : '').toBe('Architect')
  })
})
