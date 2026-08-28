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
- **Démembrement appliqué de façon inégale selon l'écran** — voir 3.1 : `usePatrimoineCalculations` et `PatrimoineChart` pondèrent par le barème 669, `PatrimoineTreeView` ne le fait pas.
- **Emprunts de société exclus des totaux Patrimoine** (`emprunts.filter(e => !e.societe_id)`) : un emprunt rattaché à une société est déjà reflété dans la valorisation des parts détenues, donc explicitement écarté ici pour ne pas le compter deux fois — cohérent avec `buildPassifLines` côté Transmission (non ré-audité ici, hors périmètre).
- **Participation aux acquêts hors périmètre de ce module** : `usePatrimoineOriginaire`/`usePatrimoineFinal`/`patrimoineAcquetsService.ts` (CRUD simple, aucune logique métier propre) alimentent en réalité les écrans du régime matrimonial (`src/components/famille/matrimonial/PatrimoineOriginaireSection.tsx` / `PatrimoineFinalSection.tsx`) et le calcul de la créance de participation (`lib/patrimoine/participationAcquets.ts`), qui relèvent du module Régime matrimonial, pas de l'écran Patrimoine. Non audités en détail ici.
- **Régime fiscal des plus-values** (`regimeFiscalPlusValue.ts` + `regimeFiscalPVI.ts` + `assetFiscalRegime.ts`) : moteur nature-par-nature avec repli explicite sur `'non_determine'` plutôt que de deviner un régime pour une nature non couverte — bonne pratique documentée en tête de fichier avec la liste exhaustive des natures couvertes et des changements par rapport à l'ancien système (`NATURES_PFU`/`NATURES_EXONEREES`).

## 3. Dette identifiée

### 🔴 Bugs techniques confirmés

**B1 — Le bandeau "éléments exclus des totaux" est inexact : seule une partie des totaux exclut réellement les éléments non qualifiés.**
`usePatrimoineCalculations.ts:114-122` (`financialSummary`) inclut la valeur pleine de **tout** actif/passif, y compris ceux dont `qualification_bien` est NULL ou `'À qualifier'` — seule l'exclusion liée au démembrement (âge usufruitier non calculable) y est appliquée. À l'inverse, `patrimoineParPersonne` (lignes 133-244) exclut totalement de ses sommes tout actif/passif/emprunt non qualifié (capturé dans `unqualifiedItems`, catch de `BienNonQualifieError`). Le bandeau affiché en tête du Résumé (`PatrimoineResume.tsx:113-124`) annonce pourtant que ces éléments sont « exclus des totaux ci-dessous » — ce qui est faux pour les 3 cartes du haut (Actifs / Passifs / Patrimoine net) : elles continuent d'inclure leur valeur pleine. Conséquence directe : dès qu'un actif ou un passif n'a jamais été qualifié, `financialSummary.patrimoineNet` ≠ `patrimoineParPersonne.userValue + patrimoineParPersonne.spouseValue`, deux nombres affichés côte à côte sur le même écran (cartes du haut vs carte « Patrimoine par tête ») qui ne concordent plus, sans qu'aucun message n'explique l'écart à cet endroit précis.

**B2 — Couleur de catégorie incohérente pour "actifs corporels" (clé de mapping erronée, dupliquée à deux endroits).**
`ASSET_CATEGORIES` (`constants/assetTypes.ts:203`) définit la catégorie sous la clé `"actifs corporels"`, valeur que retourne `getAssetCategory()`. Mais la table de couleurs `CATEGORY_COLORS` (`lib/patrimoine/utils.ts:9`) et son doublon local dans `PatrimoineChart.tsx:20` utilisent la clé `"actifs mobiliers corporels"` — qui ne correspond à aucune catégorie réellement produite par `getAssetCategory()`. Résultat : `getCategoryColor('actifs corporels')` (utilisé par `PlusValuesCard`, `PatrimoinePlusValues`, `PatrimoineParTeteDetail`, `PatrimoineTreeView`) retombe sur son fallback `'#000000'` (noir), alors que `PatrimoineChart.tsx` (donut de répartition du Résumé) retombe sur son propre fallback `'#FF8B55'`, couleur déjà attribuée à `'épargne salariale'`/`'autres'`. Un même actif de catégorie "actifs corporels" (meubles, montres, bijoux, véhicules...) apparaît donc en noir sur certains écrans et confondu visuellement avec une autre catégorie sur le donut du Résumé.

