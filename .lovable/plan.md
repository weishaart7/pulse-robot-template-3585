
# Extraction technique — module Transmission

Créer un document `/mnt/documents/transmission-extraction.md` sur le même modèle que les 7 extractions précédentes (Patrimoine, Immobilier, Famille, Sociétés, Budget, Retraite, Fiscalité). Aucune modification de code — extraction documentaire uniquement.

## Contenu du document

### 1. Architecture & navigation
- Route `/dashboard/transmission` → `TransmissionSection.tsx` (77 lignes, 5 onglets via `AnimatedBackground`) : **Synthèse**, **Optimisation**, **Libéralités**, **Assurance-vie**, **Processus de calcul**.
- Composant historique `TransmissionDashboard.tsx` (403 lignes) présent mais **non monté** dans le routeur — à qualifier (code mort ou vue alternative).
- Sous-arbo `components/transmission/av/` : `AVContractDetail` (777 l.), `ClauseBeneficiaireBuilder` (433 l.), `AVOperationsTable` (169 l.), `AVFiscalInfo` (107 l.).
- Formulaires : `DonationForm.tsx` (501 l.), `LegsForm.tsx` (338 l.).
- Volumes : ~7 100 lignes au total pour le module.

### 2. Moteur de calcul (`src/lib/transmission/`)
Pattern **fonctions pures + orchestrateur** (comme DMTG et IFI) :
- `types.ts` (98 l.) — `FamilyGraph`, `PatrimonySnapshot`, `Liberalite`, `TransmissionParams`, `HeirShare`, `TransmissionResult`, `ConjointOption`.
- `successionLegale.ts` (646 l.) — `calculateSuccessionLegale()` : dévolution civile complète (Branche A marié / Branche B non marié, souches enfants avec représentation récursive, souches fratrie, fente successorale rangs 1-4, options conjoint `quart_pp` / `usufruit_total` / `quart_pp_3quarts_us` / `qd_pp`, DDV, enfants communs vs non communs).
- `reserve.ts` (325 l.) — `computeMasseCalcul`, `computeReserveAndQD` (1 enfant = 1/2, 2 enfants = 2/3, 3+ = 3/4 ; conjoint sans enfant = 1/4), `imputeLiberalites` (donations chronologiques → réserve puis QD ; legs → QD), `applyReductions` (ordre : legs proportionnels puis donations récent→ancien), `computeRapport` (masse partageable + rapports).
- `fiscal.ts` (217 l.) — `computeInheritanceTax`, `compute990I` (AV), `computeNotaryFees`, `DEFAULT_BAREME_2025`.
- `index.ts` (170 l.) — `computeTransmission(ctx)` : orchestration 1) dévolution civile, 2) masse/réserve/QD, 3) imputation, 4) réduction, 5) rapport, 6) fiscalité par héritier.

Règles fiscales détaillées : barèmes par lien (5/10/15/20/30/40/45% ligne directe ; 35/45% frère-sœur ; 55% neveux/nièces ; 60% autres), abattements (100 000 € enfant/parent, 15 932 € frère-sœur, 7 967 € neveu/nièce, 1 594 € tiers, conjoint exonéré), 990 I AV (seuil 152 500 €/bénéf, 20% puis 31,25% au-delà de 700 000 €, exos conjoint/enfant/parent), frais notaire 2,5% (JSON) — divergent de la valeur 7,5% documentée dans la mémoire.

### 3. Persistance Supabase
- `liberalites` (11 cols, 4 policies) — donations & legs consolidés. Service `liberaliteService.ts` (89 l.) + hook `useLiberalites.ts` (93 l.).
- `av_contract_details` (20 cols) + `av_operations` (9 cols) — détails contrats AV + versements/rachats/arbitrages.
- Consommateurs directs de tables (pas de service dédié Transmission au-delà de liberalites) : `family_profiles`, `marital_status`, `family_links`, `assets` (dont `nature='assurance-vie'`), `charges`. Synthèse fait ses `supabase.from(...)` en direct.

