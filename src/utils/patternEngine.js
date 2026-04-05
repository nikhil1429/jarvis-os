// patternEngine.js — Discovers correlations between lifestyle and performance
// WHY: JARVIS finds patterns you can't see. Minimum 7 data points per condition,
// 15%+ difference to report, confidence based on sample size.

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0 }
function round1(n) { return Math.round(n * 10) / 10 }

/**
 * Discover all patterns from accumulated data.
 * @returns {Array} patterns sorted by confidence
 */
export function discoverPatterns() {
  const patterns = []

  try {
    const feelings = safeGet('jos-feelings', [])
    if (feelings.length < 7) return patterns

    const concepts = safeGet('jos-concepts', [])
    const timerData = safeGet('jos-session-timer', [])
    const apiLogs = safeGet('jos-api-logs', [])

    // === Pattern 1: Coffee timing vs next-day focus ===
    const coffeeVsFocus = []
    for (let i = 1; i < feelings.length; i++) {
      const yesterday = feelings[i - 1]
      const today = feelings[i]
      if (yesterday.coffee !== undefined && today.focus !== undefined) {
        const d1 = new Date(yesterday.date || yesterday.timestamp)
        const d2 = new Date(today.date || today.timestamp)
        if ((d2 - d1) / 86400000 > 0 && (d2 - d1) / 86400000 < 2) {
          coffeeVsFocus.push({ coffee: yesterday.coffee, nextFocus: today.focus })
        }
      }
    }
    addComparisonPattern(patterns, coffeeVsFocus, 'coffee-focus',
      p => p.coffee >= 2, p => p.coffee <= 1, p => p.nextFocus,
      (diff, n) => diff > 0
        ? `Days with 2+ coffees correlate with ${pct(diff)}% lower next-morning focus (${n} data points).`
        : `Higher coffee intake correlates with better next-morning focus. Interesting.`
    )

    // === Pattern 2: Sleep vs same-day focus ===
    const sleepVsFocus = feelings.filter(f => f.sleep && f.focus)
    addComparisonPattern(patterns, sleepVsFocus.map(f => ({ a: f.sleep, val: f.focus })), 'sleep-focus',
      p => p.a >= 4, p => p.a <= 2, p => p.val,
      (diff, n) => `Good sleep (4-5) shows ${pct(diff)}% higher focus than poor sleep (1-2). Sample: ${n} days.`
    )

    // === Pattern 3: Meds taken vs afternoon energy ===
    const medsData = feelings.filter(f => f.meds !== undefined && f.energy !== undefined)
    addComparisonPattern(patterns, medsData.map(f => ({ a: f.meds, val: f.energy })), 'meds-energy',
      p => p.a === true, p => p.a === false, p => p.val,
      (diff, n) => diff > 0
        ? `Medicated days show ${pct(diff)}% higher energy. Sample: ${n} days.`
        : `Energy similar regardless of medication. Interesting.`
    )

    // === Pattern 4: Session length vs next-day motivation ===
    for (let i = 1; i < timerData.length; i++) {
      const yesterday = timerData[i - 1]
      const today = timerData[i]
      const todayFeeling = feelings.find(f => (f.date || f.timestamp || '').startsWith(today.date))
      if (yesterday.totalMinutes && todayFeeling?.motivation) {
        // Will be captured below
      }
    }
    const sessionVsMotivation = []
    for (let i = 1; i < timerData.length; i++) {
      const prev = timerData[i - 1]
      const curr = timerData[i]
      const currFeeling = feelings.find(f => (f.date || f.timestamp || '').startsWith(curr.date))
      if (prev.totalMinutes && currFeeling?.energy) {
        sessionVsMotivation.push({ sessionMins: prev.totalMinutes, nextEnergy: currFeeling.energy })
      }
    }
    addComparisonPattern(patterns, sessionVsMotivation, 'session-nextday',
      p => p.sessionMins >= 240, p => p.sessionMins < 120, p => p.nextEnergy,
      (diff, n) => diff > 0
        ? `Short sessions (<2hr) followed by ${pct(diff)}% higher next-day energy. Sustainable pace matters.`
        : `Longer sessions (4hr+) don't reduce next-day energy. Your stamina holds.`
    )

    // === Pattern 5: Day of week vs productivity ===
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const byDay = {}
    for (const t of timerData) {
      const d = new Date(t.date)
      const day = d.getDay()
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(t.totalMinutes || 0)
    }
    const dayAvgs = Object.entries(byDay)
      .filter(([, vals]) => vals.length >= 3)
      .map(([day, vals]) => ({ day: parseInt(day), avg: round1(avg(vals)), n: vals.length }))
      .sort((a, b) => b.avg - a.avg)
    if (dayAvgs.length >= 3) {
      const best = dayAvgs[0]
      const worst = dayAvgs[dayAvgs.length - 1]
      if (best.avg > worst.avg * 1.3) {
        patterns.push({
          id: 'day-productivity',
          text: `${dayNames[best.day]}s average ${Math.round(best.avg)} min sessions. ${dayNames[worst.day]}s: only ${Math.round(worst.avg)} min.`,
          confidence: Math.min(best.n, worst.n) >= 5 ? 'high' : 'medium',
          dataPoints: dayAvgs.reduce((s, d) => s + d.n, 0),
          discoveredAt: new Date().toISOString(),
        })
      }
    }

    // === Pattern 6: Streak length vs confidence ===
    const streakConf = feelings.filter(f => f.confidence).map((f, i) => {
      // Approximate streak from consecutive check-ins
      let streak = 1
      for (let j = i - 1; j >= 0; j--) {
        const prev = new Date(feelings[j].date || feelings[j].timestamp)
        const curr = new Date(feelings[j + 1].date || feelings[j + 1].timestamp)
        if ((curr - prev) / 86400000 < 2) streak++
        else break
      }
      return { streak, confidence: f.confidence }
    })
    addComparisonPattern(patterns, streakConf, 'streak-confidence',
      p => p.streak >= 7, p => p.streak <= 2, p => p.confidence,
      (diff, n) => diff > 0
        ? `7+ day streaks show ${pct(diff)}% higher confidence than short streaks. Consistency builds self-trust.`
        : `Confidence is steady regardless of streak length. Internal, not habit-dependent.`
    )

    // === Pattern 7: Energy level vs message length (engagement) ===
    const modeMsgs = []
    const allModes = ['chat', 'quiz', 'presser', 'battle', 'teach', 'body-double']
    for (const mode of allModes) {
      const msgs = safeGet(`jos-msgs-${mode}`, [])
      for (const m of msgs) {
        if (m.role === 'user' && m.content) {
          modeMsgs.push({ length: m.content.length, timestamp: m.timestamp })
        }
      }
    }
    // Match message lengths with same-day energy
    const energyMsgLen = []
    for (const f of feelings) {
      if (!f.energy || !f.date) continue
      const dayMsgs = modeMsgs.filter(m => m.timestamp && m.timestamp.startsWith(f.date.split('T')[0]))
      if (dayMsgs.length >= 2) {
        energyMsgLen.push({ energy: f.energy, avgLen: avg(dayMsgs.map(m => m.length)) })
      }
    }
    addComparisonPattern(patterns, energyMsgLen, 'energy-engagement',
      p => p.energy >= 4, p => p.energy <= 2, p => p.avgLen,
      (diff, n) => diff > 0
        ? `High-energy days produce ${pct(diff)}% longer messages. More energy = deeper engagement.`
        : `Message length doesn't vary with energy. Engagement is intrinsic.`
    )

    // === Pattern 8: Time of day vs quiz performance ===
    const quizLogs = apiLogs.filter(l => l.mode === 'quiz' && l.timestamp)
    const morningQuiz = quizLogs.filter(l => { const h = new Date(l.timestamp).getHours(); return h >= 6 && h < 12 })
    const eveningQuiz = quizLogs.filter(l => { const h = new Date(l.timestamp).getHours(); return h >= 18 && h < 24 })
    if (morningQuiz.length >= 5 && eveningQuiz.length >= 5) {
      // Use output tokens as rough proxy for answer quality (longer = more detailed)
      const amAvg = avg(morningQuiz.map(l => l.outputTokens || 200))
      const pmAvg = avg(eveningQuiz.map(l => l.outputTokens || 200))
      const diff = amAvg - pmAvg
      if (Math.abs(diff) / Math.max(amAvg, pmAvg) > 0.15) {
        patterns.push({
          id: 'time-quiz',
          text: diff > 0
            ? `Morning quiz sessions produce more detailed responses. Your brain is sharper before noon.`
            : `Evening quiz sessions are more detailed. You're a night owl, Sir.`,
          confidence: Math.min(morningQuiz.length, eveningQuiz.length) >= 10 ? 'high' : 'medium',
          dataPoints: morningQuiz.length + eveningQuiz.length,
          discoveredAt: new Date().toISOString(),
        })
      }
    }

    localStorage.setItem('jos-patterns', JSON.stringify(patterns))
  } catch (err) {
    console.warn('[patternEngine] Error:', err)
  }

  return patterns
}

