# Audit — Récompenses & créances entre époux (chantier 3A)

Date : 2026-07-28
Périmètre : `recompenses`, `creances_entre_epoux`, moteur "profit subsistant", câblage dans le mécanisme A de transmission.
Aucune modification de code effectuée — ce document est un diagnostic seul.

---

## 1. Inventaire des données

### 1.1 Table `recompenses`

Définie dans `supabase/migrations/20260723170000_create_recompenses_creances.sql`.

| Colonne | Type | Contrainte | Écrite par un formulaire ? | Lue par le moteur de calcul ? |
|---|---|---|---|---|
| `id` | UUID | PK | auto | non (clé technique) |
| `user_id` | UUID | FK `auth.users(id) ON DELETE CASCADE` | auto (session) | non |
| `sens` | TEXT | `communaute_vers_epoux` \| `epoux_vers_communaute` | **oui** ([RecompensesSection.tsx](../src/components/famille/matrimonial/RecompensesSection.tsx)) | **oui** |
| `epoux` | TEXT | `user` \| `spouse` | **oui** | **oui** |
| `bien_concerne_id` | UUID | FK `assets(id) ON DELETE SET NULL`, nullable | **oui** (facultatif) | **non** — jamais lu par le moteur de calcul, sert uniquement à l'affichage du libellé du bien dans la liste |
| `depense_faite` | NUMERIC | NOT NULL | **oui** | **oui** |
| `valeur_bien_acquisition` | NUMERIC | nullable | **oui** (facultatif) | **oui** |
| `valeur_bien_liquidation` | NUMERIC | nullable | **oui** (facultatif) | **oui** |
| `nature_depense` | TEXT | `acquisition`\|`conservation`\|`amelioration`\|`autre` | **oui** | **oui** |
| `mode_evaluation_conventionnel` | TEXT | `nominal`\|`profit_subsistant`\|`plafonne`, nullable | **oui** | **oui** |
| `created_at` / `updated_at` | TIMESTAMPTZ | auto | auto | non |

Aucun champ orphelin : tous les champs saisissables sont bien écrits par le formulaire et lus par le moteur, à l'exception de `bien_concerne_id` qui est un champ de confort UI (rattachement visuel à un bien du patrimoine) sans effet sur le calcul.

**Important : il n'existe pas de colonne `montant_calcule` / montant persisté.** Le commentaire de la migration indique que c'est volontaire : le montant de la récompense est recalculé à chaque lecture par `computeMontantRecompense()`, jamais stocké. Conséquence pratique à connaître : si la formule de calcul change un jour, tous les montants déjà "vus" par un utilisateur changeront rétroactivement sans qu'aucune trace de l'ancien montant n'existe. Ce n'est pas un défaut en soi, mais un choix d'architecture qui mérite d'être connu si un jour un historique ou un figeage de valeurs à une date donnée devient nécessaire.

### 1.2 Table `creances_entre_epoux`

Même migration. Structure parallèle :

| Colonne | Type | Contrainte | Écrite ? | Lue ? |
|---|---|---|---|---|
| `id`, `user_id`, `created_at`, `updated_at` | — | — | auto | non |
| `epoux_creancier` | TEXT | `user`\|`spouse` | **oui** | **oui** |
| `epoux_debiteur` | TEXT | `user`\|`spouse` | **oui** | **oui** |
| `bien_concerne_id` | UUID | FK `assets`, nullable | **oui** (facultatif) | **non** (idem, affichage seul) |
| `depense_faite` | NUMERIC | NOT NULL | **oui** | **oui** |
| `valeur_bien_avant` | NUMERIC | nullable | **oui** (facultatif) | **oui** |
| `valeur_bien_apres` | NUMERIC | nullable | **oui** (facultatif) | **oui** |
| `nature_depense` | TEXT | idem | **oui** | **oui** |
| `mode_evaluation_conventionnel` | TEXT | `nominal`\|`profit_subsistant` seulement (**pas** `plafonne`) | **oui** | **oui** |

