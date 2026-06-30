import {
  IFIBienDirectInput,
  IFICalculInput,
  IFICalculResult,
  IFITrancheDetail,
  Money,
} from './types';

const TAUX_ABATTEMENT_RESIDENCE_PRINCIPALE = 0.3;
const TAUX_ABATTEMENT_BOIS_FORETS = 0.75;

const BAREME_IFI: Array<{ min: number; max: number; taux: number }> = [
  { min: 0, max: 800000, taux: 0 },
  { min: 800000, max: 1300000, taux: 0.005 },
  { min: 1300000, max: 2570000, taux: 0.007 },
  { min: 2570000, max: 5000000, taux: 0.010 },
  { min: 5000000, max: 10000000, taux: 0.0125 },
  { min: 10000000, max: Infinity, taux: 0.015 },
];

/**
 * Valeur déclarée d'un bien détenu directement, après application :
 * abattement résidence principale (30%), abattement bois/forêts (75%, par bien),
 * puis fraction taxable (bien mixte, en %).
 */
export function valeurDeclareeBienDirect(bien: IFIBienDirectInput): Money {
  let valeur = bien.valeurTotale || 0;

  if (bien.abattementResidencePrincipale) {
    valeur *= 1 - TAUX_ABATTEMENT_RESIDENCE_PRINCIPALE;
  }

  if (bien.abattementBoisForets) {
    valeur *= 1 - TAUX_ABATTEMENT_BOIS_FORETS;
  }

  if (bien.bienMixte && bien.fractionTaxable != null) {
    valeur *= bien.fractionTaxable / 100;
  }

  return valeur;
}

/**
 * Assiette taxable = biens directs (valeur déclarée) + biens indirects − passifs déductibles.
 * Les biens professionnels exonérés ne sont volontairement pas un paramètre de cette fonction :
 * ils doivent être exclus en amont, avant construction de IFICalculInput.
 */
export function calculerAssietteTaxable(
  input: Pick<IFICalculInput, 'immeublesBatis' | 'immeublesNonBatis' | 'biensIndirects' | 'passifs'>
): { totalActifBrut: Money; totalPassifs: Money; assietteTaxable: Money } {
  const totalDirects = [...input.immeublesBatis, ...input.immeublesNonBatis].reduce(
    (sum, bien) => sum + valeurDeclareeBienDirect(bien),
    0
  );
  const totalIndirects = input.biensIndirects.reduce((sum, bien) => sum + (bien.valeurBien || 0), 0);
  const totalActifBrut = totalDirects + totalIndirects;
  const totalPassifs = input.passifs.reduce((sum, passif) => sum + (passif.montant || 0), 0);
  const assietteTaxable = Math.max(0, totalActifBrut - totalPassifs);

  return { totalActifBrut, totalPassifs, assietteTaxable };
}

/** Détail du calcul par tranche du barème IFI. */
export function getDetailedCalculation(assiette: Money): IFITrancheDetail[] {
  return BAREME_IFI.map(({ min, max, taux }) => {
    const montantTranche = Math.max(0, Math.min(assiette, max) - min);
    return { min, max, taux, montantTranche, impot: montantTranche * taux };
  }).filter((tranche) => tranche.montantTranche > 0);
}

/** IFI théorique avant décote, selon le barème progressif. */
export function calculerIFITheorique(assiette: Money): Money {
  return Math.round(
    getDetailedCalculation(assiette).reduce((sum, tranche) => sum + tranche.impot, 0)
  );
}

/** Décote applicable entre 1,3M€ et 1,4M€ d'assiette : 17 500 € − 1,25 % × assiette. */
export function calculerDecote(assiette: Money): Money {
  if (assiette < 1300000 || assiette > 1400000) return 0;
  return Math.max(0, 17500 - 0.0125 * assiette);
}

/**
 * Plafonnement (art. 979 CGI) : si IFI + IR/PS de l'année N excèdent 75% des revenus N-1,
 * l'excédent est déduit de l'IFI dû. La réduction ne peut pas excéder l'IFI lui-même.
 */
export function calculerPlafonnement(
  montantIFIApresDecote: Money,
  irPsN: Money,
  revenusN1: Money
): Money {
  if (!revenusN1) return 0;
  const seuil = 0.75 * revenusN1;
  const total = montantIFIApresDecote + irPsN;
  const reduction = Math.max(0, total - seuil);
  return Math.min(reduction, montantIFIApresDecote);
}

/** Orchestrateur principal du calcul IFI. */
export function computeIFI(input: IFICalculInput): IFICalculResult {
  const { totalActifBrut, totalPassifs, assietteTaxable } = calculerAssietteTaxable(input);
  const tranches = getDetailedCalculation(assietteTaxable);
  const ifiTheorique = calculerIFITheorique(assietteTaxable);
  const decote = calculerDecote(assietteTaxable);
  const montantApresDecote = Math.max(0, ifiTheorique - decote);
  const reductionPlafonnement = input.plafonnement
    ? calculerPlafonnement(montantApresDecote, input.plafonnement.irPsN, input.plafonnement.revenusN1)
    : 0;
  const ifiFinal = Math.max(0, montantApresDecote - reductionPlafonnement);

  return {
    totalActifBrut,
    totalPassifs,
    assietteTaxable,
    tranches,
    ifiTheorique,
    decote,
    montantApresDecote,
    reductionPlafonnement,
    ifiFinal,
  };
}
