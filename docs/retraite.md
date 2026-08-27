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
| Épargne retraite | [EpargneRetraite.tsx](src/components/retraite/EpargneRetraite.tsx) | Agrégation PER/assurance-vie depuis le module Patrimoine |
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
- **Synthèse** consomme le même pipeline (`calculerPensionConsolidee()`, unifié avec Carrière depuis
  le 2026-08-18, cf. §2), avec en plus la projection d'une hypothèse de revenu futur pour les années
  manquantes jusqu'à l'âge de départ.
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
  couverture nulle sur ce module ; au 2026-08-27, 13 fichiers `*.test.ts` co-localisés couvrent le
  moteur (`calcul.test.ts`, `calculSAM.test.ts`, `calculTrimestres.test.ts`, `calculFonctionPublique.test.ts`,
  `calculCNAVPL.test.ts`, `parseRIS.test.ts`, `pensionConsolidee.test.ts`, `hypotheseRevenuFutur.test.ts`,
  `enfantsEligiblesMajoration.test.ts`, `regimesSaisieManuelle.test.ts`) — 681 tests passants au total
  sur l'ensemble du dépôt (`npx vitest run`), aucune régression. Rien côté rendu de composant (pas de
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
- **RGPD.** Aucun spécimen de RIS réel n'est jamais committé (`.gitignore` couvre `/exemples/`) ; les
  sessions d'audit ayant exécuté le parser contre un relevé réel l'ont fait sur un fichier local
  temporaire, supprimé après usage.

## 3. Dette identifiée

Classement par risque, revérifié contre le code au 2026-08-27 (`git log`, lecture directe). Les
écarts numérotés (#1 à #16) renvoient à `docs/audit/audit-retraite.md` §7, qui les compare à
`docs/retraite-base-referentiel.md`.

### 🔴 Bloquant (peut fausser un calcul montré au client)

Aucun bloquant ouvert au 2026-08-27 — les quatre écarts précédemment listés ici ont été traités (cf.
§2 pour le détail des corrections) :

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

- **Chronologie infra-annuelle de la surcote non modélisée.** `surcotePourTrimestresCotises()` reçoit
  un nombre de trimestres cotisés sur l'« année de référence », dérivé par année civile entière
  (`parAnnee`) — si l'anniversaire légal ou la date d'effet tombe au milieu d'une année mêlant
  activité cotisée et assimilée, aucune donnée ne permet de départager les trimestres avant/après le
  pivot. Documenté dans plusieurs rapports comme limite assumée (pas un bug), affecte uniquement le
  cas d'un départ précisément au fil de l'année.
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
- **Colonnes DB orphelines** : `trimestres_requis` (défaut 172, jamais lue — `Carriere.tsx` calcule
  désormais dynamiquement via `trimestresRequisPourGeneration()`, sans jamais relire ni écrire cette
  colonne), `epargne_per`, `epargne_assurance_vie` (le total réel est recalculé à la volée depuis
  `assets`, jamais stocké dans ces colonnes).
- **`ageLegalPourGeneration()` a un seul appelant réel** (`Trimestres.tsx`, via `simulerPourAge()`) —
  la fonction reste correctement testée mais peu réutilisée ailleurs (ex. jamais affichée à l'écran).
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
  MICO à deux paliers + écrêtement, MIGA par palier, décote fonction publique par millésime d'ouverture
  des droits, pension consolidée unifiée Carrière/Synthèse, export PDF, simulation de départ avec
  rachat de trimestres, support conjoint/partenaire.
- **Différé, décisions explicitement documentées** :
  - **Majoration enfants, branche « recueilli sans filiation »** (adoption simple, enfant du conjoint,
    condition des 9 ans) : nécessite un nouveau modèle de données sur `family_links` — décision produit
    non prise, classée bloquante en §3 tant qu'un client réel se trouve dans ce cas.
  - **Système MDA complet** (répartition de trimestres par enfant entre parents, options, garde,
    autorité parentale) : explicitement écarté au profit d'une saisie déclarative simple (§2) — écart
    volontaire, pas un chantier commencé puis abandonné.
  - **Supplément NBI fonction publique** : formule implémentée et testée, branchement différé dans
    l'attente d'un choix de modélisation SRE/CNRACL.
  - **Chronologie infra-annuelle de la surcote et du SAM** (année de rachat, année à dominante
    assimilée hors maternité) : non implémentée, faute de données structurées (pas de valeur « rachat »
    dans `retraite_carriere_detail.type_activite`, pas de catégorie maternité dans `TypeActivite`).
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
