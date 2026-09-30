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

## Scénario N1 — Revenu net d'un couple marié (phase 3)

Rejoué par `calculNetRetraite.test.ts`. **Entrées** : foyer marié, 2 parts, métropole. Pensionné A :
20 000 € de base + 10 000 € de complémentaires ; pensionné B : 12 000 € + 3 000 €. Total brut 45 000 €.

| Étape | Calcul | Résultat |
|---|---|---:|
| 1ʳᵉ itération (taux normal) | RFR = (28 230 + 14 115) − abattements 4 234,50 | 38 110,50 € |
| Seuils 2 parts | exonération 20 016 € ; 3,8 % jusqu'à 26 167 € ; 6,6 % jusqu'à 40 603 € | taux médian |
| 2ᵉ itération (taux médian, CSG déductible 4,2 %) | (28 740 + 14 370) − abattements (2 874 + 1 437) | 38 799,00 € |
| Point fixe | 38 799 € ≤ 40 603 € | taux médian, stable |
| Prélèvements sociaux | CSG 6,6 % × 45 000 + CRDS 225 + CASA 135 + maladie 1 % × 13 000 | 3 460,00 € |
| Impôt brut | 2 × (19 399,50 − 11 600) × 11 % | 1 715,89 € |
| Décote couple | 1 483 − 1 715,89 × 45,25 % | 706,56 € |
| Impôt | arrondi(1 715,89 − 706,56) | 1 009 € |
| **Net annuel** | 45 000 − 3 460 − 1 009 | **40 531 €** |

## Scénario R1 — Réversion au décès du conjoint le mieux pensionné (phase 4)

Rejoué par `calculReversion.test.ts`. **Entrées** : couple marié. Défunt : 20 000 € de pension de base
régime général (hors majoration enfants, 172 trimestres) et 10 000 € d'Agirc-Arrco. Survivant : 12 000 € de
base + 3 000 € de complémentaires (15 000 € de pensions propres).

| Étape | Calcul | Résultat |
|---|---|---:|
| Réversion régime général brute | 20 000 × 54 % (entre minimum 4 019,04 € et maximum 12 976,20 €) | 10 800,00 € |
| Plafond de ressources (personne seule) | 15 000 + 10 800 = 25 800 € > 25 001,60 € : réduite de 798,40 € | 10 001,60 € |
| Réversion Agirc-Arrco | 10 000 × 60 %, sans condition de ressources | 6 000,00 € |
| Revenu brut du survivant | 15 000 + 10 001,60 + 6 000 | 31 001,60 € |
| Tranche de CSG (veuf, 1 part) | oscillation médian/normal au seuil de 26 471 € → tranche la plus élevée | 8,3 % |
| Prélèvements sociaux | CSG 2 573,13 + CRDS 155,01 + CASA 93,00 + maladie 1 % × 9 000 | 2 911,14 € |
| Impôt | (26 255,26 − 11 600) × 11 % = 1 612,08 ; décote 167,53 | 1 445 € |
| **Net annuel du survivant** | 31 001,60 − 2 911,14 − 1 445 | **26 645,46 €** |

## Scénario CL1 — Carrière longue, génération 1970, début à 17 ans (phase 5)

Rejoué par `calculCarriereLongue.test.ts`. **Entrées** : née en mars 1970 ; 4 trimestres cotisés par an de
1987 (17 ans) à 2025 (156 trimestres) ; aujourd'hui le 29/09/2026 ; trimestres futurs supposés cotisés du
trimestre en cours au trimestre précédant le départ.

| Option (circulaire Cnav 2026-29) | Début d'activité | Date d'effet | Durée cotisée | Requise | Ouvert |
|---|---|---|---:|---:|---|
| avant 16 ans → 58 ans | non (aucun trimestre fin 1986) | 01/04/2028 | — | 172 | non |
| avant 18 ans → 60 ans | oui (8 trimestres fin 1988) | 01/04/2030 | 156 + 15 = 171 | 172 | **non (1 trimestre manquant)** |
| avant 20 ans → 61 ans 9 mois | oui | 01/01/2032 | 156 + 22 = 178 | 172 | **oui** |
| avant 21 ans → 63 ans | oui | 01/04/2033 | 181 | 172 | oui |

Premier départ anticipé : **01/01/2032**, à taux plein. Variante : avec 2 trimestres de maladie (réputés
cotisés, 4 au plus), la durée cotisée à 60 ans atteint 173 et le départ est ouvert dès le **01/04/2030**.

## Scénario D1 — Décision de départ (phase 6a)

Rejoué par `decisionDepart.test.ts` sur un simulateur fictif (pension de 12 000 €/an au premier départ, le
01/04/2034 à 64 ans, +100 €/an par mois d'attente, décote pendant les 12 premiers mois). Civilité inconnue :
âge de référence 65 + (20,0 + 23,6)/2 = 86,8 ans, soit 86 ans 10 mois (janvier 2057). Taux d'actualisation 0 %.

| Étape | Calcul | Résultat |
|---|---|---:|
| Dates testées | trimestre par trimestre, 01/04/2034 → 01/04/2040 | 25 dates |
| Cumul au premier départ | 1 000 €/mois × 273 mois | 273 000 € |
| Cumul d'un départ un an plus tard | 1 100 €/mois × 261 mois | 287 100 € |
| Rattrapage | 12 000 € perdus ÷ 1 200 €/an gagnés, à partir de 65 ans | 75 ans |
| Taux plein | fin de la décote après 12 mois | 01/04/2035 |
| Meilleur cumul | maximum de (1 000 + 8,33 m)(273 − m) au-delà de la dernière date testée | 01/04/2040 |

---

## Limite connue documentée : périodes MSA dans le SAM (audit R7)

`calculerSAM()` ne retient que les périodes dont le régime contient « assurance retraite ». Sur les
relevés réels observés, le bloc « L'Assurance retraite » couvre « Salariés, travailleurs indépendants » :
les périodes d'indépendant récentes y sont rattachées. Une période libellée « MSA » est en revanche
exclue du SAM. Or, depuis la LURA, les salaires MSA salariés entrent dans le SAM unique, alors que les
revenus d'exploitant agricole n'y entrent pas (régime non aligné). Les deux portent le même libellé
« MSA » : aucun scénario n'est figé tant qu'un relevé réel ne permet pas de les distinguer.
