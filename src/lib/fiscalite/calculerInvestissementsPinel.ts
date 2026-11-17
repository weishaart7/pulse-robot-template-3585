import { ReductionsCreditsImpotInput } from './types';

/**
 * Pinel, Pinel+, Denormandie et Duflot (2042-RICI, revenus 2025/impôt 2026). Règles relevées sur le
 * simulateur officiel 2026 (1 000 €, 100 000 €, 400 000 €, cumuls), case par case :
 * - `inv` (achevés en 2025) : prix de revient saisi, réduction de l'année = taux total / 6 ou / 9 ;
 *   plafond de 300 000 € commun à toutes ces cases, imputé par taux annuel décroissant
 *   (7LU + 7LW à 200 000 € → 9 667 €) ;
 * - `rep` : annuité reportée saisie (montant de la réduction), plafonnée pour Denormandie, Pinel
 *   2019-2024 et Duflot au maximum théorique de l'annuité (6 000 / 11 500 / 9 667 €), sans plafond
 *   pour Pinel 2017-2018 et les reports de compléments de prorogation ;
 * - `comp` (compléments de prorogation) : prix de revient saisi, 2 % ou 1 % pour l'année, plafond de
 *   300 000 € par case (7XA + 7RX à 200 000 € → 6 000 €) ;
 * - `sans_effet` : 7JM et 7LM n'ont aucun effet sur le simulateur.
 * Plafonnement global : métropole dans les avantages courants (10 000 €) ; outre-mer dans la
 * majoration de 8 000 € partagée avec la 2042-IOM et la SOFICA (7LW 400 000 € + HOZ 8 000 € +
 * crédit 7DB → 18 000 €).
 */
export const PLAFOND_PINEL = 300_000;

type Nature = 'inv' | 'rep' | 'comp' | 'sans_effet';
export interface ReglePinel {
  nature: Nature;
  /** Taux de l'année (inv, comp). */
  taux: number;
  /** Plafond du montant saisi (rep, comp) ; `inv` : plafond commun PLAFOND_PINEL. */
  plafond: number | null;
  outreMer: boolean;
  libelle: string;
}
type ClePinel = keyof ReductionsCreditsImpotInput;

