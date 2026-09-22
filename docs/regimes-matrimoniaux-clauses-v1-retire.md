# Clauses des régimes matrimoniaux — retirées en V1

Ce document extrait la fonctionnalité "clauses du contrat de mariage" retirée du périmètre V1 (2026-09-22), pour permettre une reconstruction propre en V2. Le régime matrimonial lui-même (`RegimeType`, sélection du régime, `regime_matrimonial`) est **conservé** et n'est pas concerné par ce retrait.

## Ce qui reste en place (hors périmètre du retrait)

Ne pas confondre avec le catalogue de clauses ci-dessous — ces mécanismes portent aussi le mot "clause" mais sont des fonctionnalités distinctes, toujours actives :

- **Qualification de bien par bien** (`src/lib/patrimoine/qualification.ts`) : `clauseEntreeCommunaute`/`clauseRemploi`, cases à cocher par actif (`assets.clause_entree_communaute`/`assets.clause_remploi`), saisies dans `OrigineQualificationFields.tsx`.
- **Société d'acquêts / extension aux propres par nature** : gardées comme mécanisme de qualification (décision explicite du 2026-09-22, cf. section dédiée plus bas) — reconstruites dans `src/components/famille/matrimonial/QualificationRegimeOptions.tsx`, toujours stockées dans `marital_status.clauses_contrat.societe_acquets` / `.extension_propres_par_nature`.
- **Clauses de donation/legs** (`liberalites.clauses`, ex. "Dispense de rapport", "Rapport forfaitaire") — gérées par `DonationForm.tsx`/`LegsForm.tsx`, indépendantes du contrat de mariage.
- **Clause bénéficiaire d'assurance-vie** (`av_contract_details.clause_beneficiaire*`) — domaine contrat AV, `ClauseBeneficiaireBuilder.tsx`.
- **Clause de renonciation en cas de séparation de corps** (`marital_status.separation_corps_clause_renonciation`) — champ indépendant, géré directement dans `RelationInfoForm.tsx`.
- **"Clause particulière" texte libre** dans `RecompensesSection.tsx`/`CreancesEntreEpouxSection.tsx` — champ texte libre indépendant du catalogue ci-dessous.
- **Clauses de pacte d'associés** (`societe_pactes.clause_*`) — domaine société, sans rapport.

## Ce qui a été retiré

### Catalogue de clauses par régime (`src/constants/matrimonialClauses.ts`)

`CLAUSES_BY_REGIME: Record<RegimeType, ClauseDefinition[]>` définissait, pour chaque régime, la liste des clauses proposables :

- **communaute_reduite** : mise_en_communaute, extension_propres_par_nature, reprise_apports, preciput, attribution_integrale, partage_inegal, stipulation_bien_propre, prelevement_biens_communs, prelevement_indemnisation.
- **communaute_meubles** : mêmes clauses que communauté réduite.
- **communaute_universelle** : attribution_integrale, preciput, extension_propres_par_nature, reprise_apports.
- **separation_biens** : contribution_charges, amenagement_indivision, maintien_indivision, prelevement_indemnisation, presomption_propriete, dissolution_alternative.
- **participation_acquets** : exclusion_biens_professionnels, plafonnement_creance, extension_qualification_acquets, partage_inegal_acquets, prelevement_indemnisation, presomption_propriete.
- **separation_societe_acquets** : societe_acquets (+ sous-clauses), presomption_propriete.

`SOCIETE_ACQUETS_SUB_CLAUSES` : partage_inegal_sub, attribution_integrale_sub, preciput_sub, reprise_apports (sous-clauses actives uniquement quand `societe_acquets` est cochée).

`CLAUSES_IMPACTING_TRANSMISSION` = attribution_integrale(_sub), preciput(_sub), partage_inegal(_sub), partage_inegal_acquets, societe_acquets.

