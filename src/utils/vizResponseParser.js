// vizResponseParser.js — Scans JARVIS responses for data patterns → viz instructions

export function parseResponseForViz(responseText, mode) {
  const viz = []
  // Quiz scores
  const quizRe = /\[QUIZ_SCORE:(\d+)\/10:([^\]]+)\]/g
  let m
  while ((m = quizRe.exec(responseText)) !== null) {
    viz.push({ type: 'quiz-score', score: parseInt(m[1]), concept: m[2].trim() })
  }
  // Comparison
  if (/(?:week|w)\s*\d+\s*(?:vs|versus|compared to|→)/i.test(responseText) ||
      /(?:improved|declined|increased|decreased|dropped|rose|grew)\s+(?:from|by)\s+\d/i.test(responseText) ||
      /(?:this week|last week|previous week)/i.test(responseText)) {
    viz.push({ type: 'comparison' })
  }
  // Trend
  if (/pattern\s+(?:detected|identified|noticed)/i.test(responseText) ||
      /(?:trend|trajectory|progression|consistently)/i.test(responseText)) {
    viz.push({ type: 'trend' })
  }
  return viz
}
