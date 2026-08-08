/**
 * Détection des clauses actives devenues incompatibles lors d'un changement
 * de régime matrimonial — cf. diagnostic chantier participation aux acquêts
 * / avantages matrimoniaux : rien n'empêchait jusqu'ici qu'une clause reste
 * active en base (`clauses_contrat`) après un changement de régime qui la
 * rend incompatible (ex. un résidu de préciput sous participation aux
 * acquêts, cf. le garde-fou déjà posé dans avantagesMatrimoniaux.ts).
 *
 * Logique extraite en fonctions pures (consommées par
 * RelationInfoForm.tsx::handleRegimeSelect) pour rester testable sans
 * infrastructure de test de composants React, absente de ce projet.
 */
import { ClausesData, RegimeType } from '@/types/matrimonial';
import { CLAUSES_BY_REGIME, SOCIETE_ACQUETS_SUB_CLAUSES, isClauseCompatibleWithRegime } from '@/constants/matrimonialClauses';

// Régime matrimonial (libellé humain, cf. RelationInfoForm.tsx::formSchema)
// → RegimeType simplifié attendu par CLAUSES_BY_REGIME/isClauseCompatibleWithRegime.
export function toRegimeType(regimeMatrimonial: string | undefined): RegimeType {
  switch (regimeMatrimonial) {
    case 'Communauté réduite aux acquêts':
      return 'communaute_reduite';
    case "Communauté de meubles et d'acquêts":
      return 'communaute_meubles';
    case 'Communauté universelle':
      return 'communaute_universelle';
    case 'Séparation de biens':
      return 'separation_biens';
    case "Séparation de biens avec société d'acquêts":
      return 'separation_societe_acquets';
    case 'Participation aux acquêts':
      return 'participation_acquets';
    default:
      return 'communaute_reduite';
  }
}

// Libellés de toutes les clauses connues (tous régimes confondus + sous-clauses
// société d'acquêts), pour nommer une clause active devenue incompatible sans
// dépendre du régime sous lequel elle a été configurée à l'origine.
const ALL_CLAUSE_LABELS: Record<string, string> = Object.fromEntries(
  [...Object.values(CLAUSES_BY_REGIME).flat(), ...SOCIETE_ACQUETS_SUB_CLAUSES].map((c) => [c.key, c.label])
);

// Clés de clauses compatibles avec un régime donné — même logique que
// useMatrimonialClauses.ts::getClausesForRegime (CLAUSES_BY_REGIME filtré par
// isClauseCompatibleWithRegime), dupliquée ici plutôt que ré-exposée depuis le
// hook pour ne pas toucher à son architecture (cf. diagnostic étape B :
// décision validée de retenir cette définition UI, plus conservatrice que la
// matrice légale seule pour attribution_integrale/partage_inegal sous
// participation aux acquêts, cf. incohérence CLAUSE_REGIME_COMPATIBILITY vs
// CLAUSES_BY_REGIME.participation_acquets déjà signalée).
export function getClausesCompatiblesKeys(regime: RegimeType): Set<string> {
  return new Set(
    (CLAUSES_BY_REGIME[regime] || [])
      .filter((clause) => isClauseCompatibleWithRegime(clause.key, regime))
      .map((clause) => clause.key)
  );
}

export interface ClauseIncompatible {
  key: string;
  label: string;
}

/**
 * Clauses actuellement `enabled: true` dans `clausesActuelles` qui ne
 * figurent plus parmi les clauses compatibles du régime candidat
 * `nouveauRegime`. Liste vide = changement de régime sans impact sur les
 * clauses (pas de confirmation nécessaire).
 */
export function getClausesIncompatibles(
  clausesActuelles: ClausesData,
  nouveauRegime: RegimeType
): ClauseIncompatible[] {
  const clausesCompatibles = getClausesCompatiblesKeys(nouveauRegime);

  return Object.entries(clausesActuelles)
    .filter(([key, state]) => state?.enabled && !clausesCompatibles.has(key))
    .map(([key]) => ({ key, label: ALL_CLAUSE_LABELS[key] || key }));
}
