// ReplayTheater.jsx — Best quiz moments replay with cinematic typewriter
// WHY: Celebrate top-scored exchanges. Dramatic replay builds confidence.

import { useState, useEffect, useMemo } from 'react'
import { X, Star, Play } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'
import { extractQuizScores } from '../../utils/quizScoring.js'

export default function ReplayTheater({ onClose }) {
  const { get } = useStorage()
  const [activeReplay, setActiveReplay] = useState(null)
  const [displayText, setDisplayText] = useState('')
  const [typingPhase, setTypingPhase] = useState('user') // user | jarvis | score

  // Scan all message histories for high-scoring exchanges
  const bestMoments = useMemo(() => {
    const moments = []
    const modes = ['quiz', 'presser', 'battle', 'forensics', 'code-autopsy', 'scenario-bomb']
    modes.forEach(mode => {
      const msgs = get(`msgs-${mode}`) || []
      for (let i = 1; i < msgs.length; i++) {
        if (msgs[i].role === 'assistant') {
          const scores = extractQuizScores(msgs[i].content)
          const highScores = scores.filter(s => s.score >= 7)
          if (highScores.length > 0 && i > 0 && msgs[i - 1].role === 'user') {
            moments.push({
              userMsg: msgs[i - 1].content,
              jarvisMsg: msgs[i].content.replace(/\[QUIZ_SCORE:\d+\/10:[^\]]+\]/g, '').trim(),
              score: highScores[0].score,
              concept: highScores[0].concept,
              mode,
              date: msgs[i].timestamp,
            })
          }
        }
      }
    })
    return moments.sort((a, b) => b.score - a.score).slice(0, 5)
  }, [get])

  // Typewriter for active replay
  useEffect(() => {
    if (!activeReplay) return
    const moment = bestMoments[activeReplay]
    if (!moment) return

    setTypingPhase('user')
    setDisplayText('')
    let i = 0
    const userText = moment.userMsg
    const timer = setInterval(() => {
      if (i < userText.length) {
        setDisplayText(userText.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        // Pause then type JARVIS response
        setTimeout(() => {
          setTypingPhase('jarvis')
          setDisplayText('')
          let j = 0
          const jText = moment.jarvisMsg.substring(0, 300)
          const t2 = setInterval(() => {
            if (j < jText.length) {
              setDisplayText(jText.slice(0, j + 1))
              j++
            } else {
              clearInterval(t2)
              setTypingPhase('score')
            }
          }, 8)
        }, 800)
      }
    }, 12)

    return () => clearInterval(timer)
  }, [activeReplay, bestMoments])

  if (activeReplay !== null) {
    const moment = bestMoments[activeReplay]
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8" style={{ background: 'rgba(2,10,19,0.98)' }}>
        <button onClick={() => setActiveReplay(null)} className="absolute top-6 right-6 text-text-muted hover:text-text"><X size={20} /></button>
        <div className="max-w-lg w-full">
          {typingPhase === 'user' && (
            <div className="text-right mb-6">
              <p className="font-body text-sm inline-block px-4 py-2 rounded-lg bg-cyan/10 text-cyan">{displayText}<span className="typewriter-cursor" /></p>
            </div>
          )}
          {typingPhase === 'jarvis' && (
            <>
              <div className="text-right mb-4 opacity-50">
                <p className="font-body text-xs inline-block px-3 py-1.5 rounded-lg bg-cyan/5 text-cyan/60">{moment.userMsg.substring(0, 80)}...</p>
              </div>
              <div className="text-left">
                <p className="font-body text-sm text-text leading-relaxed">{displayText}<span className="typewriter-cursor" /></p>
              </div>
            </>
          )}
          {typingPhase === 'score' && (
            <div className="text-center mt-8">
              <p className="font-display text-4xl font-bold gold-neon-pulse" style={{ color: '#d4a853' }}>{moment.score}/10</p>
              <p className="font-mono text-xs text-gold/60 mt-2 tracking-wider">{moment.concept}</p>
              <p className="font-body text-sm text-text-dim mt-4 italic">This was your finest moment, Sir.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(2,10,19,0.98)' }}>
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="flex justify-between items-start mb-6">
          <h1 className="font-display text-xl font-bold tracking-wider gold-heading" style={{ color: '#d4a853' }}>BEST MOMENTS</h1>
          <button onClick={onClose} className="text-text-muted hover:text-text p-2"><X size={20} /></button>
        </div>

        {bestMoments.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <Star size={24} className="text-gold/30 mx-auto mb-2" />
            <p className="font-body text-sm text-text-dim">Complete quizzes with 7+/10 scores to unlock best moments.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bestMoments.map((m, i) => (
              <button key={i} onClick={() => setActiveReplay(i)}
                className="w-full glass-card p-4 text-left card-enter hover:border-gold/30 transition-all"
                style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-2xl font-bold" style={{ color: '#d4a853' }}>{m.score}/10</span>
                  <div className="text-right">
                    <span className="font-mono text-[9px] text-gold/60 block">{m.concept}</span>
                    <span className="font-mono text-[8px] text-text-muted">{m.mode}</span>
                  </div>
                </div>
                <p className="font-body text-xs text-text-dim line-clamp-1">{m.userMsg}</p>
                <div className="flex items-center gap-1 mt-2 text-gold/40">
                  <Play size={10} /><span className="font-mono text-[8px]">REPLAY</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
