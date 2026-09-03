import { differenceInCalendarMonths } from 'date-fns';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';

// Simulateur de rentabilité locative — location nue (micro-foncier / réel) et
// LMNP (micro-BIC / réel). LMP et projection pluriannuelle hors périmètre.

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

// --- LMNP (micro-BIC / réel) -------------------------------------------------
// Fonctions déplacées depuis LMNPDetailView.tsx (comportement/formules
// inchangés) pour être partagées avec le simulateur de rentabilité LMNP,
// au lieu d'être piégées dans le composant — cf. docs/immobilier.md §2.

export const TAUX_PRELEVEMENTS_SOCIAUX_LMNP = 0.186;

/** Part du prix d'achat non amortissable, par zone géographique (LMNP). */
export const ZONE_TERRAIN_PERCENTAGES: Record<string, number> = {
  'Zones rurales et villes moyennes': 15,
  'Grandes villes': 20,
  'Hyper-centre / zones tendues': 30,
};

export interface AmortissementLigneLMNP {
  composant: string;
  duree: number;
  quotePart: number;
  base: number;
  amortissementAnnuel: number;
}

/**
 * Tableau d'amortissement comptable de l'immeuble par composant (méthode par
 * composants). Quotes-parts du bâtiment (Aménagements intérieurs 18 %,
 * Étanchéité 7 %, Toiture 8 %, Installations électriques 6 %, Gros œuvre 41 %)
 * remises à l'échelle ÷0,8 pour totaliser 100 % (bug documenté et corrigé,
 * cf. docs/immobilier.md §3) — poids relatifs et durées inchangés.
 */
export function computeAmortissementImmeubleLMNP(
  prixAchat: number,
  terrainPct: number,
  meubles: number,
  travaux: number,
): AmortissementLigneLMNP[] {
  const valeurTerrain = prixAchat * (terrainPct / 100);
  const valeurBatiment = prixAchat - valeurTerrain;

  const lines: AmortissementLigneLMNP[] = [];

  if (meubles > 0) {
    lines.push({
      composant: 'Mobilier',
      duree: 5,
      quotePart: 100,
      base: meubles,
      amortissementAnnuel: meubles / 5,
    });
  }

  if (travaux > 0) {
    lines.push({
      composant: 'Travaux',
      duree: 10,
      quotePart: 100,
      base: travaux,
      amortissementAnnuel: travaux / 10,
    });
  }

  const composantsBatiment = [
    { composant: 'Aménagements intérieurs', duree: 12, pct: 18 / 0.8 },
    { composant: 'Étanchéité', duree: 25, pct: 7 / 0.8 },
    { composant: 'Toiture', duree: 25, pct: 8 / 0.8 },
    { composant: 'Installations électriques', duree: 30, pct: 6 / 0.8 },
    { composant: 'Gros œuvre', duree: 75, pct: 41 / 0.8 },
  ];

  for (const c of composantsBatiment) {
    const base = valeurBatiment * (c.pct / 100);
    lines.push({
      composant: c.composant,
      duree: c.duree,
      quotePart: c.pct,
      base,
      amortissementAnnuel: base / c.duree,
    });
  }

  return lines;
}

export interface ResultatReelLMNP {
  resultatAvantAmortissement: number;
  /** Amortissement effectivement déduit cette année (plafonné, ne peut pas créer/aggraver un déficit). */
  amortissementDeductible: number;
  /** Excédent d'amortissement non déduit — non reporté automatiquement (dette assumée). */
  amortissementNonDeductible: number;
  /**
   * Résultat fiscal réel, potentiellement négatif si les charges seules (hors
   * amortissement) dépassent les revenus — déficit réel, distinct de l'excédent
   * d'amortissement, cf. docs/immobilier.md §3.
   */
  resultatFiscal: number;
}

