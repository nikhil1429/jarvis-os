// Settings.jsx — Dark overlay modal for all JARVIS OS settings
// WHY: Central place for all toggles and configuration. Phase 6 upgrade:
// Voice Input, Voice Output, Auto-Conversation, and Voice Speed controls.

import { useState } from 'react'
import { X, Download, Upload, Trash2, Volume2, VolumeX, Eye, EyeOff, Mic, MicOff, MessageCircle, AlertTriangle } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'

export default function Settings({ isOpen, onClose }) {
  const { get, set } = useStorage()
  const [confirmReset, setConfirmReset] = useState(false)
  const [importStatus, setImportStatus] = useState(null)

  if (!isOpen) return null

  const settings = get('settings') || {}

  const updateSetting = (key, value) => {
    set('settings', { ...settings, [key]: value })
  }

  const handleExport = () => {
    const data = {}
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('jos-')) {
        try { data[key] = JSON.parse(localStorage.getItem(key)) }
        catch { data[key] = localStorage.getItem(key) }
      }
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jarvis-os-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith('jos-')) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
          }
        })
        setImportStatus('success')
        setTimeout(() => setImportStatus(null), 3000)
      } catch {
        setImportStatus('error')
        setTimeout(() => setImportStatus(null), 3000)
      }
    }
    input.click()
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('jos-')) localStorage.removeItem(key)
    })
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md max-h-[85vh] overflow-y-auto mx-4">
        <div className="hud-panel-inner p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-cyan tracking-wider uppercase neon-heading">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-cyan transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-5">
            {/* ElevenLabs API Key */}
            <div>
              <label className="font-mono text-[10px] text-text-dim tracking-wider block mb-1.5">
                ELEVENLABS API KEY
              </label>
              <input
                type="password"
                value={settings.elevenLabsKey || ''}
                onChange={e => updateSetting('elevenLabsKey', e.target.value)}
                placeholder="sk-..."
                className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-xs
                  text-text placeholder:text-text-muted focus:outline-none focus:border-cyan transition-colors"
              />
            </div>

            {/* Voice section header */}
            <div className="border-t border-border pt-4">
              <p className="font-mono text-[9px] text-text-muted tracking-widest mb-3">VOICE SYSTEM</p>
            </div>

            {/* Voice Output (TTS) */}
            <ToggleRow
              icon={settings.voice ? <Volume2 size={16} /> : <VolumeX size={16} />}
              label="VOICE OUTPUT"
              sublabel="JARVIS speaks responses aloud"
              value={settings.voice || false}
              onChange={v => updateSetting('voice', v)}
            />

            {/* Voice Input (STT) */}
            <ToggleRow
              icon={settings.voiceInput !== false ? <Mic size={16} /> : <MicOff size={16} />}
              label="VOICE INPUT"
              sublabel="Microphone for speech-to-text"
              value={settings.voiceInput !== false}
              onChange={v => updateSetting('voiceInput', v)}
            />

            {/* Auto-Conversation */}
            <ToggleRow
              icon={<MessageCircle size={16} />}
              label="AUTO-CONVERSATION"
              sublabel="Mic reactivates after JARVIS speaks"
              value={settings.autoConversation !== false}
              onChange={v => updateSetting('autoConversation', v)}
            />

            {/* Voice Speed */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs text-text-dim tracking-wider">VOICE SPEED</span>
                <span className="font-mono text-xs text-cyan">{(settings.voiceSpeed || 1.0).toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.1"
                value={settings.voiceSpeed || 1.0}
                onChange={e => updateSetting('voiceSpeed', parseFloat(e.target.value))}
                className="w-full accent-cyan h-1"
              />
              <div className="flex justify-between mt-0.5">
                <span className="font-mono text-[9px] text-text-muted">0.8x</span>
                <span className="font-mono text-[9px] text-text-muted">1.2x</span>
              </div>
            </div>

            {/* Other toggles section */}
            <div className="border-t border-border pt-4">
              <p className="font-mono text-[9px] text-text-muted tracking-widest mb-3">DISPLAY</p>
            </div>

            {/* Sound Effects */}
            <ToggleRow
              icon={settings.sound !== false ? <Volume2 size={16} /> : <VolumeX size={16} />}
              label="SOUND EFFECTS"
              value={settings.sound !== false}
              onChange={v => updateSetting('sound', v)}
            />

            {/* Show Mode */}
            <ToggleRow
              icon={settings.showMode ? <Eye size={16} /> : <EyeOff size={16} />}
              label="SHOW MODE"
              sublabel="Hides sensitive data (mood, journal, body)"
              value={settings.showMode || false}
              onChange={v => updateSetting('showMode', v)}
            />

            {/* Body Double default */}
            <div>
              <label className="font-mono text-[10px] text-text-dim tracking-wider block mb-1.5">
                BODY DOUBLE DEFAULT
              </label>
              <div className="flex gap-2">
                {[25, 45].map(mins => (
                  <button
                    key={mins}
                    onClick={() => updateSetting('bodyDoubleDefault', mins)}
                    className={`flex-1 py-2 rounded font-mono text-xs border transition-all duration-200 ${
                      (settings.bodyDoubleDefault || 25) === mins
                        ? 'bg-cyan/10 border-cyan text-cyan'
                        : 'bg-card border-border text-text-dim hover:border-cyan/30'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Data management */}
            <div className="border-t border-border pt-5 space-y-3">
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded border
                  border-cyan/30 text-cyan bg-cyan/5 hover:bg-cyan/10 transition-all duration-200
                  font-mono text-xs tracking-wider"
              >
                <Download size={14} /> EXPORT DATA
              </button>

              <button
                onClick={handleImport}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded border
                  border-border text-text-dim hover:border-cyan/30 hover:text-cyan transition-all duration-200
                  font-mono text-xs tracking-wider"
              >
                <Upload size={14} /> IMPORT DATA
              </button>

              {importStatus === 'success' && (
                <p className="font-mono text-[10px] text-green-400 text-center">DATA IMPORTED SUCCESSFULLY</p>
              )}
              {importStatus === 'error' && (
                <p className="font-mono text-[10px] text-red-400 text-center">IMPORT FAILED — INVALID FILE</p>
              )}
            </div>

            {/* Reset */}
            <div className="border-t border-border pt-5">
              <button
                onClick={handleReset}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded border
                  font-mono text-xs tracking-wider transition-all duration-200 ${
                  confirmReset
                    ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                    : 'border-red-500/30 text-red-400/60 hover:border-red-500/60 hover:text-red-400'
                }`}
              >
                {confirmReset ? (
                  <><AlertTriangle size={14} /> CONFIRM RESET — ALL DATA WILL BE LOST</>
                ) : (
                  <><Trash2 size={14} /> RESET JARVIS</>
                )}
              </button>
              {confirmReset && (
                <button
                  onClick={() => setConfirmReset(false)}
                  className="w-full mt-2 py-1.5 font-mono text-[10px] text-text-muted hover:text-text
                    tracking-wider transition-colors"
                >
                  CANCEL
                </button>
              )}
            </div>

            {/* Shutdown */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('jarvis-request-shutdown'))}
              className="w-full py-2.5 rounded-lg border border-amber-500/30 font-mono text-xs text-amber-400
                tracking-wider hover:bg-amber-500/10 transition-all mt-3"
            >
              SHUTDOWN JARVIS
            </button>

            {/* Cloud Sync */}
            <div className="glass-card p-3 mt-3">
              <h3 className="font-display text-xs font-bold text-cyan tracking-wider neon-heading mb-2">CLOUD SYNC</h3>
              {(() => { try { return !!import.meta.env.VITE_SUPABASE_URL } catch { return false } })() ? (
                <div>
                  <p className="font-body text-[10px] mb-2" style={{ color: '#10b981' }}>Supabase connected. Data syncs automatically.</p>
                  <button onClick={async () => {
                    const { pushAllToCloud } = await import('../../utils/supabaseSync.js')
                    const count = await pushAllToCloud()
                    alert(`Synced ${count} keys to cloud`)
                  }} className="font-mono text-[10px] text-cyan border border-cyan/30 px-3 py-1 rounded hover:bg-cyan/10 transition-all">
                    FORCE FULL SYNC
                  </button>
                </div>
              ) : (
                <p className="font-body text-[10px] text-text-muted">Not configured. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env.local</p>
              )}
            </div>

            {/* Identity Data */}
            <div className="glass-card p-3 mt-3">
              <h3 className="font-display text-xs font-bold text-cyan tracking-wider neon-heading mb-2">IDENTITY DATA</h3>
              <p className="font-body text-[10px] text-text-muted mb-2">Tell JARVIS "remember that..." to update. Or edit directly:</p>
              <textarea
                defaultValue={(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem('jos-identity') || '{}'), null, 2) } catch { return '{}' } })()}
                onBlur={e => { try { JSON.parse(e.target.value); localStorage.setItem('jos-identity', e.target.value) } catch { /* invalid json */ } }}
                className="w-full bg-void border border-border rounded-lg font-mono text-[10px] text-text p-2 focus:outline-none focus:border-cyan"
                style={{ height: 100, resize: 'vertical' }}
              />
            </div>

            {/* Version */}
            <div className="text-center pt-3 border-t border-border">
              <p className="font-mono text-[9px] text-text-muted tracking-widest">
                JARVIS OS v2050.2 | MARK 72 NANOTECH
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ icon, label, sublabel, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={value ? 'text-cyan' : 'text-text-muted'}>{icon}</span>
        <div>
          <span className="font-mono text-xs text-text-dim tracking-wider">{label}</span>
          {sublabel && <p className="font-mono text-[9px] text-text-muted">{sublabel}</p>}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-all duration-200 relative ${
          value ? 'bg-cyan/30' : 'bg-border'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
          value ? 'left-5 bg-cyan' : 'left-0.5 bg-text-muted'
        }`} />
      </button>
    </div>
  )
}
