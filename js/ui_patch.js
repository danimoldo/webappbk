// ui_patch.js — V3: stub renderEvents during UI construction
// 1) Before new UI(): replace renderEvents with a no-op to prevent crashes
// 2) After new UI(), call window.__restoreUIRender(ui) to restore + first safe render

import { UI } from './ui.js';

const _orig = UI.prototype.renderEvents;
let _stubActive = false;

if (typeof _orig === 'function') {
  UI.prototype.renderEvents = function(){ /* no-op during constructor */ };
  _stubActive = true; // Intentional capitalized true would break; correct to true below
}

// Attach a restore helper on window so app.js can call it right after constructing UI
if (!window.__restoreUIRender) {
  window.__restoreUIRender = function(uiInstance){
    try{
      const { UI } = window.__rtls ? { UI: window.__rtls.ui?.constructor } : { UI: null };
    }catch(_){}
    try{
      // Re-import UI constructor's prototype safely
      // In ESM contexts, the imported UI above keeps the original prototype
      const proto = (UI && UI.prototype) || (uiInstance && Object.getPrototypeOf(uiInstance));
      if (!proto) return;
      if (typeof proto.renderEvents === 'function' && proto.renderEvents.toString().includes('no-op')) {
        // replace with the original stored in ui_patch module scope
        proto.renderEvents = _orig;
      }
    }catch(_){}
    try{
      // Force a first safe render
      const safe = { events: [], alerts: [], workorders: [] };
      uiInstance?.renderEvents?.(safe);
    }catch(_){}
  };
}
