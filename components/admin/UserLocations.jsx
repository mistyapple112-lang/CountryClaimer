const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { MapPin, ExternalLink, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/** Admin view: where every member says they are playing from. */
export default function UserLocations() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlyLocated, setOnlyLocated] = useState(true);

  const load = async () => {
    setLoading(true);
    const all = await db.entities.User.list('-created_date', 300);
    const list = Array.isArray(all) ? all : all?.items || [];
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const located = users.filter((u) => u.home_label || u.home_lat != null);
  const rows = onlyLocated ? located : users;

  if (loading) {
    return (
      <div className="h-40 grid place-items-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground">{located.length}</span> of{' '}
          <span className="font-mono text-foreground">{users.length}</span> members shared a
          location
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOnlyLocated((v) => !v)}
            className="px-2.5 py-1 rounded-md bg-secondary border border-border text-[11px] hover:border-primary/50"
          >
            {onlyLocated ? 'Show everyone' : 'Only located'}
          </button>
          <button
            onClick={load}
            className="p-1.5 rounded-md bg-secondary border border-border hover:border-primary/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-8 text-center">
          No member has shared a location yet.
        </p>
      )}

      <div className="space-y-1">
        {rows.map((u) => {
          const hasCoords = u.home_lat != null && u.home_lng != null;
          return (
            <div
              key={u.id}
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {u.display_name || u.full_name || u.email}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground shrink-0">
                  {u.role}
                </span>
              </div>

              {u.home_label ? (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  <p className="text-[11px] truncate flex-1">{u.home_label}</p>
                  {hasCoords && (
                    <a
                      href={`https://www.google.com/maps?q=${u.home_lat},${u.home_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-primary inline-flex items-center gap-1 shrink-0"
                    >
                      map
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No location shared</p>
              )}

              <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
                {hasCoords && (
                  <span>
                    {Number(u.home_lat).toFixed(3)}, {Number(u.home_lng).toFixed(3)}
                  </span>
                )}
                {u.location_updated_at && (
                  <span>
                    · updated {formatDistanceToNow(new Date(u.location_updated_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}