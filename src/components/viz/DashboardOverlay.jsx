// DashboardOverlay.jsx — Full-screen data dashboard triggered by events
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import VizMetricCard from './VizMetricCard.jsx'
import VizEnergyBar from './VizEnergyBar.jsx'
import VizConceptRing from './VizConceptRing.jsx'
import VizDelta from './VizDelta.jsx'
import { getDayNumber, getWeekNumber } from '../../utils/dateUtils.js'
import CONCEPTS from '../../data/concepts.js'

const QUOTES = {
  streak: 'Consistency is your superpower, Sir.',
  lowEnergy: 'Rest is a tactical decision, not weakness.',
  highConf: 'The data supports your confidence, Sir.',
  default: 'Another day logged. The system grows stronger.',
}

export default function DashboardOverlay({ type, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  useEffect(() => { const t = setTimeout(onClose, 15000); return () => clearTimeout(t) }, [onClose])

  let core, feelings, concepts, savedConcepts
  try {
    core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    savedConcepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
  } catch { core = {}; feelings = []; savedConcepts = [] }

  const today = feelings[feelings.length - 1] || {}
  const yesterday = feelings[feelings.length - 2] || {}
  const streak = core.streak || 0
  const energy = core.energy || 3
  const dayNum = getDayNumber(core.startDate)
  const weekNum = getWeekNumber(core.startDate)
  const tasks = (core.completedTasks || []).length

  // Energy last 7 days
  const energyData = feelings.slice(-7).map(f => f.energy || f.confidence || 3)

  // Quote
  const quote = streak > 5 ? QUOTES.streak : energy < 2 ? QUOTES.lowEnergy : (today.confidence || 0) > 4 ? QUOTES.highConf : QUOTES.default

  // Overdue concepts
  const overdue = CONCEPTS.map(c => {
    const s = savedConcepts.find(x => x.id === c.id) || {}
    return { name: c.name, strength: s.strength || 0, overdue: !s.lastReview }
  }).filter(c => c.overdue || c.strength < 30).sort((a, b) => a.strength - b.strength).slice(0, 3)

  const isGold = type === 'daily-delta' || type === 'weekly-review'

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center" style={{
      backgroundColor: 'rgba(2,10,19,0.97)', backdropFilter: 'blur(12px)',
      opacity: visible ? 1 : 0, transition: 'opacity 0.4s',
    }}>
      <div className="glass-card p-6 max-w-md w-full mx-4" style={{ borderTop: `2px solid ${isGold ? '#d4a853' : '#00b4d8'}` }}>
        <div className="flex justify-between items-start mb-4">
          <h2 className={`font-display text-sm font-bold tracking-[0.15em] ${isGold ? 'gold-heading' : 'neon-heading'}`}
            style={{ color: isGold ? '#d4a853' : '#00b4d8' }}>
            {type === 'daily-delta' ? 'DAILY DEBRIEF' : type === 'boot-briefing' ? 'MORNING BRIEFING' : `WEEKLY REVIEW — WEEK ${weekNum}`}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text"><X size={16} /></button>
        </div>

        {/* Metrics row */}
        <div className="flex gap-2 mb-4 card-enter" style={{ animationDelay: '0ms' }}>
          {type === 'boot-briefing' ? (
            <>
              <VizMetricCard label="DAY" value={dayNum} color="#00b4d8" />
              <VizMetricCard label="STREAK" value={streak} color="#d4a853" />
              <VizMetricCard label="TASKS LEFT" value={82 - tasks} color="#00b4d8" />
            </>
          ) : (
            <>
              <VizMetricCard label="CONFIDENCE" value={today.confidence || '—'} delta={today.confidence && yesterday.confidence ? today.confidence - yesterday.confidence : undefined} />
              <VizMetricCard label="FOCUS" value={today.focus || '—'} color="#00b4d8" />
              <VizMetricCard label="ENERGY" value={energy} color={energy >= 4 ? '#10b981' : '#d4a853'} />
              <VizMetricCard label="STREAK" value={streak} color="#d4a853" />
            </>
          )}
        </div>

        {/* Energy bar */}
        <div className="card-enter mb-4" style={{ animationDelay: '80ms' }}>
          <p style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#5a7a94', marginBottom: 4, letterSpacing: '0.1em' }}>
            {type === 'boot-briefing' ? 'RECENT ENERGY' : 'LAST 7 DAYS'}
          </p>
          <VizEnergyBar data={energyData} />
        </div>

        {/* Concepts */}
        {overdue.length > 0 && (
          <div className="card-enter mb-4" style={{ animationDelay: '160ms' }}>
            <p style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: '#5a7a94', marginBottom: 4, letterSpacing: '0.1em' }}>
              {type === 'weekly-review' ? 'NEEDS ATTENTION' : 'REVIEW DUE'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {overdue.map((c, i) => <VizConceptRing key={i} name={c.name} strength={c.strength} size={38} />)}
            </div>
          </div>
        )}

        {/* Weekly deltas */}
        {type === 'weekly-review' && feelings.length >= 7 && (
          <div className="card-enter mb-4" style={{ animationDelay: '240ms' }}>
            <VizDelta label="Confidence" before={feelings.slice(-14, -7).reduce((s, f) => s + (f.confidence || 0), 0) / 7 || 0}
              after={feelings.slice(-7).reduce((s, f) => s + (f.confidence || 0), 0) / 7 || 0} />
          </div>
        )}

        {/* Quote */}
        <p className="card-enter" style={{ animationDelay: '320ms', fontFamily: 'Exo 2', fontSize: 11, color: '#5a7a94', fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
          "{quote}"
        </p>
      </div>
    </div>
  )
}
