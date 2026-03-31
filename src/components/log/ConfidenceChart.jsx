// ConfidenceChart.jsx — Recharts bar chart showing last 7 days confidence
// WHY: Visual proof of consistency. Seeing 7 green bars in a row is motivating.
// Seeing gaps is a wake-up call. The chart uses cyan bars with gold highlight
// for today's entry. Data comes from jos-feelings.

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import useStorage from '../../hooks/useStorage.js'

export default function ConfidenceChart() {
  const { get } = useStorage()

  const data = useMemo(() => {
    const feelings = get('feelings') || []
    const today = new Date()
    const days = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const entry = feelings.find(f => f.date === dateStr)

      days.push({
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2),
        confidence: entry?.confidence || 0,
        isToday: i === 0,
        date: dateStr,
      })
    }
    return days
  }, [get])

  const hasData = data.some(d => d.confidence > 0)

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase neon-heading mb-3">
          Confidence — Last 7 Days
        </h3>

        {!hasData ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-mono text-[10px] text-text-muted tracking-wider">
              COMPLETE CHECK-INS TO SEE DATA
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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
                ticks={[1, 2, 3, 4, 5]}
              />
              <Bar dataKey="confidence" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isToday ? '#d4a853' : '#00b4d8'}
                    fillOpacity={entry.confidence > 0 ? 0.8 : 0.1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
