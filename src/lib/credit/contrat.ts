import { addMonths, startOfMonth } from 'date-fns';
import type { Emprunt } from '@/services/passifService';

// Tableau d'amortissement d'un prêt reconstitué depuis les données d'origine du contrat (décisions du
// 2026-10-17, docs/patrimoine.md) :
// - échéances mensuelles à partir de la date de première échéance, sur la durée totale (différé compris) ;
// - différé partiel : intérêts seuls payés ; différé total : rien n'est payé, les intérêts s'ajoutent au
//   capital (capitalisation) ;
// - après le différé, amortissable : mensualité constante (hors assurance) calculée sur le capital
//   restant et les mois restants ; in fine : intérêts seuls, capital remboursé à la dernière échéance ;
// - taux nominal supposé constant (un taux variable ou mixte est calculé au taux actuel) ;
// - assurance : taux annuel sur le capital initial (montant constant), taux annuel sur le capital
//   restant dû en début de mois, ou montant mensuel fixe ; due aussi pendant le différé ;
// - coût total = intérêts + assurance + frais (dossier, garantie). Le TAEG n'est jamais calculé.
// Hors périmètre : remboursements anticipés, paliers, modulation d'échéances.

export type DiffereType = 'partiel' | 'total';
export type AssuranceMode = 'taux_capital_initial' | 'taux_crd' | 'montant';

export interface ContratCredit {
  capitalInitial: number;
  /** Date de la première échéance. */
  datePremiereEcheance: Date;
  /** Nombre total d'échéances, différé compris. */
  dureeTotaleMois: number;
  tauxAnnuel: number;
  inFine: boolean;
  differeMois: number;
  differeType: DiffereType;
  assuranceMode: AssuranceMode | null;
  /** Taux annuel en % (modes « taux ») ou montant mensuel en €. */
  assuranceValeur: number;
  frais: number;
}

export interface LigneAmortissement {
  /** Numéro d'échéance (1 = première). */
  numero: number;
  /** Mois de l'échéance (premier jour du mois). */
  date: Date;
  /** Échéance hors assurance (intérêts payés + capital). */
  echeance: number;
  interet: number;
  capital: number;
  assurance: number;
  /** Capital restant dû après l'échéance. */
  capitalRestantDu: number;
  /** Échéance pendant la période de différé. */
  differe: boolean;
}

export interface TableauAmortissement {
  lignes: LigneAmortissement[];
  totalInterets: number;
  totalAssurance: number;
  frais: number;
  /** Intérêts + assurance + frais. */
  coutTotal: number;
  /** Mensualité hors assurance après le différé (première échéance amortissable). */
  mensualiteHorsAssurance: number;
  dateFin: Date;
}

/** Mensualité constante d'un prêt amortissable. */
export function mensualiteConstante(capital: number, tauxAnnuel: number, dureeMois: number): number {
  if (dureeMois <= 0) return 0;
  const r = tauxAnnuel / 100 / 12;
  return r > 0 ? (capital * r) / (1 - Math.pow(1 + r, -dureeMois)) : capital / dureeMois;
}

export function construireTableau(c: ContratCredit): TableauAmortissement {
  const r = c.tauxAnnuel / 100 / 12;
  const debut = startOfMonth(c.datePremiereEcheance);
  const differe = Math.min(Math.max(0, c.differeMois), c.dureeTotaleMois - 1);
  const lignes: LigneAmortissement[] = [];
  let crd = c.capitalInitial;
  let mensualite = 0;

  const assurance = (crdDebut: number): number => {
    if (!c.assuranceMode || c.assuranceValeur <= 0) return 0;
    if (c.assuranceMode === 'montant') return c.assuranceValeur;
    const base = c.assuranceMode === 'taux_capital_initial' ? c.capitalInitial : crdDebut;
    return (base * c.assuranceValeur) / 100 / 12;
  };

  for (let i = 0; i < c.dureeTotaleMois; i++) {
    const date = addMonths(debut, i);
    const crdDebut = crd;
    const interet = crdDebut * r;
    const ass = assurance(crdDebut);

    if (i < differe) {
      if (c.differeType === 'total') {
        crd = crdDebut + interet;
        lignes.push({ numero: i + 1, date, echeance: 0, interet, capital: 0, assurance: ass, capitalRestantDu: crd, differe: true });
      } else {
        lignes.push({ numero: i + 1, date, echeance: interet, interet, capital: 0, assurance: ass, capitalRestantDu: crd, differe: true });
      }
      continue;
    }

    const derniere = i === c.dureeTotaleMois - 1;
    let capital: number;
    if (c.inFine) {
      capital = derniere ? crdDebut : 0;
      if (i === differe) mensualite = interet;
    } else {
      if (i === differe) mensualite = mensualiteConstante(crdDebut, c.tauxAnnuel, c.dureeTotaleMois - differe);
      capital = derniere ? crdDebut : Math.min(crdDebut, mensualite - interet);
    }
    crd = Math.max(0, crdDebut - capital);
    lignes.push({ numero: i + 1, date, echeance: interet + capital, interet, capital, assurance: ass, capitalRestantDu: crd, differe: false });
  }

  // Intérêts de toutes les échéances : en différé total, les intérêts capitalisés sont remboursés avec
  // le capital, la somme reste donc égale au total payé hors assurance moins le capital emprunté.
  const totalInterets = lignes.reduce((s, l) => s + l.interet, 0);
  const totalAssurance = lignes.reduce((s, l) => s + l.assurance, 0);
  return {
    lignes,
    totalInterets,
    totalAssurance,
    frais: c.frais,
    coutTotal: totalInterets + totalAssurance + c.frais,
    mensualiteHorsAssurance: mensualite,
    dateFin: lignes.length ? lignes[lignes.length - 1].date : debut,
  };
}

