// zones.js (ES module)
import { pointInPoly } from './utils.js';
export class ZoneManager {
  constructor(){ this.zones=[]; this._drawing=false; this._current=[]; this._hover=null; this.editMode=false; }
  load(zs){ this.zones = zs||[]; }
  clear(){ this.zones=[]; }
  startDrawing(){ this._drawing=true; this._current=[]; this._hover=null; }
  addPoint(p){ if(this._drawing) this._current.push(p); }
  setHover(p){ if(this._drawing) this._hover=p; }
  finish(name='Zonă', type='no_go'){
    if(!this._drawing || this._current.length<3) return null;
    const z={id:'Z-'+Date.now(), name, type, polygon:this._current.slice()};
    this.zones.push(z); this._drawing=false; this._current=[]; this._hover=null; return z;
  }
  containsPoint(p){ return this.zones.filter(z => pointInPoly(p, z.polygon)); }
  draw(ctx, scale){
    ctx.save(); ctx.lineWidth=2; ctx.font='12px sans-serif';
    for(const z of this.zones){
      ctx.beginPath();
      const poly=z.polygon.map(([x,y])=>[x*scale,y*scale]);
      ctx.moveTo(poly[0][0], poly[0][1]);
      for(let i=1;i<poly.length;i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fillStyle = z.type==='no_go' ? 'rgba(255,64,64,0.15)' : 'rgba(64,200,255,0.12)';
      ctx.strokeStyle = z.type==='no_go' ? 'rgba(255,64,64,0.8)' : 'rgba(64,200,255,0.8)';
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#cde'; const [cx,cy]=poly[0]; ctx.fillText(z.name, cx+6, cy+14);
      if(this.editMode){ ctx.fillStyle='rgba(255,180,180,0.9)'; for(const p of poly){ ctx.fillRect(p[0]-3,p[1]-3,6,6); } }
    }
    if(this._drawing && this._current.length){
      ctx.setLineDash([6,4]); ctx.strokeStyle='rgba(255,180,180,0.9)'; ctx.beginPath();
      const p0=[this._current[0][0]*scale, this._current[0][1]*scale];
      ctx.moveTo(p0[0], p0[1]);
      for(let i=1;i<this._current.length;i++){ const p=this._current[i]; ctx.lineTo(p[0]*scale, p[1]*scale); }
      if(this._hover){ ctx.lineTo(this._hover[0]*scale, this._hover[1]*scale); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
}
