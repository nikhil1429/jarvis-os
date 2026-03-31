// ImpostorKiller.jsx — Evidence-based anti-impostor-syndrome card
// WHY: When Nikhil feels like a fraud, he can look at this card and see hard data:
// tasks completed, check-ins logged, streak maintained, average confidence.
// Numbers don't lie — they combat the narrative of "I'm not doing enough."

import { Shield } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

export default function ImpostorKiller() {
  const { get } = useStorage()
  const core = get('core') || {}
  const feelings = get('feelings') || []

  const tasksCompleted = (core.completedTasks || []).length
  const totalCheckIns = feelings.length
  const streak = core.streak || 0

  const avgConfidence = feelings.length > 0
    ? (feelings.reduce((sum, f) => sum + (f.confidence || 0), 0) / feelings.length).toFixed(1)
    : '—'

  const stats = [
    { label: 'TASKS', value: tasksCompleted, color: '#00b4d8' },
    { label: 'CHECK-INS', value: totalCheckIns, color: '#00b4d8' },
    { label: 'STREAK', value: `${streak}d`, color: '#d4a853' },
    { label: 'AVG CONF', value: avgConfidence, color: '#d4a853' },
  ]

  return (
    <div className="glass-card p-4 border-gold/20" style={{ borderColor: '#d4a85330' }}>
      <div className="hud-panel-inner">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-gold" />
          <h3 className="font-display text-sm font-bold text-gold tracking-wider uppercase gold-heading">
            Impostor Killer
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="font-display text-2xl font-bold" style={{ color }}>
                {value}
              </div>
              <div className="font-mono text-[9px] text-text-muted tracking-widest">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
