// FocusMode.jsx — "JARVIS, three hours. Module 1. Nothing else."
import { useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import TASKS from '../data/tasks.js'

export default function FocusMode({ target, duration, completedTasks, onToggleTask, onEnd }) {
  const [remaining, setRemaining] = useState(duration * 60)
  const [breakRequest, setBreakRequest] = useState(false)
  const startTime = useRef(Date.now())

  const focusTasks = TASKS.filter(t => {
    if (typeof target === 'number') return t.week === target
    return t.name.toLowerCase().includes(target.toLowerCase())
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000)
      const left = Math.max(0, duration * 60 - elapsed)
      setRemaining(left)
      if (left === 0) onEnd?.()
    }, 1000)
    return () => clearInterval(interval)
  }, [duration, onEnd])

  const fmt = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020a13' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(0,180,216,0.08)' }}>
        <div className="w-3 h-3 rounded-full" style={{ background: '#00b4d8', animation: 'breathe 3s ease-in-out infinite' }} />
        <span className="font-mono text-lg tracking-widest" style={{ color: '#00b4d8' }}>{fmt(remaining)}</span>
        <button onClick={() => setBreakRequest(true)} className="font-mono text-[9px] text-text-muted border border-border px-2 py-1 rounded">END</button>
      </div>

      <div className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
        <p className="font-display text-sm font-bold text-cyan tracking-wider uppercase mb-6">
          {typeof target === 'number' ? `WEEK ${target}` : target.toUpperCase()}
        </p>
        <div className="space-y-3">
          {focusTasks.map(task => {
            const done = (completedTasks || []).includes(task.id)
            return (
              <div key={task.id} className={`flex items-center gap-3 transition-all duration-300 ${done ? 'opacity-50' : ''}`}>
                <button onClick={() => onToggleTask(task.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${done ? 'bg-cyan/20 border-cyan' : 'border-border hover:border-cyan/40'}`}>
                  {done && <Check size={12} className="text-cyan" />}
                </button>
                <span className={`font-body text-sm ${done ? 'text-text-dim line-through decoration-cyan/30' : 'text-text'}`}>{task.name}</span>
              </div>
            )
          })}
        </div>
        <p className="font-mono text-[9px] text-text-muted text-center mt-12" style={{ opacity: 0.4 }}>JARVIS is guarding your focus</p>
      </div>

      {breakRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,10,19,0.9)' }}>
          <div className="glass-card p-5 max-w-sm mx-4 text-center">
            <p className="font-body text-sm text-text mb-1">Focus lock active.</p>
            <p className="font-mono text-xs text-text-muted mb-4">{fmt(remaining)} remaining.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setBreakRequest(false)}
                className="font-mono text-[10px] text-cyan border border-cyan/40 px-4 py-2 rounded hover:bg-cyan/10">STAY FOCUSED</button>
              <button onClick={() => onEnd?.()}
                className="font-mono text-[10px] text-text-muted border border-border px-4 py-2 rounded">BREAK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
