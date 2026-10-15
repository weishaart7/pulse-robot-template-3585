// Couleur fixe par branche familiale (cf. lib/family/groupesMembres.ts), partagée par
// le bloc « Composition » du Foyer et la liste des Membres : une branche garde la même
// couleur quelles que soient les branches présentes.
export interface GroupeTone {
  /** Pastille / repère de titre. */
  mark: string;
  /** Carré d'initiales d'un membre vivant. */
  avatar: string;
}

const GROUPE_TONES: Record<string, GroupeTone> = {
  descendants: { mark: 'bg-lagon', avatar: 'bg-lagon-soft text-lagon-ink' },
  ascendants: { mark: 'bg-citron', avatar: 'bg-citron-soft text-citron-ink' },
  collateraux: { mark: 'bg-lagon-ink', avatar: 'bg-lagon-ink text-white' },
  allies: { mark: 'bg-[#c9c2b8]', avatar: 'bg-[#ece7e1] text-foreground' },
};

const TONE_AUTRES: GroupeTone = { mark: 'bg-[#8a837c]', avatar: 'bg-secondary text-muted-foreground' };

export const getGroupeTone = (groupeId: string): GroupeTone => GROUPE_TONES[groupeId] ?? TONE_AUTRES;
