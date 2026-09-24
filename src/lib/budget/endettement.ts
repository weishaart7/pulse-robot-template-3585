// Taux d'effort au sens du HCSF (décision D-HCSF-2021-7) : charges d'emprunt, assurance comprise,
// rapportées aux revenus nets avant impôt, plafond 35 %. Le HCSF ne fixe pas la pondération des revenus :
// celle retenue ici suit la pratique bancaire courante (cf. docs/budget.md).
// - travail, retraites/pensions/rentes : 100 % ;
// - revenus fonciers / locatifs (et revenus importés d'un actif immobilier) : 70 % ;
// - placements financiers, aides sociales, indemnités, autres revenus : exclus (non pérennes) ;
// - toute ligne ponctuelle : exclue.
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
import { BudgetLine, isActiveOn, isPonctuel, toAnnual } from './periodicite';

export const TAUX_EFFORT_MAX = 0.35;
export const PONDERATION_LOYERS = 0.7;

const NATURES_LOCATIVES: readonly string[] = [
  'Revenus de location meublée non professionnelle (LMNP)',
  'Revenus de SCPI / OPCI',
  'Revenus fonciers (loyers immobiliers)',
  'Revenus fonciers de location nue',
  'Revenus fonciers de parts de SCI',
  'Revenus fonciers de parts de SCPI',
];

const NATURES_PLEINES: readonly string[] = [
  ...REVENUS_CATEGORIES['Revenus du travail'],
  ...REVENUS_CATEGORIES['Retraites, pensions & rentes'],
];

const NATURES_CREDITS: readonly string[] = CHARGES_CATEGORIES['Emprunts & Crédits'];

export interface RevenuEndettement extends BudgetLine {
  nature?: string | null;
  source?: string;
}

export interface ChargeEndettement extends BudgetLine {
  nature?: string | null;
}

// Coefficient (0 à 1) appliqué à un revenu dans le dénominateur du taux d'effort.
export const ponderationRevenu = (revenu: RevenuEndettement): number => {
  if (isPonctuel(revenu.periodicite)) return 0;
  if (revenu.source === 'immobilier') return PONDERATION_LOYERS;
  const nature = revenu.nature || '';
  if (NATURES_PLEINES.includes(nature)) return 1;
  if (NATURES_LOCATIVES.includes(nature)) return PONDERATION_LOYERS;
  return 0;
};

export interface Endettement {
  revenusPonderesAnnuel: number;
  mensualitesCreditsAnnuel: number;
  tauxEffort: number; // en %
  capaciteAnnuel: number; // 35 % des revenus pondérés − mensualités
}

export const computeEndettement = (
  revenus: RevenuEndettement[],
  charges: ChargeEndettement[],
  ref: Date = new Date()
): Endettement => {
  const revenusPonderesAnnuel = revenus
    .filter(r => isActiveOn(r, ref))
    .reduce((sum, r) => sum + toAnnual(r.montant, r.periodicite) * ponderationRevenu(r), 0);
  const mensualitesCreditsAnnuel = charges
    .filter(c => isActiveOn(c, ref) && !isPonctuel(c.periodicite) && NATURES_CREDITS.includes(c.nature || ''))
    .reduce((sum, c) => sum + toAnnual(c.montant, c.periodicite), 0);
  return {
    revenusPonderesAnnuel,
    mensualitesCreditsAnnuel,
    tauxEffort: revenusPonderesAnnuel > 0 ? (mensualitesCreditsAnnuel / revenusPonderesAnnuel) * 100 : 0,
    capaciteAnnuel: revenusPonderesAnnuel * TAUX_EFFORT_MAX - mensualitesCreditsAnnuel,
  };
};
