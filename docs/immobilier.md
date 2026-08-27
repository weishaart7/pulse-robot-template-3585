# Module Immobilier

> Audit de fond produit le 2026-08-27, **de zéro** (aucun audit préexistant pour ce module,
> contrairement à Famille/Patrimoine/Retraite/Transmission qui fusionnaient des documents antérieurs).
> Méthode : lecture intégrale de chaque fichier du périmètre déclaré, plus les fichiers liés
> découverts en cours de route (`useImmobilierPropertyForm.ts`, `PropertyFinancingSection.tsx`,
> `services/assetService.ts`), lecture du schéma réel en base via le MCP Supabase
> (`list_tables`/`execute_sql`/`get_advisors` sur le projet `npypkocowjkszxtecxzq`), et
> `git log --oneline` sur les fichiers du périmètre. Toutes les valeurs citées comme « en base » (FK,
> RLS, comptages) ont été vérifiées par requête directe le 2026-08-27, pas déduites des seuls types
> TypeScript générés. Périmètre couvert : les 14 fichiers listés dans la commande de travail, plus
> `src/hooks/useImmobilierPropertyForm.ts`, `src/services/assetService.ts` (méthodes consommées par ce
> module) et `src/lib/patrimoine/societeTransfer.ts` (mécanisme analogue de bascule).

## 1. Vue d'ensemble

Le module Immobilier ne saisit pas d'actifs : il **republie** les actifs de nature immobilière déjà
créés dans Patrimoine (`assets`, cf. `docs/patrimoine.md`) dès que l'utilisateur coche « Transfert dans
Immobilier » (`transfert_immobilier = true`) dans `AssetForm`, et ajoute une couche de gestion
spécifique : détail des coûts d'acquisition, financement déclaratif, type/régime de location, et pour
les biens meublés, un calculateur d'amortissement LMNP/LMP avec revenus et charges dédiés.

**Écrans** (`ImmobilierSection.tsx`, 3 onglets) :

| Onglet | Composant | Rôle |
|---|---|---|
| Vue d'ensemble (par défaut) | [ImmobilierOverview.tsx](src/components/immobilier/ImmobilierOverview.tsx) | KPI de portefeuille : nombre de biens, valeur totale, rentabilité brute/nette, cashflow mensuel, plus-value brute |
| Mes biens | `ImmobilierSection.tsx` (cartes ou tableau) → [ImmobilierPropertyDetailView.tsx](src/components/immobilier/ImmobilierPropertyDetailView.tsx) ou [LMNPDetailView.tsx](src/components/immobilier/lmnp/LMNPDetailView.tsx) | Liste des biens transférés ; clic → fiche détail (infos générales/coûts/financement/location) ou vue LMNP dédiée si le bien est meublé |
| Revenus (gestion des biens) | — | **Écran non implémenté** (« Section à venir »), alors que la gestion des revenus/charges existe déjà par bien via « Gérer » (§4) |

Accessible aussi depuis « Mes biens » : [ImmobilierGestionDialog.tsx](src/components/immobilier/ImmobilierGestionDialog.tsx)
(bouton « Gérer », non-LMNP) — CRUD des revenus/charges du bien et bascule « Transfert dans budget ».

**Tables Supabase consommées** : `assets` (colonnes « immobilier étendu », partagées avec Patrimoine),
`asset_charges`, `asset_revenus`.

**Flux clés** :
- Un bien devient visible ici uniquement si `nature` fait partie de `ASSET_CATEGORIES['actifs
  immobiliers']` (18 natures, `src/constants/assetTypes.ts:183-201`) **et** `transfert_immobilier =
  true` — [useImmobilierAssets.ts](src/hooks/useImmobilierAssets.ts:23-29).
- Selon la nature, la fiche détail bascule vers l'un de trois comportements : formulaire générique
  (résidences : `isResidenceType`), formulaire enrichi financement/location (biens locatifs non
  meublés : `isRentalPropertyType`), ou vue LMNP dédiée avec amortissement (`MEUBLE_NATURES` = LMNP et
  LMP) — routage fait indépendamment à trois endroits différents (§2).
