import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import LocationForm from '@/components/location/LocationForm';

/** Nudges a member for their real-world location once per browser session. */
export default function LocationPrompt({ user, onSaved }) {
  const [hidden, setHidden] = useState(false);

  if (!user?.id || user.home_label || hidden) return null;
  if (sessionStorage.getItem('cc_location_skipped')) return null;

  const skip = () => {
    sessionStorage.setItem('cc_location_skipped', '1');
    setHidden(true);
  };

  return (
    <div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm grid place-items-center p-3">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Where are you claiming from?</h2>
          </div>
          <button onClick={skip} className="p-1 rounded-md hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Add your location so it shows on the world map and admins can see where you play
          from. You can change it any time on your profile.
        </p>

        <LocationForm user={user} onSaved={onSaved} />

        <button
          onClick={skip}
          className="w-full py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}