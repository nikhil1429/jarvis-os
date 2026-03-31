// tailwind.config.js — JARVIS OS Design System
// WHY: Centralizes the Iron Man 2050 aesthetic into Tailwind utility classes.
// Every color, font, animation, and shadow from the CLAUDE.md design system lives here
// so we can use classes like `bg-void`, `text-cyan`, `font-display` everywhere.

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        void: '#020a13',       // Deep navy void — the "space" behind everything
        card: '#061422',       // Panel/card background — slightly lighter than void
        border: '#0d2137',     // Subtle borders between panels

        // Accent colors
        cyan: {
          DEFAULT: '#00b4d8',  // Ice cyan — JARVIS signature color for most UI
          neon: '#00f0ff',     // Brighter cyan for active states, scan lines, glows
        },
        gold: '#d4a853',       // Arc reactor warm accent — used sparingly for highlights

        // Text hierarchy
        text: {
          DEFAULT: '#d0e8f8',  // Primary text — light cyan-white, easy on dark bg
          dim: '#5a7a94',      // Secondary/label text — readable but recedes
          muted: '#2a4a60',    // Tertiary/disabled — barely visible, structural
        },
      },

      fontFamily: {
        // WHY three fonts: each serves a different cognitive purpose
        display: ['Rajdhani', 'sans-serif'],      // Headlines, numbers, HUD labels — angular, techy
        body: ['"Exo 2"', 'sans-serif'],           // Body text, paragraphs — clean, readable
        mono: ['"Share Tech Mono"', 'monospace'],  // Data readouts, logs, code — fixed-width, sci-fi
      },

      animation: {
        // WHY breathing: creates "alive" feeling — reactor pulses, status dots glow
        breathe: 'breathe 3s ease-in-out infinite',
        // WHY scan: horizontal sweep mimics JARVIS scanning/processing
        scan: 'scan 2s linear infinite',
        // WHY reactor-spin: the arc reactor never stops — constant rotation
        'reactor-spin': 'reactor-spin 8s linear infinite',
        // WHY glow-pulse: subtle box-shadow pulse for active/selected elements
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        // WHY float: gentle vertical bob for floating HUD elements
        float: 'float 6s ease-in-out infinite',
      },

      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'reactor-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px #00b4d8, 0 0 10px rgba(0, 180, 216, 0.3)' },
          '50%': { boxShadow: '0 0 15px #00f0ff, 0 0 30px rgba(0, 240, 255, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },

      boxShadow: {
        // WHY three glow levels: subtle for borders, medium for focus, intense for active
        'cyan-glow': '0 0 10px rgba(0, 180, 216, 0.3), 0 0 20px rgba(0, 180, 216, 0.1)',
        'cyan-intense': '0 0 15px rgba(0, 240, 255, 0.5), 0 0 30px rgba(0, 240, 255, 0.2)',
        'gold-glow': '0 0 10px rgba(212, 168, 83, 0.3), 0 0 20px rgba(212, 168, 83, 0.1)',
      },
    },
  },
  plugins: [],
}
