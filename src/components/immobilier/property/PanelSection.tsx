import type { ReactNode } from 'react';
import { SectionHeader } from '@/components/family/SectionHeader';

interface PanelSectionProps {
  title: string;
  /** Rappel sous le titre. */
  description?: ReactNode;
  /** Classe du repère de titre (lagon par défaut). */
  markClassName?: string;
  /** Champs sur deux colonnes dès `md` (par défaut) ; `false` pour un contenu libre pleine largeur. */
  grid?: boolean;
  children: ReactNode;
}

// Section d'une fiche de bien en « panneau de travail » : titre à repère (SectionHeader, comme les
// formulaires Famille), champs sur deux colonnes, sections séparées par des filets bord à bord.
export const PanelSection = ({ title, description, markClassName, grid = true, children }: PanelSectionProps) => (
  <section className="-mx-8 border-t border-border px-8 py-6 first:border-t-0 first:pt-0">
    <SectionHeader title={title} markClassName={markClassName} />
    {description && <p className="-mt-2 mb-4 max-w-2xl text-[12.5px] text-muted-foreground">{description}</p>}
    <div className={grid ? 'grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2' : 'space-y-4'}>{children}</div>
  </section>
);
