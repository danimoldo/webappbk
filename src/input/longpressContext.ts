
/**
 * Synthesizes a contextmenu event on long-press (~450ms) for touch devices.
 * Bind to the container that holds your zone elements.
 */
export function bindLongPressContext(root: HTMLElement, ms = 450) {
  let timer: number | null = null;
  let lastTouch: Touch | null = null;

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    lastTouch = e.touches[0];
    timer = window.setTimeout(() => {
      if (!lastTouch) return;
      const evt = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: lastTouch.clientX,
        clientY: lastTouch.clientY,
      });
      root.dispatchEvent(evt);
    }, ms);
  }

  function clear() {
    if (timer) window.clearTimeout(timer);
    timer = null;
    lastTouch = null;
  }

  function onTouchEnd() { clear(); }
  function onTouchMove(e: TouchEvent) {
    if (!lastTouch) return;
    const t = e.touches[0];
    if (!t) { clear(); return; }
    const dx = Math.abs(t.clientX - lastTouch.clientX);
    const dy = Math.abs(t.clientY - lastTouch.clientY);
    if (dx + dy > 8) clear();
  }

  root.addEventListener("touchstart", onTouchStart, { passive: true });
  root.addEventListener("touchend", onTouchEnd, { passive: true });
  root.addEventListener("touchcancel", onTouchEnd, { passive: true });
  root.addEventListener("touchmove", onTouchMove, { passive: true });

  return () => {
    root.removeEventListener("touchstart", onTouchStart as any);
    root.removeEventListener("touchend", onTouchEnd as any);
    root.removeEventListener("touchcancel", onTouchEnd as any);
    root.removeEventListener("touchmove", onTouchMove as any);
  };
}
