# Module Patrimoine

> Document consolidé le 2026-08-27, fusion de `docs/audit-patrimoine-2026-07-28.md` (audit de fond —
> moteur, modèle de données, calculs, dépendances, commit `a257cdc`) et `docs/audit/audit-patrimoine.md`
> (audit écran par écran avec navigation réelle, commit `2835f30`, 2026-07-29). Les bugs bloquants et
> gênants ont été revérifiés contre le code au 2026-08-27 (voir commits `bc4e1ac`, `ea3a695`, `a41c7bf`,
> `5e4ad88`) ; les sections architecture/modèle de données sont reprises telles quelles, la structure
> n'ayant pas changé depuis. Les items « mineurs » n'ont pas tous été revérifiés individuellement.

## 1. Vue d'ensemble

Le module Patrimoine saisit, qualifie civilement et valorise chaque actif et passif du foyer. C'est
le socle de donnée de la Transmission (masse successorale civile et fiscale), de l'IFI et des
alertes de conseil — la qualification juridique d'un bien (propre / commun / personnel / indivision)
n'est calculée qu'à cet endroit et consommée partout ailleurs en aval.

**Écrans** (3 onglets de `PatrimoineSection.tsx` + 1 vue de substitution) :

| Onglet | Composant | Rôle |
|---|---|---|
| Résumé (par défaut) | [PatrimoineResume.tsx](src/components/patrimoine/PatrimoineResume.tsx) | Totaux, donut de répartition, courbe d'évolution, patrimoine par tête, aperçu plus-values |
| Actifs | [PatrimoineActifs.tsx](src/components/patrimoine/PatrimoineActifs.tsx) → [PatrimoineTreeView.tsx](src/components/patrimoine/PatrimoineTreeView.tsx), [AssetForm.tsx](src/components/assets/AssetForm.tsx) | Saisie/qualification/valorisation de chaque actif, bascule vers Immobilier et Sociétés |
| Passifs | [PatrimoinePassifs.tsx](src/components/patrimoine/PatrimoinePassifs.tsx) → [PassifEmpruntForm.tsx](src/components/patrimoine/PassifEmpruntForm.tsx) | Formulaire fusionné emprunts (`emprunts`) / dettes simples (`passifs`) |
| Plus-values (détail) | [PatrimoinePlusValues.tsx](src/components/patrimoine/PatrimoinePlusValues.tsx) | Détail de la plus/moins-value latente par actif et fiscalité applicable, accessible depuis la carte Plus-values du Résumé |

**Tables Supabase** : `assets`, `asset_charges`, `asset_revenus`, `asset_valorisations`,
`asset_demembrements`, `asset_indivisaires`, `emprunts`, `passifs`, plus le volet régime matrimonial
saisi côté Famille mais consommé ici : `recompenses`, `creances_entre_epoux`, `patrimoine_originaire`,
`patrimoine_final`, `marital_status`.

**Flux clés** :
- Un actif est saisi via `AssetForm` (4 onglets : Général / Détention & Acquisition / Valorisation /
  Charges) ; sa qualification civile (`qualification_bien`) est recalculée automatiquement à chaque
  changement d'un des 10 champs surveillés, tant que `qualification_auto = true`.
- Un emprunt ou un passif simple partage un formulaire fusionné, aiguillé par la nature
  (`EMPRUNT_NATURES`) vers l'une ou l'autre table.
- Le Résumé agrège trois fois les mêmes données (KPI globaux, donut, patrimoine par tête) via des
  chemins de calcul **indépendants**, avec des règles de pondération différentes (voir §3, P1).
- La plus-value d'un actif (`valeur_estimée − valeur_acquisition − frais`) est croisée avec un
  régime fiscal (mobilier ou immobilier) déterminé par la nature de l'actif et sa durée de détention.

## 2. Architecture & décisions

