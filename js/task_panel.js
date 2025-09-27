// TaskPanel: floating UI for waypoints & task queues (Romanian labels)
// Works without editing HTML; injects its own panel and minimal styles.
// Depends on: tasks.js API and read-only access to sim & ui for helpers.
//
// Usage in app.js (after UI & Simulator exist):
//   import { TaskPanel } from './task_panel.js';
//   const taskPanel = new TaskPanel({ ui, sim, Tasks });
//   // in your main loop, call taskPanel.render(); (or setInterval)
//
export class TaskPanel {
  constructor({ ui, sim, Tasks }){
    this.ui = ui;
    this.sim = sim;
    this.Tasks = Tasks;
    this.selectedId = null;
    this.awaitingClick = false;
    this._build();
    // poll render lightly
    setInterval(()=> this.render(), 500);
    // Try to infer the map/canvas for click picking
    this._boundCanvasClick = (e)=> this._onCanvasClick(e);
    this._attachCanvasListener();
  }

  _attachCanvasListener(){
    // Try common IDs/classes known in this project; fallback to first <canvas>
    const candidates = [
      '#map', '#canvas', '#mapCanvas', 'canvas.map', 'canvas#main', 'canvas'
    ];
    for(const sel of candidates){
      const el = document.querySelector(sel);
      if(el){ this.canvas = el; break; }
    }
    if(this.canvas){
      this.canvas.addEventListener('click', this._boundCanvasClick);
    }
  }

  destroy(){
    if(this.canvas){
      this.canvas.removeEventListener('click', this._boundCanvasClick);
    }
    this.panel?.remove();
    this.panel = null;
  }

