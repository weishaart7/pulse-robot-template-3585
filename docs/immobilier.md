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
créés dans Patrimoine (`assets`, cf. `docs/patrimoine.md`) et ajoute une couche de gestion spécifique :
détail des coûts d'acquisition, financement déclaratif, type/régime de location, et pour les biens
meublés, un calculateur d'amortissement LMNP/LMP avec revenus et charges dédiés. Le transfert
(`transfert_immobilier = true`) est **automatique** dès que la nature appartient à
`ASSET_CATEGORIES['actifs immobiliers']` (calculé à la sauvegarde dans
`useAssetForm.ts::handleSubmit`, plus de case à cocher manuelle dans `AssetForm`) — à une exception
près : « Parts de SCI », seule nature à la fois immobilière et éligible au module Sociétés
(`SOCIETE_ELIGIBLE_NATURES`), garde un choix manuel exclusif entre « Transfert dans Immobilier » et
« Transfert dans Sociétés ».

**Écrans** (`ImmobilierSection.tsx`, 3 onglets) :

| Onglet | Composant | Rôle |
|---|---|---|
| Vue d'ensemble (par défaut) | [ImmobilierOverview.tsx](src/components/immobilier/ImmobilierOverview.tsx) | KPI de portefeuille : nombre de biens, valeur totale, rentabilité brute/nette, cashflow mensuel, plus-value brute |
| Mes biens | `ImmobilierSection.tsx` (cartes ou tableau) → [ImmobilierPropertyDetailView.tsx](src/components/immobilier/ImmobilierPropertyDetailView.tsx) ou [LMNPDetailView.tsx](src/components/immobilier/lmnp/LMNPDetailView.tsx) | Liste des biens transférés ; clic → fiche détail (infos générales/coûts/financement/location) ou vue LMNP dédiée si le bien est meublé |
| Revenus (gestion des biens) | — | **Écran non implémenté** (« Section à venir »), alors que la gestion des revenus/charges existe déjà par bien via « Gérer » (§4) |

Accessible aussi depuis « Mes biens » : [ImmobilierGestionDialog.tsx](src/components/immobilier/ImmobilierGestionDialog.tsx)
(bouton « Gérer », non-LMNP) — CRUD des revenus/charges du bien et bascule « Transfert dans budget ».

Pour la nature « Immeubles locatifs (loués nus) » spécifiquement, la fiche détail
([ImmobilierPropertyDetailView.tsx](src/components/immobilier/ImmobilierPropertyDetailView.tsx)) affiche
en plus une section **Simulateur de rentabilité**
([SimulateurRentabiliteSection.tsx](src/components/immobilier/SimulateurRentabiliteSection.tsx)) : cashflow
net mensuel, rendements brut/net/net-net et comparaison micro-foncier vs réel (avec déficit foncier
plafonné à 10 700 €/an) au TMI saisi localement (pas de persistance). De même pour « Immeubles locatifs
(LMNP) », `LMNPDetailView.tsx` affiche une section équivalente
([SimulateurRentabiliteLMNPSection.tsx](src/components/immobilier/lmnp/SimulateurRentabiliteLMNPSection.tsx))
comparant micro-BIC (barème 2026, alerte de dépassement de plafond) et réel (charges + intérêts +
assurance déductibles, amortissement plafonné, PS à 18,6 %). Et pour « Immeubles locatifs (LMP) »,
une troisième section équivalente
([SimulateurRentabiliteLMPSection.tsx](src/components/immobilier/lmnp/SimulateurRentabiliteLMPSection.tsx),
mutuellement exclusive avec celle de LMNP dans le même composant) : même barème micro-BIC, mais au réel
l'amortissement n'est **jamais plafonné** (contrairement à LMNP) et le déficit est imputable sur le
revenu global **sans plafond ni durée limitée** (contrairement au foncier nu, 10 700 €/an) — l'avantage
distinctif du statut, mis en avant dans l'affichage. Les cotisations sociales SSI, dont le calcul réel
est progressif et hors de portée ici, sont remplacées par un taux de saisie libre (défaut 40 %, comme
le TMI). Moteur de calcul commun aux trois : [src/lib/immobilier/rentabilite.ts](src/lib/immobilier/rentabilite.ts).

