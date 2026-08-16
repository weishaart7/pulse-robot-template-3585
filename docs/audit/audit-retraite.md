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
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) (`trimestresCotisesEtAssimilesDepuisCarriere`, ajouté 2026-08-11, étendu au `micro_entrepreneur` le même jour) — `micro_entrepreneur` est désormais couvert : CA × (1 − abattement forfaitaire du sous-type) = revenu retenu, cumulé avec le revenu cotisé `employeur` de la même année civile avant division par le seuil (méthode vérifiée en primaire sur Légifrance, art. L613-7 CSS, cf. docs/audit/micro-entrepreneur-trimestres.md). Deux limites assumées restent documentées dans le fichier : (1) le sous-type d'activité (vente/service BIC/service BNC) n'est identifiable que par heuristique sur le texte libre du champ `employeur` — une période dont le libellé ne matche aucun mot-clé connu est silencieusement exclue (ni cotisée, ni comptée), sans repli sur un abattement par défaut ; (2) les taux d'abattement (`ABATTEMENT_MICRO_ENTREPRENEUR`) ne sont vérifiés que pour 2026, sans barème par année comme `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE` — à vérifier avant d'appliquer la fonction à des périodes où ces taux auraient pu différer. Fonction toujours non branchée dans `decoteSurTrimestres()` ni dans aucun écran à ce stade — ce sera l'objet d'un commit séparé.
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) — **règle du chômage non indemnisé implémentée le 2026-08-12** (`trimestresChomageNonIndemniseParAnnee()`), correction par rapport à la dette précédemment documentée ici : ce n'est PAS un mécanisme totalement séparé du chômage indemnisé, c'est le même ratio 50 jours = 1 trimestre (art. R351-12 CSS, vérifié en lecture primaire directe sur Légifrance), avec un plafond CUMULÉ SUR LA CARRIÈRE (pas annuel) qui limite la durée totale de non-indemnisé prise en compte : 1ʳᵉ période non indemnisée de la carrière → plafond 547 jours ET 6 trimestres au total ; périodes ultérieures → plafond 365 jours CHACUNE, uniquement si adjacente (aucun jour de vide) à une période de chômage indemnisé immédiatement précédente, sinon 0 trimestre. Ce plafond de carrière s'ajoute au plafond annuel 4/an déjà en place (les deux s'appliquent, cf. test dédié). Identification indemnisé/non-indemnisé par heuristique sur le texte libre du champ `employeur` (recherche de "NON INDEMNISÉ"/"NON-INDEMNISÉ", cf. `estChomageNonIndemnise()`) — aucun champ structuré n'existe en base (confirmé sur les données réelles de Titouan Weishaar : les libellés "CHÔMAGE" et "CHÔMAGE NON INDEMNISÉ" coexistent, tous deux `type_activite = 'chomage'` — cf. docs/audit/cartographie-trimestres-cotises.md §1.2). Absence du mot-clé = présumé indemnisé (comportement par défaut inchangé) ; le vrai statut peut différer du libellé RIS si celui-ci est atypique. Limites restant hors périmètre : extension du plafond à 5 ans (≥ 20 ans de cotisation et ≥ 55 ans à la cessation du revenu de remplacement) non implémentée, faute de calcul de durée de cotisation à une date précise disponible dans ce module ; adjacence testée strictement au jour près (un trou d'un jour dans les données ferait perdre l'intégralité d'une période ultérieure) — aucun cas de ce type observé à ce jour dans les données réelles examinées ; répartition de l'excédent de la première période (si son total brut dépasse 6 trimestres sur plusieurs années) retirée en priorité sur l'année la plus récente, choix arbitraire faute de précision du texte légal sur ce point.
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) — le filtrage des doublons régime/revenu du RIS (`estPeriodeRegimeDeBase()`, même mécanisme que `calculSAM.ts`) n'est appliqué qu'aux périodes `employeur`. Aucun doublon de ce type n'a été observé pour `chomage`/`maladie` dans les données réelles examinées lors de cette session, mais le cas n'est pas protégé si un tel doublon apparaissait (double-comptage de jours possible).
- [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) — le plafond de 4 trimestres/an est désormais combiné (cotisé + assimilé confondus par année civile), avec priorité aux trimestres **cotisés** en cas de dépassement combiné (décidée avec l'utilisateur le 2026-08-11). **Confirmé conforme à la règle officielle** (priorité cotisés en cas de dépassement du plafond combiné) — source : CFDT Retraités, citant les modalités d'attribution CNAV (« Les trimestres cotisés sont pris en priorité »), vérifiée le 2026-08-11.

**Synthèse — clôture de la phase 1 « trimestres cotisés/assimilés » (2026-08-11)** :
[calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) (`trimestresCotisesEtAssimilesDepuisCarriere`) est considérée suffisamment avancée pour cette session, dans le périmètre restreint défini en amont (docs/audit/cartographie-trimestres-cotises.md). État complet :

*Résolu et vérifié par source officielle* :
- Seuil de validation d'un trimestre cotisé (`SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`, 150 × SMIC horaire brut au 1ᵉʳ janvier, barème 2018-2026 dérivé de SMIC officiels).
- Seuils de conversion en trimestres assimilés pour le chômage **indemnisé** (50 jours, circulaire CNAV n° 2020-25) et la maladie/AT avec IJ (60 jours).
- Filtrage des doublons régime/revenu du RIS pour les périodes `employeur` (`estPeriodeRegimeDeBase()`).
- Plafond de 4 trimestres/an **combiné** cotisé + assimilé, avec priorité cotisés en cas de dépassement (confirmée conforme à la règle CNAV).
- `micro_entrepreneur` : abattement forfaitaire CA → revenu retenu par sous-type d'activité (71 % vente BIC / 50 % service BIC / 34 % service BNC), vérifié en lecture primaire directe sur Légifrance (art. L613-7 CSS) — cf. docs/audit/micro-entrepreneur-trimestres.md. Revenu retenu cumulé avec le cotisé `employeur` de la même année avant division par le seuil et application du plafond combiné.
- Chômage **non indemnisé** : même ratio de conversion que l'indemnisé (50 jours), mais plafond cumulé sur la carrière (547 jours/6 trimestres pour la première période, 365 jours par période ultérieure adjacente), vérifié en lecture primaire directe sur Légifrance (art. R351-12 CSS).
- [calcul.ts](src/lib/retraite/calcul.ts) (`ageLegalPourGeneration`, ajouté 2026-08-12) — barème d'âge légal par génération (62 ans avant 09/1961, progression trimestrielle jusqu'à 62 ans 9 mois pour 1963, 64 ans à partir de 1969). Barème et sources fournis par l'utilisateur (info-retraite.fr, lassuranceretraite.fr, service-public.gouv.fr, document RH), corroborés par une recherche complémentaire confirmant la réalité de la suspension LFSS 2026 (loi n° 2025-1403 du 30 décembre 2025) — pas une vérification primaire menée par cette session comme pour les barèmes précédents. La zone d'instabilité (générations 1964-1968) renvoie une indétermination explicite (`{ stable: false; raison: string }`) plutôt qu'une valeur numérique — union discriminée qui empêche par construction TypeScript la lecture silencieuse d'un âge fabriqué, cf. docstring de `AgeLegalResultat` pour le raisonnement du choix de design. Fonction isolée, non branchée.

