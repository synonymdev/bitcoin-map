import express from "express";
import cron from "node-cron";
import cors from "cors";
import { DatabaseService } from "./services/database";
import { OverpassService } from "./services/overpass";
import { fetchBtcmapLocations } from "./services/btcmap";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const db = new DatabaseService();
const overpassService = new OverpassService();

// Middleware
app.use(cors());
app.use(express.json());

// Add health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Endpoint to get all bitcoin locations
app.get(
  "/api/locations",
  async (req: express.Request, res: express.Response) => {
    try {
      const locations = await db.getAllLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  }
);

// Endpoint to get payment statistics
app.get("/api/stats", async (req: express.Request, res: express.Response) => {
  try {
    const stats = await db.getPaymentStats();

    res.json({
      total_locations: stats.total_locations,
      location_types: {
        physical_locations: stats.by_type.nodes,
        areas_or_buildings: stats.by_type.ways,
      },
      countries: {
        total_countries: Object.keys(stats.countries).length,
        distribution: stats.countries,
      },
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Function to update bitcoin locations from all sources
async function updateBitcoinLocations() {
  try {
    console.log("Starting location update from all sources...");

    // Fetch from Overpass API
    console.log("Fetching from Overpass API...");
    const overpassResponse = await overpassService.fetchBitcoinLocations({
      timeout: 300, // 5 minutes
      maxsize: 1073741824 * 2, // 2GB
    });

    console.log(
      `Received ${overpassResponse.elements.length} locations from Overpass. Starting database update...`
    );

    let overpassUpdatedCount = 0;
    for (const element of overpassResponse.elements) {
      try {
        await db.upsertLocation(element, "overpass");
        overpassUpdatedCount++;
      } catch (error) {
        console.error(
          `Failed to update Overpass location ${element.id}:`,
          error
        );
      }
    }

    console.log(
      `Successfully updated ${overpassUpdatedCount} out of ${overpassResponse.elements.length} Overpass locations`
    );

    // Fetch from BTCMap API
    console.log("Fetching from BTCMap API...");
    const btcmapLocations = await fetchBtcmapLocations();

    console.log(
      `Received ${btcmapLocations.length} locations from BTCMap. Starting database update...`
    );

    let btcmapUpdatedCount = 0;
    for (const location of btcmapLocations) {
      try {
        await db.upsertLocation(location, "btcmap");
        btcmapUpdatedCount++;
      } catch (error) {
        console.error(
          `Failed to update BTCMap location ${location.id}:`,
          error
        );
      }
    }

    console.log(
      `Successfully updated ${btcmapUpdatedCount} out of ${btcmapLocations.length} BTCMap locations`
    );

    console.log("Location update completed from all sources");
  } catch (error) {
    console.error("Failed to update bitcoin locations:", error);
    // Wait 5 minutes before retrying in case of error
    setTimeout(updateBitcoinLocations, 5 * 60 * 1000);
  }
}

// Schedule hourly updates
cron.schedule("0 * * * *", updateBitcoinLocations);

// Initial update when starting the server
updateBitcoinLocations();

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
