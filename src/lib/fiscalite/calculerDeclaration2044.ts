import { PLAFOND_DEFICIT_FONCIER, TAUX_PRELEVEMENTS_SOCIAUX } from '@/lib/immobilier/rentabilite';
import { PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE } from '@/lib/immobilier/foncierFoyer';

// Déclaration des revenus fonciers n° 2044 (régime réel), numérotation du Cerfa
// n° 50156#30 (revenus 2025). Moteur pur : il reproduit ligne à ligne le
// formulaire à partir des montants réalisés de l'année (préremplis depuis le
// module Immobilier puis surchargeables — préremplissage hors de ce fichier) et
// en déduit les cases 4BA à 4BD de la 2042. Le micro-foncier (4BE) ne relève
// pas de la 2044 : voir foncierFoyer.ts pour le choix du régime.

/** Forfait de la ligne 222 « Autres frais de gestion », par local. */
export const FORFAIT_FRAIS_GESTION_PAR_LOCAL = 20;

/** Durée de report des déficits fonciers antérieurs sur les revenus fonciers (rubrique 450). */
export const DUREE_REPORT_DEFICIT_FONCIER = 10;

/** Un immeuble (ou groupe d'immeubles de même nature et même régime) des lignes 211 à 263. */
export interface Immeuble2044Input {
  id?: string;
  assetId?: string;
  denomination?: string;
  /** 211 Loyers (ou fermages) bruts encaissés. */
  loyersBruts: number;
  /** 212 Dépenses mises par convention à la charge des locataires. */
  depensesChargeLocataires?: number;
  /** 213 Recettes brutes diverses (subventions ANAH, indemnités d'assurance). */
  recettesDiverses?: number;
  /** 214 Valeur locative réelle des propriétés dont le propriétaire se réserve la jouissance. */
  valeurLocativeReservee?: number;
  /** 221 Frais d'administration et de gestion. */
  fraisAdministrationGestion?: number;
  /** Nombre de locaux, pour le forfait de 20 € de la ligne 222. */
  nombreLocaux?: number;
  /** 223 Primes d'assurance. */
  primesAssurance?: number;
  /** 224 Réparation, entretien, amélioration (hors 224bis). */
  travaux?: number;
  /** 224bis Travaux de rénovation énergétique faisant passer le bien de E/F/G à A/B/C/D (case K). */
  travauxRenovationEnergetique?: number;
  /** 225 Charges récupérables non récupérées au départ du locataire. */
  chargesNonRecuperees?: number;
  /** 226 Indemnités d'éviction, frais de relogement. */
  indemnitesEviction?: number;
  /** 227 Taxes foncières et taxes annexes de l'année. */
  taxesFoncieres?: number;
  /** Taux (en %) de la déduction spécifique de la ligne 228, appliqué à la ligne 215. */
  tauxDeductionSpecifique?: number;
  /** 229 Provisions pour charges de copropriété payées dans l'année. */
  provisionsCharges?: number;
  /** 230 Régularisation des provisions déduites au titre de l'année précédente. */
  regularisationProvisions?: number;
  /** 250 Intérêts d'emprunt (et assurance emprunteur). */
  interetsEmprunt?: number;
  /** 262 Réintégration du supplément de déduction (case H). */
  reintegrationSupplementDeduction?: number;
}

/** Parts de sociétés immobilières ou de FPI non passibles de l'IS (lignes 111 à 114, montants de l'attestation). */
export interface PartSociete2044Input {
  id?: string;
  assetId?: string;
  denomination?: string;
  /** 111 Revenus bruts. */
  revenusBruts: number;
  /** 112 Frais et charges (sauf intérêts d'emprunt). */
  fraisEtCharges?: number;
  /** 112bis Dont travaux de rénovation énergétique (case J). */
  dontRenovationEnergetique?: number;
  /** 113 Intérêts d'emprunt. */
  interetsEmprunt?: number;
}