/**
 * Résultat du régime réel LMNP, avec plafonnement de l'amortissement déductible
 * (l'amortissement ne peut pas créer ni aggraver un déficit). `totalCharges` doit
 * inclure toutes les charges déductibles (charges réelles + intérêts d'emprunt +
 * assurance emprunteur pour le simulateur de rentabilité).
 */
export function computeResultatReelLMNP(
  totalRevenus: number,
  totalCharges: number,
  totalAmortissement: number,
): ResultatReelLMNP {
  const resultatAvantAmortissement = totalRevenus - totalCharges;
  const amortissementDeductible = Math.min(totalAmortissement, Math.max(0, resultatAvantAmortissement));
  const amortissementNonDeductible = totalAmortissement - amortissementDeductible;
  const resultatFiscal = resultatAvantAmortissement - amortissementDeductible;

  return { resultatAvantAmortissement, amortissementDeductible, amortissementNonDeductible, resultatFiscal };
}

interface BaremeMicroBicLMNP {
  abattementTaux: number;
  plafondRecettes: number;
}

// Barème 2026, post loi Le Meur (19/11/2024) : abattement renforcé à 71 % pour
// les meublés de tourisme classés supprimé pour les revenus 2025 et suivants.
// Distinct du taux encore utilisé dans le résumé fiscal existant de
// LMNPDetailView.tsx pour "Tourisme classé" à la date d'écriture — cf. fix
// dédié (commit isolé) qui aligne cet affichage sur ce même barème.
export const MICRO_BIC_LMNP_BAREME: Record<string, BaremeMicroBicLMNP> = {
  'LMNP Classique': { abattementTaux: 0.50, plafondRecettes: 83_600 },
  'Tourisme classé': { abattementTaux: 0.50, plafondRecettes: 83_600 },
  'Tourisme non classé': { abattementTaux: 0.30, plafondRecettes: 15_000 },
};

const BAREME_MICRO_BIC_PAR_DEFAUT: BaremeMicroBicLMNP = MICRO_BIC_LMNP_BAREME['LMNP Classique'];

export interface MicroBicLMNPResult {
  abattementTaux: number;
  plafondRecettes: number;
  revenuImposable: number;
  depassementPlafond: boolean;
}

export function computeMicroBicLMNP(loyersAnnuels: number, typeLocationLmnp?: string): MicroBicLMNPResult {
  const bareme = (typeLocationLmnp && MICRO_BIC_LMNP_BAREME[typeLocationLmnp]) || BAREME_MICRO_BIC_PAR_DEFAUT;
  return {
    abattementTaux: bareme.abattementTaux,
    plafondRecettes: bareme.plafondRecettes,
    revenuImposable: loyersAnnuels * (1 - bareme.abattementTaux),
    depassementPlafond: loyersAnnuels > bareme.plafondRecettes,
  };
}

export interface RentabiliteLMNPMicroBic extends MicroBicLMNPResult {
  impotRevenu: number;
  prelevementsSociaux: number;
  rendementNetNet: number | null;
}

export interface RentabiliteLMNPReel extends ResultatReelLMNP {
  chargesDeductibles: number;
  impotRevenu: number;
  prelevementsSociaux: number;
  rendementNetNet: number | null;
}

export interface RentabiliteLMNPResult {
  prixAcquisitionTotal: number;
  loyersAnnuels: number;
  chargesAnnuelles: number;
  amortissementCredit: AmortissementResult;
  amortissementImmeuble: AmortissementLigneLMNP[];
  totalAmortissementImmeuble: number;
  cashflowNetMensuel: number;
  rendementBrut: number | null;
  rendementNet: number | null;
  microBic: RentabiliteLMNPMicroBic;
  reel: RentabiliteLMNPReel;
  regimeRecommande: 'micro-bic' | 'reel' | 'equivalent';
}

