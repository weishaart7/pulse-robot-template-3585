import { addMonths, differenceInCalendarMonths, startOfMonth } from 'date-fns';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { partFoyerEmprunt } from '@/lib/budget/emprunts';

// Crédits d'un bien immobilier — source unique (décision du 2026-10-17, docs/immobilier.md) :
// - l'emprunt de Patrimoine relié au bien (`emprunts.asset_id`) fait foi : capital restant dû saisi
//   à la date de sa dernière modification (`updated_at`, seule date de référence disponible, comme
//   le Budget), taux, mensualité et/ou durée restante, mode d'amortissement ;
// - à défaut, repli sur les champs « Financement » de la fiche Immobilier (`financement_*`), crédit
//   supposé démarré à la date d'acquisition (convention historique de computeAmortissement).
// L'assurance emprunteur n'est connue que via les champs Financement : un emprunt Patrimoine ne porte
// pas son coût (seulement quotités et garantie), elle vaut donc 0 dans ce cas.

export interface ParametresCredit {
  /** Capital restant dû à la date de référence. */
  capitalDepart: number;
  /** Mois de référence : la première échéance tombe le mois suivant. */
  dateReference: Date;
  tauxAnnuel: number;
  /** Mensualité hors assurance ; null si elle doit être déduite de la durée. */
  mensualite: number | null;
  /** Nombre d'échéances restantes après la date de référence ; null si inconnu. */
  dureeMois: number | null;
  inFine: boolean;
  assuranceMensuelle: number;
}

export interface Echeance {
  /** Mois de l'échéance (premier jour du mois). */
  mois: Date;
  interet: number;
  capital: number;
  assurance: number;
  capitalRestantDu: number;
}

export interface Echeancier {
  /** Capital restant dû à la date de référence (conservé même si l'échéancier est incomplet). */
  capitalDepart: number;
  echeances: Echeance[];
  /** false si les données ne permettent pas de bâtir un échéancier fini (mensualité ou durée manquante,
   * mensualité inférieure aux intérêts) : l'échéancier est alors tronqué ou vide. */
  complet: boolean;
}

const MAX_MOIS = 600;

/** Mensualité constante d'un prêt amortissable. */
export function mensualiteConstante(capital: number, tauxAnnuel: number, dureeMois: number): number {
  if (dureeMois <= 0) return 0;
  const r = tauxAnnuel / 100 / 12;
  return r > 0 ? (capital * r) / (1 - Math.pow(1 + r, -dureeMois)) : capital / dureeMois;
}

export function construireEcheancier(p: ParametresCredit): Echeancier {
  const r = p.tauxAnnuel / 100 / 12;
  const debut = startOfMonth(p.dateReference);
  const echeances: Echeance[] = [];
  let crd = p.capitalDepart;
  if (crd <= 0) return { capitalDepart: 0, echeances, complet: true };

  if (p.inFine) {
    // Intérêts seuls, capital remboursé à la dernière échéance ; sans durée, horizon tronqué.
    const n = p.dureeMois ?? MAX_MOIS;
    for (let i = 1; i <= n; i++) {
      const capital = i === n && p.dureeMois != null ? crd : 0;
      const interet = crd * r;
      crd -= capital;
      echeances.push({ mois: addMonths(debut, i), interet, capital, assurance: p.assuranceMensuelle, capitalRestantDu: crd });
    }
    return { capitalDepart: p.capitalDepart, echeances, complet: p.dureeMois != null };
  }

  const mensualite = p.mensualite ?? (p.dureeMois ? mensualiteConstante(crd, p.tauxAnnuel, p.dureeMois) : null);
  if (mensualite == null || mensualite <= crd * r) {
    return { capitalDepart: p.capitalDepart, echeances, complet: false };
  }
  for (let i = 1; i <= MAX_MOIS && crd > 0.005; i++) {
    const interet = crd * r;
    const capital = Math.min(crd, mensualite - interet);
    crd -= capital;
    echeances.push({ mois: addMonths(debut, i), interet, capital, assurance: p.assuranceMensuelle, capitalRestantDu: Math.max(0, crd) });
  }
  return { capitalDepart: p.capitalDepart, echeances, complet: crd <= 0.005 };
}