/** Déficit foncier antérieur non encore imputé au 31/12 de l'année précédente (colonne A de la rubrique 450). */
export interface DeficitAnterieur2044Input {
  id?: string;
  anneeOrigine: number;
  montantNonImpute: number;
}

export interface Declaration2044Input {
  /** Année des revenus déclarés (2025 pour la déclaration déposée en 2026). */
  annee: number;
  immeubles: Immeuble2044Input[];
  parts: PartSociete2044Input[];
  deficitsAnterieurs: DeficitAnterieur2044Input[];
}

export interface Immeuble2044Result {
  id?: string;
  assetId?: string;
  denomination?: string;
  ligne211: number;
  ligne212: number;
  ligne213: number;
  ligne214: number;
  ligne215: number;
  ligne221: number;
  ligne222: number;
  ligne223: number;
  ligne224: number;
  ligne224bis: number;
  ligne225: number;
  ligne226: number;
  ligne227: number;
  ligne228: number;
  ligne229: number;
  ligne230: number;
  ligne240: number;
  ligne250: number;
  ligne261: number;
  ligne262: number;
  ligne263: number;
}

export interface PartSociete2044Result {
  id?: string;
  assetId?: string;
  denomination?: string;
  ligne111: number;
  ligne112: number;
  ligne112bis: number;
  ligne113: number;
  ligne114: number;
}

export interface DeficitAnterieur2044Result {
  id?: string;
  anneeOrigine: number;
  /** Colonne A : non imputé au 31/12 de l'année précédente. */
  nonImpute: number;
  /** Part imputée sur le bénéfice de la ligne 420. */
  impute: number;
  /** Restant à reporter au 31/12 de l'année déclarée. */
  restant: number;
}

export interface Declaration2044Result {
  immeubles: Immeuble2044Result[];
  parts: PartSociete2044Result[];
  /** Ligne 115 : totaux des parts (cases A, B, J, C, D). */
  caseA: number;
  caseB: number;
  caseJ: number;
  caseC: number;
  caseD: number;
  /** Totaux des immeubles : 215, 224bis, 240, 250, 262, 263. */
  caseE: number;
  caseK: number;
  caseF: number;
  caseG: number;
  caseH: number;
  caseI: number;
  /** 420 Bénéfice (+) ou déficit (–) total : D + I. */
  ligne420: number;
  /** Rubrique 430, renseignée seulement en cas de déficit. */
  ligne431: number;
  ligne432: number;
  ligne433: number;
  ligne434: number;
  /** Plafond d'imputation sur le revenu global : 10 700 € + ligne 434, au plus 21 400 €. */
  plafondImputation: number;
  /** 'interets_superieurs' = cas 435 (432 > 431) ; 'interets_couverts' = cas 440 ; null si bénéfice. */
  casRepartition: 'interets_superieurs' | 'interets_couverts' | null;
  ligne436: number;
  ligne437: number;
  ligne438: number;
  ligne439: number;
  ligne441: number;
  ligne442: number;
  /** Rubrique 450 : déficits antérieurs encore utilisables, du plus ancien au plus récent. */
  deficitsAnterieurs: DeficitAnterieur2044Result[];
  /** 451 Total des déficits antérieurs non imputés au 31/12 de l'année précédente. */
  ligne451: number;
  /** Cases à reporter sur la 2042. */
  case4BA: number;
  case4BB: number;
  case4BC: number;
  case4BD: number;
  /** Revenu foncier net imposable après imputation des déficits antérieurs (informatif : calcul fait par l'administration). */
  revenuFoncierNetImposable: number;
}

/** Le formulaire ne prend pas les centimes : chaque ligne est arrondie à l'euro. */
const euros = (v: number | undefined): number => Math.round(v || 0);

