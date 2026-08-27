# Module Patrimoine

> Document consolidé le 2026-08-27, fusion de `docs/audit-patrimoine-2026-07-28.md` (audit de fond —
> moteur, modèle de données, calculs, dépendances, commit `a257cdc`) et `docs/audit/audit-patrimoine.md`
> (audit écran par écran avec navigation réelle, commit `2835f30`, 2026-07-29). Les bugs bloquants et
> gênants ont été revérifiés contre le code au 2026-08-27 (voir commits `bc4e1ac`, `ea3a695`, `a41c7bf`,
> `5e4ad88`) ; les sections architecture/modèle de données sont reprises telles quelles, la structure
> n'ayant pas changé depuis. Les items « mineurs » n'ont pas tous été revérifiés individuellement.
> **Mise à jour du 2026-08-27** : 6 des 8 bloquants 🔴 traités dans cette session (double comptage des
> emprunts de société, fraction de démembrement absente des totaux, liste Passifs non rafraîchie,
> écrasement silencieux d'`origine_actif`, incohérence de détenteur société d'acquêts, `null` traité
> comme `0` dans `calculatePlusValue`) — voir §3. Les 2 restants (passif non-`Bien commun` à 100 %,
> qualification stockée obsolète) nécessitent une intervention hors du seul module Patrimoine et sont
> laissés en 🔴 avec leur périmètre de correction précisé (le premier a été ajouté en 🔴 dans
> [docs/transmission.md](transmission.md), qui porte le bug réel). Les 3 limites résiduelles notées sur
> le fix démembrement (âge usufruitier inconnu, `valeur_acquisition` non repondérée, Dashboard non
> branché) ont été closes dans un second passage le même jour — voir §3.

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
  - [demembrementFraction.ts](src/lib/patrimoine/demembrementFraction.ts) (2026-08-27) — pondère
    `valeur_estimee` par le barème 669 CGI selon l'âge de l'usufruitier (client/conjoint/tiers via
    `asset_demembrements`) ; factorisé depuis `AssetDetailsDialog.tsx` (seul consommateur historique)
    et désormais partagé avec `usePatrimoineCalculations.ts`/`PatrimoineChart.tsx`.

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
  unifier au moins la lecture du détenteur brut base de données ; utilisé depuis le 2026-08-27 par la
  branche société d'acquêts de `qualification.ts` (cf. §3), mais `AssetDetailsDialog.tsx:391` conserve
  encore sa propre comparaison inline pour l'affichage (pas de risque de qualification divergente,
  juste une duplication mineure — cf. §3 🟡).

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
  filtrage sur `societe_id` est répliqué depuis le 2026-08-27 côté KPI du Résumé Patrimoine
  (`usePatrimoineCalculations.ts`, `useAlertesConseil.ts`, `PatrimoineChart.tsx` — cf. §3).

- **Découplage Patrimoine → Sociétés/Immobilier.** `societeTransfer.ts` bascule un actif éligible
  vers une ligne `societes` ; les champs « immobilier étendu » de la table `assets` (`typologie_bien`,
  `surface_m2`, financement…) sont portés par les mêmes lignes mais consommés uniquement par le
  module Immobilier. Le couplage Patrimoine → Transmission est en revanche fort et unidirectionnel :
  aucun fichier de `lib/patrimoine/` n'importe `lib/transmission/`.

## 3. Dette identifiée

### 🔴 Bloquant (peut fausser un calcul montré au client)

