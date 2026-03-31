// LogTab.jsx — Captain's Log (Tab 3) main layout
// WHY: The LOG tab is the daily debrief hub. Check-in form at top (the daily ritual),
// then data visualizations below. Layout: check-in → charts row → stat cards row.
// Everything pulls from jos-feelings, making the check-in the data source for all analytics.

import CheckInForm from './CheckInForm.jsx'
import ConfidenceChart from './ConfidenceChart.jsx'
import WeeklyChart from './WeeklyChart.jsx'
import ImpostorKiller from './ImpostorKiller.jsx'
import NikhilVsNikhil from './NikhilVsNikhil.jsx'
import SessionStats from './SessionStats.jsx'
import MoodOracle from './MoodOracle.jsx'

export default function LogTab({ elapsed }) {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <CheckInForm />

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConfidenceChart />
        <WeeklyChart />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImpostorKiller />
        <NikhilVsNikhil />
        <SessionStats elapsed={elapsed} />
      </div>

      <MoodOracle />
    </div>
  )
}
