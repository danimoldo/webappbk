
import { selectNoGoPolygons } from "@/zones/persistLocalV2";
import { makeIsBlocked } from "@/rtls/aStar/isBlocked";

export type Point = { x: number; y: number };

type Args =
  | { clearance?: number; isBlocked?: (p: Point) => boolean }
  | { clearance?: number };

/** Returns a function that checks whether a point is inside any no-go (with optional clearance). */
export function buildNoGoDetector(args: Args = {}) {
  const { clearance = 0 } = args as any;
  // Prefer provided isBlocked if caller already has one wired.
  let isBlocked = (args as any).isBlocked as ((p: Point) => boolean) | undefined;
  if (!isBlocked) {
    const obstacles = selectNoGoPolygons();
    isBlocked = makeIsBlocked(obstacles, { clearance });
  }
  return (p: Point) => {
    const bad = !!isBlocked!(p);
    if (bad) {
      // Fire a lightweight event for optional logging/alerts
      const detail = { x: p.x, y: p.y, ts: Date.now() };
      window.dispatchEvent(new CustomEvent("rtls:violation", { detail }));
    }
    return bad;
  };
}
