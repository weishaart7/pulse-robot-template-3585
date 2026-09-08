import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import {
  computeAmortissement,
  computeChargesAnnuelles,
  computeLoyersAnnuels,
  computeQuotePart,
  PLAFOND_DEFICIT_FONCIER,
  TAUX_PRELEVEMENTS_SOCIAUX,
} from './rentabilite';

// Moteur foncier "location nue" au niveau du foyer fiscal : contrairement à
// computeRentabilite() (rentabilite.ts), qui simule un bien isolé, les règles du
// CGI applicables au régime réel (seuil micro-foncier, plafond du déficit
// imputable, report des déficits) s'apprécient sur l'ensemble des biens loués
// nus du foyer, tous biens confondus. Ce module agrège donc plusieurs biens
// avant d'appliquer ces règles.

/** Revenus bruts fonciers annuels au-delà desquels le régime réel est obligatoire (sauf option antérieure). */
export const SEUIL_MICRO_FONCIER = 15_000;

/** Plafond majoré du déficit imputable sur le revenu global lorsqu'au moins un
 * bien du foyer fait l'objet de travaux de rénovation énergétique le faisant
 * sortir des classes E, F ou G (dispositif prorogé jusqu'au 31/12/2027). */
export const PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE = 21_400;

export type TypeDeficitFoncierReporte = 'hors_interets' | 'interets';

/** Déficit foncier reporté d'une année antérieure, consommable sur les revenus
 * fonciers des 10 années suivant son origine (jamais sur le revenu global,
 * qu'il provienne d'un excédent hors intérêts ou d'intérêts d'emprunt). */
export interface DeficitFoncierReporte {
  id?: string;
  anneeOrigine: number;
  type: TypeDeficitFoncierReporte;
  montantRestant: number;
}

export interface ConsommationDeficitReporte {
  id?: string;
  anneeOrigine: number;
  type: TypeDeficitFoncierReporte;
  montantConsomme: number;
  montantRestantApres: number;
}

/** Un bien loué nu, réduit aux montants annuels nécessaires à l'agrégation
 * foyer (déjà pondérés par la quote-part du foyer dans le bien). */
export interface BienFoncierInput {
  assetId?: string;
  denomination?: string;
  quotePart: number;
  loyersBruts: number;
  chargesHorsInterets: number;
  interetsEtAssuranceEmprunt: number;
  /** Le bien fait l'objet de travaux de rénovation énergétique le faisant sortir des classes E/F/G. */
  travauxRenovationEnergetique?: boolean;
}

/** Construit un BienFoncierInput à partir des données brutes d'un bien (mêmes
 * sources que computeRentabilite : revenus/charges annualisés, amortissement
 * du crédit pour isoler intérêts + assurance emprunteur). */
export function buildBienFoncierInput(
  asset: Asset,
  revenus: AssetRevenu[],
  charges: AssetCharge[],
  travauxRenovationEnergetique = false,
): BienFoncierInput {
  const amortissement = computeAmortissement(asset);
  return {
    assetId: asset.id,
    denomination: asset.denomination,
    quotePart: computeQuotePart(asset),
    loyersBruts: computeLoyersAnnuels(revenus),
    chargesHorsInterets: computeChargesAnnuelles(charges),
    interetsEtAssuranceEmprunt: amortissement.interetsAnnee + amortissement.assuranceAnnee,
    travauxRenovationEnergetique,
  };
}

export interface FoyerFoncierResult {
  loyersBrutsFoyer: number;
  chargesHorsInteretsFoyer: number;
  interetsFoyer: number;
  /** true si le foyer reste sous le seuil de 15 000 € (micro-foncier possible, sur option pour le réel). */
  eligibleMicroFoncier: boolean;
  /** Inverse d'eligibleMicroFoncier : régime réel obligatoire au-delà du seuil. */
  regimeReelObligatoire: boolean;
  /** Loyers − charges hors intérêts/assurance emprunt : base du déficit imputable sur le revenu global. */
  resultatAvantInterets: number;
  /** Résultat foncier réel de l'année (après intérêts + assurance emprunt). */
  resultatFoncierGlobal: number;
  /** 10 700 € (ou 21 400 € si rénovation énergétique sur au moins un bien). */
  plafondDeficitApplicable: number;
  /** Part du déficit de l'année imputable sur le revenu global, plafonnée. */
  deficitImputableRevenuGlobal: number;
  /** Économie d'impôt potentielle liée à cette imputation (informatif, TMI foyer). */
  economieImpotPotentielle: number;
  /** Nouveau déficit hors intérêts généré cette année, au-delà du plafond — à reporter 10 ans sur les revenus fonciers. */
  nouveauDeficitReportableHorsInterets: number;
  /** Nouveaux intérêts/assurance non couverts par le résultat de l'année — jamais imputables sur le revenu global, à reporter 10 ans sur les revenus fonciers. */
  nouveauDeficitReportableInterets: number;
  /** Détail de la consommation du stock de déficits reportés des années précédentes (FIFO, dans la fenêtre de 10 ans). */
  consommationDeficitsReportes: ConsommationDeficitReporte[];
  /** Résultat foncier imposable de l'année, après imputation des déficits reportés consommés (plancher 0). */
  resultatFoncierImposable: number;
  impotRevenu: number;
  prelevementsSociaux: number;
}

