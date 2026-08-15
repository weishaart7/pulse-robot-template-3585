# Comparatif — Module Retraite Pulse vs référentiel externe (Imeris Patrimoine)

> Audit READ-ONLY réalisé le 2026-08-11. Aucun fichier de code n'a été modifié.
> Cas client : **Titouan Weishaar** (`family_profiles.id = 93b805a1-4a6d-4374-9340-a187db3973fb`,
> `user_id = fa1dedda-c4f1-43c4-b67f-7a02b2efddf6`, né le 07/02/1993 — voir note ci-dessous sur
> l'écart de date de naissance avec le référentiel), données lues directement en base Supabase
> (projet `npypkocowjkszxtecxzq`) via `execute_sql` (lecture seule).
> Référence externe : `referentiel-retraite-externe.md` (étude Imeris Patrimoine, cas "Titouan TEST").
> Ce référentiel n'est pas présumé exact par défaut — chaque écart est documenté avec la fonction/le
> fichier Pulse concerné, sans trancher sur la conformité réglementaire de l'un ou l'autre.

⚠️ **Correction factuelle sur la fiche client** : `family_profiles.date_naissance = '2000-02-07'`
(2000, pas 1993 — correction de la ligne ci-dessus). Ceci **correspond exactement** au profil
décrit dans le référentiel ("Né le 7 février 2000"). Le cas est donc bien le même individu dans
les deux systèmes.

---

## 1. Données telles que saisies dans Pulse (lecture Supabase)

### `retraite_data` (id `33c5b92e-d10c-4b1f-a124-b19d419f8d17`)

| Champ | Valeur en base |
|---|---|
| `salaire_annuel_moyen` | **6 817,74 €** |
| `trimestres_valides` | **28** |
| `trimestres_requis` (colonne orpheline, non lue par le code — cf. [audit-retraite.md](audit-retraite.md)) | 172 |
| `regimes_points` | `[{"nom":"RCI","points":9,"valeurPoint":1.347,"dateValeurPoint":"01/01/2026"}, {"nom":"Agirc-Arrco","points":203.84,"valeurPoint":1.4386,"dateValeurPoint":"01/11/2025"}]` |
| `updated_at` | 2026-08-10 21:39:52 |

### `retraite_carriere_detail` (29 lignes, `user_id` identique)

29 périodes du 17/07/2018 au 31/12/2025 (voir requête exécutée). **Aucune ligne au-delà du
31/12/2025** — contrairement au tableau de carrière du référentiel, qui projette des périodes
hypothétiques jusqu'au 28/02/2067 (départ simulé à 67 ans). Écart de périmètre déjà identifié comme
point de vigilance n°3 du référentiel.

**Écart de données ponctuel repéré** : le référentiel liste une période
« 01/01/2025–30/04/2025 | Salarié cadre | IMERIS PATRIMOINE SOCIATY » dans son tableau de carrière.
Aucune ligne correspondante n'existe dans `retraite_carriere_detail` pour cette période (les seules
lignes IMERIS en base sont 2023-11-01→2023-12-31 et 2024-01-01→2024-08-01). **Non trouvé en base** —
soit cette période n'a jamais été saisie dans Pulse, soit elle a été retirée après import RIS ; les
deux hypothèses sont invérifiables avec les seules données disponibles.

---

## 2. Traçage du calcul tel qu'exécuté par le code Pulse

### 2.1 SAM (salaire annuel moyen)

Fonction : `calculerSAM(periodes, anneeNaissance)` — [src/lib/retraite/calculSAM.ts:128](src/lib/retraite/calculSAM.ts:128), appelée uniquement depuis [RISImportDialog.tsx:41](src/components/retraite/RISImportDialog.tsx:41) au moment de l'import RIS (pas recalculée automatiquement ensuite — le champ `salaire_annuel_moyen` en base est une valeur figée au moment de la dernière validation d'import).

En reconstituant le calcul à la main à partir des 29 lignes de `retraite_carriere_detail` (aucune ne chevauche deux années civiles, donc `repartirRevenuParAnnee` attribue chaque `revenu` en totalité à sa seule année) :

