/**
 * Éligibilité d'un pacte Dutreil (art. 787 B CGI) au jour d'une transmission
 * — seule source de `societe_dutreil.eligibilite_validee`, lu par le calcul de
 * transmission (societeDutreilService.getSocietesEligibles).
 *
 * Conditions vérifiables à la date de référence :
 * - engagement collectif de conservation : signé et en cours au jour de la
 *   transmission (durée minimale de 2 ans, qui n'a pas à être écoulée —
 *   les héritiers le poursuivent), ou réputé acquis (titres détenus depuis 2
 *   ans par le défunt, seul ou avec son conjoint, qui y exerce une fonction
 *   de direction), ou post mortem (signé par les héritiers dans les 6 mois du
 *   décès, présumé) ;
 * - fonction de direction exercée par l'un des signataires ;
 * - part de la valeur des titres correspondant à des biens non affectés à
 *   l'activité renseignée (LF 2026, exclue de l'exonération ; 0 accepté).
 * Conditions déclaratives, confirmées par le conseiller : activité
 * opérationnelle ou holding animatrice, seuils de l'engagement collectif
 * (10 % des droits financiers, 20 % des droits de vote).
 * L'engagement individuel (4 ans, 6 ans depuis le 21/02/2026) est pris par
 * les héritiers après la transmission : jamais vérifiable ici, présumé.
 */
export type TypeEngagementCollectif = 'signe' | 'repute_acquis' | 'post_mortem';

export const TYPE_ENGAGEMENT_COLLECTIF_OPTIONS: Array<{ value: TypeEngagementCollectif; label: string }> = [
  { value: 'signe', label: 'Engagement signé' },
  { value: 'repute_acquis', label: 'Réputé acquis (détention de 2 ans et direction)' },
  { value: 'post_mortem', label: 'Post mortem (signé par les héritiers dans les 6 mois)' },
];

export interface FicheDutreil {
  type_engagement_collectif?: TypeEngagementCollectif | string | null;
  engagement_collectif_date?: string | null;
  fonction_direction?: string | null;
  part_biens_non_affectes?: number | null;
}

export interface EligibiliteDutreil {
  engagementCollectif: boolean;
  fonctionDirection: boolean;
  partBiensNonAffectes: boolean;
  // Toutes les conditions vérifiables sont remplies.
  conditionsRemplies: boolean;
  // conditionsRemplies et activité / seuils confirmés par le conseiller.
  eligible: boolean;
}

export function evaluerEligibiliteDutreil(
  fiche: FicheDutreil,
  dateReference: string,
  confirmationActivite: boolean
): EligibiliteDutreil {
  const type = fiche.type_engagement_collectif;
  const engagementCollectif = type === 'repute_acquis' || type === 'post_mortem'
    || (type === 'signe' && !!fiche.engagement_collectif_date
      && fiche.engagement_collectif_date.slice(0, 10) <= dateReference.slice(0, 10));
  const fonctionDirection = !!fiche.fonction_direction?.trim();
  const partBiensNonAffectes = fiche.part_biens_non_affectes != null
    && fiche.part_biens_non_affectes >= 0 && fiche.part_biens_non_affectes <= 100;
  const conditionsRemplies = engagementCollectif && fonctionDirection && partBiensNonAffectes;
  return {
    engagementCollectif,
    fonctionDirection,
    partBiensNonAffectes,
    conditionsRemplies,
    eligible: conditionsRemplies && confirmationActivite,
  };
}
