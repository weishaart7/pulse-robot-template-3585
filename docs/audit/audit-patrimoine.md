# Audit — Patrimoine

> Audit statique (lecture de code + vérification du schéma Supabase) **et** navigation réelle,
> réalisé le 2026-07-29 sur la branche `main` (commit `2835f30`).
> Un compte de test a été créé directement en base (Supabase Auth + `family_profiles` +
> `marital_status`) pour lever le blocage d'authentification : couple marié sous communauté légale
> (« Jean Dupont » / « Sophie Dupont »), un actif (« Maison Bordeaux », résidence principale), un
> emprunt (« Crédit immobilier Bordeaux », lié à l'actif) et un passif divers (« Impôt sur le revenu
> restant dû ») ont été saisis via l'interface pour observer les dynamiques et vérifier la cohérence
> écran ↔ moteur de calcul. Aucun fichier applicatif n'a été modifié ; aucune correction n'a été
> appliquée.

## Périmètre

| Sous-section | Accès | Composant |
|---|---|---|
| Résumé | `Patrimoine` → onglet « Résumé » (par défaut) | [PatrimoineResume.tsx](src/components/patrimoine/PatrimoineResume.tsx) |
| Actifs | `Patrimoine` → onglet « Actifs » | [PatrimoineActifs.tsx](src/components/patrimoine/PatrimoineActifs.tsx) → [PatrimoineTreeView.tsx](src/components/patrimoine/PatrimoineTreeView.tsx), [AssetForm.tsx](src/components/assets/AssetForm.tsx), [AssetDetailsDialog.tsx](src/components/patrimoine/AssetDetailsDialog.tsx) |
| Passifs | `Patrimoine` → onglet « Passifs » | [PatrimoinePassifs.tsx](src/components/patrimoine/PatrimoinePassifs.tsx) → [PassifEmpruntForm.tsx](src/components/patrimoine/PassifEmpruntForm.tsx), [PassifDetailsDialog.tsx](src/components/patrimoine/PassifDetailsDialog.tsx) |
| Plus-values (détail) | Résumé → carte « Plus-values » (vue de substitution, pas un onglet ni une route) | [PatrimoinePlusValues.tsx](src/components/patrimoine/PatrimoinePlusValues.tsx) |

Tables Supabase concernées : `assets`, `asset_charges`, `asset_demembrements`, `asset_indivisaires`,
`asset_revenus`, `asset_valorisations`, `emprunts`, `passifs`. Schéma et contraintes FK vérifiés
directement en base (projet `npypkocowjkszxtecxzq`).

---

## Sous-section 1 — Résumé (`PatrimoineResume.tsx`)

- **Objectif métier** : tableau de bord de synthèse du patrimoine du foyer (actifs, passifs,
  patrimoine net, répartition par personne, évolution dans le temps, aperçu des plus-values), avec
  accès aux deux vues détaillées.

- **Inputs et traçage** : aucun champ saisissable dans cette sous-section — c'est un affichage pur,
  dérivé des données saisies dans Actifs/Passifs. Traçage des **agrégats affichés** :

  | Agrégat affiché | Source | Chaîne de calcul |
  |---|---|---|
  | Actifs / Passifs / Patrimoine net (3 cartes) | `assets`, `passifs`, `emprunts` | `useAssets`/`usePassifs`/`useEmprunts` → `financialSummary` ([usePatrimoineCalculations.ts:76-82](src/hooks/usePatrimoineCalculations.ts:76)) — simple somme, **sans filtre de qualification** |
  | Donut « Répartition du patrimoine » | idem | recalcul **indépendant** dans [PatrimoineChart.tsx:31-72](src/components/patrimoine/PatrimoineChart.tsx:31), avec sa propre palette et son propre `formatCurrency` (`:12-22,73-80`) |
  | Évolution du patrimoine | `asset_valorisations` | `assetValorisationService.getAllForUser()` ([PatrimoineResume.tsx:66-70](src/components/patrimoine/PatrimoineResume.tsx:66)) → `computeEvolutionPatrimoine` ([evolutionPatrimoine.ts:18-53](src/lib/patrimoine/evolutionPatrimoine.ts:18)) |
  | Patrimoine par tête | idem | `patrimoineParPersonne` ([usePatrimoineCalculations.ts:93-200](src/hooks/usePatrimoineCalculations.ts:93)) → `getPartSuccessorale` ([succession.ts:50-80](src/lib/patrimoine/succession.ts:50)), **avec** exclusion des biens non qualifiés |
  | Carte Plus-values | idem | `plusValuesSummary` ([usePatrimoineCalculations.ts:202-249](src/hooks/usePatrimoineCalculations.ts:202)) → `calculatePlusValue` ([utils.ts:162-173](src/lib/patrimoine/utils.ts:162)) |

- **Dynamiques** :
  - Clic sur la carte Plus-values ([PatrimoineResume.tsx:250-257](src/components/patrimoine/PatrimoineResume.tsx:250)) → `onNavigateToPlusValues` → [PatrimoineSection.tsx:32,41-42](src/pages/patrimoine/PatrimoineSection.tsx:32) bascule `showPlusValuesDetail` et remplace le contenu de l'onglet par `PatrimoinePlusValues` (les onglets Résumé/Actifs/Passifs restent visibles en haut).
  - Bandeau d'avertissement affiché si des actifs sont « à qualifier » ([PatrimoineResume.tsx:99](src/components/patrimoine/PatrimoineResume.tsx:99)) — mais voir P1.
  - Prop `onNavigateToParTete` prévue par le composant ([PatrimoineResume.tsx:17,192-193,236-245](src/components/patrimoine/PatrimoineResume.tsx:17)) mais **jamais fournie** par le parent — voir P5.

