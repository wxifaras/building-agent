// models/StructuralLayout.ts

export interface Basemap {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface Column {
  id: string;
  x: number;
  y: number;
  size: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  kind: "floorplate" | "opening";
  points: Point[];
}

export interface StructuralLayout {
  id: string;
  docType: string;
  client_name: string;
  slug: string;
  floorId: string;
  mode: string;
  basemaps: Basemap[];
  activeBasemap: number;
  columns: Column[];
  beams: any[]; // Define specific beam type if needed
  polygons: Polygon[];
}