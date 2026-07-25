/**
 * Ajustement de la part successorale d'un bien (ou d'un passif) commun sous
 * l'effet d'une clause d'avantage matrimonial (préciput, attribution
 * intégrale, partage inégal — art. 1515 à 1524 C. civ.), en remplacement du
 * partage par défaut à 50/50 posé par `getPartSuccessorale`
 * (cf. src/lib/patrimoine/succession.ts).
 *
 * Module volontairement isolé : il n'est pas encore consommé par
 * `computeTransmission` (src/lib/transmission/index.ts) ni par
 * `buildPatrimonySnapshot` (src/utils/transmissionHelpers.ts). Le branchement
 * réel (mapping depuis `ClauseState`/`ClausesData` de src/types/matrimonial.ts,
 * extension de `TransmissionContext` pour faire transiter `qualification_bien`
 * des passifs) est prévu comme étape suivante, une fois ce moteur validé en
 * isolation.
 */

import { ClausesData } from '../../types/matrimonial';

export interface AvantageMatrimonialAssetInput {
  id: string;
  /** Qualification civile du bien (cf. qualification.ts::qualifierBien). Seuls
   * les biens communs sont concernés par préciput / attribution intégrale /
   * partage inégal (art. 1515 à 1524 C. civ. : ces clauses portent sur la
   * communauté) — un bien propre ou en indivision suit son régime normal.
   * Sans ce garde-fou, un résidu de clause de préciput actif alors que le
   * régime a changé pour la participation aux acquêts (où qualifierBien()
   * renvoie toujours 'Bien propre') neutraliserait à tort la valeur d'un
   * bien qui doit entrer en totalité dans la succession — diagnostic du
   * chantier participation aux acquêts / avantages matrimoniaux. */
  qualification_bien?: string | null;
}

export interface AvantageMatrimonialContext {
  /** Ids des biens désignés par une clause de préciput. */
  preciputAssetIds: string[];
  /** Modalité du préciput : pleine propriété ou usufruit. `null` = pas de
   * préciput actif. */
  preciputMode: 'pleine_propriete' | 'usufruit' | null;
  /** Modalité de l'attribution intégrale (art. 1524 C. civ.), appliquée à
   * tout bien commun non préciputé. `null` = clause inactive. */
  attributionIntegraleMode: 'pleine_propriete' | 'usufruit' | null;
  /** % de la masse commune attribué au conjoint survivant en cas de clause
   * de partage inégal (art. 1520 s. C. civ.). `null` = clause inactive. */
  partConjointInegal: number | null;
  /** % de nue-propriété du conjoint survivant selon son âge au barème
   * art. 669 CGI (cf. transmission/index.ts::getDemembrementPct). */
  npSurvivant: number;
}

/**
 * Fraction (0 à 1) de la valeur du bien entrant dans la masse successorale du
 * défunt, telle que modifiée par une clause d'avantage matrimonial.
 *
 * Retourne `null` si aucune clause ne concerne ce bien : l'appelant doit dans
 * ce cas conserver le comportement par défaut de `getPartSuccessorale`.
 *
 * Ordre de priorité : le préciput porte sur un bien désigné et prime sur les
 * clauses globales (attribution intégrale / partage inégal), qui elles ne
 * s'appliquent qu'aux biens communs non préciputés — cohérence assurée en
 * amont par la mutuelle exclusion (cf. `isClauseAllowedGivenOthers`), qui
 * empêche attribution intégrale et partage inégal d'être actives ensemble.
 *
 * Les trois clauses ne portent que sur un bien commun (art. 1515 à 1524
 * C. civ. : elles aménagent le partage de la communauté) — le garde-fou
 * `qualification_bien !== 'Bien commun'` s'applique donc avant même la
 * branche préciput, pas seulement aux deux clauses globales, pour rester
 * neutre sur un bien propre (ex. résidu de clause sous participation aux
 * acquêts, où qualifierBien() renvoie toujours 'Bien propre').
 */
