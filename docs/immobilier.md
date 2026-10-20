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
créés dans Patrimoine (`assets`, cf. `docs/patrimoine.md`). Pour une résidence ou un bien locatif, la
description (typologie, surface, statut) et le coût de revient détaillé sont saisis dès la création dans
Patrimoine (étapes « Le bien » et « Prix », cf. `docs/patrimoine.md`), le prix d'achat étant recopié dans
`montant_immeuble`. Le **coût de revient est en lecture seule dans la fiche du bien**
([PropertyCostSection.tsx](src/components/immobilier/property/PropertyCostSection.tsx)) et se modifie dans
Patrimoine (onglet Propriété) : prix et frais y alimentent aussi la plus-value et la qualification, un seul
lieu de saisie évite qu'ils divergent. Les frais du crédit (dossier ou courtier, garantie) sont repris des emprunts
reliés au bien (`fraisCreditBien`, [rentabilite.ts](src/lib/immobilier/rentabilite.ts) : `frais_dossier` +
`frais_garantie`, repli sur les anciennes colonnes `frais_bancaires` / `frais_hypotheque` de l'actif s'il
n'a pas d'emprunt relié) : ils comptent dans le coût de revient (rentabilité), pas dans le coût
d'acquisition de la plus-value. Pour un bien locatif, type de location, régime fiscal et loyer
mensuel facultatif (créé comme revenu « Loyers hors charges », mensuel, à la date du jour, report au budget
au choix) sont aussi saisis à la création (étape « Location ») ; la fiche permet toujours de modifier type
et régime. La case « Bien financé par un crédit » de l'étape « Prix » ne renseigne pas les champs
`financement_*` : après la création, Patrimoine propose de saisir l'emprunt dans Passifs, prérempli et
relié au bien (`PassifEmpruntForm`, prop `preset`), source qui fait foi. Les champs `financement_*` de la
fiche restent pour les biens sans emprunt relié. **Écart connu** : la date d'achat et la valeur estimée,
modifiables dans la fiche, n'y déclenchent pas le recalcul de la qualification (seul le formulaire de
Patrimoine le fait). Le module ajoute une couche de gestion spécifique :
détail des coûts d'acquisition, financement déclaratif, type/régime de location, et pour les biens
meublés, un calculateur d'amortissement LMNP/LMP avec revenus et charges dédiés. Le transfert
(`transfert_immobilier = true`) est **automatique** dès que la nature appartient à
`ASSET_CATEGORIES['actifs immobiliers']` (calculé à la sauvegarde dans
`useAssetForm.ts::handleSubmit`, plus de case à cocher manuelle dans `AssetForm`) — à une exception
près : « Parts de SCI », seule nature à la fois immobilière et « parts » de société
(`NATURES_PARTS_SOCIETE`, [societeTransfer.ts](src/lib/patrimoine/societeTransfer.ts)), garde une case
« Transfert dans Immobilier » manuelle. Son rattachement à une fiche du module Sociétés (champ
« Société liée », `societe_id`) est indépendant : une même « Parts de SCI » peut figurer dans Immobilier
et être reliée à sa SCI.

**Écrans** (`ImmobilierSection.tsx`, 3 onglets) :

| Onglet | Composant | Rôle |
|---|---|---|
| Vue d'ensemble (par défaut) | [ImmobilierOverview.tsx](src/components/immobilier/ImmobilierOverview.tsx) + [FoncierFoyerSection.tsx](src/components/immobilier/FoncierFoyerSection.tsx) | KPI de portefeuille et répartition de la valeur par bien (nombre de biens, valeur totale, rentabilité brute/nette, cashflow mensuel, plus-value brute ; tous pondérés par la quote-part d'indivision du foyer, `computeQuotePart`, comme les simulateurs — sauf le nombre de biens ; valeur totale et plus-value pondérées en plus par la fraction de démembrement du bien, `getFractionDemembrement`, à l'identique du Résumé Patrimoine), puis, si le foyer détient au moins un bien en location nue (`type_location === 'Location nue'`), la synthèse foncière du foyer (voir ci-dessous) |
| Mes biens | [MesBiensList.tsx](src/components/immobilier/MesBiensList.tsx) (sections par famille, rentabilité brute et cashflow par bien) → [ImmobilierPropertyDetailView.tsx](src/components/immobilier/ImmobilierPropertyDetailView.tsx), [LMNPDetailView.tsx](src/components/immobilier/lmnp/LMNPDetailView.tsx) ou [PartsFoncieresDetailView.tsx](src/components/immobilier/parts/PartsFoncieresDetailView.tsx) | Liste des biens transférés ; clic → fiche détail (infos générales/coûts/financement/location), vue LMNP dédiée si le bien est meublé, ou fiche des parts foncières/forestières |
| Gestion des biens | [GestionBiensSection.tsx](src/components/immobilier/GestionBiensSection.tsx) | Vue consolidée en lecture seule : tous les revenus/charges de tous les biens transférés (pas seulement locatifs), groupés par bien, avec montant annualisé et sous-totaux + total portefeuille. Pas d'ajout/modification/suppression ici — reste le rôle du menu ⋯ → « Revenus et charges » de « Mes biens » |

Fiche d'un bien (`ImmobilierPropertyDetailView`) en trois onglets segmentés : **Informations** (formulaire de la fiche, gardé monté quand on change d'onglet pour conserver la saisie et « Enregistrer »), **Revenus et charges**, **Simulation** (simulateur de rentabilité pour la location nue, projection, revente ; absent pour les biens sans formulaire). Onglet « Revenus et charges » : [RevenusChargesSection.tsx](src/components/immobilier/RevenusChargesSection.tsx), hors du formulaire de la fiche — bandeau des totaux ramenés au mois (revenus, charges, solde ; lignes ponctuelles et charges en % exclues), bascule « Reporter dans le Budget », CRUD des revenus/charges. Le menu ⋯ → « Revenus et charges » de « Mes biens » (non-LMNP) ouvre la fiche sur cet onglet (`focusRevenusCharges`). Seules les parts foncières, sans fiche détaillée, gardent la fenêtre [ImmobilierGestionDialog.tsx](src/components/immobilier/ImmobilierGestionDialog.tsx), simple enveloppe de la même section.

Pour la nature « Immeubles locatifs (loués nus) » spécifiquement, la fiche détail
([ImmobilierPropertyDetailView.tsx](src/components/immobilier/ImmobilierPropertyDetailView.tsx)) affiche
en plus une section **Simulateur de rentabilité**
([SimulateurRentabiliteSection.tsx](src/components/immobilier/SimulateurRentabiliteSection.tsx)) : cashflow
net mensuel, rendements brut/net/net-net et comparaison micro-foncier vs réel (avec déficit foncier
plafonné à 10 700 €/an) au TMI saisi localement (pas de persistance). Ce simulateur reste une **vue
indicative par bien isolé** (« et si ce bien était mon seul bien ? ») ; il pondère désormais les montants
par la quote-part d'indivision du foyer (`computeQuotePart`, somme `pourcentage_utilisateur` +
`pourcentage_conjoint`, plafonnée à 100 %), affiche un badge « Régime actif » sur le bloc correspondant à
`asset.regime_location` quand il est renseigné, et un bandeau d'alerte si les revenus fonciers bruts du
foyer (tous biens loués nus confondus, cf. ci-dessous) dépassent 15 000 € (régime réel obligatoire). Pour
l'imputation réelle du déficit et son report, c'est la **synthèse foncière du foyer** ci-dessous qui fait
foi, pas ce simulateur par bien.

