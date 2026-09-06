import { FRACTION_IMPOSABLE_RENTE } from './calculerPensionsRetraitesRentes';
import { PensionsRetraitesRentesInput } from './types';

/**
 * Seuils de revenu fiscal de référence (RFR) 2026 déterminant le taux de
 * CSG/CRDS/CASA sur les pensions de retraite (art. L136-8 CSS), pour 1 part.
 * Chaque seuil augmente linéairement de `INCREMENT_*_PAR_PART` par part
 * fiscale supplémentaire (vérifié sur plusieurs paliers 1/1,5/2/2,5/3 parts :
 * l'incrément par demi-part est constant, donc la formule linéaire reste
 * exacte aussi aux quarts de part que produit `calculerPartsFiscales.ts`,
 * ex. résidence alternée).
 *
 * **Approximation assumée (validée en session)** : la loi utilise le RFR de
 * l'année N-2 (calculé par l'administration, déjà connu de la caisse de
 * retraite qui prélève un taux estimé à la source). Le module ne modélise
 * pas de RFR historique : on utilise ici le RFR de l'année courante calculé
 * par l'app comme proxy — approximation à affiner si un vrai historique RFR
 * est un jour modélisé.
 */
const SEUIL_EXONERATION_1_PART = 13047;
const SEUIL_TAUX_REDUIT_1_PART = 17056;
const SEUIL_TAUX_MEDIAN_1_PART = 26471;
const INCREMENT_EXONERATION_PAR_PART = 6968;
const INCREMENT_TAUX_REDUIT_PAR_PART = 9110;
const INCREMENT_TAUX_MEDIAN_PAR_PART = 14132;

/** CSG 3,8 % (entièrement déductible) + CRDS 0,5 %, pas de CASA à ce palier. */
const TAUX_REDUIT = 0.038 + 0.005;
/** CSG 6,6 % + CRDS 0,5 % + CASA 0,3 %. */
const TAUX_MEDIAN = 0.066 + 0.005 + 0.003;
/** CSG 8,3 % + CRDS 0,5 % + CASA 0,3 % — taux plein, max 9,1 %. */
const TAUX_NORMAL = 0.083 + 0.005 + 0.003;

/** Rentes viagères à titre onéreux : régime PS du patrimoine, taux fixe indépendant du RFR du foyer. */
const TAUX_PS_RENTE_VIAGERE = 0.172;

/**
 * Cases hors périmètre du calcul PS pensions :
 * - 1AI/1BI (capital PER, versements volontaires déductibles) : la CSG/CRDS a
 *   déjà été prélevée à l'entrée, sur le salaire brut ayant financé le
 *   versement (la déductibilité fiscale du versement ne s'étend jamais à
 *   l'assiette CSG/CRDS, qui reste calculée sur le salaire brut) — taxer à
 *   nouveau ce capital à la sortie serait une double imposition. Point
 *   explicitement clarifié après la généralisation de la déductibilité par
 *   la loi Pacte (cf. recherche complémentaire, docs/fiscalite.md).
 * - 1AT/1BT (capital retraite, option art. 163 bis CGI) : le BOFiP confirme
 *   qu'une CSG est bien due sur ce capital (« CSG... entièrement non
 *   déductible pour le calcul de ce prélèvement »), mais sans préciser avec
 *   certitude si le taux suit le barème RFR des pensions classiques ou un
 *   mécanisme propre à l'option 163 bis — non modélisé plutôt que deviné.
 */
export const CASES_PS_PENSIONS_HORS_PERIMETRE = [
  'case1ai', 'case1bi',
  'case1at', 'case1bt',
] as const;

export interface PrelevementsSociauxPensionsResult {
  /** Taux de CSG/CRDS/CASA retenu pour le foyer (0 %, 4,3 %, 7,4 % ou 9,1 %), déterminé par le RFR approximé et le nombre de parts. */
  tauxCsgPension: number;
  /** Base soumise à `tauxCsgPension` : 1AS/1AZ/1AO/1AM + 1AL/1BL, montant brut (avant l'abattement de 10 %, qui est spécifique à l'IR). */
  baseImposablePensions: number;
  prelevementsSociauxPensions: number;
  /** Base soumise à 17,2 % : fraction imposable de 1AW/1BW/1CW/1DW + 1AR/1BR/1CR/1DR selon la tranche d'âge (identique à l'IR, seul le taux diffère). */
  baseImposableRentesViageres: number;
  prelevementsSociauxRentesViageres: number;
  prelevementsSociaux: number;
  casesHorsPerimetre: readonly string[];
}

