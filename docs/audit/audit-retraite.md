# Audit — Retraite

> Audit statique READ-ONLY (lecture de code + migrations SQL uniquement, aucune navigation en
> base ni en interface), réalisé le 2026-08-11 sur la branche `main`. Objectif : décrire
> précisément l'existant du module Retraite pour préparer une comparaison avec un référentiel
> externe. Aucun fichier n'a été modifié. Toute information non trouvée dans le code est indiquée
> explicitement comme telle plutôt que devinée.

## Périmètre — inventaire des fichiers

**Page / conteneur**
- [RetraiteSection.tsx](src/pages/retraite/RetraiteSection.tsx) — conteneur à onglets (Synthèse / Carrière / Épargne retraite / Optimisation)

**Composants (`src/components/retraite/`)**
- [Synthese.tsx](src/components/retraite/Synthese.tsx) — stub non implémenté
- [Carriere.tsx](src/components/retraite/Carriere.tsx) — écran principal (SAM, trimestres, import RIS, régimes à points)
- [CarriereFonctionPublique.tsx](src/components/retraite/CarriereFonctionPublique.tsx) — sous-carte fonction publique
- [CarriereCNAVPL.tsx](src/components/retraite/CarriereCNAVPL.tsx) — sous-carte CNAVPL (professions libérales non réglementées)
- [RISImportDialog.tsx](src/components/retraite/RISImportDialog.tsx) — vérification/correction des données extraites d'un RIS
- [Trimestres.tsx](src/components/retraite/Trimestres.tsx) — onglet affiché « Optimisation » (simulation d'âge de départ + rachat de trimestres — nom de fichier incohérent avec le libellé affiché, cf. §6)
- [EpargneRetraite.tsx](src/components/retraite/EpargneRetraite.tsx) — agrégation PER/assurance-vie depuis le module Patrimoine

**Hooks**
- [useRetraiteData.ts](src/hooks/useRetraiteData.ts) — CRUD table `retraite_data`
- [useCarriereDetail.ts](src/hooks/useCarriereDetail.ts) — CRUD table `retraite_carriere_detail`

**Logique métier (`src/lib/retraite/`)**
- [calcul.ts](src/lib/retraite/calcul.ts) (307 lignes) — moteur régime général
- [calculSAM.ts](src/lib/retraite/calculSAM.ts) (186 lignes) — calcul du salaire annuel moyen
- [calculCNAVPL.ts](src/lib/retraite/calculCNAVPL.ts) (38 lignes) — pension CNAVPL
- [calculFonctionPublique.ts](src/lib/retraite/calculFonctionPublique.ts) (99 lignes) — pension fonction publique + minimum garanti
- [parseRIS.ts](src/lib/retraite/parseRIS.ts) (432 lignes) — extraction/parsing du PDF RIS (pdf.js)
- [dureeSAMParGeneration.ts](src/lib/retraite/dureeSAMParGeneration.ts) (34 lignes) — barème durée SAM
- [coefficientsRevalorisationCNAV.ts](src/lib/retraite/coefficientsRevalorisationCNAV.ts) (16 lignes) — coefficients de revalorisation

**Types** : non trouvé — aucun `types.ts` dédié. Les types (`RegimeDetecte`, `PeriodeCarriere`, `TypeActivite`, `TypeRegime`, `ParseRISResult`) sont définis directement dans `parseRIS.ts`. Aucun `src/types/retraite*`.

**Migrations SQL**
- `supabase/migrations/20250920211158_2626080e-fbba-4c0a-b002-670603dccc35.sql` — création `retraite_data` (table partagée avec d'autres domaines dans le même fichier de migration)
- `supabase/migrations/20260630000001_fk_user_id_to_auth_users.sql` — ajoute la FK `retraite_data.user_id → auth.users(id)` (lignes 32-34)
- `supabase/migrations/20260714000000_add_regimes_points_to_retraite_data.sql` — ajoute `regimes_points jsonb`
- `supabase/migrations/20260722000000_create_retraite_carriere_detail.sql` — création `retraite_carriere_detail` (FK `user_id` dès la création)

Aucun edge function Supabase dédié, aucun `src/services/retraite*`, aucune autre variante de nommage (`pension`, `retirement`, `carriere`) trouvée hors de ce qui précède.

---

## 1. Modèle de données

### Table `retraite_data`

Créée dans `20250920211158_...sql` (lignes 2-13), complétée par `20260714000000...sql`.

| Champ | Type | Statut |
|---|---|---|
| `id` | uuid PK | utilisé — [useRetraiteData.ts](src/hooks/useRetraiteData.ts) |
| `user_id` | uuid, FK `auth.users` | utilisé — filtre RLS + requêtes |
| `salaire_annuel_moyen` | numeric | utilisé — saisie + calcul pension de base dans [Carriere.tsx](src/components/retraite/Carriere.tsx) |
| `trimestres_valides` | integer | utilisé — [Carriere.tsx](src/components/retraite/Carriere.tsx), [Trimestres.tsx](src/components/retraite/Trimestres.tsx) |
| `trimestres_requis` | integer, défaut 172 | **ORPHELIN** — colonne jamais lue ni écrite en TS. `Carriere.tsx:40` maintient en parallèle un `useState<number>(172)` totalement déconnecté de cette colonne |
| `epargne_per` | numeric | **ORPHELIN** — jamais lu/écrit ; `EpargneRetraite.tsx` recalcule le total PER en direct depuis `assets` (module Patrimoine) via `useAssets()`, sans passer par cette colonne |
| `epargne_assurance_vie` | numeric | **ORPHELIN** — même constat, total assurance-vie recalculé à la volée depuis `assets` |
| `autres_epargnes` | numeric | utilisé — seul champ épargne réellement lu/écrit, dans [EpargneRetraite.tsx](src/components/retraite/EpargneRetraite.tsx) |
| `regimes_points` | jsonb, défaut `[]` (ajouté 2026-07-14) | utilisé — `Carriere.tsx`, `Trimestres.tsx` (liste de `RegimeDetecte[]`) |
| `created_at` / `updated_at` | timestamptz | gérés par trigger `update_retraite_data_updated_at` |

### Table `retraite_carriere_detail`

Créée dans `20260722000000...sql`. Tous les champs sont utilisés (lus/écrits) dans [useCarriereDetail.ts](src/hooks/useCarriereDetail.ts) : `employeur`, `type_activite` (CHECK `employeur|chomage|maladie|micro_entrepreneur`), `date_debut`, `date_fin`, `revenu`, `est_chiffre_affaires`, `regimes` (text[]). Aucun champ orphelin identifié sur cette table.

### Données saisies mais jamais persistées (distinct des colonnes orphelines)

En plus des colonnes DB orphelines ci-dessus, plusieurs champs saisis à l'écran ne sont **jamais écrits en base**, y compris via `regimes_points` ou une autre colonne :

- Dans [Carriere.tsx](src/components/retraite/Carriere.tsx) (lignes 46-60), `hasFonctionPublique`/`trimestresLiquidablesFP` et `hasCNAVPL`/`trimestresCNAVPL` sont remontés en state (lifted state) vers le parent mais **absents de l'objet `updates`** dans `handleSave` (lignes 176-190), qui ne contient que `salaire_annuel_moyen`, `trimestres_valides`, `regimes_points`.
- Dans [CarriereFonctionPublique.tsx](src/components/retraite/CarriereFonctionPublique.tsx) (lignes 70-74), `traitementIndiciaireBrut`, `pointsRAFP`, `departAnticipeCategorieActive`, `ageDepartAnticipe`, `ageAnnulationDecote` sont des `useState` purement locaux au composant.
- Dans [CarriereCNAVPL.tsx](src/components/retraite/CarriereCNAVPL.tsx) (lignes 46-49), `pointsCNAVPL` et `valeurPointCNAVPL` sont également purement locaux.

Conséquence : à chaque rechargement de page, toute saisie dans les cartes « Fonction publique » et « CNAVPL » est perdue (y compris les deux trimestres qui sont pourtant remontés au composant parent).

### Liens avec d'autres modules

- **Famille** : `Carriere.tsx` et `Trimestres.tsx` importent `familyService.getFamilyProfile()` (`src/services/familyService`) pour lire `date_naissance`, utilisée pour déterminer génération, trimestres requis et âge actuel. Lien uniquement applicatif — pas de FK SQL directe.
- **Patrimoine (assets)** : `EpargneRetraite.tsx` importe `useAssets()` et `NATURES_PER` ([src/constants/assetTypes.ts:321-325](src/constants/assetTypes.ts)) pour agréger en direct les actifs PER et assurance-vie du module Patrimoine (filtre sur `asset.nature`), sans passer par les colonnes orphelines `epargne_per`/`epargne_assurance_vie`.
- **Patrimoine (bareme669CGI)** : `Trimestres.tsx` importe `computeAge` de [src/lib/patrimoine/bareme669CGI.ts](src/lib/patrimoine/bareme669CGI.ts) (ligne 28) pour calculer l'âge actuel.
- **Sociétés** : aucun lien trouvé.
- Toutes les tables retraite sont rattachées à l'utilisateur uniquement via `user_id → auth.users(id)` (FK ajoutée le 2026-06-30) ; pas de FK vers `family_profiles` ni `assets`.

---

## 2. Logique de calcul

### [calcul.ts](src/lib/retraite/calcul.ts) — moteur régime général

| Fonction | Rôle |
|---|---|
| `trimestresRequisPourGeneration(anneeNaissance)` | trimestres requis pour le taux plein selon la génération |
| `tauxProratisation(trimestresValides, trimestresRequis)` | ratio de proratisation plafonné à 100% |
| `decoteSurTrimestres(trimestresValides, trimestresRequis)` | décote/surcote sur écart de trimestres, plafond -20% |
| `decoteSurTrimestresPlafond25(...)` | même mécanique, plafond -25% (fonction publique, CNAVPL) |
| `decoteSurAge(ageDepart, ageTauxPleinAuto=67)` | décote sur écart d'âge par rapport à 67 ans, plafond -20% |
| `decoteApplicable(decoteSurTrimestres, decoteSurAge)` | retient la décote la plus favorable |
| `pensionBase(sam, tauxProratisation, decote)` | pension de base = SAM × 50% × taux × (1+décote) |
| `pensionComplementaireAnnuelle(regime)` | pension à points = points × valeurPoint |
| `coutRachatTrimestre(age, revenuMoyen3Ans, option)` | coût d'un trimestre racheté (barème CNAV 2026) |
| `pointMort(coutTotal, gainPensionAnnuel)` | nombre d'années pour rentabiliser le rachat |

Paramètres en dur (aucun lu depuis Supabase/config) :
- `TRIMESTRES_REQUIS_PAR_GENERATION` (lignes 27-34) : 166 à 172 trimestres selon année de naissance (≤1958 à >1965)
- Taux de décote/surcote **1,25 %** par trimestre (lignes 58, 61, 79, 82, 100)
- Plafond décote régime général **-20 %** (lignes 58, 100) ; fonction publique/CNAVPL **-25 %** (ligne 79)
- `ageTauxPleinAuto = 67` (défaut, ligne 95)
- `tauxPlein = 0.5` (50%, ligne 120)
- `4` trimestres par année d'écart (ligne 99)
- Barèmes de rachat `BAREME_RACHAT_TAUX_SEUL` / `BAREME_RACHAT_TAUX_ET_DUREE` (lignes 161-259) : grilles par âge (20-66 ans), barème CNAV 2026
- `SEUIL_REVENU_BAS = 36045`, `SEUIL_REVENU_HAUT = 48060` (lignes 261-262)

### [calculSAM.ts](src/lib/retraite/calculSAM.ts)

| Fonction | Rôle |
|---|---|
| `estPeriodeRegimeDeBase(periode)` | filtre les périodes rattachées au régime de base |
| `repartirRevenuParAnnee(periode, revenuParAnnee)` | répartit le revenu d'une période au prorata des jours par année civile |
| `calculerSAM(periodes, anneeNaissance)` | calcule le SAM (moyenne des N meilleures années, revalorisées puis plafonnées) |

Paramètres en dur :
- `PASS_PAR_ANNEE` (lignes 19-28) : plafond annuel Sécurité sociale 2018→2025 (39732 → 47100 €)
- `AGE_DEPART_PAR_DEFAUT = 67` (ligne 42) — commentaire explicite : aucune logique d'âge de départ réellement calculée à partir de la date de naissance n'existe ailleurs dans le module
- `RE_REGIME_ASSURANCE_RETRAITE` (regex "assurance retraite", ligne 48)

### [coefficientsRevalorisationCNAV.ts](src/lib/retraite/coefficientsRevalorisationCNAV.ts)
- `COEFFICIENT_REVALORISATION_CNAV` (lignes 7-16) : coefficients 2018→2025 (1.181 → 1.009), en dur.

### [dureeSAMParGeneration.ts](src/lib/retraite/dureeSAMParGeneration.ts)

| Fonction | Rôle |
|---|---|
| `dureeSAMPourGeneration(anneeNaissance)` | nombre d'années retenues pour le SAM selon génération |

- `DUREE_SAM_PAR_GENERATION` (lignes 12-29) : 10 à 25 ans, en dur, barème salarié uniquement (indépendants ex-RSI explicitement non modélisés, lignes 6-10).

### [calculCNAVPL.ts](src/lib/retraite/calculCNAVPL.ts)

| Fonction | Rôle |
|---|---|
| `pensionBaseCNAVPL(points, valeurPoint, decoteOuSurcote)` | pension = points × valeurPoint × 1 (taux plein) × (1+décote/100) |

- `tauxLiquidationPlein = 1` en dur (ligne 36). La valeur du point CNAVPL 2026 (0,6599 €) n'est pas dans ce fichier lib mais codée en dur dans [CarriereCNAVPL.tsx:11](src/components/retraite/CarriereCNAVPL.tsx) (`VALEUR_POINT_CNAVPL_2026 = 0.6599`), pré-remplissage éditable à l'écran.

### [calculFonctionPublique.ts](src/lib/retraite/calculFonctionPublique.ts)

| Fonction | Rôle |
|---|---|
| `pensionBaseFonctionPublique(tib, tauxProratisation, decote)` | pension = TIB × 75% × taux × (1+décote) |
| `decoteSurAgeFonctionPublique(ageDepart, ageAnnulationDecote=67)` | décote sur âge, plafond -25% |
| `minimumGaranti(trimestresLiquidables, trimestresRequis)` | pension minimum garantie proratisée |
| `pensionFonctionPubliqueFinale(pensionCalculee, minimumGaranti)` | max des deux |

- `tauxPleinFonctionPublique = 0.75` (ligne 37)
- `ageAnnulationDecote = 67` (défaut, ligne 60)
- `4` trimestres/an, plafond `-25%` (lignes 65-66)
- `MINIMUM_GARANTI_PLAFOND_MENSUEL = 1366.35` €/mois, ×12 = `MINIMUM_GARANTI_PLAFOND_ANNUEL` (lignes 81-82)
- Valeur de service du point RAFP 2026 = `0.05671` en dur dans [CarriereFonctionPublique.tsx:25](src/components/retraite/CarriereFonctionPublique.tsx) (`VALEUR_SERVICE_POINT_RAFP_2026`), pas dans le fichier lib.

**Constat transversal** : contrairement à `src/lib/dmtg/`, qui externalise ses paramètres fiscaux dans `params-dmtg.json`, **le module retraite ne lit aucun paramètre depuis Supabase ou un fichier de config** — tous les barèmes, taux et plafonds sont en dur dans le code TS.

---

## 3. Écrans utilisateur

| Écran | Saisi par l'utilisateur | Calculé/affiché automatiquement |
|---|---|---|
| [RetraiteSection.tsx](src/pages/retraite/RetraiteSection.tsx) | — (conteneur d'onglets) | — |
| [Synthese.tsx](src/components/retraite/Synthese.tsx) | aucun champ | stub — texte « Cette section sera bientôt disponible » (ligne 16), écran non implémenté |
| [Carriere.tsx](src/components/retraite/Carriere.tsx) | salaire annuel moyen, trimestres validés, import PDF RIS | trimestres requis (172 en dur, non éditable), âge du taux plein (texte statique non calculé depuis la date de naissance — commentaire ligne 171), pension de base brute, décote/surcote, pension ajustée, total consolidé tous régimes |
| [CarriereFonctionPublique.tsx](src/components/retraite/CarriereFonctionPublique.tsx) (sous-carte) | case à cocher, TIB annuel, trimestres liquidables FP, points RAFP, départ anticipé catégorie active + 2 âges | taux de proratisation, décote, pension calculée, minimum garanti, pension finale, rente RAFP |
| [CarriereCNAVPL.tsx](src/components/retraite/CarriereCNAVPL.tsx) (sous-carte) | case à cocher, points CNAVPL, valeur du point (pré-remplie 0,6599 €), trimestres CNAVPL | décote/surcote, pension finale |
| [RISImportDialog.tsx](src/components/retraite/RISImportDialog.tsx) | édition post-extraction : nom de régime, trimestres ou points+valeur+date par régime, SAM proposé (éditable) | SAM estimé, nombre d'années projetées, année de départ hypothétique |
| [Trimestres.tsx](src/components/retraite/Trimestres.tsx) (onglet « Optimisation ») | âge de départ simulé (slider 60-70), régime de rachat, option de rachat, revenu moyen 3 ans, nombre de trimestres à racheter | trimestres projetés, trimestres requis, décote/surcote, pension totale, tableau comparatif 62-70 ans, coût du rachat, gain de pension, point mort |
| [EpargneRetraite.tsx](src/components/retraite/EpargneRetraite.tsx) | « autres épargnes retraite » uniquement | total PER, total assurance-vie, total épargne retraite global (lecture seule depuis Patrimoine, jamais persisté en base, recalculé à chaque rendu) |

---

## 4. Couverture de tests

**Aucun fichier de test ne couvre le module Retraite.** Recherche exhaustive (`*.test.ts`, `*.test.tsx`, `*.spec.ts`) sur l'ensemble du dépôt : les seuls tests existants concernent les modules `transmission`, `dmtg`, `family`, `patrimoine`, `societes`, `alertes`. Aucun fichier de test n'existe pour `src/lib/retraite/`, `src/components/retraite/`, `useRetraiteData.ts` ou `useCarriereDetail.ts`. Aucun `describe`/`it` à lister — couverture nulle, malgré une logique de calcul non triviale (décote/surcote multi-régimes, parsing PDF, calcul du SAM).

---

## 5. Dette technique et limites connues

Aucun `TODO`/`FIXME`/`HACK`/`XXX` littéral trouvé dans le module. Plusieurs commentaires documentent en revanche explicitement des simplifications ou limitations assumées :

- [calcul.ts:17-19](src/lib/retraite/calcul.ts) — « Barème à réviser si la suspension prend fin au 1er janvier 2028 (…) ou si une nouvelle réforme intervient d'ici là. »
- [calcul.ts:21-25](src/lib/retraite/calcul.ts) — « Simplification assumée : la réforme applique en réalité une granularité mensuelle sur certaines générations (…). Cet outil (…) retient une seule valeur par année civile. »
- [calcul.ts:145-147](src/lib/retraite/calcul.ts) — « NE PAS utiliser pour les professions libérales réglementées (CIPAV, CARMF, CARPIMKO, CAVEC…) : leur barème de rachat n'est pas public. »
- [calcul.ts:149-151](src/lib/retraite/calcul.ts) — « Source : moneyvox.fr, citant la circulaire CNAV n° 2026-04. À vérifier/réactualiser chaque année. »
- [calcul.ts:269-274](src/lib/retraite/calcul.ts) — cas limite <20 ans traité par borne basse ; >66 ans retourne `undefined` (documenté comme volontaire).
- [calculSAM.ts:35-40](src/lib/retraite/calculSAM.ts) — « Décidé le 2026-07-23 : à cette date, aucune logique d'âge de départ réellement calculée à partir de la date de naissance n'existe ailleurs dans le module Retraite (`ageTauxPlein` dans Carriere.tsx est un texte statique non relié à la date de naissance). »
- [dureeSAMParGeneration.ts:6-10](src/lib/retraite/dureeSAMParGeneration.ts) — « Simplification assumée : les travailleurs indépendants (ex-RSI) suivent en réalité un barème légèrement décalé (…) — ce module ne modélise que le barème salarié/régime général. »
- [parseRIS.ts:93-98](src/lib/retraite/parseRIS.ts) — heuristique de reconnaissance de nom de régime documentée comme « l'approximation la plus fiable sans dépendre d'une liste figée ».
- [parseRIS.ts:350-356](src/lib/retraite/parseRIS.ts) — « Tolérance multi-page NON VÉRIFIÉE sur un relevé réel (…) — à vérifier dès qu'un relevé avec un tableau réellement étalé sur plusieurs pages sera disponible. »
- [CarriereFonctionPublique.tsx:241-245](src/components/retraite/CarriereFonctionPublique.tsx) — « Saisie manuelle assumée : ces âges dépendent du corps précis de l'agent (catégorie active) (…). Aucune table de corps n'est encodée dans cet outil. »
- [Carriere.tsx:171-172](src/components/retraite/Carriere.tsx) — âge du taux plein affiché comme texte statique (« 67 ans (âge automatique du taux plein) ») avec commentaire « calculable avec date de naissance depuis fiche client » (non implémenté).
- [calcul.ts](src/lib/retraite/calcul.ts) (`minimumContributif`, ajouté 2026-08-11) — seule la version non majorée du minimum contributif est implémentée. Le MiCo majoré (carrière longue, 120 trimestres **cotisés** requis) n'est pas couvert : la distinction trimestres cotisés / trimestres assimilés n'existe pas encore dans le module, cf. dette déjà identifiée sur `decoteSurTrimestres()` ci-dessus (aucune donnée d'origine des trimestres n'est saisie ou modélisée).
- [calcul.ts](src/lib/retraite/calcul.ts) (`minimumContributif`, ajouté 2026-08-11) — l'écrêtement du MiCo (plafond de 1 410,89 €/mois pension de base + complémentaire cumulées) n'est pas implémenté. Dépend de la même distinction trimestres cotisés/assimilés que ci-dessus, non résolue.
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) (`trimestresCotisesEtAssimilesDepuisCarriere`, ajouté 2026-08-11) — **`micro_entrepreneur` explicitement exclu de cette fonction** (ni cotisé, ni assimilé, ni compté dans le total). Conséquence : pour tout client ayant une activité micro-entrepreneur significative, le total retourné **sous-estime** le nombre réel de trimestres — cette phase couvre uniquement `employeur`/`chomage`/`maladie` (cf. docs/audit/cartographie-trimestres-cotises.md, deux décisions explicitement laissées hors périmètre : conversion CA → assiette sociale, et barème d'abattement forfaitaire par sous-type BIC/BNC). Fonction non branchée dans `decoteSurTrimestres()` ni dans aucun écran à ce stade.
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) — **`type_activite = 'chomage'` ne distingue pas chômage indemnisé de chômage non indemnisé** (confirmé sur les données réelles de Titouan Weishaar : les libellés "CHÔMAGE" et "CHÔMAGE NON INDEMNISÉ" coexistent, tous deux `type_activite = 'chomage'` — cf. docs/audit/cartographie-trimestres-cotises.md §1.2). `trimestresCotisesEtAssimilesDepuisCarriere()` applique donc la règle du chômage **indemnisé** (`JOURS_PAR_TRIMESTRE_CHOMAGE = 50`, source service-public.gouv.fr / circulaire CNAV n° 2020-25) à toutes les périodes `chomage`, y compris non indemnisées — ce qui **surestime probablement** les trimestres assimilés pour les périodes de chômage non indemnisé, qui suivent en réalité des règles de plafonnement différentes (une durée totale sur l'ensemble de la carrière, pas un ratio jours/trimestre par période). Non résolu : nécessiterait un champ structuré distinguant les deux (cf. décisions non tranchées de la cartographie).
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) — le filtrage des doublons régime/revenu du RIS (`estPeriodeRegimeDeBase()`, même mécanisme que `calculSAM.ts`) n'est appliqué qu'aux périodes `employeur`. Aucun doublon de ce type n'a été observé pour `chomage`/`maladie` dans les données réelles examinées lors de cette session, mais le cas n'est pas protégé si un tel doublon apparaissait (double-comptage de jours possible).
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) — le plafond de 4 trimestres/an est désormais combiné (cotisé + assimilé confondus par année civile), avec priorité aux trimestres **cotisés** en cas de dépassement combiné (décidée avec l'utilisateur le 2026-08-11). **Confirmé conforme à la règle officielle** (priorité cotisés en cas de dépassement du plafond combiné) — source : CFDT Retraités, citant les modalités d'attribution CNAV (« Les trimestres cotisés sont pris en priorité »), vérifiée le 2026-08-11.

**Constat additionnel** (non signalé par un commentaire, identifié par l'audit) : incohérence entre `trimestresRequis` figé à `172` dans `Carriere.tsx:40` (`useState<number>(172)`, jamais recalculé) alors que `trimestresRequisPourGeneration()` existe et est utilisée correctement dans [Trimestres.tsx:145](src/components/retraite/Trimestres.tsx). Pour un utilisateur dont la génération n'exige pas 172 trimestres, la carte « Carrière » et l'onglet « Optimisation » peuvent afficher deux valeurs différentes de trimestres requis pour la même personne.

---

## 6. Comparaison architecturale avec Transmission / DMTG

Pattern observé dans `src/lib/dmtg/` et `src/lib/transmission/` : `types.ts` (types centralisés) + fonctions pures par fichier + `index.ts` (orchestrateur exposant l'API publique) + suite de tests co-localisée (`*.test.ts` à côté de chaque fichier source) + paramètres fiscaux externalisés en JSON pour dmtg (`params-dmtg.json`, versionné séparément du code).

**Le module retraite ne suit pas ce pattern** :
- Pas de `types.ts` — les types vivent dans `parseRIS.ts` (fichier de parsing, pas un fichier de types dédié).
- Pas de `index.ts` — chaque composant importe directement les fonctions depuis `calcul.ts`, `calculSAM.ts`, `calculCNAVPL.ts`, `calculFonctionPublique.ts` ; pas de point d'entrée unique.
- Pas de paramètres externalisés — tous les barèmes (trimestres requis, décote, PASS, coefficients CNAV, barème de rachat) sont en dur dans le TS, à l'inverse du choix fait pour dmtg avec `params-dmtg.json`.
- Pas de tests, alors que `dmtg` et `transmission` ont chacun une suite substantielle (`assets.test.ts`, `recall.test.ts`, `assurance-vie.test.ts` pour dmtg ; une douzaine de fichiers `*.test.ts` pour transmission, dont `goldenScenarios.test.ts`).

Les en-têtes de `calcul.ts` et `calculSAM.ts` mentionnent explicitement être « sur le modèle de `src/lib/patrimoine/bareme669CGI.ts` » (fonctions pures, sans JSX/state React) — un alignement partiel a donc été recherché au niveau du style de fonction pure, mais pas au niveau de l'organisation en package (types/index) ni de la couverture de test, contrairement à dmtg/transmission.

---

## Synthèse des écarts principaux vis-à-vis du pattern du projet

1. Aucune couverture de test sur un module de calcul non trivial (multi-régimes, décote/surcote, parsing PDF).
2. Pas de séparation `types.ts` / `index.ts`, contrairement à dmtg et transmission.
3. Paramètres réglementaires (barèmes, taux, plafonds) tous codés en dur en TS, dispersés entre `lib/retraite/` et des composants (`CarriereCNAVPL.tsx`, `CarriereFonctionPublique.tsx`), sans externalisation façon `params-dmtg.json`.
4. Colonnes DB orphelines (`trimestres_requis`, `epargne_per`, `epargne_assurance_vie`) et, à l'inverse, plusieurs champs saisis à l'écran (fonction publique, CNAVPL) jamais persistés — perte de données silencieuse au rechargement.
5. Incohérence de trimestres requis affichés entre `Carriere.tsx` (172 figé) et `Trimestres.tsx` (calcul dynamique par génération).
6. Écran « Synthèse » non implémenté (stub).
7. Âge du taux plein affiché comme texte statique (67 ans) plutôt que calculé depuis la date de naissance, alors que la donnée (`date_naissance` via `familyService`) est déjà consommée ailleurs dans le module pour d'autres calculs.