- **Moteur métier centralisé dans `src/lib/patrimoine/`** — fonctions pures, conformément au pattern
  `lib/ifi/` demandé par `CLAUDE.md`. Fichiers pivots :
  - [qualification.ts](src/lib/patrimoine/qualification.ts) — `qualifierBien(ctx)`, point d'entrée
    unique de la qualification civile, cascade de 12 branches ordonnées (la première qui matche
    gagne). Détection des régimes par `String.includes()` sur le libellé humain, pas par énumération.
  - [succession.ts](src/lib/patrimoine/succession.ts) — `getPartSuccessorale()` /
    `getPartConjointSuccession()`, source unique de vérité de la fraction successorale d'un bien,
    partagée entre Patrimoine (affichage) et Transmission (civil et fiscal). Refuse explicitement de
    deviner : `BienNonQualifieError` si `qualification_bien` est absent ou `'À qualifier'`.
  - [avantagesMatrimoniaux.ts](src/lib/patrimoine/avantagesMatrimoniaux.ts) — ajuste la fraction sous
    l'effet des clauses (préciput, attribution intégrale, partage inégal). Seul 6 des 33 `ClauseType`
    déclarés sont réellement lues par un moteur de calcul ; les 27 autres sont déclaratives.
  - [recompensesCreances.ts](src/lib/patrimoine/recompensesCreances.ts) /
    [participationAcquets.ts](src/lib/patrimoine/participationAcquets.ts) — récompenses/créances entre
    époux et créance de participation aux acquêts (décès uniquement, le divorce est hors périmètre).
  - [regimeFiscalPlusValue.ts](src/lib/patrimoine/regimeFiscalPlusValue.ts) /
    [regimeFiscalPVI.ts](src/lib/patrimoine/regimeFiscalPVI.ts) — régimes fiscaux des plus-values
    mobilières et immobilières ; renvoient `non_determine`/`null` plutôt que de deviner hors des
    natures couvertes. Depuis le 2026-08-27, la séquence commune « nature effective → régime PVI →
    sinon régime générique » est factorisée dans
    [assetFiscalRegime.ts](src/lib/patrimoine/assetFiscalRegime.ts) (commit `5e4ad88`), qui était
    dupliquée à l'identique dans `PatrimoineTreeView` et `PatrimoinePlusValues`.

- **Cascade de qualification (`qualifierBien`)** — ordre exact : indivision explicite → hors couple →
  propre par nature → clause de remploi → société d'acquêts → séparation/participation → origine
  gratuite → communauté universelle → antériorité au mariage → PACS → financement mixte (art. 1436) →
  défaut (bien commun). `mode_detention` (démembrement) fait partie du contexte transmis mais n'est
  **jamais lu** dans le corps de la fonction : un usufruit ou une nue-propriété est qualifié comme la
  pleine propriété (limite connue, non un bug — cf. §3).

