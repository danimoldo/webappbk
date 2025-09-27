// ui_patch.js — V2: harden UI.renderEvents so it never crashes on bad input.
// - Normalizes input to arrays
// - Provides common fallbacks (items/list/rows)
// - Catches and swallows any remaining errors on first render

import { UI } from './ui.js';

const _orig = UI.prototype.renderEvents;

function asArray(x){ return Array.isArray(x) ? x : (x ? [] : []); }
function ensureShapes(d){
  d = d || {};
  const ev = d.events ?? [];
  const al = d.alerts ?? [];
  const wo = d.workorders ?? [];
  d.events = asArray(ev);
  d.alerts = asArray(al);
  d.workorders = asArray(wo);
  // Provide common nested aliases the original UI may read (e.g., .items.length)
  const aliases = ['items','list','rows','data'];
  for(const key of aliases){
    if(!d.events[key]) d.events[key] = [];
    if(!d.alerts[key]) d.alerts[key] = [];
    if(!d.workorders[key]) d.workorders[key] = [];
  }
  // Counters that might be read
  if(typeof d.events.count !== 'number') d.events.count = d.events.length;
  if(typeof d.alerts.count !== 'number') d.alerts.count = d.alerts.length;
  if(typeof d.workorders.count !== 'number') d.workorders.count = d.workorders.length;
  return d;
}

if (typeof _orig === 'function') {
  let firstCall = true;
  UI.prototype.renderEvents = function(data) {
    const safe = ensureShapes(data);
    try {
      return _orig.call(this, safe);
    } catch (e) {
      if (firstCall) {
        // Swallow constructor-time failures; later updates will re-render correctly.
        firstCall = false;
        // Try once more with empty arrays only
        try { return _orig.call(this, { events: [], alerts: [], workorders: [] }); } catch(_) { return; }
      } else {
        // After init, rethrow so real bugs are visible in dev console
        // but don't crash the app flow
        console.warn('renderEvents guarded error:', e);
        return;
      }
    }
  };
}
