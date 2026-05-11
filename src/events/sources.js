// sources.js — typed event factories for client-side emission to jarvis_events
/**
 * sources
 *
 * Block 7 wiring strategy: every component that writes localStorage also calls
 * a typed factory here, which forwards to `eventLogger.logEvent`. Concentrating
 * event_type strings, domains, sourceLayer, and payload shape in one module
 * means a contract change touches this file only — even if 50+ call sites exist.
 *
 * Contract per helper:
 *   - Returns the logEvent promise. Callers fire-and-forget; await only if they
 *     need to confirm the write landed.
 *   - sourceLayer is always APP_CLIENT (these helpers run in the browser).
 *   - Domain is per-event semantic — 'mind' for cognition/learning,
 *     'work' for goals/commitments, 'system' for app telemetry.
 *   - Timestamps are ISO at call time unless the caller supplies one
 *     (check-in already has a `timestamp` field, etc.).
 *
 * Bible v4: every event landing in jarvis_events is the authoritative record.
 * State-projection tables (jarvis_check_ins, jarvis_concepts, etc.) are
 * derived async via Database Webhooks → Edge Functions. These helpers do NOT
 * write to projection tables directly — they only emit to the events firehose.
 */

import { logEvent, SOURCE_LAYERS } from '../utils/eventLogger.js';

const APP = SOURCE_LAYERS.APP_CLIENT;

/**
 * Daily check-in submitted (CheckInForm.jsx).
 * Projection target: jarvis_check_ins.
 * @param {object} entry — full check-in row as written to jos-feelings
 */
export function logCheckinSubmitted(entry) {
  return logEvent({
    eventType: 'CHECKIN_SUBMITTED',
    domain: 'mind',
    sourceLayer: APP,
    payload: {
      date: entry.date,
      confidence: entry.confidence,
      focus: entry.focus,
      motivation: entry.motivation,
      sleep: entry.sleep,
      meds: entry.meds,
      mood: entry.mood,
      energy: entry.energy,
      learned: entry.learned,
      struggled: entry.struggled,
      journal: entry.journal,
      chai: entry.chai,
      lunch: entry.lunch,
      formLevel: entry.formLevel,
      submittedAt: entry.timestamp || new Date().toISOString(),
    },
  });
}

/**
 * Quiz completed in a training mode.
 * @param {object} args
 * @param {string} args.mode        e.g. 'concepts', 'mock-interview'
 * @param {number} args.score       correct answers
 * @param {number} args.total       total questions
 * @param {string} [args.conceptId] concept_id if quiz was concept-scoped
 */
export function logQuizCompleted({ mode, score, total, conceptId = null }) {
  return logEvent({
    eventType: 'QUIZ_COMPLETED',
    domain: 'mind',
    sourceLayer: APP,
    payload: {
      mode,
      score,
      total,
      conceptId,
      completedAt: new Date().toISOString(),
    },
  });
}

/**
 * Concept strength updated (DnaTab slider, mark-reviewed, etc.).
 * @param {object} args
 * @param {string|number} args.conceptId
 * @param {number} args.before — strength before change
 * @param {number} args.after  — strength after change
 * @param {string} args.action — 'slider' | 'reviewed' | 'notes' | etc.
 */
export function logConceptUpdated({ conceptId, before, after, action }) {
  return logEvent({
    eventType: 'CONCEPT_UPDATED',
    domain: 'mind',
    sourceLayer: APP,
    payload: {
      conceptId,
      before,
      after,
      delta: after - before,
      action,
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Commitment created (CMD tab commitments).
 * @param {object} commitment — full commitment object as written to jos-commitments
 */
export function logCommitmentCreated(commitment) {
  return logEvent({
    eventType: 'COMMITMENT_CREATED',
    domain: 'work',
    sourceLayer: APP,
    payload: {
      ...commitment,
      createdAt: commitment.createdAt || new Date().toISOString(),
    },
  });
}

/**
 * Tab switched (BottomNav). Full fidelity per Block 7 decision Q1 — every tap
 * emits; bounce-back patterns are real ADHD signal. Throttling deferred to
 * Layer 2 analysis, not the logging boundary.
 * @param {object} args
 * @param {string} args.from — tab key before switch (may be same as to on remount)
 * @param {string} args.to   — tab key after switch
 */
export function logTabSwitched({ from, to }) {
  return logEvent({
    eventType: 'TAB_SWITCHED',
    domain: 'system',
    sourceLayer: APP,
    payload: {
      from,
      to,
      switchedAt: new Date().toISOString(),
    },
  });
}

/**
 * Chat turn (TrainTab ChatView). Per Block 7 decision Q2, full message text
 * lives in jarvis_conversations; this event references that row by conversationId
 * and carries only routing/metadata. Caller is responsible for creating or
 * updating the jarvis_conversations row alongside this emit.
 * @param {object} args
 * @param {string} args.conversationId — UUID of the jarvis_conversations row
 * @param {number} args.turnIndex      — 0-based ordinal within conversation
 * @param {'user'|'assistant'} args.role
 * @param {string} args.mode           — training mode key
 * @param {string} args.model          — model id that handled the turn
 * @param {number} [args.tokenCount]   — optional token count for cost tracking
 */
export function logChatTurn({ conversationId, turnIndex, role, mode, model, tokenCount = null }) {
  return logEvent({
    eventType: 'CHAT_TURN',
    domain: 'mind',
    sourceLayer: APP,
    payload: {
      conversationId,
      turnIndex,
      role,
      mode,
      model,
      tokenCount,
      turnAt: new Date().toISOString(),
    },
  });
}
