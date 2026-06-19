import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteInfo, Stop } from '../../types';
import { getStopHexColor, getStopLabel, formatDateTime, formatHours } from '../../utils/formatters';

// Fix Leaflet default icon URLs broken in bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TripMapProps {
  route: RouteInfo;
  stops: Stop[];
}

/** Create a custom DivIcon colored circle for each stop type */
const createStopIcon = (type: string, index: number) => {
  const color = getStopHexColor(type);
  const isEndpoint = type === 'pickup' || type === 'dropoff';
  const size = isEndpoint ? 18 : 14;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:${color};
        border:2px solid rgba(255,255,255,0.8);
        border-radius:50%;
        box-shadow:0 0 8px ${color}88, 0 2px 6px rgba(0,0,0,0.5);
        display:flex;align-items:center;justify-content:center;
        font-size:9px;font-weight:700;color:#fff;
        position:relative;
      ">
        <span style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);
          background:rgba(15,23,42,0.9);color:#fff;padding:1px 4px;border-radius:3px;
          font-size:9px;font-weight:600;white-space:nowrap;border:1px solid rgba(255,255,255,0.15);">
          ${index + 1}
        </span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 10],
  });
};

/** Auto-fit map bounds to the route or stops */
const BoundsAdjuster: React.FC<{ route: RouteInfo; stops: Stop[] }> = ({ route, stops }) => {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [];

    if (route.geometry && route.geometry.length > 0) {
      // ORS returns [lon, lat], but Leaflet needs [lat, lon]
      route.geometry.forEach(([lon, lat]) => points.push([lat, lon]));
    } else {
      stops.forEach((s) => points.push([s.coordinates[0], s.coordinates[1]]));
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, route, stops]);

  return null;
};

const TripMap: React.FC<TripMapProps> = ({ route, stops }) => {
  const hasGeometry = route.geometry && route.geometry.length > 1;
  const defaultCenter: L.LatLngExpression = stops.length > 0
    ? [stops[0].coordinates[0], stops[0].coordinates[1]]
    : [39.5, -98.35]; // Center of USA

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/40" style={{ height: 500 }}>
      <MapContainer
        center={defaultCenter}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={18}
        />

        {/* Route polyline */}
        {hasGeometry && (
          <>
            {/* Glow effect - wider, transparent */}
            <Polyline
              positions={route.geometry.map(([lon, lat]) => [lat, lon])}
              color="#3b82f6"
              weight={6}
              opacity={0.25}
            />
            {/* Main line */}
            <Polyline
              positions={route.geometry.map(([lon, lat]) => [lat, lon])}
              color="#60a5fa"
              weight={3}
              opacity={0.9}
              dashArray=""
            />
          </>
        )}

        {/* Stop markers */}
        {stops.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            position={[stop.coordinates[0], stop.coordinates[1]]}
            icon={createStopIcon(stop.stop_type, index)}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                  <div
                    style={{ background: getStopHexColor(stop.stop_type) }}
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  />
                  <span className="font-semibold text-sm">{getStopLabel(stop.stop_type)}</span>
                  <span className="text-slate-400 text-xs ml-auto">Day {stop.day_number}</span>
                </div>
                <p className="text-slate-200 text-xs font-medium mb-2 leading-snug">{stop.location}</p>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Arrive:</span>
                    <span className="text-slate-200">{formatDateTime(stop.arrival_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Depart:</span>
                    <span className="text-slate-200">{formatDateTime(stop.departure_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-slate-200">{formatHours(stop.duration_hours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mile Marker:</span>
                    <span className="text-slate-200">{stop.miles_from_start.toLocaleString()} mi</span>
                  </div>
                </div>
                {stop.remarks && (
                  <p className="text-slate-400 text-xs mt-2 pt-2 border-t border-slate-600 italic">{stop.remarks}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        <BoundsAdjuster route={route} stops={stops} />
      </MapContainer>
    </div>
  );
};

export default TripMap;