export function getFractionAjustee(
  asset: AvantageMatrimonialAssetInput,
  ctx: AvantageMatrimonialContext
): number | null {
  if (asset.qualification_bien !== 'Bien commun') {
    return null;
  }

  if (ctx.preciputMode && ctx.preciputAssetIds.includes(asset.id)) {
    // Pleine propriété : le bien sort intégralement du pot commun, rien à
    // taxer chez les héritiers au titre de ce bien.
    // Usufruit : le bien sort intégralement du pot commun également, mais le
    // survivant n'en a que l'usufruit — la nue-propriété part directement aux
    // héritiers, taxée sur 100% de la valeur du bien (jamais réintégré au
    // partage, donc pas de moitié défunt/moitié conjoint à distinguer ici).
    return ctx.preciputMode === 'pleine_propriete' ? 0 : ctx.npSurvivant;
  }

  if (ctx.attributionIntegraleMode) {
    // Pleine propriété : tout le bien va au survivant, rien ne réintègre la
    // succession du défunt.
    // Usufruit : seule la moitié défunt du bien commun est démembrée (l'autre
    // moitié appartient déjà en propre au survivant après le partage).
    return ctx.attributionIntegraleMode === 'pleine_propriete'
      ? 0
      : 0.5 * ctx.npSurvivant;
  }

  if (ctx.partConjointInegal !== null) {
    return 1 - ctx.partConjointInegal / 100;
  }

  return null;
}

/**
 * Miroir de `getFractionAjustee` pour le côté "conjoint décède en premier"
 * (chained.secondDeath ET ctxConjointDecede dans Succession2ndDeces.tsx —
 * dans les deux cas, le computeTransmission en aval a `family.decedentId` =
 * conjoint, donc y calcule "la part de ce bien qui entre dans SA succession",
 * exactement le rôle que joue `getFractionAjustee` côté utilisateur défunt).
 * Utilisée par `transmissionHelpers.ts::buildSpouseRawAssets`, À LA PLACE de
 * `getPartConjointSuccession`, PENDANT que la vraie `qualification_bien` est
 * encore disponible (avant sa neutralisation à 'Bien propre' — cf. diagnostic
 * chained.secondDeath / ctxConjointDecede).
 *
 * Délègue tel quel à `getFractionAjustee` (Option A : fonction dédiée,
 * `getFractionAjustee` et `getPartConjointSuccession` restent intacts,
 * en fallback) plutôt que de dupliquer sa logique, après vérification
 * qu'aucune divergence n'est nécessaire : préciput, attribution intégrale et
 * partage inégal (cf. constants/matrimonialClauses.ts) désignent tous
 * génériquement "le conjoint survivant" — c.-à-d. quiconque des deux époux
 * survit à l'autre, jamais un époux nommément désigné. La formule par bien
 * ne dépend donc jamais de QUI décède, seulement de la fraction attribuée au
 * survivant vs. au défunt — son sens n'est PAS inversé bien par bien.
 *
 * Ce qui EST inversé, et reste entièrement à la charge de l'appelant : le
 * survivant lui-même. Ici c'est le conjoint qui décède, donc le survivant
 * est l'UTILISATEUR — `ctx.npSurvivant` (nue-propriété barème art. 669 CGI,
 * utilisée pour les modalités "usufruit" du préciput/de l'attribution
 * intégrale) doit être calculée sur l'âge de l'UTILISATEUR, jamais sur celui
 * du conjoint (à l'inverse de l'usage habituel de `getFractionAjustee`, où
 * npSurvivant est toujours l'âge du conjoint). Voir
 * `buildAvantageMatrimonialCtx` ci-dessous, qui construit ce contexte à
 * partir d'un `npSurvivant` déjà résolu par l'appelant.
 *
 * Limite assumée, non traitée ici (hors périmètre de ce miroir, cf.
 * discussion avec l'utilisateur) : pour `chained.secondDeath`, ce contexte
 * représente le 2nd décès du conjoint, survenant APRÈS que la communauté a
 * déjà été dissoute au 1er décès (celui de l'utilisateur). Appliquer à
 * nouveau une clause de communauté (préciput/attribution intégrale/partage
 * inégal) sur un bien 'Bien commun' à ce stade est une approximation —
 * mais c'est la même approximation déjà présente dans le comportement
 * existant de `getPartConjointSuccession` pour ce même bien à ce même site
 * d'appel (qui traite déjà 'Bien commun' de façon uniforme, qu'il s'agisse
 * du 1er ou du 2nd décès simulé) : ce miroir ne fait qu'étendre à cette
 * même granularité, sans introduire de nouvelle incohérence.
 */
export function getPartConjointAjustee(
  asset: AvantageMatrimonialAssetInput,
  ctx: AvantageMatrimonialContext
): number | null {
  return getFractionAjustee(asset, ctx);
}

