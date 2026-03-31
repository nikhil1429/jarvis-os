// SecondBrain.jsx — Searchable knowledge base across all localStorage sources
// WHY: Nikhil captures insights via voice ("capture X"), builds logs, journals.
// This component lets him FIND them later. Pure localStorage search, no API.

import { useState, useMemo } from 'react'
import { Search, Plus, Lightbulb, BookOpen, Hammer, PenLine } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'captures', label: 'Captures', icon: Lightbulb },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'builds', label: 'Build Logs', icon: Hammer },
  { id: 'journal', label: 'Journal', icon: PenLine },
]

const SOURCE_STYLES = {
  captures: { bg: 'bg-cyan/10', text: 'text-cyan', label: 'Capture' },
  knowledge: { bg: 'bg-gold/10', text: 'text-gold', label: 'Knowledge' },
  builds: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Build' },
  journal: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Journal' },
}

export default function SecondBrain() {
  const { get, update } = useStorage()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')

  // Collect all entries from all sources
  const allEntries = useMemo(() => {
    const entries = []

    ;(get('quick-capture') || []).forEach(c => {
      entries.push({ text: c.text, date: c.timestamp || c.date, source: 'captures' })
    })
    ;(get('knowledge') || []).forEach(k => {
      entries.push({ text: k.text || k.content, date: k.timestamp || k.date, source: 'knowledge' })
    })
    ;(get('daily-build') || []).forEach(b => {
      entries.push({ text: b.text, date: b.timestamp || b.date, source: 'builds' })
    })
    ;(get('journal') || []).forEach(j => {
      entries.push({ text: j.text || j.content || j.entry, date: j.timestamp || j.date, source: 'journal' })
    })

    return entries.filter(e => e.text).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [get])

  // Filter + search
  const results = useMemo(() => {
    let filtered = allEntries
    if (filter !== 'all') filtered = filtered.filter(e => e.source === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      filtered = filtered.filter(e => e.text.toLowerCase().includes(q))
    }
    return filtered.slice(0, 20)
  }, [allEntries, filter, query])

  const handleAddKnowledge = () => {
    if (!newText.trim()) return
    update('knowledge', prev => [
      ...(prev || []),
      { text: newText.trim(), timestamp: new Date().toISOString(), source: 'manual' }
    ])
    setNewText('')
    setAdding(false)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase neon-heading">Second Brain</h3>
        <button onClick={() => setAdding(!adding)}
          className="font-mono text-[10px] text-text-muted hover:text-cyan transition-colors flex items-center gap-1">
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Add knowledge input */}
      {adding && (
        <div className="flex gap-2 mb-3">
          <input type="text" value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddKnowledge()}
            placeholder="Add knowledge entry..."
            className="flex-1 bg-void border border-border rounded-lg px-3 py-2 font-body text-xs text-text
              placeholder:text-text-muted focus:outline-none focus:border-cyan"
            autoFocus />
          <button onClick={handleAddKnowledge} disabled={!newText.trim()}
            className="px-3 py-2 rounded-lg border border-cyan/40 text-cyan text-xs
              hover:bg-cyan/10 disabled:opacity-30">Save</button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-2">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search captures, knowledge, builds..."
          className="w-full bg-void border border-border rounded-lg pl-8 pr-3 py-2 font-body text-xs text-text
            placeholder:text-text-muted focus:outline-none focus:border-cyan" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
              filter === f.id ? 'border-cyan/60 bg-cyan/15 text-cyan' : 'border-border text-text-muted hover:border-cyan/30'
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.length === 0 ? (
          <p className="font-body text-xs text-text-muted text-center py-4">
            {query ? 'No results found' : 'No entries yet. Say "capture [text]" to start.'}
          </p>
        ) : results.map((entry, i) => {
          const style = SOURCE_STYLES[entry.source]
          return (
            <div key={i} className="glass-card p-2.5 border border-border">
              <p className="font-body text-xs text-text line-clamp-2 leading-relaxed">{entry.text}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <span className="font-mono text-[8px] text-text-muted">
                  {entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="font-mono text-[8px] text-text-muted mt-2 text-center">
        {allEntries.length} total entries across all sources
      </p>
    </div>
  )
}