- **Passif « Bien propre »/« Bien personnel » toujours déduit à 100 % du patrimoine transmissible,
  quel que soit son détenteur réel.** `getFractionPassifAjustee`
  ([avantagesMatrimoniaux.ts](src/lib/patrimoine/avantagesMatrimoniaux.ts)) ne retourne une valeur que
  pour la qualification `Bien commun` ; pour toute autre qualification l'appelant applique 100 %
  côté Transmission car `PassifLine` ne transporte même pas le champ `detenteur`. Le module Patrimoine
  lui-même pondère correctement par détenteur — divergence de méthode entre les deux modules pour la
  même donnée. **Hors périmètre de cette session** : le bug réel est côté Transmission
  (`src/utils/transmissionHelpers.ts::buildPatrimonySnapshot`, type `PassifLine` sans champ
  `detenteur`), pas dans `lib/patrimoine/` — ajouté en 🔴 dans
  [docs/transmission.md §3](transmission.md) pour traitement dans une session dédiée au module
  Transmission. *(Vérifié toujours ouvert : `PassifLine` ne porte que `montant_du` et
  `qualification_bien`.)*
- **`qualification_bien` stocké n'est réactualisé qu'à la réouverture-soumission de l'actif
  concerné.** `succession.ts`/`avantagesMatrimoniaux.ts`/`usePatrimoineCalculations.ts` lisent la
  valeur **stockée** ; `AssetDetailsDialog.tsx` en affiche une, lui, **recalculée à la volée**. Un
  changement de régime matrimonial (module Famille) sans réouverture de chaque actif laisse les
  moteurs de succession/DMTG travailler sur une qualification obsolète alors que la fiche détail
  montre la valeur à jour — deux vues incohérentes sur une donnée fiscale sensible. **Hors périmètre
  de cette session** : la correction implique soit un recalcul systématique (risque de régression
  large sur tous les moteurs qui lisent `qualification_bien`), soit un déclenchement cross-module
  (changement de régime côté Famille → recalcul Patrimoine) — nécessite sa propre conception validée.
  *(Architectural, non retouché depuis l'audit.)*

### ✅ Corrigé cette session (2026-08-27)

- **Emprunts/passifs de société comptés deux fois dans le patrimoine personnel.**
  [usePatrimoineCalculations.ts](src/hooks/usePatrimoineCalculations.ts),
  [useAlertesConseil.ts](src/hooks/useAlertesConseil.ts) et
  [PatrimoineChart.tsx](src/components/patrimoine/PatrimoineChart.tsx) excluent désormais les emprunts
  portant un `societe_id`, comme `buildPassifLines` côté Transmission. Vérifié sur cas simple :
  un emprunt de 100 000 € sans `societe_id` reste compté, un emprunt identique avec `societe_id` est
  exclu des trois totaux.
- **La fraction de démembrement est désormais appliquée aux totaux affichés.** Nouvelle fonction pure
  [demembrementFraction.ts](src/lib/patrimoine/demembrementFraction.ts) (factorisée depuis la logique
  d'âge d'usufruitier déjà présente dans `AssetDetailsDialog.tsx`, qui l'utilise maintenant aussi,
  supprimant la duplication) : `financialSummary`, `patrimoineParPersonne`, `PatrimoineChart` (Résumé
  Patrimoine **et** [Dashboard](src/pages/Dashboard.tsx)) et `PatrimoinePlusValues` pondèrent désormais
  un actif en usufruit/nue-propriété par le barème 669 CGI au lieu de compter 100 % de sa valeur pleine
  propriété. Vérifié sur cas simple : nue-propriétaire de 55 ans, actif à 200 000 € → tranche 61 ans
  (50/50), valeur comptée 100 000 € au lieu de 200 000 € avant correction.
  - **Âge de l'usufruitier non renseigné → actif exclu des totaux**, plutôt que compté à sa valeur
    pleine propriété : `getFractionDemembrement` retourne `null` dans ce cas, et
    `usePatrimoineCalculations.ts` route ces actifs vers `unqualifiedItems` (nouveau champ `reason:
    'demembrement'`, distingué de `reason: 'qualification'` pour les biens propre/commun non qualifiés)
    — même bandeau d'alerte que pour un bien non qualifié, texte adapté au motif. `PatrimoineChart`
    (Résumé et Dashboard, sans bandeau propre) exclut la valeur du total sans signalement dédié dans ce
    composant. Vérifié : `getFractionDemembrement` sur un actif en Nue-propriété sans date de naissance
    connue renvoie `null` (au lieu de `1`).
  - **`valeur_acquisition` pondérée par la même fraction que `valeur_estimee`** dans
    `usePatrimoineCalculations.ts` (source de `PatrimoinePlusValues`) : une nue-propriété acquise à
    120 000 € et valant aujourd'hui 200 000 € en pleine propriété, avec une fraction de 50 %, affiche
    désormais une plus-value de 40 000 € (100 000 − 60 000) au lieu de 80 000 € (200 000 − 120 000)
    avant correction. Vérifié sur ce cas.
- **Un emprunt/passif créé avec succès n'apparaît plus dans la liste qu'après rechargement.**
  [usePassifEmpruntForm.ts](src/hooks/usePassifEmpruntForm.ts) ne possède plus sa propre instance de
  `useEmprunts()`/`usePassifs()` : les fonctions `create`/`update` sont désormais injectées par
  [PatrimoinePassifs.tsx](src/components/patrimoine/PatrimoinePassifs.tsx), qui détient l'unique
  instance et voit donc la liste se mettre à jour immédiatement — même pattern que Actifs.
- **`mode_detention = 'Nue-propriété'` n'écrase plus `origine_actif` déjà saisi.**
  [useAssetForm.ts](src/hooks/useAssetForm.ts) ne pré-remplit `'Acquisition à titre gratuit'` que si
  `origine_actif` est vide ; une origine déjà renseignée (ex. acquisition onéreuse démembrée) est
  préservée.
- **Incohérence de détenteur dans la branche « société d'acquêts ».**
  [qualification.ts](src/lib/patrimoine/qualification.ts) utilise désormais `isDetenteurCommon()`
  (comme la branche concubinage) au lieu de `detenteur.toLowerCase().includes('couple')` — un
  détenteur brut `'common'`/`'commun'` (ex. transmis par `AssetDetailsDialog.tsx`) est maintenant
  qualifié `Indivision` de façon cohérente avec le formulaire.
- **`calculatePlusValue` ne traite plus une valeur d'acquisition `null` comme `0`.**
  [utils.ts](src/lib/patrimoine/utils.ts) — la garde teste désormais `null` en plus de `undefined` ;
  un actif sans valeur d'acquisition saisie renvoie `hasData: false` (exclu du calcul) au lieu d'une
  fausse plus-value ≈ 100 % de la valeur estimée. Vérifié sur cas simple :
  `calculatePlusValue(150000, null, 5000)` → `{ plusValue: 0, hasData: false }` (au lieu de
  `{ plusValue: 145000, hasData: true }` avant correction).

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
  dans `PatrimoineParTeteDetail.tsx` plutôt que dans `lib/patrimoine/` ; `AssetDetailsDialog.tsx:391`
  compare `asset.detenteur` à `'common'`/`'commun'`/`'couple'` en inline plutôt que d'appeler
  `isDetenteurCommon()` (sans conséquence sur la qualification, juste une 3ᵉ implémentation du même
  test — cf. §2).
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
  Sociétés/Immobilier, sauvegarde résiliente d'un actif (commit `a41c7bf`), pondération des totaux
  affichés par le barème 669 CGI pour un actif démembré (2026-08-27, cf. §3).
- **Différé, décisions explicitement documentées dans le code** :
  - **Démembrement — qualification civile uniquement** : `mode_detention` ne conditionne toujours pas
    la qualification (`qualifierBien()` ne le lit jamais) — un usufruit/une nue-propriété reste qualifié
    comme la pleine propriété. Écart volontaire assumé (cf. §2). Distinct de la valorisation des
    totaux, désormais pondérée (§3) : seule la qualification civile reste hors périmètre.
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
