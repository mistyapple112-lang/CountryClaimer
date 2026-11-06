import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Play fair',
    body: 'One account per person. Do not use alts, bots, scripts or multi-accounting to grab extra seats, bids or points. Territory is claimed through the map and the seat system only.',
  },
  {
    title: 'Be decent',
    body: 'No hate speech, threats, harassment, sexual content, spam or doxxing in comments, offers or profile details. Treat other members with respect, even when you are fighting over the same city.',
  },
  {
    title: 'Points and credits can be taken away',
    body: 'If you break these rules, admins may remove Country Points and Credits from your account, remove your comments, and release the seats or territories you hold. Penalties are recorded in the audit trail together with the reason, and removed points are not refunded.',
  },
  {
    title: 'Content removal',
    body: 'Admins may delete any comment, image, clip or territory name that breaks these rules. Repeated problems can lead to your seats being cleared or your access being withdrawn without notice.',
  },
  {
    title: 'Your location',
    body: 'You can add the place you play from so it appears on the map. It is stored with your profile, shown to admins, and logged in the audit trail when you change it. Only add a general place — a city is enough. Never post your exact home address. You can change it any time from your profile.',
  },
  {
    title: 'Your account, your risk',
    body: 'Points, credits and seats have no cash value and are not refundable. Bids and trades are settled between members, and admin decisions on disputed deals are final.',
  },
  {
    title: 'Changes',
    body: 'These terms can be updated as the game grows. Continuing to play after an update means you accept the current version.',
  },
];

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Back to the map
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Terms &amp; fair play policy</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Read this before you claim. Breaking the rules can cost you points, credits and the
          places you hold.
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-border bg-card p-4 space-y-1.5"
          >
            <h2 className="text-sm font-semibold">{section.title}</h2>
            <p className="text-[12px] leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Questions or a report to make? Bring it to the community Discord — admins review reports
        and act on them from the admin panel.
      </p>
    </div>
  );
}