export const REGLES_PINEL: Partial<Record<ClePinel, ReglePinel>> = {
  case7nm: { nature: 'inv', taux: 0.12 / 6, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2022, métropole, 6 ans" },
  case7nn: { nature: 'inv', taux: 0.18 / 9, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2022, métropole, 9 ans" },
  case7pf: { nature: 'inv', taux: 0.23 / 6, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2022, outre-mer, 6 ans" },
  case7pg: { nature: 'inv', taux: 0.29 / 9, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2022, outre-mer, 9 ans" },
  case7no: { nature: 'inv', taux: 0.12 / 6, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2023, métropole, 6 ans" },
  case7np: { nature: 'inv', taux: 0.18 / 9, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2023, métropole, 9 ans" },
  case7nq: { nature: 'inv', taux: 0.23 / 6, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2023, outre-mer, 6 ans" },
  case7nr: { nature: 'inv', taux: 0.29 / 9, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2023, outre-mer, 9 ans" },
  case7lq: { nature: 'inv', taux: 0.12 / 6, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2024, métropole, 6 ans" },
  case7lr: { nature: 'inv', taux: 0.18 / 9, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2024, métropole, 9 ans" },
  case7ls: { nature: 'inv', taux: 0.23 / 6, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2024, outre-mer, 6 ans" },
  case7lt: { nature: 'inv', taux: 0.29 / 9, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2024, outre-mer, 9 ans" },
  case7lu: { nature: 'inv', taux: 0.12 / 6, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2025, métropole, 6 ans" },
  case7lv: { nature: 'inv', taux: 0.18 / 9, plafond: null, outreMer: false, libelle: "Denormandie, réalisé en 2025, métropole, 9 ans" },
  case7lw: { nature: 'inv', taux: 0.23 / 6, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2025, outre-mer, 6 ans" },
  case7lx: { nature: 'inv', taux: 0.29 / 9, plafond: null, outreMer: true, libelle: "Denormandie, réalisé en 2025, outre-mer, 9 ans" },
  case7vw: { nature: 'inv', taux: 0.12 / 6, plafond: null, outreMer: false, libelle: "Pinel+, réalisé en 2024, métropole, 6 ans" },
  case7vx: { nature: 'inv', taux: 0.18 / 9, plafond: null, outreMer: false, libelle: "Pinel+, réalisé en 2024, métropole, 9 ans" },
  case7vy: { nature: 'inv', taux: 0.23 / 6, plafond: null, outreMer: true, libelle: "Pinel+, réalisé en 2024, outre-mer, 6 ans" },
  case7vz: { nature: 'inv', taux: 0.29 / 9, plafond: null, outreMer: true, libelle: "Pinel+, réalisé en 2024, outre-mer, 9 ans" },
  case7vd: { nature: 'inv', taux: 0.12 / 6, plafond: null, outreMer: false, libelle: "Pinel+, réalisé en 2023, métropole, 6 ans" },
  case7ve: { nature: 'inv', taux: 0.18 / 9, plafond: null, outreMer: false, libelle: "Pinel+, réalisé en 2023, métropole, 9 ans" },
  case7vf: { nature: 'inv', taux: 0.23 / 6, plafond: null, outreMer: true, libelle: "Pinel+, réalisé en 2023, outre-mer, 6 ans" },
  case7vg: { nature: 'inv', taux: 0.29 / 9, plafond: null, outreMer: true, libelle: "Pinel+, réalisé en 2023, outre-mer, 9 ans" },
  case7qm: { nature: 'inv', taux: 0.12 / 6, plafond: null, outreMer: false, libelle: "Pinel, réalisé en 2022, métropole, 6 ans" },
  case7qn: { nature: 'inv', taux: 0.18 / 9, plafond: null, outreMer: false, libelle: "Pinel, réalisé en 2022, métropole, 9 ans" },
  case7qo: { nature: 'inv', taux: 0.23 / 6, plafond: null, outreMer: true, libelle: "Pinel, réalisé en 2022, outre-mer, 6 ans" },
  case7qp: { nature: 'inv', taux: 0.29 / 9, plafond: null, outreMer: true, libelle: "Pinel, réalisé en 2022, outre-mer, 9 ans" },
  case7qr: { nature: 'inv', taux: 0.105 / 6, plafond: null, outreMer: false, libelle: "Pinel, réalisé en 2023, métropole, 6 ans" },
  case7qs: { nature: 'inv', taux: 0.15 / 9, plafond: null, outreMer: false, libelle: "Pinel, réalisé en 2023, métropole, 9 ans" },
  case7qt: { nature: 'inv', taux: 0.215 / 6, plafond: null, outreMer: true, libelle: "Pinel, réalisé en 2023, outre-mer, 6 ans" },
  case7qu: { nature: 'inv', taux: 0.26 / 9, plafond: null, outreMer: true, libelle: "Pinel, réalisé en 2023, outre-mer, 9 ans" },
  case7sd: { nature: 'inv', taux: 0.09 / 6, plafond: null, outreMer: false, libelle: "Pinel, réalisé en 2024, métropole, 6 ans" },
  case7se: { nature: 'inv', taux: 0.12 / 9, plafond: null, outreMer: false, libelle: "Pinel, réalisé en 2024, métropole, 9 ans" },
  case7sf: { nature: 'inv', taux: 0.2 / 6, plafond: null, outreMer: true, libelle: "Pinel, réalisé en 2024, outre-mer, 6 ans" },
  case7sg: { nature: 'inv', taux: 0.23 / 9, plafond: null, outreMer: true, libelle: "Pinel, réalisé en 2024, outre-mer, 9 ans" },
  case7jb: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2019, métropole, 9 ans (report 1/9)" },
  case7jd: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Denormandie achevé en 2019, outre-mer, 9 ans (report 1/9)" },
  case7jr: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2020, métropole, 6 ans (report 1/6)" },
  case7js: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2020, métropole, 9 ans (report 1/9)" },
  case7jt: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Denormandie achevé en 2020, outre-mer, 6 ans (report 1/6)" },
  case7ju: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Denormandie achevé en 2020, outre-mer, 9 ans (report 1/9)" },
  case7lg: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2021, métropole, 6 ans (report 1/6)" },
  case7lh: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2021, métropole, 9 ans (report 1/9)" },
  case7li: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Denormandie achevé en 2021, outre-mer, 6 ans (report 1/6)" },
  case7lj: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Denormandie achevé en 2021, outre-mer, 9 ans (report 1/9)" },
  case7je: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2022, métropole, 6 ans (report 1/6)" },
  case7jf: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2022, métropole, 9 ans (report 1/9)" },
  case7jg: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Denormandie achevé en 2022, outre-mer, 6 ans (report 1/6)" },
  case7jh: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Denormandie achevé en 2022, outre-mer, 9 ans (report 1/9)" },
  case7ie: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2023, métropole, 6 ans (report 1/6)" },
  case7if: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2023, métropole, 9 ans (report 1/9)" },
  case7ig: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Denormandie achevé en 2023, outre-mer, 6 ans (report 1/6)" },
  case7ih: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Denormandie achevé en 2023, outre-mer, 9 ans (report 1/9)" },
  case7ne: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2024, métropole, 6 ans (report 1/6)" },
  case7nf: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Denormandie achevé en 2024, métropole, 9 ans (report 1/9)" },
  case7ng: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Denormandie achevé en 2024, outre-mer, 6 ans (report 1/6)" },
  case7nh: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Denormandie achevé en 2024, outre-mer, 9 ans (report 1/9)" },
  case7jn: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2020, métropole, 6 ans (report 1/6)" },
  case7jo: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2020, métropole, 9 ans (report 1/9)" },
  case7jp: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Pinel achevé en 2020, outre-mer, 6 ans (report 1/6)" },
  case7jq: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Pinel achevé en 2020, outre-mer, 9 ans (report 1/9)" },
  case7jv: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2021, métropole, 6 ans (report 1/6)" },
  case7jw: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2021, métropole, 9 ans (report 1/9)" },
  case7jx: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Pinel achevé en 2021, outre-mer, 6 ans (report 1/6)" },
  case7jy: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Pinel achevé en 2021, outre-mer, 9 ans (report 1/9)" },
  case7ji: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2022, métropole, 6 ans (report 1/6)" },
  case7jj: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2022, métropole, 9 ans (report 1/9)" },
  case7jk: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Pinel achevé en 2022, outre-mer, 6 ans (report 1/6)" },
  case7jl: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Pinel achevé en 2022, outre-mer, 9 ans (report 1/9)" },
  case7ia: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2023, métropole, 6 ans (report 1/6)" },
  case7ib: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2023, métropole, 9 ans (report 1/9)" },
  case7ic: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Pinel achevé en 2023, outre-mer, 6 ans (report 1/6)" },
  case7id: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Pinel achevé en 2023, outre-mer, 9 ans (report 1/9)" },
  case7kn: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2024, métropole, 6 ans (report 1/6)" },
  case7ko: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2024, métropole, 9 ans (report 1/9)" },
  case7kp: { nature: 'rep', taux: 0, plafond: 11_500, outreMer: true, libelle: "Pinel achevé en 2024, outre-mer, 6 ans (report 1/6)" },
  case7kq: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Pinel achevé en 2024, outre-mer, 9 ans (report 1/9)" },
  case7km: { nature: 'rep', taux: 0, plafond: 6_000, outreMer: false, libelle: "Pinel achevé en 2019, métropole, 9 ans (report 1/9)" },
  case7mm: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: true, libelle: "Pinel achevé en 2019, outre-mer, 9 ans (report 1/9)" },
  case7jm: { nature: 'sans_effet', taux: 0, plafond: null, outreMer: false, libelle: "Pinel achevé en 2019, métropole, 6 ans (report 1/6), sans effet" },
  case7lm: { nature: 'sans_effet', taux: 0, plafond: null, outreMer: true, libelle: "Pinel achevé en 2019, outre-mer, 6 ans (report 1/6), sans effet" },
  case7rb: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Pinel achevé en 2017, métropole, 9 ans (report 1/9)" },
  case7rd: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Pinel achevé en 2017, outre-mer, 9 ans (report 1/9)" },
  case7rf: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Pinel achevé en 2018, métropole, 9 ans (report 1/9)" },
  case7rh: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Pinel achevé en 2018, outre-mer, 9 ans (report 1/9)" },
  case7fw: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: false, libelle: "Duflot, report 1/9 de 2017" },
  case7fx: { nature: 'rep', taux: 0, plafond: 9_667, outreMer: false, libelle: "Duflot, report 1/9 de 2018" },
  case7hl: { nature: 'comp', taux: 0.02, plafond: 300_000, outreMer: false, libelle: "Denormandie 2019, seconde prorogation 2025 (initial 6 ans), métropole" },
  case7hm: { nature: 'comp', taux: 0.02, plafond: 300_000, outreMer: true, libelle: "Denormandie 2019, seconde prorogation 2025 (initial 6 ans), outre-mer" },
  case7xa: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: false, libelle: "Pinel 2015, première prorogation (initial 9 ans), métropole" },
  case7xb: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: true, libelle: "Pinel 2015, première prorogation (initial 9 ans), outre-mer" },
  case7xh: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: false, libelle: "Pinel 2016, première prorogation (initial 9 ans), métropole" },
  case7xi: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: true, libelle: "Pinel 2016, première prorogation (initial 9 ans), outre-mer" },
  case7rx: { nature: 'comp', taux: 0.02, plafond: 300_000, outreMer: false, libelle: "Pinel 2018, première prorogation (initial 6 ans), métropole" },
  case7ry: { nature: 'comp', taux: 0.02, plafond: 300_000, outreMer: true, libelle: "Pinel 2018, première prorogation (initial 6 ans), outre-mer" },
  case7ri: { nature: 'comp', taux: 0.02, plafond: 300_000, outreMer: false, libelle: "Pinel 2019, première prorogation (initial 6 ans), métropole" },
  case7rj: { nature: 'comp', taux: 0.02, plafond: 300_000, outreMer: true, libelle: "Pinel 2019, première prorogation (initial 6 ans), outre-mer" },
  case7sh: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: false, libelle: "Pinel 2015, seconde prorogation (initial 6 ans), métropole" },
  case7si: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: true, libelle: "Pinel 2015, seconde prorogation (initial 6 ans), outre-mer" },
  case7ro: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: false, libelle: "Pinel 2016, seconde prorogation (initial 6 ans), métropole" },
  case7rp: { nature: 'comp', taux: 0.01, plafond: 300_000, outreMer: true, libelle: "Pinel 2016, seconde prorogation (initial 6 ans), outre-mer" },
  case7of: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 première prorogation 2023, Pinel 2014, métropole" },
  case7og: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 première prorogation 2023, Pinel 2014, outre-mer" },
  case7na: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 première prorogation 2023, Pinel 2016, métropole" },
  case7nb: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 première prorogation 2023, Pinel 2016, outre-mer" },
  case7nc: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 première prorogation 2023, Pinel 2017, métropole" },
  case7nd: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 première prorogation 2023, Pinel 2017, outre-mer" },
  case7oh: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 première prorogation 2024, Pinel 2014, métropole" },
  case7oi: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 première prorogation 2024, Pinel 2014, outre-mer" },
  case7la: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 première prorogation 2024, Pinel 2015, métropole" },
  case7lb: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 première prorogation 2024, Pinel 2015, outre-mer" },
  case7lc: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 première prorogation 2024, Pinel 2017, métropole" },
  case7ld: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 première prorogation 2024, Pinel 2017, outre-mer" },
  case7le: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 première prorogation 2024, Pinel 2018, métropole" },
  case7lf: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 première prorogation 2024, Pinel 2018, outre-mer" },
  case7sy: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 seconde prorogation 2023, Pinel 2014, métropole" },
  case7sz: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 seconde prorogation 2023, Pinel 2014, outre-mer" },
  case7uy: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 seconde prorogation 2024, Pinel 2014, métropole" },
  case7uz: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 seconde prorogation 2024, Pinel 2014, outre-mer" },
  case7wy: { nature: 'rep', taux: 0, plafond: null, outreMer: false, libelle: "Report 1/3 seconde prorogation 2024, Pinel 2015, métropole" },
  case7wz: { nature: 'rep', taux: 0, plafond: null, outreMer: true, libelle: "Report 1/3 seconde prorogation 2024, Pinel 2015, outre-mer" },
};

const montant = (v: unknown) => Math.max(0, typeof v === 'number' ? v : 0);

export interface InvestissementsPinelResult {
  /** Réductions non restituables. */
  reductions: number;
  /** Part métropole, au plafond de 10 000 €. */
  avantagesPlafonnesCourants: number;
  /** Part outre-mer, dans la majoration de 8 000 €. */
  outreMer: number;
}

export function calculerInvestissementsPinel(input: ReductionsCreditsImpotInput): InvestissementsPinelResult {
  let metropole = 0;
  let outreMer = 0;
  const ajouter = (r: ReglePinel, v: number) => { if (r.outreMer) outreMer += v; else metropole += v; };
  const entrees = Object.entries(REGLES_PINEL) as [ClePinel, ReglePinel][];
  // Investissements achevés en 2025 : plafond commun, taux annuel décroissant.
  let reste = PLAFOND_PINEL;
  for (const [cle, r] of entrees.filter(([, r]) => r.nature === 'inv').sort(([, a], [, b]) => b.taux - a.taux)) {
    const retenu = Math.min(montant(input[cle]), reste);
    reste -= retenu;
    ajouter(r, retenu * r.taux);
  }
  for (const [cle, r] of entrees) {
    const m = montant(input[cle]);
    if (r.nature === 'rep') ajouter(r, r.plafond === null ? m : Math.min(m, r.plafond));
    else if (r.nature === 'comp') ajouter(r, Math.min(m, r.plafond ?? Infinity) * r.taux);
  }
  // Écart flottant (1 000 × 10,5 % / 6 = 17,4999…) : le simulateur arrondit 17,5 à 18.
  const avantagesPlafonnesCourants = Math.round(metropole + 1e-9);
  const om = Math.round(outreMer + 1e-9);
  return { reductions: avantagesPlafonnesCourants + om, avantagesPlafonnesCourants, outreMer: om };
}