- **Convention de détenteur, source de divergences.** Quatre vocabulaires coexistent pour la même
  notion selon la table : `assets.detenteur` (`user`/`spouse`/`common`/`Indivision`),
  `asset_charges.debiteur` (`'Époux 1'`/`'Époux 2'`/`'Couple'`), `emprunts.contributeur_remboursement`
  (`utilisateur`/`conjoint`/`les_deux`), `assets.licitation_acquereur` (`utilisateur`/`conjoint`). Le
  point d'entrée `isDetenteurCommon()` ([utils.ts](src/lib/patrimoine/utils.ts)) a été introduit pour
  unifier au moins la lecture du détenteur brut base de données ; il n'est pas encore utilisé partout
  où une comparaison de chaîne équivalente existe (cf. §3, société d'acquêts).

- **Garde-fous détenteur ↔ qualification** — implémentés à l'identique dans `useAssetForm.ts` et
  `usePassifEmpruntForm.ts` : si la qualification devient `Bien propre`/`Bien personnel` alors que le
  détenteur est « Le couple », le détenteur et les pourcentages sont réinitialisés et l'option « Le
  couple » retirée du menu. Motif documenté dans le code : incident du 2026-07-18 (pourcentages
  saisis mais silencieusement ignorés par le calcul de succession).

- **Sécurisation de la sauvegarde d'un actif (commit `a41c7bf`, 2026-08-27).** La séquence de
  sauvegarde (actif + valorisation + charges + indivisaires + démembrement + société) enchaînait
  plusieurs appels réseau indépendants sans remonter les échecs : `replaceForAsset` insère désormais
  les nouvelles lignes **avant** de supprimer les anciennes (au lieu de l'inverse, qui perdait la
  donnée si l'insert échouait), et les étapes annexes tournent en `Promise.allSettled` avec un message
  d'erreur unique regroupant les échecs partiels — l'actif reste la seule étape bloquante.

- **Défense en profondeur RLS + RGPD (commit `ea3a695`, 2026-08-27).** Filtre applicatif `user_id`
  ajouté sur les `select`/`update`/`delete` qui reposaient uniquement sur les policies RLS
  (`assetService`, `assetValorisationService`, `assetDemembrementService`,
  `assetIndivisaireService`, et les services Sociétés) ; tous les `console.error`/`warn` du
  périmètre sont désormais encadrés par `import.meta.env.DEV` ; les `.catch` silencieux ont été
  remplacés par un toast d'erreur visible, sur le modèle déjà appliqué au module Famille.

- **Emprunts intégrés au passif transmis (2026-07-28, avant ce document).** `buildPassifLines`
  ([transmissionHelpers.ts](src/utils/transmissionHelpers.ts)) fusionne `passifs.montant_du` et
  `emprunts.capital_restant_du`, en excluant les emprunts de société, puis déduit la part couverte
  par l'assurance emprunteur (`capital_garanti_deces` prime sur les quotités en pourcentage). Ce
  filtrage sur `societe_id` n'a **pas** été répliqué côté KPI du Résumé Patrimoine (cf. §3, P29).

- **Découplage Patrimoine → Sociétés/Immobilier.** `societeTransfer.ts` bascule un actif éligible
  vers une ligne `societes` ; les champs « immobilier étendu » de la table `assets` (`typologie_bien`,
  `surface_m2`, financement…) sont portés par les mêmes lignes mais consommés uniquement par le
  module Immobilier. Le couplage Patrimoine → Transmission est en revanche fort et unidirectionnel :
  aucun fichier de `lib/patrimoine/` n'importe `lib/transmission/`.

## 3. Dette identifiée

### 🔴 Bloquant (peut fausser un calcul montré au client)

- **Emprunts/passifs de société comptés deux fois dans le patrimoine personnel.**
  [usePatrimoineCalculations.ts](src/hooks/usePatrimoineCalculations.ts) (KPI du Résumé),
  `useAlertesConseil.ts` et `PatrimoineChart.tsx` n'excluent pas les emprunts portant un `societe_id`,
  contrairement à `buildPassifLines` côté Transmission qui le fait déjà depuis le 2026-07-28. Un
  crédit porté par une société (déjà reflété dans la valorisation des parts) est donc doublé dans le
  tableau de bord Patrimoine. *(Vérifié toujours ouvert au 2026-08-27.)*
- **Passif « Bien propre »/« Bien personnel » toujours déduit à 100 % du patrimoine transmissible,
  quel que soit son détenteur réel.** `getFractionPassifAjustee`
  ([avantagesMatrimoniaux.ts](src/lib/patrimoine/avantagesMatrimoniaux.ts)) ne retourne une valeur que
  pour la qualification `Bien commun` ; pour toute autre qualification l'appelant applique 100 %
  côté Transmission car `PassifLine` ne transporte même pas le champ `detenteur`. Le module Patrimoine
  lui-même pondère correctement par détenteur — divergence de méthode entre les deux modules pour la
  même donnée. *(Vérifié toujours ouvert : `PassifLine` ne porte que `montant_du` et
  `qualification_bien`.)*
- **La fraction de démembrement n'est jamais appliquée aux totaux affichés.** `mode_detention` n'est
  lu par aucun agrégat (`financialSummary`, `patrimoineParPersonne`, `PatrimoineChart`,
  `PatrimoinePlusValues`) : un bien détenu en nue-propriété est compté à 100 % de sa valeur pleine
  propriété partout sauf dans la fiche détail de l'actif (barème 669 CGI, informatif uniquement).
  *(Vérifié toujours ouvert.)*
- **`qualification_bien` stocké n'est réactualisé qu'à la réouverture-soumission de l'actif
  concerné.** `succession.ts`/`avantagesMatrimoniaux.ts`/`usePatrimoineCalculations.ts` lisent la
  valeur **stockée** ; `AssetDetailsDialog.tsx` en affiche une, lui, **recalculée à la volée**. Un
  changement de régime matrimonial (module Famille) sans réouverture de chaque actif laisse les
  moteurs de succession/DMTG travailler sur une qualification obsolète alors que la fiche détail
  montre la valeur à jour — deux vues incohérentes sur une donnée fiscale sensible. *(Architectural,
  non retouché depuis l'audit.)*
- **Un emprunt/passif créé avec succès (toast + écriture DB confirmée) n'apparaît pas dans la liste
  tant que l'onglet Passifs n'est pas rechargé.** `usePassifEmpruntForm.ts` et
  `PatrimoinePassifs.tsx` possèdent chacun leur **propre instance** de `useEmprunts()`/`usePassifs()`
  (simple `useState` local, sans store partagé) — la création met à jour l'état du formulaire, qui se
  démonte aussitôt, jamais celui du parent. Le module Actifs évite ce problème (`PatrimoineActifs.tsx`
  possède l'unique instance de `useAssets()` et la transmet à `AssetForm` par prop). *(Vérifié
  toujours ouvert.)*
- **`mode_detention = 'Nue-propriété'` écrase silencieusement `origine_actif`.** `useAssetForm.ts`
  force `origine_actif = ['Acquisition à titre gratuit']` sans confirmation dès que l'utilisateur
  sélectionne Nue-propriété, alors qu'une nue-propriété peut être acquise à titre onéreux (montage
  démembré, viager) — qualification civile erronée en cascade sur un bien pourtant correctement
  renseigné par ailleurs. *(Vérifié toujours ouvert.)*
- **Branche « société d'acquêts » : convention de détenteur incohérente entre le formulaire et la
  fiche détail.** `qualification.ts` teste encore `detenteur.toLowerCase().includes('couple')` dans
  cette branche, alors que `useAssetForm.ts` transmet la valeur d'affichage `'Le couple'` (qui
  matche) et `AssetDetailsDialog.tsx` transmet la valeur brute `asset.detenteur = 'common'` (qui ne
  matche pas) — contrairement à la branche concubinage, corrigée pour utiliser `isDetenteurCommon()`.
  Un bien détenu par les deux sans désignation, sous ce régime, peut donc afficher deux qualifications
  contradictoires selon l'écran (`Indivision` au formulaire, `Bien propre` en fiche détail). *(Signalé
  comme non corrigé dans l'audit d'origine, vérifié toujours ouvert au 2026-08-27.)*
