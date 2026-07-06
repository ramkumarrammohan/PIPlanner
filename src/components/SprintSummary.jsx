import React from 'react'
import { getSprintCapacity, getSprintUsage } from '../utils/calculations'

export default function SprintSummary({ state }){
  const { sprints } = state

  return (
    <div className="sprint-summary">
      <h2>Sprint Health</h2>
      <div className="sprint-cards">
        {sprints.map(s => {
          const cap = getSprintCapacity(state, s)
          const used = getSprintUsage(state, s)
          const rem = cap - used
          const pct = cap ? Math.round((used / cap) * 100) : 0
          const cls = rem < 0 ? 'over' : pct >= 100 ? 'full' : pct >= 80 ? 'warn' : 'ok'
          return (
            <div key={s} className={`sprint-card ${cls}`}>
              <div className="sprint-name">{s}</div>
              <div className="detail">Capacity: {cap}</div>
              <div className="detail">Used: {used} ({pct}%)</div>
              <div className="detail" style={{fontWeight:700}}>
                {rem >= 0 ? `Remaining: ${rem}` : `🔴 Overloaded by ${Math.abs(rem)}`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
