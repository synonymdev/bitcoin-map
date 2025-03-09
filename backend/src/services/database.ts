import sqlite3 from "sqlite3";
import { Database } from "sqlite3";
import { OverpassElement } from "../types/overpass";
import { OSMRecord, OSMNode, OSMWay, OSMRelation } from "../types/osm";
import path from 'path';
import fs from 'fs';

export interface PaymentStats {
  total_locations: number;
  by_type: {
    nodes: number;
    ways: number;
  };
  countries: {
    [country: string]: number;
  };
}

interface LocationRow {
  id: number;
  type: string;
  lat: number;
  lon: number;
  tags: string;
  source: string;
}

export interface Location {
  id: number;
  type: string;
  lat: number;
  lon: number;
  tags: Record<string, any>;
  source: string;
}

export interface LocationCoordinate {
  id: number;
  type: string;
  lat: number;
  lon: number;
}

export class DatabaseService {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    // Ensure data directory exists
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dbPath = path.resolve(dataDir, 'bitcoin_locations.db');
    console.log(`Database path: ${this.dbPath}`);
    
    this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.serialize(() => {
      // Create locations table if it doesn't exist
      this.db.run(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY,
          type TEXT NOT NULL,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          tags TEXT NOT NULL,
          nodes TEXT,
          source TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  async getAllLocations(): Promise<Location[]> {
    return new Promise((resolve, reject) => {
      this.db.all<LocationRow>(
        'SELECT id, type, lat, lon, tags, source FROM locations',
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const locations = rows.map((row) => ({
            id: row.id,
            type: row.type,
            lat: row.lat,
            lon: row.lon,
            tags: JSON.parse(row.tags),
            source: row.source,
          }));

          resolve(locations);
        }
      );
    });
  }

  async getLocationCoordinates(): Promise<LocationCoordinate[]> {
    return new Promise((resolve, reject) => {
      this.db.all<LocationRow>(
        'SELECT id, type, lat, lon FROM locations',
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(rows.map(row => ({
            id: row.id,
            type: row.type,
            lat: row.lat,
            lon: row.lon
          })));
        }
      );
    });
  }

  async getLocationById(id: string): Promise<Location | null> {
    return new Promise((resolve, reject) => {
      this.db.get<LocationRow>(
        'SELECT id, type, lat, lon, tags, source FROM locations WHERE id = ?',
        [parseInt(id, 10)],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          resolve({
            id: row.id,
            type: row.type,
            lat: row.lat,
            lon: row.lon,
            tags: JSON.parse(row.tags),
            source: row.source,
          });
        }
      );
    });
  }

  async getPaymentStats(): Promise<PaymentStats> {
    const stats = await this.getLocationStats();
    const countries = await this.getCountryStats();

    return {
      total_locations: stats.total_locations,
      by_type: {
        nodes: stats.nodes,
        ways: stats.ways,
      },
      countries,
    };
  }

  private async getLocationStats(): Promise<{ total_locations: number; nodes: number; ways: number }> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as total_locations,
          SUM(CASE WHEN type = 'node' THEN 1 ELSE 0 END) as nodes,
          SUM(CASE WHEN type = 'way' THEN 1 ELSE 0 END) as ways
        FROM locations`,
        (err, row: { total_locations: number; nodes: number; ways: number } | undefined) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            total_locations: row?.total_locations || 0,
            nodes: row?.nodes || 0,
            ways: row?.ways || 0,
          });
        }
      );
    });
  }

  private async getCountryStats(): Promise<{ [country: string]: number }> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          json_extract(tags, '$.addr:country') as country,
          COUNT(*) as count
        FROM locations
        WHERE json_extract(tags, '$.addr:country') IS NOT NULL
        GROUP BY country
        ORDER BY count DESC`,
        (err, rows: { country: string; count: number }[]) => {
          if (err) {
            reject(err);
            return;
          }

          const countries: { [country: string]: number } = {};
          rows.forEach((row) => {
            countries[row.country] = row.count;
          });

          resolve(countries);
        }
      );
    });
  }

  async upsertLocation(
    element: OverpassElement | OSMRecord,
    source: "overpass" | "btcmap"
  ): Promise<void> {
    let id: number;
    let type: string;
    let lat: number | null = null;
    let lon: number | null = null;
    let tags: string | null = null;
    let nodes: string | null = null;

    if ("osm_json" in element) {
      // BTCMap record
      const osmData = element.osm_json;
      id = osmData.id;
      type = osmData.type;

      // Safely merge tags from both osm_json and the root element
      const osmTags = osmData.tags || {};
      const elementTags = element.tags || {};

      const mergedTags = {
        ...osmTags,
        ...elementTags,
        // Ensure payment methods are correctly mapped
        "payment:bitcoin":
          osmTags["payment:bitcoin"] === "yes" ||
          elementTags["payment:onchain"] === "yes" ||
          elementTags["currency:XBT"] === "yes"
            ? "yes"
            : "no",
        "payment:lightning":
          osmTags["payment:lightning"] === "yes" ||
          elementTags["payment:lightning"] === "yes"
            ? "yes"
            : "no",
      };
      tags = JSON.stringify(mergedTags);

      if (osmData.type === "node") {
        lat = (osmData as OSMNode).lat;
        lon = (osmData as OSMNode).lon;
      } else if (osmData.type === "way") {
        const way = osmData as OSMWay;
        if (way.geometry && way.geometry.length > 0) {
          // Use the first point of the way as center
          lat = way.geometry[0].lat;
          lon = way.geometry[0].lon;
        }
        nodes = JSON.stringify(way.nodes);
      } else if (osmData.type === "relation") {
        const relation = osmData as OSMRelation;
        if (relation.bounds) {
          // Use center of bounds
          lat = (relation.bounds.minlat + relation.bounds.maxlat) / 2;
          lon = (relation.bounds.minlon + relation.bounds.maxlon) / 2;
        }
      }
    } else {
      // Overpass element
      id = element.id;
      type = element.type;
      lat = "lat" in element ? element.lat : element.center?.lat ?? null;
      lon = "lon" in element ? element.lon : element.center?.lon ?? null;
      tags = element.tags ? JSON.stringify(element.tags) : null;
      nodes = "nodes" in element ? JSON.stringify(element.nodes) : null;
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO locations (id, type, lat, lon, tags, nodes, source, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
         type = ?,
         lat = ?,
         lon = ?,
         tags = ?,
         nodes = ?,
         source = ?,
         updated_at = CURRENT_TIMESTAMP`,
        [
          id,
          type,
          lat,
          lon,
          tags,
          nodes,
          source,
          type,
          lat,
          lon,
          tags,
          nodes,
          source,
        ],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}
