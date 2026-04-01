// VizSmartCards.jsx — Auto-renders data visuals below JARVIS responses
import { useMemo } from 'react'
import VizConceptRing from './VizConceptRing.jsx'
import VizSparkline from './VizSparkline.jsx'
import VizBlocker from './VizBlocker.jsx'
import CONCEPTS from '../../data/concepts.js'
import { extractQuizScores } from '../../utils/quizScoring.js'

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
    </div>
  )
}
