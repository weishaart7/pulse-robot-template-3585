Créer `/mnt/documents/fiscalite-extraction.md` sur le modèle des 6 extractions précédentes (Famille, Patrimoine, Immobilier, Sociétés, Budget, Retraite), avec **toutes les règles et modes de calcul** trouvés dans le code.

## Plan du document

### 1. Architecture & Navigation
- Route `/dashboard/fiscalite` → `FiscaliteSection.tsx` (38 lignes) : layout grid 3-cols
- Vue racine composée de 3 cartes : `FiscalDeclarationsCard`, `FiscalOverviewCard`, `TaxRateCard`
- Sous-module IFI complet : `IFIInterface.tsx` (128 l) + `IFISidebar.tsx` + 7 sections
- 3 stubs à signaler : `MontantRedevableSection` (18 l), `ReductionsPlafonnementSection` (18 l), et zones "à développer" des cartes racine

### 2. Cartes de synthèse racine
- `FiscalDeclarationsCard` : liste statique/mock des déclarations (2042, 2044, 2031, IFI)
- `FiscalOverviewCard` : indicateurs globaux
- `TaxRateCard` : TMI / taux moyen (source des données à documenter — dur / calculé / Supabase ?)

### 3. Module IFI — Cœur du chapitre
- **Schéma Supabase** (5 tables) : `ifi_immeubles_batis` (21 col), `ifi_immeubles_non_batis` (23 col + `abattement_bois_forets`), `ifi_biens_detenus_indirectement` (18 col), `ifi_biens_professionnels_exoneres` (26 col), `ifi_hors_france` (10 col, non branché — Phase D en attente), `ifi_passifs_deductions` (12 col + CHECK sur `type_passif` en 7 valeurs), `ifi_hypotheses` (9 col, générique clé/valeur)
- **Sidebar / Sections** : Ajouter Bien, Ajouter Passif, Liste des biens, Barème, Hypothèses, Réductions/Plafonnement (stub), Montant redevable (stub)
- **Hook** `useIFI.ts` (548 l) : orchestration CRUD + agrégations, `useIFIData` combiné
- **Service** `ifiService.ts` (334 l)

### 4. Règles & modes de calcul IFI (`src/lib/ifi/`)
- **`computeIFI()`** (orchestrateur, `index.ts` + `calcul.ts`) : assiette taxable → barème → décote art. 977 → plafonnement art. 979
- **Assiette taxable** par catégorie :
  - Immeubles bâtis : `valeur × (fraction_taxable/100)` ; **abattement 30% RP automatique** si `categorie==='residence-principale'` (non togglable, décision d'archi)
  - Immeubles non bâtis : abattement **75% bois/forêts et GF** appliqué seulement si `abattement_bois_forets` coché (par bien, pas par catégorie)
  - Biens détenus indirectement : `valeur × quote-part × fraction_immobilière`
  - Biens professionnels exonérés : exclus si case cochée (binaire, pas de vérification des seuils légaux)
  - Hors France : non branché (Phase D)
- **Passifs déductibles** : 7 types validés par CHECK (`emprunt-rp`, etc.) → `IFI_PASSIF_CATEGORIES` / `getPassifCategorieLabel()` (`src/lib/ifi/constants.ts`)
- **Barème IFI 2024** (`BaremeIFISection.tsx` consommant `calcul.ts`) : tranches 0/800k/1.3M/2.57M/5M/10M à 0/0.5/0.7/1/1.25/1.5%
- **Seuil d'assujettissement** : patrimoine net > 1 300 000 € (barème commence à 800k une fois assujetti)
- **Décote art. 977 CGI** : entre 1.3M et 1.4M → `17 500 − 1.25% × patrimoine`
- **Plafonnement art. 979 CGI** : IFI + IR + PS ≤ 75% des revenus N-1 ; stocké en 2 lignes `ifi_hypotheses` (`plafonnement_revenus_n1`, `plafonnement_ir_ps_n`) — pas de colonnes dédiées

### 5. IS/IR sur sociétés (`SocieteFinancesImpactFiscal.tsx`)
- **IS simplifié 2024** : 15% jusqu'à 42 500 € puis 25% (résultat_net ≤ 0 → 0)
- **IFI société** : `valeur_ifi ?? valeur_estimee × pourcentage_ifi/100`
- **Exonération biens pro** : `holding==='animatrice'` OU `type_activite ∈ {commerciale, artisanale, industrielle, liberale}`
- **IR** : simple mention, pas de calcul

### 6. Interactions cross-modules
- **Patrimoine → Fiscalité (IFI)** : les biens immobiliers du patrimoine ne sont **pas** automatiquement injectés dans les tables `ifi_*` (silo actuel — à signaler)
- **Sociétés → IFI** : `pourcentage_ifi` / `valeur_ifi` sur `societes` alimentent l'impact fiscal société mais ne sont pas branchés dans `computeIFI()` global
- **Budget → Fiscalité** : les revenus/charges pourraient alimenter le plafonnement (revenus N-1) — actuellement saisie manuelle dans `ifi_hypotheses`
- **DMTG / Transmission** : moteur séparé (`src/lib/dmtg/`), sans passerelle Fiscalité
- **Retraite** : aucun lien

### 7. Corrections récentes (post-Phase B/C IFI) à documenter
- Bug doublon passif corrigé (garde `isSubmitting` dans `AjouterPassifForm`)
- Libellés catégories passifs (mapping partagé `IFI_PASSIF_CATEGORIES`)
- Migration CHECK sur `type_passif` (7 valeurs)
- 14 fichiers de code mort supprimés en Phase C (à lister)

### 8. Points d'attention / dette technique
- 3 stubs sur 7 sections IFI (Montant redevable, Réductions/Plafonnement, cartes racine mock)
- Case à cocher "abattement RP" dans `HypothesesSection` trompeuse (à retirer — abattement automatique)
- Pas d'agrégation Patrimoine → IFI (silo)
- Phase D "Hors France" non branchée (table existe, service manquant)
- Pas de crédit d'impôt étranger prévu (décision assumée)
- Nomenclature `fraction_taxable` en % 0-100 (piège possible `× 100` vs `× (%/100)`)

### 9. Inventaire technique
- Composants : 4 racine + 8 IFI (dont 2 stubs)
- Hook : `useIFI.ts` (548 l)
- Service : `ifiService.ts` (334 l)
- Lib calculs : `src/lib/ifi/` (4 fichiers, ~196 l)
- Tables Supabase : 7 tables `ifi_*` + interaction avec `societes`
- 3 stubs, 1 module Phase D en attente

## Livrable
Fichier unique `/mnt/documents/fiscalite-extraction.md`, ~même longueur que les 6 précédents. Aucune modification de code.