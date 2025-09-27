// Persistence for zones and settings using localStorage.
const KEY = 'rtls_persist_v2';

export function saveState({ zones = [], settings = {} }){
  try{
    const payload = { zones, settings, t: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  }catch(e){ /* ignore quota */ }
}

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    return data;
  }catch(e){ return null; }
}

// Heuristic: if a zone has name containing 'interzis' or 'interzisă' mark as no-go
export function ensureIsNoGo(zones){
  return zones.map(z=>{
    const name = (z.name||'').toLowerCase();
    const isNoGo = z.isNoGo || /interzis|interzisă|interzise/.test(name);
    return {...z, isNoGo};
  });
}