**Synthèse foncière du foyer** ([FoncierFoyerSection.tsx](src/components/immobilier/FoncierFoyerSection.tsx),
onglet Vue d'ensemble, affichée dès qu'il existe au moins un bien en location nue ou une part au régime des revenus fonciers) : contrairement au
simulateur par bien ci-dessus, applique les règles du CGI **au niveau du foyer fiscal, tous biens loués nus
confondus** — seules règles pertinentes pour une déclaration réelle. Moteur :
[src/lib/immobilier/foncierFoyer.ts](src/lib/immobilier/foncierFoyer.ts) (`computeFoyerFoncier`, testé dans
`foncierFoyer.test.ts`) :
- Intègre aussi les parts de société au régime « Revenus fonciers » (`regime_fiscal_parts`, SCPI,
  groupements fonciers… : `assetService.getPartsRevenusFonciers`, `buildPartsFoncieresInput`) : revenus
  distribués des 12 derniers mois (`revenus_distribues_12m`) à la quote-part du foyer, sans charges ni
  intérêts (déduits par la société), en approximation du revenu à déclarer (attestation fiscale du
  gestionnaire, non saisie) ; affichées dans « Biens pris en compte » avec « — » pour charges, intérêts et
  rénovation. La synthèse s'affiche dès qu'il existe un bien loué nu ou une telle part.
- Seuil micro-foncier à 15 000 € de revenus fonciers bruts foyer, parts comprises (`SEUIL_MICRO_FONCIER`) :
  au-delà, régime réel obligatoire, affiché en bandeau. Parts de société sans immeuble loué nu détenu en
  direct (`estBienNuEnDirect` ; des parts de SCI louées nu comptent comme parts) : micro-foncier fermé
  (art. 32 CGI, `microFoncierFermeParts`), bandeau dédié.
- Impute les intérêts d'emprunt + assurance emprunteur **en priorité sur les loyers** (CGI art. 156-I-3°,
  notice 2044) : seule leur fraction non couverte par les loyers est un déficit d'intérêts, jamais
  imputable sur le revenu global ; le reste du déficit, issu des autres charges, l'est dans la limite du
  plafond. Règle unique `repartirDeficitFoncier` ([rentabilite.ts](src/lib/immobilier/rentabilite.ts)),
  partagée avec le simulateur par bien.
- Plafonne le déficit imputable sur le revenu global à 10 700 €/an, ou 21 400 € si au moins un bien est
  coché « travaux de rénovation énergétique » (sortie des classes E/F/G, dispositif prorogé jusqu'au
  31/12/2027) — case à cocher par bien dans le tableau, non persistée en base (saisie de simulation).
- Consomme le stock de déficits reportés des années précédentes (FIFO par année d'origine, fenêtre de 10
  ans), et calcule le nouveau déficit reportable généré par l'année en cours (hors intérêts au-delà du
  plafond, et intérêts non couverts par les loyers).
- Le stock de déficits reportés est **saisi manuellement par l'utilisateur** (ce qu'il a sur sa vraie
  déclaration 2044), table `deficits_fonciers_reportes` (service
  [deficitFoncierService.ts](src/services/deficitFoncierService.ts)) — CRUD direct dans la section, plus un
  bouton explicite « Reporter le solde à l'année suivante » qui applique le résultat de la simulation
  courante au stock persisté (`reporterAlAnneeSuivante`) ; rien n'est décrémenté automatiquement en arrière-plan.
