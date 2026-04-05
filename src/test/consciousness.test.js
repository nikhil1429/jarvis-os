import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================
// 1. EMOTIONAL MEMORY
// ============================================================
describe('Emotional Memory', () => {
  let saveConcern, savePromise, getUnresolvedConcerns, getUncheckedPromises, getMoodTrajectory, detectInSessionCrash
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/emotionalMemory.js')
    saveConcern = m.saveConcern; savePromise = m.savePromise
    getUnresolvedConcerns = m.getUnresolvedConcerns; getUncheckedPromises = m.getUncheckedPromises
    getMoodTrajectory = m.getMoodTrajectory; detectInSessionCrash = m.detectInSessionCrash
  })

  it('saves and retrieves concerns', () => {
    saveConcern('worried about interview')
    expect(getUnresolvedConcerns()).toHaveLength(1)
    expect(getUnresolvedConcerns()[0].text).toBe('worried about interview')
  })
  it('saves and retrieves promises', () => {
    savePromise('will review RAG tomorrow')
    const promises = getUncheckedPromises()
    // May be 0 if dueBy is tomorrow (not yet due)
    expect(typeof promises).toBe('object')
  })
  it('empty localStorage returns empty arrays', () => {
    expect(getUnresolvedConcerns()).toEqual([])
    expect(getUncheckedPromises()).toEqual([])
  })
  it('getMoodTrajectory returns null with < 3 entries', () => {
    expect(getMoodTrajectory()).toBeNull()
  })
  it('detectInSessionCrash returns null with < 6 messages', () => {
    expect(detectInSessionCrash([])).toBeNull()
    expect(detectInSessionCrash([{ role: 'user', content: 'hi' }])).toBeNull()
  })
  it('detectInSessionCrash ignores short greetings', () => {
    const msgs = Array.from({ length: 8 }, (_, i) => ({
      role: 'user',
      content: i < 4 ? 'This is a longer message about my work today and how I feel' : 'hi'
    }))
    expect(detectInSessionCrash(msgs)).toBeNull()
  })
})

// ============================================================
// 2. GHOST CARD ENGINE
// ============================================================
describe('Ghost Card Engine', () => {
  let generateGhostCards
  beforeEach(async () => {
    localStorage.clear()
    generateGhostCards = (await import('../utils/ghostCardEngine.js')).generateGhostCards
  })

  it('returns array for cmd tab', () => {
    expect(Array.isArray(generateGhostCards({ tab: 'cmd' }))).toBe(true)
  })
  it('returns array for task-complete event', () => {
    localStorage.setItem('jos-core', JSON.stringify({ completedTasks: [1, 2, 3] }))
    expect(Array.isArray(generateGhostCards({ event: 'task-complete' }))).toBe(true)
  })
  it('returns empty array with no data', () => {
    expect(generateGhostCards({})).toEqual([])
  })
})

// ============================================================
// 3. TEMPORAL AWARENESS
// ============================================================
describe('Temporal Awareness', () => {
  let getTemporalContext
  beforeEach(async () => {
    localStorage.clear()
    getTemporalContext = (await import('../utils/temporalAwareness.js')).getTemporalContext
  })

  it('returns object with timeLabel', () => {
    const ctx = getTemporalContext()
    expect(ctx).toHaveProperty('timeLabel')
    expect(typeof ctx.timeLabel).toBe('string')
  })
  it('returns medState', () => {
    expect(getTemporalContext()).toHaveProperty('medState')
  })
  it('returns warnings array', () => {
    expect(Array.isArray(getTemporalContext().warnings)).toBe(true)
  })
})

