// Minimal waypoints + task queue per asset.
// API:
//   initTasks(ui)
//   getQueue(id) -> array
//   addWaypoint(id, {x,y})
//   start(id) / cancel(id)
//   nextTarget(id) -> {x,y} | null
//
const queues = new Map();
const running = new Set();

export function initTasks(ui){
  // UI wiring can call into these; we keep logic separate.
}

export function getQueue(id){ return queues.get(id)||[]; }
export function addWaypoint(id, wp){
  const q = queues.get(id)||[];
  q.push(wp);
  queues.set(id,q);
}
export function start(id){ running.add(id); }
export function cancel(id){ running.delete(id); }
export function isRunning(id){ return running.has(id); }

export function nextTarget(id){
  if(!running.has(id)) return null;
  const q = queues.get(id)||[];
  if(q.length===0) return null;
  return q[0];
}
export function popIfReached(id, pos, tol=1.0){
  const q = queues.get(id)||[];
  if(q.length===0) return;
  const t = q[0];
  if(Math.hypot(pos.x - t.x, pos.y - t.y) <= tol){
    q.shift();
    queues.set(id,q);
  }
}
