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
prévision. Il fusionne trois sources hétérogènes en une seule liste affichée pour les revenus, quatre
pour les charges :

1. **Ses deux tables propres** `revenus` et `charges` — saisie manuelle libre, indépendante de tout actif
   (ex. salaire, loyer payé, courses). C'est la seule vraie saisie native du module.
2. **`asset_revenus`/`asset_charges` avec `impact_budget = true`** — lignes saisies dans Patrimoine
   (`AssetDetailsDialog.tsx`, onglet Charges de `AssetForm`/`ChargeForm.tsx`) ou dans Immobilier
   (`ImmobilierGestionDialog`, `LMNPDetailView`) sur un actif donné, republiées ici en lecture seule dès
   que la case « Impact sur le budget » est cochée à la source.
3. **`emprunts` avec `reporter_budget = true`, côté charges uniquement** — mensualités des emprunts réels
   de Patrimoine, republiées en lecture seule dans la catégorie « Emprunts & Crédits », dès que le champ
   « reporter au budget » est coché sur l'emprunt.

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
(consommées en lecture, `impact_budget = true` uniquement) ; `emprunts` (consommée en lecture côté
charges uniquement, `reporter_budget = true` uniquement).

**Flux clés** :
- `useRevenus()` ([useBudget.ts](src/hooks/useBudget.ts)) fait deux appels Supabase en parallèle
  (`Promise.all`) — la table propre + la fonction miroir côté actifs. `useCharges()` en fait trois — la
  table propre + la fonction miroir côté actifs + `getEmpruntsChargesForBudget()` — et concatène les
  tableaux en un seul état local, sans déduplication ni tri commun (l'ordre est « classiques d'abord »).
- Chaque ligne porte un champ `source: 'budget' | 'immobilier' | 'emprunt'` (charges uniquement pour la
  dernière valeur) qui conditionne l'affichage dans `BudgetList.tsx` : les lignes `'immobilier'`/`'emprunt'`
  affichent un badge (« Immobilier » / « Emprunt ») et perdent le menu d'édition/suppression
  (« Modifier depuis Immobilier » / « Modifier depuis Patrimoine ») — cohérent, la donnée source vit
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

- **Résolution du bénéficiaire/débiteur via `mapDetenteurToDisplay()`.** Pour les lignes d'origine
  `'immobilier'`/`'emprunt'`, `getAssetRevenusForBudget`/`getAssetChargesForBudget`/
  `getEmpruntsChargesForBudget` résolvent `assets.detenteur`/`emprunts.detenteur` (stocké en base sous les
  codes bruts `'user'`/`'spouse'`/`'common'`, jamais en libellé français) via
  `mapDetenteurToDisplay()` ([lib/patrimoine/utils.ts](src/lib/patrimoine/utils.ts)) — le même mapping que
  Patrimoine, alimenté par `familyService.getFamilyProfile()`/`getMaritalStatus()` (`getFamilyInfoForDetenteur()`
  dans `budgetService.ts`).

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
  Budget : corrigé le 2026-08-27.** `budgetService.getEmpruntsChargesForBudget()` lit désormais
  `emprunts` filtrés sur `reporter_budget = true` et `user_id`, et les fusionne dans `useCharges()`
  comme une troisième source de charges en lecture seule (même mécanisme que `asset_charges` :
  `source: 'emprunt'`, badge « Emprunt », pas de menu d'édition dans `BudgetList.tsx` — modification
  exclusivement depuis Patrimoine, pour ne jamais inciter à une ressaisie manuelle en double). Le libellé
  UI du champ (« sera ajoutée automatiquement aux charges du budget mensuel », `PassifEmpruntForm.tsx:186`)
  correspond maintenant à un comportement réel. Voir 🔴 → déplacé en résolu ci-dessous pour le détail et
  la vérification.
