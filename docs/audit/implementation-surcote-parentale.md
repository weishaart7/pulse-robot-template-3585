# Implémentation — surcote parentale, option B déclarative (écart #6)

> Suite de l'audit Retraite (`docs/audit/audit-retraite.md`, écart #6) et de
> `docs/audit/conception-majorations-enfants.md` (§6.3 : décision produit actée, option B —
> champ déclaratif, pas de sous-système de répartition MDA ; §7 : vérification RIS restée ouverte).
> Référentiel : `docs/retraite-base-referentiel.md` §2.3.2. Écarts #9 à #15 : hors périmètre, non
> touchés.

---

## 1. Ce qui a été implémenté

### 1.1. Champ déclaratif — écran Carrière

Case à cocher « Au moins 1 trimestre de majoration pour enfant » sur
[`Carriere.tsx`](../../src/components/retraite/Carriere.tsx), dans la carte « Gestion des
trimestres » (même emplacement que trimestres validés/requis). Libellé explicite pour le
conseiller :

> Maternité, adoption, éducation, enfant handicapé ou congé parental — quel que soit le régime de
> base qui l'a accordé. Condition d'éligibilité à la surcote parentale (référentiel §2.3.2),
> déclarative : ne cochez que si ce trimestre figure déjà sur le relevé de carrière du client.

Persistée dans une nouvelle colonne `au_moins_un_trimestre_majoration_enfant` (booléen, défaut
`false`) sur `retraite_data` — migration
[`20260813120000_add_majoration_enfant_retraite_data.sql`](../../supabase/migrations/20260813120000_add_majoration_enfant_retraite_data.sql),
**appliquée au projet Supabase `npypkocowjkszxtecxzq`** (pas seulement écrite dans le dépôt), types
TypeScript régénérés depuis le schéma réel. Chargée, comparée (`hasChanges`) et enregistrée par
`handleSave()` exactement comme les autres champs de carrière (`trimestres_valides`,
`regimes_points`).

### 1.2. Fonctions de calcul — [`src/lib/retraite/calcul.ts`](../../src/lib/retraite/calcul.ts)

