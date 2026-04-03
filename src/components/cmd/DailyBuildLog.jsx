// DailyBuildLog.jsx — "What I Built Today" auto-populated feed + manual input
// WHY: Auto-capture shows tasks/modes/captures. Manual input for things done outside JARVIS.

import { useState, useEffect } from 'react'
import { PenLine, Check } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

function getAutoFeed() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const data = JSON.parse(localStorage.getItem('jos-auto-capture') || '{}')[today]
    if (!data) return []
    const feed = []
    ;(data.tasks || []).forEach(t => feed.push({ time: t.at, icon: '✅', text: `Task: ${t.taskId || 'completed'}` }))
    ;(data.modes || []).filter(m => m.endedAt).forEach(m => {
      const mins = Math.round((new Date(m.endedAt) - new Date(m.startedAt)) / 60000)
      feed.push({ time: m.startedAt, icon: '🎯', text: `${m.mode} mode — ${mins} min${m.messageCount ? `, ${m.messageCount} msgs` : ''}` })
    })
    ;(data.captures || []).forEach(c => feed.push({ time: c.at, icon: '📝', text: `"${c.text}"` }))
    ;(data.events || []).filter(e => e.type === 'achievement').forEach(e => feed.push({ time: e.at, icon: '🏆', text: `Achievement: ${e.detail}` }))
    return feed.sort((a, b) => new Date(a.time) - new Date(b.time))
  } catch { return [] }
}

export default function DailyBuildLog() {
  const { get, update } = useStorage()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const h = () => forceUpdate(n => n + 1)
    window.addEventListener('jarvis-buildlog-updated', h)
    window.addEventListener('jarvis-data-updated', h)
    return () => {
      window.removeEventListener('jarvis-buildlog-updated', h)
      window.removeEventListener('jarvis-data-updated', h)
    }
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const logs = get('daily-build') || []
  const todayLog = logs.find(l => l.date === today)
  const autoFeed = getAutoFeed()

  const handleSave = () => {
    if (!text.trim()) return
    update('daily-build', prev => {
      const existing = prev || []
      const filtered = existing.filter(l => l.date !== today)
      return [...filtered, { date: today, text: text.trim(), timestamp: new Date().toISOString() }]
    })
    setSaved(true)
    setText('')
    setTimeout(() => setSaved(false), 2000)
  }

  const formatTime = (ts) => {
    try { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
  }

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <div className="flex items-center gap-2 mb-3">
          <PenLine size={18} className="text-cyan" />
          <h3 className="font-display text-lg font-bold text-cyan tracking-wider uppercase neon-heading">
            What I Built Today
          </h3>
        </div>

        {/* Auto-captured activity feed */}
        {autoFeed.length > 0 && (
          <div className="mb-3 space-y-1 max-h-40 overflow-y-auto">
            {autoFeed.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-mono text-[9px] text-text-muted w-12 flex-shrink-0">{formatTime(item.time)}</span>
                <span className="text-xs">{item.icon}</span>
                <span className="font-body text-xs text-text-dim leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Manual log entry */}
        {todayLog && !text ? (
          <div className="bg-void/50 rounded p-3 mb-3">
            <p className="font-body text-sm text-text">{todayLog.text}</p>
            <p className="font-mono text-[10px] text-text-muted mt-2">
              LOGGED {new Date(todayLog.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ) : null}

        <div className="flex gap-2">
          <input type="text" value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder={todayLog ? 'Add more...' : 'What did you build today?'}
            className="flex-1 bg-void border border-border rounded px-3 py-2 font-body text-sm
              text-text placeholder:text-text-muted focus:outline-none focus:border-cyan transition-colors" />
          <button onClick={handleSave} disabled={!text.trim()}
            className={`px-3 py-2 rounded border transition-all ${
              saved ? 'bg-cyan/10 border-cyan text-cyan'
                : text.trim() ? 'bg-card border-cyan/40 text-cyan hover:bg-cyan/10'
                : 'bg-card border-border text-text-muted cursor-not-allowed'
            }`}>
            {saved ? <Check size={18} /> : <PenLine size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
