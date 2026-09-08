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
 * utilisateur comparant Kairos au simulateur officiel de la DGFiP : le
 * détail du calcul y affiche explicitement « CSG-CRDS 11,10 % » (10,6+0,5)
 * et « prélèvement de solidarité 7,5 % », soit 18,6 % au total.
 */
export const TAUX_PS_CAPITAUX_MOBILIERS = 0.186;

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
   * corrigé » ci-dessus.
   */
  baseImposable: number;
  prelevementsSociaux: number;
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
 * 2CG/2BH/2DF/2DG/2DI/2EE (lignes PS/RFR déjà hors périmètre de l'IR) n'ont
 * pas leur place ici : les premiers sont des crédits d'IR, les seconds sont
 * déjà des montants de PS ou de RFR, pas une base sur laquelle appliquer un
 * taux.
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

  const baseImposable = dividendesBrut + sansAbattement + revenusReputesDistribuesSansMajoration
    + contratsNonLiberatoiresSansAbattement;

  return {
    baseImposable,
    prelevementsSociaux: baseImposable * TAUX_PS_CAPITAUX_MOBILIERS,
    casesHorsPerimetre: CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE,
  };
}
