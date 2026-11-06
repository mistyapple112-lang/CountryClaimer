const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { Loader2, Check, Plus, Trash2 } from 'lucide-react';
import CoordinatePicker from '@/components/admin/CoordinatePicker';
import { KIND_LABEL, DEFAULT_PRICE } from '@/lib/territories';

const KINDS = ['continent', 'country', 'region', 'city', 'town', 'village', 'spot'];
const LEVEL = { continent: 0, country: 1, region: 2, city: 3, town: 4, village: 5, spot: 5 };

const EMPTY = {
  name: '',
  kind: 'country',
  parent_id: '',
  lat: '',
  lng: '',
  seats: '100',
  credits: '',
  points: '',
};

export default function TerritoryBuilder({ adminEmail }) {
  const [form, setForm] = useState(EMPTY);
  const [all, setAll] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [customs, setCustoms] = useState([]);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    db.entities.Territory.list({ sort: 'name', limit: 500 }).then((page) => {
      setAll(page.items || []);
    });
    db.entities.Territory.filter({ is_custom: true }, { sort: '-created_date', limit: 300 }).then(
      (page) => setCustoms(page.items || [])
    );
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const level = LEVEL[form.kind];
  const parents = all.filter((t) => Number(t.level) === level - 1);
  const fallback = DEFAULT_PRICE[form.kind] || { credits: 0, points: 0 };

  const submit = async (e) => {
    e.preventDefault();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim() || form.lat === '' || form.lng === '' || Number.isNaN(lat) || Number.isNaN(lng)) {
      setMessage({ ok: false, text: 'A name and a point on the map are required.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const created = await db.entities.Territory.create({
        name: form.name.trim(),
        kind: form.kind,
        level,
        parent_id: form.parent_id || undefined,
        center_lat: lat,
        center_lng: lng,
        seat_capacity: Number(form.seats) || 100,
        base_price_credits: form.credits === '' ? fallback.credits : Number(form.credits),
        base_price_points: form.points === '' ? fallback.points : Number(form.points),
        is_custom: true,
        is_active: true,
      });
      await db.entities.AuditLog.create({
        action: 'territory_inject',
        target_type: 'territory',
        target_id: created.id,
        actor_email: adminEmail,
        meta: { name: created.name, kind: created.kind },
      });
      setAll((prev) => [...prev, created]);
      setCustoms((prev) => [created, ...prev]);
      setForm({ ...EMPTY });
      setMessage({ ok: true, text: `${created.name} added to the map as a ${KIND_LABEL[created.kind].toLowerCase()}.` });
    } catch {
      setMessage({ ok: false, text: 'Could not create this territory.' });
    }
    setBusy(false);
  };

  const remove = async (territory) => {
    if (!window.confirm(`Delete ${territory.name}? Its seats are removed too.`)) return;
    setRemovingId(territory.id);
    setMessage(null);
    try {
      await db.entities.Seat.deleteMany({ territory_id: territory.id });
      await db.entities.Territory.delete(territory.id);
      await db.entities.AuditLog.create({
        action: 'territory_delete',
        target_type: 'territory',
        target_id: territory.id,
        actor_email: adminEmail,
        meta: { name: territory.name, kind: territory.kind },
      });
      setCustoms((prev) => prev.filter((t) => t.id !== territory.id));
      setAll((prev) => prev.filter((t) => t.id !== territory.id));
      setMessage({ ok: true, text: `${territory.name} removed from the map.` });
    } catch {
      setMessage({ ok: false, text: 'Could not delete this place.' });
    }
    setRemovingId(null);
  };

  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Inject a new place anywhere on Earth. Countries and continents are paid by default —
        leave the price blank to use the standard rate.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Name</span>
          <input className="input-base" value={form.name} onChange={set('name')} placeholder="Atlantis" />
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Kind</span>
          <select className="input-base" value={form.kind} onChange={set('kind')}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Inside</span>
          <select className="input-base" value={form.parent_id} onChange={set('parent_id')}>
            <option value="">— top level —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Point on the map
          </span>
          <CoordinatePicker
            lat={form.lat}
            lng={form.lng}
            onPick={(lat, lng) => setForm((f) => ({ ...f, lat: String(lat), lng: String(lng) }))}
          />
        </div>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Seats</span>
          <input className="input-base" value={form.seats} onChange={set('seats')} placeholder="100" />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Pts</span>
            <input className="input-base" value={form.points} onChange={set('points')} placeholder={String(fallback.points)} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Credits</span>
            <input className="input-base" value={form.credits} onChange={set('credits')} placeholder={String(fallback.credits)} />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        {busy ? 'Creating...' : 'Create territory'}
      </button>

      {message && (
        <p className={`text-[11px] ${message.ok ? 'text-primary' : 'text-destructive'}`}>
          {message.ok && <Check className="w-3 h-3 inline mr-1" />}
          {message.text}
        </p>
      )}

      <div className="pt-3 mt-1 border-t border-border space-y-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Places added here ({customs.length})
        </span>
        {customs.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Nothing added yet.</p>
        )}
        {customs.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{t.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">
                {KIND_LABEL[t.kind] || t.kind} · {Number(t.center_lat).toFixed(3)},{' '}
                {Number(t.center_lng).toFixed(3)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(t)}
              disabled={removingId === t.id}
              aria-label={`Delete ${t.name}`}
              className="p-1.5 rounded-md border border-border hover:border-destructive/60 disabled:opacity-40"
            >
              {removingId === t.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              )}
            </button>
          </div>
        ))}
      </div>
    </form>
  );
}