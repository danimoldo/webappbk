
import type { Point, Polygon } from "@/zones/persistLocalV2";
import { pointInPolygon, pointPolygonDistance } from "@/geom/distance";

/** Build an isBlocked function from polygons, with optional clearance (meters). */
export function makeIsBlocked(obstacles: Polygon[], opts?: { clearance?: number }) {
  const clearance = Math.max(0, opts?.clearance ?? 0);
  if (clearance <= 0) {
    return (p: Point) => pointInAnyPolygon(p, obstacles);
  }
  return (p: Point) => {
    if (pointInAnyPolygon(p, obstacles)) return true;
    // Enforce buffer by distance-to-edge
    for (const poly of obstacles) {
      if (pointPolygonDistance(p, poly) < clearance) return true;
    }
    return false;
  };
}

function pointInAnyPolygon(p: Point, polys: Polygon[]): boolean {
  return polys.some(poly => pointInPolygon(p, poly));
}
