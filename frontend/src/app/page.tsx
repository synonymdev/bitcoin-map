"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { fetchLocations, fetchStats, forceRefresh } from "../services/api";
import { BitcoinLocation, LocationStats } from "../types/location";
import {
  FaBitcoin,
  FaBuilding,
  FaExclamationTriangle,
  FaShoppingBag,
  FaSpinner,
  FaStore,
} from "react-icons/fa";

// Reusable loading placeholder component
const LoadingPlaceholder = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#282a36]">
    <div className="relative w-[120px] h-[120px] flex items-center justify-center -mt-[100px]">
      <div className="animate-spin transition-all duration-300">
        <FaBitcoin className="w-[78px] h-[78px] text-[#f7931a] animate-spin" />
      </div>
    </div>

    {/* Loading text */}
    <div className="mt-16 text-center">
      <div className="text-3xl font-bold text-[#f8f8f2] tracking-tight">
        {message}
      </div>
      <div className="text-lg text-[#6272a4] flex items-center justify-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#bd93f9] animate-pulse"></div>
        Preparing your experience
      </div>
    </div>
  </div>
);

// Import Map component dynamically to avoid SSR issues with Leaflet
const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => <LoadingPlaceholder message="Loading map component..." />,
});

export default function Home() {
  const [locations, setLocations] = useState<BitcoinLocation[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoized fetch function to prevent unnecessary recreations
  const loadData = useCallback(async (isRefreshRequest = false) => {
    try {
      if (isRefreshRequest) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(
        isRefreshRequest ? "Refreshing data..." : "Loading initial data..."
      );

      if (isRefreshRequest) {
        const { locations: freshLocations, stats: freshStats } =
          await forceRefresh();
        setLocations(freshLocations);
        setStats(freshStats);
      } else {
        let retries = 0;
        let locationsData: BitcoinLocation[] = [];
        while (retries < 3) {
          try {
            locationsData = await fetchLocations();
            break;
          } catch (error) {
            retries++;
            if (retries >= 3) throw error;
            console.log(`Retrying locations fetch (${retries}/3)...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        console.log("Locations fetch complete");
        setLocations(locationsData);
        console.log("Starting stats fetch...");
        const statsData = await fetchStats();
        console.log("Stats fetch complete");
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    loadData(true);
  }, [loadData, isRefreshing]);

  if (loading && !isRefreshing) {
    return <LoadingPlaceholder message="Loading Bitcoin Map..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#282a36]">
        <div className="text-center max-w-lg mx-auto p-8 bg-[#44475a]/50 backdrop-blur-xl rounded-2xl border border-[#44475a] shadow-xl">
          <div className="bg-[#ff5555]/10 p-3 rounded-xl inline-flex mb-4">
            <FaExclamationTriangle className="w-8 h-8 text-[#ff5555]" />
          </div>
          <div className="text-xl font-bold text-[#ff5555] mb-2">
            Error Loading Data
          </div>
          <div className="text-sm text-[#f8f8f2] mb-6">{error}</div>
          <button
            className="px-6 py-2.5 bg-gradient-to-r from-[#bd93f9] to-[#ff79c6] 
                       text-white font-medium rounded-xl 
                       hover:from-[#bd93f9]/90 hover:to-[#ff79c6]/90 
                       transition-all duration-300 
                       disabled:opacity-50 hover:scale-105
                       shadow-lg shadow-[#bd93f9]/20"
            onClick={() => loadData()}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <div className="flex items-center gap-2">
                <FaSpinner className="animate-spin w-4 h-4" />
                <span>Retrying...</span>
              </div>
            ) : (
              "Try Again"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Header Stats Bar */}
      <div className="bg-[#282a36]">
        <div className="pl-[40px] pr-[40px]">
          <div className="flex items-center justify-between gap-6">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <FaBitcoin className="w-[28px] h-[28px] text-[#f7931a] mr-[12px] mb-[3px]" />
              <h1 className="text-[26px] font-bold text-[#f8f8f2] whitespace-nowrap tracking-tight">
                Bitcoin Map
              </h1>
            </div>

            {/* Stats Section */}
            {stats && (
              <div className="flex items-center gap-4">
                {/* Total Locations */}
                <div className="flex items-center p-[20px] group">
                  <div className="flex items-center gap-3 cursor-help">
                    <FaStore className="text-[#44475a] group-hover:text-[#bd93f9] transition-colors text-[28px] mr-[10px]" />
                    <div>
                      <div className="text-[11px] uppercase tracking-wider font-medium text-[#6272a4] mb-[3px]">
                        Total Merchants
                      </div>
                      <div className="text-xl font-bold text-[#f8f8f2] tabular-nums tracking-tight">
                        {stats.total_locations.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Physical Stores */}
                <div className="flex items-center p-[20px] group">
                  <div className="flex items-center gap-3 cursor-help">
                    <FaShoppingBag className="text-[#44475a] group-hover:text-[#ff79c6] transition-colors text-[28px] mr-[10px]" />
                    <div>
                      <div className="text-[11px] uppercase tracking-wider font-medium text-[#6272a4] mb-[3px]">
                        Physical Stores
                      </div>
                      <div className="text-lg font-bold text-white tabular-nums">
                        {stats.location_types.physical_locations.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Areas & Buildings */}
                <div className="flex items-center p-[20px] group">
                  <div className="flex items-center gap-3 cursor-help">
                    <FaBuilding className="text-[#44475a] group-hover:text-[#8be9fd] transition-colors text-[28px] mr-[10px]" />
                    <div>
                      <div className="text-[11px] uppercase tracking-wider font-medium text-[#6272a4] mb-[3px]">
                        Areas & Buildings
                      </div>
                      <div className="text-lg font-bold text-white tabular-nums">
                        {stats.location_types.areas_or_buildings.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refresh Button & Last Updated */}
                <div className="flex items-center gap-3 ml-[5px]">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer group"
                    aria-label="Refresh data"
                  >
                    <div className="flex text-[#6272a4] group-hover:text-[#8be9fd] transition-colors text-[11px]">
                      Updated <br />
                      {/* show date in format 12:00 AM */}
                      {new Date(stats.last_updated).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}{" "}
                    </div>
                    <div className="mt-[10px] absolute right-0 top-0 z-10 ml-[100px]">
                      {isRefreshing && (
                        <FaSpinner className="text-[#6272a4] animate-spin" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <Suspense fallback={<LoadingPlaceholder message="Loading map..." />}>
          <Map locations={locations} />
        </Suspense>
      </div>
    </div>
  );
}
