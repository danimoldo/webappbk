
export function withListener<T extends EventTarget>(
  target: T, type: string, handler: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions
) {
  target.addEventListener(type, handler, opts);
  let disposed = false;
  return () => {
    if (!disposed) {
      target.removeEventListener(type, handler, opts);
      disposed = true;
    }
  };
}
