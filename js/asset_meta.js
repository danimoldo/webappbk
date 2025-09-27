// Asset metadata: dateAdded, dueVerification, dueIscir
const KEY = 'rtls_asset_meta_v1';
let meta = {};

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    meta = raw ? JSON.parse(raw) : {};
  }catch(_){ meta = {}; }
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(meta)); }catch(_){}
}

export function setMeta(id, data){
  if(!id) return;
  meta[id] = {
    ...(meta[id]||{}),
    ...data
  };
  save();
}
export function getMeta(id){
  if(!id) return null;
  return meta[id] || null;
}
export function removeMeta(id){
  if(!id) return;
  delete meta[id];
  save();
}
export function allMeta(){ return {...meta}; }

load();