- **Bugs trouvés** :
  - **P1 — Le bandeau « éléments non qualifiés, exclus des totaux » ne correspond pas aux totaux réellement affichés** — *gênant, nouveau*. Le bandeau (`PatrimoineResume.tsx:99`) s'appuie sur `unqualifiedItems`, calculé uniquement dans `patrimoineParPersonne` ([usePatrimoineCalculations.ts:93-200](src/hooks/usePatrimoineCalculations.ts:93), try/catch `:111-129/132-150/153-171`). Les cartes « Actifs / Passifs / Patrimoine net » juste en dessous (`:110-133`) lisent `financialSummary` (`:76-82`), qui **n'exclut rien**. Un bien « À qualifier » de 100 000 € serait inclus dans « Patrimoine net » mais exclu de « Patrimoine par tête » → deux totaux différents à l'écran, contredisant le texte du bandeau. Le donut (`PatrimoineChart.tsx:31-72`) reproduit un **troisième** calcul, non filtré lui aussi.
  - **P4 — La fraction de démembrement (usufruit / nue-propriété) n'est jamais appliquée aux totaux du Résumé** — *gênant (bloquant en pratique dès qu'un bien est démembré), nouveau*. `AssetForm.tsx:798` et `AssetDetailsDialog.tsx:249,253,257` désignent `valeur_estimee` comme la « valeur pleine propriété » et calculent à titre informatif la répartition usufruit/nue-propriété (barème 669 CGI). Mais `financialSummary`, `patrimoineParPersonne` et `PatrimoineChart` additionnent tous `valeur_estimee` **sans jamais lire `mode_detention`** : un bien détenu en nue-propriété est compté à 100 % de sa valeur, pas à la seule fraction réellement possédée.
  - **P12 — Affichage « -0 € » pour des moins-values nulles** (*mineur, nouveau, confirmé en navigation*). [PlusValuesCard.tsx:86](src/components/patrimoine/PlusValuesCard.tsx:86) écrit `` `-${formatCurrency(totalMoinsValues)}` `` : quand `totalMoinsValues` vaut `0`, le résultat est le littéral « -0 € » (signe moins concaténé, pas une négation numérique). Reproduit à l'écran avec le jeu de données de test.
  - **P5 — Code mort : `PatrimoineParTeteDetail.tsx` n'est jamais monté** — *mineur, nouveau*. `grep` ne trouve aucun import hors de son propre fichier ; `PatrimoineSection.tsx:46,52` ne fournit jamais `onNavigateToParTete` à `PatrimoineResume`. Confirmé en navigation : la carte « Patrimoine par tête » ne réagit à aucun clic testé (les clics dans cette zone ont systématiquement rouvert la vue Plus-values plutôt qu'un détail par tête dédié).
  - **P6 — Prop `selectedCategory` morte** (*mineur*). [PatrimoineChart.tsx:10,27](src/components/patrimoine/PatrimoineChart.tsx:10) : déclarée, jamais lue ; les deux appelants la passent toujours à `null`.
  - **P7 — Duplication de constantes utilitaires** (*mineur*). `PatrimoineChart.tsx` recopie `CATEGORY_COLORS` et `formatCurrency` (`:12-22,73-80`) au lieu de réutiliser [lib/patrimoine/utils.ts:6-16,23-30](src/lib/patrimoine/utils.ts:6) — même schéma que la duplication IFI déjà corrigée et citée en exemple dans `CLAUDE.md`.
  - **P8 — Duplication de logique « en couple »** (*mineur*). `checkIsInCouple` ([utils.ts:99-110](src/lib/patrimoine/utils.ts:99)) et `isInCouple` ([qualification.ts:87-91](src/lib/patrimoine/qualification.ts:87)) réimplémentent le même test dans deux fichiers.
  - **P9 — Gestion d'erreur silencieuse incohérente** (*mineur*). `PatrimoineResume.tsx:69` et `AssetDetailsDialog.tsx:46,49` avalent l'erreur sans log ni toast, contrairement à `usePatrimoineOriginaire.ts:20-26`, `usePatrimoineFinal.ts:20-26`, `useAssets.ts:15-20` qui affichent un toast dans le même cas.
  - **P10 — Logique métier dans un composant React plutôt que dans `lib/patrimoine/`** (*mineur, point d'organisation*). `computeByCategory` ([PatrimoineParTeteDetail.tsx:49-68](src/components/patrimoine/PatrimoineParTeteDetail.tsx:49)) réimplémente une agrégation directement dans le composant, à l'inverse du pattern types/fonctions-pures/`index.ts` voulu par `CLAUDE.md` pour ce type de module (et déjà en place pour IFI).
  - **P11 — Incohérence de repli à `totalValue` nul/négatif** (*mineur, edge case*). `PatrimoineResume.tsx:238,243` replie à `0`, `PatrimoineParTeteDetail.tsx:93,105` replie à `100`/`0` — deux comportements différents pour le même cas limite.

- **Liens/navigation testés** : clic carte Plus-values → vue détail (fonctionne, `Retour au résumé` fonctionne, aller-retour testé deux fois) ; carte « Patrimoine par tête » → aucune navigation observée (cohérent avec P5) ; aucune erreur console spécifique à cette sous-section en dehors de celles listées pour Actifs/Passifs.

---

## Sous-section 2 — Actifs (`PatrimoineActifs.tsx`)

- **Objectif métier** : saisir, qualifier civilement (propre / commun / personnel / indivision) et
  valoriser dans le temps chaque actif patrimonial, avec les métadonnées (détention, financement,
  charges, indivisaires, démembrement) consommées par les modules avals (Transmission, DMTG, IFI,
  Budget, Sociétés, Immobilier).

- **Inputs et traçage** (socle générique `AssetForm.tsx` / `assetSchema.ts` — table `assets` sauf
  mention contraire) :

  | Champ | Table.colonne | Traçage réel |
  |---|---|---|
  | `nature` | `assets.nature` | Partout : `getAssetCategory`, `qualifierBien`, régimes fiscaux PV |
  | `denomination`, `etablissement` | idem | Affichage seul |
  | `mode_detention` | idem | `isDemembre` (barème 669 CGI, affichage) — **jamais lu par les totaux du Résumé (P4)** |
  | `valeur_estimee`, `valeur_acquisition`, `frais_acquisition`, `date_acquisition` | idem | `calculatePlusValue`, régimes fiscaux PV/PVI, `qualifierBien` |
  | `detenteur`, `pourcentage_utilisateur/conjoint` | idem | `getPartSuccessorale` — mais voir P14 pour le cas Indivision |
  | `origine_actif`, `clause_remploi`, `clause_entree_communaute`, `est_propre_par_nature`, `financement_mixte_apport_propre` | idem | **actifs** — consommés par `qualifierBien` **et** par le module Transmission (récompenses/créances, `RecompensesSection.tsx:113-121,176`) |
  | `situation_particuliere` | idem | **DORMANT** — aucun lien avec un mécanisme de garantie/passif (recherche exhaustive `lib/patrimoine`, `lib/transmission`, `lib/dmtg`, `fiscalite/ifi`) |
  | `attachement_emotionnel` | idem | **DORMANT** — affichage seul |
  | `sous_type_per` | idem | **DORMANT** — affichage seul |
  | `bien_etranger` | idem | **DORMANT** — attendu (Phase D « biens hors de France », prévue mais pas construite, cf. `CLAUDE.md`) |
  | `qualification_bien`, `qualification_auto` | idem | Consommateur central de la succession/transmission — voir **P13** |
  | `part_licitation_personnelle`, `licitation_acquereur` | idem | Déclaratif documenté comme tel (`assetService.ts:69`), jamais injecté dans `qualifierBien()` |
  | `financement_actif`, `financement_duree_mois`, `financement_apport`, `financement_taux_credit`, `financement_taux_assurance` | idem (« immobilier étendu ») | **DORMANT** — saisis par `PropertyFinancingSection.tsx`, aucun échéancier ni impact budget trouvé |
  | `type_charge`, `denomination`, `debiteur`, `montant`, `periodicite`, `date_debut`, `impact_budget` | `asset_charges` | `budgetService.getAssetChargesForBudget` (filtré `impact_budget=true`) |
  | `unite` (`€`/`%`) | `asset_charges.unite` | **non sélectionné par la requête budget** — voir P15 |
  | `duree_type`, `duree_annees` | `asset_charges` | option « Pendant années » **inaccessible depuis l'UI** — voir P16 |
  | `type_partie`, `family_link_id`, `nom_libre`, `date_naissance_tiers` (démembrement) | `asset_demembrements` | Purement informatif (barème 669 CGI affiché), déconnecté du moteur DMTG/succession qui gère le démembrement via une structure distincte |
  | `type_indivisaire`, `pourcentage` (indivision) | `asset_indivisaires` | Saisi, persisté, jamais relu par le moteur de succession — voir **P14** |

- **Dynamiques** (fichier:ligne dans [AssetForm.tsx](src/components/assets/AssetForm.tsx)) :
  champs conditionnels selon `nature` (PER, CTO, bien étranger, établissement) ; `DemembrementSection`
  affichée si `mode_detention` ∈ {Usufruit, Nue-propriété} ; `IndivisairesSection` affichée si
  `detenteur === 'Indivision'` ; recalcul cascade de `qualification_bien` sur 10 champs surveillés
  (`useAssetForm.ts:190-236`) ; auto-ajustement des pourcentages selon `detenteur`
  (`:239-267`) ; **effet de bord notable** : sélectionner « Nue-propriété » force silencieusement
  `origine_actif = ['Acquisition à titre onéreux']` → `['Acquisition à titre gratuit']`
  (`:260-263`, voir P22) ; aperçu en direct de la plus-value et de la valorisation démembrée
  (`:119-151,756-816`).

  **Confirmé en navigation** : création d'un bien « Résidence principale », détenteur « Le couple »
  → message « Réparti 50 % / 50 % entre {prénom} et {conjoint} — bien commun, fixé par la loi (non
  modifiable) » affiché correctement ; après enregistrement, le tableau Actifs affiche
  « Maison Bordeaux » sous le groupe « Actifs immobiliers », valeur 480 000 €, +/- value
  **+105 000 €** (= 480 000 − 350 000 − 25 000, cohérent avec `calculatePlusValue`).

- **Bugs trouvés** :
  - **P13 — `qualification_bien` stocké en base, jamais réactualisé hors ré-enregistrement de l'actif** — ***bloquant, nouveau***. `succession.ts`, `avantagesMatrimoniaux.ts` et `usePatrimoineCalculations.ts:115` lisent `asset.qualification_bien` **stocké**, recalculé et sauvegardé uniquement quand l'utilisateur rouvre puis soumet le formulaire de CET actif (`useAssetForm.ts:196-234`). `AssetDetailsDialog.tsx:89-113` réaffiche, lui, une valeur **recalculée à la volée**. Un changement de régime matrimonial (module Famille) sans réouverture de chaque actif laisse les moteurs de succession/DMTG travailler sur une qualification obsolète, alors que la fiche détail affiche la valeur à jour — deux vues incohérentes sur une donnée fiscale sensible.
  - **P14 — Pourcentages de co-indivision (`asset_indivisaires.pourcentage`) jamais consommés par le moteur de succession** — ***bloquant, nouveau***. Quand `detenteur === 'Indivision'`, `succession.ts:65-70` (`getPartSuccessorale`) lit exclusivement `assets.pourcentage_utilisateur`/`pourcentage_conjoint` — deux colonnes **jamais éditables dans ce cas** (`AssetForm.tsx:433-469` n'apparaît que si `detenteur === 'Le couple'` ; `useAssetForm.ts:141-153` ne traite pas 'Indivision'). Un bien en indivision à parts inégales (ex. 20 %/80 % avec un tiers) est quand même calculé à 50/50 par le moteur de succession.
  - **P22 — `mode_detention = 'Nue-propriété'` écrase silencieusement `origine_actif`** — *gênant à bloquant selon la fréquence réelle, nouveau*. `useAssetForm.ts:260-263` force `origine_actif = ['Acquisition à titre gratuit']` sans confirmation, alors qu'une nue-propriété peut être acquise à titre onéreux (montage démembré, viager) — qualification civile erronée en cascade.
  - **P15 — Charges en `unite: '%'` traitées comme des € dans le Budget** — *gênant, nouveau*. `budgetService.ts:68-70,228-246,268` ne sélectionne pas la colonne `unite` : une charge « 8 % des loyers » remonte comme « 8 €/mois » dans le budget réel.
  - **P17 — Impossible de saisir explicitement `0`** — *gênant, nouveau*. `field.onChange(parseFloat(e.target.value) || undefined)` (`AssetForm.tsx:543,554,615,675,738`) réinitialise le champ à vide si l'utilisateur tape « 0 » (falsy en JS) — un bien dévalorisé (`valeur_estimee = 0`) ou sans frais (`frais_acquisition = 0`) ne peut pas être saisi tel quel.
  - **P20 — Gestion d'erreur silencieuse récurrente** — *gênant, nouveau*. `useAssetForm.ts:110-112,123,132`, `PatrimoineTreeView.tsx:44`, `AssetDetailsDialog.tsx:46,49` : catch vide sans log ni toast. `PatrimoineActifs.tsx:129-134` : le toast d'erreur du `catch` de sauvegarde ne s'affiche que si le message contient « co-indivisaires » — toute autre erreur reste invisible malgré le toast de succès déjà affiché.
  - **P21 — `console.error` actifs en production, sans garde `import.meta.env.DEV`** — *gênant (conformité RGPD `CLAUDE.md`), nouveau*. `PatrimoineActifs.tsx:47,59,130` — les objets d'erreur Supabase loggés peuvent inclure des fragments de la requête (violations de contrainte sur des colonnes de valeur).
  - **P18 — Aucune borne min/max sur les montants principaux** — *mineur à gênant, nouveau*. `valeur_estimee`, `valeur_acquisition`, `frais_acquisition` (`assetSchema.ts:65,70,71`) sans `.min(0)` ni attribut HTML `min`, contrairement à `financement_mixte_apport_propre`/`part_licitation_personnelle` (`AssetForm.tsx:615,675`, qui ont `min="0"`). Un montant négatif est saisissable sans blocage.
  - **P19 — `pourcentage_utilisateur/conjoint` sans borne Zod** — *mineur, nouveau*. Clampage JS ad hoc seulement (`AssetForm.tsx:453-457`, `useAssetForm.ts:310-312`), aucune couverture pour le cas Indivision (renforce P14).
  - **P16 — `duree_type: 'Pendant années'` inaccessible depuis l'UI** — *mineur, nouveau*. Prévu dans le schéma (`ChargeForm.tsx:29,31`) et le type `AssetCharge`, mais seul « Jusqu'à date » / « Durée indéterminée » sont rendus (`:262-303`) — fonctionnalité fantôme, sans donnée fausse possible puisqu'inatteignable.
  - **P23 — Incohérence de typage `sous_type_per`** — *mineur, nouveau*. `assetService.ts:57` : `'Bancaire' | 'Assurantiel' | string` — l'union avec `string` annule la vérification de type par rapport au Zod `z.enum(...)` réel (`assetSchema.ts:81`).
  - **P24 — `IncompleteAssetsBanner.tsx:17-25` incomplet** — *mineur, nouveau*. Ne détecte que `valeur_estimee`/`detenteur`/`mode_detention`/`date_estimation` manquants ; ne signale ni un démembrement sans contrepartie renseignée, ni une indivision sans indivisaires ou dont le total ≠ 100 % (`assetIndivisaireService.ts:45-48` ne bloque qu'un total > 100 %, un total de 40 % passe silencieusement).
  - **P26 — Warning React répété en console : « Invalid prop supplied to React.Fragment »** — *mineur, nouveau, confirmé en navigation*. Se déclenche à chaque rendu de l'onglet Actifs dès qu'un groupe de catégorie existe. Origine : [PatrimoineTreeView.tsx:258](src/components/patrimoine/PatrimoineTreeView.tsx:258), `<React.Fragment key={category}>` — l'instrumentation de dev (attributs `data-lov-id`, etc., injectés automatiquement par l'outillage du projet sur chaque élément JSX) tente d'ajouter des props supplémentaires sur ce Fragment, ce qui est invalide (un Fragment n'accepte que `key`/`children`). Sans conséquence fonctionnelle observée, mais pollue la console à chaque session.
  - **P27 — Trois tables de `assets` sans FK `user_id → auth.users`** — *mineur, vérifié en base, nouveau*. `asset_demembrements.user_id`, `asset_indivisaires.user_id` et `asset_valorisations.user_id` n'ont **aucune** contrainte FK, contrairement à la règle `CLAUDE.md` (« toute nouvelle table portant un `user_id` doit avoir une FK vers `auth.users(id) ON DELETE CASCADE` »). Le nettoyage en cascade reste assuré **transitivement** via `asset_id → assets(id) ON DELETE CASCADE` puis `assets.user_id → auth.users(id) ON DELETE CASCADE` — pas de risque de lignes orphelines constaté en pratique, mais non-conformité déclarative à corriger.

- **Liens/navigation testés** : « Ajouter un actif » → formulaire 4 onglets (Informations générales /
  Détention & Acquisition / Valorisation / Charges), navigation entre onglets fonctionnelle ; création
  d'un bien effective (toast + apparition immédiate dans la liste, contrairement à Passifs — voir
  P28) ; expansion/réduction du groupe de catégorie fonctionnelle ; menu « … » (Modifier/Supprimer)
  fonctionnel ; aucune erreur réseau observée sur la création ; console : voir P26.