  _build(){
    // styles
    const style = document.createElement('style');
    style.textContent = `
    .tpanel{ position: fixed; right: 16px; top: 16px; width: 320px; max-height: 80vh;
      background: rgba(255,255,255,0.96); border: 1px solid #ddd; border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12); display:flex; flex-direction:column; overflow:hidden; z-index: 9999; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; }
    .tp-h{ padding: 12px 14px; font-weight: 700; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px; }
    .tp-h button{ margin-left:auto; }
    .tp-body{ padding: 10px 12px; overflow:auto; }
    .tp-row{ display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .tp-select{ width: 100%; padding:6px 8px; border:1px solid #ddd; border-radius: 8px; }
    .tp-btn{ padding:6px 10px; border:1px solid #ccc; background:#fafafa; border-radius:8px; cursor:pointer; }
    .tp-btn.primary{ background:#0ea5e9; color:white; border-color:#0ea5e9; }
    .tp-btn.red{ background:#ef4444; color:white; border-color:#ef4444; }
    .tp-list{ list-style:none; margin:6px 0 0 0; padding:0; }
    .tp-list li{ display:flex; align-items:center; gap:8px; padding:6px 6px; border:1px dashed #ddd; border-radius:8px; margin-bottom:6px; }
    .tp-small{ font-size:12px; color:#666; }
    .tp-muted{ color:#777; }
    .tp-pill{ font-size:11px; padding:2px 6px; background:#f1f5f9; border-radius:9999px; }
    `;
    document.head.appendChild(style);

    // panel
    const panel = document.createElement('div');
    panel.className = 'tpanel';
    panel.innerHTML = `
      <div class="tp-h">
        <span>🧭 Sarcini & Waypoints</span>
        <button class="tp-btn" data-act="minimize">–</button>
      </div>
      <div class="tp-body">
        <div class="tp-row">
          <select class="tp-select" data-ref="assetSel"></select>
        </div>
        <div class="tp-row">
          <button class="tp-btn" data-act="start">Start</button>
          <button class="tp-btn" data-act="cancel">Anulează</button>
          <button class="tp-btn red" data-act="clear">Curăță</button>
        </div>
        <div class="tp-row">
          <button class="tp-btn primary" data-act="add">+ Waypoint</button>
          <span class="tp-small tp-muted">apoi click pe hartă</span>
        </div>
        <div class="tp-row">
          <span class="tp-small">Coada:</span>
        </div>
        <ul class="tp-list" data-ref="queue"></ul>
        <div class="tp-row">
          <span class="tp-small">Stare: <span data-ref="status" class="tp-pill">idle</span></span>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    this.panel = panel;

    panel.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-act]');
      if(!btn) return;
      const act = btn.getAttribute('data-act');
      this._handleAction(act);
    });
  }

  _handleAction(act){
    const id = this._currentAssetId();
    if(act==='minimize'){
      const body = this.panel.querySelector('.tp-body');
      body.style.display = (body.style.display==='none' ? 'block' : 'none');
      return;
    }
    if(!id){
      this.ui?.toast?.('Selectați un activ mai întâi.');
      return;
    }
    switch(act){
      case 'start': this.Tasks.start(id); this.ui?.toast?.(`Sarcini pornite: ${id}`); break;
      case 'cancel': this.Tasks.cancel(id); this.ui?.toast?.(`Sarcini oprite: ${id}`); break;
      case 'clear':
        const q = this.Tasks.getQueue(id);
        q.length = 0;
        this.ui?.toast?.(`Coada goală pentru ${id}`);
        break;
      case 'add':
        this.awaitingClick = true;
        this.ui?.toast?.('Click pe hartă pentru a adăuga waypoint…');
        break;
    }
  }

  _onCanvasClick(e){
    if(!this.awaitingClick) return;
    const id = this._currentAssetId();
    if(!id) return;
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // Assume UI has world<->screen helpers; fallback to proportional mapping
    let wx, wy;
    if(typeof this.ui?.screenToWorld === 'function'){
      const p = this.ui.screenToWorld({x:cx, y:cy});
      wx = p.x; wy = p.y;
    } else {
      // Proportional mapping to sim dimensions
      const w = this.sim?.w || 250;
      const h = this.sim?.h || 150;
      wx = cx / rect.width * w;
      wy = cy / rect.height * h;
    }
    this.Tasks.addWaypoint(id, { x: wx, y: wy });
    if(!this.Tasks.isRunning(id)) this.Tasks.start(id);
    this.awaitingClick = false;
    this.ui?.toast?.(`Waypoint adăugat la (${wx.toFixed(1)}, ${wy.toFixed(1)}) pentru ${id}`);
  }

  _currentAssetId(){
    const sel = this.panel.querySelector('[data-ref="assetSel"]');
    return sel?.value || null;
  }

  _assetOptions(){
    // Gather assets from simulator
    const arr = [];
    if(this.sim && typeof this.sim.assets === 'function'){
      for(const a of this.sim.assets()){
        arr.push(a);
      }
    } else if(this.sim?.assets){ // array
      arr.push(...this.sim.assets);
    }
    return arr;
  }

  render(){
    // update asset select
    const sel = this.panel.querySelector('[data-ref="assetSel"]');
    const cur = sel.value;
    const assets = this._assetOptions();
    // if empty or length mismatch, rebuild
    if(sel.options.length !== assets.length){
      sel.innerHTML = assets.map(a=>`<option>${a.id}</option>`).join('');
      if(!this.selectedId && assets[0]) this.selectedId = assets[0].id;
      sel.value = this.selectedId || cur || (assets[0]?.id||'');
    }
    this.selectedId = sel.value || this.selectedId;

    // queue list
    const qEl = this.panel.querySelector('[data-ref="queue"]');
    qEl.innerHTML = '';
    const q = this.selectedId ? (this.Tasks.getQueue(this.selectedId)||[]) : [];
    q.forEach((wp, idx)=>{
      const li = document.createElement('li');
      li.innerHTML = `<span>#${idx+1}</span><span class="tp-small">(${wp.x.toFixed(1)}, ${wp.y.toFixed(1)})</span>
                      <button class="tp-btn" data-del="${idx}">Șterge</button>`;
      qEl.appendChild(li);
      li.querySelector('[data-del]')?.addEventListener('click', ()=>{
        const qq = this.Tasks.getQueue(this.selectedId);
        if(qq){ qq.splice(idx,1); }
        this.render();
      });
    });

    // status pill
    const st = this.panel.querySelector('[data-ref="status"]');
    const running = this.selectedId ? this.Tasks.isRunning(this.selectedId) : false;
    st.textContent = running ? 'în derulare' : 'oprit';
  }
}
