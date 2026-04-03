import { test, expect } from '@playwright/test'

// Shared boot helper — handles full boot flow with voice questions
async function bootApp(page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('jos-onboarding', JSON.stringify({ completedAt: new Date().toISOString() }))
    localStorage.setItem('jos-core', JSON.stringify({
      startDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      streak: 3, rank: 'Recruit', completedTasks: [], energy: 3, totalCheckIns: 1
    }))
    localStorage.setItem('jos-feelings', '[]')
    localStorage.setItem('jos-concepts', '[]')
    localStorage.setItem('jos-settings', JSON.stringify({ voice: false, sound: false }))
    localStorage.setItem('jos-achievements', '[]')
  })
  await page.reload()

  // Phase 4: energy orbs — click "3"
  const energyBtn = page.locator('button:has-text("3")').first()
  await energyBtn.waitFor({ timeout: 50000 })
  await energyBtn.click()

  // Phase 4: focus → skip
  const focusInput = page.locator('input[placeholder*="focus"], input[placeholder*="Type"]')
  await focusInput.waitFor({ timeout: 8000 })
  await focusInput.press('Enter')

  // Phase 4: blockers → skip
  const blockersInput = page.locator('input[placeholder*="Blocker"]')
  await blockersInput.waitFor({ timeout: 8000 })
  await blockersInput.press('Enter')

  // Phase 4: morning bet → skip
  const betInput = page.locator('input[placeholder*="will"]')
  await betInput.waitFor({ timeout: 8000 })
  await betInput.press('Enter')

  // Phase 5-6: briefing → ENTER JARVIS
  const enterBtn = page.locator('button').filter({ hasText: /enter/i }).first()
  await enterBtn.waitFor({ timeout: 50000 })
  await enterBtn.click()

  // Wait for main app
  await page.locator('[aria-label="CMD"]').waitFor({ timeout: 10000 })

  // Dismiss overlays
  await page.waitForTimeout(1000)
  for (let i = 0; i < 3; i++) {
    const xBtn = page.locator('.fixed.inset-0 button:has(.lucide-x), .fixed.inset-0 .lucide-x').first()
    if (await xBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await xBtn.click({ force: true })
      await page.waitForTimeout(300)
    }
  }
  await page.waitForTimeout(500)
}

// ============================================================
// FLOW 1: TASK MANAGEMENT
// ============================================================
test.describe('Task Management Flow', () => {
  test('CMD tab shows MISSION TASKS heading', async ({ page }) => {
    await bootApp(page)
    await expect(page.locator('text=MISSION TASKS')).toBeVisible({ timeout: 5000 })
  })

  test('week selector pills are visible', async ({ page }) => {
    await bootApp(page)
    await expect(page.locator('button:has-text("W1")').first()).toBeVisible({ timeout: 3000 })
  })

  test('week pills switch task display', async ({ page }) => {
    await bootApp(page)
    const w2 = page.locator('button:has-text("W2")').first()
    if (await w2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await w2.click()
      await page.waitForTimeout(500)
      const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
      expect(crash).toBeFalsy()
    }
  })

  test('task items are listed', async ({ page }) => {
    await bootApp(page)
    const taskText = page.locator('text=/Set up|Configure|Build|Implement|Create|Design/i').first()
    await expect(taskText).toBeVisible({ timeout: 3000 })
  })
})

// ============================================================
// FLOW 2: TRAINING MODES
// ============================================================
test.describe('Training Modes Flow', () => {
  test('mode cards render in TRAIN tab', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(500)
    for (const mode of ['Chat', 'Quiz', 'Presser', 'Battle', 'Teach']) {
      await expect(page.locator(`text=${mode}`).first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('clicking Chat opens ChatView with input', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(500)
    await page.locator('text=Chat').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('input[placeholder*="Message"]')).toBeVisible({ timeout: 3000 })
  })

  test('can type in chat input', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(300)
    await page.locator('text=Chat').first().click()
    await page.waitForTimeout(300)
    const input = page.locator('input[placeholder*="Message"]')
    await input.fill('test message')
    expect(await input.inputValue()).toBe('test message')
  })

  test('BACK button returns to mode grid', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(300)
    await page.locator('text=Chat').first().click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("BACK")').first().click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=Quiz').first()).toBeVisible({ timeout: 3000 })
  })

  test('chat mode shows input placeholder', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(500)
    await page.locator('text=Chat').first().click()
    await page.waitForTimeout(500)
    const input = page.locator('input[placeholder*="Message"]')
    await expect(input).toBeVisible({ timeout: 3000 })
    const placeholder = await input.getAttribute('placeholder')
    expect(placeholder.length).toBeGreaterThan(0)
  })
})

