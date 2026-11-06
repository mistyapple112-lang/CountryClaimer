export default function LivePill({ live, label = 'Live' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono transition-colors ${
        live
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-secondary/50 text-muted-foreground'
      }`}
    >
      <span className="relative flex w-1.5 h-1.5">
        {live && (
          <span className="absolute inline-flex w-full h-full rounded-full bg-primary opacity-70 animate-ping" />
        )}
        <span
          className={`relative inline-flex w-1.5 h-1.5 rounded-full ${
            live ? 'bg-primary' : 'bg-muted-foreground'
          }`}
        />
      </span>
      {label}
    </span>
  );
}