const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { Search, Gavel, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/** Admin moderation: dock points, release a member's seats, delete rude comments. */
export default function Moderation({ adminEmail }) {
  const [email, setEmail] = useState('');
  const [match, setMatch] = useState(null);
  const [seats, setSeats] = useState([]);
  const [searched, setSearched] = useState(false);
  const [penalty, setPenalty] = useState('250');
  const [reason, setReason] = useState('Rude or abusive comments');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [comments, setComments] = useState([]);

  const loadComments = async () => {
    const page = await db.entities.Comment.list({ sort: '-created_date', limit: 15 });
    setComments(page.items || []);
  };

  useEffect(() => {
    loadComments();
  }, []);

  const loadSeats = async (userId) => {
    const page = await db.entities.Seat.filter(
      { owner_id: userId },
      { sort: '-acquired_at', limit: 20 }
    );
    setSeats(page.items || []);
  };

  const search = async () => {
    setBusy(true);
    setStatus(null);
    const all = await db.entities.User.list('-created_date', 500);
    const list = Array.isArray(all) ? all : all?.items || [];
    const found = list.find(
      (u) => String(u.email || '').toLowerCase() === email.trim().toLowerCase()
    );
    setMatch(found || null);
    setSearched(true);
    if (found) await loadSeats(found.id);
    else setSeats([]);
    setBusy(false);
  };

  const dockPoints = async () => {
    if (!match) return;
    setBusy(true);
    setStatus(null);
    try {
      const amount = Math.max(0, Math.min(Number(penalty) || 0, Number(match.country_points || 0)));
      const next = Number(match.country_points || 0) - amount;
      await db.entities.User.update(match.id, { country_points: next });
      await db.entities.AuditLog.create({
        actor_email: adminEmail,
        action: 'moderation_penalty',
        target_type: 'user',
        target_id: match.id,
        meta: { email: match.email, points_removed: amount, reason },
      });
      setMatch({ ...match, country_points: next });
      setStatus(`${amount.toLocaleString()} pts removed from ${match.email}.`);
    } catch {
      setStatus('Could not apply that penalty.');
    }
    setBusy(false);
  };

  const releaseSeat = async (seat) => {
    setBusy(true);
    setStatus(null);
    try {
      await db.entities.Seat.delete(seat.id);
      await db.entities.AuditLog.create({
        actor_email: adminEmail,
        action: 'moderation_remove',
        target_type: 'seat',
        target_id: seat.id,
        meta: { email: match?.email, territory_id: seat.territory_id, slot: seat.slot, reason },
      });
      await loadSeats(seat.owner_id);
      setStatus('Seat released.');
    } catch {
      setStatus('Could not release that seat.');
    }
    setBusy(false);
  };

  const removeComment = async (comment) => {
    setStatus(null);
    try {
      await db.entities.Comment.delete(comment.id);
      await db.entities.AuditLog.create({
        actor_email: adminEmail,
        action: 'moderation_remove',
        target_type: 'comment',
        target_id: comment.id,
        meta: {
          email: comment.author_email,
          territory_id: comment.territory_id,
          reason: 'Comment removed by admin',
        },
      });
      await loadComments();
      setStatus('Comment removed.');
    } catch {
      setStatus('Could not remove that comment.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="max-w-lg space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5 block">
            Find member by email
          </label>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="input-base flex-1"
            />
            <button
              onClick={search}
              disabled={busy || !email.trim()}
              className="px-3 rounded-md bg-secondary border border-border hover:border-primary/40 disabled:opacity-40"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {searched && !match && (
          <p className="text-xs text-muted-foreground">No account matches that email.</p>
        )}

        {match && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">
                  {match.display_name || match.full_name || match.email}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {match.email}
                </p>
              </div>
              <div className="text-right text-[10px] font-mono text-muted-foreground shrink-0">
                <div>{Number(match.country_points || 0).toLocaleString()} pts</div>
                <div>{Number(match.credits || 0).toLocaleString()} credits</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                  Points to remove
                </label>
                <input
                  value={penalty}
                  onChange={(e) => setPenalty(e.target.value)}
                  inputMode="numeric"
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-primary/60"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                  Reason
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary/60"
                />
              </div>
            </div>

            <button
              onClick={dockPoints}
              disabled={busy}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 disabled:opacity-40"
            >
              <Gavel className="w-3.5 h-3.5" />
              Apply penalty
            </button>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Seats held · {seats.length}
              </p>
              {seats.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No seats held.</p>
              )}
              {seats.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1"
                >
                  <span className="text-[10px] font-mono text-muted-foreground truncate">
                    {s.territory_kind} · seat #{s.slot}
                  </span>
                  <button
                    onClick={() => releaseSeat(s)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive shrink-0"
                    title="Release this seat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {status && <p className="text-xs text-primary">{status}</p>}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Latest comments
        </p>
        {comments.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium truncate">
                {c.author_name || c.author_email || 'Member'}
                <span className="text-[9px] font-mono text-muted-foreground ml-1.5">
                  {c.created_date
                    ? formatDistanceToNow(new Date(c.created_date), { addSuffix: true })
                    : ''}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground break-words">{c.body || '(media)'}</p>
            </div>
            <button
              onClick={() => removeComment(c)}
              className="p-1 rounded text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}