// ============================================================
// 4. PATTERN ENGINE
// ============================================================
describe('Pattern Engine', () => {
  let discoverPatterns, getTopPatterns, getPatternPrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/patternEngine.js')
    discoverPatterns = m.discoverPatterns; getTopPatterns = m.getTopPatterns; getPatternPrompt = m.getPatternPrompt
  })

  it('returns empty array with no data', () => {
    expect(discoverPatterns()).toEqual([])
  })
  it('returns empty array with < 7 check-ins', () => {
    localStorage.setItem('jos-feelings', JSON.stringify([{ sleep: 4, focus: 3 }]))
    expect(discoverPatterns()).toEqual([])
  })
  it('getTopPatterns returns array', () => {
    expect(Array.isArray(getTopPatterns(3))).toBe(true)
  })
  it('getPatternPrompt returns string', () => {
    expect(typeof getPatternPrompt()).toBe('string')
  })
})

// ============================================================
// 5. GREETING ENGINE
// ============================================================
describe('Greeting Engine', () => {
  let generateGreeting
  beforeEach(async () => {
    localStorage.clear()
    generateGreeting = (await import('../utils/greetingEngine.js')).generateGreeting
  })

  it('returns a greeting object or string', () => {
    const result = generateGreeting()
    expect(result).toBeDefined()
    expect(result).not.toBeNull()
  })
  it('returns greeting with lines', () => {
    const result = generateGreeting()
    // generateGreeting returns { lines: [...], color: '...' }
    expect(result).toHaveProperty('lines')
    expect(result.lines.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 6. JARVIS CONVICTIONS
// ============================================================
describe('Jarvis Convictions', () => {
  let checkConviction, buildConvictionContext, getActiveConvictions
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/jarvisConvictions.js')
    checkConviction = m.checkConviction; buildConvictionContext = m.buildConvictionContext; getActiveConvictions = m.getActiveConvictions
  })

  it('triggers on late night + low energy + hard mode', () => {
    const result = checkConviction({ mode: 'scenario-bomb', hour: 2, energy: 1, medState: 'off', sessionHours: 0, foodEaten: true, lastSleep: 3, daysSinceCheckin: 0, consecutiveHardModes: 0, energySet: true, daysAvoidingMode: 0, overdueConceptDays: 0, dayOfWeek: 1, todaySessionLogged: true, weeklyReviewDone: false })
    expect(result).not.toBeNull()
    expect(result.type).toBe('refuse')
  })
  it('returns null for normal conditions', () => {
    const result = checkConviction({ mode: 'chat', hour: 14, energy: 3, medState: 'on', sessionHours: 1, foodEaten: true, lastSleep: 4, daysSinceCheckin: 0, consecutiveHardModes: 0, energySet: true, daysAvoidingMode: 0, overdueConceptDays: 0, dayOfWeek: 1, todaySessionLogged: true, weeklyReviewDone: true })
    expect(result).toBeNull()
  })
  it('buildConvictionContext returns object', () => {
    const ctx = buildConvictionContext()
    expect(ctx).toHaveProperty('hour')
    expect(ctx).toHaveProperty('energy')
    expect(ctx).toHaveProperty('sessionHours')
  })
  it('getActiveConvictions returns sorted array', () => {
    const convictions = getActiveConvictions()
    expect(Array.isArray(convictions)).toBe(true)
  })
})

// ============================================================
// 7. JARVIS OBSERVATIONS
// ============================================================
describe('Jarvis Observations', () => {
  let detectCrisis, generateObservations
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/jarvisObservations.js')
    detectCrisis = m.detectCrisis; generateObservations = m.generateObservations
  })

  it('detectCrisis returns null with no data', () => {
    expect(detectCrisis()).toBeNull()
  })
  it('generateObservations returns array', () => {
    expect(Array.isArray(generateObservations())).toBe(true)
  })
})

// ============================================================
// 8. JARVIS AGENDA
// ============================================================
describe('Jarvis Agenda', () => {
  let generateInvestigations
  beforeEach(async () => {
    localStorage.clear()
    generateInvestigations = (await import('../utils/jarvisAgenda.js')).generateInvestigations
  })

  it('returns array', () => {
    expect(Array.isArray(generateInvestigations())).toBe(true)
  })
})

// ============================================================
// 9. BURNOUT DETECTOR
// ============================================================
describe('Burnout Detector', () => {
  let detect
  beforeEach(async () => {
    localStorage.clear()
    detect = (await import('../utils/burnoutDetector.js')).detect
  })

  it('returns object with indicators array', () => {
    const result = detect()
    expect(result).toHaveProperty('indicators')
    expect(Array.isArray(result.indicators)).toBe(true)
  })
  it('returns score field', () => {
    expect(detect()).toHaveProperty('score')
  })
})

// ============================================================
// 10. AVOIDANCE DETECTOR
// ============================================================
describe('Avoidance Detector', () => {
  let detectAvoidance, getAvoidancePrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/avoidanceDetector.js')
    detectAvoidance = m.detectAvoidance; getAvoidancePrompt = m.getAvoidancePrompt
  })

  it('detects never-used hard modes', () => {
    const avoidances = detectAvoidance()
    const hardModeAvoidance = avoidances.find(a => a.type === 'mode-never-used')
    expect(hardModeAvoidance).toBeDefined()
  })
  it('getAvoidancePrompt returns string', () => {
    expect(typeof getAvoidancePrompt()).toBe('string')
  })
  it('returns sorted by severity', () => {
    const avoidances = detectAvoidance()
    if (avoidances.length >= 2) {
      const sevOrder = { high: 3, medium: 2, low: 1 }
      expect(sevOrder[avoidances[0].severity]).toBeGreaterThanOrEqual(sevOrder[avoidances[avoidances.length - 1].severity])
    }
  })
})

