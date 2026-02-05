'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: 'primary' | 'backup' | 'emergency' | 'default';
}

interface MapViewProps {
  locations: MapLocation[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onLocationClick?: (id: string) => void;
  geofenceRadius?: number;
  highlightId?: string;
}

const MARKER_COLORS: Record<string, string> = {
  primary: '#2563eb',
  backup: '#f59e0b',
  emergency: '#ef4444',
  default: '#6b7280',
};

export default function MapView({
  locations,
  center,
  zoom = 7,
  height = '400px',
  onLocationClick,
  geofenceRadius,
  highlightId,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const defaultCenter: [number, number] = center || [40.4, -74.5];
    const map = L.map(mapRef.current).setView(defaultCenter, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Add markers
    locations.forEach((loc) => {
      const color = MARKER_COLORS[loc.type || 'default'];
      const isHighlighted = loc.id === highlightId;
      const radius = isHighlighted ? 12 : 8;

      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: color,
        color: isHighlighted ? '#000' : color,
        weight: isHighlighted ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(map);

      marker.bindTooltip(loc.name, { permanent: isHighlighted, direction: 'top' });

      if (onLocationClick) {
        marker.on('click', () => onLocationClick(loc.id));
      }

      // Add geofence circle for highlighted location
      if (isHighlighted && geofenceRadius) {
        L.circle([loc.lat, loc.lng], {
          radius: geofenceRadius,
          fillColor: color,
          fillOpacity: 0.1,
          color,
          weight: 1,
          dashArray: '5, 5',
        }).addTo(map);
      }
    });

    // Fit bounds if multiple locations
    if (locations.length > 1) {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 12);
    }
  }, [locations, highlightId, geofenceRadius, onLocationClick]);

  return <div ref={mapRef} style={{ height, width: '100%' }} className="rounded-lg border border-gray-200" />;
}
