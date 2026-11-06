import { useEffect, useRef } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { capacityOf } from '@/lib/territories';
import BasemapLayer from '@/components/map/BasemapLayer';

const divIcon = (html, size) =>
  L.divIcon({
    html,
    className: 'cc-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const territoryIcon = (t) => {
  const cap = capacityOf(t);
  const taken = Number(t.seats_taken || 0);
  const full = taken >= cap ? 'is-full' : '';
  return divIcon(`<div class="cc-pin ${full}"><span>${taken}</span></div>`, 40);
};

const escapeText = (value = '') =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const youIcon = (label) =>
  divIcon(
    `<div class="cc-you"><span class="cc-you-dot"></span><span class="cc-you-label">${escapeText(
      (label || 'You').slice(0, 24)
    )}</span></div>`,
    120
  );

const clusterIcon = (c) =>
  divIcon(
    `<div class="cc-cluster"><span>${c.count}</span><small>${c.occupied} seats</small></div>`,
    58
  );

function Focus({ focus }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 1.1 });
  }, [focus, map]);
  return null;
}

/** Frames every child place, so a wide country never hides a city off-screen. */
function FitToMarkers({ fit }) {
  const map = useMap();
  const boundsRef = useRef(fit?.bounds);
  boundsRef.current = fit?.bounds;

  useEffect(() => {
    if (!boundsRef.current) return;
    map.flyToBounds(boundsRef.current, { padding: [48, 48], maxZoom: 10, duration: 1.1 });
  }, [fit?.key, map]);

  return null;
}

function ZoomWatcher({ onZoom }) {
  useMapEvents({
    zoomend: (e) => onZoom(e.target.getZoom()),
  });
  return null;
}

function ClickCatcher({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
}

export default function MapCanvas({
  markers,
  selectedId,
  onSelect,
  onCluster,
  onMapClick,
  focus,
  onZoom,
  tiles,
  you,
  fit,
}) {
  return (
    <MapContainer
      center={[24, 8]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
      className="h-full w-full"
    >
      <BasemapLayer key={tiles?.url} tiles={tiles} />
      <ZoomWatcher onZoom={onZoom} />
      <Focus focus={focus} />
      <FitToMarkers fit={fit} />
      {onMapClick && <ClickCatcher onMapClick={onMapClick} />}

      {you && (
        <Marker
          position={[you.lat, you.lng]}
          icon={youIcon(you.label)}
          zIndexOffset={900}
          interactive={false}
        />
      )}

      {markers.map((m) => {
        if (m.type === 'cluster') {
          return (
            <Marker
              key={`c-${m.lat.toFixed(3)}-${m.lng.toFixed(3)}-${m.count}`}
              position={[m.lat, m.lng]}
              icon={clusterIcon(m)}
              eventHandlers={{ click: () => onCluster(m) }}
            />
          );
        }
        const t = m.item;
        return (
          <Marker
            key={t.id}
            position={[Number(t.center_lat), Number(t.center_lng)]}
            icon={territoryIcon(t)}
            zIndexOffset={t.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(t) }}
          />
        );
      })}
    </MapContainer>
  );
}