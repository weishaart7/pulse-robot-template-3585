# Module Budget

> Audit de fond produit le 2026-08-27, **de zéro** (aucun audit préexistant pour ce module, contrairement
> à Famille/Patrimoine/Retraite/Transmission qui fusionnaient des documents antérieurs). Méthode :
> lecture intégrale des 10 fichiers du périmètre déclaré, plus les fichiers liés découverts en cours de
> route (`src/hooks/useBudget.ts`, `useBudgetEntryForm.ts`, `useBudgetEntryDialogState.ts`,
> `src/pages/Dashboard.tsx`, `src/constants/assetTypes.ts`, `src/components/assets/ChargeForm.tsx`,
> `src/components/patrimoine/AssetDetailsDialog.tsx`), lecture du schéma réel en base via le MCP Supabase
> (`list_tables`/`execute_sql` sur le projet `npypkocowjkszxtecxzq`, y compris les `CHECK` constraints et
> policies RLS), et `git log --oneline` sur les fichiers du périmètre. Toutes les valeurs citées comme
> « en base » (comptages, contraintes, valeurs réellement stockées) ont été vérifiées par requête directe
> le 2026-08-27, pas déduites des seuls types TypeScript générés. Les trois points de friction signalés
> par `docs/patrimoine.md` (§3) et `docs/immobilier.md` (§3) comme *à vérifier côté Budget* ont chacun été
> retestés contre le code actuel — le détail et le verdict de chacun figurent en §3.

## 1. Vue d'ensemble

Le module Budget est **un pur agrégateur d'affichage** : il ne possède aucun moteur de calcul dans
`src/lib/`, et sur ses deux tables propres (`revenus`, `charges`), il n'ajoute par ailleurs strictement
rien à la saisie brute — pas de rapprochement bancaire, pas d'historique d'exécution, pas de moteur de
prévision. Il fusionne trois sources hétérogènes en une seule liste affichée :

1. **Ses deux tables propres** `revenus` et `charges` — saisie manuelle libre, indépendante de tout actif
   (ex. salaire, loyer payé, courses). C'est la seule vraie saisie native du module.
2. **`asset_revenus`/`asset_charges` avec `impact_budget = true`** — lignes saisies dans Patrimoine
   (`AssetDetailsDialog.tsx`, onglet Charges de `AssetForm`/`ChargeForm.tsx`) ou dans Immobilier
   (`ImmobilierGestionDialog`, `LMNPDetailView`) sur un actif donné, republiées ici en lecture seule dès
   que la case « Impact sur le budget » est cochée à la source.
3. **Rien d'autre** — la table `emprunts` (crédits/prêts, colonne `mensualite`, colonne `reporter_budget`)
   n'est **jamais lue** par ce module malgré son nom et sa description UI (cf. §3, point de friction n°2).

**Écrans** (`BudgetSection.tsx`, 3 onglets + un sélecteur Mensuel/Annuel global) :

| Onglet | Composant | Rôle |
|---|---|---|
| Résumé (par défaut) | [BudgetResume.tsx](src/components/budget/BudgetResume.tsx) | KPI (solde, taux d'endettement, capacité d'endettement), répartition par catégories (2 donuts), graphique de saisonnalité sur 12 mois |
| Revenus | [BudgetRevenus.tsx](src/components/budget/BudgetRevenus.tsx) → [RevenusForm.tsx](src/components/budget/RevenusForm.tsx), [BudgetList.tsx](src/components/budget/BudgetList.tsx) | CRUD des revenus saisis dans Budget + liste fusionnée avec les revenus d'actifs |
| Charges | [BudgetCharges.tsx](src/components/budget/BudgetCharges.tsx) → [ChargesForm.tsx](src/components/budget/ChargesForm.tsx), `BudgetList.tsx` | Idem côté charges |

Un widget indépendant, [budget-statistics-card.tsx](src/components/ui/budget-statistics-card.tsx), est
affiché sur le Dashboard global (`src/pages/Dashboard.tsx`) — **quatrième** implémentation de la même
conversion de périodicité (voir §2/§3), avec son propre calcul dupliqué de `toAnnual`.

**Tables Supabase** : `revenus`, `charges` (propres au module) ; `asset_revenus`, `asset_charges`
(consommées en lecture, `impact_budget = true` uniquement) ; `emprunts` (jamais consommée, cf. §3).

