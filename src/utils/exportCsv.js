function downloadBlob(content, filename, mimeType){
  try{
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }catch(e){
    try{
      const dataUrl = 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(content)
      window.open(dataUrl, '_blank')
    }catch(err){
      console.error('Download failed', err)
      alert('Download failed: ' + (err && err.message))
    }
  }
}

/* ── Export simple epic allocations CSV (for reporting) ── */
export function exportEpicsCSV(state){
  const rows = [['Sprint','Epic','Person','StoryPoints']];
  (state.epics || []).forEach(epic => {
    Object.entries(epic.allocations || {}).forEach(([sprint, people]) => {
      Object.entries(people || {}).forEach(([person, sp]) => {
        rows.push([sprint, epic.name, person, String(sp)])
      })
    })
  })
  const csv = rows.map(r => r.map(cell => '"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\n')
  downloadBlob(csv, 'epics.csv', 'text/csv')
}

/* ── Export full state CSV (for backup & restore) ── */
export function exportFullStateCSV(state){
  const lines = []

  lines.push('[People]')
  lines.push('Name')
  ;(state.people || []).forEach(p => lines.push(p))
  lines.push('')

  lines.push('[Sprints]')
  lines.push('Name')
  ;(state.sprints || []).forEach(s => lines.push(s))
  lines.push('')

  lines.push('[Capacity]')
  lines.push('Sprint,Person,Days')
  ;(state.sprints || []).forEach(s => {
    ;(state.people || []).forEach(p => {
      const cap = state.capacity?.[s]?.[p] || 0
      lines.push(`${s},${p},${cap}`)
    })
  })
  lines.push('')

  lines.push('[Epics]')
  lines.push('Name,TotalSP')
  ;(state.epics || []).forEach(e => lines.push(`${e.name},${e.total_sp}`))
  lines.push('')

  lines.push('[Allocations]')
  lines.push('Sprint,Epic,Person,SP')
  ;(state.epics || []).forEach(e => {
    Object.entries(e.allocations || {}).forEach(([sprint, people]) => {
      Object.entries(people || {}).forEach(([person, sp]) => {
        if(Number(sp) > 0) lines.push(`${sprint},${e.name},${person},${sp}`)
      })
    })
  })

  const csv = lines.join('\n')
  downloadBlob(csv, 'pi-planner-full-state.csv', 'text/csv')
}
