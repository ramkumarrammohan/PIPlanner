import React, { useState } from 'react'
import { getSprintCapacity, getPersonUsage, getSprintUsage } from '../utils/calculations'

export default function CapacityMatrix({ state, setState }){
  const { people, sprints, capacity, epics } = state
  const [newPerson, setNewPerson] = useState('')
  const [newSprint, setNewSprint] = useState('')
  const [showMatrix, setShowMatrix] = useState(false)

  function updateCapacity(sprint, person, value){
    const num = Number(value) || 0
    const next = { ...state, capacity: { ...capacity } }
    next.capacity = { ...capacity }
    next.capacity[sprint] = { ...(capacity[sprint] || {}) }
    next.capacity[sprint][person] = num
    setState(next)
  }

  function addPerson(){
    const name = (newPerson || '').trim()
    if(!name) return
    if(people.includes(name)) { setNewPerson(''); return }
    const next = { ...state }
    next.people = [...people, name]
    next.capacity = { ...(capacity || {}) }
    next.sprints = [...sprints]
    next.sprints.forEach(s => {
      next.capacity[s] = { ...(next.capacity[s] || {}) }
      next.capacity[s][name] = 0
    })
    setState(next)
    setNewPerson('')
  }

  function removePerson(name){
    const next = { ...state }
    next.people = people.filter(p => p !== name)
    next.capacity = { ...(capacity || {}) }
    Object.keys(next.capacity).forEach(s => {
      const c = { ...(next.capacity[s] || {}) }
      delete c[name]
      next.capacity[s] = c
    })
    next.epics = (epics || []).map(e => {
      const copy = { ...e, allocations: { ...(e.allocations || {}) } }
      Object.keys(copy.allocations).forEach(s => {
        const a = { ...(copy.allocations[s] || {}) }
        delete a[name]
        copy.allocations[s] = a
      })
      return copy
    })
    setState(next)
  }

  function addSprint(){
    const name = (newSprint || '').trim()
    if(!name) return
    setState(prev => {
      const prevSprints = (prev && prev.sprints) || []
      if(prevSprints.includes(name)) { return prev }
      const nextCapacity = { ...(prev.capacity || {}) }
      nextCapacity[name] = {}
      ;((prev.people || [])).forEach(p => { nextCapacity[name][p] = 0 })
      return { ...prev, sprints: [...prevSprints, name], capacity: nextCapacity }
    })
    setNewSprint('')
  }

  function removeSprint(name){
    const next = { ...state }
    next.sprints = sprints.filter(s => s !== name)
    next.capacity = { ...(capacity || {}) }
    delete next.capacity[name]
    next.epics = (epics || []).map(e => {
      const copy = { ...e, allocations: { ...(e.allocations || {}) } }
      delete copy.allocations[name]
      return copy
    })
    setState(next)
  }

  /* Compute per-person totals + per-sprint usage for highlighting */
  const personTotals = people.map(p => {
    const cap = sprints.reduce((sum,s) => sum + ((capacity[s] && capacity[s][p]) || 0), 0)
    const used = sprints.reduce((sum,s) => sum + getPersonUsage(state, p, s), 0)
    const pct = cap ? (used / cap) * 100 : 0
    return { person: p, cap, used, rem: cap - used, pct, overloaded: used > cap }
  })

  const paletteLen = 8

  return (
    <>
      <div className="section-hd">Team Capacity</div>

      {personTotals.map((r, i) => (
        <div key={r.person} className="person-item">
          <div className="pn">{r.person}</div>
          <div className="pbar" style={{position:'relative'}}>
            <div className="pbar-fill"
              style={{
                width: Math.min(100, r.pct) + '%',
                background: r.overloaded ? 'var(--danger)' : 'var(--palette-' + (i % paletteLen) + ')'
              }} />
            {r.overloaded && (
              <div className="pbar-fill"
                style={{
                  width: Math.min(100, r.pct - 100) + '%',
                  background: 'var(--danger)', opacity: 0.4,
                  position: 'absolute', top: 0, left: '100%'
                }} />
            )}
          </div>
          <div className={`pstat ${r.rem < 0 ? 'warn' : ''}`}>
            {r.used}/{r.cap} · {r.rem >= 0 ? r.rem + ' free' : '🔴 ' + Math.abs(r.rem) + ' over'}
          </div>
        </div>
      ))}

      <div className="add-form">
        <div className="section-hd" style={{marginTop:'16px',borderTop:'1px solid var(--border)',paddingTop:'12px'}}>Add Person</div>
        <input placeholder="Name…" value={newPerson} onChange={e=>setNewPerson(e.target.value)}
          onKeyDown={e => e.key==='Enter' && addPerson()} />
        <button className="btn" onClick={addPerson}>+ Add</button>
      </div>

      <div className="add-form">
        <div className="section-hd">Add Sprint</div>
        <input placeholder="Sprint name…" value={newSprint} onChange={e=>setNewSprint(e.target.value)}
          onKeyDown={e => e.key==='Enter' && addSprint()} />
        <button className="btn" onClick={addSprint}>+ Add</button>
      </div>

      {/* Toggle capacity matrix table */}
      <div className="capacity-table">
        <button className="toggle-btn" onClick={() => setShowMatrix(!showMatrix)}>
          {showMatrix ? '▲' : '▼'} Capacity Matrix {showMatrix ? 'hide' : 'show'}
        </button>
        {showMatrix && (
          <div style={{overflowX:'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  {sprints.map(s => <th key={s}>{s}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {people.map(p => (
                  <tr key={p}>
                    <td style={{textAlign:'left',color:'var(--text-secondary)',fontWeight:600}}>
                      {p}
                      <button className="rm-btn" onClick={()=>removePerson(p)} title="Remove">✕</button>
                    </td>
                    {sprints.map(s => (
                      <td key={s}>
                        <input type="number" value={(capacity[s] && capacity[s][p]) || 0}
                          onChange={e => updateCapacity(s, p, e.target.value)} />
                      </td>
                    ))}
                    <td className="pers-total">
                      {sprints.reduce((sum, s) => sum + ((capacity[s] && capacity[s][p]) || 0), 0)}
                    </td>
                  </tr>
                ))}
                {/* Sprint capacity row */}
                <tr style={{background:'var(--bg-panel)'}}>
                  <td style={{color:'var(--text-muted)',fontWeight:600,textAlign:'left'}}>Sprint Cap</td>
                  {sprints.map(s => (
                    <td key={s} style={{color:'var(--accent)',fontWeight:700}}>{getSprintCapacity(state, s)}</td>
                  ))}
                  <td style={{color:'var(--text-muted)'}}></td>
                </tr>
                {/* Sprint used row */}
                <tr style={{background:'var(--bg-panel)'}}>
                  <td style={{color:'var(--text-muted)',fontWeight:600,textAlign:'left'}}>Sprint Used</td>
                  {sprints.map(s => {
                    const used = getSprintUsage(state, s)
                    const cap = getSprintCapacity(state, s)
                    return (
                      <td key={s} style={{color: used > cap ? 'var(--danger)' : 'var(--success)', fontWeight:700}}>
                        {used}
                      </td>
                    )
                  })}
                  <td style={{color:'var(--text-muted)'}}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