**Tables Supabase consommées** : `assets` (colonnes « immobilier étendu », partagées avec Patrimoine),
`asset_charges`, `asset_revenus`.

**Flux clés** :
- Un bien devient visible ici uniquement si `nature` fait partie de `ASSET_CATEGORIES['actifs
  immobiliers']` (18 natures, `src/constants/assetTypes.ts:183-201`) **et** `transfert_immobilier =
  true` — [useImmobilierAssets.ts](src/hooks/useImmobilierAssets.ts:23-29). Depuis l'automatisme du
  transfert (cf. ci-dessus), cette seconde condition est de fait toujours vraie pour ces natures, sauf
  pour « Parts de SCI » si l'utilisateur a explicitement choisi « Transfert dans Sociétés ».
- Selon la nature, la fiche détail bascule vers l'un de trois comportements : formulaire générique
  (résidences : `isResidenceType`), formulaire enrichi financement/location (biens locatifs :
  `isRentalPropertyType`, `RENTAL_PROPERTY_TYPES`, 6 natures), ou vue LMNP dédiée avec amortissement
  (`MEUBLE_NATURES` = LMNP et LMP).
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

- **`src/lib/immobilier/` centralise désormais la rentabilité location nue, LMNP et LMP — pas encore les
  KPI de portefeuille.** [rentabilite.ts](src/lib/immobilier/rentabilite.ts) réunit en fonctions pures
  testées (`rentabilite.test.ts`) : le calcul micro-foncier/réel (location nue), l'amortissement du
  crédit (commun aux trois régimes), `computeAmortissementImmeubleLMNP`/`computeResultatReelLMNP`
  (déplacés depuis `LMNPDetailView.tsx` sans changer une formule, cf. commit d'extraction dédié) et
  `computeMicroBicLMNP`/`computeRentabiliteLMNP` pour LMNP (barème 2026), puis pour LMP
  `computeResultatReelLMP`/`computeRentabiliteLMP` qui réutilisent tels quels
  `computeAmortissementImmeubleLMNP` (mécanique comptable identique) et `computeMicroBicLMNP` (même
  barème) — seul le traitement fiscal du résultat réel diffère (pas de plafonnement de l'amortissement
  en LMP, cotisations sociales en saisie libre au lieu de PS fixes). Suit le pattern `lib/ifi/`/
  `lib/patrimoine/` demandé par `CLAUDE.md`. **Dette restante** : `ImmobilierOverview.tsx` (rentabilité,
  cashflow, plus-value brute de portefeuille) implémente toujours sa propre annualisation inline, non
  partagée — une **troisième** convention de périodicité coexiste donc pour les KPI de portefeuille (à
  vérifier avant toute fusion : `rentabilite.ts` suit exactement les deux conventions réellement
  stockées en base, cf. `annualiserRevenu`/`annualiserCharge`). Le résumé fiscal existant de
  `LMNPDetailView.tsx` (branche micro-BIC 50 %, sans plafond vérifié, appliquée indifféremment à
  LMNP/LMP) reste lui aussi non partagé avec `computeMicroBicLMNP` des nouveaux simulateurs (barème
  2026 avec plafonds) — choix délibéré pour ne pas toucher à son comportement existant, cf. §3.

- **Aucun fichier de service dédié pour le formulaire propriété.** `useImmobilierPropertyForm.ts` et
  `LMNPDetailView.tsx` écrivent tous deux directement sur `supabase.from('assets').update(...)`,
  contournant `assetService.updateAsset` — qui, lui, vérifie explicitement la propriété de l'actif
  avant d'écrire ([assetService.ts:152-177](src/services/assetService.ts:152-177)). Les deux chemins
  d'écriture Immobilier n'ont donc pas ce garde-fou applicatif (RLS toujours en place en dernier
  recours, cf. §3).

- **Routage par nature « bien locatif » unifié — corrigé.** Les trois définitions divergentes de
  « bien locatif » ont été unifiées sur `RENTAL_PROPERTY_TYPES` (6 natures) —
  [immobilierPropertySchema.ts:32-39](src/schemas/immobilierPropertySchema.ts:32-39), source unique
  utilisée par `isRentalPropertyType()` (sections Financement/Location du formulaire),
  [ImmobilierOverview.tsx:62](src/components/immobilier/ImmobilierOverview.tsx:62) (calcul de
  rentabilité/cashflow) et les deux occurrences du bouton « Gérer » dans
  [ImmobilierSection.tsx:216](src/components/immobilier/ImmobilierSection.tsx:216)/
  [:261](src/components/immobilier/ImmobilierSection.tsx:261), qui référencent désormais directement
  la constante au lieu de listes locales dupliquées ou tronquées (`.slice(0, 4)`). Conséquence :
  « Autres immeubles de rapport » et « Parking / Garage / Box », qui activaient déjà les sections
  Financement/Location de la fiche détail mais n'avaient jamais de bouton « Gérer », y ont désormais
  accès comme les 4 autres natures locatives.

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

- **Immobilier ↔ Sociétés : exclusivité restaurée pour les natures automatiques, gap résiduel à la
  création d'une « Parts de SCI ».** `transfert_immobilier` est désormais forcé automatiquement à
  `true` pour toute nature de `ASSET_CATEGORIES['actifs immobiliers']` (cf. §1) — sauf « Parts de
  SCI », seule nature qui appartient aussi à `SOCIETE_ELIGIBLE_NATURES`
  ([societeTransfer.ts](src/lib/patrimoine/societeTransfer.ts)), qui reste pilotée par les deux cases
  exclusives « Transfert dans Immobilier »/« Transfert dans Sociétés » de `AssetForm.tsx` (cocher
  l'une décoche l'autre via `onCheckedChange`). Une migration
  (`force_transfert_immobilier_natures_immobilieres`) a mis à jour les actifs existants, en excluant
  explicitement les « Parts de SCI » déjà rattachées à une société (`transfert_societe = true`) pour
  ne pas casser ce rattachement. **Vérifié en base** : le seul actif resté en double transfert après
  la migration (créé avant ce correctif) a été identifié et corrigé manuellement
  (`transfert_immobilier = false`) ; plus aucune ligne en double transfert à ce jour.
  **Gap résiduel non corrigé, différent du cas historique ci-dessus** : `getDefaultAssetValues()`
  ([assetSchema.ts](src/schemas/assetSchema.ts)) initialise `transfert_immobilier` **et**
  `transfert_societe` à `true` par défaut, et l'exclusivité n'est appliquée qu'au moment où
  l'utilisateur interagit avec l'une des deux cases (`onCheckedChange`) — jamais sur l'état par
  défaut. Côté sauvegarde, `useAssetForm.ts::handleSubmit` ne recalcule `transfert_immobilier` que
  pour les natures immobilières *hors* exception SCI ; pour « Parts de SCI », il reprend
  `values.transfert_immobilier` tel quel sans jamais vérifier `values.transfert_societe`. Un nouvel
  actif « Parts de SCI » créé et sauvegardé sans que l'utilisateur touche à l'une des deux cases se
  retrouverait donc, de nouveau, avec les deux flags à `true`.

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

### 🔴 Bloquant

Plus aucun bloquant ouvert à ce jour (2026-08-27) — les six points identifiés par l'audit initial ont
été corrigés et vérifiés sur cas concret :

- **Les composants du tableau d'amortissement LMNP ne totalisaient que 80 % de la valeur du bâtiment,
  pas 100 % — corrigé.** Les quotes-parts (Aménagements intérieurs 18 %, Étanchéité 7 %, Toiture 8 %,
  Installations électriques 6 %, Gros œuvre 41 %) totalisaient 80 %, laissant 20 % de `valeurBatiment`
  jamais amorti. Fix : chaque quote-part est remise à l'échelle proportionnellement (÷ 0,8) dans
  `computeAmortissementImmeubleLMNP`
  ([rentabilite.ts](src/lib/immobilier/rentabilite.ts), déplacé depuis `LMNPDetailView.tsx` sans
  changer la formule), poids relatifs et durées d'amortissement inchangés (18/7/8/6/41 →
  22,5/8,75/10/7,5/51,25 %, somme 100 %). **Vérifié sur cas concret** : bien à 200 000€, zone rurale
  (terrain 15 %) → `valeurBatiment` = 170 000€, somme des bases par composant = 170 000€ (au lieu de
  136 000€ avant correctif).

