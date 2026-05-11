import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/eventLogger.js', () => ({
  logEvent: vi.fn(() => Promise.resolve({ success: true, eventId: 'mock-id' })),
  SOURCE_LAYERS: Object.freeze({
    L1_GEMINI_LIVE: 'L1_GEMINI_LIVE',
    L2_PRO_ENGINEER: 'L2_PRO_ENGINEER',
    L3_PRO_TRAINING: 'L3_PRO_TRAINING',
    L4_OPUS: 'L4_OPUS',
    L5_CLOUD_TTS: 'L5_CLOUD_TTS',
    APP_CLIENT: 'APP_CLIENT',
  }),
}));

import { logEvent } from '../utils/eventLogger.js';
import {
  logCheckinSubmitted,
  logQuizCompleted,
  logConceptUpdated,
  logCommitmentCreated,
  logTabSwitched,
  logChatTurn,
} from '../events/sources.js';

describe('event sources — typed helpers', () => {
  beforeEach(() => logEvent.mockClear());

  it('logCheckinSubmitted emits CHECKIN_SUBMITTED w/ domain=mind, APP_CLIENT layer', () => {
    logCheckinSubmitted({
      date: '2026-05-11',
      confidence: 7, focus: 6, motivation: 8, sleep: 5,
      meds: true, mood: 'focused', energy: 4,
      learned: 'x', struggled: 'y', journal: 'z',
      chai: 2, lunch: true, formLevel: 'full',
      timestamp: '2026-05-11T10:00:00Z',
    });
    expect(logEvent).toHaveBeenCalledOnce();
    const call = logEvent.mock.calls[0][0];
    expect(call.eventType).toBe('CHECKIN_SUBMITTED');
    expect(call.domain).toBe('mind');
    expect(call.sourceLayer).toBe('APP_CLIENT');
    expect(call.payload.date).toBe('2026-05-11');
    expect(call.payload.confidence).toBe(7);
    expect(call.payload.submittedAt).toBe('2026-05-11T10:00:00Z');
  });

  it('logCheckinSubmitted auto-fills submittedAt if entry.timestamp missing', () => {
    logCheckinSubmitted({ date: '2026-05-11' });
    const call = logEvent.mock.calls[0][0];
    expect(call.payload.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('logQuizCompleted emits QUIZ_COMPLETED w/ domain=mind, conceptId nullable', () => {
    logQuizCompleted({ mode: 'concepts', score: 8, total: 10 });
    const call = logEvent.mock.calls[0][0];
    expect(call.eventType).toBe('QUIZ_COMPLETED');
    expect(call.domain).toBe('mind');
    expect(call.sourceLayer).toBe('APP_CLIENT');
    expect(call.payload.mode).toBe('concepts');
    expect(call.payload.score).toBe(8);
    expect(call.payload.total).toBe(10);
    expect(call.payload.conceptId).toBeNull();
  });

  it('logConceptUpdated emits CONCEPT_UPDATED w/ computed delta', () => {
    logConceptUpdated({ conceptId: 'attention', before: 3, after: 5, action: 'slider' });
    const call = logEvent.mock.calls[0][0];
    expect(call.eventType).toBe('CONCEPT_UPDATED');
    expect(call.domain).toBe('mind');
    expect(call.payload.conceptId).toBe('attention');
    expect(call.payload.before).toBe(3);
    expect(call.payload.after).toBe(5);
    expect(call.payload.delta).toBe(2);
    expect(call.payload.action).toBe('slider');
  });

  it('logCommitmentCreated emits COMMITMENT_CREATED w/ domain=work, preserves caller fields', () => {
    logCommitmentCreated({ id: 'c1', text: 'ship block 7', dueDate: '2026-05-18' });
    const call = logEvent.mock.calls[0][0];
    expect(call.eventType).toBe('COMMITMENT_CREATED');
    expect(call.domain).toBe('work');
    expect(call.payload.id).toBe('c1');
    expect(call.payload.text).toBe('ship block 7');
    expect(call.payload.dueDate).toBe('2026-05-18');
    expect(call.payload.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('logTabSwitched emits TAB_SWITCHED w/ domain=system, from/to preserved (no throttle)', () => {
    logTabSwitched({ from: 'cmd', to: 'train' });
    const call = logEvent.mock.calls[0][0];
    expect(call.eventType).toBe('TAB_SWITCHED');
    expect(call.domain).toBe('system');
    expect(call.payload.from).toBe('cmd');
    expect(call.payload.to).toBe('train');
    expect(call.payload.switchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('logChatTurn emits CHAT_TURN w/ conversationId reference (Q2: no inline message body)', () => {
    logChatTurn({
      conversationId: '019e1253-eb37-b0c8-5037-906cfda9d7bb',
      turnIndex: 0,
      role: 'user',
      mode: 'mock-interview',
      model: 'claude-sonnet-4-6',
      tokenCount: 142,
    });
    const call = logEvent.mock.calls[0][0];
    expect(call.eventType).toBe('CHAT_TURN');
    expect(call.domain).toBe('mind');
    expect(call.payload.conversationId).toBe('019e1253-eb37-b0c8-5037-906cfda9d7bb');
    expect(call.payload.turnIndex).toBe(0);
    expect(call.payload.role).toBe('user');
    expect(call.payload.mode).toBe('mock-interview');
    expect(call.payload.model).toBe('claude-sonnet-4-6');
    expect(call.payload.tokenCount).toBe(142);
    // Confirm Q2 decision: no inline text body in event payload.
    expect(call.payload.text).toBeUndefined();
    expect(call.payload.content).toBeUndefined();
    expect(call.payload.message).toBeUndefined();
  });

  it('all 6 helpers return a promise', async () => {
    const results = [
      logCheckinSubmitted({ date: '2026-05-11' }),
      logQuizCompleted({ mode: 'm', score: 1, total: 1 }),
      logConceptUpdated({ conceptId: 'c', before: 0, after: 1, action: 'a' }),
      logCommitmentCreated({ id: 'c' }),
      logTabSwitched({ from: 'a', to: 'b' }),
      logChatTurn({ conversationId: 'x', turnIndex: 0, role: 'user', mode: 'm', model: 'm' }),
    ];
    for (const r of results) {
      expect(r).toBeInstanceOf(Promise);
      const out = await r;
      expect(out.success).toBe(true);
    }
  });
});
