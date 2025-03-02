import axios from "axios";
import { OverpassResponse } from "../types/overpass";

interface OverpassConfig {
  timeout?: number; // in seconds
  maxsize?: number; // in bytes
  boundingBox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

export class OverpassService {
  private readonly API_URL = "https://overpass-api.de/api/interpreter";
  private readonly DEFAULT_TIMEOUT = 180; // 3 minutes
  private readonly DEFAULT_MAXSIZE = 1073741824; // 1GB

  private buildQuery(config: OverpassConfig = {}): string {
    const timeout = config.timeout || this.DEFAULT_TIMEOUT;
    const maxsize = config.maxsize || this.DEFAULT_MAXSIZE;

    const baseQuery = `[out:json][timeout:${timeout}][maxsize:${maxsize}];`;
    const filters = [];

    // Base filters for bitcoin payments
    if (config.boundingBox) {
      const { south, west, north, east } = config.boundingBox;
      const area = `(${south},${west},${north},${east})`;
      filters.push(`node["payment:bitcoin"="yes"]${area};`);
      filters.push(`way["payment:bitcoin"="yes"]${area};`);
      filters.push(`relation["payment:bitcoin"="yes"]${area};`);
    } else {
      filters.push('node["payment:bitcoin"="yes"];');
      filters.push('way["payment:bitcoin"="yes"];');
      filters.push('relation["payment:bitcoin"="yes"];');
    }

    return `${baseQuery}(${filters.join("")});out center;`;
  }

  async fetchBitcoinLocations(
    config?: OverpassConfig
  ): Promise<OverpassResponse> {
    try {
      const query = this.buildQuery(config);
      console.log("Executing Overpass query:", query);

      const response = await axios.get<OverpassResponse>(this.API_URL, {
        params: {
          data: query,
        },
        timeout: (config?.timeout || this.DEFAULT_TIMEOUT) * 1000, // Convert to milliseconds
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Overpass API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          query: error.config?.params?.data,
        });
        throw new Error(`Failed to fetch bitcoin locations: ${error.message}`);
      }
      throw new Error("Failed to fetch bitcoin locations");
    }
  }
}
