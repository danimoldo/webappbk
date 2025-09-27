// ui_patch.js — runtime guard for UI.renderEvents
// Ensures it never crashes if called with undefined or wrong shapes.

import { UI } from './ui.js';

const _orig = UI.prototype.renderEvents;
if (typeof _orig === 'function') {
  UI.prototype.renderEvents = function(data) {
    data = data || {};
    data.events = Array.isArray(data.events) ? data.events : [];
    data.alerts = Array.isArray(data.alerts) ? data.alerts : [];
    data.workorders = Array.isArray(data.workorders) ? data.workorders : [];
    return _orig.call(this, data);
  };
}