**Point d'attention historique (sans conséquence actuelle)** : une migration `20260723155529_rename_recompenses_creances_epoux_roles.sql` a renommé `epoux`→`detenteur` etc., puis a été intégralement annulée deux minutes plus tard par `20260723155549_revert_recompenses_creances_column_rename.sql`. Le schéma vit aujourd'hui bien avec les noms de colonnes d'origine (`epoux`, `epoux_creancier`, `epoux_debiteur`), confirmé par les types Supabase générés. Signalé uniquement pour éviter toute confusion si quelqu'un relit les migrations dans l'ordre chronologique.

**Point de couverture partielle repéré en passant** : la migration `20260724140200_add_financement_mixte_to_assets.sql` ajoute un champ déclaratif `assets.financement_mixte_apport_propre`, dont le commentaire de colonne précise explicitement que la récompense correspondante doit être saisie **manuellement** dans le module Récompenses — elle n'est pas créée automatiquement à partir de ce champ. C'est donc une étape manuelle que l'utilisateur doit penser à faire lui-même ; ce n'est pas un bug, mais une dépendance implicite entre deux écrans qui n'est pas rappelée à l'utilisateur au moment de la saisie.

---

## 2. Distinction juridique récompense vs créance entre époux : le code fait-il la distinction ?

**Oui, explicitement, à tous les niveaux : schéma, types, fonctions de calcul.**

