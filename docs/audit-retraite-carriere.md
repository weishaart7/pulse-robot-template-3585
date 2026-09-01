# Audit externe — Retraite / sous-section « Carrière »

**Périmètre** : logique de calcul de l'onglet Carrière (`RetraiteSection.tsx` → `Carriere.tsx`),
c'est-à-dire la chaîne complète `calculSAM.ts` → `calculTrimestres.ts` → `calcul.ts` →
`calculFonctionPublique.ts` / `calculCNAVPL.ts` → `pensionConsolidee.ts`, plus les sous-cartes
`CarriereFonctionPublique.tsx` / `CarriereCNAVPL.tsx`.

**Méthode** : lecture ligne à ligne du moteur, puis vérification de chaque règle et de chaque
barème contre des sources externes actuelles (septembre 2026) et contre le référentiel interne
`docs/retraite-base-referentiel.md`. Les écarts chiffrables ont été mesurés en exécutant le code
réel sur des carrières synthétiques.

**Baseline** : `npx vitest run src/lib/retraite` → 266 tests, 10 fichiers, tous passants. Aucun des
défauts ci-dessous n'est couvert par un test — ils passent tous « au vert ».

---

## 1. Synthèse

| # | Constat | Gravité | Sens de l'erreur |
|---|---|---|---|
| 1 | SAM : plafonnement PASS appliqué **après** revalorisation au lieu d'avant | 🔴 Critique | Sous-évaluation, jusqu'à −27 % du SAM |
| 2 | Décote régime général plafonnée à −20 % au lieu de −25 % (20 trimestres) | 🔴 Critique | Sur- **ou** sous-évaluation selon le profil |
| 3 | Surcote classique calculée sur la mauvaise période de référence | 🔴 Critique | Sur-évaluation (surcote accordée à tort) et sous-évaluation (surcote réelle ignorée) |
| 4 | Fonction publique : décote-âge jamais appliquée hors catégorie active | 🟠 Élevée | Sous-évaluation, jusqu'à −10 pts de décote |
| 5 | Surcote structurellement nulle pour la FP et la CNAVPL | 🟠 Élevée | Sous-évaluation |
| 6 | Condition de durée de la surcote RG ignorant les autres régimes | 🟠 Élevée | Sous-évaluation (polypensionnés) |
| 7 | Valeur de référence du minimum garanti (MIGA) périmée | 🟠 Élevée | Sous-évaluation de 8,6 % |
| 8 | PASS 2026 absent de la table | 🟠 Élevée | Sur-évaluation (année 2026 non plafonnée) |
| 9 | Majoration familiale Agirc-Arrco non calculée | 🟡 Moyenne | Sous-évaluation |
| 10 | Plafond d'écrêtement MICO non revalorisé au 1er juin 2026 | 🟡 Moyenne | Sous-évaluation marginale |
| 11 | Arrondi du décompte de trimestres d'âge (pas de `ceil`) | 🟡 Faible | Sur-évaluation marginale |
| 12 | CNAVPL : règle du plus petit des deux comptages non appliquée | 🟡 Faible | Sous-évaluation |
| 13 | Barème LFSS 2026 appliqué sans borne de fin | 🔵 Vigilance | À surveiller |

Points vérifiés et **conformes** : § 3 en fin de document (l'essentiel du moteur est juste — les
barèmes 2026, l'ordre d'application des majorations, la structure FP/CNAVPL et la logique MICO à
deux paliers sont exacts).

---

## 2. Constats détaillés

### 🔴 #1 — SAM : plafonnement et revalorisation dans le mauvais ordre

**Fichier** : [`src/lib/retraite/calculSAM.ts:330-336`](src/lib/retraite/calculSAM.ts)

```ts
// Revalorisation (coefficient CNAV) PUIS plafonnement (PASS) — l'ordre
// compte : plafonner avant revalorisation minorerait à tort des revenus
// qui, une fois revalorisés, auraient dépassé le plafond.
const revenuRevalorise = revenuBrut * coefficient;
const plafond = PASS_PAR_ANNEE[annee];
const revenuPlafonne = plafond !== undefined ? Math.min(revenuRevalorise, plafond) : revenuRevalorise;
```

**Règle réelle** : le salaire de chaque année est retenu **dans la limite du PASS de l'année
travaillée**, *puis* revalorisé par le coefficient CNAV. Le commentaire du code raisonne à
l'envers.

