# Golden Scenarios — Retraite

Scénarios de référence calculés à la main, à partir des règles sourcées (`docs/retraite-base-referentiel.md`)
et des barèmes du millésime 2026 (`src/lib/retraite/params-retraite.json`). Ils sont rejoués de bout en
bout sur `calculerPensionConsolidee()` par `src/lib/retraite/goldenScenarios.test.ts`. Ce sont des filets
de sécurité : une modification de règle qui fait bouger l'un de ces résultats doit être justifiée, puis le
calcul ci-dessous mis à jour.

**Conventions communes** : montants annuels bruts, en euros constants 2026. Personne née en mars 1970 :
âge légal 64 ans (génération 1969 et après), durée requise 172 trimestres. Départ à l'âge légal : date
d'effet 01/04/2034, âge au départ 64 ans 0 mois (12 trimestres avant 67 ans, décote âge = −15 %). Pas de
détail de carrière (aucun trimestre cotisé connu : pas de palier 2 du MICO, pas de surcote).

**Limite : non confrontés à M@rel.** Le simulateur officiel Info-Retraite demande une connexion
FranceConnect et un dossier réel. Ces scénarios valident la cohérence du moteur avec les règles écrites,
pas l'exactitude des règles elles-mêmes.

---

## Scénario 1 — Salarié à taux plein, avec Agirc-Arrco

**Entrées** : SAM 40 000 €, 172 trimestres validés (régime général), 10 000 points Agirc-Arrco à 1,4386 €.

| Étape | Calcul | Résultat |
|---|---|---:|
| Pension de base brute | 40 000 × 50 % × 172/172 | 20 000,00 € |
| Décote | durée : 0 ; âge : −15 % → plus favorable : 0 | 0 % |
| MICO | 9 075,48 € < 20 000 € | 0 € |
| Agirc-Arrco | 10 000 × 1,4386 | 14 386,00 € |
| **Total** | | **34 386,00 €** |

## Scénario 2 — Salarié décoté

**Entrées** : SAM 30 000 €, 160 trimestres validés.

| Étape | Calcul | Résultat |
|---|---|---:|
| Pension de base brute | 30 000 × 50 % × 160/172 | 13 953,49 € |
| Décote | durée : 12 trimestres manquants → −15 % ; âge : −15 % | −15 % |
| Pension décotée | 13 953,49 × 0,85 | 11 860,47 € |
| MICO | exclu (pension décotée) | 0 € |
| **Total** | | **11 860,47 €** |

## Scénario 3 — Petite carrière portée au MICO, 3 enfants

**Entrées** : SAM 12 000 €, 172 trimestres validés, 3 enfants (filiation directe).

| Étape | Calcul | Résultat |
|---|---|---:|
| Pension de base brute | 12 000 × 50 % × 172/172 | 6 000,00 € |
| MICO palier 1 | 9 075,48 × 172/172 | 9 075,48 € |
| Majoration palier 1 | 9 075,48 − 6 000 | 3 075,48 € |
| Écrêtement | 9 075,48 € < plafond 16 930,68 € | aucun |
| Majoration 3 enfants | 9 075,48 × 1,10 | 9 983,03 € |
| **Total** | | **9 983,03 €** |

## Scénario 4 — Polypensionné régime général + fonction publique, porté au MIGA

**Entrées** : régime général 60 trimestres, SAM 30 000 € ; fonction publique d'État (sédentaire),
112 trimestres liquidables, TIB 30 000 €, 3 000 points RAFP. Total tous régimes : 172 trimestres.

| Étape | Calcul | Résultat |
|---|---|---:|
| Base régime général | 30 000 × 50 % × 60/172 | 5 232,56 € |
| MICO | 9 075,48 × 60/172 = 3 165,87 € < 5 232,56 € | 0 € |
| Pension FP calculée | 30 000 × 75 % × 112/172 | 14 651,16 € |
| Décote FP | 172 trimestres tous régimes → 0 (taux plein) | 0 % |
| MIGA | 28 ans de services : 57,5 % + 2,5 × 13 = 90 % × 16 396,19 | 14 756,57 € |
| Pension FP retenue | max(14 651,16 ; 14 756,57), MIGA accessible (taux plein) | 14 756,57 € |
| RAFP | 3 000 points < 5 125 : versée en capital, hors pension annuelle | 0 € / an |
| **Total annuel** | | **19 989,13 €** |
| Capital RAFP | 3 000 × 1,08 (majoration à 64 ans) × 0,05671 × 25,57 (conversion à 64 ans 0 mois) | 4 698,24 € |

## Scénario 5 — Cadre de 45 ans, départ décoté : Agirc-Arrco projeté et abattu

**Entrées** : née en mars 1981, départ à l'âge légal (64 ans) le 01/04/2045 ; SAM 45 000 € ;
150 trimestres tous régimes au départ (projection comprise) ; 9 000 points Agirc-Arrco au RIS ;
salaire brut 90 000 €/an ; 76 trimestres projetés d'ici au départ.

| Étape | Calcul | Résultat |
|---|---|---:|
| Base brute | 45 000 × 50 % × 150/172 | 19 622,09 € |
| Décote | durée : 22 trimestres manquants → −25 % (plafond) ; âge : −15 % → plus favorable | −15 % |
| Base décotée | 19 622,09 × 0,85 | 16 678,78 € |
| Points Agirc-Arrco par an | (48 060 × 6,20 % + 41 940 × 17 %) ÷ 20,1877 | 500,78 |
| Points projetés | 500,78 × 76/4 | 9 514,75 |
| Pension Agirc-Arrco avant coefficient | (9 000 + 9 514,75) × 1,4386 | 26 635,32 € |
| Coefficient d'anticipation | base décotée ; âge 64 ans → 0,88 ; 22 trimestres manquants > 20 → grille âge seule | 0,88 |
| Agirc-Arrco retenue | 26 635,32 × 0,88 | 23 439,08 € |
| **Total** | | **40 117,86 €** |

Avant la phase 2, l'outil aurait affiché 9 000 × 1,4386 = 12 947,40 € d'Agirc-Arrco, sans projection
ni abattement.

---

## Limite connue documentée : périodes MSA dans le SAM (audit R7)

`calculerSAM()` ne retient que les périodes dont le régime contient « assurance retraite ». Sur les
relevés réels observés, le bloc « L'Assurance retraite » couvre « Salariés, travailleurs indépendants » :
les périodes d'indépendant récentes y sont rattachées. Une période libellée « MSA » est en revanche
exclue du SAM. Or, depuis la LURA, les salaires MSA salariés entrent dans le SAM unique, alors que les
revenus d'exploitant agricole n'y entrent pas (régime non aligné). Les deux portent le même libellé
« MSA » : aucun scénario n'est figé tant qu'un relevé réel ne permet pas de les distinguer.