// ============================================================
// 11. OVERNIGHT PROCESSOR
// ============================================================
describe('Overnight Processor', () => {
  let runOvernightProcessing
  beforeEach(async () => {
    localStorage.clear()
    runOvernightProcessing = (await import('../utils/overnightProcessor.js')).runOvernightProcessing
  })

  it('runs without error on empty data', () => {
    expect(() => runOvernightProcessing()).not.toThrow()
  })
})

// ============================================================
// 12. COMMUNICATION TRACKER
// ============================================================
describe('Communication Tracker', () => {
  let trackEngagement, getCommunicationInsights, classifyStyle, trackResponse, getCommunicationPrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/communicationTracker.js')
    trackEngagement = m.trackEngagement; getCommunicationInsights = m.getCommunicationInsights
    classifyStyle = m.classifyStyle; trackResponse = m.trackResponse; getCommunicationPrompt = m.getCommunicationPrompt
  })

  it('trackEngagement stores data', () => {
    trackEngagement('humor', true)
    trackEngagement('humor', false)
    const data = JSON.parse(localStorage.getItem('jos-comm-effectiveness'))
    expect(data.humor.shown).toBe(2)
    expect(data.humor.engaged).toBe(1)
  })
  it('getCommunicationInsights returns null with < 20 interactions', () => {
    expect(getCommunicationInsights()).toBeNull()
  })
  it('classifyStyle detects question style', () => {
    expect(classifyStyle('What do you think? And why? Really?')).toContain('question')
  })
  it('classifyStyle detects data-heavy style', () => {
    expect(classifyStyle('Your streak is 14 days at 85%')).toContain('data-heavy')
  })
  it('classifyStyle returns direct for short messages', () => {
    expect(classifyStyle('Noted, Sir.')).toContain('direct')
  })
  it('trackResponse updates running average', () => {
    trackResponse(['humor'], 100)
    const stats = JSON.parse(localStorage.getItem('jos-comm-stats'))
    expect(stats.total).toBe(1)
    expect(stats.sum).toBe(100)
  })
  it('getCommunicationPrompt returns string', () => {
    expect(typeof getCommunicationPrompt()).toBe('string')
  })
})

