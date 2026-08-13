# Implémentation — majoration pour 3 enfants ou plus (écart #7)

> Suite de [conception-majorations-enfants.md](conception-majorations-enfants.md), en particulier
> sa section 0 de vérification (`family_links` suffisant pour le cas courant : filiation directe et
> adoption simple/plénière). Référentiel : `docs/referentiels/retraite-base-referentiel.md` §3.8 et
> les sections par régime déjà cartographiées dans la note de conception. Écart #6 (surcote
> parentale) et écarts #8 à #15 : hors périmètre, non touchés.

---

## 1. Ce qui a été implémenté

Trois fonctions pures, sans appelant depuis un composant React — même choix d'architecture que
`surcotePourTrimestresCotises()` (écart #5) : créer et tester l'unité de calcul avant qu'elle ait un
consommateur réel, plutôt qu'un branchement prématuré sur des données de filiation qui, pour la
branche « enfant recueilli sans filiation », restent partiellement absentes (§4 ci-dessous).

### 1.1. `majorationTroisEnfants()` — [`src/lib/retraite/calcul.ts`](../../src/lib/retraite/calcul.ts)

10 % flat dès 3 enfants éligibles, sans palier ni plafond (référentiel §3.8). **Une seule fonction,
réutilisée directement** — pas de duplication — par six régimes que le référentiel décrit comme
suivant intégralement les règles du régime général sur ce point précis :

| Régime | Référence référentiel |
|---|---|
| Régime général (CNAV) | §3.8 |
| SSI | §4.3.1 : « toutes les règles des §3.4 à §3.9 s'appliquent » |
| Agents contractuels (IRCANTEC/base CNAV) | §8.1 : « l'intégralité des règles du §3 s'applique » |
| Artistes-auteurs | §9.5 : « suit les règles du régime général » |
| CNAVPL | §5.4 : « mêmes règles qu'au régime général » |
| CNBF | §6.3 : 10 %, à compter du 01/09/2023 |

Ce choix suit le précédent déjà posé dans le dépôt pour `decoteSurTrimestresPlafond25()`, réutilisée
telle quelle par CNAVPL et la fonction publique sans wrapper dédié par régime — appliqué ici de la
même façon, cohérent avec la préférence du projet pour éviter la duplication plutôt que produire une
fonction physiquement identique par nom de régime.

### 1.2. Fonction publique — [`src/lib/retraite/calculFonctionPublique.ts`](../../src/lib/retraite/calculFonctionPublique.ts)

Deux fonctions dédiées, distinctes de `majorationTroisEnfants()`, car la formule et le point
d'application diffèrent structurellement (référentiel §7.6) :

- `majorationEnfantsFonctionPublique(nombreEnfantsEligibles)` : **10 % pour 3 enfants, +5 % par
  enfant supplémentaire** — dégressive par palier, pas un taux flat.
- `pensionFonctionPubliqueAvecMajorationEnfants(pensionPorteeAuMinimumGaranti, majorationPourcent, dernierTraitementAnnuel)` :
  applique la majoration sur la pension **déjà portée au minimum garanti** (pas sur la pension
  calculée brute), puis **plafonne le total au dernier traitement** — citation du référentiel :
  « la majoration s'applique le cas échéant sur la pension portée au minimum garanti [...] le total
  pension + majoration ne peut excéder le dernier traitement de base ».

Ces deux différences (dégressivité + plafond dernier traitement) justifient une fonction séparée
plutôt qu'un paramètre optionnel de `majorationTroisEnfants()` — c'était déjà la conclusion de la
note de conception (§5, trois raisons), confirmée à l'implémentation.

### 1.3. CNAVPL/CNBF — [`src/lib/retraite/calculCNAVPL.ts`](../../src/lib/retraite/calculCNAVPL.ts) (commentaire seul, pas de nouvelle fonction)

CNAVPL et CNBF réutilisent `majorationTroisEnfants()` sans étage MICO à intercaler (référentiel
§5.5 : « pas de MICO » pour ce régime) — documenté par un commentaire de renvoi dans
`calculCNAVPL.ts`, pas une fonction dupliquée. Aucun moteur de pension de base CNBF n'existe encore
dans ce dépôt (`calculCNBF.ts` n'existe pas) : seule la fonction de majoration partagée a pu être
testée pour ce régime, cf. `calculCNAVPL.test.ts`.

---

## 2. Ordre d'application vérifié par test, régime par régime

Conforme à l'ordre déjà établi par la note de conception (§3) : **base → surcote(s) → MICO/minimum
garanti si applicable → majoration enfants**.

| Régime | Étage minimum avant majoration | Test de non-régression |
|---|---|---|
| Régime général (et régimes hérités) | MICO (`minimumContributif()`) | `calcul.test.ts`, describe `Ordre d'application, majoration enfants incluse` |
| CNAVPL / CNBF | **Aucun** — vérifié explicitement | `calculCNAVPL.test.ts` : la majoration s'applique directement sur `pensionBaseCNAVPL()`, sans appel à `minimumContributif()` nulle part dans le scénario |
| Fonction publique | Minimum garanti (`minimumGaranti()` + `pensionFonctionPubliqueFinale()`) | `calculFonctionPublique.test.ts`, describe `Ordre d'application fonction publique` |

Chaque test de non-régression suit le même schéma que celui déjà écrit pour l'écart #5 (surcote) :
un scénario où l'ordre CORRECT et l'ordre INCORRECT (majoration assise sur la pension brute, avant
l'étage minimum) produisent des résultats numériquement différents — pas un cas dégénéré où les deux
ordres coïncideraient par coïncidence.

Point de vigilance ajouté pour la fonction publique (`calculFonctionPublique.test.ts`, describe
`Plafonnement au dernier traitement`) : un scénario avec 6 enfants (majoration 25 %) où
pension + majoration dépasse le dernier traitement démontre l'écrêtement, et un second scénario sans
dépassement démontre que le plafond ne rogne rien en dessous de sa borne.

---

## 3. Tests — récapitulatif

| Fichier | Tests ajoutés | Couverture |
|---|---|---|
| `src/lib/retraite/calcul.test.ts` | 9 | Taux flat (table `it.each`, dont le cas 0/1/2 enfants → 0 %), réutilisation identique pour les régimes hérités, ordre d'application avec MICO (correct + régression), cas sans enfants éligibles |
| `src/lib/retraite/calculCNAVPL.test.ts` (nouveau) | 4 | Majoration CNAVPL sans MICO, CNBF (taux seul, pas de moteur de pension de base disponible) |
| `src/lib/retraite/calculFonctionPublique.test.ts` (nouveau) | 12 | Table dégressive (dont le cas 4 enfants → 15 %, explicitement demandé), ordre avec minimum garanti (correct + régression), plafonnement dernier traitement (avec et sans écrêtement) |

Suite complète : **517 tests passés, 6 todo (pré-existants, non liés à cette session), 0
régression** (`npx vitest run`). `npx tsc --noEmit` : aucune erreur.

---

## 4. Dette technique documentée, non codée : branche « enfant recueilli sans filiation »

Conforme à la mission : ce point est **documenté ici, pas implémenté**. Rappel du constat de
[conception-majorations-enfants.md §0.2](conception-majorations-enfants.md#02-comparaison-avec-ce-que-32-6-mda-et-33-8-majoration-3-enfants-exigent-réellement) :

Le référentiel (§3.8) distingue deux logiques de filiation pour la majoration 3 enfants :

- **Enfants avec lien de filiation** (naissance, reconnaissance, possession d'état, adoption
  plénière) — **cas courant, implémenté** par `majorationTroisEnfants()` /
  `majorationEnfantsFonctionPublique()` ci-dessus, sans aucune condition de résidence ou d'éducation.
- **Enfants recueillis ou élevés sans filiation** (adoption simple, enfant du conjoint, du
  partenaire de PACS ou du concubin) — condition cumulative d'**éducation et de charge pendant au
  moins 9 ans avant le 16e anniversaire** (présomption pour l'enfant du conjoint si le mariage
  couvre la période, preuve par tous moyens sinon). **Non implémenté.**

**Pourquoi cette branche n'est pas codée, même en fonction séparée :** les fonctions ci-dessus
prennent un `nombreEnfantsEligibles` déjà résolu par l'appelant — le calcul lui-même (10 %, ou
10 % + 5 %/enfant) ne dépend pas du type de filiation. Ce qui manque n'est donc pas une formule
supplémentaire, mais la **donnée** permettant de déterminer si un enfant recueilli sans filiation
remplit la condition des 9 ans, condition que `family_links` ne permet pas de vérifier aujourd'hui :

1. **Aucun moyen de déclarer la relation elle-même.** `lien_familial` ne propose que la valeur
   `'Enfant'` pour cette relation (pas de « Beau-enfant » ou équivalent) ; le seul indice existant,
   le motif texte `enfant_du_conjoint` dans `adoption_simple_motif`, n'est renseigné que si
   `adoption_simple_abattement_plein` est coché — un cas particulier de succession (art. 786 CGI),
   sans rapport avec la retraite, pas une déclaration générale de la situation de l'enfant.
2. **Aucune donnée de durée de charge/éducation.** `enfant_a_charge` est un booléen instantané, sans
   date de début ni de fin — impossible d'en déduire une durée de 9 ans.
3. **Aucun lien entre la période de mariage et un enfant particulier**, pour actionner la
   présomption de charge « enfant du conjoint, mariage couvrant les 9 ans » (`marital_status`
   contient `date_mariage`, mais rien ne relie cette date à un `family_links` donné).

**Conséquence pratique tant que cette dette n'est pas traitée :** `nombreEnfantsEligibles`, tel que
fourni par un futur appelant, ne doit compter que les enfants en filiation directe ou en adoption
simple/plénière — jamais un enfant recueilli sans filiation, faute de pouvoir vérifier sa condition
de 9 ans. Un futur branchement UI qui compterait naïvement tous les enregistrements
`lien_familial = 'Enfant'` sans filtrer sur `enfant_adopte` risquerait d'inclure à tort des enfants
recueillis non éligibles, ou d'exclure à tort des enfants du conjoint réellement éligibles — les deux
erreurs restent possibles tant que le point 1 ci-dessus n'est pas résolu.

**Non traité par cette session, à dessein** (hors mission, cf. discipline de session) : le choix de
modèle de données pour combler ces trois manques (nouveau champ enum sur `family_links`, nouvelle
table dédiée à la garde/charge, ou autre) — c'est une décision produit qui dépasse le périmètre de
l'implémentation du cas courant demandée ici, exactement comme signalé au §5.1/§6.6 de la note de
conception pour la surcote parentale (écart #6, également hors périmètre de cette session).

---

## 5. Ce qui reste hors périmètre (rappel, non traité ici)

- **Écart #6 (surcote parentale)** : nécessite une décision produit préalable sur le sous-système de
  répartition MDA (§2.6) — non prise à ce stade, non codée.
- **Branchement UI** (composant consommateur des fonctions ci-dessus) : aucun composant React ne les
  appelle pour l'instant, par choix — même position que `surcotePourTrimestresCotises()` avant cette
  session. Un futur branchement devra résoudre le filtrage `enfant_adopte` décrit au §4 avant de
  compter `nombreEnfantsEligibles` depuis `family_links`.
- **Cumul avec la surcote parentale, CNAVPL/CNBF** (incertitude déjà signalée à la note de
  conception, §6.1) : non résolu, sans lien avec cette implémentation qui porte sur la majoration
  enfants seule, indépendante de la question du cumul entre les deux surcotes.
- **Écarts #8 à #15** : non touchés.
