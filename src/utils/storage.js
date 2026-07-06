const STORAGE_KEY = 'pi-planner-state'
const VERSION = 2

export function saveState(state){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _v: VERSION })) }catch(e){}
}

export function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY)
    if(!raw) return null
    const data = JSON.parse(raw)
    // Ignore old-format data (pre-v2 had sample people/sprints/epics)
    if(data._v !== VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  }catch(e){ return null }
}