function calculerImmeuble(i: Immeuble2044Input): Immeuble2044Result {
  const ligne211 = euros(i.loyersBruts);
  const ligne212 = euros(i.depensesChargeLocataires);
  const ligne213 = euros(i.recettesDiverses);
  const ligne214 = euros(i.valeurLocativeReservee);
  const ligne215 = ligne211 + ligne212 + ligne213 + ligne214;

  const ligne221 = euros(i.fraisAdministrationGestion);
  const ligne222 = Math.max(0, Math.floor(i.nombreLocaux || 0)) * FORFAIT_FRAIS_GESTION_PAR_LOCAL;
  const ligne223 = euros(i.primesAssurance);
  const ligne224 = euros(i.travaux);
  const ligne224bis = euros(i.travauxRenovationEnergetique);
  const ligne225 = euros(i.chargesNonRecuperees);
  const ligne226 = euros(i.indemnitesEviction);
  const ligne227 = euros(i.taxesFoncieres);
  const ligne228 = euros((ligne215 * (i.tauxDeductionSpecifique || 0)) / 100);
  const ligne229 = euros(i.provisionsCharges);
  const ligne230 = euros(i.regularisationProvisions);
  const ligne240 = ligne221 + ligne222 + ligne223 + ligne224 + ligne224bis + ligne225 + ligne226
    + ligne227 + ligne228 + ligne229 - ligne230;

  const ligne250 = euros(i.interetsEmprunt);
  const ligne261 = ligne215 - ligne240 - ligne250;
  const ligne262 = euros(i.reintegrationSupplementDeduction);
  const ligne263 = ligne261 + ligne262;

  return {
    id: i.id, assetId: i.assetId, denomination: i.denomination,
    ligne211, ligne212, ligne213, ligne214, ligne215,
    ligne221, ligne222, ligne223, ligne224, ligne224bis, ligne225, ligne226, ligne227, ligne228,
    ligne229, ligne230, ligne240, ligne250, ligne261, ligne262, ligne263,
  };
}

function calculerPart(p: PartSociete2044Input): PartSociete2044Result {
  const ligne111 = euros(p.revenusBruts);
  const ligne112 = euros(p.fraisEtCharges);
  const ligne113 = euros(p.interetsEmprunt);
  return {
    id: p.id, assetId: p.assetId, denomination: p.denomination,
    ligne111, ligne112,
    ligne112bis: euros(p.dontRenovationEnergetique),
    ligne113,
    ligne114: ligne111 - ligne112 - ligne113,
  };
}

const somme = <T>(items: T[], f: (t: T) => number) => items.reduce((s, t) => s + f(t), 0);

