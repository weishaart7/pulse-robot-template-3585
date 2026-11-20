import { ReductionsCreditsImpotInput } from './types';
import { ajouterJumelles2027 } from './cases2027';

/**
 * Scellier (2042-RICI, revenus 2025/impôt 2026). Règles relevées sur le simulateur officiel 2026
 * (1 000 €, 100 000 €, 400 000 €, cumuls), case par case :
 * - `rep` : réduction reportée saisie (1/9, solde non imputé, 1/3 de complément), plafond propre
 *   éventuel (7RT 16 000 €, 7RU 12 000 € ; reports de compléments 8 000 / 10 000 / 6 000 / 12 000 €
 *   selon l'année d'investissement ; soldes sans plafond) ;
 * - `comp` (complément de prorogation 2025) : prix de revient saisi, 300 000 € par case, 4 %, 5 % ou
 *   6 % sur 3 ans selon l'année d'investissement (1/3 l'année de la demande).
 * Chaque avantage reste soumis au plafonnement global de son année d'investissement (millésime,
 * déduit du libellé ou du plafond mesuré) : voir calculerPlafonnementNiches. Non restituables.
 */
export const PLAFOND_SCELLIER_COMPLEMENT = 300_000;
export type MillesimeScellier = 2009 | 2010 | 2011 | 2012;

export interface RegleScellier {
  nature: 'rep' | 'comp';
  /** Taux de l'année (comp). */
  taux: number;
  /** Plafond du montant saisi. */
  plafond: number | null;
  millesime: MillesimeScellier;
  libelle: string;
}
type CleScellier = keyof ReductionsCreditsImpotInput;