- **Aucun plafonnement de l'amortissement déductible au niveau du résultat — corrigé (version limitée,
  sans report pluriannuel persisté).** Le résultat fiscal réel (`totalRevenusAnnuel - totalChargesAnnuel
  - totalAmortissementAnnuel`) pouvait apparaître négatif à cause du seul amortissement, alors que la
  règle CGI l'interdit (l'amortissement ne peut pas créer ni aggraver un déficit). Fix :
  `amortissementDeductible = min(amortissement calculé, max(0, revenus − charges))`, dans
  `computeResultatReelLMNP` ([rentabilite.ts](src/lib/immobilier/rentabilite.ts), déplacé depuis
  `LMNPDetailView.tsx` sans changer la formule) — le résultat ne peut plus descendre sous 0 à cause du
  seul amortissement ; un déficit provenant des charges seules (revenus − charges déjà négatif) reste un
  déficit réel, distinct. **Limite assumée** : l'excédent d'amortissement non déduit une année n'est
  **pas reporté automatiquement** l'année suivante (l'application ne persiste aucun historique par
  exercice fiscal — un vrai report pluriannuel demanderait une nouvelle table, hors périmètre d'une
  correction ciblée) ; un avertissement visible affiche le montant non déduit et invite au report
  manuel. **Vérifié sur cas concret** : revenus 10 000€, charges 2 000€, amortissement 12 000€ →
  amortissement déduit plafonné à 8 000€ (au lieu de 12 000€), 4 000€ affichés comme non déductibles,
  résultat fiscal = 0 (au lieu de -4 000€ avant correctif) ; cas distinct vérifié (revenus 5 000€,
  charges 9 000€, amortissement 3 000€) : résultat = -4 000€ (déficit réel de charges, 0€
  d'amortissement déduit, 3 000€ intégralement reportables) — la distinction déficit de charges /
  excédent d'amortissement fonctionne. *(Règle CGI utilisée telle que documentée par l'audit initial ;
  non revérifiée contre une source officielle dans le cadre de cette correction.)*

