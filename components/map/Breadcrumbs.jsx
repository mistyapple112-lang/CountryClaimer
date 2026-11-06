import { ChevronRight, Globe2 } from 'lucide-react';
import { KIND_LABEL } from '@/lib/territories';

export default function Breadcrumbs({ path, onJump }) {
  return (
    <div className="flex items-center gap-0.5 text-xs overflow-x-auto">
      <button
        onClick={() => onJump(-1)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors shrink-0 ${
          path.length === 0
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`}
      >
        <Globe2 className="w-3 h-3" />
        World
      </button>
      {path.map((t, i) => (
        <div key={t.id} className="flex items-center gap-0.5 shrink-0">
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          <button
            onClick={() => onJump(i)}
            className={`px-2 py-1 rounded-md transition-colors ${
              i === path.length - 1
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={KIND_LABEL[t.kind]}
          >
            {t.name}
          </button>
        </div>
      ))}
    </div>
  );
}