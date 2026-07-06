/**
 * Parse a CSV text into a full planner state.
 * Supports two formats:
 *   1. Full format with [People], [Sprints], [Capacity], [Epics], [Allocations] sections
 *   2. Simple format: Sprint,Epic,Person,StoryPoints (auto-creates missing people/sprints/epics)
 */
export function parseImportCsv(text){
  const lines = text.split(/\r?\n/).map(l => l.trim())
  const nonEmpty = lines.filter(l => l.length > 0)

  // Detect simple format — first non-empty line has Sprint,Epic,Person
  const firstData = nonEmpty[0] || ''
  if(/^Sprint[,;]\s*Epic[,;]\s*Person/i.test(firstData)){
    return parseSimpleFormat(nonEmpty)
  }

  return parseFullFormat(lines)
}

/* ── Simple format: Sprint,Epic,Person,StoryPoints ── */
function parseSimpleFormat(lines){
  const state = { people: [], sprints: [], capacity: {}, epics: [] }
  const peopleSet = new Set()
  const sprintSet = new Set()
  const epicMap = {}   // epicName -> { name, total_sp, allocations }

  for(const line of lines){
    if(line.length === 0) continue
    // Support both comma and semicolon delimiters
    const parts = line.includes(';') ? line.split(';') : line.split(',')
    if(parts.length < 4) continue

    const sprint = parts[0].trim()
    const epicName = parts[1].trim()
    const person = parts[2].trim()
    const sp = Number(parts[3].trim()) || 0

    // Skip header
    if(/^sprint$/i.test(sprint) && /^epic$/i.test(epicName)) continue

    sprintSet.add(sprint)
    peopleSet.add(person)

    if(!epicMap[epicName]){
      epicMap[epicName] = { name: epicName, total_sp: 0, allocations: {} }
    }
    const epic = epicMap[epicName]

    // Track total SP as max observed sum or cumulative
    epic.total_sp = Math.max(epic.total_sp, (epic.total_sp || 0) + sp)

    if(!epic.allocations[sprint]) epic.allocations[sprint] = {}
    epic.allocations[sprint][person] = (epic.allocations[sprint][person] || 0) + sp
  }

  state.people = [...peopleSet]
  state.sprints = [...sprintSet]
  state.epics = Object.values(epicMap).map((e, i) => ({
    id: 'e-' + Date.now() + '-' + i,
    name: e.name,
    total_sp: e.total_sp,
    allocations: e.allocations
  }))

  // Build zero-capacity entries for all person×sprint combos
  for(const sprint of state.sprints){
    state.capacity[sprint] = {}
    for(const person of state.people){
      state.capacity[sprint][person] = 0
    }
  }

  return state
}

/* ── Full format with [Section] headers ── */
function parseFullFormat(lines){
  const state = { people: [], sprints: [], capacity: {}, epics: [] }
  let section = null
  let headerSkipped = false
  const epicMap = {}

  for(let raw of lines){
    const line = raw.trim()
    if(line.length === 0) { headerSkipped = false; continue }

    // Section header
    const sectionMatch = line.match(/^\[(.+)\]$/)
    if(sectionMatch){
      section = sectionMatch[1].toLowerCase()
      headerSkipped = false
      continue
    }

    switch(section){
      case 'people': {
        if(!headerSkipped) { headerSkipped = true; break }
        state.people.push(line)
        break
      }
      case 'sprints': {
        if(!headerSkipped) { headerSkipped = true; break }
        state.sprints.push(line)
        break
      }
      case 'capacity': {
        const parts = line.includes(';') ? line.split(';') : line.split(',')
        if(parts.length < 3) break
        if(!headerSkipped) { headerSkipped = true; break }
        const sprint = parts[0].trim()
        const person = parts[1].trim()
        const days = Number(parts[2].trim()) || 0
        if(!state.capacity[sprint]) state.capacity[sprint] = {}
        state.capacity[sprint][person] = days
        break
      }
      case 'epics': {
        const parts = line.includes(';') ? line.split(';') : line.split(',')
        if(parts.length < 2) break
        if(!headerSkipped) { headerSkipped = true; break }
        const name = parts[0].trim()
        const totalSP = Number(parts[1].trim()) || 0
        epicMap[name] = { name, total_sp: totalSP, allocations: {} }
        break
      }
      case 'allocations': {
        const parts = line.includes(';') ? line.split(';') : line.split(',')
        if(parts.length < 4) break
        if(!headerSkipped) { headerSkipped = true; break }
        const sprint = parts[0].trim()
        const epicName = parts[1].trim()
        const person = parts[2].trim()
        const sp = Number(parts[3].trim()) || 0
        if(epicMap[epicName]){
          if(!epicMap[epicName].allocations[sprint]) epicMap[epicName].allocations[sprint] = {}
          epicMap[epicName].allocations[sprint][person] = sp
        }
        break
      }
    }
  }

  // Build epics array from map
  state.epics = Object.values(epicMap).map((e, i) => ({
    id: 'e-' + Date.now() + '-' + i,
    ...e
  }))

  // Ensure all people have capacity entries for all sprints
  for(const sprint of state.sprints){
    if(!state.capacity[sprint]) state.capacity[sprint] = {}
    for(const person of state.people){
      if(!(person in state.capacity[sprint])){
        state.capacity[sprint][person] = 0
      }
    }
  }

  return state
}

/**
 * Read a File object and return parsed state via callback.
 */
export function importFromFile(file, onComplete, onError){
  const reader = new FileReader()
  reader.onload = (e) => {
    try{
      const text = e.target.result
      const state = parseImportCsv(text)
      onComplete(state)
    }catch(err){
      onError(err)
    }
  }
  reader.onerror = () => onError(new Error('Failed to read file'))
  reader.readAsText(file)
}
