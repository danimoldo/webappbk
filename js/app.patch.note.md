This patch adds:
1) Deterministic **demo seeding** (5 forklifts, 5 lifters, extinguishers) with `Reset poziții` re-seeding.
2) **Persistence** of zones & settings via `localStorage`, with auto `isNoGo` on names containing “interzis/ă”. 
3) **A\*** grid **pathfinding** with polygon blocking + **steering** (heading smoothing) and **hard enforcement** (stop+reroute).
4) Minimal **Waypoints + Task queue** per asset (FIFO), with helpers for UI wiring.
5) **UI binding guards** should call exported `renderEvents` (keep as is) — ensure all `querySelector` returns are truthy before binding.
6) **WS fallback**: GH Pages runs simulator by default; local dev auto-uses `ws://localhost:8081/positions` unless `?ws=wss://...` is passed.

Wiring overview (expected in existing files):
- In `js/app.js` (or `src/app.js` if bundling), import:
    import { initSeed, seedIfEmpty, reseed } from './seed.js';
    import { saveState, loadState, ensureIsNoGo } from './persist.js';
    import { buildGrid, blockPolygon, astar, steer } from './pathfinder.js';
    import * as Tasks from './tasks.js';
    import { connect } from './ws-client.js';

- After UI + sim are created:
    initSeed(sim, ui, { floorW: 250, floorH: 150, seed: 1337 });
    seedIfEmpty(); // if no WS data
    ui.on('reset', () => reseed());

- On zone add/edit/delete:
    const zones = ensureIsNoGo(ui.getZones());
    saveState({ zones, settings: ui.getSettings() });

- On load:
    const persisted = loadState();
    if(persisted?.zones) ui.setZones(ensureIsNoGo(persisted.zones));
    if(persisted?.settings) ui.setSettings(persisted.settings);

- Hard enforcement hook (per tick, per asset):
    const next = Tasks.nextTarget(asset.id) || sim.randomWanderTarget(asset); // keep old wander if no tasks
    const grid = buildGrid({ w: 250, h: 150, cell: 1 });
    for(const z of ui.getZones().filter(z=>z.isNoGo)) blockPolygon(grid, z.points);
    const path = astar(grid, {x:asset.x,y:asset.y}, next);
    if(path){
      const { nextHeading } = steer(path, asset.heading, 0.15);
      sim.applyDrive(asset, nextHeading);
    } else {
      sim.stop(asset); // can't route through
    }
    Tasks.popIfReached(asset.id, {x:asset.x,y:asset.y});

- WS vs simulator:
    connect(handleWS, ()=> ui.toast('WS conectat'), ()=> ui.toast('Se rulează simularea locală'));
