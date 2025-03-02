import sqlite3 from "sqlite3";
import { Database } from "sqlite3";
import { OverpassElement } from "../types/overpass";
import { OSMRecord, OSMNode, OSMWay, OSMRelation } from "../types/osm";

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

export class DatabaseService {
  private db: Database;

  constructor() {
    this.db = new sqlite3.Database("bitcoin_locations.db");
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.serialize(() => {
      // Create locations table if it doesn't exist
      this.db.run(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY,
          type TEXT NOT NULL,
          lat REAL,
          lon REAL,
          tags TEXT,
          nodes TEXT,
          source TEXT NOT NULL,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
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
        `INSERT INTO locations (id, type, lat, lon, tags, nodes, source, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
         type = ?,
         lat = ?,
         lon = ?,
         tags = ?,
         nodes = ?,
         source = ?,
         last_updated = CURRENT_TIMESTAMP`,
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

  async getAllLocations(): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      this.db.all(
        "SELECT * FROM locations WHERE lat IS NOT NULL AND lon IS NOT NULL",
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else {
            // Transform the rows to match the frontend's BitcoinLocation interface
            const locations = rows.map((row) => ({
              id: row.id,
              type: row.type,
              lat: row.lat,
              lon: row.lon,
              tags: row.tags ? JSON.parse(row.tags) : {},
              nodes: row.nodes ? JSON.parse(row.nodes) : [],
              source: row.source,
            }));
            resolve(locations);
          }
        }
      );
    });
  }

  async getPaymentStats(): Promise<PaymentStats> {
    return new Promise<PaymentStats>((resolve, reject) => {
      this.db.all(
        `SELECT 
          COUNT(*) as total_locations,
          SUM(CASE WHEN type = 'node' THEN 1 ELSE 0 END) as nodes,
          SUM(CASE WHEN type = 'way' THEN 1 ELSE 0 END) as ways
        FROM locations`,
        async (err: Error | null, [stats]: any[]) => {
          if (err) reject(err);
          else {
            // Get country statistics
            const countries = await this.getCountryStats();
            resolve({
              total_locations: stats.total_locations,
              by_type: {
                nodes: stats.nodes,
                ways: stats.ways,
              },
              countries,
            });
          }
        }
      );
    });
  }

  private async getCountryStats(): Promise<Record<string, number>> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          json_extract(tags, '$.addr:country') as country,
          COUNT(*) as count
        FROM locations
        WHERE json_extract(tags, '$.addr:country') IS NOT NULL
        GROUP BY json_extract(tags, '$.addr:country')
        ORDER BY count DESC`,
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else {
            const countries: Record<string, number> = {};
            rows.forEach((row) => {
              if (row.country) {
                countries[row.country] = row.count;
              }
            });
            resolve(countries);
          }
        }
      );
    });
  }
}
