const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from 'react';

import { MessageSquare } from 'lucide-react';
import CommentComposer from '@/components/territory/CommentComposer';
import CommentItem from '@/components/territory/CommentItem';

export default function CommentThread({ territory, user }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const page = await db.entities.Comment.filter(
      { territory_id: territory.id },
      { sort: '-created_date', limit: 50 }
    );
    setComments(page.items || []);
    setLoading(false);
  }, [territory.id]);

  useEffect(() => {
    load();
    const unsubscribe = db.entities.Comment.subscribe((event) => {
      const row = event?.data;
      if (!row || row.territory_id !== territory.id) return;
      setComments((prev) => {
        if (event.type === 'delete') return prev.filter((c) => c.id !== row.id);
        return prev.some((c) => c.id === row.id)
          ? prev.map((c) => (c.id === row.id ? row : c))
          : [row, ...prev];
      });
    });
    return unsubscribe;
  }, [load, territory.id]);

  const add = (created) => {
    setComments((prev) =>
      prev.some((c) => c.id === created.id) ? prev : [created, ...prev]
    );
  };

  const remove = async (comment) => {
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    await db.entities.Comment.delete(comment.id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Discussion
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground">{comments.length}</span>
      </div>

      {user && <CommentComposer territory={territory} user={user} onPosted={add} />}

      {loading ? (
        <div className="h-24 rounded-xl border border-border bg-card/40 animate-pulse" />
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border">
          Nothing said here yet. Start the thread.
        </p>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}