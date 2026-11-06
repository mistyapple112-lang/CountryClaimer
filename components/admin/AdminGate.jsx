import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import AdminPanel from '@/components/admin/AdminPanel';

/**
 * Admin controls. The gear in the navbar opens this for admin accounts only;
 * the access phrase is still required once per session, so a stolen session on
 * a normal account never reaches the panel.
 */
export default function AdminGate({ user, open, onClose, onRefresh }) {
  const [value, setValue] = useState('');
  const [denied, setDenied] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!open) {
      setValue('');
      setDenied(false);
    }
  }, [open]);

  if (!open) return null;

  if (unlocked) {
    return (
      <AdminPanel
        user={user}
        onRefresh={onRefresh}
        onClose={() => {
          setUnlocked(false);
          onClose();
        }}
      />
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (user?.role === 'admin' && value.trim() === 'sausageeater12') {
      setUnlocked(true);
      setValue('');
      setDenied(false);
      return;
    }
    setDenied(true);
    setValue('');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs bg-card border border-border rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold">Admin access</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Access phrase"
          className="input-base font-mono"
          aria-label="Access phrase"
        />
        {denied && <p className="text-[11px] text-destructive">Wrong phrase.</p>}
        <button
          type="submit"
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          Unlock controls
        </button>
      </form>
    </div>
  );
}