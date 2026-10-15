import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Briques du « panneau de travail » (pages Foyer, Régime matrimonial) : barre d'en-tête
// avec fil d'Ariane, titres de section et lignes libellé / valeur d'un panneau latéral.
// Lisibilité renforcée via la classe .workspace-panel (index.css).

export function WorkspaceHeader({ icon, trail, actions }: { icon: ReactNode; trail: string[]; actions?: ReactNode }) {
  return (
    <div className="flex h-16 items-center justify-between gap-4 border-b border-border px-8">
      <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-lagon-soft text-lagon-ink [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
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
      <h3 className="text-[14.5px] font-medium tracking-[-0.01em] text-foreground">{children}</h3>
      {action}
    </div>
  );
}

export function SummaryRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-3 py-1.5 text-[13px] leading-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-foreground">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

const CHIP_TONES = {
  neutral: 'bg-[#e9e5e0] text-foreground',
  lagon: 'bg-lagon-soft text-lagon-ink',
  citron: 'bg-citron-soft text-citron-ink',
} as const;

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof CHIP_TONES }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-[2px] px-2 text-[12px] font-medium', CHIP_TONES[tone])}>
      {children}
    </span>
  );
}

/** Lien d'action discret du panneau (« Voir la fiche »…), en bleu lagon. */
export const panelLinkClass =
  'text-[12.5px] font-medium text-lagon-ink underline-offset-4 hover:underline rounded-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lagon-ink';

export const PanelDivider = () => <div className="my-5 h-px bg-border" />;
