import { FamilyLink } from '@/services/familyService';

/**
 * Nombre d'enfants (lien_familial === 'Enfant') fiscalement rattachés au foyer.
 * Alimente `marital_status.nombre_enfants_charges`.
 */
export function compterEnfantsFiscalementACharge(familyLinks: Pick<FamilyLink, 'lien_familial' | 'fiscalement_a_charge'>[]): number {
  return familyLinks.filter(link => link.lien_familial === 'Enfant' && link.fiscalement_a_charge).length;
}
