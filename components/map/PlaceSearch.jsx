const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useRef, useState } from 'react';

import { Search, Loader2, X } from 'lucide-react';
import { KIND_LABEL } from '@/lib/territories';

/** Type-ahead lookup over every mapped place, so a city can be found by name
 *  instead of being hunted for by zooming. */
export default function PlaceSearch({ onPick }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    let alive = true;
    setBusy(true);
    const timer = setTimeout(async () => {
      const page = await db.entities.Territory.filter(
        { name: { $regex: q } },
        { sort: 'name', limit: 10 }
      );
      const places = page.items || [];
      const parentIds = [...new Set(places.map((p) => p.parent_id).filter(Boolean))];
      const parents = {};
      if (parentIds.length) {
        const found = await db.entities.Territory.filter(
          { id: { $in: parentIds } },
          { limit: 30 }
        );
        (found.items || []).forEach((p) => {
          parents[p.id] = p.name;
        });
      }
      if (!alive) return;
      setResults(places.map((p) => ({ place: p, parent: parents[p.parent_id] || null })));
      setBusy(false);
    }, 220);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    const away = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const pick = (place) => {
    onPick(place);
    setTerm('');
    setResults([]);
    setOpen(false);
  };

  const show = open && term.trim().length >= 2;

  return (
    <div ref={box} className="relative w-64 sm:w-80">
      <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-2 shadow-lg focus-within:border-primary/60">
        {busy ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
        ) : (
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && results[0]) pick(results[0].place);
          }}
          placeholder="Search a city or country"
          aria-label="Search for a city or country"
          className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              setResults([]);
            }}
            aria-label="Clear search"
            className="p-0.5 rounded hover:bg-secondary shrink-0"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {show && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-card/95 backdrop-blur-md border border-border rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto">
          {results.length === 0 && !busy && (
            <p className="px-3 py-3 text-[11px] text-muted-foreground">No place matches that.</p>
          )}
          {results.map(({ place, parent }) => (
            <button
              key={place.id}
              onClick={() => pick(place)}
              className="w-full text-left px-3 py-2.5 hover:bg-secondary border-b border-border/60 last:border-0 flex items-center gap-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground truncate">
                  {place.name}
                </span>
                <span className="block text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                  {KIND_LABEL[place.kind] || place.kind}
                  {parent ? ` · ${parent}` : ''}
                </span>
              </span>
              <span className="text-[9px] font-mono text-primary/70 shrink-0">GO</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}