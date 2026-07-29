# Audit de fond — Section Patrimoine

> Document de synthèse produit en **lecture seule** le 2026-07-28. Aucun fichier de code n'a été modifié.
> État du code au commit `a257cdc` (branche `main`, arbre propre).
> Schéma Supabase lu directement en base (projet `npypkocowjkszxtecxzq`, eu-west-3), pas seulement depuis les types générés.
> Convention : quand une information n'a pas pu être trouvée dans le code, la mention **« non trouvé »** est utilisée explicitement.

---

## 1. Vue d'ensemble

### 1.1 Moteur métier — `src/lib/patrimoine/`

| Fichier | Résumé |
|---|---|
| [qualification.ts](src/lib/patrimoine/qualification.ts) | Cœur de la qualification juridique : `qualifierBien()` renvoie `{qualification, raison}` (propre / commun / personnel / indivision / à qualifier) à partir du régime matrimonial, de l'origine, de la date d'acquisition, du détenteur et des clauses. Exporte aussi `isRegimeCommunautaire`, `isPacsIndivision`, `QUALIFICATION_OPTIONS`. |
| [succession.ts](src/lib/patrimoine/succession.ts) | `getPartSuccessorale()` / `getPartConjointSuccession()` : fraction (0–1) d'un bien entrant dans la succession du défunt ou revenant au conjoint, dérivée de `qualification_bien`. Source unique de vérité partagée entre Patrimoine et Transmission. Définit `BienNonQualifieError`. |
| [avantagesMatrimoniaux.ts](src/lib/patrimoine/avantagesMatrimoniaux.ts) | Ajustement de la fraction successorale sous l'effet des clauses de préciput / attribution intégrale / partage inégal (art. 1515–1524). Fonctions : `getFractionAjustee`, `getPartConjointAjustee`, `getFractionPassifAjustee`, `buildAvantageMatrimonialCtx`, `resolvePreciputMode`, `isClauseAllowedGivenOthers`. |
| [recompensesCreances.ts](src/lib/patrimoine/recompensesCreances.ts) | Moteur des récompenses (art. 1468–1478) et créances entre époux (art. 1479, 1543) : `computeProfitSubsistant`, `computeMontantRecompense`, `computeMontantCreance`, `computeSoldeRecompenses`, `computeSoldeCreancesEntreEpoux`, `regimeHasMasseCommune`. |
| [participationAcquets.ts](src/lib/patrimoine/participationAcquets.ts) | Créance de participation (art. 1569–1581) : `computeAcquetNet`, `computeParticipationAcquets`, `regimeIsParticipationAcquets`. Décès uniquement (divorce hors périmètre). |
| [regimeLegal.ts](src/lib/patrimoine/regimeLegal.ts) | Constantes des 6 libellés de régimes (`REGIMES_MATRIMONIAUX`) + `determinerRegimeLegal(dateMariage)` (bascule au 1er février 1966). |
| [regimeChangeClauses.ts](src/lib/patrimoine/regimeChangeClauses.ts) | `toRegimeType()` (libellé humain → `RegimeType`) et `getClausesIncompatibles()` : détecte les clauses actives devenues incompatibles lors d'un changement de régime. |
| [bareme669CGI.ts](src/lib/patrimoine/bareme669CGI.ts) | Barème fiscal usufruit / nue-propriété (art. 669 I CGI) : `BAREME_669_CGI`, `computeAge`, `getTrancheBareme669`, `getTrancheBaremeForYoungest` (âge du plus jeune usufruitier). |
| [utils.ts](src/lib/patrimoine/utils.ts) | Utilitaires transverses : couleurs de catégories, `formatCurrency`, mapping détenteur affichage ↔ base (`mapDetenteurToDisplay`/`ToDb`, `isDetenteurUser/Spouse/Common`), `checkIsInCouple`, `getPourcentagesRepartition`, `calculatePlusValue`. |
| [evolutionPatrimoine.ts](src/lib/patrimoine/evolutionPatrimoine.ts) | `computeEvolutionPatrimoine()` : série temporelle du patrimoine total à partir de `asset_valorisations`, avec repli sur `valeur_estimee`. |
| [regimeFiscalPlusValue.ts](src/lib/patrimoine/regimeFiscalPlusValue.ts) | Régime fiscal des plus-values mobilières nature par nature (PFU 31,4 %, PEA, AGA…), taux au 01/01/2026. Renvoie `non_determine` hors des 8 groupes couverts. |
| [regimeFiscalPVI.ts](src/lib/patrimoine/regimeFiscalPVI.ts) | Régime fiscal des plus-values immobilières : IR 19 % / PS 17,2 %, abattements pour durée de détention, surtaxe. Renvoie `null` hors des 4 groupes couverts. |
| [societeTransfer.ts](src/lib/patrimoine/societeTransfer.ts) | `SOCIETE_ELIGIBLE_NATURES`, `isSocieteEligibleNature`, `natureToTypeSociete` : bascule d'un actif Patrimoine vers le module Sociétés. |

Tests unitaires présents : `qualification.test.ts`, `succession.test.ts`, `avantagesMatrimoniaux.test.ts`, `recompensesCreances.test.ts`, `participationAcquets.test.ts`, `regimeChangeClauses.test.ts`. Pas de test pour `utils.ts`, `evolutionPatrimoine.ts`, `bareme669CGI.ts`, `regimeFiscalPlusValue.ts`, `regimeFiscalPVI.ts`, `societeTransfer.ts`, `regimeLegal.ts`.

### 1.2 Services d'accès aux données — `src/services/`

