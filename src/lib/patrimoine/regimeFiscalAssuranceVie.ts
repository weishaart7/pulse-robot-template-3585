import { differenceInYears } from 'date-fns';
import type { FiscalRegimeResult } from './regimeFiscalPlusValue';
import { formatCurrency } from './utils';

/**
 * Fiscalité d'un rachat total (gain latent) des contrats d'assurance-vie et de capitalisation
 * (art. 125-0 A CGI), calculée au niveau du FOYER : l'abattement annuel (4 600 €, 9 200 € pour
 * un couple soumis à imposition commune) et le seuil de 150 000 € de primes (par souscripteur,
 * tous contrats confondus) dépendent de l'ensemble des contrats. Taux au 01/01/2026.
 *
 * - Primes versées depuis le 27/09/2017 : PFU 12,8 % avant 8 ans ; 7,5 % après 8 ans sur la
 *   fraction du gain correspondant à 150 000 € de primes, 12,8 % au-delà.
 * - Primes antérieures : prélèvement libératoire de 35 % avant 4 ans, 15 % de 4 à 8 ans, 7,5 %
 *   après 8 ans.
 * - Abattement : gains des contrats de 8 ans ou plus, réparti au prorata entre eux.
 * - Prélèvements sociaux 17,2 % (assurance-vie exclue de la hausse de CSG de la LFSS 2026),
 *   sur la seule part en unités de compte : ceux du fonds euros sont prélevés chaque année.
 */

export const DATE_REGIME_PFU_AV = '2017-09-27';
export const AV_PS_RATE = 0.172;
const ABATTEMENT_PERSONNE = 4600;
const ABATTEMENT_COUPLE = 9200;
const SEUIL_PRIMES = 150000;

export interface ContratRachatInput {
  id: string;
  // Souscripteur, pour le seuil de 150 000 € (apprécié par personne).
  souscripteur: 'user' | 'spouse';
  plusValue: number;
  dateSouscription?: string | null;
  // Versements et rachats saisis (Transmission → Assurance-vie). Sans opération, la
  // répartition des primes avant / après le 27/09/2017 n'est connue que pour un contrat
  // ouvert après cette date (primes = valeurAcquisition).
  operations: { type_operation: string; montant?: number | null; date_operation: string }[];
  valeurAcquisition?: number;
  // Part en unités de compte (%), av_contract_details.part_unites_compte ; inconnue : 100 %.
  partUniteCompte?: number | null;
  dateReference?: Date;
}

interface ContratAnalyse {
  input: ContratRachatInput;
  years: number;
  primes: number;
  gainAvant2017: number;
  gainApres2017: number;
}

const tauxAncien = (years: number) => (years < 4 ? 0.35 : years < 8 ? 0.15 : 0.075);

const nonDetermine = (badge: string, note: string): FiscalRegimeResult => ({
  badge, tone: 'non_determine', ir: null, ps: null, total: null, note,
});