export const REGLES_SCELLIER: Partial<Record<CleScellier, RegleScellier>> = {
  case7rt: { nature: 'rep', taux: 0, plafond: 16_000, millesime: 2012, libelle: "Report 1/9 de la réduction, investissement 2012" },
  case7ru: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2011, libelle: "Report 1/9 de la réduction, investissement 2011" },
  case7mo: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2019, investissement 2009" },
  case7ma: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2020, investissement 2009" },
  case7mi: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2021, investissement 2009" },
  case7ns: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2022, investissement 2009" },
  case7oj: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2023, investissement 2009" },
  case7me: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2024, investissement 2009" },
  case7mp: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2019, investissement 2010" },
  case7mb: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2020, investissement 2010" },
  case7mj: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2021, investissement 2010" },
  case7nt: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2022, investissement 2010" },
  case7ou: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2023, investissement 2010" },
  case7mf: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2024, investissement 2010" },
  case7mq: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2019, investissement 2011" },
  case7mc: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2020, investissement 2011" },
  case7mk: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2021, investissement 2011" },
  case7nu: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2022, investissement 2011" },
  case7ov: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2023, investissement 2011" },
  case7mg: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2024, investissement 2011" },
  case7mr: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2019, investissement 2012" },
  case7md: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2020, investissement 2012" },
  case7ml: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2021, investissement 2012" },
  case7nv: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2022, investissement 2012" },
  case7ow: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2023, investissement 2012" },
  case7mh: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2024, investissement 2012" },
  case7xc: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Première prorogation 2025, achevé en 2015 : Investissement réalisé du 1.1 au 31.3.2013 avec contrat de réservation enregistré au plus tard le 31.12.2012" },
  case7xd: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Première prorogation 2025, achevé en 2015 : Investissements réalisés en 2012 : Engagement de réalisation de l’investissement en 2012" },
  case7xe: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2015 : Engagement de réalisation de l’investissement en 2011" },
  case7xl: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2015 : contrat de réservation enregistré au plus tard le 31.12.2011 : investissement réalisé du 1.1 au 31.3.2012" },
  case7xm: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Première prorogation 2025, achevé en 2015 : investissement réalisé du 1.4 au 31.12.2012" },
  case7xn: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2015 : Investissements réalisés en 2011 : Engagement de réalisation de l’investissement en 2011" },
  case7ya: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Première prorogation 2025, achevé en 2015 : Engagement de réalisation de l’investissement en 2010" },
  case7yc: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Première prorogation 2025, achevé en 2015 : contrat de réservation enregistré au plus tard le 31.12.2010 : investissement réalisé du 1.1 au 31.3.2011" },
  case7ym: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2015 : investissement réalisé du 1.4 au 31.12.2011" },
  case7yn: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Première prorogation 2025, achevé en 2015 : Investissements réalisés en 2010" },
  case7yo: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2009, libelle: "Première prorogation 2025, achevé en 2015 : Investissements réalisés en 2010 avec promesse d'achat en 2009" },
  case7yp: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2009, libelle: "Première prorogation 2025, achevé en 2015 : Investissements réalisés en 2009" },
  case7xj: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Première prorogation 2025, achevé en 2016 : Investissement réalisé du 1.1 au 31.3.2013 avec contrat de réservation enregistré au plus tard le 31.12.2012" },
  case7xk: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Première prorogation 2025, achevé en 2016 : Investissements réalisés en 2012 : Engagement de réalisation de l’investissement en 2012" },
  case7xo: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2016 : Engagement de réalisation de l’investissement en 2011" },
  case7xp: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2016 : contrat de réservation enregistré au plus tard le 31.12.2011 : investissement réalisé du 1.1 au 31.3.2012" },
  case7xq: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Première prorogation 2025, achevé en 2016 : investissement réalisé du 1.4 au 31.12.2012" },
  case7yr: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2016 : Investissements réalisés en 2011 : Engagement de réalisation de l’investissement en 2011" },
  case7ys: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Première prorogation 2025, achevé en 2016 : Engagement de réalisation de l’investissement en 2010" },
  case7yt: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Première prorogation 2025, achevé en 2016 : contrat de réservation enregistré au plus tard le 31.12.2010 : investissement réalisé du 1.1 au 31.3.2011" },
  case7yu: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Première prorogation 2025, achevé en 2016 : investissement réalisé du 1.4 au 31.12.2011" },
  case7yv: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Première prorogation 2025, achevé en 2016 : Investissements réalisés en 2010" },
  case7yw: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2009, libelle: "Première prorogation 2025, achevé en 2016 : Investissements réalisés en 2010 avec promesse d'achat en 2009" },
  case7el: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2013 : Investissements réalisés en 2012 ou réalisés du 1.1.2013 au 31.3.2013 avec engagement en 2012" },
  case7em: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2013 : Investissements réallisés en 2012 avec promesse d’achat en 2011 et investissements réallisés en 2011" },
  case7eq: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2013 : Investissements réalisés en 2011 avec promesse d’achat en 2010 et investissements réalisés en 2010" },
  case7er: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2013 : Investissements réalisés en 2010 avec promesse d’achat en 2009 et investissements réalisés en 2009" },
  case7ev: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2014 : Investissements réalisés en 2012 ou réalisés du 1.1.2013 au 31.3.2013 avec engagement en 2012" },
  case7ew: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2014 : Investissements réalisés en 2012 avec promesse d’achat en 2011 et investissements réalisés en 2011" },
  case7ex: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2014 : Investissements réalisés en 2011 avec promesse d’achat en 2010 et investissements réalisés en 2010" },
  case7fa: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2014 : Investissements réalisés en 2010 avec promesse d’achat en 2009 et investissements réalisés en 2009" },
  case7fc: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011" },
  case7fd: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (première prorogation 2023), achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2012 ou du 1.1.2013 au 31.3.2013 avec engagement en 2012" },
  case7eh: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2014 : Investissements réalisés en 2012 ou réalisés du 1.1.2013 au 31.3.2013 avec engagement en 2012" },
  case7ei: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2014 : Investissements réalisés en 2012 avec promesse d’achat en 2011 et investissements réalisés en 2011" },
  case7eu: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2014 : Investissements réalisés en 2011 avec promesse d’achat en 2010 et investissements réalisés en 2010" },
  case7ez: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2014 : Investissements réalisés en 2010 avec promesse d’achat en 2009 et investissements réalisés en 2009" },
  case7fb: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2015 : Investissements réalisés en 2012 ou réalisés du 1.1.2013 au 31.3.2013 avec engagement en 2012" },
  case7fe: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2015 : Investissements réalisés en 2012 avec promesse d’achat en 2011 et investissements réalisés en 2011" },
  case7fi: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2015 : Investissements réalisés en 2011 avec promesse d’achat en 2010 et investissements réalisés en 2010" },
  case7fk: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (première prorogation 2024), achevé en 2015 : Investissements réalisés en 2010 avec promesse d’achat en 2009 et investissements réalisés en 2009" },
  case7zi: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2019, investissement 2009" },
  case7uu: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2020, investissement 2009" },
  case7rk: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2021, investissement 2009" },
  case7lk: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2022, investissement 2009" },
  case7im: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2023, investissement 2009" },
  case7ba: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2024, investissement 2009" },
  case7zj: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2019, investissement 2010" },
  case7uv: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2020, investissement 2010" },
  case7rl: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2021, investissement 2010" },
  case7ll: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2022, investissement 2010" },
  case7in: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2023, investissement 2010" },
  case7bb: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2024, investissement 2010" },
  case7zk: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2019, investissement 2011" },
  case7uw: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2020, investissement 2011" },
  case7rm: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2021, investissement 2011" },
  case7lo: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2022, investissement 2011" },
  case7io: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2023, investissement 2011" },
  case7bc: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2024, investissement 2011" },
  case7zl: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2019, investissement 2012" },
  case7ux: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2020, investissement 2012" },
  case7rn: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2021, investissement 2012" },
  case7lp: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2022, investissement 2012" },
  case7ip: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2023, investissement 2012" },
  case7bd: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2024, investissement 2012" },
  case7ha: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2012 : Investissements réalisés en 2012 Engagement de réalisation de l’investissement en 2012" },
  case7hj: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2012 : Engagement de réalisation de l’investissement en 2011" },
  case7hk: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2012 : contrat de réservation enregistré au plus tard le 31.12.2011 : investissement réalisé du 1.1 au 31.3.2012" },
  case7hn: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2012 : investissement réalisé du 1.4 au 31.12.2012" },
  case7hy: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2012 : Investissements réalisés en 2011 Engagement de réalisation de l’investissement en 2011" },
  case7ij: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2012 : Engagement de réalisation de l’investissement en 2010" },
  case7iq: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2012 : contrat de réservation enregistré au plus tard le 31.12.2010 : investissement réalisé du 1.1 au 31.3.2011" },
  case7iw: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2012 : investissement réalisé du 1.4 au 31.12.2011" },
  case7ka: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2012 : Investissements réalisés en 2010" },
  case7kb: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2009, libelle: "Seconde prorogation 2025, achevé en 2012 : Investissements réalisés en 2010 avec promesse d’achat en 2009" },
  case7kk: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2009, libelle: "Seconde prorogation 2025, achevé en 2012 : Investissements réalisés en 2009" },
  case7ox: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2013 : réalisés du 1.1.2013 au 31.3.2013 avec contrat de réservation enregistré au plus tard le 31.12.2012" },
  case7ok: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2013 : Investissements réalisés en 2012 Engagement de réalisation de l’investissement en 2012" },
  case7ol: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2013 : Engagement de réalisation de l’investissement en 2011" },
  case7om: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2013 : contrat de réservation enregistré au plus tard le 31.12.2011 : investissement réalisé du 1.1 au 31.3.2012" },
  case7on: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2013 : investissement réalisé du 1.4 au 31.12.2012" },
  case7oo: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2013 : Investissements réalisés en 2011 Engagement de réalisation de l’investissement en 2011" },
  case7pa: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2013 : Engagement de réalisation de l’investissement en 2010" },
  case7pb: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2013 : contrat de réservation enregistré au plus tard le 31.12.2010 : investissement réalisé du 1.1 au 31.3.2011" },
  case7ph: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2013 : investissement réalisé du 1.4 au 31.12.2011" },
  case7pi: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2013 : Investissements réalisés en 2010" },
  case7pj: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2009, libelle: "Seconde prorogation 2025, achevé en 2013 : Investissements réalisés en 2010 avec promesse d’achat en 2009" },
  case7py: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2009, libelle: "Seconde prorogation 2025, achevé en 2013 : Investissements réalisés en 2009" },
  case7bi: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 : Engagement de réalisation de l’investissement en 2011" },
  case7bq: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Engagement de réalisation de l’investissement en 2010" },
  case7bx: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : contrat de réservation enregistré au plus tard le 31.12.2010 : investissement réalisé du 1.1 au 31.3.2011" },
  case7by: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : investissement réalisé du 1.4 au 31.12.2011" },
  case7bz: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2012 : Engagement de réalisation de l’investissement en 2012" },
  case7di: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Engagement de réalisation de l’investissement en 2011" },
  case7du: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : contrat de réservation enregistré au plus tard le 31.12.2011 : investissement réalisé du 1.1 au 31.3.2012" },
  case7dv: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : investissement réalisé du 1.4 au 31.12.2012" },
  case7dx: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés du 1.1 au 31.3.2013 avec engagement de réalisation en 2012" },
  case7ai: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 : Engagement de réalisation de l’investissement en 2011" },
  case7ap: { nature: 'comp', taux: 6 / 300, plafond: 300_000, millesime: 2010, libelle: "Seconde prorogation 2025, achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : contrat de réservation enregistré au plus tard le 31.12.2010 : investissement réalisé du 1.1 au 31.3.2011" },
  case7aq: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : investissement réalisé du 1.4 au 31.12.2011" },
  case7ar: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2012 : Engagement de réalisation de l’investissement en 2012" },
  case7as: { nature: 'comp', taux: 5 / 300, plafond: 300_000, millesime: 2011, libelle: "Seconde prorogation 2025, achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : contrat de réservation enregistré au plus tard le 31.12.2011 : investissement réalisé du 1.1 au 31.3.2012" },
  case7at: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : investissement réalisé du 1.4 au 31.12.2012" },
  case7au: { nature: 'comp', taux: 4 / 300, plafond: 300_000, millesime: 2012, libelle: "Seconde prorogation 2025, achevé en 2017 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés du 1.1 au 31.3.2013 avec engagement de réalisation en 2012" },
  case7sj: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2010 : Investissements réalisés en 2010" },
  case7sk: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2010 : Investissements réalisés en 2010 avec promesse d’achat en 2009 ou réalisés en 2009" },
  case7sr: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2011 : Investissements réalisés en 2011" },
  case7tc: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2011 : Investissements réalisés en 2011 avec promesse d’achat en 2010 ou réalisé en 2010" },
  case7td: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2011 : Investissements réalisés en 2010 avec promesse d’achat en 2009 ou réalisé en 2009" },
  case7ua: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2014 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 avec promesse d’achat en 2010" },
  case7ub: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2014 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 ou 2012 avec promesse d’achat en 2011" },
  case7ue: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2014 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2012 ou du 1.1 au 31.3.2013 avec engagement en 2012" },
  case7ug: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2015 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 avec promesse d’achat en 2010" },
  case7ui: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2015 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 ou 2012 avec promesse d’achat en 2011" },
  case7uk: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (seconde prorogation 2023), achevé en 2015 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2012 ou du 1.1 au 31.3.2013 avec engagement en 2012" },
  case7qa: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2011 : Investissements réalisés en 2011" },
  case7qb: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2011 : Investissements réalisés en 2011 avec promesse d’achat en 2010 et investissements réalisés en 2010" },
  case7qc: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2011 : Investissements réalisés en 2010 avec promesse d’achat en 2009 et investissements réalisés en 2009" },
  case7qd: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2012 : Investissements réalisés en 2012" },
  case7qe: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2012 : Investissements réalisés en 2012 avec promesse d’achat en 2011 ou réalisé en 2011" },
  case7qg: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2012 : Investissements réalisés en 2011 avec promesse d’achat en 2010 ou réalisé en 2010" },
  case7qq: { nature: 'rep', taux: 0, plafond: 12_000, millesime: 2009, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2012 : Investissements réalisés en 2010 avec promesse d’achat en 2009 ou réalisé en 2009" },
  case7qw: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2015 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 avec promesse d’achat en 2010" },
  case7qx: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2015 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 ou 2012 avec promesse d’achat en 2011" },
  case7qy: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2015 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2012 ou du 1.1 au 31.3.2013 avec engagement en 2012" },
  case7qz: { nature: 'rep', taux: 0, plafond: 6_000, millesime: 2010, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 avec promesse d’achat en 2010" },
  case7ra: { nature: 'rep', taux: 0, plafond: 10_000, millesime: 2011, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2011 ou 2012 avec promesse d’achat en 2011" },
  case7rc: { nature: 'rep', taux: 0, plafond: 8_000, millesime: 2012, libelle: "Report 1/3 du complément (seconde prorogation 2024), achevé en 2016 (Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna) : Investissements réalisés en 2012 ou du 1.1 au 31.3.2013 avec engagement en 2012" },
  case7hz: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2021, investissement 2009" },
  case7iv: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2022, investissement 2009" },
  case7vj: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2023, investissement 2009" },
  case7vb: { nature: 'rep', taux: 0, plafond: null, millesime: 2009, libelle: "Report du solde de l'année 2024, investissement 2009" },
  case7kd: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2019, investissement 2010" },
  case7pd: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2020, investissement 2010" },
  case7ku: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2021, investissement 2010" },
  case7iy: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2022, investissement 2010" },
  case7vl: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2023, investissement 2010" },
  case7vh: { nature: 'rep', taux: 0, plafond: null, millesime: 2010, libelle: "Report du solde de l'année 2024, investissement 2010" },
  case7kc: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2019, investissement 2011" },
  case7pc: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2020, investissement 2011" },
  case7kt: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2021, investissement 2011" },
  case7ix: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2022, investissement 2011" },
  case7vk: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2023, investissement 2011" },
  case7vi: { nature: 'rep', taux: 0, plafond: null, millesime: 2011, libelle: "Report du solde de l'année 2024, investissement 2011" },
  case7pe: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2020, investissement 2012" },
  case7kv: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2021, investissement 2012" },
  case7iz: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2022, investissement 2012" },
  case7vo: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2023, investissement 2012" },
  case7vp: { nature: 'rep', taux: 0, plafond: null, millesime: 2012, libelle: "Report du solde de l'année 2024, investissement 2012" },
};
// Cases de la déclaration 2027 : règle de la cohorte précédente (voir cases2027.ts).
ajouterJumelles2027(REGLES_SCELLIER as Partial<Record<string, RegleScellier>>,
  (r, cle) => ({ ...r, libelle: `${r.libelle} — règle reprise pour la case 2027 ${cle.slice(4).toUpperCase()}` }));

const montant = (v: unknown) => Math.max(0, typeof v === 'number' ? v : 0);

export interface InvestissementsScellierResult {
  /** Réductions non restituables, avant plafonnement. */
  reductions: number;
  /** Avantages par année d'investissement (plafonnement global de l'année). */
  millesimes: Record<MillesimeScellier, number>;
}

export function calculerInvestissementsScellier(input: ReductionsCreditsImpotInput): InvestissementsScellierResult {
  const brut: Record<MillesimeScellier, number> = { 2009: 0, 2010: 0, 2011: 0, 2012: 0 };
  for (const [cle, r] of Object.entries(REGLES_SCELLIER) as [CleScellier, RegleScellier][]) {
    const m = Math.min(montant(input[cle]), r.plafond ?? Infinity);
    brut[r.millesime] += r.nature === 'comp' ? m * r.taux : m;
  }
  // 1 000 × 4 % / 3 = 13,33 € ; marge contre les écarts flottants (x,5).
  const millesimes = Object.fromEntries(
    Object.entries(brut).map(([a, v]) => [a, Math.round(v + 1e-9)]),
  ) as Record<MillesimeScellier, number>;
  return { reductions: Object.values(millesimes).reduce((s, v) => s + v, 0), millesimes };
}
