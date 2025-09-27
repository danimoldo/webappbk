// app.js — for /js/ directory, with stub-then-restore renderEvents flow.

import './ui_patch.js';            // must be first to stub renderEvents
import { UI } from './ui.js';
import { Simulator } from './sim.js';

import { initSeed, seedIfEmpty } from './seed.js';
import { loadState, saveState, ensureIsNoGo } from './persist.js';
import { RTLSClient } from './ws-client.js';
import * as Tasks from './tasks.js';

const ui = new UI({
  initial: { events: [], alerts: [], workorders: [] }
});
// Restore original renderEvents and trigger first safe render
if (typeof window.__restoreUIRender === 'function') {
  window.__restoreUIRender(ui);
}

const sim = new Simulator({ w: 250, h: 150 });

window.__rtls = { ui, sim, Tasks };

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

try { initSeed?.(sim, ui, { floorW: sim.w, floorH: sim.h, seed: 1337 }); seedIfEmpty?.(); } catch (_) {}

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

Promise.all([
  import('./asset_meta.js'),
  import('./asset_add_drawer.js'),
  import('./ui_asset_details_patch.js'),
]).catch(()=>{});