/** Paramètres d'un emprunt Patrimoine ; null sans capital restant dû renseigné. */
export function parametresDepuisEmprunt(e: Pick<Emprunt, 'capital_restant_du' | 'taux_interet' | 'mensualite' | 'duree_restante' | 'mode_amortissement' | 'updated_at' | 'created_at'> & Partial<Pick<Emprunt, 'capital_initial' | 'date_premiere_echeance' | 'duree_totale_mois'>>): ParametresCredit | null {
  if (!e.capital_restant_du || e.capital_restant_du <= 0) return null;
  // Contrat complet : l'emprunt a été actualisé (passifService), son capital restant dû est celui
  // d'aujourd'hui et non de la dernière modification.
  const contratComplet = !!e.capital_initial && !!e.date_premiere_echeance && !!e.duree_totale_mois;
  const ref = contratComplet ? new Date() : new Date(e.updated_at || e.created_at);
  return {
    capitalDepart: e.capital_restant_du,
    dateReference: Number.isNaN(ref.getTime()) ? new Date() : ref,
    tauxAnnuel: e.taux_interet || 0,
    mensualite: e.mensualite && e.mensualite > 0 ? e.mensualite : null,
    dureeMois: e.duree_restante && e.duree_restante > 0 ? Math.round(e.duree_restante) : null,
    inFine: e.mode_amortissement === 'In fine',
    assuranceMensuelle: 0,
  };
}

/** Paramètres des champs « Financement » d'Immobilier ; null si le bien n'est pas financé. */
export function parametresDepuisFinancement(asset: Asset, capitalEmprunte: number): ParametresCredit | null {
  if (!asset.financement_actif || !asset.financement_duree_mois || asset.financement_duree_mois <= 0 || capitalEmprunte <= 0) {
    return null;
  }
  return {
    capitalDepart: capitalEmprunte,
    // Sans date d'acquisition, le crédit est supposé démarrer ce mois-ci (comme computeAmortissement).
    dateReference: asset.date_acquisition ? new Date(asset.date_acquisition) : new Date(),
    tauxAnnuel: asset.financement_taux_credit || 0,
    mensualite: mensualiteConstante(capitalEmprunte, asset.financement_taux_credit || 0, asset.financement_duree_mois),
    dureeMois: asset.financement_duree_mois,
    inFine: false,
    // Assurance sur le capital initial, constante (même convention que computeAmortissement).
    assuranceMensuelle: capitalEmprunte * ((asset.financement_taux_assurance || 0) / 100) / 12,
  };
}

/** Échéancier d'un crédit et part du foyer à lui appliquer (0 à 1). */
export interface CreditBien {
  echeancier: Echeancier;
  /** Part du foyer : celle de l'emprunt (Patrimoine) ou, en repli, la quote-part du foyer dans le bien. */
  part: number;
  source: 'emprunt' | 'financement';
  libelle?: string;
  /** Taux nominal annuel en % (pénalités de remboursement anticipé). */
  tauxAnnuel: number;
}

/**
 * Crédits d'un bien. Les emprunts Patrimoine reliés font foi (chacun avec sa part du foyer, repli sur
 * la quote-part du bien s'il n'est pas qualifié ou porté par une société) ; sans emprunt relié, repli
 * sur les champs Financement.
 */
export function creditsDuBien(
  asset: Asset,
  emprunts: Emprunt[],
  quotePart: number,
  capitalEmprunteFinancement: number,
): CreditBien[] {
  const relies = emprunts.filter((e) => e.asset_id === asset.id);
  if (relies.length > 0) {
    return relies.flatMap((e) => {
      const p = parametresDepuisEmprunt(e);
      if (!p) return [];
      return [{ echeancier: construireEcheancier(p), part: partFoyerEmprunt(e) ?? quotePart / 100, source: 'emprunt' as const, libelle: e.libelle, tauxAnnuel: p.tauxAnnuel }];
    });
  }
  const p = parametresDepuisFinancement(asset, capitalEmprunteFinancement);
  return p ? [{ echeancier: construireEcheancier(p), part: quotePart / 100, source: 'financement' as const, tauxAnnuel: p.tauxAnnuel }] : [];
}

