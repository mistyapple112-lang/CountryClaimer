const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/** The seat squares of a territory. Tapping any free square runs the claim —
 *  the square itself is never chosen, the next free one is handed over. */
export default function SeatGrid({ territoryId, capacity, taken, onClaim, disabled }) {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    let alive = true;
    db.entities.Seat
      .filter({ territory_id: territoryId }, { limit: 100 })
      .then((page) => {
        if (alive) setSlots((page.items || []).map((s) => Number(s.slot)));
      });
    return () => {
      alive = false;
    };
  }, [territoryId, taken]);

  const used = new Set(slots);
  const squares = Array.from({ length: Math.max(1, capacity) }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-10 gap-1 max-h-40 overflow-y-auto p-2 rounded-lg bg-secondary/40 border border-border">
      {squares.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => !disabled && onClaim()}
          disabled={disabled || used.has(n)}
          title={used.has(n) ? 'Taken' : 'Claim this territory'}
          aria-label={used.has(n) ? `Square ${n} taken` : 'Claim a square'}
          className={cn(
            'aspect-square rounded-[3px] transition-colors',
            used.has(n)
              ? 'bg-primary/70 cursor-default'
              : 'bg-secondary border border-border hover:border-primary/60'
          )}
        />
      ))}
    </div>
  );
}