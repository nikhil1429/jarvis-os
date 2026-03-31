// NikhilVsNikhil.jsx — This week vs last week comparison card
// WHY: The only fair comparison is Nikhil vs himself. This card shows
// tasks, confidence, and training messages for both weeks with directional
// arrows (↑ improved, ↓ declined, → same). Motivates by showing trajectory.

import { useMemo } from 'react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

export default function NikhilVsNikhil() {
  const { get } = useStorage()

  const comparison = useMemo(() => {
    const feelings = get('feelings') || []
    const core = get('core') || {}
    const today = new Date()
    const dayOfWeek = today.getDay()

    // This week's date range (Sun-Sat)
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - dayOfWeek)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const inRange = (dateStr, start, days) => {
      const d = new Date(dateStr)
      const end = new Date(start)
      end.setDate(end.getDate() + days)
      return d >= start && d < end
    }

    const thisWeekFeelings = feelings.filter(f => inRange(f.date, thisWeekStart, 7))
    const lastWeekFeelings = feelings.filter(f => inRange(f.date, lastWeekStart, 7))

    const avgConf = arr => arr.length > 0
      ? arr.reduce((s, f) => s + (f.confidence || 0), 0) / arr.length
      : 0

    // Count training messages this week vs last
    const allMsgKeys = Object.keys(localStorage).filter(k => k.startsWith('jos-msgs-'))
    let thisWeekMsgs = 0
    let lastWeekMsgs = 0
    allMsgKeys.forEach(key => {
      try {
        const msgs = JSON.parse(localStorage.getItem(key)) || []
        msgs.forEach(m => {
          if (m.timestamp) {
            if (inRange(m.timestamp.split('T')[0], thisWeekStart, 7)) thisWeekMsgs++
            if (inRange(m.timestamp.split('T')[0], lastWeekStart, 7)) lastWeekMsgs++
          }
        })
      } catch { /* skip corrupted */ }
    })

    return [
      {
        label: 'CHECK-INS',
        thisWeek: thisWeekFeelings.length,
        lastWeek: lastWeekFeelings.length,
      },
      {
        label: 'AVG CONF',
        thisWeek: +avgConf(thisWeekFeelings).toFixed(1),
        lastWeek: +avgConf(lastWeekFeelings).toFixed(1),
      },
      {
        label: 'MESSAGES',
        thisWeek: thisWeekMsgs,
        lastWeek: lastWeekMsgs,
      },
    ]
  }, [get])

  const getArrow = (thisVal, lastVal) => {
    if (thisVal > lastVal) return <ArrowUp size={14} className="text-green-400" />
    if (thisVal < lastVal) return <ArrowDown size={14} className="text-red-400" />
    return <Minus size={14} className="text-text-muted" />
  }

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase mb-3">
          Nikhil vs Nikhil
        </h3>

        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center text-text-muted font-mono text-[9px] tracking-widest">
            <span className="flex-1">METRIC</span>
            <span className="w-14 text-center">LAST</span>
            <span className="w-6" />
            <span className="w-14 text-center">THIS</span>
          </div>

          {comparison.map(({ label, thisWeek, lastWeek }) => (
            <div key={label} className="flex items-center">
              <span className="flex-1 font-mono text-xs text-text-dim">{label}</span>
              <span className="w-14 text-center font-mono text-xs text-text-muted">{lastWeek}</span>
              <span className="w-6 flex justify-center">{getArrow(thisWeek, lastWeek)}</span>
              <span className="w-14 text-center font-mono text-xs text-text font-bold">{thisWeek}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