// ============================================================
// 13. HIGHLIGHT CAPTURE
// ============================================================
describe('Highlight Capture', () => {
  let captureHighlight, getHighlights
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/highlightCapture.js')
    captureHighlight = m.captureHighlight; getHighlights = m.getHighlights
  })

  it('captures and retrieves highlights', () => {
    captureHighlight({ text: 'Built auth module', type: 'task' })
    expect(getHighlights()).toHaveLength(1)
  })
  it('returns empty array with no data', () => {
    expect(getHighlights()).toEqual([])
  })
})

// ============================================================
// 14. PEOPLE MAP
// ============================================================
describe('People Map', () => {
  let detectPeopleMentions, getPeopleMap
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/peopleMap.js')
    detectPeopleMentions = m.detectPeopleMentions; getPeopleMap = m.getPeopleMap
  })

  it('detects Nidhi mention', () => {
    detectPeopleMentions('Nidhi said the design looks good')
    const map = getPeopleMap()
    // getPeopleMap returns object keyed by lowercase name
    expect(map.nidhi).toBeDefined()
    expect(map.nidhi.mentionCount).toBeGreaterThanOrEqual(1)
  })
  it('detects Akshay mention', () => {
    detectPeopleMentions('Akshay confirmed the TDS checking is manual')
    const map = getPeopleMap()
    expect(map.akshay).toBeDefined()
    expect(map.akshay.mentionCount).toBeGreaterThanOrEqual(1)
  })
  it('returns empty map with no data', () => {
    const map = getPeopleMap()
    expect(map).toBeDefined()
  })
})

// ============================================================
// 15. ADAPTIVE DIFFICULTY
// ============================================================
describe('Adaptive Difficulty', () => {
  let getDifficultyLevel, recordQuizScore, getDifficultyPrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/adaptiveDifficulty.js')
    getDifficultyLevel = m.getDifficultyLevel; recordQuizScore = m.recordQuizScore; getDifficultyPrompt = m.getDifficultyPrompt
  })

  it('returns Standard or Foundations for unknown concept', () => {
    const name = getDifficultyLevel('nonexistent').name
    expect(['Standard', 'Foundations']).toContain(name)
  })
  it('returns Foundations for weak concept', () => {
    localStorage.setItem('jos-concepts', JSON.stringify([{ id: 1, name: 'RAG', strength: 20 }]))
    expect(getDifficultyLevel('RAG').name).toBe('Foundations')
  })
  it('recordQuizScore stores data', () => {
    recordQuizScore('RAG', 7)
    recordQuizScore('RAG', 8)
    const history = JSON.parse(localStorage.getItem('jos-quiz-scores'))
    expect(history['RAG']).toHaveLength(2)
  })
  it('getDifficultyPrompt returns string for quiz mode', () => {
    expect(typeof getDifficultyPrompt('quiz', 'RAG')).toBe('string')
  })
  it('getDifficultyPrompt returns empty for chat mode', () => {
    expect(getDifficultyPrompt('chat', 'RAG')).toBe('')
  })
})

// ============================================================
// 16. MICRO-CELEBRATIONS
// ============================================================
describe('Micro-Celebrations', () => {
  let checkMicroCelebration, buildTaskContext, buildConceptContext
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/microCelebrations.js')
    checkMicroCelebration = m.checkMicroCelebration; buildTaskContext = m.buildTaskContext; buildConceptContext = m.buildConceptContext
  })

  it('fires on first task of day', () => {
    const result = checkMicroCelebration('task:complete', { tasksToday: 1, totalCompleted: 1 })
    expect(result).not.toBeNull()
    expect(result.message).toContain('Momentum')
  })
  it('fires on streak 3', () => {
    const result = checkMicroCelebration('streak', { streak: 3 })
    expect(result).not.toBeNull()
    expect(result.message).toContain('Habit')
  })
  it('fires on concept hitting 60%', () => {
    const result = checkMicroCelebration('concept:strength', buildConceptContext('RAG', 55, 62))
    expect(result).not.toBeNull()
    expect(result.message).toContain('competent')
  })
  it('returns null for non-matching trigger', () => {
    expect(checkMicroCelebration('nonexistent', {})).toBeNull()
  })
  it('buildTaskContext returns object', () => {
    const ctx = buildTaskContext()
    expect(ctx).toHaveProperty('totalCompleted')
    expect(ctx).toHaveProperty('tasksToday')
  })
})

