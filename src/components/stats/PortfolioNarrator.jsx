// PortfolioNarrator.jsx — STAR interview answer generator from completed tasks
// WHY: Bible Section 20.2. Each completed task becomes a STAR interview answer
// in 3 lengths (30s/2min/5min). Practice → Interview Sim. Export → PDF.

import { useState, useMemo } from 'react'
import { FileText, Zap, ExternalLink, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import TASKS from '../../data/tasks.js'

const FILTERS = ['All', 'Technical', 'Design', 'Failure', 'Scale']
const DURATIONS = ['30s', '2min', '5min']

export default function PortfolioNarrator() {
  const { sendMessage, isStreaming } = useAI()
  const { get, update } = useStorage()
  const [filter, setFilter] = useState('All')
  const [generating, setGenerating] = useState(null) // taskId being generated
  const [activeDuration, setActiveDuration] = useState({}) // taskId → duration tab

  const core = get('core') || {}
  const completed = core.completedTasks || []
  const interviews = get('interviews') || []

  const completedTasks = useMemo(() => {
    return TASKS.filter(t => completed.includes(t.id))
  }, [completed])

  const handleGenerate = async (task) => {
    setGenerating(task.id)
    try {
      const prompt = `Generate 3 STAR (Situation-Task-Action-Result) interview answers for this task:
Task: "${task.name}" (from a FinOps AI compliance tool project)

Generate answers in 3 lengths:
1. BRIEF (30 seconds, 3-4 sentences)
2. STANDARD (2 minutes, 8-10 sentences)
3. DETAILED (5 minutes, full story with technical depth)

Format as:
[30s] answer text here
[2min] answer text here
[5min] answer text here

Each should cover Situation, Task, Action, Result. First person. Specific technical details.`

      const result = await sendMessage(prompt, 'weakness-radar', {})
      if (result?.text) {
        // Parse the 3 variants
        const variants = []
        const text = result.text
        const m30 = text.match(/\[30s\]\s*([\s\S]*?)(?=\[2min\]|$)/i)
        const m2 = text.match(/\[2min\]\s*([\s\S]*?)(?=\[5min\]|$)/i)
        const m5 = text.match(/\[5min\]\s*([\s\S]*?)$/i)

        if (m30) variants.push({ duration: '30s', answer: m30[1].trim() })
        if (m2) variants.push({ duration: '2min', answer: m2[1].trim() })
        if (m5) variants.push({ duration: '5min', answer: m5[1].trim() })

        // If parsing failed, save the full text as one variant
        if (variants.length === 0) variants.push({ duration: 'full', answer: text })

        const entry = { taskId: task.id, taskName: task.name, variants, generatedAt: new Date().toISOString() }
        update('interviews', prev => [...(prev || []).filter(i => i.taskId !== task.id), entry])
      }
    } catch (err) {
      console.error('[PortfolioNarrator] Generation failed:', err)
    }
    setGenerating(null)
  }

  const getExisting = (taskId) => interviews.find(i => i.taskId === taskId)

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('JARVIS OS — Interview Answers', 20, 20)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Generated ${new Date().toLocaleDateString('en-IN')} · ${interviews.length} answers`, 20, 28)
    doc.setTextColor(0)
    let y = 38
    interviews.forEach((item, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.text(`${i + 1}. ${item.taskName || 'Task'}`, 20, y)
      y += 7
      doc.setFontSize(9)
      const answer = item.variants?.[0]?.answer || ''
      const lines = doc.splitTextToSize(answer, 170)
      doc.text(lines, 20, y)
      y += lines.length * 5 + 10
    })
    doc.save('jarvis-interview-answers.pdf')
  }

  if (completedTasks.length === 0) {
    return (
      <div className="glass-card p-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-gold" />
          <span className="font-display text-sm font-bold text-gold tracking-wider gold-heading">PORTFOLIO NARRATOR</span>
        </div>
        <p className="font-body text-xs text-text-dim">Complete tasks to generate STAR interview answers.</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gold" />
          <h3 className="font-display text-sm font-bold text-gold tracking-wider uppercase gold-heading">Portfolio Narrator</h3>
        </div>
        <div className="flex items-center gap-2">
          {interviews.length > 0 && (
            <button onClick={exportPDF}
              className="font-mono text-[9px] px-2 py-1 rounded border border-gold/30 text-gold hover:bg-gold/10 transition-all flex items-center gap-1">
              <Download size={10} /> PDF
            </button>
          )}
          <span className="font-mono text-[10px] text-text-muted">{completedTasks.length} tasks · {interviews.length} generated</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
              filter === f ? 'border-gold/60 bg-gold/15 text-gold' : 'border-border text-text-muted hover:border-gold/30'
            }`}>{f}</button>
        ))}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {completedTasks.slice(0, 15).map((task, idx) => {
          const existing = getExisting(task.id)
          const dur = activeDuration[task.id] || '30s'

          return (
            <div key={task.id} className="glass-card p-3 card-enter" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-xs font-bold text-text truncate flex-1">{task.name}</p>
                {!existing && (
                  <button onClick={() => handleGenerate(task)}
                    disabled={generating === task.id || isStreaming}
                    className="font-mono text-[9px] px-2 py-1 rounded border border-gold/40 text-gold hover:bg-gold/10 transition-all disabled:opacity-30 ml-2 whitespace-nowrap">
                    {generating === task.id ? <Zap size={10} className="inline animate-pulse" /> : 'GENERATE STAR'}
                  </button>
                )}
              </div>

              {existing && (
                <>
                  {/* Duration tabs */}
                  <div className="flex gap-1 mb-2">
                    {DURATIONS.map(d => {
                      const has = existing.variants.find(v => v.duration === d)
                      return (
                        <button key={d} onClick={() => setActiveDuration(prev => ({ ...prev, [task.id]: d }))}
                          disabled={!has}
                          className={`font-mono text-[9px] px-2 py-0.5 rounded border transition-all ${
                            dur === d ? 'border-cyan/60 bg-cyan/15 text-cyan' : 'border-border text-text-muted'
                          } disabled:opacity-20`}>{d}</button>
                      )
                    })}
                  </div>
                  {/* Answer text */}
                  {existing.variants.find(v => v.duration === dur)?.answer && (
                    <p className="font-body text-[11px] text-text-dim leading-relaxed">
                      {existing.variants.find(v => v.duration === dur).answer}
                    </p>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
