import { ChargesDeductiblesInput } from './types';

/**
 * Plafond de la pension alimentaire à un enfant majeur, par enfant (art. 156 II 2° CGI) :
 * 6 794 € pour les revenus 2024 revalorisé de 0,9 % (LF 2026). À confirmer brochure IR 2026.
 */
export const PLAFOND_PENSION_ENFANT_MAJEUR = 6855;
/**
 * Déduction forfaitaire par personne de plus de 75 ans accueillie (art. 156 II 2° ter CGI) :
 * 3 968 € pour les revenus 2024 revalorisé de 0,9 %. À confirmer brochure IR 2026.
 */
export const PLAFOND_ACCUEIL_PERSONNE_AGEE = 4003;
/** Grosses réparations des nus-propriétaires imputables sur le revenu global (art. 156 I 3° CGI). */
export const PLAFOND_GROSSES_REPARATIONS = 25000;

const montant = (v: number | null) => Math.max(0, v ?? 0);

export interface ChargesDeductiblesResult {
  /** 6GH : ajouté au revenu imposable avant toute imputation. */
  sommesAAjouter: number;
  /** 6FA à 6FL imputés, les plus anciens d'abord, dans la limite du revenu global. */
  deficitsAnterieursImputes: number;
  /** Charges du cadre 6 après plafonds, avant limite du revenu global. */
  chargesDeductibles: number;
  /** Charges effectivement imputées (le revenu global ne descend pas sous 0). */
  chargesImputees: number;
  /** Épargne retraite déduite (6NS/6RS, 6NT/6RT), comprise dans `chargesImputees`. */
  epargneRetraiteDeduite: number;
  /** Épargne retraite effectivement imputée : réintégrée au RFR (art. 1417 IV 1° a CGI). */
  epargneRetraiteRetenuePourRFR: number;
  /** Incidence nette sur le revenu imposable : 6GH − déficits antérieurs − charges imputées. */
  incidenceRevenuImposable: number;
}

/**
 * Cadre 6 de la 2042 et de la 2042-C (revenus 2025/impôt 2026).
 *
 * `revenuBrutGlobal` est le revenu imposable des cadres 1 à 5, déficits de
 * l'année déjà imputés. Ordre de l'art. 156 CGI : 6GH s'ajoute, puis les
 * déficits globaux antérieurs s'imputent, puis les charges ; aucune
 * n'amène le revenu sous 0 (le reliquat de déficit reste reportable, une
 * charge non imputée est perdue). 6QW, 6OS/6OT et 6QS/6QT sont informatives :
 * le plafond 6PS/6PT est saisi tel que figurant sur l'avis (ou recalculé
 * par l'utilisateur pour un nouveau résident).
 */
export function calculerChargesDeductibles(
  input: ChargesDeductiblesInput,
  revenuBrutGlobal: number,
): ChargesDeductiblesResult {
  const sommesAAjouter = montant(input.case6gh);
  let disponible = Math.max(0, revenuBrutGlobal + sommesAAjouter);

  const deficits = [input.case6fa, input.case6fb, input.case6fc, input.case6fd, input.case6fe, input.case6fl];
  let deficitsAnterieursImputes = 0;
  for (const d of deficits) {
    const impute = Math.min(montant(d), disponible);
    deficitsAnterieursImputes += impute;
    disponible -= impute;
  }

  const pensionEnfantMajeur = (v: number | null) => Math.min(montant(v), PLAFOND_PENSION_ENFANT_MAJEUR);
  const pensions = pensionEnfantMajeur(input.case6el) + pensionEnfantMajeur(input.case6em)
    + pensionEnfantMajeur(input.case6gi) + pensionEnfantMajeur(input.case6gj)
    + montant(input.case6gu) + montant(input.case6gp);

  const cotisations1 = montant(input.case6ns) + montant(input.case6rs);
  const cotisations2 = montant(input.case6nt) + montant(input.case6rt);
  const plafond1 = montant(input.case6ps);
  const plafond2 = montant(input.case6pt);
  const epargneRetraiteDeduite = input.case6qr
    ? Math.min(cotisations1 + cotisations2, plafond1 + plafond2)
    : Math.min(cotisations1, plafond1) + Math.min(cotisations2, plafond2);

  // Sans nombre saisi, un montant 6EU vaut pour une personne accueillie.
  const personnesAccueillies = input.case6ev ?? (montant(input.case6eu) > 0 ? 1 : 0);
  const accueil = Math.min(montant(input.case6eu), Math.max(0, personnesAccueillies) * PLAFOND_ACCUEIL_PERSONNE_AGEE);
  const grossesReparations = Math.min(
    montant(input.case6hp) + montant(input.case6hq) + montant(input.case6hr),
    PLAFOND_GROSSES_REPARATIONS,
  );

  const chargesDeductibles = montant(input.case6de) + pensions + epargneRetraiteDeduite
    + montant(input.case6dg) + montant(input.case6dd) + accueil + grossesReparations;
  const chargesImputees = Math.min(chargesDeductibles, disponible);
  // Les charges imputées en partie : l'épargne retraite est réputée imputée en dernier.
  const epargneRetraiteRetenuePourRFR = Math.max(0, chargesImputees - (chargesDeductibles - epargneRetraiteDeduite));

  return {
    sommesAAjouter,
    deficitsAnterieursImputes,
    chargesDeductibles,
    chargesImputees,
    epargneRetraiteDeduite,
    epargneRetraiteRetenuePourRFR,
    incidenceRevenuImposable: sommesAAjouter - deficitsAnterieursImputes - chargesImputees,
  };
}