- **Point 3 (`docs/immobilier.md` §3) — bug de périodicité (trimestrielle comptée pour zéro, semestrielle
  divisée par deux) : infirmé pour Budget, corrigé en amont.** Le commit `8274980` (2026-07-14, antérieur
  à cet audit) a introduit `normalizeAssetPeriodicite()` et corrigé `toAnnual` pour gérer explicitement
  `trimestriel(le)` (`×4`) et `semestriel(le)` (`×2`) dans `BudgetList.tsx` et `BudgetResume.tsx` — les
  deux composants qui produisent les totaux affichés au client. Le bug identique à celui d'Immobilier ne
  se reproduit donc **pas** dans Budget aujourd'hui pour ces deux périodicités. Un bug **différent**,
  plus étroit, subsiste sur le cas par défaut — détaillé ci-dessous.

### 🔴 Bloquant

Plus aucun bloquant ouvert à ce jour (2026-08-27) — les trois points identifiés par l'audit initial ont
été corrigés et vérifiés sur cas concret :

- **« Taux d'endettement » et « Capacité d'endettement » n'incluaient jamais un crédit réel — corrigé.**
  `mensualitesCreditsAnnuel` (`BudgetResume.tsx`) ne captait que les charges Budget ressaisies
  manuellement dans la catégorie fermée `CHARGES_CATEGORIES['Emprunts & Crédits']` ; la table `emprunts`
  (vrais crédits Patrimoine, `emprunts.mensualite`) n'était jamais consultée. Fix : nouvelle méthode
  `budgetService.getEmpruntsChargesForBudget()` qui lit les `emprunts` avec `reporter_budget = true`,
  fusionnés en lecture seule dans `useCharges()` (`source: 'emprunt'`, badge « Emprunt », édition
  redirigée vers Patrimoine dans `BudgetList.tsx` — même mécanisme que `asset_charges`, pour ne jamais
  inciter à une ressaisie manuelle en double). La `nature` de l'emprunt est mappée vers l'une des 6
  valeurs fermées de `CHARGES_CATEGORIES['Emprunts & Crédits']`
  (`EMPRUNT_NATURE_TO_BUDGET_CATEGORY` dans `budgetService.ts`), pour que le filtre par catégorie déjà en
  place dans `BudgetResume.tsx` la capte sans modification de son calcul. **Vérifié sur cas concret**
  (simulation isolée) : un crédit immobilier de 2 000 €/mois avec `reporter_budget = true`, jamais
  ressaisi en charge Budget, produit désormais un taux d'endettement de 33,3 % pour 6 000 €/mois de
  revenus (au lieu de 0 % avant correctif). Risque résiduel documenté en 🟠.
- **Bénéficiaire/débiteur affichés comme des codes internes bruts (`user`/`spouse`/`common`) — corrigé.**
  `getAssetRevenusForBudget`/`getAssetChargesForBudget` comparaient `detenteur` aux libellés français
  `'Commun'`/`'Le couple'`, qui n'existent jamais en base (valeurs réelles : `'user'`/`'spouse'`/`'common'`),
  rendant la condition toujours vraie. Fix : les deux méthodes (et la nouvelle
  `getEmpruntsChargesForBudget`) utilisent désormais `mapDetenteurToDisplay()`
  ([lib/patrimoine/utils.ts](src/lib/patrimoine/utils.ts)) — le même mapping que Patrimoine — alimenté par
  `familyService.getFamilyProfile()`/`getMaritalStatus()` (déjà une dépendance légitime de Budget via
  `useBudgetEntryForm.ts`). **Vérifié en base** (requête directe jointe `assets` × `family_profiles` ×
  `marital_status`) : un actif `detenteur='user'`/`'spouse'`/`'common'` affiche désormais le prénom réel
  de l'utilisateur/du conjoint ou « Le couple », plus jamais le code brut.
