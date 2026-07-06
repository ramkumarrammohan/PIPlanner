import React from 'react'
import { getSprintCapacity, getSprintUsage } from '../utils/calculations'

function cellPersons(epic, sprint){
  const alloc = (epic.allocations && epic.allocations[sprint]) || {}
  return Object.keys(alloc).filter(p => alloc[p] && alloc[p] > 0)
}

export default function Roadmap({ state }){
  const { sprints = [], epics = [] } = state || {}

  const paletteLen = 8

  return (
    <div className="roadmap">
      <h2>Roadmap View</h2>
      <div className="roadmap-grid">
        <div className="roadmap-header">
          <div className="col epic-col" style={{background:'var(--bg-panel)',border:'1px solid var(--border)',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',fontSize:11,letterSpacing:.5}}>Epic</div>
          {sprints.map(s => {
            const cap = getSprintCapacity(state, s)
            const used = getSprintUsage(state, s)
            const overload = used > cap
            return (
              <div key={s} className="col sprint-col"
                style={{background:'var(--bg-panel)',border:'1px solid ' + (overload ? 'var(--danger)' : 'var(--border)'),
                  textAlign:'center',fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:.8,
                  color: overload ? 'var(--danger)' : 'var(--text-secondary)',padding:'8px 6px'}}>
                {s} {overload ? '⚠' : ''}
                <div style={{fontWeight:400,fontSize:10,color:'var(--text-muted)',marginTop:2}}>
                  Cap {cap} · Used {used} · Rem {cap - used}
                </div>
              </div>
            )
          })}
        </div>

        <div className="roadmap-body">
          {epics.length === 0 && (
            <div className="empty-state" style={{padding:30}}>No epics yet. Add epics in the Planner view.</div>
          )}
          {epics.map((epic, ei) => (
            <div key={epic.id} className="rm-row" style={{marginBottom:6,display:'flex',alignItems:'center'}}>
              <div className="col epic-col"
                style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',width:170,flexShrink:0}}>
                <div className="epic-name" style={{fontSize:12,fontWeight:700}}>{epic.name}</div>
                <div className="ep-meta" style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>
                  {epic.total_sp} SP
                </div>
              </div>

              {sprints.map(s => {
                const alloc = (epic.allocations && epic.allocations[s]) || {}
                const total = Object.values(alloc).reduce((a,b)=>a+Number(b||0),0)
                const persons = cellPersons(epic, s)
                const ci = ei % paletteLen

                // Build tooltip: person → SP breakdown
                const tooltipLines = [`${epic.name} — ${s}`]
                const sorted = Object.entries(alloc)
                  .filter(([,sp]) => Number(sp) > 0)
                  .sort(([,a],[,b]) => Number(b) - Number(a))
                sorted.forEach(([p, sp]) => tooltipLines.push(`${p}: ${sp} SP`))
                tooltipLines.push(`Total: ${total} SP`)
                const tooltip = tooltipLines.join('\n')

                if (total === 0) {
                  return (
                    <div key={s} className="ep-cell"
                      style={{flex:1,minWidth:130,padding:'4px 3px'}}>
                      <div className="heat empty"
                        style={{background:'var(--bg-panel)',border:'1px dashed var(--border)',borderRadius:6,
                          color:'var(--text-empty)',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',
                          minHeight:38,padding:'6px 10px'}}>—</div>
                    </div>
                  )
                }

                return (
                  <div key={s} className="ep-cell"
                    style={{flex:1,minWidth:130,padding:'4px 3px'}}>
                    <div className="heat"
                      data-tooltip={tooltip}
                      style={{background:`var(--palette-${ci})`,borderRadius:6,
                        padding:'6px 10px',fontSize:11,color:'#fff',fontWeight:600,
                        display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:38}}>
                      <div>
                        <div>{persons.join(', ')}</div>
                      </div>
                      <div className="sp" style={{fontSize:13,fontWeight:800}}>{total}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