---

## Sous-section 3 — Passifs (`PatrimoinePassifs.tsx`)

- **Objectif métier** : déclarer et suivre les emprunts (table `emprunts`, conditions de prêt,
  garantie, assurance-emprunteur) et les dettes/passifs simples (table `passifs`), dans un formulaire
  fusionné unique, avec qualification civile et répartition user/conjoint.

- **Inputs et traçage** (`PassifEmpruntForm.tsx` — gère à la fois `Emprunt` et `Passif`) :

  | Champ | Table.colonne | Traçage réel |
  |---|---|---|
  | `nature` | `emprunts.nature` / `passifs.nature` | Discriminant emprunt/passif (`usePassifEmpruntForm.ts:215`) ; affichage |
  | `libelle` | `emprunts.libelle` | Affichage + discriminant structurel `isEmpruntRecord` |
  | `capital_restant_du` | `emprunts.*` | Très largement lu : dashboard, `PatrimoineTreeView`, `SocieteFinancesEmprunts`, moteur Transmission (`buildPassifLines`) |
  | `taux_interet` | idem | **Affichage seul** — aucun moteur de calcul (amortissement) ne le consomme |
  | `mensualite` | idem | Affichage — **jamais utilisé par le Budget** malgré `reporter_budget` (voir dormant) |
  | `duree_restante` | idem | Affichage + calcul « Total restant à rembourser »/« Coût des intérêts » dans `PassifDetailsDialog.tsx:160-179` |
  | `contributeur_remboursement` | idem | **Réellement exploité** : règle d'alerte séparation de biens + résidence principale indivise + remboursement unilatéral ([lib/alertes/regles.ts:148-150](src/lib/alertes/regles.ts:148)) — **jamais affiché** dans `PassifDetailsDialog.tsx` |
  | `asset_id` | idem | Lien purement déclaratif dans l'affichage (aucun nettage de la valeur nette du bien) ; **mais réellement exploité** par le moteur d'alertes ci-dessus |
  | `societe_id` | idem | Exclu du passif transmis par `transmissionHelpers.ts` (double emploi avec la valorisation des parts) — **mais pas exclu** des KPI du Résumé, voir **P29** |
  | `type_garantie` | idem | Affichage seul |
  | `reporter_budget` | idem | **DORMANT** — persisté, jamais lu (recherche exhaustive `budgetService.ts`, `components/budget/*`) |
  | `assure`, `quotite_assuree_utilisateur/conjoint`, `capital_garanti_deces` | idem | Consommés par `buildPassifLines` (déduction du capital garanti sur le passif transmis) — non revérifié par `assure` lui-même côté Transmission |
  | `detenteur`, `pourcentage_utilisateur/conjoint` | `emprunts`/`passifs` | Consommés par `usePatrimoineCalculations.ts` (dashboard, pondéré par détenteur) — **jamais lus par le moteur Transmission**, voir **P30** |
  | `qualification_bien`, `qualification_auto` | idem | Champ central de la succession — jamais affiché dans `PassifDetailsDialog.tsx` ; aucun contrôle utilisateur dans `PassifEmpruntForm.tsx`, voir P33 |
  | `montant_du` | `passifs.montant_du` | Champ central d'un passif simple, largement consommé (dashboard, alertes, Transmission) |