- Le formulaire générique (`useImmobilierPropertyForm.ts`) écrit directement dans `assets` par
  `update`, sans passer par `assetService`.
- La vue LMNP calcule un « résultat fiscal » (revenus − charges − amortissements) affiché en temps
  réel, avec auto-sauvegarde debattue à 1,5 s sur les champs saisis.
- Le bouton « Transfert dans budget » (checkbox par bien) bascule `impact_budget` sur **toutes** les
  lignes `asset_revenus`/`asset_charges` du bien d'un coup ; les nouveaux revenus/charges créés
  pendant que le bien est en mode « transfert actif » héritent du flag via un second appel bulk après
  création (pas d'insertion directe avec le bon flag dans `ImmobilierGestionDialog`, à la différence de
  `LMNPDetailView` qui le passe en prop dès la création).

## 2. Architecture & décisions

- **Pas de `src/lib/immobilier/` — confirmé.** Toute la logique de calcul (annualisation
  revenus/charges, rentabilité, cashflow, plus-value brute, amortissement LMNP par composant) vit
  directement dans les composants React : [ImmobilierOverview.tsx](src/components/immobilier/ImmobilierOverview.tsx:43-155)
  et [LMNPDetailView.tsx](src/components/immobilier/lmnp/LMNPDetailView.tsx:40-91,213-229). C'est un
  écart net par rapport au pattern `lib/ifi/`/`lib/patrimoine/` demandé par `CLAUDE.md` pour toute
  logique métier non triviale — contrairement à Patrimoine où `qualifierBien`, `getPartSuccessorale`,
  `regimeFiscalPlusValue` sont des fonctions pures testables en dehors du JSX, le calcul
  d'amortissement LMNP (`computeAmortissement`, 40 lignes de règles fiscales avec durées et
  quotes-parts réglementaires) est une fonction imbriquée dans le fichier du composant, non testée,
  non réutilisable, et dupliquée en esprit (même logique d'annualisation réimplémentée différemment
  dans `ImmobilierOverview.tsx`, cf. §3). C'est le point de dette architecturale le plus structurant du
  module.

- **Aucun fichier de service dédié pour le formulaire propriété.** `useImmobilierPropertyForm.ts` et
  `LMNPDetailView.tsx` écrivent tous deux directement sur `supabase.from('assets').update(...)`,
  contournant `assetService.updateAsset` — qui, lui, vérifie explicitement la propriété de l'actif
  avant d'écrire ([assetService.ts:152-177](src/services/assetService.ts:152-177)). Les deux chemins
  d'écriture Immobilier n'ont donc pas ce garde-fou applicatif (RLS toujours en place en dernier
  recours, cf. §3).

- **Routage par nature dupliqué trois fois, avec des listes divergentes.** La notion de « bien
  locatif » (par opposition à résidence ou à un bien sans gestion possible) existe sous trois formes
  indépendantes :
  1. `RENTAL_PROPERTY_TYPES` (6 natures) — [immobilierPropertySchema.ts:32-39](src/schemas/immobilierPropertySchema.ts:32-39),
     utilisée par `isRentalPropertyType()` pour activer les sections Financement/Location du formulaire.
  2. Une liste littérale de 4 natures dupliquée **deux fois à l'identique** dans
     [ImmobilierSection.tsx:216](src/components/immobilier/ImmobilierSection.tsx:216) et
     [ImmobilierSection.tsx:261](src/components/immobilier/ImmobilierSection.tsx:261), qui conditionne
     l'affichage du bouton « Gérer » (accès aux revenus/charges).
  3. `RENTAL_PROPERTY_TYPES.slice(0, 4)` — [ImmobilierOverview.tsx:38](src/components/immobilier/ImmobilierOverview.tsx:38),
     qui définit quels biens comptent comme « locatifs » pour le cashflow mensuel.
  Les trois se recoupent aujourd'hui (les 4 premiers éléments de la liste à 6 sont les mêmes que la
  liste dupliquée), mais rien ne les synchronise : ajouter une 7ᵉ nature locative, ou réordonner
  `RENTAL_PROPERTY_TYPES`, casse silencieusement soit le bouton « Gérer », soit le calcul de
  rentabilité, sans erreur visible. Deux natures déclarées locatives par (1) — « Autres immeubles de
  rapport », « Parking / Garage / Box » — n'ont **jamais** de bouton « Gérer » : leurs revenus/charges
  sont saisissables nulle part dans l'UI Immobilier.

