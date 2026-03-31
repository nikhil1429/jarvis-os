// DailyBuildLog.jsx — "What I Built Today" text input
// WHY: Daily build logs create a tangible record of progress. On low-confidence days,
// Nikhil can scroll back and see proof of what he shipped. Each entry saves to
// jos-daily-build with a date and text. Simple text input, not a full editor —
// friction kills journaling habits.

import { useState } from 'react'
import { PenLine, Check } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

export default function DailyBuildLog() {
  const { get, update } = useStorage()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  // Check if there's already an entry for today
  const today = new Date().toISOString().split('T')[0]
  const logs = get('daily-build') || []
  const todayLog = logs.find(l => l.date === today)

  const handleSave = () => {
    if (!text.trim()) return

    update('daily-build', prev => {
      const existing = prev || []
      const filtered = existing.filter(l => l.date !== today)
      return [...filtered, { date: today, text: text.trim(), timestamp: new Date().toISOString() }]
    })

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="hud-panel rounded-lg p-4">
      <div className="hud-panel-inner">
        <div className="flex items-center gap-2 mb-3">
          <PenLine size={18} className="text-cyan" />
          <h3 className="font-display text-lg font-bold text-cyan tracking-wider uppercase">
            What I Built Today
          </h3>
        </div>

        {todayLog && !text ? (
          <div className="bg-void/50 rounded p-3 mb-3">
            <p className="font-body text-sm text-text">{todayLog.text}</p>
            <p className="font-mono text-[10px] text-text-muted mt-2">
              LOGGED {new Date(todayLog.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ) : null}

        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder={todayLog ? 'Update today\'s log...' : 'What did you build today?'}
            className="flex-1 bg-void border border-border rounded px-3 py-2 font-body text-sm
              text-text placeholder:text-text-muted focus:outline-none focus:border-cyan
              transition-colors duration-200"
          />
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className={`
              px-3 py-2 rounded border transition-all duration-200
              ${saved
                ? 'bg-cyan/10 border-cyan text-cyan'
                : text.trim()
                  ? 'bg-card border-cyan/40 text-cyan hover:bg-cyan/10'
                  : 'bg-card border-border text-text-muted cursor-not-allowed'
              }
            `}
          >
            {saved ? <Check size={18} /> : <PenLine size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