*Explicitement hors périmètre, documenté comme tel* :
- Sous-type micro-entrepreneur non identifiable depuis le libellé du champ `employeur` (heuristique par mot-clé, même limitation que `classifierTypeActivite()`) : la période est silencieusement exclue plutôt que de deviner un abattement. Aucun champ structuré dédié n'existe en base.
- Abattements micro-entrepreneur (`ABATTEMENT_MICRO_ENTREPRENEUR`) vérifiés pour 2026 uniquement, sans barème par année.
- Chômage **non indemnisé** implémenté (2026-08-12, art. R351-12 CSS vérifié en primaire) — extension du plafond à 5 ans non couverte (dépend d'un calcul de durée de cotisation à une date précise, indisponible), cf. entrée détaillée ci-dessus.
- Chronologie complète de surcote (date exacte d'acquisition de chaque trimestre) : non implémentée. Toutes les fonctions de calculTrimestres.ts produisent des totaux annuels agrégés, pas des dates précises par trimestre — une vraie chronologie demanderait de déterminer, à l'intérieur d'une même année où plusieurs trimestres sont validés, lesquels tombent avant et après la date de franchissement de l'âge légal, pour cotisé/chômage indemnisé/chômage non indemnisé/micro-entrepreneur simultanément avec leurs plafonds et priorités déjà en place. Ce serait un changement de nature du module (simulation trimestre par trimestre plutôt que comptage annuel), pas une extension. Gain limité au cas assez spécifique d'un client continuant à travailler après le taux plein ; l'approximation retenue pour le branchement de la surcote (excédent de trimestres cotisés au-delà du requis, sans vérifier la date d'acquisition) reste raisonnable dans la majorité des cas. Cette infrastructure serait réutilisable pour l'extension à 5 ans du chômage non indemnisé (actuellement aussi en dette), qui a besoin d'une durée de cotisation à une date précise — mais ce n'est pas jugé suffisant pour justifier de la construire par anticipation, sans cas client concret qui le réclame.
- Âge légal par génération : implémenté (`ageLegalPourGeneration()`, cf. entrée détaillée ci-dessus), mais avec une zone d'instabilité assumée (générations 1964-1968, LFSS 2026) et une granularité mensuelle limitée à la seule année 1961 — pas de reconstitution des âges gelés trimestre par trimestre au sein de la zone instable.
- Fonction **non branchée** dans `decoteSurTrimestres()` ni `minimumContributif()` — aucun calcul de pension ne la consomme. Elle EST désormais utilisée dans un écran ([Carriere.tsx](src/components/retraite/Carriere.tsx), 2026-08-12), mais uniquement comme indicateur d'écart affiché à titre de contrôle, jamais comme source de calcul — cf. entrée détaillée ci-dessous.

**Indicateur de cohérence RIS ↔ carrière saisie (2026-08-12)** — [Carriere.tsx](src/components/retraite/Carriere.tsx), section « Détail de carrière ». `retraite_data.trimestres_valides` (lu depuis le RIS importé, source officielle CNAV) reste et doit rester la **seule source de vérité** pour tout calcul de pension (`tauxProratisation()`, `decoteSurTrimestres()`, `minimumContributif()`, pension de base, décote/surcote, total consolidé) : cette session ne modifie et ne remplace `trimestres_valides` nulle part. La raison de ce choix n'est pas seulement historique (« c'était déjà comme ça ») : un conseiller en gestion de patrimoine a une confiance justifiée dans la lecture d'un RIS officiel (document CNAV consolidé, tous régimes, sans les limites heuristiques ci-dessous), alors que `retraite_carriere_detail` est une saisie manuelle (ou une réédition du même RIS ligne par ligne, potentiellement incomplète ou fautive) et que `trimestresCotisesEtAssimilesDepuisCarriere()` elle-même a des limites documentées et assumées (sous-type micro-entrepreneur non identifiable par heuristique, distinction indemnisé/non-indemnisé par heuristique sur texte libre, extension à 5 ans du chômage non indemnisé non implémentée, arrondis `floor()` par année). Un total dérivé plus fiable que le RIS n'est donc structurellement pas garanti par construction — en faire une source concurrente aurait été une erreur, pas seulement une prudence excessive.

Ce que l'indicateur fait concrètement : calcule `trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere).total` (mémoïsé) et compare l'écart absolu avec `trimestres_valides` à un seuil de tolérance de **4 trimestres** (`SEUIL_ECART_COHERENCE_TRIMESTRES`, Carriere.tsx) — l'équivalent d'une seule année civile, choisi car chacune des limites listées ci-dessus peut à elle seule décaler le résultat de quelques trimestres sur une année donnée (ex. une seule période micro-entrepreneur au libellé atypique non reconnue, ou un léger désaccord d'arrondi) sans que cela signale une carrière réellement incomplète. Sous ce seuil : confirmation discrète (icône verte, texte "Cohérent avec la carrière saisie"). Au-delà : avertissement explicite (encadré, icône, les deux chiffres, invitation à vérifier que la carrière est complète) — jamais un blocage, jamais une correction automatique. Cas réel Titouan Weishaar vérifié : écart nul (28 = 28, coïncidence entre deux sources indépendantes, pas un résultat recherché).

Limite de test assumée : aucune infrastructure de test de rendu de composants n'existe dans ce dépôt (pas de `@testing-library/react`, environnement vitest en `node` et non `jsdom`, aucun fichier `*.test.tsx`) — les tests ajoutés portent sur le calcul sous-jacent (`trimestresCotisesEtAssimilesDepuisCarriere()` appliqué au cas réel et à un cas synthétique d'écart), pas sur le rendu JSX (icône, couleur, texte) de l'indicateur lui-même, qui reste vérifié uniquement par relecture de code.

**Constat additionnel** (non signalé par un commentaire, identifié par l'audit) : incohérence entre `trimestresRequis` figé à `172` dans `Carriere.tsx:40` (`useState<number>(172)`, jamais recalculé) alors que `trimestresRequisPourGeneration()` existe et est utilisée correctement dans [Trimestres.tsx:145](src/components/retraite/Trimestres.tsx). Pour un utilisateur dont la génération n'exige pas 172 trimestres, la carte « Carrière » et l'onglet « Optimisation » peuvent afficher deux valeurs différentes de trimestres requis pour la même personne.

**Pipeline de pension consolidée dupliqué — Synthese.tsx (2026-08-15).** [pensionConsolidee.ts](src/lib/retraite/pensionConsolidee.ts) (consommé par [usePensionConsolidee.ts](src/hooks/usePensionConsolidee.ts) pour l'écran Synthèse) reproduit fidèlement le pipeline de calcul du régime général + fonction publique + CNAVPL aujourd'hui codé en ligne dans [Carriere.tsx](src/components/retraite/Carriere.tsx) (lignes ~307-732) et dans le corps de [CarriereFonctionPublique.tsx](src/components/retraite/CarriereFonctionPublique.tsx)/[CarriereCNAVPL.tsx](src/components/retraite/CarriereCNAVPL.tsx). Décision explicite de cette session (validée avec l'utilisateur) : ne PAS refactorer Carriere.tsx pour consommer cette nouvelle fonction dans l'immédiat, par prudence sur un écran déjà en production — l'extraction et le branchement de Synthèse sont traités comme un chantier isolé, la fusion des deux implémentations comme un chantier séparé à venir. **Conséquence assumée et à ne pas perdre de vue** : `pensionConsolidee.ts` et le pipeline inline de `Carriere.tsx` sont deux implémentations parallèles du même calcul — tout correctif futur sur l'un (barème, ordre d'application MICO/surcote, nouveau régime) doit être répercuté manuellement sur l'autre, sous peine de voir l'onglet Carrière et l'onglet Synthèse afficher des montants divergents pour la même personne. À fusionner dans un chantier dédié (faire consommer `pensionConsolidee.ts` par Carriere.tsx et les composants FP/CNAVPL, au lieu de dupliquer) — non planifié à ce jour.

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

---

## 7. Audit de conformité au référentiel — [docs/retraite-base-referentiel.md](docs/retraite-base-referentiel.md) (2026-08-12)

> Audit statique READ-ONLY, réalisé le 2026-08-12. Objectif : comparer le moteur de calcul et les
> écrans du module Retraite tel qu'il existe aujourd'hui (§1 à §6 ci-dessus) aux règles posées par
> le référentiel `docs/retraite-base-referentiel.md`, qui intègre l'art. 105 de la LFSS 2026
> (décalage de calendrier pour les générations 1964-1968) par rapport aux sources Fidroit
> d'origine. Aucun fichier de code n'a été modifié. Périmètre couvert par le référentiel et donc
> par cet audit : retraites de **base** uniquement (régime général, SSI, CNAVPL, CNBF, fonction
> publique titulaires/contractuels, artistes-auteurs) — les complémentaires ne sont comparées que
> lorsque le référentiel les traite comme condition d'un paramètre de base (ex. RAFP).

### 7.1. Tableau de synthèse

| # | Écart | Fichier(s) / ligne(s) | Référentiel | Sévérité |
|---|---|---|---|---|
| 1 | Trimestres requis génération 1958 erronés (166 au lieu de 167) | [calcul.ts:28](src/lib/retraite/calcul.ts) | §2.1.1, §2.1.2 | **Majeure** |
| 2 | Aucune notion de « date d'effet de la pension » — un seul barème appliqué, jamais celui antérieur pourtant opposable | [calcul.ts:27-38](src/lib/retraite/calcul.ts) | §2.1.3 | **Majeure** |
| 3 | Génération 1965 non scindée (découpage au 1er avril non modélisé) | [calcul.ts:27-34](src/lib/retraite/calcul.ts) | §2.1.1, §12.3 | **Majeure** |
| 4 | Écran « Carrière » n'applique jamais la règle d'âge (decoteSurAge) — seule Trimestres.tsx le fait | [Carriere.tsx:161-176](src/components/retraite/Carriere.tsx) vs [Trimestres.tsx:147-149](src/components/retraite/Trimestres.tsx) | §2.1.4, §2.2.1, §2.2.3 | **Majeure** |
| 5 | Surcote non conforme : excédent brut de trimestres, sans vérifier âge légal dépassé ni exclure les trimestres assimilés | [calcul.ts:149-158](src/lib/retraite/calcul.ts), [Carriere.tsx:171](src/components/retraite/Carriere.tsx), [CarriereCNAVPL.tsx:60-65](src/components/retraite/CarriereCNAVPL.tsx) | §2.3.1, §2.5 | **Majeure** |
| 6 | Surcote parentale absente (tous régimes) | — (aucune fonction) | §2.3.2, §5.4, §7.4 | **Majeure** |
| 7 | Majoration pour 3 enfants ou plus absente (tous régimes) | — (aucune fonction) | §3.8, §5.4, §7.6 | **Majeure** |
| 8 | Minimum garanti fonction publique (MIGA) : formule linéaire au lieu du barème par palier | [calculFonctionPublique.ts:84-87](src/lib/retraite/calculFonctionPublique.ts) | §7.5 | **Majeure** |
| 9 | ~~MICO palier 1 : bascule de dénominateur non implémentée~~ **corrigé**, pour les 3 régimes de base modélisés par l'app (RG/aligné, CNAVPL, fonction publique) — un régime de base non modélisé (agricole non-salarié, étranger) resterait hors du total | [calcul.ts](src/lib/retraite/calcul.ts) (`minimumContributif()`), [Carriere.tsx](src/components/retraite/Carriere.tsx) | §3.5.3 | Moyenne → **clos** (limite résiduelle documentée) |
| 10 | ~~MICO majoré (palier 2) et écrêtement non implémentés~~ **corrigé**, avec une limite documentée : l'exemple 6 du référentiel (polypensionné Cas 2) n'est pas reproduit littéralement, faute de distinction cotisé/assimilé pour la fonction publique/CNAVPL (sous-évaluation prudente) | [calcul.ts](src/lib/retraite/calcul.ts) (`majorationPalier2MICO`, `ecretementMICO`) | §3.5.4, §3.5.5 | Moyenne → **clos (limite résiduelle documentée)** |
| 11 | SAM : ~~années sans trimestre validé~~ **corrigé** (critère 1) ; ~~année de la date d'effet~~ **paramètre ajouté, non branché** (critère 2) ; années uniquement assimilées et années de rachat **toujours non exclues** (critères 3 et 4, dette documentée) | [calculSAM.ts](src/lib/retraite/calculSAM.ts) (`anneesExclues()`) | §3.4.4 | Moyenne → **partiellement clos** |
| 12 | ~~Décote fonction publique figée à 1,25 %/trimestre~~ **corrigé** : barème par palier (2011→2015+) branché via un champ déclaratif « année d'ouverture des droits », défaut 1,25 % préservé si non renseigné | [calculFonctionPublique.ts](src/lib/retraite/calculFonctionPublique.ts) (`tauxDecoteParTrimestreFonctionPublique`) | §7.3 | Moyenne → **clos** |
| 13 | ~~Majoration enfants~~ implémentée et branchée depuis (commit `252c331`) ; **supplément NBI : `supplementNBI()` implémentée et testée, volontairement non branchée à l'écran** — décision produit en attente (modèle de données SRE/CNRACL absent de l'app) | [calculFonctionPublique.ts](src/lib/retraite/calculFonctionPublique.ts) (`supplementNBI`, non appelée depuis un composant) | §7.6 (clos), §7.7.1 (implémenté, non branché) | Moyenne → **partiellement clos** |
| 14 | ~~Valeur du minimum garanti traitée comme acquise, sans avertissement~~ — **clos** : valeur 2025 confirmée retenue, avertissement en commentaire de code et à l'écran (commit `355e4c9`) | [calculFonctionPublique.ts:69-87](src/lib/retraite/calculFonctionPublique.ts), [CarriereFonctionPublique.tsx:362-366](src/components/retraite/CarriereFonctionPublique.tsx) | §7.5, §11.8 | Faible → **clos** |
| 15 | ~~`MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 = 9075.50`~~ **corrigé à 9075.48** | [calcul.ts:574](src/lib/retraite/calcul.ts) | §3.5.2, §11.3 | Faible → **clos** |
| 16 | ~~Double comptage RAFP possible à l'import RIS~~ **corrigé** : RAFP ajouté à `RE_REGIME_SAISIE_MANUELLE`, exclu du panier `regimesPoints` comme CNAVPL/SRE/CNRACL | [regimesSaisieManuelle.ts:25-26](src/lib/retraite/regimesSaisieManuelle.ts) | §7.1, §8 (table des régimes) | Moyenne → **clos** |

### 7.2. Détail des écarts majeurs

**#1 — Trimestres requis génération 1958 erronés.**
`TRIMESTRES_REQUIS_PAR_GENERATION` ([calcul.ts:27-34](src/lib/retraite/calcul.ts)) place la borne à `{ anneeMax: 1958, trimestres: 166 }` : `trimestresRequisPourGeneration(1958)` retourne donc 166. Or le référentiel, aussi bien pour le calendrier LFSS 2026 (§2.1.1 : « 1955-1957 → 166 », « 1958-1960 → 167 ») que pour le calendrier 2023 encore opposable jusqu'au 31/08/2026 (§2.1.2, mêmes valeurs), place 1958 à **167** trimestres. La borne de 166 doit s'arrêter à 1957, pas 1958. Toute personne née en 1958 obtient un nombre de trimestres requis erroné, ce qui fausse `tauxProratisation`, `decoteSurTrimestres` et donc la pension affichée pour cette génération entière.

**#2 — Absence de la date d'effet de la pension comme paramètre de calcul.**
Le référentiel structure tout le §2.1 autour d'une règle de bascule explicite (§2.1.3) : trois jeux de paramètres coexistent selon que la pension prend effet avant le 01/09/2023, entre le 01/09/2023 et le 31/08/2026, ou à compter du 01/09/2026 — la durée de 171 trimestres (né en 1964) ou 172 (né en 1965) « reste opposable » à un départ avant le 01/09/2026. Recherche exhaustive (`dateEffet`, `date_effet`, « 1er septembre 2026 ») : aucune variable ni paramètre de ce type n'existe dans `src/lib/retraite/` ni dans les composants. Le moteur applique **inconditionnellement** le barème post-suspension ([calcul.ts:27-34](src/lib/retraite/calcul.ts), commentaire lignes 11-19 assumant explicitement « les générations 1964 et 1965 (…) restent gelées à 170 trimestres pendant la suspension »). Un utilisateur souhaitant simuler un départ avant le 01/09/2026 (encore possible pour un conseil rendu aujourd'hui, 12/08/2026) obtiendrait un nombre de trimestres requis faux pour sa génération.

**Addendum du 2026-08-13** ([implementation-sam-exclusions.md](implementation-sam-exclusions.md)) : le travail Sessions A/B ([implementation-date-effet-moteur.md](implementation-date-effet-moteur.md), [implementation-date-effet-ui.md](implementation-date-effet-ui.md)) a introduit une vraie date d'effet, mais **uniquement pour l'écran [Trimestres.tsx](src/components/retraite/Trimestres.tsx)** ; `implementation-date-effet-ui.md` §1 classe explicitement le point d'entrée du calcul SAM (`calculerSAM()` via `RISImportDialog.tsx`) en catégorie « Interne », non touché. Confirmé lors de la vérification #11 : `RISImportDialog.tsx:41` appelle toujours `calculerSAM(detailCarriere, anneeNaissance)` sans aucun paramètre de date. **#2 reste donc ouvert pour le flux RIS/SAM en particulier**, indépendamment de sa résolution partielle sur Trimestres.tsx — ce constat ne rouvre pas le reste de #2/#3, il précise seulement l'état d'un flux non couvert par les sessions précédentes.

**#3 — Génération 1965 non scindée.**
Conséquence directe du point précédent, mais distincte dans sa cause : même à barème post-LFSS 2026 fixé, `TRIMESTRES_REQUIS_PAR_GENERATION` attribue 170 trimestres à toute l'année 1965 (`anneeMax: 1965`), alors que le référentiel (§2.1.1) distingue explicitement « 01/01–31/03/1965 → 170 » et « 01/04–31/12/1965 → 171 ». Neuf mois sur douze de la génération 1965 reçoivent donc une valeur fausse. Le fichier documente lui-même cette simplification comme assumée (lignes 21-25 : « cet outil (…) ne connaît pas le mois de naissance ») — mais le référentiel qualifie explicitement ce type de raisonnement « par année de naissance » de **majeur**, pas de simplification mineure (§12.3 : « Un moteur qui raisonne uniquement par année de naissance produira des résultats faux pour cette génération »).

**#4 — La carte « Carrière » ignore la règle d'âge.**
Le référentiel (§2.2.1) impose de retenir le **plus petit** des deux comptages (trimestres manquants vs trimestres d'écart d'âge par rapport à 67 ans), et (§2.1.4/§2.2.3) qu'un assuré ayant atteint 67 ans a droit au taux plein automatiquement, quel que soit son nombre de trimestres. `decoteApplicable(decoteSurTrimestres, decoteSurAge)` existe et est correctement utilisée dans [Trimestres.tsx:147-149](src/components/retraite/Trimestres.tsx) et [Trimestres.tsx:187-189](src/components/retraite/Trimestres.tsx). Mais l'écran principal [Carriere.tsx:171](src/components/retraite/Carriere.tsx) appelle uniquement `decoteSurTrimestres(...)`, sans jamais calculer ni comparer `decoteSurAge`. Un utilisateur de 67 ans ou plus n'ayant pas tous ses trimestres verrait donc une décote appliquée à tort dans la carte « Carrière » — avec un effet en cascade sur le MICO, puisque `minimumContributif()` ([Carriere.tsx:335-339](src/components/retraite/Carriere.tsx)) exclut toute pension avec `decote < 0`, alors que cette même personne serait en réalité à taux plein et éligible.

**#5 — Surcote non conforme.**
Le référentiel (§2.3.1) pose des conditions strictes à la surcote : avoir dépassé l'âge légal **et** réuni la durée requise ; seuls les trimestres « à la charge de l'assuré » (cotisations, pas les trimestres assimilés — chômage, maladie, invalidité sont explicitement exclus, §2.5) comptent, plafonnés à 4/an, sur une période de référence précisément délimitée. Dans le code, `decoteSurTrimestres()` ([calcul.ts:149-158](src/lib/retraite/calcul.ts)) retourne une valeur positive dès que `trimestresValides > trimestresRequis`, sans aucune de ces vérifications — ni condition d'âge, ni distinction cotisé/assimilé. Utilisée telle quelle dans [Carriere.tsx:171](src/components/retraite/Carriere.tsx) et [CarriereCNAVPL.tsx:60-65](src/components/retraite/CarriereCNAVPL.tsx). La fonction `trimestresCotisesEtAssimilesDepuisCarriere()` qui distingue cotisé/assimilé existe ([calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts)) mais reste explicitement non branchée dans aucun calcul de pension (confirmé par le fichier lui-même, lignes 18-21) — l'écart n'est donc pas hypothétique, il est documenté comme tel des deux côtés (code et référentiel).

**#6 et #7 — Surcote parentale et majoration pour 3 enfants absentes.**
Aucune fonction ni aucun champ de saisie (nombre d'enfants, trimestres de majoration de durée d'assurance) n'existe nulle part dans `src/lib/retraite/` ni dans les composants, pour aucun régime. Le référentiel documente ces deux majorations pour le régime général (§2.3.2, §3.8), le CNAVPL (§5.4) et la fonction publique (§7.6) — avec en particulier un effet de bord explicitement signalé comme « contre-intuitif à tester » (§2.3.2 : sous le barème LFSS 2026, les générations 1964 et 1965-T1 perdent l'accès à la surcote parentale car leur âge légal repasse sous 63 ans). Absence totale, pas de sous-implémentation partielle.

**#8 — Minimum garanti fonction publique (MIGA) : formule fausse au-delà de 15 ans de services.**
`minimumGaranti()` ([calculFonctionPublique.ts:84-87](src/lib/retraite/calculFonctionPublique.ts)) calcule `MINIMUM_GARANTI_PLAFOND_ANNUEL × (trimestresLiquidables / trimestresRequis)` — une simple règle de trois. Le référentiel (§7.5) prévoit un barème par **palier**, non linéaire au-delà de 15 ans de services : 57,5 % de la valeur de référence pour les 15 premières années, +2,5 points par année de 15 à 30 ans, +0,5 point par année de 30 à 40 ans, 100 % à 40 ans et plus. Seul le cas « moins de 15 ans » correspond effectivement à une règle de trois, cas que le code traite correctement par coïncidence. Exemple vérifiable avec les chiffres du référentiel : pour 35 ans de services (140 trimestres sur 168 requis), le référentiel calcule `57,5% + (15×2,5) + (5×0,5) = 97,5%` soit environ 1 217 €/mois (valeur 2025) ; le code linéaire donnerait `140/168 = 83,3%`, soit un montant sous-évalué d'environ 15 points de pourcentage — non négligeable pour toute carrière fonction publique de 15 ans et plus, qui est le cas le plus fréquent en pratique (peu de fonctionnaires liquident avec moins de 15 ans de services hors invalidité).

### 7.3. Détail des écarts moyens

**#9 — MICO palier 1, bascule de dénominateur (clos, avec limite résiduelle documentée).** Constat mis à jour le 2026-08-14, cf. [implementation-mico-polypensionne.md](implementation-mico-polypensionne.md) pour le diagnostic complet. Le référentiel (§3.5.3) prévoit deux cas : si le total de trimestres tous régimes est inférieur ou égal à la durée requise, le dénominateur est la durée requise ; s'il la dépasse, le dénominateur devient le total tous régimes (« Cas 2 »), avec l'exemple explicite « dénominateur 174, non 172 » pour un total de 174 trimestres. Avant cette session, `minimumContributif()` ne recevait que `trimestresRequis` comme diviseur, jamais remplacé.

- **Recherche d'une donnée « total tous régimes »** : la piste RIS page 2 seule (`trimestresValides`) ne couvre que le régime général et les régimes alignés — insuffisante seule, comme pressenti. Une seconde source, déjà présente dans `Carriere.tsx` (state `trimestresCNAVPL`/`trimestresLiquidablesFP`, déjà combiné ailleurs dans le même fichier pour un calcul voisin), a permis de construire `trimestresTousRegimes` sans nouvelle collecte de données.
- **Implémenté** : `minimumContributif()` reçoit un paramètre optionnel `trimestresTousRegimes` ([calcul.ts](src/lib/retraite/calcul.ts)) ; le Cas 1 est inchangé, le Cas 2 bascule le dénominateur quand ce total dépasse `trimestresRequis`. Branché dans `Carriere.tsx` avec le total des trois régimes de base modélisés par l'app (régime général/aligné + CNAVPL si actif + fonction publique si actif).
- **Limite résiduelle** : un régime de base non modélisé par cet outil (MSA agricole non-salarié, régime étranger) reste absent de ce total — un polypensionné dans un tel régime resterait à tort au Cas 1. Les régimes complémentaires par points (Agirc-Arrco, RAFP) sont, eux, correctement hors de ce total : ils n'ont structurellement pas de trimestres.

**#10 — MICO majoré et écrêtement non implémentés (clos, limite résiduelle documentée).** Déjà identifié comme dette technique assumée dans le code lui-même ([calcul.ts:212-215](src/lib/retraite/calcul.ts) avant correction) et dans la section 5 de ce document. Confirmé comme écart réel vis-à-vis du référentiel §3.5.4 (palier 2, condition des 120 trimestres cotisés) et §3.5.5 (plafond global de pensions 1 410,89 €/mois en 2026).

Corrigé le 2026-08-15 (cf. [implementation-mico-majore.md](implementation-mico-majore.md) pour le diagnostic et l'implémentation complets) : `majorationPalier2MICO()` et `ecretementMICO()`, fonctions séparées de `minimumContributif()` (logique du palier 1 non modifiée). Trimestres cotisés dérivés de `trimestresCotisesEtAssimilesDepuisCarriere()` (déjà utilisée pour la surcote, écart #5) — exclut nativement assimilés et MDA, rachats et AVPF/AVA non modélisés donc non comptés (approximation prudente : ne peut que sous-compter, jamais accorder à tort le seuil de 120). Nouveau champ déclaratif « autres pensions perçues » pour l'écrêtement, sur le modèle du champ #12.

**Limite résiduelle assumée** : l'exemple 6 du référentiel (polypensionné, Cas 2, dénominateur bascule à 171) n'est pas reproduit à sa valeur littérale (137 €) — cette valeur exigerait un total de trimestres cotisés **tous régimes confondus**, une donnée que cet outil ne peut pas calculer pour un polypensionné fonction publique/CNAVPL (aucune distinction cotisé/assimilé pour ces régimes, contrairement au régime général). L'implémentation retenue (trim_cotisés scopé au régime général/aligné, seule donnée disponible) sous-évalue la majoration dans ce cas précis, dans le même sens prudent que les autres approximations déjà documentées ci-dessus — jamais une sur-évaluation. Détail complet et démonstration arithmétique dans le rapport dédié.

**#11 — SAM : années à exclure, partiellement filtrées (partiellement clos).** Constat mis à jour le 2026-08-13, cf. [implementation-sam-exclusions.md](implementation-sam-exclusions.md) pour le diagnostic complet et le détail de l'implémentation. Le référentiel (§3.4.4) exclut des 25 (ou N) meilleures années : les années n'ayant validé aucun trimestre, l'année de la date d'effet de la pension, les années ne comportant que des périodes assimilées (hors IJ maternité), et les années comportant un rachat de trimestres. Avant cette session, `calculerSAM()` ne filtrait que les périodes hors régime de base (doublons Agirc-Arrco), sur aucun des quatre critères.

- **Critère 1 (année sans trimestre validé) : corrigé.** Nouvelle fonction `anneesExclues()` ([calculSAM.ts](src/lib/retraite/calculSAM.ts)), dérivée de `trimestresCotisesEtAssimilesDepuisCarriere()` (déjà disponible, écarts #5/#6), exclut du pool de sélection toute année où `cotises + assimiles === 0`.
- **Critère 2 (année de la date d'effet) : paramètre disponible, non branché.** `calculerSAM(periodes, anneeNaissance, dateEffet?)` exclut l'année de `dateEffet` si fournie — mais **aucun appelant actuel ne dispose d'une date d'effet réelle à ce point du parcours** : `RISImportDialog.tsx:41` appelle `calculerSAM(detailCarriere, anneeNaissance)` sans date, et le travail Sessions A/B (date d'effet) a explicitement laissé ce point d'entrée non touché (catégorie « Interne », cf. addendum à l'écart #2 ci-dessus). Le filtre reste donc inactif en pratique.
- **Critère 3 (année uniquement assimilée, hors IJ maternité) : non implémenté, dette documentée.** Aucune donnée de ce dépôt ne permet de distinguer une IJ de congé maternité d'une maladie/chômage ordinaire (`TypeActivite` ne connaît pas de catégorie maternité) — décision explicite de ne pas exclure plutôt que de risquer d'exclure à tort une maternité.
- **Critère 4 (année de rachat) : non implémenté, dette documentée.** Aucune donnée n'existe nulle part dans ce dépôt pour détecter un rachat sur une période de carrière (le seul « rachat » du dépôt est une simulation éphémère non persistée dans `Trimestres.tsx`) — nécessite une décision produit et une migration de schéma (`retraite_carriere_detail.type_activite` n'a pas de valeur « rachat » dans son CHECK), hors périmètre d'un simple filtre de calcul.

Une année à revenu nul ou très faible sans aucune activité assimilée (le cas le plus net du référentiel) est donc désormais correctement exclue ; les cas plus ambigus (assimilé seul, rachat) restent un écart ouvert, documenté plutôt que corrigé à l'aveugle.

**#12 — Décote fonction publique : taux figé sans barème par année d'ouverture des droits (clos).** Le référentiel (§7.3) distingue le taux de décote selon l'année d'ouverture des droits (0,75 % en 2011 jusqu'à 1,25 % à partir de 2015), millésime figé indépendant de la date de liquidation. `decoteSurAgeFonctionPublique()` ([calculFonctionPublique.ts:58-67](src/lib/retraite/calculFonctionPublique.ts), avant correction) appliquait `1.25` en dur, sans paramètre d'année ni commentaire signalant l'hypothèse (à la différence du reste du module, où ce type de simplification est systématiquement documenté en tête de fonction). Impact pratique limité aujourd'hui (les droits ouverts avant 2015 sont marginaux pour un outil utilisé en 2026) mais absence de garde-fou.

Corrigé le 2026-08-15 (cf. [implementation-rafp-decote-fp.md](implementation-rafp-decote-fp.md) Partie 2 pour le détail) : nouvelle fonction pure `tauxDecoteParTrimestreFonctionPublique(anneeOuvertureDroits?: number)` implémentant le barème à 5 paliers du référentiel, et nouveau paramètre optionnel `tauxParTrimestre = 1.25` sur `decoteSurAgeFonctionPublique()` (défaut inchangé, aucune régression pour un utilisateur qui ne renseigne pas le champ). Année d'ouverture des droits saisie via un nouveau champ déclaratif optionnel dans `CarriereFonctionPublique.tsx`, sur le modèle des autres champs de saisie fonction publique déjà locaux — pas de calcul automatique de cette donnée (jugée non triviale par le référentiel lui-même), conformément à la décision de conception retenue pour ce correctif. Découverte annexe vérifiée à cette occasion et **non retenue comme écart** : l'âge d'annulation de la décote (67 sédentaire / 62 active / 57 super-active, référentiel §7.3) était déjà un champ de saisie libre, pas une valeur unique supposée dans le code.

**#13 — Majoration enfants (réglé) ; supplément NBI fonction publique (toujours absent).** Constat mis à jour le 2026-08-13, sans code modifié dans cette session — vérification uniquement.

- **Volet majoration enfants (§7.6) : clos.** `majorationEnfantsFonctionPublique()` ([calculFonctionPublique.ts:182-187](src/lib/retraite/calculFonctionPublique.ts)), implémentée pour l'écart #7 (cf. [implementation-majoration-enfants.md](implementation-majoration-enfants.md)), est désormais branchée sur l'écran : appelée à [CarriereFonctionPublique.tsx:190](src/components/retraite/CarriereFonctionPublique.tsx) et affichée à [CarriereFonctionPublique.tsx:375-377](src/components/retraite/CarriereFonctionPublique.tsx). Le branchement (absent au moment de `implementation-majoration-enfants.md`, qui le documentait explicitement comme hors périmètre §5) a été fait par le commit `252c331` (« brancher la majoration pour 3 enfants sur les trois pensions »). La dette technique documentée dans ce même rapport (filtrage `enfant_adopte` pour la branche « enfant recueilli sans filiation », §4) reste ouverte mais est hors périmètre de l'écart #13 tel que formulé par cet audit — elle ne rouvre pas ce volet.
- **Volet NBI (§7.7) : `supplementNBI()` implémentée et testée le 2026-08-15, volontairement non branchée à l'écran.** Historique : le référentiel (§7.7, avant le 2026-08-15) ne donnait qu'une description générale de la NBI, sans formule — insuffisant pour coder. Une première session de recherche a trouvé et sourcé la formule officielle, citée verbatim depuis Légifrance (Décret n° 2003-1306 du 26 décembre 2003, art. 28, régime CNRACL) — `supplément_NBI = moyenne_annuelle_NBI_revalorisée × trimestres_liquidables_de_perception × (75% / durée_requise_taux_plein)`, sans seuil minimal de perception — documentée dans [docs/retraite-base-referentiel.md §7.7.1](../retraite-base-referentiel.md#771-supplément-de-pension-nbi--formule-sourcée), avec une réserve explicite : le texte trouvé régit la CNRACL, son application au SRE n'étant confirmée que par des sources secondaires.

  **Diagnostic complémentaire (2026-08-15, avant tout code)** : confirmé que le module fonction publique de Pulse traite « fonction publique » comme un régime générique unique — `hasFonctionPublique` est un booléen sans aucune distinction structurelle SRE/CNRACL nulle part (état, props, calculs). La réserve CNRACL/SRE de la formule NBI devenait donc un choix produit (appliquer partout avec avertissement vs. modéliser un champ versant/régime pour restreindre), pas un détail technique — soumis explicitement à l'utilisateur avant de coder, conformément à la consigne de la mission.

  **Décision retenue** : implémenter `supplementNBI()` comme fonction pure (référentiel §7.7.1, testée sur le cas CNRACL, 0 trimestre, plafond 75 %/durée requise, proportionnalité — cf. [implementation-nbi.md](implementation-nbi.md) §6), avec la réserve CNRACL/SRE portée explicitement dans la docstring du code, mais **différer le branchement à l'écran** tant que le modèle de données ne permet pas d'identifier le régime du client — recherche complémentaire de l'utilisateur confirmant que le droit à supplément NBI existe aussi côté SRE, mais que sa formule de liquidation exacte n'est, elle, pas confirmée par un texte cité avec certitude (nuance entre « droit existant » et « formule vérifiée »). Deux champs déclaratifs proposés pour la future saisie (moyenne annuelle NBI, trimestres de perception NBI) mais non ajoutés à l'écran dans cette session — détail complet, y compris le reste à faire, dans [implementation-nbi.md](implementation-nbi.md) §3 et §8.

  L'écart #13 reste donc « partiellement clos » : volet majoration enfants réglé, volet NBI désormais implémenté et testé au niveau fonction pure, mais pas encore branché — bloqué non plus par l'absence de formule, mais par une décision de modélisation de données restant à trancher.

**#16 — Double comptage RAFP possible à l'import RIS (clos).** Constat ajouté le 2026-08-15, en suite du signalement en aparté fait en clôturant la correction du double comptage fonction publique/RIS ([correction-double-comptage-fp-ris.md](correction-double-comptage-fp-ris.md), qui notait déjà « comme CNAVPL et RAFP, une saisie manuelle » sans le formaliser comme écart). Corrigé le 2026-08-15, même session, cf. [implementation-rafp-decote-fp.md](implementation-rafp-decote-fp.md) Partie 1 pour le détail de la correction et des tests.

- **Mécanisme.** `RE_REGIME_SAISIE_MANUELLE` ([regimesSaisieManuelle.ts:25-26](../../src/lib/retraite/regimesSaisieManuelle.ts)) exclut du panier générique `regimesPoints` uniquement `cnavpl`, `sre`, `cnracl`, « service des retraites de l'état » et « collectivités locales » — **RAFP n'y figure pas**. Or `parseRegimesDepuisTexte()` ([parseRIS.ts:167-231](../../src/lib/retraite/parseRIS.ts)) extrait génériquement tout bloc « Total des points » de la page « Mes régimes » du RIS, sans liste blanche de noms : un bloc RAFP (régime complémentaire par points de tout fonctionnaire, présent sur un RIS réel aux côtés de SRE/CNRACL) y est détecté comme un régime `type: 'points'` ordinaire. `handleValidateRIS()` ([Carriere.tsx:396,415](../../src/components/retraite/Carriere.tsx)) ne filtrant pas ce nom, ce bloc RAFP importé atterrit dans `regimesPoints` et contribue à `totalPensionComplementaireAnnuelle` ([Carriere.tsx:453-456](../../src/components/retraite/Carriere.tsx)).
- **Second circuit RAFP, indépendant.** `CarriereFonctionPublique.tsx` a son propre champ de saisie manuelle « Points RAFP déjà accumulés » (`pointsRAFP`, [CarriereFonctionPublique.tsx:97](../../src/components/retraite/CarriereFonctionPublique.tsx)), jamais alimenté par le RIS — confirmé par recherche exhaustive : aucune des deux fonctions de callback vers `Carriere.tsx` (`onResultChange`, transmettant `rafpAnnuelle`) n'est appelée depuis `handleValidateRIS()`. Ce montant RAFP calculé manuellement entre dans `pensionTotaleFonctionPublique` ([Carriere.tsx:572](../../src/components/retraite/Carriere.tsx), affiché « fonction publique (pension + RAFP) » à [Carriere.tsx:826](../../src/components/retraite/Carriere.tsx)) — même fonction pure `pensionComplementaireAnnuelle()` que le premier circuit, appelée séparément.
- **Point de collision.** `pensionTotaleConsolidee = pensionTotaleRegimeGeneral + pensionTotaleFonctionPublique + pensionTotaleCNAVPL` ([Carriere.tsx:576-577](../../src/components/retraite/Carriere.tsx)), où `pensionTotaleRegimeGeneral = pensionBaseAjustee + totalPensionComplementaireAnnuelle` ([Carriere.tsx:571](../../src/components/retraite/Carriere.tsx)). Un utilisateur qui importe un RIS contenant un bloc RAFP **et** renseigne également le champ « Points RAFP » de la carte fonction publique (parcours normal pour un fonctionnaire, ce champ n'étant jamais auto-rempli) verrait sa pension RAFP annuelle comptée deux fois dans `pensionTotaleConsolidee` — une fois via `totalPensionComplementaireAnnuelle`, une fois via `pensionTotaleFonctionPublique`.
- **Risque actif, pas théorique.** Contrairement à une hypothèse à vérifier, les deux conditions nécessaires sont toutes deux confirmées existantes dans le code actuel : (1) le parsing générique du RIS qui n'exclut pas RAFP (vérifié ci-dessus), et (2) le champ de saisie manuelle RAFP indépendant dans `CarriereFonctionPublique.tsx` (vérifié ci-dessus). Seule la survenue conjointe des deux saisies (RIS + carte dédiée) côté utilisateur est incertaine — mais c'est précisément le scénario que le référentiel de conception de l'app attend pour un fonctionnaire consultant son RIS (cf. commentaire [Carriere.tsx:386-395](../../src/components/retraite/Carriere.tsx) qui présente déjà cette saisie manuelle comme le parcours normal pour RAFP).
- **Portée de l'impact.** Limité à l'affichage `pensionTotaleConsolidee` / `pensionTotaleRegimeGeneral` (pension complémentaire), pas aux trimestres, à la décote, au MICO ni au taux de proratisation — à la différence du double comptage FP/trimestres corrigé le 2026-08-14, dont l'effet se propageait à `trimestresValides` et donc à tout le calcul de base. Sévérité retenue : Moyenne (montant affiché faussé, mais périmètre plus restreint que #9 avant correction).
- **Correction appliquée** : `rafp` ajouté (borné `\b`) au motif `RE_REGIME_SAISIE_MANUELLE`, même mécanisme que la correction SRE/CNRACL du 2026-08-14. Tests de non-régression et de scénario ajoutés dans [regimesSaisieManuelle.test.ts](../../src/lib/retraite/regimesSaisieManuelle.test.ts) — détail complet dans [implementation-rafp-decote-fp.md](implementation-rafp-decote-fp.md).

### 7.4. Détail des écarts faibles

**#14 — Valeur du minimum garanti non confirmée (clos).** Constat mis à jour le 2026-08-13, sans code modifié dans cette session — vérification uniquement. Le référentiel signale explicitement (§7.5, §11.8) que la valeur « environ 1 366,35 € en 2026 » de l'indice majoré 227 revalorisé « est à vérifier auprès du SRE, la revalorisation étant fonction des pensions » et que « les valeurs circulant dans la presse spécialisée ne sont pas des sources opposables » (§12.2 point 5). Réglé par le commit `355e4c9` (« minimum garanti fonction publique — barème par palier (écart audité) ») :

- Le code retient la valeur **2025 confirmée** (`VALEUR_REFERENCE_MIGA_MENSUELLE_2025 = 1248.33`, [calculFonctionPublique.ts:86](src/lib/retraite/calculFonctionPublique.ts)), pas la valeur 2026 non sourcée — avec un commentaire explicite justifiant ce choix ([calculFonctionPublique.ts:69-86](src/lib/retraite/calculFonctionPublique.ts)) : « la valeur 2026 (…) n'est volontairement pas retenue ici (…) à vérifier auprès du SRE (…) donc non confirmée par une source opposable ».
- L'incertitude est également **affichée à l'écran**, pas seulement documentée en code : [CarriereFonctionPublique.tsx:362-366](src/components/retraite/CarriereFonctionPublique.tsx) affiche « Minimum garanti calculé sur la valeur de référence 2025 (1 248,33 €/mois, indice majoré 227) — la valeur 2026 n'est pas encore confirmée par une source opposable. »

Les deux conditions de clôture posées par le constat initial (valeur non certaine paramétrée + avertissement) sont donc remplies — pas seulement la première.

**#15 — Arrondi du MICO non majoré (clos).** `MINIMUM_CONTRIBUTIF_NON_MAJORE_2026` valait `9075.50` ([calcul.ts:574](src/lib/retraite/calcul.ts)) contre 9 075,48 € exactement (756,29 €/mois × 12, §3.5.2 et §11.3 du référentiel) — écart de 2 centimes, sans impact pratique. Corrigé le 2026-08-14 (cf. [implementation-mico-polypensionne.md](implementation-mico-polypensionne.md)) ; six assertions de test déjà codées en dur avec l'ancienne valeur recalculées en conséquence, sans changement de comportement attendu.

### 7.5. Points du référentiel hors périmètre actuel de l'outil, non comptés comme écarts

Le référentiel couvre des régimes et mécanismes que l'outil ne traite pas du tout aujourd'hui (SSI hors alignement CNAVPL implicite via `calcul.ts`, CNBF, artistes-auteurs, RMC, agents contractuels/IRCANTEC en tant que tel — seul le régime général sous-jacent est couvert). Ces absences ne sont pas listées comme écarts individuels : elles relèvent d'un périmètre produit non défini plutôt que d'une non-conformité à une règle que l'outil prétendrait implémenter. Signalé ici pour mémoire, à arbitrer avec l'équipe si l'un de ces régimes devient prioritaire.

### 7.6. Ce qui est conforme (vérifié, pas supposé)

Pour éviter de ne lister que des écarts : plusieurs points structurants du référentiel sont correctement implémentés et méritent d'être actés comme tels.

- **Asymétrie taux/prorata du régime général (§3.3)** : `tauxProratisation()` n'est appelée dans [Carriere.tsx:150](src/components/retraite/Carriere.tsx) qu'avec les trimestres régime général (`trimValides`), alors que `decoteSurTrimestres()` ([Carriere.tsx:171](src/components/retraite/Carriere.tsx)) est appelée avec la somme tous régimes (`trimValides + trimAutresRegimes`) — c'est exactement la règle « le taux s'apprécie tous régimes confondus, le prorata au seul régime général » que le référentiel qualifie d'« asymétrie centrale à ne pas manquer ».
- **CNAVPL sans prorata (§5.3)** : `pensionBaseCNAVPL()` ([calculCNAVPL.ts](src/lib/retraite/calculCNAVPL.ts)) ne comporte volontairement aucun coefficient de proratisation, conformément à la règle « aucune proratisation de type régime général » — le commentaire du fichier explicite d'ailleurs correctement le risque inverse (double pénalisation).
- **Barème de validation des trimestres (§2.4.1, §11.2)** : `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE` ([calculTrimestres.ts:42-52](src/lib/retraite/calculTrimestres.ts)) reproduit exactement les montants 2018-2026 du référentiel (150 × SMIC horaire), y compris la valeur 2026 de 1 803 €.
- **Ordre revalorisation puis plafonnement du SAM (§3.4.2)** : `calculerSAM()` applique le coefficient de revalorisation CNAV avant le plafonnement PASS ([calculSAM.ts:136-144](src/lib/retraite/calculSAM.ts)), avec un commentaire explicite sur l'importance de cet ordre — conforme à la mécanique décrite au référentiel.
- **Valeur du point CNAVPL 2026** : `VALEUR_POINT_CNAVPL_2026 = 0.6599` (CarriereCNAVPL.tsx) correspond exactement à la valeur 2026 du référentiel (§5.3, §11.6).
