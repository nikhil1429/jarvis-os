// useReportGenerator.js — Generates AI reports (3-day trend, weekly review, newsletter)
// WHY: Scheduler detects WHEN, this hook does the WHAT. One Sonnet call per report.

import { useState, useCallback } from 'react'
import { compileSummary } from '../utils/strategicCompiler.js'
import { getDayNumber, getWeekNumber } from '../utils/dateUtils.js'

function getCore() {
  try { return JSON.parse(localStorage.getItem('jos-core') || '{}') } catch { return {} }
}
function getFeelings() {
  try { return JSON.parse(localStorage.getItem('jos-feelings') || '[]') } catch { return [] }
}
function getConcepts() {
  try { return JSON.parse(localStorage.getItem('jos-concepts') || '[]') } catch { return [] }
}
function saveWeekly(key, value) {
  try {
    const w = JSON.parse(localStorage.getItem('jos-weekly') || '{}')
    const obj = typeof w === 'object' && !Array.isArray(w) ? w : {}
    obj[key] = value
    localStorage.setItem('jos-weekly', JSON.stringify(obj))
  } catch { /* ok */ }
}

async function callAPI(prompt, mode = 'chat') {
  const core = getCore()
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are JARVIS OS — Nikhil Panwar's AI operating system. Formal British voice. Data-driven. Concise.`,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  // Parse SSE stream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = '', buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n'); buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const event = JSON.parse(data)
        if (event.type === 'content_block_delta' && event.delta?.text) text += event.delta.text
      } catch { /* skip */ }
    }
  }
  return text
}

export default function useReportGenerator() {
  const [generating, setGenerating] = useState(null)

  const generate3DayTrend = useCallback(async () => {
    setGenerating('trend-3d')
    try {
      const feelings = getFeelings().slice(-3)
      const core = getCore()
      const concepts = getConcepts()
      const weak = concepts.filter(c => (c.strength || 0) < 40).map(c => c.name).slice(0, 3)

      const prompt = `3-DAY TREND ANALYSIS for Sir.
Last 3 days: ${feelings.map((f, i) => `Day${i+1}: Conf=${f.confidence||'?'}, Foc=${f.focus||'?'}, En=${f.energy||'?'}, Mood="${f.mood||'?'}"`).join(' | ')}
Streak: ${core.streak||0}, Tasks: ${(core.completedTasks||[]).length}/82, Weak concepts: ${weak.join(', ')||'none'}

Generate exactly:
1. TRAJECTORY (1-2 lines): improving/declining/plateau?
2. PATTERN (1-2 lines): micro-pattern from 3 days
3. ENERGY INSIGHT (1 line): energy/meds/focus connection
4. PREDICTION (1 line): next 3 days
5. ONE ACTION (1 line): most impactful change

Under 150 words. Specific, not generic. JARVIS voice.`

      const text = await callAPI(prompt)
      const report = { type: 'trend-3d', text, generatedAt: new Date().toISOString() }
      saveWeekly('lastTrend', new Date().toISOString())
      saveWeekly('lastTrendReport', report)
      setGenerating(null)
      return report
    } catch (err) { console.error('3-Day Trend failed:', err); setGenerating(null); return null }
  }, [])

  const generateWeeklyReview = useCallback(async () => {
    setGenerating('weekly')
    try {
      const feelings = getFeelings().slice(-7)
      const core = getCore()
      const concepts = getConcepts()
      const weak = concepts.filter(c => (c.strength||0) < 40).map(c => c.name).slice(0,3)
      const strong = concepts.filter(c => (c.strength||0) >= 70).map(c => c.name).slice(0,3)
      const wk = getWeekNumber(core.startDate)

      const prompt = `WEEKLY STRATEGIC REVIEW — Week ${wk}.
Week data: ${feelings.map(f => `Conf=${f.confidence||'?'},Foc=${f.focus||'?'},En=${f.energy||'?'}`).join(' | ')}
Tasks: ${(core.completedTasks||[]).length}/82, Streak: ${core.streak||0}
Weak: ${weak.join(', ')||'none'}, Strong: ${strong.join(', ')||'none'}

Generate exactly:
1. WEEK HEADLINE (memorable, 5-8 words)
2. WINS (2-3 bullets)
3. GAPS (2-3 bullets, root causes)
4. PATTERN OF THE WEEK (1-2 lines)
5. CONCEPT VELOCITY (1 line)
6. NEXT WEEK FOCUS (1 line)
7. JARVIS ASSESSMENT (1-2 lines, honest)

Under 250 words. Data-driven.`

      const text = await callAPI(prompt, 'weakness-radar')
      const report = { type: 'weekly', text, generatedAt: new Date().toISOString(), weekNumber: wk }
      saveWeekly('lastWeeklyReview', new Date().toISOString())
      saveWeekly('lastWeeklyReport', report)
      setGenerating(null)
      return report
    } catch (err) { console.error('Weekly Review failed:', err); setGenerating(null); return null }
  }, [])

  const generateNewsletter = useCallback(async () => {
    setGenerating('newsletter')
    try {
      const core = getCore()
      const concepts = getConcepts()
      const weak = concepts.filter(c => (c.strength||0) < 40).map(c => c.name).slice(0,3)
      const wk = getWeekNumber(core.startDate)

      const prompt = `JARVIS WEEKLY NEWSLETTER — Week ${wk}.
Tasks=${(core.completedTasks||[]).length}/82, Streak=${core.streak||0}, Day=${getDayNumber(core.startDate)}
Weak: ${weak.join(', ')||'none'}

Generate newsletter (warm, personal):
1. SUBJECT LINE (5-8 words)
2. OPENING (1-2 sentences)
3. BY THE NUMBERS (3-4 stats)
4. HIGHLIGHT (1 paragraph)
5. CHALLENGE AHEAD (1 paragraph)
6. JARVIS THOUGHT (1-2 sentences)

Under 200 words. Warm. Not corporate.`

      const text = await callAPI(prompt)
      saveWeekly('newsletter', { text, generatedAt: new Date().toISOString(), weekNumber: wk })
      setGenerating(null)
      return { text }
    } catch (err) { console.error('Newsletter failed:', err); setGenerating(null); return null }
  }, [])

  return { generating, generate3DayTrend, generateWeeklyReview, generateNewsletter }
}
