"use client";

import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

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
    constructor(options?: MarkerClusterGroupOptions);
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
const bothIcon = createCustomIcon("#2E73E5"); // Blue for both

interface Location {
  id: number;
  type: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  source: string;
}

interface MapProps {
  locations: Location[];
}

// Component to handle markers and clustering
function MarkerLayer({ locations }: MapProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const markers = new L.MarkerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    locations.forEach((location) => {
      const marker = L.marker([location.lat, location.lon], {
        icon: getIcon(location.tags),
      });

      // Get payment methods - only explicit tags
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
          
          ${
            paymentMethods.length > 0
              ? `<div class="mb-3">
                  <div class="text-[10px] text-[#6272a4] uppercase mb-2 font-semibold">Accepted Payments</div>
                  <div class="flex gap 2">
                    ${paymentMethods
                      .map(
                        (method) =>
                          `<div class="text-xs h-[20px] rounded-full flex items-center p-[10px] pt-[5px] pb-[5px] mr-[5px] ${
                            method === "Bitcoin"
                              ? "bg-[#ff5555]/10 text-[#ff5555] border border-[#ff5555]/20"
                              : "bg-[#bd93f9]/10 text-[#bd93f9] border border-[#bd93f9]/20"
                          }">
                            ${method === "Bitcoin" ? "On-Chain" : "Lightning"}
                          </div>`
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }

          ${
            amenities.length > 0
              ? `<div class="mb-3">
                  <div class="text-[10px] text-[#6272a4] uppercase tracking-wider mb-2 font-semibold">Amenities</div>
                  <div class="flex flex-wrap gap-2">
                    ${amenities
                      .map(
                        (amenity) =>
                          `<span class="text-xs px-2.5 py-1 rounded-full bg-[#44475a]/10 text-[#f8f8f2]/80 border border-[#44475a]/20">
                            ${amenity}
                          </span>`
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }

          <div class="space-y-3 mt-[10px] mb-[10px]">
            ${
              openingHours
                ? `<div class="p-4">
                    <div class="text-[10px] text-[#6272a4] uppercase tracking-wider mb-1.5 font-semibold">Opening Hours</div>
                    <div class="text-xs leading-relaxed text-[#f8f8f2] font-medium">${openingHours}</div>
                  </div>`
                : ""
            }

            ${
              description
                ? `<div class="bg-[#44475a]/10 rounded-lg p-3">
                    <div class="text-[10px] text-[#6272a4] uppercase tracking-wider mb-1.5 font-semibold">About</div>
                    <div class="text-xs leading-relaxed text-[#f8f8f2]/90">${description}</div>
                  </div>`
                : ""
            }
          </div>

          <div class="flex flex-wrap gap-6 mt-3 w-full">
            ${
              phone
                ? `<a href="tel:${phone}" class="text-xs rounded-full bg-[#50fa7b]/10 text-[#ffffff] border border-[#50fa7b]/20 hover:bg-[#50fa7b]/20 transition-colors flex items-center pr-[10px] pl-[10px] pt-[5px] pb-[5px] mr-[5px]">
                    <svg style="width: 10px; height: 10px;" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                    </svg>
                    ${phone}
                   </a>`
                : ""
            }
            ${
              website
                ? `<a href="${website}" target="_blank" rel="noopener noreferrer" 
                     class="text-xs px-2.5 py-1 rounded-full bg-[#8be9fd]/10 text-[#ffffff] border border-[#8be9fd]/20 hover:bg-[#8be9fd]/20 transition-colors flex items-center gap-1 p-[10px] pt-[5px] pb-[5px]">
                    <svg style="width: 10px; height: 10px;" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
                    </svg>
                    Website
                   </a>`
                : ""
            }
          </div>

          <div class="text-[10px] text-[#6272a4] mt-[12px] pt-[8px] border-t border-[#44475a]/30 flex items-center p-[10px] pl-[0px] pb-[0px]">
            <svg style="width: 10px; height: 10px;" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            Source: ${location.source}
          </div>
        </div>
      `);
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    if (locations.length > 0) {
      const bounds = markers.getBounds();
      map.fitBounds(bounds);
    }

    return () => {
      map.removeLayer(markers);
    };
  }, [map, locations]);

  return null;
}

// Get icon based on payment methods
function getIcon(tags: Record<string, string>) {
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

export default function Map({ locations }: MapProps) {
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
        <MarkerLayer locations={locations} />
      </MapContainer>
    </div>
  );
}
