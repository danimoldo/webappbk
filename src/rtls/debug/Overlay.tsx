
import React from "react";

type P = { x: number; y: number };
type Poly = P[];

export const DebugOverlay: React.FC<{
  obstacles: Poly[];
  path?: P[];
  show?: boolean;
}> = ({ obstacles, path = [], show = true }) => {
  if (!show) return null;
  return (
    <div style={overlayStyle}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Debug</div>
      <div>Obstacles: {obstacles.length}</div>
      <div>Path nodes: {path.length}</div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 8,
  left: 8,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  zIndex: 9999,
};
