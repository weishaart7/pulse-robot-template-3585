import { differenceInCalendarMonths } from 'date-fns';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';

// Simulateur de rentabilité locative — location nue uniquement (régimes
// micro-foncier / réel). LMNP/LMP et projection pluriannuelle hors périmètre.

export const PLAFOND_DEFICIT_FONCIER = 10_700;
export const TAUX_ABATTEMENT_MICRO_FONCIER = 0.30;
export const TAUX_PRELEVEMENTS_SOCIAUX = 0.172;

export interface AmortissementResult {
  mensualiteCredit: number;
  mensualiteAssurance: number;
  /** Intérêts d'emprunt dus sur les 12 prochaines échéances à compter d'aujourd'hui. */
  interetsAnnee: number;
  /** Assurance emprunteur due sur les 12 prochaines échéances (mensualité × 12, capée à la durée restante). */
  assuranceAnnee: number;
  capitalEmprunte: number;
}

export interface RentabiliteMicroFoncier {
  revenuImposable: number;
  impotRevenu: number;
  prelevementsSociaux: number;
  rendementNetNet: number | null;
}

export interface RentabiliteReel {
  chargesDeductibles: number;
  resultatFoncier: number;
  /** Part du déficit imputable sur le revenu global, plafonnée à 10 700 €/an (hors intérêts/assurance). */
  deficitImputableRevenuGlobal: number;
  /** Économie d'impôt potentielle liée à l'imputation du déficit (informatif, non intégré au rendement net-net). */
  economieImpotPotentielle: number;
  impotRevenu: number;
  prelevementsSociaux: number;
  rendementNetNet: number | null;
}

export interface RentabiliteResult {
  prixAcquisitionTotal: number;
  loyersAnnuels: number;
  chargesAnnuelles: number;
  amortissement: AmortissementResult;
  cashflowNetMensuel: number;
  rendementBrut: number | null;
  rendementNet: number | null;
  microFoncier: RentabiliteMicroFoncier;
  reel: RentabiliteReel;
  regimeRecommande: 'micro-foncier' | 'reel' | 'equivalent';
}

export function computePrixAcquisitionTotal(asset: Asset): number {
  return (
    (asset.montant_immeuble || 0) +
    (asset.frais_agence || 0) +
    (asset.frais_notaire || 0) +
    (asset.frais_bancaires || 0) +
    (asset.frais_hypotheque || 0) +
    (asset.travaux_renovation || 0) +
    (asset.travaux_construction || 0)
  );
}

const REVENU_PERIODICITE_FACTOR: Record<string, number> = {
  Mensuelle: 12,
  Trimestrielle: 4,
  Semestrielle: 2,
  Annuelle: 1,
};

// asset_revenus stocke un montant "brut" (non annualisé) avec une périodicité
// capitalisée — convention distincte de asset_charges (voir ci-dessous).
export function annualiserRevenu(revenu: Pick<AssetRevenu, 'montant' | 'periodicite'>): number {
  const facteur = REVENU_PERIODICITE_FACTOR[revenu.periodicite] ?? 1;
  return revenu.montant * facteur;
}

const CHARGE_PERIODICITE_FACTOR: Record<string, number> = {
  mensuelle: 12,
  trimestrielle: 4,
  annuelle: 1,
  // 'ponctuelle' n'est pas produite par ChargeForm et n'a pas vocation à être
  // annualisée (dépense non récurrente) : exclue des charges annuelles.
  ponctuelle: 0,
};

// asset_charges stocke déjà un montant annualisé pour "semestrielle" (doublé et
// fusionné dans 'annuelle' à l'écriture, cf. ChargeForm.tsx) : pas de cas à gérer ici.
export function annualiserCharge(charge: Pick<AssetCharge, 'montant' | 'periodicite'>): number {
  const facteur = CHARGE_PERIODICITE_FACTOR[charge.periodicite] ?? 1;
  return charge.montant * facteur;
}

export function computeLoyersAnnuels(revenus: AssetRevenu[]): number {
  return revenus.reduce((total, r) => total + annualiserRevenu(r), 0);
}

export function computeChargesAnnuelles(charges: AssetCharge[]): number {
  return charges.reduce((total, c) => total + annualiserCharge(c), 0);
}

/**
 * Amortissement classique à taux et mensualité constants. Le point de départ du
 * prêt n'est pas stocké en base : `date_acquisition` sert de proxy pour dater le
 * démarrage du crédit. Limite V1 assumée : en cas de refinancement (démarrage du
 * crédit different de l'acquisition), le capital restant dû calculé — et donc les
 * intérêts de l'année — sera imprécis. Cas non traité pour l'instant.
 */
