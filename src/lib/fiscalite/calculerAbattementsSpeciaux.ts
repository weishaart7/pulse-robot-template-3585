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

/** Abattement par personne rattachée au titre d'un enfant ayant fondé un foyer distinct (art. 196 B CGI), revenus 2025. */
export const ABATTEMENT_RATTACHEMENT_2026 = 6855;
/** Demi-abattement par petit-enfant en résidence alternée (BOI-IR-BASE-40 §240 : 3 428 €). */
export const ABATTEMENT_RATTACHEMENT_ALTERNEE_2026 = 3428;

export interface AbattementsSpeciauxResult {
  personnesAgees: AbattementPersonnesAgeesResult;
  /** Abattement art. 196 B (cases N/P) effectivement imputé. */
  rattachement: number;
  /** Total retranché du revenu net global (jamais au-delà de celui-ci). */
  total: number;
}

/**
 * Abattements spéciaux retranchés du revenu net global (BOI-IR-BASE-40), dans l'ordre vérifié sur
 * le simulateur officiel : seuil personnes âgées apprécié sur le revenu net global avant tout
 * abattement, puis 6 855 € par personne rattachée (case N), divisé par deux pour chaque
 * petit-enfant en résidence alternée (case P, comprise dans N). Total plafonné au revenu.
 *
 * `revenuNetGlobal` : revenu sur lequel les abattements s'imputent. `revenuNetGlobalSeuil` : revenu
 * retenu pour le seuil 157 bis (0XX compris pour son total), égal au précédent par défaut.
 */
export function calculerAbattementsSpeciaux(
  foyer: FoyerFiscalInput,
  revenuNetGlobal: number,
  anneeRevenus: number,
  revenuNetGlobalSeuil = revenuNetGlobal,
): AbattementsSpeciauxResult {
  const personnesAgees = calculerAbattementPersonnesAgees(foyer, revenuNetGlobalSeuil, anneeRevenus);
  const personnes = Math.max(0, foyer.personnesRattacheesFoyerDistinct ?? 0);
  const alternes = Math.min(personnes, Math.max(0, foyer.petitsEnfantsRattachesAlternee ?? 0));
  const rattachementBrut = (personnes - alternes) * ABATTEMENT_RATTACHEMENT_2026 + alternes * ABATTEMENT_RATTACHEMENT_ALTERNEE_2026;
  const rng = Math.max(0, revenuNetGlobal);
  const agees = Math.min(personnesAgees.abattement, rng);
  const rattachement = Math.min(rattachementBrut, rng - agees);
  return { personnesAgees: { ...personnesAgees, abattement: agees }, rattachement, total: agees + rattachement };
}