- **`regime_location` (Micro-BIC) était saisi mais sans effet sur le calcul — corrigé pour LMNP/LMP.**
  `LMNPDetailView` appliquait systématiquement la logique du régime réel, quel que soit
  `regime_location`. Fix : si `regime_location === 'Micro-BIC'`, le résultat affiché devient
  `recettes − abattement forfaitaire` (50 %, quel que soit le type de location), sans déduction de
  charges ni d'amortissement ([LMNPDetailView.tsx:174-183](src/components/immobilier/lmnp/LMNPDetailView.tsx:174-183)) ;
  le comportement réel (BIC/non renseigné) est inchangé. **Limite assumée** : le plafond de recettes
  légal pour rester éligible au Micro-BIC n'est **pas vérifié automatiquement** dans ce résumé fiscal
  (contrairement au simulateur de rentabilité LMNP, cf. §1, qui affiche une alerte de dépassement) — un
  texte d'avertissement invite l'utilisateur à contrôler l'éligibilité manuellement. **Vérifié sur cas
  concret** : recettes 20 000€, LMNP Classique → résultat = 10 000€ ; recettes 20 000€, Tourisme classé
  → résultat = 10 000€ (même abattement 50 %, plus de traitement distinct).

- **Abattement micro-BIC « Tourisme classé » obsolète à 71 % — corrigé à 50 %.** Le taux renforcé de
  71 % a été supprimé par la loi Le Meur du 19/11/2024 pour les revenus 2025 et suivants ; l'abattement
  micro-BIC est désormais de 50 % quel que soit le type de location meublée. Fix isolé (commit dédié,
  avant l'extraction vers `rentabilite.ts`) dans `LMNPDetailView.tsx`. Le nouveau simulateur de
  rentabilité LMNP (§1) utilise directement le barème 2026 correct (`MICRO_BIC_LMNP_BAREME` dans
  `rentabilite.ts`), qui distingue en plus Tourisme non classé (30 % / plafond 15 000 €) de
  Classique/Tourisme classé (50 % / plafond 83 600 €) — distinction que le résumé fiscal existant de
  `LMNPDetailView.tsx` ne fait toujours pas (un seul taux de 50 %, pas de plafond différencié).

- **Une charge en périodicité « Trimestrielle » était comptée pour zéro dans les KPI de portefeuille —
  corrigé.** [ImmobilierOverview.tsx](src/components/immobilier/ImmobilierOverview.tsx) ne connaissait
  que « mensuelle » (×12) et « annuelle » (×1), toute autre valeur donnant 0. Fix : `annualFactor()`/
  `monthlyDivisor()` reconnaissent désormais aussi trimestrielle (×4 / ÷3) et semestrielle (×2 / ÷6),
  pour les revenus comme pour les charges — les valeurs non reconnues gardent leur comportement
  d'origine (revenus : traités comme annuels ; charges : exclus/0, comportement volontairement
  conservé pour les périodicités réellement inconnues). **Vérifié sur cas concret** : charge
  trimestrielle 300€ + charge semestrielle 600€ → total annuel 2 400€ (au lieu de 0€ avant correctif).

