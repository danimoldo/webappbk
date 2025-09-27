
import type { Zone } from "@/types/zones";

export function validateZone(z: Zone): string[] {
  const issues: string[] = [];
  if (!z.polygon || z.polygon.length < 3) issues.push("Polygon must have at least 3 points");
  if (selfIntersects(z.polygon)) issues.push("Polygon self-intersects");
  return issues;
}

type P = { x: number; y: number };

function selfIntersects(pts: P[]): boolean {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a1 = pts[i], a2 = pts[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      const b1 = pts[j], b2 = pts[(j + 1) % n];
      // skip adjacent edges sharing a vertex
      if (i === j || (i + 1) % n === j || i === (j + 1) % n) continue;
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function segmentsIntersect(p1: P, p2: P, p3: P, p4: P): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false; // parallel
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / d;
  return ua > 0 && ua < 1 && ub > 0 && ub < 1;
}