### 4. Interactions inter-modules
- **Famille → Transmission** : source unique du `FamilyGraph` (family_profiles + family_links + marital_status.option_conjoint + DDV).
- **Patrimoine → Transmission** : `PatrimonySnapshot.biensExistants` alimenté depuis `assets` ; passifs depuis `charges` (⚠ à vérifier : `passifs` semble être la bonne table, potentielle confusion).
- **Assurance-vie ↔ Transmission** : détection par `nature ∈ AV_NATURES`, opérations et clauses bénéficiaires structurées.
- **DMTG → Transmission** : `index.ts` importe `computeInheritanceForBeneficiary` depuis `../dmtg/simpleFiscal` + `DMTG_PARAMS` → **double moteur fiscal** (fiscal.ts local + simpleFiscal DMTG), à qualifier.
- **Fiscalité/IFI** : aucun lien.

### 5. Points d'attention (audit)
1. **Deux moteurs fiscaux concurrents** : `fiscal.ts` (barème local, `computeInheritanceTax` — non appelé dans `index.ts`) vs `simpleFiscal` DMTG (utilisé). Choisir une source unique.
2. **Divergence taux frais notaire** : mémoire indique 7,5%, JSON 2,5%.
3. **`consumedBracketsAmount = 0`** codé en dur dans `index.ts` L108 avec TODO — rappel fiscal 15 ans donations **non implémenté** côté Transmission (alors qu'il l'est dans DMTG).
4. **`capitauxAV = 0`** codé en dur dans `index.ts` L120 avec TODO — les capitaux AV **ne remontent pas** dans le calcul 990 I fait par `computeTransmission()` (le calcul AV se fait ailleurs, dans `AssuranceVie.tsx`, non consolidé dans la Synthèse).
5. **`TransmissionDashboard.tsx`** (403 l.) non monté — code mort probable.
6. **Onglets Optimisation / Processus de calcul** : à évaluer (stubs ou implémentés ? — 239 et 422 lignes suggèrent implémentés mais périmètre à documenter).
7. **`Synthese.tsx` (834 lignes)** : fait 5+ requêtes Supabase inline, agrège Family + Patrimoine + AV + Libéralités + DMTG — candidat à extraction en hook `useTransmissionSynthese`.
8. **`console.error` non guardé** dans `useLiberalites.ts` L20.
9. **`fraisNotaire` calculé sur `biensExistants` brut**, pas sur l'actif net — à vérifier vs pratique notariale.
10. **`transmissionNette` soustrait `assuranceVieTotal`** (hors succession) mais n'ajoute pas les capitaux transmis nets de 990 I aux bénéficiaires — définition à clarifier.
11. **`imputeLiberalites`** répartit `reserveEnfants / childrenIds.length` sans tenir compte des souches (représentation) — potentiel bug si un enfant est prédécédé.
12. **Pas de contrainte `UNIQUE (user_id)` sur `marital_status`/`family_profiles`** utilisée avec `.single()` L42/L48 → risque d'erreur si plusieurs lignes.

### 6. 10 pistes priorisées
1. Consolider un seul moteur fiscal (fiscal.ts vs simpleFiscal DMTG).
2. Brancher `consumedBracketsAmount` (rappel 15 ans) via `filterDonations15Years` déjà présent dans DMTG.
3. Brancher `capitauxAV` par bénéficiaire dans `computeTransmission` (utiliser `computeAssuranceVie` DMTG).
4. Supprimer / réactiver `TransmissionDashboard.tsx`.
5. Aligner taux frais notaire mémoire ↔ JSON.
6. Extraire hook `useTransmissionSynthese` depuis `Synthese.tsx`.
7. Guard `console.error` avec `import.meta.env.DEV`.
8. Fixer l'imputation par souche (représentation) dans `imputeLiberalites`.
9. Documenter/formaliser la définition de `transmissionNette`.
10. Ajouter service `transmissionService` (agrégateur) plutôt que requêtes Supabase inline.

## Livrable
Un seul fichier : `/mnt/documents/transmission-extraction.md`. Aucune autre modification.
