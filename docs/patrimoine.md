# Module Patrimoine

## 1. Vue d'ensemble

Le module Patrimoine centralise la saisie et la valorisation des actifs (`assets`) et des passifs (`passifs` / `emprunts`) du foyer, et en dérive trois lectures agrégées :

- **Résumé** (`PatrimoineResume.tsx`) : totaux actifs/passifs/patrimoine net, répartition par catégorie (donut), évolution dans le temps, patrimoine par tête, plus-values.
- **Actifs** (`PatrimoineActifs.tsx` + `PatrimoineTreeView.tsx`) : CRUD des actifs, arborescence par catégorie avec poids relatif et plus-value par ligne.
- **Passifs** (`PatrimoinePassifs.tsx`) : CRUD des emprunts et dettes simples.
- **Plus-values** (`PatrimoinePlusValues.tsx`) : détail des plus/moins-values latentes et fiscalité associée (PFU, PVI, régimes spécifiques par nature d'actif).

Le calcul central, `usePatrimoineCalculations.ts`, dérive trois agrégats à partir des mêmes données brutes (`assets`, `passifs`, `emprunts`) :

1. `financialSummary` — totaux bruts (Actifs / Passifs / Patrimoine net) affichés en haut du Résumé.
2. `patrimoineParPersonne` — répartition utilisateur/conjoint, en réutilisant `getPartSuccessorale` (`lib/patrimoine/succession.ts`), la même fonction que le module Transmission.
3. `plusValuesSummary` — plus-values latentes par actif et par catégorie.

Deux notions transverses pèsent sur ces trois agrégats :

- **Démembrement** (`lib/patrimoine/demembrementFraction.ts` + `bareme669CGI.ts`) : un actif en Usufruit/Nue-propriété est pondéré par le barème fiscal de l'art. 669 CGI selon l'âge de l'usufruitier ; si cet âge n'est pas calculable, l'actif est exclu des totaux (jamais compté à sa valeur pleine propriété par défaut).
- **Qualification civile** (`qualification_bien`, calculée par `lib/patrimoine/qualification.ts::qualifierBien`) : bien propre / commun / indivision / personnel, qui détermine la part revenant à chacun. Un bien jamais qualifié (`qualification_bien` NULL ou `'À qualifier'`) lève `BienNonQualifieError`.

## 2. Architecture & décisions

- **Source unique pour la part successorale** : `getPartSuccessorale`/`getPartConjointSuccession` (`lib/patrimoine/succession.ts`) sont partagées entre le Résumé Patrimoine et le module Transmission, pour éviter la divergence déjà rencontrée une fois par le passé entre ces deux écrans (cf. commentaire en tête de `succession.ts`, incident du 2026-07-18).
- **Qualification recalculée à l'affichage, persistée à la sauvegarde** : `qualifierBien()` est exécutée en direct dans `AssetDetailsDialog.tsx` pour l'affichage, et dans `useAssetForm.ts` (watcher sur nature/origine/détenteur/mode de détention/statut du couple) pour préremplir `qualification_bien` à chaque sauvegarde du formulaire d'actif. La valeur qui alimente réellement tous les totaux (Résumé, Transmission) est le champ persisté `qualification_bien`, pas un recalcul live à la demande — voir 3.2 pour le risque que cela pose.
- **Démembrement appliqué de façon cohérente sur tous les écrans du module** (corrigé le 28/08/2026, cf. section 3 « ✅ Corrigé ») : `usePatrimoineCalculations`, `PatrimoineChart` et `PatrimoineTreeView` pondèrent tous par le même `getFractionDemembrement` (`lib/patrimoine/demembrementFraction.ts`).
- **Emprunts de société exclus des totaux Patrimoine** (`emprunts.filter(e => !e.societe_id)`) : un emprunt rattaché à une société est déjà reflété dans la valorisation des parts détenues, donc explicitement écarté ici pour ne pas le compter deux fois — cohérent avec `buildPassifLines` côté Transmission (non ré-audité ici, hors périmètre).
- **Participation aux acquêts hors périmètre de ce module** : `usePatrimoineOriginaire`/`usePatrimoineFinal`/`patrimoineAcquetsService.ts` (CRUD simple, aucune logique métier propre) alimentent en réalité les écrans du régime matrimonial (`src/components/famille/matrimonial/PatrimoineOriginaireSection.tsx` / `PatrimoineFinalSection.tsx`) et le calcul de la créance de participation (`lib/patrimoine/participationAcquets.ts`), qui relèvent du module Régime matrimonial, pas de l'écran Patrimoine. Non audités en détail ici.
- **Régime fiscal des plus-values** (`regimeFiscalPlusValue.ts` + `regimeFiscalPVI.ts` + `assetFiscalRegime.ts`) : moteur nature-par-nature avec repli explicite sur `'non_determine'` plutôt que de deviner un régime pour une nature non couverte — bonne pratique documentée en tête de fichier avec la liste exhaustive des natures couvertes et des changements par rapport à l'ancien système (`NATURES_PFU`/`NATURES_EXONEREES`).

## 3. Dette identifiée

### ✅ Corrigé (commit à venir)

Corrigés le 28/08/2026, priorité P0 (faussaient des montants civils et fiscaux affichés à l'utilisateur) :

**IB1 — Démembrement (barème 669 CGI) ignoré côté Transmission.** `buildPatrimonySnapshot`, `buildSurvivingSpousePatrimony`, `buildSpouseRawAssets`, `buildSpouseOwnBasePatrimony` (`utils/transmissionHelpers.ts`) et `dmtgAssets`/`deltaAvantageMatrimonial`/la valeur DUH (`lib/transmission/index.ts`) pondèrent désormais la valeur de chaque actif par `getFractionDemembrement` (`lib/patrimoine/demembrementFraction.ts`, même fonction que le Résumé Patrimoine) avant toute autre pondération, via deux nouveaux champs optionnels `assetDemembrements`/`demembrementCtx` propagés depuis les 4 écrans appelants (`Synthese.tsx`, `ProcessusCalcul.tsx`, `AssuranceVie.tsx`, `Succession2ndDeces.tsx`).

**IB2 — Fallback `valeur_estimee`/`valeur_acquisition` harmonisé entre l'assiette civile et l'assiette fiscale DMTG.** Les deux passent désormais par le même helper (`getValeurEstimeePonderee`, dupliqué à l'identique — même repli `valeur_estimee → valeur_acquisition → 0` — dans `transmissionHelpers.ts` et `lib/transmission/index.ts`, faute de pouvoir partager une fonction entre ces deux fichiers sans les fusionner), pondération démembrement (IB1) appliquée par-dessus.

**B3 — Démembrement appliqué de façon cohérente dans l'onglet Actifs.** `PatrimoineTreeView.tsx` (`totalValue`, poids par catégorie/actif, `getPlusValueDisplay`/`getCategoryPlusValue`) utilise désormais `getFractionDemembrement` via un nouveau helper local `getWeightedValue`, identique à la pondération déjà appliquée par le Résumé Patrimoine et `PatrimoineChart.tsx` — y compris pour la colonne "Valeur" elle-même (nécessaire pour que le Total de la table reste cohérent avec la somme de ses lignes).

Vérifié : les 681 tests existants passent inchangés (aucun actif non démembré affecté, fraction 1 = valeur inchangée) ; vérification ad-hoc supplémentaire (script temporaire, non committé) confirmant qu'un même actif en Nue-propriété produit la même valeur pondérée dans `getFractionDemembrement`, `buildPatrimonySnapshot` (assiette civile) et `dmtgAssets` (assiette fiscale).

Corrigé le 28/08/2026, priorité P1 :

**B1 — Bandeau "éléments exclus des totaux" trompeur.** `financialSummary` (`usePatrimoineCalculations.ts`) est désormais dérivé de `patrimoineParPersonne` (`userActifs+spouseActifs`, `userPassifs+spousePassifs`, `userValue+spouseValue`) au lieu de resommer `assets`/`passifs`/`emprunts` bruts, garantissant `financialSummary.patrimoineNet === patrimoineParPersonne.userValue + spouseValue` dans tous les cas — un actif/passif/emprunt déjà qualifié n'est pas affecté (681 tests inchangés).

Corrigé le 28/08/2026, priorité P2 (cosmétique/UX/dette de code, sans impact sur un chiffre fiscal ou civil affiché) :

**B2 — Couleur de catégorie incohérente pour "actifs corporels".** Clé corrigée de `"actifs mobiliers corporels"` à `"actifs corporels"` dans `CATEGORY_COLORS` (`lib/patrimoine/utils.ts`), pour matcher la clé réellement produite par `getAssetCategory()` — combiné avec D1 (voir ci-dessous), `PatrimoineChart.tsx` importe désormais cette même table au lieu d'en garder une copie locale à corriger séparément.

**D1 — `CATEGORY_COLORS` dédupliqué.** `PatrimoineChart.tsx` importe `CATEGORY_COLORS`/`formatCurrency` depuis `lib/patrimoine/utils.ts` au lieu de redéfinir sa propre copie (couleurs + formatage identiques).

**R1 — Indicateur de péremption de `qualification_bien`.** `AssetDetailsDialog.tsx` affiche désormais une note discrète quand la qualification recalculée à la volée (`qualifierBien()`) diffère de la valeur persistée `asset.qualification_bien` (celle réellement consommée par les totaux) — uniquement en mode qualification automatique, pour ne pas signaler un écart sur une qualification définie manuellement.

**R2 — `IncompleteAssetsBanner.onAssetClick` câblé.** `PatrimoineSection.tsx` passe désormais `onAssetClick={setSelectedAsset}` et monte `AssetDetailsDialog` pour l'actif sélectionné — cliquer sur une ligne du bandeau ouvre bien sa fiche.

**R3 — Faux positifs de `checkMissing()` sur les actifs liquides corrigés.** `mode_detention` et `date_estimation` ne sont plus exigés pour les natures listées dans `NATURES_WITHOUT_ACQUISITION` (livrets, comptes courants...).

**R4 — Note d'estimation ajoutée sur le "Coût total des intérêts".** `PassifDetailsDialog.tsx` affiche désormais une note précisant que ce montant suppose une mensualité constante, hors variation de taux et remboursement anticipé — sur le modèle des notes déjà présentes dans `regimeFiscalPlusValue.ts`/`regimeFiscalPVI.ts`.

**D2 — `PatrimoineParTeteDetail.tsx` câblé plutôt que supprimé (arbitrage utilisateur).** `PatrimoineSection.tsx` gère désormais un état `showParTeteDetail` (même pattern que `showPlusValuesDetail`) et transmet `onNavigateToParTete` à `PatrimoineResume` : la carte "Patrimoine par tête" du Résumé est cliquable et ouvre l'écran de détail, qui n'était auparavant accessible par aucun chemin de navigation.

**D3 — `formatPercentage` supprimé** (`lib/patrimoine/utils.ts`), confirmé inutilisé dans le module après vérification (aucune référence hors sa propre définition).

**D4 — `formatCurrency` dédupliqué.** `AssetDetailsDialog.tsx` et `PassifDetailsDialog.tsx` délèguent désormais le formatage à `formatCurrency` de `lib/patrimoine/utils.ts` (leur garde `!value → 'Non renseigné'` est conservée, propre à ces deux dialogues) ; `PatrimoineChart.tsx` traité avec D1 ci-dessus.

### ✅ Conformité vérifiée

**C1 — Les deux taux de prélèvements sociaux (17,2 % vs 18,6 %) sont corrects, pas une incohérence.**
`regimeFiscalPVI.ts:12` fixe `PVI_PS_RATE = 0.172` (17,2 %, appliqué à l'immobilier/LMNP). `regimeFiscalPlusValue.ts:15` fixe `PFU_PS = 0.186` (18,6 %, appliqué à Actions/Obligations/CTO/PEA/crypto/private equity, et à l'option "plus-value réelle" pour l'or/métaux précieux, où le taux total implémenté est 37,6 % = 19 % + 18,6 %). Un précédent passage de cet audit avait signalé cette différence comme un bug technique (taux PS incohérent au sein du même module). Vérification juridique effectuée le 28/08/2026 : depuis la LFSS 2026 (loi n° 2025-1403 du 30/12/2025, effective au 1ᵉʳ janvier 2026), la CSG sur les revenus du capital mobilier est passée de 9,2 % à 10,6 %, portant les prélèvements sociaux à 18,6 % — mais uniquement pour les revenus de capitaux mobiliers (actions, obligations, PEA, crypto, or/métaux précieux en régime réel). L'immobilier (plus-values immobilières classiques et LMNP à la revente) n'est pas concerné par cette hausse et reste à 17,2 %. Les deux taux implémentés (`PVI_PS_RATE = 17,2 %` et `PFU_PS = 18,6 %`) reflètent donc correctement cette différence de réforme selon la nature du revenu, et non une incohérence du code.
Recommandation : documenter en commentaire dans `regimeFiscalPVI.ts` (à côté de `PVI_PS_RATE`) et dans `regimeFiscalPlusValue.ts` (à côté de `PFU_PS`) la raison de cette différence de taux (référence à la LFSS 2026), pour qu'un futur développeur ne les "harmonise" pas par erreur en pensant corriger une incohérence.

### ⚖️ Règles métier à vérifier

Pour chaque règle, la formule ci-dessous est celle **effectivement implémentée** dans le code (à date du 2026-08-28) — la conformité juridique/fiscale reste à vérifier séparément.

**M1 — Part successorale d'un bien (`lib/patrimoine/succession.ts::getPartSuccessorale`)**
- `qualification_bien` NULL ou `'À qualifier'` → bloque (exception `BienNonQualifieError`), jamais de défaut deviné.
- `'Indivision'` → part réelle détenue par le défunt, lue depuis `pourcentage_utilisateur`/`pourcentage_conjoint` (complément à 100 % automatique si une seule des deux valeurs est renseignée, sinon 50/50 par défaut si aucune ne l'est — `getPourcentagesRepartition`, `utils.ts:148-173`).
- `'Bien commun'` → 50 % fixe, non paramétrable (moitié de la communauté revenant à chaque époux).
- `'Bien propre'`/`'Bien personnel'` → 100 % si `detenteur` = utilisateur, 0 % si `detenteur` = conjoint (binaire, ignore tout pourcentage saisi).

**M2 — Qualification automatique bien propre/commun (`lib/patrimoine/qualification.ts::qualifierBien`)**
Cascade de règles dans cet ordre de priorité : (1) indivision explicite si `detenteur` contient "indivision" → `'Indivision'` ; (2) hors couple → `'Bien personnel'` ; (3) concubinage → `'Indivision'` si détenteur commun, sinon `'Bien personnel'` (jamais `'Bien propre'`, notion jugée sans objet hors communauté légale) ; (4) bien propre par nature (art. 1404) prioritaire en régime communautaire sauf clause d'extension (art. 1526) qui le fait tomber en commun ; (5) clause de remploi actée → propre, prioritaire sur tout le reste y compris communauté universelle ; (6) séparation de biens avec société d'acquêts → commun si désigné (par ID d'actif ou flag "résidence principale"), indivision si détenu par les deux sans désignation, propre sinon ; (7) séparation de biens ou participation aux acquêts → toujours propre ; (8) origine gratuite (donation/héritage/présent d'usage/création...) → propre, sauf clause d'entrée en communauté explicite sur donation/héritage (art. 1405 al. 2) → commun ; (9) communauté universelle → commun pour le reste ; (10) acquis avant le mariage → propre, sauf meuble sous communauté de meubles et acquêts → commun ; (11) PACS : convention d'indivision explicite → indivision ; à défaut de convention, indivision si PACS conclu avant le 01/01/2007, sinon propre (séparation par défaut, art. 515-5) ; (12) financement mixte en régime communautaire (art. 1436) : `apportFondsPropres / valeurAcquisition ≥ 0.5` → propre (récompense due à la communauté), sinon commun (récompense due à l'époux apporteur) ; (13) défaut régime légal : acquis pendant l'union à titre onéreux → commun.

**M3 — Barème de l'usufruit (art. 669 CGI) — `bareme669CGI.ts`**
9 tranches d'âge de l'usufruitier au jour du démembrement (< 21, 31, 41, 51, 61, 71, 81, 91, ≥ 91 ans), usufruit de 90 % à 10 %, nue-propriété de 10 % à 90 % en complément. Usufruit conjoint/successif : tranche déterminée sur l'âge du **plus jeune** usufruitier (`getTrancheBaremeForYoungest`).

**M4 — Plus-value latente (`lib/patrimoine/utils.ts::calculatePlusValue`)**
`plusValue = valeur_estimee − valeur_acquisition − frais_acquisition`. Pas d'abattement pour durée de détention à ce stade (calcul brut) ; `hasData = false` (exclu des agrégats) si `valeur_estimee` ou `valeur_acquisition` est NULL/undefined.

**M5 — Régime fiscal des plus-values génériques (PFU) — `regimeFiscalPlusValue.ts`**
`PFU_IR = 12,8 %`, `PFU_PS = 18,6 %`, `PFU_RATE = 31,4 %` (cf. C1 ci-dessus : taux PS spécifique aux revenus de capitaux mobiliers depuis la LFSS 2026, distinct du taux immobilier du même module). Appliqué à : Actions, Obligations, Bons du Trésor, dette subordonnée, dette privée, CTO générique, matières premières, crypto (sans franchise de 305 €, volontairement non appliquée). PEA/PEA-PME et Private equity (FCPR/FPCI) : PFU si détention < 5 ans, sinon IR = 0 et seuls les PS restent dus. Actions gratuites, Stock-options, BSPCE : régime affiché à titre informatif uniquement (`ir`/`ps`/`total` = null), sans calcul.

**M6 — Régime fiscal des plus-values immobilières (PVI) — `regimeFiscalPVI.ts`**
`PVI_IR_RATE = 19 %`, `PVI_PS_RATE = 17,2 %`. Résidence principale : exonération totale sans condition de durée. Abattement IR : 0 % avant 6 ans, puis 6 %/an de la 6ᵉ à la 21ᵉ année, +4 % la 22ᵉ année (exonération totale à 22 ans). Abattement PS : 0 % avant 6 ans, puis 1,65 %/an de la 6ᵉ à la 21ᵉ année, +1,60 % la 22ᵉ année, puis 9 %/an de la 23ᵉ à la 30ᵉ année (exonération totale à 30 ans). Surtaxe progressive de 2 % à 6 % avec lissage aux bornes, appliquée au-delà de 50 000 € de plus-value imposable à l'IR (barème par tranches, art. 1609 nonies G CGI) — appliquée telle quelle aux "Terrains" faute de pouvoir distinguer les terrains à bâtir (qui devraient légalement en être exclus), décision documentée comme volontaire dans le code. LMNP : même barème que le régime général, avec note explicite que la réintégration des amortissements (obligatoire depuis 2025) n'est pas calculée — la plus-value réelle imposable est donc probablement sous-estimée pour ces biens.

**M7 — Or et métaux précieux — `regimeFiscalPlusValue.ts`**
Choix laissé à l'utilisateur entre taxe forfaitaire 11,5 % du prix de vente (`valeur_estimee`, sans historique requis) et option plus-value réelle à 37,6 % (19 % IR + 18,6 % PS, cf. C1) avec abattement de 5 %/an au-delà de la 2ᵉ année de détention (exonération totale à 22 ans).

**M8 — Financement mixte, art. 1436 (`qualification.ts`)** — voir M2, point 12 : seuil de 50 % de la contribution en fonds propres par rapport au prix d'acquisition total, applicable uniquement en régime communautaire et uniquement si aucune clause de remploi totale n'est actée.

## 4. Périmètre V1/différé

- **"Objectifs patrimoniaux"** (carte du Résumé) : stub explicite ("Fonctionnalité à venir"), aucune logique.
- **Franchise crypto de 305 €** (seuil annuel cumulé toutes cessions) : volontairement non appliquée dans `regimeFiscalPlusValue.ts`, la vue étant par actif et non par année fiscale globale.
- **Terrains à bâtir** : non distingués des autres terrains (pas de champ dédié), la surtaxe PVI leur est donc appliquée à tort selon le commentaire du code lui-même.
- **Amortissements LMNP réintégrés** (obligatoire depuis 2025) : non calculés, absence de champ dédié dans le formulaire actif.
- **Décomposition gain d'acquisition/gain de cession** pour Actions gratuites, Stock-options, BSPCE : régime affiché à titre informatif, aucun calcul (champs de valeur à l'acquisition/à l'exercice absents du formulaire).
- **Option barème progressif de l'IR** (alternative au PFU) : jamais calculée, uniquement mentionnée en note.
- **Participation aux acquêts** (`usePatrimoineOriginaire`/`usePatrimoineFinal`, `participationAcquets.ts`) : hors périmètre de l'audit interne du module (sections 1-4), rattachée au module Régime matrimonial — son interaction avec Patrimoine est couverte en section 5 (IR1).
- **Libéralité conjointe aux deux époux** (`qualification.ts`, branche `estGratuit`) : l'art. 1405 al. 2 fait tomber en communauté, par défaut, une donation/succession faite conjointement aux deux époux — l'inverse de la règle générale "origine gratuite = propre" appliquée ici. Non capturé faute de champ permettant de dire qu'une libéralité a été faite conjointement (décision arbitrage du 28/08/2026, limite acceptée en l'absence de dossier client concerné à ce jour).
- **Meubles reçus par donation/succession pendant le mariage, sous communauté de meubles et acquêts** (`qualification.ts`, branche "acquis avant le mariage") : ce régime rend communs tous les meubles, y compris ceux reçus à titre gratuit pendant le mariage (sauf clause de non-rapport), mais seule l'acquisition avant mariage est traitée spécifiquement — un tel meuble retombe à tort dans la règle générale "origine gratuite = propre". Régime rare (mariages avant 1966 sans contrat) : limite acceptée en l'absence de dossier client concerné à ce jour (décision arbitrage du 28/08/2026).

## 5. Interactions avec les autres modules

Audit des points où un autre module (Transmission, Retraite, Régime matrimonial, Sociétés) lit, duplique ou dépend de données/calculs du module Patrimoine. Contrairement aux sections 1-4 (module Patrimoine seul), cette section porte sur la cohérence *entre* modules.

Les deux bugs initialement identifiés ici (IB1 — démembrement ignoré côté Transmission, IB2 — fallback incohérent entre assiette civile et assiette fiscale DMTG) ont été corrigés le 28/08/2026, cf. section 3 « ✅ Corrigé ». IR1 et IR2 (ci-dessous) ont également été corrigés le 28/08/2026, à titre de correctifs a minima (voir note dans chaque entrée pour ce qui reste hors périmètre).

### ✅ Corrigé

**IR1 — Participation aux acquêts découplée des actifs Patrimoine.** `PatrimoineOriginaireSection.tsx`/`PatrimoineFinalSection.tsx` : sélectionner un actif via `bienConcerneId` préremplit désormais le champ `valeur` avec sa `valeur_estimee` actuelle au moment de la sélection. Correctif a minima : pas de resynchronisation continue si l'actif est revalorisé après coup — l'utilisateur reste libre d'ajuster la valeur manuellement pour refléter la date exacte du fait générateur.

**IR2 — Hypothèse non vérifiée sur la valorisation nette des sociétés.** `SocieteForm.tsx` : ajout d'un texte d'aide sous le champ `valeurEstimee` précisant que la valeur saisie doit être nette des emprunts de la société. Un lien technique existe (`Emprunt.societe_id`), mais `SocieteFormData`/`SocieteFormProps` ne transportent pas l'`id` de la société éditée (`initialData` est typé sans `id`, `onSubmit` reçoit `Omit<SocieteFormData, 'id'>`) — afficher le total des emprunts liés nécessiterait d'ajouter cet id en prop et de câbler l'appelant (`SocieteFormPage`/dialog), jugé hors périmètre du correctif a minima et proposé séparément plutôt qu'implémenté.

Corrigé le 28/08/2026, priorité P2 :

**IR3 — Colonne "Utilisateur" de Retraite > Épargne corrigée (arbitrage utilisateur : aligner sur la convention Patrimoine).** `EpargneRetraite.tsx` calcule désormais la colonne "Utilisateur" comme `1 - partConjoint(asset)` au lieu du total du foyer entier, pour que colonne "Utilisateur" + colonne "Conjoint" fassent le total du foyer, même convention que "Patrimoine par tête" (`userValue + spouseValue = totalValue`). Un actif jamais qualifié (catch `BienNonQualifieError`) est traité comme 100 % utilisateur / 0 % conjoint par ce calcul (comportement hérité de `partConjoint`, non modifié ici) — distinct de Patrimoine, qui exclut totalement ces actifs des deux côtés.

**ID1 — Barème 669 CGI unifié.** `lib/dmtg/index.ts` dérive désormais `DEFAULT_DMTG_PARAMS.demembrementViager` de `BAREME_669_CGI` (`lib/patrimoine/bareme669CGI.ts`) à l'exécution, au lieu de lire la copie indépendante dans `params-dmtg.json` — une seule source de vérité pour le barème légal, le champ JSON n'étant plus consommé tel quel (conservé pour référence, commentaires croisés ajoutés dans les deux fichiers).

**ID2 — Commentaire de `useAlertesConseil.ts` complété.** Précise désormais explicitement pourquoi ce total "patrimoine net" ne réutilise pas `usePatrimoineCalculations.financialSummary` (coût des hooks Supabase supplémentaires pour une valeur jamais affichée telle quelle, seulement comparée à un seuil) — calcul lui-même inchangé, l'approximation reste volontaire et son impact limité (cf. version précédente de cette entrée pour le détail).

### ✅ Conformité vérifiée

**IC1 — `getPartSuccessorale`/`getPartConjointSuccession` sont appelées de façon cohérente entre Patrimoine et Transmission.**
Vérification des points d'appel (`usePatrimoineCalculations.ts`, `PatrimoineParTeteDetail.tsx`, `EpargneRetraite.tsx`, `SocietesTransmission.tsx`, `transmissionHelpers.ts`, `lib/transmission/index.ts`) : toutes passent le même objet `SuccessionAssetInput` (`qualification_bien`, `detenteur`, `pourcentage_utilisateur`, `pourcentage_conjoint`) directement issu de la ligne base de données, sans mise en cache ni recalcul local divergent. Aucune version alternative ou dupliquée de cette fonction n'a été trouvée ailleurs dans le code. La divergence identifiée en IB1/IB2 porte sur la valeur en amont de l'appel (pondération démembrement, fallback d'acquisition), pas sur la fonction partagée elle-même, qui reste une source unique de vérité fiable.

**IC2 — Le filtre "emprunts de société exclus des passifs" est appliqué de façon strictement identique entre Patrimoine et Transmission.**
`emprunts.filter(e => !e.societe_id)` (`usePatrimoineCalculations.ts:119`, `PatrimoineChart.tsx:71`) et `buildPassifLines` (`transmissionHelpers.ts:787-788`) utilisent la même condition, sur le même champ. La mécanique d'exclusion elle-même est donc cohérente entre les deux modules — le risque résiduel (IR2) porte sur l'hypothèse de valorisation nette de la société consommée en aval, pas sur ce filtre.

---

**Note de validation juridique (28/08/2026).** Les règles M2 (qualification civile), M3 (barème 669) et M5-M7 (régimes fiscaux des plus-values) ont fait l'objet d'une vérification juridique en ligne le 28/08/2026, avec confirmation de conformité aux articles 1404, 1405 al. 2, 1436 et 1526 du Code civil, à l'article 669 du CGI, et à la LFSS 2026 pour les taux de prélèvements sociaux (cf. C1). Portée de cette vérification : cohérence des taux, seuils et règles principales citées dans ce document — elle ne constitue ni une relecture exhaustive de la jurisprudence applicable, ni un avis juridique.
