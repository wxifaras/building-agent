// models/Floor.ts

export interface FloorMetrics {
  // Add specific metric properties as needed
}

export interface Floor {
  id: string;
  docType: "floor";
  client_name: string;
  slug: string;
  name: string;
  planUrl: string;
  images: string[];
  metrics: FloorMetrics;
  paperSize: string;
  editorStateUrl: string;
  imageWidth: number;
  imageHeight: number;
}