- **Aucun filtrage par `date_debut`/`date_fin` sur les totaux principaux — corrigé.**
  `totalRevenusAnnuel`/`totalChargesAnnuel` (`BudgetResume.tsx`), la répartition par catégories et les
  totaux de `BudgetList.tsx` sommaient toutes les lignes sans tester `date_debut`/`date_fin`, alors que
  `SeasonalityChart` les excluait déjà correctement au niveau mensuel — deux sections du même écran se
  contredisaient sur les lignes terminées. Fix : un filtre `isActiveToday()` (ligne démarrée et non
  terminée à la date du jour) est appliqué aux totaux et à la répartition par catégories des deux
  fichiers ; la liste des lignes elle-même reste affichée en entier (pour rester éditable/supprimable), et
  `SeasonalityChart` garde sa propre logique de lissage mensuel, non modifiée. **Vérifié sur cas
  concret** : une charge de loyer terminée (`date_fin` passée, 800 €/mois) + une charge active
  (1 200 €/mois) donnent un total de 1 200 €/mois après correctif, contre 2 000 €/mois avant.

### 🟠 À surveiller (cas limite, peu probable)

- **Double comptage résiduel possible entre un emprunt réel (`reporter_budget = true`) et une charge
  Budget ressaisie manuellement pour le même crédit.** Depuis le fix du point ci-dessus (🔴, résolu), un
  crédit avec `reporter_budget = true` apparaît automatiquement dans Budget — plus besoin de le ressaisir
  manuellement. Mais si un utilisateur avait déjà créé une charge Budget manuelle pour ce crédit *avant*
  de cocher `reporter_budget` sur l'emprunt réel, les deux lignes coexistent et sont comptées deux fois
  dans le taux d'endettement, sans clé commune permettant de détecter le doublon automatiquement.
  **Vérifié en base au 2026-08-27** : la table `emprunts` est actuellement vide (0 ligne), ce risque est
  donc nul en pratique aujourd'hui ; à surveiller à mesure que des emprunts réels sont saisis avec ce flag
  coché.
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
  Patrimoine/Immobilier, fusion en lecture des mensualités d'emprunts réels marqués « reporter au
  budget », bascule d'affichage Mensuel/Annuel, KPI de synthèse (solde, taux et capacité d'endettement),
  répartition par catégories (2 donuts), graphique de saisonnalité sur 12 mois avec prise en compte de
  `date_debut`/`date_fin`, widget de synthèse sur le Dashboard global.
- **Différé, déductible du code** :
  - **Aucun rapprochement bancaire ni suivi d'exécution** : le module ne distingue à aucun moment un
    revenu/charge *prévu* (budget) d'un mouvement *réellement constaté* sur un compte — toutes les lignes
    sont des montants déclaratifs, lissés sur l'année, sans lien avec une transaction réelle.
  - **Pas de prise en compte de l'unité `%` des charges d'actif** (`asset_charges.unite`) — traité comme
    un chantier commencé côté Patrimoine (le champ existe, contraint en base) mais jamais consommé côté
    Budget, plutôt qu'un écart assumé et documenté.
  - **Pas de vue par bénéficiaire/débiteur agrégée** — le champ existe, est saisi et correctement résolu
    en libellé civil pour les lignes d'actif/emprunt (§3), mais n'alimente aucun total « par personne »,
    contrairement au module Patrimoine qui a une vue « par tête ».
- **Hors périmètre de cet audit, signalé comme travail de suivi** : un audit du bug d'origine Patrimoine
  identifié en passant — `PERIODICITE_OPTIONS` de `assetTypes.ts` propose « Ponctuelle » comme périodicité
  de charge d'actif dans `ChargeForm.tsx`, alors que la contrainte `CHECK` réelle sur
  `asset_charges.periodicite` en base n'autorise que `'annuelle'`/`'trimestrielle'`/`'mensuelle'` — une
  tentative de sauvegarde d'une charge d'actif « Ponctuelle » échouerait donc côté base de données. Ce
  point relève du module Patrimoine (`ChargeForm.tsx`, `assetTypes.ts`), pas de Budget, et n'a pas été
  creusé davantage ici (impact potentiel sur l'expérience de saisie, pas sur un calcul Budget puisque la
  valeur ne peut jamais être persistée).
