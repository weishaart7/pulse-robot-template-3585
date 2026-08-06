# Audit détaillé — Transmission, Bloc 1 : mécanique civile de liquidation

> Document produit en **lecture seule** le 2026-08-05. Aucun fichier de code n'a été modifié.
> État du code au commit `d443db1` (branche `main`, arbre propre hors ajouts de documentation).
> Périmètre : chapitres 6, 8, 9, 10 et annexes 1, 3 de `docs/Successions-Referentiel-Complet.md`, confrontés à `src/lib/transmission/reserve.ts`, `src/lib/transmission/types.ts`, `src/lib/transmission/index.ts`, `src/components/transmission/DonationForm.tsx` et `src/services/liberaliteService.ts` (+ `src/utils/transmissionHelpers.ts` et `src/lib/transmission/successionLegale.ts` pour les fonctions consommées en amont/aval de `reserve.ts`).
> Suite de `docs/cartographie-transmission-2026-08.md` (Bloc 1). Convention : quand un point n'a pas pu être vérifié formellement, la mention **« non vérifié »** est utilisée explicitement.

---

## 0. Réponse aux 6 points prioritaires de la commande

| # | Point | Statut | Renvoi |
|---|---|---|---|
| 1 | Confusion valeur-au-décès / valeur-au-partage | 🔴 **Bug confirmé** — pire que suspecté : le champ unique n'est ni l'une ni l'autre, c'est la valeur **à l'acte** | [T1](#t1) |
| 2 | Masse de calcul écrêtée à 0 avant réunion fictive | 🔴 **Bug confirmé** | [T2](#t2) |
| 3 | Clauses de donation jamais lues par `reserve.ts` | 🔴 **Confirmé, sans exception** — vérifié pour les 3 écrans appelants | [T6](#t6) |
| 4 | Enfant renonçant tenu au rapport | ⚪ **Non implémenté** (aucun champ ne porte cette stipulation) | [T7](#t7) |
| 5 | Cas particuliers d'imputation non modélisés | ⚪ **Non implémenté**, confirmé pour les 4 cas cités | [T9](#t9) |
| 6 | RAAR et réévaluation art. 924-2 | ⚪ **Absence totale** confirmée pour les deux | [T10](#t10), [T3](#t3) |

Deux bugs supplémentaires, non demandés explicitement mais découverts en confrontant le chapitre 9 au code, sont au moins aussi sérieux que les points 1 et 2 ci-dessus : [T4](#t4) (incohérence entre imputation et rapport quand `typeImputation` n'est pas renseigné) et [T5](#t5) (le conjoint peut être compté à tort dans le rapport). Voir §5 pour le détail chiffré.

---

## 1. Méthode

Les sections suivantes ont été lues intégralement (texte, pas seulement titres) : chapitre 6 (L499-581), chapitre 8 (L664-769), chapitre 9 (L770-895), chapitre 10 (L896-986), Annexe 1 (L2058-2160), Annexe 3 (L2194-2241). Le code a été lu intégralement : `reserve.ts` (375 lignes), `types.ts` (159 lignes), `index.ts` (789 lignes), `DonationForm.tsx` (654 lignes), `liberaliteService.ts` (120 lignes), plus les fonctions pertinentes de `transmissionHelpers.ts` et `successionLegale.ts`. Les affirmations de non-implémentation (« ⚪ ») ont été vérifiées par recherche textuelle négative (`grep`) sur le terme juridique ou le nom de champ attendu, dans tout `src/`.

Légende de statut : **🔴 Bug confirmé** (le code diverge du référentiel, avec un cas où le résultat est faux) · **⚪ Non implémenté** (la règle n'existe pas dans le code) · **🟡 Dette documentée** (déjà connue, tracée ailleurs) · **✅ Conforme** (le code applique la règle correctement).

---

## 2. Chapitre 6 — Réserve héréditaire et quotité disponible (L499-581)

### 2.1 ✅ Conforme — Barème de la quotité disponible ordinaire (§6.4, L533-550)

Le code applique exactement le barème 1/2, 1/3, 3/4 :

```ts
// reserve.ts:59-67
if (nbEnfants === 1)      reserveEnfants = masseCalcul * 0.5;      // 1/2
else if (nbEnfants === 2) reserveEnfants = masseCalcul * (2/3);    // 2/3
else                       reserveEnfants = masseCalcul * 0.75;    // 3/4, quel que soit N ≥ 3
```

Cohérent avec la formule générale du référentiel « à partir de 3 enfants : réserve globale 3/4 » — la réserve *individuelle* (3/(4N)) n'est en revanche jamais calculée séparément dans `computeReserveAndQD` : seule la réserve individuelle des **enfants ayant reçu une libéralité** est recalculée à la volée dans `imputeLiberalites` (`reserveResult.reserveEnfants / childrenIds.length`, ligne 128), ce qui revient au même résultat numérique. Réserve du conjoint à défaut de descendant (1/4, L552-553) également conforme (`reserve.ts:70-72`).

**Exemple de contrôle** : masse de calcul 900 000 €, 3 enfants → réserve globale = 675 000 € (3/4), réserve individuelle = 225 000 € chacun, QD = 225 000 € — identique au référentiel (§9.9.1).

### 2.2 ⚪ Non implémenté — Comptage de l'enfant renonçant tenu au rapport (§6.3, L522-531) {#t7}

Le référentiel liste 4 catégories d'enfants inclus dans le compteur N (art. 913, 913-1) : vivants, décédés représentés, renonçants représentés, **et renonçants non représentés mais ayant reçu une libéralité stipulée rapportable malgré la renonciation** (art. 845). Seules les 3 premières catégories sont couvertes par `buildSouchesEnfants` :

```ts
// successionLegale.ts:338-368
if (!traiterCommePredecede) { /* enfant vivant non renonçant → souche entière */ }
// sinon : décédé OU renonçant → représentation récursive par les descendants
const representants = collectRepresentantsRecursive(graph, childId);
if (representants.length > 0) { /* souche maintenue via les représentants */ }
// Si aucun représentant, la souche disparaît purement et simplement.
```

Un enfant renonçant **sans descendance**, dont l'acte de donation antérieur stipulait expressément qu'il resterait tenu au rapport malgré une renonciation future (art. 845), voit sa souche disparaître de `nbSouchesEnfants` (et donc de `souchesEnfantsRootIds`) dans tous les cas — il n'existe aucun champ, ni sur `Person`, ni sur `Liberalite`, portant cette stipulation.

**Impact concret** : avec 3 enfants dont un renonçant sans descendance et tenu au rapport, le code calcule N=2 (barème 2/3) au lieu de N=3 (barème 3/4) prescrit par le référentiel — la réserve globale et la QD sont sous/sur-évaluées selon le sens (ici QD passe de 1/4 à 1/3 de la masse de calcul, soit un écart significatif sur une masse de 900 000 € : 300 000 € au lieu de 225 000 €).

- **Fichier/fonction** : `successionLegale.ts:330-384` (`buildSouchesEnfants`) ; `types.ts:17-20` (`Person.renoncant`/`renoncantDe`, aucun champ pour la stipulation de rapport).
- **Référentiel** : §6.3, L522-531 ; Annexe 1 L2080-2081 ; Annexe 3, piège n°5 (L2202).

*Cas rare en pratique (suppose une stipulation expresse ET une renonciation ultérieure), mais structurellement absent — à trancher comme décision de périmètre plutôt qu'à corriger dans l'urgence.*

### 2.3 ⚪ Non implémenté — QDS entre époux et combinaison QDO/QDS (§6.5-6.6, L555-571)

Le code ne traite jamais une libéralité au conjoint différemment d'une libéralité à un enfant ou à un tiers : `computeReserveAndQD` ne calcule qu'une quotité disponible ordinaire unique, et `imputeLiberalites` impute toute libéralité — y compris au conjoint — sur cette même QDO. La quotité disponible spéciale entre époux (QDS, art. 1094-1 : jusqu'à la totalité en usufruit) et les règles de combinaison (§6.6 : plafond global QD + usufruit du reste, imputation différenciée PP/US) sont absentes.

**Impact concret** : un défunt avec 2 enfants qui consent une libéralité de la totalité de son patrimoine en usufruit à son conjoint devrait pouvoir le faire sans réduction (art. 1094-1, la QDS couvre l'intégralité de l'usufruit). Le moteur imputerait cette libéralité comme n'importe quelle autre : QD ordinaire = 1/3 de la masse de calcul, tout excédent serait détecté `reserveAtteinte = true` et réduit — un résultat civilement faux pour ce cas précis.

- **Fichier/fonction** : `reserve.ts` (`computeReserveAndQD`, `imputeLiberalites`) — aucune branche liée au bénéficiaire conjoint.
- **Référentiel** : §6.5-6.6, L555-571.

*Déjà signalé comme ⚪ en cartographie (Successions ch. 5/6, hors Bloc 1 strict) ; confirmé ici comme touchant directement `reserve.ts`, donc à considérer comme faisant partie du Bloc 1 malgré le découpage initial.*

### 2.4 ⚪ Non implémenté — Réserve et droit international (§6.7, L573-579)

Prélèvement compensatoire (art. 913 al. 3), non pertinence de la réserve comme ordre public international sauf renvoi vers la loi française : absents. Hors périmètre naturel d'un outil de calcul patrimonial pour une clientèle très majoritairement domestique — décision de périmètre, pas un défaut de calcul à corriger. Non détaillé davantage (déjà classé ⚪ en cartographie).

---

## 3. Chapitre 8 — Liquidation civile : la chaîne de calcul (L664-769)

### 3.1 🔴 Bug confirmé — Masse de calcul non écrêtée à 0 avant réunion fictive {#t2}

Le référentiel est explicite : « Si les dettes excèdent l'actif existant, le solde n'est pas négatif mais égal à zéro pour la formation de la masse de calcul » (§8.3, L686), répété à l'Annexe 1 (étape 1.3, L2073 : « SI (1.1 − 1.2) < 0 ALORS retenir 0 ») et à l'Annexe 3 (piège n°9, L2206 : « Masse négative — si passif > actif, la masse de calcul est ramenée à zéro, jamais négative »).

```ts
// reserve.ts:27-44
export function computeMasseCalcul(patrimony: PatrimonySnapshot, liberalites: Liberalite[]): number {
  let masseCalcul = patrimony.biensExistants - patrimony.passifs;  // pas de Math.max(0, ...)
  const donations = liberalites.filter(lib => lib.type === "donation");
  donations.forEach(donation => { masseCalcul += donation.valeur; });
  return masseCalcul;
}
```

Aucun `Math.max(0, …)` n'encadre `patrimony.biensExistants - patrimony.passifs` avant l'ajout de la réunion fictive (confirmé par recherche négative de `Math.max` dans tout le fichier).

**Impact chiffré** : succession avec biens existants 100 000 €, passifs 150 000 € (surendettement, ex. crédit immobilier restant dû supérieur à la valeur du bien après un divorce ou une chute de valeur), et une donation antérieure de 200 000 € en avancement de part à un enfant unique.
- **Référentiel** : (100 000 − 150 000) → écrêté à 0, puis + 200 000 = **masse de calcul 200 000 €** → réserve = 100 000 €, QD = 100 000 €.
- **Code actuel** : (100 000 − 150 000) = **−50 000**, puis + 200 000 = **masse de calcul 150 000 €** → réserve = 75 000 €, QD = 75 000 €.

Écart de 50 000 € sur la masse de calcul, donc de 25 000 € sur la réserve de l'enfant unique — la réserve, censée être d'ordre public, est ici **sous-évaluée** : moins protectrice pour le réservataire que ne le prescrit la loi. Le sens de l'erreur s'inverse selon le rapport donation/passif, mais elle est systématique dès qu'un dossier combine passif net négatif et donations antérieures — un cas réaliste (succession avec crédit en cours supérieur à l'actif restant, fréquent en clientèle patrimoniale avec effet de levier).

- **Fichier/fonction** : `reserve.ts:27-44` (`computeMasseCalcul`).
- **Référentiel** : §8.3, L686 ; Annexe 1, étape 1.3, L2073 ; Annexe 3, piège n°9, L2206.

**Options de correction** (sans recommandation) :
1. `let masseCalcul = Math.max(0, patrimony.biensExistants - patrimony.passifs);` — un seul point de correction, fidèle au texte, testable immédiatement avec le cas ci-dessus.
2. Isoler le calcul actif net dans une fonction dédiée (`computeActifNetSuccessoral`) réutilisée par `computeMasseCalcul` et par tout futur point d'entrée qui aurait besoin de la même règle (ex. si un jour la masse à partager devait elle-même être clampée séparément — non demandé par le référentiel pour l'étape 6, à vérifier au cas par cas).
3. Ne rien changer si un écrêtement est délibérément appliqué en amont dans la construction de `PatrimonySnapshot` par les écrans appelants — **à vérifier avant toute correction** : `Synthese.tsx`/`ProcessusCalcul.tsx` construisent-ils déjà `biensExistants`/`passifs` de façon à ce que ce cas ne se présente jamais en pratique ? Recherche rapide : `patrimony.biensExistants` provient de `buildPatrimonySnapshot` (`transmissionHelpers.ts`), qui ne fait pas ce clamp non plus (confirmé par lecture du fichier au §4.9 de l'audit Patrimoine 2026-07-28) — cette option 3 est donc probablement à écarter, mais listée pour transparence méthodologique.

### 3.2 ✅ Conforme — Réunion fictive : périmètre (« toutes les donations, sans exception, y compris le renonçant ») (§8.4, L692-696)

```ts
// reserve.ts:35
const donations = liberalites.filter(lib => lib.type === "donation");
```

Aucun filtre sur le bénéficiaire, le statut d'héritier ou de renonçant : toute ligne `type === "donation"` entre dans la réunion fictive, y compris une donation à un enfant renonçant ou à un tiers étranger à la succession — conforme à la règle « peu importe que le donataire soit héritier ou étranger à la succession (y compris le renonçant) ».

### 3.3 🔴 Bug confirmé — Valeur retenue pour la réunion fictive et le rapport {#t1}

Voir détail complet en §5.1 — regroupé avec le chapitre 9 car c'est là que le référentiel qualifie ce piège de « source la plus fréquente d'erreur de modélisation ».

### 3.4 ⚪ Non implémenté (mineur) — Nature du passif non distinguée (§8.3, L685)

Le référentiel exclut explicitement certaines dettes de la masse déductible (droit temporaire au logement sauf remboursement effectif, créance d'aliments art. 758). `patrimony.passifs` est un montant agrégé unique construit en amont de `reserve.ts` (hors périmètre de ce fichier) sans distinction de nature — cohérent avec le constat déjà fait par l'audit Patrimoine 2026-07-28 (§7.6, quasi-usufruit : « le passif successoral est un montant agrégé unique »). Non retesté ici en détail : décision de périmètre déjà actée ailleurs, mentionné pour mémoire.

### 3.5 ⚪ Non implémenté — Conditions de l'exception donation-partage (§8.4, L700)

Le référentiel autorise la valorisation « au jour de l'acte » pour une donation-partage, mais **sous conditions** : accord de tous les héritiers réservataires et allotissement de tous. Le code accepte `typeImputation === "partage"` sans aucune vérification de ces deux conditions — la valeur « à l'acte » (unique valeur stockée, cf. T1) est donc toujours utilisée pour ce type de libéralité, y compris si un réservataire n'a pas été alloti ou n'a pas consenti à l'acte.

- **Fichier/fonction** : `reserve.ts` (`computeRapport:354-356`, exclusion de `typeImputation === "partage"` du rapport, sans contrôle amont) ; `types.ts:68` (`typeImputation` accepte `"partage"` sans champ associé pour les conditions).
- **Référentiel** : §8.4, L700.

*Note : par un effet de bord, cette absence de conditions coïncide numériquement avec le comportement correct pour une donation-partage régulière (valeur à l'acte), puisque le champ `Liberalite.valeur` stocké est justement la valeur à l'acte (cf. T1) — mais rien ne garantit que les conditions légales sont réunies avant d'appliquer ce traitement.*

### 3.6 Étapes 0, 1, 2 et 6 restantes — hors périmètre direct de `reserve.ts`

- **Étape 0** (liquidation du régime matrimonial) : traitée en amont dans `index.ts` (récompenses, créances, avantages matrimoniaux, participation aux acquêts — cf. audits dédiés `audit-recompenses-creances-2026-07-28.md` et `audit-patrimoine-2026-07-28.md`), injectée dans `patrimony.biensExistants` via `deltaCivilTotal` avant l'appel à `computeMasseCalcul` (`index.ts:316-328`). Non ré-audité ici : hors périmètre Bloc 1 (mécanique de réserve/rapport/réduction elle-même).
- **Étape 1** (actif brut, indemnité d'occupation, créances, droit à réparation) : construction de `PatrimonySnapshot` faite en amont par les écrans appelants — hors périmètre de `reserve.ts`, non auditée ici.
- **Étape 8.8** (notaire obligatoire) : hors périmètre civil, traité par `fiscal.ts` (audité séparément dans le Bloc 6 proposé par la cartographie).

---

## 4. Chapitre 9 — Le rapport des libéralités (L770-895)

### 4.1 ✅ Conforme — Ordre d'imputation (donations avant legs, chronologique) (§8.6.3, L744-747)

```ts
// reserve.ts:104-106
const donations = liberalites.filter(lib => lib.type === "donation")
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // plus ancienne d'abord
// ligne 161 : les legs sont traités dans une boucle séparée, après les donations
```

Conforme à « ① Donations d'abord, de la plus ancienne à la plus récente. ② Legs ensuite ». La règle sur les donations sans date certaine (imputées après toutes les autres donations, cf. §4.6 ci-dessous) n'est en revanche pas modélisée.

### 4.2 ✅ Conforme — Débiteurs/créanciers du rapport pour les enfants (§9.2, L784-790), sous réserve de T5

Pour un enfant réservataire (`childrenIds.includes(beneficiaireId)`), une donation ou un legs `avance_part` est correctement rapporté ; un legs `hors_part` à un tiers est correctement exclu du rapport et prélevé sur la masse avant partage. Conforme à l'article 857 pour ce cas. Voir toutefois **T5** ci-dessous : cette règle n'est **pas** appliquée de façon symétrique au conjoint pour les donations.

### 4.3 🔴 Bug confirmé — Le conjoint (ou tout non-réservataire) peut être compté à tort dans le rapport pour une donation `avance_part` {#t5}

Le référentiel est net : « Conjoint survivant : Non [tenu au rapport] (seul de son rang). Il bénéficie indirectement du rapport des autres » (§9.2, L788).

`imputeLiberalites` filtre bien par `childrenIds` avant de traiter une libéralité comme « en avancement de part » — pour les donations (ligne 125) **et** pour les legs (ligne 165). `computeRapport`, en revanche, ne le fait que pour les legs :

```ts
// reserve.ts:335-336 (legs) — gated par childrenIds
const estSurPartReservataire = legLib.typeImputation === "avance_part" &&
  childrenIds.includes(legLib.beneficiaireId as string);

// reserve.ts:354-356 (donations) — PAS gated par childrenIds
const donations = liberalites.filter(lib =>
  lib.type === "donation" && lib.typeImputation === "avance_part"
);
```

Rien n'empêche, côté `DonationForm.tsx`, de créer une donation au conjoint avec « Type de donation » = « Par avance de part successorale » (le Select ligne 365 ne restreint pas les options selon le bénéficiaire). Une telle donation est alors traitée par `computeRapport` comme si le conjoint était un enfant réservataire tenu au rapport.

**Impact chiffré** : 2 enfants + conjoint survivant, conjoint ayant reçu de son vivant une donation de 50 000 € marquée par erreur (ou par méconnaissance de l'utilisateur du logiciel) « avance de part successorale » plutôt que « hors part ». Biens existants au décès : 300 000 €, aucun passif, quotes-parts issues de la dévolution légale (option classique 1/4 PP pour le conjoint, 3/4 pour les 2 enfants soit 0,375 chacun) :
- **Résultat correct** (conjoint jamais tenu au rapport) : masse à partager = 300 000 € (la donation, déjà sortie du patrimoine, ne doit pas être réintégrée) ; conjoint = 0,25 × 300 000 + 50 000 (déjà perçu) = **125 000 €** ; chaque enfant = 0,375 × 300 000 = **112 500 €**.
- **Résultat produit par le code** : `computeRapport` réintègre à tort les 50 000 € dans la masse à partager (350 000 €) ; le mécanisme d'auto-compensation d'`index.ts` (`partFinale -= rapportTotal` puis `+= liberalitesMaintenues`, lignes 409-422) neutralise l'effet **pour le conjoint lui-même** (0,25 × 350 000 − 50 000 + 50 000 = 87 500 €) mais **pas** pour les enfants, dont la part croît mécaniquement avec la masse à partager gonflée à tort (0,375 × 350 000 = 131 250 € chacun).

Soit un transfert de **37 500 €** du conjoint vers les deux enfants (125 000 € → 87 500 € pour le conjoint ; 112 500 € → 131 250 € pour chaque enfant), causé uniquement par une sélection de type de donation qui n'est pas empêchée par le formulaire pour ce bénéficiaire.

- **Fichier/fonction** : `reserve.ts:354-356` (`computeRapport`, filtre donations) vs `reserve.ts:125` et `reserve.ts:335-336` (filtres correctement gated) ; `DonationForm.tsx:358-370` (Select « Type de donation » sans restriction par bénéficiaire).
- **Référentiel** : §9.2, L784-793 ; art. 857 et 758-5 C. civ.

**Options de correction** (sans recommandation) :
1. Ajouter le même filtre `childrenIds.includes(beneficiaireId)` à la boucle donations de `computeRapport`, symétrique à ce qui existe déjà pour les legs — cohérent avec `imputeLiberalites`, correctif localisé à une ligne.
2. Restreindre côté UI (`DonationForm.tsx`) les options du Select « Type de donation » selon le bénéficiaire sélectionné (masquer « avance de part successorale » si le donataire n'est pas un enfant) — traite le symptôme en amont mais laisse la donnée existante en base non protégée (une donation déjà enregistrée avec cette combinaison resterait mal calculée).
3. Combiner 1 et 2 — correction du moteur (source de vérité) + garde-fou UI pour éviter la resaisie d'un cas déjà mal qualifié.

### 4.4 🔴 Bug confirmé — Incohérence entre `imputeLiberalites` et `computeRapport` quand `typeImputation` n'est pas renseigné {#t4}

`types.ts:63-67` documente lui-même cette incohérence sans la corriger :

> « Non défini est traité différemment selon le consommateur : `reserve.ts::imputeLiberalites` impute quand même sur la réserve (permissif, comme l'ancien défaut rapportable=true), mais `reserve.ts::computeRapport` exclut du rapport (strict, n'accepte que 'avance_part'). Sans conséquence tant que Synthese.tsx/ProcessusCalcul.tsx renseignent toujours cette valeur […] — à garder en tête si un appelant l'omet. »

Le commentaire suppose que la valeur est « toujours renseignée » par les écrans appelants. C'est faux au niveau de la saisie : le Select « Type de donation » de `DonationForm.tsx:358-370` n'est **pas obligatoire** (`formData.typeDonation` par défaut `''`, converti en `undefined` à l'enregistrement — `DonationForm.tsx:244`). Une donation créée sans que l'utilisateur ait choisi explicitement un type tombe dans ce cas non couvert.

```ts
// reserve.ts:125 (imputeLiberalites) — undefined !== "hors_part" → true → traité en avancement de part
if (childrenIds.includes(donation.beneficiaireId as string) &&
    donation.typeImputation !== "hors_part") { /* imputé sur la réserve de l'enfant */ }

// reserve.ts:354-356 (computeRapport) — undefined !== "avance_part" strictement → exclu du rapport
const donations = liberalites.filter(lib =>
  lib.type === "donation" && lib.typeImputation === "avance_part"
);
```

**Impact chiffré** : Marie, 2 enfants (Aurélien, Blandine), pas de conjoint. Donation à Aurélien de 100 000 €, **type de donation non sélectionné** dans le formulaire. Biens existants 300 000 €, aucun passif.
- **Résultat correct** (traité comme avancement de part de bout en bout, cohérent avec la présomption de l'art. 843) : masse de calcul 400 000 €, réserve/QD par enfant 133 333,33 € ; masse à partager = 300 000 + 100 000 (rapporté) = 400 000 € ; chacun a droit à 200 000 € ; Aurélien : 200 000 € (100 000 déjà reçus + 100 000 en plus) ; Blandine : 200 000 €.
- **Résultat produit par le code** : `imputeLiberalites` impute bien les 100 000 € sur la réserve d'Aurélien (correct, pas de réduction). Mais `computeRapport` ne trouve aucune donation avec `typeImputation === "avance_part"` (le champ vaut `undefined`) : `massePartageable` reste à **300 000 €**, aucun rapport n'est enregistré. Dans `index.ts`, `partFinale` d'Aurélien = 0,5 × 300 000 (aucun `rapportTotal` à déduire, puisqu'absent de `rapports`) + 100 000 (`liberalitesMaintenues`, qui lui, matche par simple `beneficiaireId` sans condition sur `typeImputation` — `index.ts:415-422`) = **250 000 €**. Blandine = 0,5 × 300 000 = **150 000 €**.

Soit un écart de **50 000 €** entre le résultat correct et le résultat produit — 50 000 € transférés d'Blandine vers Aurélien, uniquement parce que le formulaire de donation n'impose pas de choisir un type. Ce cas est probablement **plus fréquent en pratique** que celui de T5, car rien dans l'interface n'attire l'attention sur le caractère obligatoire de ce champ pour la cohérence du calcul.

- **Fichier/fonction** : `reserve.ts:125` vs `reserve.ts:354-356` ; `types.ts:63-67` (incohérence déjà documentée en commentaire, jamais corrigée) ; `DonationForm.tsx:358-370` (champ non requis).
- **Référentiel** : art. 843 C. civ. (présomption simple : donation à un réservataire = avancement de part par défaut, donc rapportable) ; §9.1, L776-780 (principe du rapport) ; §8.6.1, L714-722.

**Options de correction** (sans recommandation) :
1. Aligner `computeRapport` sur `imputeLiberalites` : traiter `typeImputation !== "hors_part"` (au lieu de `=== "avance_part"` strictement) comme rapportable pour un bénéficiaire réservataire — cohérent avec la présomption légale de l'art. 843 et avec le comportement déjà choisi dans `imputeLiberalites`.
2. Rendre le champ « Type de donation » obligatoire dans `DonationForm.tsx`, avec une valeur par défaut explicite plutôt qu'un champ vide — traite la cause côté saisie, mais ne protège pas les lignes déjà enregistrées sans ce champ.
3. Les deux à la fois, dans le même esprit que pour T5.

### 4.5 ✅ Conforme — Non double-comptage rapport + réduction (§9.9.3, Annexe 3 piège n°8)

Vérifié par recalcul algébrique général : pour une donation à la fois rapportable (`avance_part`) et réduite de R, `computeRapport` ajoute `(valeur − R)` via la boucle donations (ligne 358-369) **puis** ajoute à nouveau `R` via `massePartageable += reductions.totalReduit` (ligne 372) — les deux termes s'annulent exactement pour redonner la valeur pleine de la libéralité dans la masse à partager, résultat identique à la règle « seul le rapport figure dans la masse, il recouvre déjà l'indemnité ». Contrôlé numériquement sur l'exemple du référentiel §9.9.3 (Marie, 2 enfants, donation 900 000 € réduite de 100 000 €, patrimoine 300 000 €) : le code produit bien une masse à partager de **1 200 000 €**, identique au référentiel. *(Ce contrôle suppose que la valeur unique stockée pour la donation est effectivement la valeur au décès de 900 000 € — ce qui, en pratique, ne sera pas le cas si l'utilisateur a saisi la valeur à l'acte, cf. T1.)*

### 4.6 ⚪ Non implémenté — Donation sans date certaine (§8.6.3, L747)

Aucun champ ne distingue une donation notariée (date certaine) d'un don manuel non enregistré (sans date certaine). `imputeLiberalites` trie uniquement par `date` déclarée (`reserve.ts:104-106`) — la règle « une donation sans date certaine s'impute après toutes les autres donations et avant les legs » n'a aucun support de données pour être appliquée, quand bien même le moteur voudrait l'implémenter.

- **Fichier/fonction** : `types.ts:56-71` (`Liberalite`, pas de champ `dateCertaine`/`notarie`) ; `reserve.ts:104-106`.
- **Référentiel** : §8.6.3, L747 ; Annexe 3, A3.2 (« Donations "sans date certaine" : imputation après toutes les autres donations → risque accru de réduction »).

### 4.7 ⚪ Non implémenté — Clauses de rapport forfaitaire / dispense de rapport (§9.4, 9.8, L802-810, L846-854) {#t6}

Voir §5.2 ci-dessous — regroupé avec les autres clauses de donation puisqu'elles partagent le même point d'entrée (`liberalites.clauses`) et le même constat.

### 4.8 ⚪ Non implémenté — Rapport des dettes de l'héritier envers le défunt/l'indivision (§9.5, L811-816)

Aucune notion de créance de la succession sur un héritier débiteur (art. 864 et s.) — recherche négative confirmée dans `src/lib/transmission`. Cohérent avec le fait que le module ne modélise que des libéralités (donations/legs), jamais des dettes entre un héritier et le défunt. Décision de périmètre plausible, non un oubli isolé.

### 4.9 ⚪ Non implémenté — Fiscalité du rapport avec valeurs distinctes décès/rapport (§9.10, L887-892)

Le référentiel précise que ce sont « les valeurs retenues pour le rapport » (au partage) qui s'appliquent à la déclaration fiscale de succession, distinctes des valeurs de réunion fictive au décès. Comme `Liberalite.valeur` est unique (T1), cette distinction ne peut de toute façon pas être opérée côté fiscal (`dmtgDonations` dans `index.ts:607-615` réutilise `l.valeur`, la même valeur que la réunion fictive civile) — conséquence directe de T1, non un défaut séparé.

---

## 5. Chapitre 10 — La réduction des libéralités excessives (L896-986)

### 5.1 🔴 Bug confirmé — Confusion des trois valeurs d'une libéralité : acte, décès, partage {#t1}

C'est le point le plus structurant de cet audit, à l'origine ou en interaction avec plusieurs autres findings (T3, en partie T9, §4.9).

**Ce que prescrit le référentiel** (résumé du tableau récapitulatif de l'Annexe 1, L2147-2157) :

| Opération | Valeur retenue | Texte |
|---|---|---|
| Réunion fictive (réserve) | Jour du **décès** | art. 922 |
| Imputation | (dérivée de la réunion fictive, donc décès) | art. 919-1/919-2 |
| Indemnité de réduction | Déterminée au **décès**, **réévaluée au partage** | art. 924-2 |
| Rapport | Jour du **partage** | art. 860 |

Le référentiel qualifie explicitement la confusion décès/partage de « source la plus fréquente d'erreur de modélisation » (§9.6, L822).

**Ce que fait le code** : `Liberalite` (`types.ts:56-71`) ne porte qu'**un seul champ `valeur`**, utilisé sans distinction par `computeMasseCalcul` (réunion fictive, ligne 37), `imputeLiberalites` (imputation, lignes 129/139/168/174), `applyReductions` (réduction, lignes 259-297) **et** `computeRapport` (rapport, ligne 358-369).

Mais ce champ n'est même pas la valeur au décès : il provient de `DonationForm.tsx:531-541`, dont le label est explicite — **« Valeur au jour de la donation »** — et le commentaire de `liberaliteService.ts:5-8` le confirme : « Valeur au jour de l'acte, uniquement pour une donation (**figée en base**). » Cette valeur n'est jamais réévaluée automatiquement, ni au décès, ni au partage. C'est donc une **troisième valeur, distincte des deux prescrites par le référentiel**, qui alimente les quatre étapes de calcul.

*(Pour un legs, la valeur est en revanche relue en direct sur `asset.valeur_estimee` au moment du calcul — `transmissionHelpers.ts:90-110` — ce qui, puisque cet outil simule un décès survenant « aujourd'hui » (`referenceDate` par défaut = date du jour, `index.ts:70-71`), coïncide raisonnablement avec la valeur au décès pour un legs. Le problème est donc spécifique aux donations.)*

**Impact chiffré** (construit sur le modèle du référentiel §9.9.4, en isolant la variable) : donation en avancement de part à un enfant unique, maison valant **150 000 €** au jour de l'acte (2015), **220 000 €** au jour du décès (2026, valorisation immobilière), **260 000 €** au jour du partage (2027, un an après, marché encore en hausse). Patrimoine successoral au décès : 300 000 €.

- **Référentiel** : masse de calcul = 300 000 + 220 000 (valeur au décès) = **520 000 €** ; réserve/QD (enfant unique, 1/2) = **260 000 €** ; imputation 220 000 € sur la réserve (260 000 €) → pas de réduction ; masse à partager = 300 000 + 260 000 (valeur au **partage**, rapportée) = **560 000 €**.
- **Code actuel** : masse de calcul = 300 000 + **150 000** (valeur à l'acte, seule valeur disponible) = **450 000 €** ; réserve/QD = **225 000 €** ; imputation 150 000 € sur la réserve → pas de réduction ; masse à partager = 300 000 + **150 000** (même valeur réutilisée) = **450 000 €**.

Écart de **70 000 €** sur la masse de calcul (et donc sur la réserve, 35 000 € en moins) et de **110 000 €** sur la masse à partager — dans les deux cas, **au détriment** de la protection du réservataire et de l'égalité entre héritiers, puisque le bien a pris de la valeur entre l'acte et le décès/partage sans que le calcul n'en tienne compte.

*Complément : le même défaut architectural touche `PatrimonySnapshot` (`patrimony`), pas seulement `Liberalite` — `index.ts` transmet le **même objet `patrimony`** à `computeMasseCalcul` (étape 1, décès, ligne 337) et à `computeRapport` (étape 6, partage, ligne 374). L'outil ne modélise donc, structurellement, qu'un seul instant T (le décès simulé « aujourd'hui »), jamais un partage différé dans le temps — ce qui limite la portée d'une correction ciblée sur `Liberalite.valeur` seule (voir options ci-dessous).*

- **Fichier/fonction** : `types.ts:56-71` (`Liberalite.valeur`, champ unique) ; `DonationForm.tsx:531-541` (libellé « Valeur au jour de la donation ») ; `liberaliteService.ts:1-9` (commentaire « figée en base ») ; `reserve.ts` (`computeMasseCalcul:37`, `imputeLiberalites:129/139/168/174`, `applyReductions:259-297`, `computeRapport:358-369`) ; `index.ts:326-328/337/374` (même `patrimony` réutilisé pour décès et partage).
- **Référentiel** : §9.6, L818-825 ; §10.4, L940-949 ; Annexe 1, tableau des dates d'évaluation, L2143-2157 ; Annexe 3, piège n°1, L2198.

**Options de correction** (sans recommandation — chantier structurant, à cadrer avant tout développement) :
1. **Ajouter un second champ** sur `Liberalite` (ex. `valeurPartage?: number`), saisi optionnellement par l'utilisateur pour les donations anciennes où une réévaluation est pertinente, avec repli sur `valeur` (comportement actuel) si absent. Limite : ne résout que la moitié du problème (le champ `valeur` actuel resterait la valeur à l'acte, pas la valeur au décès — il faudrait alors un **troisième** champ, ou renommer `valeur` en `valeurActe` et en dériver `valeurDeces` par défaut égale à `valeurActe`).
2. **Renommer/clarifier l'intention du champ existant** : demander explicitement « Valeur au jour du décès » plutôt que « Valeur au jour de la donation » dans `DonationForm.tsx` (le champ existant sert alors la réunion fictive/imputation/réduction, conformément à l'art. 922), et ajouter un second champ dédié au rapport (« Valeur au jour du partage »). Change le sens d'un champ déjà en base pour les donations existantes — nécessite une migration de données ou une clarification utilisateur pour les lignes déjà saisies.
3. **Ne rien changer sur le schéma, documenter la limite** : accepter qu'une seule valeur soit saisie et utilisée partout, à charge pour le conseiller de la mettre à jour manuellement à l'approche d'un partage réel (le champ existe et est éditable). Cohérent avec le fait que l'outil ne modélise de toute façon qu'un instant T unique pour tout le reste (`PatrimonySnapshot` partagé) — corriger `Liberalite.valeur` seule sans traiter `PatrimonySnapshot` laisserait une incohérence entre les deux.

### 5.2 ⚪ Non implémenté, confirmé sans exception — Clauses de donation jamais lues par le moteur {#t6}

Les 11 clauses proposées dans `DonationForm.tsx:86-98` (`clausesOptions`) — dont la **dispense de rapport** (§9.4, L804), le **rapport forfaitaire** (§9.8, L848-851) et la **clause modifiant la date d'évaluation** (§9.8, L853-854) — sont saisies, stockées (`liberalites.clauses: string[]`), et rechargées à l'édition (`DonationForm.tsx:175`), mais **jamais lues par le moteur de calcul**, confirmé pour l'intégralité des chemins d'appel :

`LiberaliteRow` (`transmissionHelpers.ts:29-38`), la seule interface d'entrée de `buildTransmissionLiberalites` (elle-même le **seul** point de construction du `Liberalite[]` consommé par `reserve.ts`, partagé par `Synthese.tsx`, `ProcessusCalcul.tsx` et `Succession2ndDeces.tsx` — confirmé par `grep` sur les 6 fichiers appelants listés en tête de ce document), ne porte **pas de champ `clauses`** :

```ts
// transmissionHelpers.ts:29-38 — LiberaliteRow, la forme brute alimentant le calcul
export interface LiberaliteRow {
  id?: string | null; type: string; beneficiaire_id?: string | null; beneficiaire_nom: string;
  montant?: number | null; date_acte?: string | null; denomination: string;
  type_imputation?: string | null; biens?: unknown; pourcentage?: number | null; statut?: string | null;
  // pas de `clauses`
}
```

`reserve.ts` lui-même ne référence jamais le mot `clauses` (vérifié par recherche exhaustive dans le fichier).

**Impact concret** : une clause de rapport forfaitaire à 100 000 € (référentiel §9.8, L848-851) sur une donation valant 120 000 € au partage devrait imputer 100 000 € sur la réserve et 20 000 € sur la QD comme avantage hors part (exemple référentiel). Le moteur ignore purement et simplement la clause et applique le régime de droit commun (rapport intégral de la valeur retenue, cf. T1) — la case cochée dans l'interface n'a **aucun** effet, quel que soit l'écran depuis lequel le calcul est déclenché.

- **Fichier/fonction** : `DonationForm.tsx:86-98` (saisie), `liberaliteService.ts:34` (`Liberalite.clauses?: string[]`, stockage), `transmissionHelpers.ts:29-38` (`LiberaliteRow`, absence du champ dans l'interface consommée par le calcul), `reserve.ts` (aucune lecture).
- **Référentiel** : §9.3-9.4, L795-810 ; §9.8, L846-854.

*Il ne s'agit pas d'un « Bug confirmé » au sens strict — aucune règle n'est appliquée à l'envers, elle est simplement absente — d'où le classement en « Non implémenté ». Le risque pratique est cependant réel : un conseiller qui coche « Dispense de rapport » dans le formulaire peut raisonnablement croire que le calcul en tient compte.*

### 5.3 🔴 Bug confirmé (conséquence directe de T1) — Réévaluation de l'indemnité de réduction au jour du partage jamais effectuée (art. 924-2) {#t3}

Le référentiel impose une double étape : l'indemnité de réduction est déterminée au décès **puis réévaluée au partage** selon la formule `indemnité_partage = valeur_partage × (indemnité_décès / valeur_décès)` (§10.4, L940-949 ; Annexe 1, étape 4.4, L2103-2104).

`applyReductions` (`reserve.ts:209-306`) calcule une réduction unique, sans paramètre de valeur au partage ni formule de réévaluation — recherche négative confirmée (aucune occurrence de « 924-2 », « réévalu » dans `reserve.ts` en dehors d'un commentaire sur un tout autre sujet, la non-réévaluation de la *charge* grevant une donation). `computeRapport` réintègre ensuite `reductions.totalReduit` **brut** dans `massePartageable` (ligne 372), sans passer par la formule de réévaluation.

**Impact chiffré**, repris de l'exemple du référentiel §9.9.4 (Marie, 2 enfants ; donation hors part à Blandine, valeur au décès 175 000 €, valeur au **partage** 250 000 € ; réduction déterminée à 75 000 € au décès) :
- **Référentiel** : indemnité réévaluée = 250 000 × (75 000 / 175 000) = **107 143 €**.
- **Code actuel** : même en supposant que l'utilisateur ait pu saisir la valeur au décès (175 000 €) dans le champ unique — ce qui suppose déjà d'avoir contourné T1 —, `applyReductions` produit une réduction de 75 000 € et `computeRapport` l'ajoute telle quelle, sans réévaluation : **75 000 €** au lieu de 107 143 €.

Écart de **32 143 €** sur la masse à partager pour ce seul poste — sous-évaluation de la masse à partager, donc de la part de chaque héritier autre que le débiteur de l'indemnité.

- **Fichier/fonction** : `reserve.ts:209-306` (`applyReductions`, pas de paramètre de valeur au partage) ; `reserve.ts:372` (`computeRapport`, réintégration brute).
- **Référentiel** : §10.4, L940-949 ; Annexe 1, étape 4.4, L2103-2104 ; Annexe 1, tableau des dates, L2151.

**Options de correction** (sans recommandation, dépend de la résolution de T1) :
1. Une fois une valeur au partage disponible par libéralité (cf. options T1), ajouter la formule de réévaluation dans `applyReductions` ou dans une étape intermédiaire entre `applyReductions` et `computeRapport`.
2. Documenter la limite explicitement dans l'UI (l'indemnité affichée est « au jour du décès, non réévaluée ») si la correction structurelle de T1 n'est pas engagée à court terme — traite la transparence, pas l'exactitude du calcul.

### 5.4 ✅ Conforme — Ordre de réduction (legs puis donations, plus récente vers plus ancienne, réduction proportionnelle « au marc le franc ») (§10.2, L912-923)

```ts
// reserve.ts:233-235 — legs réduits en premier
const legsToReduce = liberalites.filter(lib => lib.type === "legs")
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
// reserve.ts:281-283 — puis donations, plus récente → plus ancienne
const donationsToReduce = liberalites.filter(lib => lib.type === "donation")
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
```

La réduction proportionnelle des legs concurrents (ligne 246-276, base de répartition = `besoinSurQD` brut, non plafonné par l'ordre de traitement) est explicitement testée pour le cas non trivial : deux legs de même montant (100 000 € chacun) pour une QD de 100 000 € donnent bien un partage 50/50 (50 000 € de réduction chacun), et non 100/0 comme le donnerait un traitement séquentiel naïf (`reserve.test.ts`, scénario « 2 legs concurrents de même montant »). Conforme à l'art. 926 (réduction « au marc le franc »).

*Absent en revanche : la clause d'imputation prioritaire d'un legs (« déclaré devoir être acquitté par préférence », réduit après les autres, §8.6.3 et §10.2) — aucun champ ne porte cette priorité sur `Liberalite`. Non implémenté, non détaillé davantage (cas de niche).*

### 5.5 ⚪ Absence totale confirmée — RAAR, renonciation anticipée à l'action en réduction (§10.5.2, L958-976) {#t10}

Recherche négative confirmée : aucune occurrence de « RAAR », « 930-1 », « renonciation anticipée » dans `src/` en dehors d'une référence, sans rapport, à l'art. 1527 al. 3 (retranchement, chapitre 11) dans `alertes/regles.ts:199`.

L'absence est double :
- **Aucun champ** ne permet de marquer qu'un héritier réservataire a signé une RAAR à l'égard d'une libéralité déterminée.
- **Aucun effet** n'en découlerait de toute façon dans `applyReductions` : même si le champ existait, la fonction ne connaît aucune notion d'exclusion d'une libéralité du champ de l'action en réduction.

**Impact** : dans le cas d'usage cité par le référentiel lui-même (Annexe 3, A3.2 : « Enfant handicapé ou vulnérable / transmission d'entreprise → envisager une RAAR des autres enfants »), le logiciel ne peut ni enregistrer qu'une RAAR a été signée, ni en tirer les conséquences sur un calcul de réduction — un scénario que l'outil devrait pourtant pouvoir simuler pour conseiller ce type de montage.

- **Fichier/fonction** : absence totale — pas de fichier à citer.
- **Référentiel** : §10.5.2, L958-976 ; Annexe 3, A3.2, L2223.

### 5.6 ⚪ Non implémenté / code mort — DDV jamais assimilée à un legs pour l'ordre de réduction (§10.2, L918, L925)

Le référentiel : « Les donations entre époux (DDV) sont assimilées à des legs et réduites concurremment avec eux » (consentie pendant le mariage) ou « traitée comme une donation consentie au jour du contrat » (si dans le contrat de mariage).

`Liberalite` porte un champ `donationEntreEpoux?: boolean` (`types.ts:69`) — mais il n'est **jamais assigné** ni **jamais lu** ailleurs dans le code (recherche exhaustive confirmée : seule occurrence du champ dans tout `src/`). Une DDV, telle que modélisée aujourd'hui dans l'application (un booléen déclaratif sur `marital_status`, hors du pipeline `Liberalite[]` — cf. `docs/cartographie-transmission-2026-08.md`, Bloc 5), ne transite jamais par `reserve.ts` : `applyReductions` ne peut donc jamais la traiter comme un legs pour l'ordre de réduction, faute de donnée en entrée.

- **Fichier/fonction** : `types.ts:69` (champ orphelin, jamais assigné ni lu — signalé comme code mort).
- **Référentiel** : §10.2, L918, L925.

*Signalement de code mort au sens de la méthode de travail du projet (CLAUDE.md) : ce champ devrait soit être branché (si la DDV doit un jour entrer dans le pipeline `Liberalite[]`), soit retiré du type s'il n'est pas prévu de le faire à court terme.*

### 5.7 ⚪ Non implémenté — Fiscalité de la réduction, restitution des droits d'enregistrement (§10.6, L978-983)

L'indemnité de réduction comme actif successoral taxable, la restitution des droits perçus sur la partie réduite : non vérifié dans le détail du module DMTG (hors périmètre de `reserve.ts`, relève du Bloc 6 proposé par la cartographie — `dmtg/`, `fiscal.ts`). Non audité ici, mentionné pour that le lecteur sache que ce sous-point du chapitre 10 n'a pas été creusé dans ce document.

---

## 6. Chapitre 8.6.2 et cas particuliers d'imputation (L724-742) {#t9}

### 6.1 ⚪ Non implémenté — Les 4 cas cités par la commande, confirmés absents

| Cas | Référentiel | Statut dans le code |
|---|---|---|
| **Imputation « en assiette »** d'une libéralité en usufruit hors part | L731-732, L737-740 (exemple chiffré : 29 100 € de différence entre les deux méthodes) | Absent. `Liberalite` ne porte aucun champ de démembrement exploité par `reserve.ts` — le champ `demembrement` capturé par `DonationForm.tsx:343-355` (`aucun` / `reserve_usufruit` / `reserve_usufruit_reversible`) est stocké (`liberaliteService.ts:36`) mais **absent de `LiberaliteRow`** (`transmissionHelpers.ts:29-38`), donc jamais transmis au calcul — orphelin, au même titre que les clauses (§5.2). Toute libéralité est traitée comme une valeur en pleine propriété, quel que soit le démembrement réel. |
| **Donation à un petit-enfant** (parent vivant, art. 847) | L733 | Absent. `reserve.ts` ne connaît que `childrenIds` (souches d'enfants) — un petit-enfant bénéficiaire direct d'une donation n'est jamais distingué : s'il n'est pas dans `childrenIds` (cas normal, parent vivant), la donation tombe correctement sur la QD par construction du gating (comportement qui coïncide avec la règle légale), mais aucune règle explicite art. 847 n'existe — c'est un effet de bord du modèle générique « non-réservataire → QD », pas une implémentation de la règle. |
| **Présomption art. 918** (vente à un successible en ligne directe) | L735, L742 | Absent. Le module ne modélise que des `Liberalite` explicitement typées `donation`/`legs` — une vente n'entre jamais dans le pipeline, quelles que soient ses caractéristiques (viager, réserve d'usufruit). Aucune requalification automatique en donation présumée. |
| **Donation-partage figée** (conditions de l'exception de valorisation) | L700 | Voir §3.5 ci-dessus — accepté sans vérification des conditions. |

- **Fichier/fonction** : `types.ts:56-71` (`Liberalite`, pas de champ démembrement/type de bénéficiaire exploitable) ; `transmissionHelpers.ts:29-38` (`LiberaliteRow`).
- **Référentiel** : §8.6.2, L724-742.

*Aucun de ces 4 cas n'appelle de correctif chiffré : ce sont des absences pures, pas des divergences de résultat sur un cas qui serait par ailleurs traité. Décision de périmètre (V1/V2) à trancher pour chacun, comme déjà noté par la cartographie pour la plupart d'entre eux.*

---

## 7. Annexe 1 — Séquence de calcul complète (L2058-2160) : vérification étape par étape

| Étape (Annexe 1) | Statut | Renvoi |
|---|---|---|
| 0. Prérequis (ouverture, héritiers, filtrage, dispositions, liquidation régime matrimonial) | 🟡 Hors périmètre `reserve.ts` — traité par `successionLegale.ts`/`index.ts`, non re-audité ici | §3.6 |
| 1.1-1.2. Actif brut − passif | 🟡 Construit en amont, non audité en détail ici | §3.6 |
| 1.3. Écrêtement à 0 si négatif | 🔴 Bug confirmé | [T2](#t2) |
| 1.4. Réunion fictive | 🔴 Bug confirmé (valeur) / ✅ Conforme (périmètre : toutes donations, y compris renonçant) | [T1](#t1), §3.2 |
| 2.1. Comptage N | 🟡 Conforme pour 3 des 4 catégories, incomplet pour la 4ᵉ | [T7](#t7) |
| 2.2. Barème réserve/QD | ✅ Conforme | §2.1 |
| 2.3. QDS si libéralité au conjoint | ⚪ Non implémenté | §2.3 |
| 3.1-3.2. Ordre d'imputation | ✅ Conforme (hors cas particuliers §6) | §4.1, §6.1 |
| 4.1-4.2. Ordre de réduction | ✅ Conforme | §5.4 |
| 4.3. Indemnité déterminée au décès | 🔴 Bug confirmé (valeur utilisée n'est ni décès ni acte de façon fiable, cf. T1) | [T1](#t1) |
| 4.4. Réévaluation au partage | 🔴 Bug confirmé — absente | [T3](#t3) |
| 5. Droits du conjoint survivant (double masse art. 758-5) | 🟡 Hors périmètre Bloc 1 — traité par `successionLegale.ts`, cf. cartographie Bloc 2 | — |
| 6.1. Actif net au partage | 🔴 Bug confirmé — même `patrimony` que l'étape 1, pas de valeur distincte au partage | [T1](#t1) |
| 6.2. Rapport | 🔴 Bug confirmé (valeur au partage absente ; incohérences T4/T5) | [T1](#t1), [T4](#t4), [T5](#t5) |
| 6.3. Indemnités de réduction réévaluées | 🔴 Bug confirmé | [T3](#t3) |
| 6.4 (implicite, piège n°8) Non double-comptage rapport+réduction | ✅ Conforme | §4.5 |
| 7. Attribution (part théorique, rapport en moins prenant, soulte, correctifs) | 🟡 Correctement câblé dans `index.ts` pour la partie moins-prenant/soulte ; attribution préférentielle et conversion d'usufruit du conjoint hors périmètre Bloc 1 (cf. cartographie) | — |
| 8. Liquidation fiscale | 🟡 Hors périmètre Bloc 1 (module `dmtg/`, Bloc 6 de la cartographie), sauf impact direct de T1 sur `dmtgDonations` (§4.9) | §4.9 |

---

## 8. Annexe 3 — Points de vigilance pour la modélisation (L2194-2241) : statut de chaque piège

### A3.1. Pièges de calcul les plus fréquents

| # | Piège | Statut |
|---|---|---|
| 1 | Double date d'évaluation (décès/partage) | 🔴 Bug confirmé — [T1](#t1) |
| 2 | Imputation « en assiette » des libéralités en usufruit | ⚪ Non implémenté — [§6.1](#t9) |
| 3 | Ordre inverse imputation/réduction des donations | ✅ Conforme — §4.1, §5.4 |
| 4 | Legs réduits avant les donations, proportionnellement, DDV incluse | 🟡 Conforme pour la base (§5.4) ; DDV jamais incluse faute de donnée (§5.6) |
| 5 | Comptage N des enfants (renonçants représentés/tenus au rapport) | 🟡 Conforme pour 3 catégories sur 4 — [T7](#t7) |
| 6 | Assiette de l'usufruit du conjoint ≠ actif successoral | 🟡 Non vérifié dans ce document (relève de `successionLegale.ts`, Bloc 2 de la cartographie) |
| 7 | Double masse de l'art. 758-5 | 🟡 Non vérifié ici (Bloc 2 de la cartographie) |
| 8 | Rapport + réduction cumulés : seul le rapport figure dans la masse | ✅ Conforme — §4.5 |
| 9 | Masse négative ramenée à zéro | 🔴 Bug confirmé — [T2](#t2) |
| 10 | Droit viager au logement (âge décès+1 an, 60 % US 669) | 🟡 Non vérifié ici (hors `reserve.ts`) |
| 11 | Émolument de déclaration de succession (assiette actif brut) | 🟡 Non vérifié ici (module `fiscal.ts`, Bloc 6 de la cartographie) |
| 12 | Récompenses (solde créditeur/débiteur) | 🟡 Déjà audité — `docs/audit-recompenses-creances-2026-07-28.md` |

### A3.2. Règles d'alerte / conseil exploitables — pertinentes pour ce Bloc

- « Enfant handicapé ou vulnérable / transmission d'entreprise → envisager une RAAR » : **non actionnable**, RAAR absente ([T10](#t10)).
- « Donations "sans date certaine" → imputation après toutes les autres donations » : **non actionnable**, notion absente (§4.6).
- Les autres lignes de ce tableau (quasi-usufruit, tontine, SCI, vente en viager) relèvent de chapitres déjà classés hors périmètre par la cartographie (ch. 14, 16, 18) — non re-vérifiées ici.

### A3.3. Limites connues à documenter

Ces 5 limites (réserve/droit international, droit de retour père-mère, quasi-usufruit successif, faculté de conversion, art. 774 bis) relèvent de chapitres hors périmètre Bloc 1 — non re-vérifiées dans ce document, cohérent avec le classement ⚪ déjà fait par la cartographie.

---

## 9. Récapitulatif des findings

| ID | Statut | Résumé | Chiffrage |
|---|---|---|---|
| [T1](#t1) | 🔴 Bug confirmé | Valeur unique de la libéralité = valeur à l'acte, ni décès ni partage | Écart 70 000 € (masse de calcul), 110 000 € (masse à partager) |
| [T2](#t2) | 🔴 Bug confirmé | Masse de calcul non écrêtée à 0 si passif > actif | Écart 50 000 € (masse de calcul) |
| [T3](#t3) | 🔴 Bug confirmé | Indemnité de réduction jamais réévaluée au partage (art. 924-2) | Écart 32 143 € |
| [T4](#t4) | 🔴 Bug confirmé | `typeImputation` non renseigné : incohérence imputation/rapport | Écart 50 000 € |
| [T5](#t5) | 🔴 Bug confirmé | Conjoint non exclu du rapport pour une donation `avance_part` | Transfert 37 500 € |
| [T6](#t6) | ⚪ Non implémenté | Clauses de donation jamais lues par le moteur, tous écrans confondus | — |
| [T7](#t7) | ⚪ Non implémenté | Enfant renonçant tenu au rapport (sans descendance) non comptabilisé | Écart QD 75 000 € (exemple) |
| §2.3 | ⚪ Non implémenté | QDS entre époux et combinaison QDO/QDS | — |
| [T9](#t9) | ⚪ Non implémenté | Usufruit en assiette, art. 847, art. 918, conditions donation-partage | — |
| [T10](#t10) | ⚪ Non implémenté | RAAR totalement absente | — |
| §5.6 | ⚪ Non implémenté / code mort | `donationEntreEpoux` jamais assigné ni lu | — |
| §4.6 | ⚪ Non implémenté | Donation sans date certaine | — |
| §5.4 | ⚪ Non implémenté | Clause d'imputation prioritaire d'un legs | — |
| §4.8 | ⚪ Non implémenté | Rapport des dettes de l'héritier (art. 864) | — |
| §2.1 | ✅ Conforme | Barème QDO | — |
| §3.2 | ✅ Conforme | Périmètre de la réunion fictive (toutes donations, y compris renonçant) | — |
| §4.1 | ✅ Conforme | Ordre d'imputation (donations avant legs, chronologique) | — |
| §4.5 | ✅ Conforme | Non double-comptage rapport + réduction | — |
| §5.4 | ✅ Conforme | Ordre de réduction (legs, marc le franc, puis donations plus récente→ancienne) | — |

---

## Annexe — commandes de vérification utilisées

```bash
git rev-parse HEAD && git status --short

grep -n "Math.max" src/lib/transmission/reserve.ts
grep -rni "raar\|renonciation anticipée\|930-1" src --include="*.ts" --include="*.tsx"
grep -rni "924-2\|reeval\|réévalu" src/lib/transmission --include="*.ts"
grep -rn "donationEntreEpoux" src --include="*.ts" --include="*.tsx"
grep -rn "demembrement" src/services/liberaliteService.ts src/utils/transmissionHelpers.ts src/lib/transmission/*.ts
grep -n "childrenIds" src/lib/transmission/reserve.ts
grep -rn "buildTransmissionLiberalites" src --include="*.ts" --include="*.tsx" -l
```

Recalculs numériques faits manuellement à partir de la lecture directe des fonctions (`computeMasseCalcul`, `imputeLiberalites`, `applyReductions`, `computeRapport`, boucle héritiers de `computeTransmission`) — pas d'exécution de test automatisé dédiée à ces scénarios (ils ne figurent pas dans `reserve.test.ts`), à faire en phase de correction si les findings sont validés.
