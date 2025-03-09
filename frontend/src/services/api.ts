import { BitcoinLocation, LocationCoordinate, LocationStats } from "../types/location";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Cache for API responses
let locationsCache: BitcoinLocation[] | null = null;
let coordinatesCache: LocationCoordinate[] | null = null;
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

export async function fetchCoordinates(): Promise<LocationCoordinate[]> {
  // Return cached data if available and not expired
  if (coordinatesCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return coordinatesCache;
  }

  const response = await fetch(`${API_BASE_URL}/coordinates`);
  if (!response.ok) {
    throw new Error(`Failed to fetch coordinates: ${response.statusText}`);
  }

  const data = await response.json();
  coordinatesCache = data;
  lastFetchTime = Date.now();
  return data;
}

export async function fetchLocationById(id: number): Promise<BitcoinLocation> {
  const response = await fetch(`${API_BASE_URL}/locations/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch location: ${response.statusText}`);
  }

  const data = await response.json();
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
  coordinates: LocationCoordinate[];
  stats: LocationStats;
}> {
  clearCache();
  const [coordinates, stats] = await Promise.all([
    fetchCoordinates(),
    fetchStats(),
  ]);
  return { coordinates, stats };
}

export function clearCache(): void {
  locationsCache = null;
  coordinatesCache = null;
  statsCache = null;
  lastFetchTime = 0;
}
