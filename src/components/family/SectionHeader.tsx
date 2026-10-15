import type { ElementType } from 'react';

interface SectionHeaderProps {
  /** Conservé pour compatibilité des appels ; l'en-tête n'affiche plus d'icône. */
  icon?: ElementType;
  title: string;
}

// En-tête de carte partagé par les formulaires famille / régime matrimonial :
// titre de section en sans 15 px medium (esprit « Related Papers » de la maquette de référence).
export function SectionHeader({ title }: SectionHeaderProps) {
  return <h3 className="mb-4 text-[15px] font-medium tracking-[-0.01em] text-foreground">{title}</h3>;
}
