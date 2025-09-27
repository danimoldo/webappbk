// ui.js (ES module)
import { fmtTime } from './utils.js';
export class UI {
  constructor(state){ this.state=state; this.eventsEl=document.getElementById('eventsPane'); this.drawerEl=document.getElementById('assetDrawer'); this.renderEvents(); this.renderDrawer(null); }
  renderEvents(){
    const head=`<div class="events-head"><strong>Jurnal Evenimente</strong><span class="badge">${this.state.events.length}</span></div>`;
    const items=this.state.events.slice().reverse().map(ev=>`<div class="event"><span class="t">${fmtTime(ev.ts)}</span> — <b>${ev.type}</b> — ${ev.msg}</div>`).join('');
    this.eventsEl.innerHTML=head+`<div class="events">${items}</div>`;
    document.getElementById('kpiAlerts24h').textContent=this.state.events.length;
  }
  renderDrawer(asset){
    if(!asset){ this.drawerEl.innerHTML=`<h2>Detalii Asset</h2><p>Selectează un asset de pe hartă.</p>`; return; }
    const overdue=new Date(asset.next_check)<new Date();
    const woOpen=(asset.wo||[]).filter(w=>w.status!=='Finalizată').length;
    this.drawerEl.innerHTML=`
      <h2>${asset.id} <span class="badge ${overdue?'warn':'ok'}">${overdue?'Inspecție depășită':'OK'}</span></h2>
      <div class="qr" id="qrBox"></div>
      <p><b>Tip:</b> ${asset.type} • <b>Status:</b> ${asset.status}</p>
      <p><b>Ultima inspecție:</b> ${asset.last_check||'-'} • <b>Următoarea:</b> ${asset.next_check||'-'}</p>
      <p><b>Ore utilizare:</b> ${asset.hours||0}</p>
      <h3>Acțiuni</h3>
      <p>
        <button id="openWO">Deschide cerere lucrare</button>
        <button id="confirmPM">Confirmă întreținere</button>
      </p>
      <h3>Work Orders <span class="badge">${woOpen}</span></h3>
      ${(asset.wo||[]).map(w=>`<div class="event"><b>${w.id}</b> — ${w.title} — <i>${w.status}</i></div>`).join('')}
    `;
    const qr=new window.SimpleQR(4, window.SimpleQR.ErrorCorrectLevel?window.SimpleQR.ErrorCorrectLevel.M:'M');
    qr.addData(JSON.stringify({asset:asset.id})); qr.make(); const canvas=qr.createCanvas(4); this.drawerEl.querySelector('#qrBox').appendChild(canvas);
    this.drawerEl.querySelector('#openWO').onclick=()=>{ const newWO={id:'WO-'+Math.random().toString(36).slice(2,7).toUpperCase(), title:'Intervenție rapidă', status:'Nouă'}; asset.wo=asset.wo||[]; asset.wo.push(newWO); this.renderDrawer(asset); this.state.refreshKPIs(); };
    this.drawerEl.querySelector('#confirmPM').onclick=()=>{ asset.last_check=(new Date()).toISOString().slice(0,10); const nd=new Date(); nd.setMonth(nd.getMonth()+3); asset.next_check=nd.toISOString().slice(0,10); this.renderDrawer(asset); this.state.refreshKPIs(); };
  }
}
