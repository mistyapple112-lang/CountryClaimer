import { useEffect, useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import PriceMatrix from '@/components/admin/PriceMatrix';
import GrantCurrency from '@/components/admin/GrantCurrency';
import AuditTrail from '@/components/admin/AuditTrail';
import MapKey from '@/components/admin/MapKey';
import TerritoryBuilder from '@/components/admin/TerritoryBuilder';
import OfferInbox from '@/components/admin/OfferInbox';
import UserLocations from '@/components/admin/UserLocations';
import Moderation from '@/components/admin/Moderation';
import SeatAdmin from '@/components/admin/SeatAdmin';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'builder', label: 'New Territory' },
  { id: 'offers', label: 'Offers & Chat' },
  { id: 'people', label: 'Locations' },
  { id: 'seats', label: 'Seats & Trades' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'prices', label: 'Price Matrix' },
  { id: 'ledger', label: 'Grant Currency' },
  { id: 'map', label: 'Map Key' },
  { id: 'audit', label: 'Audit Trail' },
];

export default function AdminPanel({ user, onClose, onRefresh }) {
  const [tab, setTab] = useState('ledger');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-4xl h-[85vh] bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-2xl">
        <div className="h-12 shrink-0 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold">Admin Controls</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="h-10 shrink-0 border-b border-border flex items-center gap-1 px-3 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tab === t.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {tab === 'builder' && <TerritoryBuilder adminEmail={user?.email} />}
          {tab === 'offers' && <OfferInbox adminEmail={user?.email} />}
          {tab === 'people' && <UserLocations />}
          {tab === 'seats' && <SeatAdmin admin={user} onChanged={onRefresh} />}
          {tab === 'moderation' && <Moderation adminEmail={user?.email} />}
          {tab === 'prices' && <PriceMatrix adminEmail={user?.email} />}
          {tab === 'ledger' && <GrantCurrency adminEmail={user?.email} onGranted={onRefresh} />}
          {tab === 'map' && <MapKey adminEmail={user?.email} />}
          {tab === 'audit' && <AuditTrail />}
        </div>
      </div>
    </div>
  );
}