- **Dynamiques** : bloc emprunt entier conditionné par `isEmprunt` (nature dans `EMPRUNT_NATURES`) ;
  `montant_du` affiché seulement si passif simple ; bloc assurance conditionné par `assure` (mais
  `quotite_assuree_conjoint` en plus conditionné par « couple + partenaire », sans condition
  symétrique sur `quotite_assuree_utilisateur`) ; « Le couple » retiré des options de détenteur si
  qualification ∈ {Bien propre, Bien personnel} ; préremplissage détenteur + pourcentages depuis
  l'actif lié au changement de `asset_id`, sans normalisation.

  **Confirmé en navigation** : création d'un emprunt « Crédit immobilier Bordeaux » lié à l'actif
  « Maison Bordeaux » → détenteur automatiquement préremplis à « Le couple » avec le message « Réparti
  50 % / 50 %… (non modifiable) » ; options de détenteur correctement alignées sur les données
  Famille (prénom du client, prénom du conjoint, « Le couple ») une fois le profil famille complet.

- **Bugs trouvés** :
  - **P28 — Un emprunt/passif créé avec succès n'apparaît pas immédiatement dans la liste** — ***bloquant (perception de perte de donnée), nouveau, confirmé en navigation***. Après soumission du formulaire (« Crédit immobilier Bordeaux », 180 000 €), le toast « L'emprunt a été ajouté avec succès » s'affiche, mais la carte « Emprunts » de `PatrimoinePassifs.tsx` continue d'afficher « Aucun emprunt enregistré ». Vérifié en base : la ligne est bien écrite (`emprunts` contient la ligne complète, `created_at` correct). Il faut changer d'onglet (Résumé → Passifs) pour que l'emprunt apparaisse. **Cause racine identifiée** : [usePassifEmpruntForm.ts:27-28](src/hooks/usePassifEmpruntForm.ts:27) appelle **ses propres instances** de `useEmprunts()`/`usePassifs()` ([usePassifs.ts](src/hooks/usePassifs.ts), simple `useState` local sans store partagé ni React Query), complètement indépendantes de l'instance possédée par [PatrimoinePassifs.tsx:23-24](src/components/patrimoine/PatrimoinePassifs.tsx:23) qui rend la liste. La création met à jour l'état local du formulaire (qui se démonte aussitôt), jamais celui du parent. **Par contraste**, le module Actifs évite ce problème : [PatrimoineActifs.tsx:22](src/components/patrimoine/PatrimoineActifs.tsx:22) possède l'unique instance de `useAssets()` et transmet `createAsset` à `AssetForm` via la prop `onSubmit` — `AssetForm`/`useAssetForm` n'appellent jamais `useAssets()` eux-mêmes. Confirmé en navigation : la création d'un actif apparaît, elle, immédiatement dans la liste.
  - **P29 — Passifs/emprunts liés à une société comptés deux fois dans le patrimoine personnel** — ***bloquant, nouveau***. [utils/transmissionHelpers.ts:715](src/utils/transmissionHelpers.ts:715) exclut les emprunts avec `societe_id` non nul du calcul de Transmission (« double emploi avec la valorisation des parts »). Mais [usePatrimoineCalculations.ts:78-79](src/hooks/usePatrimoineCalculations.ts:78) (KPI du Résumé), [useAlertesConseil.ts:41](src/hooks/useAlertesConseil.ts:41) et [PatrimoineChart.tsx:58](src/components/patrimoine/PatrimoineChart.tsx:58) ne font pas cette exclusion : un emprunt de société apparaît en double dans le tableau de bord Patrimoine.
  - **P30 — Passifs personnels jamais pondérés par détenteur dans le moteur Transmission** — ***bloquant, nouveau***. `getFractionPassifAjustee` ([avantagesMatrimoniaux.ts:211-222](src/lib/patrimoine/avantagesMatrimoniaux.ts:211)) retourne `null` pour toute qualification autre que « Bien commun » ; la ligne appelante applique alors 100 % quel que soit le détenteur réel, car `PassifLine` ne transporte même pas `detenteur` ([transmissionHelpers.ts:665-668](src/utils/transmissionHelpers.ts:665)). Un crédit à la consommation qualifié « Bien propre », détenu à 100 % par le conjoint, réduit quand même le patrimoine transmissible calculé pour l'utilisateur. Le module Patrimoine (`usePatrimoineCalculations.ts:132-171`), lui, pondère bien par détenteur pour ce même jeu de données — **divergence de méthode entre les deux modules**.
  - **P31 — La fiche détail d'un passif/emprunt n'affiche ni détenteur, ni qualification, ni contributeur au remboursement, ni statut d'assurance** — *gênant, nouveau, confirmé visuellement*. Ouverture de la fiche « Crédit immobilier Bordeaux » : seuls Nature, Mensualité, Taux d'intérêt et Actif lié sont affichés (`PassifDetailsDialog.tsx`, `grep` confirme 0 occurrence de ces champs). Un utilisateur ne peut pas savoir, depuis cette fiche, qui détient la dette ni qui la rembourse effectivement.
  - **P33 — Aucun contrôle utilisateur sur la qualification civile d'un passif/emprunt** — *gênant, nouveau*. `qualificationRaison` est calculée (`usePassifEmpruntForm.ts:287`) mais jamais déstructurée/affichée dans `PassifEmpruntForm.tsx` (contrairement à `AssetForm.tsx:683-724`, qui offre un Select manuel + raison + réactivation). La description du champ `asset_id` (« le détenteur et la quote-part restent modifiables ») est vraie pour le détenteur mais fausse pour la quote-part dans le cas Indivision (aucun input, cf. P14).
  - **P32 — Trois implémentations indépendantes du discriminant emprunt/passif** — *gênant, risque latent bloquant, nouveau*. `usePassifEmpruntForm.ts:13` (`isEmpruntRecord`, teste `'libelle' in item`), `PassifDetailsDialog.tsx:30-32` (légèrement différent), et `EMPRUNT_NATURES.includes(nature)` — synchronisées aujourd'hui seulement parce que l'UI restreint les natures proposées ; un futur déplacement d'une nature entre les deux listes pourrait dupliquer un enregistrement dans la mauvaise table au lieu de le mettre à jour.
  - **P34 — Quotités d'assurance non bornées à la saisie** — *mineur, nouveau*. `min="0" max="100"` seulement en HTML (`PassifEmpruntForm.tsx:222-241`), aucune contrainte Zod (`passifEmpruntSchema.ts:25-26`) ; `PassifDetailsDialog.tsx:132,138` affiche la valeur brute non clampée.
  - **P36 — `console.error` inconditionnel (RGPD)** — *mineur, nouveau*. [useErrorHandler.ts:9](src/hooks/useErrorHandler.ts:9), appelé par tous les CRUD de `usePassifs.ts`, sans garde `import.meta.env.DEV`.
  - **P37 — `handleSubmit` sans `catch`** — *mineur, nouveau*. `usePassifEmpruntForm.ts:212-278` : si `createEmprunt`/`updateEmprunt`/`createPassif`/`updatePassif` rejettent, l'erreur remonte non interceptée (rejection de promesse non gérée).
  - **P35 — Champs dormants** — *mineur*. `reporter_budget` (persisté, jamais lu par le Budget malgré son nom et sa description UI « sera ajoutée automatiquement aux charges du budget mensuel ») ; `taux_interet` et `type_garantie` en affichage seul, sans moteur de calcul associé.

