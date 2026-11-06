const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';

import { ImagePlus, Loader2, Send, X } from 'lucide-react';
import { logActivity } from '@/lib/logActivity';

export default function CommentComposer({ territory, user, onPosted }) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pick = (event) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    if (!chosen.type.startsWith('image/') && !chosen.type.startsWith('video/')) {
      setError('Only images and video clips can be attached.');
      return;
    }
    setError(null);
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const post = async () => {
    if (!body.trim() && !file) return;
    setBusy(true);
    setError(null);
    try {
      let media_uri;
      let media_type;
      if (file) {
        const uploaded = await db.integrations.Core.UploadPrivateFile({ file });
        media_uri = uploaded.file_uri;
        media_type = file.type.startsWith('video/') ? 'video' : 'image';
      }
      const created = await db.entities.Comment.create({
        territory_id: territory.id,
        author_id: user.id,
        author_email: user.email,
        author_name: user.display_name || user.full_name || user.email,
        author_avatar_url: user.avatar_url || '',
        body: body.trim() || undefined,
        media_uri,
        media_type,
      });
      logActivity({
        action: 'comment',
        user,
        targetType: 'territory',
        targetId: territory.id,
        meta: { territory_name: territory.name, has_media: Boolean(media_uri) },
      });
      setBody('');
      clearFile();
      onPosted?.(created);
    } catch {
      setError('Could not post. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={`Say something about ${territory.name}...`}
        className="input-base resize-none"
      />

      {preview && (
        <div className="relative rounded-lg overflow-hidden border border-border bg-black/40">
          {file?.type.startsWith('video/') ? (
            <video src={preview} className="w-full max-h-52 object-contain" controls />
          ) : (
            <img src={preview} alt="" className="w-full max-h-52 object-contain" />
          )}
          <button
            onClick={clearFile}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/80 border border-border"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
          <ImagePlus className="w-3.5 h-3.5" />
          Clip
          <input type="file" accept="image/*,video/*" onChange={pick} className="hidden" />
        </label>
        <span className="text-[10px] text-muted-foreground">stored privately</span>
        <button
          onClick={post}
          disabled={busy || (!body.trim() && !file)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Post
        </button>
      </div>

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}