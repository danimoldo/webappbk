
// Stable React key helper: prefers id, falls back to index.
export function keyFor(id?: string | number, idx?: number) {
  if (id === 0 || id) return String(id);
  return `i${idx ?? 0}`;
}
