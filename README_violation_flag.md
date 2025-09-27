
# RTLS + CMMS — No-Go Entry Highlight (Red Flag + Pulse)
Date: 2025-09-26

**Goal:** When a moving device enters a no-go zone (or its clearance buffer), visibly highlight it:
- Red flag icon pinned to the dot
- Subtle pulsing ring
- `aria-label` update for accessibility
- Optional event you can hook into (`rtls:violation`)

## Files
- `src/rtls/violations/noGoDetector.ts` — Build `isInNoGo(point)` from current polygons; supports clearance buffer.
- `src/ui/DeviceBadge.tsx` — Wrap your device dot to render a red flag + pulse when `violation` is true.
- `src/ui/violation.css` — Minimal CSS for the pulse & shake.

## Quick integration
1) Import CSS **once** in your app (root):
```ts
import "@/ui/violation.css";
```

2) Build the detector near your map update / WS tick:
```ts
import { buildNoGoDetector } from "@/rtls/violations/noGoDetector";

const detectNoGo = buildNoGoDetector({ clearance: 0.5 }); // meters buffer (optional)
function onTelemetryTick(device) {
  const p = { x: device.x, y: device.y };
  const inNoGo = detectNoGo(p);
  // keep this flag with your device state
}
```

3) Wrap your device dot render:
```tsx
import { DeviceBadge } from "@/ui/DeviceBadge";

<g key={d.id}>
  <DeviceBadge violation={d.inNoGo} label={d.name}>
    {/* Your existing dot: */}
    <circle cx={d.x} cy={d.y} r={3} className="rtls-dot" />
  </DeviceBadge>
</g>
```

4) (Optional) Listen for events:
```ts
window.addEventListener("rtls:violation", (e: any) => {
  console.warn("Violation:", e.detail);
});
```

## Notes
- The detector uses the latest no-go polygons from your local storage (v2 if present; falls back to v1 if not).
- If you already maintain an `isBlocked`, pass it directly to `buildNoGoDetector({ isBlocked })` to avoid duplication.
