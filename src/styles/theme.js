// theme.js — JARVIS OS Design Token Constants
// WHY: A single source of truth for all design values as JS objects.
// Useful when you need theme values in JS (e.g., Three.js materials, canvas drawing,
// Recharts colors, dynamic inline styles) where Tailwind classes can't reach.

const colors = {
  void: '#020a13',
  card: '#061422',
  border: '#0d2137',

  cyan: '#00b4d8',
  cyanNeon: '#00f0ff',
  gold: '#d4a853',

  text: '#d0e8f8',
  textDim: '#5a7a94',
  textMuted: '#2a4a60',
}

const fonts = {
  display: "'Rajdhani', sans-serif",
  body: "'Exo 2', sans-serif",
  mono: "'Share Tech Mono', monospace",
}

// WHY spacing scale: consistent 4px base grid keeps everything aligned
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
}

const shadows = {
  cyanGlow: '0 0 10px rgba(0, 180, 216, 0.3), 0 0 20px rgba(0, 180, 216, 0.1)',
  cyanIntense: '0 0 15px rgba(0, 240, 255, 0.5), 0 0 30px rgba(0, 240, 255, 0.2)',
  goldGlow: '0 0 10px rgba(212, 168, 83, 0.3), 0 0 20px rgba(212, 168, 83, 0.1)',
}

const theme = { colors, fonts, spacing, shadows }

export { colors, fonts, spacing, shadows }
export default theme