| Fichier | Résumé |
|---|---|
| [assetService.ts](src/services/assetService.ts) | Type `Asset`, `AssetCharge`, `AssetRevenu` + CRUD sur `assets`, `asset_charges`, `asset_revenus`. Contrôle d'appartenance `user_id` explicite côté client avant update/delete. |
| [passifService.ts](src/services/passifService.ts) | Types `Emprunt` / `Passif` + CRUD sur `emprunts` et `passifs`. **Pas** de contrôle d'appartenance explicite (contrairement à `assetService`) — repose uniquement sur les RLS. |
| [assetValorisationService.ts](src/services/assetValorisationService.ts) | Historique de valorisation (`asset_valorisations`). |
| [assetIndivisaireService.ts](src/services/assetIndivisaireService.ts) | Indivisaires d'un actif (`asset_indivisaires`), avec `replaceForAsset`. |
| [assetDemembrementService.ts](src/services/assetDemembrementService.ts) | Contrepartie usufruitier / nu-propriétaire (`asset_demembrements`), avec `replaceForAsset`, `getAllForUser`, `getByFamilyLink`. |
| [patrimoineAcquetsService.ts](src/services/patrimoineAcquetsService.ts) | Service générique paramétré par table : `patrimoineOriginaireService` / `patrimoineFinalService` (getAll / create / remove — **pas d'update**). |
| [recompensesCreancesService.ts](src/services/recompensesCreancesService.ts) | CRUD `recompenses` et `creances_entre_epoux` (get / create / delete — **pas d'update**). |
| [scenarioRegimeService.ts](src/services/scenarioRegimeService.ts) | `scenarios_regime` (changements de régime réalisés / envisagés). |
| [familyService.ts](src/services/familyService.ts) | `family_profile`, `marital_status`, `family_links` — source du contexte matrimonial injecté dans `qualifierBien()`. |
| [societeService.ts](src/services/societeService.ts) | Table `societes`, qui porte elle aussi `qualification_bien` et `detenteur`. |

### 1.3 Hooks — `src/hooks/`

| Fichier | Résumé |
|---|---|
| [useAssets.ts](src/hooks/useAssets.ts) | `useAssets()` (liste + CRUD + toasts) et `useAssetCharges(assetId)`. Rechargement complet à chaque montage, pas de cache partagé. |
| [useAssetForm.ts](src/hooks/useAssetForm.ts) | Orchestration du formulaire d'actif : chargement du contexte familial/matrimonial, recalcul automatique de la qualification, garde-fous détenteur/qualification, mapping détenteur affichage ↔ base au submit. |
| [usePassifs.ts](src/hooks/usePassifs.ts) | `usePassifs()` et `useEmprunts()`. |
| [usePassifEmpruntForm.ts](src/hooks/usePassifEmpruntForm.ts) | Formulaire fusionné passif/emprunt : préremplissage depuis l'actif lié, auto-qualification (contexte réduit), aiguillage `emprunts` vs `passifs` selon `EMPRUNT_NATURES`. |
| [usePatrimoineCalculations.ts](src/hooks/usePatrimoineCalculations.ts) | Agrégats affichés : `financialSummary`, `patrimoineParPersonne` (via `getPartSuccessorale`), `unqualifiedItems`, `plusValuesSummary`. |
| [usePatrimoineOriginaire.ts](src/hooks/usePatrimoineOriginaire.ts) / [usePatrimoineFinal.ts](src/hooks/usePatrimoineFinal.ts) | Lignes de patrimoine originaire / final (participation aux acquêts). |
| [useRecompenses.ts](src/hooks/useRecompenses.ts) / [useCreancesEntreEpoux.ts](src/hooks/useCreancesEntreEpoux.ts) | Récompenses et créances entre époux (add / remove uniquement). |
| [useMatrimonialClauses.ts](src/hooks/useMatrimonialClauses.ts) | Lecture/écriture des clauses dans `marital_status.clauses_contrat` (jsonb), debounce 800 ms, + `analyzeForTransmission()`. |
| [useCustomMatrimonialClauses.ts](src/hooks/useCustomMatrimonialClauses.ts) | Clauses personnalisées libres (`marital_status.clauses_personnalisees`, jsonb). |
| [useScenariosRegime.ts](src/hooks/useScenariosRegime.ts) | Scénarios de changement de régime. |
| [useAssetValorisations.ts](src/hooks/useAssetValorisations.ts) / [useAssetRevenus.ts](src/hooks/useAssetRevenus.ts) | Historique de valeur et revenus rattachés à un actif. |

### 1.4 Composants et pages

**Section Patrimoine** — `src/components/patrimoine/` + `src/pages/patrimoine/`

| Fichier | Résumé |
|---|---|
| [PatrimoineSection.tsx](src/pages/patrimoine/PatrimoineSection.tsx) | Page conteneur, 3 onglets (`resume` / `actifs` / `passifs`) + bannière d'actifs incomplets. |
| [PatrimoineResume.tsx](src/components/patrimoine/PatrimoineResume.tsx) | Synthèse : totaux, camembert, courbe d'évolution, carte plus-values, patrimoine par tête. |
| [PatrimoineActifs.tsx](src/components/patrimoine/PatrimoineActifs.tsx) | Liste des actifs (via `PatrimoineTreeView`), création/édition/suppression, bascule vers Sociétés et Immobilier. |
| [PatrimoinePassifs.tsx](src/components/patrimoine/PatrimoinePassifs.tsx) | Liste des passifs et emprunts, ouverture du formulaire fusionné et du détail. |
| [PatrimoineTreeView.tsx](src/components/patrimoine/PatrimoineTreeView.tsx) | Tableau arborescent par catégorie : valeur, détenteur, plus-value, régime fiscal PV, emprunts liés. |
| [PatrimoineChart.tsx](src/components/patrimoine/PatrimoineChart.tsx) | Camembert de répartition par catégorie. |
| [PatrimoineParTeteDetail.tsx](src/components/patrimoine/PatrimoineParTeteDetail.tsx) | Détail du patrimoine par personne, recalcule `getPartSuccessorale` bien par bien. |
| [PatrimoinePlusValues.tsx](src/components/patrimoine/PatrimoinePlusValues.tsx) | Vue détaillée des plus-values latentes et de leur régime fiscal (PFU / PVI). |
| [PlusValuesCard.tsx](src/components/patrimoine/PlusValuesCard.tsx) | Carte résumé des plus-values. |
| [AssetDetailsDialog.tsx](src/components/patrimoine/AssetDetailsDialog.tsx) | Fiche détail d'un actif : qualification + raison recalculée à l'affichage, licitation, financement mixte, démembrement, emprunts liés. |
| [PassifDetailsDialog.tsx](src/components/patrimoine/PassifDetailsDialog.tsx) | Fiche détail d'un passif / emprunt. |
| [PassifEmpruntForm.tsx](src/components/patrimoine/PassifEmpruntForm.tsx) | Formulaire fusionné passif/emprunt. |
| [IncompleteAssetsBanner.tsx](src/components/patrimoine/IncompleteAssetsBanner.tsx) | Bannière listant les actifs à champs manquants (valeur, détenteur, mode de détention, date d'estimation). |

**Formulaire d'actif** — `src/components/assets/`

| Fichier | Résumé |
|---|---|
| [AssetForm.tsx](src/components/assets/AssetForm.tsx) | Formulaire d'actif en 4 onglets (Général / Détention & Acquisition / Valorisation / Charges). Porte tous les champs de qualification juridique. |
| [ChargeForm.tsx](src/components/assets/ChargeForm.tsx) | Sous-formulaire de charge rattachée à un actif. |
| [IndivisairesSection.tsx](src/components/assets/IndivisairesSection.tsx) | Saisie des co-indivisaires (membre de famille ou tiers) et de leur quote-part. |
| [DemembrementSection.tsx](src/components/assets/DemembrementSection.tsx) | Saisie de la contrepartie du démembrement (usufruitier ou nu-propriétaire). |

**Régime matrimonial** — `src/components/famille/` + `src/components/famille/matrimonial/`

| Fichier | Résumé |
|---|---|
| [RelationInfoForm.tsx](src/components/famille/RelationInfoForm.tsx) | Saisie du statut de couple, du régime matrimonial, de la convention PACS, des dates. Déclenche la purge des clauses incompatibles au changement de régime. |
| [MatrimonialRegimeOptions.tsx](src/components/famille/MatrimonialRegimeOptions.tsx) | Écran des clauses du contrat de mariage ; consomme `useMatrimonialClauses` et `analyzeForTransmission()`. |
| [ClauseItem.tsx](src/components/famille/matrimonial/ClauseItem.tsx) | Rendu d'une clause : activation, options (PP/US, résidence principale, maintien divorce, porteSur), sélection de biens, pourcentage. |
| [PartConjointInput.tsx](src/components/famille/matrimonial/PartConjointInput.tsx) | Saisie du % de partage inégal en pleine propriété. |
| [AssetSelectionModal.tsx](src/components/famille/matrimonial/AssetSelectionModal.tsx) | Sélection des biens désignés par une clause (préciput, société d'acquêts, clause personnalisée). |
| [ClausesPersonnaliseesSection.tsx](src/components/famille/matrimonial/ClausesPersonnaliseesSection.tsx) | Clauses libres taguées, avec biens rattachés. |
| [RecompensesSection.tsx](src/components/famille/matrimonial/RecompensesSection.tsx) | Saisie des récompenses. |
| [CreancesEntreEpouxSection.tsx](src/components/famille/matrimonial/CreancesEntreEpouxSection.tsx) | Saisie des créances entre époux. |
| [PatrimoineOriginaireSection.tsx](src/components/famille/matrimonial/PatrimoineOriginaireSection.tsx) | Saisie du patrimoine originaire (participation aux acquêts) + état descriptif signé. |
| [PatrimoineFinalSection.tsx](src/components/famille/matrimonial/PatrimoineFinalSection.tsx) | Saisie du patrimoine final. |
| [ScenarioRegimeSection.tsx](src/components/famille/matrimonial/ScenarioRegimeSection.tsx) | Scénarios de changement de régime (réalisé / envisagé) + motivation civile. |

### 1.5 Types et schémas

| Fichier | Résumé |
|---|---|
| [src/types/matrimonial.ts](src/types/matrimonial.ts) | `RegimeType` (6 valeurs), `ClauseType` (33 valeurs), `ClauseDefinition`, `ClauseState`, `ClausesData`, `DonationDernierVivant`, `MatrimonialAnalysisResult`. |
| [src/types/recompense.ts](src/types/recompense.ts) | Type `Recompense` + `SensRecompense`, `NatureDepense`, `ModeEvaluationConventionnel` (3 valeurs). |
| [src/types/creanceEntreEpoux.ts](src/types/creanceEntreEpoux.ts) | Type `CreanceEntreEpoux` + `ModeEvaluationConventionnel` (2 valeurs seulement, pas de `plafonne`). |
| [src/types/participationAcquets.ts](src/types/participationAcquets.ts) | `PatrimoineOriginaire`, `PatrimoineFinal`, `EpouxConcerne`. |
| [src/types/customClause.ts](src/types/customClause.ts) | Clauses personnalisées et tags. |
| [src/schemas/assetSchema.ts](src/schemas/assetSchema.ts) | Schéma Zod du socle générique de l'actif + constantes `ORIGINE_ACTIF_OPTIONS`, `SITUATION_PARTICULIERE_OPTIONS`, `MODE_DETENTION_OPTIONS`, `NATURES_LIQUIDITES_FR`. |
| [src/schemas/passifEmpruntSchema.ts](src/schemas/passifEmpruntSchema.ts) | Schéma Zod du formulaire fusionné passif/emprunt. |
| [src/constants/matrimonialClauses.ts](src/constants/matrimonialClauses.ts) | Catalogue des clauses par régime (`CLAUSES_BY_REGIME`), sous-clauses société d'acquêts, `CLAUSES_IMPACTING_TRANSMISSION`, matrice `CLAUSE_REGIME_COMPATIBILITY`. |
| [src/constants/assetTypes.ts](src/constants/assetTypes.ts) | Natures d'actifs, catégories, `getAssetCategory`, `EMPRUNT_NATURES`, `NATURES_WITHOUT_ACQUISITION`, `NATURES_PER`. |
| [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) | Types Postgres générés. **Désynchronisés de la base sur au moins 2 colonnes** (cf. §7). |

---

## 2. Modèle de données

Toutes les colonnes ci-dessous ont été lues directement en base le 2026-07-28 (`information_schema.columns` / `pg_constraint`), pas depuis `src/integrations/supabase/types.ts`.

### 2.1 `assets` — actif patrimonial

Clé primaire `id uuid`. FK : `user_id → auth.users(id) ON DELETE CASCADE`, `societe_id → public.societes(id) ON DELETE SET NULL`.

**Socle générique (lu par le moteur de qualification / calcul)**

| Colonne | Type | Null | Défaut | Lu par |
|---|---|---|---|---|
| `id` | uuid | non | `gen_random_uuid()` | partout |
| `user_id` | uuid | non | — | RLS, services |
| `nature` | text | non | — | `qualifierBien` (immeuble/meuble, société d'acquêts RP), `getAssetCategory`, régimes fiscaux PV, DMTG |
| `denomination` | text | oui | — | libellés, messages d'erreur |
| `etablissement` | text | oui | — | affichage seul |
| `mode_detention` | text | oui | — | affichage, déclenchement `DemembrementSection`, barème 669. **Passé à `qualifierBien` mais jamais lu par lui** (cf. §7) |
| `valeur_estimee` | numeric | oui | — | tous les agrégats, DMTG, plus-values |
| `date_estimation` | date | oui | — | affichage, bannière d'incomplétude |
| `detenteur` | text | oui | — | `qualifierBien`, `getPartSuccessorale`, `isDetenteurSpouse/Common` |
| `pourcentage_utilisateur` | numeric | oui | — | `getPartSuccessorale` en qualification `Indivision` |
| `pourcentage_conjoint` | numeric | oui | — | `getPartConjointSuccession` en qualification `Indivision` |
| `valeur_acquisition` | numeric | oui | — | plus-value, financement mixte art. 1436 |
| `frais_acquisition` | numeric | oui | — | plus-value |
| `date_acquisition` | date | oui | — | `qualifierBien` (avant/après mariage), durée de détention PVI |
| `origine_actif` | text[] | oui | — | `qualifierBien` (origines gratuites) |
| `situation_particuliere` | text[] | oui | — | **affichage seul** (dormant côté calcul) |
| `attachement_emotionnel` | numeric | oui | — | **affichage seul** (dormant côté calcul) |
| `bien_etranger` | boolean | oui | `false` | **aucune lecture trouvée** : écrit par `AssetForm`, jamais relu — ni calcul, ni affichage |
| `qualification_bien` | text | oui | — | `getPartSuccessorale`, `getFractionAjustee`, `usePatrimoineCalculations`, Transmission |
| `qualification_auto` | boolean | oui | `true` | pilote l'écrasement par le calcul automatique |
| `clause_entree_communaute` | boolean | oui | `false` | `qualifierBien` (art. 1405 al. 2) |
| `clause_remploi` | boolean | oui | `false` | `qualifierBien` (priorité absolue) |
| `est_propre_par_nature` | boolean | oui | `null` | `qualifierBien` (art. 1404) |
| `financement_mixte_apport_propre` | numeric | oui | — | `qualifierBien` (art. 1436) |
| `part_licitation_personnelle` | numeric | oui | — | **déclaratif, non injecté dans `qualifierBien`** (documenté dans l'UI) |
| `licitation_acquereur` | text | oui | — | idem, affichage seul |
| `transfert_immobilier` | boolean | oui | `false` | bascule module Immobilier |
| `transfert_societe` | boolean | oui | `false` | bascule module Sociétés |
| `societe_id` | uuid | oui | — | lien vers `societes` |
| `sous_type_per` | text | oui | — | distinction PER bancaire / assurantiel |
| `cto_multi_actifs` | boolean | oui | `false` | régime fiscal PV du CTO |
| `cto_nature_sous_jacent` | text | oui | — | `resolveEffectiveNature` (régime fiscal PV) |
| `created_at` / `updated_at` | timestamptz | non | `now()` | tri |

**Champs « immobilier étendu »** (mêmes lignes, consommés par le module Immobilier — hors périmètre de la qualification juridique) :
`typologie_bien`, `surface_m2`, `statut_bien`, `montant_immeuble`, `frais_agence`, `frais_notaire`, `frais_bancaires`, `frais_hypotheque`, `travaux_renovation`, `travaux_construction`, `meubles`, `financement_actif`, `financement_duree_mois`, `financement_apport`, `financement_taux_credit`, `financement_taux_assurance`, `type_location`, `regime_location`, `zone_bien`, `pourcentage_terrain_force`, `type_location_lmnp`.

> Les positions ordinales 8 de `assets` correspond à une colonne supprimée (trou dans `ordinal_position`) — nom **non trouvé** (information non conservée par Postgres).

**Aucune contrainte CHECK** sur `qualification_bien`, `detenteur`, `mode_detention`, `nature`, `origine_actif` : la fermeture des listes est assurée uniquement côté UI (constantes TypeScript).

### 2.2 `asset_charges`

FK `asset_id → assets(id) ON DELETE CASCADE`. Pas de `user_id`.

`id`, `asset_id`, `type_charge text NOT NULL`, `denomination text NOT NULL`, `debiteur text NOT NULL`, `montant numeric NOT NULL`, `unite text NOT NULL`, `periodicite text NOT NULL`, `date_debut date NOT NULL`, `duree_type text NOT NULL`, `duree_fin_date date`, `duree_annees integer`, `impact_budget boolean DEFAULT false`, `created_at`, `updated_at`.

Note : `debiteur` prend les valeurs `'Époux 1' | 'Époux 2' | 'Couple'` (type TS), **convention différente** de `assets.detenteur` (`user` / `spouse` / `common` / `Indivision`).

### 2.3 `asset_revenus`

FK `asset_id → assets(id) ON DELETE CASCADE`. Pas de `user_id`.

`id`, `asset_id`, `nature text NOT NULL`, `montant numeric NOT NULL`, `periodicite text NOT NULL`, `date_debut date NOT NULL DEFAULT CURRENT_DATE`, `date_fin date`, `commentaire text`, `impact_budget boolean DEFAULT false`, `created_at`, `updated_at`.

### 2.4 `asset_valorisations`

FK `asset_id → assets(id) ON DELETE CASCADE`. Porte `user_id uuid NOT NULL` **sans FK vers `auth.users`**.

`id`, `user_id`, `asset_id`, `date_valorisation date NOT NULL`, `valeur numeric NOT NULL`, `created_at`. (Pas de `updated_at`.)

### 2.5 `asset_demembrements`

FK `asset_id → assets(id) ON DELETE CASCADE`, `family_link_id → family_links(id) ON DELETE SET NULL`. `user_id uuid NOT NULL` **sans FK vers `auth.users`**.

`id`, `asset_id`, `user_id`, `role text NOT NULL` (`Usufruitier` | `Nu-propriétaire`), `type_partie text NOT NULL DEFAULT 'famille'`, `family_link_id`, `nom_libre text`, `date_naissance_tiers date`, `created_at`, `updated_at`.

### 2.6 `asset_indivisaires`

FK `asset_id → assets(id) ON DELETE CASCADE`, `family_link_id → family_links(id) ON DELETE SET NULL`. `user_id uuid NOT NULL` **sans FK vers `auth.users`**.

`id`, `asset_id`, `user_id`, `type_indivisaire text NOT NULL DEFAULT 'famille'`, `family_link_id`, `nom_libre text`, `pourcentage numeric NOT NULL DEFAULT 0`, `created_at`, `updated_at`.

> **Colonne orpheline structurelle** : `asset_indivisaires.pourcentage` est saisi dans `IndivisairesSection` mais **jamais lu par le moteur de calcul** — `getPartSuccessorale` en qualification `Indivision` lit `assets.pourcentage_utilisateur`, pas la table des indivisaires (cf. §7).

### 2.7 `emprunts`

FK `user_id → auth.users(id) CASCADE`, `asset_id → assets(id) ON DELETE SET NULL`, `societe_id → societes(id) ON DELETE SET NULL`.

| Colonne | Type | Null | Défaut | Lu par |
|---|---|---|---|---|
| `id`, `user_id` | uuid | non | — | — |
| `nature` | text | non | — | aiguillage emprunt/passif (`EMPRUNT_NATURES`) |
| `libelle` | text | non | — | libellés |
| `capital_restant_du` | numeric | oui | — | totaux passifs, `usePatrimoineCalculations` |
| `taux_interet` | numeric | oui | — | affichage |
| `mensualite` | numeric | oui | — | affichage, budget |
| `duree_restante` | integer | oui | — | affichage |
| `detenteur` | text | oui | — | `qualifierBien`, `getPartSuccessorale` |
| `pourcentage_utilisateur` / `pourcentage_conjoint` | numeric | oui | — | `getPartSuccessorale` en `Indivision` |
| `qualification_bien` | text | oui | — | `getPartSuccessorale`, `getFractionPassifAjustee` |
| `qualification_auto` | boolean | oui | `true` | pilote l'auto-calcul |
| `contributeur_remboursement` | text | oui | — | **une seule lecture** : règle d'alerte `separation_biens_rp_indivise_remboursement_unilateral` |
| `asset_id` | uuid | oui | — | lien actif ↔ emprunt, préremplissage détenteur |
| `type_garantie` | text | oui | — | affichage seul |
| `assure` | boolean | oui | `false` | conditionne les 3 champs suivants |
| `quotite_assuree_utilisateur` / `quotite_assuree_conjoint` | numeric | oui | — | usage calculatoire **non trouvé** |
| `capital_garanti_deces` | numeric | oui | — | usage calculatoire **non trouvé** |
| `reporter_budget` | boolean | oui | `false` | module Budget |
| `societe_id` | uuid | oui | — | rattachement société |
| `created_at` / `updated_at` | timestamptz | non | `now()` | tri |

### 2.8 `passifs`

FK `user_id → auth.users(id) CASCADE`. Pas de lien vers un actif.

`id`, `user_id`, `nature text NOT NULL`, `montant_du numeric NOT NULL`, `detenteur text`, `pourcentage_utilisateur numeric`, `pourcentage_conjoint numeric`, `qualification_bien text`, `qualification_auto boolean DEFAULT true`, `created_at`, `updated_at`.

### 2.9 `recompenses`

FK `user_id → auth.users(id) CASCADE`, `bien_concerne_id → assets(id) ON DELETE SET NULL`.

| Colonne | Type | Null | Lu par |
|---|---|---|---|
| `id`, `user_id` | uuid | non | — |
| `sens` | text | non | `computeSoldeRecompenses` (`epoux_vers_communaute` / `communaute_vers_epoux`) |
| `epoux` | text | non | `computeSoldeRecompenses` (`user` / `spouse`) |
| `bien_concerne_id` | uuid | oui | **affichage seul** — le moteur ne rattache pas la récompense au bien |
| `depense_faite` | numeric | non | `computeMontantRecompense` |
| `valeur_bien_acquisition` | numeric | oui | `computeProfitSubsistant` (« valeur avant ») |
| `valeur_bien_liquidation` | numeric | oui | `computeProfitSubsistant` (« valeur après ») |
| `nature_depense` | text | non | choix de formule du profit subsistant + plancher art. 1469 al. 3 |
| `mode_evaluation_conventionnel` | text | oui | `nominal` / `profit_subsistant` / `plafonne` (défaut applicatif `profit_subsistant`) |
| `created_at` / `updated_at` | timestamptz | non | tri |

Aucune contrainte CHECK sur `sens`, `epoux`, `nature_depense`, `mode_evaluation_conventionnel`.

### 2.10 `creances_entre_epoux`

FK `user_id → auth.users(id) CASCADE`, `bien_concerne_id → assets(id) ON DELETE SET NULL`.

`id`, `user_id`, `epoux_creancier text NOT NULL`, `epoux_debiteur text NOT NULL`, `bien_concerne_id uuid` (**affichage seul**), `depense_faite numeric NOT NULL`, `valeur_bien_avant numeric`, `valeur_bien_apres numeric`, `nature_depense text NOT NULL`, `mode_evaluation_conventionnel text`, `created_at`, `updated_at`.

> Le type TS n'autorise que `nominal` / `profit_subsistant` pour les créances, alors que la colonne est un `text` libre partagé avec la sémantique `plafonne` des récompenses — aucune contrainte en base ne l'empêche.

### 2.11 `patrimoine_originaire`

FK `user_id → auth.users(id) CASCADE`, `bien_concerne_id → assets(id) ON DELETE SET NULL`.

| Colonne | Type | Null | Défaut | Lu par |
|---|---|---|---|---|
| `id`, `user_id` | uuid | non | — | — |
| `epoux` | text | non | — | `computeAcquetNet` |
| `nature` | text | non | — | **libellé seul** |
| `valeur` | numeric | non | — | `computeAcquetNet` |
| `bien_professionnel` | boolean | non | `false` | filtre `exclusionBiensProfessionnels` |
| `bien_concerne_id` | uuid | oui | — | **affichage seul** |
| `signe` | boolean | oui | `false` | règle d'alerte `participation_acquets_sans_etat_descriptif_signe` |
| `date_signature` | date | oui | — | **écrite par le formulaire, jamais relue** (orpheline) |
| `created_at` / `updated_at` | timestamptz | non | `now()` | tri |

### 2.12 `patrimoine_final`

Colonnes identiques à `patrimoine_originaire` **sauf** `signe` et `date_signature`, absentes.

`id`, `user_id`, `epoux`, `nature`, `valeur`, `bien_professionnel`, `bien_concerne_id`, `created_at`, `updated_at`.

### 2.13 `marital_status` — contexte matrimonial

FK `user_id → auth.users(id) CASCADE`. Colonnes pertinentes pour le périmètre Patrimoine :

| Colonne | Type | Défaut | Lu par |
|---|---|---|---|
| `statut_couple` | text | — | `qualifierBien`, `checkIsInCouple`, alertes |
| `regime_matrimonial` | text | — | `qualifierBien`, `regimeHasMasseCommune`, `regimeIsParticipationAcquets`, `toRegimeType`, alertes |
| `date_mariage` | date | — | `qualifierBien`, `determinerRegimeLegal`, alertes |
| `convention_pacs` | text | — | `qualifierBien`, `isPacsIndivision` |
| `date_pacs` | date | — | `isPacsIndivision` (réforme 2007) |
| `pas_de_contrat_mariage` | boolean NOT NULL | `false` | alertes, `determinerRegimeLegal` |
| `clauses_contrat` | jsonb | — | `ClausesData` : préciput, attribution intégrale, partage inégal, société d'acquêts, extension propres par nature, exclusion biens professionnels… |
| `clauses_personnalisees` | jsonb NOT NULL | `'[]'` | clauses libres |
| `prenom_conjoint`, `nom_conjoint` | text | — | libellés détenteur |
| `date_naissance_conjoint` | date | — | barème 669 (npSurvivant, démembrement) |
| `donation_dernier_vivant_personne` / `_conjoint` | boolean | `false` | `hasDDV` (Transmission, alertes) |
| `date_donation_personne` / `_conjoint` | date | — | idem |
| `est_dirigeant_conjoint` | boolean | `false` | alertes dirigeant |
| `residence_fiscale_etranger_conjoint` | boolean | `false` | alerte extranéité |
| `imposition_distincte` | boolean | `false` | Transmission (hors périmètre) |
| `partage_envisage` | boolean NOT NULL | `false` | Transmission (hors périmètre) |

> **Colonnes lues par le code mais absentes de la base au 2026-07-28** : `loi_applicable_regime` et `pays_premier_domicile_matrimonial` (cf. §7.1).

`clauses_contrat` n'a aucun schéma en base (jsonb libre). Structure attendue côté TS (`ClauseState`) : `{ enabled, selectedAssets?, partPleineProprietee?, options? { pleineProprietee, usufruit, residencePrincipale, maintienDivorce, porteSur } }`.

### 2.14 `scenarios_regime`

FK `user_id → auth.users(id) CASCADE`.

`id`, `user_id`, `type text NOT NULL` (`realise` | `envisage`), `regime_cible text NOT NULL`, `date date NOT NULL`, `motivation_civile text`, `created_at`, `updated_at`.

### 2.15 `societes` (point de contact)

FK `user_id → auth.users(id) CASCADE`. Colonnes pertinentes pour la qualification juridique :

- `qualification_bien text **NOT NULL**` et `detenteur text **NOT NULL**` — contrairement à `assets`, `emprunts` et `passifs` où ces colonnes sont nullables.
- `pourcentage_utilisateur numeric DEFAULT 100`, `pourcentage_conjoint numeric DEFAULT 0`.
- `parts_negociables boolean DEFAULT false` et `date_souscription date` — lues par la règle d'alerte `parts_non_negociables_souscrites_pendant_mariage` (art. 1832-2).
- `valeur_estimee`, `pourcentage_ifi`, `valeur_ifi`, `type_societe`, `regime_fiscal`, etc.

### 2.16 Récapitulatif des colonnes orphelines

| Colonne | Écrite par | Lue par |
|---|---|---|
| `assets.situation_particuliere` | `AssetForm` (Select) | affichage `AssetDetailsDialog` uniquement |
| `assets.attachement_emotionnel` | `AssetForm` (Slider 0–10) | affichage `AssetDetailsDialog` uniquement |
| `assets.part_licitation_personnelle` | `AssetForm` (si PACS-indivision + « Le couple ») | affichage uniquement — **explicitement documenté comme non répercuté** |
| `assets.licitation_acquereur` | idem | affichage uniquement |
| `assets.bien_etranger` | `AssetForm` (Checkbox) | **aucune lecture** — orpheline complète (ni calcul ni affichage) |
| `assets.mode_detention` | `AssetForm` (Select) | affichage + barème 669 ; passé à `qualifierBien` mais **jamais lu par lui** |
| `asset_indivisaires.pourcentage` | `IndivisairesSection` | **aucune lecture calculatoire** — le calcul utilise `assets.pourcentage_utilisateur` |
| `patrimoine_originaire.date_signature` | `PatrimoineOriginaireSection` | aucune lecture (seul `signe` est lu) |
| `emprunts.quotite_assuree_utilisateur` / `_conjoint` | `PassifEmpruntForm` | usage calculatoire **non trouvé** |
| `emprunts.capital_garanti_deces` | `PassifEmpruntForm` | usage calculatoire **non trouvé** |
| `emprunts.type_garantie` | `PassifEmpruntForm` | affichage uniquement |
| `recompenses.bien_concerne_id` | `RecompensesSection` | libellé d'affichage uniquement |
| `creances_entre_epoux.bien_concerne_id` | `CreancesEntreEpouxSection` | libellé d'affichage uniquement |
| `patrimoine_originaire/final.bien_concerne_id` | sections dédiées | libellé d'affichage uniquement |
| `patrimoine_originaire/final.nature` | sections dédiées | libellé d'affichage uniquement (texte libre) |

---

## 3. Logique de qualification juridique

### 3.1 Point d'entrée unique : `qualifierBien(ctx)`

Fichier : [src/lib/patrimoine/qualification.ts:174](src/lib/patrimoine/qualification.ts) — fonction pure, renvoie `{ qualification, raison }`.

Valeurs possibles de `QualificationBien` : `'Bien propre'`, `'Bien commun'`, `'Bien personnel'`, `'Indivision'`, `'À qualifier'`.
(`'À qualifier'` n'est **jamais** produit par `qualifierBien` : c'est uniquement un choix manuel offert par le Select de `AssetForm`.)

**Entrées du contexte** (`QualificationContext`) : `statutCouple`, `regimeMatrimonial`, `dateMariage`, `conventionPacs`, `datePacs`, `dateAcquisition`, `origineActif[]`, `modeDetention`, `detenteur`, `clauseEntreeCommunaute`, `clauseRemploi`, `natureActif`, `assetId`, `societeAcquetsAssetIds[]`, `societeAcquetsResidencePrincipale`, `estPropreParNature`, `extensionProprsParNature`, `valeurAcquisition`, `apportFondsPropres`.

> `modeDetention` fait partie de l'interface et est bien transmis par `useAssetForm`, mais **n'est pas déstructuré ni lu** dans le corps de `qualifierBien` (lignes 178-194). Le démembrement n'a donc aucun effet sur la qualification propre/commun.

### 3.2 Détection des régimes (comparaison de chaînes, pas d'énumération)

Toute la détection se fait par `String.toLowerCase().includes(...)` sur le **libellé humain** stocké dans `marital_status.regime_matrimonial` :

| Prédicat | Test |
|---|---|
| `isInCouple` | statut normalisé NFD contient `mari` \| `pacs` \| `concubin` |
| `isRegimeCommunautaire` (exporté) | contient `communauté` ou `communaute` |
| `isCommunauteUniverselle` | contient `universelle` |
| `isCommunauteMeublesEtAcquets` | contient `meubles` **et** `acquêts` |
| `isSeparationSocieteAcquets` | contient (`séparation`\|`separation`) **et** `société` **et** `acquêts` |
| `isSeparationDeBiens` | contient `séparation` ou `separation` (**donc vrai aussi pour la société d'acquêts** — l'ordre de la cascade évite le conflit) |
| `isParticipationAcquets` | contient `participation` **et** `acquêt` |
| `isPacse` | statut normalisé contient `pacs` |
| `isConventionPacsIndivision` | convention contient `indivision` |
| `isConventionPacsSeparation` | convention contient `séparation`/`separation` |
| `isImmeuble` | `getAssetCategory(nature) === 'actifs immobiliers'` |

Les 6 libellés fermés sont définis dans `regimeLegal.ts` (`REGIMES_MATRIMONIAUX`) et servent de source unique aux Select. **Aucune contrainte CHECK en base** ne garantit cette fermeture.

`isSeparationSocieteAcquets` exige le mot `société` **avec accent** ; le libellé canonique `"Séparation de biens avec société d'acquêts"` le porte, mais une valeur saisie sans accent (donnée legacy, import) retomberait sur la branche « séparation de biens » simple.

### 3.3 Cascade de qualification — ordre exact

L'ordre est significatif : la première branche qui `return` gagne.

| # | Condition | Résultat | Fondement cité dans le code |
|---|---|---|---|
| 1 | `detenteur` contient `indivision` | `Indivision` | — |
| 2 | pas en couple | `Bien personnel` | — |
| 3 | `estPropreParNature` **et** (régime communautaire **ou** PACS-indivision) | régime communautaire : `Bien commun` si `extensionProprsParNature`, sinon `Bien propre` — PACS-indivision : `Bien personnel` | art. 1404, art. 1526, art. 515-5-2 |
| 4 | `clauseRemploi` | `Bien personnel` sous PACS-indivision, sinon `Bien propre` | remploi de fonds propres, prioritaire y compris sous communauté universelle |
| 5 | régime = séparation + société d'acquêts | `Bien commun` si bien désigné ; `Indivision` si `detenteur` contient `couple` sans désignation ; sinon `Bien propre` | régime à 3 masses |
| 6 | séparation de biens **ou** participation aux acquêts | `Bien propre` | pendant le mariage, la participation fonctionne comme une séparation |
| 7 | origine gratuite (`estGratuit`) | PACS-indivision → `Bien personnel` ; `clauseEntreeCommunaute` **et** origine ∈ {Donation, Héritage} → `Bien commun` ; sinon `Bien propre` | art. 1405 al. 2, art. 515-5-2 |
| 8 | communauté universelle | `Bien commun` | — |
| 9 | `dateAcquisition < dateMariage` | communauté de meubles et acquêts **et** non-immeuble → `Bien commun` ; sinon `Bien propre` | — |
| 10 | PACS | convention indivision → `Indivision` ; PACS < 2007 sans convention → `Indivision` ; sinon `Bien propre` | art. 515-5 |
| 11 | régime communautaire **et** `apportFondsPropres` **et** `valeurAcquisition` | ratio ≥ 0,5 → `Bien propre` ; sinon `Bien commun` | art. 1436 |
| 12 | défaut | `Bien commun` | présomption d'acquêt du régime légal |

**Détection des origines gratuites** — `ORIGINES_PROPRES` = `['Donation', 'Héritage', "Présent d'usage", 'Acquisition à titre gratuit', 'Découverte', 'Création']`. Le test est `origines.some(o => ORIGINES_PROPRES.includes(o))` : un actif dont `origine_actif` contient **au moins une** origine gratuite est traité comme gratuit, même si le tableau en contient d'autres. En pratique l'UI n'écrit qu'une seule valeur (`field.onChange([value])`), donc le cas multiple ne se produit pas via le formulaire.

Les options `'Acquisition par occupation'` et `'Échange'` (présentes dans `ORIGINE_ACTIF_OPTIONS`) ne figurent **pas** dans `ORIGINES_PROPRES` : elles retombent sur les branches par défaut (donc `Bien commun` sous régime légal).

### 3.4 Régime légal applicable à défaut de contrat

Fichier : [regimeLegal.ts:34](src/lib/patrimoine/regimeLegal.ts) — `determinerRegimeLegal(dateMariage)` :
- `dateMariage < 1966-02-01` → `"Communauté de meubles et d'acquêts"`
- sinon (y compris date absente ou invalide) → `"Communauté réduite aux acquêts (option sans contrat de mariage)"`

Consommé par `RelationInfoForm.tsx` lorsque `pas_de_contrat_mariage` est coché.

### 3.5 Régime PACS par défaut

Fichier : [qualification.ts:167](src/lib/patrimoine/qualification.ts) — `isPacsIndivision(statutCouple, conventionPacs, datePacs)` :
1. Non pacsé → `false`.
2. Convention contient `indivision` → `true` (la convention prime toujours).
3. Convention contient `séparation` → `false`.
4. Sinon → `true` si `datePacs < 2007-01-01` (art. 515-5, loi du 23 juin 2006), `false` sinon.

Un PACS sans `date_pacs` renseignée et sans convention est donc traité comme **séparation de patrimoines**.

### 3.6 Séparation de biens avec société d'acquêts (3 masses)

Un bien est « désigné dans la société d'acquêts » si :
- son `assetId` figure dans `clauses_contrat.societe_acquets.selectedAssets`, **ou**
- `clauses_contrat.societe_acquets.options.residencePrincipale` est vrai **et** `natureActif === 'Résidence principale'` (comparaison stricte sur le libellé exact, pas sur la catégorie).

Sinon, un bien dont le `detenteur` contient `couple` est qualifié `Indivision` (indivision ordinaire, pas de communauté par défaut dans ce régime) ; tout autre bien reste `Bien propre`.

### 3.7 Qualification des passifs et emprunts

Fichier : [usePassifEmpruntForm.ts:168](src/hooks/usePassifEmpruntForm.ts).

Le contexte transmis à `qualifierBien` est **volontairement réduit** à 4 champs : `statutCouple`, `regimeMatrimonial`, `dateMariage`, `conventionPacs`, plus `detenteur`. Sont donc **absents** :
- `datePacs` → un PACS antérieur à 2007 sans convention explicite ne bascule **pas** en `Indivision` pour une dette (divergence avec les actifs) ;
- `dateAcquisition`, `origineActif`, `natureActif`, `assetId`, `societeAcquetsAssetIds`, `estPropreParNature`, `extensionProprsParNature`, `valeurAcquisition`, `apportFondsPropres`.

Conséquence : une dette suit uniquement la branche « régime + détenteur » — `Bien commun` sous régime légal, `Bien propre` sous séparation/participation. Ce choix est documenté dans le code comme « correct pour une dette contractée pendant l'union ». Une dette contractée **avant** le mariage sera donc qualifiée commune.

Le formulaire passif/emprunt **n'expose aucun Select de qualification manuelle** : contrairement à `AssetForm`, l'utilisateur ne peut ni surcharger la qualification ni passer `qualification_auto` à `false` depuis l'UI. Le champ existe pourtant dans le schéma Zod et en base.

### 3.8 Garde-fous et cohérence détenteur ↔ qualification

Implémentés à l'identique dans `useAssetForm.ts:277` et `usePassifEmpruntForm.ts:199` :
- si `qualification_bien` devient `Bien propre` ou `Bien personnel` alors que `detenteur === 'Le couple'`, le détenteur et les deux pourcentages sont **réinitialisés** (forçant une resélection) ;
- l'option « Le couple » est retirée de la liste déroulante dans ces mêmes cas (`filteredDetenteurOptions`).

Motif documenté dans le code : incident du 2026-07-18 (pourcentages saisis mais silencieusement ignorés par le calcul de succession).

Ajustement automatique des pourcentages au changement de détenteur : `user` → 100/0, `spouse` → 0/100, `Le couple` → 50/50 (uniquement si l'état précédent était 100/0 ou 0/100). Au submit, `handleSubmit` **force** 100/0 ou 0/100 selon le détenteur en base, écrasant toute saisie divergente.

### 3.9 Recalcul automatique vs surcharge manuelle

- `qualification_auto` (défaut `true` en base et dans le formulaire) : tant qu'il vaut `true`, la qualification est recalculée à chaque changement d'un des champs surveillés (`origine_actif`, `date_acquisition`, `detenteur`, `mode_detention`, `qualification_auto`, `clause_entree_communaute`, `clause_remploi`, `est_propre_par_nature`, `nature`, `financement_mixte_apport_propre`, `valeur_acquisition`).
- Choisir une valeur dans le Select « Qualification du bien » passe automatiquement `qualification_auto` à `false`.
- Un bouton « Réactiver le calcul automatique » remet `qualification_auto` à `true`.
- La `raison` textuelle n'est **pas persistée** : elle est recalculée à la volée dans `AssetForm` et re-dérivée indépendamment dans `AssetDetailsDialog` (second appel à `qualifierBien`).

### 3.10 Cas particuliers gérés

- Bien propre par nature (art. 1404) et sa neutralisation par clause d'extension (art. 1526).
- Stipulation expresse d'entrée en communauté d'une libéralité (art. 1405 al. 2), y compris sous communauté universelle — la branche est placée **avant** celle de la communauté universelle pour rester atteignable.
- Clause de remploi prioritaire sur tout (y compris communauté universelle).
- Communauté de meubles et acquêts : meubles antérieurs au mariage communs, immeubles antérieurs propres.
- PACS : régime par défaut dépendant de la date (réforme 2007), exclusions de l'art. 515-5-2 (biens personnels, libéralités, création, remploi).
- Financement mixte (art. 1436) avec seuil à 50 %.
- Société d'acquêts : désignation par ID ou par catégorie « résidence principale ».
- Purge des clauses devenues incompatibles au changement de régime (`getClausesIncompatibles`).

### 3.11 Cas particuliers **non** gérés

- **Démembrement** : `mode_detention` n'influence pas la qualification (cf. §3.1). Un usufruit ou une nue-propriété est qualifié comme la pleine propriété.
- **Licitation de plus de moitié (art. 515-5-2)** : champs saisis mais explicitement non injectés dans le calcul.
- **Concubinage** *(désormais géré — corrigé le 2026-07-28, cf. §7.8)* : une branche dédiée, placée juste après le test `isInCouple` et donc en amont de toutes les règles matrimoniales et pacsimoniales, renvoie `Indivision` si le bien est détenu par les deux concubins (`isDetenteurCommon`, indivision de droit commun art. 815) et `Bien personnel` s'il est détenu par un seul (union de fait sans régime légal, art. 515-8). La notion de « Bien propre », qui n'a de sens que face à une masse commune, n'est donc jamais retournée pour un concubin, y compris en cas de remploi ou d'origine gratuite. Couvert par 5 tests dans `qualification.test.ts`.
- **Récompense automatique** en financement mixte : le message de `raison` renvoie l'utilisateur vers le module Récompenses, mais aucune ligne de récompense n'est créée automatiquement.
- **Origines `Échange` et `Acquisition par occupation`** : pas de règle dédiée.
- **Subrogation réelle hors clause de remploi actée** : non gérée.
- **Dettes antérieures au mariage** : non distinguées (cf. §3.7).
- **Biens professionnels** : aucune règle de qualification spécifique (seule la participation aux acquêts a un flag d'exclusion, sur ses propres tables).
- **Changement de régime en cours d'union** : la qualification est recalculée avec le régime **courant** appliqué rétroactivement à tous les biens ; il n'y a pas d'historisation du régime à la date d'acquisition.

---

## 4. Calculs

### 4.1 Part successorale d'un bien — `getPartSuccessorale`

Fichier : [succession.ts:50](src/lib/patrimoine/succession.ts). Source unique de vérité, consommée à la fois par Patrimoine (affichage) et Transmission (civil **et** fiscal).

```
qualification === 'À qualifier'   → throw BienNonQualifieError
qualification absente / NULL      → throw BienNonQualifieError (message distinct)
qualification === 'Indivision'    → pourcentage_utilisateur / 100   (défaut 50 si absent)
qualification === 'Bien commun'   → 0.5                             (constante, non configurable)
sinon ('Bien propre' | 'Bien personnel') → isDetenteurSpouse(detenteur) ? 0 : 1
```

Miroir `getPartConjointSuccession` : identique, sauf `Indivision` → `pourcentage_conjoint / 100` et propre/personnel → `isDetenteurSpouse ? 1 : 0`.

**Hypothèses / approximations :**
- Le 50 % du bien commun est une **constante**, pas dérivé des clauses. Les avantages matrimoniaux corrigent cette valeur *en aval* (§4.4), pas dans cette fonction.
- En `Indivision`, `pourcentage_utilisateur` et `pourcentage_conjoint` sont deux champs **indépendants**, sans garantie de sommer à 100. Le code choisit délibérément de lire `spouseQuote` directement plutôt que `1 − userQuote` (commentaire explicite lignes 88-95).
- `getPourcentagesRepartition` applique un défaut de **50 % à chacun** indépendamment (`utils.ts:118`) : un bien indivis à 3 personnes avec seulement `pourcentage_utilisateur = 33` donnera `spouseQuote = 0,5`, soit 83 % au total.
- Le refus de deviner (`BienNonQualifieError`) est le comportement voulu : les écrans affichent l'erreur au lieu d'un chiffre faux.

### 4.2 Patrimoine par personne — `usePatrimoineCalculations`

Fichier : [usePatrimoineCalculations.ts:93](src/hooks/usePatrimoineCalculations.ts).

Pour chaque actif, passif et emprunt :
```
userFraction = getPartSuccessorale(item)
si qualification ∈ {'Bien commun', 'Indivision'} :  bucket "Shared"
sinon :                                             bucket "Own"
part user     = valeur × userFraction
part conjoint = valeur × (1 − userFraction)
```
Puis : `userActifs = userOwn + userShared`, `userValue = userActifs − userPassifs`, `totalValue = userValue + spouseValue`.

**Hypothèses / approximations :**
- La part conjoint est calculée par **complément** (`1 − userFraction`), et non via `getPartConjointSuccession` — divergence assumée avec le chemin Transmission dès que les deux pourcentages d'indivision ne somment pas à 100.
- Un élément non qualifié est **exclu des totaux** et remonté dans `unqualifiedItems` (jamais deviné).
- `financialSummary` (`totalActifs`, `totalPassifs`, `patrimoineNet`), lui, additionne **toutes** les valeurs brutes sans pondération ni exclusion : un total global et un total par tête peuvent donc légitimement différer.

### 4.3 Plus-value latente — `calculatePlusValue`

Fichier : [utils.ts:134](src/lib/patrimoine/utils.ts).
```
plusValue = valeur_estimee − valeur_acquisition − (frais_acquisition ?? 0)
hasData   = valeur_estimee !== undefined && valeur_acquisition !== undefined
```
Approximation : aucune prise en compte des travaux, de l'inflation, ni de la quote-part de détention. Le régime fiscal applicable est calculé séparément (`regimeFiscalPlusValue.ts` / `regimeFiscalPVI.ts`) et retourne `non_determine` / `null` hors des natures couvertes, sans jamais deviner.

### 4.4 Avantages matrimoniaux — `getFractionAjustee`

Fichier : [avantagesMatrimoniaux.ts:70](src/lib/patrimoine/avantagesMatrimoniaux.ts). Renvoie la fraction du bien entrant dans la succession du défunt, ou `null` si aucune clause ne s'applique (l'appelant retombe alors sur `getPartSuccessorale`).

```
si qualification_bien !== 'Bien commun'            → null   (garde-fou global)
si préciput actif ET bien dans preciputAssetIds    → 0 (pleine propriété) | npSurvivant (usufruit)
si attribution intégrale active                    → 0 (pleine propriété) | 0.5 × npSurvivant (usufruit)
si partage inégal actif                            → 1 − partConjointInegal / 100
sinon                                              → null
```

Miroir passif `getFractionPassifAjustee` : **seule** la clause de partage inégal a un effet (`1 − partConjointInegal / 100`) ; préciput et attribution intégrale retournent `null` (l'attribution intégrale oblige pourtant son bénéficiaire à acquitter tout le passif commun — mécanique explicitement écartée du périmètre).

Miroir « conjoint décède en premier » `getPartConjointAjustee` : délègue tel quel à `getFractionAjustee`, la formule par bien ne dépendant pas de qui décède. **Ce qui change et reste à la charge de l'appelant** : `npSurvivant` doit être calculé sur l'âge de **l'utilisateur** dans ce sens de décès.

`buildAvantageMatrimonialCtx(clausesData, getNpSurvivant)` construit le contexte depuis `ClausesData` :
- `preciputAssetIds` ← `preciput.selectedAssets`
- `preciputMode` ← `resolvePreciputMode(options)` : `pleineProprietee` gagne si les deux cases sont cochées (repli documenté)
- `attributionIntegraleMode` ← `options.porteSur` (défaut `pleine_propriete`)
- `partConjointInegal` ← `partage_inegal.partPleineProprietee`
- `npSurvivant` résolu **paresseusement**, seulement si une clause est en modalité usufruit

Exclusion mutuelle : `attribution_integrale` ↔ `partage_inegal` (`CLAUSE_MUTUAL_EXCLUSION`), dupliquée localement depuis `CLAUSE_REGIME_COMPATIBILITY`.

**Approximations connues (commentées dans le code) :**
- Sur un 2nd décès chaîné, appliquer une clause de communauté à un bien encore marqué `Bien commun` alors que la communauté a déjà été dissoute au 1er décès est une approximation assumée — identique au comportement préexistant de `getPartConjointSuccession` au même site d'appel.
- La logique de parsing des clauses est dupliquée **trois fois** : `buildAvantageMatrimonialCtx`, `computeTransmission` (inline, non refactorisé volontairement) et `useMatrimonialClauses.analyzeForTransmission`.

### 4.5 Barème art. 669 CGI

Fichier : [bareme669CGI.ts:16](src/lib/patrimoine/bareme669CGI.ts). Tranches usufruit / nue-propriété : `<21 ans` 90/10, `<31` 80/20, `<41` 70/30, `<51` 60/40, `<61` 50/50, `<71` 40/60, `<81` 30/70, `<91` 20/80, au-delà 10/90.

`getTrancheBaremeForYoungest(ages[])` : applique le barème à l'âge du **plus jeune** usufruitier (usufruit conjoint/successif, doctrine BOFiP BOI-ENR-DMTG-10-40-10-30). `computeAge` utilise `differenceInYears(new Date(), dateNaissance)` — l'âge est donc calculé **à la date du jour**, pas à une date de référence paramétrable.

### 4.6 Récompenses — art. 1468-1478

Fichier : [recompensesCreances.ts](src/lib/patrimoine/recompensesCreances.ts).

**Profit subsistant** (`computeProfitSubsistant`) — **deux formules distinctes**, choix documenté comme une simplification :
```
valeurAvant absent | valeurApres absent | valeurAvant === 0  → null (non calculable)
nature 'acquisition'                → valeurApres × (depenseFaite / valeurAvant)
nature 'conservation' | 'amelioration' → valeurApres − valeurAvant
nature 'autre'                      → null
```
Cas de référence documentés : acquisition 100 000 sur 200 000, bien à 500 000 → 250 000. Travaux 40 000, bien 200 000 → 260 000 → profit subsistant **60 000** (et non 52 000 au prorata — lecture explicitement validée avec l'utilisateur, mais signalée dans le code comme « une lecture parmi d'autres possibles »).

**Montant d'une récompense** (`computeMontantRecompense`), règle en 3 temps de l'art. 1469 :
```
mode 'nominal'                → depenseFaite
profitSubsistant === null     → depenseFaite
montant = min(depenseFaite, profitSubsistant)                       (al. 2, plafond)
si mode === 'profit_subsistant' ET nature ∈ {acquisition, conservation, amelioration} :
    montant = max(montant, profitSubsistant)                        (al. 3, plancher)
```
Le mode `'plafonne'` exclut délibérément le plancher (convention contraire, art. 1469 n'étant pas d'ordre public). Défaut applicatif si la colonne est nulle : `'profit_subsistant'`.

**Solde et compensation** (`computeSoldeRecompenses`, art. 1470-1474) :
```
par époux : soldeNet = doitALaCommunaute − communauteDoitA
ajustementBoniCommun = soldeNet(user) + soldeNet(spouse)
```

**Périmètre** : `regimeHasMasseCommune(regime)` → vrai pour tout régime contenant `communaut`, ou pour la séparation avec société d'acquêts. Cette détection **réplique volontairement en local** la logique de `qualification.ts` plutôt que de l'importer (décision documentée de ne pas toucher `qualification.ts`).

### 4.7 Créances entre époux — art. 1479, 1543

`computeMontantCreance` : profit subsistant **seul** (pas la règle en 3 temps), avec repli sur `depenseFaite` si non calculable ; mode `'nominal'` → `depenseFaite`.

`computeSoldeCreancesEntreEpoux` : pour chaque créance, `+montant` au créancier, `−montant` au débiteur. Résultat = ajustement direct entre les 2 patrimoines propres, **indépendant du boni commun** et applicable dans tous les régimes.

### 4.8 Créance de participation aux acquêts — art. 1569-1581

Fichier : [participationAcquets.ts](src/lib/patrimoine/participationAcquets.ts). **Décès uniquement** ; le divorce est un chantier séparé non réalisé.

```
sommeParEpoux(lignes, epoux) = Σ valeur des lignes de cet époux,
                               en excluant bien_professionnel si exclusionBiensProfessionnels

acquetNet(epoux) = max(0, final − originaire)                (art. 1570, plancher à zéro)

si acquetNet.user === acquetNet.spouse  → créance nulle, ni débiteur ni créancier
sinon :
  débiteur   = celui dont l'acquêt net est le plus fort
  créancier  = l'autre
  montant    = |acquetNet.user − acquetNet.spouse| / 2        (art. 1571 al. 1)
```

**Hypothèses / approximations :**
- Le calcul est **totalement indépendant** de `qualifierBien` / `getPartSuccessorale` : il repose sur deux tables de saisie manuelle (`patrimoine_originaire`, `patrimoine_final`), sans dérivation automatique depuis `assets`. Une même valeur peut donc être saisie deux fois, sans réconciliation.
- Aucune revalorisation monétaire du patrimoine originaire (art. 1571 prévoit une réévaluation selon l'état au jour du mariage et la valeur au jour de la liquidation) : les valeurs sont prises telles que saisies.
- Aucune réintégration des donations consenties pendant le mariage dans le patrimoine final.
- Le plancher à zéro est appliqué **par époux**, pas de compensation d'un appauvrissement.
- L'exclusion des biens professionnels est un booléen global tiré de la clause `exclusion_biens_professionnels`, appliqué symétriquement aux deux masses.

### 4.9 Intégration dans la Transmission — mécanisme A

Fichier : [src/lib/transmission/index.ts](src/lib/transmission/index.ts), lignes ~220-330 et ~530-595.

```
impactRecompenses  = regimeHasMasseCommune(regime) ? ajustementBoniCommun × 0.5 : 0
impactCreances     = soldeCreances[decedentRole]                    (à 100 %, patrimoine propre)
deltaRecompensesCreances = impactRecompenses + impactCreances

deltaParticipationAcquets = −montantCreance si le défunt est débiteur
                          = +montantCreance si le défunt est créancier
                          = 0 sinon                    (seulement si regimeIsParticipationAcquets)

deltaAvantageMatrimonial = Σ sur les actifs hors assurance-vie
                             (getFractionAjustee − getPartSuccessorale) × valeur_estimee

deltaCivilTotal = deltaRecompensesCreances + deltaParticipationAcquets
                + deltaAvantageMatrimonial + avReintegrationCivileMontant
patrimony.biensExistants += deltaCivilTotal
```

Côté fiscal, chaque actif est pondéré par `getFractionSuccessorale = getFractionAjustee(...) ?? getPartSuccessorale(...)`, et deux **lignes d'actif synthétiques** sont ajoutées aux `dmtgAssets` quand les deltas sont non nuls : `ajustement-recompenses-creances` et `ajustement-participation-acquets` (toutes deux `nature: 'autre'`, pour ne pas fausser l'assiette des frais de notaire).

**Approximation explicitement signalée dans le code** : le ratio de 0,5 appliqué à `ajustementBoniCommun` est repris de `getPartSuccessorale('Bien commun')` et **ne tient pas compte** des parts inégales ni de l'attribution intégrale — trou identifié, renvoyé à un chantier ultérieur.

### 4.10 Évolution du patrimoine

Fichier : [evolutionPatrimoine.ts:18](src/lib/patrimoine/evolutionPatrimoine.ts).

Pour chaque date présente dans `asset_valorisations` (toutes lignes confondues), le total est la somme sur **tous** les actifs de : dernière valorisation connue à cette date ou avant ; à défaut (aucun historique, ou historique entièrement postérieur), repli sur `valeur_estimee` courante.

Approximation : un actif non encore acquis à une date passée est donc compté à sa valeur actuelle sur toute la période. Aucune pondération par la quote-part de détention.

### 4.11 Régimes fiscaux de plus-value

- **Mobilier** ([regimeFiscalPlusValue.ts](src/lib/patrimoine/regimeFiscalPlusValue.ts)) : PFU 31,4 % (IR 12,8 % + PS 18,6 %), 8 groupes de natures couverts (PFU générique, PEA/PEA-PME, AGA, etc.). Toute nature hors périmètre → `non_determine`, jamais de règle devinée.
- **Immobilier** ([regimeFiscalPVI.ts](src/lib/patrimoine/regimeFiscalPVI.ts)) : IR 19 %, PS 17,2 %, abattement IR 6 %/an de la 6e à la 21e année puis 4 % la 22e (exonération à 22 ans), abattement PS 1,65 %/an puis 1,60 % puis 9 %/an (exonération à 30 ans), plus surtaxe. 4 groupes couverts, sinon `null`.
- Approximation documentée : `'Terrains'` applique systématiquement le régime général **avec** surtaxe, faute de champ distinguant un terrain à bâtir — décision explicitement validée plutôt que d'inventer un champ.

---

## 5. Formulaires et UI de saisie

Légende de la colonne « Statut » :
**LU** = lu par le moteur de calcul (qualification, part successorale, agrégats, transmission) · **AFF** = affiché mais sans effet sur un calcul · **DORMANT** = écrit en base, aucune lecture trouvée.

### 5.1 `AssetForm.tsx` — formulaire d'actif (4 onglets)

**Onglet « Informations générales »**

| Champ | Contrôle | Conditionnel | Statut |
|---|---|---|---|
| `nature` | SearchableSelect (`ASSET_NATURE_OPTIONS`) | requis | **LU** (catégorie, immeuble/meuble, société d'acquêts RP, régime fiscal PV, DMTG) |
| `denomination` | Input texte | — | AFF (libellés, messages d'erreur) |
| `etablissement` | Input texte | si `nature ∈ NATURES_WITH_ETABLISSEMENT` | AFF |
| `situation_particuliere` | Select (7 options) | — | **AFF** — dormant côté calcul |
| `bien_etranger` | Checkbox | si `nature ∉ NATURES_LIQUIDITES_FR` | **DORMANT** dans ce périmètre |
| `transfert_immobilier` | Checkbox | si catégorie immobilière | LU (module Immobilier) |
| `transfert_societe` | Checkbox | si `isSocieteEligibleNature(nature)` | LU (module Sociétés) |
| `sous_type_per` | Select Bancaire/Assurantiel | si `nature ∈ NATURES_PER` | LU (Retraite / Transmission) |
| `cto_multi_actifs` | Checkbox | si `nature === 'Compte-titres (CTO)'` | LU (régime fiscal PV) |
| `cto_nature_sous_jacent` | Select | si `cto_multi_actifs` | LU (`resolveEffectiveNature`) |
| `attachement_emotionnel` | Slider 0-10 | — | **AFF** — dormant côté calcul |

**Onglet « Détention & Acquisition »**

| Champ | Contrôle | Conditionnel | Statut |
|---|---|---|---|
| `mode_detention` | Select (Pleine propriété / Usufruit / Nue-propriété) | — | AFF + barème 669 ; **passé à `qualifierBien` mais non lu par lui** |
| `detenteur` | Select (prénoms, « Le couple », « Indivision ») | « Le couple » masqué si propre/personnel | **LU** (qualification, part successorale) |
| indivisaires | `IndivisairesSection` | si `detenteur === 'Indivision'` | partiellement **DORMANT** : les lignes sont persistées, mais `pourcentage` n'est jamais lu par le calcul |
| démembrement | `DemembrementSection` | si mode Usufruit ou Nue-propriété | LU par le barème 669 (âge de la contrepartie), pas par la qualification |
| `date_acquisition` | DateInput | masqué si `nature ∈ NATURES_WITHOUT_ACQUISITION` | **LU** (avant/après mariage, durée PVI) |
| `origine_actif` | Select mono-valeur écrivant un tableau (9 options) | idem | **LU** (origines gratuites) |
| `valeur_acquisition` | Input number | idem | **LU** (plus-value, art. 1436) |
| `frais_acquisition` | Input number | idem | **LU** (plus-value) |
| `clause_entree_communaute` | Checkbox | si origine ∈ {Donation, Héritage} | **LU** (art. 1405 al. 2) |
| `clause_remploi` | Checkbox | si origine = Acquisition à titre onéreux | **LU** (priorité absolue) |
| `financement_mixte_apport_propre` | Input number | si régime communautaire **et** origine onéreuse **et** `clause_remploi` décochée | **LU** (art. 1436) |
| `est_propre_par_nature` | Checkbox | **toujours affiché** | **LU** (art. 1404), mais sans effet hors régime communautaire / PACS-indivision |
| `licitation_acquereur` | Select | si PACS-indivision **et** `detenteur === 'Le couple'` | **DORMANT** (explicitement documenté dans l'UI) |
| `part_licitation_personnelle` | Input number 0-100 | idem | **DORMANT** (idem) |
| `qualification_bien` | Select (5 options, dont « À qualifier ») | — | **LU** — sélectionner une valeur bascule `qualification_auto` à `false` |
| `qualification_auto` | pas de contrôle direct ; bouton « Réactiver le calcul automatique » | — | **LU** |

**Onglet « Valorisation »** : `valeur_estimee` (**LU**, base de tous les agrégats), `date_estimation` (AFF + bannière d'incomplétude). Affiche aussi la plus-value live et la valorisation démembrée live (barème 669), tous deux calculés à la volée, non persistés.

**Onglet « Charges »** : sous-formulaire `ChargeForm` — `type_charge`, `denomination`, `debiteur`, `montant`, `unite`, `periodicite`, `date_debut`, `duree_type`, `duree_fin_date`, `duree_annees`, `impact_budget`. Aucun de ces champs n'entre dans la qualification juridique ni dans la part successorale ; `impact_budget` alimente le module Budget.

**Non exposés dans le formulaire** (mais présents en base) : `pourcentage_utilisateur` et `pourcentage_conjoint` — calculés automatiquement depuis le détenteur et **forcés au submit** (100/0, 0/100, ou 50/50 pour « Le couple »). Aucune saisie manuelle possible, y compris pour une indivision à quote-part non égalitaire.

### 5.2 `PassifEmpruntForm.tsx` — formulaire fusionné passif / emprunt

Aiguillage : `EMPRUNT_NATURES.includes(nature)` → table `emprunts`, sinon table `passifs`.

| Champ | Contrôle | Conditionnel | Statut |
|---|---|---|---|
| `nature` | Select | requis | **LU** (aiguillage) |
| `libelle` | Input | si emprunt | AFF |
| `asset_id` | Select des actifs | si emprunt | **LU** (préremplit détenteur + quotes-parts ; règle d'alerte) |
| `capital_restant_du` | Input number | si emprunt | **LU** (totaux passifs) |
| `taux_interet`, `mensualite`, `duree_restante` | Input number | si emprunt | AFF (+ Budget pour `mensualite`) |
| `type_garantie` | Select (4 valeurs) | si emprunt | **AFF** — dormant |
| `reporter_budget` | Checkbox | si emprunt | LU (Budget) |
| `assure` | Checkbox | si emprunt | conditionne les 3 champs suivants |
| `quotite_assuree_utilisateur` / `_conjoint` | Input number | si `assure` | **DORMANT** |
| `capital_garanti_deces` | Input number | si `assure` | **DORMANT** |
| `montant_du` | Input number | si passif | **LU** (totaux passifs) |
| `detenteur` | Select | « Le couple » masqué si propre/personnel | **LU** |
| `contributeur_remboursement` | Select (utilisateur / conjoint / les_deux) | si emprunt | **LU** — une seule lecture : règle d'alerte `separation_biens_rp_indivise_remboursement_unilateral` |

**Non exposés** : `qualification_bien` et `qualification_auto` — calculés silencieusement, aucune surcharge manuelle possible depuis l'UI (contrairement à `AssetForm`). `pourcentage_utilisateur` / `pourcentage_conjoint` : mêmes règles automatiques que pour l'actif.

### 5.3 `RecompensesSection.tsx`

| Champ | Contrôle | Statut |
|---|---|---|
| `sens` | Select (2 valeurs) | **LU** |
| `epoux` | Select (Vous / Conjoint) | **LU** |
| `bien_concerne_id` | Select des actifs, facultatif | **AFF** — libellé seul, aucun rattachement calculatoire |
| `depense_faite` | Input number, requis | **LU** |
| `valeur_bien_acquisition` | Input number, facultatif | **LU** (« valeur avant ») |
| `valeur_bien_liquidation` | Input number, facultatif | **LU** (« valeur après ») |
| `nature_depense` | Select (4 valeurs) | **LU** (choix de formule + plancher) |
| `mode_evaluation_conventionnel` | Select (profit subsistant / nominal / plafonné) | **LU** |

Pas d'édition : uniquement ajout et suppression. Aucune validation croisée (une récompense en nature `acquisition` sans valeurs avant/après retombe silencieusement sur la dépense nominale).

### 5.4 `CreancesEntreEpouxSection.tsx`

Mêmes champs, avec `epoux_creancier` / `epoux_debiteur` (validation UI : doivent être différents), `valeur_bien_avant` / `valeur_bien_apres`, et un mode d'évaluation limité à **2** valeurs (profit subsistant / nominal — pas de « plafonné »). `bien_concerne_id` : **AFF** uniquement. Ajout / suppression seulement.

### 5.5 `PatrimoineOriginaireSection.tsx`

| Champ | Contrôle | Statut |
|---|---|---|
| `epoux` | Select | **LU** |
| `bien_concerne_id` | Select des actifs, facultatif | **AFF** |
| `nature` | Input **texte libre** | **AFF** (libellé) |
| `valeur` | Input number, requis | **LU** |
| `bien_professionnel` | Checkbox | **LU** (filtre d'exclusion) |
| `signe` | Checkbox « État descriptif signé (art. 1570) » | **LU** (règle d'alerte uniquement) |
| `date_signature` | Input date, si `signe` | **DORMANT** |

### 5.6 `PatrimoineFinalSection.tsx`

Identique, **sans** `signe` ni `date_signature` : `epoux`, `bien_concerne_id`, `nature` (texte libre), `valeur`, `bien_professionnel`.

### 5.7 `ScenarioRegimeSection.tsx`

`type` (réalisé / envisagé), `regime_cible` (Select sur `REGIMES_MATRIMONIAUX`), `date`, `motivation_civile` (Textarea). Tous **LU** par le moteur d'alertes (`changement_regime_proche_donation`), aucun par le moteur de qualification.

### 5.8 `RelationInfoForm.tsx` (extrait pertinent)

Porte `statut_couple`, `regime_matrimonial` (Select sur `REGIMES_MATRIMONIAUX`), `pas_de_contrat_mariage` (déclenche `determinerRegimeLegal`), `date_mariage`, `date_pacs`, `convention_pacs`, ainsi que les champs DIP `loi_applicable_regime` / `pays_premier_domicile_matrimonial` (**dont les colonnes sont absentes de la base**, cf. §7.1).

Au changement de régime, `handleRegimeSelect` appelle `getClausesIncompatibles(clausesActuelles, toRegimeType(nouveauRegime))` et demande confirmation avant de purger les clauses actives devenues incompatibles.

### 5.9 Écrans de clauses

`MatrimonialRegimeOptions.tsx` + `ClauseItem.tsx` exposent, par clause : activation (Checkbox), sélection de biens (`AssetSelectionModal`), pourcentage de partage inégal (`PartConjointInput`), et les options `pleineProprietee` / `usufruit` / `residencePrincipale` / `maintienDivorce` / `porteSur`. Le tout est persisté dans le jsonb `marital_status.clauses_contrat` avec un debounce de 800 ms.

Parmi les 33 `ClauseType` déclarés, **seules 6 sont réellement lues par un moteur de calcul** :
`preciput`, `attribution_integrale`, `partage_inegal` (→ `getFractionAjustee`), `societe_acquets` (→ `qualifierBien`), `extension_propres_par_nature` (→ `qualifierBien`), `exclusion_biens_professionnels` (→ règle d'alerte + participation aux acquêts). Les 27 autres sont **déclaratives** : persistées et affichées, sans effet calculatoire.

---

## 6. Dépendances avec les autres modules

### 6.1 Patrimoine → Transmission

Le couplage est **fort** : Transmission ne recalcule jamais la qualification, il consomme les fonctions pures de `src/lib/patrimoine/`.

| Source (Patrimoine) | Consommateur (Transmission) | Nature du lien |
|---|---|---|
| `succession.ts::getPartSuccessorale` | [transmissionHelpers.ts:7](src/utils/transmissionHelpers.ts) → `buildPatrimonySnapshot` (ligne 694) | Pondère chaque actif pour construire la masse civile de la succession |
| `succession.ts::getPartSuccessorale` | [lib/transmission/index.ts:21](src/lib/transmission/index.ts) → `getFractionSuccessorale` (ligne 300) | Repli quand aucune clause d'avantage matrimonial ne s'applique ; sert au civil **et** au fiscal (`dmtgAssets`, ligne 552) |
| `succession.ts::getPartConjointSuccession` | `transmissionHelpers.ts` → `buildSurvivingSpousePatrimony` (ligne 777), `buildSpouseRawAssets` (ligne 856), `buildSpouseOwnBasePatrimony` (ligne 887) | Construit le patrimoine propre du conjoint survivant pour la 2nde succession chaînée |
| `succession.ts::BienNonQualifieError` | `Synthese.tsx:28`, `ProcessusCalcul.tsx:30`, `Succession2ndDeces.tsx:38`, `AssuranceVie.tsx:27` | Les 4 écrans catchent cette classe pour afficher un message précis « bien non qualifié » au lieu d'une erreur générique |
| `avantagesMatrimoniaux.ts::getFractionAjustee` | `lib/transmission/index.ts:35` (ligne 301 et 309) | Substitue la fraction successorale par bien quand une clause de préciput / attribution intégrale / partage inégal s'applique |
| `avantagesMatrimoniaux.ts::getPartConjointAjustee`, `getFractionPassifAjustee`, `buildAvantageMatrimonialCtx` | [transmissionHelpers.ts:8](src/utils/transmissionHelpers.ts) → `buildSpouseRawAssets` (ligne 852), `buildPatrimonySnapshot` (ligne 699) | Miroir « conjoint décède en premier » et traitement symétrique du passif commun |
| `avantagesMatrimoniaux.ts::resolvePreciputMode` | `lib/transmission/index.ts` (ligne 268) | Résolution de la modalité du préciput depuis les 2 cases à cocher |
| `recompensesCreances.ts` (`RecompenseCalcInput`, `CreanceCalcInput`, `computeSoldeRecompenses`, `computeSoldeCreancesEntreEpoux`, `regimeHasMasseCommune`) | [transmissionHelpers.ts:11](src/utils/transmissionHelpers.ts) (`buildRecompensesCalcInput`, `buildCreancesCalcInput`) et `lib/transmission/index.ts:28` (lignes 220-235) | Mappe les lignes Supabase snake_case → camelCase, puis injecte le solde comme ligne d'actif synthétique dans le pipeline DMTG |
| `participationAcquets.ts` (`PatrimoineLigneCalcInput`, `computeParticipationAcquets`, `regimeIsParticipationAcquets`) | [transmissionHelpers.ts:9](src/utils/transmissionHelpers.ts) (`buildParticipationAcquetsContext`) et `lib/transmission/index.ts:33` (lignes 244-256) | Créance de participation convertie en delta civil + ligne d'actif synthétique |
| `qualification.ts::isRegimeCommunautaire` | [transmissionHelpers.ts:19](src/utils/transmissionHelpers.ts) → `computeAVReintegrationCivile` (ligne 332) | Conditionne la réintégration civile de l'assurance-vie (doctrine Ciot) au caractère communautaire du régime |
| `utils.ts::isDetenteurSpouse` | [transmissionHelpers.ts:18](src/utils/transmissionHelpers.ts) → `buildAVContracts` (ligne 306) | Détermine le détenteur réel d'un contrat d'assurance-vie |
| `utils.ts::formatCurrency` | `AssuranceVie.tsx`, `av/AVContractDetail.tsx`, `av/AVOperationsTable.tsx`, `av/ClauseBeneficiaireBuilder.tsx` | Formatage monétaire uniquement |
| Hooks `useAssets`, `usePassifs`, `useEmprunts` | `ProcessusCalcul.tsx`, `Synthese.tsx`, `Succession2ndDeces.tsx`, `Liberalites.tsx`, `DonationForm.tsx`, `LegsForm.tsx` | Transmission consomme directement les hooks de données Patrimoine (pas de couche intermédiaire) |
| Hooks `usePatrimoineOriginaire`, `usePatrimoineFinal`, `useRecompenses`, `useCreancesEntreEpoux` | `ProcessusCalcul.tsx`, `Synthese.tsx`, `Succession2ndDeces.tsx`, `AssuranceVie.tsx` | Alimentent `buildParticipationAcquetsContext` / `buildRecompensesCalcInput` / `buildCreancesCalcInput` |
| `marital_status.clauses_contrat` (jsonb) | `ProcessusCalcul.tsx:95` et homologues | `exclusion_biens_professionnels.enabled` → paramètre `exclusionBiensProfessionnels` de la créance de participation |
| `bareme669CGI.ts` (indirect) | `lib/transmission/index.ts::getDemembrementPct` | Le barème 669 est ré-implémenté côté Transmission (`getDemembrementPct`) plutôt qu'importé — **duplication** (cf. §7) |

**Sens du couplage** : unidirectionnel Patrimoine → Transmission. Aucun fichier de `src/lib/patrimoine/` n'importe `src/lib/transmission/`. Seule exception nominale : `avantagesMatrimoniaux.ts` importe `ClausesData` depuis `src/types/matrimonial.ts` (type partagé, pas un module Transmission).

**Tests de branchement** côté Transmission, qui documentent explicitement ces points de contact :
`src/lib/transmission/avantageMatrimonial.branchement.test.ts`, `participationAcquets.branchement.test.ts`, `recompensesCreances.branchement.test.ts`, `goldenScenarios.test.ts`.

### 6.2 Patrimoine → Alertes de conseil

Couplage **faible** : une seule fonction importée, le reste passe par les hooks de données.

| Source (Patrimoine) | Consommateur (Alertes) | Nature du lien |
|---|---|---|
| `utils.ts::isDetenteurCommon` | [src/lib/alertes/regles.ts:2](src/lib/alertes/regles.ts) | Seul import direct de `lib/patrimoine` dans tout le module Alertes — utilisé par la règle `separation_biens_rp_indivise_remboursement_unilateral` |
| Hook `useAssets` | [useAlertesConseil.ts:3](src/hooks/useAlertesConseil.ts) | Alimente `AlerteContext.assets` |
| Hooks `usePassifs`, `useEmprunts` | `useAlertesConseil.ts:4` | Alimentent `AlerteContext.emprunts` et l'estimation `patrimoineNet` |
| Hook `usePatrimoineOriginaire` | `useAlertesConseil.ts:9` | Alimente `AlerteContext.patrimoineOriginaire` (règle sur l'état descriptif signé) |
| Hook `useScenariosRegime` | `useAlertesConseil.ts:6` | Alimente `AlerteContext.scenariosRegime` |
| Type `Asset` / `Emprunt` / `PatrimoineOriginaire` | [src/lib/alertes/types.ts](src/lib/alertes/types.ts) | Imports de types uniquement |

**Règles d'alerte qui lisent des données Patrimoine** (5 sur 16) :

| Règle | Données Patrimoine lues |
|---|---|
| `communaute_universelle_double_abattement` | `patrimoineNet` (estimation simple actifs − passifs − emprunts) comparé à `2 × 100 000 € × nb enfants` |
| `separation_biens_rp_indivise_remboursement_unilateral` | `assets` (nature `'Résidence principale'` + `isDetenteurCommon`) croisé avec `emprunts.contributeur_remboursement` via `emprunts.asset_id` |
| `parts_non_negociables_souscrites_pendant_mariage` | `societes.parts_negociables` et `societes.date_souscription` comparés à `date_mariage` (art. 1832-2) |
| `participation_acquets_sans_etat_descriptif_signe` | `patrimoine_originaire.signe` |
| `exclusion_biens_professionnels_sans_maintien_divorce` | `clauses_contrat.exclusion_biens_professionnels.options.maintienDivorce` |

**Point notable** : `AlerteContext.patrimoineNet` est une estimation **volontairement simplifiée** (somme brute des valeurs, sans pondération par `getPartSuccessorale`), documentée comme telle dans le code — elle diverge donc structurellement du `patrimoineNet` de `usePatrimoineCalculations` et de l'assiette Transmission.

### 6.3 Patrimoine ↔ Sociétés

| Source | Consommateur | Nature du lien |
|---|---|---|
| `societeTransfer.ts` (`isSocieteEligibleNature`, `natureToTypeSociete`) | `AssetForm.tsx:27`, `PatrimoineActifs.tsx:12` | Bascule d'un actif éligible vers une ligne `societes` (création + `assets.societe_id`) |
| `qualification.ts::QUALIFICATION_OPTIONS` | [SocieteForm.tsx:12](src/components/societes/SocieteForm.tsx) | Le formulaire Société réutilise la même liste de qualifications — mais **sans appeler `qualifierBien`** : la qualification y est purement manuelle |
| `utils.ts` (`mapDetenteurToDisplay`, `mapDetenteurToDb`, `FamilyInfo`) | `SocieteForm.tsx:13` | Même convention de détenteur |
| `succession.ts` (`getPartSuccessorale`, `BienNonQualifieError`) | [SocietesTransmission.tsx:15](src/components/societes/transmission/SocietesTransmission.tsx) | Le module Sociétés applique la même règle de part successorale à ses propres lignes |

**Point d'attention documenté dans `succession.ts`** : le chemin « transfert société → actifs » (`SocieteFormPage.tsx` / `SocieteFormDialog.tsx`) crée des actifs **sans renseigner `qualification_bien`** — ces actifs déclenchent donc `BienNonQualifieError` en aval.

### 6.4 Patrimoine → autres modules (pour mémoire)

- **Immobilier** : `utils.ts::formatCurrency` (`ImmobilierOverview.tsx`, `LMNPDetailView.tsx`) ; les champs « immobilier étendu » de `assets` sont consommés par `src/components/immobilier` / `src/pages/immobilier`.
- **Retraite** : `bareme669CGI.ts::computeAge` (`Trimestres.tsx`) ; `useAssets` (`EpargneRetraite.tsx`).
- **IFI** : `src/lib/ifi/` lit `societes.pourcentage_ifi` / `valeur_ifi` et ses propres tables ; **aucun import de `lib/patrimoine` trouvé**.
- **DMTG** : `src/lib/dmtg/index.ts` mentionne `getPartSuccessorale` en commentaire (la pondération est appliquée en amont par `transmission/index.ts`) mais ne l'importe pas.
- **Budget** : consomme `asset_charges.impact_budget`, `asset_revenus.impact_budget`, `emprunts.reporter_budget` et `emprunts.mensualite`.
- **Dashboard** : consomme `useAssets` / `usePassifs`.

---

## 7. Dette technique et limites connues

### 7.1 Désynchronisation base ↔ code (constaté le 2026-07-28)

**Colonnes lues par le code mais absentes de la base.** `marital_status.loi_applicable_regime` et `marital_status.pays_premier_domicile_matrimonial` sont :
- déclarées dans `src/services/familyService.ts:67-68` et `src/integrations/supabase/types.ts` ;
- écrites par `RelationInfoForm.tsx:185-186` et relues ligne 158-159 ;
- lues par `useAlertesConseil.ts:55-56` pour alimenter la règle `extraneite_regime_matrimonial` ;
- créées par la migration `supabase/migrations/20260728110000_add_dip_regime_matrimonial_fields.sql` ;

mais **la migration n'est pas enregistrée** dans `supabase_migrations.schema_migrations` (dernière version appliquée : `20260726091622`) et les deux colonnes **n'existent pas** dans `public.marital_status`. Conséquence attendue : la sauvegarde du formulaire relation échoue ou ignore ces champs, et l'alerte d'extranéité du régime ne se déclenche jamais. *(Constat factuel de l'état de la base au moment de l'audit — la migration a pu être écrite pour être appliquée ultérieurement.)*

### 7.2 Approximations explicitement documentées dans le code

| Sujet | Localisation | Nature |
|---|---|---|
| **Profit subsistant** | `recompensesCreances.ts:4-37` | « SIMPLIFICATION DOCUMENTÉE, pas une formule légale universelle unique ». Deux formules retenues pour coller aux deux exemples de référence ; un cas réel à causes multiples de plus-value « demanderait une analyse notariale au cas par cas, pas ce calcul » |
| **Profit subsistant travaux** | idem, lignes 22-29 | Suppose que l'intégralité de la plus-value constatée résulte de la dépense. Le choix `valeurApres − valeurAvant` (60 000) plutôt que le prorata (52 000) est signalé comme « une lecture parmi d'autres possibles » |
| **Ratio 50 % des récompenses** | `lib/transmission/index.ts:223-231` | Repris de `getPartSuccessorale('Bien commun')` ; **ne gère pas** les parts inégales ni l'attribution intégrale — « trou déjà identifié, chantier séparé » |
| **Clause de communauté au 2nd décès** | `avantagesMatrimoniaux.ts:136-146` | Appliquer une clause de communauté après dissolution de celle-ci au 1er décès est une approximation assumée, alignée sur le comportement préexistant |
| **Attribution intégrale et passif** | `avantagesMatrimoniaux.ts:201-210` | L'obligation du bénéficiaire d'acquitter tout le passif commun est « hors périmètre de ce calcul de masse taxable » |
| **Terrains à bâtir** | `regimeFiscalPVI.ts:19-27` | Aucun champ ne distingue un terrain constructible : régime général avec surtaxe appliqué systématiquement, décision validée plutôt que d'inventer un champ |
| **Règles de qualification** | `qualification.ts:6` | En-tête : « Règles simplifiées » |
| **PACS-indivision** | `qualification.ts:28-30` | Convention d'indivision « assimilée, pas de notion distincte pour les besoins de cet outil » |
| **Estimation patrimoineNet des alertes** | `useAlertesConseil.ts:36-38`, `alertes/types.ts` | « Estimation simple, pas le calcul fiscal-grade de src/lib/transmission » |
| **Testament dans les alertes** | `alertes/regles.ts:28-33` | Un testament est réputé exister dès qu'une ligne de legs porte `testament_realise = 'Oui'`, sans vérifier le bénéficiaire — faux négatif possible |
| **AV bénéficiaire concubin** | `alertes/regles.ts:39-41` | `typeDetention` / `nuProprietaireId` non pris en compte — « cas volontairement non traité, à trancher plus tard » |
| **Bannière d'incomplétude** | `IncompleteAssetsBanner.tsx:24-26` | Contrôle « simplifié » : `valeur_acquisition` n'est jamais vérifiée (commentaire laissé sans implémentation) |
| **Participation aux acquêts** | `participationAcquets.ts:2` | « décès uniquement pour cette v1 (divorce = chantier séparé plus tard) » |

### 7.3 Duplications assumées

| Logique dupliquée | Emplacements | Justification donnée |
|---|---|---|
| Détection des régimes matrimoniaux (`includes` sur libellé) | `qualification.ts` (7 prédicats), `recompensesCreances.ts::regimeHasMasseCommune`, `participationAcquets.ts::regimeIsParticipationAcquets`, `alertes/regles.ts` (5 prédicats), `regimeChangeClauses.ts::toRegimeType` | « Réplique volontairement en local […] plutôt que de les exporter / modifier ce fichier — hors périmètre » |
| Parsing des clauses vers `AvantageMatrimonialContext` | `avantagesMatrimoniaux.ts::buildAvantageMatrimonialCtx`, `lib/transmission/index.ts` (inline, lignes 264-294), `useMatrimonialClauses.ts::analyzeForTransmission` | « `computeTransmission` n'est volontairement PAS modifié pour appeler ce helper (déjà validé, changement jugé hors périmètre) » |
| Matrice d'exclusion mutuelle des clauses | `avantagesMatrimoniaux.ts::CLAUSE_MUTUAL_EXCLUSION` ↔ `constants/matrimonialClauses.ts::CLAUSE_REGIME_COMPATIBILITY` | « Miroir […] gardé ici tant que ce module n'est pas branché sur `useMatrimonialClauses.ts` » |
| Filtrage des clauses compatibles par régime | `regimeChangeClauses.ts::getClausesCompatiblesKeys` ↔ `useMatrimonialClauses.ts::getClausesForRegime` | « Dupliquée ici plutôt que ré-exposée depuis le hook pour ne pas toucher à son architecture » |
| Barème art. 669 CGI | `lib/patrimoine/bareme669CGI.ts` ↔ `lib/transmission/index.ts::getDemembrementPct` | Aucune justification trouvée — **duplication non documentée** |
| Calcul de la part du conjoint | `usePatrimoineCalculations` (par complément `1 − userFraction`) ↔ `getPartConjointSuccession` (lecture directe de `pourcentage_conjoint`) | Divergence non documentée, effective dès que les deux pourcentages ne somment pas à 100 |
| `buildSpouseOwnBasePatrimony` | `transmissionHelpers.ts:876` | « dupliquée ici sciemment » |

### 7.4 Incohérences de référentiel signalées dans le code

- **`CLAUSE_REGIME_COMPATIBILITY` vs `CLAUSES_BY_REGIME.participation_acquets`** : `attribution_integrale` et `partage_inegal` sont listées comme compatibles dans la matrice légale mais absentes du catalogue UI du régime. Décision validée (option A) : retenir la définition UI, plus conservatrice. Signalée dans `regimeChangeClauses.ts:44-51` et couverte par un test.
- **`ModeEvaluationConventionnel`** a 3 valeurs pour les récompenses et 2 pour les créances, alors que les deux colonnes sont des `text` libres sans CHECK.
- **Conventions de détenteur divergentes** : `assets.detenteur` (`user` / `spouse` / `common` / `Indivision`), `asset_charges.debiteur` (`Époux 1` / `Époux 2` / `Couple`), `emprunts.contributeur_remboursement` (`utilisateur` / `conjoint` / `les_deux`), `assets.licitation_acquereur` (`utilisateur` / `conjoint`). Quatre vocabulaires pour la même notion.
- **⚠️ Non corrigé — `qualifierBien`, branche société d'acquêts, détenteur « couple » raté** : le test `detenteur.toLowerCase().includes('couple')` (`qualification.ts`, branche « séparation de biens avec société d'acquêts ») ne reconnaît **pas** la valeur BDD `'common'`. Or `qualifierBien` est appelé avec deux conventions différentes selon l'appelant : `useAssetForm.ts` passe la valeur d'affichage `'Le couple'` (qui matche), `AssetDetailsDialog.tsx` passe la valeur brute `asset.detenteur` = `'common'` (qui ne matche pas). Conséquence : sous ce régime, un bien détenu par les deux époux sans désignation dans la société d'acquêts est qualifié `Indivision` dans le formulaire mais `Bien propre` dans la fiche de détail — deux qualifications contradictoires pour le même bien. Repéré lors de la correction du concubinage (2026-07-28), laissé hors périmètre volontairement. Correctif attendu : utiliser `isDetenteurCommon()` de `utils.ts`, comme le fait désormais la branche concubinage.

### 7.5 Modules ou champs non branchés

- **`avantagesMatrimoniaux.ts`** : son en-tête (lignes 8-15) indique qu'il n'est « pas encore consommé par `computeTransmission` ni par `buildPatrimonySnapshot` ». **Cette mention est obsolète** : le branchement a été fait depuis (`transmission/index.ts:35`, `transmissionHelpers.ts:8`). Commentaire à corriger.
- **`analyzeForTransmission()`** (`useMatrimonialClauses.ts:182`) : produit un `MatrimonialAnalysisResult` (`totalExcluSuccession`, notes) consommé uniquement par `MatrimonialRegimeOptions.tsx:45` **à des fins d'affichage**. Il double la logique de `getFractionAjustee` avec une formule différente (valeur brute des biens sélectionnés, sans pondération 50 % ni démembrement) — deux chiffres différents peuvent donc être présentés à l'utilisateur pour le même préciput.
- **27 des 33 `ClauseType`** sont déclaratives (cf. §5.9).
- Colonnes dormantes : cf. tableau récapitulatif §2.16.

### 7.6 Limites fonctionnelles constatées (non commentées dans le code)

| Limite | Détail |
|---|---|
| **Démembrement sans effet sur la qualification** | `mode_detention` est transmis à `qualifierBien` mais jamais lu. |
| **Pas d'historisation du régime** | Le régime courant est appliqué rétroactivement à tous les biens ; `scenarios_regime` enregistre les changements mais n'est utilisé que par les alertes. |
| **Pas d'édition sur 4 tables** | `recompenses`, `creances_entre_epoux`, `patrimoine_originaire`, `patrimoine_final` : uniquement ajout et suppression (aucune méthode `update` dans les services). |
| **Aucune contrainte CHECK** | Sur `qualification_bien`, `detenteur`, `sens`, `epoux`, `nature_depense`, `mode_evaluation_conventionnel`, `regime_matrimonial`, `epoux_creancier`/`epoux_debiteur` : toute la fermeture des listes repose sur l'UI. |
| **`passifService` sans contrôle d'appartenance** | Contrairement à `assetService`, aucun contrôle explicite du `user_id` avant `update`/`delete` (repose uniquement sur les RLS). |
| **FK `user_id` manquantes** | `asset_valorisations`, `asset_demembrements`, `asset_indivisaires` portent un `user_id NOT NULL` **sans FK vers `auth.users`** — écart avec la règle du `CLAUDE.md` (la cascade est néanmoins assurée indirectement via `asset_id`). |
| **`societes` NOT NULL asymétrique** | `societes.qualification_bien` et `societes.detenteur` sont `NOT NULL`, alors que les mêmes colonnes sont nullables sur `assets`, `emprunts` et `passifs`. |
| **Rechargement systématique** | `useAssets` refait un `SELECT *` complet à chaque montage, sans cache partagé — plusieurs composants d'un même écran déclenchent des requêtes redondantes. |
| **Âge calculé « à aujourd'hui »** | `computeAge` utilise `new Date()`, sans date de référence paramétrable — un calcul de démembrement n'est pas reproductible dans le temps. |
| **Assurance emprunteur du conjoint non déduite dans le 2nd décès** | Corrigé pour l'Utilisateur le 2026-07-28 (cf. §7.8), mais `buildSurvivingSpousePatrimony`/`buildSpouseOwnBasePatrimony` (`Succession2ndDeces.tsx`) restent volontairement en sommation brute : le passif approximé du conjoint n'est pas netté de sa propre assurance emprunteur — décision explicite, pas un oubli, cf. §7.8. |
| **Aucune borne sur `quotite_assuree_utilisateur`/`_conjoint`** | Ni le schéma Zod (`z.number().optional()`, sans `.min(0).max(100)`) ni le formulaire (bornes `min`/`max` HTML uniquement, non contraignantes) n'empêchent une valeur >100 ou négative d'être persistée. `buildPassifLines` clampe désormais la quotité à `[0, 100]` au moment du calcul (2026-07-28), ce qui neutralise l'effet d'une valeur aberrante sur la transmission, mais la donnée en base reste non contrainte. |
| **Emprunts de société comptés dans le patrimoine personnel** | [usePatrimoineCalculations.ts:153](src/hooks/usePatrimoineCalculations.ts) additionne **tous** les emprunts, sans filtrer `societe_id`. Un emprunt porté par une société est un passif de la personne morale, déjà reflété dans la valorisation des parts : le compter ici est un double emploi. Le chemin Transmission a été corrigé le 2026-07-28 (`buildPassifLines` filtre `societe_id`), pas celui-ci — **dette technique ouverte**, les deux écrans peuvent donc afficher un passif différent pour un même patrimoine. |

### 7.7 Couverture de tests

Couverts par tests unitaires : `qualifierBien` (participation aux acquêts, art. 1404/1526, art. 1405 al. 2, date du PACS, exclusions art. 515-5-2), `getPartSuccessorale` (8 cas dont les 2 chemins d'erreur), `getFractionAjustee` (6 cas obligatoires), récompenses / créances (5 cas + solde + `regimeHasMasseCommune`), participation aux acquêts (5 cas), `getClausesIncompatibles` (7 cas).

**Non couverts** : `getPartConjointSuccession`\*, `getFractionPassifAjustee`, `buildAvantageMatrimonialCtx`, `usePatrimoineCalculations`, `calculatePlusValue`, `getPourcentagesRepartition`\*, mapping détenteur, `computeEvolutionPatrimoine`, barème 669, régimes fiscaux PV/PVI, `determinerRegimeLegal`, `societeTransfer`, la branche financement mixte (art. 1436) de `qualifierBien`, la branche société d'acquêts et la branche communauté de meubles et acquêts.

\* `getPartConjointSuccession` et `getPourcentagesRepartition` sont **partiellement couverts** depuis le 2026-07-28 : uniquement le cas de saisie partielle, via le test ajouté dans `succession.test.ts`. Aucun test dédié ne couvre leurs autres chemins.

Aucune infrastructure de test de composants React n'existe dans le projet (constat explicite dans `regimeChangeClauses.ts:9-12`), d'où l'extraction des logiques UI en fonctions pures testables.

### 7.8 Corrections appliquées après l'audit initial

**Corrections appliquées après l'audit initial : concubinage (`qualification.ts`) et quote-part d'indivision utilisateur/conjoint (`utils.ts`, `AssetForm.tsx`, `useAssetForm.ts`, `succession.ts`), le 2026-07-28.** Les limites correspondantes ont été retirées du tableau §7.6 et de la liste des non-couverts §7.7. Le bug de la branche société d'acquêts signalé en §7.4 reste ouvert.

**Branchement des emprunts dans le passif transmis, le 2026-07-28.** Seule la table `passifs` alimentait le calcul de transmission : un crédit en cours n'était déduit ni de la masse successorale civile, ni de l'assiette DMTG, ni de la base du droit de partage. `buildPassifLines` (`transmissionHelpers.ts`) fusionne désormais `passifs.montant_du` et `emprunts.capital_restant_du` en amont des quatre écrans concernés (Synthèse, Processus de calcul, 2nd décès, Assurance-vie), en excluant les emprunts de société. Deux points explicitement **non** traités à cette étape : la pondération des passifs communs reste à 100% (décision antérieure, verrouillée par un test de non-régression), et l'assurance emprunteur restait hors calcul (cf. correctif ci-dessous).

**Déduction de l'assurance emprunteur dans le passif transmis, le 2026-07-28.** Au décès de l'Utilisateur, la part du capital restant dû couverte par l'assurance décès n'est plus comptée comme passif transmis (l'assureur rembourse directement le créancier). `buildPassifLines` (`transmissionHelpers.ts`) applique désormais, par emprunt, deux mécanismes non cumulables — `capital_garanti_deces` (montant fixe) prime sur `quotite_assuree_utilisateur`/`quotite_assuree_conjoint` (pourcentage du capital restant dû) — via un nouveau paramètre `defunt: 'user' | 'spouse'` optionnel, sur le modèle du littéral déjà utilisé par `computeAVReintegrationCivile` dans `Succession2ndDeces.tsx`. La quotité est clampée à `[0, 100]` et le montant net jamais négatif. Sans `defunt` (appelants historiques), comportement inchangé : capital brut, aucune régression.

`Synthese.tsx`, `ProcessusCalcul.tsx` et `AssuranceVie.tsx` appellent systématiquement `defunt: 'user'` (seul sens de décès possible dans ces écrans, cf. `buildFamilyGraph`) — le `select()` Supabase d'`AssuranceVie.tsx` a été élargi aux 3 colonnes d'assurance, qui n'y étaient pas chargées. `Succession2ndDeces.tsx` construit désormais **deux** variantes du passif fusionné : `passifLinesUtilisateur` (`defunt: 'user'`), qui alimente les deux `buildPatrimonySnapshot` — ces derniers modélisent toujours le patrimoine de l'Utilisateur, quel que soit l'ordre de décès simulé, jamais celui du conjoint — et `passifLinesBrut` (sans `defunt`), inchangé, pour `buildSurvivingSpousePatrimony`/`buildSpouseOwnBasePatrimony`. Limite explicitement laissée hors périmètre : l'assurance emprunteur du conjoint n'est pas déduite dans ces deux dernières fonctions (cf. §7.6) — seul le passif de l'Utilisateur est aujourd'hui netté. Couvert par 12 tests dans `empruntsPassif.branchement.test.ts`.

---

## Annexe — commandes de vérification utilisées

```sql
-- Colonnes (base lue le 2026-07-28)
select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema='public' and table_name in (...);

-- Clés étrangères, y compris cross-schema vers auth.users
select c.relname, con.conname, pg_get_constraintdef(con.oid)
from pg_constraint con join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and con.contype='f';

-- Migrations appliquées
select version, name from supabase_migrations.schema_migrations order by version desc;
```