/** Capital restant dû à une date : après la dernière échéance tombée au plus tard ce mois-ci. */
export function capitalRestantDuAu(t: TableauAmortissement, capitalInitial: number, date: Date): number {
  const mois = startOfMonth(date).getTime();
  const passees = t.lignes.filter((l) => l.date.getTime() <= mois);
  return passees.length ? passees[passees.length - 1].capitalRestantDu : capitalInitial;
}

/** Échéances restant à payer après la date (celle du mois en cours est réputée payée). */
export function echeancesRestantes(t: TableauAmortissement, date: Date): number {
  const mois = startOfMonth(date).getTime();
  return t.lignes.filter((l) => l.date.getTime() > mois).length;
}

type ChampsContrat = Pick<Emprunt, 'capital_initial' | 'date_premiere_echeance' | 'duree_totale_mois' | 'taux_interet'
  | 'mode_amortissement' | 'differe_mois' | 'differe_type' | 'assurance_mode' | 'assurance_valeur' | 'frais_dossier' | 'frais_garantie'>;

/** Contrat exploitable si capital emprunté, première échéance et durée totale sont renseignés. */
export function contratDepuisEmprunt(e: ChampsContrat): ContratCredit | null {
  if (!e.capital_initial || e.capital_initial <= 0 || !e.duree_totale_mois || e.duree_totale_mois <= 0 || !e.date_premiere_echeance) {
    return null;
  }
  const date = new Date(`${e.date_premiere_echeance.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const mode = e.assurance_mode === 'taux_capital_initial' || e.assurance_mode === 'taux_crd' || e.assurance_mode === 'montant'
    ? e.assurance_mode : null;
  return {
    capitalInitial: e.capital_initial,
    datePremiereEcheance: date,
    dureeTotaleMois: Math.round(e.duree_totale_mois),
    tauxAnnuel: e.taux_interet || 0,
    inFine: e.mode_amortissement === 'In fine',
    differeMois: Math.round(e.differe_mois || 0),
    differeType: e.differe_type === 'total' ? 'total' : 'partiel',
    assuranceMode: mode,
    assuranceValeur: e.assurance_valeur || 0,
    frais: (e.frais_dossier || 0) + (e.frais_garantie || 0),
  };
}

/**
 * Emprunt actualisé à la date : quand le contrat est complet, capital restant dû, durée restante et
 * mensualité (hors assurance, intérêts compris) viennent du tableau d'amortissement et font foi partout
 * (Patrimoine, Budget, Transmission, Immobilier) — une mensualité saisie à la main est ignorée : elle
 * pouvait contredire le contrat (capital seul, sans les intérêts). Sans contrat complet, l'emprunt est
 * renvoyé tel quel (saisie manuelle).
 */
export function actualiserEmprunt<T extends ChampsContrat & Pick<Emprunt, 'capital_restant_du' | 'duree_restante' | 'mensualite'>>(
  e: T,
  date: Date = new Date(),
): T {
  const contrat = contratDepuisEmprunt(e);
  if (!contrat) return e;
  const tableau = construireTableau(contrat);
  return {
    ...e,
    capital_restant_du: Math.round(capitalRestantDuAu(tableau, contrat.capitalInitial, date) * 100) / 100,
    duree_restante: echeancesRestantes(tableau, date),
    mensualite: Math.round(tableau.mensualiteHorsAssurance * 100) / 100,
  };
}

/**
 * Assurance emprunteur du mois (mode et valeur saisis sur l'emprunt). Contrat complet : assurance de
 * l'échéance du mois en cours dans le tableau (ou de la prochaine ; 0 une fois le prêt remboursé).
 * Sans contrat : montant mensuel saisi, ou taux annuel appliqué au capital emprunté (taux sur capital
 * initial) ou au capital restant dû (taux sur CRD) quand ils sont connus.
 */
export function assuranceMensuelleAu(
  e: ChampsContrat & Pick<Emprunt, 'capital_restant_du'>,
  date: Date = new Date(),
): number {
  const contrat = contratDepuisEmprunt(e);
  if (contrat) {
    const mois = startOfMonth(date).getTime();
    const ligne = construireTableau(contrat).lignes.find((l) => l.date.getTime() >= mois);
    return ligne ? ligne.assurance : 0;
  }
  const valeur = e.assurance_valeur || 0;
  if (valeur <= 0) return 0;
  switch (e.assurance_mode) {
    case 'montant': return valeur;
    case 'taux_capital_initial': return ((e.capital_initial || 0) * valeur) / 100 / 12;
    case 'taux_crd': return ((e.capital_restant_du || 0) * valeur) / 100 / 12;
    default: return 0;
  }
}