export function computeRachatsAssuranceVie(
  contrats: ContratRachatInput[],
  impositionCommune: boolean,
): Record<string, FiscalRegimeResult> {
  const resultats: Record<string, FiscalRegimeResult> = {};
  const analyses: ContratAnalyse[] = [];

  for (const c of contrats) {
    if (!c.dateSouscription || isNaN(new Date(c.dateSouscription).getTime())) {
      resultats[c.id] = nonDetermine('Rachat — durée inconnue', "Date de souscription non renseignée : impossible d'appliquer le seuil de 8 ans.");
      continue;
    }
    const years = differenceInYears(c.dateReference ?? new Date(), new Date(c.dateSouscription));
    const versements = c.operations.filter((o) => o.type_operation === 'versement');
    let primes: number;
    let primesAvant2017: number;
    if (versements.length > 0) {
      primes = versements.reduce((s, o) => s + (Number(o.montant) || 0), 0);
      primesAvant2017 = versements
        .filter((o) => o.date_operation.slice(0, 10) < DATE_REGIME_PFU_AV)
        .reduce((s, o) => s + (Number(o.montant) || 0), 0);
    } else if (c.dateSouscription.slice(0, 10) >= DATE_REGIME_PFU_AV && c.valeurAcquisition !== undefined) {
      primes = c.valeurAcquisition;
      primesAvant2017 = 0;
    } else {
      resultats[c.id] = nonDetermine(
        'Rachat — versements à saisir',
        'Contrat ouvert avant le 27/09/2017 sans versements saisis (Transmission → Assurance-vie) : impossible de répartir le gain entre ancien et nouveau régime.',
      );
      continue;
    }
    const gain = Math.max(0, c.plusValue);
    const partAvant = primes > 0 ? primesAvant2017 / primes : 0;
    analyses.push({ input: c, years, primes, gainAvant2017: gain * partAvant, gainApres2017: gain * (1 - partAvant) });
  }

  // Seuil de 150 000 € : primes de tous les contrats du souscripteur.
  const primesParSouscripteur: Record<string, number> = {};
  analyses.forEach((a) => {
    primesParSouscripteur[a.input.souscripteur] = (primesParSouscripteur[a.input.souscripteur] || 0) + a.primes;
  });
  // Abattement du foyer, réparti au prorata des gains des contrats de 8 ans ou plus.
  const gainsEligibles = analyses.filter((a) => a.years >= 8).reduce((s, a) => s + a.gainAvant2017 + a.gainApres2017, 0);
  const abattementFoyer = impositionCommune ? ABATTEMENT_COUPLE : ABATTEMENT_PERSONNE;
  const tauxAbattement = gainsEligibles > 0 ? Math.min(1, abattementFoyer / gainsEligibles) : 0;

  for (const a of analyses) {
    const { input: c, years } = a;
    const gain = a.gainAvant2017 + a.gainApres2017;
    if (gain <= 0) {
      resultats[c.id] = { badge: 'Moins-value — aucun impôt', tone: 'exonere_total', ir: 0, ps: 0, total: 0 };
      continue;
    }
    const reduction = years >= 8 ? 1 - tauxAbattement : 1;
    const totalPrimesSouscripteur = primesParSouscripteur[c.souscripteur] || 0;
    const fraction75 = totalPrimesSouscripteur > 0 ? Math.min(1, SEUIL_PRIMES / totalPrimesSouscripteur) : 1;
    const irAncien = a.gainAvant2017 * reduction * tauxAncien(years);
    const irNouveau = years < 8
      ? a.gainApres2017 * 0.128
      : a.gainApres2017 * reduction * (fraction75 * 0.075 + (1 - fraction75) * 0.128);
    const partUC = c.partUniteCompte == null ? 1 : Math.min(1, Math.max(0, c.partUniteCompte / 100));
    const ps = gain * partUC * AV_PS_RATE;
    const ir = irAncien + irNouveau;

    const notes: string[] = [];
    if (years >= 8) {
      notes.push(`Abattement du foyer (${formatCurrency(abattementFoyer)}) réparti entre les contrats de 8 ans ou plus : ${formatCurrency(gain * tauxAbattement)} sur ce contrat.`);
      if (fraction75 < 1) notes.push(`Primes du souscripteur au-delà de 150 000 € (${formatCurrency(totalPrimesSouscripteur)}) : 12,8 % sur la fraction excédentaire du gain.`);
    }
    if (a.gainAvant2017 > 0) notes.push(`Gain sur primes antérieures au 27/09/2017 (${formatCurrency(a.gainAvant2017)}) : prélèvement libératoire de ${tauxAncien(years) * 100} % (option barème possible).`);
    notes.push(c.partUniteCompte == null
      ? 'Répartition fonds euros / unités de compte non saisie : prélèvements sociaux calculés sur tout le gain (ceux du fonds euros sont en réalité prélevés chaque année).'
      : `Prélèvements sociaux sur la part en unités de compte (${Math.round(partUC * 100)} %) : ceux du fonds euros sont prélevés chaque année.`);
    notes.push('Gain réparti entre primes au prorata des versements (approximation). Option pour le barème progressif possible.');

    resultats[c.id] = {
      badge: years >= 8 ? 'Assurance-vie ≥ 8 ans' : 'Assurance-vie < 8 ans',
      tone: 'pfu',
      ir,
      ps,
      total: ir + ps,
      irDetail: years >= 8 ? `Abattement ${formatCurrency(gain * tauxAbattement)}` : undefined,
      note: notes.join(' '),
    };
  }
  return resultats;
}

/** Prélèvements sociaux retenus par l'assureur au décès sur les produits des unités de compte. */
// Taux : 17,2 % pour l'assurance-vie, 18,6 % pour un PER (cf. regimeFiscalRetraite.ts).
export const psDecesAssuranceVie = (capital: number, primesNettes: number, partUniteCompte?: number | null, taux = AV_PS_RATE): number =>
  partUniteCompte == null ? 0 : Math.max(0, capital - primesNettes) * Math.min(1, Math.max(0, partUniteCompte / 100)) * taux;
