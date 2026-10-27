/**
 * Charges foncières des monuments historiques imputables sur le revenu global
 * (6DG, art. 156 II 1° ter CGI ; BOI-IR-BASE-20-40) : seule ligne du cadre 6
 * déclarée après limitation, d'où ce calcul d'appoint (brochure IR 2026 p. 229-230).
 */

export type SituationMonumentHistorique =
  | 'visites_classe_inscrit'
  | 'visites_agree'
  | 'sans_recettes_versements_culture'
  | 'sans_recettes_travaux_subventionnes'
  | 'sans_recettes_autres_ouvert'
  | 'sans_recettes_autres_ferme_ou_agree'
  | 'label_fondation';

export interface LigneMonumentHistorique {
  situation: SituationMonumentHistorique;
  /** Charges de la ligne (fraction non déduite des revenus fonciers pour les immeubles avec droits de visite). */
  montant: number | null;
  /** Subvention afférente (travaux subventionnés, label Fondation du patrimoine). */
  subvention: number | null;
}

export const SITUATIONS_MONUMENT_HISTORIQUE: { value: SituationMonumentHistorique; label: string; avecSubvention: boolean }[] = [
  { value: 'visites_classe_inscrit', label: 'Classé ou inscrit, occupé, droits de visite : charges non déduites des revenus fonciers', avecSubvention: false },
  { value: 'visites_agree', label: 'Agréé, occupé, droits de visite : charges non déduites des revenus fonciers', avecSubvention: false },
  { value: 'sans_recettes_versements_culture', label: 'Sans recettes : sommes versées aux Affaires culturelles', avecSubvention: false },
  { value: 'sans_recettes_travaux_subventionnes', label: 'Sans recettes : travaux subventionnés', avecSubvention: true },
  { value: 'sans_recettes_autres_ouvert', label: 'Sans recettes : autres charges, classé ou inscrit ouvert au public', avecSubvention: false },
  { value: 'sans_recettes_autres_ferme_ou_agree', label: 'Sans recettes : autres charges, fermé au public ou agréé', avecSubvention: false },
  { value: 'label_fondation', label: 'Label Fondation du patrimoine, sans recettes : travaux de réparation et d\'entretien', avecSubvention: true },
];

/** Subvention à partir de laquelle les travaux d'un immeuble labellisé sont déductibles à 100 %. */
export const SEUIL_SUBVENTION_LABEL_FONDATION = 0.2;

const montant = (v: number | null) => Math.max(0, v ?? 0);

/** Montant déductible d'une ligne, arrondi à l'euro. */
export function montantDeductibleLigneMonumentHistorique(ligne: LigneMonumentHistorique): number {
  const brut = montant(ligne.montant);
  const subvention = Math.min(montant(ligne.subvention), brut);
  switch (ligne.situation) {
    case 'visites_classe_inscrit':
    case 'sans_recettes_versements_culture':
    case 'sans_recettes_autres_ouvert':
      return Math.round(brut);
    case 'visites_agree':
    case 'sans_recettes_autres_ferme_ou_agree':
      return Math.round(brut * 0.5);
    case 'sans_recettes_travaux_subventionnes':
      return Math.round(brut - subvention);
    case 'label_fondation': {
      const taux = brut > 0 && subvention >= SEUIL_SUBVENTION_LABEL_FONDATION * brut ? 1 : 0.5;
      return Math.round((brut - subvention) * taux);
    }
  }
}

/** Montant à porter en 6DG. */
export function montantDeductibleMonumentsHistoriques(lignes: LigneMonumentHistorique[]): number {
  return lignes.reduce((total, ligne) => total + montantDeductibleLigneMonumentHistorique(ligne), 0);
}
