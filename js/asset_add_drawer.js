// Seamlessly add an "Adaugă asset" control that matches your toolbar,
// and open a NON-BLOCKING right-side drawer (no full-screen overlay).
// Map remains clickable; "Alege pe hartă" uses a one-shot canvas click.
//
// Requires: window.__rtls.sim (addAsset) and window.__rtls.ui (optional toast).
import { setMeta } from './asset_meta.js';

(function(){
  // Find toolbar and clone an existing button to keep CSS/UX consistent
  function findResetBtn(){
    const btns = Array.from(document.querySelectorAll('button, .btn, .chip, .control button'));
    return btns.find(b => /Reset pozi/i.test(b.textContent || ''));
  }
  const resetBtn = findResetBtn();
  if(!resetBtn) return; // don't inject if toolbar not ready

  const addBtn = resetBtn.cloneNode(true);
  addBtn.id = 'btn-add-asset';
  addBtn.textContent = 'Adaugă asset';
  addBtn.addEventListener('click', toggleDrawer);

  // insert right after reset
  resetBtn.parentElement?.insertBefore(addBtn, resetBtn.nextSibling);

  // Build drawer (no backdrop)
  const style = document.createElement('style');
  style.textContent = `
  .asset-drawer{ position: fixed; right: 16px; top: 72px; width: 360px; max-height: calc(100vh - 88px);
    background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow:0 10px 28px rgba(0,0,0,0.18);
    display:none; overflow:auto; z-index: 9998; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
  .asset-drawer.open{ display:block; }
  .ad-h{ padding:12px 14px; font-weight:700; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px; }
  .ad-h button{ margin-left:auto; }
  .ad-b{ padding:12px 14px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  .ad-row{ display:flex; flex-direction:column; gap:6px; }
  .ad-row input, .ad-row select{ padding:6px 8px; border:1px solid #d1d5db; border-radius:8px; }
  .ad-row.full{ grid-column:1/-1; }
  .ad-f{ padding:12px 14px; border-top:1px solid #eee; display:flex; gap:10px; justify-content:flex-end; }
  .ad-note{ font-size:12px; color:#666; }
  .ad-pick{ background:#0ea5e9; color:#fff; border-color:#0ea5e9; }
  `;
  document.head.appendChild(style);

  const drawer = document.createElement('div');
  drawer.className = 'asset-drawer';
  drawer.innerHTML = `
    <div class="ad-h">Adaugă asset <button data-act="close">×</button></div>
    <div class="ad-b">
      <div class="ad-row"><label>ID</label><input type="text" data-ref="id" placeholder="ex: F6"></div>
      <div class="ad-row"><label>Tip</label>
        <select data-ref="type">
          <option value="forklift">Stivuitor</option>
          <option value="lifter">Lifter mic</option>
          <option value="other">Altul</option>
        </select>
      </div>
      <div class="ad-row"><label>Data adăugării</label><input type="date" data-ref="dadd"></div>
      <div class="ad-row"><label>Scadență Verificare</label><input type="date" data-ref="dverif"></div>
      <div class="ad-row"><label>Scadență ISCIR</label><input type="date" data-ref="disc"></div>
      <div class="ad-row full">
        <label>Poziție</label>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="ad-pick" data-act="pick">Alege pe hartă</button>
          <span class="ad-note" data-ref="pos">nealeasă</span>
        </div>
      </div>
    </div>
    <div class="ad-f">
      <button data-act="cancel">Anulează</button>
      <button data-act="save">Salvează</button>
    </div>
  `;
  document.body.appendChild(drawer);

  function toggleDrawer(){ drawer.classList.toggle('open'); if(drawer.classList.contains('open')) preset(); }
  function closeDrawer(){ drawer.classList.remove('open'); cancelPick(); }

  function preset(){
    // defaults
    const d = new Date();
    const today = d.toISOString().slice(0,10);
    qs('[data-ref="dadd"]').value = today;
    const next = new Date(Date.now()+30*24*3600*1000).toISOString().slice(0,10);
    qs('[data-ref="dverif"]').value = next;
    const iscir = new Date(Date.now()+180*24*3600*1000).toISOString().slice(0,10);
    qs('[data-ref="disc"]').value = iscir;
    qs('[data-ref="id"]').value = suggestId();
    pos = null; qs('[data-ref="pos"]').textContent = 'nealeasă';
  }

  function suggestId(){
    // Prefer numeric suffixes unique among current assets if available
    const ids = new Set();
    try {
      const sim = window.__rtls?.sim;
      if(sim && typeof sim.assets==='function'){ for(const a of sim.assets()) ids.add(a.id); }
    } catch(_){}
    let pfx='A', i=1; while(ids.has(pfx+i)) i++; return pfx+i;
  }

  const qs = sel => drawer.querySelector(sel);
  let picking = false, pos = null;

  drawer.addEventListener('click', (e)=>{
    const act = e.target.getAttribute('data-act');
    if(!act) return;
    if(act==='close' || act==='cancel'){ closeDrawer(); }
    if(act==='pick'){ startPick(); }
    if(act==='save'){
      const id = (qs('[data-ref="id"]').value||'').trim();
      const type = qs('[data-ref="type"]').value;
      const dateAdded = qs('[data-ref="dadd"]').value || null;
      const dueVerification = qs('[data-ref="dverif"]').value || null;
      const dueIscir = qs('[data-ref="disc"]').value || null;
      if(!id){ return alert('Setați un ID.'); }
      if(!pos){ return alert('Alegeți o poziție pe hartă.'); }
      try{
        const sim = window.__rtls?.sim || window.sim;
        if(sim && typeof sim.addAsset==='function'){
          sim.addAsset({ id, type, x: pos.x, y: pos.y, heading: 0, maxSpeed: (type==='lifter'?3.5:5)/3.6 });
        }
      }catch(_){}
      setMeta(id, { dateAdded, dueVerification, dueIscir });
      window.__rtls?.ui?.toast?.('Asset adăugat.');
      closeDrawer();
    }
  });

  // One-shot picking without blocking the map (no overlay)
  function startPick(){
    picking = true;
    hint('Click pe hartă pentru a poziționa asset-ul…');
    addBtn.disabled = true; // prevent re-open while picking
    // Optionally, visually indicate pick mode without covering map
    bar.style.display = 'block';
    bar.textContent = 'Mod plasare: click pe hartă… (Esc pentru anulare)';
  }
  function cancelPick(){
    picking = false;
    addBtn.disabled = false;
    bar.style.display = 'none';
    bar.textContent = '';
  }

  // Hint bar (non-blocking, small)
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:20px;background:#111;color:#fff;padding:6px 10px;border-radius:9999px;font-size:12px;z-index:9999;display:none;';
  document.body.appendChild(bar);
  function hint(msg){ bar.style.display='block'; bar.textContent=msg; }

  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && picking) cancelPick(); });

  // Canvas click handling
  function findCanvas(){
    const sels=['#map','#canvas','#mapCanvas','canvas.map','canvas#main','canvas'];
    for(const s of sels){ const el=document.querySelector(s); if(el) return el; }
    return null;
  }
  const canvas = findCanvas();
  if(canvas){
    canvas.addEventListener('click', (e)=>{
      if(!picking) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let wx, wy;
      const ui = window.__rtls?.ui;
      const sim = window.__rtls?.sim;
      if(typeof ui?.screenToWorld==='function'){
        const p = ui.screenToWorld({x:cx, y:cy}); wx=p.x; wy=p.y;
      }else{
        const w = sim?.w || 250, h = sim?.h || 150;
        wx = cx/rect.width*w; wy = cy/rect.height*h;
      }
      pos = {x:wx, y:wy};
      qs('[data-ref="pos"]').textContent = `(${wx.toFixed(1)}, ${wy.toFixed(1)})`;
      cancelPick();
    });
  }
})();
