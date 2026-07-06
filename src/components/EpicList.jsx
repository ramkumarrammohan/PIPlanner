import React, { useState } from 'react'
import { getPersonUsage, getSprintUsage } from '../utils/calculations'
import { exportEpicsCSV } from '../utils/exportCsv'

export default function EpicList({ state, setState }){
  const { epics, sprints, people } = state
  const [newEpicName, setNewEpicName] = useState('')
  const [newEpicSP, setNewEpicSP] = useState(10)
  const [selectSprintValues, setSelectSprintValues] = useState({})

  function addEpic(){
    const id = 'e-'+(Date.now())
    const name = (newEpicName || 'New Epic').trim()
    const total = Number(newEpicSP) || 0
    const epic = { id, name, total_sp: total, allocations: {} }
    setState({ ...state, epics: [...epics, epic] })
    setNewEpicName('')
    setNewEpicSP(10)
  }

  function updateEpic(nextEpic){
    setState({ ...state, epics: epics.map(e => e.id===nextEpic.id? nextEpic: e) })
  }

  function updateAlloc(epic, sprint, person, value){
    const num = Number(value) || 0
    const next = { ...epic, allocations: { ...(epic.allocations || {}) } }
    next.allocations[sprint] = { ...(next.allocations[sprint] || {}) }
    next.allocations[sprint][person] = num
    updateEpic(next)
  }

  function removeEpic(id){
    setState({ ...state, epics: epics.filter(e => e.id!==id) })
  }

  function addSprintToEpic(epicId, sprint){
    setState(prev => {
      const next = { ...prev, epics: (prev.epics || []).map(e => {
        if(e.id !== epicId) return e
        const alloc = { ...(e.allocations || {}) }
        if(!alloc[sprint]){
          alloc[sprint] = {}
          ;((prev.people || [])).forEach(p => alloc[sprint][p] = 0)
        }
        return { ...e, allocations: alloc }
      })}
      return next
    })
  }

  function removeSprintFromEpic(epicId, sprint){
    setState(prev => {
      const next = { ...prev, epics: (prev.epics || []).map(e => {
        if(e.id !== epicId) return e
        const alloc = { ...(e.allocations || {}) }
        delete alloc[sprint]
        return { ...e, allocations: alloc }
      })}
      return next
    })
  }

  return (
    <div className="epic-list">
      <div className="epic-list-header">
        <h2>Epic Allocation</h2>
        <div className="actions">
          <input placeholder="Epic name" value={newEpicName} onChange={e=>setNewEpicName(e.target.value)}
            style={{width:140}} />
          <input type="number" style={{width:70}} value={newEpicSP} onChange={e=>setNewEpicSP(e.target.value)}
            placeholder="SP" />
          <button className="btn primary" onClick={addEpic}>+ Add Epic</button>
        </div>
      </div>

      {epics.length === 0 && (
        <div className="empty-state">No epics yet. Add one above to start planning.</div>
      )}

      {epics.map(epic => {
        const assignedTotal = Object.keys(epic.allocations || {}).reduce((sum, s) =>
          sum + Object.values(epic.allocations[s] || {}).reduce((a,b) => a + Number(b||0), 0), 0)
        const remSP = epic.total_sp - assignedTotal
        const epicOver = remSP < 0

        return (
        <div key={epic.id} className="epic-card">
          <div className="epic-header">
            <input type="text" value={epic.name} onChange={e => updateEpic({...epic, name: e.target.value})} />
            <div className="meta">
              Total SP: <input type="number" value={epic.total_sp}
                onChange={e => updateEpic({...epic, total_sp: Number(e.target.value)||0})} />
              <span style={{
                color: epicOver ? 'var(--danger)' : remSP > 0 ? 'var(--warning)' : 'var(--success)',
                fontWeight: 600
              }}>
                {epicOver ? `🔴 Over by ${Math.abs(remSP)}` : remSP > 0 ? `⚠ ${remSP} unassigned` : '✓ Full'}
              </span>
            </div>
            <div className="actions">
              <button className="btn danger small" onClick={() => removeEpic(epic.id)}>Delete</button>
            </div>
          </div>

          <div className="alloc-grid">
            <div className="small-form">
              <select value={selectSprintValues[epic.id] || ''}
                onChange={e=>setSelectSprintValues(prev=>({ ...prev, [epic.id]: e.target.value }))}>
                <option value="">Add sprint…</option>
                {sprints.filter(s => !Object.keys(epic.allocations || {}).includes(s)).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button className="btn" onClick={() => {
                const val = selectSprintValues[epic.id]
                if(val) { addSprintToEpic(epic.id, val); setSelectSprintValues(prev=>{
                  const n = { ...prev }; delete n[epic.id]; return n
                }) }
              }}>+ Sprint</button>
            </div>

            {Object.keys(epic.allocations || {}).length === 0 ? (
              <div className="empty-state" style={{padding:'10px 0',fontSize:'12px'}}>
                No sprints assigned — select a sprint above
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{width:90}}>Sprint</th>
                    <th>Person → SP</th>
                    <th style={{width:70}}>Total</th>
                    <th style={{width:60}}></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(epic.allocations || {}).map(s => (
                    <tr key={s}>
                      <td style={{fontWeight:600,color:'var(--text-secondary)'}}>{s}</td>
                      <td>
                        <div className="person-list">
                          {people.map(p => {
                            const personCap = (state.capacity?.[s]?.[p]) || 0
                            const personUsed = getPersonUsage(state, p, s)
                            const personOver = personCap > 0 && personUsed > personCap
                            return (
                              <div key={p} className="person-assign">
                                <label style={{color: personOver ? 'var(--danger)' : 'var(--text-secondary)'}}>{p}</label>
                                <input type="number"
                                  value={(epic.allocations[s] && epic.allocations[s][p]) || 0}
                                  onChange={e => updateAlloc(epic, s, p, e.target.value)}
                                  style={{
                                    background: personOver ? 'var(--bg-danger)' : 'var(--bg-input)',
                                    borderColor: personOver ? 'var(--danger)' : 'var(--border-light)'
                                  }} />
                                {personOver && <span style={{fontSize:9,color:'var(--danger)',marginTop:1}}>🔴</span>}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="sprint-total">
                          { Object.keys(epic.allocations[s] || {}).reduce((sum,k)=>
                            sum + (Number(epic.allocations[s][k])||0), 0) }
                        </div>
                      </td>
                      <td className="remove-cell">
                        <button className="alloc-grid small"
                          onClick={() => removeSprintFromEpic(epic.id, s)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )})}
    </div>
  )
}
