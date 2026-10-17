import { addMonths, startOfMonth } from 'date-fns';
import type { FluxBien } from './portefeuille';
import { moisRestantsCredits, periodesCredit, type CreditBien } from './credit';

// Projection pluriannuelle des flux d'un bien ou du portefeuille — cashflow **avant impôt** (décision
// du 2026-10-17 : l'impôt année par année demanderait de faire évoluer la synthèse foncière et les
// déficits reportés). Période k = 12 mois à partir du mois prochain (k = 0 : les 12 prochaines
// échéances, même convention que les indicateurs actuels). Montants à la part du foyer : loyers et
// charges × quote-part du bien (FluxBien), crédit × part du foyer dans chaque emprunt (CreditBien),
// valeur × quote-part × fraction de démembrement actuelle (supposée constante).

export interface HypothesesProjection {
  /** Revalorisation annuelle des loyers, en %. */
  loyers: number;
  /** Revalorisation annuelle des charges, en %. */
  charges: number;
  /** Revalorisation annuelle de la valeur du bien, en %. */
  valeur: number;
}

export const HYPOTHESES_PAR_DEFAUT: HypothesesProjection = { loyers: 0, charges: 0, valeur: 0 };

export const HORIZON_MIN_ANNEES = 10;
export const HORIZON_MAX_ANNEES = 30;

export interface PeriodeProjection {
  index: number;
  /** Premier mois de la période. */
  debut: Date;
  loyers: number;
  charges: number;
  /** Mensualités du crédit (capital + intérêts) payées sur la période. */
  remboursements: number;
  interets: number;
  assurance: number;
  /** Loyers − charges − remboursements − assurance. */
  cashflow: number;
  capitalRestantDuFin: number;
  /** Valeur du bien en fin de période (null si non valorisable, ex. démembrement non calculable). */
  valeur: number | null;
  /** Valeur − capital restant dû (null si la valeur l'est). */
  valeurNette: number | null;
}

/** Nombre d'années projetées : jusqu'à la fin du crédit le plus long, borné à [10 ; 30] ans. */
export function horizonProjection(credits: CreditBien[], aujourdhui: Date = new Date()): number {
  const annees = Math.ceil(moisRestantsCredits(credits, aujourdhui) / 12);
  return Math.min(HORIZON_MAX_ANNEES, Math.max(HORIZON_MIN_ANNEES, annees));
}

export interface ProjectionBienInput {
  /** Flux de l'année en cours (computeFluxBien), déjà à la quote-part du foyer. */
  flux: Pick<FluxBien, 'loyerAnnuel' | 'chargesAnnuelles'>;
  credits: CreditBien[];
  /** Valeur actuelle à la part du foyer ; null si non valorisable. */
  valeurActuelle: number | null;
  hypotheses: HypothesesProjection;
  nbPeriodes: number;
  aujourdhui?: Date;
}

export function projeterBien({ flux, credits, valeurActuelle, hypotheses, nbPeriodes, aujourdhui = new Date() }: ProjectionBienInput): PeriodeProjection[] {
  const credit = periodesCredit(credits, nbPeriodes, aujourdhui);
  const debut0 = addMonths(startOfMonth(aujourdhui), 1);
  return credit.map((c, k) => {
    const loyers = flux.loyerAnnuel * Math.pow(1 + hypotheses.loyers / 100, k);
    const charges = flux.chargesAnnuelles * Math.pow(1 + hypotheses.charges / 100, k);
    const valeur = valeurActuelle === null ? null : valeurActuelle * Math.pow(1 + hypotheses.valeur / 100, k + 1);
    return {
      index: k,
      debut: addMonths(debut0, 12 * k),
      loyers,
      charges,
      remboursements: c.remboursements,
      interets: c.interets,
      assurance: c.assurance,
      cashflow: loyers - charges - c.remboursements - c.assurance,
      capitalRestantDuFin: c.capitalRestantDuFin,
      valeur,
      valeurNette: valeur === null ? null : valeur - c.capitalRestantDuFin,
    };
  });
}

/**
 * Somme des projections de plusieurs biens, période par période (toutes calculées sur le même horizon).
 * Un bien non valorisable compte pour 0 dans la valeur ; la valeur n'est null que si aucun bien ne l'est.
 */
export function sommeProjections(projections: PeriodeProjection[][]): PeriodeProjection[] {
  const n = projections.reduce((max, p) => Math.max(max, p.length), 0);
  return Array.from({ length: n }, (_, k) => {
    const lignes = projections.map((p) => p[k]).filter((l): l is PeriodeProjection => !!l);
    const somme = (f: (l: PeriodeProjection) => number) => lignes.reduce((s, l) => s + f(l), 0);
    const valorisees = lignes.filter((l) => l.valeur !== null);
    const valeur = valorisees.length > 0 ? valorisees.reduce((s, l) => s + (l.valeur as number), 0) : null;
    const capitalRestantDuFin = somme((l) => l.capitalRestantDuFin);
    return {
      index: k,
      debut: lignes[0].debut,
      loyers: somme((l) => l.loyers),
      charges: somme((l) => l.charges),
      remboursements: somme((l) => l.remboursements),
      interets: somme((l) => l.interets),
      assurance: somme((l) => l.assurance),
      cashflow: somme((l) => l.cashflow),
      capitalRestantDuFin,
      valeur,
      valeurNette: valeur === null ? null : valeur - capitalRestantDuFin,
    };
  });
}
