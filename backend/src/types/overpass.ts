export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: Osm3s;
  elements: OverpassElement[];
}

export interface Osm3s {
  timestamp_osm_base: string;
  copyright: string;
}

export type OverpassElement = OverpassNode | OverpassWay;

export interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  type: "way";
  id: number;
  nodes: number[];
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}
