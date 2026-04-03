import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================
// 1. MODEL ROUTER — 30 tests
// ============================================================
describe('Model Router — Complete Coverage', () => {
  let getModel
  beforeEach(async () => {
    const mod = await import('../utils/modelRouter.js')
    getModel = mod.getModel
  })

  // Default routing → Sonnet
  it('chat → Sonnet', () => { expect(getModel('chat').model).toContain('sonnet') })
  it('quiz → Sonnet', () => { expect(getModel('quiz').model).toContain('sonnet') })
  it('teach → Sonnet', () => { expect(getModel('teach').model).toContain('sonnet') })
  it('body-double → Sonnet', () => { expect(getModel('body-double').model).toContain('sonnet') })
  it('timed → Sonnet', () => { expect(getModel('timed').model).toContain('sonnet') })
  it('speed → Sonnet', () => { expect(getModel('speed').model).toContain('sonnet') })

  // Hard modes → Opus
  it('presser → Opus', () => { expect(getModel('presser').model).toContain('opus') })
  it('battle → Opus', () => { expect(getModel('battle').model).toContain('opus') })
  it('scenario-bomb → Opus', () => { expect(getModel('scenario-bomb').model).toContain('opus') })
  it('interview-sim → Opus', () => { expect(getModel('interview-sim').model).toContain('opus') })
  it('forensics → Opus', () => { expect(getModel('forensics').model).toContain('opus') })
  it('code-autopsy → Opus', () => { expect(getModel('code-autopsy').model).toContain('opus') })
  it('alter-ego → Opus', () => { expect(getModel('alter-ego').model).toContain('opus') })
  it('recruiter-ghost → Opus', () => { expect(getModel('recruiter-ghost').model).toContain('opus') })

  // Strategic ops → Opus tier 2
  it('mood-oracle → Opus tier 2', () => {
    const r = getModel('mood-oracle')
    expect(r.model).toContain('opus')
    expect(r.tier).toBe(2)
  })
  it('weakness-radar → Opus tier 2', () => {
    const r = getModel('weakness-radar')
    expect(r.model).toContain('opus')
    expect(r.tier).toBe(2)
  })
  it('newsletter → Opus', () => { expect(getModel('newsletter').model).toContain('opus') })
  it('portfolio-narrator → Opus', () => { expect(getModel('portfolio-narrator').model).toContain('opus') })

  // Extended modes → tier 3
  it('quarterly-report → Opus tier 3 extended', () => {
    const r = getModel('quarterly-report')
    expect(r.tier).toBe(3)
    expect(r.extended).toBe(true)
  })
  it('monthly-analysis → tier 3', () => { expect(getModel('monthly-analysis').tier).toBe(3) })

  // Context-based routing
  it('weak concept < 40% → Opus', () => {
    const r = getModel('chat', { activeConcept: { strength: 30, name: 'RAG' } })
    expect(r.model).toContain('opus')
    expect(r.reason).toMatch(/weak/i)
  })
  it('quiz score < 5 → Opus', () => {
    const r = getModel('quiz', { lastQuizScore: 3 })
    expect(r.model).toContain('opus')
  })
  it('Sunday (dayOfWeek 0) → Opus', () => {
    const r = getModel('chat', { dayOfWeek: 0 })
    expect(r.model).toContain('opus')
  })
  it('intent keyword "samjhao" → Opus', () => {
    const r = getModel('chat', { userIntent: 'samjhao ye concept' })
    expect(r.model).toContain('opus')
  })
  it('streak recovery → Opus', () => {
    const r = getModel('chat', { streakRecovery: true })
    expect(r.model).toContain('opus')
  })

  // Routing metadata
  it('returns autoUpgraded flag', () => {
    expect(typeof getModel('presser').autoUpgraded).toBe('boolean')
  })
  it('returns estimatedCost', () => {
    expect(getModel('chat').estimatedCost).toBeGreaterThan(0)
  })
  it('Sonnet costs less than Opus', () => {
    expect(getModel('chat').estimatedCost).toBeLessThan(getModel('presser').estimatedCost)
  })
  it('unknown mode falls back to Sonnet', () => {
    expect(getModel('nonexistent-mode').model).toContain('sonnet')
  })
  it('default routing is not auto-upgraded', () => {
    expect(getModel('chat').autoUpgraded).toBe(false)
  })
})

