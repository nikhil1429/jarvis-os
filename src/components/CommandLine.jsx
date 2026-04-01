// CommandLine.jsx — Terminal-style command interface (backtick toggles)
// WHY: Power user shortcut. Type commands instead of navigating UI.

import { useState, useRef, useEffect } from 'react'
import { getDayNumber, getWeekNumber } from '../utils/dateUtils.js'

const COMMANDS = {
  '/help': 'Show all commands',
  '/status': 'Show day, week, streak, energy, tasks',
  '/quiz [concept]': 'Start quiz on concept',
  '/mode [name]': 'Switch training mode',
  '/task [n] done': 'Mark task complete',
  '/capture [text]': 'Quick capture',
  '/energy [1-5]': 'Set energy level',
  '/battle': 'Start Battle Royale',
  '/phantom': 'Start Phantom Mode',
  '/report': 'Generate quarterly report',
  '/shutdown': 'Shutdown JARVIS',
  '/clear': 'Clear history',
}

export default function CommandLine({ onClose }) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const inputRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { endRef.current?.scrollIntoView() }, [history])

  const execute = (cmd) => {
    const parts = cmd.trim().split(/\s+/)
    const command = parts[0]?.toLowerCase()
    const args = parts.slice(1).join(' ')
    let output = ''

    if (command === '/help') {
      output = Object.entries(COMMANDS).map(([k, v]) => `  ${k.padEnd(22)} ${v}`).join('\n')
    } else if (command === '/status') {
      try {
        const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
        const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
        const mastered = concepts.filter(c => (c.strength || 0) >= 60).length
        output = `Day ${getDayNumber(core.startDate)} · Week ${getWeekNumber(core.startDate)} · Streak: ${core.streak || 0} · Energy: ${core.energy || 3}/5 · Tasks: ${(core.completedTasks || []).length} · Concepts: ${mastered}/${concepts.length} mastered`
      } catch { output = 'Error reading status' }
    } else if (command === '/energy') {
      const n = parseInt(args)
      if (n >= 1 && n <= 5) {
        try {
          const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
          core.energy = n
          localStorage.setItem('jos-core', JSON.stringify(core))
          window.dispatchEvent(new CustomEvent('jarvis-task-toggled'))
          output = `Energy set to ${n}`
        } catch { output = 'Error' }
      } else { output = 'Usage: /energy [1-5]' }
    } else if (command === '/capture') {
      if (args) {
        try {
          const caps = JSON.parse(localStorage.getItem('jos-quick-capture') || '[]')
          caps.push({ timestamp: new Date().toISOString(), text: args, category: 'cli' })
          localStorage.setItem('jos-quick-capture', JSON.stringify(caps))
          output = `Captured: "${args}"`
        } catch { output = 'Error' }
      } else { output = 'Usage: /capture [text]' }
    } else if (command === '/task') {
      const num = parseInt(args)
      if (num) {
        try {
          const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
          const completed = core.completedTasks || []
          if (completed.includes(num)) {
            core.completedTasks = completed.filter(id => id !== num)
            output = `Task ${num} unmarked`
          } else {
            core.completedTasks = [...completed, num]
            output = `Task ${num} marked complete`
          }
          localStorage.setItem('jos-core', JSON.stringify(core))
          window.dispatchEvent(new CustomEvent('jarvis-task-toggled'))
        } catch { output = 'Error' }
      } else { output = 'Usage: /task [n] done' }
    } else if (command === '/shutdown') {
      window.dispatchEvent(new CustomEvent('jarvis-request-shutdown'))
      output = 'Initiating shutdown...'
      setTimeout(() => onClose(), 500)
    } else if (command === '/clear') {
      setHistory([]); return
    } else if (command === '/battle') {
      window.dispatchEvent(new CustomEvent('jarvis-open-battle-royale'))
      output = 'Opening Battle Royale...'
      setTimeout(() => onClose(), 300)
    } else if (command === '/phantom') {
      window.dispatchEvent(new CustomEvent('jarvis-open-phantom'))
      output = 'Opening Phantom Mode...'
      setTimeout(() => onClose(), 300)
    } else if (command === '/report') {
      window.dispatchEvent(new CustomEvent('jarvis-open-report'))
      output = 'Opening Quarterly Report...'
      setTimeout(() => onClose(), 300)
    } else {
      output = `Unknown command: ${command}. Type /help for list.`
    }

    setHistory(prev => [...prev, { cmd, output }])
    setInput('')
    setHistoryIdx(-1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { execute(input); return }
    if (e.key === '`') { e.preventDefault(); onClose(); return }
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowUp') {
      const cmds = history.map(h => h.cmd)
      if (cmds.length > 0) {
        const idx = historyIdx < 0 ? cmds.length - 1 : Math.max(0, historyIdx - 1)
        setHistoryIdx(idx); setInput(cmds[idx])
      }
    }
    if (e.key === 'ArrowDown') {
      const cmds = history.map(h => h.cmd)
      if (historyIdx >= 0) {
        const idx = historyIdx + 1
        if (idx >= cmds.length) { setHistoryIdx(-1); setInput('') }
        else { setHistoryIdx(idx); setInput(cmds[idx]) }
      }
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[999]" style={{
      background: 'rgba(1,6,12,0.95)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0,240,255,0.1)', maxHeight: '50vh',
    }}>
      <div className="max-w-2xl mx-auto px-4 py-3">
        {/* History */}
        <div className="overflow-y-auto" style={{ maxHeight: '35vh' }}>
          {history.map((h, i) => (
            <div key={i} className="mb-2">
              <p className="font-mono text-xs" style={{ color: '#22c55e' }}>❯ {h.cmd}</p>
              {h.output && <pre className="font-mono text-[11px] text-text-dim whitespace-pre-wrap ml-3 mt-0.5">{h.output}</pre>}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {/* Input */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: '#22c55e' }}>❯</span>
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="/help for commands"
            className="flex-1 bg-transparent font-mono text-xs text-text placeholder:text-text-muted focus:outline-none"
            style={{ caretColor: '#22c55e' }} />
        </div>
      </div>
    </div>
  )
}
