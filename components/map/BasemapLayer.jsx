import { useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { DEFAULT_TILES } from '@/lib/mapTiles';

export default function BasemapLayer({ tiles = DEFAULT_TILES }) {
  const [failed, setFailed] = useState(false);
  const active = failed ? DEFAULT_TILES : tiles;

  return (
    <TileLayer
      key={active.url}
      url={active.url}
      subdomains={active.subdomains || 'abc'}
      tileSize={active.tileSize || 256}
      zoomOffset={active.zoomOffset || 0}
      attribution={active.attribution}
      referrerPolicy="strict-origin-when-cross-origin"
      eventHandlers={{
        tileerror: () => {
          if (active.url !== DEFAULT_TILES.url) setFailed(true);
        },
      }}
    />
  );
}