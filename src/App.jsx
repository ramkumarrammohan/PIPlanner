import React, { useEffect, useRef, useState } from 'react'
import CapacityMatrix from './components/CapacityMatrix'
import SprintSummary from './components/SprintSummary'
import EpicList from './components/EpicList'
import Roadmap from './components/Roadmap'
import Dashboard from './components/Dashboard'
import { loadState, saveState } from './utils/storage'
import { exportEpicsCSV, exportFullStateCSV } from './utils/exportCsv'
import { importFromFile } from './utils/importCsv'

const defaultState = {
  people: [],
  sprints: [],
  capacity: {},
  epics: []
}

export default function App(){
  const [state, setState] = useState(() => {
    const saved = loadState()
    if (saved) return saved
    return defaultState
  })
  const [view, setView] = useState('planner')
  const [leftWidth, setLeftWidth] = useState(200)
  const [theme, setTheme] = useState(() => {
    const t = (()=>{ try{ return localStorage.getItem('pi-planner-theme') || 'dark' }catch(e){ return 'dark' } })()
    try{ document.body.classList.toggle('theme-light', t === 'light') }catch(e){}
    return t
  })
  const fileInputRef = useRef(null)

  // Persist left panel width in localStorage
  useEffect(() => {
    try{
      const saved = localStorage.getItem('pi-planner-left-width')
      if(saved) setLeftWidth(Number(saved))
    }catch(e){}
  }, [])

  useEffect(() => {
    try{ localStorage.setItem('pi-planner-theme', theme) }catch(e){}
    document.body.classList.toggle('theme-light', theme === 'light')
  }, [theme])

  useEffect(() => {
    saveState(state)
  }, [state])

  // Drag-to-resize handler for left panel
  const [resizing, setResizing] = useState(false)

  useEffect(() => {
    if(!resizing) return
    const onMove = (e) => {
      const newWidth = Math.max(140, Math.min(500, e.clientX - 20))
      setLeftWidth(newWidth)
      try{ localStorage.setItem('pi-planner-left-width', String(newWidth)) }catch(e){}
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  function handleImport(){
    fileInputRef.current && fileInputRef.current.click()
  }

  function onFileSelected(e){
    const file = e.target.files && e.target.files[0]
    if(!file) return
    importFromFile(file,
      (importedState) => {
        setState(importedState)
        e.target.value = ''
      },
      (err) => {
        alert('Import failed: ' + (err && err.message))
        e.target.value = ''
      }
    )
  }

  function toggleTheme(){
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className={`app ${theme === 'light' ? 'theme-light' : ''}`}
      style={resizing ? {cursor:'col-resize',userSelect:'none'} : {}}>
      {/* ── Header ── */}
      <div className="header">
        <h1>/// PI PLANNER</h1>
        <div className="nav">
          <button onClick={()=>setView('planner')} className={view==='planner'?'active':''}>Planner</button>
          <button onClick={()=>setView('roadmap')} className={view==='roadmap'?'active':''}>Roadmap</button>
          <button className="theme-toggle" onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards Row ── */}
      <div className="kpis">
        <Dashboard state={state} />
      </div>

      {view === 'planner' ? (
        /* ── 3-Column Layout with Resizable Left Panel ── */
        <div className="layout">
          <div className="left-nav" style={{width: leftWidth, minWidth: 140, maxWidth: 500}}>
            <CapacityMatrix state={state} setState={setState} />
          </div>
          {/* Drag handle */}
          <div
            className="resize-handle"
            onMouseDown={() => setResizing(true)}
          />
          <div className="center">
            <EpicList state={state} setState={setState} />
          </div>
          <div className="right-panel">
            <SprintSummary state={state} />
          </div>
        </div>
      ) : (
        <div className="layout" style={{padding:'14px',height:'calc(100vh - 200px)'}}>
          <Roadmap state={state} />
        </div>
      )}

      {/* ── Hidden file input for import ── */}
      <input type="file" ref={fileInputRef} accept=".csv" style={{display:'none'}}
        onChange={onFileSelected} />

      {/* ── Bottom Toolbar ── */}
      <div className="toolbar">
        <button className="tbtn primary" onClick={() => exportEpicsCSV(state)}>Export CSV</button>
        <button className="tbtn" onClick={() => exportFullStateCSV(state)}>Export Full</button>
        <button className="tbtn" onClick={handleImport}>Import CSV</button>
        <button className="tbtn danger" onClick={() => { if(confirm('Reset all data?')) setState(structuredClone(defaultState)) }}>Reset</button>
        <span style={{flex:1}}></span>
        <span style={{fontSize:'11px',color:'var(--text-muted)'}}>localStorage · {state.people.length} people · {state.sprints.length} sprints · {state.epics.length} epics</span>
      </div>
    </div>
  )
}
