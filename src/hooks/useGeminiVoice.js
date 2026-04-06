// useGeminiVoice.js — Real-time voice via Gemini 3.1 Flash Live Preview
// Phase 3: Auto-reconnect, state sync, voice navigation, Claude handoff,
// route awareness, hardware awareness, emotional calibration, vision.

import { useState, useRef, useCallback, useEffect } from 'react'
import { logAPICall } from '../utils/apiLogger.js'
import { startShadowProcessing, stopShadowProcessing } from '../utils/transcriptShadow.js'
import { startStateSync, stopStateSync } from '../utils/geminiStateSync.js'
import { getSharedMicStream, releaseMicStream } from '../utils/micManager.js'

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}
function getApiKey() { const e = import.meta.env.VITE_GEMINI_API_KEY; if (e) return e; try { return safeGet('jos-settings', {}).geminiApiKey || null } catch { return null } }
function getVoiceName() { try { return safeGet('jos-settings', {}).geminiVoiceName || 'Charon' } catch { return 'Charon' } }

// ============================================================
// SYSTEM INSTRUCTION — Enriched with route, hardware, emotional calibration
// ============================================================
async function buildSystemInstruction() {
  const core = safeGet('jos-core', {})
  const feelings = safeGet('jos-feelings', [])
  const lastFeelings = feelings.slice(-3)
  const emotionalMem = safeGet('jos-emotional-memory', {})
  const concepts = safeGet('jos-concepts', [])
  const chatMsgs = safeGet('jos-msgs-chat', [])

  const sp = [`Streak ${core.streak||0} days. Energy ${core.energy||3}/5. Rank: ${core.rank||'Recruit'}.`]
  if (lastFeelings.length) { const l = lastFeelings[lastFeelings.length-1]; sp.push(`Mood: ${l.mood||'unknown'}. Confidence: ${l.confidence||'?'}/5.`) }
  const concerns = (emotionalMem.concerns||[]).filter(c => !c.resolved).slice(-2)
  if (concerns.length) sp.push(`Concerns: ${concerns.map(c => c.text).join(', ')}.`)
  const weak = concepts.filter(c => (c.strength||0) < 40 && (c.strength||0) > 0).slice(0, 3)
  if (weak.length) sp.push(`Weak: ${weak.map(c => `${c.name} (${c.strength}%)`).join(', ')}.`)
  sp.push(`Tasks: ${(core.completedTasks||[]).length}/82.`)
  const recent = chatMsgs.slice(-5).map(m => `${m.role==='user'?'Nikhil':'JARVIS'}: ${(m.content||'').slice(0,80)}`).join(' | ')
  if (recent) sp.push(`Recent: ${recent}`)

  const knowledge = (() => { try { return JSON.parse(localStorage.getItem('jos-knowledge')||'[]').slice(-10).map(e=>e.text).join(' | ') } catch { return '' } })()
  const decisions = (() => { try { return JSON.parse(localStorage.getItem('jos-decisions')||'[]').slice(-5).map(e=>`${e.decision} (${e.date?.slice(0,10)})`).join(' | ') } catch { return '' } })()
  const commitments = (() => { try { return JSON.parse(localStorage.getItem('jos-commitments')||'[]').filter(x=>!x.completedAt).slice(-5).map(e=>e.text).join(' | ') } catch { return '' } })()
  const lastSession = (() => { try { const s=JSON.parse(localStorage.getItem('jos-last-session')||'{}'); if(!s.date)return''; return `Last session: ${s.date?.slice(0,10)}, ${Math.round((s.totalSessionMinutes||0)/60*10)/10}hr. ${s.stuckPoints?.length?'Stuck: '+s.stuckPoints.join(', ')+'.':''}` } catch { return '' } })()
  const geminiMeta = (() => { try { const m=JSON.parse(localStorage.getItem('jos-gemini-meta')||'[]'); const l=m[m.length-1]; if(!l)return''; const f=[]; if(l.characterBreaks)f.push('Stay in British JARVIS character.'); if(l.depthFailures?.length)f.push(`Shallow last time on: ${l.depthFailures.join(', ')}.`); return f.join(' ') } catch { return '' } })()

  // Piece 5: Route awareness
  const currentTab = (() => {
    const tab = localStorage.getItem('jos-active-tab-name') || 'cmd'
    const names = { cmd:'Command Center — tasks, battle plan', train:'Training modes', log:'Daily Log — check-ins', dna:'Concept DNA — 35 concepts', stats:'Stats & Intelligence', wins:'Achievements' }
    return names[tab] || 'Command Center'
  })()

  // Piece 6: Hardware awareness
  const hwParts = []
  try { if (navigator.getBattery) { const b = await navigator.getBattery(); hwParts.push(`Battery: ${Math.round(b.level*100)}%${b.charging?' charging':''}`); if (b.level<0.15&&!b.charging) hwParts.push('LOW BATTERY') } } catch {}
  try { const c = navigator.connection||navigator.mozConnection; if (c?.effectiveType) { hwParts.push(`Network: ${c.effectiveType}`); if (['2g','slow-2g'].includes(c.effectiveType)) hwParts.push('SLOW CONNECTION — shorter responses') } } catch {}
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 6) hwParts.push('VERY LATE — mention sleep once')
  else if (hour >= 22) hwParts.push('Late evening')

  // Piece 7: Emotional calibration
  const calParts = []
  const energy = core.energy || 3
  if (energy <= 2) calParts.push('LOW ENERGY: 1-2 sentences max. Warm, not challenging.')
  else if (energy >= 4) calParts.push('HIGH ENERGY: Challenge him. Push harder.')
  const todayFeeling = feelings.find(f => f.date?.startsWith(new Date().toISOString().slice(0,10)))
  if (todayFeeling?.confidence <= 2) calParts.push('CONFIDENCE LOW: Encourage. No quizzing.')
  if (todayFeeling?.burnoutSignals) calParts.push('BURNOUT: Prescribe rest. Brief interactions.')
  if (todayFeeling?.impostorSignals) calParts.push('IMPOSTOR SIGNALS: Affirm with concrete achievements.')
  if ((core.streak||0) >= 7) calParts.push(`STREAK: ${core.streak} days. Acknowledge consistency.`)

  let prompt = `You are JARVIS OS — Nikhil Panwar's personal AI operating system.
Speak like JARVIS from Iron Man: formal, British, precise, dry wit. Think Paul Bettany.
Call him "Sir" or rank title. NEVER "bro"/"bhai"/"dude". Understand Hinglish, respond British English only.
2-3 sentences for voice. Concise. No markdown/asterisks/emoji. Have opinions. Not passive.

STATE: ${sp.join(' ')}

15 TOOLS: complete tasks, stats, concept strength, search knowledge/decisions, weak concepts, recent feelings, quick capture, log journal/decision, commitments, navigate app, handoff to Claude, look at screen, deep reasoning. Use proactively. For complex questions, use engage_deep_reasoning for Pro-level analysis.

PROACTIVE: Check concept strength when discussed. Acknowledge fatigue. ASK before logging decisions/captures/journal — WAIT for explicit yes. One offer per topic. Max 1 proactive per 5 min.
CRITICAL: For log_decision, quick_capture, log_voice_journal — ask permission first, call tool ONLY after "yes"/"haan"/"sure" in next turn.

SESSION LIMIT: 15 min. At 13 min you'll get a system message — inform Sir naturally.
RECONNECTION: If you get [SYSTEM: Session auto-renewed], continue naturally as if nothing happened. Do NOT mention reconnection.
CURRENT VIEW: Sir is on ${currentTab}. Acknowledge what he's viewing on first message.`

  if (lastSession) prompt += `\nCONTINUITY: ${lastSession}`
  if (knowledge) prompt += `\nLEARNINGS: ${knowledge}`
  if (decisions) prompt += `\nDECISIONS: ${decisions}`
  if (commitments) prompt += `\nCOMMITMENTS: ${commitments}`
  if (geminiMeta) prompt += `\nSELF-CORRECTION: ${geminiMeta}`
  if (hwParts.length) prompt += `\nHARDWARE: ${hwParts.join('. ')}`
  if (calParts.length) prompt += `\nEMOTIONAL CALIBRATION: ${calParts.join(' ')}`
  return prompt
}

