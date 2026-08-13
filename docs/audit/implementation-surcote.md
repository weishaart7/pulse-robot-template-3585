# Implémentation — fonction de surcote dédiée

> Rapport de session. Fait suite à [conception-surcote.md](conception-surcote.md), qui
> diagnostiquait l'écart #5 de l'audit référentiel ([audit-retraite.md §7](audit-retraite.md)).
> Périmètre : moteur de calcul uniquement (`calcul.ts`, `calculTrimestres.ts`). Aucun composant
> React touché — la fonction créée n'est pas encore appelée depuis un écran, cf. §5. Surcote
> parentale (écarts #6/#7) et les 5 points de dette du §4 : non codés, documentés uniquement,
> conformément à la consigne.

---

## 1. Fonctions ajoutées — [calcul.ts](../../src/lib/retraite/calcul.ts)

### `dateAnniversaireLegal(dateNaissance, ageLegal): Date`

Convertit un âge légal `{ ans, mois }` (tel que renvoyé par `ageLegalPourGeneration()`, Session A)
en date exacte d'anniversaire — même principe que `dateEffetSimuleeParAge()` déjà présente (âge →
date), étendu aux mois. Gère le report d'année quand `dateNaissance.mois + ageLegal.mois` dépasse
12 (testé explicitement : né en octobre, âge légal « 62 ans 9 mois » → anniversaire en juillet de
l'année **suivante**, pas la même année).

### `ageLegalAtteint(dateNaissance, dateEffet): boolean | undefined`

Compare `dateEffet` à `dateAnniversaireLegal(dateNaissance, ageLegalPourGeneration(...).age)`.
Retourne `undefined` (pas `false`) quand `ageLegalPourGeneration()` ne peut pas déterminer le
barème (date d'effet antérieure au 01/09/2023) — aucune réponse binaire fabriquée à partir d'une
donnée indéterminée. **Aucun nouveau calcul de barème légal** : consomme directement le résultat de
`ageLegalPourGeneration()` (Session A), comme demandé.

### `surcotePourTrimestresCotises(trimestresCotisesDansPeriodeDeReference, ageLegalAtteintFlag, dureeRequiseAtteinte): number`

La fonction dédiée demandée par la mission :

```ts
export function surcotePourTrimestresCotises(
  trimestresCotisesDansPeriodeDeReference: number,
  ageLegalAtteintFlag: boolean | undefined,
  dureeRequiseAtteinte: boolean
): number {
  if (!ageLegalAtteintFlag || !dureeRequiseAtteinte) {
    return 0;
  }
  return Math.max(0, trimestresCotisesDansPeriodeDeReference) * 1.25;
}
```

- **Porte d'éligibilité** : les deux conditions cumulatives du référentiel §2.3.1 (âge légal ET
  durée requise) sont explicitement vérifiées — `0` si l'une des deux manque.
- **`undefined` traité comme non éligible** (`!undefined` → `true` → retourne 0) : un barème
  indéterminé ne produit jamais une surcote fabriquée, cohérent avec le contrat de
  `ageLegalAtteint()`.
- **Trimestres cotisés uniquement** : le paramètre `trimestresCotisesDansPeriodeDeReference` est
  fourni par l'appelant, pas recalculé ici — cette fonction ne fait aucune hypothèse sur la
  provenance du nombre (cf. §2 pour la source disponible aujourd'hui, et §4 pour ce qui reste
  incertain).
- **Sans plafond** : `difference × 1,25 %`, aucune borne haute — conforme au référentiel (« 5 %
  par an, sans plafond »), testé explicitement avec 40 trimestres (50 %, non tronqué).

### `decoteSurTrimestres()` : non modifiée

Vérifié par relecture : aucune ligne de `decoteSurTrimestres()` ni de `decoteSurTrimestresPlafond25()`
n'a été touchée. La décote reste calculée exactement comme avant cette session — seule une
fonction séparée a été ajoutée à côté, conformément au constat central de la note de conception
(décote et surcote sont deux mécanismes distincts, pas une seule fonction à deux signes).

---

## 2. Extension additive — [calculTrimestres.ts](../../src/lib/retraite/calculTrimestres.ts)

`ResultatTrimestresCotisesEtAssimiles` gagne un champ `parAnnee` :

```ts
export interface ResultatTrimestresCotisesEtAssimiles {
  cotises: number;
  assimiles: number;
  total: number;
  parAnnee: { annee: number; cotises: number; assimiles: number }[]; // nouveau
}
```

Les valeurs par année étaient déjà calculées à l'intérieur de la boucle existante de
`trimestresCotisesEtAssimilesDepuisCarriere()` (`cotisesAnnee` / `assimilesAnnee`) — seulement
jamais collectées ni retournées. Le changement se limite à les pousser dans un tableau au fil de
la boucle, puis à le trier par année croissante avant de le renvoyer. **Aucune logique de calcul
modifiée.**

**Non cassant, vérifié concrètement** : le seul appelant de production
(`Carriere.tsx:400`, indicateur de cohérence RIS ↔ carrière saisie) utilise `.total` et continue de
fonctionner sans changement. Les tests existants utilisaient `toEqual({ cotises, assimiles, total })`
en comparaison stricte d'objet — mis à jour pour `toEqual(expect.objectContaining({ ... }))`
(douze occurrences), qui ignore les champs additionnels plutôt que d'exiger une correspondance
exacte : ces tests ne portaient pas sur `parAnnee`, ils n'ont donc pas été récrits pour en exiger
un contenu précis, seulement pour ne plus casser sur son ajout.

Deux nouveaux tests dédiés à `parAnnee` : reconstruction de la somme agrégée à partir du détail
annuel sur le jeu de données réel « Titouan Weishaar », tri croissant même quand les périodes sont
fournies dans le désordre chronologique, et cas vide (`[]`, pas `undefined`).

---

## 3. Tests — éligibilité et ordre d'application

### Porte d'éligibilité (mission point 6) — les 4 combinaisons

`describe('surcotePourTrimestresCotises — porte d'éligibilité')`, table `it.each` :

| Âge légal atteint | Durée requise atteinte | Surcote attendue |
|---|---|---|
| ✅ | ✅ | 5 % (4 trimestres × 1,25 %) |
| ✅ | ❌ | 0 % |
| ❌ | ✅ | 0 % |
| ❌ | ❌ | 0 % |

Plus deux tests complémentaires : `undefined` (barème indéterminé) traité comme non éligible, et
absence de plafond sur le nombre de trimestres.

### Ordre d'application — surcote avant MICO (mission point 5)

`describe('Ordre d'application : surcote assise sur P0, ajoutée après le MICO')`. Scénario
construit pour que les deux ordres possibles divergent **numériquement**, pas seulement en théorie
— condition nécessaire : `P0 < MICO` et `surcote > 0` (démontré comme précondition explicite du
test) :

- `trimestresRequis = 172`, `trimestresValides = 176` (durée requise dépassée de 4 trimestres,
  supposés cotisés pour ce scénario), `salaireAnnuelMoyen = 15 000 €`.
- `P0 = pensionBase(15000, taux=1, decote=0) = 7 500 €` — sous le plancher MICO
  (`MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 = 9 075,50 €`, `decoteSurTrimestres()` inchangée fournit un
  `decote` positif, éligibilité MICO donc acquise, ratio plafonné à 1).
- `surcote = surcotePourTrimestresCotises(4, true, true) = 5 %` → `surcoteMontant = 375 €`.

| Ordre | Formule | Résultat |
|---|---|---|
| **Correct** (référentiel §3.7, §12.3 : MICO établi sur P0 seul, surcote ajoutée ensuite) | `Math.max(P0, MICO) + surcoteMontant` | **9 450,50 €** |
| **Incorrect** (régression à ne jamais réintroduire : surcote pliée dans P0 avant le MICO) | `Math.max(P0 + surcoteMontant, MICO)` | **9 075,50 €** |

Le test vérifie explicitement que les deux résultats **diffèrent** (`not.toBeCloseTo`) et que
l'ordre correct est strictement supérieur — dans l'ordre incorrect, le plancher MICO absorbe
entièrement la surcote (375 € disparaissent), ce qui est précisément le bug que le référentiel
(« surcote assise sur la pension avant MICO ») interdit.

**Portée de ce test, explicitement limitée.** Il vérifie la mécanique de composition
(`surcotePourTrimestresCotises()` + `minimumContributif()` + `pensionBase()`, toutes des fonctions
pures déjà existantes ou ajoutées cette session) — il ne modifie **aucun composant React**.
Aujourd'hui, `Carriere.tsx` continue de calculer `Math.max(pensionBaseBrute * (1 + decoteSurcote / 100),
minimumContributif(...))` sans jamais appeler `surcotePourTrimestresCotises()` : la nouvelle
fonction n'est donc pas encore une régression à surveiller en production, elle est **prête** pour
un futur branchement, sur le même modèle que `ageLegalPourGeneration()` en Session A (créée et
testée avant d'avoir un appelant réel). Rebrancher `Carriere.tsx`/`Trimestres.tsx`/`CarriereCNAVPL.tsx`
sur ce nouvel assemblage est un chantier séparé — cf. dette technique n° 6 de
[conception-surcote.md §5](conception-surcote.md), déjà signalée comme hors périmètre.

---

## 4. Dette technique documentée (mission point 7) — non résolue, par consigne explicite

Les cinq points suivants, déjà identifiés par la note de conception, sont reportés ici sans
tentative de résolution. Chacun bloque, à des degrés divers, le passage d'un `trimestresCotisesDansPeriodeDeReference`
approximatif (année civile) à une valeur réellement conforme au référentiel (trimestre civil
précis) :

1. **Chronologie infra-annuelle des années limites.** Si l'anniversaire légal ou la date d'effet
   tombe au milieu d'une année civile, `parAnnee` (§2) donne un total annuel mais ne dit pas
   quels trimestres, à l'intérieur de cette année, tombent avant ou après le pivot. Un calcul basé
   sur `parAnnee` ne peut donc traiter proprement que des années **entièrement** comprises dans la
   période de référence — les deux années limites resteraient à exclure ou à approximer,
   explicitement, si ce branchement est fait un jour.

2. **Cas mixte cotisé/assimilé/micro-entrepreneur dans une année limite.** Même blocage que le
   point 1, précisé pour le cas cité par la mission : une année limite mêlant `employeur`,
   `micro_entrepreneur` et `chomage`/`maladie` a une répartition cotisé/assimilé **quantitative**
   connue (via `parAnnee`) mais pas de répartition **temporelle** à l'intérieur de l'année.

3. **Sous-cas de démarrage de la période de référence.** Le référentiel (§2.3.1) distingue deux
   règles de démarrage selon que la durée requise a été atteinte avant ou après l'âge légal — ce
   qui suppose de connaître la date exacte d'acquisition du dernier trimestre requis. Sous-problème
   direct du point 1 : sans chronologie infra-annuelle, impossible de choisir la bonne règle sans un
   arbitraire non documenté par le référentiel pour ce cas précis.

4. **Fin de période au trimestre civil, pas à l'année.** Le référentiel borne la fin de la période
   de référence au dernier jour du trimestre civil précédant la date d'effet. Une future
   implémentation au niveau annuel (via `parAnnee`) resterait une approximation à ce titre — à
   signaler explicitement le jour où ce branchement est fait, pas un problème réglé ici.

5. **Rachats option 2 (taux et durée) situés dans la période de référence.** Ouvrent aussi droit à
   surcote (référentiel §2.3.1). Le simulateur de rachat de `Trimestres.tsx` connaît l'option
   choisie (`optionRachat`) mais reste, par sa propre documentation, « un sandbox éphémère, aucune
   persistance » — aucun trimestre racheté n'existe dans `retraite_carriere_detail`. Rien à
   connecter côté carrière enregistrée pour ce cas aujourd'hui.

Rappel des deux autres points déjà écartés du périmètre de cette mission (non repris ici comme
dette « à traiter plus tard » car leur statut est différent — ce sont des écarts distincts, pas des
limites internes de la fonction créée) :

- **Insertion dans l'assemblage final de la pension** (ordre d'application complet, interaction
  avec le MICO majoré/écrêtement) — chantier séparé, déjà repéré par l'audit référentiel comme
  écarts liés à la structure du MICO.
- **Surcote parentale** (référentiel §2.3.2, écarts #6/#7 de l'audit) — mécanisme distinct,
  explicitement hors périmètre.

---

## 5. Fichiers modifiés

| Fichier | Nature |
|---|---|
| [src/lib/retraite/calcul.ts](../../src/lib/retraite/calcul.ts) | + `dateAnniversaireLegal()`, `ageLegalAtteint()`, `surcotePourTrimestresCotises()` — `decoteSurTrimestres()`/`decoteSurTrimestresPlafond25()` non modifiées |
| [src/lib/retraite/calcul.test.ts](../../src/lib/retraite/calcul.test.ts) | Nouveaux tests — cf. §3 |
| [src/lib/retraite/calculTrimestres.ts](../../src/lib/retraite/calculTrimestres.ts) | + champ `parAnnee` sur `ResultatTrimestresCotisesEtAssimiles`, additif |
| [src/lib/retraite/calculTrimestres.test.ts](../../src/lib/retraite/calculTrimestres.test.ts) | 12 assertions existantes adaptées (`objectContaining`), 3 nouveaux tests `parAnnee` |

**Aucun composant React modifié** — cohérent avec le périmètre de la mission (créer la fonction,
pas la brancher sur un écran) et avec la façon dont `ageLegalPourGeneration()` avait déjà été
introduite en Session A avant d'avoir un appelant.

---

## 6. Tests — résultats

```
npx tsc --noEmit -p .      → 0 erreur
npx vitest run              → 39 fichiers, 491 tests passés, 6 todo, 0 échec
```

`calcul.test.ts` : 48 → 65 tests (+17 : `dateAnniversaireLegal`, `ageLegalAtteint`, porte
d'éligibilité de la surcote, ordre d'application MICO). `calculTrimestres.test.ts` : 16 → 19 tests
(dont 12 assertions existantes adaptées, non des tests nouveaux). Aucune régression sur les 472
tests déjà présents après la correction de l'écart #4
([correction-decote-age-carriere.md](correction-decote-age-carriere.md)) — en particulier, aucun
test de décote existant n'a dû être modifié, confirmant que `decoteSurTrimestres()` est restée
intacte.