- **`calculatePlusValue` traite une valeur d'acquisition non renseignée comme si elle valait `0`.**
  Le garde-fou ne teste que `valeurAcquisition === undefined` ; `assetService.getAssets()` fait un
  `select('*')` brut sans normalisation, donc une colonne non renseignée remonte en JS comme `null`
  (`null !== undefined`) et l'arithmétique traite `null` comme `0`. Un actif sans valeur d'acquisition
  saisie affiche une plus-value ≈ 100 % de sa valeur estimée au lieu d'un message « à renseigner ».
  *(Vérifié toujours ouvert : pas de normalisation ajoutée à `assetService`.)*

### 🟠 À surveiller (cas limite, peu probable)

- **Le bandeau « éléments non qualifiés, exclus des totaux » ne correspond à aucun des totaux
  réellement affichés en dessous.** `unqualifiedItems` (exclusion) n'est calculé que dans
  `patrimoineParPersonne` ; les cartes KPI lisent `financialSummary` (aucune exclusion) et le donut
  refait un **troisième** calcul indépendant, non filtré lui non plus.
- **Charges en unité `%` traitées comme des montants en euros dans le Budget.** `budgetService.ts` ne
  sélectionne pas la colonne `unite` : une charge « 8 % des loyers » remonte comme « 8 €/mois ».
