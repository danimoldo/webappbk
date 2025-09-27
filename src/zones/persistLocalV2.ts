
import { Zone } from "@/types/zones";
import { debounce } from "@/utils/debounce";

const KEY_V2 = "rtls.noGoZones.v2";
const LEGACY_V1 = "rtls.noGoZones.v1";

type Stored = { version: 2; zones: Zone[] };

function migrateV1(): Zone[] {
  try {
    const raw = localStorage.getItem(LEGACY_V1);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((z: any) => z && z.isNoGo);
  } catch { return []; }
}

function readV2(): Zone[] {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (!raw) return [];
    const parsed: Stored = JSON.parse(raw);
    if (parsed && parsed.version === 2 && Array.isArray(parsed.zones)) return parsed.zones;
    return [];
  } catch { return []; }
}

function writeV2(zones: Zone[]) {
  try {
    const payload: Stored = { version: 2, zones };
    localStorage.setItem(KEY_V2, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("rtls:nogo:changed"));
  } catch {}
}

const debouncedWrite = debounce((zones: Zone[]) => writeV2(zones), 150);

export const storage = {
  load(): Zone[] {
    const v2 = readV2();
    if (v2.length) return v2;
    const migrated = migrateV1();
    if (migrated.length) writeV2(migrated);
    return migrated;
  },
  save(zones: Zone[], { debounceMs = 150 }: { debounceMs?: number } = {}) {
    if (debounceMs <= 0) writeV2(zones);
    else debouncedWrite(zones);
  },
};

export function persistNoGo(zones: Zone[]) {
  const onlyNoGo = zones.filter(z => z.isNoGo);
  storage.save(onlyNoGo);
}

export type Point = { x: number; y: number };
export type Polygon = Point[];

export function selectNoGoPolygons(): Polygon[] {
  return storage.load().map(z => z.polygon);
}

export function onNoGoChanged(fn: () => void) {
  const handler = () => fn();
  window.addEventListener("rtls:nogo:changed", handler);
  return () => window.removeEventListener("rtls:nogo:changed", handler);
}
