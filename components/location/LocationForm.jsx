const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';

import { logActivity } from '@/lib/logActivity';
import { Crosshair, Loader2, Check } from 'lucide-react';

const searchPlace = async (query) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  );
  const rows = await res.json();
  const hit = Array.isArray(rows) ? rows[0] : null;
  if (!hit) return null;
  return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name };
};

const labelForCoords = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data?.display_name || 'My location';
  } catch {
    return 'My location';
  }
};

/** Asks a member where they play from and pins them on the world map. */
export default function LocationForm({ user, onSaved }) {
  const [query, setQuery] = useState(user?.home_label || '');
  const [coords, setCoords] = useState(
    user?.home_lat != null && user?.home_lng != null
      ? { lat: Number(user.home_lat), lng: Number(user.home_lng) }
      : null
  );
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState(null);

  const useCurrentLocation = () => {
    setStatus(null);
    if (!navigator.geolocation) {
      setStatus({ ok: false, text: 'This browser cannot share a location.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        const label = await labelForCoords(next.lat, next.lng);
        setQuery(label);
        setLocating(false);
        setStatus({ ok: true, text: 'Location found — save it to pin it on the map.' });
      },
      () => {
        setLocating(false);
        setStatus({ ok: false, text: 'Location permission was refused.' });
      },
      { enableHighAccuracy: false, timeout: 9000 }
    );
  };

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      let target = coords;
      let label = query.trim();
      if (!target) {
        if (!label) {
          setStatus({ ok: false, text: 'Type a place or use your current location.' });
          setBusy(false);
          return;
        }
        const found = await searchPlace(label);
        if (!found) {
          setStatus({ ok: false, text: 'Could not find that place — try a city name.' });
          setBusy(false);
          return;
        }
        target = { lat: found.lat, lng: found.lng };
        label = found.label;
        setQuery(label);
        setCoords(target);
      }

      await db.auth.updateMe({
        home_label: label || 'My location',
        home_lat: target.lat,
        home_lng: target.lng,
        location_updated_at: new Date().toISOString(),
      });

      logActivity({
        action: 'location_set',
        user,
        targetType: 'user',
        targetId: user?.id,
        meta: { label: label || 'My location', lat: target.lat, lng: target.lng },
      });

      if (onSaved) await onSaved();
      setStatus({ ok: true, text: 'Location saved and pinned on the map.' });
    } catch {
      setStatus({ ok: false, text: 'Could not save your location.' });
    }
    setBusy(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCoords(null);
            setStatus(null);
          }}
          placeholder="City or place, e.g. Manchester"
          className="input-base flex-1"
        />
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          title="Use my current location"
          className="px-2.5 rounded-md bg-secondary border border-border hover:border-primary/50 disabled:opacity-40"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40"
      >
        {busy ? 'Saving...' : 'Save location'}
      </button>

      {status && (
        <p className={`text-[11px] leading-relaxed ${status.ok ? 'text-primary' : 'text-destructive'}`}>
          {status.ok && <Check className="w-3 h-3 inline mr-1" />}
          {status.text}
        </p>
      )}
    </div>
  );
}