/**
 * Construit l'`AvantageMatrimonialContext` attendu par `getFractionAjustee`/
 * `getPartConjointAjustee` à partir de `ClausesData` — même mapping que celui
 * fait en interne par `computeTransmission` (lib/transmission/index.ts),
 * factorisé ici pour être réutilisable par `buildSpouseRawAssets` sans
 * dupliquer le parsing des clauses une troisième fois. `computeTransmission`
 * n'est volontairement PAS modifié pour appeler ce helper (déjà validé,
 * changement jugé hors périmètre de ce chantier).
 *
 * `getNpSurvivant` est un callback paresseux (pas une valeur déjà résolue) :
 * il n'est invoqué que si une clause en modalité 'usufruit' est réellement
 * active, pour ne jamais exiger une date de naissance (et lever une erreur)
 * sur un dossier qui ne s'en sert pas — même garde que `computeTransmission`
 * (cf. `needsNpSurvivant` dans lib/transmission/index.ts).
 */
export function buildAvantageMatrimonialCtx(
  clausesData: ClausesData | undefined,
  getNpSurvivant: () => number
): AvantageMatrimonialContext | null {
  const preciputClause = clausesData?.['preciput'];
  const attributionIntegraleClause = clausesData?.['attribution_integrale'];
  const partageInegalClause = clausesData?.['partage_inegal'];

  const preciputMode = preciputClause?.enabled ? resolvePreciputMode(preciputClause.options) : null;
  const attributionIntegraleMode = attributionIntegraleClause?.enabled
    ? (attributionIntegraleClause.options?.porteSur || 'pleine_propriete')
    : null;
  const partConjointInegal = partageInegalClause?.enabled
    ? (partageInegalClause.partPleineProprietee ?? null)
    : null;

  if (!preciputMode && !attributionIntegraleMode && partConjointInegal === null) {
    return null;
  }

  const needsNpSurvivant = preciputMode === 'usufruit' || attributionIntegraleMode === 'usufruit';

  return {
    preciputAssetIds: preciputClause?.selectedAssets || [],
    preciputMode,
    attributionIntegraleMode,
    partConjointInegal,
    npSurvivant: needsNpSurvivant ? getNpSurvivant() : 0
  };
}

/**
 * Miroir de `getFractionAjustee` pour le passif commun (art. 1521 C. civ.) :
 * seule la clause de partage inégal a un effet symétrique sur le passif —
 * le conjoint supportant une part inégale de l'actif commun en supporte le
 * même ratio au passif. Le préciput et l'attribution intégrale ne suivent
 * pas cette symétrie (l'attribution intégrale oblige d'ailleurs son
 * bénéficiaire à acquitter la totalité du passif commun — mécanique
 * distincte, hors périmètre de ce calcul de masse taxable) : ils retournent
 * `null`, laissant l'appelant appliquer le traitement par défaut du passif.
 */
export function getFractionPassifAjustee(
  passif: AvantageMatrimonialAssetInput,
  ctx: Pick<AvantageMatrimonialContext, 'partConjointInegal'>
): number | null {
  if (passif.qualification_bien !== 'Bien commun') {
    return null;
  }
  if (ctx.partConjointInegal === null) {
    return null;
  }
  return 1 - ctx.partConjointInegal / 100;
}

/**
 * Clés de clauses mutuellement exclusives — une même convention matrimoniale
 * ne peut pas prévoir à la fois une attribution intégrale et un partage
 * inégal (mécaniques concurrentes sur le même bien commun). Miroir de
 * `CLAUSE_REGIME_COMPATIBILITY` (src/constants/matrimonialClauses.ts), gardé
 * ici tant que ce module n'est pas branché sur `useMatrimonialClauses.ts`.
 */
export const CLAUSE_MUTUAL_EXCLUSION: Record<string, string[]> = {
  attribution_integrale: ['partage_inegal'],
  partage_inegal: ['attribution_integrale'],
};

/**
 * Indique si `clauseKey` peut être active compte tenu des autres clauses déjà
 * activées (`otherEnabledClauses`), au regard de `CLAUSE_MUTUAL_EXCLUSION`.
 */
export function isClauseAllowedGivenOthers(
  clauseKey: string,
  otherEnabledClauses: string[]
): boolean {
  const excluded = CLAUSE_MUTUAL_EXCLUSION[clauseKey] ?? [];
  return !otherEnabledClauses.some((key) => excluded.includes(key));
}

/**
 * Résout la modalité du préciput à partir des deux cases à cocher
 * indépendantes (pleine propriété / usufruit) stockées en base
 * (`ClauseState.options`). En cas d'état ambigu (les deux cochées — ne
 * devrait pas arriver via l'UI normale mais la base ne le garantit pas),
 * repli sur pleine propriété.
 */
export function resolvePreciputMode(options?: {
  pleineProprietee?: boolean;
  usufruit?: boolean;
}): 'pleine_propriete' | 'usufruit' | null {
  if (!options) return null;
  if (options.pleineProprietee) return 'pleine_propriete';
  if (options.usufruit) return 'usufruit';
  return null;
}
