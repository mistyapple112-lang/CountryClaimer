const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { Loader2, Undo2 } from 'lucide-react';
import { refundOf, refundLabel, sellSeat, SELL_RATE } from '@/lib/seatTrade';

/** Shown to a holder: lets them cash a seat back in for 75% of what they paid. */
export default function SellMySeat({ territoryId, user, onSold }) {
  const [seat, setSeat] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!user?.id) return;
    db.entities.Seat.filter({ territory_id: territoryId, owner_id: user.id }).then((rows) => {
      if (alive) setSeat((rows || [])[0] || null);
    });
    return () => {
      alive = false;
    };
  }, [territoryId, user?.id]);

  if (!seat) return null;

  const refund = refundOf(seat);

  const sell = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const paid = await sellSeat({ seat, owner: user });
      setSeat(null);
      setStatus(
        paid.amount > 0
          ? `Sold square #${seat.slot} — ${refundLabel(paid)} returned.`
          : `Square #${seat.slot} released.`
      );
      onSold?.();
    } catch {
      setStatus('Could not sell that square. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Your square</span>
        <span className="font-mono font-semibold">#{seat.slot}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        You paid {Number(seat.price_paid || 0).toLocaleString()} {refund.unit || '—'}. Sell it back
        for {Math.round(SELL_RATE * 100)}% — {refundLabel(refund)}.
      </p>
      <button
        onClick={sell}
        disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-border bg-background text-[11px] font-medium hover:border-primary/50 disabled:opacity-40"
      >
        {busy ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Selling…
          </>
        ) : (
          <>
            <Undo2 className="w-3 h-3 text-primary" />
            Sell my square for {Math.round(SELL_RATE * 100)}%
          </>
        )}
      </button>
      <p className="text-[10px] text-muted-foreground">
        Want a different price? Contact an admin — they can buy it back at a price you agree on.
      </p>
      {status && <p className="text-[11px] text-primary">{status}</p>}
    </div>
  );
}