export function computeRentabiliteLMNP(
  asset: Asset,
  revenus: AssetRevenu[],
  charges: AssetCharge[],
  tmi: number,
): RentabiliteLMNPResult {
  const prixAcquisitionTotal = computePrixAcquisitionTotal(asset);
  const loyersAnnuels = computeLoyersAnnuels(revenus);
  const chargesAnnuelles = computeChargesAnnuelles(charges);
  const amortissementCredit = computeAmortissement(asset);
  const { mensualiteCredit, mensualiteAssurance, interetsAnnee, assuranceAnnee } = amortissementCredit;

  const terrainPct = asset.pourcentage_terrain_force
    ? asset.pourcentage_terrain_force
    : (ZONE_TERRAIN_PERCENTAGES[asset.zone_bien || ''] || 0);
  const travaux = (asset.travaux_renovation || 0) + (asset.travaux_construction || 0);
  const amortissementImmeuble = computeAmortissementImmeubleLMNP(
    asset.montant_immeuble || 0,
    terrainPct,
    asset.meubles || 0,
    travaux,
  );
  const totalAmortissementImmeuble = amortissementImmeuble.reduce((s, l) => s + l.amortissementAnnuel, 0);

  const cashflowNetMensuel =
    (loyersAnnuels - chargesAnnuelles - mensualiteCredit * 12 - mensualiteAssurance * 12) / 12;

  const rendementBrut = prixAcquisitionTotal > 0 ? loyersAnnuels / prixAcquisitionTotal : null;
  const rendementNet = prixAcquisitionTotal > 0 ? (loyersAnnuels - chargesAnnuelles) / prixAcquisitionTotal : null;

  // Micro-BIC
  const microBicBase = computeMicroBicLMNP(loyersAnnuels, asset.type_location_lmnp);
  const impotMicroBic = microBicBase.revenuImposable * tmi;
  const psMicroBic = microBicBase.revenuImposable * TAUX_PRELEVEMENTS_SOCIAUX_LMNP;
  const rendementNetNetMicroBic = prixAcquisitionTotal > 0
    ? rendementNet! - (impotMicroBic + psMicroBic) / prixAcquisitionTotal
    : null;

  // Réel — intérêts et assurance emprunteur déductibles en plus des charges réelles.
  const chargesDeductiblesReel = chargesAnnuelles + interetsAnnee + assuranceAnnee;
  const reelBase = computeResultatReelLMNP(loyersAnnuels, chargesDeductiblesReel, totalAmortissementImmeuble);
  // L'assiette IR/PS ne peut pas être négative ; le résultat fiscal, lui, reste
  // affiché tel quel (déficit réel reportable, cf. ResultatReelLMNP).
  const assietteReel = Math.max(0, reelBase.resultatFiscal);
  const impotReel = assietteReel * tmi;
  const psReel = assietteReel * TAUX_PRELEVEMENTS_SOCIAUX_LMNP;
  const rendementNetNetReel = prixAcquisitionTotal > 0
    ? rendementNet! - (impotReel + psReel) / prixAcquisitionTotal
    : null;

  const netAnnuelMicroBic = (loyersAnnuels - chargesAnnuelles) - impotMicroBic - psMicroBic;
  const netAnnuelReel = (loyersAnnuels - chargesAnnuelles) - impotReel - psReel;
  const regimeRecommande: RentabiliteLMNPResult['regimeRecommande'] =
    netAnnuelMicroBic === netAnnuelReel ? 'equivalent' : netAnnuelMicroBic > netAnnuelReel ? 'micro-bic' : 'reel';

  return {
    prixAcquisitionTotal,
    loyersAnnuels,
    chargesAnnuelles,
    amortissementCredit,
    amortissementImmeuble,
    totalAmortissementImmeuble,
    cashflowNetMensuel,
    rendementBrut,
    rendementNet,
    microBic: {
      ...microBicBase,
      impotRevenu: impotMicroBic,
      prelevementsSociaux: psMicroBic,
      rendementNetNet: rendementNetNetMicroBic,
    },
    reel: {
      ...reelBase,
      chargesDeductibles: chargesDeductiblesReel,
      impotRevenu: impotReel,
      prelevementsSociaux: psReel,
      rendementNetNet: rendementNetNetReel,
    },
    regimeRecommande,
  };
}