// ============================================================
// 15 TOOLS
// ============================================================
const GEMINI_TOOLS = [{ functionDeclarations: [
  { name: 'complete_task', description: 'Mark a build task as complete.', parameters: { type: 'OBJECT', properties: { taskId: { type: 'NUMBER' } }, required: ['taskId'] } },
  { name: 'get_today_stats', description: 'Get live stats.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'update_concept_strength', description: 'Update concept mastery 0-100.', parameters: { type: 'OBJECT', properties: { conceptName: { type: 'STRING' }, newStrength: { type: 'NUMBER' } }, required: ['conceptName', 'newStrength'] } },
  { name: 'search_knowledge', description: 'Search Second Brain by keyword.', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
  { name: 'get_weak_concepts', description: 'Get concepts below 40%.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_recent_feelings', description: 'Get last 3 days check-in data.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'quick_capture', description: 'Save thought to Second Brain. ONLY after Sir confirms.', parameters: { type: 'OBJECT', properties: { text: { type: 'STRING' }, category: { type: 'STRING' } }, required: ['text'] } },
  { name: 'search_decisions', description: 'Search past decisions.', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
  { name: 'get_active_commitments', description: 'Get active commitments.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'log_voice_journal', description: 'Save journal entry. ONLY after Sir confirms.', parameters: { type: 'OBJECT', properties: { text: { type: 'STRING' }, mood: { type: 'STRING' } }, required: ['text'] } },
  { name: 'log_decision', description: 'Record a decision. ONLY after Sir confirms.', parameters: { type: 'OBJECT', properties: { decision: { type: 'STRING' }, reasoning: { type: 'STRING' }, context: { type: 'STRING' } }, required: ['decision'] } },
  { name: 'navigate_app', description: 'Switch tabs or open training modes. Use for "open", "show me", "quiz me", "go to".', parameters: { type: 'OBJECT', properties: { tab: { type: 'STRING', description: 'cmd|train|log|dna|stats|wins' }, mode: { type: 'STRING', description: 'Training mode if tab=train' }, context: { type: 'STRING' } }, required: ['tab'] } },
  { name: 'handoff_to_claude', description: 'Transfer to Claude deep analysis. For "go deep", "teach me", "samjhao properly".', parameters: { type: 'OBJECT', properties: { mode: { type: 'STRING', description: 'quiz|teach|presser|battle' }, topic: { type: 'STRING' }, reason: { type: 'STRING' } }, required: ['topic'] } },
  { name: 'look_at_screen', description: 'Capture and analyze current screen. For "look at this", "see this error".', parameters: { type: 'OBJECT', properties: { focus: { type: 'STRING' } } } },
  { name: 'engage_deep_reasoning', description: 'For complex logic, coding, strategy, or deep analysis. Triggers background deep thinking.', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
] }]

function executeGeminiTool(name, args, wsRef) {
  if (name === 'complete_task') { try { const c=JSON.parse(localStorage.getItem('jos-core')||'{}'); const d=c.completedTasks||[]; if(!d.includes(args.taskId)){d.push(args.taskId);c.completedTasks=d;localStorage.setItem('jos-core',JSON.stringify(c));window.dispatchEvent(new CustomEvent('jarvis-task-toggled'))}; return{success:true,tasksCompleted:d.length}} catch(e){return{error:e.message}} }
  if (name === 'get_today_stats') { try { const c=JSON.parse(localStorage.getItem('jos-core')||'{}'); return{tasks:(c.completedTasks||[]).length,total:82,streak:c.streak||0,energy:c.energy||3,rank:c.rank||'Recruit'}} catch(e){return{error:e.message}} }
  if (name === 'update_concept_strength') { try { const cs=JSON.parse(localStorage.getItem('jos-concepts')||'[]'); const c=cs.find(x=>x.name?.toLowerCase().includes(args.conceptName?.toLowerCase())); if(c){c.strength=Math.min(100,Math.max(0,args.newStrength));c.lastReviewed=new Date().toISOString();localStorage.setItem('jos-concepts',JSON.stringify(cs))}; return c?{success:true,strength:c.strength}:{error:'Not found'}} catch(e){return{error:e.message}} }
  if (name === 'search_knowledge') { try { const k=JSON.parse(localStorage.getItem('jos-knowledge')||'[]'); const q=(args.query||'').toLowerCase(); const m=k.filter(x=>(x.text||'').toLowerCase().includes(q)||(x.tags||[]).some(t=>t.toLowerCase().includes(q))).slice(-5).map(x=>({text:x.text,tags:x.tags,date:x.timestamp?.slice(0,10)})); return m.length?{results:m}:{results:[],message:'Nothing found.'}} catch(e){return{error:e.message}} }
  if (name === 'get_weak_concepts') { try { const cs=JSON.parse(localStorage.getItem('jos-concepts')||'[]'); return{weakConcepts:cs.filter(c=>(c.strength||0)<40).sort((a,b)=>(a.strength||0)-(b.strength||0)).slice(0,8).map(c=>({name:c.name,strength:c.strength||0}))}} catch(e){return{error:e.message}} }
  if (name === 'get_recent_feelings') { try { return{recentDays:JSON.parse(localStorage.getItem('jos-feelings')||'[]').slice(-3).map(f=>({date:f.date?.slice(0,10),mood:f.mood,confidence:f.confidence,energy:f.energy,sleep:f.sleep}))}} catch(e){return{error:e.message}} }
  if (name === 'quick_capture') { try { const c=JSON.parse(localStorage.getItem('jos-quick-capture')||'[]'); c.push({timestamp:new Date().toISOString(),text:args.text,category:args.category||'insight',source:'gemini-voice'}); localStorage.setItem('jos-quick-capture',JSON.stringify(c.slice(-500))); return{success:true}} catch(e){return{error:e.message}} }
  if (name === 'search_decisions') { try { const d=JSON.parse(localStorage.getItem('jos-decisions')||'[]'); const q=(args.query||'').toLowerCase(); return{results:d.filter(x=>(x.decision||'').toLowerCase().includes(q)).slice(-5).map(x=>({decision:x.decision,date:x.date?.slice(0,10)}))}} catch(e){return{error:e.message}} }
  if (name === 'get_active_commitments') { try { return{activeCommitments:JSON.parse(localStorage.getItem('jos-commitments')||'[]').filter(c=>!c.completedAt).slice(-10).map(c=>({text:c.text,deadline:c.deadline}))}} catch(e){return{error:e.message}} }
  if (name === 'log_voice_journal') { try { const j=JSON.parse(localStorage.getItem('jos-journal')||'[]'); j.push({timestamp:new Date().toISOString(),raw:args.text,extracted:{mood:args.mood||'reflective',source:'gemini-voice'}}); localStorage.setItem('jos-journal',JSON.stringify(j.slice(-200))); return{success:true}} catch(e){return{error:e.message}} }
  if (name === 'log_decision') { try { const d=JSON.parse(localStorage.getItem('jos-decisions')||'[]'); d.push({date:new Date().toISOString(),decision:args.decision,reasoning:args.reasoning||'',context:args.context||'',source:'gemini-voice'}); localStorage.setItem('jos-decisions',JSON.stringify(d.slice(-100))); return{success:true}} catch(e){return{error:e.message}} }
  if (name === 'navigate_app') { try { window.dispatchEvent(new CustomEvent('jarvis-navigate',{detail:{tab:args.tab,mode:args.mode,context:args.context}})); return{success:true,message:`Navigated to ${args.tab}${args.mode?' '+args.mode:''}`}} catch(e){return{error:e.message}} }
  if (name === 'handoff_to_claude') { try { const t=JSON.parse(localStorage.getItem('jos-gemini-transcript')||'[]'); localStorage.setItem('jos-handoff-context',JSON.stringify({timestamp:new Date().toISOString(),topic:args.topic,reason:args.reason||'Depth needed',targetMode:args.mode||'teach',conversationContext:t.slice(-30).map(m=>`${m.role==='user'?'Nikhil':'JARVIS'}: ${m.text}`).join('\n'),fromGeminiSession:true})); window.dispatchEvent(new CustomEvent('jarvis-navigate',{detail:{tab:'train',mode:args.mode||'teach',context:args.topic}})); setTimeout(()=>window.dispatchEvent(new CustomEvent('jarvis-handoff-disconnect')),3000); return{success:true}} catch(e){return{error:e.message}} }
  if (name === 'look_at_screen') { (async()=>{ try { const h=(await import('html2canvas')).default; const el=document.querySelector('[data-main-content]')||document.body; const cv=await h(el,{scale:0.5,useCORS:true,logging:false,width:Math.min(el.scrollWidth,1200),height:Math.min(el.scrollHeight,800)}); const b64=cv.toDataURL('image/jpeg',0.7).split(',')[1]; if(wsRef?.current?.readyState===WebSocket.OPEN){wsRef.current.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{inlineData:{mimeType:'image/jpeg',data:b64}},{text:`[VISION: Screen capture. Focus: ${args.focus||'full screen'}. Describe what you see.]`}]}],turnComplete:true}}))} } catch(e){console.warn('[Vision]',e)} })(); return{success:true,message:'Screen captured.'} }
  if (name === 'engage_deep_reasoning') { return '__ASYNC__' } // Handled separately — see toolCall handler
  return { error: `Unknown tool: ${name}` }
}

