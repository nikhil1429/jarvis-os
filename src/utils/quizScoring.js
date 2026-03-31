// quizScoring.js — Parse quiz scores from JARVIS responses, update concept strength
// WHY: JARVIS rates answers 1-10 with [QUIZ_SCORE:X/10:concept_name] tags.
// This file extracts those scores and updates jos-concepts automatically,
// so the DNA tab reflects real quiz performance instead of manual slider drags.

import CONCEPTS from '../data/concepts.js'
import { INTERVALS } from '../utils/spacedRepetition.js'

const SCORE_REGEX = /\[QUIZ_SCORE:(\d+)\/10:([^\]]+)\]/g

/**
 * Extract quiz score tags from JARVIS response text
 * @param {string} text — raw JARVIS response
 * @returns {Array<{score: number, concept: string}>}
 */
export function extractQuizScores(text) {
  if (!text) return []
  const scores = []
  let match
  while ((match = SCORE_REGEX.exec(text)) !== null) {
    scores.push({ score: parseInt(match[1], 10), concept: match[2].trim() })
  }
  // Reset regex lastIndex for next call
  SCORE_REGEX.lastIndex = 0
  return scores
}

/**
 * Strip quiz score tags from text (for display + voice)
 * @param {string} text
 * @returns {string}
 */
export function stripQuizTags(text) {
  if (!text) return text
  return text.replace(/\[QUIZ_SCORE:\d+\/10:[^\]]+\]/g, '').trim()
}

/**
 * Find a concept by name — case-insensitive, fuzzy match
 * WHY: Speech-to-text might say "RAG" but concept is "RAG (Retrieval Augmented Gen)"
 */
function findConcept(name, savedConcepts) {
  const lower = name.toLowerCase()
  // Exact match first
  let found = savedConcepts.find(c => c.name?.toLowerCase() === lower)
  if (found) return found
  // Starts-with match (e.g. "RAG" matches "RAG (Retrieval Augmented Gen)")
  found = savedConcepts.find(c => c.name?.toLowerCase().startsWith(lower))
  if (found) return found
  // Contains match
  found = savedConcepts.find(c => c.name?.toLowerCase().includes(lower))
  if (found) return found
  // Check against CONCEPTS constant
  const template = CONCEPTS.find(c => {
    const cl = c.name.toLowerCase()
    return cl === lower || cl.startsWith(lower) || cl.includes(lower)
  })
  return template ? { ...template, strength: 0, reviewHistory: [] } : null
}

/**
 * Calculate strength delta from quiz score
 */
function getStrengthDelta(score) {
  if (score >= 9) return 15
  if (score >= 7) return 10
  if (score >= 5) return 3
  if (score >= 3) return -5
  return -10
}

/**
 * Update concept strength based on quiz score
 * @param {string} conceptName
 * @param {number} quizScore — 1-10
 * @returns {{ conceptName, oldStrength, newStrength, delta } | null}
 */
export function updateConceptStrength(conceptName, quizScore) {
  try {
    const saved = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
    const concept = findConcept(conceptName, saved)
    if (!concept) {
      console.warn('QUIZ: concept not found:', conceptName)
      return null
    }

    // Find or create entry in saved array
    let entry = saved.find(c => c.id === concept.id)
    if (!entry) {
      entry = { id: concept.id, name: concept.name, strength: 0, reviewHistory: [], reviewCount: 0 }
      saved.push(entry)
    }

    const oldStrength = entry.strength || 0
    const delta = getStrengthDelta(quizScore)
    const newStrength = Math.max(0, Math.min(100, oldStrength + delta))

    entry.strength = newStrength
    entry.lastReview = new Date().toISOString()
    entry.reviewCount = (entry.reviewCount || 0) + 1

    // Push to review history
    if (!entry.reviewHistory) entry.reviewHistory = []
    entry.reviewHistory.push({
      date: new Date().toISOString(),
      score: quizScore,
      source: 'quiz',
    })

    // Recalculate next review using spaced repetition
    const intervalIndex = Math.min(entry.reviewCount, INTERVALS.length - 1)
    // High score = push review further out, low score = review sooner
    const baseInterval = INTERVALS[intervalIndex]
    const adjustedInterval = quizScore >= 7
      ? baseInterval // on track
      : Math.max(1, Math.floor(baseInterval / 2)) // review sooner
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + adjustedInterval)
    entry.nextReview = nextDate.toISOString()

    localStorage.setItem('jos-concepts', JSON.stringify(saved))

    return { conceptName: entry.name, oldStrength, newStrength, delta }
  } catch (err) {
    console.error('QUIZ: updateConceptStrength failed:', err)
    return null
  }
}
