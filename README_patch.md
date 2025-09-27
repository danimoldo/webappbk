
# RTLS + CMMS demo — Small Patch (2025‑09‑26)

This patch delivers:
1) **Right‑click context menu** on zones with **Rename** and **Delete** actions.
2) **A*** pathfinding **verifier/diagnostics** helper to confirm obstacle avoidance.
3) Tiny **console‑safety helpers** to silence common warnings (missing keys, stale listeners).

---

## 1) Zone context menu (rename/delete)
Files:
- `src/zones/contextMenu.tsx` — lightweight context menu component (no deps).
- `src/zones/useZones.ts` — optional store shim providing `renameZone`, `deleteZone` (wrap your existing store or replace the body with calls into it).
- `src/zones/ZoneItem.tsx` — wrapper to attach right‑click to your existing zone shape.
- `src/types/zones.ts` — basic type shared across files.

**How to integrate (minimal):**
```tsx
// Wherever you render zones, replace your zone element with ZoneItem wrapper.
import { ZoneItem } from "@/zones/ZoneItem";

{zones.map(z => (
  <ZoneItem key={z.id} zone={z}>
    {/* Your existing zone SVG/Canvas/Div goes here */}
    <g /* or div */ data-zone-id={z.id}>{/* ... */}</g>
  </ZoneItem>
))}
```

If you already have a zone store, open `src/zones/useZones.ts` and
**replace** the bodies of `renameZone` and `deleteZone` with calls into your store.

The menu opens on **right‑click**. It handles **Escape/Click‑outside** to close.
Delete has a 2‑step confirm to avoid accidents.

---

## 2) A* Pathfinding verifier
Files:
- `src/rtls/aStar/verify.ts`

Use this to confirm behavior around **no‑go** polygons:
```ts
import { verifyPath } from "@/rtls/aStar/verify";
const report = verifyPath({
  start: {x: 10, y: 10},
  goal:  {x: 230, y: 130},
  obstacles: noGoPolys, // Array<Polygon>
  gridSize: 1,          // or your cell size
  aStar: yourAStarFn    // (start, goal, {isBlocked}) => Point[]
});
console.table(report.metrics);
// report.path is the returned path, report.violations lists any polygon intrusions
```

It checks:
- Path never crosses a no‑go polygon edge (segment‑polygon intersection).
- Path nodes don’t fall **inside** any no‑go polygon.
- No `NaN`/infinite coordinates. Warns if path is empty/unreachable.

---

## 3) Console‑safety helpers
Files:
- `src/utils/reactKey.ts` — `keyFor(id, idx)` to remove "missing key" warnings.
- `src/utils/listener.ts` — `withListener(el, type, fn)` auto‑cleans listeners to avoid duplicate handlers in hot reloads.

**Example:**
```tsx
import { keyFor } from "@/utils/reactKey";
{items.map((it, i) => <Row key={keyFor(it.id, i)} {...it} />)}
```

```ts
import { withListener } from "@/utils/listener";
const dispose = withListener(window, "resize", onResize);
// later:
dispose();
```

---

## Notes
- The patch is dependency‑free. TS strict‑friendly.
- UI text uses **Romanian** for menu labels to match your app.
- Keep “Bucătărie” as a **no‑go** editable zone — this patch doesn’t hardcode any zones.
