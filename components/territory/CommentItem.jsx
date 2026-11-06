const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';

import { Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CommentItem({ comment, user, onDelete }) {
  const [mediaUrl, setMediaUrl] = useState(null);

  useEffect(() => {
    if (!comment.media_uri) return undefined;
    let alive = true;
    db.integrations.Core.CreateFileSignedUrl({
      file_uri: comment.media_uri,
      expires_in: 3600,
    }).then((res) => {
      if (alive && res?.signed_url) setMediaUrl(res.signed_url);
    });
    return () => {
      alive = false;
    };
  }, [comment.media_uri]);

  const mine = comment.author_id === user?.id;
  const canDelete = mine || user?.role === 'admin';

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-secondary grid place-items-center text-[9px] font-mono overflow-hidden shrink-0">
          {comment.author_avatar_url ? (
            <img src={comment.author_avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (comment.author_name || '?').slice(0, 1).toUpperCase()
          )}
        </span>
        <p className="text-[11px] font-medium truncate">{comment.author_name || 'Member'}</p>
        <p className="text-[9px] font-mono text-muted-foreground">
          {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
        </p>
        {canDelete && (
          <button
            onClick={() => onDelete(comment)}
            className="ml-auto p-1 rounded-md text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {comment.body && (
        <p className="text-[12px] leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>
      )}

      {comment.media_uri && (
        mediaUrl ? (
          comment.media_type === 'video' ? (
            <video src={mediaUrl} className="w-full max-h-72 rounded-lg border border-border bg-black/40" controls />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              className="w-full max-h-72 object-contain rounded-lg border border-border bg-black/40"
            />
          )
        ) : (
          <div className="h-28 rounded-lg border border-border bg-secondary/40 animate-pulse" />
        )
      )}
    </div>
  );
}