- **Meublé (LMNP/LMP) routé indépendamment, via une troisième liste.** `MEUBLE_NATURES` dans
  `ImmobilierSection.tsx:16-19` (2 natures) décide si un clic sur une carte ouvre
  `LMNPDetailView` ou `ImmobilierPropertyDetailView` — logique dupliquée dans `handleManageInfo` et
  `handleGestion` (mêmes deux fonctions, même test `isMeuble`, appelé à 4 endroits du fichier).

- **LMNP et LMP partagent le même moteur d'amortissement sans distinction.** `LMNPDetailView`
  s'applique identiquement aux natures « Immeubles locatifs (LMNP) » et « (LMP) » — aucun champ ne
  distingue les deux dans le calcul (`computeAmortissement`, résultat fiscal). Sur le plan fiscal réel,
  LMNP et LMP divergent significativement en aval (cotisations sociales SSI pour le LMP, imputation du
  déficit sur le revenu global sous conditions au lieu d'un report cantonné, régime des plus-values
  professionnelles) — non traité ici, cf. §3/§4.

- **`ImmobilierPropertyDialog.tsx` : code mort.** Composant strictement équivalent à
  `ImmobilierPropertyDetailView.tsx` (même hook, mêmes sections, dans une `Dialog` au lieu d'une page
  pleine largeur) mais **jamais importé nulle part** (`grep` sur tout `src/` ne remonte que sa propre
  définition). `ImmobilierSection.tsx` n'utilise que la vue détail plein écran.

- **Frais de notaire auto-calculés à 7,5 %, dupliqué à l'identique dans deux fichiers.** Le même
  `useEffect` (`form.watch` sur `montant_immeuble` → `setValue('frais_notaire', montant * 0.075)`)
  existe à la fois dans [useImmobilierPropertyForm.ts:39-49](src/hooks/useImmobilierPropertyForm.ts:39-49)
  et dans [PropertyCostSection.tsx:20-30](src/components/immobilier/property/PropertyCostSection.tsx:20-30),
  sur la même instance de formulaire — deux abonnements indépendants déclenchant le même `setValue` à
  chaque frappe (sans effet visible autre que la redondance, `setValue` étant idempotent).

- **Immobilier ↔ Sociétés : recouvrement possible, non arbitré.** `isImmobilier` (catégorie
  `'actifs immobiliers'`) et `isSocieteEligibleNature` (dont « Parts de SCI ») ne sont pas exclusifs
  dans `AssetForm.tsx:95-96` : pour un actif « Parts de SCI », les deux cases « Transfert dans
  Immobilier » et « Transfert dans Sociétés » sont proposées simultanément et peuvent être cochées
  ensemble, sans garde-fou ni message. **Vérifié en base** : sur 8 actifs avec `transfert_immobilier =
  true`, **4 ont aussi `transfert_societe = true`**. Le même bien apparaît donc à la fois dans
  Immobilier → Mes biens et dans Sociétés → Mes sociétés, avec potentiellement deux valorisations
  gérées indépendamment (`valeur_estimee` ici, valorisation société ailleurs) sans lien affiché à
  l'utilisateur entre les deux fiches. Le mécanisme analogue documenté dans
  [societeTransfer.ts](src/lib/patrimoine/societeTransfer.ts) ne traite que le sens Patrimoine→Sociétés
  et ne connaît pas Immobilier.

