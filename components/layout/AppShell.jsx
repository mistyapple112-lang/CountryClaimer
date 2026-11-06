const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import NavBar from '@/components/layout/NavBar';
import AdminGate from '@/components/admin/AdminGate';
import LocationPrompt from '@/components/location/LocationPrompt';
import { logActivity } from '@/lib/logActivity';

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const me = await db.auth.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // One "signed in" entry per browser session, so the trail shows who is active
  // without a new row on every page view.
  useEffect(() => {
    if (!user?.id) return;
    const key = `cc_activity_${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    logActivity({ action: 'login', user });
  }, [user]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <NavBar user={user} onOpenAdmin={() => setAdminOpen(true)} />
      <main className="flex-1 min-h-0">
        {loading ? (
          <div className="h-[70vh] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Outlet context={{ user, refreshUser: loadUser }} />
        )}
      </main>
      <AdminGate
        user={user}
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onRefresh={loadUser}
      />
      <LocationPrompt user={user} onSaved={loadUser} />
    </div>
  );
}