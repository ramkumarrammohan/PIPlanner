export function getSprintCapacity(state, sprint){
  const cap = state && state.capacity && state.capacity[sprint] ? state.capacity[sprint] : {}
  let total = 0
  try{
    Object.keys(cap).forEach(k => { total += Number(cap[k]) || 0 })
  }catch(e){ /* ignore and return 0 */ }
  return total
}

export function getSprintUsage(state, sprint){
  let total = 0
  const epics = (state && state.epics) || []
  epics.forEach(epic => {
    const alloc = epic && epic.allocations && epic.allocations[sprint] ? epic.allocations[sprint] : {}
    try{
      Object.keys(alloc).forEach(p => { total += Number(alloc[p]) || 0 })
    }catch(e){ }
  })
  return total
}

export function getPersonUsage(state, person, sprint){
  let total = 0
  const epics = (state && state.epics) || []
  epics.forEach(epic => {
    const alloc = epic && epic.allocations && epic.allocations[sprint] ? epic.allocations[sprint] : {}
    total += Number(alloc[person]) || 0
  })
  return total
}