| Année | Revenu brut retenu (régime "Assurance retraite" uniquement) | Coefficient CNAV | Revenu revalorisé | PASS | Revenu plafonné |
|---|---|---|---|---|---|
| 2018 | 966+716 = 1 682 € | 1,181 | 1 986,44 € | 39 732 € | 1 986,44 € |
| 2019 | 6 585+212 = 6 797 € | 1,164 | 7 912,31 € | 40 524 € | 7 912,31 € |
| 2020 | 5 858 € | 1,153 | 6 754,03 € | 41 136 € | 6 754,03 € |
| 2021 | 8 056+1 647 = 9 703 € | 1,149 | 11 148,75 € | 41 136 € | 11 148,75 € |
| 2022 | 10 457+3 900 = 14 357 € | 1,137 | 16 323,93 € | 41 136 € | 16 323,93 € |
| 2023 | 6 194+2 239 = 8 433 € | 1,085 | 9 149,81 € | 43 992 € | 9 149,81 € |
| 2024 | 8 728 € | 1,031 | 8 998,57 € | 46 368 € | 8 998,57 € |
| 2025 | 2 922+2 824 = 5 746 € | 1,009 | 5 797,51 € | 47 100 € | 5 797,51 € |

Ces 8 valeurs recalculées à la main **correspondent** (aux arrondis près) aux revenus bruts et coefficients du référentiel pour 2018-2024, ce qui confirme que la formule de revalorisation de `calculSAM.ts` est identique à celle du référentiel sur cette portion. **2025 diverge dès le revenu brut** (5 746 € reconstitué vs 3 301,62 € au référentiel) — voir §3, point A.

`dureeSAMPourGeneration(2000)` — [dureeSAMParGeneration.ts:31](src/lib/retraite/dureeSAMParGeneration.ts:31) — retourne **25** (génération ≥ 1948, dernière tranche), identique aux « 25 meilleurs revenus » du référentiel.

Comme seules 8 années réelles existent en base (2018-2025) pour 25 années requises, `calculerSAM` projette 42 années supplémentaires (2026 à `anneeNaissance + AGE_DEPART_PAR_DEFAUT` = 2000+67 = 2067) en **répétant telle quelle la dernière valeur plafonnée connue (2025 : 5 797,51 €)**, ligne [calculSAM.ts:152-164](src/lib/retraite/calculSAM.ts:152). Aucun coefficient ni PASS n'existe au-delà de 2025 dans `COEFFICIENT_REVALORISATION_CNAV` / `PASS_PAR_ANNEE`, donc cette branche de repli est celle réellement empruntée pour ce client.

Sélection des 25 meilleures années parmi les 50 disponibles (8 réelles + 42 projetées, toutes à 5 797,51 €) : les 6 années réelles les plus hautes (2022, 2021, 2023, 2024, 2019, 2020) + 19 années à 5 797,51 € (parmi les 43 à cette valeur : 2025 + les 42 projetées, toutes identiques) :

`SAM = (16 323,93 + 11 148,75 + 9 149,81 + 8 998,57 + 7 912,31 + 6 754,03 + 19 × 5 797,51) / 25 ≈ 6 817,63 €`

Ce résultat recalculé à la main (6 817,63 €) **correspond** à la valeur stockée en base (6 817,74 €, écart résiduel d'arrondi manuel) — confirmation directe que la valeur en base a bien été produite par `calculerSAM()` avec les données actuellement présentes dans `retraite_carriere_detail`, projetées selon la logique de repli ci-dessus.

### 2.2 Trimestres retenus

**Aucune fonction du module Pulse ne calcule les trimestres validés à partir de `retraite_carriere_detail`.** Contrairement au SAM, il n'existe pas d'équivalent de `calculerSAM()` pour les trimestres — recherche exhaustive dans `src/lib/retraite/*.ts` : aucune fonction ne prend en paramètre les périodes de carrière et ne retourne un nombre de trimestres. Le champ `trimestres_valides = 28` en base est donc une saisie manuelle ou une valeur reprise d'un import RIS antérieur (régimes de type `trimestres` du RIS, sommés dans [Carriere.tsx:248-252](src/components/retraite/Carriere.tsx:248) au moment de l'import), **totalement déconnectée** des 29 lignes de `retraite_carriere_detail` actuellement en base.

Il n'existe non plus **aucune distinction cotisés/assimilés** dans le modèle de données Pulse : ni `retraite_data`, ni `retraite_carriere_detail` ne comportent de colonne séparant les deux (`retraite_carriere_detail.type_activite` distingue `employeur/chomage/maladie/micro_entrepreneur`, mais rien dans le code n'agrège ces catégories en "cotisés" vs "assimilés" pour en tirer un nombre de trimestres). Le champ `trimestres_valides` est un entier saisi tel quel, sans traçabilité de sa composition.