- **Une charge ou un revenu en périodicité « Semestrielle » était compté comme si le montant saisi
  était déjà annuel — corrigé.** Même fix que ci-dessus (`annualFactor`/`monthlyDivisor` dans
  `ImmobilierOverview.tsx`, `periodiciteAnnualFactor` dans
  [LMNPDetailView.tsx:220-237](src/components/immobilier/lmnp/LMNPDetailView.tsx:220-237)) : la
  semestrielle est désormais correctement ×2 (annuel) / ÷6 (mensuel), la trimestrielle ×4 (annuel) /
  ÷3 (mensuel), au lieu d'être ajoutée telle quelle. **Vérifié sur cas concret** : revenu semestriel de
  3 000€ → total annuel 6 000€ (au lieu de 3 000€ avant correctif), soit 500€/mois (au lieu de 250€/mois).

- **Une charge en périodicité « Semestrielle » était enregistrée sans doubler le montant — corrigé.**
  `ChargeForm.tsx` mappe « Semestrielle » sur `'annuelle'` (seule valeur acceptée par la contrainte
  CHECK de `asset_charges.periodicite`), mais ne compensait pas le changement de fréquence : une charge
  de 300€ semestrielle était stockée comme 300€/an au lieu de 600€/an. Fix : le montant est doublé avant
  écriture quand la périodicité choisie est « Semestrielle »
  ([ChargeForm.tsx:43-49](src/components/immobilier/ChargeForm.tsx:43-49)). **Limite assumée** : la
  colonne `periodicite` ne conserve aucune trace du choix « Semestrielle » une fois mappée sur
  `'annuelle'` — un audit futur ne pourra pas distinguer ces lignes d'un `'annuelle'` saisi directement
  sans examen manuel. **Vérifié en base** : `asset_charges` était vide au moment du correctif, aucun
  rattrapage de données nécessaire.
- **`useImmobilierPropertyForm.ts` transformait silencieusement un `0` saisi en `null` — corrigé.**
  `handleSubmit` utilisait `data.champ || null` pour tous les champs numériques, écrasant un `0`
  correctement saisi (bien dévalorisé, frais nul). Fix : nouvel helper `numOrNull()`
  ([useImmobilierPropertyForm.ts:59-77](src/hooks/useImmobilierPropertyForm.ts:59-77)) qui ne renvoie
  `null` que pour `''`/`undefined`, jamais pour `0` (les champs numériques sont typés `number | ''`
  côté schéma, donc sans ambiguïté). Les champs non numériques (`typologie_bien`, `statut_bien`,
  `type_location`, `regime_location`) gardent leur comportement d'origine, non concernés par ce bug.
  **Vérifié sur cas concret** : `valeur_estimee = 0` → sauvegardé comme `0` (au lieu de `null`) ;
  `surface_m2 = ''` (non saisi) → toujours `null` ; valeurs positives inchangées.