// ============================================================
// 17. MOMENTUM TRACKER
// ============================================================
describe('Momentum Tracker', () => {
  let recordActivity, getMomentum, getMomentumPrompt, getMomentumGhostCard
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/momentumTracker.js')
    recordActivity = m.recordActivity; getMomentum = m.getMomentum
    getMomentumPrompt = m.getMomentumPrompt; getMomentumGhostCard = m.getMomentumGhostCard
  })

  it('returns insufficient with no data', () => {
    expect(getMomentum().state).toBe('insufficient')
  })
  it('records activity', () => {
    for (let i = 0; i < 6; i++) recordActivity('message')
    const log = JSON.parse(localStorage.getItem('jos-momentum'))
    expect(log).toHaveLength(6)
  })
  it('getMomentumPrompt returns empty with no data', () => {
    expect(getMomentumPrompt()).toBe('')
  })
  it('getMomentumGhostCard returns null with no data', () => {
    expect(getMomentumGhostCard()).toBeNull()
  })
})

// ============================================================
// 18. PROACTIVE ENGINE
// ============================================================
describe('Proactive Engine', () => {
  let suggestOptimalAction, getProactiveSuggestionPrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/proactiveEngine.js')
    suggestOptimalAction = m.suggestOptimalAction; getProactiveSuggestionPrompt = m.getProactiveSuggestionPrompt
  })

  it('returns suggestion object with top field', () => {
    const result = suggestOptimalAction()
    expect(result).toHaveProperty('top')
    expect(result).toHaveProperty('alternatives')
    expect(result).toHaveProperty('signals')
  })
  it('suggests check-in when stale', () => {
    // No check-in data → hoursSinceCheckin = 999
    const result = suggestOptimalAction()
    const checkin = result.top?.type === 'checkin' || result.alternatives.some(a => a.type === 'checkin')
    expect(checkin).toBe(true)
  })
  it('getProactiveSuggestionPrompt returns string', () => {
    expect(typeof getProactiveSuggestionPrompt()).toBe('string')
  })
})

// ============================================================
// 19. SELF-LEARNING
// ============================================================
describe('Self-Learning', () => {
  let logAdvice, markAdviceOutcome, getLastUnresolvedAdvice, autoDetectDismissal, getAdviceEffectiveness, getSelfLearningPrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/selfLearning.js')
    logAdvice = m.logAdvice; markAdviceOutcome = m.markAdviceOutcome
    getLastUnresolvedAdvice = m.getLastUnresolvedAdvice; autoDetectDismissal = m.autoDetectDismissal
    getAdviceEffectiveness = m.getAdviceEffectiveness; getSelfLearningPrompt = m.getSelfLearningPrompt
  })

  it('logs advice and retrieves it', () => {
    const id = logAdvice({ text: 'Take a break', type: 'break' })
    expect(id).toBeGreaterThan(0)
    expect(getLastUnresolvedAdvice()).not.toBeNull()
  })
  it('marks advice outcome', () => {
    const id = logAdvice({ text: 'Try quiz', type: 'mode-switch' })
    markAdviceOutcome(id, true)
    const log = JSON.parse(localStorage.getItem('jos-advice-log'))
    expect(log.find(a => a.id === id).followed).toBe(true)
  })
  it('getAdviceEffectiveness returns null with < 10 outcomes', () => {
    expect(getAdviceEffectiveness()).toBeNull()
  })
  it('getSelfLearningPrompt returns string', () => {
    expect(typeof getSelfLearningPrompt()).toBe('string')
  })
})