**B3 — Démembrement appliqué de façon incohérente entre l'onglet Actifs et le Résumé/Plus-values.**
`usePatrimoineCalculations.ts` (agrégats du Résumé) et `PatrimoineChart.tsx` pondèrent `valeur_estimee` par la fraction issue du barème 669 CGI (`getFractionDemembrement`) pour tout actif en Usufruit/Nue-propriété. `PatrimoineTreeView.tsx`, lui, ne le fait à aucun endroit : `totalValue` (ligne 102), `calculateWeight` (poids % par catégorie/actif) et `getPlusValueDisplay`/`getCategoryPlusValue` (plus-value affichée par ligne et par catégorie) utilisent tous `asset.valeur_estimee` brut à 100 %, jamais la valeur pondérée. Pour tout actif démembré : le total de l'onglet "Actifs" et le total du Résumé divergent (l'un compte la pleine propriété, l'autre la fraction 669 CGI), et la plus-value affichée pour ce même actif diffère entre l'onglet "Actifs" (brute, non pondérée) et l'onglet "Plus-values" (pondérée par la fraction, cf. `usePatrimoineCalculations.ts:263-267`).

**B4 — Taux de prélèvements sociaux incohérent entre les deux moteurs fiscaux du module (17,2 % vs 18,6 %).**
`regimeFiscalPVI.ts:12` fixe `PVI_PS_RATE = 0.172` (17,2 %, appliqué à l'immobilier/LMNP). `regimeFiscalPlusValue.ts:15` fixe `PFU_PS = 0.186` (18,6 %, appliqué à Actions/Obligations/CTO/PEA/crypto/private equity, et à l'option "plus-value réelle" pour l'or/métaux précieux où le taux total implémenté est 37,6 % = 19 % + 18,6 %, au lieu de 36,2 % si le taux PS attendu était le même 17,2 % que celui utilisé pour l'immobilier ailleurs dans le même module). Le badge affiché à l'écran pour le PEA ≥ 5 ans mentionne lui-même explicitement "prélèvements sociaux (18,6 %) restant dus" (`regimeFiscalPlusValue.ts:212`). `PFU_RATE = 0.314` (12,8 % + 18,6 %) est donc utilisé pour toute plus-value financière générique, quand `PVI` totalise 36,2 % (19 % + 17,2 %) pour l'immobilier — deux taux de prélèvements sociaux différents cohabitent dans le même module pour ce qui devrait être un seul et même prélèvement social sur le capital. Impact chiffré : sur une plus-value PFU de 10 000 €, le module calcule 3 140 € d'impôt total (dont 1 860 € de PS) plutôt que 3 000 € (dont 1 720 € de PS) si le taux PS de 17,2 % utilisé côté immobilier était le taux correct.

### 🟠 Risques techniques

**R1 — `qualification_bien` (utilisé dans tous les totaux) peut devenir périmé sans que rien ne le signale à l'utilisateur.**
`AssetDetailsDialog.tsx:73-97` recalcule `qualifierBien()` à la volée pour l'affichage, avec ce commentaire explicite dans le code : « recalculée à la volée (pas persistée) pour rester cohérente si le régime matrimonial change après coup ». Le champ réellement consommé par `usePatrimoineCalculations` (`getPartSuccessorale`) et par le module Transmission est `asset.qualification_bien`, qui n'est réécrit que lorsque l'utilisateur rouvre et resauvegarde individuellement le formulaire de cet actif précis (`useAssetForm.ts`, watcher sur nature/origine/détenteur/mode de détention/`qualification_auto`, lignes ~208-234). Si le régime matrimonial ou le statut du couple change après la saisie d'un actif, l'écran de détail de cet actif affichera la qualification à jour, mais les totaux du Résumé et de la Transmission continueront d'utiliser l'ancienne valeur persistée jusqu'à ce que chaque actif concerné soit rouvert et resauvegardé manuellement — écart invisible entre ce que l'utilisateur voit à l'écran de détail et ce qui alimente réellement les totaux.