### 🟠 À surveiller (cas limite, peu probable)

- **Un nouvel actif « Parts de SCI » peut encore être créé avec les deux transferts actifs** si
  l'utilisateur ne touche à aucune des deux cases « Transfert dans Immobilier »/« Transfert dans
  Sociétés » avant de sauvegarder (`getDefaultAssetValues()` initialise les deux à `true`, et
  `useAssetForm.ts::handleSubmit` ne recalcule pas `transfert_immobilier` par rapport à
  `transfert_societe` pour cette nature) — cf. §2 pour le détail. Distinct de l'incohérence
  historique déjà corrigée en base pour les actifs existants.
- **Le résumé fiscal existant (`LMNPDetailView.tsx`, hors nouveaux simulateurs) applique toujours le
  même calcul d'amortissement et le même affichage de résultat à LMNP et LMP**, alors que les régimes
  divergent en aval (cotisations sociales, imputation du déficit, plus-value professionnelle) —
  approximation plausible pour une V1, mais non signalée à l'utilisateur. **Distinction désormais faite
  dans les simulateurs de rentabilité** (§1) : `computeResultatReelLMNP` plafonne l'amortissement
  déductible, `computeResultatReelLMP` ne le plafonne pas et impute le déficit sans limite sur le revenu
  global — seul le résumé fiscal historique reste non distingué.
- **`assetService.getAssetCharges`/`getAssetRevenus` sans filtre `user_id` applicatif**, à la
  différence du reste du durcissement « défense en profondeur » de Patrimoine (commit `ea3a695`) —
  couvert par les RLS, qui sont correctes, mais incohérent avec la méthode appliquée ailleurs.
- **`ImmobilierGestionDialog` ne préremplit pas le choix « Impact sur le budget » du formulaire de
  création** avec l'état courant du bien (contrairement à `LMNPDetailView`, qui passe `impactBudget`
  en prop) — la case démarre décochée dans le dialogue de création même si le bien a déjà le transfert
  budget actif ; corrigé après coup par l'appel bulk du `onSuccess`, donc sans conséquence sur la
  donnée finale, seulement sur l'affichage transitoire du formulaire.
- **Plafond de recettes Micro-BIC non vérifié automatiquement.** Depuis le fix du régime Micro-BIC
  (🔴, résolu), le résultat affiché est `recettes − abattement forfaitaire`, mais l'éligibilité réelle
  au régime dépend d'un plafond de recettes annuelles qui varie selon la catégorie de location
  (meublé classique / tourisme classé) et dont les seuils sont révisés en loi de finances jusqu'en
  2028 — non fiable à coder en dur sans source vérifiée à chaque révision. Un texte d'avertissement
  est affiché sous le résultat Micro-BIC, mais le contrôle du plafond reste manuel.
- **Report de l'excédent d'amortissement LMNP non persisté d'une année sur l'autre.** Depuis le fix du
  plafonnement (🔴, résolu), le résultat de l'année courante ne peut plus être artificiellement négatif
  à cause du seul amortissement, et le montant non déduit est affiché avec un avertissement — mais ce
  montant n'est stocké nulle part : rouvrir la fiche l'année suivante ne le réinjecte pas
  automatiquement dans le calcul. Un vrai report pluriannuel demanderait une nouvelle table (montant
  reporté par bien et par exercice), hors périmètre d'une correction ciblée.

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **Code mort : `ImmobilierPropertyDialog.tsx`** — composant complet, jamais importé, strictement
  redondant avec `ImmobilierPropertyDetailView.tsx`.
- **Onglet « Gestion des biens » / « Revenus locatifs » non implémenté** (« Section à venir »,
  `ImmobilierSection.tsx:281-300`), alors que la fonctionnalité existe déjà par bien via « Gérer » —
  écran orphelin, à supprimer ou à raccorder.
- **Auto-calcul des frais de notaire (7,5 %) dupliqué à l'identique** dans
  `useImmobilierPropertyForm.ts` et `PropertyCostSection.tsx`, sur la même instance de formulaire.
