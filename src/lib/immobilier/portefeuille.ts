import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import { computeAmortissement, computePrixAcquisitionTotal, computeQuotePart } from '@/lib/immobilier/rentabilite';
import { isPartsFoncieres } from '@/lib/immobilier/partsFoncieres';

// Flux d'un bien pour les indicateurs de portefeuille (Vue d'ensemble, Mes biens), extraits tels
// quels d'ImmobilierOverview pour que les totaux du portefeuille soient la somme exacte des
// indicateurs par bien. Convention propre à ces indicateurs (cf. docs/immobilier.md §2-3) : une
// périodicité non reconnue est traitée comme annuelle pour un revenu, exclue (0) pour une charge.

/**
 * Prix de revient d'un bien, base unique des rentabilités brute et nette — la même que le simulateur de
 * la fiche (computePrixAcquisitionTotal : prix de l'immeuble + frais d'acquisition et travaux), pour
 * qu'un bien affiche la même rentabilité partout. Repli sur les champs génériques de Patrimoine
 * (valeur_acquisition + frais_acquisition) pour un actif dont le coût de revient détaillé est vide.
 */
export const computePrixRevient = (asset: Asset): number => {
  const detaille = computePrixAcquisitionTotal(asset);
  return detaille > 0 ? detaille : (asset.valeur_acquisition || 0) + (asset.frais_acquisition || 0);
};

const annualFactor = (periodicite: string | undefined, defaultFactor: number): number => {
  switch ((periodicite || '').toLowerCase()) {
    case 'mensuelle': return 12;
    case 'trimestrielle': return 4;
    case 'semestrielle': return 2;
    case 'annuelle': return 1;
    default: return defaultFactor;
  }
};

const monthlyDivisor = (periodicite: string | undefined, defaultDivisor: number | null): number | null => {
  switch ((periodicite || '').toLowerCase()) {
    case 'mensuelle': return 1;
    case 'trimestrielle': return 3;
    case 'semestrielle': return 6;
    case 'annuelle': return 12;
    default: return defaultDivisor;
  }
};

export interface FluxBien {
  /** Prix de revient (computePrixRevient) × quote-part du foyer. */
  prixRevient: number;
  loyerAnnuel: number;
  chargesAnnuelles: number;
  revenusMensuels: number;
  chargesMensuelles: number;
  /** Mensualité de crédit + assurance emprunteur (0 si non financé ou soldé), × quote-part. */
  creditMensuel: number;
}

/** Flux d'un bien, pondérés par la quote-part d'indivision du foyer (100 % si non renseignée). */
export const computeFluxBien = (asset: Asset, revenus: AssetRevenu[], charges: AssetCharge[]): FluxBien => {
  const quotePart = computeQuotePart(asset) / 100;
  const prixRevient = computePrixRevient(asset) * quotePart;

  let loyerAnnuel = 0;
  let revenusMensuels = 0;
  for (const revenu of revenus) {
    const montant = (revenu.montant || 0) * quotePart;
    loyerAnnuel += montant * annualFactor(revenu.periodicite, 1);
    revenusMensuels += montant / (monthlyDivisor(revenu.periodicite, 12) as number);
  }

  // Parts foncières/forestières sans ligne de revenus : les revenus distribués sur 12 mois saisis dans
  // Patrimoine tiennent lieu de revenu annuel (jamais cumulés avec des lignes, pour ne pas compter
  // deux fois le même revenu).
  if (revenus.length === 0 && isPartsFoncieres(asset.nature) && (asset.revenus_distribues_12m || 0) > 0) {
    const montant = (asset.revenus_distribues_12m || 0) * quotePart;
    loyerAnnuel += montant;
    revenusMensuels += montant / 12;
  }

  let chargesAnnuelles = 0;
  let chargesMensuelles = 0;
  for (const charge of charges) {
    const montant = (charge.montant || 0) * quotePart;
    chargesAnnuelles += montant * annualFactor(charge.periodicite, 0);
    const divisor = monthlyDivisor(charge.periodicite, null);
    chargesMensuelles += divisor ? montant / divisor : 0;
  }

  const credit = computeAmortissement(asset);
  const creditMensuel = (credit.mensualiteCredit + credit.mensualiteAssurance) * quotePart;

  return {
    prixRevient,
    loyerAnnuel,
    chargesAnnuelles,
    revenusMensuels,
    chargesMensuelles,
    creditMensuel,
  };
};

export interface IndicateursFlux {
  /** Loyers annuels / prix de revient, en %. */
  rentabiliteBrute: number;
  /** (Loyers − charges) annuels / prix de revient, en %. */
  rentabiliteNette: number;
  /** Revenus − charges − crédit, par mois. */
  cashflowMensuel: number;
}

/** Indicateurs d'un bien ou d'une somme de biens (mêmes formules dans les deux cas). */
export const computeIndicateurs = (flux: FluxBien): IndicateursFlux => ({
  rentabiliteBrute: flux.prixRevient > 0 ? (flux.loyerAnnuel / flux.prixRevient) * 100 : 0,
  rentabiliteNette: flux.prixRevient > 0
    ? ((flux.loyerAnnuel - flux.chargesAnnuelles) / flux.prixRevient) * 100
    : 0,
  cashflowMensuel: flux.revenusMensuels - flux.chargesMensuelles - flux.creditMensuel,
});

export const sommeFlux = (flux: FluxBien[]): FluxBien =>
  flux.reduce<FluxBien>(
    (acc, f) => ({
      prixRevient: acc.prixRevient + f.prixRevient,
      loyerAnnuel: acc.loyerAnnuel + f.loyerAnnuel,
      chargesAnnuelles: acc.chargesAnnuelles + f.chargesAnnuelles,
      revenusMensuels: acc.revenusMensuels + f.revenusMensuels,
      chargesMensuelles: acc.chargesMensuelles + f.chargesMensuelles,
      creditMensuel: acc.creditMensuel + f.creditMensuel,
    }),
    { prixRevient: 0, loyerAnnuel: 0, chargesAnnuelles: 0, revenusMensuels: 0, chargesMensuelles: 0, creditMensuel: 0 },
  );
