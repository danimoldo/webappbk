// app.js — baseline bootstrap + Asset UI dynamic import
// If your app.js lives in /js/app.js, change imports to './ui.js', './sim.js', etc.

import { UI } from './js/ui.js';
import { Simulator } from './js/sim.js';

import { initSeed, seedIfEmpty } from './js/seed.js';
import { loadState, saveState, ensureIsNoGo } from './js/persist.js';
import { RTLSClient } from './js/ws-client.js';
import * as Tasks from './js/tasks.js';

const ui = new UI({ initial: { events: [], alerts: [], workorders: [] } });
const sim = new Simulator({ w: 250, h: 150 });

// expose for auxiliary modules
window.__rtls = { ui, sim, Tasks };

// restore persisted state (if those helpers exist)
try {
  const p = loadState?.();
  if (p?.zones && ui.setZones) ui.setZones(ensureIsNoGo?.(p.zones) || p.zones);
  if (p?.settings && ui.setSettings) ui.setSettings(p.settings);
} catch (_) {}

ui.on?.('zonesChanged', () => {
  const zones = ensureIsNoGo?.(ui.getZones?.() || []) || (ui.getZones?.() || []);
  saveState?.({ zones, settings: ui.getSettings?.() || {} });
});
ui.on?.('settingsChanged', () => {
  const zones = ensureIsNoGo?.(ui.getZones?.() || []) || (ui.getZones?.() || []);
  saveState?.({ zones, settings: ui.getSettings?.() || {} });
});

// optional demo seed (no-op if seed helpers missing)
try { initSeed?.(sim, ui, { floorW: sim.w, floorH: sim.h, seed: 1337 }); seedIfEmpty?.(); } catch (_) {}

// Safe WebSocket init (no optional chaining after new)
try {
  if (typeof RTLSClient === 'function') {
    new RTLSClient({
      onMessage: (msg) => { try { sim.ingestWS?.(msg); } catch (_) {} },
      onOpen: () => ui.toast?.('WS conectat'),
      onClose: (why) => { if (why !== 'no-ws-url') ui.toast?.('WS indisponibil, simulare locală'); }
    });
  }
} catch (_) {}

function step(){
  ui.render?.(sim);
  requestAnimationFrame(step);
}
requestAnimationFrame(step);

window.addEventListener('beforeunload', () => {
  const zones = ensureIsNoGo?.(ui.getZones?.() || []) || (ui.getZones?.() || []);
  const settings = ui.getSettings?.() || {};
  saveState?.({ zones, settings });
});

// Load AFTER UI + Sim exist (ensures toolbar & canvas are ready)
Promise.all([
  import('./js/asset_meta.js'),
  import('./js/asset_add_drawer.js'),
  import('./js/ui_asset_details_patch.js'),
]).catch(()=>{});
