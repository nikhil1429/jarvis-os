// highlightCapture.js — Captures breakthrough moments and significant sessions

export function captureHighlight(highlight) {
  try {
    const highlights = JSON.parse(localStorage.getItem('jos-highlights') || '[]')
    highlights.push({ ...highlight, capturedAt: new Date().toISOString() })
    if (highlights.length > 50) highlights.splice(0, highlights.length - 50)
    localStorage.setItem('jos-highlights', JSON.stringify(highlights))
  } catch { /* ok */ }
}

export function getHighlights() {
  try { return JSON.parse(localStorage.getItem('jos-highlights') || '[]') } catch { return [] }
}