- **`console.error` non gardé par `import.meta.env.DEV`** — deux occurrences :
  [ImmobilierOverview.tsx:148](src/components/immobilier/ImmobilierOverview.tsx:148) et
  [RevenuForm.tsx:87](src/components/immobilier/RevenuForm.tsx:87). Non-conformité à la règle
  `CLAUDE.md` (« pas de `console.log` actif en production »), déjà corrigée ailleurs dans le
  périmètre Patrimoine par le commit `ea3a695`, mais pas étendue à ces deux fichiers Immobilier.
- **`useImmobilierPropertyForm.ts`/`LMNPDetailView.tsx` écrivent directement sur `supabase.from
  ('assets')`** au lieu de passer par `assetService.updateAsset`, perdant le contrôle de propriété
  applicatif que ce dernier effectue avant écriture (RLS reste le filet de sécurité).
- Logique de calcul (amortissement, annualisation) mêlée au JSX plutôt qu'isolée dans un
  `lib/immobilier/`, cf. §2 — classé ici comme point de refactor plutôt que comme bug, faute d'un
  calcul erroné imputable directement à cette structure (les bugs listés en 🔴 auraient été possibles
  même avec une extraction en fonctions pures ; l'extraction aurait surtout facilité leur détection
  par des tests).

## 4. Périmètre V1 / différé

- **V1 — en place** : bascule automatique d'un actif Patrimoine vers Immobilier dès que sa nature est
  immobilière (choix manuel exclusif avec Sociétés conservé uniquement pour « Parts de SCI »), fiche
  détail par bien (général/coûts/financement/type de location pour les biens locatifs), gestion des
  revenus/charges par bien avec bascule d'impact sur le Budget, vue dédiée LMNP/LMP avec calcul
  d'amortissement par composant et résultat fiscal simplifié, KPI de portefeuille (valeur totale,
  rentabilité brute/nette, cashflow, plus-value brute).
- **V1 — en place (ajout)** : pour la location nue (« Immeubles locatifs (loués nus) » uniquement,
  pas les 5 autres natures de `RENTAL_PROPERTY_TYPES`), simulateur de rentabilité micro-foncier/réel
  dans la fiche détail (cashflow, rendements, déficit foncier plafonné à 10 700 €/an, régime le plus
  favorable au TMI saisi) — cf. §1/§2. Pas de projection pluriannuelle, pas de calcul de plus-value à
  la revente, pas de report du déficit foncier au-delà du plafond annuel.
- **V1 — en place (ajout)** : pour LMNP, simulateur de rentabilité micro-BIC/réel dans
  `LMNPDetailView.tsx` (barème 2026 avec plafonds de recettes, amortissement immeuble plafonné,
  intérêts + assurance déductibles au réel, PS à 18,6 %, régime le plus favorable) — cf. §1/§2. Pas de
  report de l'excédent d'amortissement d'une année sur l'autre (dette déjà connue, non traitée ici).
- **V1 — en place (ajout)** : pour LMP, simulateur de rentabilité micro-BIC/réel équivalent (même
  barème micro-BIC que LMNP, même amortissement immeuble), mais au réel sans plafonnement de
  l'amortissement et déficit imputable sur le revenu global sans plafond ni durée limitée (avantage
  distinctif du statut). Cotisations sociales SSI remplacées par un taux de saisie libre (défaut 40 %,
  pas de calcul progressif réel). Pas de vérification des critères d'éligibilité LMP (23 000 €/50 % des
  revenus du foyer, non modélisée — la nature de l'actif déjà choisie par l'utilisateur fait foi), pas
  de plus-value professionnelle (art. 151 septies), pas d'IFI.
