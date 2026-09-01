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
  par coordonnée Y. `PASS_PAR_ANNEE`/`COEFFICIENT_REVALORISATION_CNAV` étendus à 1950-2025
  (`PASS_PAR_ANNEE` couvre depuis 2026 inclus : 48 060 €).
- **Décote sur l'âge — arrondi au trimestre supérieur.** `decoteSurAge()` et
  `decoteSurAgeFonctionPublique()` calculaient `(âge − âge d'annulation) × 4`, soit un nombre de
  trimestres fractionnaire et une décote au centime près sur une fraction de trimestre. L'art.
  R. 351-27 CSS ne connaît que des trimestres entiers, tout trimestre entamé comptant pour un
  trimestre plein : le calcul passe à `ceil(mois / 3)`. L'écart en mois est arrondi avant division
  pour absorber le bruit flottant d'un âge décimal. Les âges en années entières sont inchangés
  (multiples exacts de 4) — seuls les âges exprimés avec des mois changent de valeur.
- **Barème LFSS 2026 prolongé au-delà de 2027 — avertissement à l'écran.** `jeuBaremeApplicable()`
  renvoie `lfss_2026` pour toute date d'effet à compter du 1er septembre 2026, sans borne haute.
  Le choix reste **inchangé** (le texte voté ne prévoit pas de date de fin, et aucune alternative
  sourcée n'existe pour l'après-2027), mais les LFSS étant annuelles, prolonger ce barème au-delà
  du 31 décembre 2027 suppose qu'aucune loi ultérieure ne le modifiera. `baremeDependDUneLoiNonVotee()`
  et `AVERTISSEMENT_BAREME_NON_VOTE` ([calcul.ts](src/lib/retraite/calcul.ts)) pilotent un encart
  d'avertissement affiché dans l'onglet Optimisation (sous le sélecteur de date de liquidation, où
  une date > 2027 est atteignable dès aujourd'hui) et dans l'onglet Carrière (dont la date d'effet
  est le proxy « aujourd'hui » : l'encart n'apparaîtra donc qu'à partir de 2028). ⚠️ Cette borne ne
  pilote qu'un affichage et **ne doit jamais devenir une bascule de calcul** — un test le verrouille.
- **Surcote FP/CNAVPL — champ déclaratif « trimestres cotisés au-delà de l'âge légal ».** Le
  compteur de la surcote classique était codé en dur à 0 pour ces deux régimes, faute de détail de
  carrière par année : leur surcote était structurellement nulle. Nouveau champ déclaratif sur
  chaque sous-carte, sur le modèle de `au_moins_un_trimestre_majoration_enfant` — migration
  `20260901000000_add_trimestres_cotises_apres_age_legal.sql` (`trimestres_cotises_apres_age_legal_fp`
  et `_cnavpl`). **Migration appliquée le 2026-09-01** (projet `npypkocowjkszxtecxzq`, enregistrée
  sous `add_trimestres_cotises_apres_age_legal`) : les deux colonnes sont `integer NOT NULL DEFAULT 0`
  et les lignes existantes ont toutes reçu 0. `src/integrations/supabase/types.ts` a été régénéré
  dans la foulée.
  ⚠️ Ce champ n'alimente que la surcote **classique**. La surcote **parentale** de ces deux régimes
  reste à 0 : sa période de référence est différente (année civile précédant l'âge légal) et la
  renseigner avec ce champ rétablirait exactement la confusion des deux périodes corrigée pour le
  régime général.
- **Majoration familiale Agirc-Arrco — appliquée, avec un compteur d'enfants dédié.** Seule la
  pension de base était majorée ; la part Agirc-Arrco de `regimes_points` ne l'était jamais.
  Nouvelle `majorationEnfantsAgircArrco()` ([calcul.ts](src/lib/retraite/calcul.ts)) : 10 % à partir
  de 3 enfants, **plafonnée à 2 367,48 €/an** (valeur 2026, à réviser chaque année). Le régime est
  isolé dans le panier via `estRegimeAgircArrco()`, par mot-clé sur libellé normalisé — les libellés
  extraits d'un RIS sont fréquemment pollués par des identifiants techniques.
  ⚠️ Le compteur du régime général **n'est pas réutilisable** : le critère Agirc-Arrco « nés ou
  élevés » est plus large. D'où `nombreEnfantsEligiblesMajorationAgircArrco()`, qui compte toute
  filiation établie — **adoption simple incluse**, alors qu'elle est exclue du cas courant du régime
  général — et écarte les enfants nés après la date de départ. ⚠️ La branche « élevés » (enfant sans
  filiation élevé 9 ans avant ses 16 ans) n'est **pas** implémentée : `FamilyLink` ne porte ni type
  de lien « enfant recueilli », ni durée de prise en charge. La majoration est donc sous-évaluée
  dans ce cas, jamais sur-évaluée.
- **Décote CNAVPL — taux plein à 67 ans (art. L. 643-4 CSS).** La décote n'était calculée que sur
  les trimestres manquants : un assuré de 67 ans très incomplet en durée était décoté à tort, alors
  que le taux plein CNAVPL est acquis de plein droit à cet âge. Nouvelle `decoteCNAVPL()`
  ([calculCNAVPL.ts](src/lib/retraite/calculCNAVPL.ts)), partagée par `pensionConsolidee.ts` et
  `CarriereCNAVPL.tsx`, appliquant la même règle du plus petit des deux comptages que le régime
  général et la fonction publique. L'absence de proratisation propre à la CNAVPL est **conservée**
  (les points reflètent déjà la carrière réelle) : seul le taux de liquidation change.
- **Surcote classique — période de référence propre, distincte de la parentale.** Les deux
  surcotes étaient alimentées par le **même** compteur : les trimestres cotisés de l'année civile
  précédant l'âge légal. C'est la bonne période pour la parentale (§2.3.2), pas pour la classique
  (art. L. 351-1-2 CSS), d'où deux erreurs de sens opposé : un assuré liquidant dès l'âge légal
  recevait une surcote à tort, et un assuré prolongeant son activité était borné à 4 trimestres
  (+5 %) au lieu de cumuler 4 trimestres par année de prolongation, sans plafond.
  Nouvelle fonction partagée `trimestresCotisesPeriodeSurcoteClassique()`
  ([calcul.ts](src/lib/retraite/calcul.ts)), appelée par `pensionConsolidee.ts` **et**
  `Trimestres.tsx` (qui portait une troisième copie du compteur) : somme les `cotises` de
  `parAnnee` sur la fenêtre `[année de l'âge légal + 1, année de la date d'effet]`, écrêtés à 4 par
  an, sans plafond global. La date d'effet est « aujourd'hui » dans l'onglet Carrière et la date
  **simulée** dans l'onglet Optimisation — prolonger l'activité y étend donc la période et
  augmente la surcote, ce que cet onglet a vocation à montrer. Le compteur de la parentale est
  conservé tel quel sous un nom distinct.
  ⚠️ Deux simplifications assumées, imposées par la granularité annuelle de `parAnnee` (qui ne sait
  pas découper une année autour d'un pivot) : l'année de l'âge légal est **exclue en entier**
  (sous-compte d'au plus 3 trimestres, ne sur-compte jamais) et l'année de la date d'effet est
  **incluse en entier** (peut sur-compter jusqu'à 4 trimestres si le détail de carrière déclare une
  année en cours complète). La seconde condition d'ouverture de la période (acquisition du dernier
  trimestre requis plus tardive que l'âge légal) n'est pas modélisée : aucune date d'acquisition de
  trimestre n'existe dans les données.
- **Décote fonction publique — implémentation unique partagée écran/moteur.** L'écran
  (`CarriereFonctionPublique.tsx`) et le moteur consolidé (`pensionConsolidee.ts`) portaient chacun
  une copie manuelle de la règle du plus petit des deux comptages, qui avait divergé. La règle est
  désormais dans une fonction unique, `decoteFonctionPublique()`
  ([calculFonctionPublique.ts](src/lib/retraite/calculFonctionPublique.ts)), appelée par les deux —
  aucun calcul de décote local ne subsiste chez les appelants. Sa signature ne reçoit **pas**
  `departAnticipeCategorieActive` : le motif du départ ne peut donc plus, par construction,
  restreindre le champ de la règle. Elle traite `null` et `NaN` comme « non renseigné » (champs
  nullables en base côté moteur, `parseFloat('')` côté formulaire).
- **Formulaire fonction publique — âges de départ saisissables par tout agent.** Les champs « Âge
  de départ » et « Âge d'annulation de la décote » n'étaient rendus que si la case « Départ anticipé
  catégorie active » était cochée, ce qui interdisait à un sédentaire d'en bénéficier. Ils sont
  désormais toujours affichés. La case reste présente et persistée mais **n'entre plus dans aucun
  calcul** : elle décrit le motif du départ et adapte les repères de saisie (placeholders, aide
  contextuelle). ⚠️ Elle est donc devenue purement déclarative — `depart_anticipe_categorie_active`
  est encore lu depuis la base et transmis au moteur, où plus rien ne le consomme.
- **Surcote régime général — condition de durée appréciée tous régimes.** Dans
  `pensionConsolidee.ts`, `dureeRequiseAtteinte` ne comptait que `trimestresValides` (régime
  général), alors que la décote trois lignes plus haut comptait déjà
  `trimestresValides + trimAutresRegimes`, comme les branches fonction publique et CNAVPL du même
  fichier. Un polypensionné dont le total atteint la durée requise, mais pas le régime général
  seul, était privé de surcote (classique et parentale). Corrigé : les deux conditions lisent
  désormais le même total.
- **Décote fonction publique — règle du plus petit des deux comptages étendue à tous les
  fonctionnaires.** `decoteAgeUtilisable` exigeait `departAnticipeCategorieActive` : la décote
  d'un agent sédentaire était calculée sur le seul comptage en trimestres. L'art. L. 14 I CPCMR
  applique la règle du plus favorable des deux comptages (durée / âge) à **tout** fonctionnaire —
  ce drapeau ne décrit que le motif du départ, il ne restreint pas le champ de la règle. La
  condition porte désormais sur la seule disponibilité d'un âge de départ, avec
  `ageAnnulationDecote` par défaut à 67 ans (sédentaire) via la valeur par défaut de
  `decoteSurAgeFonctionPublique()`. `null` est explicitement écarté en plus de `undefined` : le
  champ est nullable en base et `Number.isNaN(null)` vaut `false`.
  ⚠️ **Correction inerte en production pour l'instant** : les champs « âge de départ » et « âge
  d'annulation de la décote » ne sont affichés dans `CarriereFonctionPublique.tsx` que si la case
  « Départ anticipé catégorie active » est cochée — un sédentaire ne peut donc pas saisir d'âge de
  départ. ⚠️ De plus, `CarriereFonctionPublique.tsx` porte **sa propre copie** de la condition
  (même `departAnticipeCategorieActive && …`), non corrigée : l'écran et le moteur consolidé
  divergent tant que les deux points ci-dessus ne sont pas traités.
- **Minimum garanti fonction publique — barème 2026 confirmé, réserve levée.**
  `VALEUR_REFERENCE_MIGA_MENSUELLE_2025`/`_ANNUELLE_2025` (1 248,33 €/mois, 14 979,96 €/an)
  remplacées par `VALEUR_REFERENCE_MIGA_ANNUELLE_2026` = **16 396,19 €** et
  `VALEUR_REFERENCE_MIGA_MENSUELLE_2026` = **1 366,35 €** (valeur SRE). L'annuelle est la valeur
  de référence : la mensuelle en est l'arrondi au centime (× 12 redonnerait 16 396,20 €, 1 centime
  de plus), les deux sont donc déclarées séparément et seule l'annuelle sert aux calculs. La
  réserve « valeur 2026 à vérifier auprès du SRE » est levée : l'avertissement correspondant a été
  retiré de l'écran (`CarriereFonctionPublique.tsx`), qui affiche désormais la valeur 2026 depuis
  la constante plutôt qu'en dur. ⚠️ Les tests de la formule par palier restent calés sur 1 248,33 €
  (fixture locale figée) : les exemples chiffrés du référentiel qu'ils recoupent sont libellés en
  euros 2025 ; les brancher sur le barème en vigueur ferait perdre ce recoupement à chaque
  revalorisation. Le millésime en vigueur est testé séparément.
- **Plafond global des pensions — revalorisation du 1er juin 2026.**
  `PLAFOND_GLOBAL_PENSIONS_2026` passe de 16 930,68 € (1 410,89 €/mois, valeur au 1er janvier
  2026) à **17 338,68 €** (1 444,89 €/mois). ⚠️ **Deux valeurs coexistent sur l'année 2026** et la
  constante ne porte que la seconde : le référentiel retient le plafond en vigueur à la *date
  d'ouverture du droit au MICO*, si bien qu'un droit ouvert entre le 1er janvier et le 31 mai 2026
  relève encore de 16 930,68 €. Le module n'ayant pas de notion de date d'effet du MICO, il
  appliquera 17 338,68 € à ces dossiers — écrêtement sous-évalué, donc majoration MICO
  légèrement surévaluée. `ecretementMICO()` accepte le plafond en paramètre : un appelant
  disposant de la date d'ouverture peut lui passer la valeur historique.
- **Décote régime général — plafond corrigé de -20 % à -25 %, et fonction unifiée.** `calcul.ts`
  exposait deux barèmes de décote parallèles : `decoteSurTrimestres()` (plafond -20 %, régime
  général) et `decoteSurTrimestresPlafond25()` (plafond -25 %, fonction publique et CNAVPL). Le
  -20 % confondait le plafond *en nombre de trimestres* (20, art. R. 351-27 CSS) avec un plafond
  *en pourcentage* : la décote légale maximale est 20 × 1,25 % = **-25 %**. Tout assuré du régime
  général à 20 trimestres manquants ou plus voyait donc sa décote minorée de 5 points (pension
  surestimée de ~6,7 %). `decoteSurTrimestres()` est **supprimée** ; le régime général
  (`Trimestres.tsx`, `pensionConsolidee.ts`) utilise désormais
  `decoteSurTrimestresPlafond25()`, seule version restante — le suffixe `Plafond25` est devenu
  historique, il ne signale plus une spécificité de régime.
- **Décote sur l'âge — même plafond, alignement obligatoire.** `decoteSurAge()` plafonnait aussi à
  -20 %. Comme `decoteApplicable()` retient le moins sévère des deux comptages
  (`Math.max`), laisser ce plafond à -20 % aurait écrêté le résultat commun et **annulé en pratique
  la correction ci-dessus** pour un assuré à la fois très incomplet en trimestres et parti avant
  63 ans. Les deux plafonds doivent rester alignés — contrainte désormais documentée dans le
  docstring de `decoteSurAge()`. `decoteApplicable()` lui-même est inchangé (ses paramètres ont
  seulement été renommés, ils portaient le nom de la fonction supprimée).
- **SAM — ordre plafonnement/revalorisation corrigé.** `calculerSAM()` appliquait la revalorisation
  CNAV *puis* le plafonnement au PASS, ce qui comparait un revenu exprimé en euros d'aujourd'hui au
  PASS en euros de l'époque : sur les années anciennes (coefficient très supérieur à 1 — 1,704 pour
  1990), des revenus pourtant inférieurs au plafond de leur année étaient écrêtés au PASS nominal de
  cette année. L'ordre légal (art. R. 351-29 CSS) est l'inverse : le salaire est d'abord retenu dans
  la limite du PASS de son année, et c'est ce salaire plafonné qui est revalorisé. Corrigé dans
  [calculSAM.ts](src/lib/retraite/calculSAM.ts) ; `revenuPlafonne` (valeur retenue dans le SAM) vaut
  désormais `min(revenuBrut, PASS[annee]) × coefficient`, `revenuRevalorise` restant la valeur
  revalorisée non plafonnée, indicative. Deux tests verrouillent l'ordre dans `calculSAM.test.ts`.
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

### Traçabilité — audit externe « Carrière » (`docs/audit-retraite-carriere.md`)

Les 13 constats de cet audit sont traités au 2026-09-01. Le détail de chaque correction figure dans
les entrées thématiques ci-dessus ; cette table ne sert qu'au rapprochement avec la numérotation de
l'audit. ⚠️ La colonne « réserve » signale ce qui n'est **pas** couvert par la correction — une
ligne sans réserve est close, une ligne avec réserve laisse une dette explicitée en §3.

| # | Constat | Correction | Réserve résiduelle |
|---|---|---|---|
| 🔴 #1 | SAM : plafonnement et revalorisation dans le mauvais ordre | `calculerSAM()` — `min(brut, PASS[année])` puis × coefficient | — |
| 🔴 #2 | Décote régime général plafonnée à −20 % au lieu de −25 % | `decoteSurTrimestresPlafond25()` ; `decoteSurTrimestres()` supprimée ; `decoteSurAge()` aligné | — |
| 🔴 #3 | Surcote classique : mauvaise période de référence | `trimestresCotisesPeriodeSurcoteClassique()`, partagée moteur/écran | Date d'acquisition du dernier trimestre requis absente des données (cf. §3) |
| 🟠 #4 | FP : décote-âge jamais appliquée hors catégorie active | `decoteFonctionPublique()` partagée ; champs d'âge ouverts à tout agent dans le formulaire | — |
| 🟠 #5 | Surcote structurellement nulle pour la FP et la CNAVPL | Champ déclaratif « trimestres cotisés au-delà de l'âge légal » (migration appliquée) | N'alimente que la surcote **classique** ; la parentale de ces deux régimes reste à 0 (cf. §3) |
| 🟠 #6 | Condition de durée requise de la surcote RG : autres régimes oubliés | `trimestresValides + trimAutresRegimes` dans `pensionConsolidee.ts` | — |
| 🟠 #7 | Minimum garanti FP : valeur de référence périmée | `VALEUR_REFERENCE_MIGA_ANNUELLE_2026` = 16 396,19 € (confirmée SRE) | — |
| 🟠 #8 | PASS 2026 absent de la table | `PASS_PAR_ANNEE[2026]` = 48 060 € | — |
| 🟡 #9 | Majoration familiale Agirc-Arrco non calculée | `majorationEnfantsAgircArrco()` (10 %, plafond 2 367,48 €) + compteur d'enfants dédié | Branche « élevés » (enfant sans filiation, 9 ans de charge) non modélisable faute de donnée (cf. §3) |
| 🟡 #10 | Plafond d'écrêtement MICO non revalorisé au 1er juin 2026 | `PLAFOND_GLOBAL_PENSIONS_2026` = 17 338,68 € | Deux valeurs coexistent sur 2026 ; le module n'a pas de date d'effet du MICO (cf. §2) |
| 🟡 #11 | Décompte des trimestres d'âge : arrondi manquant | `ceil(mois / 3)` dans `decoteSurAge()` et `decoteSurAgeFonctionPublique()` | — |
| 🟡 #12 | CNAVPL : règle du plus petit des deux comptages non appliquée | `decoteCNAVPL()`, taux plein à 67 ans (art. L. 643-4 CSS) | — |
| 🔵 #13 | Barème LFSS 2026 appliqué sans borne de fin | Avertissement à l'écran au-delà du 31/12/2027 (`baremeDependDUneLoiNonVotee()`) | ⚠️ **Le calcul est inchangé** : aucune alternative sourcée n'existe pour l'après-2027, seule l'incertitude est signalée |

## 3. Dette identifiée

Classement par risque, revérifié contre le code au 2026-09-01 (`git log`, lecture directe). Les
écarts numérotés (#1 à #16) renvoient à `docs/audit/audit-retraite.md` §7, qui les compare à
`docs/retraite-base-referentiel.md`. La numérotation #1 à #13 de l'audit externe de la sous-section
« Carrière » (`docs/audit-retraite-carriere.md`) est distincte et signalée comme telle quand elle
est citée.

### 🔴 Bloquant (peut fausser un calcul montré au client)

Aucun bloquant ouvert au 2026-09-01.

⚠️ La mention « aucun bloquant ouvert » qui figurait ici au 2026-08-27 était **inexacte** : l'audit
externe de la sous-section « Carrière » (`docs/audit-retraite-carriere.md`, §5) a identifié trois
défauts bloquants au sens de la grille de ce document (« peut fausser un calcul montré au client »)
qui n'étaient alors ni listés ni connus. Ils sont désormais **corrigés** (détail des corrections en
§2), et retirés de la dette ouverte à ce titre :

- **Audit Carrière #1 — SAM : plafonnement et revalorisation dans le mauvais ordre : soldé.** Le
  revenu était revalorisé puis comparé au PASS *nominal* de son année ; l'ordre légal est l'inverse.
  Écrasait à tort les revenus des années anciennes (−35 % sur une année 1990 à 90 % du PASS). Ordre
  inversé dans `calculerSAM()`, PASS 2026 ajouté à la table dans le même mouvement (audit #8, sans
  quoi la correction rendait 2026 anormalement favorable par contraste).
- **Audit Carrière #2 — décote régime général plafonnée à −20 % au lieu de −25 % : soldé.** Le −20 %
  confondait le plafond *en nombre de trimestres* (20, art. R. 351-27 CSS) avec un plafond *en
  pourcentage*. Toute pension d'un assuré à 20 trimestres manquants ou plus était surestimée
  d'environ 6,7 %. `decoteSurTrimestres()` supprimée au profit de
  `decoteSurTrimestresPlafond25()`, et `decoteSurAge()` aligné sur le même plafond — sans quoi
  `decoteApplicable()` aurait écrêté le résultat commun et annulé la correction.
- **Audit Carrière #3 — surcote classique : mauvaise période de référence : soldé.** Les deux
  surcotes partageaient le compteur de la parentale (année civile précédant l'âge légal), d'où deux
  erreurs de sens opposé : surcote accordée à tort à qui liquide dès l'âge légal, et surcote bornée
  à 4 trimestres (voire nulle) pour qui prolonge son activité. Période propre implémentée dans
  `trimestresCotisesPeriodeSurcoteClassique()`.

Les quatre écarts précédemment listés ici ont, eux, été traités antérieurement (cf. §2) :

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

- **Surcote classique — date d'acquisition du dernier trimestre requis absente des données.**
  ⚠️ Entrée **requalifiée** : elle décrivait auparavant un problème d'arrondi des bornes de la
  période de référence, classé « cas limite ». Le vrai défaut n'était pas un arrondi mais une
  **fenêtre de comptage placée du mauvais côté de l'âge légal** — un bug, pas une limite assumée,
  corrigé depuis (audit Carrière #3, cf. section 🔴 ci-dessus et §2).
  La dette qui subsiste est distincte et porte uniquement sur la **seconde condition d'ouverture**
  de la période (art. L. 351-1-2 CSS) : celle-ci démarre au plus tard des deux dates entre l'âge
  légal et l'acquisition du dernier trimestre requis, or aucune date d'acquisition de trimestre
  n'existe dans `retraite_carriere_detail`. Pour un assuré qui complète sa durée requise *après*
  son âge légal, la période retenue démarre donc trop tôt et la surcote est surestimée. Lever cette
  dette suppose une donnée nouvelle, pas un changement de calcul.
  Subsiste par ailleurs, en marge, la granularité annuelle de `parAnnee` aux deux bornes de la
  fenêtre (année de l'âge légal exclue en entier, année de la date d'effet incluse en entier) —
  simplifications explicitement assumées et chiffrées en §2, de sens prudent à l'ouverture.
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
- **Valeur de référence MIGA 2026 : soldée, confirmée par le SRE.** Le calcul retenait
  volontairement la valeur 2025 (1 248,33 €/mois) faute de source opposable, avec avertissement à
  l'écran. La valeur 2026 est désormais **confirmée par le Service des Retraites de l'État**
  (16 396,19 €/an, soit 1 366,35 €/mois) : elle est en place, la réserve est levée et
  l'avertissement retiré de `CarriereFonctionPublique.tsx` (cf. §2). La sous-estimation du minimum
  garanti qui était signalée ici n'a plus lieu d'être.
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
