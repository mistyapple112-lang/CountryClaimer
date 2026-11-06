const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Check, Crown } from 'lucide-react';

import LivePill from '@/components/LivePill';
import CommentThread from '@/components/territory/CommentThread';
import { useSeatStream } from '@/hooks/useSeatStream';
import { claimSeat, CLAIM_ERRORS } from '@/lib/claimSeat';
import { KIND_LABEL, capacityOf, priceOf, formatPrice } from '@/lib/territories';

export default function TerritoryPage() {
  const { id } = useParams();
  const { user, refreshUser } = useOutletContext();
  const [territory, setTerritory] = useState(null);
  const [seats, setSeats] = useState([]);
  const [override, setOverride] = useState(null);
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const record = await db.entities.Territory.get(id);
      setTerritory(record);
      const [seatPage, pricePage] = await Promise.all([
        db.entities.Seat.filter({ territory_id: id }, { sort: 'slot', limit: 100 }),
        db.entities.PriceOverride.filter({ territory_id: id, active: true }),
      ]);
      setSeats(seatPage.items || []);
      setOverride((pricePage.items || [])[0] || null);
      if (record?.parent_id) {
        const up = await db.entities.Territory.get(record.parent_id).catch(() => null);
        setParent(up || null);
      }
    } catch {
      setMissing(true);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Live seat stream for this territory — new claims appear without a reload.
  const { live } = useSeatStream((event) => {
    const seat = event?.data || {};
    if (event.type === 'delete') {
      const removedId = seat.id || event.id;
      setSeats((prev) => prev.filter((s) => s.id !== removedId));
      return;
    }
    if (seat.territory_id !== id) return;
    setSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id);
      const next = exists
        ? prev.map((s) => (s.id === seat.id ? { ...s, ...seat } : s))
        : [...prev, seat];
      return next.sort((a, b) => Number(a.slot) - Number(b.slot));
    });
  });

  useEffect(() => {
    if (!missing) return;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, [missing]);

  const handleClaim = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await claimSeat({ territory, user, override });
      if (res.ok) {
        setMessage({ ok: true, text: `Seat #${res.slot} claimed.` });
        await load();
        refreshUser();
      } else {
        setMessage({ ok: false, text: CLAIM_ERRORS[res.error] || res.error });
      }
    } catch {
      setMessage({ ok: false, text: 'Could not reach the seat service.' });
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="h-[70vh] grid place-items-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (missing || !territory) {
    return (
      <div className="h-[70vh] grid place-items-center px-4">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Territory not found</p>
          <Link to="/" className="text-xs text-primary hover:underline">
            Back to the map
          </Link>
        </div>
      </div>
    );
  }

  const cap = capacityOf(territory);
  const taken = seats.length;
  const pct = Math.min(100, Math.round((taken / cap) * 100));
  const price = priceOf(territory, override);
  const full = taken >= cap;
  const mine = seats.some((s) => s.owner_id === user?.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Map
        {parent && <span className="text-muted-foreground/60">/ {parent.name}</span>}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary" />
            {KIND_LABEL[territory.kind]}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{territory.name}</h1>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Price</p>
          <p className={`text-sm font-semibold ${price.free ? 'text-primary' : 'text-amber-400'}`}>
            {formatPrice(price)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Seats occupied</span>
          <span className={`font-mono font-semibold ${full ? 'text-destructive' : ''}`}>
            {taken} / {cap}
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${full ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          onClick={handleClaim}
          disabled={busy || full || mine}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? 'Claiming...' : mine ? 'You hold a seat here' : full ? 'All 100 seats taken' : 'Claim a seat'}
        </button>

        {message && (
          <p className={`text-[11px] ${message.ok ? 'text-primary' : 'text-destructive'}`}>
            {message.ok && <Check className="w-3 h-3 inline mr-1" />}
            {message.text}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            Seat holders
          </h2>
          <LivePill live={live} label="Live" />
        </div>
        {seats.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border">
            No seats claimed yet — be the first.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {seats.map((seat) => (
              <div
                key={seat.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-2"
              >
                <span className="w-6 h-6 rounded-full bg-secondary grid place-items-center text-[10px] font-mono shrink-0 overflow-hidden">
                  {seat.owner_avatar_url ? (
                    <img src={seat.owner_avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    seat.slot
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] truncate">
                    {seat.owner_display_name || 'Member'}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-mono">
                    #{seat.slot} · {seat.paid_with}
                  </p>
                </div>
                {seat.owner_id === user?.id && <Crown className="w-3 h-3 text-primary ml-auto shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <CommentThread territory={territory} user={user} />
    </div>
  );
}