// VizSmartCards.jsx — Auto-renders data visuals below JARVIS responses
import { useMemo } from 'react'
import VizConceptRing from './VizConceptRing.jsx'
import VizSparkline from './VizSparkline.jsx'
import VizBlocker from './VizBlocker.jsx'
import VizComparisonChart from './VizComparisonChart.jsx'
import VizTrendChart from './VizTrendChart.jsx'
import CONCEPTS from '../../data/concepts.js'
import { extractQuizScores } from '../../utils/quizScoring.js'
import { parseResponseForViz } from '../../utils/vizResponseParser.js'

export default function VizSmartCards({ response, mode }) {
  const vizData = useMemo(() => {
    if (!response) return null
    const saved = (() => { try { return JSON.parse(localStorage.getItem('jos-concepts') || '[]') } catch { return [] } })()

    // Quiz mode: show concept ring + sparkline for scored concepts
    if (['quiz', 'presser', 'battle', 'forensics', 'code-autopsy', 'scenario-bomb'].includes(mode)) {
      const scores = extractQuizScores(response)
      if (scores.length > 0) {
        return scores.map(s => {
          const concept = CONCEPTS.find(c => c.name.toLowerCase().includes(s.concept.toLowerCase()))
          const savedC = concept ? saved.find(x => x.id === concept.id) : null
          const history = savedC?.reviewHistory?.map(r => r.score) || []
          // Check for blocker (prerequisite with < 40%)
          let blocker = null
          if (concept?.prerequisites) {
            for (const preId of concept.prerequisites) {
              const pre = CONCEPTS.find(c => c.id === preId)
              const preSaved = saved.find(x => x.id === preId)
              if (pre && (preSaved?.strength || 0) < 40) {
                blocker = { name: pre.name, strength: preSaved?.strength || 0, blockedName: concept.name, blockedStrength: savedC?.strength || 0 }
                break
              }
            }
          }
          return { concept: concept?.name || s.concept, strength: savedC?.strength || 0, score: s.score, history, blocker }
        })
      }
    }

    // Scan for mentioned concepts in any mode
    const mentioned = CONCEPTS.filter(c => response.toLowerCase().includes(c.name.toLowerCase())).slice(0, 3)
    if (mentioned.length > 0) {
      return mentioned.map(c => {
        const s = saved.find(x => x.id === c.id)
        return { concept: c.name, strength: s?.strength || 0, score: null, history: [], blocker: null }
      })
    }

    return null
  }, [response, mode])

  if (!vizData || vizData.length === 0) return null

  return (
    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
      {vizData.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <VizConceptRing name={d.concept} strength={d.strength} size={38} />
          {d.history.length > 0 && <VizSparkline scores={d.history.slice(-5)} width={60} height={18} />}
          {d.score && <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: d.score >= 7 ? '#10b981' : d.score >= 5 ? '#d4a853' : '#ef4444' }}>{d.score}/10</span>}
        </div>
      ))}
      {vizData.some(d => d.blocker) && vizData.filter(d => d.blocker).map((d, i) => (
        <VizBlocker key={`b${i}`} blocked={d.blocker.blockedName} blocker={d.blocker.name} blockedStrength={d.blocker.blockedStrength} blockerStrength={d.blocker.strength} />
      ))}
      <ResponseCharts response={response} mode={mode} />
    </div>
  )
}

// Tier 3: AI-generated charts from response patterns
function ResponseCharts({ response, mode }) {
  const viz = parseResponseForViz(response, mode)
  if (viz.length === 0) return null

  let compData = null, trendData = null
  try {
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    if (viz.some(v => v.type === 'comparison') && feelings.length >= 7) {
      const thisWeek = feelings.slice(-7), lastWeek = feelings.slice(-14, -7)
      const avg = (arr, key) => arr.length ? arr.reduce((s, f) => s + (f[key] || 0), 0) / arr.length : 0
      compData = [
        { label: 'Conf', before: Math.round(avg(lastWeek, 'confidence') * 10) / 10, after: Math.round(avg(thisWeek, 'confidence') * 10) / 10 },
        { label: 'Focus', before: Math.round(avg(lastWeek, 'focus') * 10) / 10, after: Math.round(avg(thisWeek, 'focus') * 10) / 10 },
        { label: 'Energy', before: Math.round(avg(lastWeek, 'energy') * 10) / 10, after: Math.round(avg(thisWeek, 'energy') * 10) / 10 },
      ]
    }
    if (viz.some(v => v.type === 'trend') && feelings.length >= 3) {
      trendData = feelings.slice(-7).map(f => f.confidence || 3)
    }
  } catch { /* ok */ }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {compData && <VizComparisonChart data={compData} />}
      {trendData && <VizTrendChart data={trendData} label="CONFIDENCE TREND" />}
    </div>
  )
}
