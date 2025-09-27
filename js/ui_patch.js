// js/ui_patch.js
// Runtime hotfix: make UI.renderEvents resilient when called with undefined.
// Keeps your original js/ui.js intact; we just guard the inputs.

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
