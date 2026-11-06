const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, Search, Tag } from 'lucide-react';

import { DEFAULT_PRICE, KIND_LABEL, formatPrice } from '@/lib/territories';

const defaultOf = (t) => {
  const base = DEFAULT_PRICE[t.kind] || { credits: 0, points: 0 };
  return {
    credits: Number(t.base_price_credits ?? base.credits ?? 0),
    points: Number(t.base_price_points ?? base.points ?? 0),
  };
};

export default function PriceMatrix({ adminEmail }) {
  const [territories, setTerritories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    const [page, overrides] = await Promise.all([
      db.entities.Territory.filter({ level: { $lte: 2 } }, { sort: 'name', limit: 300 }),
      db.entities.PriceOverride.filter({ active: true }, { limit: 300 }),
    ]);
    const byTerritory = {};
    (overrides.items || []).forEach((o) => {
      byTerritory[o.territory_id] = o;
    });
    const rows = (page.items || []).map((t) => ({ ...t, override: byTerritory[t.id] }));
    setTerritories(rows);
    setDrafts(
      Object.fromEntries(
        rows.map((t) => {
          const base = defaultOf(t);
          return [
            t.id,
            {
              credits: String(t.override?.credits ?? base.credits),
              points: String(t.override?.points ?? base.points),
            },
          ];
        })
      )
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (territory) => {
    setSavingId(territory.id);
    const draft = drafts[territory.id];
    const payload = {
      territory_id: territory.id,
      credits: Number(draft.credits || 0),
      points: Number(draft.points || 0),
      active: true,
    };

    if (territory.override) {
      await db.entities.PriceOverride.update(territory.override.id, payload);
    } else {
      await db.entities.PriceOverride.create(payload);
    }

    await db.entities.AuditLog.create({
      actor_email: adminEmail,
      action: 'price_change',
      target_type: 'territory',
      target_id: territory.id,
      meta: { territory_name: territory.name, credits: payload.credits, points: payload.points },
    });

    await load();
    setSavingId(null);
  };

  const reset = async (territory) => {
    if (!territory.override) return;
    setSavingId(territory.id);
    await db.entities.PriceOverride.update(territory.override.id, { active: false });
    await db.entities.AuditLog.create({
      actor_email: adminEmail,
      action: 'price_change',
      target_type: 'territory',
      target_id: territory.id,
      meta: { territory_name: territory.name, reset: true },
    });
    await load();
    setSavingId(null);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return territories;
    return territories.filter((t) => t.name?.toLowerCase().includes(q));
  }, [territories, query]);

  const overridden = territories.filter((t) => t.override).length;

  if (loading) {
    return (
      <div className="h-40 grid place-items-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a continent, country or region..."
            className="input-base pl-8"
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
          <Tag className="w-3 h-3" />
          {overridden} overridden
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground px-1">
        A saved value replaces the standard rate for that place only. Reset restores it.
      </p>

      <div className="grid grid-cols-[1fr_76px_76px_66px] gap-2 px-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Territory</span>
        <span>Credits</span>
        <span>Points</span>
        <span />
      </div>

      <div className="space-y-1 max-h-[52vh] overflow-y-auto pr-1">
        {visible.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-[1fr_76px_76px_66px] gap-2 items-center px-2 py-1.5 rounded-md hover:bg-secondary/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs truncate">{t.name}</span>
                <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                  {KIND_LABEL[t.kind]}
                </span>
                {t.override && (
                  <span className="text-[9px] font-mono px-1 rounded bg-primary/15 text-primary shrink-0">
                    custom
                  </span>
                )}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground/70">
                default {formatPrice({ ...defaultOf(t), free: false })}
              </span>
            </div>
            <input
              value={drafts[t.id]?.credits ?? ''}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], credits: e.target.value } }))
              }
              inputMode="numeric"
              className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono w-full outline-none focus:border-primary/60"
            />
            <input
              value={drafts[t.id]?.points ?? ''}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], points: e.target.value } }))
              }
              inputMode="numeric"
              className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono w-full outline-none focus:border-primary/60"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => save(t)}
                disabled={savingId === t.id}
                className="p-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40"
                title="Save custom price"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => reset(t)}
                disabled={!t.override || savingId === t.id}
                className="p-1.5 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-25"
                title="Reset to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-6 text-center">
          {territories.length === 0 ? 'No territories loaded yet.' : 'No territory matches that name.'}
        </p>
      )}
    </div>
  );
}