Le référentiel interne le dit déjà explicitement (§ 3.4.2 : « Chaque salaire annuel est retenu dans
la limite du **PASS de l'année travaillée** […] Revalorisation par coefficients annuels ») et le
§ 3.6 en tire même la conséquence : « les 25 meilleures années sont plafonnées par le PASS de
chaque année concernée, et la revalorisation des salaires portés au compte suit les prix tandis que
le PASS suit les salaires, qui progressent plus vite ». **Le code contredit son propre
référentiel.**

**Conséquence mécanique** : comparer un revenu exprimé en euros 2026 (revalorisé) à un plafond
exprimé en euros de l'époque (nominal) écrase toutes les années anciennes. Pour 1990, coefficient
1,704 et PASS nominal 19 976,92 € : toute année 1990 où le client a gagné plus de **58,6 % du
PASS** est tronquée au PASS nominal.

**Mesure sur le code réel** (carrière 1985-2009, revenu constant à 90 % du PASS de chaque année,
donc jamais légitimement plafonnable, génération 1960) :

| | SAM | Pension de base annuelle | Écart |
|---|---|---|---|
| Code actuel | 25 034 € | 12 517 € | |
| Ordre légal | 34 106 € | 17 053 € | **−378 €/mois**, soit −26,6 % |

Sur une carrière longue et continue (1990-2024), l'écart tombe à −3,1 % : le mécanisme éjecte
simplement les années anciennes du top-25 au profit des récentes. Le défaut est donc **maximal
pour les carrières courtes, les carrières interrompues et les profils dont les meilleures années
sont anciennes** — exactement les dossiers où le conseil compte.

**Correction** : inverser les deux opérations (`Math.min(revenuBrut, plafond)` puis `× coefficient`),
et corriger le commentaire. `revenuRevalorise` doit alors devenir le revenu plafonné revalorisé.
Ajouter un test verrouillant l'ordre.

---

### 🔴 #2 — Décote régime général plafonnée à −20 % au lieu de −25 %

**Fichier** : [`src/lib/retraite/calcul.ts:507-515`](src/lib/retraite/calcul.ts) et
[`calcul.ts:547-554`](src/lib/retraite/calcul.ts) (`decoteSurAge`)

```ts
if (difference < 0) {
  return Math.max(difference * 1.25, -20);   // ← 16 trimestres
}
```

**Règle réelle** (art. R. 351-27 CSS) : le nombre de trimestres de décote **ne peut excéder 20**,
à 1,25 % chacun, soit un plancher de taux à **37,5 %** — c'est-à-dire un plafond de décote de
**−25 %**, pas −20 %. Le référentiel interne §2.2.2 donne la même valeur (« 20 trimestres →
37,500 % » pour la génération 1961).

Le paradoxe : `decoteSurTrimestresPlafond25()` existe déjà dans le même fichier avec la bonne
valeur, et n'est utilisée que par la fonction publique et la CNAVPL. Le régime général — le
régime principal de l'écran — est le seul à utiliser la version fausse.

**Direction de l'erreur, dans les deux sens** :

- Client partant avant 67 ans avec 17 à 20 trimestres manquants : décote réelle −21,25 % à −25 %,
  le code affiche −20 % → **pension sur-évaluée** de 1,6 % à 6,7 %.
- Client de génération 1969+ partant à 64 ans : la règle légale retient le plus petit des deux
  comptages, soit au maximum 12 trimestres d'âge → décote réelle plafonnée à −15 %. Le code
  plafonne les deux branches à −20 % et `decoteApplicable()` retourne −20 % → **pension
  sous-évaluée**.

**Correction** : porter les deux plafonds à −25 % (`decoteSurTrimestres` et `decoteSurAge`).
Comme `decoteApplicable()` retient déjà le plus favorable des deux comptages, ce seul changement
reproduit exactement `n = min(trim_manquants_durée, trim_manquants_âge, 20)`, y compris le tableau
des taux minimums par génération du référentiel §2.2.2 — sans table supplémentaire à maintenir.
Le plus simple est de supprimer `decoteSurTrimestres()` et de basculer le régime général sur
`decoteSurTrimestresPlafond25()`.

---

### 🔴 #3 — Surcote classique : mauvaise période de référence

**Fichier** : [`src/lib/retraite/pensionConsolidee.ts:327-341`](src/lib/retraite/pensionConsolidee.ts)

```ts
const anneeReferenceSurcote = /* année de l'anniversaire de l'âge légal */ - 1;
const trimestresCotisesAnneeReference = /* trimestres cotisés de CETTE seule année */;
const surcoteClassiquePct = surcotePourTrimestresCotises(trimestresCotisesAnneeReference, ...);
```

La surcote **classique** et la surcote **parentale** sont alimentées par le même compteur : les
trimestres cotisés de l'**année civile précédant l'âge légal**. C'est la période de référence de la
surcote *parentale* (référentiel §2.3.2). Ce n'est pas celle de la surcote classique.

**Règle réelle** (art. L. 351-1-2 CSS, référentiel §2.3.1) : la période de référence commence au
1er jour du trimestre civil suivant l'âge légal (ou du mois suivant l'acquisition du dernier
trimestre requis si elle est postérieure) et se termine au dernier jour du trimestre civil
précédant la date d'effet. Tous les trimestres cotisés de cette période comptent, 4 par an
maximum, **sans plafond global**.

