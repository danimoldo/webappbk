
import React, { useEffect, useRef } from "react";

export interface MenuProps {
  x: number;
  y: number;
  name: string;
  onRename(): void;
  onDelete(): void;
  onClose(): void;
  confirmDelete?: boolean;
}

export const ZoneContextMenu: React.FC<MenuProps> = ({
  x, y, name, onRename, onDelete, onClose, confirmDelete
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const style: React.CSSProperties = {
    position: "fixed",
    top: y,
    left: x,
    background: "white",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 8,
    padding: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    zIndex: 10000,
    minWidth: 200
  };

  const itemStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
    userSelect: "none"
  };

  return (
    <div ref={ref} style={style} role="menu" aria-label="Zone actions">
      <div style={{fontWeight: 600, padding: "4px 6px 8px 6px"}}>Zonă: {name}</div>
      <div
        role="menuitem"
        style={itemStyle}
        onClick={onRename}
        onKeyDown={(e) => e.key === "Enter" && onRename()}
        tabIndex={0}
      >
        Redenumește…
      </div>
      <div
        role="menuitem"
        style={{...itemStyle, color: confirmDelete ? "#b00020" : "#a00"}}
        onClick={onDelete}
        onKeyDown={(e) => e.key === "Enter" && onDelete()}
        tabIndex={0}
        aria-live="polite"
      >
        {confirmDelete ? "Confirmă ștergerea" : "Șterge zona"}
      </div>
    </div>
  );
};
