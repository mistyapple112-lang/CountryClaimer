const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';

import { X, MapPin, Loader2, Check } from 'lucide-react';
import { claimSeat, CLAIM_ERRORS } from '@/lib/claimSeat';

const spotName = (lat, lng) =>
  `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(3)}°${
    lng >= 0 ? 'E' : 'W'
  }`;

export default function SpotSheet({ latlng, user, onClose, onClaimed }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const claim = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const territory = await db.entities.Territory.create({
        name: spotName(latlng.lat, latlng.lng),
        kind: 'spot',
        level: 5,
        center_lat: latlng.lat,
        center_lng: latlng.lng,
        seat_capacity: 100,
        base_price_credits: 0,
        base_price_points: 0,
        is_custom: true,
        is_active: true,
      });
      const res = await claimSeat({ territory, user, override: null });
      if (res.ok) {
        setMessage({ ok: true, text: `Seat #${res.slot} claimed here.` });
        onClaimed(territory);
      } else {
        setMessage({ ok: false, text: CLAIM_ERRORS[res.error] || res.error });
      }
    } catch {
      setMessage({ ok: false, text: 'Could not claim this spot.' });
    }
    setBusy(false);
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-card/95 backdrop-blur-md border-l border-border flex flex-col z-[1200]">
      <div className="h-12 shrink-0 border-b border-border flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            New spot
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold leading-tight">
            {spotName(latlng.lat, latlng.lng)}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Any point on Earth can be opened and held — 100 seats, free to claim.
          </p>
        </div>

        <button
          onClick={claim}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Claiming...
            </>
          ) : (
            'Claim this location'
          )}
        </button>

        {message && (
          <p className={`text-[11px] leading-relaxed ${message.ok ? 'text-primary' : 'text-destructive'}`}>
            {message.ok && <Check className="w-3 h-3 inline mr-1" />}
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}