export interface SyntheseCredit {
  /** Prochaine mensualité hors assurance (somme des crédits). */
  mensualiteCredit: number;
  mensualiteAssurance: number;
  /** Intérêts et assurance des 12 prochaines échéances. */
  interetsAnnee: number;
  assuranceAnnee: number;
  /** Capital restant dû aujourd'hui. */
  capitalRestantDu: number;
}

/** Échéances restant à payer à partir du mois suivant `aujourdhui`. */
const echeancesAVenir = (echeancier: Echeancier, aujourdhui: Date): Echeance[] =>
  echeancier.echeances.filter((e) => differenceInCalendarMonths(e.mois, aujourdhui) >= 1);

/** Capital restant dû à la fin du mois de `date` (avant l'échéance suivante). */
export function capitalRestantDuAu(echeancier: Echeancier, date: Date): number {
  const passees = echeancier.echeances.filter((e) => differenceInCalendarMonths(e.mois, date) <= 0);
  return passees.length > 0 ? passees[passees.length - 1].capitalRestantDu : echeancier.capitalDepart;
}

/** Synthèse des 12 prochains mois, pondérée par la part de chaque crédit (`ponderer = false` : 100 %). */
export function syntheseCredits(credits: CreditBien[], aujourdhui: Date = new Date(), ponderer = true): SyntheseCredit {
  const out: SyntheseCredit = { mensualiteCredit: 0, mensualiteAssurance: 0, interetsAnnee: 0, assuranceAnnee: 0, capitalRestantDu: 0 };
  for (const c of credits) {
    const f = ponderer ? c.part : 1;
    const avenir = echeancesAVenir(c.echeancier, aujourdhui);
    const annee = avenir.slice(0, 12);
    if (annee.length > 0) {
      out.mensualiteCredit += (annee[0].interet + annee[0].capital) * f;
      out.mensualiteAssurance += annee[0].assurance * f;
    }
    out.interetsAnnee += annee.reduce((s, e) => s + e.interet, 0) * f;
    out.assuranceAnnee += annee.reduce((s, e) => s + e.assurance, 0) * f;
    out.capitalRestantDu += capitalRestantDuAu(c.echeancier, aujourdhui) * f;
  }
  return out;
}

export interface PeriodeCredit {
  /** Mensualités (capital + intérêts) payées sur la période. */
  remboursements: number;
  interets: number;
  assurance: number;
  /** Capital restant dû en fin de période. */
  capitalRestantDuFin: number;
}

/**
 * Flux de crédit par période de 12 mois à partir du mois suivant `aujourdhui` (période 0 = 12
 * prochaines échéances), pondérés par la part du foyer de chaque crédit.
 */
export function periodesCredit(credits: CreditBien[], nbPeriodes: number, aujourdhui: Date = new Date()): PeriodeCredit[] {
  const periodes: PeriodeCredit[] = Array.from({ length: nbPeriodes }, () => ({ remboursements: 0, interets: 0, assurance: 0, capitalRestantDuFin: 0 }));
  for (const c of credits) {
    const avenir = echeancesAVenir(c.echeancier, aujourdhui);
    let crd = capitalRestantDuAu(c.echeancier, aujourdhui);
    for (let k = 0; k < nbPeriodes; k++) {
      const tranche = avenir.slice(k * 12, k * 12 + 12);
      if (tranche.length > 0) crd = tranche[tranche.length - 1].capitalRestantDu;
      periodes[k].remboursements += tranche.reduce((s, e) => s + e.interet + e.capital, 0) * c.part;
      periodes[k].interets += tranche.reduce((s, e) => s + e.interet, 0) * c.part;
      periodes[k].assurance += tranche.reduce((s, e) => s + e.assurance, 0) * c.part;
      periodes[k].capitalRestantDuFin += crd * c.part;
    }
  }
  return periodes;
}

/** Nombre de mois restants jusqu'à la dernière échéance du crédit le plus long (0 sans crédit). */
export function moisRestantsCredits(credits: CreditBien[], aujourdhui: Date = new Date()): number {
  return credits.reduce((max, c) => Math.max(max, echeancesAVenir(c.echeancier, aujourdhui).length), 0);
}