**Deux erreurs de signe opposé, toutes deux visibles à l'écran** :

1. **Surcote accordée à tort.** Le référentiel est explicite : « un assuré qui liquide dès l'âge
   légal avec un excédent de trimestres n'obtient **aucune** surcote, faute d'avoir cotisé après
   l'âge légal ». Le code, lui, va chercher les trimestres de l'année *précédant* l'âge légal —
   presque toujours 4 pour un actif — et accorde donc jusqu'à **+5 %** à un client qui n'y a pas
   droit.
2. **Surcote réelle ignorée.** Un client qui a travaillé trois ans au-delà de l'âge légal a droit à
   12 trimestres, soit +15 %. Le code lui en accorde au maximum 4, soit +5 %.

La dette documentée dans `docs/retraite.md` (« chronologie infra-annuelle de la surcote non
modélisée ») sous-estime le problème : ce n'est pas un arrondi de bornes à l'intérieur d'une année,
c'est une fenêtre de comptage située du mauvais côté de l'âge légal.

**Correction** : compter les trimestres cotisés de `parAnnee` situés entre l'année de l'âge légal
(exclue ou pondérée) et l'année de la date d'effet, plafonnés à 4/an ; conserver le compteur
« année précédente » pour la seule surcote parentale. Dans l'onglet Carrière, où la date d'effet
est le proxy « aujourd'hui », cela revient à ne compter que les trimestres réellement postérieurs
à l'âge légal.

---

### 🟠 #4 — Fonction publique : décote-âge jamais appliquée hors catégorie active

**Fichier** : [`src/lib/retraite/pensionConsolidee.ts:156-166`](src/lib/retraite/pensionConsolidee.ts)

```ts
const decoteAgeUtilisable =
  donnees.departAnticipeCategorieActive &&      // ← porte fermée pour les sédentaires
  donnees.ageDepartAnticipe !== undefined && ...
const decote = decoteAgeUtilisable ? decoteApplicable(decoteTrimestres, decoteSurAgeFonctionPublique(...)) : decoteTrimestres;
```

La règle du plus petit des deux comptages (art. L. 14 I CPCMR, référentiel §7.3 : « Même mécanique
du plus petit des deux comptages ») s'applique à **tous** les fonctionnaires, pas seulement à ceux
en départ anticipé catégorie active. Pour un agent sédentaire partant à 64 ans avec 20 trimestres
manquants, la règle retient les 12 trimestres d'âge (jusqu'à 67 ans) → −15 % ; le code applique
−25 %. **Pension sous-évaluée de 13 %.**

**Correction** : appliquer `decoteSurAgeFonctionPublique()` dès qu'un âge de départ est
disponible, avec `ageAnnulationDecote` par défaut à 67 ans (valeur déjà par défaut dans la
fonction) et non uniquement en catégorie active.

---

### 🟠 #5 — Surcote structurellement nulle pour la fonction publique et la CNAVPL

**Fichiers** : [`pensionConsolidee.ts:185`](src/lib/retraite/pensionConsolidee.ts),
[`pensionConsolidee.ts:249`](src/lib/retraite/pensionConsolidee.ts),
[`CarriereCNAVPL.tsx:118`](src/components/retraite/CarriereCNAVPL.tsx)

```ts
const trimestresCotisesAnneeReference = 0;
```

