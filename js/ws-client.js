// WS client with environment-aware URL and soft fallback to simulator.
export function makeWSUrl(){
  try{
    const isPages = location.hostname.endsWith('github.io');
    if(isPages){
      // Expect a secure endpoint if ever used in prod demo; keep it configurable via ?ws=wss://...
      const u = new URL(location.href);
      const qp = u.searchParams.get('ws');
      if(qp) return qp;
      return null; // default: no WS on GH Pages
    } else {
      const u = new URL(location.href);
      const qp = u.searchParams.get('ws');
      if(qp) return qp;
      return 'ws://localhost:8081/positions';
    }
  }catch(e){ return null; }
}

export function connect(onMsg, onOpen, onClose){
  const url = makeWSUrl();
  if(!url){
    onClose?.('no-ws-url'); // signal simulator should remain active
    return null;
  }
  let closedOnce=false;
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