- **Impossible de saisir explicitement `0`** sur les principaux champs monétaires de `AssetForm`
  (`parseFloat(e.target.value) || undefined` — `0` est falsy en JS). Un bien dévalorisé ou sans frais
  ne peut pas être saisi tel quel ; distinct du durcissement `.nonnegative()` du commit `5e4ad88`, qui
  bloque le négatif mais ne corrige pas ce cas précis. *(Vérifié toujours présent aux mêmes lignes.)*
- **Carte « Dont IR exonéré » additionne l'assiette brute au lieu de l'impôt réel.**
  `PatrimoinePlusValues.tsx` calcule `totalExonerePartiel` en sommant `plusValue` (l'assiette) alors
  que la carte voisine « Fiscalité estimée » affiche un montant d'impôt ; pour ces actifs l'impôt
  réel n'est qu'à 18,6 % (PS seuls) de ce montant — la carte « Dont » peut afficher plus que le total
  dont elle est censée être un sous-ensemble. *(Vérifié toujours ouvert.)*
- **Pas d'historisation du régime matrimonial.** Un changement de régime en cours d'union est
  appliqué rétroactivement à tous les biens ; `scenarios_regime` enregistre l'intention mais n'est
  utilisée que par le moteur d'alertes, jamais par la qualification.
- **Aucune contrainte CHECK en base** sur `qualification_bien`, `detenteur`, `mode_detention`,
  `nature`, `sens`, `epoux`, `nature_depense`, `mode_evaluation_conventionnel`, `regime_matrimonial` :
  la fermeture des listes repose entièrement sur les constantes TypeScript de l'UI.
- **`passifService` sans contrôle d'appartenance explicite**, contrairement à `assetService` — repose
  uniquement sur les RLS pour `update`/`delete`. Le durcissement du commit `ea3a695` a couvert les
  services actifs/sociétés, pas `passifService`.

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- Code mort : `PatrimoineParTeteDetail.tsx` n'est jamais monté (`onNavigateToParTete` jamais fourni
  par le parent) ; prop `selectedCategory` de `PatrimoineChart` déclarée mais jamais lue.
- Affichage « -0 € » quand une moins-value totale vaut exactement `0` (concaténation du signe moins
  plutôt que négation numérique), sur le Résumé et sur la vue Plus-values.
- Duplications ponctuelles hors moteur : `checkIsInCouple` (`utils.ts`) et `isInCouple`
  (`qualification.ts`) réimplémentent le même test ; agrégation par catégorie recalculée localement
  dans `PatrimoineParTeteDetail.tsx` plutôt que dans `lib/patrimoine/`.
- Repli incohérent sur `totalValue` nul/négatif : `0` dans `PatrimoineResume.tsx`, `100`/`0` dans
  `PatrimoineParTeteDetail.tsx` pour le même cas limite.