Trois fonctions pures, sur le modèle de `surcotePourTrimestresCotises()` (écart #5) et
`majorationTroisEnfants()` (écart #7) :

- **`ageLegalParentaleEligible(dateNaissance, dateEffet): boolean | undefined`** — sous-condition
  n° 2 de la surcote parentale : l'âge légal de la génération est-il ≥ 63 ans ? Réutilise
  `ageLegalPourGeneration()` (Session A), ne code aucun barème en dur. Distincte de
  `ageLegalAtteint()` (qui compare l'âge légal à la date d'effet, pas l'âge légal lui-même à un
  seuil).
- **`surcoteParentale(auMoinsUnTrimestreMajorationEnfant, ageLegalParentaleEligibleFlag, dureeRequiseAtteinte, trimestresCotisesAnneeReference): number`**
  — porte d'éligibilité à trois conditions cumulatives (condition 1 déclarative + les deux volets
  de la condition 2), montant `1,25 % × trimestres`, **plafonné à 5 %** (4 trimestres) — à la
  différence de `surcotePourTrimestresCotises()`, qui n'a aucun plafond. `trimestresCotisesAnneeReference`
  est fourni par l'appelant via `parAnnee` de `trimestresCotisesEtAssimilesDepuisCarriere()` (écart
  #5) — aucun nouveau calcul de ventilation annuelle dans cette fonction.
- **`surcoteTotale(surcoteClassiqueValeur, surcoteParentaleValeur, cumulable): number`** —
  combinateur de cumul : `cumulable = true` additionne les deux surcotes (régime général et
  régimes hérités), `cumulable = false` retient `Math.max()` des deux (fonction publique). Même
  principe que `decoteApplicable()` pour la règle du plus petit des deux comptages.

Comme `surcotePourTrimestresCotises()` et `majorationTroisEnfants()` avant elles, ces trois
fonctions sont **testées mais sans consommateur UI** : la pension affichée par `Carriere.tsx` ne les
appelle pas encore (`pensionBaseAjustee` n'utilise toujours que `decoteSurTrimestres`/`decoteSurAge`
via `decoteApplicable`). Choix d'architecture délibéré, cohérent avec les deux écarts précédents :
créer et tester l'unité de calcul avant de la brancher sur un affichage réel.

---

## 2. Interprétation à signaler pour validation

Conformément à la mission (point 3) : le référentiel affirme que la fonction publique **ne cumule
pas** la surcote classique et la surcote parentale (§7.4 : « l'une ou l'autre »), mais **ne formule
pas explicitement une règle de choix** entre les deux au-delà de cette alternative.

**Interprétation retenue et implémentée** : `surcoteTotale(..., cumulable: false)` retient la plus
élevée des deux (`Math.max`), pas la première déclarée ni un ordre de priorité arbitraire. C'est une
supposition raisonnable — cohérente avec la logique générale du droit de la sécurité sociale, qui
retient systématiquement la solution la plus favorable à l'assuré dans ce type d'alternative — mais
**pas une citation directe du référentiel pour ce point précis**. Signalé ici pour validation
explicite, comme demandé par la mission ; aucune autre interprétation n'a été codée en parallèle.

---

## 3. Tests — récapitulatif

Tous ajoutés dans [`src/lib/retraite/calcul.test.ts`](../../src/lib/retraite/calcul.test.ts).

| Describe | Tests | Couverture |
|---|---|---|
| `ageLegalParentaleEligible` | 6 | Génération stable (1969, toujours éligible), `undefined` si barème indéterminé, **effet de bord LFSS 2026** (mission point 4) |
| `surcoteParentale` | 9 | Porte à trois conditions (table `it.each`), `undefined` traité comme non éligible, **plafond à 5 % avec 5 trimestres ou plus** (mission point 5), valeur négative, branchement de bout en bout avec `parAnnee` |
| `surcoteTotale` | 5 | Cumul additif (régime général), **cumul exclusif fonction publique dans les deux sens** — classique > parentale ET parentale > classique (mission point 6) — jamais la somme |

### 3.1. Effet de bord LFSS 2026 (mission point 4)

Trois cas testés explicitement, avec les valeurs d'âge légal déjà validées par les tests existants
de `ageLegalPourGeneration()` :

- **1964** : éligible sous `calendrier_2023` (63 ans pile), **non éligible** sous `lfss_2026`
  (62 ans 9 mois) — perte d'éligibilité confirmée.
- **1965 T1** (janvier-mars) : éligible sous `calendrier_2023` (63 ans 3 mois), **non éligible**
  sous `lfss_2026` (62 ans 9 mois) — même perte.
- **1965 T2-T4** (avril-décembre, cas de contraste) : reste éligible sous les deux jeux (63 ans 0
  mois sous `lfss_2026`) — la perte d'éligibilité ne touche pas toute la génération 1965, seulement
  son premier trimestre de naissance, exactement comme pour `trimestresRequisPourGeneration()`
  (écart #3).

### 3.2. Plafond à 5 % (mission point 5)

`surcoteParentale(true, true, true, 5)` et `surcoteParentale(true, true, true, 8)` retournent tous
deux `5`, pas `6,25` ni `10` — le plafond de 4 trimestres coupe strictement, contrairement à
`surcotePourTrimestresCotises()` qui n'a pas de plafond équivalent.

### 3.3. Cumul fonction publique (mission point 6)

Deux scénarios distincts, dans les deux sens :

- Classique (7,5 %) > parentale (5 %) → `surcoteTotale(7.5, 5, false)` = `7.5` (pas `12.5`).
- Parentale (5 %) > classique (1,25 %) → `surcoteTotale(1.25, 5, false)` = `5` (pas `6.25`).

Un troisième test vérifie qu'à valeurs égales (5 % chacune), le résultat reste `5`, jamais `10`.

### 3.4. Suite complète

**549 tests passés, 6 todo (pré-existants, non liés à cette session), 0 régression**
(`npx vitest run`). `npx tsc --noEmit` : aucune erreur. `npx vite build` : build de production
réussi. Application démarrée en local (`npm run dev`), aucune erreur console au chargement — la
vérification interactive de l'écran Carrière (case à cocher, sauvegarde) n'a pas pu être poussée
plus loin dans cette session (écran protégé par authentification, sans identifiants de test
disponibles) ; la persistance a été vérifiée par la migration effectivement appliquée et les types
régénérés depuis le schéma réel, pas seulement par lecture de code.

---

## 4. Dette technique documentée, non codée

Conformément à la mission (point 7) : la vérification de la présence de cette donnée sur un RIS réel
reste ouverte — cf.
[`conception-majorations-enfants.md` §7](conception-majorations-enfants.md#7-piste-alternative--lire-les-trimestres-mda-déjà-tranchés-sur-le-ris-plutôt-que-modéliser-un-sous-système-de-répartition).
Cette question **n'a aucun impact sur l'implémentation présente** : le champ reste déclaratif, saisi
manuellement par le conseiller, quelle que soit l'issue de cette vérification RIS. Elle ne redevient
pertinente que si une décision future remplace la saisie déclarative par une lecture automatique
depuis le RIS — non entrepris ici, non nécessaire pour que la fonctionnalité actuelle fonctionne.

---

## 5. Hors périmètre (rappel, non touché)

- **Branchement de `surcoteParentale()`/`surcoteTotale()` sur la pension affichée** : non fait, par
  choix, cohérent avec le statut de `surcotePourTrimestresCotises()` et `majorationTroisEnfants()`
  avant cette session.
- **Écarts #9 à #15** : non touchés.
