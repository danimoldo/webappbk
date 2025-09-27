// sim.js (ES module)
import { clamp, now, dist } from './utils.js';
import { buildGrid, findPath, randomFreePoint } from './path.js';

export class Simulator {
  constructor(state){ this.state=state; this.running=true; this.lastTick=now(); this.historyMinutes=30; this.trails=new Map(); this.grid=null; }
  setRunning(v){ this.running=v; this.lastTick=now(); }
  tick(){
    const t=now(); const dt=(t-this.lastTick)/1000; this.lastTick=t; if(!this.running) return;

    // Ensure path grid exists or site changed
    if(!this.grid || this.gridW !== this.state.site.width_m || this.gridH !== this.state.site.height_m){
      this.grid = buildGrid(this.state.site, this.state.zones.zones, 2);
      this.gridW = this.state.site.width_m; this.gridH = this.state.site.height_m;
    }

    for(const a of this.state.assets){
      if (a.type === 'extinguisher') {
        // Extinguishers: do not move
        a.vel = [0,0];
      } else {
        // Plan/random goal if needed
        const near = (p,q)=>Math.hypot(p[0]-q[0], p[1]-q[1]) < 1;
        if(!a.goal || near(a.pos, a.goal)){
          a.goal = randomFreePoint(this.grid);
          a.path = findPath(this.grid, a.pos, a.goal);
          a.path_i = 0;
        }
        if(!a.path || !a.path.length){
          a.goal = randomFreePoint(this.grid);
          a.path = findPath(this.grid, a.pos, a.goal);
          a.path_i = 0;
        }
        // follow path
        const speed = this.state.mps; // m/s
        let remaining = speed*dt;
        while(remaining>0 && a.path && a.path_i < a.path.length){
          const tgt = a.path[a.path_i];
          const dx=tgt[0]-a.pos[0], dy=tgt[1]-a.pos[1];
          const d=Math.hypot(dx,dy);
          if(d < 0.1){ a.path_i++; continue; }
          const step = Math.min(remaining, d);
          a.pos[0]+= dx/d*step; a.pos[1]+= dy/d*step;
          remaining -= step;
          a.vel = [dx/d*speed, dy/d*speed];
        }
        if(a.path_i >= a.path.length){ a.goal=null; }
      }

      // enforce bounds
      a.pos[0]=clamp(a.pos[0],0,this.state.site.width_m);
      a.pos[1]=clamp(a.pos[1],0,this.state.site.height_m);

      // zone enter/exit & proximity
      const prevInside=new Set(a.insideZones||[]); const currentInside=new Set();
      for(const z of this.state.zones.zones){
        const inside=this.state.pointInZone([a.pos[0],a.pos[1]], z);
        if(inside){ currentInside.add(z.id); if(!prevInside.has(z.id)) this.state.emitEvent('ENTER_ZONE',{asset:a.id,zone:z.name}); }
        else { if(prevInside.has(z.id)) this.state.emitEvent('EXIT_ZONE',{asset:a.id,zone:z.name}); }
      }
      a.insideZones=Array.from(currentInside);

      for(const b of this.state.assets) if(b!==a){
        const d=dist(a.pos,b.pos); const threshold=(a.bubble_m||3)+(b.bubble_m||3);
        const k=a.id+'|'+b.id; a._meet=a._meet||{}; const prev=!!a._meet[k]; const nowMeet=d<=threshold;
        if(nowMeet && !prev){ this.state.emitEvent('MEET',{a:a.id,b:b.id}); a._meet[k]=true; }
        if(!nowMeet && prev){ this.state.emitEvent('LEAVE',{a:a.id,b:b.id}); a._meet[k]=false; }
      }

      const moved=(Math.hypot(a.vel?.[0]||0, a.vel?.[1]||0)>1e-3);
      if(moved) a.lastMovedAt=t;
      a.status=(t-(a.lastMovedAt||t))>5*60*1000 ? 'gray' : (a.statusBase||'green');

      a._trailAcc=(a._trailAcc||0)+dt;
      if(a._trailAcc>0.25){ a._trailAcc=0; const arr=this.trails.get(a.id)||[];
        arr.push({t,x:a.pos[0],y:a.pos[1]});
        const cutoff=t-this.historyMinutes*60*1000; while(arr.length && arr[0].t<cutoff) arr.shift();
        this.trails.set(a.id, arr);
      }
    }
  }
}