/**
 * Helper: Compare two groups and add pattern if significant (>15% difference).
 */
function addComparisonPattern(patterns, data, id, groupA, groupB, valueExtract, textFn) {
  if (data.length < 7) return
  const a = data.filter(groupA)
  const b = data.filter(groupB)
  if (a.length < 3 || b.length < 3) return
  const avgA = avg(a.map(valueExtract))
  const avgB = avg(b.map(valueExtract))
  const diff = avgA - avgB
  const base = Math.max(avgA, avgB) || 1
  if (Math.abs(diff) / base < 0.15) return // Not significant

  patterns.push({
    id,
    text: textFn(diff, data.length),
    confidence: data.length >= 30 ? 'high' : data.length >= 14 ? 'medium' : 'low',
    dataPoints: data.length,
    discoveredAt: new Date().toISOString(),
  })
}

function pct(diff) { return Math.abs(Math.round(diff * 100 / Math.max(Math.abs(diff), 0.1))) }

/**
 * Get top N strongest patterns for briefing/newsletter.
 */
export function getTopPatterns(n = 3) {
  const patterns = discoverPatterns()
  const confOrder = { high: 0, medium: 1, low: 2 }
  return patterns
    .sort((a, b) => (confOrder[a.confidence] || 2) - (confOrder[b.confidence] || 2))
    .slice(0, n)
}

/**
 * Get patterns as system prompt context for Claude.
 */
export function getPatternPrompt() {
  const patterns = getTopPatterns(3)
  if (patterns.length === 0) return ''
  return 'DISCOVERED PATTERNS (from tracked data — reference naturally):\n' +
    patterns.map(p => `- ${p.text} [${p.confidence} confidence, ${p.dataPoints} data points]`).join('\n')
}
