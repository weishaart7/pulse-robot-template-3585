import { RevenusCapitauxMobiliersInput } from './types';

/**
 * Taux global des prélèvements sociaux (CSG 10,6 % + CRDS 0,5 % + prélèvement
 * de solidarité 7,5 % = 18,6 %) applicable à la base ci-dessous, au titre des
 * revenus 2025/impôt 2026.
 *
 * **Bug corrigé — ce taux était resté à 17,2 % (ancien taux, CSG 9,2 %) dans
 * ce module, alors que la même hausse LFSS 2026 (+1,4 point de CSG) est déjà
 * appliquée ailleurs dans le code** (`calculerPrelevementsSociauxPensionsRetraitesRentes.ts`,
 * `calculerPrelevementsSociauxGainsActionnariatSalarie.ts`) pour le même
 * motif : un revenu recouvré par voie de rôle (déclaré dans la 2042
 * elle-même, jamais prélevé à la source pendant l'année) est déjà au taux
 * 2026 dès les revenus 2025 — seuls les « produits de placement » réellement
 * prélevés à la source pendant l'année (PFU non libératoire déjà versé)
 * resteraient au taux historique de 17,2 % pour 2025. Écart signalé par un
 * utilisateur comparant Aurevia au simulateur officiel de la DGFiP : le
 * détail du calcul y affiche explicitement « CSG-CRDS 11,10 % » (10,6+0,5)
 * et « prélèvement de solidarité 7,5 % », soit 18,6 % au total.
 */
export const TAUX_PS_CAPITAUX_MOBILIERS = 0.186;

/**
 * CSG (10,6 %) + CRDS (0,5 %) dues sur 2DI : revenus ayant bénéficié à tort
 * de l'exonération de CSG/CRDS réservée aux affiliés à un régime d'assurance
 * maladie de l'EEE, du Royaume-Uni ou de la Suisse — brochure DGFiP IR 2026
 * p.133 : « le montant des revenus inscrit ligne 2DI sera automatiquement
 * soumis à la CSG et à la CRDS ». Le prélèvement de solidarité de 7,5 % a
 * déjà été prélevé (2DI est inclus dans 2DG).
 */
export const TAUX_CSG_CRDS_2DI = 0.111;

/**
 * Cases du cadre 2 volontairement exclues du calcul PS : uniquement celles
 * **explicitement libellées « soumis au prélèvement libératoire »** sur le
 * CERFA (2DH, 2XX, 2VM) — un mécanisme historique où le prélèvement, lors du
 * versement, réglait définitivement IR *et* PS ensemble ; rien à recalculer.
 *
 * **Bug corrigé — toutes les autres cases de la famille assurance-vie/
 * capitalisation (2CH, 2VV, 2WW, 2YY, 2ZZ, 2VN, 2VO, 2VP) étaient exclues à
 * tort, sur l'hypothèse que leurs PS suivraient un « taux historique » non
 * reconstituable (art. L136-7 CSS).** Vérifié empiriquement sur deux cas
 * isolés (foyer célibataire, 2OP décoché) :
 * - 2GO=4 000 €/2CH=6 000 € → simulateur officiel : 1 860 € de PS, soit
 *   exactement (2GO + 2CH) × 18,6 % = 10 000 × 18,6 % — 2CH compté en
 *   totalité, montant BRUT, sans l'abattement de 4 600 €/9 200 € (réservé à
 *   l'IR, voir `calculerRevenuCapitauxMobiliers.ts`).
 * - 2VV=5 000 € seul → simulateur officiel : « Base CSG-CRDS/solidarité » =
 *   5 000 € (montant BRUT, pas le net de 400 € après abattement) → 930 € de
 *   PS, soit exactement 5 000 × 18,6 %.
 *
 * Les deux cases vérifiées (2CH : versements avant le 27.9.2017 ; 2VV :
 * versements à compter du 27.9.2017) partagent le même point commun — ni
 * l'une ni l'autre n'est libellée « soumis au prélèvement libératoire » sur
 * le CERFA, contrairement à 2DH/2XX/2VM. C'est ce critère (libératoire ou
 * non), pas la date du 27.9.2017, qui explique le résultat : les deux cases
 * testées, pourtant de part et d'autre de cette date, se comportent
 * identiquement (incluses au brut). **2WW/2YY/2ZZ/2VN/2VO/2VP suivent cette
 * même règle par cohérence de libellé (aucune n'est « soumis au prélèvement
 * libératoire »), mais n'ont pas été testées individuellement** — à vérifier
 * si un écart réapparaît sur l'une d'elles.
 */
