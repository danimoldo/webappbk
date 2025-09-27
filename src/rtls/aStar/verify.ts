
export type Point = { x: number; y: number };
export type Polygon = Point[]; // closed implicitly

export interface VerifyArgs {
  start: Point;
  goal: Point;
  obstacles: Polygon[];
  gridSize: number;
  aStar: (start: Point, goal: Point, opts: { isBlocked(p: Point): boolean }) => Point[];
}

export interface VerifyReport {
  path: Point[];
  metrics: {
    nodes: number;
    length: number;
    hasNaN: boolean;
    crossesObstacle: number;
    nodesInsideObstacle: number;
    unreachable: boolean;
  };
  violations: string[];
}

export function verifyPath(args: VerifyArgs): VerifyReport {
  const { start, goal, obstacles, gridSize, aStar } = args;
  const isBlocked = (p: Point) => pointInAnyPolygon(p, obstacles);
  const path = safeArray(aStar(snap(start, gridSize), snap(goal, gridSize), { isBlocked }));
  const hasNaN = path.some(p => !isFinite(p.x) || !isFinite(p.y));

  const violations: string[] = [];
  let crosses = 0, nodesInside = 0;

  // node-inside check
  for (const [i, p] of path.entries()) {
    if (pointInAnyPolygon(p, obstacles)) {
      nodesInside++; violations.push(`Node ${i} inside obstacle at (${p.x}, ${p.y})`);
    }
  }
  // segment-polygon intersection
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (segmentIntersectsAnyPolygon(a, b, obstacles)) {
      crosses++; violations.push(`Segment ${i}-${i+1} crosses obstacle`);
    }
  }

  return {
    path,
    metrics: {
      nodes: path.length,
      length: polylineLength(path),
      hasNaN,
      crossesObstacle: crosses,
      nodesInsideObstacle: nodesInside,
      unreachable: path.length === 0,
    },
    violations
  };
}

// ---------- helpers ----------
function snap(p: Point, g: number): Point {
  return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
}
function safeArray<T>(v: T[] | null | undefined): T[] { return Array.isArray(v) ? v : []; }

function pointInAnyPolygon(p: Point, polys: Polygon[]): boolean {
  return polys.some(poly => pointInPolygon(p, poly));
}
function pointInPolygon(point: Point, vs: Polygon): boolean {
  // ray casting
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 0.0000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function segmentIntersectsAnyPolygon(a: Point, b: Point, polys: Polygon[]): boolean {
  return polys.some(poly => segmentIntersectsPolygon(a, b, poly));
}
function segmentIntersectsPolygon(a: Point, b: Point, poly: Polygon): boolean {
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i];
    const d = poly[(i + 1) % poly.length];
    if (segmentsIntersect(a, b, c, d)) return true;
  }
  return false;
}
function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false; // parallel
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / d;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
function polylineLength(path: Point[]): number {
  let len = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    len += Math.hypot(dx, dy);
  }
  return len;
}
