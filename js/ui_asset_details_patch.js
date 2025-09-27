// Show/edit asset metadata inside the existing "Detalii Asset" area if present.
// No modal; if sidebar missing, show a small bottom-right card (non-blocking).
import { getMeta, setMeta } from './asset_meta.js';

(function(){
  function findHost(){
    const ids=['#assetDetails','#details','#detalii'];
    for(const s of ids){ const n=document.querySelector(s); if(n) return n; }
    const candidates = Array.from(document.querySelectorAll('aside, .right-panel, .details-panel'));
    if(candidates[0]) return candidates[0];
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed; right:16px; bottom:16px; width:320px; background:#fff; border:1px solid #eee; border-radius:12px; box-shadow:0 10px 24px rgba(0,0,0,0.1); z-index:9998; font-family:ui-sans-serif,system-ui;';
    const head = document.createElement('div');
    head.textContent='Detalii Asset'; head.style.cssText='padding:10px 12px;font-weight:700;border-bottom:1px solid #eee;';
    const body = document.createElement('div'); body.style.cssText='padding:10px 12px;';
    div.append(head, body); document.body.appendChild(div);
    return body;
  }
  const host = findHost();

  const style = document.createElement('style');
  style.textContent = `.am-row{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; align-items:center; margin-bottom:6px;}
  .am-row input{ padding:6px 8px; border:1px solid #d1d5db; border-radius:6px; } .am-sec{margin:10px 0;padding:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;}`;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'am-sec';
  box.innerHTML = `
    <div style="font-weight:600; margin-bottom:6px;">Echipament — Date</div>
    <div class="am-row"><label>Data adăugării</label><input type="date" data-ref="dadd"></div>
    <div class="am-row"><label>Scadență Verificare</label><input type="date" data-ref="dverif"></div>
    <div class="am-row"><label>Scadență ISCIR</label><input type="date" data-ref="disc"></div>
    <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
      <button data-act="save">Salvează</button>
    </div>`;
  host.appendChild(box);
  const $ = sel => box.querySelector(sel);

  let selectedId = null;
  function updateForm(id){
    const m = getMeta(id) || {};
    $('[data-ref="dadd"]').value = (m.dateAdded||'').slice(0,10);
    $('[data-ref="dverif"]').value = (m.dueVerification||'').slice(0,10);
    $('[data-ref="disc"]').value = (m.dueIscir||'').slice(0,10);
  }

  box.addEventListener('click', (e)=>{
    if(e.target.getAttribute('data-act')==='save' && selectedId){
      const dateAdded = $('[data-ref="dadd"]').value || null;
      const dueVerification = $('[data-ref="dverif"]').value || null;
      const dueIscir = $('[data-ref="disc"]').value || null;
      setMeta(selectedId, { dateAdded, dueVerification, dueIscir });
      window.__rtls?.ui?.toast?.('Date salvate.');
    }
  });

  const ui = window.__rtls?.ui;
  const possible = ['assetSelected','select','selected','asset:select'];
  let bound = false;
  if(ui && typeof ui.on==='function'){
    for(const ev of possible){
      try{ ui.on(ev, (id)=>{ selectedId = id?.id || id; updateForm(selectedId); bound=true; }); }catch(_){}
    }
  }
  function findCanvas(){
    const sels=['#map','#canvas','#mapCanvas','canvas.map','canvas#main','canvas'];
    for(const s of sels){ const el=document.querySelector(s); if(el) return el; }
    return null;
  }
  const canvas = findCanvas();
  if(canvas){
    canvas.addEventListener('click', (e)=>{
      if(bound) return;
      const sim = window.__rtls?.sim;
      if(!sim || typeof sim.assets!=='function') return;
      const rect=canvas.getBoundingClientRect();
      const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
      let wx,wy;
      if(typeof ui?.screenToWorld==='function'){ const p=ui.screenToWorld({x:cx,y:cy}); wx=p.x; wy=p.y; }
      else { const w=sim?.w||250,h=sim?.h||150; wx=cx/rect.width*w; wy=cy/rect.height*h; }
      let best=null,bd=1e9;
      for(const a of sim.assets()){ const d=Math.hypot(a.x-wx,a.y-wy); if(d<bd){bd=d; best=a;} }
      if(best && bd<8){ selectedId=best.id; updateForm(best.id); }
    });
  }
})();
