
import { useCallback } from "react";
import { Zone } from "@/types/zones";

// Shim hooks for rename/delete to decouple from your store.
// Replace the bodies with calls into your existing state manager.
export function useZonesApi() {
  const renameZone = useCallback((id: string, newName: string) => {
    // TODO: wire to your store. Example with Zustand:
    // set(state => { state.zones.byId[id].name = newName; });
    console.info("[zones] renameZone", { id, newName });
  }, []);

  const deleteZone = useCallback((id: string) => {
    // TODO: wire to your store. Example with Zustand:
    // set(state => { delete state.zones.byId[id]; state.zones.order = state.zones.order.filter(z => z !== id); });
    console.info("[zones] deleteZone", { id });
  }, []);

  return { renameZone, deleteZone };
}
