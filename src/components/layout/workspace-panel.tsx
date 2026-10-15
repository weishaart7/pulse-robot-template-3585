import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Briques du « panneau de travail » (pages Foyer, Régime matrimonial) : barre d'en-tête
// avec fil d'Ariane, titres de section et lignes libellé / valeur d'un panneau latéral.
// Lisibilité renforcée via la classe .workspace-panel (index.css).

export function WorkspaceHeader({ icon, trail, actions }: { icon: ReactNode; trail: string[]; actions?: ReactNode }) {
  return (
    <div className="flex h-14 items-center justify-between gap-4 border-b border-border px-6">
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {trail.map((part, i) => (
          <span key={part} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/60">/</span>}
            <span className={cn('truncate', i === trail.length - 1 ? 'text-foreground' : 'text-muted-foreground')}>{part}</span>
          </span>
        ))}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">{children}</h3>
      {action}
    </div>
  );
}

export function SummaryRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-3 py-2 text-[14px] leading-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-[6px] bg-[#e9e5e0] px-2.5 text-[13px] text-foreground">
      {children}
    </span>
  );
}

export const PanelDivider = () => <div className="my-5 h-px bg-border" />;
