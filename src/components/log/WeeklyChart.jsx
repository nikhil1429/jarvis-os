// WeeklyChart.jsx — Recharts line chart comparing this week vs last week
// WHY: "Nikhil vs Nikhil" — the only fair comparison. Shows tasks completed,
// average confidence, and training messages for both weeks as overlaid lines.
// Cyan = this week, dim = last week. Visualizes momentum and consistency.

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import useStorage from '../../hooks/useStorage.js'

export default function WeeklyChart() {
  const { get } = useStorage()

  const data = useMemo(() => {
    const feelings = get('feelings') || []
    const today = new Date()
    const dayOfWeek = today.getDay() // 0=Sun
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    return days.map((label, i) => {
      // This week's date for this day-of-week
      const thisWeekDate = new Date(today)
      thisWeekDate.setDate(today.getDate() - dayOfWeek + i)
      const thisDateStr = thisWeekDate.toISOString().split('T')[0]

      // Last week's date for this day-of-week
      const lastWeekDate = new Date(thisWeekDate)
      lastWeekDate.setDate(lastWeekDate.getDate() - 7)
      const lastDateStr = lastWeekDate.toISOString().split('T')[0]

      const thisEntry = feelings.find(f => f.date === thisDateStr)
      const lastEntry = feelings.find(f => f.date === lastDateStr)

      return {
        day: label,
        thisWeek: thisEntry?.confidence || null,
        lastWeek: lastEntry?.confidence || null,
      }
    })
  }, [get])

  const hasData = data.some(d => d.thisWeek !== null || d.lastWeek !== null)

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase">
            Weekly Comparison
          </h3>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan rounded" />
              <span className="font-mono text-[9px] text-text-dim">THIS</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-text-muted rounded" />
              <span className="font-mono text-[9px] text-text-dim">LAST</span>
            </span>
          </div>
        </div>

        {!hasData ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-mono text-[10px] text-text-muted tracking-wider">
              NEED 2 WEEKS OF DATA
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: '#5a7a94', fontSize: 10, fontFamily: 'Share Tech Mono' }}
                axisLine={{ stroke: '#0d2137' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: '#5a7a94', fontSize: 10, fontFamily: 'Share Tech Mono' }}
                axisLine={false}
                tickLine={false}
                ticks={[1, 3, 5]}
              />
              <Tooltip
                contentStyle={{ background: '#061422', border: '1px solid #0d2137', borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: '#5a7a94', fontFamily: 'Share Tech Mono' }}
              />
              <Line
                type="monotone"
                dataKey="thisWeek"
                stroke="#00b4d8"
                strokeWidth={2}
                dot={{ fill: '#00b4d8', r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="lastWeek"
                stroke="#2a4a60"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ fill: '#2a4a60', r: 2 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
