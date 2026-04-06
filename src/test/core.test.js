import { describe, it, expect, beforeEach } from 'vitest'

describe('Model Router', () => {
  let getModel
  beforeEach(async () => { getModel = (await import('../utils/modelRouter.js')).getModel })

  it('chat → sonnet tier 1', () => { const r = getModel('chat', { dayOfWeek: 1 }); expect(r.tier).toBe(1) })
  it('quiz → sonnet tier 1', () => { expect(getModel('quiz', { dayOfWeek: 1 }).tier).toBe(1) })
  it('battle → tier 2', () => { expect(getModel('battle', { dayOfWeek: 1 }).tier).toBeGreaterThanOrEqual(2) })
  it('weakness-radar → opus', () => { expect(getModel('weakness-radar', { dayOfWeek: 1 }).model).toContain('opus') })
  it('default → sonnet', () => { expect(getModel('unknown-mode', { dayOfWeek: 1 }).tier).toBe(1) })
})

describe('Spaced Repetition', () => {
  let getReviewSchedule, INTERVALS
  beforeEach(async () => { const m = await import('../utils/spacedRepetition.js'); getReviewSchedule = m.getReviewSchedule; INTERVALS = m.INTERVALS })

  it('intervals are [1,3,7,14,30,60,120]', () => { expect(INTERVALS).toEqual([1,3,7,14,30,60,120]) })
  it('never-reviewed is overdue', () => { expect(getReviewSchedule({}).isOverdue).toBe(true) })
  it('just-reviewed is not overdue', () => {
    const r = getReviewSchedule({ lastReview: new Date().toISOString(), reviewCount: 0 })
    expect(r.isOverdue).toBe(false)
  })
})

describe('Intelligence Level', () => {
  let getIntelligenceLevel
  beforeEach(async () => { getIntelligenceLevel = (await import('../utils/intelligenceLevel.js')).getIntelligenceLevel })

  it('0 data → PRIORS_SEED 40%', () => { const r = getIntelligenceLevel('energy', 0); expect(r.confidence).toBe(0.40) })
  it('7 data → EMERGING 55%', () => { expect(getIntelligenceLevel('energy', 7).confidence).toBe(0.55) })
  it('20 data → LEARNING 70%', () => { expect(getIntelligenceLevel('energy', 20).confidence).toBe(0.70) })
  it('50 data → CALIBRATED 85%', () => { expect(getIntelligenceLevel('energy', 50).confidence).toBe(0.85) })
  it('100 data → LOCKED_IN 95%', () => { expect(getIntelligenceLevel('energy', 100).confidence).toBe(0.95) })
})

describe('Cost Calculator', () => {
  let calculateCost
  beforeEach(async () => { calculateCost = (await import('../utils/costCalculator.js')).calculateCost })

  it('returns positive number', () => { expect(calculateCost('claude-sonnet-4-6', 100, 50)).toBeGreaterThan(0) })
  it('opus > sonnet', () => {
    expect(calculateCost('claude-opus-4-6', 1000, 500)).toBeGreaterThan(calculateCost('claude-sonnet-4-6', 1000, 500))
  })
})

describe('Quiz Scoring', () => {
  let extractQuizScores, stripQuizTags
  beforeEach(async () => { const m = await import('../utils/quizScoring.js'); extractQuizScores = m.extractQuizScores; stripQuizTags = m.stripQuizTags })

  it('extracts score', () => { const s = extractQuizScores('Good [QUIZ_SCORE:8/10:RAG]'); expect(s).toHaveLength(1); expect(s[0].score).toBe(8); expect(s[0].concept).toBe('RAG') })
  it('strips tags', () => { expect(stripQuizTags('Good [QUIZ_SCORE:5/10:API] work')).not.toContain('QUIZ_SCORE') })
  it('handles no tags', () => { expect(extractQuizScores('no tags')).toHaveLength(0) })
  it('extracts multiple', () => { expect(extractQuizScores('[QUIZ_SCORE:7/10:A] [QUIZ_SCORE:9/10:B]')).toHaveLength(2) })
})

describe('Strategic Compiler', () => {
  let compile, compileSummary
  beforeEach(async () => { localStorage.clear(); const m = await import('../utils/strategicCompiler.js'); compile = m.compile; compileSummary = m.compileSummary })

  it('compile returns object with concepts', () => { expect(compile()).toHaveProperty('concepts') })
  it('compileSummary returns string', () => { expect(typeof compileSummary()).toBe('string') })
})

describe('API Logger', () => {
  let logAPICall
  beforeEach(async () => { localStorage.clear(); logAPICall = (await import('../utils/apiLogger.js')).logAPICall })

  it('logs to localStorage', () => {
    logAPICall({ model: 'test', mode: 'chat', inputTokens: 100, outputTokens: 50, latencyMs: 500 })
    const logs = JSON.parse(localStorage.getItem('jos-api-logs') || '[]')
    expect(logs.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Data Files', () => {
  it('tasks exist (80+)', async () => {
    const { default: tasks } = await import('../data/tasks.js')
    expect(tasks.length).toBeGreaterThanOrEqual(80)
  })
  it('18 modes', async () => {
    const { default: modes } = await import('../data/modes.js')
    expect(modes.length).toBeGreaterThanOrEqual(18)
  })
  it('35 concepts', async () => {
    const { default: concepts } = await import('../data/concepts.js')
    expect(concepts.length).toBe(35)
  })
  it('18 achievements with check()', async () => {
    const { default: achievements } = await import('../data/achievements.js')
    expect(achievements.length).toBe(18)
    achievements.forEach(a => expect(typeof a.check).toBe('function'))
  })
  it('buildSystemPrompt is function', async () => {
    const { buildSystemPrompt } = await import('../data/prompts.js')
    expect(typeof buildSystemPrompt).toBe('function')
  })
})

describe('Date Utils', () => {
  let getDayNumber, getWeekNumber
  beforeEach(async () => { const m = await import('../utils/dateUtils.js'); getDayNumber = m.getDayNumber; getWeekNumber = m.getWeekNumber })

  it('today = day 1+', () => { expect(getDayNumber(new Date().toISOString())).toBeGreaterThanOrEqual(1) })
  it('today = week 1+', () => { expect(getWeekNumber(new Date().toISOString())).toBeGreaterThanOrEqual(1) })
})
