export interface BitcoinLocation {
  id: number;
  type: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  source: string;
}

export interface LocationStats {
  total_locations: number;
  location_types: {
    physical_locations: number;
    areas_or_buildings: number;
  };
  countries: {
    total_countries: number;
    distribution: Record<string, number>;
  };
  last_updated: string;
}