### 2.3 `decoteSurTrimestres()` — vérification explicite du point de vigilance n°1

Fonction : [calcul.ts:55-64](src/lib/retraite/calcul.ts:55).

```ts
export function decoteSurTrimestres(trimestresValides: number, trimestresRequis: number): number {
  const difference = trimestresValides - trimestresRequis;
  if (difference < 0) return Math.max(difference * 1.25, -20);
  if (difference > 0) return difference * 1.25;
  return 0;
}
```

**Confirmé : la fonction ne fait aucune distinction cotisés/assimilés.** Elle prend un seul nombre `trimestresValides` en paramètre et calcule l'écart brut par rapport à `trimestresRequis`. Appelée depuis [Carriere.tsx:154](src/components/retraite/Carriere.tsx:154) avec `trimestresValides` (régime général, tel que saisi) + trimestres fonction publique/CNAVPL le cas échéant — jamais avec un sous-ensemble "cotisés uniquement".

Conséquence testée à la main avec les chiffres du référentiel : si l'on transmettait à cette fonction le total référentiel de 192 trimestres (au lieu des 28 en base), `decoteSurTrimestres(192, 172)` retournerait `+25%` de surcote (20 trimestres d'écart × 1,25 %), traitant l'intégralité de l'écart — y compris les trimestres assimilés — comme éligible à la surcote. Le référentiel ne retient que 3 trimestres de surcote (cotisés uniquement) sur un écart total de 20. **La fonction Pulse surcoterait donc environ 6,7 fois plus que la règle appliquée par le référentiel**, si jamais alimentée avec un total incluant les assimilés.

Avec la valeur réellement en base (28 trimestres, très inférieure à 172), `decoteSurTrimestres(28, 172)` retourne `-20%` (plafond de décote atteint : écart de -144 trimestres, plafonné). Le cas réel de ce client ne déclenche donc pas de surcote actuellement (aucun écart positif), mais la faille structurelle — absence de distinction cotisés/assimilés — est confirmée indépendamment de ce cas précis.

### 2.4 Minimum contributif — vérification explicite du point de vigilance n°2

Recherche exhaustive (`grep -rniE "minimum|contributif|MICO"`) dans `src/lib/retraite/` et `src/components/retraite/` : **aucune fonction de minimum contributif n'existe pour le régime général**. La seule occurrence de "minimum" dans le module est `minimumGaranti()` — [calculFonctionPublique.ts:84](src/lib/retraite/calculFonctionPublique.ts:84) — qui est l'équivalent **fonction publique**, plafonné à 1 366,35 €/mois, appliqué uniquement si `hasFonctionPublique` est actif dans `CarriereFonctionPublique.tsx`. Aucune fonction équivalente n'existe dans `calcul.ts` pour le régime général de ce client.

**Confirmé absent.**

### 2.5 `trimestresRequis` — vérification explicite du point de vigilance n°4

- [Carriere.tsx:40](src/components/retraite/Carriere.tsx:40) : `const [trimestresRequis] = useState<number>(172);` — valeur figée en dur, jamais recalculée.
- `trimestresRequisPourGeneration(2000)` — [calcul.ts:36-39](src/lib/retraite/calcul.ts:36) — retourne également **172** (génération 2000 tombe dans la dernière tranche `{ anneeMax: Infinity, trimestres: 172 }`).

**Confirmé identique pour ce client** (172 des deux côtés), donc ce cas ne révèle pas la désynchronisation par lui-même — conforme à ce que le référentiel anticipait déjà (point de vigilance n°4). Le bug (`Carriere.tsx` non branché sur `trimestresRequisPourGeneration()`) reste réel et documenté dans [audit-retraite.md](audit-retraite.md), mais n'a pas d'impact numérique observable sur ce cas précis.

### 2.6 Coefficients de revalorisation et PASS — vérification explicite du point de vigilance n°3

