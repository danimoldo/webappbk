// Inject metadata view/edit into the right details panel (Detalii Asset)
import { getMeta, setMeta } from './asset_meta.js';

(function(){
  // find panel
  const panel = document.querySelector('#assetDetails, #details, .details-panel, .right-panel, [data-panel="asset"], #detalii, aside');
  let host = panel;
  if(!host){
    // fallback: create a slim right card
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed; right:16px; bottom:16px; width:320px; background:#fff; border:1px solid #eee; border-radius:12px; box-shadow:0 10px 24px rgba(0,0,0,0.1); z-index:9999; font-family:ui-sans-serif,system-ui;';
    div.innerHTML = '<div style="padding:10px 12px; font-weight:700; border-bottom:1px solid #eee">Detalii Asset</div><div data-ref="body" style="padding:10px 12px;"></div>';
    document.body.appendChild(div);
    host = div.querySelector('[data-ref="body"]');
  }

  // build our section
  const section = document.createElement('div');
  section.innerHTML = `
    <div style="margin:10px 0; padding:10px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px;">
      <div style="font-weight:600; margin-bottom:6px;">Echipament — Date</div>
      <div class="row"><label>Data adăugării</label><input type="date" data-ref="dadd"></div>
      <div class="row"><label>Scadență Verificare</label><input type="date" data-ref="dverif"></div>
      <div class="row"><label>Scadență ISCIR</label><input type="date" data-ref="disc"></div>
      <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
        <button data-act="save">Salvează</button>
      </div>
    </div>
  `;
  // row styles
  const st = document.createElement('style');
  st.textContent = `.row{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; align-items:center; margin-bottom:6px;}
  .row input{ padding:6px 8px; border:1px solid #d1d5db; border-radius:6px; }`;
  document.head.appendChild(st);

  host.appendChild(section);
  const $ = (sel)=> section.querySelector(sel);

  let selectedId = null;

  function updateForm(id){
    const m = getMeta(id) || {};
    $('[data-ref="dadd"]').value = (m.dateAdded||'').slice(0,10);
    $('[data-ref="dverif"]').value = (m.dueVerification||'').slice(0,10);
    $('[data-ref="disc"]').value = (m.dueIscir||'').slice(0,10);
  }

  // save button
  section.addEventListener('click', (e)=>{
    const act = e.target.getAttribute('data-act');
    if(act==='save' && selectedId){
      const dateAdded = $('[data-ref="dadd"]').value || null;
      const dueVerification = $('[data-ref="dverif"]').value || null;
      const dueIscir = $('[data-ref="disc"]').value || null;
      setMeta(selectedId, { dateAdded, dueVerification, dueIscir });
      (window.__rtls?.ui?.toast)?.('Date salvate.');
    }
  });

  // selection by map click (robust fallback)
  const candidates = ['#map','#canvas','#mapCanvas','canvas.map','canvas#main','canvas'];
  let canvas=null;
  for(const sel of candidates){ const el = document.querySelector(sel); if(el){ canvas=el; break; }}

  function pickNearestAsset(e){
    const sim = window.__rtls?.sim;
    if(!sim || typeof sim.assets!=='function') return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    let wx, wy;
    const ui = window.__rtls?.ui;
    if(typeof ui?.screenToWorld === 'function'){
      const p = ui.screenToWorld({x:cx,y:cy}); wx=p.x; wy=p.y;
    }else{
      const w = sim?.w || 250, h = sim?.h || 150;
      wx = cx/rect.width*w; wy = cy/rect.height*h;
    }
    let best=null, bestd=1e9;
    for(const a of sim.assets()){
      const d = Math.hypot(a.x-wx, a.y-wy);
      if(d<bestd){ bestd=d; best=a; }
    }
    if(best && bestd < 8){ // within 8m selection radius
      selectedId = best.id;
      updateForm(best.id);
    }
  }

  if(canvas){
    canvas.addEventListener('click', pickNearestAsset);
  }

  // If UI emits a selection event, prefer that (no idea the exact event name; try common ones)
  const ui = window.__rtls?.ui;
  const possible = ['assetSelected','select','selected','asset:select'];
  if(ui && typeof ui.on === 'function'){
    for(const ev of possible){
      try{
        ui.on(ev, (id)=>{ selectedId = id?.id || id; updateForm(selectedId); });
      }catch(_){}
    }
  }
})();
