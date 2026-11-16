import type { FoyerFiscalInput } from './types';

/**
 * Abattement spécial personnes âgées ou invalides (art. 157 bis CGI, BOI-IR-BASE-40 §60),
 * revenus 2025 / impôt 2026. Montants et seuils revalorisés chaque année comme la première
 * tranche du barème (+0,9 % pour les revenus 2025, voir BAREME_2026).
 */
export const ABATTEMENT_PERSONNES_AGEES_2026 = {
  seuilPlein: 17670,
  seuilReduit: 28430,
  montantPlein: 2822,
  montantReduit: 1411,
} as const;

export interface AbattementPersonnesAgeesResult {
  /** Montant déduit du revenu net global (jamais au-delà de celui-ci). */
  abattement: number;
  /** Déclarants remplissant la condition d'âge ou d'invalidité (0 à 2). */
  beneficiaires: number;
  /** Au moins un déclarant sans année de naissance ni invalidité : abattement possiblement sous-évalué. */
  anneeNaissanceManquante: boolean;
}

const COUPLE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

/**
 * `revenuNetGlobal` : revenu global après charges déductibles et déficits antérieurs, hors revenus
 * à taux proportionnel, revenus au quotient compris pour leur montant total (BOI-IR-BASE-40 §40).
 * Condition d'âge : plus de 65 ans au 31 décembre de `anneeRevenus`, soit né au plus tard en
 * `anneeRevenus − 65`. Invalidité : mêmes critères que les cases P/F (art. 195 1 c, d, d bis).
 * Une personne âgée et invalide ne compte qu'une fois (§20).
 */
export function calculerAbattementPersonnesAgees(
  foyer: FoyerFiscalInput,
  revenuNetGlobal: number,
  anneeRevenus: number,
  bareme = ABATTEMENT_PERSONNES_AGEES_2026,
): AbattementPersonnesAgeesResult {
  const enCouple = COUPLE.includes(foyer.situationFamille);
  const declarants = [
    { annee: foyer.anneeNaissanceDeclarant1 ?? null, invalide: foyer.invaliditeDeclarant1 },
    ...(enCouple ? [{ annee: foyer.anneeNaissanceDeclarant2 ?? null, invalide: foyer.invaliditeDeclarant2 }] : []),
  ];
  const beneficiaires = declarants.filter(d => d.invalide || (d.annee !== null && d.annee <= anneeRevenus - 65)).length;
  const anneeNaissanceManquante = declarants.some(d => !d.invalide && d.annee === null);

  const rng = Math.max(0, revenuNetGlobal);
  const unitaire = rng <= bareme.seuilPlein ? bareme.montantPlein : rng <= bareme.seuilReduit ? bareme.montantReduit : 0;

  return {
    abattement: Math.min(rng, unitaire * beneficiaires),
    beneficiaires,
    anneeNaissanceManquante,
  };
}