export function computeAmortissement(asset: Asset, aujourdhui: Date = new Date()): AmortissementResult {
  const zero: AmortissementResult = {
    mensualiteCredit: 0,
    mensualiteAssurance: 0,
    interetsAnnee: 0,
    assuranceAnnee: 0,
    capitalEmprunte: 0,
  };

  if (!asset.financement_actif || !asset.financement_duree_mois || asset.financement_duree_mois <= 0) {
    return zero;
  }

  const prixAcquisitionTotal = computePrixAcquisitionTotal(asset);
  const capitalEmprunte = Math.max(0, prixAcquisitionTotal - (asset.financement_apport || 0));
  if (capitalEmprunte <= 0) {
    return zero;
  }

  const dureeMois = asset.financement_duree_mois;
  const tauxMensuel = (asset.financement_taux_credit || 0) / 100 / 12;
  const mensualiteCredit = tauxMensuel > 0
    ? (capitalEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -dureeMois))
    : capitalEmprunte / dureeMois;
  // Assurance emprunteur calculée sur le capital initial, convention constante
  // (pas de recalcul sur capital restant dû) — hypothèse standard en V1.
  const mensualiteAssurance = capitalEmprunte * ((asset.financement_taux_assurance || 0) / 100) / 12;

  const moisEcoules = asset.date_acquisition
    ? Math.max(0, differenceInCalendarMonths(aujourdhui, new Date(asset.date_acquisition)))
    : 0;

  if (moisEcoules >= dureeMois) {
    // Prêt déjà soldé : plus d'intérêts ni d'assurance à venir.
    return { mensualiteCredit, mensualiteAssurance, interetsAnnee: 0, assuranceAnnee: 0, capitalEmprunte };
  }

  // Simule le tableau d'amortissement jusqu'au mois écoulé pour obtenir le
  // capital restant dû actuel, puis cumule les intérêts des 12 prochaines
  // échéances (ou moins si le prêt se termine avant).
  let capitalRestantDu = capitalEmprunte;
  for (let mois = 1; mois <= moisEcoules; mois++) {
    const interet = capitalRestantDu * tauxMensuel;
    const capitalAmorti = mensualiteCredit - interet;
    capitalRestantDu = Math.max(0, capitalRestantDu - capitalAmorti);
  }

  const echeancesRestantes = dureeMois - moisEcoules;
  const nbEcheancesAnnee = Math.min(12, echeancesRestantes);
  let interetsAnnee = 0;
  for (let i = 0; i < nbEcheancesAnnee; i++) {
    const interet = capitalRestantDu * tauxMensuel;
    interetsAnnee += interet;
    const capitalAmorti = mensualiteCredit - interet;
    capitalRestantDu = Math.max(0, capitalRestantDu - capitalAmorti);
  }
  const assuranceAnnee = mensualiteAssurance * nbEcheancesAnnee;

  return { mensualiteCredit, mensualiteAssurance, interetsAnnee, assuranceAnnee, capitalEmprunte };
}

export function computeRentabilite(
  asset: Asset,
  revenus: AssetRevenu[],
  charges: AssetCharge[],
  tmi: number,
): RentabiliteResult {
  const prixAcquisitionTotal = computePrixAcquisitionTotal(asset);
  const loyersAnnuels = computeLoyersAnnuels(revenus);
  const chargesAnnuelles = computeChargesAnnuelles(charges);
  const amortissement = computeAmortissement(asset);
  const { mensualiteCredit, mensualiteAssurance, interetsAnnee, assuranceAnnee } = amortissement;

  const cashflowNetMensuel =
    (loyersAnnuels - chargesAnnuelles - mensualiteCredit * 12 - mensualiteAssurance * 12) / 12;

  const rendementBrut = prixAcquisitionTotal > 0 ? loyersAnnuels / prixAcquisitionTotal : null;
  const rendementNet = prixAcquisitionTotal > 0 ? (loyersAnnuels - chargesAnnuelles) / prixAcquisitionTotal : null;

  // Micro-foncier
  const revenuImposableMicro = loyersAnnuels * (1 - TAUX_ABATTEMENT_MICRO_FONCIER);
  const impotMicro = revenuImposableMicro * tmi;
  const psMicro = revenuImposableMicro * TAUX_PRELEVEMENTS_SOCIAUX;
  const rendementNetNetMicro = prixAcquisitionTotal > 0
    ? rendementNet! - (impotMicro + psMicro) / prixAcquisitionTotal
    : null;

  // Réel — déficit foncier : on isole la part hors intérêts/assurance, seule
  // imputable sur le revenu global (plafond 10 700 €/an, pas de report du
  // surplus en V1). Les intérêts + assurance en déficit ne sont reportables que
  // sur les revenus fonciers des 10 années suivantes : non modélisé, non affiché.
  const resultatHorsFinancier = loyersAnnuels - chargesAnnuelles;
  const deficitImputableRevenuGlobal = resultatHorsFinancier < 0
    ? Math.min(PLAFOND_DEFICIT_FONCIER, Math.abs(resultatHorsFinancier))
    : 0;
  const economieImpotPotentielle = deficitImputableRevenuGlobal * tmi;

  const chargesDeductibles = chargesAnnuelles + interetsAnnee + assuranceAnnee;
  const resultatFoncier = loyersAnnuels - chargesDeductibles;
  const impotReel = Math.max(0, resultatFoncier) * tmi;
  const psReel = Math.max(0, resultatFoncier) * TAUX_PRELEVEMENTS_SOCIAUX;
  const rendementNetNetReel = prixAcquisitionTotal > 0
    ? rendementNet! - (impotReel + psReel) / prixAcquisitionTotal
    : null;

  const netAnnuelMicro = (loyersAnnuels - chargesAnnuelles) - impotMicro - psMicro;
  const netAnnuelReel = (loyersAnnuels - chargesAnnuelles) - impotReel - psReel + economieImpotPotentielle;
  const regimeRecommande: RentabiliteResult['regimeRecommande'] =
    netAnnuelMicro === netAnnuelReel ? 'equivalent' : netAnnuelMicro > netAnnuelReel ? 'micro-foncier' : 'reel';

  return {
    prixAcquisitionTotal,
    loyersAnnuels,
    chargesAnnuelles,
    amortissement,
    cashflowNetMensuel,
    rendementBrut,
    rendementNet,
    microFoncier: {
      revenuImposable: revenuImposableMicro,
      impotRevenu: impotMicro,
      prelevementsSociaux: psMicro,
      rendementNetNet: rendementNetNetMicro,
    },
    reel: {
      chargesDeductibles,
      resultatFoncier,
      deficitImputableRevenuGlobal,
      economieImpotPotentielle,
      impotRevenu: impotReel,
      prelevementsSociaux: psReel,
      rendementNetNet: rendementNetNetReel,
    },
    regimeRecommande,
  };
}
