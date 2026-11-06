const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { Search, Undo2, ArrowLeftRight, Loader2, Coins } from 'lucide-react';

import {
  refundOf,
  refundLabel,
  takeBackSeat,
  tradeSeat,
  findUserByEmail,
  SELL_RATE,
} from '@/lib/seatTrade';

/** Admin tools for taking seats back from members, buying them back at a custom
 *  price, and moving a claim over to another member. */
export default function SeatAdmin({ admin, onChanged }) {
  const [email, setEmail] = useState('');
  const [owner, setOwner] = useState(null);
  const [seats, setSeats] = useState(null);
  const [names, setNames] = useState({});
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(null);
  const [custom, setCustom] = useState(null);
  const [trade, setTrade] = useState(null);

  const loadSeats = async (person) => {
    const page = await db.entities.Seat.filter(
      { owner_id: person.id },
      { sort: '-acquired_at', limit: 100 }
    );
    const items = page.items || [];
    setSeats(items);
    if (items.length) {
      const ids = [...new Set(items.map((s) => s.territory_id))];
      const tp = await db.entities.Territory.filter({ id: { $in: ids } }, { limit: 100 });
      const map = {};
      (tp.items || []).forEach((t) => {
        map[t.id] = t;
      });
      setNames(map);
    }
  };

  const search = async () => {
    setStatus(null);
    setSearched(true);
    setSeats(null);
    setOwner(null);
    const found = await findUserByEmail(email);
    setOwner(found);
    if (found) await loadSeats(found);
  };

  const refresh = async () => {
    if (!owner) return;
    const fresh = await findUserByEmail(owner.email);
    if (fresh) {
      setOwner(fresh);
      await loadSeats(fresh);
    }
    onChanged?.();
  };

  const takeBack = async (seat, refund) => {
    setBusyId(seat.id);
    setStatus(null);
    try {
      await takeBackSeat({ seat, owner, admin, refund });
      const place = names[seat.territory_id]?.name || 'territory';
      setStatus(
        `Took back square #${seat.slot} in ${place}${
          refund.amount > 0 ? ` and paid back ${refundLabel(refund)}` : ' with no refund'
        }.`
      );
      setCustom(null);
      await refresh();
    } catch {
      setStatus('Could not take that seat back.');
    }
    setBusyId(null);
  };

  const give = async (seat) => {
    setBusyId(seat.id);
    setStatus(null);
    const to = await findUserByEmail(trade?.email);
    if (!to) {
      setStatus('No member matches that email.');
      setBusyId(null);
      return;
    }
    if (to.id === owner.id) {
      setStatus('That member already holds this seat.');
      setBusyId(null);
      return;
    }
    try {
      await tradeSeat({ seat, toUser: to, admin });
      setStatus(`Traded square #${seat.slot} to ${to.email}.`);
      setTrade(null);
      await refresh();
    } catch {
      setStatus('Could not trade that seat.');
    }
    setBusyId(null);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5 block">
          Find a member's seats by email
        </label>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-primary/60"
          />
          <button
            onClick={search}
            disabled={!email.trim()}
            className="px-3 rounded-md bg-secondary border border-border hover:border-primary/40 disabled:opacity-40"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {searched && !owner && (
        <p className="text-xs text-muted-foreground">No account matches that email.</p>
      )}

      {owner && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">
              {owner.display_name || owner.full_name || owner.email}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground truncate">{owner.email}</p>
          </div>
          <div className="text-right text-[10px] font-mono text-muted-foreground shrink-0">
            <div>{Number(owner.country_points || 0).toLocaleString()} pts</div>
            <div>{Number(owner.credits || 0).toLocaleString()} credits</div>
          </div>
        </div>
      )}

      {owner && seats && seats.length === 0 && (
        <p className="text-xs text-muted-foreground">This member holds no seats.</p>
      )}

      {owner &&
        seats &&
        seats.map((seat) => {
          const standard = refundOf(seat);
          const busy = busyId === seat.id;
          return (
            <div key={seat.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {names[seat.territory_id]?.name || 'Territory'}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    square #{seat.slot} · paid {Number(seat.price_paid || 0).toLocaleString()}{' '}
                    {seat.paid_with || 'free'}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-primary shrink-0">
                  {Math.round(SELL_RATE * 100)}% = {refundLabel(standard)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => takeBack(seat, { points: 0, credits: 0 })}
                  disabled={busy}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary border border-border text-[10px] font-medium hover:border-destructive/60 disabled:opacity-40"
                >
                  <Undo2 className="w-3 h-3 text-destructive" />
                  Take back
                </button>
                <button
                  onClick={() => takeBack(seat, standard)}
                  disabled={busy}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary border border-border text-[10px] font-medium hover:border-primary/60 disabled:opacity-40"
                >
                  <Coins className="w-3 h-3 text-primary" />
                  Buy back {Math.round(SELL_RATE * 100)}%
                </button>
                <button
                  onClick={() =>
                    setCustom(
                      custom?.seatId === seat.id
                        ? null
                        : { seatId: seat.id, points: String(standard.points), credits: String(standard.credits) }
                    )
                  }
                  className="px-2 py-1 rounded-md bg-secondary border border-border text-[10px] font-medium hover:border-primary/60"
                >
                  Custom price
                </button>
                <button
                  onClick={() => setTrade(trade?.seatId === seat.id ? null : { seatId: seat.id, email: '' })}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary border border-border text-[10px] font-medium hover:border-primary/60"
                >
                  <ArrowLeftRight className="w-3 h-3 text-primary" />
                  Trade
                </button>
                {busy && <Loader2 className="w-3 h-3 animate-spin text-primary self-center" />}
              </div>

              {custom?.seatId === seat.id && (
                <div className="flex items-end gap-1.5 pt-1">
                  <div className="flex-1">
                    <label className="text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Points
                    </label>
                    <input
                      value={custom.points}
                      onChange={(e) => setCustom({ ...custom, points: e.target.value })}
                      inputMode="numeric"
                      className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] font-mono outline-none focus:border-primary/60"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Credits
                    </label>
                    <input
                      value={custom.credits}
                      onChange={(e) => setCustom({ ...custom, credits: e.target.value })}
                      inputMode="numeric"
                      className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] font-mono outline-none focus:border-primary/60"
                    />
                  </div>
                  <button
                    onClick={() =>
                      takeBack(seat, {
                        points: Number(custom.points || 0),
                        credits: Number(custom.credits || 0),
                      })
                    }
                    disabled={busy}
                    className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 disabled:opacity-40"
                  >
                    Pay &amp; take back
                  </button>
                </div>
              )}

              {trade?.seatId === seat.id && (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    value={trade.email}
                    onChange={(e) => setTrade({ ...trade, email: e.target.value })}
                    placeholder="new owner email"
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-[11px] outline-none focus:border-primary/60"
                  />
                  <button
                    onClick={() => give(seat)}
                    disabled={busy || !trade.email.trim()}
                    className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 disabled:opacity-40"
                  >
                    Trade
                  </button>
                </div>
              )}
            </div>
          );
        })}

      {status && <p className="text-xs text-primary">{status}</p>}
    </div>
  );
}