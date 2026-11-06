const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { KeyRound, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { TILE_PROVIDERS } from '@/lib/mapTiles';

export default function MapKey({ adminEmail }) {
  const [record, setRecord] = useState(null);
  const [provider, setProvider] = useState('osm');
  const [apiKey, setApiKey] = useState('');
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const page = await db.entities.MapSettings.list({ sort: '-updated_date', limit: 1 });
      const found = (page.items || [])[0] || null;
      setRecord(found);
      setProvider(TILE_PROVIDERS.some((p) => p.id === found?.provider) ? found.provider : 'osm');
      setApiKey(found?.api_key || '');
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    const data = {
      provider,
      api_key: apiKey.trim(),
      updated_by: adminEmail,
    };
    const next = record
      ? await db.entities.MapSettings.update(record.id, data)
      : await db.entities.MapSettings.create(data);
    setRecord(next);
    setBusy(false);
    setSaved(true);
  };

  const active = TILE_PROVIDERS.find((p) => p.id === provider);

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Map provider</h3>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        OpenStreetMap works without an API key. Other providers need their own key.
        Save to update the map for everyone.
      </p>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Provider</span>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setSaved(false);
          }}
          className="input-base"
        >
          {TILE_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">API key</span>
        <div className="relative">
          <input
            type={reveal ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setSaved(false);
            }}
            placeholder={active?.needsKey ? 'Paste your key here' : 'Not needed for this provider'}
            disabled={!active?.needsKey}
            className="input-base pr-9 font-mono disabled:opacity-50"
          />
          {active?.needsKey && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary"
            >
              {reveal ? (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !provider}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? 'Saving...' : 'Save provider'}
        </button>
        {saved && (
          <span className="text-[11px] text-primary inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved — the map updated
          </span>
        )}
      </div>

      {record?.updated_by && (
        <p className="text-[10px] font-mono text-muted-foreground">
          Last saved by {record.updated_by}
        </p>
      )}
    </div>
  );
}