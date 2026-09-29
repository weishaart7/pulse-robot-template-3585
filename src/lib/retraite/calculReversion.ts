/**
 * Pensions de réversion et revenu du conjoint survivant (audit Retraite du
 * 2026-09-29, phase 4) — fonctions pures.
 *
 * Règles validées le 2026-09-29 :
 * - Mariage seul : le PACS et le concubinage n'ouvrent aucune réversion,
 *   dans aucun régime.
 * - Régime général (et régimes alignés) : 54 % de la pension du défunt hors
 *   majoration pour enfants ; minimum (proratisé si le défunt a moins de 60
 *   trimestres) et maximum ; plafond de ressources « personne seule », la
 *   réversion étant réduite du dépassement. Ressources retenues : pensions
 *   personnelles du survivant uniquement (revenus du patrimoine ignorés —
 *   réversion possiblement surestimée, signalé à l'écran).
 * - CNAVPL : 54 %, soumise au même plafond (appliqué au total régime général
 *   + CNAVPL, réduit au prorata) — alignement à confirmer.
 * - Agirc-Arrco : 60 % sans condition de ressources ; fonction publique et
 *   RAFP (rente) : 50 %, sans condition d'âge ni de ressources.
 * - Survivant supposé non remarié, vivant seul, ayant atteint 55 ans
 *   (évaluation une fois les deux conjoints retraités).
 * - Non modélisés : majoration de 11,1 % des petites pensions après 65 ans,
 *   partage entre ex-conjoints, réversion des autres régimes à points.
 */

import { AssietteReversion } from './pensionConsolidee';
import { MILLESIME_COURANT, PARAMETRES_REVERSION } from './parametres';

export type StatutCouple = 'marie' | 'pacse' | 'concubin';

export interface DetailReversion {
  regimeGeneral: number;
  cnavpl: number;
  agircArrco: number;
  fonctionPublique: number;
  rafp: number;
  total: number;
  /** Réversion régime général + CNAVPL réduite par le plafond de ressources. */
  reduiteParPlafondRessources: boolean;
}

const AUCUNE_REVERSION: DetailReversion = {
  regimeGeneral: 0,
  cnavpl: 0,
  agircArrco: 0,
  fonctionPublique: 0,
  rafp: 0,
  total: 0,
  reduiteParPlafondRessources: false,
};

/** Réversion du régime général avant plafond de ressources : 54 %, minimum et maximum. */
export function reversionRegimeGeneralAvantPlafond(pensionDefunt: number, trimestresDefunt: number): number {
  if (pensionDefunt <= 0) return 0;
  const { minimumMensuel, maximumMensuel } = MILLESIME_COURANT.reversionRegimeGeneral;
  const minimum =
    minimumMensuel * 12 * Math.min(1, trimestresDefunt / PARAMETRES_REVERSION.trimestresMinimumComplet);
  const brute = pensionDefunt * PARAMETRES_REVERSION.tauxRegimeGeneral;
  return Math.min(Math.max(brute, minimum), maximumMensuel * 12);
}

/**
 * Réversions dues au survivant au décès de son conjoint.
 * `ressourcesPropresSurvivant` : pensions personnelles brutes annuelles du
 * survivant (base + complémentaires).
 */
export function reversionPourSurvivant(
  defunt: AssietteReversion,
  ressourcesPropresSurvivant: number,
  statut: StatutCouple
): DetailReversion {
  if (statut !== 'marie') return AUCUNE_REVERSION;

  const rgAvantPlafond = reversionRegimeGeneralAvantPlafond(defunt.regimeGeneral, defunt.trimestresRegimeGeneral);
  const cnavplAvantPlafond = defunt.cnavpl * PARAMETRES_REVERSION.tauxCNAVPL;
  const soumisAuPlafond = rgAvantPlafond + cnavplAvantPlafond;
  const plafond = MILLESIME_COURANT.reversionRegimeGeneral.plafondRessourcesSeulAnnuel;
  const depassement = Math.max(0, ressourcesPropresSurvivant + soumisAuPlafond - plafond);
  const apresPlafond = Math.max(0, soumisAuPlafond - depassement);
  const ratio = soumisAuPlafond > 0 ? apresPlafond / soumisAuPlafond : 0;

  const regimeGeneral = rgAvantPlafond * ratio;
  const cnavpl = cnavplAvantPlafond * ratio;
  const agircArrco = defunt.agircArrco * PARAMETRES_REVERSION.tauxAgircArrco;
  const fonctionPublique = defunt.fonctionPublique * PARAMETRES_REVERSION.tauxFonctionPublique;
  const rafp = defunt.rafp * PARAMETRES_REVERSION.tauxRAFP;

  return {
    regimeGeneral,
    cnavpl,
    agircArrco,
    fonctionPublique,
    rafp,
    total: regimeGeneral + cnavpl + agircArrco + fonctionPublique + rafp,
    reduiteParPlafondRessources: soumisAuPlafond > 0 && depassement > 0,
  };
}

/**
 * Statut du couple déduit du libellé `marital_status.statut_couple` (même
 * normalisation que `checkIsInCouple()`). `null` si pas en couple.
 */
export function statutCoupleDepuisLibelle(libelle: string | undefined | null): StatutCouple | null {
  if (!libelle) return null;
  const s = libelle.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s.includes('mari')) return 'marie';
  if (s.includes('pacs')) return 'pacse';
  if (s.includes('concubin') || s.includes('union libre')) return 'concubin';
  return null;
}