// --- LMP (micro-BIC / réel) --------------------------------------------------
// Réutilise computeAmortissementImmeubleLMNP (mécanique comptable identique
// entre LMNP et LMP) et computeMicroBicLMNP (barème identique, un LMP peut
// être en micro-BIC sous les mêmes seuils). Seul le traitement fiscal du
// résultat réel diffère : en LMP, le déficit BIC (y compris celui créé par
// l'amortissement) est imputable sur le revenu global sans plafond ni durée
// limitée — contrairement au foncier nu (plafond 10 700 €/an) et à LMNP
// (l'amortissement ne peut jamais créer de déficit). C'est l'avantage
// principal du statut à faire ressortir dans le comparatif.

export const TAUX_COTISATIONS_SOCIALES_LMP_DEFAUT = 0.40;

export interface ResultatReelLMP {
  /** Résultat fiscal réel LMP — peut être négatif sans plafond (déficit imputable sur le revenu global). */
  resultatFiscal: number;
  /** Part du déficit imputable sur le revenu global — sans plafond ni durée limitée en LMP. */
  deficitImputableRevenuGlobal: number;
}

/**
 * Résultat du régime réel LMP : loyers − charges déductibles − amortissement de
 * l'année, sans aucun plafonnement (à la différence de LMNP). `totalCharges`
 * doit inclure toutes les charges déductibles (charges réelles + intérêts
 * d'emprunt + assurance emprunteur pour le simulateur de rentabilité).
 */
export function computeResultatReelLMP(
  totalRevenus: number,
  totalCharges: number,
  totalAmortissement: number,
): ResultatReelLMP {
  const resultatFiscal = totalRevenus - totalCharges - totalAmortissement;
  const deficitImputableRevenuGlobal = Math.max(0, -resultatFiscal);
  return { resultatFiscal, deficitImputableRevenuGlobal };
}

export interface RentabiliteLMPMicroBic extends MicroBicLMNPResult {
  impotRevenu: number;
  cotisationsSociales: number;
  rendementNetNet: number | null;
}

export interface RentabiliteLMPReel extends ResultatReelLMP {
  chargesDeductibles: number;
  /** Économie d'impôt potentielle liée à l'imputation du déficit sur le revenu global (sans plafond). */
  economieImpotPotentielle: number;
  impotRevenu: number;
  cotisationsSociales: number;
  rendementNetNet: number | null;
}

export interface RentabiliteLMPResult {
  prixAcquisitionTotal: number;
  loyersAnnuels: number;
  chargesAnnuelles: number;
  amortissementCredit: AmortissementResult;
  amortissementImmeuble: AmortissementLigneLMNP[];
  totalAmortissementImmeuble: number;
  cashflowNetMensuel: number;
  rendementBrut: number | null;
  rendementNet: number | null;
  microBic: RentabiliteLMPMicroBic;
  reel: RentabiliteLMPReel;
  regimeRecommande: 'micro-bic' | 'reel' | 'equivalent';
}

/**
 * `tauxCotisationsSociales` : saisie libre côté simulateur (pas de calcul SSI
 * réel, progressif et à assiette auto-référente — hors de portée ici),
 * appliquée uniquement sur un résultat imposable positif (comme le TMI).
 */