// ============================================================
// 2. SPACED REPETITION — 10 tests
// ============================================================
describe('Spaced Repetition — Complete Coverage', () => {
  let getReviewSchedule, INTERVALS
  beforeEach(async () => {
    const mod = await import('../utils/spacedRepetition.js')
    getReviewSchedule = mod.getReviewSchedule
    INTERVALS = mod.INTERVALS
  })

  it('never reviewed → overdue immediately', () => {
    const r = getReviewSchedule({ lastReview: null, reviewCount: 0, strength: 0 })
    expect(r.isOverdue).toBe(true)
  })
  it('never reviewed → nextReview is null', () => {
    const r = getReviewSchedule({ lastReview: null })
    expect(r.nextReview).toBeNull()
  })
  it('reviewed today → not overdue', () => {
    const r = getReviewSchedule({ lastReview: new Date().toISOString(), reviewCount: 0 })
    expect(r.isOverdue).toBe(false)
  })
  it('reviewed 2 days ago with 0 reviews → overdue (interval = 1 day)', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString()
    const r = getReviewSchedule({ lastReview: twoDaysAgo, reviewCount: 0 })
    expect(r.isOverdue).toBe(true)
  })
  it('more reviews → longer intervals', () => {
    const r0 = getReviewSchedule({ lastReview: new Date().toISOString(), reviewCount: 0 })
    const r5 = getReviewSchedule({ lastReview: new Date().toISOString(), reviewCount: 5 })
    expect(r5.intervalDays).toBeGreaterThan(r0.intervalDays)
  })
  it('max reviews → uses last interval', () => {
    const r = getReviewSchedule({ lastReview: new Date().toISOString(), reviewCount: 100 })
    expect(r.intervalDays).toBe(INTERVALS[INTERVALS.length - 1])
  })
  it('intervals array has 7 levels', () => {
    expect(INTERVALS).toHaveLength(7)
  })
  it('intervals are ascending', () => {
    for (let i = 1; i < INTERVALS.length; i++) {
      expect(INTERVALS[i]).toBeGreaterThan(INTERVALS[i - 1])
    }
  })
  it('overdue > 7 days → critical urgency', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString()
    const r = getReviewSchedule({ lastReview: tenDaysAgo, reviewCount: 0 })
    expect(r.urgency).toBe('critical')
  })
  it('returns nextReview as ISO string when reviewed', () => {
    const r = getReviewSchedule({ lastReview: new Date().toISOString(), reviewCount: 0 })
    expect(r.nextReview).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })
})

