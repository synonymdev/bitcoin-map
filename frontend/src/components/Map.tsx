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
import { FaSpinner } from "react-icons/fa";

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

// Create a single icon for all markers - Bitcoin orange
const bitcoinIcon = createCustomIcon("#F7931A"); // Bitcoin orange

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
  const popupRefs = useRef<Record<number, L.Popup | null>>({});

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
        icon: bitcoinIcon, // Use the same icon for all markers
      });

      marker.on('click', async () => {
        try {
          // Show loading popup immediately
          showLoadingPopup(marker, location);
          
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

    // Add custom CSS for cluster styling and popups
    if (!document.getElementById('map-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'map-custom-styles';
      style.innerHTML = `
        /* Cluster styles */
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
        
        /* Popup styles */
        .leaflet-popup {
          z-index: 1000 !important;
        }
        
        .leaflet-popup-content-wrapper {
          background-color: #1e1e2e;
          color: #f8f8f2;
          border-radius: 8px;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.4);
        }
        
        .leaflet-popup-tip {
          background-color: #1e1e2e;
        }
        
        .leaflet-popup-content {
          margin: 0;
          min-width: 280px;
          max-width: 320px;
        }
        
        .popup-content {
          padding: 16px;
        }
        
        .popup-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: bold;
          color: #f8f8f2;
        }
        
        .popup-content p {
          margin: 0 0 8px 0;
          font-size: 13px;
          line-height: 1.4;
          color: rgba(248, 248, 242, 0.8);
        }
        
        .popup-content .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        
        .popup-content .tag {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .popup-content .tag.bitcoin {
          background-color: rgba(247, 147, 26, 0.2);
          color: #F7931A;
        }
        
        .popup-content .tag.lightning {
          background-color: rgba(121, 46, 229, 0.2);
          color: #792EE5;
        }
        
        .popup-content .tag.amenity {
          background-color: rgba(248, 248, 242, 0.1);
          color: rgba(248, 248, 242, 0.8);
        }
        
        .popup-content .tag.type {
          background-color: rgba(73, 80, 87, 0.2);
          color: #e9ecef;
          margin-top: 4px;
          display: inline-block;
        }
        
        .popup-content .section {
          margin-bottom: 12px;
          padding-bottom: 12px;
        }
        
        .popup-content .section:not(:last-child) {
          border-bottom: 1px solid rgba(248, 248, 242, 0.1);
        }
        
        .popup-content .detail-row {
          display: flex;
          margin-bottom: 8px;
          align-items: flex-start;
        }
        
        .popup-content .detail-label {
          font-weight: 600;
          margin-right: 8px;
          min-width: 70px;
          color: #f8f8f2;
          background-color: rgba(248, 248, 242, 0.1);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 12px;
          text-align: center;
        }
        
        .popup-content .detail-value {
          flex: 1;
          word-break: break-word;
          font-size: 13px;
          color: rgba(248, 248, 242, 0.9);
        }
        
        .popup-content a {
          color: #00B1EA;
          text-decoration: none;
          transition: all 0.2s ease;
          word-break: break-all;
          display: inline-block;
        }
        
        .popup-content a:hover {
          color: #4CC9F0;
          text-decoration: underline;
        }
        
        .popup-content .footer {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(248, 248, 242, 0.1);
          font-size: 11px;
          color: rgba(248, 248, 242, 0.5);
        }
        
        .popup-content .section.no-border {
          border-bottom: none;
        }
        
        /* Loading spinner styles */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 4px solid rgba(247, 147, 26, 0.3);
          border-radius: 50%;
          border-top-color: #F7931A;
          animation: spin 1s ease-in-out infinite;
          margin: 20px auto;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
        }
        
        .loading-text {
          margin-top: 12px;
          color: #f8f8f2;
          font-size: 14px;
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

  // Show loading popup
  const showLoadingPopup = (marker: L.Marker, location: LocationCoordinate) => {
    marker.bindPopup(`
      <div class="popup-content loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading details...</div>
      </div>
    `, {
      maxWidth: 320
    }).openPopup();
  };

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

    // Get location type and format it nicely
    let locationType = "";
    if (location.tags.tourism) {
      locationType = formatLocationType(location.tags.tourism);
    } else if (location.tags.amenity) {
      locationType = formatLocationType(location.tags.amenity);
    } else if (location.tags.shop) {
      locationType = formatLocationType(location.tags.shop);
    } else if (location.tags.leisure) {
      locationType = formatLocationType(location.tags.leisure);
    } else if (location.tags.office) {
      locationType = formatLocationType(location.tags.office);
    }

    // Get additional details
    const phone = location.tags.phone;
    const formattedPhone = phone ? phone.replace(/[^\d+]/g, '') : '';
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

    // Check if we have any tags or amenities to display
    const hasTagsOrAmenities = paymentMethods.length > 0 || amenities.length > 0 || locationType || description;
    
    // Check if we have any details to display
    const hasDetails = openingHours || phone || website;

    marker.bindPopup(`
      <div class="popup-content">
        <div class="section">
          <h3>${location.tags.name || location.tags.alt_name || "Unnamed Location"}</h3>
          ${address ? `<p>${address}</p>` : ""}
          ${locationType ? `<span class="tag type">${locationType}</span>` : ""}
        </div>
        
        ${hasTagsOrAmenities ? `
        <div class="section ${!hasDetails ? 'no-border' : ''}">
          ${paymentMethods.length > 0 || amenities.length > 0 ? `
          <div class="tags-container">
            ${paymentMethods
              .map(method => `<span class="tag bitcoin">${method}</span>`)
              .join("")}
            
            ${amenities
              .map(amenity => `<span class="tag amenity">${amenity}</span>`)
              .join("")}
          </div>
          ` : ''}
          
          ${description && !description.startsWith('Type:') ? `<p>${description}</p>` : ""}
        </div>
        ` : ''}
        
        ${hasDetails ? `
        <div class="section no-border">
          ${openingHours ? `
            <div class="detail-row">
              <span class="detail-label">Hours</span>
              <span class="detail-value">${openingHours}</span>
            </div>` : ""}
            
          ${phone ? `
            <div class="detail-row">
              <span class="detail-label">Phone</span>
              <span class="detail-value"><a href="tel:${formattedPhone}">${phone}</a></span>
            </div>` : ""}
            
          ${website ? `
            <div class="detail-row">
              <span class="detail-label">Website</span>
              <span class="detail-value"><a href="${website}" target="_blank" rel="noopener noreferrer">${website.replace(/^https?:\/\//, '')}</a></span>
            </div>` : ""}
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Source: ${location.source}</p>
          <p>ID: ${location.id}</p>
        </div>
      </div>
    `, {
      maxWidth: 320
    }).openPopup();
  };

  // Helper function to format location type
  const formatLocationType = (type: string): string => {
    // Replace underscores with spaces
    let formatted = type.replace(/_/g, ' ');
    
    // Capitalize each word
    formatted = formatted.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return formatted;
  };

  return null;
}

// Get icon based on location type (simplified for coordinates)
function getIconByType(type: string) {
  return bitcoinIcon; // Always return the same icon
}

// Get icon based on payment methods (for detailed view)
function getIconByPaymentMethods(tags: Record<string, string>) {
  return bitcoinIcon; // Always return the same icon
}

// Location Button Component
function LocationButton() {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  
  // Add useEffect to call addCustomStyles
  useEffect(() => {
    addCustomStyles();
  }, []);

  const handleGetLocation = () => {
    setLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Fly to user location without adding a marker
          map.flyTo([latitude, longitude], 12, {
            animate: true,
            duration: 4.0,
            easeLinearity: 0.1
          });
          
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          
          // Show error message based on error code
          let errorMessage = "Failed to get your location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied. Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }
          
          // Create a popup with the error message
          L.popup()
            .setLatLng(map.getCenter())
            .setContent(`<div style="color: #ff5555; font-weight: bold;">${errorMessage}</div>`)
            .openOn(map);
          
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Browser doesn't support geolocation
      L.popup()
        .setLatLng(map.getCenter())
        .setContent("<div style='color: #ff5555; font-weight: bold;'>Geolocation is not supported by your browser.</div>")
        .openOn(map);
      
      setLoading(false);
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: "10px" }}>
      <div className="leaflet-control">
        <button
          onClick={handleGetLocation}
          disabled={loading}
          title={loading ? "Locating..." : "Zoom to my location"}
          aria-label={loading ? "Locating..." : "Zoom to my location"}
          className="location-button"
          style={{
            width: "50px",
            height: "50px",
            backgroundColor: "#282a36",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 15px rgba(0,0,0,0.25)",
            color: loading ? "#6272a4" : "#f8f8f2",
          }}
        >
          {loading ? (
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{
                animation: "spin 1.5s linear infinite",
                transformOrigin: "center"
              }}
            >
              <style>
                {`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#f8f8f2" opacity="0.3"/>
              <path d="M12 2V4C16.41 4 20 7.59 20 12H22C22 6.48 17.52 2 12 2Z" fill="#f8f8f2"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// Add custom CSS for the location button
const addCustomStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('map-custom-styles')) {
    const style = document.createElement('style');
    style.id = 'map-custom-styles';
    style.innerHTML = `
      /* Cluster styles */
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
      
      /* Popup styles */
      .leaflet-popup {
        z-index: 1000 !important;
      }
      
      .leaflet-popup-content-wrapper {
        background-color: #1e1e2e;
        color: #f8f8f2;
        border-radius: 8px;
        box-shadow: 0 3px 14px rgba(0, 0, 0, 0.4);
      }
      
      .leaflet-popup-tip {
        background-color: #1e1e2e;
      }
      
      .leaflet-popup-content {
        margin: 0;
        min-width: 280px;
        max-width: 320px;
      }
      
      .popup-content {
        padding: 16px;
      }
      
      .popup-content h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: bold;
        color: #f8f8f2;
      }
      
      .popup-content p {
        margin: 0 0 8px 0;
        font-size: 13px;
        line-height: 1.4;
        color: rgba(248, 248, 242, 0.8);
      }
      
      .popup-content .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }
      
      .popup-content .tag {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
      }
      
      .popup-content .tag.bitcoin {
        background-color: rgba(247, 147, 26, 0.2);
        color: #F7931A;
      }
      
      .popup-content .tag.lightning {
        background-color: rgba(121, 46, 229, 0.2);
        color: #792EE5;
      }
      
      .popup-content .tag.amenity {
        background-color: rgba(248, 248, 242, 0.1);
        color: rgba(248, 248, 242, 0.8);
      }
      
      .popup-content .tag.type {
        background-color: rgba(73, 80, 87, 0.2);
        color: #e9ecef;
        margin-top: 4px;
        display: inline-block;
      }
      
      .popup-content .section {
        margin-bottom: 12px;
        padding-bottom: 12px;
      }
      
      .popup-content .section:not(:last-child) {
        border-bottom: 1px solid rgba(248, 248, 242, 0.1);
      }
      
      .popup-content .detail-row {
        display: flex;
        margin-bottom: 8px;
        align-items: flex-start;
      }
      
      .popup-content .detail-label {
        font-weight: 600;
        margin-right: 8px;
        min-width: 70px;
        color: #f8f8f2;
        background-color: rgba(248, 248, 242, 0.1);
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
      }
      
      .popup-content .detail-value {
        flex: 1;
        word-break: break-word;
        font-size: 13px;
        color: rgba(248, 248, 242, 0.9);
      }
      
      .popup-content a {
        color: #00B1EA;
        text-decoration: none;
        transition: all 0.2s ease;
        word-break: break-all;
        display: inline-block;
      }
      
      .popup-content a:hover {
        color: #4CC9F0;
        text-decoration: underline;
      }
      
      .popup-content .footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(248, 248, 242, 0.1);
        font-size: 11px;
        color: rgba(248, 248, 242, 0.5);
      }
      
      .popup-content .section.no-border {
        border-bottom: none;
      }
      
      /* Location button styles */
      .location-button:hover {
        background-color: #44475a !important;
      }
    `;
    document.head.appendChild(style);
  }
};

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
        <LocationButton />
      </MapContainer>
    </div>
  );
}
