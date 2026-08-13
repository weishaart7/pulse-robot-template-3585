# Branchement de la surcote sur l'onglet Optimisation (Trimestres.tsx)

> Suite de `docs/audit/branchement-majorations-pension-finale.md` §5, qui signalait
> `Trimestres.tsx` comme non touché : la branche fautive de `decoteSurTrimestres()` y était
> toujours consommée pour l'affichage « Décote / surcote applicable ». Référentiel :
> `docs/referentiels/retraite-base-referentiel.md` §2.3 (surcote), §2.3.2 (surcote
> parentale), §12.3 (ordre d'application).

---

## 1. Diagnostic — avant tout code

### 1.1. Ce que `Trimestres.tsx` assemble aujourd'hui

Contrairement à `Carriere.tsx` (trois assembleurs distincts par régime, avec étages MICO/MIGA
et majoration enfants), `Trimestres.tsx` n'a qu'**une seule fonction d'assemblage**,
`simulerPourDateEffet(dateEffet)` : elle calcule décote/surcote, taux de proratisation,
pension de base (régime général uniquement — `pensionBase()`) et pension totale (+ pensions
complémentaires à points, constantes). **Aucun MICO/MIGA, aucune majoration enfants** —
ni affichés ni calculés, à aucun endroit de l'écran.

Le tableau comparatif (62-70 ans) appelle `simulerPourAge(age)`, un simple wrapper de
`simulerPourDateEffet()`. Le résumé du haut de l'écran (carte « Simulation de départ ») et
chaque ligne du tableau passent donc par le **même point de calcul unique** — confirmant qu'il
n'y avait qu'un seul endroit à corriger, pas un par ligne.

### 1.2. Une troisième consommatrice de la branche fautive, non listée par le rapport précédent

La section « Rachat de trimestres » (simulation de coût/rentabilité d'un versement pour la
retraite) calcule `decoteAvecRachat` indépendamment, avec le même
`decoteSurTrimestres()`/`decoteApplicable()` symétrique, pour produire `pensionBaseAvecRachat`
(« Nouvelle pension de base » et « Gain de pension »). Cette section n'était mentionnée ni par
la mission ni par `branchement-majorations-pension-finale.md` §5 — trouvée pendant le
diagnostic (étape 4 de la mission), traitée dans cette session (§2.3 ci-dessous).

### 1.3. Disponibilité des données requises par `surcoteTotale()`

- **Case à cocher surcote parentale** (`au_moins_un_trimestre_majoration_enfant`) : déjà
  chargée — c'est un champ de `retraiteData` (`useRetraiteData()`, déjà utilisé dans
  `Trimestres.tsx`), simplement jamais lu dans une variable locale.
- **`trimestresCotisesAnneeReference`** : nécessite le détail de carrière par année (import
  RIS), chargé dans `Carriere.tsx` via `useCarriereDetail()` — **absent de `Trimestres.tsx`
  avant cette session**. Il ne s'agit pas d'un élargissement de périmètre optionnel : sans
  cette donnée, la surcote resterait figée à 0 sur cet écran alors qu'elle serait non-nulle
  sur `Carriere.tsx` pour le même client — ce qui aurait directement contredit l'exigence de
  parité de l'étape 5 de la mission. `useCarriereDetail()` a donc été ajouté.
- **`family_links`** : **non nécessaire.** Elle n'alimente que `majorationTroisEnfants()`
  (majoration enfants), pas `surcoteTotale()` — hors périmètre décidé au §1.4 ci-dessous.

### 1.4. Décision : ne pas ajouter MICO ni majoration enfants au tableau

`Trimestres.tsx` n'affiche aujourd'hui aucun détail multi-lignes (juste un pourcentage
décote/surcote unique et deux montants de pension) — c'est un simulateur d'âge de départ
volontairement plus simple qu'un écran de détail de pension, pas une version incomplète de
`Carriere.tsx`. L'étape 5 de la mission ne teste que la **parité de surcote** entre les deux
écrans, pas la parité de pension totale. Décision retenue : seule la surcote est branchée ici ;
MICO et majoration enfants restent hors périmètre de cet écran, comme documenté par cette
section plutôt que silencieusement absorbés ou oubliés.

### 1.5. Conclusion du diagnostic

1. Un seul point de calcul (`simulerPourDateEffet`) alimente à la fois le résumé et chaque
   ligne du tableau comparatif — une seule correction suffit pour les deux.
2. Une troisième consommatrice de la branche fautive (rachat de trimestres) existe, non
   signalée précédemment — traitée dans cette session (§2.3).
3. Deux données sur trois nécessaires à `surcoteTotale()` étaient déjà disponibles ; la
   troisième (`trimestresCotisesAnneeReference`, via `detailCarriere`) a nécessité l'ajout de
   `useCarriereDetail()` — plomberie requise par l'exigence de parité de la mission, pas un
   élargissement de périmètre.
4. MICO et majoration enfants restent volontairement hors périmètre de cet écran.

Aucune modification de code n'a eu lieu avant la rédaction de cette section.

---

## 2. Implémentation

### 2.1. Écrêtage de la branche fautive

Dans `simulerPourDateEffet()`, `decote` est désormais `Math.min(decoteApplicable(...), 0)` —
ne représente plus que la décote (toujours ≤ 0), même correctif que pour les trois assembleurs
de `Carriere.tsx`.

### 2.2. Branchement de `surcoteTotale()`

