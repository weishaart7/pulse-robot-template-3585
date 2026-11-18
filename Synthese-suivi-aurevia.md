# Aurevia — reprise : moteur IR face au simulateur officiel

Nov 18, 2026 · @Titouan

Les deux chantiers ouverts après la campagne de comparaison du moteur IR d'Aurevia avec le simulateur officiel sont terminés et poussés sur `main` : les cases non gérées qui changent l'impôt (7US comprise depuis le 18 nov. 2026) et le taux de PS de l'assurance-vie hors fiscalité (gardé à 17,2 %). Les écarts connus restants (7DO, 7ZZ…7ZW, 8TK, arrondi des PS de 4BK/4BL) sont résolus depuis le 18 nov. 2026. Une seconde campagne sur 21 foyers complexes, puis une vérification BOFiP, ont corrigé les écarts de règles de calcul (voir « Campagne foyers complexes ») ; aucun écart connu ne reste avec le simulateur hors 0XX, mis de côté.

## Contexte

Les 1 305 cases du simulateur officiel 2026 (revenus 2025, l'année que modélise Aurevia) ont été testées une à une contre `useFiscalOverview`. Base de test : couple marié, 2 enfants nés en 2010 et 2012, 1AJ 50 000 € et 1BJ 30 000 €, chaque case à 5 000 € (ou cochée).

| Résultat | Cases |
| --- | --- |
| Identiques à Aurevia | 419 |
| Non gérées par Aurevia, avec effet sur l'impôt officiel | 704 |
| Non gérées, sans effet officiel | 105 |
| Non testables (simulateur : crédit égal à l'impôt français, exit tax, 3SE, 8TA, 8TM, 0XX) | 44 |
| Écart 8TK (et 4BK/4BL) : résolu le 18 nov. 2026, voir ci-dessous | 3 |

Commits déjà faits sur `main` (poussés le 17 nov. 2026) :

| Commit | Objet |
| --- | --- |
| `cecdd72` | 8ZR, revenu net mondial associé à 8TI |
| `6f3aabb` | 3WE non imposé (report art. 150-0 D bis) |
| `0726852` | PS alignés sur le simulateur (assurance-vie 18,6 %, 2DH, 1NX, 1MP, 3VJ, 3VT, 3PI) |
| `d0a4b4d` | RFR aligné sur l'art. 1417 IV et le simulateur |
| `2753963` | Décote plafonnée à l'impôt |
| `dfd1817` | Abattement enfants mariés rattachés (cases N et P) |
| `815e66d` | Abattement personnes âgées (art. 157 bis) |
| `5d21a14` | Plafond quart de part en résidence alternée à 903,5 € |

Commits du 18 nov. 2026, poussés sur `main` :

| Commit | Objet |
| --- | --- |
| `8fb9fe8` | Taux de PS de l'assurance-vie via constantes (17,2 % hors fiscalité) |
| `d6cb6d5` | 7US, mécénat d'entreprise (colonne `case_7us`) |
| `1bb2c30` | 7DO déduite deux fois du plafond PME |
| `fc495e8` | 7WI et dépenses antérieures 7ZZ…7ZW : tests sur les mesures du simulateur |
| `39eccaf` | 8TK : contrôle du crédit égal à l'impôt français ; rentes 1AR…1DR sans crédit |
| `a0fb240` | Arrondi des PS de la fraction 4BK/4BL |
| `c442801` | Colonnes `case_8tk186` et `case_8tk172` supprimées en base (table vide) |
| `eb23a37` | 17 erreurs de typecheck préexistantes corrigées (transmission, immobilier, services) |
| `7310ee9` | `React.useId` appelé sans condition dans Checkbox et Switch |
| `ed9d109` → `68e217d` | Module transmission typé en cinq phases : 117 `any` retirés (maritalStatus, lignes Supabase, successionLegale, état des composants, tests) |

8TK (résolu le 18 nov. 2026) : le simulateur n'accorde le crédit égal à l'impôt français que si 8TK égale exactement le total brut des cases de catégorie (1AF/1BF, 1AL/1BL, 4BK, 4BL, 5AK…) ; 8TK n'a aucun effet propre et les rentes 1AR…1DR n'ouvrent pas de crédit. Aurevia applique la même règle stricte (alerte si 8TK diffère). L'arrondi des PS de 4BK/4BL est aligné aussi (PS du foncier entier, moins ceux de la fraction arrondis par contribution). Les anciennes colonnes de ventilation de 8TK sont supprimées en base.

Décisions prises : quand le simulateur et la loi ou ClickImpôts divergent, Aurevia suit le simulateur officiel 2026 (3SB hors RFR, assurance-vie à 18,6 %, 1NX sans PS).

## Campagne foyers complexes (18 nov. 2026)

21 foyers (S1 à S21 : couples avec enfants en résidence alternée, invalidité, veufs, parents isolés, PFU, assurance-vie, foncier, non-salariés, PER, dons, PME, CEHR, CDHR, crédit égal à l'impôt français) comparés au simulateur sur les deux millésimes, figés dans `src/hooks/useFiscalOverview.simulateurOfficiel.test.ts` (332 tests). Règles ensuite vérifiées dans le BOFiP. Commits poussés sur `main` :

| Commit | Objet |
| --- | --- |
| `a9874bb` | Non-régression contre le simulateur officiel (cas figés, écarts connus en `it.fails`) |
| `39ebf35` | Réduction complémentaire du quotient familial, 1 801 € (art. 197 I 2) |
| `3228f7e` | TMI sur les parts de base sous plafonnement du quotient (5XT compris) |
| `35bf5ab` → `59e0145` | Paramètres par millésime (`src/lib/fiscalite/parametres/`), cinq lots, sans changement de résultat |
| `c542f55` | Choix du millésime de règles dans la Vue d'ensemble ; revenus 2026 provisoire (calc-2027 : dons 7UD 2 000 €) |
| `8b3baa9` | CDHR (art. 224 CGI, BOI-IR-CDHR-10), acomptes 8HR/8HS déduits du solde |
| `e3c55c8` | Réductions imputées sur le seul impôt au barème (BOI-IR-LIQ-20-20-40 §10) |
| `5a7dac9` | Plafonnement global des niches sur les avantages imputés (BOI-IR-LIQ-20-20-10-30) |
| `cafb0b9` | Veuf (2 011 €, maintien avec une personne invalide), case T (personne invalide seule, enfant unique alterné), abattements arrondis à l'euro |
| `e63cbb2` | CEHR et CDHR au prorata du crédit égal à l'impôt français ; droits et décote arrondis (art. 1657) |
| `cb11fa9` | Avance immédiate 7HB ajoutée au solde (colonne `case_7hb`), cas S22 |

Divergence BOFiP / simulateur : BOI-IR-CDHR-10 §180 retire les revenus exonérés par convention du revenu de référence de la CDHR, le simulateur les garde ; Aurevia suit le simulateur.

Restent ouverts : 0XX (refusé par le simulateur sans fiche de détail ; base des dons à 20 % et règle du quart de la CDHR, signalée « approximative »), répartition entre catégories du plafonnement global quand l'impôt ne suffit pas (prorata, non observé), millésime revenus 2026 définitif et codes 7UQ/7VM (après la loi de finances pour 2027), dettes 2042-IFI (dette d'un actif écarté, parts de sociétés à 100 % en 9CA).

## Point 1 — les cases non gérées qui changent l'impôt

703 cases (8ZR est traitée depuis) sont absentes des saisies d'Aurevia alors que le simulateur officiel change l'impôt, le RFR ou les PS quand on les remplit. Elles se concentrent au cadre 7 (449), dans les régimes réels du cadre 5 (94), l'outre-mer (96) et les revenus des personnes à charge (38).

| Priorité | Lot | Cases | Pourquoi |
| --- | --- | --- | --- |
| 1 | Revenus des personnes à charge, cadre 1 | 38 | Fait (commit 7f7df3e, 16 nov. 2026) |
| 2 | Cadre 7 courant : garde, scolarité, syndicats, pension compensatoire, partis | 22 | Fait (commit a938e13, 16 nov. 2026) ; 19 cases, pas 22 |
| 3 | Cadre 3 : reports d'imposition et plus-values 2012, quotient | 14 | Fait (commit 1d394ba, 16 nov. 2026) |
| 4 | 4BC, crédits du cadre 8 | 18 | Fait (commit 4ca9844, 16 nov. 2026) |
| 5 | Cadre 5 réel, outre-mer (H), reste du cadre 7 (RICI) | 611 | Cadre 5 fait le 17 nov. 2026 (64 cases PAC ; 30 cases « dont » sans effet) ; plafonnement global et outre-mer faits le 17 nov. 2026 ; 2042-RICI faite le 17 nov. 2026, 7US le 18 nov. 2026 |

La 2042-RICI est couverte en huit sous-lots, tous commités et poussés sur `main` le 17 nov. 2026 ; 7US (mécénat d'entreprise) a suivi le 18 nov. 2026 : le « calcul impossible » venait d'un prérequis, un revenu BA, BIC ou BNC au réel.

| Sous-lot | Commit | Contenu | Cases |
| --- | --- | --- | --- |
| 6h | `b2fb287` | Bas du cadre 7 : 7WL, 7GZ, 7CD/7CE, perte d'autonomie 7WI (seuils de RFR) | 11 |
| 6g | `8e8d2dc` | Censi-Bouvard | 45 |
| 6f | `1e839be` | Scellier ; plafonnement global par année d'investissement 2009-2012 | 175 |
| 6e | `8eb1f28` | Pinel, Pinel+, Denormandie, Duflot | 122 |
| 6d | `441ca06` | Haut du cadre 7 : dons européens et Mayotte, reports de dons, 7AG, 7WP, bornes, Loc'Avantages, 7WR, Malraux | 26 |
| 6c | `d08cd91` | Investissements forestiers | 24 |
| 6b | `aed76ce` | Fin du bloc entreprises ; ordre d'imputation PME/ESUS corrigé, 7DC dans le plafond commun | 15 |
| 6a | `b09aa33` | Souscriptions au capital : PME, ESUS, JEI/JEIR, FCPI/FIP, SOFICA | 21 |

Écart 7DO résolu le 18 nov. 2026 : le simulateur déduit 7DO deux fois du plafond PME pour les cases imputées après elle, Aurevia fait de même. Dépenses antérieures 7ZZ…7ZW de 7WI vérifiées le 18 nov. 2026 : le « calcul impossible » venait de la saisie obligatoire des quatre cases ; Aurevia donnait déjà les mêmes montants. Plus aucun écart connu sur la 2042-RICI. Formulaires toujours non vus dans le navigateur.

### Priorité 1 — personnes à charge (colonnes C/D, I/J)

Salaires et revenus d'activité (1CJ/1DJ, 1CA/1DA, 1CP/1DP, 1CG/1DG, 1IB/1JB, 1IF/1JF), frais réels (1CK/1DK), salaires exonérés (1CC/1DC, 1CE/1DE, 1CD/1DD, 1IH/1JH, 1PD/1PE), pensions (1CS/1DS, 1CT/1DT, 1CI/1DI, 1CZ/1DZ, 1CO/1DO, 1CM/1DM, 1CH/1DH).

Règle déjà connue : chaque personne à charge a son propre abattement de 10 % (plancher 509 €, plafond 14 555 €) ou ses frais réels ; l'abattement de 10 % des pensions (plafond 4 439 €) est commun au foyer. Prérequis de test sur le simulateur : 1CK/1CE exigent 1CJ/1CC.

### Priorité 2 — cadre 7 courant

- Frais de garde des enfants de moins de 6 ans : 7GA, 7GB, 7GC ; en résidence alternée 7GE, 7GF, 7GG. Prérequis : autant d'enfants nés après le 1.1.2019 que de cases.
- Frais de scolarité (nombre d'enfants, pas un montant) : collège 7EA/7EB, lycée 7EC/7ED, supérieur 7EF/7EG. 7EB, 7ED, 7EG = enfants en résidence alternée.
- Cotisations syndicales : 7AC, 7AE, 7AG.
- Prestations compensatoires : 7WN, 7WO, 7WM (7WN exige 7WO ; 7WM ≥ 7WN).
- Dons aux partis politiques : 7UH. Report ESUS : 7DC.

### Priorité 3 — cadre 3

- Plus-values en report (art. 150-0 B ter) : 3WN, 3XN, 3WP, 3WR, 3WS, 3WT. Le simulateur exige 3WP avec 3WN/3XN, et 3WN avec 3WR/3WS/3WT.
- Plus-values du 14.11 au 31.12.2012 : 3WI (24 %), 3WJ (19 %).
- Plus-values au quotient : RVG/NVG, RUA/NUA, RSG, RSL. Prérequis : 2OP cochée ; RUA exige RSL ou RVA ; NVG/NUA = 4.

### Priorité 4 — 4BC et cadre 8

- 4BC (déficit foncier imputable sur le revenu global) : aujourd'hui seulement lu dans la 2044, pas saisissable dans la 2042.
- Crédits d'entreprise ou agricoles (exigent un revenu BIC/BA, ex. 5KC ou 5HC) : 8TB, 8TC, 8TS, 8TG, 8TO, 8TP, 8WK, 8UZ, 8CV, 8WA, 8WC, 8WR, 8WT, 8WH, 8UY.
- Réductions reportées : 8PY, 8PZ.

### Priorité 5 — gros volume, usage rare

- Cadre 5, régimes réels et déficits (94) : 5AQ 5AY 5BQ 5BY 5CU 5CV 5DK 5DM 5EK 5EM 5FK 5FM 5JA 5JB 5JC 5JD 5JE 5JF 5JP 5JQ 5JR 5JV 5JW 5JX 5JY 5LK 5MB 5MC 5ME 5MF 5MJ 5MN 5MO 5MP 5MQ 5MU 5MV 5MX 5MY 5MZ 5OT 5PA 5PB 5PC 5PE 5PG 5PH 5PI 5PJ 5PK 5PL 5PM 5PN 5PO 5PP 5PQ 5PX 5SA 5SB 5SC 5SD 5SE 5SF 5SJ 5SL 5SX 5UT 5UY 5VA 5VB 5VC 5VE 5VF 5VH 5VM 5VQ 5VT 5VV 5VY 5WI 5WM 5XH 5XP 5XY 5YH 5YP 5YY 5ZA 5ZB 5ZH 5ZM 5ZO 5ZP 5ZY. Beaucoup sont des colonnes « 3e personne » (J, M, P, S, V, Z) de cases déjà gérées pour les deux déclarants.
- Investissements outre-mer (96) : HGS à HYJ (familles HG, HH, HI, HJ, HK, HL, HO, HU, HV, HY).
- Reste du cadre 7 (2042-RICI) : fait en huit sous-lots (6a à 6h, voir le tableau ci-dessus), puis 7US.

Les 703 codes avec leur libellé officiel : Annexe — 703 cases.

## Point 2 — taux de PS de l'assurance-vie hors module fiscalité

Tranché le 17 nov. 2026 : on garde 17,2 % hors fiscalité. La LFSS 2026 (loi n° 2025-1403 du 30 décembre 2025) laisse l'assurance-vie et la capitalisation hors de la hausse de CSG, comme les revenus fonciers, le PEL, le CEL et les plus-values immobilières. Le PER passe à 18,6 %. Le module fiscalité reste à 18,6 % pour l'assurance-vie, aligné sur le simulateur officiel 2026.

Commit `8fb9fe8`, poussé sur `main` : les taux écrits en dur sont remplacés par des constantes partagées. `AVFiscalInfo.tsx` affiche `AV_PS_RATE` (17,2 %) ; dans `transmissionHelpers.ts`, le PER lit `TAUX_PS_CAPITAUX_MOBILIERS` au lieu de `0.186` ; le commentaire de `TAUX_PS_ASSURANCE_VIE` signale l'écart volontaire. `params-retraite.json` reste à `0.172`. Écran non vu dans le navigateur.

## Consignes pour la nouvelle conversation

Traiter un lot à la fois : vérifier la règle sur le simulateur (il tranche en cas de doute, sans attendre de validation depuis le 18 nov. 2026) et dans le BOFiP, coder, ajouter le cas au test de non-régression sur les deux millésimes, mettre à jour `docs/fiscalite.md`, commiter. Demander seulement ce que le simulateur ne tranche pas (migration, périmètre).

### Où regarder dans le code

- Orchestration du calcul : `src/hooks/useFiscalOverview.ts` (fonction `simuler`).
- Règles pures : `src/lib/fiscalite/` (un fichier par cadre, tests colocalisés) ; saisies : `src/lib/fiscalite/types.ts`.
- Formulaires : `src/components/fiscalite/` ; accès Supabase : `src/services/*Service.ts` ; schéma : `supabase/migrations/`.
- Ne jamais lire en entier `src/integrations/supabase/types.ts` ni `docs/fiscalite.md` : grep puis lecture par plage.

### Comparer avec le simulateur officiel

1. Interroger le simulateur depuis le terminal avec `curl -X POST https://simulateur-ir-ifi.impots.gouv.fr/cgi-bin/calc-2026.cgi` (millésime 2026 = revenus 2025, celui d'Aurevia). Champs : `pre_situation_famille` (M/O/C/D/V), `pre_situation_residence=M`, `0DA`, `0DB`, enfants `0CF` + `0F0`…, puis les cases sans tiret bas (`1AJ=50000`). Réponse en ISO-8859-15 ; « Calcul impossible » = prérequis manquant. Le Python de la machine échoue en SSL : passer par curl.
2. Liste complète des cases : les champs `_XXX` de `https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/2026/complet/index.htm`. Le plafond épargne retraite 6PS s'envoie en `BPS`, avec `APS`, `CPS` et `DPS` à 0.
3. Côté Aurevia : un test Vitest temporaire (`// @vitest-environment jsdom`) qui appelle `useFiscalOverview` via `renderHook`, en simulant avec `vi.mock` (dans `vi.hoisted`) les hooks de données, `useAuth` et les services 2044/IFI. Comparer parts, RFR, revenu imposable, impôt net + CEHR et PS ; supprimer le fichier ensuite.
4. Tester chaque case seule sur une base fixe, puis dans un contexte réaliste avant de conclure : certaines cases ne montrent un écart qu'isolées (ex. 1BE sans 1BC, 5XT sans revenu agricole).

### À savoir

- Le simulateur 2027 (revenus 2026) sert de référence au seul millésime provisoire revenus 2026 ; il change le sens de certains codes (7UQ, frais réels 1AE) et applique encore le barème 2026 (loi de finances pour 2027 non promulguée).
- Le plafond épargne retraite se poste en APS/BPS/CPS/DPS (additionnés) ; 0XX et 3VH avec 3VG sont refusés en saisie simple.
- Typecheck : 0 erreur depuis `eb23a37` (18 nov. 2026). Lint : 50 `any` restants hors transmission et `src/utils` (hooks 14, sociétés 11, patrimoine 9, ui et autres 16). Erreurs `rules-of-hooks` de `ui/checkbox.tsx` et `ui/switch.tsx` corrigées (`7310ee9`).
- Les écritures en base passent par la MCP Supabase (projet `npypkocowjkszxtecxzq`) ; le projet était en pause et a été réactivé le 16 novembre 2026.
- Aucun compte de test Aurevia n'existe : l'inscription a échoué (domaines de test refusés, quota d'e-mails Supabase). Les écrans n'ont donc pas été vérifiés dans le navigateur.
