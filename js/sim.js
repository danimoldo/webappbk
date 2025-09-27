// sim.js (ES module)
import { clamp, now, normalize, dist } from './utils.js';
export class Simulator {
  constructor(state){ this.state=state; this.running=true; this.lastTick=now(); this.historyMinutes=30; this.trails=new Map(); }
  setRunning(v){ this.running=v; this.lastTick=now(); }
  tick(){
    const t=now(); const dt=(t-this.lastTick)/1000; this.lastTick=t; if(!this.running) return;
    const pxps=this.state.mps/this.state.m_per_px;
    const bounds={w:this.state.site.width_m, h:this.state.site.height_m};
    for(const a of this.state.assets){
      let [vx,vy]=normalize(a.vel[0], a.vel[1]); vx*=pxps; vy*=pxps;
      let nx=a.pos[0]+(vx*dt)*this.state.m_per_px;
      let ny=a.pos[1]+(vy*dt)*this.state.m_per_px;

      // steer away from no-go zones
      let hitNoGo=false;
      for(const z of this.state.zones.zones){
        const inside=this.state.pointInZone([nx,ny], z);
        if(inside){ if(z.type==='no_go'){ hitNoGo=true; } }
      }
      if(hitNoGo){ const tmp=vx; vx=-vy; vy=tmp; nx=a.pos[0]+(vx*dt)*this.state.m_per_px; ny=a.pos[1]+(vy*dt)*this.state.m_per_px; }

      nx=clamp(nx,0,bounds.w); ny=clamp(ny,0,bounds.h);

      // zone enter/exit & proximity
      const prevInside=new Set(a.insideZones||[]); const currentInside=new Set();
      for(const z of this.state.zones.zones){
        const inside=this.state.pointInZone([nx,ny], z);
        if(inside){ currentInside.add(z.id); if(!prevInside.has(z.id)) this.state.emitEvent('ENTER_ZONE',{asset:a.id,zone:z.name}); }
        else { if(prevInside.has(z.id)) this.state.emitEvent('EXIT_ZONE',{asset:a.id,zone:z.name}); }
      }
      a.insideZones=Array.from(currentInside);

      for(const b of this.state.assets) if(b!==a){
        const d=dist(a.pos,b.pos); const threshold=(a.bubble_m||3)+(b.bubble_m||3);
        const k=a.id+'|'+b.id; a._meet=a._meet||{}; const prev=!!a._meet[k]; const nowMeet=d<=threshold;
        if(nowMeet && !prev){ this.state.emitEvent('MEET',{a:a.id,b:b.id}); a._meet[k]=true; }
        if(!nowMeet && prev){ this.state.emitEvent('LEAVE',{a:a.id,b:b.id}); a._meet[k]=false; }
        // separation
        if(d>0 && d < threshold*0.8){ const dx=b.pos[0]-a.pos[0], dy=b.pos[1]-a.pos[1]; a.vel[0]-=dx*0.05; a.vel[1]-=dy*0.05; }
      }

      const moved=(Math.hypot(nx-a.pos[0], ny-a.pos[1])>1e-3); if(moved) a.lastMovedAt=t;
      a.pos[0]=nx; a.pos[1]=ny;
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