// ============================================================
// CONVERSATION SUMMARY for auto-reconnect
// ============================================================
function buildConversationSummary(reconnectCount) {
  try {
    const t = JSON.parse(localStorage.getItem('jos-gemini-transcript') || '[]')
    const recent = t.slice(-20)
    if (!recent.length) return null
    const summary = recent.map(m => `${m.role==='user'?'Nikhil':'JARVIS'}: ${(m.text||'').slice(0,100)}`).join('\n')
    const lastUser = [...recent].reverse().find(m => m.role === 'user')
    return { summary, lastTopic: lastUser?.text?.slice(0,150) || 'general', sessionNumber: reconnectCount + 1 }
  } catch { return null }
}

// ============================================================
// HOOK
// ============================================================
export default function useGeminiVoice() {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceState, setVoiceState] = useState('IDLE') // IDLE | LISTENING | SPEAKING
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const micCtxRef = useRef(null)   // 16kHz — mic capture + send to Gemini
  const playCtxRef = useRef(null)  // native rate — plays Gemini 24kHz audio (browser upsamples)
  const streamRef = useRef(null)
  const processorRef = useRef(null)
  const playQueueRef = useRef(Promise.resolve())
  const silenceTimerRef = useRef(null)
  const recognitionRef = useRef(null)
  const startTimeRef = useRef(null)
  const sessionTimerRef = useRef(null)
  const sessionWarningRef = useRef(false)
  const autoDisconnectRef = useRef(null)
  // Piece 1: Auto-reconnect refs
  const reconnectAttemptRef = useRef(0)
  const isAutoReconnectRef = useRef(false)
  const conversationSummaryRef = useRef(null)
  const pendingSpeechRef = useRef(null) // { text, timestamp } — Queue text to speak once connected
  const maxReconnects = 10

  const saveTranscript = useCallback((entry) => {
    setTranscript(prev => {
      const updated = [...prev, entry].slice(-200)
      try { localStorage.setItem('jos-gemini-transcript', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  // Audio stop flag — set by jarvis-stop-audio event, checked by playAudioChunk
  const audioStoppedRef = useRef(false)
  const activeSourceRef = useRef(null)

  const playAudioChunk = useCallback((base64Audio) => {
    if (!playCtxRef.current) { console.warn('[Gemini] No playback AudioContext'); return }
    if (audioStoppedRef.current) return
    const pctx = playCtxRef.current
    playQueueRef.current = playQueueRef.current.then(() => new Promise(async (resolve) => {
      if (audioStoppedRef.current) { resolve(); return }
      try {
        if (pctx.state === 'suspended') await pctx.resume()
        const raw = atob(base64Audio)
        const bytes = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
        const int16 = new Int16Array(bytes.buffer)
        const float32 = new Float32Array(int16.length)
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768
        // Gemini outputs 24kHz PCM — create buffer at 24kHz, browser upsamples to native rate
        const buffer = pctx.createBuffer(1, float32.length, 24000)
        buffer.getChannelData(0).set(float32)
        const source = pctx.createBufferSource()
        source.buffer = buffer
        source.connect(pctx.destination)
        source.onended = () => { activeSourceRef.current = null; resolve() }
        activeSourceRef.current = source
        source.start()
      } catch (err) { console.warn('[Gemini] Playback error:', err); resolve() }
    }))
  }, [])

  const disconnectRef = useRef(null)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => { console.log('[Gemini] 30s silence'); if (disconnectRef.current) disconnectRef.current() }, 30000)
  }, [])

  const connectToJarvis = useCallback(async () => {
    // Guard against concurrent connections
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      console.log('[Gemini] Already connected, skipping')
      return
    }
    const apiKey = getApiKey()
    if (!apiKey) { setError('Gemini API key not configured. Add it in Settings.'); return }
    setError(null)
    if (!isAutoReconnectRef.current) reconnectAttemptRef.current = 0

    try {
      // Dual AudioContext: micCtx at 16kHz for capture, playCtx at native rate for playback
      const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
      const playCtx = new (window.AudioContext || window.webkitAudioContext)() // native OS rate — upsamples 24kHz
      await micCtx.resume(); await playCtx.resume()
      micCtxRef.current = micCtx; playCtxRef.current = playCtx
      console.log('[Gemini] micCtx:', micCtx.sampleRate, 'Hz | playCtx:', playCtx.sampleRate, 'Hz')
      // Shared mic stream with echo cancellation
      const stream = await getSharedMicStream()
      streamRef.current = stream

      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`)
      wsRef.current = ws

      ws.onopen = async () => {
        console.log('[Gemini] WebSocket connected, sending setup...')
        const instruction = await buildSystemInstruction()
        const setupMsg = { setup: { model: 'models/gemini-3.1-flash-live-preview', systemInstruction: { parts: [{ text: instruction }] }, generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceName() } } }, thinkingConfig: { thinkingLevel: 'high' } }, tools: GEMINI_TOOLS } }
        console.log('[Gemini] Setup message size:', JSON.stringify(setupMsg).length)
        ws.send(JSON.stringify(setupMsg))
        console.log('[Gemini] Setup sent, waiting for setupComplete...')
      }

      ws.onmessage = async (event) => {
        // Gemini Live sends ALL messages as binary Blobs — decode to text first
        let msgText = null
        if (event.data instanceof Blob) {
          msgText = await event.data.text()
        } else {
          msgText = event.data
        }

        // Try parsing as JSON (control messages, audio inlineData, tool calls)
        try {
          const msg = JSON.parse(msgText)

          if (msg.setupComplete) {
            console.log('[Gemini] setupComplete received')
            setIsConnected(true); setIsListening(true); setVoiceState('LISTENING'); startTimeRef.current = Date.now()
            window.__geminiConnected = true
            window.dispatchEvent(new CustomEvent('gemini-connected'))
            setTimeout(() => startAudioCapture(micCtx, stream, ws), 500); startTranscriptionCapture(); resetSilenceTimer()
            startShadowProcessing(() => { try { return JSON.parse(localStorage.getItem('jos-gemini-transcript')||'[]') } catch { return [] } })
            startStateSync(() => wsRef.current)
            window.dispatchEvent(new CustomEvent('jarvis-sound', { detail: { sound: isAutoReconnectRef.current ? 'geminiReconnect' : 'geminiConnect' } }))
            if (isAutoReconnectRef.current && conversationSummaryRef.current) {
              const ctx2 = conversationSummaryRef.current
              setTimeout(() => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ realtimeInput: { text: `Session auto-renewed. Continuation ${ctx2.sessionNumber}. Topic: ${ctx2.lastTopic}. Resume naturally.` } })) }, 500)
              isAutoReconnectRef.current = false
            }
            // Speak queued text or send greeting
            let spokeQueued = false
            if (pendingSpeechRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
              const queued = pendingSpeechRef.current
              pendingSpeechRef.current = null
              const age = Date.now() - (queued.timestamp || 0)
              if (age < 10000) {
                spokeQueued = true
                setTimeout(() => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ realtimeInput: { text: `Speak this aloud: ${queued.text}` } })) }, 800)
              }
            }
            // Greeting: if not auto-reconnect and no queued speech, JARVIS speaks first
            if (!isAutoReconnectRef.current && !spokeQueued && wsRef.current?.readyState === WebSocket.OPEN) {
              setTimeout(() => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ realtimeInput: { text: 'Greet Sir briefly. One sentence.' } })) }, 1000)
            }
            sessionWarningRef.current = false
            sessionTimerRef.current = setTimeout(() => {
              if (wsRef.current?.readyState !== WebSocket.OPEN) return; sessionWarningRef.current = true
              let att = 0; const trySend = () => { att++; if (att >= 30 || wsRef.current?.readyState === WebSocket.OPEN) { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ realtimeInput: { text: 'Session approaching 15-minute limit. Let Sir know naturally.' } })); return }; setTimeout(trySend, 500) }; trySend()
            }, 13 * 60 * 1000)
            autoDisconnectRef.current = setTimeout(() => { if (wsRef.current?.readyState === WebSocket.OPEN) disconnectFromJarvis() }, 14.5 * 60 * 1000)
            return
          }

          // Audio (base64 in inlineData) + text responses
          if (msg.serverContent?.modelTurn?.parts) {
            resetSilenceTimer(); audioStoppedRef.current = false // Reset stop flag on new turn
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) { setVoiceState('SPEAKING'); console.log('[Gemini] Audio chunk, b64 length:', part.inlineData.data.length); playAudioChunk(part.inlineData.data) }
              if (part.text) { console.log('[Gemini] Text:', part.text.slice(0, 80)); saveTranscript({ role: 'assistant', text: part.text, timestamp: new Date().toISOString() }) }
            }
          }
          if (msg.toolCall?.functionCalls) {
            for (const fc of msg.toolCall.functionCalls) {
              console.log('[Gemini] Tool:', fc.name)
              if (fc.name === 'engage_deep_reasoning') {
                // Async: fire REST call to Gemini Pro, send toolResponse when done
                setVoiceState('PROCESSING')
                window.dispatchEvent(new CustomEvent('jarvis-sound', { detail: { sound: 'send' } }));
                (async () => {
                  const apiKey = getApiKey()
                  const query = fc.args?.query || ''
                  try {
                    console.log('[Gemini] Deep reasoning — calling gemini-2.5-pro for:', query.slice(0, 80))
                    const startMs = Date.now()
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: query }] }],
                        generationConfig: { thinkingConfig: { thinkingLevel: 'high' } }
                      })
                    })
                    const data = await res.json()
                    const latencyMs = Date.now() - startMs
                    // Extract final text parts (skip thinking parts)
                    const parts = data.candidates?.[0]?.content?.parts || []
                    const textParts = parts.filter(p => p.text && !p.thought).map(p => p.text)
                    const answer = textParts.join('\n') || 'Analysis complete but no text returned.'
                    console.log('[Gemini] Deep reasoning done in', latencyMs, 'ms, answer length:', answer.length)
                    logAPICall({ model: 'gemini-2.5-pro', mode: 'deep-reasoning', inputTokens: data.usageMetadata?.promptTokenCount || 0, outputTokens: data.usageMetadata?.candidatesTokenCount || 0, latencyMs, estimatedCost: 0, reason: `Deep: ${query.slice(0, 60)}` })
                    // Send result back to Live session — JARVIS will speak it
                    if (ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { result: { analysis: answer } } }] } }))
                    }
                  } catch (err) {
                    console.error('[Gemini] Deep reasoning failed:', err)
                    if (ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { result: { error: err.message } } }] } }))
                    }
                  }
                })()
              } else {
                const result = executeGeminiTool(fc.name, fc.args || {}, wsRef)
                ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] } }))
              }
            }
          }
          if (msg.serverContent?.interrupted) {
            console.log('[Gemini] Server interrupted — stopping audio')
            audioStoppedRef.current = true
            playQueueRef.current = Promise.resolve()
            if (activeSourceRef.current) { try { activeSourceRef.current.stop() } catch {} activeSourceRef.current = null }
            setVoiceState('LISTENING'); resetSilenceTimer()
          }
          if (msg.serverContent?.turnComplete) { setVoiceState('LISTENING'); resetSilenceTimer() }
          return
        } catch (parseErr) {
          console.warn('[Gemini] Non-JSON message received, ignoring')
        }
      }

      ws.onerror = () => { setError('Voice connection failed.'); cleanup() }

      // Piece 1: Auto-reconnect on close
      ws.onclose = (event) => {
        console.log('[Gemini] Closed, code:', event.code, 'reason:', event.reason, 'clean:', event.wasClean)
        logGeminiCall()
        window.dispatchEvent(new CustomEvent('gemini-session-ended'))
        const wasManual = event.code === 1000 && !sessionWarningRef.current
        if (!wasManual && reconnectAttemptRef.current < maxReconnects) {
          conversationSummaryRef.current = buildConversationSummary(reconnectAttemptRef.current)
          isAutoReconnectRef.current = true; reconnectAttemptRef.current++
          console.log(`[Gemini] Auto-reconnect ${reconnectAttemptRef.current}/${maxReconnects}`)
          window.dispatchEvent(new CustomEvent('jarvis-sound', { detail: { sound: 'geminiReconnect' } }))
          cleanup(); setTimeout(() => connectToJarvis(), 1500)
        } else {
          conversationSummaryRef.current = null; isAutoReconnectRef.current = false; reconnectAttemptRef.current = 0; cleanup()
        }
      }
    } catch (err) { console.error('[Gemini] Connect failed:', err); setError(err.message); cleanup() }
  }, [playAudioChunk, saveTranscript, resetSilenceTimer])

  const disconnectFromJarvis = useCallback(() => {
    reconnectAttemptRef.current = maxReconnects // prevent auto-reconnect
    isAutoReconnectRef.current = false; conversationSummaryRef.current = null
    window.dispatchEvent(new CustomEvent('jarvis-sound', { detail: { sound: 'geminiDisconnect' } }))
    if (wsRef.current) try { wsRef.current.close(1000, 'manual') } catch {}
    cleanup()
  }, [])
  disconnectRef.current = disconnectFromJarvis

  function cleanup() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current)
    if (autoDisconnectRef.current) clearTimeout(autoDisconnectRef.current)
    sessionWarningRef.current = false
    stopShadowProcessing(); stopStateSync()
    if (processorRef.current) { try { processorRef.current.disconnect() } catch {} processorRef.current = null }
    if (streamRef.current) { releaseMicStream(); streamRef.current = null }
    if (micCtxRef.current) { try { micCtxRef.current.close() } catch {} micCtxRef.current = null }
    if (playCtxRef.current) { try { playCtxRef.current.close() } catch {} playCtxRef.current = null }
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} recognitionRef.current = null }
    window.__geminiConnected = false
    window.dispatchEvent(new CustomEvent('gemini-disconnected'))
    wsRef.current = null; setIsConnected(false); setIsListening(false); setVoiceState('IDLE')
  }

  function startAudioCapture(ctx, stream, ws) {
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor
    let audioFrameCount = 0
    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const float32 = e.inputBuffer.getChannelData(0)
      const int16 = new Int16Array(float32.length)
      for (let j = 0; j < float32.length; j++) int16[j] = Math.max(-32768, Math.min(32767, Math.round(float32[j] * 32768)))
      const bytes = new Uint8Array(int16.buffer)
      let binary = ''
      for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
      const b64 = btoa(binary)
      const msg = JSON.stringify({ realtimeInput: { audio: { data: b64, mimeType: 'audio/pcm;rate=16000' } } })
      ws.send(msg)
      audioFrameCount++
      if (audioFrameCount <= 3) console.log('[Gemini] Sent audio frame', audioFrameCount, 'size:', msg.length)
    }
    source.connect(processor)
    processor.connect(ctx.destination)
    console.log('[Gemini] Audio capture started')
  }

  function startTranscriptionCapture() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return
    const r = new SR(); r.lang = 'en-IN'; r.continuous = true; r.interimResults = false; recognitionRef.current = r
    r.onresult = (e) => { for (let i=e.resultIndex;i<e.results.length;i++) if (e.results[i].isFinal) { const t=e.results[i][0].transcript.trim(); if(t) saveTranscript({role:'user',text:t,timestamp:new Date().toISOString()}) } }
    r.onend = () => { if (wsRef.current?.readyState === WebSocket.OPEN) try { r.start() } catch {} }
    r.onerror = () => {}; try { r.start() } catch {}
  }

  function logGeminiCall() { const d=startTimeRef.current?Math.round((Date.now()-startTimeRef.current)/1000):0; logAPICall({model:'gemini-3.1-flash-live',mode:'gemini-voice',inputTokens:0,outputTokens:0,latencyMs:d*1000,estimatedCost:0,reason:`Voice: ${d}s`}) }

  // Universal jarvis-speak: any component can request Gemini to speak text
  // If WebSocket not open, queue for delivery once connected
  useEffect(() => {
    const h = (e) => {
      const text = e.detail?.text
      if (!text) return
      const clean = text.replace(/\[.*?\]\s*/g, '').replace(/[*_~`#]/g, '').trim()
      if (!clean) return
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ realtimeInput: { text: `Speak this aloud: ${clean}` } }))
      } else {
        // Queue for delivery once connected (with timestamp to discard stale speech)
        pendingSpeechRef.current = { text: clean, timestamp: Date.now() }
      }
    }
    window.addEventListener('jarvis-speak', h)
    return () => window.removeEventListener('jarvis-speak', h)
  }, [])

  // Stop Gemini audio playback (called by jarvisStopAll via event)
  useEffect(() => {
    const h = () => {
      audioStoppedRef.current = true
      playQueueRef.current = Promise.resolve() // Flush queued chunks
      if (activeSourceRef.current) { try { activeSourceRef.current.stop() } catch {} activeSourceRef.current = null }
      setVoiceState(prev => prev === 'SPEAKING' ? 'LISTENING' : prev)
    }
    window.addEventListener('jarvis-stop-audio', h)
    return () => window.removeEventListener('jarvis-stop-audio', h)
  }, [])

  // Auto-connect: triggered by boot completion or other systems
  useEffect(() => {
    const h = () => { if (!wsRef.current) connectToJarvis() }
    window.addEventListener('gemini-auto-connect', h)
    return () => window.removeEventListener('gemini-auto-connect', h)
  }, [connectToJarvis])

  // Disconnect listeners (handoff, VoiceMode close)
  useEffect(() => {
    const h = () => { reconnectAttemptRef.current = maxReconnects; disconnectFromJarvis() }
    window.addEventListener('jarvis-handoff-disconnect', h)
    window.addEventListener('gemini-disconnect', h)
    return () => { window.removeEventListener('jarvis-handoff-disconnect', h); window.removeEventListener('gemini-disconnect', h) }
  }, [disconnectFromJarvis])

  useEffect(() => { return () => { if (wsRef.current) try { wsRef.current.close() } catch {}; cleanup() } }, [])

  return { isConnected, isListening, voiceState, transcript, error, connectToJarvis, disconnectFromJarvis, startTime: startTimeRef.current }
}
