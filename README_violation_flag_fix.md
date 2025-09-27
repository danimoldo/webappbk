
# Fix: Violation Badge Not Visible (SVG robustness)
Date: 2025-09-26

**Symptoms:** Events say `ENTER_ZONE`, but dots show no red flag/pulse.

**Likely causes:** the device dot isn't a raw `<circle>` with `cx/cy/r`, or it's wrapped in `<g>` with transforms, so the badge couldn't derive coordinates.

## What changed
- `DeviceBadge` now accepts **explicit `cx`, `cy`, `r` props**.
- If not provided, it tries `data-x`, `data-y`, `data-r` on the child.
- CSS updated to ensure SVG animations apply (`transform-box: fill-box; transform-origin: center`).
- Works regardless of child type; uses a `<g transform="translate(cx,cy)">` overlay.

## How to wire (reliable)
```tsx
import { DeviceBadge } from "@/ui/DeviceBadge";

<DeviceBadge violation={d.inNoGo} label={d.name} cx={d.x} cy={d.y} r={3}>
  {/* your dot, any SVG */}
  <g>
    <circle cx={d.x} cy={d.y} r={3} className="rtls-dot" />
    {/* or your custom marker */}
  </g>
</DeviceBadge>
```

**Make sure CSS is imported once:**
```ts
import "@/ui/violation.css";
```

If you cannot pass `cx/cy/r`, add `data-x`, `data-y`, `data-r` to your child.
