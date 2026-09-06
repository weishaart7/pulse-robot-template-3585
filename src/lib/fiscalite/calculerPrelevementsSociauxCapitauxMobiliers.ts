import { RevenusCapitauxMobiliersInput } from './types';

/**
 * Taux global des prélèvements sociaux (CSG 9,2 % + CRDS 0,5 % + prélèvement
 * de solidarité 7,5 %) applicable aux revenus de capitaux mobiliers
 * « prélevés à la source » pendant l'année (dividendes, intérêts, revenus
 * réputés distribués) au titre des revenus 2025/impôt 2026.
 *
 * La LFSS 2026 relève ce taux à 18,6 % (CSG +1,4 point) pour les revenus du
 * capital financier, mais uniquement pour les « produits de placement perçus
 * à compter du 1.1.2026 » — les dividendes/intérêts 2025 (prélevés à la
 * source pendant l'année, PFU non libératoire déjà versé) restent au taux
 * historique de 17,2 %. Seuls les revenus « recouvrés par voie de rôle »
 * (ex. plus-values de cession de valeurs mobilières, non modélisées ici)
 * basculent dès les revenus 2025 — cette distinction n'a pas d'effet sur le
 * périmètre actuel du module (aucune case de plus-value mobilière n'est
 * encore saisissable).
 */
export const TAUX_PS_CAPITAUX_MOBILIERS = 0.172;

/**
 * Cases du cadre 2 volontairement exclues du calcul PS : mécanisme de
 * « taux historiques » des contrats d'assurance-vie/de capitalisation
 * (art. L136-7 CSS), qui prélève les prélèvements sociaux au fil de l'eau
 * (fonds euros) ou au dénouement (unités de compte) selon le taux en vigueur
 * à la date d'acquisition de CHAQUE fraction du gain — une donnée que
 * l'assureur reconstitue lui-même à partir de l'historique du contrat, mais
 * qu'aucune case du 2042 ne permet de recalculer à partir du seul montant net
 * déclaré. Appliquer le taux courant (17,2 %) sur ces montants produirait un
 * résultat régulièrement faux (contrats ouverts avant 1997 : PS partiellement
 * ou totalement absents ; gains antérieurs à chaque hausse de taux depuis
 * 1996 : taux historique inférieur) — non modélisé plutôt que deviné.
 * Couvre aussi bien les produits (2CH/2DH/2VV/2WW, 2XX/2YY/2ZZ) que les gains
 * de cession (2VM/2VN/2VO/2VP), qui suivent le même régime PS que le contrat
 * dont ils sont issus (brochure DGFiP IR 2026 p.131). 2XX est par ailleurs
 * déjà prélevé à titre définitif (voir calculerRevenuCapitauxMobiliers.ts).
 */
export const CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE = [
  'case2ch', 'case2dh', 'case2vv', 'case2ww',
  'case2xx', 'case2yy', 'case2zz',
  'case2vm', 'case2vn', 'case2vo', 'case2vp',
] as const;

export interface PrelevementsSociauxCapitauxMobiliersResult {
  /**
   * Base soumise aux PS à 17,2 % : dividendes/revenus assimilés (2DC/2FU) —
   * sur leur montant BRUT, l'abattement de 40 % étant strictement réservé au
   * calcul de l'IR (art. 158-3 CGI, sans effet sur l'assiette PS) —, intérêts
   * et produits sans abattement (2TS/2TR/2TT/2TQ/2TZ), et revenus réputés
   * distribués (2GO). 2GO est retenu ici SANS la majoration de 25 % qui
   * s'applique pourtant à l'IR (art. 158-7-2° CGI) : le Conseil
   * constitutionnel a jugé ce coefficient inapplicable à l'assiette des
   * prélèvements sociaux (décision n° 2016-610 QPC) — seul le montant brut
   * de 2GO est retenu ici, contrairement à `revenusReputesDistribues` dans
   * `calculerRevenuCapitauxMobiliers.ts` qui l'applique pour l'IR.
   */
  baseImposable: number;
  prelevementsSociaux: number;
  casesHorsPerimetre: readonly string[];
}

/**
 * Prélèvements sociaux (CSG/CRDS/prélèvement de solidarité, 17,2 %) sur le
 * cadre 2 « Revenus de capitaux mobiliers », limités aux cases dont
 * l'assiette PS est directement déductible du montant déclaré : dividendes
 * (2DC/2FU), intérêts/produits sans abattement (2TS/2TR/2TT/2TQ/2TZ) et
 * revenus réputés distribués (2GO, sans majoration ×1,25 — voir
 * `PrelevementsSociauxCapitauxMobiliersResult.baseImposable`).
 *
 * Indépendant de l'option pour le barème (2OP) : contrairement à l'IR (PFU
 * 12,8 % ou barème selon 2OP), les prélèvements sociaux sont dus au même
 * taux que le revenu soit finalement imposé au barème ou au PFU — 2OP n'a
 * aucun effet sur ce calcul.
 *
 * Cases hors calcul : voir CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE
 * (contrats d'assurance-vie/de capitalisation, taux historiques non
 * reconstituables). 2AB/2CK (crédits d'impôt étrangers) et 2CG/2BH/2DF/2DG/
 * 2DI/2EE (lignes PS/RFR déjà hors périmètre de l'IR) n'ont pas leur place
 * ici : les premiers sont des crédits d'IR, les seconds sont déjà des
 * montants de PS ou de RFR, pas une base sur laquelle appliquer un taux.
 */
export function calculerPrelevementsSociauxCapitauxMobiliers(
  input: RevenusCapitauxMobiliersInput,
): PrelevementsSociauxCapitauxMobiliersResult {
  const dividendesBrut = (input.case2dc ?? 0) + (input.case2fu ?? 0);
  const sansAbattement = (input.case2ts ?? 0) + (input.case2tr ?? 0) + (input.case2tt ?? 0)
    + (input.case2tq ?? 0) + (input.case2tz ?? 0);
  const revenusReputesDistribuesSansMajoration = input.case2go ?? 0;

  const baseImposable = dividendesBrut + sansAbattement + revenusReputesDistribuesSansMajoration;

  return {
    baseImposable,
    prelevementsSociaux: baseImposable * TAUX_PS_CAPITAUX_MOBILIERS,
    casesHorsPerimetre: CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE,
  };
}
