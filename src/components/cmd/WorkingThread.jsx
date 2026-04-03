// WorkingThread.jsx — Today-only working memory thread
// WHY: ADHD working memory dumps constantly. This is today's running scratch pad.

import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

export default function WorkingThread() {
  const [items, setItems] = useState([])
  const [input, setInput] = useState('')
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('jos-thread') || '{}')
      if (data.date === today) setItems(data.items || [])
      else setItems([]) // Reset on new day
    } catch { setItems([]) }

    const h = () => {
      try {
        const data = JSON.parse(localStorage.getItem('jos-thread') || '{}')
        if (data.date === today) setItems(data.items || [])
      } catch { /* ok */ }
    }
    window.addEventListener('jarvis-thread-updated', h)
    return () => window.removeEventListener('jarvis-thread-updated', h)
  }, [today])

  const save = (newItems) => {
    setItems(newItems)
    try {
      localStorage.setItem('jos-thread', JSON.stringify({ date: today, items: newItems }))
    } catch { /* ok */ }
  }

  const addItem = () => {
    if (!input.trim()) return
    save([...items, { text: input.trim(), addedAt: new Date().toISOString() }].slice(-10))
    setInput('')
  }

  const removeItem = (idx) => save(items.filter((_, i) => i !== idx))

  if (items.length === 0 && !input) {
    return (
      <div className="glass-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-text-muted tracking-wider">TODAY'S THREAD</span>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Note for today..."
            className="flex-1 bg-transparent border-none font-body text-xs text-text placeholder:text-text-muted focus:outline-none" />
          <button onClick={addItem} disabled={!input.trim()} className="text-text-muted hover:text-cyan disabled:opacity-30">
            <Plus size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card px-3 py-2">
      <span className="font-mono text-[9px] text-text-muted tracking-wider block mb-1.5">TODAY'S THREAD</span>
      <div className="space-y-1 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <span className="font-mono text-[9px] text-cyan mt-0.5">—</span>
            <span className="font-body text-xs text-text-dim flex-1 leading-relaxed">{item.text}</span>
            <button onClick={() => removeItem(i)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all">
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="+ add..."
          className="flex-1 bg-transparent border-none font-body text-[11px] text-text placeholder:text-text-muted focus:outline-none" />
        <button onClick={addItem} disabled={!input.trim()} className="text-text-muted hover:text-cyan disabled:opacity-30">
          <Plus size={10} />
        </button>
      </div>
    </div>
  )
}
