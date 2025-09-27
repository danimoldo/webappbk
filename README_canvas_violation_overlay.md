
# Canvas Violation Overlay — RTLS + CMMS (vanilla JS)
Date: 2025-09-26

Your repo renders dots on a **<canvas>**, not SVG/React, so the previous flag component couldn't show.
This patch adds a **canvas overlay**: red pulse + flag whenever a device is inside a **no-go** polygon.

## Files
- `js/geom.js` — small geometry helpers.
- `js/violations.js` — `isInNoGo(zones, x, y, { clearancePx })`.
- `js/drawBadge.js` — `drawViolation(ctx, x, y, baseR, now)` draws pulse + flag.

## Integrate (60 seconds)
1) Copy `js/geom.js`, `js/violations.js`, `js/drawBadge.js` into your `js/` folder.
2) Edit **`js/map.js`**:
   - Add imports at the top:
```js
import { isInNoGo } from "./violations.js";
import { drawViolation } from "./drawBadge.js";
```
   - Inside the **assets loop** (where each dot is drawn), *after* you draw the circle and its stroke, add:
```js
const clearancePx = 6; // ~visible buffer; adjust if needed
if (isInNoGo(state.zones, a.x, a.y, { clearancePx })) {
  // base radius equals your dot radius (7); pass performance.now() for animation
  drawViolation(ctx, a.x, a.y, 7, performance.now());
}
```
3) Done. The badge renders **on the same canvas** and will animate on every frame.

### Notes
- This overlay **does not stop** devices from entering zones. It only highlights. For prevention, we need to route via A* and steer around no-go polygons (separate patch).
- `clearancePx` is a pixel buffer around polygon edges. Use `Math.round(state.pxPerMeter * 0.5)` if you want 0.5m clearance.