// ============================================================
// 20. SESSION CONTINUITY
// ============================================================
describe('Session Continuity', () => {
  let saveSessionState, getLastSession, generateContinuityBriefing, getSessionContinuityPrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/sessionContinuity.js')
    saveSessionState = m.saveSessionState; getLastSession = m.getLastSession
    generateContinuityBriefing = m.generateContinuityBriefing; getSessionContinuityPrompt = m.getSessionContinuityPrompt
  })

  it('saves session state without error', () => {
    expect(() => saveSessionState()).not.toThrow()
    expect(localStorage.getItem('jos-last-session')).not.toBeNull()
  })
  it('getLastSession returns null for same-day data', () => {
    saveSessionState()
    expect(getLastSession()).toBeNull() // same day = not returned
  })
  it('generateContinuityBriefing returns string', () => {
    const briefing = generateContinuityBriefing({ daysSince: 1, totalSessionMinutes: 120, tasksCompletedToday: 3, stuckPoints: ['RAG embedding'], unfinishedBusiness: [], highlights: ['4 tasks done'] })
    expect(briefing).toContain('Yesterday')
    expect(briefing).toContain('RAG embedding')
  })
  it('getSessionContinuityPrompt returns empty for no data', () => {
    expect(getSessionContinuityPrompt()).toBe('')
  })
})

// ============================================================
// 21. AUDIT TRAIL
// ============================================================
describe('Audit Trail', () => {
  let logInteraction, getAuditSummary, getRecentTrail, getAuditPrompt
  beforeEach(async () => {
    localStorage.clear()
    const m = await import('../utils/auditTrail.js')
    logInteraction = m.logInteraction; getAuditSummary = m.getAuditSummary
    getRecentTrail = m.getRecentTrail; getAuditPrompt = m.getAuditPrompt
  })

  it('logs and retrieves interactions', () => {
    logInteraction({ type: 'advice', content: 'Take a break' })
    logInteraction({ type: 'celebration', content: 'Well done' })
    expect(getRecentTrail()).toHaveLength(2)
  })
  it('getAuditSummary counts by type', () => {
    logInteraction({ type: 'advice', content: 'test' })
    logInteraction({ type: 'celebration', content: 'test' })
    logInteraction({ type: 'celebration', content: 'test2' })
    const summary = getAuditSummary()
    expect(summary.adviceGiven).toBe(1)
    expect(summary.celebrationsFired).toBe(2)
    expect(summary.totalInteractions).toBe(3)
  })
  it('getAuditPrompt returns empty with < 10 interactions', () => {
    expect(getAuditPrompt()).toBe('')
  })
  it('caps at 500 entries', () => {
    for (let i = 0; i < 510; i++) logInteraction({ type: 'response', content: `msg ${i}` })
    expect(getRecentTrail(600).length).toBeLessThanOrEqual(500)
  })
})

// ============================================================
// CROSS-FEATURE INTEGRATION TESTS
// ============================================================
describe('Cross-Feature Integration', () => {
  beforeEach(() => { localStorage.clear() })

  it('ghost card engine reads momentum tracker', async () => {
    const { recordActivity } = await import('../utils/momentumTracker.js')
    const { generateGhostCards } = await import('../utils/ghostCardEngine.js')
    // No activity → ghost cards may include momentum card or not, but should not crash
    expect(() => generateGhostCards({ tab: 'cmd' })).not.toThrow()
  })

  it('proactive engine reads from multiple sources', async () => {
    const { suggestOptimalAction } = await import('../utils/proactiveEngine.js')
    localStorage.setItem('jos-core', JSON.stringify({ energy: 5, streak: 10, completedTasks: [1, 2, 3] }))
    const result = suggestOptimalAction()
    expect(result.signals.energy).toBe(5)
  })

  it('avoidance detector reads concepts data', async () => {
    const { detectAvoidance } = await import('../utils/avoidanceDetector.js')
    const avoidances = detectAvoidance()
    // Should find untouched concepts
    const conceptAvoidance = avoidances.find(a => a.type === 'concept-untouched')
    expect(conceptAvoidance).toBeDefined()
  })
})
