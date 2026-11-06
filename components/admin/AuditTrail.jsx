const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import { Download } from 'lucide-react';
import { exportEconomyCsv } from '@/lib/exportEconomy';

const ACTION_LABEL = {
  register: 'registered',
  login: 'signed in',
  seat_claim: 'claimed a seat',
  bid_place: 'placed a bid',
  bid_accept: 'accepted a bid',
  trade_settle: 'settled a trade',
  upload: 'uploaded media',
  comment: 'commented',
  flag: 'flagged content',
  price_change: 'price changed',
  territory_inject: 'territory created',
  territory_delete: 'territory deleted',
  admin_grant: 'currency granted',
  backup_export: 'exported a backup',
  backup_import: 'imported a backup',
  location_set: 'set a location',
  moderation_penalty: 'points removed',
  moderation_remove: 'removed content',
  seat_sell: 'sold a seat back',
  seat_revoke: 'had a seat taken back',
  seat_transfer: 'traded a seat',
};

export default function AuditTrail() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    await exportEconomyCsv();
    setExporting(false);
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const page = await db.entities.AuditLog.filter({}, { sort: '-created_date', limit: 100 });
      if (!alive) return;
      setEntries(page.items || []);
      setLoading(false);
    };
    load();
    const unsubscribe = db.entities.AuditLog.subscribe(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-40 grid place-items-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-8 text-center">
        No activity recorded yet. Claims, sign-ins and admin changes appear here as they happen.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Latest activity
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/60 border border-border text-[10px] font-medium hover:border-primary/50 disabled:opacity-50"
          >
            <Download className="w-3 h-3 text-primary" />
            {exporting ? 'Preparing…' : 'Export claims + trades'}
          </button>
          <span className="text-[10px] font-mono text-muted-foreground">{entries.length}</span>
        </div>
      </div>
      {entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-secondary/50">
          <div className="min-w-0">
            <p className="text-xs">
              <span className="text-muted-foreground">{e.actor_email || 'system'}</span>{' '}
              <span className="font-medium">{ACTION_LABEL[e.action] || e.action}</span>
              {e.meta?.territory_name ? (
                <span className="text-primary"> · {e.meta.territory_name}</span>
              ) : null}
              {e.meta?.email ? <span className="text-muted-foreground"> · {e.meta.email}</span> : null}
            </p>
            {e.meta?.slot != null && (
              <p className="text-[10px] text-muted-foreground font-mono">
                seat #{e.meta.slot}
                {e.meta.points > 0 ? ` · ${Number(e.meta.points).toLocaleString()} pts` : ''}
                {e.meta.credits > 0 ? ` · ${Number(e.meta.credits).toLocaleString()} credits` : ''}
              </p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {e.created_date
              ? formatDistanceToNow(new Date(e.created_date), { addSuffix: true })
              : ''}
          </span>
        </div>
      ))}
    </div>
  );
}