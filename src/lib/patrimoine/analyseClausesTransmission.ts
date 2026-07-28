/**
 * Valorisation, pour l'ÉCRAN DE SAISIE des clauses matrimoniales, de la part
 * d'un bien sortant de la succession sous l'effet d'une clause d'avantage
 * matrimonial (préciput, attribution intégrale).
 *
 * Volontairement séparé de `avantagesMatrimoniaux.ts` : la triplication de la
 * logique de clauses entre `buildAvantageMatrimonialCtx`, la logique inline de
 * `computeTransmission` (lib/transmission/index.ts) et l'analyse d'écran
 * (useMatrimonialClauses.ts) est une décision assumée. Ce module ne consolide
 * rien : il fournit à `useMatrimonialClauses` la même PONDÉRATION pleine
 * propriété / usufruit que `getFractionAjustee`, sans l'appeler ni fusionner
 * les implémentations.
 *
 * Il vit hors du hook (et non exporté depuis `useMatrimonialClauses.ts`) pour
 * rester testable sans harnais React : le hook importe transitivement le
 * client Supabase, dont l'initialisation touche `localStorage` et casse sous
 * l'environnement `node` de vitest.
 *
 * CONVENTION : ces fonctions renvoient la VALEUR DU BIEN EXCLUE de la
 * succession — soit `(1 - getFractionAjustee) × valeur`. Ce n'est PAS le delta
 * de masse successorale réellement appliqué par `computeTransmission`
 * (`(getPartSuccessorale - getFractionAjustee) × valeur`, soit 0,5 × valeur en
 * pleine propriété pour un bien commun) : l'écran de saisie répond à la
 * question « quelle valeur sort de la succession à cause de cette clause »,
 * pas à celle de l'impact fiscal net.
 */

import { getAssetCategory } from '../../constants/assetTypes';

export type ModaliteClause = 'pleine_propriete' | 'usufruit';

export interface ClauseAssetInput {
  id: string;
  nature?: string;
  valeur_estimee?: number | null;
  /** Qualification civile du bien (cf. qualification.ts::qualifierBien). */
  qualification_bien?: string | null;
}

/**
 * Fraction (0 à 1) de la valeur d'un bien sortant de la succession.
 *
 * Pleine propriété : le bien sort intégralement (miroir de
 * `getFractionAjustee` qui renvoie 0 — rien n'entre en succession).
 * Usufruit : seule la nue-propriété entre en succession (`npSurvivant`), donc
 * la part exclue est l'usufruit, `1 - npSurvivant`.
 *
 * `npSurvivant === null` (date de naissance du conjoint non renseignée) →
 * 0 : aucun montant annoncé plutôt qu'un montant deviné à partir d'un âge
 * arbitraire.
 */
export function getFractionExclueSuccession(
  mode: ModaliteClause,
  npSurvivant: number | null
): number {
  if (mode === 'pleine_propriete') return 1;
  if (npSurvivant === null) return 0;
  return 1 - npSurvivant;
}

/**
 * Valeur totale exclue de la succession par une clause portant sur une liste
 * de biens désignés.
 *
 * Deux filtres, alignés sur le comportement du vrai calcul de transmission :
 * - `qualification_bien === 'Bien commun'` : les clauses d'avantage
 *   matrimonial n'aménagent que le partage de la communauté (art. 1515 à 1524
 *   C. civ.) — même garde-fou qu'en tête de `getFractionAjustee` ;
 * - catégorie `épargne et assurance-vie` écartée, comme le fait
 *   `deltaAvantageMatrimonial` dans `computeTransmission`.
 *
 * `mode === null` (clause active mais aucune modalité cochée) → 0, cohérent
 * avec `getFractionAjustee`, qui n'applique alors aucun ajustement.
 */
export function computeValeurExclueClause(
  assets: ClauseAssetInput[] | undefined | null,
  selectedAssetIds: string[] | undefined | null,
  mode: ModaliteClause | null,
  npSurvivant: number | null
): number {
  if (!assets?.length || !selectedAssetIds?.length || !mode) return 0;

  const fraction = getFractionExclueSuccession(mode, npSurvivant);
  if (fraction === 0) return 0;

  return assets
    .filter(
      (a) =>
        selectedAssetIds.includes(a.id) &&
        a.qualification_bien === 'Bien commun' &&
        getAssetCategory(a.nature || '') !== 'épargne et assurance-vie'
    )
    .reduce((sum, a) => sum + (a.valeur_estimee || 0) * fraction, 0);
}
