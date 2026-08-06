# Audit détaillé — Transmission, Bloc 2 : dévolution légale et droits du conjoint survivant

> Document produit en **lecture seule** le 2026-08-05. Aucun fichier de code n'a été modifié.
> État du code au commit `2b92a01` (branche `main`, arbre propre hors ajouts de documentation).
> Périmètre : chapitre 2 (L74-160), chapitre 4 (L231-287), chapitre 5 (L288-498) et chapitre 7 (L582-663) de `docs/Successions-Referentiel-Complet.md`, confrontés à `src/lib/transmission/successionLegale.ts` (`calculateBrancheA`, `calculateBrancheB`, `buildSouchesFratrie`, `applyFenteSuccessorale`, gestion de l'`optionConjoint`, `hasSurvivingSpouse`), et à tout fichier consommateur identifié par recherche exhaustive : `src/utils/transmissionHelpers.ts` (construction du `FamilyGraph`), `src/lib/transmission/index.ts` (consommation de `SuccessionLegaleResult`), `src/components/family/DynamicFamilyForm.tsx` et `src/hooks/useFamilyLinkLogic.ts` (saisie des liens familiaux), `src/lib/dmtg/types.ts`/`assets.ts` (droits de retour, volet fiscal).
> Suite de `docs/cartographie-transmission-2026-08.md` (Bloc 2). Même méthode et même niveau de détail que `docs/audit-transmission-bloc1-liquidation-2026-08.md` et `docs/audit-transmission-indivision-2026-08.md`. Légende de statut : **🔴 Bug confirmé** (le code diverge du référentiel, avec un cas où le résultat est faux) · **⚪ Non implémenté** (la règle n'existe pas dans le code) · **🟡 Dette documentée / partielle** (déjà connue ailleurs, ou constat mitigé) · **✅ Conforme** (le code applique la règle correctement).

---

## 0. Réponse aux 6 points prioritaires de la commande

| # | Point | Statut | Renvoi |
|---|---|---|---|
| 1 | F18 — vocabulaire `branche_familiale` incohérent (fente, ordres 3-4) | 🔴 **Bug confirmé — plus grave que le libellé de la cartographie ne le laissait penser** : ce n'est pas une simple incohérence de vocabulaire, c'est une **absence de champ de saisie** pour la branche des grands-parents (rang 1, le cas le plus courant), qui peut faire déraper le calcul jusqu'à la **déshérence** (l'État hérite) alors que des grands-parents vivants existent | [F18](#f18) |
| 2 | Double masse du conjoint (art. 758-5, §5.4) | 🔴 **Absence structurelle confirmée** — une seule masse (`massePartageable`) sert à la fois à chiffrer et à exercer le quart du conjoint, sans plafond par les « biens dont le défunt n'a pas disposé ». Impact numérique complet, avec ses limites, en [§5.2](#52) | [§5.2](#52) |
| 3 | Droits accessoires du conjoint (§5.7-5.14) | ⚪ **Absence totale confirmée, un par un** — conversion d'usufruit, DUH, droit temporaire au logement, attribution préférentielle, droits sur l'entreprise, pensions/créances, transfert du bail, droit ancien : aucun n'a la moindre trace dans le code, vérifié individuellement | [§4](#4-chapitre-5--les-droits-accessoires-du-conjoint-hors-dévolution-l299-495) |
| 4 | Droits de retour (§4.1) | ⚪ **Absence civile confirmée**, avec une nuance fiscale : deux flags (`retourLegal`/`retourConventionnel`) existent côté DMTG mais n'ont **aucun effet sur la dévolution** (la masse successorale calculée par `successionLegale.ts` ne les connaît pas) | [§3](#3-chapitre-4--successions-anomales-et-droits-de-retour-l231-287) |
| 5 | Qualité de conjoint successible (§5.1) | 🔴 **Bug confirmé** — `hasSurvivingSpouse` est un booléen dérivé uniquement de `statut_couple === 'Marié(e)'` ; aucune des trois nuances du référentiel (séparation de corps, instance de divorce, mariage posthume) n'est distinguée, dans un sens qui peut à la fois faire hériter à tort et priver à tort | [§4.1](#41-qualité-de-conjoint-successible-51-l290-297) |
| 6 | Option successorale hors renonciation (§7.2-7.4) | ⚪ **Non implémenté** — aucune distinction acceptation pure et simple / à concurrence de l'actif net ; toute acceptation est traitée implicitement comme pure et simple (aucun champ, aucune conséquence sur la responsabilité aux dettes) | [§5](#5-chapitre-7--loption-successorale-l582-663) |

---

## 1. Méthode

Le chapitre 2 (L74-160), le chapitre 4 (L231-287), le chapitre 5 (L288-498) et le chapitre 7 (L582-663) ont été lus intégralement. Le code a été lu intégralement : `successionLegale.ts` (710 lignes) ; les passages pertinents de `transmissionHelpers.ts` (1226 lignes, notamment la construction du `FamilyGraph` L470-570), `index.ts` (consommation de `SuccessionLegaleResult` et calcul des `partFinale`), `dmtg/types.ts` et `dmtg/assets.ts` (droits de retour, fiscal). Les composants de saisie familiale (`DynamicFamilyForm.tsx`, `useFamilyLinkLogic.ts`) ont été lus pour vérifier ce qui est réellement saisissable par l'utilisateur, pas seulement ce que le moteur de calcul sait théoriquement traiter — c'est cette confrontation saisie/moteur qui a fait apparaître le finding le plus sérieux de cet audit ([F18](#f18)). Les affirmations de non-implémentation (« ⚪ ») ont été vérifiées par recherche textuelle négative (`grep`) sur le terme juridique ou le nom de champ attendu, dans tout `src/`.

`successionLegale.test.ts` a été consulté pour vérifier ce qui est déjà couvert par des tests unitaires, et pour un constat inattendu : certains fixtures de test construisent des données que l'interface réelle ne peut jamais produire (cf. [F18](#f18)), ce qui masque le bug côté suite de tests.

**Point de méthode sur F19** : la renonciation et son effet dévolutif (`resolveRenoncantDe`) ont déjà été corrigés par le commit `32c79bd` ; leur ré-vérification formelle relève d'un autre chantier (Bloc 5, correctifs récents). Ce document ne l'audite pas en détail — `buildSouchesEnfants` et `findAllLivingDescendants` en font un usage correct en apparence (lu au passage pour comprendre le fonctionnement des souches), sans vérification approfondie.

**Golden Scenarios** : `docs/Golden_Scenarios_Transmission.md` (5 scénarios) a été relu. Confirmation : aucun des 5 scénarios ne couvre la fente successorale, un cas avec grands-parents/collatéraux ordinaires, un cas de double masse du conjoint contraignante, ou une distinction de qualité de conjoint successible — la cartographie avait raison, ces scénarios ne couvrent aucun sujet 🟡/🔴 de ce Bloc 2.

---

## 2. Chapitre 2 — Qui hérite ? La dévolution légale (L74-160)

### 2.1 ✅ Conforme — Les quatre ordres et l'exclusion entre ordres (§2.1, L78-87)

`calculateBrancheB` (B1 → B5) implémente bien la hiérarchie stricte : descendants (B1/B2) → parents+fratrie (B3/B4) → fente (B5), chaque bloc `return`-ant dès qu'un héritier de rang supérieur est trouvé (`successionLegale.ts:234-315`). Un héritier d'ordre 1 exclut bien tout le reste (`if (souchesEnfants.length > 0) { ...; return result; }`, L234-238).

### 2.2 ✅ Conforme — Représentation des descendants et calcul de la réserve sur le nombre de souches (§2.4, L132-144)

L'exemple de référence du référentiel (2 filles prédécédées, l'une laissant 1 enfant, l'autre 2 enfants → réserve globale 2/3, calculée sur 2 souches et non sur 3 représentants) est exactement le mécanisme de `buildSouchesEnfants`/`collectRepresentantsRecursive` (`successionLegale.ts:330-420`) : chaque enfant direct forme une souche (`rootChildId`), la représentation ne fait qu'éclater la part de la souche entre ses représentants (`partPerChild = 1.0 / directChildren.length` à chaque niveau de récursion), sans jamais changer le nombre de souches compté pour `nbSouchesEnfants`. Vérifié par lecture directe et cohérent avec le constat déjà fait par l'audit Bloc 1 (§2.1) sur le barème de réserve appliqué à `nbSouchesEnfants`.

### 2.3 🟡 Représentation limitée aux deux ordres prévus par la loi, mais par construction du code plutôt que par règle explicite (§2.4, L136-141)

Le référentiel : représentation possible pour les descendants (à l'infini) et les collatéraux privilégiés (neveux/nièces), **jamais** pour les ascendants ni les collatéraux ordinaires. Dans le code, `collectRepresentantsRecursive` est appelée uniquement depuis `buildSouchesEnfants` (descendants) et `buildSouchesFratrie` (frères/sœurs → neveux/nièces) ; `getParentsVivants` et `collectFenteHeritiers` (ascendants/collatéraux ordinaires) ne l'appellent jamais. Le résultat est conforme, mais **par omission** (la fonction n'est simplement jamais branchée pour ces cas) plutôt que par un test explicite — ce qui est numériquement équivalent mais laisse un risque latent si une évolution future câblait par erreur la représentation sur un ascendant décédé. Non bloquant, mentionné pour information.

### 2.4 🔴 Bug confirmé — Vacance / déshérence : le calcul peut atteindre ce cas alors que des héritiers existent réellement {#deshéirence}

Voir [F18](#f18) ci-dessous : le message « Aucun héritier jusqu'au 6ème degré. L'État français hérite » (`successionLegale.ts:572`) peut être produit alors que des grands-parents bien vivants existent, à cause d'un défaut de saisie de la branche familiale. Ce n'est pas un défaut du mécanisme de déshérence lui-même (qui est correct dans son principe — voir §2.5 ci-dessous) mais une conséquence du bug F18.

### 2.5 ✅ Conforme — Ordre 2, configurations parents/fratrie (§2.3, L108-118)

Toutes les configurations du tableau du référentiel sont couvertes par `calculateBrancheB` B3/B4 :
- Père + mère, pas de F/S → 1/2 chacun (`successionLegale.ts:278-286`, conforme à l'art. 736).
- Père + mère + F/S → chaque parent 1/4, F/S 1/2 (`successionLegale.ts:263-275`, conforme à l'art. 738).
- Un seul parent + F/S → parent 1/4, F/S 3/4 (même bloc, `resteFratrie = 1.0 - (partParent * parentsVivants.length)` avec `parentsVivants.length === 1` donne bien 0.75).
- Aucun parent, F/S seuls → totalité (`successionLegale.ts:305-309`, conforme à l'art. 737).
- Un seul parent, ni F/S ni postérité, ascendants dans l'autre branche → 1/2 au parent + fente sur le solde (`successionLegale.ts:288-299`, conforme à l'art. 738-1) — vérifié précisément : `applyFenteSuccessorale(graph, result, personnesVivantes, 0.75)` avec `totalShare = 0.75` (les 3/4 restants, cohérent avec le tableau qui prévoit 1/2 au parent + 1/2 à l'autre branche **au total**, soit après le premier quart déjà attribué… à vérifier : le référentiel dit *1/2 au parent, 1/2 à l'autre branche*, mais le code attribue *1/4 au parent survivant, 3/4 à la fente*. **Divergence potentielle** — détaillée en 2.6 ci-dessous plutôt que classée conforme à tort.

### 2.6 🔴 Bug confirmé (nouveau, non signalé par la cartographie) — Un seul parent sans fratrie : 1/4 au parent au lieu de 1/2 (§2.3, L116)

Le référentiel est explicite (tableau L116) : « Un seul parent, ni postérité ni F/S, mais ascendants dans l'autre branche → **1/2 au parent**, 1/2 à l'autre branche (art. 738-1) — fente ». Or le code (`successionLegale.ts:288-299`) donne :

```ts
// Un seul parent sans fratrie → parent 1/4, reste 3/4 passe à la fente (B5)
result.heritiers.push({
  personId: parentsVivants[0].id, /* ... */
  lien: 'parent', quotePart: 0.25, /* ... */
});
applyFenteSuccessorale(graph, result, personnesVivantes, 0.75);
```

Le code attribue **1/4** au parent survivant et envoie **3/4** à la fente — au lieu des **1/2** et **1/2** prescrits par le référentiel pour ce cas précis. Il semble y avoir une confusion avec la ligne du tableau juste au-dessus (« Un seul parent + frères/sœurs → parent 1/4, F/S 3/4 », art. 738), qui ne s'applique **pas** ici puisque ce cas-ci exclut explicitement la fratrie (`souchesFratrie.length > 0` est déjà `false` à ce point du code, on est dans la branche `else` de la ligne 276).

**Impact chiffré** : succession de 300 000 €, un seul parent survivant (la mère), pas de frère/sœur, grand-père paternel vivant (branche paternelle non vacante).
- **Référentiel** : mère = 1/2 × 300 000 = **150 000 €** ; branche paternelle (grand-père) = 1/2 × 300 000 = **150 000 €**.
- **Code actuel** : mère = 1/4 × 300 000 = **75 000 €** ; fente sur 3/4 = 225 000 € → grand-père = **225 000 €** (en supposant F18 corrigé, sinon la fente échoue aussi, cf. ci-dessous).

Écart de **75 000 €** transférés à tort de la mère vers la branche paternelle. Ce cas est rare en pratique (suppose un parent survivant unique, sans fratrie, avec un ascendant encore vivant dans l'autre branche) mais structurellement faux dès qu'il se présente — et le calcul ne produit aucune erreur ni alerte, juste un chiffre erroné.

- **Fichier/fonction** : `successionLegale.ts:287-299` (branche `else` de `calculateBrancheB`, cas B3 sans fratrie).
- **Référentiel** : §2.3, tableau L108-118, ligne « Un seul parent, ni postérité ni F/S, mais ascendants dans l'autre branche », art. 738-1.

**Options de correction** (sans recommandation) :
1. Remplacer `quotePart: 0.25` par `quotePart: 0.5` et `applyFenteSuccessorale(..., 0.75)` par `applyFenteSuccessorale(..., 0.5)` — correctif d'une ligne, fidèle au texte.
2. Vérifier d'abord s'il existe un test qui couvre déjà ce cas précis avec la valeur actuelle (0.25/0.75) avant de corriger, pour s'assurer que ce n'est pas un choix produit délibéré (aucun test de ce type trouvé dans `successionLegale.test.ts` lors de cette lecture, mais à confirmer par une recherche dédiée avant correction).

### 2.7 ✅ Conforme — PACS et concubinage exclus de la dévolution légale (§2.5, L157)

Le `FamilyGraph` n'inclut un conjoint (`hasSurvivingSpouse = true`) que si `statut_couple` est `'Marié(e)'` ou `'Pacsé(e)'` — **pas** `'Concubinage'` (`transmissionHelpers.ts:485-486`, confirmé aussi par la liste `['Marié(e)', 'Pacsé(e)']` sans `'Concubinage'`). Un partenaire de PACS y figure en revanche à tort au sens strict de la dévolution légale (voir 4.2 ci-dessous : problème distinct, sur la qualité de conjoint successible, pas sur ce point d'exclusion du concubin).

---

## 3. Chapitre 4 — Successions anomales et droits de retour (L231-287)

### 3.1 ⚪ Non implémenté — Droit de retour légal des père et mère (§4.1.1, L237-246)

Recherche négative confirmée : aucune occurrence de « droit de retour », « 738-2 » dans `src/lib/transmission/` ni `src/utils/transmissionHelpers.ts`. `successionLegale.ts` traite tout bien composant le patrimoine de façon uniforme, sans distinguer l'origine d'un bien (donné par le parent survivant, puis retrouvé dans le patrimoine de l'enfant prédécédé sans descendance) ni appliquer le retour en nature ou en valeur limité au 1/4 de l'actif net.

**Nuance découverte en confrontant `successionLegale.ts` au module DMTG** : `dmtg/types.ts:45-46` porte deux flags, `retourLegal?: boolean` et `retourConventionnel?: boolean`, sur `Asset.exclurePour` — utilisés dans `dmtg/assets.ts:19-21` pour exclure un bien de l'assiette **fiscale** taxable (`baseTaxable = 0`). Ces flags n'ont **aucun effet civil** : ils ne modifient ni la masse successorale calculée par `successionLegale.ts`/`reserve.ts`, ni la répartition entre héritiers — ils agissent uniquement en aval, sur le calcul des droits de mutation. Un bien donné par un parent au défunt, dont le donataire (le défunt) meurt sans descendance, serait donc dévolu selon la dévolution légale ordinaire (partagé entre tous les héritiers au prorata de leur quote-part) plutôt que retourné en priorité au parent donateur — même si l'utilisateur du logiciel coche `retourLegal` pour l'exonération fiscale, ce qui produit une **incohérence potentielle** : exonéré fiscalement d'un côté, mais pas retourné civilement de l'autre. Cette incohérence recoupe la remarque déjà faite par la cartographie (Bloc 4) sur ces deux flags comme « potentiellement morts » côté fiscal ; ici, le constat est complémentaire : même s'ils étaient pleinement branchés côté fiscal, ils resteraient sans effet civil.

- **Fichier/fonction** : absence dans `successionLegale.ts` — pas de fichier à citer côté civil ; `dmtg/types.ts:45-46`, `dmtg/assets.ts:19-21` côté fiscal (existant mais isolé).
- **Référentiel** : §4.1.1, L237-246.

*Décision de périmètre plausible (cas relativement rare : bien donné + prédécès du donataire + absence totale de descendance), à trancher comme pour les autres absences de ce chapitre — non un oubli isolé.*

### 3.2 ⚪ Non implémenté — Droit de retour légal des frères et sœurs (§4.1.2, L248-257)

Même constat : aucune trace de l'art. 757-3 (moitié aux F/S sur les biens reçus des ascendants, retrouvés en nature). Contrairement au droit de retour des père et mère, celui-ci n'a même pas d'équivalent partiel côté fiscal (pas de flag dédié — `retourLegal`/`retourConventionnel` ne distinguent pas l'ascendant du frère/sœur bénéficiaire).

- **Fichier/fonction** : absence totale — pas de fichier à citer.
- **Référentiel** : §4.1.2, L248-257.

### 3.3 ⚪ Non implémenté — Adoption simple, art. 366 (§4.1.3, L259-265) et droit de retour conventionnel, art. 951 (§4.1.4, L267-273)

Recherche négative confirmée pour les deux : aucune occurrence de « adoption simple » avec effet sur le retour de biens (le champ `enfantAdopte`/`adoptionSimpleAbattementPlein` existe mais concerne uniquement l'abattement fiscal DMTG, pas le retour de biens en cas de décès de l'adopté sans descendant) ; aucune occurrence de clause de retour conventionnel stipulée dans un acte de donation.

- **Référentiel** : §4.1.3, L259-265 ; §4.1.4, L267-273.

*Regroupés car de même nature (cas de niche, faible fréquence en clientèle patrimoniale standard) — décision de périmètre, non détaillés davantage.*

### 3.4 ⚪ Non implémenté — Biens dévolus selon leur nature (§4.2, L275-284)

Baux ruraux (dévolution anomale), droits d'auteur (usufruit spécial cumulable, extinction en cas de remariage), souvenirs de famille, concessions funéraires : recherche négative confirmée pour chacun des 4 items dans `src/`. **Assurance-vie** fait exception — elle est bien traitée hors succession civile par un module dédié (`dmtg/assurance-vie.ts`), cohérent avec le référentiel, mais ce module est hors périmètre de ce Bloc 2 (déjà couvert par la cartographie Bloc 6). **Droits viagers** (usufruit, rentes) : le principe « s'éteignent au décès » n'est jamais mis en défaut dans le code lu (aucune ligne ne tente de transmettre un usufruit du défunt à ses héritiers en tant que tel — le seul usufruit manipulé par le moteur est celui **créé** au décès par l'option du conjoint, pas un usufruit préexistant transmis).

- **Référentiel** : §4.2, L275-284.

*Cas de niche pour une clientèle patrimoniale standard (bail rural, droits d'auteur) — décision de périmètre à trancher globalement pour ce chapitre plutôt que ligne par ligne.*

---

## 4. Chapitre 5 — Les droits accessoires du conjoint (hors dévolution, L299-495)

### 4.1 Qualité de conjoint successible (§5.1, L290-297) {#41-qualité-de-conjoint-successible-51-l290-297}

#### 4.1.1 🔴 Bug confirmé — `hasSurvivingSpouse` ne distingue aucune des nuances légales

Le référentiel liste des cas où le conjoint **a** la qualité de successible malgré une situation a priori défavorable (instance de divorce, séparation de corps) et des cas où il **n'hérite pas** malgré un mariage apparemment valide (mariage posthume, séparation de corps avec clause de renonciation, mariage annulé) :

> « A la qualité de conjoint successible : l'époux en instance de divorce ; l'époux séparé de corps […]. N'hérite pas : le conjoint posthume (mariage conclu après le décès) ; le conjoint divorcé ; l'époux séparé de corps si la convention de séparation par consentement mutuel contient une clause de renonciation aux droits successoraux ; le conjoint dont le mariage a été annulé (sauf annulation postérieure au décès sans effet rétroactif). » (§5.1, L294-295)

Le code réduit tout cela à un test unique et binaire :

```ts
// transmissionHelpers.ts:485-486
if (maritalStatus?.statut_couple &&
    ['Marié(e)', 'Pacsé(e)'].includes(maritalStatus.statut_couple)) {
  // ... hasSurvivingSpouse = true
}
```

`statut_couple` est une valeur unique parmi `['Marié(e)', 'Pacsé(e)', 'Concubinage', 'Divorcé(e)', ...]` (type `MaritalStatus` dans `types.ts:6` : `"celibataire" | "marie" | "pacs" | "concubinage" | "divorce" | "veuf"` — la liste UI réelle diffère légèrement mais suit le même principe binaire, confirmé par recherche exhaustive de `statut_couple` dans tout `src/`, aucune occurrence de « instance de divorce », « séparation de corps », « posthume », « annulé » n'a été trouvée).

**Deux directions d'erreur possibles** :
1. **Faux négatif** : un couple encore juridiquement marié mais dont le conseiller aurait renseigné un statut informel « en instance de divorce » n'a, dans les faits, **aucune façon de le saisir** — il faudrait cocher `'Marié(e)'` (ce qui est correct pour la dévolution, l'instance de divorce ne fait *pas* perdre la qualité de conjoint successible) ou `'Divorcé(e)'` (ce qui exclurait à tort un conjoint qui, juridiquement, hérite toujours tant que le divorce n'est pas prononcé). Dans ce cas précis, la case `'Marié(e)'` donne le bon résultat, mais c'est un hasard de simplification (l'instance de divorce n'affecte in fine pas la dévolution), pas une distinction pensée.
2. **Faux positif structurel, plus grave** : le mariage posthume et la séparation de corps avec clause de renonciation sont des cas où un `statut_couple === 'Marié(e)'` bien réel dans la base **ne devrait pas** donner de droits successoraux, et rien dans le code ne permet de le neutraliser — le conjoint sera compté comme héritier successible à tort dans 100 % de ces situations si elles se présentent.

**Impact chiffré** (mariage posthume — cas le plus net) : conjoint marié la veille du décès, mariage annulé après coup pour rétablir la vérité, ou plus simplement un cas où le conseiller doit modéliser une succession avec un mariage in extremis sans droits successoraux reconnus. 2 enfants communs, patrimoine 600 000 €.
- **Référentiel** : conjoint posthume n'hérite pas → les 2 enfants se partagent la totalité, 300 000 € chacun.
- **Code actuel** : `hasSurvivingSpouse = true` (car `statut_couple === 'Marié(e)'`) → conjoint 1/4 PP ou option usufruit (150 000 € ou usufruit total), enfants se partagent le solde (450 000 € au lieu de 600 000 €, soit 225 000 € chacun au lieu de 300 000 €).

Écart de 150 000 € indûment attribué au conjoint, au détriment des enfants, dans ce cas précis. *Cas rare en pratique (nécessite un mariage littéralement conclu après le décès, ce qui suppose une erreur de saisie de date ou un scénario de simulation volontairement extrême) mais structurellement non filtré.*

- **Fichier/fonction** : `transmissionHelpers.ts:485-501` (construction de `hasSurvivingSpouse`) ; `types.ts:6` (`MaritalStatus`, pas de valeur pour ces nuances).
- **Référentiel** : §5.1, L290-297.

**Options de correction** (sans recommandation) :
1. Ajouter des champs booléens dédiés (`separationDeCorps`, `separationDeCorpsAvecRenonciation`, `mariagePosthume`) sur `maritalStatus`, lus par `transmissionHelpers.ts` pour ajuster `hasSurvivingSpouse` — correctif localisé mais alourdit un formulaire déjà chargé pour des cas rares.
2. Ne rien changer et documenter la limite : ces cas sont suffisamment rares en clientèle patrimoniale standard (un conseiller sait généralement distinguer ces situations en amont et peut simplement ne pas renseigner de conjoint dans le logiciel si les droits sont exclus) — à trancher comme décision de périmètre plutôt que comme bug à corriger en urgence, sauf si le cas d'usage se présente réellement en pratique chez les utilisateurs actuels.

#### 4.1.2 ✅ Conforme — Remariage postérieur au décès (§5.1, L297)

« Le remariage postérieur au décès ne fait perdre aucun droit acquis au jour du décès » — non pertinent pour un outil qui modélise un décès à une date de référence donnée (`referenceDate`) sans suivi temporel post-décès : le cas ne peut structurellement pas se présenter dans le modèle actuel de l'outil (qui ne simule qu'un instant T). Pas un défaut, une non-pertinence du cas pour l'architecture actuelle.

### 4.2 ⚪ Non implémenté — Panorama des droits accessoires, un par un (§5.2-5.13, L299-483)

Recherche négative individuelle pour chacun des points du panorama (§5.2, L301-307), confirmée pour chacun séparément comme demandé par la commande :

| Droit | Référentiel | Recherche effectuée | Résultat |
|---|---|---|---|
| **Conversion d'usufruit** (rente/capital) | §5.7, L381-412 | `grep -rni "conversion.*usufruit\|rente viagère"` | Aucune occurrence dans `src/` hors de ce document |
| **Droit de jouissance temporaire** (1 an, logement) | §5.8, L414-431 | `grep -rni "jouissance temporaire"` | Aucune occurrence |
| **Droit viager d'usage et d'habitation (DUH)** | §5.9, L433-454 | `grep -rni "droit viager\|\bduh\b"` | Aucune occurrence liée au conjoint (seules occurrences : un champ `"droit-viager"` dans le module **IFI**, `AjouterBienForm.tsx`, sans rapport — modélise un bien détenu en usufruit viager pour l'assiette IFI, pas le DUH successoral du conjoint) |
| **Attribution préférentielle du logement** | §5.10, L456-463 | `grep -rni "attribution préférentielle"` | Deux occurrences : un libellé de type de clause (`customClause.ts:3`) et un libellé de clause matrimoniale (`matrimonialClauses.ts:503`) — **purement déclaratifs**, jamais lus par `successionLegale.ts` ni `index.ts` (même pattern de « dropdowns riches mais non branchés » déjà relevé par la cartographie pour le Bloc 4 donations) |
| **Droits sur l'entreprise** (attribution préférentielle non de droit) | §5.11, L465-467 | Recherche croisée avec le point précédent | Absent — aucune distinction entreprise/logement pour l'attribution préférentielle, puisque l'attribution préférentielle elle-même est absente |
| **Pension du conjoint dans le besoin** | §5.12, L473 | `grep -rni "pension.*besoin\|conjoint.*besoin"` | Aucune occurrence (une seule mention de « Pension de réversion » trouvée, dans `budgetCategories.ts:35` — une catégorie de dépense/revenu budgétaire du module Budget, **sans lien** avec le calcul successoral) |
| **Créance d'aliments des ascendants** | §5.12, L474 | `grep -rni "créance.*aliment"` | Aucune occurrence |
| **Créance du conjoint collaborateur** | §5.12, L476 | `grep -rni "conjoint collaborateur"` | Aucune occurrence |
| **Jouissance légale sur les biens du mineur** | §5.12, L477 | `grep -rni "jouissance légale"` | Aucune occurrence |
| **Transfert du bail d'habitation** | §5.13, L479-482 | `grep -rni "transfert du bail\|cotitularité"` | Aucune occurrence |
| **Droit ancien** (successions avant le 1ᵉʳ juillet 2002) | §5.14, L484-495 | Recherche de « droit ancien », « 2002 » en lien avec succession | Aucune occurrence — cohérent, l'outil ne modélise que des situations courantes |

**Confirmation individuelle demandée par la commande** : chacun de ces 10 droits a été vérifié séparément par une recherche négative dédiée, pas seulement par un constat global — le résultat de la cartographie (« aucun droit accessoire ») est confirmé **intégralement et sans exception**, avec une seule nuance : l'attribution préférentielle a un embryon de représentation déclarative (nom de clause dans deux listes UI), strictement sans effet, comme le sont les clauses de donation déjà documentées dans la cartographie pour le Bloc 4.

- **Fichier/fonction** : absence totale pour 9 des 10 droits ; `src/types/customClause.ts:3`, `src/constants/matrimonialClauses.ts:503` pour l'attribution préférentielle (déclaratif seul).
- **Référentiel** : §5.7 à §5.14, L381-495.

*Décision de périmètre majeure à trancher (V1/V2) — ces droits, en particulier la conversion d'usufruit et le DUH, sont des leviers de conseil patrimonial fréquemment utilisés en pratique (le référentiel les qualifie explicitement de « conseil pratique » recommandé, §5.9). Leur absence n'est pas un simple oubli mineur au regard de la vocation de l'outil, mais leur volume de développement (règles de conversion judiciaire, fiscalité de la conversion, barème 60 % de l'usufruit pour le DUH, etc.) en fait un chantier à part entière, pas un correctif ponctuel.*

### 4.3 §5.3 — L'option 1/4 PP ou 100 % usufruit (art. 757, 758-1 à 758-4)

#### 4.3.1 ✅ Conforme — Ouverture/fermeture de l'option selon la communauté des enfants (§5.3, L317-320)

```ts
// successionLegale.ts:95-98
const tousCommuns = souchesEnfants.every(s =>
  graph.childrenCommonWithSpouse.includes(s.rootChildId)
);
```

L'option (`usufruit_total`) n'est proposée (`result.optionConjoint = {...}`) que si `tousCommuns` est vrai ; sinon le code force `conjointPart = 0.25` sans jamais lire la valeur d'`optionConjoint` transmise par l'appelant (`successionLegale.ts:149-155`, branche `else` du test `tousCommuns`). Conforme à « option fermée (1/4 PP obligatoire) en présence d'au moins un enfant non commun ».

*Non vérifié séparément : le cas d'adoption simple de l'enfant du conjoint qui « semble » rouvrir l'option (§5.3, L320, formulation elle-même prudente dans le référentiel — « il semble que »). Non testé ici faute de certitude doctrinale du référentiel lui-même sur ce point ; mentionné pour mémoire.*

#### 4.3.2 ⚪ Non implémenté — Délai et présomption d'option pour usufruit (§5.3, L326-329)

Le délai de 10 ans (ou 3 mois sur interpellation) et la présomption d'option pour l'usufruit en cas de silence ou de décès du conjoint avant d'avoir opté (art. 758-4) sont absents : l'outil ne modélise qu'un instant T (le décès simulé aujourd'hui), sans suivi temporel de l'exercice de l'option par le conjoint après le décès — cohérent avec la limite déjà relevée pour le remariage postérieur (§4.1.2 ci-dessus) et pour la réévaluation au partage (audit Bloc 1, T1/T3). Non un oubli isolé, mais une conséquence de l'absence générale de modélisation temporelle post-décès dans l'outil.

- **Référentiel** : §5.3, L326-329.

### 4.4 §5.4 — Vocation en propriété, la double masse (art. 758-5) {#52}

> **✅ RÉSOLU (2026-08)** — Suite complète de ce finding :
> `docs/audit-transmission-clamp-double-masse-2026-08.md` (le clamp `Math.max(0,
> partFinale)` mentionné en 4.4.1 s'est révélé mathématiquement mort — jamais le
> vecteur du bug ; le vrai mécanisme identifié est la fraction `civilShares` utilisée
> pour répartir le cash réel, cas chiffré confirmé) →
> `docs/design-rapport-moins-prenant-2026-08.md` (design du correctif, arrêté une
> première fois sur une ambiguïté légale non tranchée par le référentiel, arbitrée le
> 2026-08) → implémenté dans `index.ts` (§6bis, mécanisme « rapport en moins prenant »,
> art. 858 C. civ.), tests de régression dans
> `src/lib/transmission/doubleMasseConjoint.audit-2026-08.test.ts` (5 scénarios). Le
> reste de cette section (4.4.1 ci-dessous) est conservé tel qu'écrit à l'origine pour
> l'historique du diagnostic.

#### 4.4.1 🔴 Bug confirmé — Une seule masse sert à la fois à chiffrer et à exercer le quart du conjoint

Le référentiel distingue explicitement deux masses (§5.4, L338-349) :

> « **① Masse de calcul** — sert à *chiffrer* le quart : biens existants au décès − dettes + réunion fictive des donations […]. **② Masse d'exercice** — sert à *prélever* effectivement : le conjoint ne peut exercer son droit que sur les biens dont le défunt n'a pas disposé par donation ou testament. […] Conséquence : le conjoint peut être exhérédé de fait si le défunt a disposé de tout son patrimoine par libéralités. »

**Ce que fait le code** : le `quotePart` du conjoint (ex. 0.25) est une fraction abstraite, calculée par `successionLegale.ts` sans référence à aucune masse concrète. C'est `index.ts:398` qui la transforme en euros pour **tous** les héritiers, conjoint compris, de façon strictement uniforme :

```ts
// index.ts:398
let partFinale = heir.quotePart * rapportResult.massePartageable * demembrementPct;
```

`rapportResult.massePartageable` est une seule masse (celle déjà identifiée par l'audit Bloc 1 comme confondant réunion fictive/rapport, cf. T1/T4). Aucune ligne du code ne calcule séparément une « masse d'exercice » plafonnée aux « biens dont le défunt n'a pas disposé », ni ne vérifie que le montant attribué au conjoint reste dans cette limite. Recherche négative confirmée : aucune occurrence de « masse d'exercice », « 758-5 », « biens non disposés » dans `src/lib/transmission/`.

**Ce qui a été vérifié pour construire un cas chiffré fiable** : le comportement du code diverge selon le type de libéralité ayant réduit le patrimoine, ce qui **nuance** l'ampleur réelle du bug par rapport à une lecture superficielle du code :

- **Cas d'une libéralité hors part à un tiers étranger à la succession** (non rapportable, jamais réintégrée dans `massePartageable` par construction — cf. audit Bloc 1 §4.2) : vérifié numériquement (1 enfant commun, biens existants 500 000 €, donation hors part à un tiers de 400 000 € restant sous la QD de l'enfant unique pour ne pas déclencher de réduction) — dans ce cas précis, `massePartageable` reste égale aux seuls biens existants (500 000 €), et le calcul du conjoint (0,25 × 500 000 = 125 000 €) **coïncide par construction** avec ce que donnerait une véritable masse d'exercice. **Pas de divergence numérique dans ce sous-cas.**
- **Cas d'une donation en avancement de part à un enfant réservataire** (rapportable, réintégrée dans `massePartageable`) : c'est là que la divergence de principe apparaît. Exemple construit : 1 enfant commun ayant reçu une donation ancienne de 900 000 € en avancement de part (imputée sans excéder réserve + QD, donc sans réduction) ; biens existants résiduels au décès : 100 000 €, aucun passif. `massePartageable` = 100 000 + 900 000 (rapport) = 1 000 000 €. Conjoint (option fermée par défaut, 1/4 PP) : `partFinale` = 0,25 × 1 000 000 = **250 000 €**. Or les biens réellement disponibles dans la succession (« dont le défunt n'a pas disposé ») ne sont que de **100 000 €** — le solde de 900 000 € est un bien déjà détenu par l'enfant depuis des années, hors succession dans les faits. Le calcul de l'enfant se rééquilibre algébriquement (`partFinale enfant` = 0,75 × 1 000 000 − 900 000 (rapport) + 900 000 (libéralité maintenue) = 750 000 €, cf. mécanisme déjà confirmé conforme par l'audit Bloc 1 §4.5 pour la non-double-comptabilisation), mais ce rééquilibrage **suppose implicitement** que l'enfant puisse verser la différence entre ce qu'il détient déjà (900 000 €) et sa part théorique (750 000 €) — soit **150 000 €** — en compensation aux autres héritiers (une soulte). Rien dans le code ne calcule ni ne garantit explicitement cette soulte : `partFinale` de l'enfant (750 000 €, positif) ne distingue pas la part « déjà détenue en nature » de la part « à recevoir en numéraire depuis la succession », et `Math.max(0, partFinale)` (`index.ts:430`) clampe silencieusement à zéro toute part qui deviendrait négative dans un scénario où l'écart serait plus important — sans jamais réattribuer la différence manquante au conjoint ou aux autres héritiers.

**Limite de cette vérification, en toute transparence** : construire un scénario où `Math.max(0, ...)` se déclenche *effectivement* (c'est-à-dire où le terme `-rapportTotal + liberalitesMaintenues` ne s'annule pas exactement, cf. mécanisme confirmé conforme par le Bloc 1 §4.5) s'est heurté, dans les configurations testées, au déclenchement simultané d'une réduction pour excès de la libéralité — un mécanisme qui, lui, réintègre correctement l'indemnité de réduction dans `massePartageable` (Bloc 1, conforme). Il est donc possible que le filet de sécurité de la réduction limite en pratique l'ampleur des cas où la double masse du conjoint produit un écart numérique franc. **Ce point précis — l'interaction entre le clamp `Math.max(0, partFinale)` et la garantie effective de paiement du conjoint sur la seule masse d'exercice — n'a pas pu être vérifié de façon exhaustive dans le temps imparti à cet audit et mériterait un examen dédié**, articulé avec les findings T1/T4/T5 de l'audit Bloc 1 qui touchent au même fichier `index.ts`.

**Ce qui est en revanche établi avec certitude, sans réserve** : le principe même de la double masse (art. 758-5) est absent du code — il n'existe **aucun garde-fou explicite** empêchant le conjoint de se voir attribuer, sur le papier, un montant supérieur à ce que la succession peut effectivement lui verser en biens non disposés, contrairement à ce qu'impose la loi. Le cas limite du référentiel (« le conjoint peut être exhérédé de fait ») fonctionne correctement dans le sous-cas testé (libéralité hors part à un tiers), mais ce succès semble être un **effet de bord** de la façon dont `computeRapport` traite déjà les libéralités hors part (audit Bloc 1), pas le fruit d'une règle dédiée au conjoint.

- **Fichier/fonction** : `index.ts:398` (`partFinale = heir.quotePart * rapportResult.massePartageable * demembrementPct`, appliqué uniformément à tous les héritiers) ; `index.ts:430` (`Math.max(0, partFinale)`, clamp sans réattribution) ; `successionLegale.ts` (aucune notion de masse d'exercice distincte pour le conjoint).
- **Référentiel** : §5.4, L338-349, art. 758-5 C. civ.

**Options de correction** (sans recommandation — chantier qui recoupe les findings T1/T4/T5 du Bloc 1, à cadrer conjointement) :
1. Calculer une masse d'exercice distincte pour le conjoint (biens existants − dettes, hors toute réintégration de libéralité), plafonner son `partFinale` à cette masse, et documenter/alerter si le plafond est atteint (conjoint exhérédé de fait).
2. Vérifier explicitement, pour chaque héritier « moins-prenant » (donation antérieure supérieure à sa part théorique), qu'une soulte positive est bien calculée et réattribuée aux autres héritiers avant d'appliquer `Math.max(0, ...)` — traite la cause plus générale (pas seulement pour le conjoint) et interagit directement avec le futur correctif des findings T1/T4/T5 du Bloc 1.
3. Documenter la limite sans corriger à court terme, en marquant clairement dans l'UI que le montant affiché pour le conjoint est un montant théorique qui peut ne pas être intégralement disponible en biens non disposés — traite la transparence, pas l'exactitude.

### 4.5 ✅ Conforme — Vocation en usufruit, assiette (§5.5, L350-359)

```ts
// successionLegale.ts:113-119, 172-174
if (optionConjoint === 'usufruit_total') {
  conjointPart = 1.0; conjointTypeQuotePart = 'usufruit'; enfantsTypeQuotePart = 'nue_propriete';
}
// ...
distributeToSouchesWithType(result, souchesEnfants, 1.0, enfantsTypeQuotePart); // enfants 100% en nue-propriété
```

L'usufruit du conjoint (quand il opte pour ce choix) porte sur `1.0` (la totalité), avec les enfants en nue-propriété sur `1.0` également (deux droits distincts sur la même assiette, facteur `demembrementPct` appliqué séparément dans `index.ts:391-395`, déjà relevé comme correctement dimensionné par un commentaire du code lui-même à `index.ts:386-388`). Le référentiel précise que l'usufruit « ne porte pas sur les biens légués ni sur les biens donnés (en avancement de part ou hors part) » et « porte sur la réserve des descendants » : la première partie (exclusion des legs/donations) est cohérente avec le fait que `massePartageable` (l'assiette sur laquelle porte le calcul, cf. §4.4 ci-dessus) exclut déjà les libéralités hors part (non réintégrées) tout en réintégrant les avances de part rapportables — un comportement qui, pour ce point précis de l'assiette de l'usufruit, correspond à l'esprit du référentiel (l'usufruit porte sur ce qui reste après défalcation des libéralités non rapportables). La seconde partie (l'usufruit porte sur la réserve, sans étage de protection distinct) n'appelle pas de mécanisme séparé dans le code : la réserve n'est de toute façon jamais calculée comme « libre de charges » pour ensuite exclure l'usufruit — il n'y a donc rien à corriger ici, l'absence de distinction produit le bon résultat par simplicité de construction.

*Non revérifié en détail chiffré (hors périmètre prioritaire de la commande pour ce point) — classé conforme sur la base de la lecture du mécanisme d'assiette, cohérent avec les findings déjà établis en §4.4 et par l'audit Bloc 1.*

### 4.6 §5.6 — La donation entre époux (DDV/DEE)

#`donationEntreEpoux` (`types.ts:69`) a déjà été signalé comme **champ orphelin / code mort** par l'audit Bloc 1 (§5.6) — non re-détaillé ici. Ce qui **est** dans le périmètre propre de ce Bloc 2 :

#### 4.6.1 ✅ Conforme (partiellement) — Les trois options A/B/C de la DDV (§5.6, L363-370)

```ts
// successionLegale.ts:113-148
if (optionConjoint === 'usufruit_total') { /* Option C : totalité en usufruit */ }
else if (optionConjoint === 'quart_pp_3quarts_us' && hasDDV) { /* Option B : 1/4 PP + 3/4 US */ }
else if (optionConjoint === 'qd_pp' && hasDDV) { /* Option A : QD en PP */ }
```

Les trois options du référentiel sont bien représentées comme trois branches distinctes, avec un garde-fou correct : les options B et C nécessitent `hasDDV` (une DDV doit exister — `!!graph.hasDDV`, `successionLegale.ts:104`), cohérent avec le fait que ces options n'existent qu'en présence d'une donation entre époux. **Réserve** : ce constat valide la structure de la branche de calcul elle-même ; il ne dit rien de la façon dont `hasDDV` est effectivement alimenté en amont (hors périmètre `successionLegale.ts`, non vérifié ici) ni de la façon dont l'option choisie par l'utilisateur est transmise (`Synthese.tsx`/`Succession2ndDeces.tsx`, lus au passage sans audit approfondi de ces écrans).

#### 4.6.2 ⚪ Non implémenté — Plafond global QDS pour les donations entre vifs et DDV cumulées (§5.6, L379)

« Toutes les donations entre époux (entre vifs et DDV) s'imputent dans la QDS, celle-ci étant un plafond global à ne pas dépasser. » Ce point recoupe directement le finding §2.3 déjà posé par l'audit Bloc 1 (QDS entre époux absente de `reserve.ts`) — confirmé ici sous un angle complémentaire : `successionLegale.ts` ne fait pas non plus le lien entre l'option DDV choisie (A/B/C) et d'éventuelles donations entre vifs déjà consenties au même conjoint, qui devraient réduire d'autant le plafond disponible. Pas un nouveau bug distinct, mais confirmation que l'absence déjà signalée touche aussi la mécanique de l'option DDV elle-même, pas seulement `reserve.ts`.

- **Référentiel** : §5.6, L379 ; renvoi à l'audit Bloc 1 §2.3.

---

## 5. Chapitre 7 — L'option successorale (L582-663)

### 5.1 ⚪ Non implémenté — Distinction acceptation pure et simple / à concurrence de l'actif net (§7.3-7.4, L600-623)

Recherche négative confirmée : aucune occurrence de « actif net » au sens successoral (une seule occurrence de « actif net » dans tout `src/`, à `netBreakdown.ts:21`, mais qui désigne l'assiette du **droit de partage fiscal** — art. 746 CGI — un concept totalement différent de l'« acceptation à concurrence de l'actif net » du droit des successions, homonymie fiscale/civile qui ne doit pas être confondue) ; aucune occurrence de « bénéfice d'inventaire », d'« option_successorale » ou de champ équivalent portant une valeur parmi les trois branches de l'art. 768 (acceptation pure et simple / à concurrence de l'actif net / renonciation).

**Conséquence concrète** : l'outil ne modélise que deux états implicites — héritier (traité comme acceptant pur et simple par défaut, sans jamais le dire explicitement) ou renonçant (`Person.renoncant`, déjà utilisé pour l'effet dévolutif de la renonciation, cf. F19 hors périmètre de ce document). La troisième branche, l'acceptation à concurrence de l'actif net, n'existe nulle part :
- Aucune conséquence sur la **responsabilité aux dettes** n'est modélisée pour aucune des deux branches d'acceptation (le référentiel : pure et simple = tenu sur ses biens personnels ; à concurrence de l'actif net = limité à la valeur des biens recueillis) — cohérent avec le constat plus général que l'outil ne modélise pas de dettes personnelles des héritiers envers la succession ni de créanciers (déjà relevé par l'audit Indivision, §2.4, pour les créanciers de l'indivision — le même constat vaut ici pour les créanciers de la succession en général).
- Le délai de 10 ans, la procédure de déclaration au greffe/notaire, l'inventaire à 2 mois, la déchéance rétroactive (art. 800) : tous absents, cohérent avec l'absence générale de modélisation temporelle post-décès déjà relevée en §4.1.2 et §4.3.2 ci-dessus.

**Impact pratique** : pour un conseiller patrimonial, cette absence signifie que l'outil ne peut **jamais alerter** sur un cas où l'acceptation à concurrence de l'actif net serait recommandée (le référentiel : « à réserver aux cas de doute réel sur l'étendue du passif », §7.4, L623) — un patrimoine avec un passif significatif et incertain (ex. succession d'un entrepreneur individuel, dettes potentiellement sous-évaluées) ne déclenche aucune alerte de ce type, alors que c'est précisément le type de configuration où ce choix a le plus de valeur pour un client.

- **Fichier/fonction** : absence totale — pas de fichier à citer côté modélisation de l'option ; `netBreakdown.ts:21` cité uniquement pour écarter une fausse piste homonymique.
- **Référentiel** : §7.1, L584-588 ; §7.3, L600-605 ; §7.4, L607-623.

*Décision de périmètre à trancher : contrairement aux droits accessoires du conjoint (§4.2, qui sont un outil de conseil au moment de la succession), l'option successorale elle-même n'a peut-être qu'un intérêt limité pour un outil de simulation patrimoniale en amont du décès (elle se décide après le décès, par les héritiers, pas par le défunt de son vivant) — sauf si l'outil est aussi utilisé pour accompagner une succession déjà ouverte, auquel cas l'absence est plus significative. À trancher selon l'usage réel de l'outil.*

### 5.2 ⚪ Non implémenté — Régime général de l'option (§7.2, L590-598)

Indivisibilité de l'option, sauf pour l'héritier-et-légataire (deux droits distincts) ; option des créanciers personnels de l'héritier inactif (art. 779) — tous deux absents, cohérent avec l'absence de la notion même d'option ci-dessus. Non détaillé davantage (conséquence directe de 5.1).

### 5.3 🟡 Renonciation — hors périmètre de ce document (déjà couvert, cf. F19)

Le mécanisme de renonciation lui-même (`Person.renoncant`/`renoncantDe`, `resolveRenoncantDe`) et son effet dévolutif ont été corrigés par le commit `32c79bd` et seront ré-audités formellement dans le Bloc 5 dédié aux correctifs récents. Un seul point, non couvert par ce futur chantier (qui porte sur l'effet dévolutif, pas sur la forme de la renonciation elle-même), est relevé ici pour mémoire : la forme légale de la renonciation (déclaration expresse, dépôt au greffe/notaire, §7.5, L627) n'a — logiquement — aucune représentation dans un champ booléen (`Person.renoncant`), ce qui est cohérent avec le niveau de modélisation choisi par l'outil pour ce champ (un fait juridique acquis, pas son processus formel de constitution) et n'appelle pas de correctif à ce stade.

### 5.4 ⚪ Non implémenté — Pactes sur succession future, hors DDV/RAAR/donation-partage déjà couvertes ailleurs (§7.7, L642-653)

La clause commerciale et les clauses statutaires de reprise de parts d'un associé décédé sont absentes — cohérent avec l'absence plus générale de modélisation des sociétés au décès d'un associé au-delà de la simple valorisation des parts (`SocietesTransmission.tsx`, déjà mentionné dans l'audit Indivision comme affecté par P14, mais pour un autre aspect). Non détaillé davantage : cas de niche pour la clientèle standard visée par l'outil.

### 5.5 ⚪ Non implémenté — Droits des héritiers et créanciers (§7.8, L655-660)

Saisine de plein droit, absence de solidarité des dettes entre héritiers (chacun redevable à hauteur de sa part), solidarité fiscale pour les droits de succession : recherche négative confirmée. Cohérent avec l'absence générale de modélisation des dettes/créanciers déjà relevée (§5.1 ci-dessus, et audit Indivision §2.4).

---

## 6. Focus — F18 : la fente successorale et le vocabulaire `branche_familiale` {#f18}

### 6.1 🔴 Bug confirmé, plus grave que le libellé de la cartographie — Absence de champ de saisie pour la branche des grands-parents

Le mécanisme `applyFenteSuccessorale`/`collectFenteHeritiers` (`successionLegale.ts:558-647`) répartit les héritiers de rang 3 (ordre C. civ., « ascendants ordinaires ») et 4 (« collatéraux ordinaires ») entre branche paternelle et branche maternelle, en s'appuyant sur `p.brancheFamiliale` (avec repli sur `p.lienFamilial` si absent) :

```ts
// successionLegale.ts:609-612
const isBranche = (p: any) => {
  const b = p.brancheFamiliale?.toLowerCase() || p.lienFamilial?.toLowerCase() || '';
  return brancheLabels.some(label => b.includes(label));
};
```

Ce mécanisme est appliqué **de façon identique** aux 4 rangs internes de `collectFenteHeritiers` : grands-parents (rang 1), arrière-grands-parents (rang 2), oncles/tantes (rang 3), cousins germains (rang 4). Or **côté saisie**, le champ `branche_familiale` n'est exposé dans l'interface que pour un seul de ces cas :

```tsx
// DynamicFamilyForm.tsx:82
const showBranche = linkType === 'Oncle/Tante';
```

**Conséquence vérifiée pour chaque rang** :
- **Rang 1 (Grand-parent)** : `linkType` disponible dans le formulaire (`useFamilyLinkLogic.ts:88-94`, apparaît dès qu'un `Parent` existe), mais `showBranche` est `false` pour ce type → `branche_familiale` n'est **jamais saisissable** pour un grand-parent. Comme son `lienFamilial` (`'Grand-parent'`) ne contient ni « paternelle » ni « paternel » ni « père » (et symétriquement pour la branche maternelle), le repli sur `lienFamilial` dans `isBranche()` échoue également. **Un grand-parent vivant, quelle que soit sa branche réelle, ne matche jamais aucune des deux branches dans `collectFenteHeritiers`.**
- **Rang 2 (Arrière-grand-parent)** : plus grave encore — `'Arrière grand-parent'` n'existe **même pas** dans la liste des liens familiaux proposés à la saisie (`useFamilyLinkLogic.ts:42-124`, absent de `availableLinks`, alors que la logique de rang existe bien côté `successionLegale.ts` et côté `buildFamilyGraph.ts:31` qui connaît pourtant ce degré de parenté pour d'autres besoins). Ce rang est donc **mort en pratique** : aucun utilisateur ne peut jamais saisir un arrière-grand-parent, quelle que soit la branche.
- **Rang 3 (Oncle/Tante)** : seul cas où le champ fonctionne réellement (`showBranche === true`), avec une valeur par défaut sensée (`'Branche paternelle'`, `DynamicFamilyForm.tsx:145`).
- **Rang 4 (Cousin/Cousine)** : même défaut que les grands-parents — `showBranche` est `false` pour ce `linkType` également, alors que `collectFenteHeritiers` a besoin de `brancheFamiliale` pour ce rang aussi.

**Impact chiffré, cas le plus fréquent (rang 1, grands-parents)** : défunt non marié, sans enfant, sans parent vivant, sans frère/sœur — un grand-père paternel et une grand-mère maternelle vivants (cas réaliste : les deux parents du défunt sont eux-mêmes décédés, mais un grand-parent de chaque côté survit). Patrimoine net 500 000 €.

- **Référentiel attendu** (§2.1, ordre 3 ; §2.3, fente 50/50 entre branches) : branche paternelle (grand-père) = 250 000 € ; branche maternelle (grand-mère) = 250 000 €.
- **Code actuel** : `branche_familiale` n'a jamais pu être renseigné pour ces deux personnes (saisies comme `'Grand-parent'`, champ non affiché). `collectFenteHeritiers('paternelle')` filtre `grandsParents` par `isBranche(p)`, qui retourne `false` pour les deux (ni `brancheFamiliale` ni `lienFamilial` ne contiennent les libellés attendus). Résultat : `grandsParents.length === 0` pour les **deux** branches, la fonction retombe en cascade sur les rangs 2 (arrière-grands-parents, structurellement vide, cf. ci-dessus), 3 (oncles/tantes, aucun lien `lienFamilial` de grand-parent ne matche ce filtre) et 4 (cousins, même chose) — tous vides. `applyFenteSuccessorale` conclut alors :

```ts
// successionLegale.ts:571-574
if (!hasPat && !hasMat) {
  result.explicationsTexte.push(`Aucun héritier jusqu'au 6ème degré. L'État français hérite.`);
  return;
}
```

**Les 500 000 € sont attribués à l'État par déshérence, alors que deux grands-parents parfaitement vivants et identifiés existent dans le dossier.** Ce n'est pas un simple écart de répartition entre héritiers (comme la plupart des findings des audits précédents) — c'est une **omission totale d'héritiers pourtant saisis dans l'application**, avec un message affiché à l'utilisateur (« l'État français hérite ») qui contredit directement les données qu'il vient de saisir.

**Élément aggravant, propre à ce bug** : `successionLegale.test.ts:33-34` construit ses fixtures de test avec `brancheFamiliale: 'Branche paternelle'` directement posé sur des personnes de `lienFamilial: 'Grand-parent'` — une forme de données que **l'interface réelle ne peut jamais produire** (puisque `showBranche` est `false` pour ce type). Les tests unitaires passent donc et donnent une fausse assurance de couverture, alors que le chemin réellement emprunté par un utilisateur de l'application (saisie via `DynamicFamilyForm`, jamais directement via un objet `Person` construit à la main) ne peut jamais atteindre l'état testé. Confirmé par recherche du même schéma dans les autres fixtures du fichier (lignes 51, 80) : les mêmes tests couvrant un oncle/tante paternel (ligne 80, `lienFamilial: 'Oncle/Tante'`) sont eux valides puisque ce cas fonctionne réellement dans l'UI — seule la fixture grand-parent (lignes 33-34, 51) est un artefact de test qui ne reflète aucun parcours utilisateur réel.

- **Fichier/fonction** : `DynamicFamilyForm.tsx:82` (`showBranche`, condition trop restrictive) ; `useFamilyLinkLogic.ts:42-124` (`availableLinks`, absence totale de `'Arrière grand-parent'`) ; `successionLegale.ts:609-647` (`collectFenteHeritiers`, `isBranche`, aucune dérivation alternative de la branche à partir du lien `enfant_de` qui rattache pourtant chaque grand-parent à un parent précis, donc implicitement à une branche) ; `successionLegale.test.ts:33-34,51` (fixtures non représentatives d'un parcours utilisateur réel).
- **Référentiel** : §2.1, L78-87 (ordre 3) ; §2.3, L120-127 (fente successorale, art. 746 à 750) ; Annexe non applicable ici (le référentiel principal suffit).

**Options de correction** (sans recommandation) :
1. **Étendre `showBranche`** à `'Grand-parent'` et `'Cousin/Cousine'` dans `DynamicFamilyForm.tsx:82`, sur le modèle exact de ce qui existe déjà pour `'Oncle/Tante'` — correctif localisé, cohérent avec le pattern existant, mais laisse les grands-parents déjà saisis en base (avant le correctif) sans branche renseignée : nécessiterait une reprise de données ou une invite à compléter les fiches existantes.
2. **Ajouter `'Arrière grand-parent'` à `availableLinks`** (`useFamilyLinkLogic.ts`), avec `showBranche` également activé pour ce type — nécessaire séparément du point 1, puisque ce rang est aujourd'hui totalement inaccessible à la saisie, pas seulement privé de branche.
3. **Dériver automatiquement la branche depuis le lien de filiation** (`enfant_de`) plutôt que de demander une saisie manuelle redondante : un grand-parent est rattaché via `enfant_de` à un `Parent` précis (père ou mère du défunt) ; si ce `Parent` porte lui-même une information de branche (ou si l'ordre de saisie — premier parent = branche paternelle par convention — était formalisé), la branche du grand-parent pourrait être déduite sans nouvelle saisie. Option plus robuste (élimine le risque de saisie manquante ou incohérente) mais plus lourde à développer, et suppose de revoir aussi le rattachement des oncles/tantes (actuellement saisis avec une branche manuelle indépendante de leur propre lien de filiation).
4. **Combiner 1+2 à court terme** (corrige l'accessibilité immédiate) **et 3 à moyen terme** (élimine la classe de bug plutôt que de la corriger cas par cas) — cohérent avec la façon dont d'autres findings de cet ensemble d'audits ont été traités (correctif immédiat + refonte différée documentée comme dette).

---

## 7. Récapitulatif des findings

| ID | Statut | Résumé | Chiffrage |
|---|---|---|---|
| [F18](#f18) | 🔴 Bug confirmé | Fente successorale : `branche_familiale` non saisissable pour les grands-parents (rang 1) et les cousins (rang 4) ; arrière-grands-parents (rang 2) non saisissables du tout | Déshérence à tort : 500 000 € attribués à l'État au lieu de 2 grands-parents vivants |
| §2.6 | 🔴 Bug confirmé (nouveau) | Un seul parent survivant sans fratrie : 1/4 attribué au parent au lieu de 1/2 (confusion avec la ligne « parent + fratrie » du tableau) | Écart 75 000 € sur une succession de 300 000 € |
| [§4.4](#52) | 🔴 Absence structurelle confirmée | Double masse du conjoint (art. 758-5) absente ; masse de calcul et masse d'exercice confondues dans `index.ts:398` | Écart de principe démontré (250 000 € nominaux vs 100 000 € réellement disponibles) ; ampleur exacte des cas limites non totalement vérifiée dans le temps imparti |
| §4.1.1 | 🔴 Bug confirmé | `hasSurvivingSpouse` binaire, ne distingue ni séparation de corps, ni instance de divorce, ni mariage posthume | Écart 150 000 € (cas du mariage posthume, 2 enfants, 600 000 €) |
| §4.2 | ⚪ Non implémenté (10 items vérifiés individuellement) | Droits accessoires du conjoint : conversion d'usufruit, DUH, droit temporaire logement, attribution préférentielle, droits entreprise, pensions/créances, transfert de bail, droit ancien | — |
| §5.1 | ⚪ Non implémenté | Distinction acceptation pure et simple / à concurrence de l'actif net ; aucune conséquence sur la responsabilité aux dettes | — |
| §3.1 | ⚪ Non implémenté (civil) | Droit de retour légal des père et mère — nuance : 2 flags fiscaux existent (`retourLegal`/`retourConventionnel`) mais sans effet civil | — |
| §3.2 | ⚪ Non implémenté | Droit de retour légal des frères et sœurs | — |
| §3.3 | ⚪ Non implémenté | Adoption simple (retour de biens) ; droit de retour conventionnel | — |
| §3.4 | ⚪ Non implémenté | Baux ruraux, droits d'auteur, souvenirs de famille, concessions funéraires | — |
| §4.3.2 | ⚪ Non implémenté | Délai/présomption d'option du conjoint (10 ans / 3 mois / décès avant option) | — |
| §4.6.2 | ⚪ Non implémenté | Plafond QDS global donations entre vifs + DDV cumulées (recoupe Bloc 1 §2.3) | — |
| §5.2, §5.4, §5.5 | ⚪ Non implémenté | Régime général de l'option (indivisibilité, créanciers art. 779), pactes sur succession future (hors DDV/RAAR déjà couvertes), solidarité des dettes | — |
| — | 🟡 Confirmé toujours vrai | Golden Scenarios (5 scénarios) ne couvrent aucun sujet 🟡/🔴 de ce Bloc 2 | — |
| §2.1 | ✅ Conforme | Quatre ordres, exclusion stricte entre ordres | — |
| §2.2 | ✅ Conforme | Représentation et calcul de la réserve sur le nombre de souches | — |
| §2.3 | 🟡 Conforme par construction | Représentation limitée aux bons ordres, mais par omission plutôt que règle explicite | — |
| §2.5 | ✅ Conforme (sauf §2.6) | Configurations parents/fratrie de l'ordre 2 | — |
| §2.7 | ✅ Conforme | PACS/concubinage exclus de la dévolution légale (hors nuance qualité conjoint, §4.1.1) | — |
| §4.3.1 | ✅ Conforme | Ouverture/fermeture de l'option 1/4 PP vs usufruit selon communauté des enfants | — |
| §4.5 | ✅ Conforme | Assiette de l'usufruit du conjoint (exclusion legs/donations hors part) | — |
| §4.6.1 | ✅ Conforme (partiel) | Trois options A/B/C de la DDV, garde-fou `hasDDV` correct | — |
| §5.3 | 🟡 Hors périmètre | Renonciation elle-même déjà couverte par F19 (Bloc 5 à venir) | — |

---

## Annexe — commandes de vérification utilisées

```bash
git fetch && git status && git log --oneline -5
git rev-parse HEAD && git status --short

grep -n "hasSurvivingSpouse\|survivingSpouseId\|hasDDV\|brancheFamiliale\|branche_familiale\|separationDeCorps\|instanceDivorce\|divorce\|mariage_posthume\|mariagePosthume" src/lib/transmission/types.ts
grep -rn "branche_familiale\|brancheFamiliale" src --include="*.ts" --include="*.tsx"
grep -rn "hasSurvivingSpouse" src --include="*.ts" --include="*.tsx"
grep -rn "optionConjoint" src --include="*.ts" --include="*.tsx"
grep -rni "conversion.*usufruit\|rente viagère\|jouissance temporaire\|duh\b\|droit viager\|attribution préférentielle\|attribution preferentielle\|conjoint collaborateur\|pension de réversion\|transfert du bail\|cotitularité" src --include="*.ts" --include="*.tsx"
grep -rni "actif net\|benefice.*inventaire\|bénéfice.*inventaire\|acceptation.*pure\|option_successorale\|optionSuccessorale" src --include="*.ts" --include="*.tsx"
grep -rni "separation.*corps\|séparation.*corps\|instance.*divorce\|posthume" src --include="*.ts" --include="*.tsx"
grep -rni "droit de retour\|droit_retour\|retour_legal\|retourLegal" src --include="*.ts" --include="*.tsx"
grep -rn "statut_couple" src --include="*.ts" --include="*.tsx"
grep -n "'Grand-parent'\|'Arrière petit-enfant'\|'Arrière grand-parent'\|linkTypeOptions\|liensFamiliaux\s*=\|lienFamilialOptions" src --include="*.tsx" --include="*.ts"
find . -iname "*Golden_Scenarios*"
grep -n "^#\|^##\|fente\|grand-parent\|grands-parents\|conjoint" docs/Golden_Scenarios_Transmission.md
```

Recalculs numériques faits manuellement à partir de la lecture directe des fonctions (`calculateBrancheA`, `calculateBrancheB`, `buildSouchesEnfants`, `collectFenteHeritiers`, `applyFenteSuccessorale`, boucle héritiers de `computeTransmission` dans `index.ts`) — pas d'exécution de test automatisé dédiée à ces scénarios (le cas grands-parents avec branche non saisie n'est testé nulle part avec des données représentatives d'un parcours utilisateur réel, cf. [F18](#f18) ; le cas « un seul parent sans fratrie » n'est pas non plus couvert par un test trouvé lors de cette lecture), à faire en phase de correction si les findings sont validés.
