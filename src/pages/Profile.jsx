const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Camera, Loader2, Check, Gem, Coins } from 'lucide-react';

import LocationForm from '@/components/location/LocationForm';

const BIO_MAX = 160;

const sanitize = (value, max) =>
  value.replace(/[<>]/g, '').slice(0, max);

export default function Profile() {
  const { user, refreshUser } = useOutletContext();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
    discord_tag: '',
    tiktok_handle: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      display_name: user.display_name || user.full_name || '',
      avatar_url: user.avatar_url || '',
      bio: user.bio || '',
      discord_tag: user.discord_tag || '',
      tiktok_handle: user.tiktok_handle || '',
    });
  }, [user]);

  const set = (key, value, max) =>
    setForm((f) => ({ ...f, [key]: max ? sanitize(value, max) : value }));

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const res = await db.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, avatar_url: res.file_url }));
    } catch {
      setMessage({ ok: false, text: 'Upload failed.' });
    }
    setUploading(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await db.auth.updateMe({
        display_name: form.display_name.trim(),
        avatar_url: form.avatar_url,
        bio: form.bio,
        discord_tag: form.discord_tag.trim(),
        tiktok_handle: form.tiktok_handle.trim(),
      });
      await refreshUser();
      setMessage({ ok: true, text: 'Profile saved.' });
    } catch {
      setMessage({ ok: false, text: 'Could not save your profile.' });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2">
          <Gem className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Points</p>
            <p className="text-sm font-mono font-semibold">
              {Number(user?.country_points || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Credits</p>
            <p className="text-sm font-mono font-semibold">
              {Number(user?.credits || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Your location</h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pins you on the world map and tells admins where you play from. A city is enough —
            never your exact address.
          </p>
        </div>
        <LocationForm user={user} onSaved={refreshUser} />
      </div>

      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-full overflow-hidden bg-secondary border border-border grid place-items-center shrink-0 group"
          >
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-muted-foreground" />
            )}
            {uploading && (
              <span className="absolute inset-0 bg-black/60 grid place-items-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
          <p className="text-[11px] text-muted-foreground">
            Avatars are stored publicly — anyone with the link can open them.
          </p>
        </div>

        <Field label="Display name">
          <input
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value, 32)}
            className="input-base"
            placeholder="How you appear on the map"
          />
        </Field>

        <Field label={`Bio · ${form.bio.length}/${BIO_MAX}`}>
          <textarea
            value={form.bio}
            onChange={(e) => set('bio', e.target.value, BIO_MAX)}
            rows={3}
            className="input-base resize-none"
            placeholder="A short line about you"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Discord tag">
            <input
              value={form.discord_tag}
              onChange={(e) => set('discord_tag', e.target.value, 40)}
              className="input-base"
              placeholder="name#0000"
            />
          </Field>
          <Field label="TikTok handle">
            <input
              value={form.tiktok_handle}
              onChange={(e) => set('tiktok_handle', e.target.value, 40)}
              className="input-base"
              placeholder="@handle"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save profile'}
        </button>

        {message && (
          <p className={`text-[11px] ${message.ok ? 'text-primary' : 'text-destructive'}`}>
            {message.ok && <Check className="w-3 h-3 inline mr-1" />}
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}