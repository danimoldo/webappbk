// This file is an integration reference ONLY. Do not include it in production.
// It demonstrates how to wire the new modules inside your existing app.js.
import { UI } from './ui.js';
import { Simulator } from './sim.js';
import { initSeed, seedIfEmpty, reseed } from './seed.js';
import { saveState, loadState, ensureIsNoGo } from './persist.js';
import { buildGrid, blockPolygon, astar, steer } from './pathfinder.js';
import * as Tasks from './tasks.js';
import { connect } from './ws-client.js';

const ui = new UI();
const sim = new Simulator({ w:250, h:150 });

initSeed(sim, ui, { floorW: 250, floorH: 150, seed: 1337 });

// restore persisted zones/settings
const persisted = loadState();
if(persisted?.zones) ui.setZones(ensureIsNoGo(persisted.zones));
if(persisted?.settings) ui.setSettings(persisted.settings);

// seed demo if empty
seedIfEmpty();

// UI events
ui.on('reset', ()=> reseed());
ui.on('zonesChanged', ()=>{
  const zones = ensureIsNoGo(ui.getZones());
  saveState({ zones, settings: ui.getSettings() });
});
ui.on('addWaypoint', ({assetId, x, y})=>{
  Tasks.addWaypoint(assetId, {x,y});
  if(!Tasks.isRunning(assetId)) Tasks.start(assetId);
});

// main loop
function tick(dt){
  const zones = (ui.getZones?.()||[]).filter(z=>z.isNoGo);
  const grid = buildGrid({ w: sim.w, h: sim.h, cell: 1 });
  zones.forEach(z=> blockPolygon(grid, z.points));
  for(const asset of sim.assets()){
    // target selection: task first, else wander
    const target = Tasks.nextTarget(asset.id) || sim.randomWanderTarget(asset);
    const path = astar(grid, {x:asset.x,y:asset.y}, target);
    if(path){
      const { nextHeading } = steer(path, asset.heading, 0.12);
      sim.applyDrive(asset, nextHeading);
    } else {
      sim.stop(asset);
    }
    Tasks.popIfReached(asset.id, {x:asset.x, y:asset.y});
  }
  ui.render(sim);
  requestAnimationFrame(()=>tick(16));
}
tick(16);

// WS (optional)
connect(
  (msg)=> sim.ingestWS(msg),
  ()=> ui.toast('WS conectat'),
  (why)=> { if(why!=='no-ws-url') ui.toast('WS indisponibil, rulează simularea'); }
);
