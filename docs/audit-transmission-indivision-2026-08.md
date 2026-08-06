# Audit détaillé — Transmission, module Indivision successorale (Bloc 3, P14)

> Document produit en **lecture seule** le 2026-08-06. Aucun fichier de code n'a été modifié.
> État du code au commit `7c6b382` (branche `main`, arbre propre hors ajouts de documentation).
> Périmètre : chapitre 17 (L1576-1615) et §18.4 (L1641-1675, uniquement le volet part successorale) de `docs/Successions-Referentiel-Complet.md`, confrontés à `src/lib/patrimoine/succession.ts` (`getPartSuccessorale`/`getPartConjointSuccession`), à la table `asset_indivisaires`, et à tout fichier consommateur identifié par recherche exhaustive (pas seulement `succession.ts`).
> Suite de `docs/cartographie-transmission-2026-08.md` (Bloc 3) — isole P14, déjà signalé bloquant par `docs/audit/audit-patrimoine.md` (2026-07-29, §Sous-section 2 « Actifs »), du reste du Bloc 3 (barème 669/démembrement, dette déjà documentée, non traitée ici).
> Même méthode et même niveau de détail que `docs/audit-transmission-bloc1-liquidation-2026-08.md`. Légende de statut : **🔴 Bug confirmé** (le code diverge du référentiel, avec un cas où le résultat est faux) · **⚪ Non implémenté** (la règle n'existe pas dans le code) · **🟡 Dette documentée** (déjà connue, tracée ailleurs) · **✅ Conforme** (le code applique la règle correctement).

---

## 0. Réponse aux points prioritaires de la commande

| # | Point | Réponse |
|---|---|---|
| 1 | P14 : le pourcentage saisi est-il ignoré dans tous les cas d'usage de `getPartSuccessorale` ? | **Oui, structurellement, dans 100 % des cas** — mais la cause exacte est plus précise que « le moteur ignore la donnée » : `getPartSuccessorale` elle-même est correcte (testée, [§3.1](#31)) ; le bug est entièrement en amont, dans le pipeline de saisie (`useAssetForm.ts`), qui ne branche jamais `detenteur === 'Indivision'` et force `pourcentage_utilisateur`/`pourcentage_conjoint` à 50/50 à chaque sauvegarde. Voir [§3.2](#32), exemple chiffré 70/30. |
| 2 | Chapitre 17 dans son ensemble : modélisé vs absent | **§17.2 (gestion) et §17.4 (créanciers) : absence totale, ⚪.** §17.3 (fin d'indivision) : **partiellement couvert** — la sortie par partage a un équivalent fonctionnel déjà audité (Bloc 1), la sortie par vente/licitation reste déclarative. Voir [§2](#2-chapitre-17--lindivision-successorale-l1576-1615). |
| 3 | Comptes d'indivision (§18.4 Temps 3) | **Absence totale confirmée** — aucune notion d'indemnité d'occupation, de créance contre l'indivision, d'avance en capital ou de compte individuel d'indivisaire dans le code. Voir [§4](#4-1841-liquidation-dune-indivision--méthode-en-3-temps-l1641-1675). |

---

## 1. Méthode

Le chapitre 17 (L1576-1615) a été lu intégralement, ainsi que §18.4 (L1641-1675). Le code a été lu intégralement : `succession.ts` (127 lignes), `IndivisairesSection.tsx` (134 lignes), `assetIndivisaireService.ts` (73 lignes), et les passages pertinents de `useAssetForm.ts`, `AssetForm.tsx`, `assetSchema.ts`, `transmissionHelpers.ts`, `lib/transmission/index.ts`, `usePatrimoineCalculations.ts`, `SocietesTransmission.tsx`, `PatrimoineParTeteDetail.tsx`, `FamilyMemberFormDialog.tsx`. Les consommateurs de `getPartSuccessorale`/`getPartConjointSuccession` ont été identifiés par recherche exhaustive (`grep`) dans tout `src/`, pas seulement via les points d'entrée déjà connus des audits précédents. Les affirmations de non-implémentation (« ⚪ ») ont été vérifiées par recherche textuelle négative sur le terme juridique attendu.

`succession.test.ts` a été consulté pour vérifier ce qui est déjà couvert par des tests unitaires au niveau de la fonction pure elle-même (distinct du pipeline de données qui l'alimente).

---

## 2. Chapitre 17 — L'indivision successorale (L1576-1615)

### 2.1 §17.1 — Définition et composition (L1578-1587)

Chapitre essentiellement définitionnel — peu de règles directement « codables ». Un point mérite vérification : le référentiel met en garde explicitement contre une confusion de modélisation :

> ⚠️ **Ne sont PAS en indivision** les enfants communs et le conjoint survivant ayant opté pour la **totalité en usufruit** (démembrement ≠ indivision). (L1581)

**✅ Conforme (par absence de conflation constatée)** — Le code maintient bien deux mécanismes distincts et non mélangés :
- `qualification_bien === 'Indivision'` / `asset_indivisaires` modélisent une indivision **antérieure au décès** (un bien déjà détenu en indivision par le défunt de son vivant, avec un tiers ou un membre de sa famille) — `succession.ts:65-71`.
- `HeirShare.typeQuotePart` (`'usufruit'` / `'nue_propriete'` / `'pleine_propriete'`, `successionLegale.ts`) modélise le **démembrement issu de l'option du conjoint** (art. 757 et s.) **après** le décès — mécanisme entièrement séparé, appliqué en aval dans `lib/transmission/index.ts:391-395` (`getDemembrementPct`).

Aucune ligne de code ne fait référence à `qualification_bien` pour décider du type de quote-part d'un héritier, ni l'inverse — recherche croisée négative confirmée. Ce point de vigilance explicitement signalé par le référentiel est donc respecté dans l'architecture actuelle.

**Non vérifié / hors périmètre naturel** : la composition précise de la masse indivise (« excepté les créances et dettes, le caveau et les souvenirs de famille ») et l'ajout des revenus produits pendant l'indivision (L1587) ne sont pas modélisés distinctement — cohérent avec le constat plus général du Bloc 1 sur l'absence de distinction fine de nature des dettes (`audit-transmission-bloc1-liquidation-2026-08.md`, §3.4).

### 2.2 §17.2 — Gestion (L1589-1598)

**⚪ Non implémenté — absence totale confirmée.** Recherche négative exhaustive (`acte conservatoire`, `acte d'administration`, `acte de disposition`, `majorité des 2/3`, `mandataire à effet posthume`, `convention d'indivision`) : aucune occurrence dans `src/`.

Aucun des éléments suivants n'a de représentation dans le code :
- Règle de majorité (unanimité de principe, art. 815 et s. ; 2/3 des droits indivis pour certains actes d'administration/disposition).
- Convention d'indivision comme acte distinct (à ne pas confondre avec la « convention d'indivision » PACS de `qualification.ts`, qui est un concept juridique différent — régime par défaut du PACS, art. 515-5 — sans lien avec la gestion d'une indivision successorale).
- Mandataire (conventionnel ou à effet posthume, art. 812 et s.).
- Interdiction pour un indivisaire de vendre seul un immeuble indivis (il ne peut vendre que sa part).

Décision de périmètre plutôt qu'un défaut de calcul à corriger : ces règles relèvent de la gestion **pendant** l'indivision, pas du calcul de la part successorale d'un bien — un outil de simulation fiscale/civile au moment du décès n'a pas nécessairement vocation à modéliser la gouvernance post-décès. Signalé pour que la décision (V1/V2/hors scope) soit explicite plutôt qu'implicite.

### 2.3 §17.3 — Fin de l'indivision (L1600-1601)

> **« Nul n'est tenu de rester dans l'indivision »** (art. 815). Sortie possible à tout moment (sauf convention d'indivision ou décision judiciaire de maintien), par vente ou par partage — total ou partiel.

**🟡 Partiellement couvert, statut mixte :**

- **Sortie par partage** : a un équivalent fonctionnel réel, déjà audité en détail dans le Bloc 1 (`reserve.ts::computeRapport`, masse à partager, droit de partage `netBreakdown.ts`). Ce n'est pas un « partage d'indivision successorale entre co-indivisaires » au sens strict du chapitre 18 (qui concerne la sortie d'une indivision déjà constituée, potentiellement plus tard dans le temps), mais le mécanisme de partage successoral lui-même est présent et fonctionnel. **✅ Conforme** pour ce volet, par renvoi au Bloc 1.
- **Sortie par vente / licitation** : reste **déclarative**. `assets.part_licitation_personnelle` et `assets.licitation_acquereur` existent (saisis dans `AssetForm.tsx` en cas de PACS-indivision + détenteur « Le couple »), mais sont documentés comme **jamais injectés dans `qualifierBien()`** ni dans aucun calcul de succession — déjà relevé comme dormant par `docs/audit-patrimoine-2026-07-28.md` §3.11 et confirmé par `docs/audit/audit-patrimoine.md` (ligne `part_licitation_personnelle`/`licitation_acquereur` : « Déclaratif documenté comme tel »). **🟡 Dette déjà documentée**, pas une découverte nouvelle de cet audit — cf. ces deux sources.
- **Convention d'indivision empêchant la sortie** ou **décision judiciaire de maintien** : ⚪ non implémenté, absence totale confirmée.

### 2.4 §17.4 — Droits des créanciers (L1603-1615)

**⚪ Non implémenté — absence totale confirmée.** Recherche négative sur l'ordre de remboursement des créanciers de la succession (sûretés → 2ᵉ rang → légataires de sommes d'argent), sur l'impossibilité pour les créanciers personnels des indivisaires de saisir les biens indivis, et sur le mécanisme de l'art. 779 (créancier agissant au nom de l'héritier inactif). Décision de périmètre plausible et cohérente avec le reste de l'outil : aucun autre chapitre du référentiel touchant aux droits des créanciers (successoraux ou personnels) n'est modélisé ailleurs dans le projet — pas un oubli isolé propre à ce chapitre.

---

## 3. Le mécanisme central : `getPartSuccessorale` et `asset_indivisaires` (P14) {#3}

### 3.1 `succession.ts::getPartSuccessorale` — ✅ Conforme en tant que fonction pure {#31}

```ts
// succession.ts:65-71
if (qualification === 'Indivision') {
  const { userQuote } = getPourcentagesRepartition(
    asset.pourcentage_utilisateur ?? undefined,
    asset.pourcentage_conjoint ?? undefined
  );
  return userQuote;
}
```

Prise isolément, cette fonction fait exactement ce qu'elle doit faire : elle retourne la fraction réellement saisie dans `pourcentage_utilisateur`, sans jamais deviner un 50/50 arbitraire si une valeur existe. C'est **confirmé par test unitaire** (`succession.test.ts:22-25`) :

```ts
it("'Indivision' → part réellement détenue par le défunt (pourcentage_utilisateur)", () => {
  expect(
    getPartSuccessorale({ qualification_bien: 'Indivision', pourcentage_utilisateur: 30, pourcentage_conjoint: 70 })
  ).toBeCloseTo(0.3);
});
```

**Le bug n'est donc pas dans `getPartSuccessorale`.** Il est entièrement en amont : dans la façon dont `pourcentage_utilisateur`/`pourcentage_conjoint` sont (ou plutôt ne sont jamais) alimentés à partir de la saisie réelle de l'utilisateur pour un bien en indivision avec des tiers. C'est une nuance importante par rapport à la formulation initiale de P14 (« le moteur de succession retombe sur 50/50 par défaut ») : le moteur ne « retombe » sur rien — c'est la donnée qu'on lui fournit qui est structurellement fausse.

### 3.2 🔴 Bug confirmé — le pipeline de saisie n'alimente jamais correctement `pourcentage_utilisateur`/`pourcentage_conjoint` pour une indivision avec des tiers {#32}

Le référentiel définit l'indivision comme concernant potentiellement plusieurs personnes au sens large (« famille du défunt et légataires », §17.1, L1579) — pas seulement le couple. L'application propose deux mécanismes de saisie distincts pour « Indivision », et **un seul des deux est réellement branché au calcul**.

#### Mécanisme A — `pourcentage_utilisateur` / `pourcentage_conjoint` (lu par `getPartSuccessorale`)

Ce mécanisme n'est **jamais éditable dans l'UI** pour le cas `detenteur === 'Indivision'` (le détenteur littéral, distinct de « Le couple »), et est **systématiquement écrasé à 50/50** à chaque enregistrement :

- **Aucun input** ne rend ce champ modifiable pour ce cas. `AssetForm.tsx:433-469` ne montre l'input `pourcentage_utilisateur` que si `watchedDetenteur === 'Le couple'` (**pas** `'Indivision'`) — et seulement en plus si `watchedQualificationBien === 'Indivision'` (cas distinct, cf. [§3.3](#33)).
- **Aucune branche** ne l'ajuste automatiquement au changement de détenteur : `useAssetForm.ts:239-267` (effet d'auto-ajustement) ne traite que `detenteur === {prénom utilisateur|'Vous'}`, `{prénom conjoint|'Conjoint'}` et `'Le couple'` — pas `'Indivision'`.
- **Aucune branche** ne le recalcule à la sauvegarde : `useAssetForm.ts:290-337` (`handleSubmit`) traite `dbDetenteur === 'user'`, `'spouse'`, `'common'` — toujours pas `'Indivision'`. Pour ce cas, `finalUserPercentage = values.pourcentage_utilisateur` reprend **tel quel** ce qui est dans l'état du formulaire.
- Cet état de formulaire est lui-même figé à 50/50 par construction : `assetSchema.ts:101-102` (valeurs par défaut) et, à l'édition d'un actif existant, `useAssetForm.ts:141-153` (l'effet de préremplissage) ne teste que les trois mêmes cas que ci-dessus — pour `'Indivision'`, `userPercentage`/`spousePercentage` restent à leur valeur initiale déclarée en ligne 141-142, soit **50/50**, quelle que soit la valeur réellement stockée en base.

**Conséquence** : `pourcentage_utilisateur = 50` et `pourcentage_conjoint = 50` sont écrits en base à **chaque** création ou modification d'un actif `detenteur === 'Indivision'`, sans exception et sans qu'aucune saisie utilisateur ne puisse changer cela.

#### Mécanisme B — `asset_indivisaires` (jamais lu par `getPartSuccessorale`)

C'est le mécanisme réellement conçu pour une indivision avec des tiers : `IndivisairesSection.tsx`, affichée quand `watchedDetenteur === 'Indivision'` (`AssetForm.tsx:473-479`), permet d'ajouter des co-indivisaires « Famille » ou « Tiers » avec un pourcentage individuel chacun, persistés par `assetIndivisaireService.replaceForAsset` dans la table `asset_indivisaires`.

Cette saisie **fonctionne** et est **correctement persistée** (`useAssetForm.ts:330` : `finalIndivisaires = dbDetenteur === 'Indivision' ? indivisaires : []`). Mais elle n'est **jamais relue par `getPartSuccessorale`, `getPartConjointSuccession`, ni aucune autre fonction de calcul** :

```ts
// succession.ts:15-20 — SuccessionAssetInput, le type d'entrée de getPartSuccessorale
export interface SuccessionAssetInput {
  qualification_bien?: string | null;
  detenteur?: string | null;
  pourcentage_utilisateur?: number | null;
  pourcentage_conjoint?: number | null;
}
```

Ce type **ne porte même pas de champ** pour les co-indivisaires. La preuve d'absence est donc structurelle, pas seulement empirique : **aucun appelant ne pourrait transmettre les données d'`asset_indivisaires` à `getPartSuccessorale`, quand bien même il le voudrait** — la fonction n'a pas de paramètre pour les recevoir. Confirmé par recherche exhaustive : `asset_indivisaires` n'apparaît dans aucun fichier de `src/lib/patrimoine/`, `src/lib/transmission/`, `src/lib/dmtg/`, ni `src/utils/transmissionHelpers.ts`.

#### Exemple chiffré (70/30, comme demandé)

Bien « Maison de famille », valeur estimée 300 000 €, en indivision entre l'Utilisateur et sa sœur (hors couple). L'utilisateur détient réellement 70 %, sa sœur 30 % — saisis via `IndivisairesSection` (1 ligne « Famille » = la sœur, 30 %). `detenteur` = `'Indivision'` (littéral, contient la sous-chaîne « indivision » → `qualification_bien` auto-calculée à `'Indivision'` par la branche 1 de `qualifierBien`, cf. `docs/audit-patrimoine-2026-07-28.md` §3.3).

- **Attendu** : part de l'Utilisateur entrant dans sa succession = 70 % × 300 000 € = **210 000 €**.
- **Produit par le code** : `pourcentage_utilisateur` sauvegardé = 50 (mécanisme A, forcé) → `getPartSuccessorale(...)` = 0,5 → **150 000 €** retenus.

Écart de **60 000 €** sur l'assiette successorale de ce seul bien — **sous-évaluée** dans cet exemple précis (le sens de l'écart s'inverse selon que la part réelle de l'utilisateur est supérieure ou inférieure à 50 %, mais l'écart est systématique dès que la répartition réelle diffère de 50/50).

#### Répercussions par consommateur

Le tableau ci-dessous liste **tous** les appelants de `getPartSuccessorale`/`getPartConjointSuccession` trouvés par recherche exhaustive dans `src/`, avec le statut réel de chacun face à ce bug (aucun n'est épargné, un seul est sans conséquence pratique) :

| Consommateur | Fichier | Impact |
|---|---|---|
| Masse successorale civile (réunion fictive, réserve — Bloc 1) | `transmissionHelpers.ts:816` (`buildPatrimonySnapshot`) | **Affecté** — `patrimony.biensExistants`, donc `computeMasseCalcul`/réserve/QD (`reserve.ts`), calculés sur une assiette fausse pour tout bien en indivision hors couple. |
| Assiette fiscale DMTG | `lib/transmission/index.ts:302,311` (`getFractionSuccessorale`, `dmtgAssets[].valeurVenale`) | **Affecté** — droits de succession calculés sur 150 000 € au lieu de 210 000 € dans l'exemple ci-dessus. |
| Patrimoine du conjoint survivant (chaînage 2nd décès) | `transmissionHelpers.ts:899,977-978,1009` (`getPartConjointSuccession`) | **Affecté**, même mécanisme, sens inverse. |
| Parts de société | `SocietesTransmission.tsx:52` | **Affecté** si une société est qualifiée `'Indivision'` — même structure `SuccessionAssetInput`, même absence de canal pour des co-indivisaires. |
| Dashboard Patrimoine (« Patrimoine par tête ») | `usePatrimoineCalculations.ts:114,135,156` | **Affecté** — mêmes 3 appels (actifs, passifs, emprunts) pour les totaux affichés en Résumé. |
| Détail « Patrimoine par tête » | `PatrimoineParTeteDetail.tsx:56` | **Sans conséquence pratique** — composant confirmé **jamais monté** (`docs/audit/audit-patrimoine.md`, P5 ; reconfirmé ici : aucun import trouvé hors du fichier lui-même, `onNavigateToParTete` jamais fourni par un parent). Le bug existe dans ce code mais n'est jamais exécuté en pratique. |

- **Fichier/fonction** : `useAssetForm.ts:141-153` (effet de préremplissage), `useAssetForm.ts:239-267` (auto-ajustement au changement de détenteur), `useAssetForm.ts:290-337` (`handleSubmit`) ; `AssetForm.tsx:433-469` (input conditionnel absent pour `detenteur === 'Indivision'`) ; `succession.ts:15-20` (`SuccessionAssetInput`, absence structurelle du champ).
- **Référentiel** : chapitre 17, §17.1 (L1579, « Héritiers » au sens large, famille et légataires — donc pas seulement le couple) ; §17.2 (L1591, chaque héritier détient une quote-part individuelle).

**Options de correction** (sans recommandation) :
1. **Brancher `asset_indivisaires` dans le pipeline** : construire, en amont de `getPartSuccessorale` (dans `buildPatrimonySnapshot`/`transmissionHelpers.ts` et les autres appelants), la part de l'utilisateur comme `100 % − Σ(asset_indivisaires.pourcentage)` quand `detenteur === 'Indivision'`, et l'injecter dans `pourcentage_utilisateur` avant l'appel. Nécessite de charger `asset_indivisaires` à chaque calcul de succession (aujourd'hui seulement chargée par `AssetForm`/`useAssetForm` pour l'édition, et par `FamilyMemberFormDialog.tsx` pour l'affichage informatif, cf. [§3.5](#35)) — donc un aller-retour Supabase supplémentaire dans le chemin de calcul, ou une jointure à ajouter aux requêtes existantes.
2. **Exposer un input dédié pour `pourcentage_utilisateur` quand `detenteur === 'Indivision'`**, sur le modèle de ce qui existe déjà pour `'Le couple'` (`AssetForm.tsx:433-463`), et laisser `asset_indivisaires` purement informatif/déclaratif (comme aujourd'hui) ou le limiter à un usage d'affichage. Plus simple à implémenter mais duplique la saisie (l'utilisateur devrait renseigner sa propre part deux fois : indirectement en listant les autres et directement dans ce nouveau champ) et n'élimine pas le risque d'incohérence entre les deux si elles ne sont jamais recoupées.
3. **Fusionner les deux mécanismes** : faire de `pourcentage_utilisateur`/`pourcentage_conjoint` deux cas particuliers d'une même liste de quotes-parts (une refonte plus profonde, alignant `assets` et `asset_indivisaires` sur un modèle unique de répartition), ce qui résoudrait aussi l'incohérence de validation relevée en [§3.4](#34). Le chantier le plus lourd des trois, mais le seul qui supprime la duplication structurelle plutôt que de la contourner.

### 3.3 ✅ Conforme — le cas PACS-indivision entre l'utilisateur et son conjoint (sous-cas distinct) {#33}

Un second chemin produit `qualification_bien === 'Indivision'` **sans que `detenteur` soit littéralement `'Indivision'`** : un couple pacsé sans convention (ou avec convention d'indivision), `detenteur === 'Le couple'` — branche PACS de `qualifierBien` (cf. `docs/audit-patrimoine-2026-07-28.md` §3.3, cascade branche 10), indépendante du test « `detenteur` contient `indivision` ».

Pour ce sous-cas précis, **l'input existe et fonctionne** : `AssetForm.tsx:433-463` affiche un champ « Quote-part de {utilisateur} dans l'indivision (%) », avec calcul automatique du complément pour le conjoint (`form.setValue('pourcentage_conjoint', 100 - valeur)`, ligne 456). C'est le seul chemin où un utilisateur peut réellement faire varier `pourcentage_utilisateur` au-delà de 50/50 pour un bien qualifié `'Indivision'`.

**Limite de ce sous-cas** : il ne couvre que l'indivision **entre les deux membres du couple** (PACS sans convention, ou avec convention d'indivision) — pas une indivision avec un tiers ou un autre membre de la famille, qui reste entièrement soumise au bug de [§3.2](#32). Aucune indivision à 3 personnes ou plus (couple + tiers) n'a de chemin de saisie fonctionnel dans l'application.

### 3.4 Incohérence UI complémentaire — le total attendu par `IndivisairesSection` ne correspond pas au cas d'usage réel {#34}

```tsx
// IndivisairesSection.tsx:118-120
<p className={`text-xs ${total === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
  Total des parts : {total.toFixed(1)}% {total !== 100 && '(devrait être 100%)'}
</p>
```

`type_indivisaire` n'accepte que `'famille' | 'tiers'` (`IndivisairesSection.tsx:10`) — il n'existe **aucune option pour représenter l'utilisateur lui-même** comme co-indivisaire. Le total affiché ne peut donc, par construction, jamais légitimement atteindre 100 % dans le cas d'usage normal (utilisateur + un ou plusieurs tiers/famille) : si l'utilisateur détient 70 %, le total correct des **autres** indivisaires est 30 %, pas 100 %. Le message « devrait être 100 % » est donc trompeur pour ce cas — il ne serait exact que si l'utilisateur ne détenait aucune part du bien (cas de bord, pas le cas général visé par ce module).

`assetIndivisaireService.ts:45-48` a la même limite : il ne bloque que si le total **dépasse** 100 %, jamais s'il est manifestement incomplet (déjà relevé comme sous-couvert par `docs/audit/audit-patrimoine.md`, P24, sous un autre angle — la bannière d'incomplétude générale, pas ce composant précis).

- **Fichier/fonction** : `IndivisairesSection.tsx:9-14,118-120`, `assetIndivisaireService.ts:41-48`.
- **Référentiel** : §17.2, L1591 (« chaque héritier détient un droit privatif sur une fraction abstraite... »).

Ce point est indépendant de P14 lui-même (il subsisterait même si le mécanisme A/B de [§3.2](#32) était unifié d'une façon qui garde `asset_indivisaires` pour les seuls tiers), mais aggrave la confusion pour l'utilisateur du logiciel : rien dans l'interface n'indique que le total « attendu » dépend de la part de l'utilisateur lui-même, qui n'est saisie nulle part dans ce composant.

### 3.5 `asset_indivisaires` : un seul autre lecteur, purement informatif {#35}

Recherche exhaustive de tous les fichiers référençant `asset_indivisaires`/`assetIndivisaireService`/`type_indivisaire` : en dehors de son propre CRUD (`assetIndivisaireService.ts`) et de sa saisie (`IndivisairesSection.tsx`, `useAssetForm.ts`, `AssetForm.tsx`/`PatrimoineActifs.tsx`), un seul autre point de lecture existe :

```ts
// FamilyMemberFormDialog.tsx:90
assetIndivisaireService.getByFamilyLink(editingMember.id)
```

Utilisé pour afficher, dans la fiche d'un membre de la famille, la liste des biens qu'il co-détient (`coOwnedAssets`) — **purement informatif**, aucun calcul de succession ni de fiscalité n'en dépend. Confirme la réponse au point 3 de la commande : **aucun mécanisme de calcul** n'exploite `asset_indivisaires` nulle part dans le projet, seul un affichage de confort le fait.

---

## 4. §18.4 — Liquidation d'une indivision, méthode en 3 temps (L1641-1675)

### 4.1 ⚪ Non implémenté — absence totale confirmée

Recherche négative exhaustive sur les notions suivantes, aucune trouvée dans `src/` :
- **Indemnité d'occupation** (jouissance privative d'un bien indivis).
- **Compte individuel d'indivisaire** (dettes/créances envers l'indivision : perception exclusive de revenus, avance en capital, détérioration, remboursement d'échéances d'emprunt par un seul indivisaire, dépenses d'amélioration/conservation financées sur deniers personnels, rémunération de gestion).
- **Compte général de l'indivision** (actif brut indivis, passif indivis, actif net à partager — au sens de la méthode en 3 temps, distinct de la « masse à partager » successorale du Bloc 1).
- **Comptes entre indivisaires** (répartition selon quote-part + créances entre indivisaires + solde des comptes individuels).

Aucun de ces mécanismes n'a d'équivalent, même partiel ou approximatif, ailleurs dans le code — contrairement à d'autres absences déjà documentées par la cartographie (ex. quasi-usufruit, RAAR), celle-ci n'a pas non plus de trace dans `docs/alertes-conseil-referentiel.md` (aucune règle d'alerte liée à l'indivision hors couple).

### 4.2 Distinction avec le mécanisme déjà audité (Bloc 1)

Point de vigilance pour la suite : le référentiel utilise le terme « masse à partager » dans **deux sens différents** selon le chapitre — l'Étape 6 de l'Annexe 1 / le chapitre 9 (masse successorale globale à répartir entre héritiers, déjà auditée en détail dans le Bloc 1, `reserve.ts::computeRapport`) et le « Temps 2 » de §18.4 (compte général d'**une** indivision particulière, avec ses propres dettes/créances internes). Le premier est modélisé (Bloc 1) ; le second, objet de cette section, ne l'est pas du tout. Ne pas confondre les deux lors d'un futur chantier — un correctif sur `reserve.ts::computeRapport` ne couvrirait pas ce chapitre, et inversement.

**Exemple de référence non reproductible aujourd'hui** (§18.4, L1669-1675) : bien 220 000 €, emprunt restant dû 50 000 €, quotités A 40 % / B 60 %, avec loyers perçus par A seul (30 000 €) et créances entre indivisaires (40 000 € et 70 000 €) → répartition finale A 42 000 € / B 128 000 €, au lieu du 88 000 €/132 000 € qu'une simple application des quotités aurait donné. Le code actuel ne dispose d'aucun des ingrédients (loyers perçus par un seul indivisaire, créances entre indivisaires, capital restant dû spécifiquement rattaché à l'indivision plutôt qu'à la succession globale) pour reproduire ce calcul.

- **Fichier/fonction** : absence totale — pas de fichier à citer.
- **Référentiel** : §18.4, L1641-1675 (Cass. 1ʳᵉ civ., 22 nov. 2023, n° 21-25.251, méthode consacrée).

*Décision de périmètre à trancher (V1/V2/hors scope), comme pour §17.2 — ce chantier suppose de modéliser des flux financiers entre indivisaires dans le temps (loyers perçus, dépenses avancées), une donnée qui n'existe nulle part ailleurs dans l'application aujourd'hui pour un bien en indivision.*

---

## 5. Récapitulatif des findings

| # | Statut | Résumé | Renvoi |
|---|---|---|---|
| 1 | ✅ Conforme | Pas de conflation démembrement (option conjoint) / indivision (qualification civile antérieure au décès) | [§2.1](#21-171--définition-et-composition-l1578-1587) |
| 2 | ⚪ Non implémenté | Gestion de l'indivision (unanimité, majorité 2/3, mandataire, convention) — absence totale | [§2.2](#22-172--gestion-l1589-1598) |
| 3 | 🟡 Mixte | Fin de l'indivision : sortie par partage conforme (renvoi Bloc 1), sortie par vente/licitation dette déjà documentée | [§2.3](#23-173--fin-de-lindivision-l1600-1601) |
| 4 | ⚪ Non implémenté | Droits des créanciers de l'indivision — absence totale, hors périmètre plausible | [§2.4](#24-174--droits-des-créanciers-l1603-1615) |
| 5 | ✅ Conforme | `getPartSuccessorale`/`getPartConjointSuccession` : fonctions pures correctes, testées | [§3.1](#31-successiontsgetpartsuccessorale--conforme-en-tant-que-fonction-pure) |
| 6 | 🔴 **Bug confirmé (P14)** | Pipeline de saisie : `pourcentage_utilisateur`/`pourcentage_conjoint` forcés à 50/50 pour `detenteur === 'Indivision'` ; `asset_indivisaires` jamais branché — structurel, tous consommateurs affectés | [§3.2](#32-bug-confirmé--le-pipeline-de-saisie-nalimente-jamais-correctement-pourcentage_utilisateurpourcentage_conjoint-pour-une-indivision-avec-des-tiers) |
| 7 | ✅ Conforme | Sous-cas PACS-indivision entre l'utilisateur et son conjoint : input fonctionnel | [§3.3](#33-conforme--le-cas-pacs-indivision-entre-lutilisateur-et-son-conjoint-sous-cas-distinct) |
| 8 | 🔴 Bug confirmé (mineur) | Message « devrait être 100 % » de `IndivisairesSection` incohérent avec le cas d'usage réel (l'utilisateur n'est jamais représenté dans la liste) | [§3.4](#34-incohérence-ui-complémentaire--le-total-attendu-par-indivisairessection-ne-correspond-pas-au-cas-dusage-réel) |
| 9 | — | `asset_indivisaires` lu une seule fois ailleurs, à titre purement informatif (fiche membre de famille) | [§3.5](#35-asset_indivisaires--un-seul-autre-lecteur-purement-informatif) |
| 10 | ⚪ Non implémenté | Méthode en 3 temps de liquidation d'une indivision (§18.4) — absence totale | [§4.1](#41--non-implémenté--absence-totale-confirmée) |

---

## Annexe — commandes de vérification utilisées

```bash
git rev-parse HEAD && git status --short

grep -rn "getPartSuccessorale\b" src --include="*.ts" --include="*.tsx" | grep -v "\.test\."
grep -rn "getPartConjointSuccession\b" src --include="*.ts" --include="*.tsx" | grep -v "\.test\."
grep -rln "asset_indivisaires" src --include="*.ts" --include="*.tsx"
grep -rn "PatrimoineParTeteDetail" src --include="*.tsx" | grep -v "PatrimoineParTeteDetail.tsx:"
grep -rn "onNavigateToParTete" src --include="*.tsx"
grep -rni "acte conservatoire\|acte d'administration\|acte de disposition\|majorité des 2/3\|mandataire.*posthume\|convention d'indivision" src --include="*.ts" --include="*.tsx"
grep -rni "indemnite.*occupation\|compte d'indivision\|creance.*indivis" src --include="*.ts" --include="*.tsx"
```

Recalcul chiffré (70/30) fait manuellement à partir de la lecture directe de `getPartSuccessorale`, `useAssetForm.ts` et `assetSchema.ts` — pas d'exécution de test automatisé dédiée à ce scénario précis (le cas 70/30 avec co-indivisaire tiers n'est pas couvert par `succession.test.ts`, qui teste `getPartSuccessorale` isolément avec des inputs déjà corrects, cf. [§3.1](#31)), à faire en phase de correction si les findings sont validés.