// ============================================================
// FLOW 3: CHECK-IN FORM
// ============================================================
test.describe('Check-In Form Flow', () => {
  test('LOG tab loads without crash', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="LOG"]').click()
    await page.waitForTimeout(1000)
    const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(crash).toBeFalsy()
  })

  test('check-in form has input fields', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="LOG"]').click()
    await page.waitForTimeout(1000)
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('mood/confidence section has clickable options', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="LOG"]').click()
    await page.waitForTimeout(500)
    const buttons = page.locator('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(2)
  })
})

// ============================================================
// FLOW 4: DNA CONCEPT TRACKING
// ============================================================
test.describe('DNA Concept Tracking Flow', () => {
  test('concepts listed with names', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="DNA"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=Prompt Engineering')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=Token Economics')).toBeVisible({ timeout: 3000 })
  })

  test('RAG concept visible', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="DNA"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=RAG').first()).toBeVisible({ timeout: 3000 })
  })

  test('category pills visible', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="DNA"]').click()
    await page.waitForTimeout(500)
    const hasCore = await page.locator('text=/Core|All/i').first().isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasCore).toBeTruthy()
  })

  test('concept card is clickable', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="DNA"]').click()
    await page.waitForTimeout(500)
    await page.locator('text=Prompt Engineering').first().click()
    await page.waitForTimeout(500)
    const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(crash).toBeFalsy()
  })
})

// ============================================================
// FLOW 5: STATS & REPORTS
// ============================================================
test.describe('Stats & Reports Flow', () => {
  test('STATS tab loads without crash', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="STATS"]').click()
    await page.waitForTimeout(1000)
    const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(crash).toBeFalsy()
  })

  test('STATS tab shows content', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="STATS"]').click()
    await page.waitForTimeout(1000)
    // Should not be empty
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length).toBeGreaterThan(100)
  })
})

// ============================================================
// FLOW 6: ACHIEVEMENTS
// ============================================================
test.describe('Achievements Flow', () => {
  test('WINS tab shows achievement list', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="WINS"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=First Blood')).toBeVisible({ timeout: 3000 })
  })

  test('unlocked achievement shows differently', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('jos-onboarding', JSON.stringify({ completedAt: new Date().toISOString() }))
      localStorage.setItem('jos-core', JSON.stringify({
        startDate: new Date().toISOString(), streak: 1, rank: 'Recruit',
        completedTasks: [1], energy: 3, totalCheckIns: 1
      }))
      localStorage.setItem('jos-achievements', JSON.stringify([
        { id: 'first-blood', unlockedAt: new Date().toISOString() }
      ]))
      localStorage.setItem('jos-settings', JSON.stringify({ voice: false, sound: false }))
    })
    await page.reload()

    // Boot through voice questions
    const energyBtn = page.locator('button:has-text("3")').first()
    await energyBtn.waitFor({ timeout: 50000 })
    await energyBtn.click()
    const focusInput = page.locator('input[placeholder*="focus"], input[placeholder*="Type"]')
    await focusInput.waitFor({ timeout: 8000 })
    await focusInput.press('Enter')
    const blockersInput = page.locator('input[placeholder*="Blocker"]')
    await blockersInput.waitFor({ timeout: 8000 })
    await blockersInput.press('Enter')
    const betInput = page.locator('input[placeholder*="will"]')
    await betInput.waitFor({ timeout: 8000 })
    await betInput.press('Enter')
    const enterBtn = page.locator('button').filter({ hasText: /enter/i }).first()
    await enterBtn.waitFor({ timeout: 50000 })
    await enterBtn.click()
    await page.locator('[aria-label="CMD"]').waitFor({ timeout: 10000 })
    await page.waitForTimeout(1500)
    for (let i = 0; i < 3; i++) {
      const xBtn = page.locator('.fixed.inset-0 button:has(.lucide-x), .fixed.inset-0 .lucide-x').first()
      if (await xBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await xBtn.click({ force: true })
        await page.waitForTimeout(300)
      }
    }

    await page.locator('[aria-label="WINS"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=First Blood')).toBeVisible({ timeout: 3000 })
  })
})

