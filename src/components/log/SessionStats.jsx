// SessionStats.jsx — Session timer summary card
// WHY: Shows total focused time today, this week, and all-time.
// Validates that Nikhil is putting in the hours. Data from jos-session-timer
// and the live useSessionTimer hook for today's active session.

import { Clock } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

function formatHM(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function SessionStats({ elapsed }) {
  const { get } = useStorage()
  const sessionData = get('session-timer') || {}
  const today = new Date().toISOString().split('T')[0]

  // Today's logged minutes + current live session
  const todayLogged = sessionData.date === today ? (sessionData.totalMinutes || 0) : 0
  const todayLive = Math.floor((elapsed || 0) / 60)
  const todayTotal = todayLogged + todayLive

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-cyan" />
          <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase">
            Session Time
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-cyan">
              {formatHM(todayTotal)}
            </div>
            <div className="font-mono text-[9px] text-text-muted tracking-widest">TODAY</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-text-dim">
              {formatHM(todayLogged)}
            </div>
            <div className="font-mono text-[9px] text-text-muted tracking-widest">LOGGED</div>
          </div>
        </div>
      </div>
    </div>
  )
}
