// strategicCompiler.js — Full localStorage intelligence compiler for Opus calls
// WHY: Before every Opus call, we need ALL of Nikhil's data in one structured package.
// This function reads every localStorage key and returns a clean, summarized object
// that can be injected into system prompts. Opus uses this to give data-driven,
// personalized advice instead of generic responses.
// Handles missing/empty keys gracefully — never crashes on corrupted data.

import { getDayNumber, getWeekNumber } from './dateUtils.js'
import { getReviewSchedule } from './spacedRepetition.js'
import CONCEPTS from '../data/concepts.js'
import TASKS from '../data/tasks.js'

const PREFIX = 'jos-'

function safeGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * compile — Reads ALL localStorage and returns structured intelligence package
 * Called before every Opus API call to provide full context.
 */
export function compile() {
  const core = safeGet('core') || {}
  const feelings = safeGet('feelings') || []
  const conceptData = safeGet('concepts') || []
  const achievements = safeGet('achievements') || []
  const journal = safeGet('journal') || []
  const settings = safeGet('settings') || {}
  const sessionTimer = safeGet('session-timer') || {}
  const quickCapture = safeGet('quick-capture') || []
  const dailyBuild = safeGet('daily-build') || []
  const decisions = safeGet('decisions') || []
  const applications = safeGet('applications') || []
  const commitments = safeGet('commitments') || []
  const morningBets = safeGet('morning-bets') || []
  const apiLogs = safeGet('api-logs') || []
  const onboarding = safeGet('onboarding') || {}

  const startDate = core.startDate || new Date().toISOString()
  const dayNumber = getDayNumber(startDate)
  const weekNumber = getWeekNumber(startDate)

  // === METADATA ===
  const metadata = {
    dayNumber,
    weekNumber,
    rank: core.rank || 'Recruit',
    phase: dayNumber <= 70 ? 1 : dayNumber <= 100 ? 2 : 3,
    streak: core.streak || 0,
    energy: core.energy || 3,
    startDate,
  }

  // === CONCEPTS ===
  const conceptsWithData = CONCEPTS.map(c => {
    const saved = conceptData.find(s => s.id === c.id) || {}
    const strength = saved.strength || 0
    const review = getReviewSchedule(saved)
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      strength,
      lastReview: saved.lastReview || null,
      reviewCount: saved.reviewCount || 0,
      isOverdue: review.isOverdue,
      urgency: review.urgency,
    }
  })

  const avgStrength = conceptsWithData.length > 0
    ? Math.round(conceptsWithData.reduce((s, c) => s + c.strength, 0) / conceptsWithData.length)
    : 0

  const sorted = [...conceptsWithData].sort((a, b) => b.strength - a.strength)
  const concepts = {
    all: conceptsWithData,
    avgStrength,
    topThree: sorted.slice(0, 3).map(c => `${c.name} (${c.strength}%)`),
    bottomThree: sorted.slice(-3).map(c => `${c.name} (${c.strength}%)`),
    overdueForReview: conceptsWithData.filter(c => c.isOverdue).length,
  }

  // === CHECK-INS ===
  const last14 = feelings.slice(-14)
  const confValues = last14.filter(f => f.confidence).map(f => f.confidence)
  const focusValues = last14.filter(f => f.focus).map(f => f.focus)
  const motivValues = last14.filter(f => f.motivation).map(f => f.motivation)
  const sleepValues = last14.filter(f => f.sleep).map(f => f.sleep)

  const avg = arr => arr.length > 0 ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : 0
  const trend = arr => {
    if (arr.length < 4) return 'insufficient'
    const firstHalf = avg(arr.slice(0, Math.floor(arr.length / 2)))
    const secondHalf = avg(arr.slice(Math.floor(arr.length / 2)))
    if (secondHalf > firstHalf + 0.3) return 'improving'
    if (secondHalf < firstHalf - 0.3) return 'declining'
    return 'stable'
  }

  const checkins = {
    total: feelings.length,
    last14Days: last14.length,
    trends: {
      confidence: { avg: avg(confValues), trend: trend(confValues) },
      focus: { avg: avg(focusValues), trend: trend(focusValues) },
      motivation: { avg: avg(motivValues), trend: trend(motivValues) },
      sleep: { avg: avg(sleepValues), trend: trend(sleepValues) },
    },
    bodyData: {
      avgChai: avg(last14.filter(f => f.chai != null).map(f => f.chai)),
      medsCompliance: last14.filter(f => f.meds === true).length,
      lunchRate: last14.filter(f => f.lunch === true).length,
    },
    streakData: {
      current: core.streak || 0,
      longest: core.longestStreak || core.streak || 0,
    },
  }

  // === TRAINING ===
  let totalMessages = 0
  const byMode = {}
  const modeTimestamps = {}

  try {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX + 'msgs-')).forEach(k => {
      const modeId = k.replace(PREFIX + 'msgs-', '')
      const msgs = JSON.parse(localStorage.getItem(k)) || []
      const userMsgs = msgs.filter(m => m.role === 'user')
      totalMessages += userMsgs.length
      byMode[modeId] = userMsgs.length

      if (userMsgs.length > 0) {
        modeTimestamps[modeId] = userMsgs[userMsgs.length - 1].timestamp
      }
    })
  } catch { /* skip corrupted */ }

  const allModes = ['chat', 'quiz', 'presser', 'timed', 'speed', 'battle', 'teach',
    'body-double', 'alter-ego', 'recruiter-ghost', 'forensics', 'akshay-qs',
    'time-machine', 'code-autopsy', 'scenario-bomb', 'interview-sim',
    'impostor-killer', 'weakness-radar']
  const avoidedModes = allModes.filter(m => !byMode[m] || byMode[m] === 0)

  const training = {
    totalMessages,
    byMode,
    avoidedModes,
    avgQuizScore: null, // Will be computed when quiz scoring is implemented
  }

  // === ESTIMATION ===
  const estimation = {
    totalBets: morningBets.length,
    accuracy: morningBets.length > 0
      ? Math.round(morningBets.filter(b => b.outcome === 'correct').length / morningBets.length * 100)
      : null,
    overUnderBias: null, // Computed when morning bets track over/under
  }

  // === SESSIONS ===
  const totalMinutes = sessionTimer.totalMinutes || 0
  const sessions = {
    totalHours: +(totalMinutes / 60).toFixed(1),
    todayMinutes: totalMinutes,
    sessionCount: (sessionTimer.sessions || []).length,
  }

  // === BURNOUT (6 indicators) ===
  const burnoutIndicators = []

  // 1. Declining check-in scores
  if (checkins.trends.confidence.trend === 'declining' ||
      checkins.trends.motivation.trend === 'declining') {
    burnoutIndicators.push('Declining check-in scores')
  }

  // 2. Skipped routines (missing check-ins)
  const today = new Date().toISOString().split('T')[0]
  const recentDates = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })
  const recentSkips = recentDates.filter(d => !feelings.some(f => f.date === d)).length
  if (recentSkips >= 2) burnoutIndicators.push('Skipped routines')

  // 3. Mode avoidance (many modes never used)
  if (avoidedModes.length > 12) burnoutIndicators.push('High mode avoidance')

  // 4. Streak breaks
  if (core.streak === 1 && feelings.length > 7) burnoutIndicators.push('Recent streak break')

  // 5. Low energy trend
  const recentEnergy = last14.filter(f => f.confidence).map(f => f.confidence)
  if (recentEnergy.length >= 3 && avg(recentEnergy.slice(-3)) < 2.5) {
    burnoutIndicators.push('Low energy trend')
  }

  // 6. Late session starts
  if (sessionTimer.sessions && sessionTimer.sessions.length > 0) {
    const lastStart = sessionTimer.sessions[sessionTimer.sessions.length - 1]?.start
    if (lastStart) {
      const hour = new Date(lastStart).getHours()
      if (hour >= 23 || hour < 4) burnoutIndicators.push('Late session starts')
    }
  }

  const burnout = {
    indicators: burnoutIndicators,
    score: burnoutIndicators.length,
    warning: burnoutIndicators.length >= 3,
    recommendation: burnoutIndicators.length >= 3 ? 'Consider a rest day, Sir.' : null,
  }

  // === TASKS ===
  const completedTasks = core.completedTasks || []
  const tasks = {
    total: TASKS.length,
    completed: completedTasks.length,
    percent: Math.round((completedTasks.length / TASKS.length) * 100),
    byWeek: [1, 2, 3, 4, 5, 6].map(w => {
      const weekTasks = TASKS.filter(t => t.week === w)
      const done = weekTasks.filter(t => completedTasks.includes(t.id)).length
      return { week: w, done, total: weekTasks.length }
    }),
  }

  // === API COSTS ===
  const totalCost = apiLogs.reduce((s, l) => s + (l.cost || 0), 0)
  const apiCosts = {
    totalCalls: apiLogs.length,
    totalCost: +totalCost.toFixed(4),
    avgCostPerCall: apiLogs.length > 0 ? +(totalCost / apiLogs.length).toFixed(4) : 0,
    opusCalls: apiLogs.filter(l => l.model?.includes('opus')).length,
    sonnetCalls: apiLogs.filter(l => !l.model?.includes('opus')).length,
  }

  return {
    metadata,
    concepts,
    checkins,
    training,
    estimation,
    sessions,
    burnout,
    achievements: { total: achievements.length, ids: achievements.map(a => a.id) },
    tasks,
    journals: { total: journal.length },
    decisions: { total: decisions.length },
    applications: { total: applications.length },
    commitments: { total: commitments.length },
    apiCosts,
    quickCaptures: quickCapture.length,
    dailyBuilds: dailyBuild.length,
  }
}