Constante en dur dans les deux branches. Toute la machinerie en aval (`surcotePourTrimestresCotises`,
`surcoteParentale`, `surcoteTotale`, la règle de non-cumul FP) est donc du code mort : la surcote
FP et CNAVPL vaut toujours 0.

C'est cohérent avec l'absence de détail de carrière pour ces régimes (les trimestres y sont saisis
en total), mais le résultat est une **sous-évaluation silencieuse** : un fonctionnaire ayant
prolongé son activité au-delà de l'âge légal avec la durée requise a droit à 1,25 %/trimestre
(art. L. 14 III CPCMR) et n'en voit rien. Deux défauts se compensent partiellement, puisque la
surcote FP est par ailleurs plafonnée à 20 trimestres alors que `surcotePourTrimestresCotises()`
est « sans plafond » — plafond qui ne s'exprime jamais faute d'entrée non nulle.

**Correction minimale** : ajouter un champ déclaratif « trimestres cotisés au-delà de l'âge légal »
sur chaque sous-carte (même logique que `au_moins_un_trimestre_majoration_enfant`, déjà
déclaratif), ou à défaut afficher explicitement « surcote non calculée pour ce régime » plutôt
qu'un 0 muet.

---

### 🟠 #6 — Condition de durée requise de la surcote RG : autres régimes oubliés

**Fichier** : [`src/lib/retraite/pensionConsolidee.ts:327`](src/lib/retraite/pensionConsolidee.ts)

```ts
const dureeRequiseAtteinte = trimestresValides >= trimestresRequis;   // régime général seul
```

alors que trois lignes plus haut la décote est calculée, correctement, sur
`trimestresValides + trimAutresRegimes`, et que les branches FP et CNAVPL ajoutent bien
`trimestresAutresRegimes` à leur propre test.

La condition légale (référentiel §2.3.1 condition n° 1) est « réunir la durée requise **tous
régimes confondus** ». Un polypensionné à 100 trimestres régime général + 80 trimestres fonction
publique (180 > 172) se voit refuser toute surcote régime général. Incohérence interne au même
fichier autant qu'écart à la règle.

**Correction** : `trimestresValides + trimAutresRegimes >= trimestresRequis`.

---

### 🟠 #7 — Minimum garanti fonction publique : valeur de référence périmée

**Fichier** : [`src/lib/retraite/calculFonctionPublique.ts:128-129`](src/lib/retraite/calculFonctionPublique.ts)

```ts
export const VALEUR_REFERENCE_MIGA_MENSUELLE_2025 = 1248.33;
```

Le commentaire indique que la valeur 2026 « environ 1 366,35 € » n'a pas été retenue parce que le
référentiel la qualifiait de « à vérifier auprès du SRE ». **Vérifiée** : le Service des Retraites
de l'État publie pour 2026 une valeur de référence de **16 396,19 € bruts annuels**, soit
1 366,35 €/mois. Le code sous-évalue le minimum garanti de **8,6 %**, soit jusqu'à 118 €/mois pour
un agent à 40 ans de services.

Le barème par paliers de `minimumGaranti()` (57,5 % à 15 ans, +2,5 pt/an de 15 à 30, +0,5 pt/an de
30 à 40, 100 % au-delà) est en revanche **exactement conforme** à la page officielle du SRE.

**Correction** : remplacer par `VALEUR_REFERENCE_MIGA_ANNUELLE_2026 = 16396.19` (source opposable :
SRE, page « Le minimum garanti »), et retirer l'avertissement à l'écran devenu sans objet.

---

### 🟠 #8 — PASS 2026 absent de la table

**Fichier** : [`src/lib/retraite/calculSAM.ts:121`](src/lib/retraite/calculSAM.ts) — la table
`PASS_PAR_ANNEE` s'arrête à `2025: 47100`.

Le PASS 2026 est de **48 060 €**. La valeur est d'ailleurs déjà présente ailleurs dans le dépôt,
en dur et sans nom : `SEUIL_REVENU_HAUT = 48060` dans le barème de rachat de `calcul.ts` (et
`SEUIL_REVENU_BAS = 36045` = 75 % du PASS 2026).

Conséquence : `revenuPlafonne = revenuRevalorise` sans plafond pour toute année 2026 issue d'un
RIS — **sur-évaluation** pour les hauts revenus, exactement dans le sens inverse du défaut #1.
Effet aggravé si #1 est corrigé sans corriger #8.

