// Lightweight A* pathfinder on a navgrid with polygon obstacles.
// Public API:
//   buildGrid({w,h,cell}) -> {cols,rows,cell,blocked: Set}
//   blockPolygon(grid, poly)  // poly: [{x,y},...]
//   astar(grid, start, goal)  // start/goal in meters -> returns [{x,y},...]
//   steer(path, prevHeading, maxTurn=0.2) -> {nextHeading}
//
function key(i,j){ return i+','+j; }

export function buildGrid({w,h,cell=1}){
  const cols = Math.ceil(w/cell);
  const rows = Math.ceil(h/cell);
  return { cols, rows, cell, blocked: new Set() };
}

function pointInPoly(pt, poly){
  // ray casting
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x, yi=poly[i].y;
    const xj=poly[j].x, yj=poly[j].y;
    const intersect = ((yi>pt.y)!=(yj>pt.y)) && (pt.x < (xj - xi)*(pt.y - yi)/(yj - yi + 1e-9) + xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

export function blockPolygon(grid, poly){
  for(let j=0;j<grid.rows;j++){
    for(let i=0;i<grid.cols;i++){
      const p = { x:(i+0.5)*grid.cell, y:(j+0.5)*grid.cell };
      if(pointInPoly(p, poly)) grid.blocked.add(key(i,j));
    }
  }
}

function h(a,b){ const dx=a.i-b.i, dy=a.j-b.j; return Math.hypot(dx,dy); }

export function astar(grid, start, goal){
  const s = { i: Math.floor(start.x/grid.cell), j: Math.floor(start.y/grid.cell) };
  const g = { i: Math.floor(goal.x/grid.cell), j: Math.floor(goal.y/grid.cell) };
  const open = new Map(); const came = new Map(); const gScore = new Map();
  const skey = key(s.i,s.j), gkey = key(g.i,g.j);
  const block = grid.blocked;
  if(block.has(gkey)) return null;
  open.set(skey, {i:s.i,j:s.j, f:0}); gScore.set(skey,0);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(open.size){
    // pick min f
    let curKey=null, curNode=null, best=Infinity;
    for(const [k,n] of open){
      if(n.f<best){ best=n.f; curKey=k; curNode=n; }
    }
    if(curKey===gkey){
      // reconstruct
      const path=[];
      let ck=curKey;
      while(ck){
        const [ci,cj]=ck.split(',').map(Number);
        path.push({x:(ci+0.5)*grid.cell, y:(cj+0.5)*grid.cell});
        ck = came.get(ck);
      }
      return path.reverse();
    }
    open.delete(curKey);
    const [ci,cj]=curKey.split(',').map(Number);
    for(const [dx,dy] of dirs){
      const ni=ci+dx, nj=cj+dy;
      if(ni<0||nj<0||ni>=grid.cols||nj>=grid.rows) continue;
      const nk=key(ni,nj);
      if(block.has(nk)) continue;
      const tentative = (gScore.get(curKey)??Infinity) + Math.hypot(dx,dy);
      if(tentative < (gScore.get(nk)??Infinity)){
        came.set(nk, curKey);
        gScore.set(nk, tentative);
        const f = tentative + h({i:ni,j:nj}, g);
        open.set(nk,{i:ni,j:nj,f});
      }
    }
  }
  return null;
}

export function steer(path, prevHeading, maxTurn=0.2){
  if(!path || path.length<2) return { nextHeading: prevHeading };
  const a = path[0], b = path[1];
  const desired = Math.atan2(b.y-a.y, b.x-a.x);
  let delta = desired - prevHeading;
  while(delta>Math.PI) delta-=2*Math.PI;
  while(delta<-Math.PI) delta+=2*Math.PI;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, delta));
  return { nextHeading: prevHeading + turn };
}