- TMI du foyer saisi localement dans la section (pas de persistance, pas de lien avec le module Fiscalité —
  décision explicite, pas un gap non traité : le module Fiscalité n'a aucune section revenus fonciers/2044).

**Meublés : une seule nature « Immeubles locatifs (meublés) »** (migration `20261020140000`). LMNP / LMP est le statut du loueur, apprécié pour tout le foyer (art. 155 IV CGI : LMP si recettes meublées > 23 000 €/an et > autres revenus d'activité du foyer), non une nature : il est porté par `type_location` (« Location meublée non professionnelle (LMNP) », par défaut, ou « … professionnelle (LMP) »), lu via `estMeuble` / `estLMP` (`immobilierPropertySchema.ts`). Saisi comme « Statut du loueur » (LMNP — non professionnel / LMP — professionnel) dans `LocationFields` et `PropertyLocationSection` ; pour « loués nus », le type n'est plus proposé (toujours « Location nue », forcé à l'enregistrement), seul le régime reste ; immeubles professionnels et parking loué gardent le choix nu / meublé. Plus-value (`regimeFiscalPVI.computePVIRegime`, paramètre `typeLocation` ; `revente.ts`, `estLMNP`) et fiche (`LMNPDetailView`, `isLMP`) lisent le statut. Non modélisé : exonération IFI des biens professionnels du LMP (conditions non saisies).

**Locaux professionnels** (nature « Immeubles professionnels (hors LMP) », affichée « Locaux professionnels et commerciaux ») : toujours loués nus (bail commercial ou professionnel, revenus fonciers ; `toujoursLoueNu`, comme « loués nus » : type non proposé, forcé à l'enregistrement, régime micro-foncier / réel), jamais LMNP / LMP. Typologies propres (Bureau, Commerce, Local d'activité, Entrepôt, Cabinet ; `typologiesPourNature`, contrainte `check_typologie_bien` élargie, migration `20261020160000`). Pas de poste « Meubles » au coût de revient (`avecPosteMeubles`). Simulateur de rentabilité des biens loués nus ouvert aux locaux professionnels (onglet Simulation). Question « Usage » (`avecQuestionUsage`, comme le parking ; champ de saisie `usage_loue`, déduit de `type_location`, jamais écrit) : « Ma propre activité », « Loué à un tiers » ou « Vide » — en propre activité comme vide, ni étape Location, ni section Location, ni simulateur, `type_location` à null (`estEnLocation`) ; « Vide » se distingue par `statut_bien = 'Vacant'` (valeur réservée à cet usage, effacée si l'on repasse à un autre usage). Aucun calcul ne distingue encore propre activité et vide (exonération IFI des biens professionnels non modélisée). Non modélisé : exonération IFI des locaux affectés à l'activité principale (saisie manuelle dans le module IFI, sans lien avec l'actif).

**Crédit** : la section « Financement » de la fiche Immobilier (`financement_*`) est retirée ; le crédit d'un bien se saisit uniquement comme emprunt relié dans Passifs. Le repli de calcul sur `financement_*` / `frais_bancaires` / `frais_hypotheque` (`credit.ts`, `rentabilite.ts`) n'est plus atteignable (aucune donnée en base au 20/10/2026) : code mort à retirer avec ses tests.

**Fiche meublé** : prix d'achat, frais de notaire, mobilier, travaux et année d'acquisition en lecture seule, saisis dans Patrimoine (source unique de la plus-value et de la qualification) ; la fiche n'écrit plus que la zone, la part terrain forcée et la catégorie de meublé (`type_location_lmnp`, libellé « Catégorie de meublé » : LMNP classique, tourisme classé ou non, qui fixe l'abattement micro-BIC).

**Prix au m²** (`prixAuM2`, `property/PrixAuM2.tsx`) : sous le champ Surface, dans le formulaire d'actif et la fiche du bien — à la valeur estimée et à l'achat.

De même pour un meublé LMNP, `LMNPDetailView.tsx` affiche une section équivalente
([SimulateurRentabiliteLMNPSection.tsx](src/components/immobilier/lmnp/SimulateurRentabiliteLMNPSection.tsx))
comparant micro-BIC (barème 2026, alerte de dépassement de plafond) et réel (charges + intérêts +
assurance déductibles, amortissement plafonné, PS à 18,6 %). Et pour un meublé LMP,
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
  pour « Parts de SCI » si l'utilisateur a décoché « Transfert dans Immobilier ».
- Selon la nature, la fiche détail bascule vers l'un de trois comportements : formulaire générique
  (résidences : `isResidenceType`), formulaire enrichi financement/location (biens locatifs :
  `isRentalPropertyType`, `RENTAL_PROPERTY_TYPES`, 6 natures), ou vue LMNP dédiée avec amortissement
  (`MEUBLE_NATURES` = LMNP et LMP).
- Les deux fiches (`useImmobilierPropertyForm.ts`, `LMNPDetailView.tsx`) écrivent dans `assets` via
  `assetService.updateAsset`, qui contrôle la propriété de l'actif avant écriture (en plus des RLS).
- La vue LMNP calcule un « résultat fiscal » (revenus − charges − amortissements) affiché en temps
  réel, avec auto-sauvegarde debattue à 1,5 s sur les champs saisis.
- Le bouton « Transfert dans budget » (checkbox par bien) bascule `impact_budget` sur **toutes** les
  lignes `asset_revenus`/`asset_charges` du bien d'un coup (`assetService.setImpactBudget`, contrôle de
  propriété, erreurs remontées). Les revenus/charges créés ensuite reçoivent l'état courant du bien en
  prop (`impactBudget`) dès la création, dans `ImmobilierGestionDialog` comme dans `LMNPDetailView` ; le
  formulaire de revenu laisse l'utilisateur décocher la case pour une ligne donnée.

## 2. Architecture & décisions

- **Design** — « panneau de travail » commun à Famille, Patrimoine et Budget
  ([design-system.md](design-system.md)) : `ImmobilierSection` porte le cadre (classe `.workspace-panel`,
  barre d'en-tête à fil d'Ariane « Immobilier / onglet », titre 24 px de l'onglet et rappel « n biens
  transférés depuis Patrimoine », contenu bord à bord sous un filet). Tous les écrans du module suivent ce
  gabarit, y compris les fiches détail et les fenêtres.
  - **Vue d'ensemble** (`ImmobilierOverview`) : bandeau calqué sur le Résumé Patrimoine — valeur du
    portefeuille en 34 px, étiquette de plus-value brute (taux et montant, vert / rouge), lignes Biens /
    Cashflow (par mois, crédit compris) / Rentabilité brute / Rentabilité nette ; à droite, **répartition
    de la valeur par bien** (barre + légende sur deux colonnes, palette lagon / citron / gris de
    `budgetColors.ts`). La valeur par bien est celle déjà calculée dans la boucle des KPI (même
    pondération quote-part × fraction de démembrement), simplement conservée. Pourcentages au format
    français (« 1,07 % »).
  - **Indicateurs par bien et du portefeuille** : [portefeuille.ts](src/lib/immobilier/portefeuille.ts)
    (`computeFluxBien`, `computeIndicateurs`, `sommeFlux`, tests `portefeuille.test.ts`) réunit les formules
    de flux jusque-là écrites dans la boucle d'`ImmobilierOverview`, **sans changement de règle** : loyers et
    charges annualisés / mensualisés selon la périodicité (périodicité inconnue : annuelle pour un revenu,
    exclue pour une charge — convention propre à ces indicateurs, cf. §3), crédit + assurance emprunteur
    via `computeAmortissement`, le tout × quote-part. Rentabilités brute et nette rapportées au **prix de
    revient** (`computePrixRevient` : `computePrixAcquisitionTotal`, soit immeuble + frais + frais du crédit + travaux, comme
    le simulateur de la fiche ; repli sur `valeur_acquisition + frais_acquisition` quand le coût de revient
    détaillé est vide) — un bien affiche donc la même rentabilité brute dans « Mes biens » et dans son
    simulateur (vérifié : 2,79 % / 2,8 % sur le bien loué nu de l'aperçu). La Vue d'ensemble applique `computeIndicateurs` à la
    somme des flux des biens ; « Mes biens » l'applique bien par bien, ce qui garantit que les deux écrans
    concordent (le cashflow du portefeuille est la somme des cashflows par bien ; les rentabilités du
    portefeuille sont des ratios sur les totaux, pas une moyenne des rentabilités par bien).
  - **Mes biens** ([MesBiensList.tsx](src/components/immobilier/MesBiensList.tsx)) : bascule cartes /
    tableau supprimée. Une section par famille de biens (Résidences, Immobilier locatif — natures de
    `RENTAL_PROPERTY_TYPES` —, Pierre-papier & parts, Terrains & forêts, Autres), repère coloré, nombre de
    biens et somme des valeurs estimées pondérées par la quote-part du foyer (`computeQuotePart`, comme la Vue d'ensemble) ; biens triés par valeur décroissante. Chaque ligne : pictogramme
    maison / immeuble teinté de la couleur de la famille, dénomination, nature, étiquettes « Meublé » et
    « Quote-part x % » (si < 100 %), valeur de la part du foyer (valeur estimée × quote-part), avec la valeur totale du bien en dessous (« sur x € ») si la quote-part est < 100 %, rentabilité brute et cashflow
    mensuel (« — » pour un bien sans revenu, charge ni crédit). Clic sur la ligne : fiche du bien (ou vue
    LMNP) ; menu ⋯ : « Voir la fiche », et « Revenus et charges » (ex-bouton « Gérer ») pour les natures
    locatives, comme avant.
  - **Gestion des biens** (`GestionBiensSection`) : bande d'en-tête (rappel du chemin d'ajout, totaux
    revenus / charges / solde annuel du portefeuille), puis une section par bien (empilées sur deux colonnes
    dès `lg` s'il y a plusieurs biens) : repère, nombre de lignes, solde annuel ; chaque ligne avec
    étiquette lagon « Revenu » / citron « Charge », nature, montant annualisé signé et rappel « montant ·
    périodicité » ; revenus et charges du bien en pied.
  - **Fiche d'un bien** (`ImmobilierPropertyDetailView`) : même gabarit que les formulaires d'actif de
    Patrimoine — barre d'en-tête « Immobilier / Mes biens / bien » portant Annuler (ou Retour) et
    Enregistrer (formulaire `immobilier-property-form`), titre 24 px et nature ; sections Données générales,
    Coût de revient, Financement, Location via [PanelSection](src/components/immobilier/property/PanelSection.tsx)
    (titre à repère, champs sur deux colonnes, filets). Date d'achat saisie avec `SmartDateInput` (comme
    Famille, dates passées) ; une saisie incomplète reste locale. Case « Bien financé par un crédit » en
    encadré pleine largeur.
  - **Simulateurs** (location nue, LMNP, LMP) : bandeaux — taux saisis (suffixe %) et chiffres du bien en
    lignes libellé / valeur à gauche, comparaison des deux régimes côte à côte à droite (étiquette lagon
    « Régime actif »), recommandation en pied ; encadrés d'alerte (régime réel obligatoire, plafond
    micro-BIC dépassé) à angles 2 px.
  - **Fiche LMNP / LMP** (`LMNPDetailView`) : barre d'en-tête portant « Reporter dans le Budget », Retour et
    Enregistrer ; à gauche Informations du bien (suffixes €), Zone géographique (tuiles à angles 2 px, la
    zone choisie en noir ; terrain / bâtiment en lignes libellé / valeur), Tableau d'amortissement (grille
    filetée), Revenus et Charges (listes à étiquettes lagon / citron, suppression confirmée) ; à droite le
    Résumé fiscal collant (résultat fiscal en 24 px, étiquette de déficit, rappel du bien) ; simulateur en
    bandeau bas. Charge utile d'enregistrement typée `TablesUpdate<'assets'>` (plus de `any`).
  - **Section « Revenus et charges »** (`RevenusChargesSection`, fiche du bien ; fenêtre `ImmobilierGestionDialog` pour les parts foncières) et formulaires d'ajout
    (`RevenuForm`, `ChargeForm`) : gabarit des fenêtres de panneau (arrière-plan flouté, en-tête et pied
    filetés, boutons 32 px, champs à angles 2 px, montant suffixé €). Report au Budget en encadré, onglets
    segmentés Revenus / Charges avec compteurs, lignes à étiquettes lagon / citron ; **la suppression d'une
    ligne passe désormais par une confirmation** (`WizardConfirmDialog`), comme dans Budget et Patrimoine.
  - **Synthèse foncière** (`FoncierFoyerSection`) : bandeaux bord à bord — en-tête avec encadré « Régime
    réel obligatoire » (angles 2 px), puis à gauche le taux marginal d'imposition (suffixe %) et les
    résultats du foyer en lignes libellé / valeur (déficit imputable et économie d'impôt si applicables),
    à droite les biens pris en compte (grille filetée, case « Rénov. E/F/G »), les déficits reportés
    consommés, le nouveau déficit reportable et le bouton de report ; enfin la bande « Déficits reportés »
    (liste filetée, étiquette lagon « Intérêts » / neutre « Hors intérêts », suppression au survol rouge)
    et le formulaire d'ajout (suffixe €, bouton noir 32 px).

- **`src/lib/immobilier/` centralise désormais la rentabilité location nue, LMNP et LMP, ainsi que
  l'agrégation foncière au niveau du foyer ; les KPI de portefeuille sont dans `portefeuille.ts`.**
  [rentabilite.ts](src/lib/immobilier/rentabilite.ts) réunit en fonctions pures
  testées (`rentabilite.test.ts`) : le calcul micro-foncier/réel **par bien** (location nue),
  `computeQuotePart` (quote-part d'indivision, partagée avec `foncierFoyer.ts`), l'amortissement du
  crédit (commun aux trois régimes), `computeAmortissementImmeubleLMNP`/`computeResultatReelLMNP`
  (déplacés depuis `LMNPDetailView.tsx` sans changer une formule, cf. commit d'extraction dédié) et
  `computeMicroBicLMNP`/`computeRentabiliteLMNP` pour LMNP (barème 2026), puis pour LMP
  `computeResultatReelLMP`/`computeRentabiliteLMP` qui réutilisent tels quels
  `computeAmortissementImmeubleLMNP` (mécanique comptable identique) et `computeMicroBicLMNP` (même
  barème) — seul le traitement fiscal du résultat réel diffère (pas de plafonnement de l'amortissement
  en LMP, cotisations sociales en saisie libre au lieu de PS fixes). Suit le pattern `lib/ifi/`/
  `lib/patrimoine/` demandé par `CLAUDE.md`.
  [foncierFoyer.ts](src/lib/immobilier/foncierFoyer.ts) (`foncierFoyer.test.ts`) réutilise `rentabilite.ts`
  (`computeAmortissement`, `computeQuotePart`, `computeLoyersAnnuels`/`computeChargesAnnuelles` via
  `buildBienFoncierInput`) mais applique les règles du CGI **au niveau du foyer** : seuil micro-foncier
  (15 000 €), plafond de déficit imputable (10 700 / 21 400 €), consommation FIFO du stock de déficits
  reportés (fourni en entrée par le service `deficitFoncierService.ts` / table `deficits_fonciers_reportes`
  — ce module ne persiste rien lui-même, fonction pure comme le reste de `lib/immobilier/`). Import à sens
  unique `foncierFoyer.ts` → `rentabilite.ts` (jamais l'inverse), pour éviter toute dépendance circulaire.
  **Dette restante** : les KPI de portefeuille (Vue d'ensemble, « Mes biens ») passent par
  [portefeuille.ts](src/lib/immobilier/portefeuille.ts), qui garde sa propre convention de périodicité
  (périodicité inconnue : annuelle pour un revenu, exclue pour une charge) distincte de
  `annualiserRevenu`/`annualiserCharge` de `rentabilite.ts` (qui suivent les deux conventions réellement
  stockées en base) — à vérifier avant toute fusion. Le résumé fiscal existant de
  `LMNPDetailView.tsx` (branche micro-BIC 50 %, sans plafond vérifié, appliquée indifféremment à
  LMNP/LMP) reste lui aussi non partagé avec `computeMicroBicLMNP` des nouveaux simulateurs (barème
  2026 avec plafonds) — choix délibéré pour ne pas toucher à son comportement existant, cf. §3.

- **Routage par nature « bien locatif » unifié — corrigé.** Les trois définitions divergentes de
  « bien locatif » ont été unifiées sur `RENTAL_PROPERTY_TYPES` (6 natures) —
  [immobilierPropertySchema.ts:32-39](src/schemas/immobilierPropertySchema.ts:32-39), source unique
  utilisée par `isRentalPropertyType()` (sections Financement/Location du formulaire) et les deux
  entrées « Revenus et charges » de
  [MesBiensList.tsx](src/components/immobilier/MesBiensList.tsx), qui référencent directement
  la constante au lieu de listes locales dupliquées ou tronquées (`.slice(0, 4)`). **`ImmobilierOverview.tsx`
  ne s'appuie plus sur cette liste du tout** depuis le fix du cashflow mensuel ci-dessous (§3) — le
  KPI de portefeuille traite désormais tous les biens transférés indifféremment de leur nature.
  Conséquence :
  « Autres immeubles de rapport » et « Parking / Garage / Box », qui activaient déjà les sections
  Financement/Location de la fiche détail mais n'avaient jamais de bouton « Gérer », y ont désormais
  accès comme les 4 autres natures locatives.

- **Meublé (LMNP/LMP) routé indépendamment, via une troisième liste.** `MEUBLE_NATURES` dans
  [ImmobilierSection.tsx](src/pages/immobilier/ImmobilierSection.tsx) (2 natures) décide si un clic sur une carte ouvre
  `LMNPDetailView` ou `ImmobilierPropertyDetailView` — logique dupliquée dans `handleManageInfo` et
  `handleGestion` (mêmes deux fonctions, même test `isMeuble`, appelé à 4 endroits du fichier).

- **LMNP et LMP partagent la même vue et le même amortissement comptable, mais plus le même résultat
  fiscal réel.** `LMNPDetailView` sert la nature « Immeubles locatifs (meublés) », statut LMNP ou LMP, et calcule
  le même tableau d'amortissement par composants (mécanique identique entre les deux statuts). Son
  résumé fiscal déduit dans les deux cas les intérêts d'emprunt et l'assurance emprunteur au régime réel
  et distingue le traitement de l'amortissement : LMNP le plafonne (`computeResultatReelLMNP`), LMP ne le
  plafonne pas et impute le déficit sans plafond sur le revenu global (`computeResultatReelLMP`) — donc
  les mêmes résultats que les simulateurs de rentabilité correspondants. Reste non traité : cotisations sociales SSI et régime
  des plus-values professionnelles pour le LMP, cf. §3/§4.

- **Frais de notaire pré-remplis à 7,5 %** par une seule fonction, `estimerFraisNotaire`
  ([rentabilite.ts](src/lib/immobilier/rentabilite.ts), arrondi à l'euro), utilisée par la fiche d'un bien
  (abonnement `form.watch` unique dans `useImmobilierPropertyForm.ts`) et par la fiche LMNP/LMP, et
  seulement quand l'utilisateur modifie le prix. Distinct du forfait légal de 7,5 % des frais
  d'acquisition pour la plus-value (`regimeFiscalPVI.ts`), qui reste à part.

- **Immobilier ↔ Sociétés.** `transfert_immobilier` est forcé à `true` pour toute nature de
  `ASSET_CATEGORIES['actifs immobiliers']` (cf. §1), sauf « Parts de SCI », pilotée par sa case
  manuelle (cochée par défaut). Il n'y a plus d'exclusivité avec le module Sociétés : aucune société
  n'est créée depuis un actif, et le rattachement à une société (`societe_id`, liste « Société liée »)
  ne fait apparaître l'actif nulle part ailleurs. `transfert_societe` n'est plus qu'un reflet de ce
  rattachement (`!!societe_id`, recalculé à chaque sauvegarde de l'actif).

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

- **Fiche des parts foncières et forestières** ([PartsFoncieresDetailView.tsx](src/components/immobilier/parts/PartsFoncieresDetailView.tsx),
  moteur [partsFoncieres.ts](src/lib/immobilier/partsFoncieres.ts), testé) pour les 4 natures de
  `PARTS_FONCIERES_NATURES` (SCPI, groupements fonciers, GFA/GAF/GFV/GFR, sociétés d'épargne
  forestière) — « Parts de SCI » reste sur Sociétés. Saisie (via `assetService.updateAsset`) des champs
  déjà captés par Patrimoine : gestionnaire, date, prix et frais d'acquisition, valeur estimée, revenus
  distribués sur 12 mois, régime fiscal. Les revenus distribués se saisissent en % (par défaut) ou en €
  ([RevenusDistribuesInput.tsx](src/components/immobilier/parts/RevenusDistribuesInput.tsx), partagé avec
  le formulaire Patrimoine) : le taux porte sur la **valeur estimée actuelle** et est converti en euros —
  seul le montant `revenus_distribues_12m` est stocké ; € imposé tant que la valeur estimée est vide.
  Indicateurs : taux de distribution (revenus ÷ valeur
  estimée, même base que le % saisi), rendement sur prix d'acquisition (revenus ÷ prix d'acquisition), plus-value latente pondérée comme la Vue
  d'ensemble (quote-part × fraction de démembrement, frais non pondérés par la fraction) ; rappel du
  régime d'exonération successorale pour les natures rurales. **Imposition indicative, aucun impôt
  calculé** — le revenu imposable n'est pas le revenu distribué mais la quote-part du résultat de la
  société (attestation fiscale) :
  - « Revenus fonciers… » : quote-part du résultat foncier ; micro-foncier possible seulement si le
    foyer loue aussi un bien nu **en direct** (art. 32 CGI, BOI-RFPI-DECLA-10 — `estBienNuEnDirect`),
    sinon réel obligatoire ; trésorerie en revenus de capitaux mobiliers.
  - « Revenus forestiers (forfait cadastral) » (option ajoutée aux groupements fonciers et aux GFR,
    `REGIME_FORFAIT_FORESTIER`) : bénéfices agricoles égaux au revenu cadastral des bois (art. 76 CGI),
    2042 C PRO, dus même sans coupe ni distribution.
  - SCPI fiscale : rappel de l'engagement de conservation ; « Dividendes » : PFU ou barème, avec
    avertissement (un groupement foncier ou forestier est en principe transparent) ; « Revenus
    forestiers » (sociétés d'épargne forestière) et « Autre » : selon attestation, non modélisés.
- **Revenus distribués dans les indicateurs de portefeuille** : pour ces 4 natures, sans aucune ligne
  `asset_revenus`, `computeFluxBien` retient `revenus_distribues_12m` (× quote-part) comme revenu annuel
  — jamais cumulé avec des lignes de revenus. Ils entrent donc dans la rentabilité et le cashflow de la
  Vue d'ensemble et de « Mes biens », pas dans « Gestion des biens » (qui liste les lignes saisies).

## 3. Dette identifiée

### 🔴 Bloquant

Corrigés (audit du 2026-10-17), sans données à rattraper — **vérifié en base** : aucun bien de nature
LMNP/LMP à cette date :

- **La fiche LMNP/LMP écrasait les frais de notaire à son ouverture.** Le recalcul à 7,5 % du prix d'achat
  était un `useEffect` sur `prixAchat`, donc exécuté au chargement ; le changement d'état déclenchait
  l'auto-sauvegarde sans aucune saisie. Fix : le recalcul n'a lieu que lorsque l'utilisateur modifie le
  prix d'achat (`handlePrixAchatChange`, [LMNPDetailView.tsx](src/components/immobilier/lmnp/LMNPDetailView.tsx)).
- **La fiche LMNP/LMP ramenait la date d'acquisition au 1er janvier** à chaque sauvegarde (seule l'année
  est saisie). Fix : `dateAcquisitionDepuisAnnee`
  ([dateAcquisition.ts](src/lib/immobilier/dateAcquisition.ts), testé) conserve la date stockée si l'année
  ne change pas, ne remplace que l'année sinon (29 février → 28), et ne se replie sur le 1er janvier
  qu'en l'absence de date.
- **La fiche LMNP/LMP doublait les travaux de construction** : le champ « Travaux » (rénovation +
  construction) était réécrit dans `travaux_renovation` sans vider `travaux_construction`, recompté à
  chaque rechargement. Fix : la somme est enregistrée dans `travaux_renovation` et `travaux_construction`
  remis à `null` — sans effet sur les calculs, les deux colonnes étant toujours lues additionnées.
- **Les intérêts d'emprunt étaient toujours reportés au lieu d'être imputés d'abord sur les loyers**
  (location nue, synthèse foncière et simulateur par bien). Le déficit imputable sur le revenu global était
  calculé sur `loyers − charges hors intérêts`, et la totalité des intérêts reportée. Or les intérêts
  s'imputent en priorité sur les loyers (notice 2044, BOI-RFPI-BASE-30-20-10) : seule leur fraction non
  couverte est reportable. Fix : `repartirDeficitFoncier` (rentabilite.ts, testé), utilisé par
  `computeFoyerFoncier` et `computeRentabilite`. **Vérifié sur cas concret** : loyers 5 000 €, charges
  8 000 €, intérêts 3 000 € → 6 000 € imputables, 0 reporté (avant : 3 000 € imputables, 3 000 € reportés) ;
  loyers 2 000 €, charges 5 000 €, intérêts 4 000 € → 5 000 € imputables, 2 000 € d'intérêts reportés.
  Foyer de l’aperçu : un seul bien loué nu, bénéficiaire et sans crédit — chiffres inchangés.
- **La fiche d'un bien non meublé enregistrait la date d'acquisition à la veille.** `toISOString()`
  convertissait le minuit local en UTC (22 h/23 h la veille) avant écriture dans une colonne `date`. Fix :
  `format(date, 'yyyy-MM-dd')`, comme Patrimoine
  ([useImmobilierPropertyForm.ts](src/hooks/useImmobilierPropertyForm.ts)). **Limite** : les dates déjà
  enregistrées par cette fiche peuvent être décalées d'un jour, indiscernables automatiquement d'une
  saisie exacte.

Incohérences corrigées (audit du 2026-10-17) :

- **Deux « rentabilité brute » pour un même bien** : « Mes biens » et la Vue d'ensemble rapportaient les
  loyers à `valeur_acquisition`, le simulateur au prix de revient. Base unique désormais (`computePrixRevient`,
  §2) ; libellés de la Vue d'ensemble « loyers / prix de revient » et « après charges / prix de revient ».
- **Régimes fiscaux et type de location** : `PropertyLocationSection` propose les régimes selon le type de
  location choisi (Micro-foncier/Réel en location nue, Micro-BIC/BIC en meublé) et non plus selon la nature,
  vide un régime devenu incompatible au changement de type, et limite la nature « Immeubles locatifs (loués
  nus) » au type « Location nue ».
- **Biens retenus par la synthèse foncière** : `assetService.getBiensLocationNue` exige en plus
  `transfert_immobilier = true` et une nature immobilière hors LMNP/LMP (une SCI rattachée à Sociétés ou un
  bien meublé marqué « Location nue » n'y entrent plus). Aucune ligne concernée en base.
- **Un `0` enregistré redevenait vide au chargement** de la fiche : `numOrEmpty` dans
  `useImmobilierPropertyForm.ts` (seul `null` donne un champ vide), pendant de `numOrNull`.
- **Fiche périmée après sauvegarde** : `ImmobilierSection.tsx` mémorise l'identifiant du bien ouvert et le
  relit dans la liste rechargée, au lieu d'une copie figée au clic.

Nettoyage (audit du 2026-10-17) : `ImmobilierPropertyDialog.tsx` (code mort, jamais importé) supprimé ;
frais de notaire factorisés (`estimerFraisNotaire`) ; écritures des fiches et bascule budget via
`assetService` (la bascule de la fiche LMNP ignorait les erreurs Supabase et annonçait « Transfert
activé » même en cas d'échec ; la fenêtre « Revenus et charges » relançait une bascule globale après
chaque ajout, écrasant le choix fait dans le formulaire) ; Vue d'ensemble chargée en deux requêtes pour
tout le portefeuille au lieu de deux par bien ; plus d'affichage « Aucun bien immobilier » pendant le
premier chargement.

Corrigés lors de l'audit initial (2026-08-27), vérifiés sur cas concret :

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

- **Le cashflow mensuel de portefeuille excluait silencieusement les biens non locatifs — corrigé.**
  `ImmobilierOverview.tsx` limitait l'accumulation de `totalRevenusMensuels`/`totalChargesMensuelles`
  (utilisées pour la card « Cashflow mensuel ») aux biens dont la nature appartient à
  `RENTAL_PROPERTY_TYPES` (6 natures sur 18), via un filtre `isLocative` — alors que
  `totalLoyerAnnuel`/`totalChargesAnnuelles` (utilisées pour « Rentabilité nette ») sommaient déjà
  **tous** les biens sans ce filtre. Or des charges/revenus peuvent exister sur un bien de nature non
  locative (ex. taxe foncière sur une résidence secondaire) : le formulaire générique d'actif
  (`AssetForm.tsx`, onglet « Charges », via `src/components/assets/ChargeForm.tsx`) n'est pas restreint
  par nature et permet d'en ajouter sur n'importe quel actif, contrairement au bouton « Gérer »
  d'Immobilier qui, lui, n'apparaît que pour les natures locatives. Résultat : une telle charge réduisait
  la rentabilité nette affichée mais jamais le cashflow mensuel — les deux cards du même écran
  n'agrégeaient pas le même périmètre de biens. Fix : suppression du filtre `isLocative`
  ([ImmobilierOverview.tsx](src/components/immobilier/ImmobilierOverview.tsx)) — le cashflow mensuel
  traite désormais tous les biens transférés, comme la rentabilité et comme l'onglet « Gestion des
  biens » (§1).

- **« Valeur totale » et « Plus-value brute » de la Vue d'ensemble ignoraient le démembrement et le
  coût d'acquisition générique — corrigé, aligné sur le Résumé Patrimoine.** Deux écarts distincts avec
  `usePatrimoineCalculations`/`PatrimoinePlusValues.tsx` : (1) un bien en usufruit/nue-propriété était
  compté à sa valeur estimée pleine, alors que Patrimoine la pondère par la fraction du barème 669 CGI
  (`getFractionDemembrement`) ; (2) le coût d'acquisition pour la plus-value ne regardait que les champs
  immobilier détaillés (`montant_immeuble` + frais annexes), valant `0` pour un actif créé via le
  formulaire générique Patrimoine (seuls `valeur_acquisition`/`frais_acquisition` renseignés) — toute sa
  valeur comptait alors comme plus-value. Fix : `ImmobilierOverview.tsx` importe désormais
  `getFractionDemembrement` (même contexte que `PatrimoinePlusValues.tsx` — `useFamilyProfile`/
  `useMaritalStatus`/`useFamilyLinks`, `assetDemembrementService.getAllForUser()`), exclut des deux
  totaux un bien démembré dont l'âge de l'usufruitier n'est pas calculable (même traitement que
  Patrimoine, pas compté à sa valeur pleine), et replie le coût d'acquisition sur
  `valeur_acquisition × fraction + frais_acquisition` (frais non pondéré, à l'identique de
  `calculatePlusValue`) quand les champs détaillés sont vides. **Vérifié sur cas concret** (données
  réelles, lecture seule) : résidence secondaire en usufruit à 300 000€, usufruitier de 26 ans (tranche
  669 → 80 %) → 240 000€ au lieu de 300 000€, désormais identique aux 1 062 000€ de « Valeur totale »
  affichés par Patrimoine pour le même périmètre de biens ; plus-value recalculée à la main
  (20 000 + 40 000 − 8 000 − 45 500 = 6 500€) conforme à l'écran.

### 🟠 À surveiller (cas limite, peu probable)

- **Deux lectures de `pourcentage_utilisateur`/`pourcentage_conjoint`** : Immobilier
  (`computeQuotePart`) additionne les deux pourcentages, quelle que soit la qualification du bien ;
  Patrimoine (`getRepartitionFoyer`) ne les lit qu'en « Indivision » et attribue au conjoint le
  complément d'un pourcentage saisi seul. Un bien « utilisateur 50 % » compte donc pour 50 % dans les
  indicateurs, la projection et les simulateurs d'Immobilier, mais pour 100 % du foyer dans Patrimoine
  et dans la simulation de revente (qui suit Patrimoine pour l'impôt par cédant).

- **Simulateurs LMNP/LMP sans quote-part** : `computeRentabiliteLMNP`/`LMP` et le résumé fiscal de
  `LMNPDetailView` ne pondèrent ni loyers, ni charges, ni crédit par la quote-part du foyer (convention
  existante, conservée pour le crédit issu d'un emprunt Patrimoine, compté à 100 %), contrairement au
  simulateur location nue et aux indicateurs de portefeuille.
- **Projection de la fiche non rafraîchie** après l'ajout d'un revenu ou d'une charge depuis la fiche
  LMNP/LMP ou la fenêtre « Revenus et charges » : elle relit ses données à l'ouverture de la fiche.

- **Groupement forestier classé en GFA/GFV** : au 2026-10-17, une ligne de parts d'un groupement
  forestier d'investissement est saisie en nature « Parts de GFA, GAF, GFV et GFR » avec le régime
  fiscal « Dividendes ». Son régime d'exonération successorale (forestier) est correct ; son régime
  d'imposition devrait être le forfait cadastral. Aucune nature « groupement forestier » dédiée
  n'existe : « Parts de groupements fonciers » est la plus proche. Correction de saisie laissée à
  l'utilisateur.

- **Le résumé fiscal de `LMNPDetailView.tsx` ne modélise pas les cotisations sociales SSI ni la
  plus-value professionnelle du LMP.** La distinction du régime réel est faite : `computeResultatReelLMNP` plafonne
  l'amortissement déductible, `computeResultatReelLMP` ne le plafonne pas, déduit intérêts et assurance
  emprunteur et impute le déficit sans limite sur le revenu global — dans le résumé fiscal comme dans
  les simulateurs de rentabilité (§1). Les intérêts du résumé viennent des champs de financement
  enregistrés sur l'actif, alors que le tableau d'amortissement suit les champs en cours de saisie :
  ils peuvent différer jusqu'à la sauvegarde automatique (1,5 s).
- **`assetService.getAssetCharges`/`getAssetRevenus` sans filtre `user_id` applicatif**, à la
  différence du reste du durcissement « défense en profondeur » de Patrimoine (commit `ea3a695`) —
  couvert par les RLS, qui sont correctes, mais incohérent avec la méthode appliquée ailleurs.
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
  par bien dans la fiche détail (cashflow, rendements, déficit foncier plafonné à 10 700 €/an, quote-part
  d'indivision, régime le plus favorable au TMI saisi, badge régime actif si `regime_location` renseigné)
  — cf. §1/§2. **Complété par la synthèse foncière du foyer** (§1) qui, elle, applique les règles au
  niveau du foyer (seuil micro-foncier à 15 000 €, plafond de déficit à 10 700/21 400 €, report du
  déficit sur 10 ans via un stock saisi manuellement). Pas de projection pluriannuelle, pas de calcul de
  plus-value à la revente, pas de lien avec le module Fiscalité (2042/2044 — décision explicite).
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
- **V1 — en place (ajout)** : onglet « Gestion des biens » implémenté (vue consolidée en lecture seule
  de tous les revenus/charges du portefeuille, groupés par bien, avec montant annualisé et sous-totaux)
  — cf. §1. Fetch en 3 requêtes au total pour tout le portefeuille (`getAssetRevenusByAssetIds`/
  `getAssetChargesByAssetIds`, nouvelles méthodes `.in('asset_id', ...)` dans `assetService.ts`), pas
  une par bien. Aucun ajout/modification/suppression depuis cet écran, le bouton « Gérer » reste
  l'unique point d'édition.
- **Différé, déductible du code** :
  - **Location nue pour les 5 autres natures de `RENTAL_PROPERTY_TYPES`** (Autres immeubles de rapport,
    Parking/Garage/Box, etc.) : toujours aucun moteur de calcul dédié, gate du simulateur strictement
    limité à « Immeubles locatifs (loués nus) ».
  - **Terrains, Bois & forêts, Maison mobile, Autres biens d'usage** : ces natures apparaissent dans
    « Mes biens » si transférées (elles appartiennent à `ASSET_CATEGORIES['actifs immobiliers']`, et le
    transfert est automatique — cf. §1), mais leur fiche affiche « La gestion des informations pour
    cette catégorie sera disponible prochainement » (`ImmobilierPropertyDetailView.tsx`) : gap assumé.
  - **Parts foncières/forestières : intégration à la synthèse foncière différée** (décision du
    2026-10-17). Le revenu foncier imposable des parts (quote-part du résultat de la société, attestation
    fiscale) n'est pas saisi : il faudrait une colonne dédiée pour l'ajouter au seuil de 15 000 € et aux
    déficits du foyer. Aucun impôt n'est donc calculé pour ces parts ; l'IFI n'est pas chiffré non plus
    (seuils d'exonération GFA et numérotation de l'art. 976 CGI non vérifiés sur source officielle).
  - **Crédit d'un bien : l'emprunt Patrimoine relié fait foi** (décision du 2026-10-17). Moteur
    [credit.ts](src/lib/immobilier/credit.ts) (testé) : un emprunt de Patrimoine → Passifs dont
    `asset_id` pointe sur le bien remplace les champs « Financement » de la fiche. Échéancier bâti depuis
    le capital restant dû saisi, à la date de dernière modification de l'emprunt (`updated_at`, seule
    date de référence, comme le Budget), le taux, et la mensualité (prioritaire) ou à défaut la durée
    restante ; prêt in fine : intérêts seuls puis capital à la dernière échéance. Sans mensualité ni
    durée (ou mensualité ≤ intérêts) : échéancier incomplet, signalé, capital restant dû maintenu
    constant. Part du foyer = celle de l'emprunt (`partFoyerEmprunt`, règle du Budget), repli sur la
    quote-part du bien si l'emprunt n'est pas qualifié ou est porté par une société. L'assurance
    emprunteur n'est pas connue pour un emprunt Patrimoine (0). **Repli** : sans emprunt relié, les champs
    `financement_*` (crédit supposé démarré à `date_acquisition`, `computeAmortissement`) restent utilisés.
    Point d'entrée unique `creditAnnuelBien` (rentabilite.ts), consommé par le cashflow de la Vue
    d'ensemble et de « Mes biens », les trois simulateurs, la synthèse foncière (intérêts déjà à la part
    du foyer, `partCredit`) et le résumé fiscal LMNP/LMP. La section Financement de la fiche affiche
    l'emprunt relié (lecture seule, renvoi vers Patrimoine) à la place de ses champs. Les emprunts sont
    chargés une fois avec les biens (`useImmobilierAssets`, `passifService.getEmpruntsByAssetIds`).
  - **Projection pluriannuelle** ([projection.ts](src/lib/immobilier/projection.ts),
    [projectionBien.ts](src/lib/immobilier/projectionBien.ts), testés ;
    [ProjectionPanel.tsx](src/components/immobilier/projection/ProjectionPanel.tsx)) dans la fiche des
    résidences et biens locatifs, la fiche LMNP/LMP et la Vue d'ensemble (somme des biens). Périodes de
    12 mois à partir du mois prochain, jusqu'à la fin du crédit le plus long, bornées à 10–30 ans : loyers
    et charges de l'année (computeFluxBien, quote-part) revalorisés selon des hypothèses saisies sur
    l'écran (0 % par défaut, **non persistées**), remboursements et assurance, cashflow **avant impôt**,
    capital restant dû, valeur (valeur estimée × quote-part × fraction de démembrement actuelle, supposée
    constante) et valeur nette. Graphique à une seule échelle (cashflow ou valeur nette, au choix) et
    tableau complet. La projection de la fiche LMNP/LMP porte sur les données enregistrées, pas sur la
    saisie en cours. Hors périmètre : impôt année par année.
  - **Simuler une revente** ([revente.ts](src/lib/immobilier/revente.ts), testé ;
    [SimulationReventeSection.tsx](src/components/immobilier/revente/SimulationReventeSection.tsx)) dans la
    fiche des résidences et biens locatifs, la fiche LMNP/LMP et la fiche des parts de SCPI. Rien n'est
    enregistré. Hypothèses **toutes modifiables** : date de vente (aujourd'hui), prix (valeur estimée),
    frais de vente à la charge du vendeur (déduits du prix), travaux réels retenus, amortissements LMNP
    déduits et case « résidence étudiante, seniors ou EHPAD », pénalités de remboursement anticipé.
    Calcul :
    - plus-value via `computePVIRegime` de Patrimoine (abattements à la date de vente, IR 19 %, PS
      17,2 %, surtaxe par cédant, forfaits) ; prix d'achat = `montant_immeuble`, sinon
      `valeur_acquisition` ; frais d'acquisition réels = **notaire + agence** (frais bancaires et
      d'hypothèque exclus, non déductibles), sinon `frais_acquisition` ;
    - travaux réels proposés par défaut (art. 150 VB II 4° CGI, vérifié sur le BOFiP
      BOI-RFPI-PVI-20-10-20-20 : amélioration, construction, agrandissement facturés et jamais déduits ;
      entretien et réparation exclus ; forfait de 15 % au choix après 5 ans) : bien loué nu →
      construction seule ; bien non loué → rénovation + construction ; meublé → 0 (travaux amortis). Le
      champ « rénovation » ne distinguant pas amélioration et entretien, la valeur est à vérifier ;
    - LMNP : amortissements déduits réintégrés pour une vente à compter du 15/02/2025 (hors résidences
      services), estimation par défaut = amortissement annuel de l'immeuble (hors mobilier) × années de
      détention, borné à la durée de chaque composant — un maximum, à remplacer par le cumul réel ;
    - part du foyer et répartition entre cédants selon `getRepartitionFoyer` (règle de Patrimoine) ;
    - crédit : capital restant dû à la date de vente (échéancier de credit.ts) et pénalités au plafond
      légal par défaut (6 mois d'intérêts au taux du prêt, au plus 3 % du capital restant dû,
      art. L313-48 C. consom.), modifiables (0 si le prêt n'en prévoit pas) ;
    - net perçu par le foyer = prix net × part du foyer − impôt − capital restant dû − pénalités.
    Hors périmètre, signalé : LMP (plus-values professionnelles, art. 151 septies), biens démembrés,
    groupements fonciers et forestiers, terrains agricoles, exonérations particulières (première cession
    avec remploi, cession ≤ 15 000 €, retraités modestes).
  - **Distinction LMNP/LMP** dans le calcul lui-même : les nouveaux simulateurs de rentabilité
    distinguent désormais les deux statuts (plafonnement de l'amortissement et PS à 18,6 % en LMNP ;
    pas de plafonnement, déficit imputable sans limite et cotisations sociales en saisie libre en LMP,
    gate `asset.type_location === 'Location meublée professionnelle (LMP)'`), et le résumé fiscal de `LMNPDetailView.tsx`
    applique la même distinction au régime réel (§2).
  - **Autres natures de `RENTAL_PROPERTY_TYPES` que « Immeubles locatifs (loués nus) »** (Parking/Garage/Box,
    Autres immeubles de rapport...) : même en location nue, elles n'ont toujours pas de fiche
    Financement/Location dédiée avec simulateur — seule la nature « Immeubles locatifs (loués nus) »
    déclenche `SimulateurRentabiliteSection`. Elles sont en revanche bien prises en compte par la
    **synthèse foncière du foyer** (§1), qui filtre sur `type_location === 'Location nue'` parmi les
    biens transférés de nature immobilière hors LMNP/LMP.
