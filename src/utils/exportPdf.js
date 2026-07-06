import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { getSprintCapacity, getSprintUsage, getPersonUsage } from './calculations'

export async function exportPdf(state) {
  const { people = [], sprints = [], capacity = {}, epics = [] } = state
  const doc = new jsPDF('p', 'mm', 'a4')
  const pw = doc.internal.pageSize.getWidth()
  const ml = 15 // margin left
  const mr = 15 // margin right
  const cw = pw - ml - mr // content width
  let y = ml

  // ── helpers ──
  function addText(text, size = 10, opts = {}) {
    doc.setFontSize(size)
    doc.setTextColor(opts.color || 60)
    doc.text(text, ml, y, opts)
  }
  function addLine() {
    doc.setDrawColor(200)
    doc.line(ml, y, ml + cw, y)
    y += 4
  }
  function checkPage(needed) {
    if (y + needed > doc.internal.pageSize.getHeight() - ml) {
      doc.addPage()
      y = ml
    }
  }

  // ════════════════════════════════════════
  //   PAGE 1 — Data Summary
  // ════════════════════════════════════════

  // ── Title ──
  doc.setFontSize(22)
  doc.setTextColor(31, 119, 180) // #1F77B4
  doc.text('PI PLANNER — Export', ml, y)
  y += 8
  addText(`Generated: ${new Date().toLocaleString()}`, 9, { color: 150 })
  y += 6

  // ── People ──
  checkPage(30)
  doc.setFontSize(14)
  doc.setTextColor(60)
  doc.text('People', ml, y)
  y += 7
  people.forEach(p => {
    addText(`  • ${p}`, 10)
    y += 5
  })
  if (!people.length) { addText('  (none)', 10, { color: 180 }); y += 5 }
  y += 4

  // ── Sprints ──
  checkPage(30)
  doc.setFontSize(14)
  doc.text('Sprints', ml, y)
  y += 7
  sprints.forEach(s => {
    const cap = getSprintCapacity(state, s)
    const used = getSprintUsage(state, s)
    addText(`  • ${s}  —  Cap: ${cap}  ·  Used: ${used}  ·  Rem: ${cap - used}`, 10)
    y += 5
  })
  if (!sprints.length) { addText('  (none)', 10, { color: 180 }); y += 5 }
  y += 4

  // ── Capacity Table ──
  checkPage(30)
  doc.setFontSize(14)
  doc.text('Capacity (person × sprint)', ml, y)
  y += 7

  if (people.length && sprints.length) {
    const colW = Math.min(18, cw / (sprints.length + 1))
    const rowH = 6

    // header row
    doc.setFillColor(245, 245, 245)
    doc.rect(ml, y - 4, cw, rowH, 'F')
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Person', ml + 1, y)
    sprints.forEach((s, i) => {
      doc.text(s, ml + colW * (i + 1) + 1, y)
    })
    y += rowH

    // data rows
    doc.setFontSize(8)
    people.forEach((p, ri) => {
      checkPage(rowH * 2)
      if (ri % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(ml, y - 4, cw, rowH, 'F')
      }
      doc.setTextColor(60)
      doc.text(p, ml + 1, y)
      sprints.forEach((s, i) => {
        const val = (capacity[s] && capacity[s][p]) || 0
        doc.setTextColor(val > 0 ? 31 : 200)
        doc.text(String(val), ml + colW * (i + 1) + 1, y)
      })
      y += rowH
    })
    y += 4
  } else {
    addText('  (add people and sprints first)', 10, { color: 180 })
    y += 5
  }

  // ── Epics & Allocations ──
  checkPage(20)
  doc.setFontSize(14)
  doc.text('Epics & Allocations', ml, y)
  y += 7

  if (epics.length) {
    epics.forEach((epic, ei) => {
      checkPage(30)
      doc.setFontSize(11)
      doc.setTextColor(31, 119, 180)
      doc.text(`${ei + 1}. ${epic.name}  —  ${epic.total_sp || 0} SP`, ml, y)
      y += 6

      doc.setFontSize(8)
      doc.setTextColor(80)
      const allocs = epic.allocations || {}
      sprints.forEach(s => {
        const cell = (allocs[s] || {})
        const persons = Object.keys(cell).filter(k => Number(cell[k]) > 0)
        if (!persons.length) return
        const parts = persons.map(p => `${p}: ${cell[p]}`)
        doc.text(`     ${s}:  ${parts.join('  ·  ')}`, ml, y)
        y += 4
      })
      y += 3
    })
  } else {
    addText('  (no epics yet)', 10, { color: 180 })
    y += 5
  }

  // ════════════════════════════════════════
  //   PAGE 2+ — Roadmap Image
  // ════════════════════════════════════════
  doc.addPage()
  y = ml

  doc.setFontSize(16)
  doc.setTextColor(31, 119, 180)
  doc.text('Roadmap', ml, y)
  y += 10

  // Build a temporary roadmap element for html2canvas capture
  const temp = document.createElement('div')
  temp.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;background:#fff;padding:20px;font-family:Segoe UI,sans-serif;z-index:-1'
  temp.innerHTML = buildRoadmapHtml(state)
  document.body.appendChild(temp)

  try {
    const canvas = await html2canvas(temp, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: temp.scrollWidth,
      height: temp.scrollHeight
    })
    const imgData = canvas.toDataURL('image/png')
    const imgW = cw
    const imgH = (canvas.height * imgW) / canvas.width

    // If roadmap is taller than a page, we still fit it proportionally
    // but cap to not exceed page width
    if (imgH > doc.internal.pageSize.getHeight() - ml - 10) {
      // Scale down to fit one page height
      const maxH = doc.internal.pageSize.getHeight() - ml - 10
      const ratio = maxH / imgH
      doc.addImage(imgData, 'PNG', ml, y, imgW * ratio, maxH)
    } else {
      doc.addImage(imgData, 'PNG', ml, y, imgW, imgH)
    }
  } catch (e) {
    addText('Could not render roadmap image: ' + e.message, 10, { color: 200 })
  }

  document.body.removeChild(temp)

  // ── Save ──
  doc.save('pi-planner-export.pdf')
}