/**
 * Prélèvements sociaux du cadre 1 « Pensions, retraites, rentes » (Phase 2 du
 * chantier PS, voir docs/fiscalite.md), limités aux deux mécanismes dont
 * l'assiette est directement déductible du montant déclaré :
 *
 * 1. **Pensions classiques (1AS/1AZ/1AO/1AM, + 1AL/1BL pensions étrangères)**
 *    : CSG/CRDS/CASA à un taux déterminé par le RFR du foyer et son nombre de
 *    parts (0 % / 4,3 % / 7,4 % / 9,1 %), sur le montant **brut** — l'abattement
 *    de 10 % de `calculerPensionsRetraitesRentes.ts` est réservé à l'IR, sans
 *    effet sur l'assiette PS.
 * 2. **Rentes viagères à titre onéreux (1AW/1BW/1CW/1DW, + 1AR/1BR/1CR/1DR)**
 *    : régime du patrimoine, taux fixe de 17,2 % sur la même fraction
 *    imposable que l'IR (par tranche d'âge d'entrée en jouissance) —
 *    contrairement aux pensions classiques, indépendant du RFR du foyer.
 *
 * Cases hors calcul : voir CASES_PS_PENSIONS_HORS_PERIMETRE (1AI capital PER
 * — déjà prélevé à l'entrée —, 1AT capital retraite 163 bis — taux PS non
 * confirmé avec certitude).
 *
 * `rfrApproxime` : proxy du revenu fiscal de référence (voir seuils
 * ci-dessus pour le détail de l'approximation retenue). `nombreParts` :
 * nombre de parts du foyer (`calculerPartsFiscales.ts`), qui relève les
 * seuils de RFR.
 */
export function calculerPrelevementsSociauxPensionsRetraitesRentes(
  input: PensionsRetraitesRentesInput,
  rfrApproxime: number,
  nombreParts: number,
): PrelevementsSociauxPensionsResult {
  const baseImposablePensions = (input.case1as ?? 0) + (input.case1az ?? 0) + (input.case1ao ?? 0) + (input.case1am ?? 0)
    + (input.case1bs ?? 0) + (input.case1bz ?? 0) + (input.case1bo ?? 0) + (input.case1bm ?? 0)
    + (input.case1al ?? 0) + (input.case1bl ?? 0);

  const parts = Math.max(nombreParts, 1);
  const seuilExoneration = SEUIL_EXONERATION_1_PART + (parts - 1) * INCREMENT_EXONERATION_PAR_PART;
  const seuilTauxReduit = SEUIL_TAUX_REDUIT_1_PART + (parts - 1) * INCREMENT_TAUX_REDUIT_PAR_PART;
  const seuilTauxMedian = SEUIL_TAUX_MEDIAN_1_PART + (parts - 1) * INCREMENT_TAUX_MEDIAN_PAR_PART;

  const rfr = Math.max(0, rfrApproxime);
  const tauxCsgPension = rfr <= seuilExoneration
    ? 0
    : rfr <= seuilTauxReduit
      ? TAUX_REDUIT
      : rfr <= seuilTauxMedian
        ? TAUX_MEDIAN
        : TAUX_NORMAL;

  const prelevementsSociauxPensions = baseImposablePensions * tauxCsgPension;

  const baseImposableRentesViageres = (input.case1aw ?? 0) * FRACTION_IMPOSABLE_RENTE.moins50
    + (input.case1bw ?? 0) * FRACTION_IMPOSABLE_RENTE.de50a59
    + (input.case1cw ?? 0) * FRACTION_IMPOSABLE_RENTE.de60a69
    + (input.case1dw ?? 0) * FRACTION_IMPOSABLE_RENTE.aPartirDe70
    + (input.case1ar ?? 0) * FRACTION_IMPOSABLE_RENTE.moins50
    + (input.case1br ?? 0) * FRACTION_IMPOSABLE_RENTE.de50a59
    + (input.case1cr ?? 0) * FRACTION_IMPOSABLE_RENTE.de60a69
    + (input.case1dr ?? 0) * FRACTION_IMPOSABLE_RENTE.aPartirDe70;

  const prelevementsSociauxRentesViageres = baseImposableRentesViageres * TAUX_PS_RENTE_VIAGERE;

  return {
    tauxCsgPension,
    baseImposablePensions,
    prelevementsSociauxPensions,
    baseImposableRentesViageres,
    prelevementsSociauxRentesViageres,
    prelevementsSociaux: prelevementsSociauxPensions + prelevementsSociauxRentesViageres,
    casesHorsPerimetre: CASES_PS_PENSIONS_HORS_PERIMETRE,
  };
}
