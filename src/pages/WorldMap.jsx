const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import MapCanvas from '@/components/map/MapCanvas';
import Breadcrumbs from '@/components/map/Breadcrumbs';
import TerritorySheet from '@/components/map/TerritorySheet';
import PlaceSearch from '@/components/map/PlaceSearch';
import SpotSheet from '@/components/map/SpotSheet';
import LivePill from '@/components/LivePill';
import { Crosshair } from 'lucide-react';
import { useSeatStream } from '@/hooks/useSeatStream';
import { clusterTerritories } from '@/lib/cluster';
import { tileLayerFor } from '@/lib/mapTiles';
import { MAX_LEVEL } from '@/lib/territories';

const WORLD = { lat: 24, lng: 8, zoom: 2 };

const ZOOM_BY_KIND = {
  continent: 3,
  country: 5,
  region: 6,
  city: 9,
  town: 10,
  village: 10,
  spot: 11,
};

export default function WorldMap() {
  const { user, refreshUser } = useOutletContext();
  const [path, setPath] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [occupancy, setOccupancy] = useState({});
  const [overrides, setOverrides] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(2);
  const [focus, setFocus] = useState(WORLD);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mapSettings, setMapSettings] = useState(null);
  const [fit, setFit] = useState(null);
  const fittedParent = useRef(null);
  const [spots, setSpots] = useState([]);
  const [pin, setPin] = useState(null);

  const parent = path[path.length - 1] || null;
  const level = parent ? Number(parent.level) + 1 : 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const query = parent ? { parent_id: parent.id } : { level: 0 };
      const page = await db.entities.Territory.filter(query, { sort: 'name', limit: 300 });
      if (!alive) return;
      setTerritories(page.items || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [parent?.id, level]);

  // Frame every place inside the territory we just opened, so a city on the far
  // edge of a wide country (Moscow in Russia) is never left off-screen.
  useEffect(() => {
    if (!parent) {
      fittedParent.current = null;
      return;
    }
    if (!territories.length || fittedParent.current === parent.id) return;
    const lats = territories.map((t) => Number(t.center_lat));
    const lngs = territories.map((t) => Number(t.center_lng));
    fittedParent.current = parent.id;
    setFit({
      key: parent.id,
      bounds: [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
    });
  }, [territories, parent?.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [seats, pricePage, spotPage] = await Promise.all([
        db.entities.Seat.aggregate({ groupBy: 'territory_id' }),
        db.entities.PriceOverride.filter({ active: true }, { limit: 300 }),
        db.entities.Territory.filter({ is_custom: true, kind: 'spot' }, { sort: '-created_date', limit: 300 }),
      ]);
      if (!alive) return;
      setSpots(spotPage.items || []);
      const seatMap = {};
      (seats?.rows || []).forEach((r) => {
        seatMap[r.territory_id] = Number(r.count || 0);
      });
      const priceMap = {};
      (pricePage.items || []).forEach((o) => {
        priceMap[o.territory_id] = o;
      });
      setOccupancy(seatMap);
      setOverrides(priceMap);
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  // Territories injected by an admin drop onto the map live.
  useEffect(() => {
    const pid = parent?.id || null;
    return db.entities.Territory.subscribe((event) => {
      const t = event?.data;
      if (!t) return;
      const belongs = pid ? t.parent_id === pid : Number(t.level) === 0;
      if (!belongs) return;
      setTerritories((prev) => {
        if (event.type === 'delete') return prev.filter((x) => x.id !== t.id);
        return prev.some((x) => x.id === t.id)
          ? prev.map((x) => (x.id === t.id ? t : x))
          : [...prev, t];
      });
    });
  }, [parent?.id]);

  // Live occupancy: each seat event recounts that one territory, so the map can
  // never drift out of sync with a running total of +1 / -1.
  const recountSeq = useRef({});
  const { live } = useSeatStream((event) => {
    const territoryId = event?.data?.territory_id;
    if (!territoryId || event.type === 'update') return;
    const seq = (recountSeq.current[territoryId] = (recountSeq.current[territoryId] || 0) + 1);
    db.entities.Seat.count({ territory_id: territoryId }).then((n) => {
      if (recountSeq.current[territoryId] !== seq) return;
      setOccupancy((prev) => ({ ...prev, [territoryId]: n }));
    });
  });

  // Basemap provider + key saved by an admin; reloads live when it changes.
  useEffect(() => {
    const load = async () => {
      const page = await db.entities.MapSettings.list({ sort: '-updated_date', limit: 1 });
      setMapSettings((page.items || [])[0] || null);
    };
    load();
    return db.entities.MapSettings.subscribe(load);
  }, []);

  const tiles = useMemo(() => tileLayerFor(mapSettings), [mapSettings]);

  const merged = useMemo(
    () =>
      [...territories, ...spots].map((t) => ({ ...t, seats_taken: occupancy[t.id] || 0 })),
    [territories, spots, occupancy]
  );

  const markers = useMemo(() => clusterTerritories(merged, zoom), [merged, zoom]);
  const selected = merged.find((t) => t.id === selectedId) || null;

  const enter = useCallback((territory) => {
    if (Number(territory.level) >= MAX_LEVEL) return;
    setPath((p) => [...p, territory]);
    setSelectedId(null);
    setFocus({
      lat: Number(territory.center_lat),
      lng: Number(territory.center_lng),
      zoom: Math.min(9, Number(territory.level) + 4),
    });
  }, []);

  const jumpTo = useCallback(
    (index) => {
      const next = index < 0 ? [] : path.slice(0, index + 1);
      setPath(next);
      setSelectedId(null);
      const last = next[next.length - 1];
      setFocus(
        last
          ? {
              lat: Number(last.center_lat),
              lng: Number(last.center_lng),
              zoom: Math.min(9, Number(last.level) + 3),
            }
          : WORLD
      );
    },
    [path]
  );

  // A searched place is opened exactly where it sits, with its ancestors loaded
  // into the breadcrumb trail so the sheet's "explore inside" keeps working.
  const handleSearchPick = useCallback(async (place) => {
    const chain = [];
    let cursor = place;
    while (cursor?.parent_id && Number(cursor.level) > 0) {
      const parent = await db.entities.Territory.get(cursor.parent_id);
      if (!parent) break;
      chain.unshift(parent);
      cursor = parent;
    }
    const directParent = chain[chain.length - 1];
    fittedParent.current = directParent?.id || null;
    setPin(null);
    setPath(chain);
    setSelectedId(place.id);
    setFocus({
      lat: Number(place.center_lat),
      lng: Number(place.center_lng),
      zoom: ZOOM_BY_KIND[place.kind] || 8,
    });
  }, []);

  const handleCluster = useCallback((cluster) => {
    setFocus({ lat: cluster.lat, lng: cluster.lng, zoom: Math.min(9, zoom + 2) });
  }, [zoom]);

  // Clicking empty map space opens a claimable spot at that exact point.
  const markerClickAt = useRef(0);
  const handleSelect = useCallback((territory) => {
    markerClickAt.current = Date.now();
    setPin(null);
    setSelectedId(territory.id);
  }, []);

  const handleMapClick = useCallback((latlng) => {
    if (Date.now() - markerClickAt.current < 400) return;
    setSelectedId(null);
    setPin({ lat: latlng.lat, lng: latlng.lng });
  }, []);

  const handleSpotClaimed = useCallback(
    (territory) => {
      setSpots((prev) => (prev.some((s) => s.id === territory.id) ? prev : [territory, ...prev]));
      setPin(null);
      setSelectedId(territory.id);
      setRefreshKey((k) => k + 1);
      refreshUser();
    },
    [refreshUser]
  );

  const handleClaimed = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <MapCanvas
        markers={markers}
        selectedId={selectedId}
        onSelect={handleSelect}
        onCluster={handleCluster}
        onMapClick={handleMapClick}
        focus={focus}
        onZoom={setZoom}
        tiles={tiles}
        fit={fit}
        you={
          user?.home_lat != null && user?.home_lng != null
            ? {
                lat: Number(user.home_lat),
                lng: Number(user.home_lng),
                label: user.home_label || 'You',
              }
            : null
        }
      />

      {/* Sits above Leaflet's own panes (z-index up to 1000) so the search and
          breadcrumbs stay on top of the tiles in every mode. */}
      <div className="absolute top-0 left-0 right-0 z-[1100] p-3 flex flex-col items-start gap-2 pointer-events-none">
        <div className="flex items-start gap-2 w-full">
          <div className="pointer-events-auto">
            <PlaceSearch onPick={handleSearchPick} />
          </div>
          <div className="pointer-events-auto flex items-center gap-2 ml-auto">
            <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground">
              {markers.length} node{markers.length === 1 ? '' : 's'}
            </div>
            <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg px-2 py-1">
              <LivePill live={live} label="Seats" />
            </div>
            {user?.home_lat != null && user?.home_lng != null && (
              <button
                onClick={() =>
                  setFocus({ lat: Number(user.home_lat), lng: Number(user.home_lng), zoom: 8 })
                }
                title="Center on my location"
                aria-label="Center on my location"
                className="bg-card/90 backdrop-blur-md border border-border rounded-lg p-1.5 hover:border-primary/50"
              >
                <Crosshair className="w-3.5 h-3.5 text-primary" />
              </button>
            )}
          </div>
        </div>
        <div className="pointer-events-auto bg-card/90 backdrop-blur-md border border-border rounded-lg px-2 py-1.5 max-w-full overflow-hidden">
          <Breadcrumbs path={path} onJump={jumpTo} />
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
          <div className="w-7 h-7 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!loading && merged.length === 0 && (
        <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
          <div className="bg-card/90 border border-border rounded-xl px-5 py-4 text-center max-w-xs">
            <p className="text-sm font-medium">Nothing mapped here yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Click anywhere on the map to open a spot at that exact location.
            </p>
          </div>
        </div>
      )}

      {pin && (
        <SpotSheet
          latlng={pin}
          user={user}
          onClose={() => setPin(null)}
          onClaimed={handleSpotClaimed}
        />
      )}

      {selected && (
        <TerritorySheet
          territory={selected}
          override={overrides[selected.id]}
          user={user}
          onClose={() => setSelectedId(null)}
          onEnter={enter}
          onClaimed={handleClaimed}
        />
      )}
    </div>
  );
}