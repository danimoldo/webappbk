
import type { Point } from "@/zones/persistLocalV2";
import { selectNoGoPolygons } from "@/zones/persistLocalV2";
import { makeIsBlocked } from "./isBlocked";

type AStar = (start: Point, goal: Point, opts: { isBlocked(p: Point): boolean }) => Point[];

/** Wrap your existing A* so it always respects latest no-go + optional clearance. */
export function withNoGoGuard(aStar: AStar, { gridSize = 1, clearance = 0 }: { gridSize?: number; clearance?: number } = {}) {
  const snap = (p: Point) => ({ x: Math.round(p.x / gridSize) * gridSize, y: Math.round(p.y / gridSize) * gridSize });
  return (start: Point, goal: Point) => {
    const obstacles = selectNoGoPolygons();
    const isBlocked = makeIsBlocked(obstacles, { clearance });
    return aStar(snap(start), snap(goal), { isBlocked });
  };
}