- `duree_type: 'Pendant années'` (charges d'actif) prévu dans le schéma mais jamais rendu dans l'UI —
  fonctionnalité fantôme, sans risque de donnée fausse puisqu'inatteignable.
- `IncompleteAssetsBanner` ne détecte que 4 champs manquants (valeur, détenteur, mode de détention,
  date d'estimation) ; ne signale ni un démembrement sans contrepartie renseignée, ni une indivision
  dont le total des quotes-parts ne fait pas 100 %.
- Warning React répété en console (« Invalid prop supplied to React.Fragment ») sur
  `PatrimoineTreeView.tsx` à chaque rendu de l'onglet Actifs dès qu'un groupe de catégorie existe —
  sans conséquence fonctionnelle observée. *(Vérifié toujours présent.)*
- Trois tables filles de `assets` (`asset_demembrements`, `asset_indivisaires`,
  `asset_valorisations`) portent un `user_id NOT NULL` sans FK explicite vers `auth.users` — non-
  conformité déclarative à la règle `CLAUDE.md`, mais cascade déjà assurée transitivement via
  `asset_id → assets(id) ON DELETE CASCADE`.
- Trois implémentations indépendantes du discriminant emprunt/passif (`isEmpruntRecord`,
  `PassifDetailsDialog`, `EMPRUNT_NATURES.includes`), synchronisées aujourd'hui seulement parce que
  l'UI restreint les natures proposées.
- Fiche détail d'un passif/emprunt n'affiche ni détenteur, ni qualification, ni contributeur au
  remboursement, ni statut d'assurance — aucun de ces champs n'est visible alors qu'ils sont
  effectivement consommés par le moteur (alerte, Transmission).
- Barème art. 669 CGI dupliqué (non documenté) entre `lib/patrimoine/bareme669CGI.ts` et
  `lib/transmission/index.ts::getDemembrementPct`.

### Cases dormantes

Champs saisissables et sans lecteur métier connu : `assets.situation_particuliere`,
`.attachement_emotionnel`, `.sous_type_per` (affichage seul), `.bien_etranger` (attendu — Phase
« biens hors de France » non construite), `.part_licitation_personnelle`/`.licitation_acquereur`
(déclaratifs, explicitement documentés comme non injectés dans `qualifierBien()`),
`.financement_actif`/`.financement_duree_mois`/`.financement_apport`/`.financement_taux_credit`/
`.financement_taux_assurance` (aucun échéancier de crédit ni impact budget trouvé) ; sur `emprunts` :
`reporter_budget` (le libellé promet un report automatique en Budget qui n'existe pas),
`taux_interet`, `type_garantie` ; `asset_indivisaires` : les champs de contexte du tiers
(`type_indivisaire`, `nom_libre`) restent informatifs même après le branchement du calcul de
`pourcentage` (§2) ; `patrimoine_originaire.date_signature` (seul `signe` est lu).

## 4. Périmètre V1 / différé

- **V1 — en place** : qualification civile automatique des actifs et passifs (12 branches, régime
  légal/communautaire/séparatiste/participation/PACS/concubinage), part successorale et ajustements
  par clause matrimoniale, récompenses/créances entre époux, participation aux acquêts (décès
  uniquement), plus-values mobilières et immobilières avec régime fiscal par nature, bascule vers
  Sociétés/Immobilier, sauvegarde résiliente d'un actif (commit `a41c7bf`).
- **Différé, décisions explicitement documentées dans le code** :
  - **Démembrement** : `mode_detention` ne conditionne que l'affichage (barème 669 CGI informatif),
    jamais la qualification ni les totaux. Écart volontaire assumé, mais non documenté comme un choix
    produit — à distinguer des bugs listés en §3 qui en découlent (P4).
  - **Divorce** pour la participation aux acquêts : `participationAcquets.ts` ne couvre que le décès,
    « chantier séparé » explicitement renvoyé à plus tard.
  - **Licitation de plus de moitié (art. 515-5-2)** : champs saisis (`part_licitation_personnelle`,
    `licitation_acquereur`) mais explicitement non injectés dans le calcul.
  - **Historisation du régime matrimonial** : le régime courant s'applique rétroactivement à tous les
    biens ; pas de datation du régime applicable à la date d'acquisition de chaque bien.
  - **Terrains à bâtir** : faute de champ distinguant un terrain constructible, le régime fiscal
    immobilier avec surtaxe est appliqué systématiquement — décision validée plutôt que d'inventer un
    champ.
  - Pas de méthode `update` sur 4 tables (`recompenses`, `creances_entre_epoux`,
    `patrimoine_originaire`, `patrimoine_final`) : uniquement ajout et suppression.
- **Hors périmètre de cet audit, signalé comme travail de suivi** : un audit dédié du module
  **Immobilier** (champs « immobilier étendu » de `assets`) et un audit croisé Patrimoine ↔
  Transmission ↔ Sociétés, pour vérifier si d'autres agrégats divergent de la même façon que P29/P30.
