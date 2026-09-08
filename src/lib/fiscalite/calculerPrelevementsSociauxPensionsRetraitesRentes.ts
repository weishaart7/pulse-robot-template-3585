import { FRACTION_IMPOSABLE_RENTE } from './calculerPensionsRetraitesRentes';
import { PensionsRetraitesRentesInput } from './types';

/**
 * Rentes viagères à titre onéreux : régime du patrimoine, taux fixe
 * indépendant du RFR du foyer. 18,6 % et non 17,2 % : vérifié empiriquement
 * sur un compte réel (couple marié, 1CW=12 000 €, fraction imposable 40 % =
 * 4 800 €) — le simulateur officiel affiche 893 € de PS au total pour ce
 * foyer, soit exactement 4 800 € × 18,6 % (892,8 €), les pensions classiques
 * ne contribuant rien au total (voir CASES_PS_PENSIONS_HORS_PERIMETRE
 * ci-dessous). Cohérent avec la même règle établie en Phase 3
 * (`calculerPrelevementsSociauxGainsActionnariatSalarie.ts`) : un revenu
 * recouvré par voie de rôle (déclaré dans la 2042 elle-même, jamais prélevé
 * à la source pendant l'année) est déjà au taux LFSS 2026 dès les revenus
 * 2025 — la première version de ce module (17,2 %) n'avait pas reporté cette
 * règle depuis sa découverte en Phase 3.
 */
const TAUX_PS_RENTE_VIAGERE = 0.186;

/**
 * Cases hors périmètre du calcul PS pensions :
 * - **1AS/1AZ/1AO/1AM/1BS/1BZ/1BO/1BM + 1AL/1BL (pensions classiques,
 *   françaises et étrangères)** : la CSG/CRDS/CASA sur ces pensions dépend
 *   d'un taux déterminé par le RFR de l'année **N-2** du foyer (art. L136-8
 *   CSS), une donnée que le module ne modélise pas. Une première version
 *   approximait ce RFR par le revenu imposable de l'année courante calculé
 *   par l'app — approximation invalidée empiriquement (voir
 *   docs/fiscalite.md) : sur un compte réel où le simulateur officiel
 *   n'affiche AUCUN prélèvement sur 41 800 € de pensions classiques
 *   (cohérent avec l'absence de tout accès à un vrai RFR N-2 dans une
 *   simulation ponctuelle), l'approximation par le revenu de l'année
 *   courante plaçait à tort le foyer en tranche pleine (9,1 %), surestimant
 *   les PS de 3 736 €. Non modélisé plutôt que deviné, comme les autres
 *   mécanismes dépendant d'un historique que l'app ne reconstitue pas
 *   (taux historiques de l'assurance-vie, Phase 1).
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
 *   certitude si le taux suit le barème RFR des pensions classiques (donc
 *   lui aussi hors périmètre) ou un mécanisme propre à l'option 163 bis —
 *   non modélisé plutôt que deviné. Confirmé par le même compte réel :
 *   40 000 € déclarés en 1AT, aucune contribution au total PS officiel.
 */
export const CASES_PS_PENSIONS_HORS_PERIMETRE = [
  'case1as', 'case1bs', 'case1az', 'case1bz', 'case1ao', 'case1bo', 'case1am', 'case1bm',
  'case1al', 'case1bl',
  'case1ai', 'case1bi',
  'case1at', 'case1bt',
] as const;

export interface PrelevementsSociauxPensionsResult {
  /** Base soumise à 18,6 % : fraction imposable de 1AW/1BW/1CW/1DW + 1AR/1BR/1CR/1DR selon la tranche d'âge (identique à l'IR, seul le taux diffère). */
  baseImposableRentesViageres: number;
  prelevementsSociauxRentesViageres: number;
  prelevementsSociaux: number;
  casesHorsPerimetre: readonly string[];
}

/**
 * Prélèvements sociaux du cadre 1 « Pensions, retraites, rentes » (Phase 2 du
 * chantier PS, voir docs/fiscalite.md), limités au seul mécanisme dont
 * l'assiette et le taux sont indépendants d'un RFR historique non modélisé :
 * les **rentes viagères à titre onéreux** (1AW/1BW/1CW/1DW + 1AR/1BR/1CR/1DR)
 * — régime du patrimoine, taux fixe de 18,6 % sur la même fraction imposable
 * que l'IR (par tranche d'âge d'entrée en jouissance).
 *
 * **Les pensions classiques (1AS/1AZ/1AO/1AM + 1AL/1BL) et les capitaux
 * (1AI, 1AT) sont hors périmètre** : voir CASES_PS_PENSIONS_HORS_PERIMETRE
 * pour le détail — le taux de CSG/CRDS/CASA sur les pensions dépend d'un RFR
 * N-2 que le module ne modélise pas, et une approximation par le revenu
 * imposable courant s'est révélée empiriquement fausse (surestimation de
 * plusieurs milliers d'euros sur un compte réel).
 */
export function calculerPrelevementsSociauxPensionsRetraitesRentes(
  input: PensionsRetraitesRentesInput,
): PrelevementsSociauxPensionsResult {
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
    baseImposableRentesViageres,
    prelevementsSociauxRentesViageres,
    prelevementsSociaux: prelevementsSociauxRentesViageres,
    casesHorsPerimetre: CASES_PS_PENSIONS_HORS_PERIMETRE,
  };
}
