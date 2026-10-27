import { ChargesDeductiblesInput, RevenusCapitauxMobiliersInput } from './types';

/**
 * Plafond de la pension alimentaire à un enfant majeur, par enfant (art. 156 II 2° CGI) :
 * brochure IR 2026. Doublé si le parent entretient seul un enfant marié/pacsé ou chargé de famille.
 */
export const PLAFOND_PENSION_ENFANT_MAJEUR = 6855;
/**
 * Déduction forfaitaire par personne de plus de 75 ans accueillie (art. 156 II 2° ter CGI) :
 * brochure IR 2026.
 */
export const PLAFOND_ACCUEIL_PERSONNE_AGEE = 4075;
/** Majoration des pensions fixées par une décision de justice définitive avant le 1.1.2006 (6GI, 6GJ, 6GP). */
export const MAJORATION_PENSION_AVANT_2006 = 1.25;
/** Fraction déductible de la CSG prélevée à la source sur 2BH/2DF (art. 154 quinquies II CGI). */
export const TAUX_CSG_DEDUCTIBLE = 0.068;
/** Grosses réparations des nus-propriétaires imputables sur le revenu global (art. 156 I 3° CGI). */
export const PLAFOND_GROSSES_REPARATIONS = 25000;

const montant = (v: number | null) => Math.max(0, v ?? 0);

/** Cases du cadre 2 utiles à la CSG déductible de l'année (formule du simulateur DGFiP). */
export type CapitauxMobiliersCSG = Pick<RevenusCapitauxMobiliersInput,
  'case2bh' | 'case2df' | 'case2op' | 'case2dc' | 'case2ch' | 'case2ts' | 'case2tr' | 'case2tz' | 'case2tt'
  | 'case2dm' | 'case2vv' | 'case2ww' | 'case2yy' | 'case2zz' | 'case2vn' | 'case2vo' | 'case2vp'>;

/**
 * CSG déductible de l'année sur 2BH/2DF, reprise de la calculette IR DGFiP
 * (sources revenus 2024, `res-ser1.m`, variable DDCSG) :
 * - avec 2OP : 6,8 % de min(2BH + 2DF, revenus du cadre 2 imposés au barème) ;
 * - sans 2OP : 2BH ignoré, 6,8 % de min(2DF, produits d'assurance-vie au barème
 *   de plein droit 2CH + 2YY + 2VN), montants bruts avant abattement.
 * Les cases au quotient (RDC, RCH, RTS, RTR, RYY) ne sont pas saisies dans l'outil.
 */
export function csgDeductibleCapitauxMobiliers(cm: CapitauxMobiliersCSG): number {
  const avBaremePleinDroit = montant(cm.case2ch) + montant(cm.case2yy) + montant(cm.case2vn);
  if (!cm.case2op) return Math.round(TAUX_CSG_DEDUCTIBLE * Math.min(montant(cm.case2df), avBaremePleinDroit));
  const imposesAuBareme = avBaremePleinDroit + [cm.case2dc, cm.case2ts, cm.case2tr, cm.case2tz, cm.case2tt,
    cm.case2dm, cm.case2vv, cm.case2ww, cm.case2zz, cm.case2vo, cm.case2vp].reduce<number>((t, v) => t + montant(v), 0);
  return Math.round(TAUX_CSG_DEDUCTIBLE * Math.min(montant(cm.case2bh) + montant(cm.case2df), imposesAuBareme));
}

/** Report reportable d'une année vers l'imposition des revenus 2026. */
export interface ReliquatAnnuel {
  annee: number;
  montant: number;
}

/** Épargne retraite d'un déclarant (6NS + 6RS face à 6PS, ou 6NT + 6RT face à 6PT). */
export interface EpargneRetraiteDeclarant {
  /** Cotisations déduites, avant limite du revenu global. */
  deduit: number;
  /** Plafond 6PS/6PT non consommé : estimation du report (l'avis ne détaille pas le plafond par année). */
  plafondNonUtilise: number;
  /** Cotisations au-delà du plafond : ni déductibles ni reportables. */
  cotisationsPerdues: number;
}

