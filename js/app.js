// app.js (ES module)
import { clamp, now, dist, pointInPoly } from './utils.js';
import { ZoneManager } from './zones.js';
import { Simulator } from './sim.js';
import { UI } from './ui.js';
import { RTLSClient } from './ws-client.js';

const state = {
  site: { width_m: 250, height_m: 150, height_m_ceiling: 8 },
  m_per_px: 0.2,
  mps: 1.389,
  zones: new ZoneManager(),
  assets: [],
  events: [],
  heatmap: { enabled:false, cell: 5, grid: {} },
  pointInZone(pt, z){ return pointInPoly(pt, z.polygon); },
  emitEvent(type, payload){
    const msg=(type==='ENTER_ZONE'||type==='EXIT_ZONE') ? `${payload.asset} ${type==='ENTER_ZONE'?'intră în':'iese din'} ${payload.zone}` :
      (type==='MEET'?`${payload.a} apropie ${payload.b}` : (type==='LEAVE'?`${payload.a} se depărtează de ${payload.b}` : JSON.stringify(payload)));
    this.events.push({ ts: Date.now(), type, msg });
    ui.renderEvents();
  },
  refreshKPIs(){
    document.getElementById('kpiAssets').textContent = this.assets.length;
    const late=this.assets.filter(a => new Date(a.next_check) < new Date()).length;
    document.getElementById('kpiLateInspections').textContent = late;
    const wo=this.assets.reduce((acc,a)=>acc+(a.wo||[]).filter(w=>w.status!=='Finalizată').length,0);
    document.getElementById('kpiWO').textContent = wo;
  }
};

const canvasFloor=document.getElementById('floor');
const canvasOverlay=document.getElementById('overlay');
const ctxFloor=canvasFloor.getContext('2d');
const ctxOverlay=canvasOverlay.getContext('2d');

let floorImg=new Image();
floorImg.onload=()=>drawAll();
floorImg.src='img/floor_example.png';

// Load sample config
fetch('data/sample_config.json').then(r=>r.json()).then(cfg=>{
  state.site=cfg.site; state.assets=cfg.assets; state.zones.load(cfg.zones);
  state.m_per_px=Math.max(state.site.width_m/canvasFloor.width, state.site.height_m/canvasFloor.height);
  state.refreshKPIs();
});

// Simulator + UI
const sim=new Simulator(state);
const ui=new UI(state);

