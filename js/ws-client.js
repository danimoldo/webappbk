// ws-client.js (ES module)
export class RTLSClient {
  constructor(state){ this.state=state; this.ws=null; this.mode='fallback'; this.timer=null; }
  start(){
    try{
      const url=(location.protocol==='https:'?'wss://':'ws://') + (location.hostname||'localhost') + ':8081/positions';
      this.ws=new WebSocket(url);
      this.ws.onopen=()=>{ this.mode='ws'; console.log('[WS] Connected'); };
      this.ws.onmessage=(ev)=>{ const payload=JSON.parse(ev.data);
        for(const upd of payload.assets){ const a=this.state.assets.find(x=>x.id===upd.id); if(a){ if(upd.pos) a.pos=upd.pos; if(upd.vel) a.vel=upd.vel; if(upd.battery!=null) a.battery=upd.battery; if(upd.rssi!=null) a.rssi=upd.rssi; if(upd.anchorId) a.anchorId=upd.anchorId; } }
      };
      this.ws.onerror=()=>this._fallback(); this.ws.onclose=()=>this._fallback();
      setTimeout(()=>{ if(this.mode!=='ws') this._fallback(); },1500);
    }catch(e){ this._fallback(); }
  }
  _fallback(){
    if(this.mode==='fallback' && this.timer) return;
    this.mode='fallback'; console.log('[WS] Fallback generator active');
    this.timer=setInterval(()=>{ for(const a of this.state.assets){ const j=0.5; a.vel=[a.vel[0]+(Math.random()-0.5)*j, a.vel[1]+(Math.random()-0.5)*j]; } },1000);
  }
}
