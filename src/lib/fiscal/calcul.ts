import { FoyerFiscalInput, PartsFiscalesResult } from './types';
import { FamilyLink } from '@/services/familyService';

const COUPLE_IMPOSITION_COMMUNE = ['Marié(e)', 'Pacsé(e)'];

/**
 * Nombre d'enfants (lien_familial === 'Enfant') fiscalement rattachés au foyer.
 * Alimente `marital_status.nombre_enfants_charges`.
 */
export function compterEnfantsFiscalementACharge(familyLinks: Pick<FamilyLink, 'lien_familial' | 'fiscalement_a_charge'>[]): number {
  return familyLinks.filter(link => link.lien_familial === 'Enfant' && link.fiscalement_a_charge).length;
}

/**
 * Quotient familial standard (art. 194 et 195 CGI).
 *
 * Note : la majoration "ancien combattant" est ici une case à cocher simple
 * (Phase 1), sans vérification de la condition d'âge réelle (généralement
 * > 74 ans, ou veuve d'ancien combattant). Ne pas utiliser ce résultat pour
 * un calcul fiscal réel sans validation de cette règle.
 */
export function calculerPartsFiscales(input: FoyerFiscalInput): PartsFiscalesResult {
  const coupleImpositionCommune = !!input.statutCouple
    && COUPLE_IMPOSITION_COMMUNE.includes(input.statutCouple)
    && !input.impositionDistincte;
  const partsBase = coupleImpositionCommune ? 2 : 1;

  const enfantsFiscalementACharge = input.enfants.filter(e => e.fiscalementACharge);
  const nombreEnfantsFiscalementACharge = enfantsFiscalementACharge.length;

  let partsEnfants = 0;
  enfantsFiscalementACharge.forEach((_, index) => {
    partsEnfants += index < 2 ? 0.5 : 1;
  });

  const majorationParentIsole = (input.parentIsole && nombreEnfantsFiscalementACharge > 0) ? 0.5 : 0;

  const personnesInvalides = [
    input.personneHandicapeeClient,
    input.personneHandicapeeConjoint,
    ...enfantsFiscalementACharge.map(e => e.handicap),
  ].filter(Boolean).length;
  const majorationInvalidite = personnesInvalides * 0.5;

  const majorationAncienCombattant = (input.ancienCombattantClient || input.ancienCombattantConjoint) ? 0.5 : 0;

  const totalParts = partsBase + partsEnfants + majorationParentIsole + majorationInvalidite + majorationAncienCombattant;

  return {
    partsBase,
    partsEnfants,
    majorationParentIsole,
    majorationInvalidite,
    majorationAncienCombattant,
    totalParts,
    nombreEnfantsFiscalementACharge,
  };
}
