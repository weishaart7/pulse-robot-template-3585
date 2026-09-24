// Logique pure de transition de marital_status.statut_couple, utilisée par
// FamilleSection.tsx pour décider s'il faut confirmer un changement de statut.
// Aucune donnée n'est effacée lors d'une transition (politique « Option A »,
// cf. relationInfoPayload.ts) : on se contente de signaler les enfants dont le
// rattachement désigne le conjoint, qui n'existera plus dans les calculs.

import type { FamilyLink } from '@/services/familyService';

export const COUPLE_STATUSES = ['Concubinage', 'Pacsé(e)', 'Marié(e)'] as const;

export const isCoupleStatus = (statut?: string | null): boolean =>
  !!statut && (COUPLE_STATUSES as readonly string[]).includes(statut);

// true si l'on passe d'un statut en couple à un statut sans partenaire actif.
export const leavesCouple = (from?: string | null, to?: string | null): boolean =>
  isCoupleStatus(from) && !isCoupleStatus(to);

// Enfants rattachés au conjoint seul ou aux deux parents.
export const childrenLinkedToSpouse = (links: FamilyLink[]): FamilyLink[] =>
  links.filter(
    l => l.lien_familial === 'Enfant' && (l.parent_de === 'spouse' || l.parent_de === 'both_parents')
  );