- Deux tables distinctes en base, avec des colonnes différentes (`sens`/`epoux` pour récompense — un seul époux concerné, la contrepartie étant toujours la masse commune — vs `epoux_creancier`/`epoux_debiteur` pour créance — deux époux distincts, aucune notion de masse commune).
- Deux fichiers de types distincts : [`src/types/recompense.ts`](../src/types/recompense.ts) et [`src/types/creanceEntreEpoux.ts`](../src/types/creanceEntreEpoux.ts).
- Deux fonctions de calcul distinctes dans le moteur : `computeMontantRecompense()` (règle complète en 3 temps, art. 1469) vs `computeMontantCreance()` (profit subsistant seul, art. 1479 al. 2, sans le plancher de l'al. 3 — cohérent avec le fait que l'art. 1469 ne s'applique pas tel quel aux créances entre époux).
- Deux fonctions d'agrégation distinctes : `computeSoldeRecompenses()` (impacte la masse commune, donc conditionné à `regimeHasMasseCommune()`) vs `computeSoldeCreancesEntreEpoux()` (impacte directement les patrimoines propres, applicable dans tous les régimes sans condition).
- Le câblage dans `transmission/index.ts` traite bien les deux mécanismes séparément : la récompense est pondérée à 50% (part successorale d'un bien commun) alors que la créance entre époux s'applique à 100% sur le patrimoine propre du défunt simulé — la distinction juridique se retrouve donc jusque dans le traitement successoral.

Aucune confusion de code constatée entre les deux notions. Elles partagent une même *nature de dépense* (`acquisition`/`conservation`/`amelioration`/`autre`) et une même fonction `computeProfitSubsistant()`, ce qui est cohérent puisque le profit subsistant est un même concept économique appliqué à deux relations juridiques différentes — ce n'est pas une confusion, c'est une factorisation logique.

---

## 3. Modes de calcul implémentés

Rappel des 4 cas attendus par l'art. 1469 pour une **récompense** :

| Cas légal | Formule attendue | Codé ? |
|---|---|---|
| Dépense ni nécessaire ni liée à acquisition/amélioration/conservation | la plus faible somme (profit subsistant / dépense faite) | **Codé** — c'est le cas général : `Math.min(depenseFaite, profitSubsistant)` (al. 2) |
| Dépense nécessaire (seule) | dépense faite | **Non distingué en tant que tel** — voir ci-dessous |
| Dépense d'acquisition/amélioration/conservation (seule) | profit subsistant | **Codé** — plancher appliqué via `Math.max(montant, profitSubsistant)` si `nature_depense` est qualifiante (`acquisition`/`conservation`/`amelioration`) |
| Dépense nécessaire ET liée à acquisition/amélioration/conservation | la plus forte somme | **Approximé** — voir ci-dessous |

**Ce qui est réellement codé** (`src/lib/patrimoine/recompensesCreances.ts`, fonction `computeMontantRecompense`) :
1. Al. 1 : montant de base = dépense faite (ou nominal si mode `'nominal'` choisi).
2. Al. 2 (plafond) : `montant = min(depenseFaite, profitSubsistant)` — appliqué systématiquement dès qu'un profit subsistant est calculable.
3. Al. 3 (plancher) : `montant = max(montant, profitSubsistant)` — appliqué **uniquement** si `nature_depense ∈ {acquisition, conservation, amelioration}`.

**Simplification implicite non documentée dans le code (mais bien identifiable) : la notion de "dépense nécessaire" n'existe pas comme champ ou concept séparé dans le schéma.** Le code ne distingue que 2 catégories via `nature_depense` (qualifiante vs `'autre'`), alors que le référentiel légal en distingue 3 (nécessaire seule / qualifiante seule / les deux à la fois). En pratique :
- Une dépense qualifiante (`acquisition`/`conservation`/`amelioration`) suit toujours la règle "plafond ET plancher au profit subsistant" — ce qui correspond exactement au **4ᵉ cas légal** (nécessaire + qualifiante → la plus forte somme), **que la dépense soit réellement "nécessaire" ou non**.
- Une dépense `'autre'` suit toujours la règle "plafond seul, pas de plancher" — ce qui correspond au **1ᵉʳ cas légal** (ni nécessaire ni qualifiante), **même si la dépense était en réalité nécessaire** (le 2ᵉ cas légal, "dépense faite" sans plafond ni plancher lié au profit subsistant, n'est jamais atteint tel quel : une dépense `'autre'` nécessaire devrait légalement donner "dépense faite" net, mais le code lui applique quand même le plafond de l'al. 2 au profit subsistant s'il est calculable).

Autrement dit : **le code réduit les 4 cas légaux à 2 branches** en assimilant implicitement "qualifiante" à "nécessaire+qualifiante" et "autre" à "ni l'un ni l'autre". Le cas "nécessaire seule, non qualifiante" (ex : payer une dette alimentaire du ménage avec des fonds propres) n'est pas représentable dans le modèle de données actuel — il n'y a pas de champ pour déclarer qu'une dépense de nature `'autre'` était néanmoins "nécessaire". Ce n'est pas signalé comme limitation dans le code (le commentaire du fichier ne mentionne que la simplification sur le calcul du profit subsistant lui-même, pas cette réduction du nombre de cas de la règle en 3 temps).

**Pour la créance entre époux** (`computeMontantCreance`) : un seul mode, profit subsistant simple (ou nominal), sans la règle en 3 temps — c'est cohérent avec l'art. 1479 al. 2 qui ne renvoie qu'au profit subsistant, sans le mécanisme de plancher/plafond de l'art. 1469 (créance entre époux n'a pas d'équivalent codifié à l'al. 3).

**Sur le calcul du profit subsistant lui-même** (`computeProfitSubsistant`) : le code documente lui-même, en commentaire de tête de fichier, que les deux formules retenues (prorata pour `acquisition`, delta brut pour `conservation`/`amelioration`) sont "une simplification documentée, pas une formule légale universelle", calées sur deux cas de référence du chantier, et qu'un cas réel avec plusieurs causes de plus-value nécessiterait une analyse notariale au cas par cas. C'est une transparence appréciable dans le code, mais cela signifie concrètement que **le montant calculé peut diverger significativement du montant qu'un notaire retiendrait** dès qu'il y a plusieurs causes de plus-value (ex : travaux + évolution de marché combinés) — situation qui sera probablement fréquente en pratique.

---

## 4. Points non couverts dans le référentiel légal

| Point | Statut |
|---|---|
| Intérêts sur récompenses (art. 1473) | **Non implémenté.** Aucune trace dans le schéma, le moteur ou l'UI d'un calcul d'intérêts courant depuis la dissolution (ou depuis la liquidation en cas de profit subsistant). Les montants calculés sont des montants "à la liquidation", sans capitalisation d'intérêts. |
| Règles de prélèvement / insuffisance de communauté (art. 1471-1472) | **Non implémenté.** Le moteur calcule un solde net global (`ajustementBoniCommun`) sans jamais vérifier si la masse commune dispose effectivement de quoi payer les récompenses dues ; aucune logique de prélèvement sur des biens communs déterminés, ni de gestion du cas où la communauté serait insuffisante pour désintéresser un époux créancier. |
| Clauses dérogatoires de contrat de mariage modifiant le calcul | **Partiellement implémenté, de façon limitée.** Le champ `mode_evaluation_conventionnel` (`nominal`/`profit_subsistant`/`plafonne`) permet de représenter *une* forme de convention contraire (le choix du mode d'évaluation), mais aucune autre clause dérogatoire n'est représentable : pas de champ pour une clause de calcul différente (ex : indexation forfaitaire, exclusion totale des récompenses, barème conventionnel propre au contrat de mariage). Le champ est une case à cocher parmi 3 valeurs fixes, pas un mécanisme générique de clause. |

---

## 5. Consommation UI

**Écrans/composants qui lisent ou écrivent ces deux tables :**

- [`src/components/famille/matrimonial/RecompensesSection.tsx`](../src/components/famille/matrimonial/RecompensesSection.tsx) — écran de **saisie et consultation dédié** pour les récompenses (via le hook `useRecompenses`), avec formulaire d'ajout et liste avec suppression.
- [`src/components/famille/matrimonial/CreancesEntreEpouxSection.tsx`](../src/components/famille/matrimonial/CreancesEntreEpouxSection.tsx) — écran équivalent dédié pour les créances entre époux (via `useCreancesEntreEpoux`).
- [`src/components/famille/RelationInfoForm.tsx`](../src/components/famille/RelationInfoForm.tsx) — héberge les deux sections ci-dessus dans un onglet "Récompenses & créances" ; la section Récompenses n'est affichée que si le régime a une masse commune, la section Créances est toujours affichée.
- [`src/components/transmission/ProcessusCalcul.tsx`](../src/components/transmission/ProcessusCalcul.tsx), [`Succession2ndDeces.tsx`](../src/components/transmission/Succession2ndDeces.tsx), [`Synthese.tsx`](../src/components/transmission/Synthese.tsx), [`AssuranceVie.tsx`](../src/components/transmission/AssuranceVie.tsx) — lecture seule, pour alimenter le calcul de transmission via la ligne d'actif synthétique (mécanisme A). Aucun de ces écrans n'affiche le détail des récompenses/créances à l'utilisateur : elles n'apparaissent que sous forme d'un impact net agrégé sur la succession.

**Réponse à la question posée** : il existe bien un **écran dédié de saisie/consultation** (les deux sections dans `RelationInfoForm.tsx`, onglet régime matrimonial) — ce n'est pas seulement une ligne noyée dans le mécanisme A. Le mécanisme A, lui, ne fait que consommer ces données en lecture pour le calcul de transmission ; il n'expose aucune UI de saisie propre.

**Nombre de champs exposés à l'utilisateur** :
- Récompense : 7 champs saisissables (sens, époux concerné, bien concerné, dépense faite, valeur du bien à l'acquisition, valeur du bien à la liquidation, mode d'évaluation) + nature de la dépense = **8 champs**.
- Créance : 7 champs équivalents (époux créancier, époux débiteur, bien concerné, dépense faite, valeur avant, valeur après, mode d'évaluation) + nature = **8 champs**.

Aucun champ ne semble redondant ou structurellement inutile — chaque champ correspond à un usage identifié (soit input direct du calcul, soit métadonnée d'affichage pour `bien_concerne_id`). **En revanche, `bien_concerne_id`, `valeur_bien_acquisition`/`valeur_bien_avant` et `valeur_bien_liquidation`/`valeur_bien_apres` sont facultatifs à la saisie** : si l'utilisateur ne les renseigne pas, `computeProfitSubsistant` retourne `null` et le moteur retombe silencieusement sur la valeur nominale (`depenseFaite`), quel que soit le mode d'évaluation choisi. Il n'y a pas d'indication à l'utilisateur, au moment de la saisie, que laisser ces champs vides revient à choisir de facto le mode "nominal" même s'il a sélectionné "profit subsistant" dans le menu déroulant — c'est une incohérence UX potentielle plutôt qu'un bug de calcul (le calcul est cohérent avec les données fournies, mais l'utilisateur pourrait croire à tort que le profit subsistant a été appliqué).

---

## 6. Synthèse

| Brique | Statut | Commentaire |
|---|---|---|
| Récompense masse commune → propre (`epoux_vers_communaute`... non, voir note) | **Fonctionnel** | Distinction sens gérée (`sens` = `epoux_vers_communaute` ou `communaute_vers_epoux`), règle des 3 temps codée avec la simplification 2-branches documentée en section 3 |
| Récompense propre → commune | **Fonctionnel** | Même moteur, même simplification que ci-dessus (un seul champ `sens` distingue les deux directions, un seul chemin de calcul) |
| Créances entre époux | **Fonctionnel** | Profit subsistant seul, cohérent avec l'art. 1479 al. 2 ; asymétrique correctement selon lequel des deux époux est simulé défunt |
| Intérêts (art. 1473) | **Manquant** | Aucune trace dans schéma/moteur/UI |
| Prélèvements / insuffisance de communauté (art. 1471-1472) | **Manquant** | Solde net global calculé, sans vérification de la capacité de la masse commune à désintéresser |
| Clauses dérogatoires de contrat de mariage | **Approximé** | Un seul degré de liberté représentable (`mode_evaluation_conventionnel`, 3 valeurs fixes), pas de mécanisme générique de clause |
| Distinction "dépense nécessaire" indépendante de "dépense qualifiante" | **Approximé** | Réduite à 2 branches au lieu de 4 cas légaux (voir section 3) ; le cas "nécessaire seule, non qualifiante" n'est pas représentable |
| Persistance du montant calculé | **Absent par choix** | Pas de colonne dédiée — recalculé à chaque lecture, donc rétroactivement sensible à tout changement futur de formule |
| Rattachement automatique financement mixte → récompense | **Manquant (déclaratif seul)** | `assets.financement_mixte_apport_propre` ne crée pas de ligne `recompenses` ; étape manuelle non rappelée à l'utilisateur |
| Code mort | **Aucun constaté** | Tous les champs des deux tables sont écrits par un formulaire et lus par le moteur, à l'exception de `bien_concerne_id` (métadonnée d'affichage assumée, pas du code mort) |

### Hypothèses posées pour cet audit
- Je n'ai pas trouvé de logique de calcul d'intérêts ni de mécanisme de prélèvement/insuffisance ailleurs dans le repo (recherche par mots-clés `1473`, `intérêt`/`interet`, `prélèvement`/`prelevement`, `insuffisance`, `dérogatoire`/`derogat` sur les fichiers du chantier) — je pose l'hypothèse que ces mécanismes n'existent nulle part dans le projet, pas seulement absents des fichiers du chantier 3A. Si un mécanisme équivalent existe sous un autre nom ailleurs dans le code, il m'a échappé.
- Un worktree parallèle (`.claude/worktrees/hopeful-lewin-38542e/`) contient des fichiers de travail en cours non commités (`src/hooks/useAssetForm.ts`, `src/components/patrimoine/AssetDetailsDialog.tsx`, une copie de `qualification.ts`) qui n'ont pas été analysés ici — hors périmètre de cet audit qui porte sur l'arbre de travail principal.
