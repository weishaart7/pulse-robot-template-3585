// Logique pure de transition de marital_status.statut_couple, utilisée par
// FamilleSection.tsx pour décider s'il faut confirmer un changement de statut.
// Quitter un mariage ou un PACS efface les informations propres à ce statut
// (champsObsoletesPourStatut, maritalStatus.ts) : la confirmation les nomme, et
// signale les enfants rattachés au conjoint quand on quitte le couple.

import type { FamilyLink } from '@/services/familyService';
import { isCoupleStatus, STATUTS_UNION_DISSOUTE } from '@/lib/family/maritalStatus';

export { isCoupleStatus };

// true si l'on passe d'un statut en couple à un statut sans partenaire actif.
export const leavesCouple = (from?: string | null, to?: string | null): boolean =>
  isCoupleStatus(from) && !isCoupleStatus(to);

// Enfants rattachés au conjoint seul ou aux deux parents.
export const childrenLinkedToSpouse = (links: FamilyLink[]): FamilyLink[] =>
  links.filter(
    l => l.lien_familial === 'Enfant' && (l.parent_de === 'spouse' || l.parent_de === 'both_parents')
  );

// Informations effacées en quittant le statut `from` (vide si rien n'est effacé).
export const donneesEffacees = (from?: string | null, to?: string | null): string[] => {
  if (!from || !to || from === to) return [];
  // Divorce ou veuvage : le régime de l'union dissoute est conservé (lecture seule).
  if (from === 'Marié(e)' && !(STATUTS_UNION_DISSOUTE as readonly string[]).includes(to)) {
    return ['le régime matrimonial et le contrat de mariage', 'les donations au dernier vivant',
      'la séparation de corps', "l'option du conjoint survivant"];
  }
  if (from === 'Pacsé(e)') return ['la convention, la date et le lieu du PACS'];
  return [];
};

// Confirmation requise : sortie du couple, ou effacement d'informations du statut quitté.
export const requiresConfirmation = (from?: string | null, to?: string | null): boolean =>
  leavesCouple(from, to) || donneesEffacees(from, to).length > 0;