/**
 * Agrège tous les biens loués nus du foyer et applique les règles du régime
 * réel : seuil micro-foncier (15 000 €), plafond du déficit imputable sur le
 * revenu global (10 700 / 21 400 €), séparation intérêts/hors-intérêts, et
 * consommation du stock de déficits reportés des années précédentes (fourni en
 * entrée — ce module ne persiste rien, cf. deficitFoncierService).
 */
export function computeFoyerFoncier(
  biens: BienFoncierInput[],
  deficitsReportes: DeficitFoncierReporte[],
  tmi: number,
  anneeCourante: number = new Date().getFullYear(),
): FoyerFoncierResult {
  const loyersBrutsFoyer = biens.reduce((s, b) => s + b.loyersBruts * (b.quotePart / 100), 0);
  const chargesHorsInteretsFoyer = biens.reduce((s, b) => s + b.chargesHorsInterets * (b.quotePart / 100), 0);
  const interetsFoyer = biens.reduce((s, b) => s + b.interetsEtAssuranceEmprunt * (b.quotePart / 100), 0);

  const eligibleMicroFoncier = loyersBrutsFoyer <= SEUIL_MICRO_FONCIER;

  const plafondDeficitApplicable = biens.some((b) => b.travauxRenovationEnergetique)
    ? PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE
    : PLAFOND_DEFICIT_FONCIER;

  const resultatAvantInterets = loyersBrutsFoyer - chargesHorsInteretsFoyer;
  const resultatFoncierGlobal = resultatAvantInterets - interetsFoyer;

  let deficitImputableRevenuGlobal = 0;
  let nouveauDeficitReportableHorsInterets = 0;
  let nouveauDeficitReportableInterets = 0;

  if (resultatAvantInterets < 0) {
    const deficitHorsInterets = -resultatAvantInterets;
    deficitImputableRevenuGlobal = Math.min(plafondDeficitApplicable, deficitHorsInterets);
    nouveauDeficitReportableHorsInterets = deficitHorsInterets - deficitImputableRevenuGlobal;
    // Les intérêts d'emprunt ne sont jamais imputables sur le revenu global,
    // quel que soit le signe du résultat hors intérêts : reportés en totalité.
    nouveauDeficitReportableInterets = interetsFoyer;
  } else if (resultatFoncierGlobal < 0) {
    // Résultat positif hors intérêts, mais les intérêts seuls créent un
    // déficit foncier : jamais imputable sur le revenu global (contrairement
    // au cas ci-dessus), entièrement reportable sur les revenus fonciers.
    nouveauDeficitReportableInterets = -resultatFoncierGlobal;
  }

  // Consommation du stock de déficits reportés des années précédentes,
  // uniquement si le résultat foncier de l'année est positif (rien à imputer
  // sinon) — FIFO par année d'origine, dans la fenêtre de 10 ans. Une fois
  // reporté, un déficit (intérêts ou hors intérêts) ne peut plus s'imputer que
  // sur des revenus fonciers, jamais sur le revenu global : les deux types
  // sont donc équivalents pour cette consommation, seul l'ordre d'ancienneté compte.
  const consommationDeficitsReportes: ConsommationDeficitReporte[] = [];
  let resultatFoncierImposable = Math.max(0, resultatFoncierGlobal);

  if (resultatFoncierGlobal > 0) {
    const stockUtilisable = deficitsReportes
      .filter((d) => anneeCourante <= d.anneeOrigine + 10 && d.montantRestant > 0)
      .sort((a, b) => a.anneeOrigine - b.anneeOrigine);

    let solde = resultatFoncierImposable;
    for (const d of stockUtilisable) {
      if (solde <= 0) break;
      const consomme = Math.min(d.montantRestant, solde);
      solde -= consomme;
      consommationDeficitsReportes.push({
        id: d.id,
        anneeOrigine: d.anneeOrigine,
        type: d.type,
        montantConsomme: consomme,
        montantRestantApres: d.montantRestant - consomme,
      });
    }
    resultatFoncierImposable = solde;
  }

  const economieImpotPotentielle = deficitImputableRevenuGlobal * tmi;
  const impotRevenu = resultatFoncierImposable * tmi;
  const prelevementsSociaux = resultatFoncierImposable * TAUX_PRELEVEMENTS_SOCIAUX;

  return {
    loyersBrutsFoyer,
    chargesHorsInteretsFoyer,
    interetsFoyer,
    eligibleMicroFoncier,
    regimeReelObligatoire: !eligibleMicroFoncier,
    resultatAvantInterets,
    resultatFoncierGlobal,
    plafondDeficitApplicable,
    deficitImputableRevenuGlobal,
    economieImpotPotentielle,
    nouveauDeficitReportableHorsInterets,
    nouveauDeficitReportableInterets,
    consommationDeficitsReportes,
    resultatFoncierImposable,
    impotRevenu,
    prelevementsSociaux,
  };
}
