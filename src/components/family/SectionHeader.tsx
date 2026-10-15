import type { ElementType } from 'react';

interface SectionHeaderProps {
  /** Conservé pour compatibilité des appels ; l'en-tête n'affiche plus d'icône. */
  icon?: ElementType;
  title: string;
  /** Classe de fond du repère (lagon par défaut). */
  markClassName?: string;
}

// En-tête de carte partagé par les formulaires famille / régime matrimonial :
// titre de section en sans 15 px medium (esprit « Related Papers » de la maquette de référence).
export function SectionHeader({ title, markClassName = 'bg-lagon' }: SectionHeaderProps) {
  return <h3 className="mb-3.5 flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-foreground">
      <span aria-hidden className={`h-3 w-[3px] rounded-full ${markClassName}`} />
      {title}
    </h3>;
}