- **Liens/navigation testés** : « Ajouter un passif/emprunt » → formulaire dynamique (bascule
  Emprunt/Passif selon la nature choisie) ; lien vers un actif existant fonctionnel (préremplissage
  détenteur confirmé) ; soumission effective en base (vérifié directement en SQL) mais **liste non
  rafraîchie tant que l'onglet n'est pas quitté puis rouvert** (P28) ; fiche détail accessible au clic
  sur la ligne, contenu incomplet (P31) ; menu « … » (Modifier/Supprimer) présent.

---

## Sous-section 4 — Plus-values (détail, `PatrimoinePlusValues.tsx`)

- **Objectif métier** : vue détaillée de la plus/moins-value latente de chaque actif (valeur estimée
  − valeur d'acquisition) et estimation de la fiscalité applicable selon la nature de l'actif et sa
  durée de détention.

- **Inputs** : aucun — vue 100 % dérivée (un seul `Tooltip` informatif sur `regime.note`).

- **Dynamiques** : trois sections statiques, sans onglet ni filtre (pas de sélecteur de
  date/catégorie/durée) — cartes résumé, tableau détail par actif + panneau par catégorie, section
  fiscalité. Dispatch fiscal (pour les actifs à plus-value **positive uniquement**,
  [PatrimoinePlusValues.tsx:272](src/components/patrimoine/PatrimoinePlusValues.tsx:272)) :
  résolution de la nature effective (`resolveEffectiveNature`, gère le cas CTO multi-actifs) puis
  `computePVIRegime(...) ?? computeFiscalRegime(...)`. Résidence principale → exonération totale sans
  condition de durée ([regimeFiscalPVI.ts:99-108](src/lib/patrimoine/regimeFiscalPVI.ts:99)) ;
  abattement IR (0 % avant 6 ans, 6 %/an de la 6ᵉ à la 21ᵉ, 100 % à 22 ans) et PS (0 % avant 6 ans,
  1,65 %/an jusqu'à la 21ᵉ, +1,6 % à la 22ᵉ, +9 %/an de la 23ᵉ à la 30ᵉ, 100 % à 30 ans) — **seuils
  légaux vérifiés conformes**, aucun écart constaté.

  **Confirmé en navigation** : « Maison Bordeaux » (résidence principale, +105 000 €) → régime affiché
  « Résidence principale — exonérée », IR = 0 €, PS = 0 €, Total = 0 € — cohérent avec le calcul
  attendu.

- **Bugs trouvés** :
  - **P2 — `calculatePlusValue` traite une valeur `null` comme une donnée valide** — *gênant, nouveau*. Le garde-fou [utils.ts:167](src/lib/patrimoine/utils.ts:167) teste `valeurAcquisition === undefined`, mais `valeur_acquisition` est optionnel dans le schéma et `assetService.getAssets()` (`select('*')` brut, sans normalisation) renvoie une colonne non renseignée comme `null` en JS — `null !== undefined`, donc l'arithmétique `valeurEstimee - null - frais` coerce `null` en `0`. Un actif dont la valeur d'acquisition n'a jamais été saisie affiche une plus-value ≈ 100 % de sa valeur estimée au lieu d'un message « à renseigner ». Repérable en table par une colonne « % » à 0,0 % à côté d'une colonne « +/- Value » élevée.
  - **P3 — Unité incohérente dans la carte « Dont IR exonéré »** — *gênant, nouveau*. [PatrimoinePlusValues.tsx:293-295](src/components/patrimoine/PatrimoinePlusValues.tsx:293) additionne la plus-value **brute** (l'assiette) des actifs en régime `exonere_partiel`, alors que la carte voisine « Fiscalité estimée » (`:310-315`) affiche un montant d'**impôt réel**. Pour ces actifs, l'impôt réellement dû est `plusValue × 18,6 %` (PS seuls), soit ~5,4 fois moins — la carte « Dont » peut afficher un montant supérieur au total dont elle est censée être un sous-ensemble.
  - **P12** (« -0 € » sur les moins-values nulles) — voir Sous-section 1, reproduit également sur cette vue ([PatrimoinePlusValues.tsx:67](src/components/patrimoine/PatrimoinePlusValues.tsx:67)).
  - **P4** (fraction de démembrement non appliquée) — la même absence de lecture de `mode_detention` touche le tableau détail de cette vue (recherche exhaustive : aucune lecture de `mode_detention` dans `PatrimoinePlusValues.tsx`).

- **Liens/navigation testés** : navigation Résumé → Plus-values → Retour au résumé testée deux fois,
  fonctionnelle sans erreur console ; aucun filtre/onglet interne à tester (aucun n'existe).

---

## Synthèse

### Bugs bloquants
| # | Résumé | Fichiers |
|---|---|---|
| **P13** | `qualification_bien` stocké en base pour un actif n'est jamais réactualisé automatiquement (recalcul « live » seulement dans la fiche détail) — succession/DMTG peuvent travailler sur une qualification obsolète après un changement de régime matrimonial. | `useAssetForm.ts:196-234`, `AssetDetailsDialog.tsx:89-113`, `succession.ts`, `avantagesMatrimoniaux.ts` |
| **P14** | Les pourcentages de co-indivision (`asset_indivisaires.pourcentage`) ne sont jamais lus par le moteur de succession, qui retombe sur 50/50 par défaut pour tout bien en indivision. | `succession.ts:65-70`, `AssetForm.tsx:433-469`, `useAssetForm.ts:141-153` |
| **P28** | Un emprunt/passif créé avec succès (toast + écriture DB confirmée) n'apparaît pas dans la liste tant que l'onglet Passifs n'est pas rechargé — deux instances indépendantes du hook `useEmprunts`/`usePassifs`. | `usePassifEmpruntForm.ts:27-28`, `usePassifs.ts`, `PatrimoinePassifs.tsx:23-24` |
| **P29** | Un emprunt/passif lié à une société est compté deux fois dans le patrimoine personnel (KPI Résumé, alertes, donut) alors que le module Transmission l'exclut correctement. | `usePatrimoineCalculations.ts:78-79`, `useAlertesConseil.ts:41`, `PatrimoineChart.tsx:58`, `transmissionHelpers.ts:715` |
| **P30** | Un passif « Bien propre »/« Bien personnel » est toujours déduit à 100 % dans le moteur Transmission quel que soit son détenteur réel — divergence avec le module Patrimoine qui pondère correctement. | `avantagesMatrimoniaux.ts:211-222`, `transmissionHelpers.ts:665-668`, `usePatrimoineCalculations.ts:132-171` |
| P22 | `mode_detention = 'Nue-propriété'` écrase silencieusement `origine_actif`, faussant la qualification civile d'une nue-propriété acquise à titre onéreux (gravité conditionnée à la fréquence réelle de ce cas d'usage). | `useAssetForm.ts:260-263` |
| P4 | La fraction de démembrement (usufruit/nue-propriété) n'est jamais appliquée aux totaux du Résumé/Plus-values — surestimation systématique du patrimoine net pour tout bien démembré (gravité conditionnée à la présence de biens démembrés). | `usePatrimoineCalculations.ts:76-82,93-200`, `PatrimoineChart.tsx:31-72` |

### Bugs gênants
| # | Résumé |
|---|---|
| P1 | Le bandeau « éléments non qualifiés, exclus des totaux » ne correspond pas aux totaux réellement affichés (3 calculs indépendants du même agrégat). |
| P31 | La fiche détail d'un passif/emprunt n'affiche ni détenteur, ni qualification, ni contributeur au remboursement, ni statut d'assurance. |
| P32 | Trois implémentations indépendantes du discriminant emprunt/passif — risque latent de duplication en base si les listes de natures évoluent. |
| P33 | Aucun contrôle utilisateur sur la qualification civile d'un passif/emprunt, contrairement aux actifs. |
| P2 | `calculatePlusValue` traite une valeur d'acquisition non renseignée (`null`) comme `0`, affichant une plus-value quasi égale à 100 % de la valeur estimée au lieu d'un message « à renseigner ». |
| P3 | La carte « Dont IR exonéré » additionne une assiette brute au lieu d'un impôt réel — peut dépasser le total dont elle est censée être une sous-partie. |
| P15 | Les charges d'actif en unité « % » sont traitées comme des montants en euros dans le calcul du Budget. |
| P17 | Impossible de saisir explicitement `0` dans les principaux champs monétaires du formulaire Actif (`parseFloat(...) || undefined`). |
| P20 | Gestion d'erreur silencieuse récurrente (catch vide, toast conditionnel incomplet) dans le module Actifs. |
| P21 | `console.error` actifs en production sans garde `import.meta.env.DEV` (non-conformité RGPD `CLAUDE.md`), objets d'erreur potentiellement sensibles. |

### Bugs mineurs
P5 (code mort : `PatrimoineParTeteDetail.tsx` jamais monté), P6 (`selectedCategory` mort),
P7/P8/P10 (duplications de logique/constantes entre composants et `lib/patrimoine/utils.ts`),
P9 (gestion d'erreur incohérente Résumé), P11 (repli incohérent à `totalValue` ≤ 0),
P12 (affichage « -0 € » sur moins-values nulles, Résumé et Plus-values), P16 (`duree_type`
« Pendant années » inaccessible depuis l'UI), P18 (aucune borne min/max sur les montants
principaux d'un actif), P19 (pourcentages user/conjoint sans borne Zod), P23 (typage
`sous_type_per` neutralisé par une union avec `string`), P24 (bandeau d'incomplétude ne couvre
pas démembrement/indivision), P26 (warning React répété « Invalid prop … React.Fragment » dans
l'onglet Actifs), P27 (3 tables filles de `assets` sans FK `user_id → auth.users`, cascade
assurée transitivement), P34 (quotités d'assurance non bornées à 100 à la saisie), P36
(`console.error` inconditionnel dans `useErrorHandler.ts`, appelé par tout le module Passifs),
P37 (`handleSubmit` de `usePassifEmpruntForm` sans `catch`).

### Cases dormantes (nouvelles)
Champs saisissables dans l'interface **et jamais lus par aucun moteur ni affichage** en dehors du
formulaire qui les a saisis :

- **`assets`** : `situation_particuliere`, `attachement_emotionnel`, `sous_type_per`, `bien_etranger`
  (attendu — Phase D non construite), `part_licitation_personnelle`/`licitation_acquereur`
  (déclaratifs, jamais injectés dans `qualifierBien()`), `financement_actif`,
  `financement_duree_mois`, `financement_apport`, `financement_taux_credit`,
  `financement_taux_assurance` (aucun échéancier ni impact budget trouvé).
- **`asset_charges`** : `unite` en pratique dormante côté Budget (non sélectionnée par la requête,
  voir P15) ; `duree_type: 'Pendant années'` et `duree_annees` totalement inaccessibles depuis l'UI
  (P16).
- **`asset_demembrements` / `asset_indivisaires`** : les champs de contexte (`type_partie`,
  `nom_libre`, `date_naissance_tiers` / `type_indivisaire`) sont purement informatifs, déconnectés
  du moteur DMTG/succession ; `asset_indivisaires.pourcentage` est la plus coûteuse (P14, bloquant).
- **`emprunts`** : `reporter_budget` (persisté, jamais lu par le Budget), `taux_interet` et
  `type_garantie` (affichage seul, aucun moteur de calcul).

Les plus coûteuses métier : **`asset_indivisaires.pourcentage`** (impact succession direct, P14),
**`financement_*`** (aucun échéancier de crédit immobilier malgré la saisie complète du plan de
financement), **`reporter_budget`** (le libellé promet un report automatique en Budget qui n'existe
pas).

### Dette déjà connue confirmée
- **Aucun `TODO` / `FIXME` / `HACK`** trouvé dans l'intégralité du périmètre Patrimoine (Résumé,
  Actifs, Passifs, Plus-values) — tous les constats ci-dessus sont des découvertes nouvelles, non
  documentées comme dette connue.
- Le pattern « logique métier centralisée en fonctions pures » demandé par `CLAUDE.md` (calqué sur
  `lib/ifi/`) est globalement respecté dans `lib/patrimoine/` (`succession.ts`, `qualification.ts`,
  `avantagesMatrimoniaux.ts`, `regimeFiscalPVI.ts`, `regimeFiscalPlusValue.ts`) — les entorses
  relevées (P7, P10) sont ponctuelles, pas structurelles.
- Un commentaire de code fait explicitement référence à un **incident daté du 2026-07-18** sur la
  réinitialisation de « Le couple » quand la qualification devient incompatible
  (`useAssetForm.ts:277-288`, `usePassifEmpruntForm.ts:199-210`) — c'est la seule dette « documentée »
  retrouvée dans le périmètre, et elle est correctement corrigée des deux côtés (Actifs et Passifs)
  d'après la lecture du code.

### Reste à faire
- Le module **Immobilier** (champs « immobilier étendu » de la table `assets`, hors périmètre de cet
  audit) mériterait un audit dédié : plusieurs bugs relevés ici (P15, P18, dormance des champs
  `financement_*`) ont leur source ou leur pendant dans ce module.
- Le module **Sociétés** (traitement de `emprunts.societe_id`, P29) et le module **Transmission**
  (P30, moteur `transmissionHelpers.ts`) partagent des données avec Patrimoine sans miroir de
  cohérence systématique — un audit croisé Patrimoine ↔ Transmission ↔ Sociétés permettrait de
  vérifier si d'autres agrégats divergent de la même façon.
