import { useState } from 'react';
import { X, ChevronRight, MapPin, ArrowRight, Loader2, Check, HandCoins } from 'lucide-react';
import { Link } from 'react-router-dom';
import OfferPanel from '@/components/offers/OfferPanel';
import SeatOwners from '@/components/map/SeatOwners';
import SeatGrid from '@/components/map/SeatGrid';
import SellMySeat from '@/components/map/SellMySeat';
import { claimSeat, CLAIM_ERRORS } from '@/lib/claimSeat';
import { KIND_LABEL, capacityOf, priceOf, formatPrice, MAX_LEVEL } from '@/lib/territories';

export default function TerritorySheet({ territory, override, user, onClose, onEnter, onClaimed }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [showOffer, setShowOffer] = useState(false);

  const cap = capacityOf(territory);
  const taken = Number(territory.seats_taken || 0);
  const pct = Math.min(100, Math.round((taken / cap) * 100));
  const price = priceOf(territory, override);
  const full = taken >= cap;

  const handleClaim = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await claimSeat({ territory, user, override });
      if (res.ok) {
        setMessage({ ok: true, text: `Square #${res.slot} is yours.` });
        onClaimed();
      } else {
        setMessage({ ok: false, text: CLAIM_ERRORS[res.error] || res.error });
      }
    } catch {
      setMessage({ ok: false, text: 'Could not reach the seat service.' });
    }
    setBusy(false);
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-card/95 backdrop-blur-md border-l border-border flex flex-col z-[1200]">
      <div className="h-12 shrink-0 border-b border-border flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {KIND_LABEL[territory.kind]}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{territory.name}</h2>
          <p className="text-[11px] font-mono text-muted-foreground">
            {Number(territory.center_lat).toFixed(3)}, {Number(territory.center_lng).toFixed(3)}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Seats</span>
            <span className={`font-mono font-semibold ${full ? 'text-destructive' : 'text-foreground'}`}>
              {taken} / {cap}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${full ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium">
            {full
              ? 'Every square here is taken.'
              : `Do you want to claim a square? ${cap - taken} open.`}
          </p>
          <SeatGrid
            territoryId={territory.id}
            capacity={cap}
            taken={taken}
            onClaim={handleClaim}
            disabled={busy || full}
          />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {full
              ? 'Nothing is left to claim — try another place or offer a price.'
              : 'You do not pick your square — tap any one and the next free square is yours.'}
          </p>
        </div>

        {user && <SellMySeat territoryId={territory.id} user={user} onSold={onClaimed} />}

        <SeatOwners territoryId={territory.id} />

        <div className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Seat price</span>
          <span className={`text-xs font-semibold ${price.free ? 'text-primary' : 'text-amber-400'}`}>
            {formatPrice(price)}
          </span>
        </div>

        <button
          onClick={handleClaim}
          disabled={busy || full}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Claiming...
            </>
          ) : full ? (
            `All ${cap} squares taken`
          ) : price.free ? (
            'Get a free square'
          ) : (
            `Buy a square · ${formatPrice(price)}`
          )}
        </button>

        {message && (
          <p
            className={`text-[11px] leading-relaxed ${
              message.ok ? 'text-primary' : 'text-destructive'
            }`}
          >
            {message.ok && <Check className="w-3 h-3 inline mr-1" />}
            {message.text}
          </p>
        )}

        <button
          onClick={() => setShowOffer((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary/60 border border-border text-xs font-medium hover:border-primary/50"
        >
          <HandCoins className="w-3.5 h-3.5 text-primary" />
          {showOffer ? 'Hide offer' : 'Offer your own price'}
        </button>

        {showOffer && user && <OfferPanel territory={territory} user={user} />}

        <div className="flex flex-col gap-1.5 pt-1">
          {Number(territory.level) < MAX_LEVEL && (
            <button
              onClick={() => onEnter(territory)}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs transition-colors"
            >
              <span>Explore inside</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <Link
            to={`/territory/${territory.id}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs transition-colors"
          >
            <span>Territory page</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}