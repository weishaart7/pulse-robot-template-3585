
## Objectif

Produire un document Markdown `docs/patrimoine-extraction.md` (livré dans `/mnt/documents/`) recensant **la totalité** de la section Patrimoine — sur le même modèle que l'extraction Famille : sous-onglets, formulaires, champs, règles conditionnelles, schéma Supabase, et interactions internes/externes.

Aucun code applicatif modifié — un unique fichier de documentation créé.

## Contenu du document

### 1. Vue d'ensemble
- Route `/patrimoine` → `src/pages/patrimoine/PatrimoineSection.tsx`
- Sidebar dédiée (`PatrimoineSidebar.tsx`) + contenu principal (`PatrimoineMainContent.tsx`)
- Onglets/vues : **Résumé** · **Actifs** · **Passifs** · **Par tête** · **Plus-values** · **Arbre patrimoine** · **Détention** (via `PatrimoineOwnershipChart`)
- Bannière `IncompleteAssetsBanner` (actifs mal renseignés)

### 2. Résumé patrimoine (`PatrimoineResume.tsx` + `PatrimoineChart.tsx`)
- Agrégats bruts / nets, répartition par catégorie
- Graphiques (donut par catégorie, empilé net/dettes)
- Sources : `useAssets` + `usePassifs` + `usePatrimoineCalculations`

### 3. Actifs (`PatrimoineActifs.tsx` + `AssetForm.tsx`)
- Liste + création/édition via `AssetForm` (636 lignes)
- Schéma Zod : `src/schemas/assetSchema.ts` — champs identité, valorisation, acquisition, détention, régime fiscal, revenus/charges rattachés
- Typologie complète : `src/constants/assetTypes.ts` (11 catégories, sous-types, actifs liquides, PER/PEA, nue-propriété, etc.)
- Qualification automatique : `src/lib/patrimoine/qualification.ts`
- Section indivisaires : `IndivisairesSection.tsx` + `assetIndivisaireService.ts`
- Charges rattachées : `ChargeForm.tsx` (asset_charges)
- Règles conditionnelles clés :
  - Actifs liquides → masque acquisition et désactive plus-values
  - Nue-propriété → force origine « Acquisition à titre gratuit »
  - Immobilier → transfert budget par défaut coché
  - Détenteur (utilisateur / conjoint / enfants / société / indivision)

### 4. Passifs (`PatrimoinePassifs.tsx` + `PassifForm.tsx` + `EmpruntForm.tsx`)
- Deux entités : `passifs` (dettes génériques) et `emprunts` (crédits amortissables)
- Champs emprunt : capital initial, capital restant dû, taux, durée, mensualité, date de début, banque, bien financé (FK actif)
- Trigger `validate_financial_data` en base

### 5. Par tête (`PatrimoineParTeteDetail.tsx`)
- Répartition patrimoine nette par personne (utilisateur / conjoint / enfants / indivision)
- Utilise `family_profiles`, `marital_status`, `family_links`, `asset_indivisaires`

### 6. Plus-values (`PatrimoinePlusValues.tsx` + `PlusValuesCard.tsx`)
- Calcul PV latente = valeur estimée − valeur acquisition − frais
- Simulation cession (abattements pour durée de détention immobilier / valeurs mobilières)

### 7. Arbre patrimoine (`PatrimoineTreeView.tsx`)
- Vue hiérarchique personne → catégorie → actif → passif rattaché

### 8. Chart détention (`PatrimoineOwnershipChart.tsx`)
- Répartition PP / US / NP par personne

### 9. Schéma Supabase
Tables listées avec colonnes et RLS :
- `assets` (47 colonnes)
- `asset_charges` (15)
- `asset_indivisaires` (9)
- `asset_revenus` (11)
- `passifs` (9)
- `emprunts` (15)
- `charges` (13) — charges hors actifs
- `revenus` (14) — revenus hors actifs
- Fonctions de validation : `validate_asset_data`, `validate_financial_data`, `validate_financial_amount`, `log_security_event`

### 10. Interactions
- **Internes** :
  - Hooks : `useAssets`, `usePassifs`, `useAssetForm`, `usePatrimoineCalculations`
  - Services : `assetService`, `passifService`, `assetIndivisaireService`
  - Lib : `src/lib/patrimoine/{qualification, societeTransfer, utils}.ts`
  - Consommateurs : Famille (`family_links` pour détention), Immobilier (actifs de type Immobilier), Sociétés (`societeTransfer.ts` — passage actif → société), Budget (revenus/charges liés aux actifs), Fiscalité IFI (`ifi_immeubles_batis/non_batis/…` alimentés depuis assets), Transmission (masse patrimoniale), Retraite (PER = actif liquide)
- **Externes** :
  - Supabase (Auth + PostgREST)
  - Composants partagés (`NationalitySelect`, `SelectMenu`, calendar date-fns)
  - Aucun appel API tiers depuis Patrimoine

### 11. Points d'attention
Observations relevées à qualifier avec le PO (code dupliqué, colonnes non typées, incohérences éventuelles constatées lors de la lecture).

## Livrable

Un unique fichier créé : `/mnt/documents/patrimoine-extraction.md` (~600–900 lignes), accompagné d'une balise `<presentation-artifact>` pour téléchargement.

## Hors périmètre

- Pas d'export des données réelles
- Pas de refonte ni de correctifs de code (constats consignés en fin de document uniquement)
