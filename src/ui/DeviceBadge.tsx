
import React from "react";

interface Props {
  violation?: boolean;
  label?: string;
  children: React.ReactNode; // your dot element (circle, etc.)
}

/**
 * Wraps a device dot and overlays a red flag + pulsing ring when violation=true.
 * Works in SVG or HTML depending on children context.
 */
export const DeviceBadge: React.FC<Props> = ({ violation, label, children }) => {
  // Detect if child is an SVG element to choose overlay primitives
  const isSvg = isSvgElement(children);

  if (!violation) {
    return (
      <g aria-label={label ?? "device"}>
        {children}
      </g>
    );
  }

  if (isSvg) {
    // Expect child to be positioned via cx/cy; we render relative adornments.
    // We'll clone to read cx/cy; fallback to 0,0 if missing.
    const child = React.Children.only(children) as any;
    const cx = Number(child.props.cx ?? 0);
    const cy = Number(child.props.cy ?? 0);
    const r = Number(child.props.r ?? 3);

    return (
      <g aria-label={(label ?? "device") + " (no-go)"} className="violation-shake">
        {/* pulse ring */}
        <circle cx={cx} cy={cy} r={r * 2.2} className="violation-pulse" />
        {/* red flag (triangle + pole) */}
        <line x1={cx + r + 1} y1={cy - r - 1} x2={cx + r + 1} y2={cy - r - 6} stroke="red" strokeWidth={1} />
        <polygon points={`${cx + r + 1},${cy - r - 6} ${cx + r + 6},${cy - r - 4} ${cx + r + 1},${cy - r - 2}`} fill="red" />
        {/* the actual dot */}
        {children}
      </g>
    );
  }

  // HTML fallback: wrap with an absolutely positioned flag badge
  return (
    <div className="violation-wrap" aria-label={(label ?? "device") + " (no-go)"}>
      <div className="violation-flag" />
      {children}
    </div>
  );
};

function isSvgElement(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  // crude check: if type is string like "circle" / "g" etc., assume SVG when inside an <svg>
  const t = (node as any).type;
  return typeof t === "string";
}
