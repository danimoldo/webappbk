// js/app.js

// ---- Imports ----
import { UI } from './ui.js';
import { Simulator } from './sim.js';

import { initSeed, seedIfEmpty, reseed } from './seed.js';
import { saveState, loadState, ensureIsNoGo } from './persist.js';
import { buildGrid, blockPolygon, astar, steer } from './pathfinder.js';
import * as Tasks from './tasks.js';
import { TaskPanel } from './task_panel.js';
import { RTLSClient } from './ws-client.js'; // back-compat + env-aware

// ---- 1) Create UI & Simulator FIRST ---- // must exist before TaskPanel
const ui = new UI({
  initial: {
    events: [],        // used by ui.renderEvents during constructor
    alerts: [],        // optional but safe
    workorders: []     // optional but safe
  }
});
const sim = new Simulator({ w: 250, h: 150 });   // floor: 250m x 150m

// ---- 2) Task Panel (waypoints UI) ----
const taskPanel = new TaskPanel({ ui, sim, Tasks }); // floating panel (RO labels)

// ---- 3) Restore persistence (zones + settings) ----
try {
  const persisted = loadState();
  if (persisted?.zones) ui.setZones(ensureIsNoGo(persisted.zones));
  if (persisted?.settings) ui.setSettings(persisted.settings);
} catch (_) { /* ignore */ }

// Save when zones/settings change from the main UI
ui.on?.('zonesChanged', () => {
  const zones = ensureIsNoGo(ui.getZones?.() || []);
  saveState({ zones, settings: ui.getSettings?.() || {} });
});
ui.on?.('settingsChanged', () => {
  const zones = ensureIsNoGo(ui.getZones?.() || []);
  saveState({ zones, settings: ui.getSettings?.() || {} });
});

// ---- 4) Demo seeding (5 forklifts, 5 lifters + extinguishers) ----
initSeed(sim, ui, { floorW: sim.w, floorH: sim.h, seed: 1337 });
seedIfEmpty();                          // on GH Pages, this populates the demo

// Reset button from the Romanian UI
ui.on?.('reset', () => {
  reseed();
  ui.toast?.('Setul demo a fost reinițializat.');
});

// Optional: also support adding waypoints from your existing UI (if any)
ui.on?.('addWaypoint', ({ assetId, x, y }) => {
  if (!assetId) return;
  Tasks.addWaypoint(assetId, { x, y });
  if (!Tasks.isRunning(assetId)) Tasks.start(assetId);
});

// ---- 5) WebSocket (optional) with soft fallback ----
// On GitHub Pages, RTLSClient will emit 'no-ws-url' and we stay in simulator mode.
let wsClient = new RTLSClient({
  onMessage: (msg) => {
    // Expect JSON payloads; guard against bad frames
    try { sim.ingestWS?.(msg); } catch (_) {}
  },
  onOpen: () => ui.toast?.('WS conectat'),
  onClose: (why) => {
    if (why !== 'no-ws-url') ui.toast?.('WS indisponibil, rulează simularea');
  }
});

// ---- 6) Main loop: hard no-go enforcement + A* + steering ----
const GRID_CELL = 1;         // 1m resolution
const MAX_TURN = 0.12;       // rad/step steering limit (smooth)
const DEFAULT_SPEED = 5 / 3.6;   // safety cap if asset doesn’t have maxSpeed

function step() {
  // Build navgrid with all active no-go polygons
  const zones = (ui.getZones?.() || []).filter(z => z.isNoGo && Array.isArray(z.points) && z.points.length >= 3);
  const grid = buildGrid({ w: sim.w, h: sim.h, cell: GRID_CELL });
  for (const z of zones) blockPolygon(grid, z.points);

  // Update each asset
  for (const asset of sim.assets?.() || []) {
    // 1) choose target: tasks first, else simulator's wander target
    const taskTarget = Tasks.nextTarget(asset.id);
    const target = taskTarget || sim.randomWanderTarget?.(asset);
    if (!target) { sim.stop?.(asset); continue; }

    // 2) plan route with A*
    const path = astar(grid, { x: asset.x, y: asset.y }, target);

    // 3) enforce no-go: if no path -> stop; else steer toward next segment
    if (!path || path.length < 2) {
      sim.stop?.(asset);
    } else {
      const { nextHeading } = steer(path, asset.heading ?? 0, MAX_TURN);
      // Respect per-asset speed caps; forklifts ~5 km/h, lifters ~3.5 km/h
      const cap = typeof asset.maxSpeed === 'number' ? asset.maxSpeed : DEFAULT_SPEED;
      sim.applyDrive?.(asset, nextHeading, cap);
    }

    // 4) if we reached current waypoint, pop it
    Tasks.popIfReached(asset.id, { x: asset.x, y: asset.y });
  }

  // 5) render UI
  ui.render?.(sim);

  // schedule next frame
  requestAnimationFrame(step);
}
requestAnimationFrame(step);

// ---- 7) Persist on unload (best-effort) ----
window.addEventListener('beforeunload', () => {
  const zones = ensureIsNoGo(ui.getZones?.() || []);
  const settings = ui.getSettings?.() || {};
  saveState({ zones, settings });
});

// ---- 8) Debug helpers (optional; remove if not needed) ----
window.__rtls = { ui, sim, Tasks };