- **RLS en base, vérifiée directement.** `asset_charges`/`asset_revenus` ont des policies RLS
  (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) qui vérifient toutes la propriété via une jointure sur
  `assets.user_id = auth.uid()`. FK confirmées : `asset_charges.asset_id` et `asset_revenus.asset_id`
  → `assets(id) ON DELETE CASCADE` ; `assets.user_id` → `auth.users(id) ON DELETE CASCADE` — conforme
  à la règle `CLAUDE.md`. Contrairement au durcissement « défense en profondeur » appliqué à
  `assetService` pour Patrimoine (commit `ea3a695`, filtre applicatif `user_id` ajouté en plus des
  RLS), `assetService.getAssetCharges`/`getAssetRevenus` — les deux méthodes que consomme tout
  l'écran Immobilier (`ImmobilierOverview`, `ImmobilierGestionDialog`, `LMNPDetailView`) — reposent
  **uniquement** sur les RLS, sans filtre `user_id` applicatif ([assetService.ts:203-212](src/services/assetService.ts:203-212),
  [:296-305](src/services/assetService.ts:296-305)). Le risque réel est faible (les RLS sont correctes
  et vérifiées), mais c'est une incohérence de méthode avec le reste du durcissement déjà fait ailleurs.

## 3. Dette identifiée

### 🔴 Bloquant (peut fausser un calcul montré au client)

- **Les composants du tableau d'amortissement LMNP ne totalisent que 80 % de la valeur du bâtiment,
  pas 100 %.** [LMNPDetailView.tsx:71-77](src/components/immobilier/lmnp/LMNPDetailView.tsx:71-77) :
  les quotes-parts déclarées (Aménagements intérieurs 18 %, Étanchéité 7 %, Toiture 8 %, Installations
  électriques 6 %, Gros œuvre 41 %) totalisent **80 %**, pas 100 %. 20 % de la valeur amortissable du
  bâtiment n'est donc jamais réparti sur aucun composant ni amorti : l'amortissement annuel total
  affiché est sous-évalué d'environ 20 % (sur la part bâtiment), donc le « Résultat fiscal » LMNP
  affiché au client est **surévalué** d'autant — un déficit réel peut être affiché comme un résultat
  positif imposable, ou un résultat positif comme plus élevé qu'il ne l'est réellement. Aucune source
  ni commentaire dans le code ne justifie ces pourcentages ni l'écart à 100 %.

- **Aucun plafonnement de l'amortissement déductible au niveau du résultat.** Le résultat fiscal LMNP
  réel obéit à une règle spécifique (CGI, mécanisme dit du plafonnement des amortissements LMNP) : les
  amortissements ne peuvent pas créer ni aggraver un déficit — seul l'excédent est reporté sans limite
  de durée, alors que le résultat de l'exercice s'arrête à 0. `resultatFiscal =
  totalRevenusAnnuel - totalChargesAnnuel - totalAmortissementAnnuel`
  ([LMNPDetailView.tsx:229](src/components/immobilier/lmnp/LMNPDetailView.tsx:229)) est calculé sans
  ce plafond et peut donc apparaître négatif alors que le résultat réel de l'année serait nul avec un
  simple report d'amortissement — le badge « Déficit reportable » affiché en cas de résultat ≤ 0
  ([LMNPDetailView.tsx:632-636](src/components/immobilier/lmnp/LMNPDetailView.tsx:632-636)) ne
  distingue pas un déficit provenant des charges (imputable selon d'autres règles) d'un excédent
  d'amortissement (report spécifique). *(Point établi à partir de la règle générale du régime réel
  LMNP telle que je la connais ; non revérifié contre une source officielle dans le cadre de cet audit
  — à confirmer avant tout redressement du calcul.)*