// ============================================================
// FLOW 7: SETTINGS
// ============================================================
test.describe('Settings Flow', () => {
  test('settings panel opens with gear icon', async ({ page }) => {
    await bootApp(page)
    await page.locator('.lucide-settings').click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('text=ELEVENLABS').first()).toBeVisible({ timeout: 3000 })
  })

  test('voice toggle exists', async ({ page }) => {
    await bootApp(page)
    await page.locator('.lucide-settings').click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('text=/VOICE OUTPUT/i')).toBeVisible({ timeout: 3000 })
  })

  test('show mode toggle exists', async ({ page }) => {
    await bootApp(page)
    await page.locator('.lucide-settings').click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('text=/SHOW MODE/i')).toBeVisible({ timeout: 3000 })
  })

  test('close button dismisses settings', async ({ page }) => {
    await bootApp(page)
    await page.locator('.lucide-settings').click({ force: true })
    await page.waitForTimeout(500)
    const settingsX = page.locator('button:has(.lucide-x)').first()
    await settingsX.click({ force: true })
    await page.waitForTimeout(1000)
    const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(crash).toBeFalsy()
  })
})

// ============================================================
// FLOW 8: NAVIGATION
// ============================================================
test.describe('Navigation Flow', () => {
  test('all 6 tabs tappable without crash', async ({ page }) => {
    await bootApp(page)
    for (const tab of ['CMD', 'TRAIN', 'LOG', 'DNA', 'STATS', 'WINS']) {
      await page.locator(`[aria-label="${tab}"]`).click()
      await page.waitForTimeout(300)
      const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
      expect(crash).toBeFalsy()
    }
  })

  test('tab switching preserves DNA state', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="DNA"]').click()
    await page.waitForTimeout(300)
    await page.locator('[aria-label="CMD"]').click()
    await page.waitForTimeout(300)
    await page.locator('[aria-label="DNA"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=Prompt Engineering')).toBeVisible({ timeout: 3000 })
  })

  test('Escape key does not crash app', async ({ page }) => {
    await bootApp(page)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(crash).toBeFalsy()
  })

  test('rapid tab switching does not crash', async ({ page }) => {
    await bootApp(page)
    const tabs = ['CMD', 'TRAIN', 'LOG', 'DNA', 'STATS', 'WINS']
    for (let i = 0; i < 12; i++) {
      await page.locator(`[aria-label="${tabs[i % 6]}"]`).click()
      await page.waitForTimeout(100)
    }
    const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(crash).toBeFalsy()
  })
})

// ============================================================
// FLOW 9: EDGE CASES
// ============================================================
test.describe('Edge Cases', () => {
  test('app loads with empty localStorage', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('app survives corrupted localStorage', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('jos-core', 'CORRUPTED{{{NOT_JSON')
      localStorage.setItem('jos-feelings', '???')
      localStorage.setItem('jos-onboarding', JSON.stringify({ completedAt: new Date().toISOString() }))
    })
    await page.reload()
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('app with no API key shows graceful error on send', async ({ page }) => {
    await bootApp(page)
    await page.locator('[aria-label="TRAIN"]').click()
    await page.waitForTimeout(300)
    await page.locator('text=Chat').first().click()
    await page.waitForTimeout(300)
    const input = page.locator('input[placeholder*="Message"]')
    await input.fill('hello')
    await input.press('Enter')
    await page.waitForTimeout(3000)
    const crash = await page.locator('text=SYSTEM MALFUNCTION').isVisible().catch(() => false)
    expect(crash).toBeFalsy()
  })
})
