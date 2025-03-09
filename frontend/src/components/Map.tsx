"use client";

import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { BitcoinLocation, LocationCoordinate } from "../types/location";
import { fetchLocationById } from "../services/api";

// Extend Leaflet types to include markerClusterGroup
declare module "leaflet" {
  export interface MarkerClusterGroupOptions {
    maxClusterRadius?: number | ((zoom: number) => number);
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    iconCreateFunction?: (cluster: MarkerCluster) => L.DivIcon | L.Icon;
  }

  export interface MarkerClusterGroup extends L.FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions): this;
    addLayer(layer: L.Layer): this;
    getBounds(): L.LatLngBounds;
  }

  export function markerClusterGroup(
    options?: MarkerClusterGroupOptions
  ): MarkerClusterGroup;
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom SVG icon
const createCustomIcon = (color: string = "#F7931A") => {
  return L.divIcon({
    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zM12 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="${color}"/>
    </svg>`,
    className: "custom-marker-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

// Create icons for different payment methods
const bitcoinIcon = createCustomIcon("#F7931A"); // Bitcoin orange
const lightningIcon = createCustomIcon("#792EE5"); // Lightning purple
const bothIcon = createCustomIcon("#00B1EA"); // Both payment methods blue

interface MapProps {
  coordinates: LocationCoordinate[];
}

interface MarkerLayerProps {
  coordinates: LocationCoordinate[];
}

// Function to get cluster style based on count
const getClusterStyle = (count: number) => {
  // Base size for all clusters
  const size = 40;
  
  // Color intensity based on count
  let backgroundColor;
  let borderColor;
  let className;
  
  if (count < 10) {
    // Small clusters - Bitcoin orange, lighter
    backgroundColor = "rgba(247, 147, 26, 0.7)";
    borderColor = "rgba(255, 255, 255, 0.5)";
    className = "custom-cluster-icon cluster-small";
  } else if (count < 50) {
    // Medium clusters - Bitcoin orange, standard
    backgroundColor = "rgba(247, 147, 26, 0.85)";
    borderColor = "rgba(255, 255, 255, 0.6)";
    className = "custom-cluster-icon cluster-medium";
  } else if (count < 100) {
    // Large clusters - Bitcoin orange with gold tint
    backgroundColor = "rgba(247, 147, 26, 0.95)";
    borderColor = "rgba(255, 215, 0, 0.6)";
    className = "custom-cluster-icon cluster-large";
  } else {
    // Very large clusters - Brighter orange-gold
    backgroundColor = "rgba(255, 165, 0, 0.95)";
    borderColor = "rgba(255, 215, 0, 0.8)";
    className = "custom-cluster-icon cluster-xlarge";
  }
  
  return {
    html: `<div style="background-color: ${backgroundColor}; border: 2px solid ${borderColor};" class="cluster-inner"><span>${count}</span></div>`,
    className: className,
    iconSize: L.point(size, size),
    iconAnchor: L.point(size/2, size/2)
  };
};

function MarkerLayer({ coordinates }: MarkerLayerProps) {
  const map = useMap();
  const [locationDetails, setLocationDetails] = useState<Record<number, BitcoinLocation>>({});
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!coordinates.length) return;

    // Create marker cluster group with custom styling
    const markers = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const style = getClusterStyle(count);
        return L.divIcon({
          html: style.html,
          className: style.className,
          iconSize: style.iconSize,
          iconAnchor: style.iconAnchor
        });
      },
    });

    // Store the markers reference
    markersRef.current = markers;

    // Add markers for each location
    coordinates.forEach((location) => {
      const marker = L.marker([location.lat, location.lon], {
        icon: getIconByType(location.type),
      });

      marker.on('click', async () => {
        try {
          // Check if we already have the details for this location
          if (!locationDetails[location.id]) {
            const details = await fetchLocationById(location.id);
            setLocationDetails(prev => ({
              ...prev,
              [location.id]: details
            }));
            
            // Create popup with the fetched details
            createPopup(marker, details);
          } else {
            // Use cached details
            createPopup(marker, locationDetails[location.id]);
          }
        } catch (error) {
          console.error(`Error fetching location details for ID ${location.id}:`, error);
          marker.bindPopup(`
            <div class="popup-content p-[15px]">
              <h3 class="text-[18px] font-bold text-[#f8f8f2] mt-[0px]">Error</h3>
              <p class="text-xs leading-relaxed text-[#f8f8f2]/80">Failed to load location details.</p>
            </div>
          `).openPopup();
        }
      });

      markers.addLayer(marker);
    });

    map.addLayer(markers);

    if (coordinates.length > 0) {
      const bounds = markers.getBounds();
      map.fitBounds(bounds);
    }

    // Add custom CSS for cluster styling
    if (!document.getElementById('cluster-styles')) {
      const style = document.createElement('style');
      style.id = 'cluster-styles';
      style.innerHTML = `
        .custom-cluster-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .cluster-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        }
        
        .cluster-small .cluster-inner {
          background-color: rgba(247, 147, 26, 0.7);
          border: 2px solid rgba(255, 255, 255, 0.5);
        }
        
        .cluster-medium .cluster-inner {
          background-color: rgba(247, 147, 26, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.6);
        }
        
        .cluster-large .cluster-inner {
          background-color: rgba(247, 147, 26, 0.95);
          border: 2px solid rgba(255, 215, 0, 0.6);
        }
        
        .cluster-xlarge .cluster-inner {
          background-color: rgba(255, 165, 0, 0.95);
          border: 2px solid rgba(255, 215, 0, 0.8);
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
        markersRef.current = null;
      }
    };
  }, [map, coordinates]); // Remove locationDetails from dependencies to prevent re-renders

  const createPopup = (marker: L.Marker, location: BitcoinLocation) => {
    // Check payment methods
    const acceptsOnchain =
      location.tags["payment:bitcoin"] === "yes" ||
      location.tags["currency:XBT"] === "yes" ||
      location.tags["payment:cryptocurrencies"] === "yes" ||
      location.tags["payment:onchain"] === "yes";
    const acceptsLightning =
      location.tags["payment:lightning"] === "yes" ||
      location.tags["payment:lightning_contactless"] === "yes";

    // Only add payment methods that are explicitly tagged
    const paymentMethods: ("Bitcoin" | "Lightning")[] = [];
    if (acceptsOnchain && !acceptsLightning) paymentMethods.push("Bitcoin");
    if (!acceptsOnchain && acceptsLightning) paymentMethods.push("Lightning");
    if (acceptsOnchain && acceptsLightning) {
      paymentMethods.push("Bitcoin");
      paymentMethods.push("Lightning");
    }

    // Get address components
    const address = [
      location.tags["addr:street"],
      location.tags["addr:housenumber"],
      location.tags["addr:postcode"],
      location.tags["addr:city"],
      location.tags["addr:country"],
    ]
      .filter(Boolean)
      .join(", ");

    // Get additional details
    const phone = location.tags.phone;
    const website = (
      location.tags.website ||
      location.tags["contact:website"] ||
      ""
    ).replace(/^www\./, "https://www."); // Add https:// if missing
    const openingHours = location.tags.opening_hours;
    const description =
      location.tags.description ||
      (location.tags.tourism ? `Type: ${location.tags.tourism}` : "") ||
      (location.tags.site ? `Type: ${location.tags.site}` : "");

    // Additional amenities
    const amenities = [
      location.tags.internet_access === "wlan" ? "WiFi" : null,
      location.tags.air_conditioning === "yes" ? "A/C" : null,
      location.tags.bar === "yes" ? "Bar" : null,
      location.tags.rooms ? `${location.tags.rooms} Rooms` : null,
    ].filter(Boolean);

    marker.bindPopup(`
      <div class="popup-content p-[15px]">
        <div class="mb-3">
          <h3 class="text-[18px] font-bold text-[#f8f8f2] mt-[0px]">${
            location.tags.name || location.tags.alt_name || "Unnamed Location"
          }</h3>
          ${
            address
              ? `<p class="text-xs leading-relaxed text-[#f8f8f2]/80">${address}</p>`
              : ""
          }
        </div>
        
        <div class="mb-3">
          <div class="flex flex-wrap gap-1 mb-2">
            ${paymentMethods
              .map(
                (method) =>
                  `<span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    method === "Bitcoin"
                      ? "bg-[#F7931A]/20 text-[#F7931A]"
                      : "bg-[#792EE5]/20 text-[#792EE5]"
                  }">${method}</span>`
              )
              .join("")}
          </div>
          
          ${
            amenities.length
              ? `<div class="flex flex-wrap gap-1">
                  ${amenities
                    .map(
                      (amenity) =>
                        `<span class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-[#f8f8f2]/10 text-[#f8f8f2]/80">${amenity}</span>`
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>
        
        ${
          description
            ? `<p class="text-xs leading-relaxed text-[#f8f8f2]/80 mb-3">${description}</p>`
            : ""
        }
        
        <div class="text-xs text-[#f8f8f2]/80">
          ${
            openingHours
              ? `<p class="mb-1"><strong>Hours:</strong> ${openingHours}</p>`
              : ""
          }
          ${phone ? `<p class="mb-1"><strong>Phone:</strong> ${phone}</p>` : ""}
          ${
            website
              ? `<p class="mb-1"><strong>Website:</strong> <a href="${website}" target="_blank" rel="noopener noreferrer" class="text-[#00B1EA] hover:underline">${website}</a></p>`
              : ""
          }
        </div>
        
        <div class="mt-3 pt-3 border-t border-[#f8f8f2]/10 text-xs text-[#f8f8f2]/50">
          <p>Source: ${location.source}</p>
          <p>ID: ${location.id}</p>
        </div>
      </div>
    `).openPopup();
  };

  return null;
}

// Get icon based on location type (simplified for coordinates)
function getIconByType(type: string) {
  if (type === 'node') return bitcoinIcon;
  if (type === 'way') return lightningIcon;
  return bitcoinIcon; // Default icon
}

// Get icon based on payment methods (for detailed view)
function getIconByPaymentMethods(tags: Record<string, string>) {
  const acceptsOnchain =
    tags["payment:bitcoin"] === "yes" ||
    tags["currency:XBT"] === "yes" ||
    tags["payment:cryptocurrencies"] === "yes" ||
    tags["payment:onchain"] === "yes";
  const acceptsLightning =
    tags["payment:lightning"] === "yes" ||
    tags["payment:lightning_contactless"] === "yes";

  if (acceptsOnchain && acceptsLightning) return bothIcon;
  if (acceptsLightning && !acceptsOnchain) return lightningIcon;
  if (acceptsOnchain && !acceptsLightning) return bitcoinIcon;
  return bitcoinIcon; // Default icon for unspecified payment methods
}

export default function Map({ coordinates }: MapProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ width: "100%", height: "100%" }}
        className="dark-theme-map"
        minZoom={2}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1.0}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="© OpenStreetMap contributors"
          maxZoom={19}
        />
        <MarkerLayer coordinates={coordinates} />
      </MapContainer>
    </div>
  );
}
