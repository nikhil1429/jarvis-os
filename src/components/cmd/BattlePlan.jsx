// BattlePlan.jsx — Placeholder for AI-generated daily battle plan
// WHY: The Battle Plan is generated AFTER the transition ritual (morning check-in).
// Until then, it shows a locked state. This keeps users accountable to the ritual
// before they start working. The actual generation happens in Phase 2 when we
// build the API integration.

import { Shield } from 'lucide-react'

export default function BattlePlan() {
  return (
    <div className="hud-panel rounded-lg p-4">
      <div className="hud-panel-inner">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-gold" />
          <h3 className="font-display text-lg font-bold text-gold tracking-wider uppercase">
            Battle Plan
          </h3>
        </div>

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center mb-3">
            <Shield size={24} className="text-text-muted" />
          </div>
          <p className="font-body text-sm text-text-dim mb-1">
            Battle Plan generates after transition ritual
          </p>
          <p className="font-mono text-[10px] text-text-muted tracking-wider">
            COMPLETE MORNING CHECK-IN TO UNLOCK
          </p>
        </div>
      </div>
    </div>
  )
}
