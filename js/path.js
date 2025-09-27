// path.js (ES module) - Grid A* around no-go polygons
import { pointInPoly } from './utils.js';

export function buildGrid(site, zones, cell_m=2){
  const W = Math.ceil(site.width_m / cell_m);
  const H = Math.ceil(site.height_m / cell_m);
  const blocked = new Uint8Array(W*H);
  const noGos = (zones||[]).filter(z=>z.type==='no_go');

  function idx(x,y){ return y*W + x; }

  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const cx = (x+0.5) * cell_m;
      const cy = (y+0.5) * cell_m;
      let b = 0;
      for(const z of noGos){
        if(pointInPoly([cx,cy], z.polygon)){ b=1; break; }
      }
      blocked[idx(x,y)] = b;
    }
  }
  return { W,H,cell_m,blocked, idx };
}

export function cellOf(pt, grid){
  const x = Math.min(grid.W-1, Math.max(0, Math.floor(pt[0]/grid.cell_m)));
  const y = Math.min(grid.H-1, Math.max(0, Math.floor(pt[1]/grid.cell_m)));
  return [x,y];
}

export function centerOfCell(c, grid){
  return [ (c[0]+0.5)*grid.cell_m, (c[1]+0.5)*grid.cell_m ];
}

export function findPath(grid, start_m, goal_m){
  const [sx,sy] = cellOf(start_m, grid);
  const [gx,gy] = cellOf(goal_m, grid);
  const W=grid.W, H=grid.H, idx=grid.idx;
  if (grid.blocked[idx(gx,gy)]) return []; // goal blocked

  const open = new Set();
  const came = {};
  const g = new Float32Array(W*H); g.fill(Infinity);
  const f = new Float32Array(W*H); f.fill(Infinity);

  function key(x,y){ return x+','+y; }
  function h(x,y){ const dx=x-gx, dy=y-gy; return Math.hypot(dx,dy); }

  const starti = idx(sx,sy);
  g[starti]=0; f[starti]=h(sx,sy);
  open.add(key(sx,sy));

  const dirs = [
    [1,0,1],[ -1,0,1],[0,1,1],[0,-1,1],
    [1,1,Math.SQRT2], [1,-1,Math.SQRT2], [-1,1,Math.SQRT2], [-1,-1,Math.SQRT2]
  ];

  while(open.size){
    // get lowest f
    let cur=null, cf=Infinity;
    for(const k of open){
      const [x,y]=k.split(',').map(Number);
      const fi=f[idx(x,y)];
      if(fi<cf){ cf=fi; cur=[x,y]; }
    }
    if(!cur) break;
    const [x,y]=cur;
    if(x===gx && y===gy) {
      // reconstruct
      const path=[];
      let k=key(x,y);
      while(k){
        const [cx,cy]=k.split(',').map(Number);
        path.push(centerOfCell([cx,cy], grid));
        k=came[k];
      }
      return path.reverse();
    }
    open.delete(key(x,y));
    const ci=idx(x,y);
    for(const [dx,dy,cost] of dirs){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=W||ny>=H) continue;
      const ni=idx(nx,ny);
      if(grid.blocked[ni]) continue;
      const tg=g[ci]+cost;
      if(tg<g[ni]){
        came[key(nx,ny)] = key(x,y);
        g[ni]=tg;
        f[ni]=tg + h(nx,ny);
        open.add(key(nx,ny));
      }
    }
  }
  return []; // no path
}

export function randomFreePoint(grid){
  for(let tries=0; tries<200; tries++){
    const c=[Math.floor(Math.random()*grid.W), Math.floor(Math.random()*grid.H)];
    if(!grid.blocked[grid.idx(c[0],c[1])]) return centerOfCell(c, grid);
  }
  return [1,1];
}
