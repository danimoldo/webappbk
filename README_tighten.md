
# RTLS + CMMS — Tighten Current Flow (Zones, Persistence, A*)
Date: 2025-09-26

This patch hardens the current implementation:
- **Persistence v2** with schema versioning, migration, and debounced writes
- **Clearance-aware path blocking** (keep forklifts a safe distance from no-go)
- **A*** guard w/ options (gridSize, clearance)
- **Zone validation** (self-intersection, min vertices)
- **Touch support** for context menu (long-press)
- **Debug overlay** to visualize no-go polys and last computed path

## Quick wire-up
1) Replace your previous imports with the new ones below where applicable.

2) **Persistence v2 (drop-in)**
```ts
import { storage, selectNoGoPolygons, persistNoGo, onNoGoChanged } from "@/zones/persistLocalV2";
persistNoGo(zones); // call on any zones change
onNoGoChanged(() => console.debug("[no-go] changed", selectNoGoPolygons().length));
```

3) **A*** guard with clearance (e.g., forklift radius = 1m):
```ts
import { withNoGoGuard } from "@/rtls/aStar/withNoGoGuard";
const runPath = withNoGoGuard(yourAStarFn, { gridSize: 1, clearance: 1 });
const path = runPath(start, goal);
```

Or pass isBlocked directly:
```ts
import { makeIsBlocked } from "@/rtls/aStar/isBlocked";
import { selectNoGoPolygons } from "@/zones/persistLocalV2";
const isBlocked = makeIsBlocked(selectNoGoPolygons(), { clearance: 1 });
const path = yourAStarFn(start, goal, { isBlocked });
```

4) **Validate zones before save**:
```ts
import { validateZone } from "@/zones/validators";
const issues = validateZone(zone);
if (issues.length) console.warn("Zone validation:", issues);
```

5) **Context menu on touch** (long-press ~450ms)
```ts
import { bindLongPressContext } from "@/input/longpressContext";
// call once on your zone container element:
const dispose = bindLongPressContext(containerEl);
// dispose() on unmount
```

6) **Debug overlay** (optional)
```tsx
import { DebugOverlay } from "@/rtls/debug/Overlay";
<DebugOverlay obstacles={selectNoGoPolygons()} path={lastPath} show={debug} />
```

## Notes
- Clearance-aware blocking uses **point-to-segment distance** against polygon edges.
- LocalStorage key bumped to `rtls.noGoZones.v2`. v1 auto-migrates.
- All components are lightweight; no external deps.
