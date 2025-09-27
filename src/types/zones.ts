
export type ZoneId = string;

export interface Zone {
  id: ZoneId;
  name: string;
  // Polygon in world coords (meters), clockwise or counter-clockwise
  polygon: { x: number; y: number }[];
  // Editable / no-go flags (extend as needed)
  editable?: boolean;
  isNoGo?: boolean;
}
