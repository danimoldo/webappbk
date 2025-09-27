
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Zone } from "@/types/zones";
import { ZoneContextMenu } from "./contextMenu";
import { useZonesApi } from "./useZones";

interface Props {
  zone: Zone;
  children: React.ReactNode; // your existing visual
}

export const ZoneItem: React.FC<Props> = ({ zone, children }) => {
  const { renameZone, deleteZone } = useZonesApi();
  const [menu, setMenu] = useState<{x: number; y: number} | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setConfirmDelete(false);
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const onClose = useCallback(() => setMenu(null), []);

  const doRename = useCallback(() => {
    const newName = window.prompt("Nume nou pentru zonă:", zone.name ?? "");
    if (newName && newName.trim() && newName !== zone.name) {
      renameZone(zone.id, newName.trim());
    }
    onClose();
  }, [renameZone, zone.id, zone.name, onClose]);

  const doDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteZone(zone.id);
    onClose();
  }, [confirmDelete, deleteZone, zone.id, onClose]);

  // Clone child to attach handler no matter if it's <g> or <div>
  const child = useMemo(() => {
    if (!React.isValidElement(children)) return children;
    return React.cloneElement(children as any, {
      onContextMenu: (e: any) => {
        (children as any).props?.onContextMenu?.(e);
        onContextMenu(e);
      }
    });
  }, [children, onContextMenu]);

  return (
    <>
      {child}
      {menu && (
        <ZoneContextMenu
          x={menu.x}
          y={menu.y}
          name={zone.name}
          onRename={doRename}
          onDelete={doDelete}
          onClose={onClose}
          confirmDelete={confirmDelete}
        />
      )}
    </>
  );
};
