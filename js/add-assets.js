// js/add-assets.js
// Stage 1 add-on: smooth movement + add new assets (stivuitor, lifter, extinctor)
// Non-invasive: assumes there is a #stage element (absolute or relative container) on your page.
// Exposes window.AssetsAdd with helper funcs; integrates safely if your app already defines window.App.

(function(){
  const SPEED_MPS = 5 * 1000 / 3600; // 5 km/h in m/s
  const DEFAULT_SCALE = 2.0; // pixels per meter (adjust if your canvas scaling differs)

  const state = {
    machines: [], // {id,type:'forklift'|'lifter', tag, x,y, vx,vy, lastMoveAt, lastCheckedAt, lastApprovedAt}
    extinguishers: [], // {id, tag, x,y, expiresAt}
    running: true,
    scale: DEFAULT_SCALE,
    draggingExt: null,
    dragOffset: {x:0,y:0},
    lastT: performance.now()
  };

  const stage = document.getElementById('stage') || document.body;
  stage.style.position = stage.style.position || 'relative';

  const el = (t, cls, html) => {
    const e = document.createElement(t);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const uid = (p) => `${p}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const tagFromCount = (type, count) => `${type==='forklift'?'F':'L'}-${String(count+1).padStart(3,'0')}`;

  // Public API
  const api = {
    addForklift(x, y){
      const id = uid('M');
      const tag = tagFromCount('forklift', state.machines.filter(m=>m.type==='forklift').length);
      const m = {id, type:'forklift', tag, x:x??rand(40, 400), y:y??rand(40, 250), vx:0, vy:0,
                 lastMoveAt: Date.now(), lastCheckedAt: Date.now()-86400000*rand(1,90),
                 lastApprovedAt: Date.now()-86400000*rand(30,365)};
      state.machines.push(m);
      drawMachine(m);
      return m;
    },
    addLifter(x, y){
      const id = uid('M');
      const tag = tagFromCount('lifter', state.machines.filter(m=>m.type==='lifter').length);
      const m = {id, type:'lifter', tag, x:x??rand(40, 400), y:y??rand(40, 250), vx:0, vy:0,
                 lastMoveAt: Date.now(), lastCheckedAt: Date.now()-86400000*rand(1,90),
                 lastApprovedAt: Date.now()-86400000*rand(30,365)};
      state.machines.push(m);
      drawMachine(m);
      return m;
    },
    addExtinguisher(x, y, expiresDays=120){
      const id = uid('X');
      const tag = `X-${String(state.extinguishers.length+1).padStart(3,'0')}`;
      const ex = {id, tag, x:x??rand(20, 420), y:y??rand(20, 260), expiresAt: Date.now()+expiresDays*86400000};
      state.extinguishers.push(ex);
      drawExtinguisher(ex);
      return ex;
    },
    setScale(pxPerMeter){ state.scale = pxPerMeter; },
    start(){ state.running = true; },
    stop(){ state.running = false; },
    getState(){ return state; }
  };

  function rand(a,b){ return Math.random()*(b-a)+a; }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  // Rendering
  function drawMachine(m){
    let node = document.getElementById(m.id);
    if (!node){
      node = el('div', `asset machine ${m.type}`);
      node.id = m.id;
      node.title = `${m.type==='forklift'?'Stivuitor':'Lifter'} ${m.tag}`;
      const inner = el('div', 'glyph', m.type==='forklift'?'🚜':'🤖');
      const label = el('span', 'label', m.tag);
      node.appendChild(inner);
      node.appendChild(label);
      stage.appendChild(node);
    }
    node.style.transform = `translate(${m.x}px, ${m.y}px)`;
  }

  function drawExtinguisher(x){
    let node = document.getElementById(x.id);
    if (!node){
      node = el('div', `asset ext`);
      node.id = x.id;
      node.title = `Extinctor ${x.tag}`;
      const inner = el('div', 'glyph', '🧯');
      const label = el('span', 'label', x.tag);
      node.appendChild(inner);
      node.appendChild(label);
      node.addEventListener('mousedown', (e)=> beginDragExt(e, x.id));
      stage.appendChild(node);
    }
    node.style.transform = `translate(${x.x}px, ${x.y}px)`;
    // expired style
    const expired = Date.now() > x.expiresAt;
    node.classList.toggle('expired', expired);
  }

  function beginDragExt(e, id){
    const ex = state.extinguishers.find(a=>a.id===id);
    if (!ex) return;
    const rect = stage.getBoundingClientRect();
    const node = document.getElementById(id);
    const nodeRect = node.getBoundingClientRect();
    state.draggingExt = ex;
    state.dragOffset.x = e.clientX - nodeRect.left;
    state.dragOffset.y = e.clientY - nodeRect.top;
    window.addEventListener('mousemove', onDragExt);
    window.addEventListener('mouseup', endDragExt);
    e.preventDefault();
  }
  function onDragExt(e){
    if(!state.draggingExt) return;
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left - state.dragOffset.x;
    const y = e.clientY - rect.top - state.dragOffset.y;
    state.draggingExt.x = clamp(x, 0, rect.width-24);
    state.draggingExt.y = clamp(y, 0, rect.height-24);
    drawExtinguisher(state.draggingExt);
  }
  function endDragExt(){
    state.draggingExt = null;
    window.removeEventListener('mousemove', onDragExt);
    window.removeEventListener('mouseup', endDragExt);
  }

  // Simple movement model with smoothing toward random waypoints
  function ensureTargets(){
    for(const m of state.machines){
      if(!m.tx || Math.hypot(m.tx-m.x, m.ty-m.y) < 8){
        const r = stage.getBoundingClientRect();
        m.tx = rand(16, r.width-16);
        m.ty = rand(16, r.height-16);
      }
    }
  }
  function tick(dt){
    ensureTargets();
    const mps = SPEED_MPS;
    const pxps = mps * state.scale; // pixels per second
    const maxStep = pxps * (dt/1000);
    for(const m of state.machines){
      const dx = m.tx - m.x, dy = m.ty - m.y;
      const dist = Math.hypot(dx,dy) || 1;
      const step = Math.min(maxStep, dist);
      const nx = m.x + dx/dist * step;
      const ny = m.y + dy/dist * step;
      m.vx = nx - m.x; m.vy = ny - m.y;
      m.x = nx; m.y = ny;
      drawMachine(m);
    }
    for(const x of state.extinguishers) drawExtinguisher(x);
  }

  function loop(t){
    const dt = t - state.lastT;
    state.lastT = t;
    if (state.running) tick(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Minimal toolbar (optional): if you have #add-toolbar, wire buttons automatically
  const tb = document.getElementById('add-toolbar');
  if (tb){
    const bF = el('button', 'btn add-f', 'Adaugă stivuitor');
    const bL = el('button', 'btn add-l', 'Adaugă lifter');
    const bX = el('button', 'btn add-x', 'Adaugă extinctor');
    [bF,bL,bX].forEach(b=>tb.appendChild(b));
    bF.addEventListener('click', ()=>api.addForklift());
    bL.addEventListener('click', ()=>api.addLifter());
    bX.addEventListener('click', ()=>api.addExtinguisher());
  }

  // Expose
  window.AssetsAdd = api;
})();