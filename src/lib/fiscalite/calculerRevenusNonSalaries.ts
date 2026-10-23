import { TAUX_PS_CAPITAUX_MOBILIERS } from './calculerPrelevementsSociauxCapitauxMobiliers';
import { RevenusNonSalariesInput } from './types';

/** Abattement minimal des régimes micro, par activité (art. 50-0 et 102 ter CGI). */
const ABATTEMENT_MINIMUM = 305;

/** Seuils des régimes micro, revenus 2025 (brochure IR 2026, p. 168-180). */
export const SEUIL_MICRO_VENTES = 188_700;
export const SEUIL_MICRO_SERVICES = 77_700;
/** Locations meublées non professionnelles (loi Le Meur) : seuils appréciés au niveau du foyer. */
export const SEUIL_MICRO_MEUBLES = 77_700;
export const SEUIL_MICRO_MEUBLES_NON_CLASSES = 15_000;

/**
 * Prélèvements sociaux sur les revenus des locations meublées non professionnelles
 * et sur 5HY/5IY : revenus du patrimoine, 18,6 % pour les revenus 2025 (LFSS 2026),
 * même taux que les capitaux mobiliers.
 */
export const TAUX_PS_NON_SALARIES = TAUX_PS_CAPITAUX_MOBILIERS;

type Cle = keyof RevenusNonSalariesInput;
type Imposition = 'bareme' | 'versement_liberatoire';

interface Categorie {
  cles: [Cle, Cle];
  taux: number;
  imposition: Imposition;
  /** LMNP non soumises aux cotisations sociales : PS calculés par la DGFiP sur le net. */
  prelevementsSociaux: boolean;
}

const CATEGORIES: Categorie[] = [
  // Micro-entrepreneur ayant opté pour le versement libératoire
  { cles: ['case5ta', 'case5ua'], taux: 0.71, imposition: 'versement_liberatoire', prelevementsSociaux: false },
  { cles: ['case5tb', 'case5ub'], taux: 0.50, imposition: 'versement_liberatoire', prelevementsSociaux: false },
  { cles: ['case5te', 'case5ue'], taux: 0.34, imposition: 'versement_liberatoire', prelevementsSociaux: false },
  // Micro-BIC professionnel et non professionnel
  { cles: ['case5ko', 'case5lo'], taux: 0.71, imposition: 'bareme', prelevementsSociaux: false },
  { cles: ['case5kp', 'case5lp'], taux: 0.50, imposition: 'bareme', prelevementsSociaux: false },
  { cles: ['case5no', 'case5oo'], taux: 0.71, imposition: 'bareme', prelevementsSociaux: false },
  { cles: ['case5np', 'case5op'], taux: 0.50, imposition: 'bareme', prelevementsSociaux: false },
  // Locations meublées non professionnelles
  { cles: ['case5ng', 'case5og'], taux: 0.50, imposition: 'bareme', prelevementsSociaux: true },
  { cles: ['case5nh', 'case5oh'], taux: 0.30, imposition: 'bareme', prelevementsSociaux: true },
  { cles: ['case5ni', 'case5oi'], taux: 0.50, imposition: 'bareme', prelevementsSociaux: true },
  { cles: ['case5nj', 'case5oj'], taux: 0.50, imposition: 'bareme', prelevementsSociaux: false },
  { cles: ['case5nk', 'case5ok'], taux: 0.30, imposition: 'bareme', prelevementsSociaux: false },
  { cles: ['case5nl', 'case5ol'], taux: 0.50, imposition: 'bareme', prelevementsSociaux: false },
  // Micro-BNC professionnel et non professionnel
  { cles: ['case5hq', 'case5iq'], taux: 0.34, imposition: 'bareme', prelevementsSociaux: false },
  { cles: ['case5ku', 'case5lu'], taux: 0.34, imposition: 'bareme', prelevementsSociaux: false },
];

/** Revenu net après abattement forfaitaire, avec le minimum de 305 €. */
export function netMicro(recettes: number, taux: number): number {
  if (recettes <= 0) return 0;
  return Math.max(0, Math.round(recettes - Math.max(ABATTEMENT_MINIMUM, recettes * taux)));
}

export type AlerteRevenusNonSalaries =
  | 'ventes_au_dela_du_seuil'
  | 'services_au_dela_du_seuil'
  | 'meubles_au_dela_du_seuil'
  | 'meubles_non_classes_au_dela_du_seuil';

