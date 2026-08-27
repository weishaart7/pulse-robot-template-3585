// Barème IS 2024 : 15% jusqu'à 42 500 €, 25% au-delà (taux réduit PME).
// Le taux réduit suppose 3 conditions légales cumulatives : CA < 10 M€, capital
// libéré, détention ≥75% par des personnes physiques. Seule la première est
// vérifiable automatiquement (`chiffreAffaires`) ; les deux autres n'ont pas de
// champ dédié en base et sont donc laissées à la confirmation explicite de
// l'utilisateur (`eligiblePME`, case à cocher sur la fiche société — cf.
// `societes.eligible_taux_reduit_pme`). Taux normal par défaut : sans
// confirmation explicite, on ne suppose jamais l'éligibilité.
// `chiffreAffaires` non fourni (simulateurs génériques sans société réelle,
// pas de case à cocher) : comportement historique préservé (taux réduit
// supposé), ces simulateurs ne portant pas sur une société réelle.
const SEUIL_TAUX_REDUIT = 42500;
const SEUIL_CA_PME = 10_000_000;
const TAUX_REDUIT = 0.15;
const TAUX_NORMAL = 0.25;

export function computeImpotSocietes(
  resultat: number,
  chiffreAffaires?: number | null,
  eligiblePME?: boolean
): number {
  if (resultat <= 0) return 0;
  const eligibleTauxReduit =
    chiffreAffaires === undefined
      ? true
      : chiffreAffaires !== null && chiffreAffaires < SEUIL_CA_PME && eligiblePME === true;
  if (!eligibleTauxReduit) return resultat * TAUX_NORMAL;
  if (resultat <= SEUIL_TAUX_REDUIT) return resultat * TAUX_REDUIT;
  return SEUIL_TAUX_REDUIT * TAUX_REDUIT + (resultat - SEUIL_TAUX_REDUIT) * TAUX_NORMAL;
}