/**
 * compileSummary — Returns a compressed text summary for injection into prompts
 * WHY: The full compile() output is too large for system prompts. This returns
 * a ~300 token summary of the most important data points.
 */
export function compileSummary() {
  const data = compile()
  const lines = [
    `Day ${data.metadata.dayNumber}, Week ${data.metadata.weekNumber}, Rank: ${data.metadata.rank}, Streak: ${data.metadata.streak}`,
    `Tasks: ${data.tasks.completed}/${data.tasks.total} (${data.tasks.percent}%)`,
    `Concepts: avg ${data.concepts.avgStrength}%, ${data.concepts.overdueForReview} overdue`,
    `Top: ${data.concepts.topThree.join(', ')}`,
    `Weak: ${data.concepts.bottomThree.join(', ')}`,
    `Check-ins: ${data.checkins.total}, Confidence trend: ${data.checkins.trends.confidence.trend} (${data.checkins.trends.confidence.avg})`,
    `Training: ${data.training.totalMessages} msgs, Avoided modes: ${data.training.avoidedModes.length}`,
    `Session time: ${data.sessions.totalHours}h`,
    `Achievements: ${data.achievements.total}/18`,
    data.burnout.warning ? `⚠️ BURNOUT WARNING: ${data.burnout.indicators.join(', ')}` : 'Burnout: OK',
  ]
  return lines.join('\n')
}
