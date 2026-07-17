# Golden Scenarios — Transmission (v2, avec forfait frais funéraires)

Jeu de scénarios de référence, calculés à la main selon le référentiel sourcé, servant de tests de bout en bout (fixtures d'entrée + résultats attendus). Objectif : remplacer "on corrige un bug, on en trouve un autre" par un filet de sécurité qui couvre toute la chaîne (civil → fiscal → notaire → assurance-vie) d'un coup.

**Changement depuis v1** : intégration du forfait de frais funéraires (1 500 €, art. 775 CGI), déduit proportionnellement de la base taxable de chaque héritier avant abattement — logique déjà présente dans `beneficiary.ts::buildTaxBaseByBeneficiary`, qui n'avait simplement pas été reproduite dans le calcul manuel de la v1. Les écarts observés par Claude Code (150 € scénario 4, 338 € scénario 5) sont confirmés exacts avec cette correction.

**Convention retenue pour `netARecevoir`** (décidée avec Titouan) : part successorale nette + assurance-vie nette. Le patrimoine déjà détenu avant décès (ex. la moitié de communauté déjà à l'époux survivant) n'est **pas** compté dans `netARecevoir` — ce n'est pas une transmission, c'est du patrimoine préexistant.

**Frais de notaire** : émoluments réglementés (barème sourcé par tranches, art. A 444-63 et A 444-121 du Code de commerce) + forfait de débours paramétrable (illustré ici à 0,5 % de l'actif successoral brut).

**Liquidation de communauté : résolu le 2026-07-17.** La pondération par bien (`lib/patrimoine/succession.ts::getPartSuccessorale`, basée sur `qualification_bien`/`detenteur` de chaque bien) est désormais appliquée à la fois côté civil (`buildPatrimonySnapshot`) et côté fiscal (construction des `dmtgAssets`), à partir du patrimoine BRUT complet (communs + propres) — sans contournement manuel. Les scénarios 1/2/3 sont donc désormais vérifiables de bout en bout sur les parts civiles et les droits de succession (cf. `goldenScenarios.test.ts`). Restent bloqués pour ces 3 scénarios : l'assurance-vie (non intégrée à `netARecevoir`, chantier séparé) et l'assiette immobilière des frais de notaire (`isResidencePrincipale` mal déduit en l'absence d'un champ dédié en base — chantier séparé).

---

## Scénario 1 — Communauté légale, conjoint 1/4 PP, 2 enfants communs, AV clause conjoint

**Entrées** : identiques à la v1 (patrimoine 839 000 €, communs SCI 122 000 € + RP 445 000 €, propres CTO 12 000 € + PER 10 000 €, AV 250 000 € clause épouse primes avant 70 ans, 2 enfants communs, conjoint 1/4 PP).

Actif successoral (hors AV, hors moitié conjoint) = 305 500 €. Parts civiles avant frais funéraires : épouse 76 375 € (25 %), enfant 1 et 2 : 114 562,50 € chacun (37,5 % chacun).

**Frais funéraires (1 500 €) prorata par part civile** : épouse 375 €, enfant 1 562,50 €, enfant 2 562,50 €.

**Résultats attendus**

| | Épouse | Enfant 1 | Enfant 2 |
|---|---:|---:|---:|
| Part civile brute | 76 375 € | 114 562,50 € | 114 562,50 € |
| Frais funéraires imputés | 375 € | 562,50 € | 562,50 € |
| Base après frais (`baseApresFrais`) | 76 000 € | 114 000 € | 114 000 € |
| Abattement | exonéré | 100 000 € | 100 000 € |
| Base taxable | — | 14 000 € | 14 000 € |
| Droits de succession | 0 € | ≈ 1 091 € | ≈ 1 091 € |
| Quote-part frais notaire (≈ 4 950 € total illustratif) | ≈ 1 238 € | ≈ 1 856 € | ≈ 1 856 € |
| Assurance-vie nette | 250 000 € (exonérée) | 0 € | 0 € |
| **netARecevoir** | **≈ 324 762 €** | **≈ 111 053 €** | **≈ 111 053 €** |

*Total droits de succession ≈ 2 182 € (était 2 350 € en v1, sans frais funéraires).*

---

## Scénario 2 — Même patrimoine, conjoint usufruit total (25 ans, barème 80 %/20 %)

**Frais funéraires prorata** (80/10/10) : conjoint 1 200 €, enfant 1 et 2 : 150 € chacun.

| | Épouse (usufruit) | Enfant 1 (NP) | Enfant 2 (NP) |
|---|---:|---:|---:|
| Part civile (80/20 réparti) | 244 400 € | 30 550 € | 30 550 € |
| Frais funéraires imputés | 1 200 € | 150 € | 150 € |
| Base après frais | 243 200 € | 30 400 € | 30 400 € |
| Droits de succession | 0 € | 0 € (sous abattement) | 0 € (sous abattement) |
| Quote-part frais notaire | ≈ 3 960 € | ≈ 495 € | ≈ 495 € |
| Assurance-vie nette | 250 000 € | 0 € | 0 € |
| **netARecevoir** | **≈ 489 240 €** | **≈ 29 905 €** | **≈ 29 905 €** |

*Le forfait funéraire ne change pas les droits ici (les deux enfants restent largement sous l'abattement de 100 000 €), seulement le net.*

---

## Scénario 3 — Famille recomposée + assurance-vie vers un enfant

Mêmes bases civiles et frais funéraires que le scénario 1 (76 000 € / 114 000 € / 114 000 € après frais).

| | Épouse | Enfant commun (AV) | Enfant non commun |
|---|---:|---:|---:|
| Base après frais | 76 000 € | 114 000 € | 114 000 € |
| Droits de succession | 0 € | ≈ 1 091 € | ≈ 1 091 € |
| Quote-part frais notaire | ≈ 1 238 € | ≈ 1 856 € | ≈ 1 856 € |
| Prélèvement 990 I (250 000 € − 152 500 € abattement, ×20 %) | — | 19 500 € | — |
| Assurance-vie nette | 0 € | 230 500 € | 0 € |
| **netARecevoir** | **≈ 74 762 €** | **≈ 341 553 €** | **≈ 111 053 €** |

---

## Scénario 4 — Séparation de biens, enfant unique, conjoint usufruit (55 ans, barème 50 %/50 %)

Actif successoral 500 000 € (tout propre au défunt, pas de communauté). Parts civiles avant frais : 250 000 € chacun (50/50). Frais funéraires prorata : 750 € chacun.

| | Conjoint (usufruit) | Enfant unique (NP) |
|---|---:|---:|
| Base après frais | 249 250 € | 249 250 € |
| Abattement | exonéré | 100 000 € |
| Base taxable | — | 149 250 € |
| Droits de succession | 0 € | ≈ 28 044 € |
| Quote-part frais notaire (≈ 5 289 € total) | ≈ 2 645 € | ≈ 2 645 € |
| **netARecevoir** | **≈ 246 605 €** | **≈ 218 561 €** |

*Vérifié par Claude Code : écart de 150 € par rapport à la v1, exactement expliqué par le forfait funéraire.*

---

## Scénario 5 — Pas de conjoint ni de descendant : fratrie

Patrimoine 400 000 €, 2 frères/sœurs, 50/50 = 200 000 € chacun avant frais. Frais funéraires prorata : 750 € chacun.

| | Frère/sœur 1 | Frère/sœur 2 |
|---|---:|---:|
| Base après frais | 199 250 € | 199 250 € |
| Abattement | 15 932 € | 15 932 € |
| Base taxable | 183 318 € | 183 318 € |
| Droits de succession (35 %/45 %) | ≈ 80 050 € | ≈ 80 050 € |
| Quote-part frais notaire (≈ 4 278 € total) | ≈ 2 139 € | ≈ 2 139 € |
| **netARecevoir** | **≈ 117 061 €** | **≈ 117 061 €** |

*Vérifié par Claude Code : écart de 338 € par rapport à la v1, exactement expliqué par le forfait funéraire.*
