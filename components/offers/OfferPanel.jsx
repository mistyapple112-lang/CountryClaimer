const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from 'react';

import { HandCoins, Loader2, Send } from 'lucide-react';

const STATUS = {
  pending: { label: 'Waiting for the admin', tone: 'text-amber-400' },
  accepted: { label: 'Deal accepted', tone: 'text-primary' },
  declined: { label: 'Declined', tone: 'text-destructive' },
};

export default function OfferPanel({ territory, user }) {
  const [offer, setOffer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [points, setPoints] = useState('5');
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadOffer = useCallback(async () => {
    const page = await db.entities.Offer.filter(
      { territory_id: territory.id, buyer_id: user.id },
      { sort: '-created_date', limit: 1 }
    );
    setOffer((page.items || [])[0] || null);
  }, [territory.id, user.id]);

  useEffect(() => {
    loadOffer();
  }, [loadOffer]);

  useEffect(() => {
    if (!offer?.id) {
      setMessages([]);
      return undefined;
    }
    let alive = true;
    const load = async () => {
      const page = await db.entities.OfferMessage.filter(
        { offer_id: offer.id },
        { sort: 'created_date', limit: 100 }
      );
      if (alive) setMessages(page.items || []);
    };
    load();
    const unsubMessage = db.entities.OfferMessage.subscribe((event) => {
      if (event?.data?.offer_id === offer.id) load();
    });
    const unsubOffer = db.entities.Offer.subscribe((event) => {
      if (event?.data?.id === offer.id) setOffer(event.data);
    });
    return () => {
      alive = false;
      unsubMessage();
      unsubOffer();
    };
  }, [offer?.id]);

  const sendOffer = async () => {
    const amount = Number(points);
    if (!amount || amount <= 0) {
      setError('Enter how many points you want to pay.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await db.entities.Offer.create({
        territory_id: territory.id,
        territory_name: territory.name,
        territory_kind: territory.kind,
        buyer_id: user.id,
        buyer_email: user.email,
        points: amount,
        message: note.trim() || undefined,
        status: 'pending',
      });
      if (note.trim()) {
        await db.entities.OfferMessage.create({
          offer_id: created.id,
          buyer_id: user.id,
          author_email: user.email,
          from_admin: false,
          body: note.trim(),
        });
      }
      setNote('');
      setOffer(created);
    } catch {
      setError('Could not send the offer. Try again.');
    }
    setBusy(false);
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !offer?.id) return;
    setBusy(true);
    await db.entities.OfferMessage.create({
      offer_id: offer.id,
      buyer_id: user.id,
      author_email: user.email,
      from_admin: false,
      body,
    });
    setReply('');
    setBusy(false);
  };

  if (!offer) {
    return (
      <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <HandCoins className="w-3.5 h-3.5 text-primary" />
          Offer your own price
        </div>
        <p className="text-[10px] text-muted-foreground">
          Name the points you'll pay per seat. The admin can accept, decline or talk it over.
          You have {Number(user?.country_points || 0).toLocaleString()} pts.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            inputMode="numeric"
            className="input-base w-20 font-mono"
          />
          <span className="text-[10px] text-muted-foreground">points</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional message to the admin"
          className="input-base resize-none"
        />
        <button
          onClick={sendOffer}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary border border-border text-xs font-medium hover:border-primary/50 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send offer
        </button>
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    );
  }

  const status = STATUS[offer.status] || STATUS.pending;

  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Your offer</span>
        <span className={`text-[10px] font-mono ${status.tone}`}>{status.label}</span>
      </div>
      <p className="text-[11px] font-mono text-muted-foreground">
        {Number(offer.points).toLocaleString()} pts
        {offer.status === 'accepted' && offer.final_points != null
          ? ` · charged ${Number(offer.final_points).toLocaleString()} pts`
          : ''}
      </p>

      <div className="max-h-40 overflow-y-auto space-y-1.5">
        {messages.length === 0 && (
          <p className="text-[10px] text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ${
              m.from_admin
                ? 'bg-primary/10 border border-primary/25'
                : 'bg-card border border-border'
            }`}
          >
            <span className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">
              {m.from_admin ? 'Admin' : 'You'}
            </span>
            {m.body}
          </div>
        ))}
      </div>

      {offer.status !== 'accepted' && (
        <div className="flex items-center gap-1.5">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendReply()}
            placeholder="Reply to the admin..."
            className="input-base flex-1"
          />
          <button
            onClick={sendReply}
            disabled={busy}
            className="p-2 rounded-md bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {offer.status === 'declined' && (
        <button
          onClick={() => setOffer(null)}
          className="w-full py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-foreground"
        >
          Make a new offer
        </button>
      )}
    </div>
  );
}