**Flux clés** :
- `useRevenus()`/`useCharges()` ([useBudget.ts](src/hooks/useBudget.ts)) font chacun deux appels
  Supabase en parallèle (`Promise.all`) — la table propre + la fonction miroir côté actifs — et
  concatènent les deux tableaux en un seul état local, sans déduplication ni tri commun (l'ordre est
  « classiques d'abord, actifs ensuite », `useBudget.ts:14-20,111-117`).
- Chaque ligne porte un champ `source: 'budget' | 'immobilier'` qui conditionne l'affichage dans
  `BudgetList.tsx` : les lignes `'immobilier'` affichent un badge et perdent le menu d'édition/suppression
  (« Modifier depuis Immobilier », `BudgetList.tsx:141-144,233-236`) — cohérent, la donnée source vit
  ailleurs.
- Le formulaire (`useBudgetEntryForm.ts`, factorisé pour `RevenusForm`/`ChargesForm`) ne s'applique qu'aux
  lignes de `revenus`/`charges` ; il n'existe aucun formulaire Budget pour créer une ligne
  `asset_revenus`/`asset_charges` — cette saisie se fait uniquement depuis Patrimoine/Immobilier.
- Chaque montant est stocké **dans sa périodicité native** (`revenus`/`charges` : `mensuel` par défaut,
  mais aussi `trimestriel`/`semestriel`/`annuel`/`ponctuel` ; `asset_revenus`/`asset_charges` : accord
  féminin, contraint en base pour les charges à `'annuelle'`/`'trimestrielle'`/`'mensuelle'` uniquement —
  voir §2 sur la conversion) et reconverti à l'affichage selon le sélecteur Mensuel/Annuel de
  `BudgetSection.tsx`.

## 2. Architecture & décisions

- **Pas de `src/lib/budget/` — confirmé, et à la différence d'Immobilier ce n'est pas un écart au
  pattern `lib/ifi/` mais un choix cohérent avec le rôle du module : il n'y a aucune règle métier
  réglementaire à isoler, seulement une conversion de périodicité et des totaux additifs.** Cette
  conversion (`toAnnual`) est en revanche **dupliquée quatre fois, avec des définitions légèrement
  différentes**, faute d'un point d'entrée partagé :
  1. [BudgetList.tsx:43-63](src/components/budget/BudgetList.tsx:43-63)
  2. [BudgetResume.tsx:15-33](src/components/budget/BudgetResume.tsx:15-33)
  3. `SeasonalityChart` dans `BudgetResume.tsx` — une **cinquième** variante, `toMonthlyAmount`
     ([BudgetResume.tsx:386-403](src/components/budget/BudgetResume.tsx:386-403)), qui convertit vers le
     mensuel plutôt que vers l'annuel et traite `ponctuel` différemment (montant affiché tel quel sur le
     seul mois de `date_debut` plutôt que lissé sur l'année, cf. plus bas)
  4. [Dashboard.tsx:26-46](src/pages/Dashboard.tsx:26-46) — copie quasi identique de la variante
     `BudgetList`, avec le commentaire explicite `// logique reprise de BudgetList.tsx` qui documente lui-
     même la duplication.
  Les quatre/cinq variantes gèrent toutes correctement les deux graphies (masculine `mensuel` et féminine
  `mensuelle`, etc.) pour `mensuel(le)`/`trimestriel(le)`/`semestriel(le)`/`annuel(le)`, mais **divergent
  sur le cas par défaut** (valeur de périodicité non reconnue) — voir §3.

- **Normalisation de la périodicité corrigée le 2026-07-14 (commit `8274980`), antérieure à cet audit.**
  `asset_charges`/`asset_revenus` stockent la périodicité à l'accord féminin
  (`'mensuelle'`/`'trimestrielle'`/`'annuelle'`), tandis que `revenus`/`charges` utilisent l'accord
  masculin (`'mensuel'`/`'trimestriel'`/`'semestriel'`/`'annuel'`/`'ponctuel'`).
  `normalizeAssetPeriodicite()` ([budgetService.ts:53-65](src/services/budgetService.ts:53-65)) ramène les
  trois valeurs féminines reconnues à la graphie masculine **dès la lecture**, pour que le reste du code
  n'ait qu'une seule convention à gérer. C'est la correction directe du point de friction n°3 remonté par
  `docs/immobilier.md` (bug de périodicité `ImmobilierOverview.tsx`) — **verdict détaillé en §3**.

- **`AssetChargeWithAsset`, type explicite pour la jointure `asset_charges → assets`**
  ([budgetService.ts:68-73](src/services/budgetService.ts:68-73)), introduit par le même commit `8274980`
  pour remplacer un `as any` — la seule méthode du service qui type sa jointure Supabase explicitement.

- **Convention de bénéficiaire/débiteur incohérente entre le module et sa source.** Pour les lignes
  d'origine `'immobilier'`, `getAssetRevenusForBudget`/`getAssetChargesForBudget` déduisent le
  bénéficiaire/débiteur à afficher à partir de `assets.detenteur` en comparant sa valeur aux libellés
  français `'Commun'`/`'Le couple'`
  ([budgetService.ts:121-125,256-260](src/services/budgetService.ts:121-125)) — alors que
  `docs/patrimoine.md` documente et que la base confirme que `assets.detenteur` est stocké en base sous
  les codes bruts `'user'`/`'spouse'`/`'common'` (vérifié : `select distinct detenteur from assets` ne
  retourne que ces trois valeurs, jamais `'Commun'` ni `'Le couple'`). Voir §3 pour la conséquence.

- **Catégorisation par « nature » à vocabulaire disjoint entre Budget et Patrimoine/Immobilier.**
  `REVENUS_CATEGORIES`/`CHARGES_CATEGORIES` ([budgetCategories.ts](src/constants/budgetCategories.ts))
  définissent l'unique vocabulaire de `nature` utilisé par les formulaires Budget natifs
  (`RevenusForm`/`ChargesForm`, via `useBudgetEntryForm.ts`). Les lignes importées depuis Patrimoine ont
  un vocabulaire de `nature`/`type_charge` totalement différent et non recoupant (voir §3) — le mécanisme
  de fallback « non catégorisé » de `BudgetResume.tsx` (§3) existe précisément pour absorber ce
  désalignement structurel, pas un cas limite occasionnel.

- **Deux hooks partagés extraits par le commit `8274980`** pour factoriser `RevenusForm`/`ChargesForm` :
  [useBudgetEntryDialogState.ts](src/hooks/useBudgetEntryDialogState.ts) (état d'ouverture du dialogue,
  bascule création/édition) et [useBudgetEntryForm.ts](src/hooks/useBudgetEntryForm.ts) (React Hook Form +
  Zod, sanitation via `sanitizeTextInput`/`sanitizeNumericInput`, intégration `useSecureForm` avec
  rate-limiting applicatif — 10 tentatives / 60 s). Seuls les champs réellement distincts (nom du champ
  `beneficiaire` vs `debiteur`, catégories, `revenu_disponible`) restent dans chaque formulaire.

- **`revenu_disponible` : champ persisté mais jamais piloté par l'utilisateur.**
  `RevenusForm.tsx:46` fixe `revenu_disponible: false` en dur dans `buildSubmitPayload`, sans champ de
  formulaire correspondant ; seule `getAssetRevenusForBudget` positionne `true`
  ([budgetService.ts:134](src/services/budgetService.ts:134)) pour les revenus d'origine immobilière.
  Aucun composant du périmètre Budget ne lit ce champ pour filtrer ou distinguer l'affichage — cases
  dormantes, cf. §4.

- **`src/constants/budgetTypes.ts` : fichier mort depuis sa création.** `git log --diff-filter=A` montre
  qu'il a été ajouté par le commit `fdb0059` (« Run SQL schema ») et n'a plus été modifié depuis ; `grep`
  sur tout `src/` ne trouve aucun import de ce fichier — `budgetCategories.ts` (structure de données
  proche mais contenu différent et plus riche) est la version réellement utilisée par tous les
  composants. Les deux fichiers coexistent avec des listes de natures différentes, ce qui peut induire un
  développeur en erreur sur lequel modifier.

- **Sécurité applicative : RLS seule, sans filtre `user_id` en plus, sur `getRevenus`/`getCharges`.**
  `budgetService.getRevenus()`/`getCharges()` ([budgetService.ts:78-84,212-219](src/services/budgetService.ts:78-84))
  font un `select('*')` sans `.eq('user_id', ...)`, contrairement au durcissement « défense en profondeur »
  appliqué au périmètre Patrimoine par le commit `ea3a695` (`assetService`, etc.). **Vérifié en base** :
  les policies RLS de `revenus`/`charges` sont correctes et scopées par
  `auth.uid() = user_id` sur les 4 opérations (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) — le risque réel est
  donc faible, RLS étant le filet de sécurité actif, mais c'est la même incohérence de méthode déjà
  relevée pour Immobilier. En revanche, `updateRevenu`/`deleteRevenu`/`updateCharge`/`deleteCharge`
  vérifient explicitement la propriété (`existingRevenu.user_id !== user.id`) avant d'écrire
  ([budgetService.ts:162-186,296-320](src/services/budgetService.ts:162-186)) — cette partie est bien
  durcie, seules les deux méthodes de lecture ne le sont pas.
- **FK `ON DELETE CASCADE` conformes.** Vérifié en base : `revenus_user_id_fkey` et `charges_user_id_fkey`
  pointent vers `auth.users(id) ON DELETE CASCADE` — conforme à la règle `CLAUDE.md`.
- **Aucun `console.*` dans tout le périmètre Budget** (`grep` sur les 10 fichiers déclarés plus les hooks
  liés ne retourne aucune occurrence) — le module est déjà conforme à la règle RGPD/logs de `CLAUDE.md`
  sans qu'aucun durcissement récent n'ait été nécessaire ici.

## 3. Dette identifiée

### Vérification des 3 points de friction signalés par les audits Patrimoine/Immobilier

- **Point 1 (`docs/patrimoine.md` §3) — charges en unité `%` traitées comme des € bruts : toujours
  ouvert, confirmé.** `getAssetChargesForBudget` ne sélectionne pas la colonne `unite`
  ([budgetService.ts:228-246](src/services/budgetService.ts:228-246)) alors que celle-ci existe belle et
  bien en base (`asset_charges.unite`, `NOT NULL`, contrainte `CHECK (unite = ANY (ARRAY['€','%']))`,
  vérifiée par requête directe) et est saisissable dans `ChargeForm.tsx` (onglet Charges de
  `AssetForm`). Une charge d'actif saisie « 8 % des loyers » (unité `%`) remonte donc dans Budget comme
  « 8 €/mois », sans conversion ni avertissement. **Vérifié en base au 2026-08-27** : 0 ligne
  `asset_charges` a actuellement `impact_budget = true`, donc l'impact réel actuel sur un budget affiché
  à un client est nul — mais le bug est bien vivant dans le code et se déclenchera à la première charge
  en `%` cochée « impact budget ».
- **Point 2 (`docs/patrimoine.md`, cases dormantes) — `emprunts.reporter_budget` jamais lu par le
  Budget : toujours ouvert, confirmé, et plus large que documenté.** Aucune requête vers la table
  `emprunts` n'existe dans tout le périmètre Budget (`grep -rl "emprunt" src/components/budget
  src/services/budgetService.ts src/hooks/useBudget.ts` ne retourne aucun fichier). Le libellé UI de ce
  champ (« sera ajoutée automatiquement aux charges du budget mensuel », côté
  `PassifEmpruntForm.tsx:186`) n'a donc aucune traduction technique — mais la portée est plus large qu'un
  simple champ dormant : **aucune mensualité d'emprunt réel (`emprunts.mensualite`) n'entre jamais dans
  le Budget**, qu'elle que soit la valeur de `reporter_budget`. Voir plus bas (🔴) pour la conséquence sur
  le taux d'endettement.
- **Point 3 (`docs/immobilier.md` §3) — bug de périodicité (trimestrielle comptée pour zéro, semestrielle
  divisée par deux) : infirmé pour Budget, corrigé en amont.** Le commit `8274980` (2026-07-14, antérieur
  à cet audit) a introduit `normalizeAssetPeriodicite()` et corrigé `toAnnual` pour gérer explicitement
  `trimestriel(le)` (`×4`) et `semestriel(le)` (`×2`) dans `BudgetList.tsx` et `BudgetResume.tsx` — les
  deux composants qui produisent les totaux affichés au client. Le bug identique à celui d'Immobilier ne
  se reproduit donc **pas** dans Budget aujourd'hui pour ces deux périodicités. Un bug **différent**,
  plus étroit, subsiste sur le cas par défaut — détaillé ci-dessous.

### 🔴 Bloquant (peut fausser un calcul montré au client)

- **« Taux d'endettement » et « Capacité d'endettement » — indicateurs bancaires structurants —
  n'incluent jamais un crédit réel.** `BudgetResume.tsx:71-81` calcule `mensualitesCreditsAnnuel` en
  filtrant les `charges` (fusion `revenus`/`charges` + `asset_charges`) dont la `nature` appartient à la
  catégorie fermée `CHARGES_CATEGORIES['Emprunts & Crédits']` (6 libellés fixes, ex. « Crédit immobilier
  (résidence principale, secondaire, locatif) »). Cette catégorie n'est peuplée que si l'utilisateur
  **ressaisit manuellement** un crédit comme charge Budget — la table `emprunts`, où vivent les vrais
  crédits de Patrimoine avec leur vraie mensualité (`emprunts.mensualite`), n'est jamais consultée (cf.
  point 2 ci-dessus). Concrètement : un client avec un crédit immobilier de 2 000 €/mois correctement
  saisi dans Patrimoine → Passifs affichera un taux d'endettement de 0 % dans Budget tant qu'il n'aura pas
  dupliqué cette information à la main dans une charge Budget de la bonne catégorie — un indicateur
  présenté comme fiable pour une décision de crédit est en réalité vide par défaut pour la quasi-totalité
  des utilisateurs qui n'ont saisi leurs emprunts que dans Patrimoine.
- **Bénéficiaire/débiteur affichés comme des codes internes bruts (`user`/`spouse`/`common`) au lieu d'un
  libellé lisible, pour toute ligne importée d'un actif.** `getAssetRevenusForBudget`/
  `getAssetChargesForBudget` testent `detenteur !== 'Commun' && detenteur !== 'Le couple'`
  ([budgetService.ts:123,258](src/services/budgetService.ts:123)) pour décider d'afficher le détenteur
  brut ou de replier sur `'Le couple'` — mais `assets.detenteur` ne contient jamais ces libellés français
  en base (valeurs réelles vérifiées : `'user'`, `'spouse'`, `'common'`). La condition est donc **toujours
  vraie** : la colonne « Bénéficiaire »/« Débiteur » de `BudgetList.tsx` affiche systématiquement le code
  brut (`user`, `spouse` ou `common`) pour toute ligne d'origine `'immobilier'`, jamais un nom de personne
  ni « Le couple ». Ce n'est pas un montant erroné mais un champ montré au client qui expose un
  identifiant technique interne à la place d'une information civile — classé ici plutôt qu'en cosmétique
  car garanti de se produire à 100 % des occurrences (pas un cas limite) et visible sur un écran client.
  *(0 ligne actuellement concernée en base, cf. point 1 — latent mais certain dès la première charge/revenu
  d'actif coché « impact budget ».)*
- **Aucun filtrage par `date_debut`/`date_fin` sur les totaux principaux (Solde, Taux d'endettement,
  Capacité d'endettement, totaux de `BudgetList`).** `BudgetResume.tsx:40-47` et
  `BudgetList.tsx:87-88` calculent `totalRevenusAnnuel`/`totalChargesAnnuel` en sommant **toutes** les
  lignes de `revenus`/`charges` sans jamais tester `date_debut`/`date_fin`, alors que le champ existe,
  est saisissable dans les deux formulaires, et **est** effectivement exploité — mais seulement dans le
  composant `SeasonalityChart` du même fichier ([BudgetResume.tsx:343-383](src/components/budget/BudgetResume.tsx:343-383))
  pour exclure les mois hors période. Concrètement : une charge avec une `date_fin` dans le passé (crédit
  soldé, loyer temporaire terminé) disparaît correctement du graphique de saisonnalité mensuelle, mais
  continue à gonfler indéfiniment le Solde, le Taux d'endettement et la Capacité d'endettement affichés
  juste au-dessus, sur le même écran, tant que la ligne n'est pas supprimée manuellement — deux sections
  du même écran donnent des lectures contradictoires de la même donnée pour le même cas (fin de charge
  passée), l'une corrigeant explicitement ce que l'autre ignore.

### 🟠 À surveiller (cas limite, peu probable)

- **Cas par défaut de `toAnnual` divergent entre les quatre implémentations, pour une périodicité non
  reconnue.** `BudgetList.tsx:60-62` traite tout défaut comme mensuel (`× 12`) ; `BudgetResume.tsx:27-32`
  et `Dashboard.tsx:43-45` diffèrent aussi entre eux : `BudgetResume` range le défaut dans le même `case`
  que `'annuel'/'annuelle'/'ponctuel'` (aucune multiplication) tandis que `Dashboard.tsx` reprend le `× 12`
  de `BudgetList`. En pratique, la seule valeur susceptible de heurter ce défaut est `'ponctuelle'`
  (accord féminin de « ponctuel ») en provenance d'`asset_charges` : `normalizeAssetPeriodicite()` ne
  connaît que `'mensuelle'/'trimestrielle'/'annuelle'` (§2) et laisse passer `'ponctuelle'` telle quelle,
  qui ne matche ensuite aucun `case` explicite de `toAnnual`. **Vérifié en base** : la contrainte
  `CHECK` réelle sur `asset_charges.periodicite` n'autorise que
  `ARRAY['annuelle','trimestrielle','mensuelle']` — `'ponctuelle'` n'est **pas** une valeur acceptée par
  la base pour cette table, malgré sa présence dans la constante UI
  `PERIODICITE_OPTIONS` de [assetTypes.ts:164-169](src/constants/assetTypes.ts:164-169) (bug côté
  Patrimoine, hors périmètre de cet audit, signalé en fin de section). Ce cas précis ne peut donc pas se
  produire aujourd'hui via `asset_charges` ; il reste un point de divergence de code à corriger si la
  contrainte base évolue un jour pour accepter « Ponctuelle ».
- **Catégorisation par nature des lignes importées d'un actif : systématiquement « non catégorisée »,
  pas un cas limite occasionnel.** Le vocabulaire de `nature` utilisé par Patrimoine/Immobilier ne
  recoupe jamais celui de `REVENUS_CATEGORIES`/`CHARGES_CATEGORIES` : côté charges,
  `asset_charges.type_charge` est contraint en base à seulement deux valeurs, `'Charges courantes'` ou
  `'Charges fiscales'` ([ChargeForm.tsx:22](src/components/assets/ChargeForm.tsx:22)), qui n'apparaissent
  dans aucune des 11 catégories de `CHARGES_CATEGORIES` ; côté revenus, `asset_revenus.nature` est un
  champ texte libre saisi par l'utilisateur dans `AssetDetailsDialog.tsx`, sans lien avec les libellés
  fermés de `REVENUS_CATEGORIES`. Toute ligne d'origine `'immobilier'` tombe donc, dans la quasi-totalité
  des cas réels, dans le bucket `revenusNonCategorises`/`chargesNonCategorisees`
  ([BudgetResume.tsx:108-122,136-150](src/components/budget/BudgetResume.tsx:108-122)), lui-même
  redistribué **en bloc** dans la catégorie fixe « Revenus du patrimoine » / « Logement & Habitation » du
  donut — peu grave pour les charges (bucket thématiquement plausible pour de l'immobilier), potentiellement
  trompeur pour un revenu qui n'aurait rien d'un « revenu du patrimoine » au sens fiscal si son
  `nature` texte libre s'y prêtait mal. Classé « à surveiller » plutôt que bloquant : le montant total
  reste exact, seule la ventilation visuelle par catégorie est mécaniquement biaisée pour cette source.
- **`getRevenus()`/`getCharges()` sans filtre `user_id` applicatif**, à la différence des méthodes
  d'écriture du même service — couvert par des RLS vérifiées correctes en base, incohérence de méthode
  plutôt que faille réelle (même schéma de dette que documenté pour Immobilier).

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **Code mort : `src/constants/budgetTypes.ts`**, jamais importé depuis sa création par le commit
  `fdb0059` — doublon obsolète de `budgetCategories.ts` avec un contenu différent, source de confusion
  pour un futur développeur qui chercherait « la » liste de natures.
- **`toAnnual` dupliqué quatre fois** (`BudgetList.tsx`, `BudgetResume.tsx`, `Dashboard.tsx`) plus une
  cinquième variante `toMonthlyAmount` dans `SeasonalityChart` — aucune n'est extraite dans un module
  partagé, malgré une logique strictement identique dans l'intention. `Dashboard.tsx:25` documente lui-
  même la duplication dans son commentaire (« logique reprise de BudgetList.tsx »).
- **`revenu_disponible` : champ persisté, jamais exposé dans l'UI Budget**, toujours `false` à la
  création manuelle, `true` uniquement pour les revenus d'origine immobilière, sans qu'aucun composant du
  périmètre ne le lise pour filtrer ou distinguer l'affichage.
- **`BudgetStatisticsCard` (Dashboard) ignore le sélecteur Mensuel/Annuel de `BudgetSection`** — il
  recalcule son propre `totalRevenus`/`totalCharges` toujours ramené au mensuel
  (`/ 12`, [Dashboard.tsx:48-49](src/pages/Dashboard.tsx:48-49)), sans lien avec l'état `displayMode` de
  l'onglet Budget (les deux écrans sont indépendants, ce qui est attendu, mais aucun des deux ne
  réutilise le calcul de l'autre).
- **`SeasonalityChart` lisse tous les revenus/charges récurrents sur les 12 mois de l'année civile
  courante**, y compris ceux dont la `date_debut` est postérieure à aujourd'hui mais dans l'année en
  cours — seul un début d'année **suivante** est exclu (`BudgetResume.tsx:374-379`). Un revenu commençant
  en décembre apparaît donc lissé dès janvier de la même année dans le graphique de saisonnalité.

## 4. Périmètre V1 / différé

- **V1 — en place** : saisie manuelle de revenus/charges avec catégorie/nature/périodicité/bénéficiaire
  ou débiteur, fusion en lecture avec les revenus/charges d'actifs marqués « impact sur le budget » dans
  Patrimoine/Immobilier, bascule d'affichage Mensuel/Annuel, KPI de synthèse (solde, taux et capacité
  d'endettement — sous réserve de la limite 🔴 ci-dessus), répartition par catégories (2 donuts),
  graphique de saisonnalité sur 12 mois avec prise en compte de `date_debut`/`date_fin`, widget de
  synthèse sur le Dashboard global.
- **Différé, déductible du code** :
  - **Aucun rattachement aux vrais crédits (`emprunts`)** : ni via `reporter_budget` (jamais lu, cf.
    §3), ni via une fusion explicite comparable à celle déjà faite pour `asset_revenus`/`asset_charges`.
    Le Budget ne connaît que ce que l'utilisateur ressaisit manuellement dans une charge de catégorie
    « Emprunts & Crédits ». C'est la limite la plus structurante du module : les deux indicateurs les
    plus « professionnels » de l'écran Résumé (taux et capacité d'endettement) reposent sur une source de
    données qui, par défaut, ne contient aucun crédit réel.
  - **Aucun rapprochement bancaire ni suivi d'exécution** : le module ne distingue à aucun moment un
    revenu/charge *prévu* (budget) d'un mouvement *réellement constaté* sur un compte — toutes les lignes
    sont des montants déclaratifs, lissés sur l'année, sans lien avec une transaction réelle.
  - **Pas de prise en compte de l'unité `%` des charges d'actif** (`asset_charges.unite`) — traité comme
    un chantier commencé côté Patrimoine (le champ existe, contraint en base) mais jamais consommé côté
    Budget, plutôt qu'un écart assumé et documenté.
  - **Pas de vue par bénéficiaire/débiteur agrégée** — le champ existe et est saisi (voire calculé
    automatiquement pour les lignes d'actif, avec le bug documenté en §3) mais n'alimente aucun total
    « par personne », contrairement au module Patrimoine qui a une vue « par tête ».
- **Hors périmètre de cet audit, signalé comme travail de suivi** : un audit du bug d'origine Patrimoine
  identifié en passant — `PERIODICITE_OPTIONS` de `assetTypes.ts` propose « Ponctuelle » comme périodicité
  de charge d'actif dans `ChargeForm.tsx`, alors que la contrainte `CHECK` réelle sur
  `asset_charges.periodicite` en base n'autorise que `'annuelle'`/`'trimestrielle'`/`'mensuelle'` — une
  tentative de sauvegarde d'une charge d'actif « Ponctuelle » échouerait donc côté base de données. Ce
  point relève du module Patrimoine (`ChargeForm.tsx`, `assetTypes.ts`), pas de Budget, et n'a pas été
  creusé davantage ici (impact potentiel sur l'expérience de saisie, pas sur un calcul Budget puisque la
  valeur ne peut jamais être persistée).