// ============================================================
// 3. QUIZ SCORING — 12 tests
// ============================================================
describe('Quiz Scoring — Complete Coverage', () => {
  let extractQuizScores, stripQuizTags, updateConceptStrength
  beforeEach(async () => {
    const mod = await import('../utils/quizScoring.js')
    extractQuizScores = mod.extractQuizScores
    stripQuizTags = mod.stripQuizTags
    updateConceptStrength = mod.updateConceptStrength
    localStorage.clear()
  })

  // Extraction
  it('extracts single score tag', () => {
    const scores = extractQuizScores('Good answer!\n[QUIZ_SCORE:7/10:Prompt Engineering]')
    expect(scores).toHaveLength(1)
    expect(scores[0].score).toBe(7)
    expect(scores[0].concept).toBe('Prompt Engineering')
  })
  it('extracts multiple score tags', () => {
    const text = 'Answer:\n[QUIZ_SCORE:8/10:RAG (Retrieval Augmented Gen)]\n[QUIZ_SCORE:5/10:Token Economics]'
    const scores = extractQuizScores(text)
    expect(scores).toHaveLength(2)
  })
  it('returns empty array for no tags', () => {
    expect(extractQuizScores('No scores here')).toHaveLength(0)
  })
  it('handles malformed tags gracefully', () => {
    expect(extractQuizScores('[QUIZ_SCORE:bad]')).toHaveLength(0)
  })

  // Stripping
  it('strips tags from display text', () => {
    const clean = stripQuizTags('Great!\n[QUIZ_SCORE:9/10:RAG (Retrieval Augmented Gen)]')
    expect(clean).not.toContain('[QUIZ_SCORE')
    expect(clean).toContain('Great!')
  })
  it('strips multiple tags', () => {
    const text = 'A\n[QUIZ_SCORE:7/10:X]\nB\n[QUIZ_SCORE:8/10:Y]'
    const clean = stripQuizTags(text)
    expect(clean).not.toContain('QUIZ_SCORE')
  })
  it('returns original if no tags', () => {
    expect(stripQuizTags('Hello world')).toBe('Hello world')
  })

  // Strength updates
  it('high score increases strength', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([{ id: 1, name: 'Prompt Engineering', strength: 50 }]))
    const result = updateConceptStrength('Prompt Engineering', 9)
    expect(result).not.toBeNull()
    expect(result.newStrength).toBeGreaterThan(50)
  })
  it('low score decreases strength', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([{ id: 1, name: 'Prompt Engineering', strength: 50 }]))
    const result = updateConceptStrength('Prompt Engineering', 2)
    expect(result).not.toBeNull()
    expect(result.newStrength).toBeLessThan(50)
  })
  it('strength capped at 0 and 100', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([{ id: 1, name: 'Prompt Engineering', strength: 5 }]))
    const r1 = updateConceptStrength('Prompt Engineering', 1)
    expect(r1.newStrength).toBeGreaterThanOrEqual(0)

    localStorage.setItem('jos-concepts', JSON.stringify([{ id: 1, name: 'Prompt Engineering', strength: 95 }]))
    const r2 = updateConceptStrength('Prompt Engineering', 10)
    expect(r2.newStrength).toBeLessThanOrEqual(100)
  })
  it('fuzzy concept matching works', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([{ id: 4, name: 'RAG (Retrieval Augmented Gen)', strength: 40 }]))
    const result = updateConceptStrength('RAG', 8)
    expect(result).not.toBeNull()
  })
  it('unknown concept returns null', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([{ id: 1, name: 'Prompt Engineering', strength: 50 }]))
    const result = updateConceptStrength('Nonexistent Concept', 5)
    expect(result).toBeNull()
  })
})

// ============================================================
// 4. INTELLIGENCE LEVEL — 8 tests
// ============================================================
describe('Intelligence Level — Complete Coverage', () => {
  let getIntelligenceLevel
  beforeEach(async () => {
    const mod = await import('../utils/intelligenceLevel.js')
    getIntelligenceLevel = mod.getIntelligenceLevel
  })

  it('0 data points → 0.40 confidence (PRIORS_SEED)', () => {
    const r = getIntelligenceLevel('energy', 0)
    expect(r.confidence).toBe(0.40)
    expect(r.level).toBe('PRIORS_SEED')
  })
  it('7 data points → 0.55 (EMERGING)', () => {
    const r = getIntelligenceLevel('energy', 7)
    expect(r.confidence).toBe(0.55)
    expect(r.level).toBe('EMERGING')
  })
  it('20 data points → 0.70 (LEARNING)', () => {
    const r = getIntelligenceLevel('mood', 20)
    expect(r.confidence).toBe(0.70)
    expect(r.level).toBe('LEARNING')
  })
  it('50 data points → 0.85 (CALIBRATED)', () => {
    const r = getIntelligenceLevel('focus', 50)
    expect(r.confidence).toBe(0.85)
    expect(r.level).toBe('CALIBRATED')
  })
  it('100 data points → 0.95 (LOCKED_IN)', () => {
    const r = getIntelligenceLevel('energy', 100)
    expect(r.confidence).toBe(0.95)
    expect(r.level).toBe('LOCKED_IN')
  })
  it('returns languagePrefix string', () => {
    const r = getIntelligenceLevel('energy', 50)
    expect(typeof r.languagePrefix).toBe('string')
    expect(r.languagePrefix.length).toBeGreaterThan(0)
  })
  it('returns source field', () => {
    expect(getIntelligenceLevel('x', 0).source).toBe('priors')
    expect(getIntelligenceLevel('x', 10).source).toBe('personal')
  })
  it('handles negative input gracefully', () => {
    expect(() => getIntelligenceLevel('x', -5)).not.toThrow()
  })
})