**Correction** : ajouter `2026: 48060`. Vérifier au passage que la table sera prolongée chaque
janvier (aucun mécanisme d'alerte de péremption n'existe — cf. dette déjà listée dans
`docs/retraite.md`).

---

### 🟡 #9 — Majoration familiale Agirc-Arrco non calculée

**Fichier** : [`src/lib/retraite/pensionConsolidee.ts:376-380`](src/lib/retraite/pensionConsolidee.ts)

La majoration pour 3 enfants n'est appliquée qu'à la pension de base
(`pensionBaseAjustee = pensionApresSurcote × (1 + maj/100)`). Les régimes complémentaires par
points sont ajoutés ensuite, sans majoration.

Or l'Agirc-Arrco sert sa propre majoration familiale de 10 % dès 3 enfants nés ou élevés, sur les
droits non plafonnés, dans la limite de **2 367,48 €/an en 2026**. Sous-évaluation pouvant
atteindre ce montant pour les carrières de cadres.

**Correction** : appliquer 10 % à la part Agirc-Arrco de `regimesPoints` avec écrêtement au
plafond annuel, en réutilisant `nombreEnfantsEligiblesMajorationTroisEnfants()`. Attention : le
critère Agirc-Arrco (« nés ou élevés ») est plus large que celui du régime général — à trancher
côté produit avant d'implémenter.

---

### 🟡 #10 — Plafond d'écrêtement MICO non revalorisé au 1er juin 2026

**Fichier** : [`src/lib/retraite/calcul.ts:635`](src/lib/retraite/calcul.ts) —
`PLAFOND_GLOBAL_PENSIONS_2026 = 16930.68` (= 1 410,89 €/mois).

Valeur correcte au 1er janvier 2026, mais le plafond a été porté à **1 444,89 €/mois au 1er juin
2026** (indexation SMIC). Le référentiel §3.5.5 précise que le plafond retenu est celui en vigueur
**à la date d'ouverture du droit au MICO** — donc 1 444,89 € pour toute liquidation postérieure au
1er juin 2026, c'est-à-dire tous les dossiers simulés aujourd'hui avec le proxy « date d'effet =
aujourd'hui ». Écrêtement légèrement trop sévère.

**Correction** : porter la constante à `17338.68`, ou mieux, la faire dépendre de la date d'effet
(la même mécanique que `jeuBaremeApplicable()`).

---

### 🟡 #11 — Décompte des trimestres d'âge : arrondi manquant

**Fichier** : [`src/lib/retraite/calcul.ts:551`](src/lib/retraite/calcul.ts)

```ts
const ecartTrimestres = (ageDepart - ageAnnulationDecote) * 4;   // valeur fractionnaire
```

Le référentiel §2.2.1 et l'art. R. 351-27 CSS imposent un **arrondi au trimestre supérieur** :
`n = ceil(mois_jusqu_au_taux_plein / 3)`. À 64 ans et 7 mois, le code calcule 9,33 trimestres
(−11,67 %) là où la règle en retient 10 (−12,5 %). Écart faible, systématiquement favorable au
client. Même remarque pour `decoteSurAgeFonctionPublique()`.

---

### 🟡 #12 — CNAVPL : règle du plus petit des deux comptages non appliquée

**Fichiers** : [`pensionConsolidee.ts:236-240`](src/lib/retraite/pensionConsolidee.ts),
[`CarriereCNAVPL.tsx:97-101`](src/components/retraite/CarriereCNAVPL.tsx)

La décote CNAVPL n'est calculée que sur les trimestres manquants, jamais sur l'écart d'âge, alors
que le référentiel §5.3 renvoie explicitement à « la règle du plus petit des deux comptages du
§2.2 » (taux plein acquis à 67 ans quel que soit le nombre de trimestres, art. L. 643-4).
Sous-évaluation pour un libéral proche de 67 ans avec une carrière incomplète.

Point **positif** à conserver : le code n'applique aucune proratisation à la CNAVPL, conformément
à l'avertissement du référentiel §5.3 (« Un moteur qui appliquerait un prorata à la CNAVPL
doublerait la pénalisation »).

---

### 🔵 #13 — Barème LFSS 2026 appliqué sans borne de fin

**Fichier** : [`src/lib/retraite/calcul.ts:84-92`](src/lib/retraite/calcul.ts) —
`jeuBaremeApplicable()` retourne `lfss_2026` pour toute date d'effet ≥ 1er septembre 2026, sans
limite supérieure.

