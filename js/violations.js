
import { pointInPolygon, pointSegmentDistance } from "./geom.js";

/**
 * Returns true if (x,y) is inside any polygon in `zones`, or within `clearancePx` to its edges.
 * @param {Array<Array<{x:number,y:number}>>} zones
 * @param {number} x
 * @param {number} y
 * @param {{clearancePx?: number}} opts
 */
export function isInNoGo(zones, x, y, opts = {}){
  const clearance = Math.max(0, opts.clearancePx || 0);
  for (const poly of zones){
    if (!poly || poly.length < 3) continue;
    if (pointInPolygon(x,y,poly)) return true;
    if (clearance > 0){
      // distance to polygon edges
      let minD = Infinity;
      for (let i=0;i<poly.length;i++){
        const a = poly[i], b = poly[(i+1)%poly.length];
        const d = pointSegmentDistance(x, y, a.x, a.y, b.x, b.y);
        if (d < clearance) return true;
        if (d < minD) minD = d;
      }
    }
  }
  return false;
}
