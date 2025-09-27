
export function pointInPolygon(x, y, poly){ // poly: [{x,y},...]
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++){
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi>y)!==(yj>y)) && (x < (xj - xi)*(y - yi)/(yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointSegmentDistance(px, py, ax, ay, bx, by){
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const c1 = vx*wx + vy*wy;
  if (c1 <= 0) return Math.hypot(px-ax, py-ay);
  const c2 = vx*vx + vy*vy;
  if (c2 <= c1) return Math.hypot(px-bx, py-by);
  const t = c1 / c2;
  const projx = ax + t*vx, projy = ay + t*vy;
  return Math.hypot(px-projx, py-projy);
}
