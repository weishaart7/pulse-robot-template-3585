# Extraction — Section Budget

Produire `/mnt/documents/budget-extraction.md`, sur le même modèle que les 4 extractions précédentes (Famille, Patrimoine, Immobilier, Sociétés). **Toutes les règles métier et formules trouvées dans le code seront documentées explicitement** (comme pour les autres modules) : périodicité, agrégation, reste à vivre, saisonnalité, remontée depuis Immobilier/Actifs.

## Périmètre couvert (~2 745 lignes)

- **Page** : `src/pages/budget/BudgetSection.tsx` (94 l)
- **Composants** : `BudgetResume.tsx` (552 l), `BudgetList.tsx` (285 l), `BudgetRevenus.tsx` (88 l), `BudgetCharges.tsx` (88 l), `RevenusForm.tsx` (435 l), `ChargesForm.tsx` (431 l)
- **Hook** : `useBudget.ts` (197 l)
- **Service** : `budgetService.ts` (315 l)
- **Constantes** : `budgetCategories.ts` (183 l), `budgetTypes.ts` (77 l)
- **UI partagé** : `src/components/ui/budget-statistics-card.tsx`

## Structure du document

1. **Architecture & Navigation** — route `/dashboard/budget`, onglets (Résumé / Revenus / Charges), affichage par défaut mensuel (mémoire `budget-default-display-mode`)
2. **Onglet Résumé** — KPIs, formules :
   - Total revenus/charges annualisés
   - Reste à vivre = revenus − charges (mensuel / annuel)
   - Répartition par catégorie
   - **Graphique de saisonnalité** : distribution mensuelle selon périodicité (mémoire `budget-seasonality-chart`), couleurs et logique
3. **Onglet Revenus / Charges** — liste, tri, badges "Immobilier" / "Sociétés", read-only si `source !== 'manual'` (mémoire `immobilier-budget-integration-with-ownership`)
4. **Formulaires** — schémas Zod, catégories (~20 revenus / ~30 charges), périodicités, détenteur (user/spouse/common), dates début/fin
5. **Principe de stockage périodicité native** (mémoire `budget-periodicite-storage-principle`) — pas de pré-conversion annuelle en DB, conversion à l'affichage. Table des multiplicateurs :
   - Mensuelle × 12, Trimestrielle × 4, Semestrielle × 2, Annuelle × 1, Ponctuelle → traité selon dates
6. **Modèle de données Supabase** — tables `revenus` (14 col.), `charges` (13 col.), FK, RLS. Ponts `asset_revenus` / `asset_charges` filtrés par `impact_budget = true`
7. **Interactions cross-module** :
   - **Immobilier → Budget** : lecture asset_revenus / asset_charges avec `impact_budget`, source `'immobilier'`, boutons "Modifier depuis Immobilier"
   - **Patrimoine → Budget** : charges/revenus d'actifs (assetService)
   - **Sociétés → Budget** : `useSocietesBudget` NON branché
   - **Famille → Budget** : détenteur, affichage par personne (à vérifier — mémoire dit qu'il n'y a pas de filtrage par personne)
8. **Points d'attention** — cohérence casse périodicité (bug identifié en Immobilier), sources multiples, code mort éventuel, validation Zod
9. **Inventaire technique** — constantes complètes, hooks, services, dépendances UI

## Méthode

- Lecture ciblée des 11 fichiers ci-dessus
- Interrogation Supabase pour colonnes exactes + RLS `revenus` / `charges`
- Documentation littérale des formules trouvées (avec numéro de ligne quand pertinent)

## Livrable

Un unique fichier `/mnt/documents/budget-extraction.md`, ~400–500 lignes, format identique aux 4 extractions précédentes.
