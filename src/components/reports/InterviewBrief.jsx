// InterviewBrief.jsx — Pre-Interview Intelligence Brief (Opus, cyan theme)
// WHY: Bible Section 20.2. Maps Nikhil's strengths to specific role requirements.

import { useState } from 'react'
import { X } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import { compileSummary } from '../../utils/strategicCompiler.js'
import { speakElevenLabs } from '../../utils/elevenLabsSpeak.js'

export default function InterviewBrief({ onClose }) {
  const { sendMessage } = useAI()
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [sections, setSections] = useState([])
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = async () => {
    if (!company.trim() || !role.trim()) return
    setGenerating(true)
    try {
      const summary = compileSummary()
      const prompt = `Generate a Pre-Interview Intelligence Brief for Nikhil Panwar.
Company: ${company}. Role: ${role}.
Data: ${summary}

5 sections:
1. TARGET ANALYSIS — Role requirements mapped to concept strengths
2. WEAPON SELECTION — Top strongest points from completed tasks
3. PREDICTED QUESTIONS — 8 likely questions + strategy
4. TALKING POINTS — 5 data-backed points to reference
5. CONFIDENCE ASSESSMENT — Readiness score with gaps

JARVIS military briefing voice. Under 500 words. Section headers CAPS. No markdown.`

      const result = await sendMessage(prompt, 'interview-sim', {})
      if (result?.text) {
        const parts = result.text.split(/\n(?=[A-Z ]{5,})/g).filter(p => p.trim())
        setSections(parts.map(p => {
          const lines = p.trim().split('\n')
          return { title: lines[0], body: lines.slice(1).join('\n').trim() }
        }))
        setGenerated(true)
        speakElevenLabs(result.text.split('\n\n')[0] || '')
        try {
          const apps = JSON.parse(localStorage.getItem('jos-applications') || '[]')
          apps.push({ company, role, briefDate: new Date().toISOString(), brief: result.text })
          localStorage.setItem('jos-applications', JSON.stringify(apps))
        } catch { /* ok */ }
      }
    } catch (err) { console.error('[Brief]', err) }
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(2,10,19,0.98)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.4em] text-cyan/50 mb-2">CLASSIFICATION: EYES ONLY</p>
            <h1 className="font-display text-2xl font-bold tracking-wider neon-heading" style={{ color: '#00f0ff' }}>
              INTELLIGENCE BRIEF{generated ? `: ${company.toUpperCase()}` : ''}
            </h1>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text p-2"><X size={20} /></button>
        </div>

        {!generated ? (
          <div className="glass-card p-6 max-w-sm mx-auto">
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name"
              className="w-full bg-void border border-border rounded-lg px-4 py-2 mb-3 font-body text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan" />
            <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Role / Position"
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              className="w-full bg-void border border-border rounded-lg px-4 py-2 mb-4 font-body text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan" />
            <button onClick={handleGenerate} disabled={generating || !company.trim() || !role.trim()}
              className="w-full glass-card py-3 text-center font-display text-sm font-bold text-cyan tracking-wider border-cyan hover:bg-cyan/10 transition-all disabled:opacity-30">
              {generating ? 'GENERATING BRIEF...' : 'GENERATE INTELLIGENCE BRIEF'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((sec, i) => (
              <div key={i} className="glass-card p-5 card-enter" style={{ animationDelay: `${i * 80}ms` }}>
                <h2 className="font-display text-sm font-bold tracking-[0.15em] neon-heading mb-3" style={{ color: '#00f0ff' }}>{sec.title}</h2>
                <p className="font-body text-sm text-text leading-relaxed whitespace-pre-wrap">{sec.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
