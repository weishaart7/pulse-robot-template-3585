/**
 * Détermination du régime matrimonial légal applicable en l'absence de
 * contrat de mariage, selon la date du mariage.
 *
 * Avant le 1er février 1966 (entrée en vigueur de la loi du 13 juillet 1965),
 * le régime légal était la communauté de meubles et acquêts. Depuis cette
 * date, le régime légal est la communauté réduite aux acquêts.
 */

export const REGIME_COMMUNAUTE_MEUBLES_ET_ACQUETS = "Communauté de meubles et d'acquêts";
export const REGIME_COMMUNAUTE_REDUITE_AUX_ACQUETS = 'Communauté réduite aux acquêts (option sans contrat de mariage)';

const DATE_ENTREE_VIGUEUR_COMMUNAUTE_REDUITE = new Date('1966-02-01');

export type RegimeLegal = typeof REGIME_COMMUNAUTE_MEUBLES_ET_ACQUETS | typeof REGIME_COMMUNAUTE_REDUITE_AUX_ACQUETS;

export const determinerRegimeLegal = (dateMariage: string | null | undefined): RegimeLegal => {
  if (dateMariage) {
    const d = new Date(dateMariage);
    if (!isNaN(d.getTime()) && d < DATE_ENTREE_VIGUEUR_COMMUNAUTE_REDUITE) {
      return REGIME_COMMUNAUTE_MEUBLES_ET_ACQUETS;
    }
  }
  return REGIME_COMMUNAUTE_REDUITE_AUX_ACQUETS;
};
