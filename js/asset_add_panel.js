// Floating "Adaugă asset" panel + click-to-place on map.
// Depends on: sim (for addAsset), ui (for toasts), and asset_meta.js for metadata.
import { setMeta } from './asset_meta.js';

(function(){
  // find canvas
  const candidates = ['#map','#canvas','#mapCanvas','canvas.map','canvas#main','canvas'];
  let canvas=null;
  for(const sel of candidates){ const el = document.querySelector(sel); if(el){ canvas=el; break; }}

  // styles
  const style = document.createElement('style');
  style.textContent = `
  .aap-btn{ position: fixed; left: 16px; top: 16px; z-index: 9999; }
  .aap-btn button{ padding:8px 10px; border:1px solid #ccc; background:#fff; border-radius:10px; cursor:pointer; box-shadow:0 6px 16px rgba(0,0,0,0.12); }
  .aap-modal{ position: fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.35); z-index: 10000; }
  .aap-card{ width: 460px; background:#fff; border-radius:16px; border:1px solid #e5e7eb; box-shadow:0 10px 30px rgba(0,0,0,0.18); overflow:hidden; }
  .aap-h{ padding:12px 16px; font-weight:700; border-bottom:1px solid #eee; display:flex; align-items:center; }
  .aap-body{ padding:12px 16px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  .aap-row{ display:flex; flex-direction:column; gap:6px; }
  .aap-row input, .aap-row select{ padding:6px 8px; border:1px solid #ddd; border-radius:8px; }
  .aap-row.full{ grid-column:1/-1; }
  .aap-foot{ padding:12px 16px; border-top:1px solid #eee; display:flex; gap:10px; justify-content:flex-end; }
  .aap-note{ font-size:12px; color:#666; }
  .aap-choose{ display:inline-flex; align-items:center; gap:6px; }
  `;
  document.head.appendChild(style);

  // button
  const btnWrap = document.createElement('div');
  btnWrap.className = 'aap-btn';
  btnWrap.innerHTML = `<button id="aap-open">＋ Adaugă asset</button>`;
  document.body.appendChild(btnWrap);

  // modal
  const modal = document.createElement('div');
  modal.className = 'aap-modal';
  modal.innerHTML = `
    <div class="aap-card">
      <div class="aap-h">Adaugă asset</div>
      <div class="aap-body">
        <div class="aap-row"><label>ID</label><input type="text" data-ref="id" placeholder="ex: F6"></div>
        <div class="aap-row"><label>Tip</label>
          <select data-ref="type">
            <option value="forklift">Stivuitor</option>
            <option value="lifter">Lifter mic</option>
            <option value="other">Altul</option>
          </select>
        </div>
        <div class="aap-row"><label>Data adăugării</label><input type="date" data-ref="dadd"></div>
        <div class="aap-row"><label>Scadență Verificare</label><input type="date" data-ref="dverif"></div>
        <div class="aap-row"><label>Scadență ISCIR</label><input type="date" data-ref="disc"></div>
        <div class="aap-row full">
          <label>Poziție</label>
          <div class="aap-choose">
            <button data-act="pick">Alege pe hartă</button>
            <span class="aap-note" data-ref="pos">nealeasă</span>
          </div>
        </div>
      </div>
      <div class="aap-foot">
        <button data-act="cancel">Anulează</button>
        <button data-act="save">Salvează</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const $ = (sel)=> modal.querySelector(sel);
  let picking = false;
  let pos = null;

  function open(){
    modal.style.display = 'flex';
    // defaults
    const d = new Date();
    const today = d.toISOString().slice(0,10);
    $('[data-ref="dadd"]').value = today;
    const next = new Date(Date.now()+30*24*3600*1000).toISOString().slice(0,10);
    $('[data-ref="dverif"]').value = next;
    const iscir = new Date(Date.now()+180*24*3600*1000).toISOString().slice(0,10);
    $('[data-ref="disc"]').value = iscir;

    // suggest id
    $('[data-ref="id"]').value = suggestId();
    pos = null;
    $('[data-ref="pos"]').textContent = 'nealeasă';
  }
  function close(){ modal.style.display = 'none'; cancelPick(); }

  function suggestId(){
    // naive: scan existing labels in DOM or fallback to A# number
    const ids = Array.from(document.querySelectorAll('[data-asset-id]')).map(x=>x.getAttribute('data-asset-id'));
    let i=1; while(ids.includes('A'+i)) i++;
    return 'A'+i;
  }

  function startPick(){
    if(!canvas){
      alert('Nu am găsit harta/canvas pentru poziționare.');
      return;
    }
    picking = true;
    document.body.style.cursor = 'crosshair';
    $('[data-ref="pos"]').textContent = 'click pe hartă…';
  }
  function cancelPick(){
    picking = false;
    document.body.style.cursor = 'default';
  }

  document.getElementById('aap-open').addEventListener('click', open);
  modal.addEventListener('click', (e)=>{
    const act = e.target.getAttribute('data-act');
    if(!act) return;
    if(act==='cancel'){ close(); }
    if(act==='pick'){ startPick(); }
    if(act==='save'){
      const id = $('[data-ref="id"]').value.trim();
      const type = $('[data-ref="type"]').value;
      const dateAdded = $('[data-ref="dadd"]').value || null;
      const dueVerification = $('[data-ref="dverif"]').value || null;
      const dueIscir = $('[data-ref="disc"]').value || null;
      if(!id){ alert('Setați un ID.'); return; }
      if(!pos){ alert('Alegeți o poziție pe hartă.'); return; }
      // add to sim
      try{
        const w = window.__rtls?.sim;
        const sim = w || window.sim || null;
        if(sim && typeof sim.addAsset === 'function'){
          sim.addAsset({ id, type, x: pos.x, y: pos.y, heading: 0, maxSpeed: (type==='lifter'?3.5:5)/3.6 });
        }
      }catch(_){}
      // save metadata
      setMeta(id, { dateAdded, dueVerification, dueIscir });
      // annotate DOM (optional hook)
      const el = document.querySelector(`[data-asset-id="${id}"]`);
      if(el){ el.setAttribute('title', `Adăugat: ${dateAdded}\nVerif: ${dueVerification}\nISCIR: ${dueIscir}`); }
      close();
      (window.__rtls?.ui?.toast)?.('Asset adăugat.');
    }
  });

  if(canvas){
    canvas.addEventListener('click', (e)=>{
      if(!picking) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let wx, wy;
      const ui = window.__rtls?.ui;
      const sim = window.__rtls?.sim;
      if(typeof ui?.screenToWorld === 'function'){
        const p = ui.screenToWorld({x:cx,y:cy}); wx=p.x; wy=p.y;
      }else{
        const w = sim?.w || 250, h = sim?.h || 150;
        wx = cx/rect.width*w; wy = cy/rect.height*h;
      }
      pos = {x:wx, y:wy};
      $('[data-ref="pos"]').textContent = `(${wx.toFixed(1)}, ${wy.toFixed(1)})`;
      cancelPick();
    });
  }
})();