- **`regime_location` (Micro-BIC / BIC / Micro-foncier / Réel) est saisi mais n'a aucun effet sur le
  calcul affiché.** Le champ existe dans le formulaire ([PropertyLocationSection.tsx:68-89](src/components/immobilier/property/PropertyLocationSection.tsx:68-89))
  et est bien persisté par `useImmobilierPropertyForm.ts:75`, mais **aucun composant ne le lit** pour
  choisir entre un calcul micro-BIC (abattement forfaitaire de 50 %, ou 71 % pour le meublé de
  tourisme classé, sous plafond de recettes) et le régime réel : `LMNPDetailView` applique
  systématiquement la logique du régime réel (charges réelles + amortissement), quel que soit le
  régime sélectionné par ailleurs dans `ImmobilierPropertyDetailView`. Si un client au Micro-BIC est
  géré via la vue LMNP, le « résultat fiscal » affiché n'a aucun rapport avec l'assiette réelle
  (recettes − abattement forfaitaire). *(Vérifié en base : `regime_location` n'est renseigné sur
  aucun des actifs existants — `0` ligne — donc l'impact réel actuel est nul, mais le champ reste
  fonctionnellement un piège dès qu'il sera utilisé.)*

- **Une charge en périodicité « Trimestrielle » est comptée pour zéro dans les KPI de portefeuille.**
  [ImmobilierOverview.tsx:103-119](src/components/immobilier/ImmobilierOverview.tsx:103-119) : le
  test `periodicite === 'mensuelle' ? ×12 : periodicite === 'annuelle' ? ×1 : 0` ne connaît que deux
  valeurs ; toute charge dont la périodicité est `'trimestrielle'` (valeur pourtant proposée et
  persistée sans erreur par [ChargeForm.tsx](src/components/immobilier/ChargeForm.tsx:43-48) via
  `PERIODICITE_OPTIONS`) est silencieusement exclue à la fois de `totalChargesAnnuelles` et de
  `totalChargesMensuelles` — la rentabilité nette et le cashflow mensuel affichés sont donc surévalués
  dès qu'une charge trimestrielle existe sur un bien.

- **Une charge ou un revenu en périodicité « Semestrielle » est compté comme si le montant saisi
  était déjà annuel (sous-évaluation de moitié).** `PERIODICITE_OPTIONS` propose « Semestrielle »
  ([immobilierPropertySchema.ts:77-82](src/schemas/immobilierPropertySchema.ts:77-82)) pour les
  revenus (`RevenuForm.tsx`) comme pour les charges. Le propre aperçu « impact mensuel » de
  `RevenuForm.tsx:36-46` divise correctement par 6 pour ce cas — mais aucun agrégat en aval ne fait de
  même : ni `ImmobilierOverview.tsx:87-96` (revenus : seule « Mensuelle » est multipliée, tout le reste
  — dont Semestrielle et Trimestrielle — est ajouté tel quel), ni
  `LMNPDetailView.tsx:218-227` (revenus : Mensuelle ×12, Trimestrielle ×4, tout le reste — dont
  Semestrielle — ajouté tel quel), ni les mêmes fichiers côté charges. Un loyer ou une charge saisi en
  Semestrielle est donc compté pour la moitié de sa vraie valeur annuelle dans tous les totaux
  affichés (rentabilité, cashflow, résultat fiscal LMNP), et un revenu Trimestrielle marqué comme
  impactant le budget dans `ImmobilierOverview` (`totalRevenusMensuels += montant / 12` au lieu de
  `/ 3`, [ImmobilierOverview.tsx:92-97](src/components/immobilier/ImmobilierOverview.tsx:92-97)) est
  sous-évalué d'un facteur 4 dans le cashflow mensuel.

- **`useImmobilierPropertyForm.ts` transforme silencieusement un `0` saisi en `null` à la
  sauvegarde.** `handleSubmit` construit `updateData` avec le pattern `data.champ || null` pour tous
  les champs numériques ([useImmobilierPropertyForm.ts:56-76](src/hooks/useImmobilierPropertyForm.ts:56-76)) :
  `0` étant falsy en JS, une valeur `0` correctement saisie (ex. `valeur_estimee` d'un bien totalement
  dévalorisé, `frais_agence` nul car agence non utilisée) est écrite en base comme `null`
  (« non renseigné ») au lieu de `0`. Même défaut que celui déjà documenté côté Patrimoine
  (`docs/patrimoine.md` §3), mais ici au niveau de la fonction de soumission plutôt que du handler de
  saisie — les champs de saisie eux-mêmes (`PropertyCostSection.tsx`, `PropertyGeneralSection.tsx`)
  utilisent, eux, le pattern correct `e.target.value ? parseFloat(...) : ''` qui préserve `0`
  jusqu'à la sauvegarde, où il est reperdu.

### 🟠 À surveiller (cas limite, peu probable)

- **Un même actif « Parts de SCI » peut être transféré à la fois vers Immobilier et vers Sociétés**,
  sans exclusion mutuelle dans `AssetForm.tsx` ni message d'avertissement — confirmé sur 4 lignes
  réelles en base (cf. §2). Le bien peut alors afficher deux valorisations/gestions indépendantes sans
  lien visible entre les deux modules.
- **LMNP et LMP appliquent le même calcul d'amortissement et le même affichage de résultat**, alors
  que les régimes divergent en aval (cotisations sociales, imputation du déficit, plus-value
  professionnelle) — approximation plausible pour une V1, mais non signalée à l'utilisateur.
- **Deux natures déclarées « locatives » par `RENTAL_PROPERTY_TYPES` (Autres immeubles de rapport,
  Parking / Garage / Box) n'ont aucun accès UI aux revenus/charges** (bouton « Gérer » absent, liste
  locale hardcodée limitée à 4 natures) alors que leur fiche détail active les sections
  Financement/Location comme n'importe quel bien locatif — incohérence silencieuse entre ce que le
  formulaire propose et ce que l'écran liste permet de gérer ensuite.