- **Différé, déductible du code** :
  - **Location nue pour les 5 autres natures de `RENTAL_PROPERTY_TYPES`** (Autres immeubles de rapport,
    Parking/Garage/Box, etc.) : toujours aucun moteur de calcul dédié, gate du simulateur strictement
    limité à « Immeubles locatifs (loués nus) ».
  - **Terrains, Bois & forêts, Parts de SCPI/GFA/GFV/GFR, Maison mobile, Autres biens d'usage** : ces
    natures apparaissent dans « Mes biens » si transférées (elles appartiennent à
    `ASSET_CATEGORIES['actifs immobiliers']`, et le transfert est désormais automatique — cf. §1),
    mais `isResidenceType`/`isRentalPropertyType` ne les couvrent pas — la fiche affiche explicitement
    « La gestion des informations pour cette catégorie sera disponible prochainement »
    (`ImmobilierPropertyDetailView.tsx:74-79`) : gap assumé et documenté par le message lui-même, pas
    un bug silencieux. **Nuance récente** : pour 4 de ces natures — Parts de SCPI, Parts de
    groupements fonciers, Parts de GFA/GAF/GFV/GFR, Parts de sociétés d'épargne forestière (pas
    « Parts de SCI », qui reste sur le module Sociétés) — `AssetForm.tsx` (Patrimoine, pas Immobilier)
    capture désormais un établissement dédié (libellé « Société de gestion »/« Gestionnaire » selon la
    nature), les revenus distribués sur 12 mois et un régime fiscal
    (`PARTS_FONCIERES_NATURES`/`REGIME_FISCAL_PARTS_OPTIONS`,
    [assetTypes.ts](src/constants/assetTypes.ts)). Cette information existe donc en base
    (`assets.revenus_distribues_12m`, `assets.regime_fiscal_parts`) mais reste invisible depuis
    Immobilier, qui continue d'afficher le message « à venir » pour ces natures.
  - **Financement (`financement_*`) : désormais consommé par les trois simulateurs de rentabilité
    (location nue, LMNP, LMP), toujours dormant ailleurs.** Les 5 champs `financement_actif`/
    `financement_duree_mois`/`financement_apport`/`financement_taux_credit`/`financement_taux_assurance`,
    saisissables via
    [PropertyFinancingSection.tsx](src/components/immobilier/property/PropertyFinancingSection.tsx) et
    persistés par `useImmobilierPropertyForm.ts:69-73`, alimentent `computeAmortissement()` dans
    [rentabilite.ts](src/lib/immobilier/rentabilite.ts) (mensualité, intérêts de l'année en cours),
    partagé par les trois simulateurs. **Toujours dormants ailleurs** : `ImmobilierOverview.tsx` (KPI de
    portefeuille) et le résumé fiscal existant de `LMNPDetailView.tsx` (hors nouveaux simulateurs) ne
    lisent toujours pas ces champs — le cashflow de portefeuille et l'ancien résultat fiscal LMNP/LMP
    restent calculés sans tenir compte du crédit. Il n'existe pas de colonne « date de démarrage du
    crédit » en base : `computeAmortissement()` utilise `date_acquisition` comme proxy, ce qui devient
    imprécis en cas de refinancement (cas non traité, documenté en commentaire dans le code).
  - **Distinction LMNP/LMP** dans le calcul lui-même : les nouveaux simulateurs de rentabilité
    distinguent désormais les deux statuts (plafonnement de l'amortissement et PS à 18,6 % en LMNP ;
    pas de plafonnement, déficit imputable sans limite et cotisations sociales en saisie libre en LMP,
    gate `asset.nature === 'Immeubles locatifs (LMP)'`) — seul le résumé fiscal existant de
    `LMNPDetailView.tsx` continue de s'appliquer aux deux natures sans distinction (écart documenté en
    §3 comme approximation, non corrigé ici).
  - **`regime_location` (Micro-foncier/Réel)** pour la location nue : toujours sans branche de calcul
    qui le lit (`ImmobilierPropertyDetailView`/location nue n'a pas de moteur de calcul dédié, cf.
    plus haut). Le cas Micro-BIC/BIC (meublé, LMNP/LMP) est en revanche traité depuis le fix §3.
- **Manque sans explication dans le code** : aucun commentaire ni TODO n'explique pourquoi
  `ImmobilierPropertyDialog.tsx` a été laissé en place après son remplacement apparent par
  `ImmobilierPropertyDetailView.tsx`, ni pourquoi l'onglet « Revenus locatifs »/« Gestion des biens »
  affiche un écran « à venir » alors que la fonctionnalité équivalente existe déjà par bien.
