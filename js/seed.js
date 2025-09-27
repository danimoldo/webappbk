// Deterministic demo seeding for GH Pages or local static use.
// Spawns forklifts, lifters, and extinguishers when no WS feed is available,
// or when the user clicks "Reset poziții".
//
// Public API:
//   initSeed(sim, ui, opts)
//   reseed()
//
// Expects `sim` to expose: addAsset({id,type,x,y,heading,maxSpeed}), addExtinguisher({id,x,y,expiresAt,ok})
// and `ui` to expose: toast(msg)
//
let _sim = null;
let _ui = null;
let _opts = null;
let _rng = null;
let _floor = {w: 250, h: 150}; // meters default, can be set via opts

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function randRange(a,b){ return a + (_rng()*(b-a)); }

function gridPositions(cols, rows, margin=10){
  const w = _floor.w - margin*2;
  const h = _floor.h - margin*2;
  const dx = w/(cols-1);
  const dy = h/(rows-1);
  const pts = [];
  for(let j=0;j<rows;j++){
    for(let i=0;i<cols;i++){
      pts.push({x: margin + i*dx, y: margin + j*dy});
    }
  }
  return pts;
}

function seedExtinguishers(){
  // Place a perimeter ring plus a few inner points
  const ringN = 20;
  const margin = 6;
  const xs = [];
  for(let i=0;i<ringN;i++){
    const t = i/ringN;
    const px = (t<0.25) ? (margin + t/0.25*(_floor.w-2*margin))
      : (t<0.5) ? (_floor.w - margin)
      : (t<0.75) ? (_floor.w - margin - (t-0.5)/0.25*(_floor.w-2*margin))
      : (margin);
    const py = (t<0.25) ? (margin)
      : (t<0.5) ? (margin + (t-0.25)/0.25*(_floor.h-2*margin))
      : (t<0.75) ? (_floor.h - margin)
      : (_floor.h - margin - (t-0.75)/0.25*(_floor.h-2*margin));
    xs.push({x:px,y:py});
  }
  // A few inner ones
  const inner = gridPositions(4,2,20);
  xs.push(...inner);
  const now = Date.now();
  xs.forEach((p,idx)=>{
    // 1 in 8 expired
    const expired = (_rng()<0.125);
    const delta = expired ? -7 : 30; // days
    const expiresAt = now + delta*24*3600*1000;
    _sim.addExtinguisher({ id:`X${idx+1}`, x:p.x, y:p.y, expiresAt, ok: !expired });
  });
}

function seedAssets(){
  const pts = gridPositions(5,3,15);
  // choose 5 forklifts + 5 lifters from pts
  const pick = (arr,n)=>{
    const out=[]; const used=new Set();
    while(out.length<n && used.size<arr.length){
      const i = Math.floor(_rng()*arr.length);
      if(used.has(i)) continue;
      used.add(i); out.push(arr[i]);
    }
    return out;
  };
  const forklifts = pick(pts,5);
  const lifters = pick(pts.filter(p=>!forklifts.includes(p)),5);
  forklifts.forEach((p,i)=>_sim.addAsset({ id:`F${i+1}`, type:'forklift', x:p.x, y:p.y, heading: randRange(0,Math.PI*2), maxSpeed: 5/3.6 }));
  lifters.forEach((p,i)=>_sim.addAsset({ id:`L${i+1}`, type:'lifter', x:p.x, y:p.y, heading: randRange(0,Math.PI*2), maxSpeed: 3.5/3.6 }));
}

export function initSeed(sim, ui, opts={}){
  _sim = sim; _ui = ui; _opts = opts;
  _floor = { w: opts.floorW || _floor.w, h: opts.floorH || _floor.h };
  _rng = mulberry32(opts.seed || 123456);
}

export function reseed(){
  if(!_sim) return;
  if(_sim.clearAssets) _sim.clearAssets();
  if(_sim.clearExtinguishers) _sim.clearExtinguishers();
  seedAssets();
  seedExtinguishers();
  _ui?.toast?.('S-a recreat setul demo (5 stivuitoare, 5 liftere, stingătoare).');
}

// called on first load if no WS detected
export function seedIfEmpty(){
  if(!_sim) return;
  if((_sim.assetCount?.()||0)===0) {
    reseed();
  }
}