export function computeRentabiliteLMP(
  asset: Asset,
  revenus: AssetRevenu[],
  charges: AssetCharge[],
  tmi: number,
  tauxCotisationsSociales: number,
): RentabiliteLMPResult {
  const prixAcquisitionTotal = computePrixAcquisitionTotal(asset);
  const loyersAnnuels = computeLoyersAnnuels(revenus);
  const chargesAnnuelles = computeChargesAnnuelles(charges);
  const amortissementCredit = computeAmortissement(asset);
  const { mensualiteCredit, mensualiteAssurance, interetsAnnee, assuranceAnnee } = amortissementCredit;

  const terrainPct = asset.pourcentage_terrain_force
    ? asset.pourcentage_terrain_force
    : (ZONE_TERRAIN_PERCENTAGES[asset.zone_bien || ''] || 0);
  const travaux = (asset.travaux_renovation || 0) + (asset.travaux_construction || 0);
  const amortissementImmeuble = computeAmortissementImmeubleLMNP(
    asset.montant_immeuble || 0,
    terrainPct,
    asset.meubles || 0,
    travaux,
  );
  const totalAmortissementImmeuble = amortissementImmeuble.reduce((s, l) => s + l.amortissementAnnuel, 0);

  const cashflowNetMensuel =
    (loyersAnnuels - chargesAnnuelles - mensualiteCredit * 12 - mensualiteAssurance * 12) / 12;

  const rendementBrut = prixAcquisitionTotal > 0 ? loyersAnnuels / prixAcquisitionTotal : null;
  const rendementNet = prixAcquisitionTotal > 0 ? (loyersAnnuels - chargesAnnuelles) / prixAcquisitionTotal : null;

  // Micro-BIC — barème identique à LMNP (un LMP peut être micro-BIC sous les seuils).
  const microBicBase = computeMicroBicLMNP(loyersAnnuels, asset.type_location_lmnp);
  const impotMicroBic = microBicBase.revenuImposable * tmi;
  const cotisationsMicroBic = microBicBase.revenuImposable * tauxCotisationsSociales;
  const rendementNetNetMicroBic = prixAcquisitionTotal > 0
    ? rendementNet! - (impotMicroBic + cotisationsMicroBic) / prixAcquisitionTotal
    : null;

  // Réel — pas de plafonnement de l'amortissement : le déficit (charges et/ou
  // amortissement) est imputable sur le revenu global sans limite en LMP.
  const chargesDeductiblesReel = chargesAnnuelles + interetsAnnee + assuranceAnnee;
  const reelBase = computeResultatReelLMP(loyersAnnuels, chargesDeductiblesReel, totalAmortissementImmeuble);
  const economieImpotPotentielle = reelBase.deficitImputableRevenuGlobal * tmi;
  // L'assiette IR/cotisations ne peut pas être négative ; le résultat fiscal,
  // lui, reste affiché tel quel (déficit imputable sans plafond ci-dessus).
  const assietteReel = Math.max(0, reelBase.resultatFiscal);
  const impotReel = assietteReel * tmi;
  const cotisationsReel = assietteReel * tauxCotisationsSociales;
  const rendementNetNetReel = prixAcquisitionTotal > 0
    ? rendementNet! - (impotReel + cotisationsReel) / prixAcquisitionTotal
    : null;

  const netAnnuelMicroBic = (loyersAnnuels - chargesAnnuelles) - impotMicroBic - cotisationsMicroBic;
  const netAnnuelReel = (loyersAnnuels - chargesAnnuelles) - impotReel - cotisationsReel + economieImpotPotentielle;
  const regimeRecommande: RentabiliteLMPResult['regimeRecommande'] =
    netAnnuelMicroBic === netAnnuelReel ? 'equivalent' : netAnnuelMicroBic > netAnnuelReel ? 'micro-bic' : 'reel';

  return {
    prixAcquisitionTotal,
    loyersAnnuels,
    chargesAnnuelles,
    amortissementCredit,
    amortissementImmeuble,
    totalAmortissementImmeuble,
    cashflowNetMensuel,
    rendementBrut,
    rendementNet,
    microBic: {
      ...microBicBase,
      impotRevenu: impotMicroBic,
      cotisationsSociales: cotisationsMicroBic,
      rendementNetNet: rendementNetNetMicroBic,
    },
    reel: {
      ...reelBase,
      chargesDeductibles: chargesDeductiblesReel,
      economieImpotPotentielle,
      impotRevenu: impotReel,
      cotisationsSociales: cotisationsReel,
      rendementNetNet: rendementNetNetReel,
    },
    regimeRecommande,
  };
}