- **`assetService.getAssetCharges`/`getAssetRevenus` sans filtre `user_id` applicatif**, à la
  différence du reste du durcissement « défense en profondeur » de Patrimoine (commit `ea3a695`) —
  couvert par les RLS, qui sont correctes, mais incohérent avec la méthode appliquée ailleurs.
- **`ImmobilierGestionDialog` ne préremplit pas le choix « Impact sur le budget » du formulaire de
  création** avec l'état courant du bien (contrairement à `LMNPDetailView`, qui passe `impactBudget`
  en prop) — la case démarre décochée dans le dialogue de création même si le bien a déjà le transfert
  budget actif ; corrigé après coup par l'appel bulk du `onSuccess`, donc sans conséquence sur la
  donnée finale, seulement sur l'affichage transitoire du formulaire.

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **Code mort : `ImmobilierPropertyDialog.tsx`** — composant complet, jamais importé, strictement
  redondant avec `ImmobilierPropertyDetailView.tsx`.
- **Onglet « Gestion des biens » / « Revenus locatifs » non implémenté** (« Section à venir »,
  `ImmobilierSection.tsx:281-300`), alors que la fonctionnalité existe déjà par bien via « Gérer » —
  écran orphelin, à supprimer ou à raccorder.
- **Trois listes indépendantes de « natures locatives »** (`RENTAL_PROPERTY_TYPES`, la liste dupliquée
  deux fois dans `ImmobilierSection.tsx`, et `RENTAL_PROPERTY_TYPES.slice(0, 4)`), synchronisées
  aujourd'hui seulement par coïncidence d'ordre — cf. §2.
- **Auto-calcul des frais de notaire (7,5 %) dupliqué à l'identique** dans
  `useImmobilierPropertyForm.ts` et `PropertyCostSection.tsx`, sur la même instance de formulaire.
- **`console.error` non gardé par `import.meta.env.DEV`** — deux occurrences :
  [ImmobilierOverview.tsx:148](src/components/immobilier/ImmobilierOverview.tsx:148) et
  [RevenuForm.tsx:87](src/components/immobilier/RevenuForm.tsx:87). Non-conformité à la règle
  `CLAUDE.md` (« pas de `console.log` actif en production »), déjà corrigée ailleurs dans le
  périmètre Patrimoine par le commit `ea3a695`, mais pas étendue à ces deux fichiers Immobilier.
- **`ChargeForm.tsx` fait taire silencieusement l'option « Semestrielle » côté charges** en la
  mappant sur `'annuelle'` sans redoublement du montant (`periodiciteMap`,
  [ChargeForm.tsx:43-48](src/components/immobilier/ChargeForm.tsx:43-48), commentaire `// fallback`
  dans le code lui-même) — le code reconnaît l'approximation mais elle produit le même sous-comptage
  que documenté en 🔴 ci-dessus pour les revenus.