**R2 — `IncompleteAssetsBanner.onAssetClick` n'est jamais câblé : les lignes cliquables du bandeau ne font rien.**
`PatrimoineSection.tsx:75` monte `<IncompleteAssetsBanner assets={assets} />` sans passer `onAssetClick`. Les lignes de la liste détaillée du bandeau ont pourtant les classes `cursor-pointer hover:bg-background` (`IncompleteAssetsBanner.tsx:89`) et un `onClick={() => onAssetClick?.(asset)}` (ligne 90) qui, faute de handler fourni, ne produit aucun effet — l'utilisateur croit pouvoir cliquer sur un actif incomplet pour l'ouvrir, rien ne se passe.

**R3 — `checkMissing()` du bandeau d'actifs incomplets peut générer de faux positifs sur les actifs liquides.**
`IncompleteAssetsBanner.tsx:17-26` exige `date_estimation` et `mode_detention` pour tout actif sans exception, y compris les natures listées dans `NATURES_WITHOUT_ACQUISITION` (livrets, comptes courants...) pour lesquelles le formulaire de saisie ne présente pas nécessairement ces champs de la même façon. Le commentaire du code lui-même signale que le filtrage prévu ("Acquisition manquante seulement si pas un type sans acquisition") n'a pas été implémenté ("simplifié").

**R4 — "Coût total des intérêts" de `PassifDetailsDialog` est une approximation présentée sans réserve.**
`PassifDetailsDialog.tsx:165-169` : `coutInterets = mensualité × durée_restante − capital_restant_dû`. Ce calcul suppose une mensualité constante sur toute la durée restante et ne tient compte d'aucune variation de taux ni de remboursement anticipé ; contrairement aux moteurs de `regimeFiscalPlusValue.ts`/`regimeFiscalPVI.ts` qui accompagnent systématiquement leurs approximations d'une note explicite à l'utilisateur, cette valeur est affichée sans aucune mention d'estimation.

### 🟡 Dette mineure

**D1 — `CATEGORY_COLORS` dupliqué intégralement entre `lib/patrimoine/utils.ts` et `PatrimoineChart.tsx`** (mêmes 9 entrées, valeurs identiques). Deux sources de vérité pour la même table — la clé erronée du bug B2 devrait être corrigée aux deux endroits, symptôme direct de cette duplication.

**D2 — `PatrimoineParTeteDetail.tsx` (340 lignes) est du code mort** : jamais importé/monté par aucune route ni aucun composant. `PatrimoineResume.tsx` accepte une prop `onNavigateToParTete` que `PatrimoineSection.tsx` ne fournit jamais, donc la carte "Patrimoine par tête" du Résumé n'est pas cliquable (pas de `cursor-pointer`, comportement cohérent) mais l'écran de détail correspondant n'est accessible par aucun chemin de navigation.

**D3 — `formatPercentage` (`lib/patrimoine/utils.ts:33`) n'est utilisé nulle part dans le module Patrimoine** (aucune référence trouvée en dehors de sa définition et d'une fonction homonyme sans rapport dans le module Fiscalité/IFI).

**D4 — `formatCurrency` local redéfini trois fois** (`AssetDetailsDialog.tsx:99`, `PassifDetailsDialog.tsx:20`, `PatrimoineChart.tsx:87-94`), identique à celui exporté par `lib/patrimoine/utils.ts`, plutôt qu'importé.