export const CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE = [
  'case2dh', 'case2xx', 'case2vm',
] as const;

export interface PrelevementsSociauxCapitauxMobiliersResult {
  /**
   * Base soumise aux PS à 18,6 % : dividendes/revenus assimilés (2DC/2FU) —
   * sur leur montant BRUT, l'abattement de 40 % étant strictement réservé au
   * calcul de l'IR (art. 158-3 CGI, sans effet sur l'assiette PS) —, intérêts
   * et produits sans abattement (2TS/2TR/2TT/2TQ/2TZ), revenus réputés
   * distribués (2GO, SANS la majoration de 25 % qui s'applique pourtant à
   * l'IR — art. 158-7-2° CGI, le Conseil constitutionnel a jugé ce
   * coefficient inapplicable à l'assiette des prélèvements sociaux, décision
   * n° 2016-610 QPC, contrairement à `revenusReputesDistribues` dans
   * `calculerRevenuCapitauxMobiliers.ts` qui l'applique pour l'IR), et tous
   * les produits/gains de contrats d'assurance-vie non « soumis au
   * prélèvement libératoire » (2CH, 2VV, 2WW, 2YY, 2ZZ, 2VN, 2VO, 2VP) sur
   * leur montant BRUT, sans l'abattement 4 600 €/9 200 € — voir « Bug
   * corrigé » ci-dessus. Diminuée de `montantDejaSoumis`, plancher à 0.
   */
  baseImposable: number;
  /** Somme des cases ci-dessus, avant déduction des revenus déjà soumis aux PS. */
  assietteBrute: number;
  /**
   * Revenus déjà soumis aux PS à la source, exclus de la base (brochure DGFiP
   * IR 2026 p.132-133) : 2CG, 2BH, 2DF (PS complets déjà prélevés) et 2DG
   * (seul prélèvement de solidarité dû, déjà prélevé). Ces montants sont
   * aussi compris dans 2DC/2TR/2CH/2VV… : sans cette déduction, les PS
   * seraient comptés deux fois.
   */
  montantDejaSoumis: number;
  /** CSG/CRDS (11,1 %) sur 2DI, en plus des PS à 18,6 % sur `baseImposable`. */
  csgCrds2DI: number;
  /** Total : `baseImposable` × 18,6 % + `csgCrds2DI`. */
  prelevementsSociaux: number;
  /**
   * Saisies incohérentes avec la brochure (p.132-133), sans effet sur le
   * calcul : revenus « déjà soumis » (2CG/2BH/2DF/2DG) supérieurs aux
   * revenus déclarés dont ils font partie, ou 2DI non compris dans 2DG.
   */
  incoherencesSaisie: string[];
  casesHorsPerimetre: readonly string[];
}

