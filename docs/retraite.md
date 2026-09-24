# Module Retraite

> Document consolidé le 2026-08-27, fusion de 25 fichiers d'audit/conception/implémentation
> produits entre le 2026-08-11 et le 2026-08-18 : `docs/audit/audit-retraite.md` (audit statique
> initial du 2026-08-11, complété in situ jusqu'au 2026-08-18 au fil des corrections),
> `docs/audit/comparatif-retraite.md` (comparatif à un référentiel externe sur un cas réel),
> `docs/audit/implementation-nbi.md`, `docs/audit/implementation-sam-exclusions.md`, et 21 documents
> archivés dans `docs/audit/archive/` (audits ponctuels, notes de conception, rapports
> d'implémentation et de correction — écarts #1 à #16 vis-à-vis de `docs/retraite-base-referentiel.md`).
> Contrairement aux modules Famille/Patrimoine, la plupart de ces documents avaient déjà été tenus à
> jour au fil des sessions (statuts « corrigé »/« clos » ajoutés directement dans `audit-retraite.md`
> au fur et à mesure) — la dette listée en §3 a néanmoins été revérifiée ligne à ligne contre le code
> et `git log` au 2026-08-27, en particulier les items encore décrits comme ouverts. Un seul écart
> restait mal classé : le double comptage fonction publique/CNAVPL (`docs/audit/archive/audit-fonction-publique-cnavpl.md`,
> 2026-08-15) a été entièrement soldé par les commits `4fe95d4`/`d3f5a99`/`aef0b17`, postérieurs à cet
> audit — reclassé en §2 comme correction historique. `docs/retraite-base-referentiel.md` (base de
> connaissance juridique externe) n'a pas été touché par cette fusion.

## 1. Vue d'ensemble

Le module Retraite calcule et simule la pension de retraite du client (et, depuis peu, de son
conjoint/partenaire) tous régimes confondus : régime général/aligné, fonction publique (SRE/CNRACL),
CNAVPL (professions libérales non réglementées), et régimes complémentaires par points
(Agirc-Arrco, RCI, RAFP). Il alimente une simulation de départ (âge/date de liquidation, décote/
surcote, rachat de trimestres) et une synthèse consolidée exportable en PDF.

**Écrans principaux** (onglets de `RetraiteSection.tsx`, route `/dashboard/retraite`) :

| Onglet | Composant | Rôle |
|---|---|---|
| Synthèse | [Synthese.tsx](src/components/retraite/Synthese.tsx) → `usePensionConsolidee` | Pension consolidée tous régimes, trimestres manquants, export PDF ([exportSyntheseRetraitePDF.tsx](src/lib/retraite/exportSyntheseRetraitePDF.tsx)) — plus un stub à l'origine (§2) |
| Carrière | [Carriere.tsx](src/components/retraite/Carriere.tsx) | Écran principal : SAM, trimestres, import RIS, sous-cartes fonction publique/CNAVPL, détail MICO/surcote/majoration par régime |
| — sous-carte | [CarriereFonctionPublique.tsx](src/components/retraite/CarriereFonctionPublique.tsx) | TIB, trimestres liquidables, RAFP, décote catégorie active, MIGA |
| — sous-carte | [CarriereCNAVPL.tsx](src/components/retraite/CarriereCNAVPL.tsx) | Points CNAVPL, valeur du point, décote/surcote |
| Épargne retraite | [EpargneRetraite.tsx](src/components/retraite/EpargneRetraite.tsx) | Agrégation PER/assurance-vie depuis le module Patrimoine ; colonnes Utilisateur/Conjoint via `getRepartitionFoyer` (part des tiers indivisaires et actifs non qualifiés exclus) |
| Optimisation (fichier `Trimestres.tsx`) | [Trimestres.tsx](src/components/retraite/Trimestres.tsx) | Simulation d'âge/date de départ, tableau comparatif 62-70 ans, rachat de trimestres |
| (dialog) | [RISImportDialog.tsx](src/components/retraite/RISImportDialog.tsx) | Vérification/correction des données extraites d'un RIS PDF |

**Tables Supabase** : `retraite_data` (une ligne par personne du foyer — colonne `personne`, ajoutée
le 2026-08-15 pour supporter le conjoint/partenaire, cf. commit `60b5fdd`), `retraite_carriere_detail`
(détail de carrière importé du RIS ou saisi à la main). Rattachées à l'utilisateur uniquement via
`user_id → auth.users(id) ON DELETE CASCADE` — pas de FK vers `family_profiles` ni `assets`, lien
uniquement applicatif via `familyService`.

**Flux clés** :
- **Import RIS** (`RISImportDialog.tsx`) : extraction PDF (`parseRIS.ts`, pdf.js) → régimes détectés
  (trimestres/points par régime) + détail de carrière ligne à ligne → SAM calculé automatiquement
  (`calculerSAM()`) → validation/correction par le conseiller → persistance dans `retraite_data` +
  `retraite_carriere_detail`.
- **Carrière** assemble, régime par régime (général, fonction publique, CNAVPL), la même séquence :
  pension de base → décote/surcote (classique + parentale) → étage minimum (MICO/MIGA si applicable)
  → majoration pour 3 enfants ou plus → total consolidé tous régimes. Auto-sauvegarde (debounce) vers
  Supabase.
- **Carrière et Synthèse** simulent un même scénario, « départ à l'âge légal », évalué à une date
  d'effet unique (cf. §2) et affichée à l'écran. Même pipeline (`calculerPensionConsolidee()`,
  unifié depuis le 2026-08-18) avec la projection d'une hypothèse de revenu futur du trimestre en
  cours jusqu'à cette date d'effet.
- **Optimisation** simule un scénario de date de liquidation (sélecteur de date, pas un slider d'âge
  depuis le 2026-08-13) avec le même moteur de décote/surcote, plus un simulateur de rachat de
  trimestres (coût, gain de pension, point mort) — sandbox non persistée.

## 2. Architecture & décisions

- **Moteur de calcul centralisé dans `src/lib/retraite/`**, fonctions pures sans JSX ni state React
  (en-têtes de `calcul.ts`/`calculSAM.ts` : « sur le modèle de `src/lib/patrimoine/bareme669CGI.ts` »).
  Fichiers pivots : [calcul.ts](src/lib/retraite/calcul.ts) (régime général — décote/surcote/MICO/
  majorations/barèmes de rachat/date d'effet), [calculSAM.ts](src/lib/retraite/calculSAM.ts) (salaire
  annuel moyen), [calculTrimestres.ts](src/lib/retraite/calculTrimestres.ts) (dérivation trimestres
  cotisés/assimilés depuis le détail de carrière), [calculFonctionPublique.ts](src/lib/retraite/calculFonctionPublique.ts),
  [calculCNAVPL.ts](src/lib/retraite/calculCNAVPL.ts), [parseRIS.ts](src/lib/retraite/parseRIS.ts)
  (extraction PDF), [pensionConsolidee.ts](src/lib/retraite/pensionConsolidee.ts) (assembleur unique
  consommé par Carrière et Synthèse depuis le 2026-08-18).
  **Contrairement à `dmtg`/`transmission`**, pas de `types.ts` ni `index.ts` dédiés (les types vivent
  dans `parseRIS.ts`), et aucun paramètre externalisé en JSON (tous les barèmes — trimestres requis,
  taux de décote, PASS, coefficients de revalorisation, seuils de validation de trimestre — sont en
  dur dans le TS, contrairement à `params-dmtg.json`). Écart d'architecture assumé, non corrigé à ce
  jour (§3).
- **Couverture de test — rattrapée depuis l'audit initial.** L'audit du 2026-08-11 constatait une
  couverture nulle sur ce module ; 10 fichiers `*.test.ts` co-localisés couvrent le
  moteur (`calcul.test.ts`, `calculSAM.test.ts`, `calculTrimestres.test.ts`, `calculFonctionPublique.test.ts`,
  `calculCNAVPL.test.ts`, `parseRIS.test.ts`, `pensionConsolidee.test.ts`, `hypotheseRevenuFutur.test.ts`,
  `enfantsEligiblesMajoration.test.ts`, `regimesSaisieManuelle.test.ts`) — 309 tests sur le module (`npx vitest run src/lib/retraite`). Rien côté rendu de composant (pas de
  `@testing-library/react`, environnement vitest en `node`) : la vérification visuelle des écrans
  reste manuelle, limite documentée dans quasiment chaque rapport de session.
- **Barème par génération : bascule par date d'effet, pas seulement par année de naissance
  (2026-08-12/13, commits `f3cb49a`…`f8cc5b2`).** `trimestresRequisPourGeneration()` et
  `ageLegalPourGeneration()` prennent désormais `{ annee, mois }` (pas seulement l'année), avec bascule
  de barème (`jeuBaremeApplicable(dateEffet)` : antérieur 2023 / calendrier 2023 / LFSS 2026) et
  découpages infra-annuels pour les générations 1951, 1961, 1965. La zone 1964-1968 est modélisée avec
  deux jeux de valeurs (`calendrier2023`/`lfss2026`) ; `ageLegalPourGeneration()` retourne une
  indétermination explicite (`{ stable: false }`) plutôt qu'une valeur devinée pour toute date d'effet
  antérieure au 01/09/2023. `Carriere.tsx` (proxy « aujourd'hui ») et `Trimestres.tsx` (sélecteur de
  date de liquidation, remplaçant un slider d'âge depuis le 2026-08-13) consomment ce même mécanisme.
- **Décote et surcote : deux mécanismes séparés, pas une seule fonction à deux signes.**
  `decoteSurTrimestres()`/`decoteSurTrimestresPlafond25()` (calcul.ts) ne portent plus que la décote
  (écrêtée à `Math.min(..., 0)` chez tous les appelants depuis le 2026-08-16, commit `c91d7d9`) ;
  `surcotePourTrimestresCotises()` (classique) et `surcoteParentale()` (option déclarative, case à
  cocher `au_moins_un_trimestre_majoration_enfant`) sont calculées séparément puis combinées par
  `surcoteTotale(..., cumulable)` — additive pour le régime général/CNAVPL, exclusive (la plus
  favorable) pour la fonction publique. Branchées sur les trois assembleurs de `Carriere.tsx` et sur
  `Trimestres.tsx` (commits `7ca6de0`, `946ca92`). `decoteApplicable()` retient le plus favorable de
  la décote-trimestres et de la décote-âge (`decoteSurAge()`) — appliqué sur `Carriere.tsx` depuis le
  2026-08-15 (commit `4d56af2`), pas seulement sur `Trimestres.tsx` comme initialement.
- **MICO à deux paliers + écrêtement (régime général uniquement, commits `c7cfbe1`, `dd21fb1`,
  `6b74008`).** `minimumContributif()` (palier 1) bascule son dénominateur sur le total tous régimes
  modélisés (régime général + CNAVPL + fonction publique, si actifs) quand celui-ci dépasse la durée
  requise. `majorationPalier2MICO()` (120 trimestres cotisés requis) et `ecretementMICO()` (plafond
  global de pensions) sont des fonctions séparées, composées par l'appelant plutôt qu'intégrées à
  `minimumContributif()` — pour ne prendre aucun risque sur cette dernière, déjà testée. Limite
  assumée : `trimestresCotisesEtAssimilesDepuisCarriere()` ne distingue cotisé/assimilé que pour le
  régime général (via `detailCarriere`) ; pour un polypensionné fonction publique/CNAVPL, le palier 2
  est calculé avec un `trim_cotisés` scopé au seul régime général — sous-évaluation prudente, jamais
  une survalorisation (documenté dans le code et dans le rapport d'implémentation).
- **Majoration pour 3 enfants ou plus et surcote parentale — filiation directe/adoption plénière
  uniquement.** `majorationTroisEnfants()` (10 % flat, régime général et régimes hérités) et
  `majorationEnfantsFonctionPublique()` (10 % + 5 %/enfant, dégressif, plafonné au dernier traitement)
  comptent les enfants via `family_links` (`nombreEnfantsEligiblesMajorationTroisEnfants()`), filtrés
  sur `lien_familial === 'Enfant' && enfant_adopte !== 'Adoption simple'` — la branche « enfant
  recueilli sans filiation » (adoption simple, enfant du conjoint, condition des 9 ans avant 16 ans)
  n'est pas représentable avec le schéma `family_links` actuel (cf. §3). La surcote parentale
  (`surcoteParentale()`) est une saisie déclarative simple (case à cocher), pas un sous-système de
  répartition MDA par enfant — décision produit actée après diagnostic (`conception-majorations-enfants.md`
  §5-§6), car le sous-système réel (options, garde, autorité parentale) dépasserait largement le
  périmètre d'un champ déclaratif.
- **Import RIS — trois défauts corrigés sur un relevé réel dense (1989-2025), commit `469fe7b`.**
  Conversion franc→euro pour les revenus antérieurs à 2002 (`deviseOrigine`, taux légal 6,55957,
  cf. [parseRIS.ts:310-335](src/lib/retraite/parseRIS.ts)) ; liste blanche de noms de régime
  ([regimesConnus.ts](src/lib/retraite/regimesConnus.ts)) remplaçant l'heuristique « toute ligne
  courte qui ressemble à un nom », qui confondait des fragments de texte de la page « Mes régimes »
  en mise en page à 2 colonnes ; filtrage des artefacts de pagination avant reconstruction des lignes
  par coordonnée Y. `PASS_PAR_ANNEE`/`COEFFICIENT_REVALORISATION_CNAV` étendus à 1950-2025.
- **Import RIS — deux défauts supplémentaires corrigés sur un second relevé réel dense (2026-09-03).**
  La section « Mes régimes » n'est pas toujours contenue sur la page 2 : sur un relevé où le
  fonctionnaire a aussi une carrière fonction publique d'État, elle continue sur la page 3 (régime
  SRE) — l'ancien `pdf.getPage(2)` fixe perdait ce régime silencieusement. `extraireRegimes()`
  ([parseRIS.ts](src/lib/retraite/parseRIS.ts)) recherche désormais le titre « Mes régimes » par
  balayage de page (même stratégie de tolérance multi-page que `extraireDetailCarriere()`, dont la
  couverture réelle sur 2 pages est maintenant confirmée) et continue à concaténer les pages
  suivantes tant qu'elles contiennent encore une ligne « Total des trimestres »/« Total des points ».
  Par ailleurs, `chercherValeurEtNom()` retournait dès qu'elle trouvait une valeur isolée sur sa
  propre ligne Y (ex. régime RCI en points) sans jamais regarder la ligne suivante pour un nom entre
  parenthèses — un régime valide retombait alors à tort sur le repli « Régime non identifié » quand
  son étiquette suivait la valeur au lieu de la précéder (collision d'arrondi de coordonnée Y à
  moins d'1pt, mise en page à 2 colonnes).
- **SAM : plafonnement au PASS AVANT revalorisation.** `calculerSAM()` retient chaque salaire
  annuel dans la limite du PASS de l'année de perception, puis revalorise ce montant plafonné
  (coefficient CNAV) — règle CNAV. L'ordre inverse, en place jusqu'au 2026-09-24, comparait un
  montant revalorisé à un PASS nominal ancien et sous-estimait le SAM des années au plafond ou proches
  du plafond. PASS 2026 (48 060 €) ajouté ; au-delà de la dernière année connue (années projetées),
  `passPourAnnee()` retient le dernier PASS connu (revenus projetés en euros constants).
  ⚠️ Le SAM est calculé à l'import RIS puis persisté (`retraite_data.salaire_annuel_moyen`) : les
  dossiers importés avant cette correction gardent un SAM erroné tant que le RIS n'est pas réimporté
  (ou le SAM ressaisi).
- **Surcote classique : trimestres cotisés APRÈS l'âge légal.** `trimestresSurcoteClassique()`
  (calcul.ts) compte les trimestres cotisés entre le 1er jour du trimestre civil suivant l'âge légal et
  le dernier jour du trimestre civil précédant la date d'effet (référentiel §2.3.1), borné par
  l'excédent `trimestresTousRegimes - trimestresRequis` (second bord de la période quand la durée
  requise est atteinte après l'âge légal, non reconstituable chronologiquement faute de dates pour les
  autres régimes). Détail de carrière connu par année civile : pour chaque année, au plus autant de
  trimestres cotisés que de trimestres civils de l'année inclus dans la période. Un départ dès l'âge
  légal ne donne donc aucune surcote. Branchée sur `pensionConsolidee.ts` (date d'effet = aujourd'hui)
  et `Trimestres.tsx` (date de liquidation choisie, trimestres futurs supposés cotisés via
  `projeterDepuis`). La surcote **parentale** garde sa propre période (année précédant l'âge légal,
  §2.3.2). La condition de durée requise des deux surcotes du régime général est appréciée tous
  régimes confondus. Jusqu'au 2026-09-24, la surcote classique comptait à tort les trimestres de
  l'année précédant l'âge légal.
- **Date d'effet unique par scénario (Carrière, Synthèse).** `dateEffetDepartAgeLegal()` (calcul.ts) :
  1er jour du mois suivant le mois anniversaire de l'âge légal, ou 1er jour du mois prochain si l'âge
  légal est déjà dépassé (âge légal résolu à la date candidate, bascule de barème comprise). Cette date
  est passée à `calculerPensionConsolidee()` (champ `dateEffet`, qui remplace l'ancien `ageActuel` et
  les `new Date()` internes, FP/CNAVPL compris) et sert aux trimestres requis, à l'âge de départ, à
  l'âge légal atteint, à la surcote et au MICO. Jusqu'au 2026-09-24, trimestres et SAM étaient
  projetés à l'âge légal mais tout le reste était évalué à la date du jour. La carte de la Synthèse
  s'intitule en conséquence « Pension au départ à l'âge légal ».
- **Âge de départ au mois près.** `ageEnMois()` (mois révolus ; jour de naissance inconnu, anniversaire
  supposé non atteint le 1er du mois) ; `decoteSurAge()` accepte un âge fractionnaire et arrondit les
  trimestres manquants avant 67 ans au trimestre supérieur (règle CNAV). Utilisé par
  `pensionConsolidee.ts` et `Trimestres.tsx` (dont les lignes « N ans » du tableau comparatif ont
  désormais un effet au 1er du mois suivant l'anniversaire, soit N ans 0 mois).
- **Projection des trimestres futurs par trimestre civil.** `trimestresProjetesParAnnee()`
  (hypotheseRevenuFutur.ts) : du trimestre civil en cours au trimestre précédant la date d'effet, au
  plus `4 - trimestres déjà validés` par année (pas de double compte de l'année en cours) ; l'année de
  départ ne compte que ses trimestres écoulés. Les années passées sans donnée
  (`anneesPasseesSansDonnees()`, RIS ancien) ne sont jamais projetées, et sont signalées sur Carrière.
  SAM projeté avec des périodes synthétiques bornées aux mêmes trimestres, revenu au prorata.
  `Trimestres.tsx` utilise la même projection (auparavant 4 × écart d'âge en années entières).
- **Écrêtement du MICO tous régimes.** Le plafond global (référentiel §3.5.5) est comparé à P0 + MICO +
  toutes les pensions personnelles connues : complémentaires à points (`regimes_points`), fonction
  publique (pension finale, majoration enfants et NBI comprises), RAFP, CNAVPL, plus les autres
  pensions déclarées. `pensionConsolidee.ts` calcule donc la FP et la CNAVPL avant l'écrêtement du
  régime général. Jusqu'au 2026-09-24, seuls P0 et les autres pensions déclarées étaient comparés au
  plafond (MICO surestimé).
- **Décote CNAVPL : plus favorable des deux comptages.** `decoteCNAVPL()` (calculCNAVPL.ts) : durée
  tous régimes ou âge à la date d'effet par rapport à 67 ans (taux plein automatique, référentiel
  §5.3), plafond -25 %. Jusqu'au 2026-09-24, seule la décote sur la durée s'appliquait.
- **Décote fonction publique.** `decoteFonctionPublique()` (calculFonctionPublique.ts), partagée par
  le moteur et la carte : plus favorable des décotes sur la durée tous régimes et sur l'âge, au taux
  du millésime d'ouverture des droits (`tauxDecoteParTrimestreFonctionPublique()`) pour les DEUX
  comptages (auparavant 1,25 % fixe pour la durée). Catégorie sédentaire : âge à la date d'effet
  contre `ageAnnulationDecoteSedentaire()` (66 ans 6 mois en 1956, 66 ans 9 mois en 1957, 67 ans
  ensuite) — auparavant aucune décote âge hors catégorie active. Catégorie active : âges saisis.
  Trimestres d'âge manquants arrondis au supérieur. Plafond : 20 trimestres au taux du millésime —
  ⚠️ non sourcé pour les millésimes 2011-2014 (montée en charge de la réforme 2010).
- **Cartes FP/CNAVPL alignées sur la date d'effet du scénario.** `CarriereFonctionPublique.tsx` et
  `CarriereCNAVPL.tsx` reçoivent `dateEffet` de Carriere.tsx (au lieu de `new Date()`) et appellent
  les mêmes fonctions de décote que le moteur. Elles conservent néanmoins leur propre assemblage du
  reste de la pension (duplication de `pensionConsolidee.ts`, cf. §3).
- **Surcote fonction publique et CNAVPL : non calculée, signalée à l'écran.** Faute de donnée datée
  (trimestres FP/CNAVPL saisis en total), la surcote de ces régimes reste à 0 ; les cartes
  `CarriereFonctionPublique.tsx`/`CarriereCNAVPL.tsx` affichent une mention dès que la durée requise
  est atteinte. Décision du 2026-09-24 (plutôt qu'un champ déclaratif et une migration, à reconsidérer
  si un dossier réel est concerné ; la CNAVPL impliquerait en plus le taux de 0,75 % de certaines
  périodes antérieures au 01/09/2023, non détaillé par le référentiel).
  Les colonnes `retraite_data.trimestres_cotises_apres_age_legal_fp` et `_cnavpl` (entier, défaut 0,
  migration `20260901101148_add_trimestres_cotises_apres_age_legal.sql`) existent pourtant en base :
  elles viennent d'une tentative antérieure de champ déclaratif (branche `fix/audit-retraite-carriere`,
  jamais fusionnée) et ne sont lues ni écrites par aucun code — à réutiliser si la décision est
  reconsidérée, sinon à supprimer par migration.
- **Plafond de décote : -25 % (20 trimestres) dans tous les régimes modélisés.** Régime général
  compris (`decoteSurTrimestres()`, `decoteSurAge()`) : minoration de 0,625 point de taux par
  trimestre manquant, taux minimal 37,5 %. Le régime général était plafonné à tort à -20 % jusqu'au
  2026-09-24. `decoteSurTrimestresPlafond25()` est depuis un doublon exact de `decoteSurTrimestres()`.
- **Double comptage fonction publique/CNAVPL — deux mécanismes distincts, tous deux soldés :**
  1) *[soldé, commit `d8c8e31`]* trimestres SRE/CNRACL comptés à tort dans le panier « régime général »
     à l'import RIS (`estRegimeSaisieManuelle()`, [regimesSaisieManuelle.ts](src/lib/retraite/regimesSaisieManuelle.ts)),
     étendu à RAFP le même jour (commit `abf4c72`, écart #16).
  2) *[soldé, commits `4fe95d4`/`d3f5a99`/`aef0b17`, 2026-08-15/16]* les 13 champs de saisie fonction
     publique/CNAVPL (TIB, points RAFP, âges catégorie active, points CNAVPL, valeur du point…)
     n'étaient jamais persistés (`docs/audit/archive/audit-fonction-publique-cnavpl.md`) : perdus au
     rechargement, avec un total consolidé qui retombait silencieusement à la seule pension régime
     général. Corrigé par la migration `20260815020000` (13 nouvelles colonnes sur `retraite_data`)
     et le lift des états locaux vers `Carriere.tsx` — plus aucun `useState` local dans
     `CarriereFonctionPublique.tsx`/`CarriereCNAVPL.tsx` au 2026-08-27.
- **Pipeline de pension consolidée unifié (2026-08-18, commit `6f509d3`).** `Carriere.tsx` et
  `usePensionConsolidee.ts` (Synthèse) partageaient jusque-là deux implémentations parallèles du même
  calcul (extraction fidèle mais non rebranchée). Fusionnés sur `calculerPensionConsolidee()` unique ;
  au passage, `autresPensionsMensuelles` (jusqu'ici saisi sur Carrière mais jamais persisté, donc
  toujours à `0` côté Synthèse) devient une colonne persistée (`retraite_data.autres_pensions_mensuelles`,
  migration `20260818000000`), consommée par les deux écrans.
- **Une ligne `retraite_data` par personne.** Contrainte `UNIQUE (user_id, personne)` (migration
  `20260924120000`) ; la création dans `useRetraiteData.saveRetraiteData()` passe par un `upsert`
  (`onConflict: 'user_id,personne'`), de sorte que deux sauvegardes automatiques concurrentes, avant
  que l'`id` de la première insertion soit connu, fusionnent au lieu de créer un doublon (qui faisait
  échouer silencieusement le chargement via `.maybeSingle()`).
- **RGPD.** Aucun spécimen de RIS réel n'est jamais committé (`.gitignore` couvre `/exemples/`) ; les
  sessions d'audit ayant exécuté le parser contre un relevé réel l'ont fait sur un fichier local
  temporaire, supprimé après usage.

## 3. Dette identifiée

Classement par risque, revérifié contre le code au 2026-09-24 (`git log`, lecture directe). Les
écarts numérotés (#1 à #16) renvoient à `docs/audit/audit-retraite.md` §7, qui les compare à
`docs/retraite-base-referentiel.md`.

### 🔴 Bloquant (peut fausser un calcul montré au client)

Un seul point ouvert au 2026-09-24 (ci-dessous). L'audit des calculs du 2026-09-24 a relevé cinq anomalies
bloquantes, toutes soldées (cf. §2) : plafonnement SAM avant revalorisation + PASS 2026, plafond de
décote -25 %, période de la surcote classique, date d'effet unique et projection des trimestres,
écrêtement du MICO tous régimes.

- **MIGA accordé sans condition de taux plein.** `minimumGaranti()` ne vérifie ni la durée requise ni
  l'âge d'annulation de la décote. L'article L. 17 CPCMR (réforme 2010) subordonnerait l'accès au MIGA
  à l'une de ces conditions (sauf exceptions, dont l'invalidité), mais le référentiel (§7.5) n'en dit
  rien : non implémenté (décision du 2026-09-24) en attendant vérification de la source. MIGA
  probablement surestimé pour un fonctionnaire décoté.
- **Calcul FP/CNAVPL dupliqué entre les cartes et `pensionConsolidee.ts`** : chaque correction de
  règle doit être reportée aux deux endroits (décotes désormais partagées, mais pas MIGA, surcote,
  majorations, NBI). `decoteSurTrimestresPlafond25()` (calcul.ts) n'est plus appelée que par des
  tests : code mort, doublon de `decoteSurTrimestres()`.
- Limites connues de la projection (phase 3) : un client ayant dépassé l'âge légal se voit projeter le
  trimestre en cours comme travaillé (hypothèse de poursuite d'activité, même pour un RIS ancien) ;
  `Trimestres.tsx` ne projette pas le SAM (salaire annuel moyen saisi) ; l'export PDF garde le libellé
  « Âge du taux plein retenu » sans la date d'effet simulée.

Écarts antérieurs soldés :

- **Écart #2/RIS-SAM — proxy de date d'effet manquant à l'import RIS : soldé.** `RISImportDialog.tsx`
  passe désormais `new Date()` à `calculerSAM()`, cohérent avec le proxy « aujourd'hui » déjà utilisé
  partout ailleurs dans `Carriere.tsx` — le filtrage par date d'effet de `anneesExclues()` s'applique
  désormais dès l'import.
- **Écart #13-NBI — supplément NBI fonction publique : soldé.** Nouveau champ `regime_affiliation_fp`
  (SRE/CNRACL, migration `20260827010000`) plus les deux champs déclaratifs NBI
  (`moyenne_annuelle_nbi`, `trimestres_liquidables_nbi`) sur `retraite_data` ; `supplementNBI()` est
  désormais appelé par `CarriereFonctionPublique.tsx` et `pensionConsolidee.ts` pour les deux versants
  (formule confirmée identique pour SRE et CNRACL — article 27 loi n°91-73 du 18/01/1991, décret
  n°92-586 du 30/06/1992 pour CNRACL, circulaire n° P-40 du 1er mars 1993 pour l'État). Régime non
  renseigné = supplément non calculé (sécurité par défaut), avec avertissement à l'écran si une saisie
  NBI existe sans régime associé.
- **SAM — critère d'exclusion #3 (année uniquement assimilée) : soldé pour son volet distinguable.**
  Nouvelle catégorie `'maternite'` sur `TypeActivite` (distincte de `'maladie'`, jamais auto-détectée à
  l'import RIS — reclassification manuelle par le conseiller via `PeriodeCarriereEditDialog.tsx`).
  `anneesExclues()` exclut désormais une année sans trimestre cotisé composée uniquement de périodes
  assimilées chômage/maladie, sauf si une période `'maternite'` couvre cette année (référentiel
  §3.4.4). `trimestresCotisesEtAssimilesDepuisCarriere()` compte les périodes `'maternite'` avec le
  seuil `'maladie'` (60 jours/trimestre) — hypothèse assumée faute de seuil spécifique sourcé pour la
  maternité, préserve le comportement antérieur à l'ajout de cette catégorie. Ne couvre pas la
  revalorisation à 125 % du montant de l'IJ maternité elle-même (référentiel §3.4, non implémentée, non
  demandée pour cette session).

### 🟠 À surveiller (cas limite, peu probable)

- **Majoration enfants — cas « recueilli sans filiation » non calculé.** Un enfant du conjoint/
  partenaire élevé depuis plus de 9 ans, ou en adoption simple (écart #6), n'est jamais compté comme
  éligible à la majoration pour 3 enfants — `family_links` ne permet pas de déclarer cette relation
  indépendamment du volet succession, ni de dater une durée de charge. Seuls les enfants avec filiation
  directe reconnue sont pris en compte. Impact : majoration sous-estimée (jamais surestimée) pour les
  dossiers concernés par ce cas spécifique. Nécessite une décision produit sur le modèle de données
  (`conception-majorations-enfants.md` §0.2, §5) — non engagée à ce jour, faute de client réel dans ce
  cas.
- **SAM ne détecte pas les années de rachat de trimestres (écart #11, second volet).** Aucune donnée
  n'existe dans `retraite_carriere_detail` pour identifier une année ayant fait l'objet d'un rachat —
  si un client a racheté des trimestres, le SAM affiché peut être imprécis dans un sens non déterminé
  (le référentiel §3.4.4 prévoit d'exclure ces années, effet contre-intuitif : un rachat améliore le
  taux tout en dégradant potentiellement le SAM). Nécessite une décision produit et une migration de
  schéma — vérification manuelle recommandée pour ces dossiers en attendant.

- **Surcote classique : approximations assumées.** Détail de carrière par année civile (dans l'année
  de l'âge légal ou de la date d'effet, les trimestres cotisés ne sont pas localisés avant/après le
  pivot : au plus le nombre de trimestres civils de la période est retenu) ; jour de naissance ignoré
  (trimestre civil suivant le mois anniversaire) ; durée requise atteinte après l'âge légal bornée par
  l'excédent tous régimes plutôt que datée ; rachats option 2 non modélisés.
- **Cumul surcote classique/surcote parentale non confirmé pour CNAVPL et CNBF.** Le référentiel
  précise explicitement la règle pour le régime général (additif) et la fonction publique (exclusif,
  la plus favorable), mais reste muet pour CNAVPL/CNBF — `surcoteTotale()` est appelée en mode
  `cumulable = true` pour CNAVPL par analogie avec le régime général, hypothèse raisonnable mais non
  sourcée pour ce cas précis (`conception-majorations-enfants.md` §6.1).
- **MICO majoré (palier 2), polypensionné avec régime non aligné : sous-évaluation documentée pour le
  Cas 2 (bascule de dénominateur).** L'exemple 6 du référentiel (dénominateur bascule à 171 tous
  régimes) n'est pas reproduit à sa valeur littérale, faute de distinction cotisé/assimilé pour la
  fonction publique/CNAVPL — direction toujours prudente (sous-évaluation, jamais l'inverse), cf. §2.
- **`decoteSurAgeFonctionPublique()` / MIGA : formules antérieures à 2014 non modélisées**, et
  articulation MICO/MIGA pour un polypensionné fonction publique + régime général non implémentée
  (décrets d'application LFSS 2024 non publiés selon le référentiel au moment de l'audit) — cas très
  minoritaire pour un outil de simulation prospective, mais aucun garde-fou n'empêche de calculer les
  deux minimums indépendamment et de les additionner à tort si un futur écran le faisait.
- **Valeur de référence MIGA 2026 non confirmée.** Le calcul retient volontairement la valeur 2025
  (1 248,33 €/mois), avec avertissement à l'écran — un fonctionnaire liquidant en 2026 avec une valeur
  2026 réellement supérieure verrait son minimum garanti légèrement sous-estimé tant que cette valeur
  n'est pas mise à jour.
- **Régime de base non modélisé par l'app (MSA agricole non-salarié, régime étranger) absent du total
  « tous régimes »** utilisé par la bascule de dénominateur du MICO palier 1 — un polypensionné dans
  un tel régime reste à tort au Cas 1 (dénominateur = durée requise) même si son total réel dépasse
  cette durée.

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **Pas de `types.ts`/`index.ts`, pas de paramètres externalisés en JSON**, contrairement au pattern
  `dmtg`/`transmission` — tous les barèmes réglementaires (trimestres requis, taux de décote, PASS,
  seuils de validation) restent en dur dans le TS, dispersés entre `lib/retraite/` et deux composants
  (`CarriereCNAVPL.tsx`, `CarriereFonctionPublique.tsx` pour les valeurs de point CNAVPL/RAFP 2026).
- **`strict: false` / `strictNullChecks: false` au niveau du projet** : les unions discriminées sur un
  booléen (ex. `AgeLegalResultat`) ne se restreignent pas via `.stable` — utiliser `'raison' in x`.
  Réglage global, hors périmètre du module.
- **`retraite_carriere_detail` sans contrainte d'unicité** : l'import RIS remplace toutes les périodes
  (suppression puis insertion), donc pas de doublon attendu, mais aucune clé naturelle n'est définie.
- **`Trimestres.tsx` (onglet « Optimisation ») n'affiche ni MICO/MIGA, ni majoration enfants** —
  décision produit documentée (écran volontairement plus simple qu'un détail de pension complet), pas
  un oubli, mais crée une divergence de niveau de détail entre les deux écrans de simulation.
- **`Synthese.tsx` n'a pas de branche de calcul propre à la fonction publique/CNAVPL détaillée** au
  même niveau que `Carriere.tsx` (MICO/MIGA affichés en synthèse consolidée, pas ligne à ligne).
- **Aucune granularité de test de rendu de composant** (pas de `@testing-library/react`, environnement
  vitest `node`) — toute vérification visuelle des écrans reste manuelle, documentée comme non
  réalisée dans chaque rapport de session (application protégée par authentification).
- **Barèmes annuels à réviser chaque année** (valeur du point CNAVPL, RAFP, PASS, MICO, seuils de
  validation de trimestre, barème de rachat CNAV) — commentaires explicites dans le code rappelant la
  nécessité de mise à jour annuelle, aucun mécanisme de rappel ou d'alerte de péremption.
- **Découpage « carrière longue 1965/1966 »** mentionné par le référentiel comme un cinquième
  découpage infra-annuel potentiel, non modélisé faute de barème chiffré disponible au moment de
  l'implémentation — signalé comme incertitude à lever, pas un oubli.

## 4. Périmètre V1 / différé

- **V1 — en place** : import RIS (PDF, franc/euro, multi-régimes, multi-colonnes), calcul SAM avec
  projection des années manquantes, trimestres cotisés/assimilés dérivés de la carrière (avec plafond
  4/an combiné, priorité aux cotisés, chômage indemnisé/non indemnisé, micro-entrepreneur avec
  abattement forfaitaire par sous-type), décote/surcote (trimestres + âge, le plus favorable des deux),
  surcote parentale déclarative, majoration pour 3 enfants (cas filiation directe/adoption plénière),
  MICO à deux paliers + écrêtement, MIGA par palier, supplément NBI (SRE/CNRACL), décote fonction publique par millésime d'ouverture
  des droits, pension consolidée unifiée Carrière/Synthèse, export PDF, simulation de départ avec
  rachat de trimestres, support conjoint/partenaire.
- **Différé, décisions explicitement documentées** :
  - **Majoration enfants, branche « recueilli sans filiation »** (adoption simple, enfant du conjoint,
    condition des 9 ans) : nécessite un nouveau modèle de données sur `family_links` — décision produit
    non prise, classée « à surveiller » en §3 (à reclasser bloquante dès qu'un client réel est dans ce cas).
  - **Système MDA complet** (répartition de trimestres par enfant entre parents, options, garde,
    autorité parentale) : explicitement écarté au profit d'une saisie déclarative simple (§2) — écart
    volontaire, pas un chantier commencé puis abandonné.
  - **Chronologie infra-annuelle du SAM** (année de rachat) : non implémentée,
    faute de données structurées (pas de valeur « rachat » dans `retraite_carriere_detail.type_activite`).
    L'exclusion d'une année uniquement assimilée est en place, avec la catégorie `'maternite'` (§3).
  - **Régimes hors périmètre de l'outil** : SSI hors alignement CNAVPL implicite, CNBF (hors majoration
    enfants/surcote, testées mais sans moteur de pension de base dédié), artistes-auteurs, agents
    contractuels/IRCANTEC en tant que régime distinct, MSA agricole non-salarié, régimes étrangers —
    périmètre produit non défini, pas une non-conformité à une règle que l'outil prétendrait couvrir.
  - **Formules MIGA antérieures à 2014** et **articulation MICO/MIGA polypensionné fonction
    publique** : non pertinentes pour une simulation prospective / bloquées par des décrets
    d'application non publiés selon le référentiel au moment de l'audit.
  - **Externalisation des barèmes réglementaires** (façon `params-dmtg.json`) et **package
    `types.ts`/`index.ts`** : écart d'architecture assumé vis-à-vis du pattern `dmtg`/`transmission`,
    non planifié à ce jour.
