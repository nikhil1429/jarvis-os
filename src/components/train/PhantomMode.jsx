// PhantomMode.jsx — Emergency interview prep: 15 Qs, 60s timer, readiness score
// WHY: Bible Section 24.5. Interview tomorrow? Phantom Mode activates emergency protocols.

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Clock, AlertTriangle } from 'lucide-react'
import useAI from '../../hooks/useAI.js'

export default function PhantomMode({ onClose }) {
  const { sendMessage } = useAI()

  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(-1) // -1=setup, 0-14=active, 15=done
  const [timer, setTimer] = useState(60)
  const [scores, setScores] = useState([])
  const [answer, setAnswer] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scoring, setScoring] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current) } }, [])

  const generateQuestions = async () => {
    if (!company.trim() || !role.trim()) return
    setGenerating(true)
    try {
      const result = await sendMessage(
        `Emergency interview prep. Generate 15 interview questions for: Company: ${company}, Role: ${role}. Candidate: AI Product Engineer, FinOps background, LLM experience. Mix: 5 technical, 3 behavioral, 3 system design, 2 product, 2 situational. Return ONLY a JSON array of 15 strings.`,
        'interview-sim', {}
      )
      if (result?.text) {
        try {
          const match = result.text.match(/\[[\s\S]*\]/)
          const qs = match ? JSON.parse(match[0]) : result.text.split('\n').filter(l => l.trim()).slice(0, 15)
          setQuestions(Array.isArray(qs) ? qs : [])
          setCurrentQ(0)
          startTimer()
        } catch { setQuestions(result.text.split('\n').filter(l => l.trim() && l.length > 10).slice(0, 15)); setCurrentQ(0); startTimer() }
      }
    } catch (err) { console.error('[Phantom]', err) }
    setGenerating(false)
  }

  const startTimer = () => {
    setTimer(60)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(prev => { if (prev <= 1) { clearInterval(timerRef.current); submitAnswer(); return 0 }; return prev - 1 })
    }, 1000)
  }

  const submitAnswer = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!answer.trim()) { setScores(prev => [...prev, 0]); nextQuestion(); return }
    setScoring(true)
    try {
      const result = await sendMessage(
        `Score this interview answer 1-10. Question: "${questions[currentQ]}". Answer: "${answer}". Reply with ONLY a number 1-10.`,
        'chat', {}
      )
      const score = parseInt(result?.text?.match(/\d+/)?.[0]) || 5
      setScores(prev => [...prev, Math.min(10, score)])
    } catch { setScores(prev => [...prev, 5]) }
    setScoring(false)
    setAnswer('')
    nextQuestion()
  }, [answer, currentQ, questions, sendMessage])

  const nextQuestion = () => {
    const next = currentQ + 1
    if (next >= questions.length) { setCurrentQ(questions.length); return }
    setCurrentQ(next)
    setAnswer('')
    startTimer()
    // Voice input handled by Gemini Live overlay
  }

  const readiness = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / (scores.length * 10)) * 100) : 0

  // Setup
  if (currentQ === -1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,10,19,0.98)' }}>
        <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text"><X size={20} /></button>
        <div className="max-w-sm w-full px-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            <h1 className="font-display text-xl font-bold tracking-wider" style={{ color: '#ef4444' }}>PHANTOM MODE</h1>
          </div>
          <p className="font-body text-xs text-text-dim mb-4">Emergency interview prep — 15 questions, 60s each.</p>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company"
            className="w-full bg-void border border-red-500/30 rounded-lg px-4 py-2 mb-3 font-body text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-red-400" />
          <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Role"
            onKeyDown={e => e.key === 'Enter' && generateQuestions()}
            className="w-full bg-void border border-red-500/30 rounded-lg px-4 py-2 mb-4 font-body text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-red-400" />
          <button onClick={generateQuestions} disabled={generating}
            className="w-full py-3 rounded-lg border font-display text-sm font-bold tracking-wider transition-all disabled:opacity-30"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            {generating ? 'GENERATING...' : 'ENGAGE PHANTOM MODE'}
          </button>
        </div>
      </div>
    )
  }

  // Complete
  if (currentQ >= questions.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,10,19,0.98)' }}>
        <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text"><X size={20} /></button>
        <div className="text-center">
          <p className="font-mono text-xs text-text-muted tracking-wider mb-4">PHANTOM MODE COMPLETE</p>
          <p className="font-display text-6xl font-bold" style={{ color: readiness >= 70 ? '#22c55e' : readiness >= 40 ? '#d4a853' : '#ef4444' }}>{readiness}%</p>
          <p className="font-display text-sm text-text-dim mt-2">Readiness Score</p>
          <p className="font-mono text-xs text-text-muted mt-4">{scores.length} questions · avg {(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)}/10</p>
          <button onClick={onClose} className="mt-6 px-6 py-2 rounded-lg border border-cyan/40 text-cyan font-mono text-xs hover:bg-cyan/10">CLOSE</button>
        </div>
      </div>
    )
  }

  // Active question
  return (
    <div className="fixed inset-0 z-50 flex flex-col p-6" style={{ background: 'rgba(2,10,19,0.98)' }}>
      <div className="flex justify-between items-start mb-4">
        <span className="font-mono text-xs" style={{ color: '#ef4444' }}>Q{currentQ + 1}/{questions.length}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold" style={{ color: timer < 10 ? '#ef4444' : timer < 30 ? '#d4a853' : '#00f0ff', animation: timer < 10 ? 'neonPulse 1s infinite' : 'none' }}>
            <Clock size={16} className="inline mr-1" />{timer}s
          </span>
          <button onClick={onClose} className="text-text-muted hover:text-text"><X size={18} /></button>
        </div>
      </div>
      <div className="glass-card p-5 mb-4" style={{ borderLeft: '3px solid #ef4444' }}>
        <p className="font-body text-sm text-text leading-relaxed">{questions[currentQ]}</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="font-body text-sm text-text-dim text-center max-w-md">{answer || 'Speak your answer or type below...'}</p>
      </div>
      <div className="flex gap-2">
        <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitAnswer()}
          placeholder="Type or speak..." className="flex-1 bg-void border border-red-500/20 rounded-lg px-4 py-2 font-body text-sm text-text focus:outline-none focus:border-red-400" />
        <button onClick={submitAnswer} disabled={scoring}
          className="px-4 py-2 rounded-lg border font-mono text-xs transition-all disabled:opacity-30"
          style={{ borderColor: '#ef4444', color: '#ef4444' }}>
          {scoring ? '...' : 'SUBMIT'}
        </button>
      </div>
    </div>
  )
}
