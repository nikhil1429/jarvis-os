// DnaTab.jsx — Concept DNA Tracker (Tab 4) with search, filters, spaced repetition
// WHY: The DNA tab is the knowledge graph. 35 concepts with strength tracking,
// spaced repetition alerts, and category filtering. Overdue concepts sort to top
// so Nikhil reviews them first. Search + filter pills let him find concepts fast.

import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import CONCEPTS from '../../data/concepts.js'
import ConceptCard from './ConceptCard.jsx'
import useStorage from '../../hooks/useStorage.js'
import { getReviewSchedule } from '../../utils/spacedRepetition.js'

const CATEGORIES = ['All', 'Core', 'Advanced', 'Month2', 'Discuss']

// WHY: Category pill colors match ConceptCard badges
const CATEGORY_COLORS = {
  All: 'cyan',
  Core: 'cyan',
  Advanced: 'gold',
  Month2: 'amber',
  Discuss: 'dim',
}

export default function DnaTab() {
  const { get, update } = useStorage()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  // Load saved concept data from localStorage
  const savedConcepts = get('concepts') || []

  // Merge static concept data with saved user data
  const getSavedData = useCallback((conceptId) => {
    return savedConcepts.find(c => c.id === conceptId) || null
  }, [savedConcepts])

  // Handle concept update — merge into jos-concepts
  const handleUpdate = useCallback((conceptId, updates) => {
    update('concepts', prev => {
      const existing = prev || []
      const idx = existing.findIndex(c => c.id === conceptId)
      const updated = {
        id: conceptId,
        ...(idx >= 0 ? existing[idx] : {}),
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      if (idx >= 0) {
        const copy = [...existing]
        copy[idx] = updated
        return copy
      }
      return [...existing, updated]
    })
  }, [update])

  // Filter and sort concepts
  const filteredConcepts = useMemo(() => {
    let filtered = CONCEPTS

    // Category filter
    if (activeCategory !== 'All') {
      filtered = filtered.filter(c => c.category === activeCategory)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    }

    // Sort: overdue first, then by category order, then by name
    return [...filtered].sort((a, b) => {
      const aData = getSavedData(a.id)
      const bData = getSavedData(b.id)
      const aReview = getReviewSchedule(aData || a)
      const bReview = getReviewSchedule(bData || b)

      // Overdue first
      if (aReview.isOverdue && !bReview.isOverdue) return -1
      if (!aReview.isOverdue && bReview.isOverdue) return 1

      // Within overdue, sort by urgency (critical > high > medium)
      if (aReview.isOverdue && bReview.isOverdue) {
        const urgencyOrder = { critical: 0, high: 1, medium: 2 }
        return (urgencyOrder[aReview.urgency] || 3) - (urgencyOrder[bReview.urgency] || 3)
      }

      return 0
    })
  }, [activeCategory, search, getSavedData])

  // Count overdue concepts
  const overdueCount = useMemo(() => {
    return CONCEPTS.filter(c => {
      const saved = getSavedData(c.id)
      return getReviewSchedule(saved || c).isOverdue
    }).length
  }, [getSavedData])

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts = { All: CONCEPTS.length }
    CATEGORIES.slice(1).forEach(cat => {
      counts[cat] = CONCEPTS.filter(c => c.category === cat).length
    })
    return counts
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold text-cyan tracking-wider uppercase">
          Concept DNA
        </h2>
        {overdueCount > 0 && (
          <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30
            px-2 py-0.5 rounded tracking-wider">
            {overdueCount} REVIEW DUE
          </span>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search concepts..."
          className="w-full bg-void border border-border rounded-lg pl-9 pr-4 py-2
            font-body text-sm text-text placeholder:text-text-muted
            focus:outline-none focus:border-cyan transition-colors"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded font-mono text-xs tracking-wider
                transition-all duration-200 border ${
                isActive
                  ? 'bg-cyan/10 border-cyan text-cyan'
                  : 'bg-card border-border text-text-dim hover:border-cyan/30'
              }`}
            >
              {cat}
              <span className="ml-1.5 text-[10px] opacity-60">{categoryCounts[cat]}</span>
            </button>
          )
        })}
      </div>

      {/* Concept cards */}
      <div className="space-y-2">
        {filteredConcepts.map(concept => (
          <ConceptCard
            key={concept.id}
            concept={concept}
            savedData={getSavedData(concept.id)}
            onUpdate={handleUpdate}
          />
        ))}

        {filteredConcepts.length === 0 && (
          <div className="text-center py-8">
            <p className="font-mono text-xs text-text-muted tracking-wider">
              NO CONCEPTS MATCH YOUR SEARCH
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
