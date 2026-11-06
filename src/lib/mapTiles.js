export const TILE_PROVIDERS = [
  {
    id: 'osm',
    label: 'OpenStreetMap (no key needed)',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    needsKey: false,
  },
  {
    id: 'carto',
    label: 'CARTO Dark (API key required)',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>',
    needsKey: true,
  },
  {
    id: 'maptiler',
    label: 'MapTiler',
    attribution: '&copy; MapTiler &copy; OpenStreetMap',
    needsKey: true,
  },
  {
    id: 'mapbox',
    label: 'Mapbox',
    attribution: '&copy; Mapbox &copy; OpenStreetMap',
    needsKey: true,
    tileSize: 512,
    zoomOffset: -1,
  },
  {
    id: 'stadia',
    label: 'Stadia Maps',
    attribution: '&copy; Stadia Maps &copy; OpenStreetMap',
    needsKey: true,
  },
];

export const DEFAULT_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: TILE_PROVIDERS[0].attribution,
};

/** Tile layer config for the provider + key saved by an admin. */
export function tileLayerFor(settings) {
  // Missing provider keys use OSM, never CARTO's key-warning tiles.
  const provider = TILE_PROVIDERS.find((p) => p.id === settings?.provider) || TILE_PROVIDERS[0];
  const key = (settings?.api_key || '').trim();
  if (!provider.needsKey || !key) return DEFAULT_TILES;
  // Mapbox accepts public pk. tokens, not keys issued by another provider.
  if (provider.id === 'mapbox' && !key.startsWith('pk.')) return DEFAULT_TILES;

  const base = { attribution: provider.attribution };

  if (provider.id === 'carto') {
    return {
      ...base,
      url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
    };
  }
  if (provider.id === 'maptiler') {
    return { ...base, url: `https://api.maptiler.com/maps/darkmatter/{z}/{x}/{y}.png?key=${key}` };
  }
  if (provider.id === 'mapbox') {
    return {
      ...base,
      url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${key}`,
      tileSize: provider.tileSize,
      zoomOffset: provider.zoomOffset,
    };
  }
  return {
    ...base,
    url: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${key}`,
  };
}