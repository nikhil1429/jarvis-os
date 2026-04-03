// ShutdownCeremony.jsx — The ritual of closing JARVIS for the day
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'

const CLOSING_LINES = [
  "Good night, Sir. I'll process today's data overnight. Tomorrow we continue.",
  "Rest well. The tasks will be here. So will I.",
  "Your consistency today was noted. And appreciated.",
  "Day logged. Systems entering standby. See you tomorrow, Sir.",
  "Good night. The data tells a good story today.",
]

export default function ShutdownCeremony({ onComplete }) {
  const [phase, setPhase] = useState('processing')
  const [tasks, setTasks] = useState([])

  const core = (() => { try { return JSON.parse(localStorage.getItem('jos-core') || '{}') } catch { return {} } })()
  const closingLine = CLOSING_LINES[Math.floor(Math.random() * CLOSING_LINES.length)]
  const hasCheckin = (() => { try { const f = JSON.parse(localStorage.getItem('jos-feelings') || '[]'); return f.some(x => x.date === new Date().toISOString().split('T')[0]) } catch { return false } })()

  useEffect(() => {
    const t1 = setTimeout(() => {
      setTasks([
        { text: 'Saving session data', done: true },
        { text: 'Backing up to cloud', done: true },
        { text: 'Queuing overnight analysis', done: true },
      ])
      setPhase('summary')
    }, 2000)
    const t2 = setTimeout(() => setPhase(hasCheckin ? 'closing' : 'checkin'), 5000)
    const t3 = setTimeout(() => setPhase('closing'), 9000)
    const t4 = setTimeout(() => setPhase('standby'), 13000)
    const t5 = setTimeout(() => onComplete?.(), 16000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5) }
  }, [onComplete, hasCheckin])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#020a13' }}>
      {phase === 'processing' && (
        <div className="text-center stagger-enter">
          <p className="font-display text-sm text-text-dim tracking-wider mb-4">Understood, Sir.</p>
          <p className="font-mono text-[9px] text-text-muted tracking-widest animate-pulse">RUNNING END-OF-DAY PROCESSES</p>
        </div>
      )}

      {phase === 'summary' && (
        <div className="text-center stagger-enter space-y-2">
          {tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-2 justify-center">
              <Check size={10} className="text-green-400" />
              <span className="font-mono text-[9px] text-text-muted">{t.text}</span>
            </div>
          ))}
          <div className="mt-6 space-y-1">
            <p className="font-mono text-xs text-text-dim">TODAY — DAY {core.dayNumber || '?'}</p>
            <p className="font-mono text-[10px] text-text-muted">{(core.completedTasks || []).length} tasks · streak: {core.streak || 0}</p>
          </div>
        </div>
      )}

      {phase === 'checkin' && (
        <div className="text-center stagger-enter">
          <p className="font-body text-sm text-text-dim mb-3">No check-in today. Quick word before we close?</p>
          <div className="flex gap-3 justify-center mb-3">
            {['😫', '😕', '😐', '🙂', '😎'].map((emoji, i) => (
              <button key={i} onClick={() => {
                try {
                  const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
                  feelings.push({ date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), confidence: i + 1, source: 'shutdown-quick' })
                  localStorage.setItem('jos-feelings', JSON.stringify(feelings))
                } catch { /* ok */ }
                setPhase('closing')
              }} className="text-2xl hover:scale-125 transition-transform">{emoji}</button>
            ))}
          </div>
          <button onClick={() => setPhase('closing')} className="font-mono text-[8px] text-text-muted">SKIP</button>
        </div>
      )}

      {phase === 'closing' && (
        <div className="text-center stagger-enter max-w-md mx-4">
          <p className="font-body text-sm text-text leading-relaxed italic">{closingLine}</p>
        </div>
      )}

      {phase === 'standby' && (
        <div className="text-center">
          <p className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(90,122,148,0.3)' }}>JARVIS OS — STANDBY</p>
          <div className="w-2 h-2 rounded-full mx-auto mt-3" style={{ background: '#d4a853', opacity: 0.4, animation: 'breathe 4s ease-in-out infinite' }} />
        </div>
      )}
    </div>
  )
}
