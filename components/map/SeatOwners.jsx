const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

/** Shows who currently holds seats in a territory. */
export default function SeatOwners({ territoryId }) {
  const [seats, setSeats] = useState(null);

  useEffect(() => {
    let alive = true;
    setSeats(null);
    db.entities.Seat.filter(
      { territory_id: territoryId },
      { sort: '-acquired_at', limit: 6 }
    ).then((page) => {
      if (alive) setSeats(page.items || []);
    });
    return () => {
      alive = false;
    };
  }, [territoryId]);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        Claimed by
      </p>

      {seats === null && <div className="h-8 rounded-md bg-secondary/50 animate-pulse" />}

      {seats && seats.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Nobody yet — take the first seat.</p>
      )}

      {seats &&
        seats.map((seat) => (
          <div key={seat.id} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-secondary border border-border grid place-items-center text-[9px] font-mono overflow-hidden shrink-0">
              {seat.owner_avatar_url ? (
                <img src={seat.owner_avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (seat.owner_display_name || '?').slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="text-[11px] truncate flex-1">
              {seat.owner_display_name || 'Member'}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">#{seat.slot}</span>
          </div>
        ))}

      {seats && seats.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Latest {seats.length} holder{seats.length === 1 ? '' : 's'} shown — the territory page
          lists everyone.
        </p>
      )}
    </div>
  );
}