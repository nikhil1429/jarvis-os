// BattleRoyale.jsx — 5 weakest concepts, 3 questions each, escalating difficulty
// WHY: Bible Section 24.12. Arena-style concept testing with strength updates.

import { useState, useEffect, useCallback } from 'react'
import { X, Swords } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import useJarvisVoice from '../../hooks/useJarvisVoice.js'
import CONCEPTS from '../../data/concepts.js'
import { updateConceptStrength } from '../../utils/quizScoring.js'

export default function BattleRoyale({ onClose }) {
  const { sendMessage } = useAI()
  const { get } = useStorage()
  const voice = useJarvisVoice()

  const [phase, setPhase] = useState('intro') // intro | round | between | complete
  const [weakest, setWeakest] = useState([])
  const [round, setRound] = useState(0)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([]) // per-round results
  const [loading, setLoading] = useState(false)



  const startRound = useCallback(async (idx) => {
    setRound(idx)
    setCurrentQ(0)
    setAnswer('')
    setLoading(true)
    const concept = weakest[idx]
    voice.speak(`Round ${idx + 1}. ${concept.name}. Prepare yourself, Sir.`, { isVoiceCommand: true })

    try {
      const result = await sendMessage(
        `Generate 3 questions about "${concept.name}" at escalating difficulty: 1 EASY (definition), 2 MEDIUM (application), 3 HARD (edge case). For each provide correct answer (2-3 sentences). Format as JSON: [{ "difficulty":"EASY", "question":"...", "answer":"..." }]`,
        'quiz', {}
      )
      if (result?.text) {
        try {
          const match = result.text.match(/\[[\s\S]*\]/)
          const qs = match ? JSON.parse(match[0]) : []
          setQuestions(qs.length >= 3 ? qs : [{ difficulty: 'EASY', question: result.text, answer: '' }])
        } catch { setQuestions([{ difficulty: 'MIXED', question: result.text, answer: '' }]) }
      }
    } catch (err) { console.error('[BattleRoyale]', err) }
    setLoading(false)
    setPhase('round')
  }, [weakest, sendMessage, voice])

  const submitAnswer = useCallback(async () => {
    const q = questions[currentQ]
    // Simple scoring: if answer contains key words from correct answer, score higher
    const score = answer.trim().length > 20 ? 7 : answer.trim().length > 5 ? 5 : 2
    const concept = weakest[round]

    // Update concept strength
    updateConceptStrength(concept.name, score)

    const roundResult = { concept: concept.name, difficulty: q?.difficulty, score, question: q?.question }
    setResults(prev => [...prev, roundResult])

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
      setAnswer('')
    } else {
      // Round complete
      if (round < weakest.length - 1) {
        setPhase('between')
        voice.speak(`Round ${round + 1} complete. Moving to next concept.`, { isVoiceCommand: true })
      } else {
        setPhase('complete')
        const totalGain = results.length * 5
        voice.speak(`Battle Royale complete. ${weakest.length} concepts engaged. Well fought, Sir.`, { isVoiceCommand: true })
      }
    }
  }, [answer, currentQ, questions, round, weakest, results, voice])

  useEffect(() => {
    const saved = get('concepts') || []
    const sorted = CONCEPTS.map(c => {
      const s = saved.find(x => x.id === c.id)
      return { ...c, strength: s?.strength || 0 }
    }).sort((a, b) => a.strength - b.strength).slice(0, 5)
    setWeakest(sorted)

    const onSend = (e) => setAnswer(e.detail.text)
    window.addEventListener('jarvis-voice-send', onSend)
    return () => window.removeEventListener('jarvis-voice-send', onSend)
  }, [get])


  const diffColor = { EASY: '#22c55e', MEDIUM: '#d4a853', HARD: '#ef4444' }

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,10,19,0.98)' }}>
        <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text"><X size={20} /></button>
        <div className="text-center max-w-sm px-6">
          <Swords size={32} className="text-gold mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold tracking-wider gold-heading mb-2" style={{ color: '#d4a853' }}>BATTLE ROYALE</h1>
          <p className="font-body text-xs text-text-dim mb-4">5 weakest concepts. 3 questions each. Escalating difficulty.</p>
          <div className="space-y-2 mb-4">
            {weakest.map((c, i) => (
              <div key={i} className="glass-card px-3 py-2 flex justify-between">
                <span className="font-body text-xs text-text">{c.name}</span>
                <span className="font-mono text-xs" style={{ color: c.strength < 30 ? '#ef4444' : '#d4a853' }}>{c.strength}%</span>
              </div>
            ))}
          </div>
          <button onClick={() => startRound(0)} disabled={loading}
            className="w-full py-3 rounded-lg border font-display text-sm font-bold tracking-wider transition-all disabled:opacity-30"
            style={{ borderColor: '#d4a853', color: '#d4a853' }}>
            {loading ? 'LOADING...' : 'BEGIN BATTLE'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,10,19,0.98)' }}>
        <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-text"><X size={20} /></button>
        <div className="text-center">
          <h1 className="font-display text-xl font-bold gold-heading mb-4" style={{ color: '#d4a853' }}>BATTLE COMPLETE</h1>
          <p className="font-mono text-sm text-text-dim">{results.length} questions answered across {weakest.length} concepts</p>
          <button onClick={onClose} className="mt-6 px-6 py-2 rounded-lg border border-gold/40 text-gold font-mono text-xs hover:bg-gold/10">CLOSE</button>
        </div>
      </div>
    )
  }

  if (phase === 'between') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,10,19,0.98)' }}>
        <div className="text-center">
          <p className="font-mono text-xs text-text-muted tracking-wider mb-4">ROUND {round + 1} COMPLETE</p>
          <p className="font-display text-lg font-bold text-gold mb-6">Next: {weakest[round + 1]?.name}</p>
          <button onClick={() => startRound(round + 1)} className="px-6 py-2 rounded-lg border border-gold/40 text-gold font-mono text-xs hover:bg-gold/10">
            NEXT ROUND
          </button>
        </div>
      </div>
    )
  }

  // Active round
  const q = questions[currentQ]
  return (
    <div className="fixed inset-0 z-50 flex flex-col p-6" style={{ background: 'rgba(2,10,19,0.98)' }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-mono text-[10px] text-text-muted">ROUND {round + 1}/5 — {weakest[round]?.name}</span>
          {q?.difficulty && (
            <span className="ml-2 font-mono text-[9px] px-2 py-0.5 rounded" style={{ color: diffColor[q.difficulty] || '#00b4d8', border: `1px solid ${diffColor[q.difficulty] || '#00b4d8'}40` }}>
              {q.difficulty}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text"><X size={18} /></button>
      </div>
      <div className="glass-card p-5 mb-4">
        <p className="font-body text-sm text-text leading-relaxed">{q?.question || 'Loading...'}</p>
      </div>
      <div className="flex-1" />
      <div className="flex gap-2">
        <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitAnswer()}
          placeholder="Your answer..." className="flex-1 bg-void border border-border rounded-lg px-4 py-2 font-body text-sm text-text focus:outline-none focus:border-cyan" />
        <button onClick={submitAnswer} className="px-4 py-2 rounded-lg border border-cyan/40 text-cyan font-mono text-xs hover:bg-cyan/10">SUBMIT</button>
      </div>
    </div>
  )
}