- **`useImmobilierPropertyForm.ts`/`LMNPDetailView.tsx` écrivent directement sur `supabase.from
  ('assets')`** au lieu de passer par `assetService.updateAsset`, perdant le contrôle de propriété
  applicatif que ce dernier effectue avant écriture (RLS reste le filet de sécurité).
- Logique de calcul (amortissement, annualisation) mêlée au JSX plutôt qu'isolée dans un
  `lib/immobilier/`, cf. §2 — classé ici comme point de refactor plutôt que comme bug, faute d'un
  calcul erroné imputable directement à cette structure (les bugs listés en 🔴 auraient été possibles
  même avec une extraction en fonctions pures ; l'extraction aurait surtout facilité leur détection
  par des tests).

## 4. Périmètre V1 / différé

- **V1 — en place** : bascule d'un actif Patrimoine vers Immobilier par simple case à cocher, fiche
  détail par bien (général/coûts/financement/type de location pour les biens locatifs), gestion des
  revenus/charges par bien avec bascule d'impact sur le Budget, vue dédiée LMNP/LMP avec calcul
  d'amortissement par composant et résultat fiscal simplifié, KPI de portefeuille (valeur totale,
  rentabilité brute/nette, cashflow, plus-value brute).
- **Différé, déductible du code** :
  - **Location nue (foncier réel/micro-foncier)** : aucun moteur de calcul dédié comparable à
    `LMNPDetailView` — seuls le suivi des coûts et des revenus/charges bruts existent ; pas de calcul
    d'assiette foncière ni d'IR/PS.
  - **Terrains, Bois & forêts, Parts de SCPI/GFA/GFV/GFR, Maison mobile, Autres biens d'usage** : ces
    natures apparaissent dans « Mes biens » si transférées (elles appartiennent à
    `ASSET_CATEGORIES['actifs immobiliers']`), mais `isResidenceType`/`isRentalPropertyType` ne les
    couvrent pas — la fiche affiche explicitement « La gestion des informations pour cette catégorie
    sera disponible prochainement » (`ImmobilierPropertyDetailView.tsx:74-79`) : gap assumé et
    documenté par le message lui-même, pas un bug silencieux.
  - **Financement (`financement_*`) : saisi et persisté, mais consommé nulle part, y compris dans ce
    module.** Confirme l'hypothèse posée par `docs/patrimoine.md` (§2/§5, cases dormantes) : les 5
    champs `financement_actif`/`financement_duree_mois`/`financement_apport`/`financement_taux_credit`/
    `financement_taux_assurance` sont saisissables via
    [PropertyFinancingSection.tsx](src/components/immobilier/property/PropertyFinancingSection.tsx),
    persistés par `useImmobilierPropertyForm.ts:69-73`, mais **aucun échéancier de prêt, aucune
    mensualité, aucun impact sur le cashflow, la rentabilité ou le résultat fiscal LMNP ne les lit**
    nulle part dans `ImmobilierOverview.tsx` ni `LMNPDetailView.tsx`. Ce ne sont donc pas des champs
    dormants « côté Patrimoine seulement » : ils sont **dormants partout**, y compris dans le module
    dont ils dépendent fonctionnellement. Vérifié en base : `0` ligne avec `financement_actif = true`
    sur les données actuelles — cohérent avec un champ jamais réellement exploité en pratique.
  - **Distinction LMNP/LMP** dans le calcul lui-même : traités par le même moteur, écart documenté en
    §3 comme approximation plutôt que comme lacune assumée explicitement dans le code (aucun
    commentaire ne signale ce choix).
  - **`regime_location` (Micro-BIC/BIC/Micro-foncier/Réel)** : champ prévu par le schéma mais sans
    aucune branche de calcul qui le lit — à ce stade plus proche d'un chantier commencé (le champ et
    son UI existent) qu'un différé volontaire documenté.
- **Manque sans explication dans le code** : aucun commentaire ni TODO n'explique pourquoi
  `ImmobilierPropertyDialog.tsx` a été laissé en place après son remplacement apparent par
  `ImmobilierPropertyDetailView.tsx`, ni pourquoi l'onglet « Revenus locatifs »/« Gestion des biens »
  affiche un écran « à venir » alors que la fonctionnalité équivalente existe déjà par bien.