export interface RevenusNonSalariesResult {
  /** Revenus nets micro imposés au barème, déclarants 1 et 2. */
  totalNetImposable: number;
  /**
   * Revenus nets des micro-entrepreneurs au versement libératoire (5TA/5TB/5TE) :
   * l'impôt est déjà payé, mais ces revenus sont retenus pour le taux effectif
   * (art. 197 C CGI) et donc pour le RFR.
   */
  revenuExonereTauxEffectif: number;
  /** Base à 18,6 % : net des LMNP 5NG/5NH/5NI et 5HY/5IY saisis tels quels. */
  basePrelevementsSociaux: number;
  prelevementsSociaux: number;
  alertes: AlerteRevenusNonSalaries[];
}

const somme = (input: RevenusNonSalariesInput, cles: Cle[]) => cles.reduce((s, c) => s + (input[c] ?? 0), 0);

/**
 * Régimes micro de la 2042-C-PRO (revenus 2025/impôt 2026). Recettes brutes
 * saisies, abattement forfaitaire appliqué ici : 71 % ventes, 50 % services et
 * meublés (classés ou à l'année), 30 % meublés de tourisme non classés, 34 %
 * BNC — minimum 305 € par activité et par déclarant.
 *
 * PS : les revenus professionnels et les LMNP soumises aux cotisations
 * (5NJ/5NK/5NL) supportent des cotisations sociales, pas de PS sur la 2042 ;
 * les autres revenus non professionnels non soumis aux cotisations ne sont
 * soumis aux PS que via 5HY/5IY (brochure p. 182 : la DGFiP ne les calcule
 * pas d'office, contrairement aux LMNP 5NG/5NH/5NI).
 *
 * Seuils : signalés, jamais bloquants. Activités appréciées par déclarant
 * (ventes et prestations, services BIC et BNC cumulés), meublés au niveau du foyer.
 */
export function calculerRevenusNonSalaries(input: RevenusNonSalariesInput): RevenusNonSalariesResult {
  let totalNetImposable = 0;
  let revenuExonereTauxEffectif = 0;
  let netMeublesPS = 0;

  for (const cat of CATEGORIES) {
    for (const cle of cat.cles) {
      const net = netMicro(input[cle] ?? 0, cat.taux);
      if (cat.imposition === 'versement_liberatoire') revenuExonereTauxEffectif += net;
      else totalNetImposable += net;
      if (cat.prelevementsSociaux) netMeublesPS += net;
    }
  }

  const basePrelevementsSociaux = netMeublesPS + somme(input, ['case5hy', 'case5iy']);

  const alertes: AlerteRevenusNonSalaries[] = [];
  const ventes = (d: 0 | 1) => somme(input, ([['case5ta', 'case5ko', 'case5no'], ['case5ua', 'case5lo', 'case5oo']] as Cle[][])[d]);
  const services = (d: 0 | 1) => somme(input, ([['case5tb', 'case5te', 'case5kp', 'case5np', 'case5hq', 'case5ku'], ['case5ub', 'case5ue', 'case5lp', 'case5op', 'case5iq', 'case5lu']] as Cle[][])[d]);
  if (ventes(0) > SEUIL_MICRO_VENTES || ventes(1) > SEUIL_MICRO_VENTES) alertes.push('ventes_au_dela_du_seuil');
  if (services(0) > SEUIL_MICRO_SERVICES || services(1) > SEUIL_MICRO_SERVICES) alertes.push('services_au_dela_du_seuil');
  const meublesNonClasses = somme(input, ['case5nh', 'case5oh', 'case5nk', 'case5ok']);
  const meubles = meublesNonClasses + somme(input, ['case5ng', 'case5og', 'case5ni', 'case5oi', 'case5nj', 'case5oj', 'case5nl', 'case5ol']);
  if (meubles > SEUIL_MICRO_MEUBLES) alertes.push('meubles_au_dela_du_seuil');
  if (meublesNonClasses > SEUIL_MICRO_MEUBLES_NON_CLASSES) alertes.push('meubles_non_classes_au_dela_du_seuil');

  return {
    totalNetImposable,
    revenuExonereTauxEffectif,
    basePrelevementsSociaux,
    prelevementsSociaux: Math.round(basePrelevementsSociaux * TAUX_PS_NON_SALARIES),
    alertes,
  };
}