/**
 * Prélèvements sociaux (CSG/CRDS/prélèvement de solidarité, 18,6 %) sur le
 * cadre 2 « Revenus de capitaux mobiliers », limités aux cases dont
 * l'assiette PS est directement déductible du montant déclaré : dividendes
 * (2DC/2FU), intérêts/produits sans abattement (2TS/2TR/2TT/2TQ/2TZ),
 * revenus réputés distribués (2GO, sans majoration ×1,25) et les produits/
 * gains de contrats d'assurance-vie non « soumis au prélèvement libératoire »
 * (2CH, 2VV, 2WW, 2YY, 2ZZ, 2VN, 2VO, 2VP), sans abattement — voir
 * `PrelevementsSociauxCapitauxMobiliersResult.baseImposable`.
 *
 * Indépendant de l'option pour le barème (2OP) : contrairement à l'IR (PFU
 * 12,8 % ou barème selon 2OP), les prélèvements sociaux sont dus au même
 * taux que le revenu soit finalement imposé au barème ou au PFU — 2OP n'a
 * aucun effet sur ce calcul (vérifié empiriquement pour 2GO/2CH et 2VV, 2OP
 * décoché à chaque fois — voir « Bug corrigé » ci-dessus ; non re-testé avec
 * 2OP coché).
 *
 * Cases hors calcul : voir CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE (2DH/
 * 2XX/2VM, explicitement « soumis au prélèvement libératoire » — déjà réglé
 * à la source, IR et PS ensemble). 2AB/2CK (crédits d'impôt étrangers) et
 * 2EE (RFR seul) n'ont pas leur place ici.
 *
 * **Bug corrigé — 2CG/2BH/2DF/2DG étaient ignorés** alors que la brochure
 * (p.132-133) les exclut explicitement de la base PS : ce sont des revenus
 * déjà compris dans 2DC/2TR/2CH/2VV… et dont les PS ont été prélevés à la
 * source (cas courant des comptes-titres et fonds euros français). Ils sont
 * désormais déduits de l'assiette ; 2DI (inclus dans 2DG) supporte en plus
 * la CSG/CRDS à 11,1 %.
 */
export function calculerPrelevementsSociauxCapitauxMobiliers(
  input: RevenusCapitauxMobiliersInput,
): PrelevementsSociauxCapitauxMobiliersResult {
  const dividendesBrut = (input.case2dc ?? 0) + (input.case2fu ?? 0);
  const sansAbattement = (input.case2ts ?? 0) + (input.case2tr ?? 0) + (input.case2tt ?? 0)
    + (input.case2tq ?? 0) + (input.case2tz ?? 0);
  const revenusReputesDistribuesSansMajoration = input.case2go ?? 0;
  const contratsNonLiberatoiresSansAbattement = (input.case2ch ?? 0) + (input.case2vv ?? 0)
    + (input.case2ww ?? 0) + (input.case2yy ?? 0) + (input.case2zz ?? 0)
    + (input.case2vn ?? 0) + (input.case2vo ?? 0) + (input.case2vp ?? 0);

  // 2DM : fraction exonérée d'IR des impatriés, retenue pour les PS (brochure p.135).
  const assietteBrute = dividendesBrut + sansAbattement + revenusReputesDistribuesSansMajoration
    + contratsNonLiberatoiresSansAbattement + (input.case2dm ?? 0);
  const montantDejaSoumis = (input.case2cg ?? 0) + (input.case2bh ?? 0) + (input.case2df ?? 0)
    + (input.case2dg ?? 0);
  // Plancher à 0 : des cases « déjà soumis » supérieures aux revenus déclarés relèvent d'une erreur de saisie, pas d'un crédit de PS.
  const baseImposable = Math.max(0, assietteBrute - montantDejaSoumis);
  const csgCrds2DI = (input.case2di ?? 0) * TAUX_CSG_CRDS_2DI;

  const incoherencesSaisie: string[] = [];
  if (montantDejaSoumis > assietteBrute) {
    incoherencesSaisie.push(
      'Les revenus déjà soumis aux prélèvements sociaux (2CG, 2BH, 2DF, 2DG) dépassent les revenus déclarés : '
      + 'ils doivent aussi figurer dans les lignes de revenus (2DC, 2TR, 2CH, 2VV…).',
    );
  }
  if ((input.case2di ?? 0) > (input.case2dg ?? 0)) {
    incoherencesSaisie.push('Le montant de 2DI doit être compris dans celui de 2DG.');
  }

  return {
    baseImposable,
    assietteBrute,
    montantDejaSoumis,
    csgCrds2DI,
    prelevementsSociaux: baseImposable * TAUX_PS_CAPITAUX_MOBILIERS + csgCrds2DI,
    incoherencesSaisie,
    casesHorsPerimetre: CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE,
  };
}