export interface ChargesDeductiblesResult {
  /** 6GH : ajouté au revenu imposable avant toute imputation. */
  sommesAAjouter: number;
  /** CSG déductible de l'année sur 2BH/2DF (`csgDeductibleCapitauxMobiliers`), ajoutée d'office à 6DE ; comprise dans `chargesDeductibles`. */
  csgDeductibleAutomatique: number;
  /** 6FA à 6FL imputés, les plus anciens d'abord, dans la limite du revenu global. */
  deficitsAnterieursImputes: number;
  /** Charges du cadre 6 après plafonds, avant limite du revenu global. */
  chargesDeductibles: number;
  /** Charges effectivement imputées (le revenu global ne descend pas sous 0). */
  chargesImputees: number;
  /** Épargne retraite déduite (6NS/6RS, 6NT/6RT, 6NU/6RU), comprise dans `chargesImputees`. */
  epargneRetraiteDeduite: number;
  /** Épargne retraite effectivement imputée : réintégrée au RFR (art. 1417 IV 1° a CGI). */
  epargneRetraiteRetenuePourRFR: number;
  /** Épargne retraite par déclarant, mutualisation 6QR appliquée si cochée. */
  epargneRetraiteDeclarant1: EpargneRetraiteDeclarant;
  epargneRetraiteDeclarant2: EpargneRetraiteDeclarant;
  /** Personne à charge (6NU + 6RU face à 6PU), hors mutualisation 6QR. */
  epargneRetraitePersonneCharge: EpargneRetraiteDeclarant;
  /** Sans 6QR : déduction supplémentaire qu'apporterait la mutualisation des plafonds (0 sinon). */
  gainMutualisation: number;
  /** Déficits 2020 à 2024 non imputés, reportables sur les revenus 2026. */
  deficitsReportables: ReliquatAnnuel[];
  /** Reliquat de 6FA (déficit 2019) : sixième et dernière année d'imputation, définitivement perdu. */
  deficitPerdu: number;
  /** Grosses réparations 2016 et 2017 non imputées (plafond de 25 000 € ou revenu insuffisant), reportables. */
  grossesReparationsReportables: ReliquatAnnuel[];
  /** Reliquat de 6HP (dépenses 2015) : dixième et dernière année de report, expiré. */
  grossesReparationsPerdues: number;
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
 *
 * CSG déductible de l'année sur 2BH/2DF : voir `csgDeductibleCapitauxMobiliers`,
 * calculée d'office en plus de 6DE (à ne pas y reporter).
 *
 * Charges imputées en partie (revenu insuffisant) : les grosses réparations,
 * reportables, sont réputées imputées en dernier, juste après l'épargne
 * retraite (réintégrée au RFR), pour limiter les charges définitivement perdues.
 * Les reliquats 6FA (déficit 2019, art. 156 I CGI : 6 ans) et 6HP (dépenses
 * 2015, art. 156 II 2° quater : 10 ans) expirent avec les revenus 2025.
 */
export function calculerChargesDeductibles(
  input: ChargesDeductiblesInput,
  revenuBrutGlobal: number,
  capitauxMobiliers: CapitauxMobiliersCSG | null = null,
): ChargesDeductiblesResult {
  const sommesAAjouter = montant(input.case6gh);
  const csgDeductibleAutomatique = capitauxMobiliers ? csgDeductibleCapitauxMobiliers(capitauxMobiliers) : 0;
  let disponible = Math.max(0, revenuBrutGlobal + sommesAAjouter);

  const deficits = [input.case6fa, input.case6fb, input.case6fc, input.case6fd, input.case6fe, input.case6fl];
  let deficitsAnterieursImputes = 0;
  const reliquatsDeficits: number[] = [];
  for (const d of deficits) {
    const impute = Math.min(montant(d), disponible);
    deficitsAnterieursImputes += impute;
    disponible -= impute;
    reliquatsDeficits.push(montant(d) - impute);
  }
  const deficitPerdu = reliquatsDeficits[0];
  const deficitsReportables = reliquatsDeficits.slice(1)
    .map((m, i) => ({ annee: 2020 + i, montant: m }))
    .filter(r => r.montant > 0);

  const pensionEnfantMajeur = (v: number | null, entretienSeul = false) =>
    Math.min(montant(v), PLAFOND_PENSION_ENFANT_MAJEUR * (entretienSeul ? 2 : 1));
  // 6GI/6GJ majorés avant plafonnement par enfant ; 6GP majoré sans plafond.
  const majoree = (v: number | null) => montant(v) * MAJORATION_PENSION_AVANT_2006;
  const pensions = pensionEnfantMajeur(input.case6el, input.entretienSeul6el) + pensionEnfantMajeur(input.case6em, input.entretienSeul6em)
    + pensionEnfantMajeur(majoree(input.case6gi)) + pensionEnfantMajeur(majoree(input.case6gj))
    + montant(input.case6gu) + majoree(input.case6gp);

  const cotisations1 = montant(input.case6ns) + montant(input.case6rs);
  const cotisations2 = montant(input.case6nt) + montant(input.case6rt);
  const plafond1 = montant(input.case6ps);
  const plafond2 = montant(input.case6pt);
  // Chacun s'impute d'abord sur son plafond ; avec 6QR, l'excédent de l'un s'impute sur le solde de l'autre.
  const propre1 = Math.min(cotisations1, plafond1);
  const propre2 = Math.min(cotisations2, plafond2);
  const transfert1vers2 = input.case6qr ? Math.min(cotisations1 - propre1, plafond2 - propre2) : 0;
  const transfert2vers1 = input.case6qr ? Math.min(cotisations2 - propre2, plafond1 - propre1) : 0;
  const declarant = (cotisations: number, plafond: number, propre: number, recu: number, cede: number): EpargneRetraiteDeclarant => ({
    deduit: propre + cede,
    plafondNonUtilise: plafond - propre - recu,
    cotisationsPerdues: cotisations - propre - cede,
  });
  const epargneRetraiteDeclarant1 = declarant(cotisations1, plafond1, propre1, transfert2vers1, transfert1vers2);
  const epargneRetraiteDeclarant2 = declarant(cotisations2, plafond2, propre2, transfert1vers2, transfert2vers1);
  const cotisationsPac = montant(input.case6nu) + montant(input.case6ru);
  const plafondPac = montant(input.case6pu);
  const proprePac = Math.min(cotisationsPac, plafondPac);
  const epargneRetraitePersonneCharge = declarant(cotisationsPac, plafondPac, proprePac, 0, 0);
  const epargneRetraiteDeduite = epargneRetraiteDeclarant1.deduit + epargneRetraiteDeclarant2.deduit
    + epargneRetraitePersonneCharge.deduit;
  const gainMutualisation = input.case6qr
    ? 0
    : Math.min(cotisations1 + cotisations2, plafond1 + plafond2) - propre1 - propre2;

  // Sans nombre saisi, un montant 6EU vaut pour une personne accueillie.
  const personnesAccueillies = input.case6ev ?? (montant(input.case6eu) > 0 ? 1 : 0);
  const accueil = Math.min(montant(input.case6eu), Math.max(0, personnesAccueillies) * PLAFOND_ACCUEIL_PERSONNE_AGEE);
  const reparations = [input.case6hp, input.case6hq, input.case6hr].map(montant);
  const grossesReparations = Math.min(reparations[0] + reparations[1] + reparations[2], PLAFOND_GROSSES_REPARATIONS);

  const autresCharges = montant(input.case6de) + csgDeductibleAutomatique + pensions
    + montant(input.case6dg) + montant(input.case6dd) + accueil;
  const chargesDeductibles = autresCharges + epargneRetraiteDeduite + grossesReparations;
  const chargesImputees = Math.min(chargesDeductibles, disponible);
  const epargneRetraiteRetenuePourRFR = Math.min(epargneRetraiteDeduite, Math.max(0, chargesImputees - autresCharges));
  // Grosses réparations imputées les plus anciennes d'abord, dans la limite de 25 000 € et du revenu restant.
  let reparationsImputables = Math.max(0, chargesImputees - autresCharges - epargneRetraiteDeduite);
  const reliquatsReparations = reparations.map(m => {
    const impute = Math.min(m, reparationsImputables);
    reparationsImputables -= impute;
    return m - impute;
  });
  const grossesReparationsPerdues = reliquatsReparations[0];
  const grossesReparationsReportables = reliquatsReparations.slice(1)
    .map((m, i) => ({ annee: 2016 + i, montant: m }))
    .filter(r => r.montant > 0);

  return {
    sommesAAjouter,
    csgDeductibleAutomatique,
    deficitsAnterieursImputes,
    chargesDeductibles,
    chargesImputees,
    epargneRetraiteDeduite,
    epargneRetraiteRetenuePourRFR,
    epargneRetraiteDeclarant1,
    epargneRetraiteDeclarant2,
    epargneRetraitePersonneCharge,
    gainMutualisation,
    deficitsReportables,
    deficitPerdu,
    grossesReparationsReportables,
    grossesReparationsPerdues,
    incidenceRevenuImposable: sommesAAjouter - deficitsAnterieursImputes - chargesImputees,
  };
}