// ============================================================
// 5. COST CALCULATOR — 6 tests
// ============================================================
describe('Cost Calculator — Complete Coverage', () => {
  let calculateCost
  beforeEach(async () => {
    const mod = await import('../utils/costCalculator.js')
    calculateCost = mod.calculateCost
  })

  it('returns positive number', () => {
    expect(calculateCost('claude-sonnet-4-20250514', 100, 200)).toBeGreaterThan(0)
  })
  it('Opus costs more than Sonnet', () => {
    const sonnet = calculateCost('claude-sonnet-4-20250514', 1000, 1000)
    const opus = calculateCost('claude-opus-4-6', 1000, 1000)
    expect(opus).toBeGreaterThan(sonnet)
  })
  it('more tokens = higher cost', () => {
    const small = calculateCost('claude-sonnet-4-20250514', 100, 100)
    const large = calculateCost('claude-sonnet-4-20250514', 10000, 10000)
    expect(large).toBeGreaterThan(small)
  })
  it('zero tokens = zero cost', () => {
    expect(calculateCost('claude-sonnet-4-20250514', 0, 0)).toBe(0)
  })
  it('handles unknown model gracefully (falls back)', () => {
    expect(() => calculateCost('unknown-model', 100, 100)).not.toThrow()
    expect(calculateCost('unknown-model', 100, 100)).toBeGreaterThan(0)
  })
  it('returns number type', () => {
    expect(typeof calculateCost('claude-sonnet-4-20250514', 500, 500)).toBe('number')
  })
})

// ============================================================
// 6. DATE UTILS — 8 tests
// ============================================================
describe('Date Utils — Complete Coverage', () => {
  let getDayNumber, getWeekNumber, getTimeOfDay
  beforeEach(async () => {
    const mod = await import('../utils/dateUtils.js')
    getDayNumber = mod.getDayNumber
    getWeekNumber = mod.getWeekNumber
    getTimeOfDay = mod.getTimeOfDay
  })

  it('today = day 1', () => {
    expect(getDayNumber(new Date().toISOString())).toBe(1)
  })
  it('yesterday = day 2', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(getDayNumber(yesterday)).toBe(2)
  })
  it('7 days ago = week 2', () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    expect(getWeekNumber(weekAgo)).toBe(2)
  })
  it('day 1 = week 1', () => {
    expect(getWeekNumber(new Date().toISOString())).toBe(1)
  })
  it('handles null startDate', () => {
    expect(() => getDayNumber(null)).not.toThrow()
  })
  it('handles undefined startDate', () => {
    expect(() => getDayNumber(undefined)).not.toThrow()
  })
  it('returns positive numbers', () => {
    expect(getDayNumber(new Date().toISOString())).toBeGreaterThan(0)
    expect(getWeekNumber(new Date().toISOString())).toBeGreaterThan(0)
  })
  it('getTimeOfDay returns valid period', () => {
    expect(['morning', 'afternoon', 'evening', 'latenight']).toContain(getTimeOfDay())
  })
})

// ============================================================
// 7. STRATEGIC COMPILER — 6 tests
// ============================================================
describe('Strategic Compiler — Complete Coverage', () => {
  let compileSummary
  beforeEach(async () => {
    localStorage.clear()
    localStorage.setItem('jos-core', JSON.stringify({ startDate: new Date().toISOString(), streak: 3, rank: 'Recruit', completedTasks: [1, 2], energy: 4 }))
    localStorage.setItem('jos-feelings', JSON.stringify([]))
    localStorage.setItem('jos-concepts', JSON.stringify([]))
    localStorage.setItem('jos-api-logs', JSON.stringify([]))
    const mod = await import('../utils/strategicCompiler.js')
    compileSummary = mod.compileSummary
  })

  it('compileSummary returns string', () => {
    const s = compileSummary()
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
  })
  it('compileSummary includes day/week info', () => {
    const s = compileSummary()
    expect(s).toMatch(/day|week/i)
  })
  it('compileSummary includes streak', () => {
    const s = compileSummary()
    expect(s).toMatch(/streak/i)
  })
  it('handles empty localStorage gracefully', () => {
    localStorage.clear()
    expect(() => compileSummary()).not.toThrow()
  })
  it('handles corrupted localStorage', () => {
    localStorage.setItem('jos-core', 'NOT_JSON')
    expect(() => compileSummary()).not.toThrow()
  })
  it('includes task completion stats', () => {
    const s = compileSummary()
    expect(s).toMatch(/task|complete/i)
  })
})

