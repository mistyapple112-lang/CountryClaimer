const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { Check, Loader2, Send, X } from 'lucide-react';
import { acceptOffer, OFFER_ERRORS } from '@/lib/acceptOffer';
import { formatDistanceToNow } from 'date-fns';

const STATUS_TONE = {
  pending: 'text-amber-400',
  accepted: 'text-primary',
  declined: 'text-destructive',
};

export default function OfferInbox({ adminEmail }) {
  const [offers, setOffers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [finalPoints, setFinalPoints] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = async () => {
    const page = await db.entities.Offer.filter({}, { sort: '-created_date', limit: 100 });
    const rows = page.items || [];
    setOffers(rows);
    setSelectedId((id) => id || rows.find((o) => o.status === 'pending')?.id || rows[0]?.id || null);
  };

  useEffect(() => {
    load();
    return db.entities.Offer.subscribe(load);
  }, []);

  const selected = offers.find((o) => o.id === selectedId) || null;

  useEffect(() => {
    if (!selected) {
      setFinalPoints('');
      return undefined;
    }
    setFinalPoints(String(selected.final_points ?? selected.points ?? 0));
    let alive = true;
    const loadMessages = async () => {
      const page = await db.entities.OfferMessage.filter(
        { offer_id: selected.id },
        { sort: 'created_date', limit: 100 }
      );
      if (alive) setMessages(page.items || []);
    };
    loadMessages();
    const unsub = db.entities.OfferMessage.subscribe((event) => {
      if (event?.data?.offer_id === selected.id) loadMessages();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [selected?.id]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !selected) return;
    setBusy(true);
    await db.entities.OfferMessage.create({
      offer_id: selected.id,
      buyer_id: selected.buyer_id,
      author_email: adminEmail,
      from_admin: true,
      body,
    });
    setReply('');
    setBusy(false);
  };

  const accept = async () => {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    const res = await acceptOffer({ offer: selected, finalPoints, adminEmail });
    if (res.ok) {
      setNotice({ ok: true, text: `Seat #${res.slot} granted, ${res.charged.toLocaleString()} pts charged.` });
      await load();
    } else {
      setNotice({ ok: false, text: OFFER_ERRORS[res.error] || res.error });
    }
    setBusy(false);
  };

  const decline = async () => {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    await db.entities.Offer.update(selected.id, { status: 'declined' });
    await db.entities.OfferMessage.create({
      offer_id: selected.id,
      buyer_id: selected.buyer_id,
      author_email: adminEmail,
      from_admin: true,
      body: 'This offer was declined.',
    });
    await load();
    setBusy(false);
  };

  const pending = offers.filter((o) => o.status === 'pending');
  const others = offers.filter((o) => o.status !== 'pending');
  const ordered = [...pending, ...others];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-3 h-full min-h-0">
      <div className="space-y-1 min-h-0 overflow-y-auto max-h-[52vh] pr-1">
        {ordered.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-6 text-center">No offers yet.</p>
        )}
        {ordered.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelectedId(o.id)}
            className={`w-full text-left px-2 py-1.5 rounded-md transition-colors ${
              o.id === selectedId ? 'bg-secondary' : 'hover:bg-secondary/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs truncate">{o.territory_name || 'Territory'}</span>
              <span className="text-[10px] font-mono text-amber-400 shrink-0">
                {Number(o.points).toLocaleString()}p
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground truncate">{o.buyer_email}</span>
              <span className={`text-[9px] font-mono shrink-0 ${STATUS_TONE[o.status]}`}>
                {o.status}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="min-w-0 space-y-2">
        {!selected ? (
          <p className="text-xs text-muted-foreground px-2 py-6 text-center">Pick an offer.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {selected.territory_name || 'Territory'}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {selected.buyer_email} · {formatDistanceToNow(new Date(selected.created_date), { addSuffix: true })}
                </p>
              </div>
              <span className={`text-[10px] font-mono shrink-0 ${STATUS_TONE[selected.status]}`}>
                {selected.status}
              </span>
            </div>

            {selected.message && (
              <p className="text-[11px] rounded-md bg-secondary/60 px-2 py-1.5">{selected.message}</p>
            )}

            <div className="max-h-[24vh] overflow-y-auto space-y-1.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ${
                    m.from_admin ? 'bg-primary/10 border border-primary/25' : 'bg-card border border-border'
                  }`}
                >
                  <span className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    {m.from_admin ? 'Admin' : 'Buyer'}
                  </span>
                  {m.body}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                placeholder="Reply to the buyer..."
                className="input-base flex-1"
              />
              <button
                onClick={sendReply}
                disabled={busy || !reply.trim()}
                className="p-2 rounded-md bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {selected.status === 'pending' && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  Charge
                  <input
                    value={finalPoints}
                    onChange={(e) => setFinalPoints(e.target.value)}
                    inputMode="numeric"
                    className="input-base w-20 font-mono"
                  />
                  pts
                </label>
                <button
                  onClick={accept}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-40"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Accept & seat
                </button>
                <button
                  onClick={decline}
                  disabled={busy}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-40"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {notice && (
              <p className={`text-[11px] ${notice.ok ? 'text-primary' : 'text-destructive'}`}>
                {notice.text}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}