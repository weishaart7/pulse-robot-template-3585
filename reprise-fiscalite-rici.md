# Reprise : moteur IR d'Aurevia, reste la 2042-RICI

À lire en début de conversation. Suivi complet et annexe des cases :
https://claude.ai/artifact/YL6LKXpmSjF6d9DPeomMfR (onglets « Synthèse » et « Annexe — 703 cases »).

## Où on en est (17 nov. 2026)

Campagne : aligner le moteur IR (`useFiscalOverview`) sur le simulateur officiel 2026 (revenus 2025),
case par case. Tout est commité sur `main`, **rien n'est poussé**.

| Lot | Commit | Contenu |
|---|---|---|
| 1 | `7f7df3e` | Cadre 1, personnes à charge (38 cases) |
| 2 | `a938e13` | Cadre 7 courant : garde, scolarité, syndicats, prestations compensatoires, 7UH, 7DC (19 cases) |
| 3 | `1d394ba` | Cadre 3 : reports 150-0 B ter, plus-values 2012, quotient RVG/RUA (14 cases) |
| 4 | `4ca9844` | 4BC sans 2044, crédits et réductions du cadre 8 (18 cases) |
| 5a | `bc3267f` | Cadre 5, colonnes PAC (64 cases) ; 30 cases « dont » sans effet, non saisies |
| 5b | `0d2d429` | Plafonnement global des avantages fiscaux (art. 200-0 A) ; corrige 7DC |
| 5c | `a4202de` | Investissements outre-mer 2042-IOM (93 cases) |

Migrations appliquées en base (MCP Supabase, projet `npypkocowjkszxtecxzq`). Types Supabase complétés
à la main par script (pas de régénération complète, pour ne pas lire les 4 500 lignes).

## Reste : 2042-RICI (environ 430 cases du cadre 7)

Pinel, Denormandie, Censi-Bouvard, FCPI/FIP, PME/IR-PME, Malraux, monuments historiques, SOFICA,
forêts, tourisme, transition énergétique, etc. Liste exacte et libellés : annexe du document, tableau
« cadre 7 ». Aurevia gère déjà : 7UD, 7UQ, 7UJ, 7UF, 7UH, 7DB, 7DR, 7DL, 7DQ, 7DG, 7GA…7GG, 7EA…7EG,
7AC, 7AE, 7WN/7WO/7WM, 7DC.

À découper en sous-lots par famille (une famille = des cases au même mécanisme), et pour chacune :
1. Mesurer chaque case sur le simulateur (1 000 €, gros montant, foyer non imposable).
2. Déterminer : taux appliqué ou montant déjà calculé, plafond propre, report, restituable ou non,
   **part retenue au plafonnement global** (100 %, autre, ou hors plafond ; SOFICA porte le plafond à
   18 000 € comme l'outre-mer).
3. Exposer règles + séquence fichier par fichier, attendre validation (CLAUDE.md), coder, tester,
   documenter `docs/fiscalite.md`, commiter, mettre à jour le document de suivi.

## Architecture utile

- `src/lib/fiscalite/calculerReductionsCreditsImpot.ts` : cadre 7 ; renvoie `totalReductions`,
  `totalCredits`, `avantagesPlafonnesCourants`, `reductionEsus`.
- `src/lib/fiscalite/calculerPlafonnementNiches.ts` : plafond = 10 000 € + min(3 000, ESUS)
  + min(8 000, outre-mer) ; excédent ajouté à l'impôt (avec les reprises). Les nouvelles niches
  « courantes » s'ajoutent à `courants` ; SOFICA rejoindra la majoration de 8 000 € (à vérifier).
- `src/lib/fiscalite/calculerInvestissementsOutreMer.ts` : modèle à reprendre pour une famille
  nombreuse (table `REGLES_*` par case : nature, plafond, part).
- `src/hooks/useFiscalOverview.ts` : branche tout sur `calculerImpot` (paramètres positionnels :
  … `reductionsImpot`, `creditsImpotCadre7`, `creditImpotEtrangerCadre8`, `reprisesImpot` …).
- Saisie : table `reductions_credits_impot` (une ligne par utilisateur) ; service générique
  `src/services/reductionsCreditsImpotService.ts` (liste `CASES_NUMERIQUES`, colonne = clé en minuscules) ;
  formulaire `src/components/fiscalite/ReductionsCreditsImpotForm.tsx` (`SousGroupe` + `SingleMontantLigne`).
- Nouveaux champs d'entrée : optionnels (`case7xx?: number | null`) pour ne pas casser les tests existants.

## Méthode simulateur

- `curl -s -X POST https://simulateur-ir-ifi.impots.gouv.fr/cgi-bin/calc-2026.cgi -d "pre_situation_famille=M&pre_situation_residence=M&0DA=1980&0DB=1982&1AJ=300000&1BJ=200000&7XX=1000"`
  puis `iconv -f ISO-8859-15 -t UTF-8` et lire les champs cachés `name='X' value='…'` :
  `IINETIR` (impôt net), `ITRED` (réductions **affichées**), `IREST` (restitution), `REVKIRE` (RFR),
  `RNICOL` (RNI), `NAPCRP` (PS).
- **Toujours raisonner sur la baisse de `IINETIR`, pas sur `ITRED`** : le plafonnement global n'apparaît
  pas dans `ITRED` (erreur commise au lot 2 sur 7DC).
- Foyers de référence : couple 1AJ 300 000 / 1BJ 200 000 sans enfant → impôt 164 948 €, RNI 470 890 € ;
  pour tester un plafond, ajouter 7DB=20000&7DG=1 (crédit courant de 10 000 €) ; non imposable :
  1AJ=15000.
- Liste des champs et ordre du formulaire : `https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/2026/complet/index.htm`
  (champs `_XXX`). « Calcul impossible » (réponse vide) = prérequis manquant.
- Les boucles de dizaines d'appels : en tâche de fond (`run_in_background`), elles dépassent 2 min.

## Décisions et écarts connus

- Aurevia suit le simulateur officiel 2026 quand il diverge de la loi (ex. 4BC non plafonné à 10 700 €).
- Écart outre-mer : HGU 20 000 € + HOB 30 000 € → 40 000 € sur le simulateur, 30 600 € dans Aurevia.
- Hypothèse : une réduction non imputée faute d'impôt compte pour son montant entier au plafond global.
- Non contrôlés : prérequis BIC/BA des crédits du cadre 8, 4BC avec 4BA ; RVA (abattement fixe au
  quotient) non géré.
- Aucun formulaire n'a été vu dans le navigateur (pas de compte de test Aurevia).
- Typecheck : 17 erreurs préexistantes hors fiscalité ; lint : 2 erreurs préexistantes
  (`patrimoineAcquetsService.ts`, `secureService.ts`).
