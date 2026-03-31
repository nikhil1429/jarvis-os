// useAutoBackup.js — Sunday auto-backup of all localStorage data
// WHY: Protection against accidental data loss. Every Sunday, snapshots all
// jos-* keys into one backup. Manual backup/restore also available.

import { useState, useEffect, useCallback } from 'react'

function collectAllKeys() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('jos-')) {
      try { data[key] = JSON.parse(localStorage.getItem(key)) }
      catch { data[key] = localStorage.getItem(key) }
    }
  }
  return data
}

export default function useAutoBackup() {
  const [lastBackup, setLastBackup] = useState(() => {
    try {
      const backup = JSON.parse(localStorage.getItem('jos-backup') || '{}')
      return backup.lastAutoBackup || null
    } catch { return null }
  })

  // Sunday auto-backup check on mount
  useEffect(() => {
    const now = new Date()
    if (now.getDay() !== 0) return // Not Sunday

    try {
      const existing = JSON.parse(localStorage.getItem('jos-backup') || '{}')
      const lastDate = existing.lastAutoBackup ? new Date(existing.lastAutoBackup) : null
      const today = now.toISOString().split('T')[0]

      // Already backed up this week?
      if (lastDate && lastDate.toISOString().split('T')[0] === today) return

      // Do the backup
      const data = collectAllKeys()
      if (Object.keys(data).length === 0) return // Don't backup empty

      localStorage.setItem('jos-backup', JSON.stringify({
        lastAutoBackup: now.toISOString(),
        backupData: data,
      }))
      setLastBackup(now.toISOString())
      console.log('AUTO-BACKUP: Sunday backup complete,', Object.keys(data).length, 'keys saved')
    } catch (err) {
      console.error('AUTO-BACKUP: failed', err)
    }
  }, [])

  const doBackup = useCallback(() => {
    const data = collectAllKeys()
    if (Object.keys(data).length === 0) return null
    const backup = { lastAutoBackup: new Date().toISOString(), backupData: data }
    localStorage.setItem('jos-backup', JSON.stringify(backup))
    setLastBackup(backup.lastAutoBackup)
    console.log('MANUAL BACKUP: complete,', Object.keys(data).length, 'keys')
    return backup
  }, [])

  const restoreFromBackup = useCallback((backupJson) => {
    try {
      const data = typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson
      const keys = data.backupData || data
      Object.entries(keys).forEach(([key, value]) => {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      })
      console.log('RESTORE: complete,', Object.keys(keys).length, 'keys restored')
      return true
    } catch (err) {
      console.error('RESTORE: failed', err)
      return false
    }
  }, [])

  return { lastBackup, doBackup, restoreFromBackup }
}
