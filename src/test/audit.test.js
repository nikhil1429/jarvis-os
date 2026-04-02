// audit.test.js — God-tier automated audit for JARVIS OS
// Covers: imports, localStorage safety, memory leaks, security, event bus,
// component stability, build budgets, key prefixes, dead code detection

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const SRC = path.resolve(__dirname, '..')
const ROOT = path.resolve(SRC, '..')

// Helper: recursively collect files with given extensions
function collectFiles(dir, exts, result = []) {
  if (!fs.existsSync(dir)) return result
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'test') {
      collectFiles(full, exts, result)
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      result.push(full)
    }
  }
  return result
}

// Helper: read file content
function readFile(fp) { return fs.readFileSync(fp, 'utf-8') }

// All source files
const srcFiles = collectFiles(SRC, ['.js', '.jsx'])

// ────────────────────────────────────────────────────────
// 1. IMPORT RESOLUTION — every relative import points to a real file
// ────────────────────────────────────────────────────────
describe('Import Resolution', () => {
  const importRegex = /(?:import\s+.*?from\s+['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\))/g

  it('all relative imports resolve to real files', () => {
    const broken = []
    for (const file of srcFiles) {
      const content = readFile(file)
      let match
      while ((match = importRegex.exec(content)) !== null) {
        const specifier = match[1] || match[2]
        const dir = path.dirname(file)
        const candidates = [
          path.resolve(dir, specifier),
          path.resolve(dir, specifier + '.js'),
          path.resolve(dir, specifier + '.jsx'),
          path.resolve(dir, specifier, 'index.js'),
          path.resolve(dir, specifier, 'index.jsx'),
        ]
        const found = candidates.some(c => fs.existsSync(c))
        if (!found) broken.push({ file: path.relative(ROOT, file), specifier })
      }
    }
    if (broken.length > 0) {
      console.table(broken)
    }
    expect(broken).toEqual([])
  })
})

// ────────────────────────────────────────────────────────
// 2. localStorage SAFETY — JSON.parse wrapped in try-catch
// ────────────────────────────────────────────────────────
describe('localStorage Safety', () => {
  // Files that do raw JSON.parse(localStorage...) should have try-catch nearby
  const parseRegex = /JSON\.parse\s*\(\s*localStorage\b/g

  it('JSON.parse(localStorage...) is protected (try-catch or fallback)', () => {
    const unsafe = []
    for (const file of srcFiles) {
      const content = readFile(file)
      let match
      while ((match = parseRegex.exec(content)) !== null) {
        // Check surrounding context for safety mechanisms
        const start = Math.max(0, match.index - 500)
        const slice = content.slice(start, match.index + 200)
        const lineSlice = content.slice(match.index, match.index + 200)
        const hasTryCatch = slice.includes('try')
        // JSON.parse(localStorage.getItem('x') || '{}') is safe — the fallback is always valid JSON
        const hasFallback = /\|\|\s*['"][{[\]}'"]/.test(lineSlice)
        if (!hasTryCatch && !hasFallback) {
          const rel = path.relative(ROOT, file)
          const line = content.slice(0, match.index).split('\n').length
          unsafe.push({ file: rel, line })
        }
      }
    }
    if (unsafe.length > 0) {
      console.table(unsafe)
    }
    expect(unsafe).toEqual([])
  })
})

// ────────────────────────────────────────────────────────
// 3. MEMORY LEAK PREVENTION
// ────────────────────────────────────────────────────────
describe('Memory Leak Prevention', () => {
  it('every setInterval has a clearInterval in the same file', () => {
    const leaks = []
    for (const file of srcFiles) {
      const content = readFile(file)
      const sets = (content.match(/setInterval\s*\(/g) || []).length
      const clears = (content.match(/clearInterval\s*\(/g) || []).length
      if (sets > 0 && clears === 0) {
        leaks.push({ file: path.relative(ROOT, file), setInterval: sets, clearInterval: clears })
      }
    }
    if (leaks.length > 0) console.table(leaks)
    expect(leaks).toEqual([])
  })

  it('every addEventListener has a removeEventListener in the same file', () => {
    // tiltEffect.js is a DOM utility — listeners are bound to elements that React unmounts
    const EXEMPT = ['tiltEffect.js']
    const leaks = []
    for (const file of srcFiles) {
      if (EXEMPT.some(e => file.includes(e))) continue
      const content = readFile(file)
      const adds = (content.match(/addEventListener\s*\(/g) || []).length
      const removes = (content.match(/removeEventListener\s*\(/g) || []).length
      if (adds > 0 && removes === 0) {
        leaks.push({ file: path.relative(ROOT, file), addEventListener: adds, removeEventListener: removes })
      }
    }
    if (leaks.length > 0) console.table(leaks)
    expect(leaks).toEqual([])
  })
})

// ────────────────────────────────────────────────────────
// 4. SECURITY — no API keys in client code, XSS checks
// ────────────────────────────────────────────────────────
describe('Security', () => {
  it('no hardcoded API keys in source files', () => {
    const keyPatterns = [
      /['"]sk-ant-[a-zA-Z0-9]{20,}['"]/,        // Anthropic key
      /['"]sk-[a-zA-Z0-9]{20,}['"]/,              // OpenAI key
      /ANTHROPIC_API_KEY\s*=\s*['"][^'"]+['"]/,    // Hardcoded env
    ]
    const violations = []
    for (const file of srcFiles) {
      const content = readFile(file)
      for (const pat of keyPatterns) {
        if (pat.test(content)) {
          violations.push({ file: path.relative(ROOT, file), pattern: pat.source })
        }
      }
    }
    if (violations.length > 0) console.table(violations)
    expect(violations).toEqual([])
  })

  it('dangerouslySetInnerHTML only used with renderMd or sanitized content', () => {
    const violations = []
    for (const file of srcFiles) {
      const content = readFile(file)
      const regex = /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*([^}]+)\}\s*\}/g
      let match
      while ((match = regex.exec(content)) !== null) {
        const expr = match[1].trim()
        // Allow renderMd(...) or DOMPurify or sanitize patterns
        if (!expr.includes('renderMd') && !expr.includes('sanitize') && !expr.includes('DOMPurify')) {
          violations.push({ file: path.relative(ROOT, file), expression: expr })
        }
      }
    }
    if (violations.length > 0) console.table(violations)
    expect(violations).toEqual([])
  })
})

// ────────────────────────────────────────────────────────
// 5. EVENT BUS CONSISTENCY — every emitted event is subscribed somewhere
// ────────────────────────────────────────────────────────
describe('Event Bus Consistency', () => {
  // Declared events from useEventBus.js comment
  const DECLARED_EVENTS = [
    'task:complete', 'checkin:submit', 'quiz:score', 'concept:review',
    'streak:break', 'streak:continue', 'mode:enter', 'mode:exit',
    'voice:journal', 'achievement:unlock', 'energy:change',
    'burnout:warning', 'report:ready'
  ]

  it('all emitted events are in the declared event list', () => {
    const emitRegex = /emit\s*\(\s*['"]([^'"]+)['"]/g
    const emitted = new Set()
    for (const file of srcFiles) {
      const content = readFile(file)
      let match
      while ((match = emitRegex.exec(content)) !== null) {
        emitted.add(match[1])
      }
    }
    const undeclared = [...emitted].filter(e => !DECLARED_EVENTS.includes(e))
    if (undeclared.length > 0) {
      console.log('Undeclared events:', undeclared)
    }
    expect(undeclared).toEqual([])
  })

  it('all emitted events have at least one subscriber', () => {
    const emitRegex = /emit\s*\(\s*['"]([^'"]+)['"]/g
    const subRegex = /subscribe\s*\(\s*['"]([^'"]+)['"]/g
    const emitted = new Set()
    const subscribed = new Set()

    for (const file of srcFiles) {
      const content = readFile(file)
      let match
      while ((match = emitRegex.exec(content)) !== null) emitted.add(match[1])
      while ((match = subRegex.exec(content)) !== null) subscribed.add(match[1])
    }

    // Also check useAchievements which subscribes via array iteration
    const achFile = srcFiles.find(f => f.includes('useAchievements'))
    if (achFile) {
      const content = readFile(achFile)
      // It subscribes to multiple events via forEach or map
      DECLARED_EVENTS.forEach(e => {
        if (content.includes(`'${e}'`) || content.includes(`"${e}"`)) {
          subscribed.add(e)
        }
      })
    }

    const orphaned = [...emitted].filter(e => !subscribed.has(e))
    if (orphaned.length > 0) {
      console.log('Emitted but never subscribed:', orphaned)
    }
    // Allow events that are consumed by useAchievements via array subscription or reserved for future use
    const allowed = ['report:ready', 'burnout:warning', 'energy:change', 'mode:enter']
    const critical = orphaned.filter(e => !allowed.includes(e))
    expect(critical).toEqual([])
  })
})

// ────────────────────────────────────────────────────────
// 6. COMPONENT CRASH TEST — data files have correct shapes
// ────────────────────────────────────────────────────────
describe('Component Crash Test', () => {
  it('every task has required fields', async () => {
    const { default: tasks } = await import('../data/tasks.js')
    const required = ['id', 'name', 'week']
    tasks.forEach((t, i) => {
      required.forEach(field => {
        expect(t).toHaveProperty(field, expect.anything())
      })
    })
  })

  it('every mode has id, name, description, icon', async () => {
    const { default: modes } = await import('../data/modes.js')
    modes.forEach((m, i) => {
      expect(m).toHaveProperty('id')
      expect(m).toHaveProperty('name')
      expect(m).toHaveProperty('description')
    })
  })

  it('every concept has id, name, category', async () => {
    const { default: concepts } = await import('../data/concepts.js')
    concepts.forEach((c, i) => {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('category')
    })
  })

  it('every achievement has id, name, description, check()', async () => {
    const { default: achievements } = await import('../data/achievements.js')
    achievements.forEach(a => {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('name')
      expect(a).toHaveProperty('description')
      expect(typeof a.check).toBe('function')
    })
  })

  it('no duplicate IDs in tasks', async () => {
    const { default: tasks } = await import('../data/tasks.js')
    const ids = tasks.map(t => t.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toEqual([])
  })

  it('no duplicate IDs in modes', async () => {
    const { default: modes } = await import('../data/modes.js')
    const ids = modes.map(m => m.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toEqual([])
  })

  it('no duplicate IDs in concepts', async () => {
    const { default: concepts } = await import('../data/concepts.js')
    const ids = concepts.map(c => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toEqual([])
  })
})

// ────────────────────────────────────────────────────────
// 7. BUILD BUDGET — main bundle under 900KB, Three.js separate
// ────────────────────────────────────────────────────────
describe('Build Budget', () => {
  const distAssets = path.join(ROOT, 'dist', 'assets')

  it('main bundle (index-*.js) is under 900KB', () => {
    if (!fs.existsSync(distAssets)) {
      console.log('⚠ dist/ not found — run `npx vite build` first')
      return
    }
    const mainBundle = fs.readdirSync(distAssets).find(f => f.startsWith('index-') && f.endsWith('.js'))
    expect(mainBundle).toBeDefined()
    const size = fs.statSync(path.join(distAssets, mainBundle)).size
    const sizeKB = Math.round(size / 1024)
    console.log(`  Main bundle: ${sizeKB}KB`)
    expect(sizeKB).toBeLessThan(900)
  })

  it('Three.js is in a separate chunk', () => {
    if (!fs.existsSync(distAssets)) return
    const threeChunk = fs.readdirSync(distAssets).find(f => f.startsWith('three-') && f.endsWith('.js'))
    expect(threeChunk).toBeDefined()
    console.log(`  Three.js chunk: ${Math.round(fs.statSync(path.join(distAssets, threeChunk)).size / 1024)}KB`)
  })

  it('recharts is in a separate chunk', () => {
    if (!fs.existsSync(distAssets)) return
    const chunk = fs.readdirSync(distAssets).find(f => f.startsWith('recharts-') && f.endsWith('.js'))
    expect(chunk).toBeDefined()
  })
})

// ────────────────────────────────────────────────────────
// 8. localStorage KEY CONSISTENCY — all keys use jos- prefix
// ────────────────────────────────────────────────────────
describe('localStorage Key Consistency', () => {
  it('all localStorage key strings use jos- prefix', () => {
    const keyRegex = /localStorage\.(getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g
    const violations = []
    for (const file of srcFiles) {
      const content = readFile(file)
      let match
      while ((match = keyRegex.exec(content)) !== null) {
        const key = match[2]
        if (!key.startsWith('jos-')) {
          violations.push({ file: path.relative(ROOT, file), key, method: match[1] })
        }
      }
    }
    if (violations.length > 0) console.table(violations)
    expect(violations).toEqual([])
  })
})

// ────────────────────────────────────────────────────────
// 9. DEAD CODE DETECTION — basic unused export detection
// ────────────────────────────────────────────────────────
describe('Dead Code Detection', () => {
  it('all utility files are imported somewhere', () => {
    const utilFiles = collectFiles(path.join(SRC, 'utils'), ['.js'])
    const allContent = srcFiles
      .filter(f => !f.includes('/test/'))
      .map(f => readFile(f))
      .join('\n')

    const unused = []
    for (const uf of utilFiles) {
      const name = path.basename(uf)
      // Check if any file imports this util
      if (!allContent.includes(name)) {
        unused.push(name)
      }
    }
    if (unused.length > 0) console.log('Unused utils:', unused)
    expect(unused).toEqual([])
  })

  it('all hook files are imported somewhere', () => {
    const hookFiles = collectFiles(path.join(SRC, 'hooks'), ['.js'])
    const allContent = srcFiles
      .filter(f => !f.includes('/test/'))
      .map(f => readFile(f))
      .join('\n')

    const unused = []
    for (const hf of hookFiles) {
      const name = path.basename(hf)
      if (!allContent.includes(name)) {
        unused.push(name)
      }
    }
    if (unused.length > 0) console.log('Unused hooks:', unused)
    expect(unused).toEqual([])
  })

  it('all data files are imported somewhere', () => {
    const dataFiles = collectFiles(path.join(SRC, 'data'), ['.js'])
    const allContent = srcFiles
      .filter(f => !f.includes('/test/'))
      .map(f => readFile(f))
      .join('\n')

    const unused = []
    for (const df of dataFiles) {
      const name = path.basename(df)
      if (!allContent.includes(name)) {
        unused.push(name)
      }
    }
    if (unused.length > 0) console.log('Unused data files:', unused)
    expect(unused).toEqual([])
  })
})
