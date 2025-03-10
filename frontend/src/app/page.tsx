"use client";

import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { fetchCoordinates, fetchStats, forceRefresh } from "../services/api";
import { LocationCoordinate, LocationStats } from "../types/location";
import {
  FaBitcoin,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";

// Add custom styles for animation delays
const addCustomAnimationStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('animation-styles')) {
    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.innerHTML = `
      .delay-150 {
        animation-delay: 0.3s;
      }
      .delay-300 {
        animation-delay: 0.6s;
      }
      @keyframes spin-reverse {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(-360deg);
        }
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .animate-spin-reverse {
        animation: spin-reverse 3s linear infinite;
      }
      .animate-spin {
        animation: spin 1.5s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }
};

// Reusable loading placeholder component
const LoadingPlaceholder = ({ 
  message = "Loading...", 
  fullScreen = false 
}) => {
  useEffect(() => {
    addCustomAnimationStyles();
  }, []);

  const containerClasses = fullScreen 
    ? "flex flex-col items-center justify-center h-screen bg-[#282a36]" 
    : "w-full h-full flex flex-col items-center justify-center bg-[#282a36]";

  const marginTopClass = fullScreen ? "-mt-[100px]" : "";

  return (
    <div className={containerClasses}>
      <div className={`relative w-[120px] h-[120px] flex items-center justify-center ${marginTopClass}`}>
        {/* Bitcoin logo spinner */}
        <div className="transition-all duration-300">
          <FaBitcoin className="w-[82px] h-[82px] text-[#f7931a]" />
        </div>
        
        {/* Circular spinner around Bitcoin logo */}
        <div className="absolute inset-0 w-full h-full">
          <div className="ml-[10px] mt-[10px] w-[90px] h-[90px] rounded-full border-4 border-transparent border-t-[#f7931a] border-r-[#f7931a]/30 animate-spin-reverse"></div>
        </div>
      </div>

      {/* Loading text */}
      <div className="mt-[10px] text-center h-[80px] flex flex-col items-center justify-center">
        <div className="text-xl font-bold text-[#f8f8f2] tracking-tight">
          {message}
        </div>
        <div className="text-sm text-[#6272a4] flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-[#bd93f9] animate-pulse"></div>
          Preparing your experience
        </div>
      </div>
    </div>
  );
};

// Import Map component dynamically to avoid SSR issues with Leaflet
const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
});

// NumberFlow component with custom styling
interface AnimatedNumberProps {
  value: number;
  className?: string;
  isLoading: boolean;
}

// Loading spinner component
const LoadingSpinner = ({ className }: { className?: string }) => (
  <div className={`${className || ""} flex items-left justify-start h-full w-full`}>
    <div className="flex items-left space-x-1 h-[20px]">
      <div className="h-[8px] w-[8px] bg-[#f7931a] rounded-full animate-pulse"></div>
      <div className="h-[8px] w-[8px] bg-[#f7931a] rounded-full animate-pulse delay-75"></div>
      <div className="h-[8px] w-[8px] bg-[#f7931a] rounded-full animate-pulse delay-150"></div>
    </div>
  </div>
);

const AnimatedNumber = ({ 
  value, 
  className = "text-xl font-bold text-[#f8f8f2] tabular-nums tracking-tight",
  isLoading
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  
  useEffect(() => {
    if (isLoading) return;
    
    // Store the previous value
    const previousValue = previousValueRef.current;
    
    // Set the target value
    const targetValue = value;
    
    // Calculate the step size based on the difference
    const diff = targetValue - previousValue;
    const steps = 30; // Number of steps for the animation
    const stepValue = diff / steps;
    
    // Start from the previous value
    let currentValue = previousValue;
    let step = 0;
    
    // Animate the number
    const interval = setInterval(() => {
      step++;
      currentValue += stepValue;
      
      // Ensure we reach exactly the target value at the end
      if (step >= steps) {
        clearInterval(interval);
        currentValue = targetValue;
        previousValueRef.current = targetValue;
      }
      
      setDisplayValue(Math.round(currentValue));
    }, 20); // 20ms interval for smooth animation
    
    return () => clearInterval(interval);
  }, [value, isLoading]);
  
  if (isLoading) {
    return <LoadingSpinner className={className} />;
  }
  
  return (
    <div className={`${className} transition-all duration-300`}>
      {displayValue.toLocaleString()}
    </div>
  );
};

// Add custom CSS for the loading animation
const addCustomStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('number-flow-custom-styles')) {
    const style = document.createElement('style');
    style.id = 'number-flow-custom-styles';
    style.innerHTML = `
      .delay-75 {
        animation-delay: 0.3s;
      }
      .delay-150 {
        animation-delay: 0.6s;
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.8);
        }
      }
      .animate-pulse {
        animation: pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `;
    document.head.appendChild(style);
  }
};

export default function Home() {
  const [coordinates, setCoordinates] = useState<LocationCoordinate[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Adicionar estilos de animação quando o componente montar
  useEffect(() => {
    addCustomAnimationStyles();
  }, []);

  // Memoized fetch function to prevent unnecessary recreations
  const loadData = useCallback(async (isRefreshRequest = false) => {
    try {
      setIsLoadingStats(true);
      
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
        const { coordinates: freshCoordinates, stats: freshStats } =
          await forceRefresh();
        setCoordinates(freshCoordinates);
        setStats(freshStats);
        
        setTimeout(() => {
          setIsLoadingStats(false);
        }, 1000);
      } else {
        let retries = 0;
        let coordinatesData: LocationCoordinate[] = [];
        while (retries < 3) {
          try {
            coordinatesData = await fetchCoordinates();
            break;
          } catch (error) {
            retries++;
            if (retries >= 3) throw error;
            console.log(`Retrying coordinates fetch (${retries}/3)...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        console.log("Coordinates fetch complete");
        setCoordinates(coordinatesData);
        console.log("Starting stats fetch...");
        const statsData = await fetchStats();
        console.log("Stats fetch complete");
        setStats(statsData);
        
        setTimeout(() => {
          setIsLoadingStats(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setIsLoadingStats(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoadingStats(true);
    
    addCustomStyles();
    
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    
    setIsLoadingStats(true);
    
    loadData(true);
  }, [loadData, isRefreshing]);

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
      <div className="bg-[#282a36] relative z-10">
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
            <div className="flex items-center gap-4">
              {/* Total Locations */}
              <div className="flex items-center p-[20px] group">
                <div className="flex flex-col items-start">
                  <div className="text-[11px] uppercase tracking-wider font-medium text-[#6272a4] mb-[3px]">
                    Total Merchants
                  </div>
                  <AnimatedNumber 
                    value={stats?.total_locations || 0} 
                    isLoading={isLoadingStats || loading}
                  />
                </div>
              </div>

              {/* Physical Stores */}
              <div className="flex items-center p-[20px] group">
                <div className="flex flex-col items-start">
                  <div className="text-[11px] uppercase tracking-wider font-medium text-[#6272a4] mb-[3px]">
                    Physical Stores
                  </div>
                  <AnimatedNumber 
                    value={stats?.location_types?.physical_locations || 0} 
                    isLoading={isLoadingStats || loading}
                  />
                </div>
              </div>

              {/* Countries */}
              <div className="flex items-center p-[20px] group">
                <div className="flex flex-col items-start">
                  <div className="text-[11px] uppercase tracking-wider font-medium text-[#6272a4] mb-[3px]">
                    Countries
                  </div>
                  <AnimatedNumber 
                    value={stats?.countries?.total_countries || 0} 
                    isLoading={isLoadingStats || loading}
                  />
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-center p-[20px] group relative">
                <div className="flex flex-col items-start">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                    className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer group"
                    aria-label="Refresh data"
                  >
                    <div className="flex text-[#6272a4] group-hover:text-[#8be9fd] transition-colors text-[11px]">
                      {stats ? (
                        <>
                          Updated <br />
                          {/* show date in format 12:00 AM */}
                          {new Date(stats.last_updated).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}{" "}
                        </>
                      ) : (
                        "Loading..."
                      )}
                    </div>
                    <div className="mt-[10px] absolute right-0 top-0 z-10 ml-[100px]">
                      {(isRefreshing || loading) && (
                        <FaSpinner className="text-[#6272a4] animate-spin" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        {loading ? (
          <LoadingPlaceholder message="Loading map..." fullScreen={false} />
        ) : (
          <Suspense>
            <Map coordinates={coordinates} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
