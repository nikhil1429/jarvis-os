// useVoiceCheckIn.js — Voice-driven check-in state machine
// WHY: JARVIS asks questions one-by-one via voice, user answers, form auto-fills.
// No touching the screen — pure voice interaction for the daily debrief.
// Handles speech recognition quirks: "four" → 4, "to" → 2, "ha" → true

import { useState, useCallback, useRef } from 'react'
import useEventBus from './useEventBus.js'

// WHY: Speech recognition often transcribes numbers as words, and Hindi/Hinglish
// "ha" means yes. These maps handle all common recognition outputs.
const NUMBER_MAP = {
  'one': 1, 'won': 1, '1': 1,
  'two': 2, 'to': 2, 'too': 2, 'tu': 2, '2': 2,
  'three': 3, 'tree': 3, 'teen': 3, '3': 3,
  'four': 4, 'for': 4, 'fore': 4, 'phore': 4, '4': 4,
  'five': 5, 'fife': 5, '5': 5,
}

const YES_WORDS = ['yes', 'yeah', 'yep', 'yup', 'ha', 'haan', 'han', 'sure', 'of course', 'absolutely', 'did', 'i did']
const NO_WORDS = ['no', 'nah', 'nahi', 'nahin', 'nope', 'not', 'didn\'t', 'did not', 'i didn\'t']

// WHY: Fields asked in order. type determines how to parse the voice answer.
// prompt is what JARVIS speaks to ask the question.
const FIELDS = [
  { key: 'confidence', type: 'number', range: [1, 5], prompt: 'Confidence level, 1 to 5, Sir?' },
  { key: 'focus', type: 'number', range: [1, 5], prompt: 'Focus level, 1 to 5?' },
  { key: 'motivation', type: 'number', range: [1, 5], prompt: 'Motivation, 1 to 5?' },
  { key: 'sleep', type: 'number', range: [1, 5], prompt: 'Sleep quality, 1 to 5?' },
  { key: 'meds', type: 'boolean', prompt: 'Did you take your medication today?' },
  { key: 'chai', type: 'number', range: [0, 10], prompt: 'How many cups of chai or coffee?' },
  { key: 'lunch', type: 'boolean', prompt: 'Did you eat lunch?' },
  { key: 'mood', type: 'word', prompt: 'One word to describe your mood?' },
  { key: 'learned', type: 'text', prompt: 'What did you learn today?' },
  { key: 'struggles', type: 'text', prompt: 'Any struggles?' },
]

function parseNumber(transcript) {
  const lower = transcript.toLowerCase().trim()
  // Try map first
  if (NUMBER_MAP[lower] !== undefined) return NUMBER_MAP[lower]
  // Try direct parse
  const num = parseInt(lower, 10)
  if (!isNaN(num)) return num
  // Try finding a number word within the transcript
  for (const [word, val] of Object.entries(NUMBER_MAP)) {
    if (lower.includes(word)) return val
  }
  return null
}

function parseBoolean(transcript) {
  const lower = transcript.toLowerCase().trim()
  if (YES_WORDS.some(w => lower.includes(w))) return true
  if (NO_WORDS.some(w => lower.includes(w))) return false
  return null
}

export default function useVoiceCheckIn() {
  const [active, setActive] = useState(false)
  const [fieldIndex, setFieldIndex] = useState(0)
  const responses = useRef({})
  const eventBus = useEventBus()

  const start = useCallback(() => {
    console.log('CHECKIN: voice check-in started')
    responses.current = {}
    setFieldIndex(0)
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    console.log('CHECKIN: voice check-in cancelled')
    responses.current = {}
    setFieldIndex(0)
    setActive(false)
  }, [])

  // Process a voice answer for the current field
  // Returns: { nextPrompt: string, done: boolean, summary?: string }
  const processAnswer = useCallback((transcript) => {
    if (!active || fieldIndex >= FIELDS.length) return null

    const field = FIELDS[fieldIndex]
    let value = null
    const lower = transcript.toLowerCase().trim()

    // Allow "skip" for any field
    if (lower === 'skip' || lower === 'next') {
      value = field.type === 'boolean' ? false : field.type === 'number' ? 3 : ''
      console.log(`CHECKIN: ${field.key} = skipped (default: ${value})`)
    } else if (field.type === 'number') {
      value = parseNumber(transcript)
      if (value === null) {
        return { nextPrompt: `I didn't catch that. ${field.prompt}`, done: false }
      }
      // Clamp to range
      if (field.range) {
        value = Math.max(field.range[0], Math.min(field.range[1], value))
      }
      console.log(`CHECKIN: ${field.key} = ${value}`)
    } else if (field.type === 'boolean') {
      value = parseBoolean(transcript)
      if (value === null) {
        return { nextPrompt: 'Yes or no, Sir?', done: false }
      }
      console.log(`CHECKIN: ${field.key} = ${value}`)
    } else if (field.type === 'word') {
      // Take first word only
      value = lower.split(/\s+/)[0] || lower
      console.log(`CHECKIN: ${field.key} = ${value}`)
    } else {
      // Free text
      value = transcript.trim()
      console.log(`CHECKIN: ${field.key} = ${value.substring(0, 30)}`)
    }

    responses.current[field.key] = value
    const nextIndex = fieldIndex + 1

    if (nextIndex >= FIELDS.length) {
      // All fields done — save to localStorage
      const r = responses.current
      const entry = {
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        confidence: r.confidence || 3,
        focus: r.focus || 3,
        motivation: r.motivation || 3,
        sleep: r.sleep || 3,
        meds: r.meds || false,
        chai: r.chai || 0,
        lunch: r.lunch || false,
        mood: r.mood || '',
        learned: r.learned || '',
        struggles: r.struggles || '',
        source: 'voice',
      }

      try {
        const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
        feelings.push(entry)
        localStorage.setItem('jos-feelings', JSON.stringify(feelings))
        console.log('CHECKIN: saved to jos-feelings')
      } catch (e) {
        console.error('CHECKIN: save failed:', e)
      }

      // Emit event
      eventBus.emit('checkin:submit', entry)

      // Build summary
      const summary = `Check-in complete, Sir. Confidence ${r.confidence}, Focus ${r.focus}, Motivation ${r.motivation}. Sleep ${r.sleep}. Mood: ${r.mood}. Recorded.`

      setActive(false)
      setFieldIndex(0)
      responses.current = {}

      return { nextPrompt: summary, done: true }
    }

    // Move to next field
    setFieldIndex(nextIndex)
    const ack = field.type === 'number' ? `${value}. `
      : field.type === 'boolean' ? `${value ? 'Yes' : 'No'}. `
      : 'Noted. '
    return { nextPrompt: ack + FIELDS[nextIndex].prompt, done: false }
  }, [active, fieldIndex, eventBus])

  return {
    active,
    fieldIndex,
    totalFields: FIELDS.length,
    currentField: active ? FIELDS[fieldIndex] : null,
    start,
    stop,
    processAnswer,
  }
}