Régime général uniquement (`Trimestres.tsx` n'a pas de fonction publique ni de CNAVPL) : cumul
**additif** — la seule branche pertinente de `surcoteTotale(..., cumulable=true)`, réutilisée
telle quelle. `trimestresCotisesAnneeReference` déterminé par date d'effet
(`ageLegalPourGeneration()` + `dateAnniversaireLegal()` + `parAnnee` de
`trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere)`), recalculé pour chaque âge simulé
puisque `dateEffet` varie ligne par ligne dans ce composant — à la différence de
`Carriere.tsx`, qui fige un proxy « aujourd'hui ». La surcote est assise sur `pensionBaseBrute`
(pension avant décote, `pensionBase(sam, taux, 0)`) et ajoutée après décote — aucun MICO à
comparer ici (§1.4).

### 2.3. Section rachat de trimestres

Même écrêtage de la branche fautive appliqué à `decoteAvecRachat`. La surcote n'est **pas**
recalculée pour l'hypothèse « avec rachat » : le rachat ne porte que sur des trimestres
manquants (réduit la décote), il ne crée pas de nouveaux trimestres cotisés dans l'année de
référence de la surcote. Le montant de surcote de la sélection sans rachat
(`resultatSelection.surcoteTotalePct`) est donc réutilisé tel quel plutôt que remodélisé — sans
ce choix, un client déjà en surcote sans rachat aurait vu un « Gain de pension » artificiellement
négatif (comparaison décote+surcote vs décote seule). Simplification assumée et documentée,
cohérente avec la nature de « sandbox éphémère » de cette section (déjà qualifiée ainsi dans le
code).

### 2.4. Affichage

`decote` (≤ 0) et `surcoteTotalePct` (≥ 0) sont désormais deux champs séparés du résultat de
`simulerPourDateEffet()`. L'indicateur unique « Décote / surcote applicable » (résumé du haut et
colonne du tableau) affiche leur somme — même convention que `Carriere.tsx` (`decoteSurcote +
surcoteTotalePct`).

---

## 3. Vérification — autres consommateurs de la branche fautive

Recherche de tout autre usage de `decoteSurTrimestres()`/`decoteApplicable()` dans
`Trimestres.tsx` : deux occurrences trouvées, `simulerPourDateEffet()` (§2.2) et la section
rachat (§2.3) — toutes deux corrigées. Aucune autre partie du fichier ne consomme cette branche.

---

## 4. Tests

`src/lib/retraite/calcul.test.ts`, nouveau describe « Parité Trimestres.tsx / Carriere.tsx » (4
tests) :

- Profil génération 1960 (`ageLegal` stable 62 ans, `trimestresRequis` 167) — choisi car son
  anniversaire légal (janvier 2022) tombe avant même la fenêtre 01/09/2023-31/08/2026, donc
  `ageLegalAtteint()` est sans ambiguïté vrai quelle que soit la date d'effet simulée
  post-2023 : un même client peut être simulé de façon identique par les deux écrans (qui ne
  figent pas la date d'effet de la même façon), condition nécessaire pour un test de parité
  reproductible.
- `detailCarriere` réel (une période 2021, 4 trimestres cotisés dérivés via
  `trimestresCotisesEtAssimilesDepuisCarriere()`) — exercice de bout en bout de la dérivation
  année de référence → `parAnnee`, pas des booléens donnés en dur comme dans les tests
  « Profil complet » existants pour `Carriere.tsx`.
- Réplique côte à côte le branchement de `Carriere.tsx` et celui de `Trimestres.tsx` (mêmes
  primitives `calcul.ts`, mêmes arguments) et vérifie l'égalité : surcote classique 5 %,
  montant 375 € (P0 = 7 500 € × 5 %).
- **Limite assumée du test** : cette génération (ageLegal 62 ans) est structurellement sous le
  seuil de 63 ans de la surcote parentale (référentiel §2.3.2) — le test couvre donc la parité
  de la surcote *classique* de bout en bout, et vérifie seulement que la case surcote parentale
  cochée reste sans effet (porte fermée), pas la parité du montant de la branche parentale
  elle-même. Une génération satisfaisant à la fois « ageLegal ≥ 63 ans » et « année de
  référence dans la table des seuils de validation 2018-2026 » n'existe pas pour un client
  simulable aujourd'hui (13/08/2026) avec une date d'effet unique auto-cohérente — la porte
  « ageLegal ≥ 63 ans » n'est franchie qu'à partir de la génération 1964, dont l'anniversaire
  légal (2027) tombe déjà après le barème LFSS 2026 qui abaisse son âge légal sous 63 ans
  (effet de bord déjà documenté dans `calcul.test.ts`, describe `ageLegalParentaleEligible`).
  La branche parentale de `surcoteParentale()` elle-même reste testée séparément et
  exhaustivement dans son propre describe, inchangée par cette session.

**Suite complète : 570 tests passés (566 + 4), 0 régression, `npx tsc --noEmit` propre, `npx
vite build` réussi.**

---

## 5. Hors périmètre (rappel, non touché)

- MICO/MIGA et majoration enfants sur `Trimestres.tsx` : décision documentée au §1.4, pas
  ajoutés.
- Logique interne de `surcoteTotale()`, `surcotePourTrimestresCotises()`, `surcoteParentale()` :
  non modifiée, uniquement connectée.
- Écarts #9 à #15, lacune de données FP/CNAVPL (`trimestresCotisesAnneeReference`) : dette
  déjà documentée dans `docs/audit/branchement-majorations-pension-finale.md` §4, sans objet
  ici (`Trimestres.tsx` n'a pas de FP/CNAVPL).