### ⚖️ Règles métier à vérifier

Pour chaque règle, la formule ci-dessous est celle **effectivement implémentée** dans le code (à date du 2026-08-28) — la conformité juridique/fiscale reste à vérifier séparément.

**M1 — Part successorale d'un bien (`lib/patrimoine/succession.ts::getPartSuccessorale`)**
- `qualification_bien` NULL ou `'À qualifier'` → bloque (exception `BienNonQualifieError`), jamais de défaut deviné.
- `'Indivision'` → part réelle détenue par le défunt, lue depuis `pourcentage_utilisateur`/`pourcentage_conjoint` (complément à 100 % automatique si une seule des deux valeurs est renseignée, sinon 50/50 par défaut si aucune ne l'est — `getPourcentagesRepartition`, `utils.ts:148-173`).
- `'Bien commun'` → 50 % fixe, non paramétrable (demi-boni de communauté de droit).
- `'Bien propre'`/`'Bien personnel'` → 100 % si `detenteur` = utilisateur, 0 % si `detenteur` = conjoint (binaire, ignore tout pourcentage saisi).

**M2 — Qualification automatique bien propre/commun (`lib/patrimoine/qualification.ts::qualifierBien`)**
Cascade de règles dans cet ordre de priorité : (1) indivision explicite si `detenteur` contient "indivision" → `'Indivision'` ; (2) hors couple → `'Bien personnel'` ; (3) concubinage → `'Indivision'` si détenteur commun, sinon `'Bien personnel'` (jamais `'Bien propre'`, notion jugée sans objet hors communauté légale) ; (4) bien propre par nature (art. 1404) prioritaire en régime communautaire sauf clause d'extension (art. 1526) qui le fait tomber en commun ; (5) clause de remploi actée → propre, prioritaire sur tout le reste y compris communauté universelle ; (6) séparation de biens avec société d'acquêts → commun si désigné (par ID d'actif ou flag "résidence principale"), indivision si détenu par les deux sans désignation, propre sinon ; (7) séparation de biens ou participation aux acquêts → toujours propre ; (8) origine gratuite (donation/héritage/présent d'usage/création...) → propre, sauf clause d'entrée en communauté explicite sur donation/héritage (art. 1405 al. 2) → commun ; (9) communauté universelle → commun pour le reste ; (10) acquis avant le mariage → propre, sauf meuble sous communauté de meubles et acquêts → commun ; (11) PACS : convention d'indivision explicite → indivision ; à défaut de convention, indivision si PACS conclu avant le 01/01/2007, sinon propre (séparation par défaut, art. 515-5) ; (12) financement mixte en régime communautaire (art. 1436) : `apportFondsPropres / valeurAcquisition ≥ 0.5` → propre (récompense due à la communauté), sinon commun (récompense due à l'époux apporteur) ; (13) défaut régime légal : acquis pendant l'union à titre onéreux → commun.

**M3 — Barème de l'usufruit (art. 669 CGI) — `bareme669CGI.ts`**
9 tranches d'âge de l'usufruitier au jour du démembrement (< 21, 31, 41, 51, 61, 71, 81, 91, ≥ 91 ans), usufruit de 90 % à 10 %, nue-propriété de 10 % à 90 % en complément. Usufruit conjoint/successif : tranche déterminée sur l'âge du **plus jeune** usufruitier (`getTrancheBaremeForYoungest`).

**M4 — Plus-value latente (`lib/patrimoine/utils.ts::calculatePlusValue`)**
`plusValue = valeur_estimee − valeur_acquisition − frais_acquisition`. Pas d'abattement pour durée de détention à ce stade (calcul brut) ; `hasData = false` (exclu des agrégats) si `valeur_estimee` ou `valeur_acquisition` est NULL/undefined.

**M5 — Régime fiscal des plus-values génériques (PFU) — `regimeFiscalPlusValue.ts`**
`PFU_IR = 12,8 %`, `PFU_PS = 18,6 %`, `PFU_RATE = 31,4 %` (cf. B4 ci-dessus pour l'incohérence avec le taux PS immobilier du même module). Appliqué à : Actions, Obligations, Bons du Trésor, dette subordonnée, dette privée, CTO générique, matières premières, crypto (sans franchise de 305 €, volontairement non appliquée). PEA/PEA-PME et Private equity (FCPR/FPCI) : PFU si détention < 5 ans, sinon IR = 0 et seuls les PS restent dus. Actions gratuites, Stock-options, BSPCE : régime affiché à titre informatif uniquement (`ir`/`ps`/`total` = null), sans calcul.

**M6 — Régime fiscal des plus-values immobilières (PVI) — `regimeFiscalPVI.ts`**
`PVI_IR_RATE = 19 %`, `PVI_PS_RATE = 17,2 %`. Résidence principale : exonération totale sans condition de durée. Abattement IR : 0 % avant 6 ans, puis 6 %/an de la 6ᵉ à la 21ᵉ année, +4 % la 22ᵉ année (exonération totale à 22 ans). Abattement PS : 0 % avant 6 ans, puis 1,65 %/an de la 6ᵉ à la 21ᵉ année, +1,60 % la 22ᵉ année, puis 9 %/an de la 23ᵉ à la 30ᵉ année (exonération totale à 30 ans). Surtaxe progressive de 2 % à 6 % avec lissage aux bornes, appliquée au-delà de 50 000 € de plus-value imposable à l'IR (barème par tranches, art. 1609 nonies G CGI) — appliquée telle quelle aux "Terrains" faute de pouvoir distinguer les terrains à bâtir (qui devraient légalement en être exclus), décision documentée comme volontaire dans le code. LMNP : même barème que le régime général, avec note explicite que la réintégration des amortissements (obligatoire depuis 2025) n'est pas calculée — la plus-value réelle imposable est donc probablement sous-estimée pour ces biens.

**M7 — Or et métaux précieux — `regimeFiscalPlusValue.ts`**
Choix laissé à l'utilisateur entre taxe forfaitaire 11,5 % du prix de vente (`valeur_estimee`, sans historique requis) et option plus-value réelle à 37,6 % (cf. B4) avec abattement de 5 %/an au-delà de la 2ᵉ année de détention (exonération totale à 22 ans).

**M8 — Financement mixte, art. 1436 (`qualification.ts`)** — voir M2, point 12 : seuil de 50 % de la contribution en fonds propres par rapport au prix d'acquisition total, applicable uniquement en régime communautaire et uniquement si aucune clause de remploi totale n'est actée.

## 4. Périmètre V1/différé

- **"Objectifs patrimoniaux"** (carte du Résumé) : stub explicite ("Fonctionnalité à venir"), aucune logique.
- **Franchise crypto de 305 €** (seuil annuel cumulé toutes cessions) : volontairement non appliquée dans `regimeFiscalPlusValue.ts`, la vue étant par actif et non par année fiscale globale.
- **Terrains à bâtir** : non distingués des autres terrains (pas de champ dédié), la surtaxe PVI leur est donc appliquée à tort selon le commentaire du code lui-même.
- **Amortissements LMNP réintégrés** (obligatoire depuis 2025) : non calculés, absence de champ dédié dans le formulaire actif.
- **Décomposition gain d'acquisition/gain de cession** pour Actions gratuites, Stock-options, BSPCE : régime affiché à titre informatif, aucun calcul (champs de valeur à l'acquisition/à l'exercice absents du formulaire).
- **Option barème progressif de l'IR** (alternative au PFU) : jamais calculée, uniquement mentionnée en note.
- **Participation aux acquêts** (`usePatrimoineOriginaire`/`usePatrimoineFinal`, `participationAcquets.ts`) : hors périmètre de cet audit, rattachée au module Régime matrimonial.
