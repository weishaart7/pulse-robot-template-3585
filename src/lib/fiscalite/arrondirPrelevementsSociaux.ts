import { TAUX_CSG_CRDS_FONCIER, TAUX_CSG_CRDS_PATRIMOINE, TAUX_PRELEVEMENT_SOLIDARITE } from './calculerPrelevementSourceDivers';

/** CSG 9,2 % + CRDS 0,5 % sur les gains 1TT/1UT (régime salarial). */
const TAUX_CSG_CRDS_ACTIVITE = 0.097;
const TAUX_CONTRIBUTION_SALARIALE_10 = 0.10;
const TAUX_CONTRIBUTION_SALARIALE_30 = 0.30;

/** Bases du foyer, toutes catégories additionnées, avant arrondi. */
export interface BasesPrelevementsSociaux {
  /** Revenus du patrimoine à 18,6 % (cadres 1 rentes et gains, 2, 3, 5). */
  patrimoine: number;
  /** Soumis à la seule CSG-CRDS du patrimoine (2DI). */
  csgCrdsPatrimoineSeule: number;
  /** Revenus fonciers à 17,2 % (2044 et cadre 4). */
  foncier: number;
  /** Produits d'assurance-vie à 17,2 % (même CSG-CRDS que le foncier, hors 8TK et 8RF). */
  assuranceVie: number;
  /** 8TK ventilé : fractions neutralisées par le crédit égal à l'impôt français. */
  neutralisePatrimoine: number;
  neutraliseFoncier: number;
  /** 8SH/8SI : exonération de CSG-CRDS de tous les revenus du patrimoine. */
  exonerationTotaleCsgCrds: boolean;
  /** 8RV/8RC/8RM et 8RF : montants exonérés de CSG-CRDS (un seul conjoint affilié). */
  exonerePatrimoine: number;
  exonereFoncier: number;
  /** 1TT/1UT : CSG-CRDS 9,7 %. */
  activite: number;
  /** Contribution salariale de 10 % (1TT/1UT, 3VN). */
  contributionSalariale10: number;
  /** Carried-interest non qualifiant (1NX/1OX) : CSG-CRDS 11,1 %, solidarité 7,5 %, contribution 10 %. */
  carriedInterest: number;
  /** Contribution salariale de 30 % (1NY/1OY). */
  contributionSalariale30: number;
}

export interface PrelevementsSociauxArrondis {
  csgCrdsPatrimoine: number;
  csgCrdsFoncier: number;
  solidarite: number;
  csgCrdsActivite: number;
  contributionSalariale10: number;
  contributionSalariale30: number;
  /** Total avant 8TK et exonération de CSG-CRDS. */
  bruts: number;
  /** Retranché par l'exonération de CSG-CRDS (8SH/8SI, 8RF…8RM). */
  reductionExoneration: number;
  /** Retranché par 8TK ventilé. */
  neutralisation8TK: number;
  total: number;
}

const positif = (v: number) => Math.max(0, v);
/** Arrondi à l'euro le plus proche, 0,50 vers le haut, après neutralisation des erreurs flottantes (29 500 × 0,111). */
const arrondi = (v: number) => Math.round(Math.round(v * 100) / 100);

/**
 * Chaque contribution est arrondie à l'euro le plus proche sur la base du foyer, toutes catégories
 * additionnées, comme sur l'avis d'imposition (vérifié sur ClickImpôts : base 29 500 € de rentes
 * viagères → CSG-CRDS 3 274,50 → 3 275 € et solidarité 2 212,50 → 2 213 €, soit 5 488 € et non
 * 5 487 €). La solidarité (7,5 %) porte sur le patrimoine et le foncier ensemble ; la CSG-CRDS
 * diffère (11,1 % contre 9,7 %). Le carried-interest non qualifiant (1NX) suit les mêmes taux que le
 * patrimoine et rejoint ses lignes ; sa contribution de 10 % rejoint celle de 1TT/3VN.
 * 8TK réduit la base de toutes les contributions, l'exonération celle de la CSG-CRDS seule.
 */
export function arrondirPrelevementsSociaux(b: BasesPrelevementsSociaux): PrelevementsSociauxArrondis {
  const lignes = (neutralise: boolean, exonere: boolean) => {
    const patrimoine = positif(b.patrimoine - (neutralise ? b.neutralisePatrimoine : 0));
    const foncier = positif(b.foncier - (neutralise ? b.neutraliseFoncier : 0));
    const csgCrdsPatrimoine = exonere && b.exonerationTotaleCsgCrds ? 0
      : arrondi(positif(patrimoine + b.csgCrdsPatrimoineSeule - (exonere ? b.exonerePatrimoine : 0)) * TAUX_CSG_CRDS_PATRIMOINE);
    const csgCrdsFoncier = exonere && b.exonerationTotaleCsgCrds ? 0
      : arrondi((positif(foncier - (exonere ? b.exonereFoncier : 0)) + b.assuranceVie) * TAUX_CSG_CRDS_FONCIER);
    return {
      csgCrdsPatrimoine: csgCrdsPatrimoine + arrondi(b.carriedInterest * TAUX_CSG_CRDS_PATRIMOINE),
      csgCrdsFoncier,
      solidarite: arrondi((patrimoine + foncier + b.assuranceVie + b.carriedInterest) * TAUX_PRELEVEMENT_SOLIDARITE),
    };
  };
  const somme = (l: ReturnType<typeof lignes>) => l.csgCrdsPatrimoine + l.csgCrdsFoncier + l.solidarite;

  const bruts = lignes(false, false);
  const apres8TK = lignes(true, false);
  const nets = lignes(true, true);
  const csgCrdsActivite = arrondi(b.activite * TAUX_CSG_CRDS_ACTIVITE);
  const contributionSalariale10 = arrondi((b.contributionSalariale10 + b.carriedInterest) * TAUX_CONTRIBUTION_SALARIALE_10);
  const contributionSalariale30 = arrondi(b.contributionSalariale30 * TAUX_CONTRIBUTION_SALARIALE_30);
  const horsPatrimoine = csgCrdsActivite + contributionSalariale10 + contributionSalariale30;

  return {
    ...nets,
    csgCrdsActivite,
    contributionSalariale10,
    contributionSalariale30,
    bruts: somme(bruts) + horsPatrimoine,
    neutralisation8TK: somme(bruts) - somme(apres8TK),
    reductionExoneration: somme(apres8TK) - somme(nets),
    total: somme(nets) + horsPatrimoine,
  };
}
