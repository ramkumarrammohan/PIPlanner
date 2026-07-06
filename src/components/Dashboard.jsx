import React from 'react'
import { getSprintCapacity, getSprintUsage, getPersonUsage } from '../utils/calculations'

export default function Dashboard({ state }){
  const { sprints = [], people = [] } = state || {}

  const totalCapacity = sprints.reduce((sum,s) => sum + getSprintCapacity(state, s), 0)
  const totalUsed = sprints.reduce((sum,s) => sum + getSprintUsage(state, s), 0)
  const totalRemaining = totalCapacity - totalUsed
  const overloadedCount = sprints.reduce((c,s)=> c + (getSprintUsage(state,s) > getSprintCapacity(state,s) ? 1 : 0), 0)
  const pctUsed = totalCapacity ? Math.round((totalUsed / totalCapacity) * 100) : 0

  return (
    <>
      <div className="kpi">
        <div className="label">Total Capacity</div>
        <div className="val capacity">{totalCapacity}</div>
        <div className="trend">↑ {sprints.length} sprints · {people.length} people</div>
      </div>
      <div className="kpi">
        <div className="label">Story Points Used</div>
        <div className="val used">{totalUsed}</div>
        <div className="trend">{pctUsed}% utilization</div>
      </div>
      <div className="kpi">
        <div className="label">Remaining SP</div>
        <div className="val remaining">{totalRemaining}</div>
        <div className="trend">across all sprints</div>
      </div>
      <div className="kpi">
        <div className="label">Overloaded</div>
        <div className="val overloaded">{overloadedCount}</div>
        <div className="trend">{overloadedCount > 0 ? '⚠ Needs attention' : 'All good'}</div>
      </div>
      <div className="kpi">
        <div className="label">People</div>
        <div className="val people">{people.length}</div>
        <div className="trend">{state.epics?.length || 0} epics planned</div>
      </div>
    </>
  )
}
