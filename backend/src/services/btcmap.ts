import { OSMRecord } from "../types/osm";

const BTCMAP_API_URL = "https://static.btcmap.org/api/v2/elements.json";

export async function fetchBtcmapLocations(): Promise<OSMRecord[]> {
  try {
    console.log("Fetching data from btcmap.org...");
    const response = await fetch(BTCMAP_API_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch from btcmap.org: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid data format from btcmap.org: expected an array");
    }

    console.log(
      `Successfully fetched ${data.length} locations from btcmap.org`
    );
    return data;
  } catch (error) {
    console.error("Error fetching from btcmap.org:", error);
    throw error;
  }
}
