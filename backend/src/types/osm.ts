// Interface for a complete record (can be a node, way or relation)
export interface OSMRecord {
  id: string;
  osm_json: OSMJson;
  tags: { [key: string]: string };
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Union type covering possible OSM object types
export type OSMJson = OSMNode | OSMWay | OSMRelation;

// Common base for OSM objects
interface OSMBase {
  type: "node" | "way" | "relation";
  id: number;
  timestamp: string;
  version: number;
  changeset: number;
  user: string;
  uid: number;
  tags: { [key: string]: string };
}

// Represents an OSM node
export interface OSMNode extends OSMBase {
  type: "node";
  lat: number;
  lon: number;
}

// Represents an OSM way
export interface OSMWay extends OSMBase {
  type: "way";
  bounds?: Bounds;
  nodes: number[];
  geometry?: GeoPoint[];
}

// Represents an OSM relation
export interface OSMRelation extends OSMBase {
  type: "relation";
  bounds?: Bounds;
  members: OSMMember[];
}

// Interface for a relation member
export interface OSMMember {
  type: "node" | "way" | "relation";
  ref: number;
  role: string;
  geometry?: GeoPoint[];
}

// Interface for bounds of a way or relation
export interface Bounds {
  minlon: number;
  maxlon: number;
  minlat: number;
  maxlat: number;
}

// Represents a geographic point (used in geometry)
export interface GeoPoint {
  lat: number;
  lon: number;
}
