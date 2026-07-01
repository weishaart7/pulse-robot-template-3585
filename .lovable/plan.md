# Extraction — Section Sociétés

Produire un document Markdown `/mnt/documents/societes-extraction.md`, sur le même modèle que `famille-extraction.md`, `patrimoine-extraction.md` et `immobilier-extraction.md`, couvrant l'intégralité du module Sociétés.

## Périmètre couvert

Tous les fichiers du module (~5 400 lignes) :

- **Pages** : `SocietesSection.tsx` (421 l), `SocieteFormPage.tsx` (243 l)
- **Composants racine** : `SocieteForm.tsx` (647 l), `SocieteFormDialog.tsx` (253 l), `SocietesSynthese.tsx`, `SocietesMesSocietes.tsx`, `SocietesStrategies.tsx`
- **Sous-modules** :
  - `finances/` — Synthèse, Comptables, Dividendes, Emprunts, Impact fiscal, Valorisation
  - `bilans/`, `actifs/`, `gouvernance/`, `strategies/`, `transmission/`
- **Hooks** : `useSocietes`, `useSocieteExtended`, `useSocieteDividendes`, `useSocieteValorisations`, `useSocietesIntegration`
- **Services** : `societeService`, `societeExtendedService`, `societeDividendeService`, `societeValorisationService`
- **Lib** : `src/lib/patrimoine/societeTransfer.ts`

## Structure du document

1. **Architecture & Navigation** — route `/dashboard/societes`, arborescence 5 onglets cibles (Synthèse, Mes sociétés + sous-onglets, Associés & gouvernance, Stratégies fiscales, Transmission) — cf. mémoire `societes-five-tabs-architecture`
2. **Onglet Synthèse** — KPIs agrégés (nb sociétés, valorisation, dividendes, dettes)
3. **Onglet Mes sociétés** avec ses sous-onglets Synthèse / Informations / Finances / Bilans / Actifs détenus (cf. mémoire `societes-form-full-page-display`)
   - **Fiche société** — champs des 33 colonnes de `societes`, formes juridiques, régime fiscal (IS/IR)
   - **Finances** — comptes courants, dividendes, emprunts, valorisations, impact fiscal
   - **Bilans** — table `societe_bilans` (13 col.)
   - **Actifs détenus** — pont vers `assets` immobiliers
4. **Onglet Associés & gouvernance** — table `societe_associes` (12 col.), calcul quotes-parts
5. **Onglet Stratégies fiscales** — pactes Dutreil, OBO
6. **Onglet Transmission des parts** — table `societe_pactes` (13 col.), `societe_dutreil` (12 col.)
7. **Modèle de données Supabase** — 8 tables (`societes` 33, `societe_associes` 12, `societe_bilans` 13, `societe_comptes_courants` 11, `societe_dividendes` 10, `societe_dutreil` 12, `societe_pactes` 13, `societe_valorisations` 9), RLS & grants (à noter : plusieurs tables n'ont **qu'1 policy** vs 4 sur les autres — à investiguer)
8. **Interactions cross-module** :
   - **Patrimoine → Sociétés** : `societeTransfer.ts` (auto-création depuis SCI/SCPI/SARL etc.)
   - **Immobilier → Sociétés** : parts de SCI liées à des biens
   - **Sociétés → IFI** : biens détenus indirectement (`ifi_biens_detenus_indirectement`)
   - **Sociétés → Budget** : dividendes remontés en revenus (via `useSocietesIntegration`)
   - **Sociétés → Transmission** : pacte Dutreil impact DMTG
9. **Points d'attention** — code mort potentiel (`SocietesStrategies.tsx` racine vs `strategies/`), duplication `SocieteForm` vs `SocieteFormPage` vs `SocieteFormDialog`, RLS incomplètes (`societe_associes`, `_bilans`, `_comptes_courants`, `_dutreil`, `_pactes` n'ont qu'1 policy chacune), typage TS des tables étendues
10. **Inventaire technique** — constantes (formes juridiques, régimes fiscaux), hooks, services, dépendances UI

## Méthode

- Lecture ciblée : pages, formulaires principaux, sous-onglets financiers, `useSocietesIntegration` (pont budget/IFI/transmission), `societeTransfer.ts`
- Interrogation Supabase pour les définitions exactes de colonnes et RLS des 8 tables `societe*`
- Aucune modification de code — livrable = document uniquement

## Livrable

Un unique fichier `/mnt/documents/societes-extraction.md` (~450–550 lignes), format identique aux 3 extractions précédentes.