`CLAUSE_REGIME_COMPATIBILITY` : matrice de compatibilité clause/régime issue du référentiel juridique (§8.11), plafond légal indépendant de `CLAUSES_BY_REGIME` (qui reflète l'UI, sous-ensemble du plafond légal).

Chaque `ClauseDefinition` portait : `key`, `label`, `description`, `hasAssets`/`hasPercentages`/`hasOptions`/`hasSubClauses`/`hasResidencePrincipaleOption`/`hasMaintienDivorceOption`/`hasPorteSurOption`, `impactTransmission` (`exclut_succession`/`reduit_masse`/`avantage_matrimonial`/`neutre`), `momentEffet` (`cours_mariage`/`dissolution`), `soumisRetranchement` (action en retranchement art. 1527 al. 2), `assietteImpactee` (`masse_commune`/`succession`/`aucune`).

### Types (`src/types/matrimonial.ts`, retirés)

```ts
export type ClauseType = 'attribution_integrale' | 'preciput' | 'partage_inegal' | 'mise_en_communaute'
  | 'extension_propres_par_nature' | 'reprise_apports' | 'stipulation_bien_propre'
  | 'prelevement_biens_communs' | 'prelevement_indemnisation' | 'societe_acquets'
  | 'contribution_charges' | 'amenagement_indivision' | 'maintien_indivision'
  | 'exclusion_biens_professionnels' | 'plafonnement_creance' | 'extension_qualification_acquets'
  | 'partage_inegal_acquets' | 'partage_inegal_sub' | 'attribution_integrale_sub'
  | 'preciput_sub' | 'presomption_propriete';

export interface ClauseDefinition { key: ClauseType; label: string; hasAssets?: boolean; /* ... */ }
export interface ClauseState {
  enabled: boolean;
  selectedAssets?: string[];
  partPleineProprietee?: number; // partage_inegal / partage_inegal_acquets uniquement
  options?: { pleineProprietee?: boolean; usufruit?: boolean; residencePrincipale?: boolean; maintienDivorce?: boolean; porteSur?: 'pleine_propriete' | 'usufruit' };
}
export interface ClausesData { [key: string]: ClauseState; } // stocké dans marital_status.clauses_contrat (jsonb)

export interface MatrimonialClauseImpact { clauseKey: ClauseType; type: 'attribution_integrale' | 'preciput' | 'parts_inegales' | 'autre'; valeur: number; assetIds?: string[]; partPleineProprietee?: number; }
export interface MatrimonialAnalysisResult { regimeSimplified: 'communauté' | 'séparation' | 'participation' | 'autre'; avantagesMatrimoniaux: MatrimonialClauseImpact[]; totalExcluSuccession: number; notes: string[]; }
```

### Clauses personnalisées (`src/types/customClause.ts`, retiré entièrement)

Texte libre, indépendant du catalogue :

```ts
export const CUSTOM_CLAUSE_TAGS = ['Bien professionnel', 'Attribution préférentielle', 'Indemnité/décote',
  'Condition suspensive', 'Dérogation à la réserve héréditaire', 'Affecte des parts de société ou titres professionnels',
  "Affecte un contrat d'assurance-vie", 'Affecte un bien immobilier précis', "Exclusion d'un bien de la communauté",
  'Clause de reprise des apports en cas de divorce', "Condition liée à la présence d'enfants (communs ou non communs)"] as const;

export interface ClausePersonnalisee {
  id: string; texte: string; tags: CustomClauseTag[]; biensVises: string[];
  beneficiaire?: string; parametres: string[];
  impacteCalcul: boolean; // déclaratif, jamais branché sur le moteur de calcul
}
```
Stocké dans `marital_status.clauses_personnalisees` (jsonb, colonne supprimée).

### Moteur de calcul

- **`src/lib/patrimoine/avantagesMatrimoniaux.ts`** (fichier entier retiré) :
  - `getFractionAjustee(asset, ctx)` : fraction (0 à 1) de la valeur d'un bien commun entrant dans la succession du défunt, ajustée par préciput/attribution intégrale/partage inégal (art. 1515-1524 C. civ.). `null` si aucune clause ne concerne le bien → repli sur `getPartSuccessorale` (50/50 légal).
  - `getPartConjointAjustee` : miroir pour le sens "conjoint décède en premier".
  - `buildAvantageMatrimonialCtx(clausesData, getNpSurvivant)` : construit le contexte depuis `ClausesData`.
  - `getFractionPassifAjustee` : symétrie partage inégal sur le passif commun (art. 1521 C. civ.).
  - `CLAUSE_MUTUAL_EXCLUSION` : attribution_integrale et partage_inegal mutuellement exclusives.
  - `resolvePreciputMode(options)` : résout pleine_propriete/usufruit depuis les deux checkboxes.

- **`src/lib/patrimoine/analyseClausesTransmission.ts`** (fichier entier retiré) : `computeValeurExclueClause`/`getFractionExclueSuccession`, dupliqué volontairement de `avantagesMatrimoniaux.ts` pour l'écran de saisie (valorisation affichée, pas le calcul fiscal réel).

- **`src/lib/patrimoine/regimeChangeClauses.ts`** (fichier entier retiré) : `getClausesIncompatibles(clausesActuelles, nouveauRegime)` détectait les clauses actives devenues incompatibles lors d'un changement de régime, pour proposer une confirmation avant de les désactiver. `toRegimeType` (mapping libellé → `RegimeType`) a été **conservé**, déplacé dans `src/types/matrimonial.ts`.

- **`src/lib/transmission/index.ts`** : `TransmissionContext.clausesData?: ClausesData` retiré. Le bloc "0bis. Avantages matrimoniaux" (construction de `avantageMatrimonialCtx` depuis `preciput`/`attribution_integrale`/`partage_inegal`, `deltaAvantageMatrimonial`) a été supprimé — `getFractionSuccessorale` revient directement à `getPartSuccessorale` (comportement "sans clause" = partage légal, déjà le comportement par défaut du moteur).

- **`src/utils/transmissionHelpers.ts`** :
  - `parseClausesData(clausesContratRaw): ClausesData` (validation Zod de `marital_status.clauses_contrat`) — retiré.
  - `buildPatrimonySnapshot(...)` avait un paramètre `partConjointInegal: number | null` (4ᵉ position) appliquant la symétrie partage inégal au passif via `getFractionPassifAjustee` — retiré (tous les appelants réels passaient déjà `null`, donc aucun changement de comportement).
  - `buildSpouseRawAssets(assets, clausesData?, utilisateurDateNaissance?, referenceDate, ...)` appliquait `getPartConjointAjustee` avant de neutraliser `qualification_bien` — simplifié pour toujours utiliser `getPartConjointSuccession` (paramètres `clausesData`/`utilisateurDateNaissance`/`referenceDate` retirés, plus jamais utilisés).

### Hooks

- **`src/hooks/useMatrimonialClauses.ts`** (retiré) : CRUD complet (`toggleClause`, `updateClauseAssets`, `updateClausePercentage`, `updateClauseOptions`, `updateDonation`, `getClausesForRegime`, `analyzeForTransmission`), sauvegarde debouncée (800ms) vers `marital_status.clauses_contrat` + `donation_dernier_vivant_*` (le hook gérait aussi l'onglet Donation, désormais géré directement par `RelationInfoForm.tsx`).
- **`src/hooks/useCustomMatrimonialClauses.ts`** (retiré) : CRUD `ClausePersonnalisee[]` vers `marital_status.clauses_personnalisees`.

### UI

- **`src/components/famille/MatrimonialRegimeOptions.tsx`** (retiré) : dialogue "Clauses du contrat de mariage", listait `CLAUSES_BY_REGIME[regimeType]` via `ClauseItem`, gérait les sous-clauses société d'acquêts et l'affichage de l'impact transmission (`analyzeForTransmission`).
- **`src/components/famille/matrimonial/ClauseItem.tsx`** (retiré) : rendu générique d'une clause (checkbox + sélection de biens + options pleine propriété/usufruit/résidence principale/maintien divorce + `PartConjointInput` pour les clauses à pourcentage).
- **`src/components/famille/matrimonial/ClausesPersonnaliseesSection.tsx`** (retiré) : section clauses personnalisées (texte libre + tags).
- **`src/components/famille/matrimonial/PartConjointInput.tsx`** (retiré) : input de pourcentage pour partage_inegal/partage_inegal_acquets.
- **`src/components/famille/matrimonial/AssetSelectionModal.tsx`** (conservé, générique) : toujours utilisé par `QualificationRegimeOptions.tsx`.
- **`RelationInfoForm.tsx`** : section/onglet `'clauses-contrat'` (nav, rendu, libellé "Clauses du contrat") retirée. L'AlertDialog "Clause(s) devenue(s) incompatible(s)" (déclenché par `handleRegimeSelect`/`getClausesIncompatibles` lors d'un changement de régime) retiré — `handleRegimeSelect` fait maintenant un simple `form.setValue`.

### Alertes de conseil (`src/lib/alertes/`)

Règles retirées de `regles.ts` (et leurs tests dans `regles.test.ts`) :
- `exclusion_biens_professionnels_sans_maintien_divorce`
- `avantage_matrimonial_sans_maintien_divorce`
- `enfants_non_communs_avantage_matrimonial` (risque d'action en retranchement, art. 1527 al. 2)

Ainsi que les helpers `CLAUSES_RETRANCHEMENT`, `hasAvantageMatrimonialActif`, `CLAUSES_REVOCATION_DIVORCE`, `hasAvantageMatrimonialSansMaintienDivorce`, et le champ `AlerteContext.clausesContrat`.

### Alerte "clauses personnalisées" (`Synthese.tsx`)

Bandeau "Une ou plusieurs clauses personnalisées existent... à vérifier manuellement" (basé sur `clauses_personnalisees[].impacteCalcul`) retiré avec la colonne.

### Base de données

Table `marital_status` :
- `clauses_contrat` (jsonb) — **conservée**, réservée désormais aux seules clés `societe_acquets`/`extension_propres_par_nature` (cf. section suivante). Ne contient plus jamais préciput/attribution_integrale/partage_inegal/etc.
- `clauses_personnalisees` (jsonb) — **supprimée** (migration Supabase du 2026-09-22, aucune ligne active en base au moment du retrait : la seule ligne existante n'avait que des clauses `enabled: false`).

## Société d'acquêts / extension aux propres par nature : gardées comme mécanisme de qualification

Décision du 2026-09-22 : contrairement au reste du catalogue, `societe_acquets` et `extension_propres_par_nature` ne sont pas de simples avantages matrimoniaux optionnels — elles sont consommées par `src/lib/patrimoine/qualification.ts::qualifierBien` pour déterminer si un bien est propre ou commun :

- `societe_acquets` (+ `selectedAssets`, `options.residencePrincipale`) : seul mécanisme désignant les biens de la société d'acquêts sous le régime "Séparation de biens avec société d'acquêts" — sans lui, ce régime ne peut plus jamais qualifier un bien comme commun (`qualification.ts:302-306`).
- `extension_propres_par_nature` : fait tomber les biens propres par nature (art. 1404) en commun sous un régime communautaire (art. 1526) (`qualification.ts:261-268`).

Ces deux clés restent donc stockées dans `marital_status.clauses_contrat` (même format `ClauseState` qu'avant : `{ enabled, selectedAssets?, options? }`), lues par `useAssetForm.ts` et `AssetDetailsDialog.tsx`, et éditées par le nouveau composant minimal **`src/components/famille/matrimonial/QualificationRegimeOptions.tsx`** (monté dans `RelationInfoForm.tsx`, section "Régime matrimonial") :
- Sous `separation_societe_acquets` : sélection des biens (réutilise `AssetSelectionModal.tsx`) + case "Résidence principale (quel que soit le bien)".
- Sous un régime communautaire (`getSimplifiedRegime(regimeType) === 'communauté'`) : case "Étendre la communauté aux biens propres par nature (art. 1404, 1526)".

Tout le reste du catalogue (préciput, attribution intégrale, partage inégal, sous-clauses société d'acquêts préciput_sub/attribution_integrale_sub/partage_inegal_sub, clauses de séparation de biens et participation aux acquêts) a été retiré sans mécanisme de remplacement.

## Reconstruction en V2

Pour rétablir la fonctionnalité complète :
1. Réintroduire `ClauseType`/`ClauseDefinition`/`ClauseState`/`ClausesData`/`MatrimonialClauseImpact`/`MatrimonialAnalysisResult` dans `src/types/matrimonial.ts`.
2. Recréer `src/constants/matrimonialClauses.ts` (catalogue ci-dessus).
3. Recréer `src/lib/patrimoine/avantagesMatrimoniaux.ts` et `analyseClausesTransmission.ts`, rebrancher `TransmissionContext.clausesData` dans `lib/transmission/index.ts` (bloc "0bis"), restaurer `parseClausesData`/`partConjointInegal`/`clausesData` dans `transmissionHelpers.ts`.
4. Recréer `useMatrimonialClauses.ts`/`useCustomMatrimonialClauses.ts`, `MatrimonialRegimeOptions.tsx`/`ClauseItem.tsx`/`ClausesPersonnaliseesSection.tsx`/`PartConjointInput.tsx` — **attention à fusionner proprement avec `QualificationRegimeOptions.tsx`**, qui devra redevenir un sous-cas de `societe_acquets`/`extension_propres_par_nature` dans le catalogue plutôt qu'un composant séparé.
5. Restaurer `regimeChangeClauses.ts` (`getClausesIncompatibles`) et l'AlertDialog dans `RelationInfoForm.tsx`.
6. Restaurer les 3 règles d'alerte retirées de `regles.ts` + `AlerteContext.clausesContrat`.
7. Migration Supabase : recréer la colonne `marital_status.clauses_personnalisees` (jsonb).
8. Vérifier avant tout branchement sur le moteur fiscal que les dossiers existants (nouveaux depuis ce retrait) n'ont pas de préciput/attribution intégrale/partage inégal réel non capturé faute d'UI — ce risque était identifié dès la décision de retrait (cf. session du 2026-09-22).
9. Deux limites connues de l'ancien `getFractionAjustee()` (`avantagesMatrimoniaux.ts`), identifiées le 2026-09-17 et jamais corrigées avant le retrait, à traiter dans la reconstruction :
   - **Préciput sans contrôle de suffisance de l'actif net commun ni de caducité (art. 1519 C. civ.)** : le préciput était traité comme une simple réaffectation de fraction sur le bien désigné, sans vérifier que l'actif net commun (après passif et récompenses/reprises) suffit à l'honorer — en droit, les créanciers de la communauté priment et le préciput devient caduc (en tout ou partie) si l'actif net commun est insuffisant.
   - **Droit de reprise des apports et capitaux absent (art. 1525 al. 2 C. civ.)** : avec une attribution intégrale ou un partage inégal, les héritiers de l'époux prédécédé peuvent, sauf stipulation contraire expresse, reprendre les apports et capitaux propres par nature du défunt avant application de la clause — non implémenté.
   - Piste déjà étudiée en 2026-09-17 (mise en attente, pas un chantier de données complet) : une alerte de conseil non bloquante serait réalisable sans recalcul exact, `assets`/`emprunts` portant déjà `qualification_bien` (résolu par `qualifierBien()`), suffisant pour estimer un actif net commun à comparer aux biens préciputés/aux capitaux propres par nature du défunt, dans `lib/alertes/regles.ts`.
