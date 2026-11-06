import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BasemapLayer from '@/components/map/BasemapLayer';
import { DEFAULT_TILES } from '@/lib/mapTiles';

const pinIcon = L.divIcon({
  html: '<div class="cc-pin"><span>+</span></div>',
  className: 'cc-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function ClickToPlace({ onPick }) {
  useMapEvents({
    click: (e) => onPick(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))),
  });
  return null;
}

/** Click the map to choose a place's point — no coordinates to type. */
export default function CoordinatePicker({ lat, lng, onPick }) {
  const hasPoint =
    lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));

  return (
    <div className="relative h-48 rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={hasPoint ? [Number(lat), Number(lng)] : [24, 8]}
        zoom={hasPoint ? 6 : 2}
        minZoom={2}
        worldCopyJump
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <BasemapLayer tiles={DEFAULT_TILES} />
        <ClickToPlace onPick={onPick} />
        {hasPoint && (
          <Marker position={[Number(lat), Number(lng)]} icon={pinIcon} interactive={false} />
        )}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-2 py-1 bg-background/85 border-t border-border text-[10px] text-center font-mono text-muted-foreground">
        {hasPoint
          ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
          : 'Click the map to place the point'}
      </div>
    </div>
  );
}