// Helpers
function setToggle(btn, on){ if(!btn) return; btn.classList.toggle('is-active', !!on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
function getMouse(ev, canvas){ const rect=canvas.getBoundingClientRect(); const sx=canvas.width/rect.width, sy=canvas.height/rect.height; return [ (ev.clientX-rect.left)*sx, (ev.clientY-rect.top)*sy ]; }
function toMeters(ev){ const [px,py]=getMouse(ev, canvasOverlay); return [px*state.m_per_px, py*state.m_per_px]; }

// Controls
document.getElementById('btnPlay').onclick=()=>{ sim.setRunning(true); setToggle(document.getElementById('btnPlay'), true); setToggle(document.getElementById('btnPause'), false); };
document.getElementById('btnPause').onclick=()=>{ sim.setRunning(false); setToggle(document.getElementById('btnPause'), true); setToggle(document.getElementById('btnPlay'), false); };
document.getElementById('btnReset').onclick=()=>resetPositions();
document.getElementById('btnDrawZone').onclick=()=>{ startZoneDrawing(); setToggle(document.getElementById('btnDrawZone'), true); };
document.getElementById('btnEditZones').onclick=(e)=>{ state.zones.editMode=!state.zones.editMode; setToggle(e.currentTarget, state.zones.editMode); };
document.getElementById('btnClearZones').onclick=()=>{ state.zones.clear(); setToggle(document.getElementById('btnDrawZone'), false); drawAll(); };
document.getElementById('btnHeatmap').onclick=(e)=>{ state.heatmap.enabled=!state.heatmap.enabled; setToggle(e.currentTarget, state.heatmap.enabled); };
document.getElementById('btnCalibrate').onclick=()=>{ const w=parseFloat(document.getElementById('siteW').value||'250'); const h=parseFloat(document.getElementById('siteH').value||'150'); state.site.width_m=w; state.site.height_m=h; state.m_per_px=Math.max(w/canvasFloor.width, h/canvasFloor.height); };
document.getElementById('btnExport').onclick=()=>exportConfig();
document.getElementById('btnImport').onclick=()=>document.getElementById('fileImport').click();
document.getElementById('fileImport').onchange=(e)=>importConfig(e.target.files[0]);
document.getElementById('fileFloor').onchange=(e)=>loadFloor(e.target.files[0]);
document.getElementById('btnWOBoard').onclick=(e)=>{ const wrap=document.getElementById('kanban'); const on=wrap.style.display==='none'; wrap.style.display=on?'grid':'none'; setToggle(e.currentTarget, on); renderKanban(); renderInventory(); };

// Scenarios
document.getElementById('scnNoGo').onclick=()=>{ const a=state.assets.find(x=>x.type==='lifter')||state.assets[0]; a.vel=[1,0]; state.emitEvent('SCENARIO',{note:'Interdicție încălcată'}); };
document.getElementById('scnMeet').onclick=()=>{ const f1=state.assets.find(x=>x.type==='forklift'); const f2=state.assets.filter(x=>x.type==='forklift')[1]||state.assets[1]; if(f1&&f2){ f1.pos=[50,50]; f1.vel=[1,0]; f2.pos=[60,50]; f2.vel=[-1,0]; state.emitEvent('SCENARIO',{note:'Apropiere periculoasă'}); } };
document.getElementById('scnExpired').onclick=()=>{ const e=state.assets.find(x=>x.type==='extinguisher'); if(e){ e.next_check='2025-01-01'; state.emitEvent('ALERT',{asset:e.id, note:'Stingător expirat'}); } };

// Interaction state
let drawing=false, draggingExt=null, editingVertex=null;

canvasOverlay.addEventListener('mousemove',(ev)=>{
  const m=toMeters(ev);
  if(drawing) state.zones.setHover(m);
  if(draggingExt){ draggingExt.pos=[Math.round(m[0]), Math.round(m[1])]; }
  if(editingVertex){ const z=state.zones.zones[editingVertex.zoneIndex]; z.polygon[editingVertex.vertIndex]=[Math.round(m[0]), Math.round(m[1])]; }
});
canvasOverlay.addEventListener('mousedown',(ev)=>{
  const m=toMeters(ev);
  if(state.zones.editMode){
    const v = findNearestVertex(m, 3);
    if(v){ editingVertex=v; return; }
  }
  if(drawing){ state.zones.addPoint(m); return; }
  const ext = state.assets.find(a=>a.type==='extinguisher' && Math.hypot(a.pos[0]-m[0], a.pos[1]-m[1])<=3);
  if(ext){ draggingExt=ext; return; }
});
window.addEventListener('mouseup',()=>{ draggingExt=null; editingVertex=null; });

canvasOverlay.addEventListener('dblclick',(ev)=>{
  if(drawing){ drawing=false; state.zones.finish('Zonă interzisă','no_go'); setToggle(document.getElementById('btnDrawZone'), false); drawAll(); }
  else if(state.zones.editMode){
    const m=toMeters(ev); const hits=state.zones.containsPoint(m);
    if(hits && hits.length){ const name=prompt('Nume zonă:', hits[0].name||'Zonă'); if(name){ hits[0].name=name; } }
  }
});

canvasOverlay.addEventListener('click',(ev)=>{
  if(drawing) return;
  const rect=canvasOverlay.getBoundingClientRect();
  const [px,py]=getMouse(ev, canvasOverlay);
  const hit = state.assets.find(a => {
    const ax=a.pos[0]/state.m_per_px, ay=a.pos[1]/state.m_per_px;
    return Math.hypot(ax-px, ay-py) <= 10;
  });
  ui.renderDrawer(hit||null);
});

function startZoneDrawing(){ drawing=true; state.zones.startDrawing(); }
function resetPositions(){ for(const a of state.assets) a.pos=[Math.random()*state.site.width_m, Math.random()*state.site.height_m]; }
function findNearestVertex(pt, thresh){ let best=null, bd=Infinity; state.zones.zones.forEach((z,zi)=>{ z.polygon.forEach((v,vi)=>{ const d=Math.hypot(v[0]-pt[0], v[1]-pt[1]); if(d<thresh && d<bd){ bd=d; best={zoneIndex:zi, vertIndex:vi}; } }); }); return best; }
function loadFloor(file){ const url=URL.createObjectURL(file); floorImg=new Image(); floorImg.onload=()=>drawAll(); floorImg.src=url; }

function exportConfig(){ const cfg={site:state.site, zones:state.zones.zones, assets:state.assets}; const blob=new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='config.json'; a.click(); }
function importConfig(file){ const r=new FileReader(); r.onload=()=>{ const cfg=JSON.parse(r.result); state.site=cfg.site||state.site; state.zones.load(cfg.zones||[]); state.assets=cfg.assets||state.assets; state.m_per_px=Math.max(state.site.width_m/canvasFloor.width, state.site.height_m/canvasFloor.height); state.refreshKPIs(); }; r.readAsText(file); }

// Drawers & overlays
function drawAll(){
  ctxFloor.clearRect(0,0,canvasFloor.width, canvasFloor.height);
  ctxFloor.drawImage(floorImg, 0,0, canvasFloor.width, canvasFloor.height);
  ctxOverlay.clearRect(0,0,canvasOverlay.width, canvasOverlay.height);
  state.zones.draw(ctxOverlay, 1/state.m_per_px);
  if(state.heatmap.enabled) drawHeatmap();
  // assets
  for(const a of state.assets){
    const x=a.pos[0]/state.m_per_px, y=a.pos[1]/state.m_per_px;
    ctxOverlay.fillStyle = a.type==='forklift' ? '#8ef' : (a.type==='lifter' ? '#7f7' : '#faa');
    if(a.status==='gray') ctxOverlay.fillStyle='rgba(200,200,200,0.9)';
    ctxOverlay.beginPath(); ctxOverlay.arc(x,y,6,0,Math.PI*2); ctxOverlay.fill();
    ctxOverlay.fillStyle='#cde'; ctxOverlay.fillText(a.id, x+8, y-8);
  }
  requestAnimationFrame(drawAll);
}

// Heatmap
function addHeat(x,y,dt){ const g=state.heatmap; const gx=Math.floor(x/g.cell), gy=Math.floor(y/g.cell); const key=gx+','+gy; g.grid[key]=(g.grid[key]||0)+dt; }
function drawHeatmap(){ const g=state.heatmap; const cellPx=g.cell/state.m_per_px; for(const [key,val] of Object.entries(g.grid)){ const [gx,gy]=key.split(',').map(Number); const x=gx*cellPx, y=gy*cellPx; const alpha=Math.min(0.4, val/120); ctxOverlay.fillStyle=`rgba(255,128,0,${alpha})`; ctxOverlay.fillRect(x,y,cellPx,cellPx); } }

// Minimap
const mini=document.getElementById('minimap'); const miniCtx=mini.getContext('2d');
function drawMinimap(){
  miniCtx.clearRect(0,0,mini.width, mini.height);
  miniCtx.fillStyle='#10142f'; miniCtx.fillRect(0,0,mini.width, mini.height);
  for(const z of state.zones.zones){
    miniCtx.beginPath();
    const sx=mini.width/state.site.width_m, sy=mini.height/state.site.height_m;
    const poly=z.polygon.map(([x,y])=>[x*sx,y*sy]);
    miniCtx.moveTo(poly[0][0], poly[0][1]); for(let i=1;i<poly.length;i++) miniCtx.lineTo(poly[i][0], poly[i][1]);
    miniCtx.closePath(); miniCtx.fillStyle='rgba(255,80,80,0.15)'; miniCtx.strokeStyle='rgba(255,80,80,0.8)'; miniCtx.fill(); miniCtx.stroke();
  }
  for(const a of state.assets){
    const sx=mini.width/state.site.width_m, sy=mini.height/state.site.height_m;
    const x=a.pos[0]*sx, y=a.pos[1]*sy;
    miniCtx.fillStyle = a.type==='forklift' ? '#8ef' : (a.type==='lifter' ? '#7f7' : '#faa');
    if(a.status==='gray') miniCtx.fillStyle='rgba(200,200,200,0.9)';
    miniCtx.beginPath(); miniCtx.arc(x,y,3,0,Math.PI*2); miniCtx.fill();
  }
  requestAnimationFrame(drawMinimap);
}
drawMinimap();

// Analytics: sample movement each second & render
const stats = { samples: [], windowSec: 1800 };
function recordSample(){
  const ts=Date.now(); const rec={ ts, moving:{} };
  for(const a of state.assets){ const speed=Math.hypot(a.vel[0], a.vel[1])*state.m_per_px; rec.moving[a.id]= speed>0.05 ? 1 : 0; }
  stats.samples.push(rec);
  const cutoff=ts - stats.windowSec*1000; while(stats.samples.length && stats.samples[0].ts < cutoff) stats.samples.shift();
}
function renderAnalytics(){
  const byAsset={};
  for(const s of stats.samples){ for(const [id,v] of Object.entries(s.moving)){ const b=byAsset[id]||(byAsset[id]={m:0,n:0}); b.m+=v; b.n+=1; } }
  const util=Object.entries(byAsset).map(([id,b])=>({id, pct: b.n? Math.round(b.m/b.n*100):0}));
  document.getElementById('chartUtil').innerHTML = util.map(u=>`<div class="bar" style="height:${u.pct}%"><div class="val">${u.pct}%</div></div>`).join('');
  const counts={}; const cutoff=Date.now()-30*60*1000;
  for(const ev of state.events){ if(ev.ts<cutoff) continue; const m=ev.msg.match(/FORK-[0-9]+|LIFT-[0-9]+|EXT-[0-9]+/); const id=m?m[0]:'N/A'; counts[id]=(counts[id]||0)+1; }
  const arr=Object.entries(counts).map(([id,n])=>({id,n})).sort((a,b)=>b.n-a.n); const max=Math.max(1,...arr.map(x=>x.n));
  document.getElementById('chartEvents').innerHTML = arr.map(x=>`<div class="bar" style="height:${Math.round(x.n/max*100)}%"><div class="val">${x.n}</div></div>`).join('');
}
document.getElementById('btnRecalc').onclick=renderAnalytics;
document.getElementById('btnCSV').onclick=()=>{
  const cutoff=Date.now()-30*60*1000; const rows=[['timestamp','type','message']];
  for(const ev of state.events) if(ev.ts>=cutoff) rows.push([new Date(ev.ts).toISOString(), ev.type, ev.msg.replaceAll(',',';')]);
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'raport_evenimente.csv';
  a.click();
};

// Kanban + Inventory
function renderKanban(){
  const buckets = { 'Nouă':[], 'În lucru':[], 'Finalizată':[] };
  for(const a of state.assets){ for(const w of (a.wo||[])){ buckets[w.status]=buckets[w.status]||[]; buckets[w.status].push({ ...w, asset_id:a.id }); } }
  const fill=(id,list)=>{ const el=document.getElementById(id);
    el.innerHTML=(list||[]).map(w=>`<div class="card"><b>${w.id}</b> — ${w.title}<br/><small>${w.asset_id}</small><div class="actions"><button data-id="${w.id}" data-to="În lucru">În lucru</button><button data-id="${w.id}" data-to="Finalizată">Finalizează</button></div></div>`).join('');
    el.querySelectorAll('button').forEach(btn=>{ btn.onclick=()=>{ const id=btn.getAttribute('data-id'), to=btn.getAttribute('data-to'); for(const a of state.assets){ const w=(a.wo||[]).find(x=>x.id===id); if(w){ w.status=to; break; } } renderKanban(); state.refreshKPIs(); }; });
  };
  fill('cardsNoua', buckets['Nouă']); fill('cardsInLucru', buckets['În lucru']); fill('cardsFinalizata', buckets['Finalizată']);
}
function renderInventory(){
  const el=document.getElementById('inventory');
  const items=state.inventory||[{sku:'ROATA-16',name:'Roată 16"',stock:4,min:4}];
  el.innerHTML='<h4>Inventar piese (lite)</h4><table><tr><th>SKU</th><th>Denumire</th><th>Stoc</th></tr>' +
    items.map(i=>`<tr><td>${i.sku}</td><td>${i.name}</td><td class="${i.stock<=i.min?'low':''}">${i.stock}</td></tr>`).join('') + '</table>';
}

// Main loop + analytics sampling
let lastTick=now(), sampleAcc=0;
function loop(){
  const t=now(); const dt=(t-lastTick)/1000; lastTick=t;
  sim.tick();
  if(state.heatmap.enabled){ for(const a of state.assets) addHeat(a.pos[0], a.pos[1], dt); }
  sampleAcc+=dt; if(sampleAcc>=1){ sampleAcc=0; recordSample(); }
  requestAnimationFrame(loop);
}
loop();
renderAnalytics();

// Backend WS
const rtls=new RTLSClient(state); rtls.start();

// Init toggles
setToggle(document.getElementById('btnPlay'), true);
setToggle(document.getElementById('btnPause'), false);
setToggle(document.getElementById('btnHeatmap'), state.heatmap.enabled);