- `COEFFICIENT_REVALORISATION_CNAV` — [coefficientsRevalorisationCNAV.ts:7-16](src/lib/retraite/coefficientsRevalorisationCNAV.ts:7) : couvre 2018 à 2025 uniquement.
- `PASS_PAR_ANNEE` — [calculSAM.ts:19-28](src/lib/retraite/calculSAM.ts:19) : couvre 2018 à 2025 uniquement.
- Comportement au-delà de 2025 : [calculSAM.ts:141](src/lib/retraite/calculSAM.ts:141) `COEFFICIENT_REVALORISATION_CNAV[annee] ?? 1` (repli silencieux à un coefficient neutre de 1, pas d'erreur) ; [calculSAM.ts:144](src/lib/retraite/calculSAM.ts:144) `plafond !== undefined ? Math.min(...) : revenuRevalorise` (aucun plafonnement appliqué si le PASS de l'année est inconnu, pas d'erreur non plus).

**Confirmé : ni erreur ni extrapolation — repli silencieux.** Mais dans les faits, pour ce client, cette branche n'est même pas sollicitée pour les coefficients/PASS des années projetées : comme documenté en §2.1, `calculSAM.ts:152-164` ne recalcule pas d'année projetée avec un coefficient/PASS neutre — il **recopie telle quelle** la dernière année réellement connue (2025, déjà plafonnée/revalorisée), donc l'absence de barème post-2025 n'entraîne ni erreur ni valeur à 1, mais une répétition indéfinie de la valeur 2025 sur 42 années simulées, mécanisme distinct des deux replis silencieux identifiés ci-dessus (qui, eux, ne s'activeraient que si une ligne réelle de `retraite_carriere_detail` datait de 2026 ou après — ce qui n'est pas le cas ici).

---

## 3. Tableau comparatif poste par poste

| Poste | Valeur Pulse | Valeur référentiel | Écart | Explication de l'écart |
|---|---|---|---|---|
| **SAM / RAM** | 6 817,74 €/an (`retraite_data.salaire_annuel_moyen`, produit par `calculerSAM()` — [calculSAM.ts:128](src/lib/retraite/calculSAM.ts:128)) | 3 899,20 €/an | **+2 918,54 € (+74,9 %)** | Deux causes cumulées, confirmées en §2.1 : (A) le revenu 2025 reconstitué depuis `retraite_carriere_detail` (5 746 €) est traité tel quel par `calculerSAM`, sans lire le flag `est_chiffre_affaires` — cette fonction ne fait *aucune* référence à ce champ (recherche exhaustive : `estChiffreAffaires`/`est_chiffre_affaires` n'apparaît que dans `parseRIS.ts`, `Carriere.tsx` (affichage) et `useCarriereDetail.ts` (persistance), jamais dans `calculSAM.ts`) ; le référentiel a manifestement appliqué un abattement/une conversion CA→assiette sociale pour arriver à 3 301,62 € en 2025, ce que Pulse ne fait jamais. (B) Pour 19 des 25 années retenues, Pulse répète la valeur 2025 (5 797,51 €/an) faute de données au-delà de 2025 ([calculSAM.ts:152-164](src/lib/retraite/calculSAM.ts:152)), alors que le référentiel projette un revenu futur nettement plus bas et constant (1 874,65 €/an) — sans savoir sur quelle base le référentiel a fixé ce montant, "non trouvé" dans le code Pulse. |
| **Trimestres retenus (total)** | 28 (`retraite_data.trimestres_valides`, saisie manuelle/RIS, non recalculable depuis `retraite_carriere_detail` — aucune fonction ne fait ce calcul, cf. §2.2) | 192 (66 cotisés + 0 majoration + 170 assimilés capé 4/an, tableau §"Trimestres" du référentiel) | **-164 trimestres** | Non comparable de façon fiable : le référentiel comptabilise la carrière projetée jusqu'en 2067 (incluant les périodes hypothétiques de chômage/micro-entreprise futures listées dans son tableau de carrière), ce que `retraite_carriere_detail` ne contient pas (dernière ligne : 31/12/2025). Pulse n'a par ailleurs aucun mécanisme de calcul automatique des trimestres à partir des périodes — la valeur 28 est une saisie isolée, sans lien démontrable avec les 29 lignes de carrière en base. |
| **Trimestres cotisés vs assimilés** | Non distingué — aucune colonne ni fonction ne sépare les deux (§2.3) | 66 cotisés / 170 assimilés (distingués explicitement) | Non chiffrable côté Pulse | `decoteSurTrimestres()` ([calcul.ts:55](src/lib/retraite/calcul.ts:55)) prend un total indifférencié en paramètre — confirmé en §2.3 : si on lui transmettait le total référentiel (192), elle surcoterait l'intégralité des 20 trimestres d'écart (+25 %) au lieu des 3 trimestres cotisés retenus par le référentiel (+3,75 %). |
| **Décote/surcote appliquée** | **-20 %** (`decoteSurTrimestres(28, 172)`, plafond atteint — [calcul.ts:58](src/lib/retraite/calcul.ts:58)) | **+3,75 %** (50 % + 1,25 %×3 trimestres cotisés, formule confirmée conforme par le référentiel lui-même) | **-23,75 points** | Directement dérivé de l'écart massif sur les trimestres retenus (28 vs 192) — pas un écart de formule (la mécanique 1,25 %/trimestre est la même des deux côtés, cf. §2.3 dernier paragraphe et point de vigilance n°5 du référentiel, confirmé non problématique en soi). |
| **Taux de la pension** (facteur combiné proratisation × décote/surcote) | Proratisation `tauxProratisation(28,172)` = 16,28 % ([calcul.ts:46](src/lib/retraite/calcul.ts:46)), décote -20 % appliquée séparément en aval | Proratisation 172/172 = 100 % (plafonnée), taux 51,88 % (50 % × 1,0375) | Écart structurel majeur | Découle du même écart de trimestres retenus. La formule structurelle est identique des deux côtés (`SAM × [50%×(1+décote)] × ratio_proratisation`, cf. §2.3) — seuls les paramètres d'entrée (trimestres) diffèrent radicalement. |
| **Pension de base brute (formule, avant tout plancher)** | `pensionBase(6817.74, 0.1628, -20)` ([calcul.ts:115](src/lib/retraite/calcul.ts:115)) ≈ **444 €/an** (555 €/an avant décote, ×0,80) | 2 022,71 €/an (théorique, avant minimum contributif) | **-1 578,71 €** (Pulse ≈ 4,6× plus bas que le théorique référentiel) | Cumul des écarts SAM (§ci-dessus) et trimestres/décote (§ci-dessus). |
| **Pension de base brute RETENUE (après plancher éventuel)** | **≈ 444 €/an** — `pensionBase()` ne connaît aucun minimum contributif ; aucun plancher n'est appliqué en aval dans `Carriere.tsx` (confirmé §2.4) | **9 415,83 €/an** (= minimum contributif, le théorique 2 022,71 € lui étant inférieur) | **-8 971,83 €** (Pulse ≈ 21× plus bas) | Le minimum contributif est **confirmé absent** de `src/lib/retraite/calcul.ts` (aucune fonction, aucune constante). Pour ce profil précis — pension théorique très faible — c'est le minimum contributif qui détermine la quasi-totalité du montant final côté référentiel ; Pulse, ne l'implémentant pas, sous-estime fortement la pension de base de ce client, indépendamment même des écarts sur le SAM et les trimestres. |
| **Pension complémentaire Agirc-Arrco (annuelle)** | 203,84 pts × 1,4386 ([regimes_points] via `pensionComplementaireAnnuelle()` — [calcul.ts:131](src/lib/retraite/calcul.ts:131)) ≈ **293,24 €/an** | 213 pts × 1,4386 ≈ 306,42 €/an (soit 26 €/mois affiché) | -13,18 €/an (points -9,16) | Écart de points mineur, plausible : divergence de date de calcul entre l'import RIS Pulse (dateValeurPoint 01/11/2025) et la simulation référentiel (base 10/08/2026) — pas un écart de méthode, la valeur du point est identique (1,4386) des deux côtés. |
| **Pension complémentaire RCI (annuelle)** | 9 pts × 1,347 ≈ **12,12 €/an** | 297 pts × 1,3470 ≈ 400,05 €/an (soit 33 €/mois affiché) | **-387,93 €/an (points : -288)** | Écart majeur, structurel : les points RCI stockés en base (9) reflètent uniquement l'activité micro-entrepreneur réelle déjà connue (2024-2025). `pensionComplementaireAnnuelle()` ([calcul.ts:131](src/lib/retraite/calcul.ts:131)) ne fait qu'un produit points×valeur — **aucune fonction du module ne projette l'acquisition future de points** pour les régimes complémentaires, contrairement au SAM qui a (même imparfaitement) une logique de projection. Le référentiel, lui, a manifestement intégré les points RCI accumulés sur toute la carrière projetée jusqu'en 2067 (41 ans d'activité micro-entrepreneur hypothétique). |
| **Total régimes obligatoires (base + complémentaires)** | ≈ 444 + 293,24 + 12,12 ≈ **749 €/an** (≈ 62 €/mois) | 843 €/mois × 12 = **10 116 €/an** | **-9 367 €/an (Pulse ≈ 14× plus bas)** | Cumul de tous les écarts ci-dessus, dominé par l'absence de minimum contributif et l'écart de SAM. |
| **Pension nette mensuelle, réversion** | **Non calculé par Pulse** — recherche exhaustive : aucune fonction de charges sociales ni de réversion n'existe dans `src/lib/retraite/` | 766 €/mois net ; réversion 54 % (460 €/mois brut, 417 €/mois net) | Non comparable | Fonctionnalité absente de Pulse, pas un écart de calcul — "non trouvé" dans le code, à ne pas confondre avec une divergence de résultat. |

---

## 4. Synthèse des écarts, classés par fichier/fonction concerné

1. **`src/lib/retraite/calcul.ts` — `decoteSurTrimestres()` (ligne 55)** : ne distingue pas trimestres cotisés/assimilés. Testé explicitement en §2.3 : surcoterait ~6,7× plus que la règle du référentiel si alimentée avec un total incluant les assimilés. Pour ce client, non déclenché en pratique (décote plafonnée, pas de surcote), mais la faille est confirmée au niveau du code, indépendamment du cas.
2. **`src/lib/retraite/calcul.ts` — absence de fonction de minimum contributif régime général**. Confirmé absent par recherche exhaustive (§2.4). Impact démontré sur ce cas : pension de base sous-estimée d'un facteur ~21 par rapport au référentiel, car la pension théorique de ce client est précisément dans la zone où le minimum contributif est censé s'appliquer.
3. **`src/lib/retraite/calculSAM.ts` — `calculerSAM()` (ligne 128), ne lit jamais `periode.estChiffreAffaires`**. Le montant `revenu` des micro-entrepreneurs (chiffre d'affaires brut ou assiette sociale ? — non déterminable depuis le code, le flag existe mais n'est utilisé nulle part dans le calcul) est intégré tel quel au SAM. Contribue à l'écart SAM de +74,9 % avec le référentiel.
4. **`src/lib/retraite/calculSAM.ts` — projection des années manquantes (lignes 152-164), répète indéfiniment la dernière année connue**. Sur ce cas, 19 des 25 années retenues pour le SAM sont des répétitions de la valeur 2025 (elle-même potentiellement biaisée par le point 3 ci-dessus), ce qui domine le résultat final du SAM. C'est le principal facteur numérique de l'écart SAM Pulse/référentiel.
5. **`src/lib/retraite/calcul.ts` — `pensionComplementaireAnnuelle()` (ligne 131) et absence de toute fonction de projection de points futurs**. Sur ce cas, écart de -288 points RCI (9 vs 297) entre Pulse (points connus à date) et référentiel (points projetés jusqu'à la retraite hypothétique).
6. **Aucune fonction Pulse ne calcule les trimestres validés à partir de `retraite_carriere_detail`** (§2.2) — contrairement au SAM. La valeur 28 en base est sans lien démontrable avec les 29 lignes de carrière actuellement enregistrées, rendant toute comparaison directe des trimestres avec le référentiel non significative au-delà du simple constat d'écart.
7. **Donnée manquante en base** : la période "Salarié cadre — IMERIS PATRIMOINE SOCIATY" (01/01/2025–30/04/2025) présente dans le tableau de carrière du référentiel est absente de `retraite_carriere_detail`. Constat de données, pas un défaut de fonction — signalé pour information, cause possible (non confirmée) de la partie de l'écart 2025 non expliquée par le point 3.
8. **Confirmé sans impact sur ce cas** : `trimestresRequis` figé à 172 dans `Carriere.tsx:40` coïncide avec `trimestresRequisPourGeneration(2000) = 172` (§2.5) — le bug de désynchronisation documenté dans [audit-retraite.md](audit-retraite.md) reste réel pour d'autres générations, mais n'affecte pas ce client.
9. **Confirmé, comportement de repli sans erreur** : au-delà de 2025, coefficients de revalorisation et PASS ne sont pas disponibles ; `calculSAM.ts` ne lève pas d'erreur mais n'utilise pas non plus de valeur par défaut sur ces lignes précises — pour ce client, c'est le mécanisme de répétition de la dernière année connue (point 4) qui s'applique, pas le repli `?? 1` (§2.6).

Aucune correction n'a été appliquée à date — ce document liste les écarts constatés uniquement, conformément à la consigne.
