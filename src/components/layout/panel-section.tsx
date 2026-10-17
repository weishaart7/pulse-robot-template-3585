import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Sections bord à bord des panneaux de travail (Retraite, Sociétés — cf. docs/design-system.md) : mêmes
// briques que les anciennes cartes (titre, rappel, contenu) mais posées bord à bord et séparées
// par des filets, titre à repère lagon comme les formulaires Famille / fiches Immobilier.

export const PanelCard = ({ className, ...props }: HTMLAttributes<HTMLElement>) => (
  <section className={cn('border-b border-border px-8 py-6', className)} {...props} />
);

export const PanelCardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)} {...props} />
);

export const PanelCardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3 className={cn('flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-foreground', className)}>
    <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full bg-lagon" />
    {children}
  </h3>
);

export const PanelCardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-1 text-[12.5px] text-muted-foreground', className)} {...props} />
);

export const PanelCardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-4', className)} {...props} />
);

/** Encadré de résultat / d'information : angles 2 px sur fond taupe, sans bordure. */
export const panelInsetClass = 'rounded-[2px] bg-secondary/50 p-3';

/** Montant mis en avant dans une section (pension, coût, gain…). */
export const panelFigureClass = 'text-[18px] font-medium tabular-nums tracking-[-0.01em] text-foreground';
