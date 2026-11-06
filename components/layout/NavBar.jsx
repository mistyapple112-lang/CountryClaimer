import { Link, useLocation } from 'react-router-dom';
import { Globe2, Coins, Gem, MessageCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const COMMUNITY_URL = 'https://discord.com';

export default function NavBar({ user, onOpenAdmin }) {
  const { pathname } = useLocation();

  const tabs = [
    { label: 'Map', to: '/' },
    { label: 'Profile', to: '/profile' },
    { label: 'Terms', to: '/terms' },
  ];

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card/60 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-3 sticky top-0 z-30">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <Globe2 className="w-5 h-5 text-primary" />
        <span className="font-semibold tracking-tight text-sm sm:text-base hidden sm:block">
          CountryClaimer
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              pathname === tab.to
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary border border-border">
          <Gem className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono font-semibold">
            {Number(user?.country_points || 0).toLocaleString()}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary border border-border">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-mono font-semibold">
            {Number(user?.credits || 0).toLocaleString()}
          </span>
        </div>

        <a
          href={COMMUNITY_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Join Discord</span>
        </a>

        {user?.role === 'admin' && (
          <button
            onClick={onOpenAdmin}
            title="Admin settings"
            aria-label="Admin settings"
            className="p-2 rounded-md border border-border bg-secondary text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        <Link to="/profile" className="w-8 h-8 rounded-full overflow-hidden bg-secondary border border-border shrink-0 grid place-items-center">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              {(user?.display_name || user?.email || '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}