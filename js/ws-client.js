// js/ws-client.js
// WS client with environment-aware URL and soft fallback to simulator.
// Back-compat: now also exports RTLSClient (legacy API expected by app.js).

export function makeWSUrl(){
  try{
    const isPages = location.hostname.endsWith('github.io');
    const u = new URL(location.href);
    const qp = u.searchParams.get('ws');
    if (qp) return qp;
    if (isPages) return null;                 // no WS by default on GH Pages
    return 'ws://localhost:8081/positions';   // local dev default
  }catch(e){ return null; }
}

export function connect(onMsg, onOpen, onClose){
  const url = makeWSUrl();
  if(!url){
    onClose?.('no-ws-url'); // signal simulator should remain active
    return null;
  }
  let closedOnce = false;
  try{
    const ws = new WebSocket(url);
    let openTimer = setTimeout(()=>{
      try{ ws.close(); }catch(_){}
      onClose?.('timeout');
    }, 1500);

    ws.addEventListener('open', ()=>{ clearTimeout(openTimer); onOpen?.(); });
    ws.addEventListener('message', (ev)=> onMsg?.(ev.data) );
    ws.addEventListener('close', ()=>{ if(!closedOnce){ closedOnce=true; onClose?.('closed'); } });
    ws.addEventListener('error', ()=>{ onClose?.('error'); });

    return ws;
  }catch(e){
    onClose?.('exception');
    return null;
  }
}

// ---- Legacy class API (for existing app.js) ----
export class RTLSClient {
  constructor({ url, onMessage, onOpen, onClose } = {}){
    this._onMessage = onMessage;
    this._onOpen = onOpen;
    this._onClose = onClose;
    this.url = url || makeWSUrl();
    this.ws = null;
    this.ready = false;

    if(!this.url){
      // No WS in this environment (e.g., GH Pages) -> signal fallback
      this._onClose?.('no-ws-url');
      return;
    }
    try{
      this.ws = new WebSocket(this.url);
      this._openTimer = setTimeout(()=>{
        try{ this.ws.close(); }catch(_){}
        this._onClose?.('timeout');
      }, 1500);

      this.ws.addEventListener('open', ()=>{
        clearTimeout(this._openTimer);
        this.ready = true;
        this._onOpen?.();
      });
      this.ws.addEventListener('message', (ev)=>{
        this._onMessage?.(ev.data);
      });
      this.ws.addEventListener('close', ()=>{
        this.ready = false;
        this._onClose?.('closed');
      });
      this.ws.addEventListener('error', ()=>{
        this.ready = false;
        this._onClose?.('error');
      });
    }catch(e){
      this._onClose?.('exception');
    }
  }

  send(data){
    if(this.ws && this.ready){
      try{ this.ws.send(data); }catch(_){}
    }
  }
  close(){
    try{ this.ws?.close(); }catch(_){}
  }
}
