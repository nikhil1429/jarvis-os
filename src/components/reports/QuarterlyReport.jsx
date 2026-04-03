// QuarterlyReport.jsx — The Nikhil Panwar Report (Opus, gold theme, cinematic)
// WHY: Bible Section 20.2. Crown jewel intelligence report with 7 sections.

import { useState, useEffect, useRef } from 'react'
import { X, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import useAI from '../../hooks/useAI.js'
import { compileSummary } from '../../utils/strategicCompiler.js'
import { speakWithFallback } from '../../utils/elevenLabsSpeak.js'

export default function QuarterlyReport({ onClose }) {
  const { sendMessage, isStreaming } = useAI()
  const [sections, setSections] = useState([])
  const [rawText, setRawText] = useState('')
  const [generating, setGenerating] = useState(true)
  const [visibleSections, setVisibleSections] = useState(new Set())
  const sectionRefs = useRef([])

  useEffect(() => { generateReport() }, [])

  // IntersectionObserver for scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisibleSections(prev => new Set([...prev, e.target.dataset.idx]))
      })
    }, { threshold: 0.2 })
    sectionRefs.current.forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [sections])

  const generateReport = async () => {
    try {
      const summary = compileSummary()
      const prompt = `You are generating "The Nikhil Panwar Report" — a quarterly intelligence briefing.
Analyse ALL provided data and generate 7 sections:
1. THE ARC — Hero stats summary
2. CONCEPT EVOLUTION — Which concepts grew most, which stagnated
3. BATTLE STATS — Training mode usage breakdown
4. PATTERN DISCOVERIES — 3-5 non-obvious patterns (tag as NEW or PERSISTENT)
5. SELF-KNOWLEDGE LESSONS — 3 things about how Nikhil learns best
6. BLIND SPOTS & SUPERPOWERS — What he avoids vs excels at
7. TRAJECTORY — Predictions, top 3 priorities, closing JARVIS quote

Data: ${summary}

JARVIS voice. Formal, data-driven. Under 600 words. Section headers in CAPS. No markdown.`

      const result = await sendMessage(prompt, 'weakness-radar', {})
      if (result?.text) {
        setRawText(result.text)
        // Parse sections by CAPS headers
        const parts = result.text.split(/\n(?=[A-Z ]{5,})/g).filter(p => p.trim())
        setSections(parts.map(p => {
          const lines = p.trim().split('\n')
          return { title: lines[0], body: lines.slice(1).join('\n').trim() }
        }))
        // Speak first section
        const firstPara = result.text.split('\n\n')[0]
        if (firstPara) speakWithFallback(firstPara)
        // Save
        try {
          const weekly = JSON.parse(localStorage.getItem('jos-weekly') || '{}')
          weekly.quarterlyReport = { text: result.text, generatedAt: new Date().toISOString() }
          localStorage.setItem('jos-weekly', JSON.stringify(weekly))
        } catch { /* ok */ }
      }
    } catch (err) { console.error('[Report]', err) }
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(2,10,19,0.98)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.4em] text-gold/50 mb-2">CLASSIFICATION: EYES ONLY</p>
            <h1 className="font-display text-2xl font-bold tracking-wider gold-heading" style={{ color: '#d4a853' }}>
              THE NIKHIL PANWAR REPORT
            </h1>
            <p className="font-mono text-[10px] text-text-muted mt-1">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            {rawText && (
              <button onClick={() => {
                const doc = new jsPDF()
                doc.setFontSize(14)
                doc.text('THE NIKHIL PANWAR REPORT', 20, 20)
                doc.setFontSize(9)
                doc.setTextColor(120)
                doc.text(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 20, 28)
                doc.setTextColor(0)
                doc.setFontSize(10)
                const lines = doc.splitTextToSize(rawText, 170)
                let y = 38
                lines.forEach(line => {
                  if (y > 280) { doc.addPage(); y = 20 }
                  doc.text(line, 20, y)
                  y += 5
                })
                doc.save('jarvis-quarterly-report.pdf')
              }} className="text-gold hover:text-gold/80 p-2 transition-colors" title="Save as PDF">
                <Download size={18} />
              </button>
            )}
            <button onClick={onClose} className="text-text-muted hover:text-text p-2"><X size={20} /></button>
          </div>
        </div>

        {generating ? (
          <div className="text-center py-20">
            <div className="flex gap-2 justify-center mb-4">
              <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="font-mono text-xs text-gold/60 tracking-wider">COMPILING INTELLIGENCE...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((sec, i) => (
              <div key={i} ref={el => sectionRefs.current[i] = el} data-idx={i}
                className={`glass-card-gold p-6 transition-all duration-700 ${
                  visibleSections.has(String(i)) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`} style={{ transitionDelay: `${i * 100}ms` }}>
                <h2 className="font-display text-sm font-bold tracking-[0.2em] gold-heading mb-3" style={{ color: '#d4a853' }}>
                  {sec.title}
                </h2>
                <p className="font-body text-sm text-text leading-relaxed whitespace-pre-wrap">{sec.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