La communication gouvernementale et la plupart des commentateurs présentent la suspension de
l'art. 105 de la loi 2025-1403 comme valant « jusqu'au 1er janvier 2028 ». Mais la lecture du
texte voté est plus nuancée : la nouvelle rédaction des articles ne contient **ni date
d'expiration, ni clause de revoyure** — ce qui s'appliquera après 2028 dépendra d'une loi
ultérieure.

Le choix du code (appliquer le barème suspendu sans borne) est donc **défendable et fidèle au
texte en vigueur**, contrairement à ce qu'une lecture rapide du calendrier laisserait croire. Ce
n'est pas un défaut, mais une hypothèse à assumer explicitement : pour un client né en 1966
simulant un départ en 2029, l'outil affiche 63 ans 3 mois (LFSS 2026) et non 63 ans 6 mois
(calendrier 2023). Recommandation : afficher un avertissement pour toute date d'effet
postérieure au 31/12/2027, plutôt que de figer une hypothèse législative dans un calcul muet.

---

## 3. Points vérifiés et conformes

Vérifiés contre sources externes de septembre 2026 — aucune correction nécessaire :

| Paramètre | Valeur dans le code | Vérification |
|---|---|---|
| Barème LFSS 2026, générations 1964-1969 | 1964 : 62a9m/170 · 1965-T1 : 62a9m/170 · 1965-T2+ : 63a/171 · 1966 : 63a3m/172 · 1967 : 63a6m/172 · 1968 : 63a9m/172 · 1969+ : 64a/172 | ✅ conforme, y compris le découpage du 1er avril 1965 |
| Barème calendrier 2023 | 1964 : 63a/171 … 1968 : 64a/172 | ✅ conforme |
| MICO non majoré 2026 | 756,29 €/mois (9 075,48 €/an) | ✅ |
| MICO majoré 2026 | 903,93 €/mois (10 847,16 €/an) | ✅ |
| Seuil palier 2 MICO | 120 trimestres cotisés | ✅ |
| Seuil de validation d'un trimestre 2026 | 1 803 € (150 × SMIC 12,02 €) | ✅ — insensible à la revalorisation SMIC du 1er juin 2026, qui ne concerne que le SMIC au 1er janvier |
| Valeur du point CNAVPL 2026 | 0,6599 € | ✅ |
| Valeur de service du point RAFP 2026 | 0,05671 € | ✅ |
| Taux plein régime général / fonction publique | 50 % / 75 % | ✅ |
| Décote FP par année d'ouverture des droits | 0,75 % → 1,25 % (2011 → 2015+) | ✅ conforme au référentiel §7.3 |
| Barème par paliers du minimum garanti | 57,5 % / +2,5 pt / +0,5 pt / 100 % | ✅ conforme à la page officielle du SRE (seule la valeur de référence est périmée, cf. #7) |
| Ordre d'application des majorations | P0 → surcote sur P0 → MICO comparé hors surcote → majoration enfants après | ✅ conforme au référentiel §3.7 (circ. CNAV 2018-4 et 2022-26) |
| Coefficient de solidarité Agirc-Arrco (malus 10 %) | non modélisé | ✅ correct : supprimé par l'ANI du 5 octobre 2023 |
| Durée SAM par génération | 25 ans à partir de 1948 | ✅ |
| Chômage/maladie → trimestres assimilés | 50 j / 60 j, plafond 4/an combiné, priorité aux cotisés | ✅ conforme art. R. 351-12 CSS |
| Plafonds du chômage non indemnisé | 547 j & 6 trimestres (1re période), 365 j (ultérieures, si adjacentes) | ✅ conforme art. R. 351-12 CSS |
| PASS historiques 2018-2025 | 39 732 → 47 100 € | ✅ (échantillon vérifié) |
| Abattements micro-entrepreneur | 71 % / 50 % / 34 % | ✅ art. L. 613-7 et D. 613-4 CSS |
| CNAVPL sans proratisation | pas de prorata durée | ✅ conforme à l'avertissement du référentiel §5.3 |

---

## 4. Ordre de correction recommandé

1. **#1 (SAM)** — c'est le seul défaut qui déforme *toutes* les pensions régime général affichées,
   dans un sens systématiquement défavorable, et il est corrigible en deux lignes. À faire avant
   toute autre chose, avec un test verrouillant l'ordre.
2. **#8 (PASS 2026)** — à faire dans le même commit que #1 : corriger #1 sans #8 rend l'année 2026
   anormalement favorable par contraste.
3. **#2 (plafond de décote)** — bascule du régime général sur `decoteSurTrimestresPlafond25()`, avec
   suppression de `decoteSurTrimestres()` pour éviter que les deux variantes ne coexistent.
4. **#7, #10 (barèmes périmés)** — mise à jour de constantes, sans risque de régression.
5. **#6, #4 (incohérences internes)** — une ligne chacune, testables immédiatement.
6. **#3 (surcote)** — le plus structurant : nécessite de trancher la période de référence dans un
   moteur qui ne connaît que des années civiles. À traiter comme un chantier à part entière, avec
   validation des règles avant codage (méthode CLAUDE.md).
7. **#5, #9, #11, #12, #13** — arbitrages produit ou améliorations marginales.

Aucune de ces corrections ne touche au schéma Supabase, sauf #5 (un champ déclaratif par régime)
et #9 si la majoration Agirc-Arrco doit distinguer « enfants élevés » des enfants avec filiation.

## 5. Suites documentaires

`docs/retraite.md` § 3 déclare « Aucun bloquant ouvert au 2026-08-27 ». Les constats #1, #2 et #3
sont bloquants au sens de la grille de ce document (« peut fausser un calcul montré au client ») et
devront y être reportés. Deux dettes existantes sont par ailleurs à requalifier :

- « chronologie infra-annuelle de la surcote » (classée 🟠 cas limite) → sous-estime la réalité,
  cf. #3 : c'est la fenêtre de comptage elle-même qui est mal placée, pas son arrondi.
- « valeur de référence MIGA 2026 non confirmée » → **confirmée** par le SRE, cf. #7.

---

## Sources

- [CFDT Retraités — Du salaire annuel moyen au calcul de la pension de base](https://www.xn--cfdt-retraits-mhb.fr/21-Du-salaire-annuel-moyen-au-calcul-de-la-pension-de-base)
- [CFDT Retraités — Le taux de liquidation, décote, surcote](https://www.xn--cfdt-retraits-mhb.fr/20-Taux-liquidation-decote-surcote)
- [CFDT Retraités — Suspension de la réforme des retraites et nouvelles mesures](https://www.xn--cfdt-retraits-mhb.fr/Suspension-reforme-des-retraites-et-nouvelles-mesures-reformant-retraites)
- [Service des Retraites de l'État — Le minimum garanti](https://retraitesdeletat.gouv.fr/actif/le-calcul-de-ma-retraite/le-minimum-garanti)
- [Previssima — Suspension de la réforme des retraites : le guide](https://www.previssima.fr/question-pratique/suspension-de-la-reforme-des-retraites-le-guide-pour-tout-comprendre-selon-votre-situation.html)
- [CNRACL — Réforme des retraites : suspension confirmée](https://www.cnracl.retraites.fr/actif/actualites/reforme-des-retraites-suspension-confirmee-par-lassemblee-nationale)
- [MoneyVox — Nouveau minimum contributif au 1er janvier 2026](https://www.moneyvox.fr/retraite/actualites/106820/voici-le-nouveau-minimum-officiel-au-1er-janvier-si-vous-partez-a-taux-plein-en-2026)
- [Aqui — Minimum contributif 2026 : montants, conditions et plafond](https://aqui.fr/minimum-contributif-retraite-2026/)
- [info.gouv.fr — Le SMIC revalorisé au 1er janvier 2026](https://www.info.gouv.fr/actualite/le-smic-revalorise-au-1er-janvier-2026)
- [RAFP — Le RAFP revalorise la valeur du point pour 2026](https://www.rafp.fr/actualites/rafp-revalorise-valeur-du-point-pour-2026)
- [Altis Conseil — Retraite de base des professions libérales : CNAVPL 2026](https://altis-conseil.fr/retraite-base-professions-liberales-cnavpl/)
- [Cabinet CCAC — Agirc-Arrco : nouveaux montants 2026](https://www.expert-ccac.fr/paie-charges-sociales/agirc-arrco-montants-2026)
- [Altis Conseil — Salaire moyen retraite 2026 : calcul des 25 meilleures années](https://altis-conseil.fr/salaire-moyen-retraite-calcul-25-meilleures-annees/)
- Référentiel interne : `docs/retraite-base-referentiel.md` (§2.2, §2.3, §3.4.2, §3.5.5, §3.7, §5.3, §7.3, §7.5)