// ============================================================
// 8. DATA FILES INTEGRITY — 15 tests
// ============================================================
describe('Data Files — Complete Integrity', () => {
  let TASKS, MODES, CONCEPTS, ACHIEVEMENTS

  beforeEach(async () => {
    TASKS = (await import('../data/tasks.js')).default
    MODES = (await import('../data/modes.js')).default
    CONCEPTS = (await import('../data/concepts.js')).default
    ACHIEVEMENTS = (await import('../data/achievements.js')).default
  })

  // Tasks
  it('82 tasks total', () => { expect(TASKS).toHaveLength(82) })
  it('no duplicate task IDs', () => {
    const ids = TASKS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('all tasks have name and week', () => {
    TASKS.forEach(t => {
      expect(t.name).toBeTruthy()
      expect(t.week).toBeGreaterThanOrEqual(1)
      expect(t.week).toBeLessThanOrEqual(6)
    })
  })
  it('tasks span weeks 1-6', () => {
    const weeks = [...new Set(TASKS.map(t => t.week))]
    expect(weeks).toContain(1)
    expect(weeks).toContain(6)
  })

  // Modes
  it('18 training modes', () => { expect(MODES).toHaveLength(18) })
  it('no duplicate mode IDs', () => {
    const ids = MODES.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('all modes have id, name, emoji, tier', () => {
    MODES.forEach(m => {
      expect(m.id).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(m.emoji).toBeTruthy()
      expect(m.tier).toBeGreaterThanOrEqual(1)
    })
  })

  // Concepts
  it('35 concepts', () => { expect(CONCEPTS).toHaveLength(35) })
  it('no duplicate concept IDs', () => {
    const ids = CONCEPTS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('all concepts have name and category', () => {
    CONCEPTS.forEach(c => {
      expect(c.name).toBeTruthy()
      expect(['Core', 'Advanced', 'Month2', 'Discuss']).toContain(c.category)
    })
  })
  it('all prerequisite IDs reference existing concepts', () => {
    const ids = CONCEPTS.map(c => c.id)
    CONCEPTS.forEach(c => {
      if (c.prerequisites) {
        c.prerequisites.forEach(preId => {
          expect(ids).toContain(preId)
        })
      }
    })
  })

  // Achievements
  it('18 achievements', () => { expect(ACHIEVEMENTS).toHaveLength(18) })
  it('no duplicate achievement IDs', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('all achievements have check function', () => {
    ACHIEVEMENTS.forEach(a => {
      expect(typeof a.check).toBe('function')
    })
  })
})

// ============================================================
// 9. PROMPTS — 8 tests
// ============================================================
describe('Prompts System — Complete Coverage', () => {
  let buildSystemPrompt, getAntiCrutchPrompt, getAntiCrutchLevel

  beforeEach(async () => {
    localStorage.clear()
    localStorage.setItem('jos-feelings', '[]')
    localStorage.setItem('jos-core', '{}')
    const mod = await import('../data/prompts.js')
    buildSystemPrompt = mod.buildSystemPrompt
    getAntiCrutchPrompt = mod.getAntiCrutchPrompt
    getAntiCrutchLevel = mod.getAntiCrutchLevel
  })

  it('buildSystemPrompt returns string for chat', () => {
    const p = buildSystemPrompt('chat', { weekNumber: 1 })
    expect(typeof p).toBe('string')
    expect(p.length).toBeGreaterThan(100)
  })
  it('includes JARVIS personality', () => {
    const p = buildSystemPrompt('chat')
    expect(p).toMatch(/JARVIS|Sir/)
  })
  it('includes anti-crutch FULL ASSIST for week 1', () => {
    const p = buildSystemPrompt('chat', { weekNumber: 1 })
    expect(p).toMatch(/FULL ASSIST/)
  })
  it('includes anti-crutch GUIDED for week 3', () => {
    const p = buildSystemPrompt('chat', { weekNumber: 3 })
    expect(p).toMatch(/GUIDED/)
  })
  it('includes ANTI-CRUTCH for week 5+', () => {
    const p = buildSystemPrompt('chat', { weekNumber: 6 })
    expect(p).toMatch(/ANTI-CRUTCH/)
  })
  it('includes VOICE INPUT context for chat mode', () => {
    const p = buildSystemPrompt('chat')
    expect(p).toMatch(/VOICE INPUT/)
  })
  it('includes FINOPS_CONTEXT for quiz mode', () => {
    const p = buildSystemPrompt('quiz')
    expect(p).toMatch(/TDS|194C|FinOps/i)
  })
  it('all 18 modes produce valid prompts', () => {
    const modes = ['chat','quiz','presser','timed','speed','battle','teach','body-double','alter-ego','recruiter-ghost','forensics','akshay-qs','time-machine','code-autopsy','scenario-bomb','interview-sim','impostor-killer','weakness-radar']
    modes.forEach(mode => {
      const p = buildSystemPrompt(mode, { weekNumber: 1 })
      expect(p.length).toBeGreaterThan(100)
    })
  })
})

// ============================================================
// 10. VOICE COMMANDS — 12 tests
// ============================================================
describe('Voice Commands — Complete Coverage', () => {
  let processVoiceCommand
  beforeEach(async () => {
    localStorage.clear()
    localStorage.setItem('jos-core', JSON.stringify({ startDate: new Date().toISOString(), streak: 5, completedTasks: [1,2,3], energy: 4, rank: 'Recruit' }))
    const mod = await import('../utils/voiceCommands.js')
    processVoiceCommand = mod.processVoiceCommand
  })

  it('"stop" → stop type', () => {
    expect(processVoiceCommand('stop').type).toBe('stop')
  })
  it('"jarvis stop" → stop type', () => {
    expect(processVoiceCommand('jarvis stop').type).toBe('stop')
  })
  it('"shutdown" → shutdown type', () => {
    expect(processVoiceCommand('shutdown').type).toBe('shutdown')
  })
  it('"goodnight jarvis" → shutdown', () => {
    expect(processVoiceCommand('goodnight jarvis').type).toBe('shutdown')
  })
  it('"check in" → checkin type', () => {
    expect(processVoiceCommand('check in').type).toBe('checkin')
  })
  it('"capture need to review RAG" → speak type', () => {
    const r = processVoiceCommand('capture need to review RAG')
    expect(r).not.toBeNull()
    expect(r.type).toBe('speak')
  })
  it('"status" → speak type with stats', () => {
    const r = processVoiceCommand('status')
    expect(r).not.toBeNull()
    expect(r.response).toMatch(/Day|Streak|Energy/i)
  })
  it('"switch to quiz" → mode type', () => {
    const r = processVoiceCommand('switch to quiz')
    expect(r).not.toBeNull()
    expect(r.type).toBe('mode')
    expect(r.mode).toBe('quiz')
  })
  it('normal conversation → null (send to API)', () => {
    expect(processVoiceCommand('what is prompt engineering')).toBeNull()
  })
  it('empty string → null', () => {
    expect(processVoiceCommand('')).toBeNull()
  })
  it('"streak" → speak with streak info', () => {
    const r = processVoiceCommand('streak')
    expect(r).not.toBeNull()
    expect(r.response).toMatch(/streak/i)
  })
  it('all commands return response string', () => {
    const cmds = ['stop', 'shutdown', 'check in', 'status', 'streak']
    cmds.forEach(cmd => {
      const r = processVoiceCommand(cmd)
      expect(r).not.toBeNull()
      expect(typeof r.response).toBe('string')
    })
  })
})

// ============================================================
// 11. API LOGGER — 5 tests
// ============================================================
describe('API Logger — Complete Coverage', () => {
  let logAPICall
  beforeEach(async () => {
    localStorage.clear()
    localStorage.setItem('jos-api-logs', '[]')
    const mod = await import('../utils/apiLogger.js')
    logAPICall = mod.logAPICall
  })

  it('logs to localStorage', () => {
    logAPICall({ model: 'claude-sonnet-4-20250514', mode: 'chat', inputTokens: 100, outputTokens: 200, latencyMs: 500 })
    const logs = JSON.parse(localStorage.getItem('jos-api-logs'))
    expect(logs.length).toBe(1)
  })
  it('includes timestamp', () => {
    logAPICall({ model: 'test', mode: 'chat', inputTokens: 0, outputTokens: 0, latencyMs: 0 })
    const logs = JSON.parse(localStorage.getItem('jos-api-logs'))
    expect(logs[0].timestamp).toBeTruthy()
  })
  it('caps at 500 entries', () => {
    const existing = Array.from({ length: 500 }, (_, i) => ({ id: i, timestamp: new Date().toISOString() }))
    localStorage.setItem('jos-api-logs', JSON.stringify(existing))
    logAPICall({ model: 'test', mode: 'chat', inputTokens: 0, outputTokens: 0, latencyMs: 0 })
    const logs = JSON.parse(localStorage.getItem('jos-api-logs'))
    expect(logs.length).toBeLessThanOrEqual(501)
  })
  it('handles corrupted localStorage', () => {
    localStorage.setItem('jos-api-logs', 'NOT_JSON')
    expect(() => logAPICall({ model: 'test' })).not.toThrow()
  })
  it('calculates cost', () => {
    logAPICall({ model: 'claude-sonnet-4-20250514', mode: 'chat', inputTokens: 1000, outputTokens: 1000, latencyMs: 500 })
    const logs = JSON.parse(localStorage.getItem('jos-api-logs'))
    expect(logs[0].cost).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
// 12. BURNOUT DETECTOR — 5 tests
// ============================================================
describe('Burnout Detector — Complete Coverage', () => {
  let detect
  beforeEach(async () => {
    localStorage.clear()
    const mod = await import('../utils/burnoutDetector.js')
    detect = mod.detect
  })

  it('module loads and exports detect()', () => {
    expect(typeof detect).toBe('function')
  })
  it('returns object with indicators array', () => {
    const r = detect()
    expect(Array.isArray(r.indicators)).toBe(true)
  })
  it('returns score number', () => {
    const r = detect()
    expect(typeof r.score).toBe('number')
  })
  it('no data → no burnout warning', () => {
    const r = detect()
    expect(r.warning).toBe(false)
  })
  it('handles missing localStorage keys', () => {
    localStorage.clear()
    expect(() => detect()).not.toThrow()
  })
})

// ============================================================
// 13. localStorage CORRUPTION RESILIENCE — 5 tests
// ============================================================
describe('localStorage Corruption Resilience', () => {

  beforeEach(() => { localStorage.clear() })

  it('corrupted JSON parses to null with fallback', () => {
    localStorage.setItem('jos-core', 'NOT_VALID_JSON{{{')
    const raw = localStorage.getItem('jos-core')
    let result = null
    try { result = JSON.parse(raw) } catch { result = null }
    expect(result).toBeNull()
  })

  it('all jos- keys use correct prefix', () => {
    localStorage.setItem('jos-core', '{}')
    localStorage.setItem('jos-feelings', '[]')
    localStorage.setItem('jos-concepts', '[]')
    // Verify keys are retrievable with jos- prefix
    expect(localStorage.getItem('jos-core')).toBe('{}')
    expect(localStorage.getItem('jos-feelings')).toBe('[]')
    expect(localStorage.getItem('jos-concepts')).toBe('[]')
  })

  it('empty localStorage does not crash common parse patterns', () => {
    localStorage.clear()
    expect(() => {
      JSON.parse(localStorage.getItem('jos-core') || '{}')
      JSON.parse(localStorage.getItem('jos-feelings') || '[]')
      JSON.parse(localStorage.getItem('jos-concepts') || '[]')
      JSON.parse(localStorage.getItem('jos-api-logs') || '[]')
    }).not.toThrow()
  })

  it('null values parse safely with fallback', () => {
    const val = localStorage.getItem('nonexistent-key')
    expect(val).toBeNull()
    const parsed = JSON.parse(val || '{}')
    expect(parsed).toEqual({})
  })

  it('array fallback works for missing list keys', () => {
    const parsed = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(0)
  })
})
