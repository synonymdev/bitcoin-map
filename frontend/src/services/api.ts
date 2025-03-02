import { BitcoinLocation, LocationStats } from "../types/location";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Cache for API responses
let locationsCache: BitcoinLocation[] | null = null;
let statsCache: LocationStats | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchLocations(): Promise<BitcoinLocation[]> {
  // Return cached data if available and not expired
  if (locationsCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return locationsCache;
  }

  const response = await fetch(`${API_BASE_URL}/locations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`);
  }

  const data = await response.json();
  locationsCache = data;
  lastFetchTime = Date.now();
  return data;
}

export async function fetchStats(): Promise<LocationStats> {
  // Return cached data if available and not expired
  if (statsCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return statsCache;
  }

  const response = await fetch(`${API_BASE_URL}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const data = await response.json();
  statsCache = data;
  lastFetchTime = Date.now();
  return data;
}

export async function forceRefresh(): Promise<{
  locations: BitcoinLocation[];
  stats: LocationStats;
}> {
  clearCache();
  const [locations, stats] = await Promise.all([
    fetchLocations(),
    fetchStats(),
  ]);
  return { locations, stats };
}

export function clearCache(): void {
  locationsCache = null;
  statsCache = null;
  lastFetchTime = 0;
}