// ──────────────────────────────────────────
//  Build offline HTML for the roadmap image
//  (print-friendly — light background, dark text)
// ──────────────────────────────────────────
function buildRoadmapHtml(state) {
  const { sprints = [], epics = [] } = state
  const paletteLen = 8

  // Print-friendly palette (saturated enough to distinguish, light enough to print)
  const paletteColors = ['#1565C0','#2E7D32','#E65100','#6A1B9A','#C62828','#00838F','#F9A825','#4E342E']

  let html = '<div style="display:flex;flex-direction:column;gap:6px;min-width:800px;font-family:Segoe UI,Helvetica,sans-serif">'

  // header row
  html += '<div style="display:flex;gap:0">'
  html += `<div style="width:170px;flex-shrink:0;padding:8px 10px;background:#f5f5f5;border:1px solid #ccc;font-weight:700;color:#555;text-transform:uppercase;font-size:11px">Epic</div>`
  sprints.forEach(s => {
    const cap = getSprintCapacity(state, s)
    const used = getSprintUsage(state, s)
    const overload = used > cap
    html += `<div style="flex:1;min-width:130px;padding:6px 6px;text-align:center;background:#f5f5f5;border:1px solid ${overload ? '#E76F51' : '#ccc'};font-weight:700;font-size:11px;text-transform:uppercase;color:${overload ? '#E76F51' : '#333'}">
      ${s}${overload ? ' ⚠' : ''}
      <div style="font-weight:400;font-size:10px;color:#777;margin-top:2px">Cap ${cap} · Used ${used} · Rem ${cap - used}</div>
    </div>`
  })
  html += '</div>'

  // epic rows
  epics.forEach((epic, ei) => {
    html += '<div style="display:flex;gap:0;align-items:center">'
    html += `<div style="width:170px;flex-shrink:0;padding:8px 10px;background:#fafafa;border:1px solid #ddd;border-radius:4px">
      <div style="font-weight:700;font-size:12px;color:#222">${epic.name}</div>
      <div style="font-size:10px;color:#777;margin-top:2px">${epic.total_sp || 0} SP</div>
    </div>`

    const color = paletteColors[ei % paletteLen]

    sprints.forEach(s => {
      const alloc = (epic.allocations && epic.allocations[s]) || {}
      const total = Object.values(alloc).reduce((a, b) => a + Number(b || 0), 0)
      const persons = Object.keys(alloc).filter(p => alloc[p] && alloc[p] > 0)

      if (total === 0) {
        html += `<div style="flex:1;min-width:130px;padding:4px 3px">
          <div style="background:#fff;border:1px dashed #ddd;border-radius:4px;color:#bbb;font-size:11px;display:flex;align-items:center;justify-content:center;min-height:36px;padding:6px 10px">—</div>
        </div>`
      } else {
        html += `<div style="flex:1;min-width:130px;padding:4px 3px">
          <div style="background:${color};border-radius:4px;padding:6px 10px;font-size:11px;color:#fff;font-weight:600;display:flex;align-items:center;justify-content:space-between;min-height:36px">
            <div>${persons.join(', ')}</div>
            <div style="font-size:13px;font-weight:800">${total}</div>
          </div>
        </div>`
      }
    })

    html += '</div>'
  })

  html += '</div>'
  return html
}
