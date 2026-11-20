import { ReductionsCreditsImpotInput } from './types';
import { ajouterJumelles2027 } from './cases2027';
import { MillesimeScellier } from './calculerInvestissementsScellier';

/**
 * Censi-Bouvard, location meublée non professionnelle (2042-RICI, revenus 2025/impôt 2026).
 * Règles relevées sur le simulateur officiel 2026 (1 000 €, 100 000 €, 400 000 €, cumuls) :
 * - `inv` (investissements 2019-2022) : prix de revient, 11 % / 9, 300 000 € par case (sans plafond
 *   commun, ni avec Pinel : 7MN + 7MW à 200 000 € → 4 888 € ; 7MN + 7NM → 6 444 €) ;
 * - `rep` : réduction reportée saisie (1/9 ou solde) ; plafond propre de 6 000 € (7SO, 7SB) et
 *   6 667 € (7SC), aucun sinon.
 * Plafonnement global : millésime 2009-2012 pour les soldes et reports d'investissements anciens
 * (7SC + 7MR 40 000 € → 43 503 €, donc 2011) ; sinon avantages courants (10 000 €). Non restituables.
 */
export const PLAFOND_CENSI_BOUVARD = 300_000;

export interface RegleCensiBouvard {
  nature: 'inv' | 'rep';
  taux: number;
  plafond: number | null;
  /** Année d'investissement soumise à un plafond historique ; null : plafond courant. */
  millesime: MillesimeScellier | null;
  libelle: string;
}
type Cle = keyof ReductionsCreditsImpotInput;

export const REGLES_CENSI_BOUVARD: Partial<Record<Cle, RegleCensiBouvard>> = {
  case7mn: { nature: 'inv', taux: 11 / 900, plafond: 300_000, millesime: null, libelle: "Investissements réalisés en 2022" },
  case7mw: { nature: 'inv', taux: 11 / 900, plafond: 300_000, millesime: null, libelle: "Investissements réalisés en 2021" },
  case7mz: { nature: 'inv', taux: 11 / 900, plafond: 300_000, millesime: null, libelle: "Investissements réalisés en 2020" },
  case7pz: { nature: 'inv', taux: 11 / 900, plafond: 300_000, millesime: null, libelle: "Investissements réalisés en 2019" },
  case7sl: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2024, réalisés de 2018 à 2022" },
  case7sx: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2023, réalisés de 2017 à 2022" },
  case7st: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2022, réalisés de 2016 à 2022" },
  case7ss: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2021, réalisés de 2015 à 2021" },
  case7sm: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2020, réalisés de 2014 à 2020" },
  case7sp: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2019, réalisés de 2013 à 2019" },
  case7sn: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2018, réalisés de 2013 à 2018" },
  case7so: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2012, libelle: "Report 1/9 : Investissements achevés en 2018, réalisés en 2012" },
  case7sa: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Report 1/9 : Investissements achevés en 2017, réalisés de 2013 à 2017" },
  case7sb: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2012, libelle: "Report 1/9 : Investissements achevés en 2017, réalisés en 2012" },
  case7sc: { nature: 'rep', taux: 0, plafond: 6_667, millesime: 2011, libelle: "Report 1/9 : Investissements achevés en 2017, réalisés en 2011" },
  case7ht: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Solde de l'année 2019, investissement 2009" },
  case7hd: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Solde de l'année 2020, investissement 2009" },
  case7ke: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Solde de l'année 2021, investissement 2009" },
  case7oa: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Solde de l'année 2022, investissement 2009" },
  case7po: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Solde de l'année 2023, investissement 2009" },
  case7pt: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Solde de l'année 2024, investissement 2009" },
  case7hu: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Solde de l'année 2019, investissement 2010" },
  case7he: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Solde de l'année 2020, investissement 2010" },
  case7kf: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Solde de l'année 2021, investissement 2010" },
  case7ob: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Solde de l'année 2022, investissement 2010" },
  case7pp: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Solde de l'année 2023, investissement 2010" },
  case7pu: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Solde de l'année 2024, investissement 2010" },
  case7hv: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Solde de l'année 2019, investissement 2011" },
  case7hf: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Solde de l'année 2020, investissement 2011" },
  case7kg: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Solde de l'année 2021, investissement 2011" },
  case7oc: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Solde de l'année 2022, investissement 2011" },
  case7pq: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Solde de l'année 2023, investissement 2011" },
  case7pv: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Solde de l'année 2024, investissement 2011" },
  case7hw: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Solde de l'année 2019, investissement 2012" },
  case7hg: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Solde de l'année 2020, investissement 2012" },
  case7kh: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Solde de l'année 2021, investissement 2012" },
  case7od: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Solde de l'année 2022, investissement 2012" },
  case7pr: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Solde de l'année 2023, investissement 2012" },
  case7pw: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Solde de l'année 2024, investissement 2012" },
  case7hx: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Solde de l'année 2019, investissements réalisés depuis 2013" },
  case7hh: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Solde de l'année 2020, investissements réalisés depuis 2013" },
  case7ki: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Solde de l'année 2021, investissements réalisés depuis 2013" },
  case7oe: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Solde de l'année 2022, investissements réalisés depuis 2013" },
  case7ps: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Solde de l'année 2023, investissements réalisés depuis 2013" },
  case7px: { nature: 'rep', taux: 0, plafond: null, millesime: null, libelle: "Solde de l'année 2024, investissements réalisés depuis 2013" },
};
// Cases de la déclaration 2027 : règle de la cohorte précédente (voir cases2027.ts).
ajouterJumelles2027(REGLES_CENSI_BOUVARD as Partial<Record<string, RegleCensiBouvard>>,
  (r, cle) => ({ ...r, libelle: `${r.libelle} — règle reprise pour la case 2027 ${cle.slice(4).toUpperCase()}` }));

const montant = (v: unknown) => Math.max(0, typeof v === 'number' ? v : 0);

export interface InvestissementsCensiBouvardResult {
  reductions: number;
  /** Part soumise au plafond courant de 10 000 €. */
  avantagesPlafonnesCourants: number;
  /** Avantages par année d'investissement (plafonds historiques). */
  millesimes: Record<MillesimeScellier, number>;
}

export function calculerInvestissementsCensiBouvard(input: ReductionsCreditsImpotInput): InvestissementsCensiBouvardResult {
  let courants = 0;
  const brut: Record<MillesimeScellier, number> = { 2009: 0, 2010: 0, 2011: 0, 2012: 0 };
  for (const [cle, r] of Object.entries(REGLES_CENSI_BOUVARD) as [Cle, RegleCensiBouvard][]) {
    const m = Math.min(montant(input[cle]), r.plafond ?? Infinity);
    // Arrondi par case, comme le simulateur (7MN + 7MW à 200 000 € → 2 444 + 2 444 = 4 888 €).
    const v = r.nature === 'inv' ? Math.round(m * r.taux + 1e-9) : m;
    if (r.millesime === null) courants += v; else brut[r.millesime] += v;
  }
  const avantagesPlafonnesCourants = Math.round(courants + 1e-9);
  const millesimes = Object.fromEntries(
    Object.entries(brut).map(([a, v]) => [a, Math.round(v + 1e-9)]),
  ) as Record<MillesimeScellier, number>;
  return {
    reductions: avantagesPlafonnesCourants + Object.values(millesimes).reduce((s, v) => s + v, 0),
    avantagesPlafonnesCourants,
    millesimes,
  };
}