export function calculerDeclaration2044(input: Declaration2044Input): Declaration2044Result {
  const immeubles = input.immeubles.map(calculerImmeuble);
  const parts = input.parts.map(calculerPart);

  const caseA = somme(parts, (p) => p.ligne111);
  const caseB = somme(parts, (p) => p.ligne112);
  const caseJ = somme(parts, (p) => p.ligne112bis);
  const caseC = somme(parts, (p) => p.ligne113);
  const caseD = somme(parts, (p) => p.ligne114);
  const caseE = somme(immeubles, (i) => i.ligne215);
  const caseK = somme(immeubles, (i) => i.ligne224bis);
  const caseF = somme(immeubles, (i) => i.ligne240);
  const caseG = somme(immeubles, (i) => i.ligne250);
  const caseH = somme(immeubles, (i) => i.ligne262);
  const caseI = somme(immeubles, (i) => i.ligne263);

  const ligne420 = caseD + caseI;
  const deficit = ligne420 < 0;

  // Rubrique 430 : seulement en cas de déficit. Les intérêts s'imputent d'abord
  // sur les revenus bruts ; leur fraction non couverte (438) n'est jamais
  // imputable sur le revenu global. Même règle que repartirDeficitFoncier
  // (rentabilite.ts), mais avec le plafond du Cerfa : 10 700 € majoré des seules
  // dépenses de rénovation énergétique (434), au plus 21 400 €.
  const ligne431 = deficit ? caseA + caseE + caseH : 0;
  const ligne432 = deficit ? caseC + caseG : 0;
  const ligne433 = deficit ? caseB + caseF : 0;
  const ligne434 = deficit ? caseJ + caseK : 0;
  const plafondImputation = Math.min(
    PLAFOND_DEFICIT_FONCIER + ligne434,
    PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE,
  );

  let casRepartition: Declaration2044Result['casRepartition'] = null;
  let ligne436 = 0, ligne437 = 0, ligne438 = 0, ligne439 = 0, ligne441 = 0, ligne442 = 0;
  if (deficit && ligne432 > ligne431) {
    casRepartition = 'interets_superieurs';
    ligne436 = Math.min(ligne433, plafondImputation);
    ligne437 = ligne433 - ligne436;
    ligne438 = ligne432 - ligne431;
    ligne439 = ligne437 + ligne438;
  } else if (deficit) {
    casRepartition = 'interets_couverts';
    ligne441 = Math.min(-ligne420, plafondImputation);
    ligne442 = -ligne420 - ligne441;
  }

  // Rubrique 450 : déficits des 10 années précédentes, imputés du plus ancien au
  // plus récent sur le bénéfice de la ligne 420. Un déficit plus ancien est
  // périmé et ne figure plus sur le formulaire.
  const utilisables = input.deficitsAnterieurs
    .filter((d) => d.anneeOrigine < input.annee
      && d.anneeOrigine >= input.annee - DUREE_REPORT_DEFICIT_FONCIER
      && d.montantNonImpute > 0)
    .sort((a, b) => a.anneeOrigine - b.anneeOrigine);
  let beneficeAImputer = Math.max(0, ligne420);
  const deficitsAnterieurs = utilisables.map((d): DeficitAnterieur2044Result => {
    const nonImpute = euros(d.montantNonImpute);
    const impute = Math.min(nonImpute, beneficeAImputer);
    beneficeAImputer -= impute;
    return { id: d.id, anneeOrigine: d.anneeOrigine, nonImpute, impute, restant: nonImpute - impute };
  });
  const ligne451 = somme(deficitsAnterieurs, (d) => d.nonImpute);

  return {
    immeubles, parts,
    caseA, caseB, caseJ, caseC, caseD, caseE, caseK, caseF, caseG, caseH, caseI,
    ligne420,
    ligne431, ligne432, ligne433, ligne434, plafondImputation, casRepartition,
    ligne436, ligne437, ligne438, ligne439, ligne441, ligne442,
    deficitsAnterieurs, ligne451,
    case4BA: Math.max(0, ligne420),
    case4BB: casRepartition === 'interets_superieurs' ? ligne439 : ligne442,
    case4BC: casRepartition === 'interets_superieurs' ? ligne436 : ligne441,
    case4BD: ligne451,
    revenuFoncierNetImposable: beneficeAImputer,
  };
}

export interface RevenusFonciers2042 {
  /** 4BA après imputation des déficits antérieurs (4BD), plancher 0. */
  revenuFoncierNetImposable: number;
  /** 4BC, retranché du revenu global. */
  deficitImputableRevenuGlobal: number;
  /** Effet net sur le revenu imposable : revenu foncier net − 4BC (négatif en cas de déficit). */
  incidenceRevenuImposable: number;
  /** 17,2 % du revenu foncier net imposable. */
  prelevementsSociaux: number;
}

/**
 * Reprise des cases 4BA à 4BD dans le calcul de l'impôt de la 2042 : le revenu foncier net (4BA − 4BD
 * imputés) s'ajoute au revenu imposable, 4BC s'en retranche ; 4BB n'a pas d'effet sur l'année (report
 * sur les revenus fonciers futurs). Prélèvements sociaux à 17,2 % sur le revenu foncier net.
 */
export function revenusFonciersPour2042(r: Declaration2044Result): RevenusFonciers2042 {
  const revenuFoncierNetImposable = r.revenuFoncierNetImposable;
  return {
    revenuFoncierNetImposable,
    deficitImputableRevenuGlobal: r.case4BC,
    incidenceRevenuImposable: revenuFoncierNetImposable - r.case4BC,
    prelevementsSociaux: Math.round(revenuFoncierNetImposable * TAUX_PRELEVEMENTS_SOCIAUX),
  };
}
