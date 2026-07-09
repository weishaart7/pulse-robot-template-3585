# Audit du code — Section Patrimoine

> Document généré en lecture seule à des fins d'audit externe. Aucun fichier du dépôt n'a été modifié pour produire ce résumé.

---

## 1. Fichiers composant la section Patrimoine

**Route**
- `src/App.tsx` : `/dashboard/:section` (via `DashboardLayout` + `ProtectedRoute`) → `src/pages/DashboardSection.tsx` dispatche vers `PatrimoineSection` quand `section === 'patrimoine'`. Il n'existe pas de route dédiée `/patrimoine` : l'URL réelle est `/dashboard/patrimoine`.
- `src/pages/patrimoine/PatrimoineSection.tsx` — conteneur d'onglets (Résumé / Actifs / Passifs / détail Plus-values).

**Composants — `src/components/patrimoine/`**
`PatrimoineActifs.tsx`, `PatrimoinePassifs.tsx`, `PatrimoineResume.tsx`, `PatrimoinePlusValues.tsx`, `PatrimoineParTeteDetail.tsx`, `PatrimoineChart.tsx`, `PatrimoineTreeView.tsx`, `AssetDetailsDialog.tsx`, `PassifDetailsDialog.tsx`, `PassifForm.tsx`, `EmpruntForm.tsx`, `PlusValuesCard.tsx`, `IncompleteAssetsBanner.tsx`.

**Composant isolé (probable code mort)**
- `src/components/PatrimoineDashboard.tsx` — widget camembert + répartition par catégorie, prend `assets: Asset[]` en prop. **Aucun import de ce composant n'a été trouvé depuis l'arbre de routes Patrimoine actuel** — à vérifier auprès du prochain reviewer avant de l'exclure du périmètre (candidat code mort, à confirmer par un grep global).

**Sous-formulaires — `src/components/assets/`**
`AssetForm.tsx`, `IndivisairesSection.tsx`, `ChargeForm.tsx`.

**Hooks**
- `src/hooks/usePatrimoineCalculations.ts` — agrégateur central des calculs.
- `src/hooks/useAssets.ts` — CRUD/fetch `assets` + `useAssetCharges(assetId)`.
- `src/hooks/useAssetForm.ts` — câblage react-hook-form pour `AssetForm`.
- `src/hooks/useSocietesIntegration.ts` — calculs IFI/Transmission/Budget pour les sociétés (module Sociétés, mais couplé structurellement).
- `src/hooks/useImmobilierAssets.ts` — lit la table `assets` filtrée (module Immobilier).
- Utilisés transitivement : `src/hooks/usePassifs.ts` (`useEmprunts`, `usePassifs`), `src/hooks/useFamilyData.ts` (`useFamilyProfile`, `useMaritalStatus`).

**Schéma**
- `src/schemas/assetSchema.ts` — schéma Zod `assetSchema`, type `AssetFormValues`.

**Services**
- `src/services/assetService.ts` — types `Asset`, `AssetCharge`, `AssetRevenu` + CRUD Supabase (tables `assets`, `asset_charges`, `asset_revenus`).
- `src/services/assetIndivisaireService.ts` — type `AssetIndivisaire` + CRUD (table `asset_indivisaires`).
- `src/services/passifService.ts` — types `Emprunt`, `Passif` + CRUD (tables `emprunts`, `passifs`).

**Constantes**
- `src/constants/assetTypes.ts` — `ASSET_NATURES`, `EMPRUNT_NATURES`, `PASSIF_NATURES`, `CHARGE_TYPES`, `ASSET_CATEGORIES` (8 catégories), `getAssetCategory()`, `NATURES_WITHOUT_ACQUISITION`.

**Logique métier — `src/lib/patrimoine/`**
`qualification.ts` (bien propre/commun), `regimeFiscalPVI.ts` (plus-values immobilières), `regimeFiscalPlusValue.ts` (plus-values mobilières), `societeTransfer.ts` (mapping nature → type société), `utils.ts` (formatage, `calculatePlusValue`, `checkIsInCouple`, couleurs de catégories).

---

## 2. Modèle de données

### `Asset` (`src/services/assetService.ts`) — table Supabase `assets`

Champs génériques :
```
id?, user_id?: string
nature: string                       // requis
denomination?, etablissement?: string
mode_detention?: string              // 'Pleine propriété' | 'Usufruit' | 'Nue-propriété'
valeur_estimee?: number
date_estimation?: string
detenteur?: string                   // 'user' | 'spouse' | 'common' | 'Indivision'
pourcentage_utilisateur?, pourcentage_conjoint?: number
valeur_acquisition?, frais_acquisition?: number
date_acquisition?: string
origine_actif?: string[]
situation_particuliere?: string[]
attachement_emotionnel?: number
transfert_immobilier?: boolean
bien_etranger?: boolean
qualification_bien?: string
qualification_auto?: boolean
transfert_societe?: boolean
societe_id?: string | null
created_at?, updated_at?: string
```

Champs "immobilier étendu" (mêmes lignes de table, partagées avec le module Immobilier) :
```
typologie_bien?, statut_bien?, zone_bien?, type_location?, regime_location?, type_location_lmnp?: string
surface_m2?, montant_immeuble?, frais_agence?, frais_notaire?, frais_bancaires?, frais_hypotheque?: number
travaux_renovation?, travaux_construction?, meubles?: number
financement_actif?: boolean
financement_duree_mois?, financement_apport?, financement_taux_credit?, financement_taux_assurance?: number
pourcentage_terrain_force?: number
```

Ce type correspond champ à champ au type généré Supabase (`src/integrations/supabase/types.ts`, table `assets`).

### `AssetFormValues` (Zod, `src/schemas/assetSchema.ts`)
Sous-ensemble du modèle ci-dessus utilisé côté formulaire (les champs "immobilier étendu" ne sont **pas** dans ce schéma — documenté en commentaire dans le fichier) : `nature`, `denomination`, `etablissement`, `mode_detention`, `valeur_estimee`, `date_estimation`, `detenteur`, `pourcentage_utilisateur`, `pourcentage_conjoint`, `valeur_acquisition`, `frais_acquisition`, `date_acquisition`, `origine_actif[]`, `situation_particuliere[]`, `attachement_emotionnel` (0-10), `transfert_immobilier`, `transfert_societe`, `bien_etranger`, `qualification_bien`, `qualification_auto`.

### `AssetCharge` (table `asset_charges`)
```
id?, asset_id: string
type_charge: 'Charges courantes' | 'Charges fiscales'
denomination: string
debiteur: 'Époux 1' | 'Époux 2' | 'Couple'
montant: number
unite: '€' | '%'
periodicite: 'annuelle' | 'trimestrielle' | 'mensuelle'   // ⚠ n'inclut pas 'ponctuelle', pourtant présent dans PERIODICITE_OPTIONS et le zod schema de ChargeForm
date_debut: string
duree_type: 'Indéterminée' | "Jusqu'à date" | 'Pendant années'
duree_fin_date?, duree_annees?: number/string
impact_budget?: boolean
created_at?, updated_at?: string
```

### `AssetRevenu` (table `asset_revenus`)
CRUD présent dans `assetService.ts` mais aucune UI de la section Patrimoine ne l'exploite dans le périmètre lu :
```
id?, asset_id: string
nature: string
montant: number
periodicite: 'Mensuelle' | 'Trimestrielle' | 'Annuelle'
date_debut: string
date_fin?, commentaire?: string
impact_budget?: boolean
created_at?, updated_at?: string
```

### `AssetIndivisaire` (table `asset_indivisaires`)
```
id?, user_id?: string
asset_id: string
type_indivisaire: 'famille' | 'tiers'
family_link_id?: string | null
nom_libre?: string | null
pourcentage: number
created_at?, updated_at?: string
```
+ `AssetIndivisaireWithAsset extends AssetIndivisaire { assets: Asset | null }` pour les requêtes jointes.

### `Emprunt` / `Passif` (`src/services/passifService.ts`)
```
Emprunt: id, user_id, nature, libelle, capital_restant_du?, taux_interet?, mensualite?,
         duree_restante?, detenteur?, pourcentage_utilisateur?, pourcentage_conjoint?,
         reporter_budget?, created_at, updated_at

Passif:  id, user_id, nature, montant_du: number, detenteur?, pourcentage_utilisateur?,
         pourcentage_conjoint?, created_at, updated_at
```

---

## 3. Rôle et props de chaque composant principal

| Composant | Rôle (1 phrase) | Props / données reçues |
|---|---|---|
| `PatrimoineSection.tsx` | Shell d'onglets (Résumé/Actifs/Passifs/détail Plus-values) | Fetch `assets` via `useAssets()` uniquement pour alimenter `IncompleteAssetsBanner` |
| `PatrimoineDashboard.tsx` | Widget camembert + répartition par catégorie (probable code mort) | `assets: Asset[]` en prop |
| `PatrimoineActifs.tsx` | Écran CRUD des actifs | Liste via `PatrimoineTreeView`, ouvre `AssetForm`, orchestre la sauvegarde de l'actif + ses `AssetCharge[]` + indivisaires + auto-création de société |
| `PatrimoinePassifs.tsx` | Écran CRUD des passifs/emprunts | `useEmprunts`/`usePassifs`, ouvre `EmpruntForm`/`PassifForm`/`PassifDetailsDialog` |
| `PatrimoineResume.tsx` | Vue d'ensemble (3 cartes stats + graphique + par tête + plus-values) | Tout vient de `usePatrimoineCalculations` |
| `PatrimoinePlusValues.tsx` | Détail des plus-values : tableau par actif + sidebar par catégorie + section fiscale | Appelle `computePVIRegime`/`computeFiscalRegime` par actif |
| `PatrimoineParTeteDetail.tsx` | Répartition par personne (user/conjoint) | Réimplémentation locale indépendante (`computeByCategory`) |
| `PatrimoineChart.tsx` | Camembert réutilisable | Props `assets`, `passifs`, `emprunts`, `selectedCategory` |
| `PatrimoineTreeView.tsx` | Table arborescente des actifs par catégorie, recherche, plus-value par ligne, poids % | Ouvre `AssetDetailsDialog` |
| `AssetDetailsDialog.tsx` | Modale lecture seule d'un actif | `Asset` |
| `PassifDetailsDialog.tsx` | Modale lecture seule Emprunt/Passif (type-guard `isEmprunt`) | Calcule mensualités/coût des intérêts projetés en inline |
| `PassifForm.tsx` / `EmpruntForm.tsx` | Formulaires CRUD passif/emprunt, état local non contrôlé | Chargent les données famille directement via `familyService` (sans passer par `useFamilyData`) |
| `PlusValuesCard.tsx` | Carte présentationnelle (top 3 gains/pertes, résumé par catégorie) | `plusValuesSummary` en prop |
| `IncompleteAssetsBanner.tsx` | Bannière qualité de données (champs manquants) | `useAuth()` pour la clé localStorage du dismiss |
| `AssetForm.tsx` (assets/) | Formulaire complet à onglets (Général/Détention/Valorisation/Charges) | Piloté par `useAssetForm` |
| `IndivisairesSection.tsx` | Sous-éditeur liste d'indivisaires (affiché si `detenteur === 'Indivision'`) | Validation du total % côté client, visuelle uniquement |
| `ChargeForm.tsx` | Sous-formulaire pour une `AssetCharge` | Schéma Zod propre (`chargeSchema`), distinct de `assetSchema` |

---

## 4. Calculs effectués dans la section

### a) Totaux financiers — `usePatrimoineCalculations.ts:72-78`
```ts
const totalActifs = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
const totalPassifs = passifs.reduce((sum, passif) => sum + (passif.montant_du || 0), 0)
  + emprunts.reduce((sum, emprunt) => sum + (emprunt.capital_restant_du || 0), 0);
const patrimoineNet = totalActifs - totalPassifs;
```

### b) Répartition par personne — `usePatrimoineCalculations.ts:80-177`
```ts
if (isDetenteurCommon(detenteur)) {
  const userQuote = (asset.pourcentage_utilisateur ?? 50) / 100;
  const spouseQuote = (asset.pourcentage_conjoint ?? 50) / 100;
  userSharedValue += estimatedValue * userQuote;
  spouseSharedValue += estimatedValue * spouseQuote;
}
...
const userValue = (userOwnValue + userSharedValue) - (userOwnPassifs + userSharedPassifs);
const totalValue = userValue + spouseValue;
```
Si le foyer n'est pas en couple (`!isInCouple`), tous les actifs/passifs sont attribués à l'utilisateur quelle que soit la valeur de `detenteur`.

### c) Plus-value d'un actif — `src/lib/patrimoine/utils.ts:116-127`
```ts
export const calculatePlusValue = (valeurEstimee, valeurAcquisition, fraisAcquisition) => {
  if (valeurEstimee === undefined || valeurAcquisition === undefined) {
    return { plusValue: 0, hasData: false };
  }
  const frais = fraisAcquisition || 0;
  const plusValue = valeurEstimee - valeurAcquisition - frais;
  return { plusValue, hasData: true };
};
```
Fonction canonique, réutilisée dans `usePatrimoineCalculations` et `PatrimoineTreeView`.

### d) Résumé agrégé des plus-values — `usePatrimoineCalculations.ts:179-226`
```ts
assets.forEach(asset => {
  const { plusValue, hasData } = calculatePlusValue(asset.valeur_estimee, asset.valeur_acquisition, asset.frais_acquisition);
  if (hasData) {
    const category = getAssetCategory(asset.nature);
    byCategory[category].plusValue += plusValue; byCategory[category].count += 1;
    if (plusValue > 0) totalPlusValues += plusValue; else totalMoinsValues += Math.abs(plusValue);
  }
});
```

### e) Aperçu "live" dans le formulaire d'actif — `AssetForm.tsx:88-92`
```ts
const plusValueLive = (watchedValeurEstimee || 0) - (watchedValeurAcquisition || 0);
const plusValuePct = watchedValeurAcquisition && watchedValeurAcquisition > 0
  ? (plusValueLive / watchedValeurAcquisition) * 100
  : 0;
```
⚠ Cette implémentation ne soustrait **pas** `frais_acquisition`, contrairement à `calculatePlusValue` utilisée partout ailleurs — incohérence entre l'aperçu affiché en saisie et la plus-value réellement enregistrée/affichée après sauvegarde.

### f) Poids en % dans l'arborescence — `PatrimoineTreeView.tsx:73-75`
```ts
const calculateWeight = (assetValue: number) => {
  return totalValue > 0 ? ((assetValue / totalValue) * 100).toFixed(2) : '0.00';
};
```

### g) Répartition par catégorie et par personne — `PatrimoineParTeteDetail.tsx:44-66`
Réimplémentation **indépendante** de (b), avec un défaut différent (`pourcentage_utilisateur ?? 100` au lieu de `?? 50`) :
```ts
const computeByCategory = (forSpouse: boolean) => {
  const map: Record<string, number> = {};
  assets.forEach((a: any) => {
    const valeur = Number(a.valeur_estimee || 0);
    if (!valeur) return;
    const pctU = a.pourcentage_utilisateur ?? 100;
    const pctC = a.pourcentage_conjoint ?? 0;
    const detenteur = (a.detenteur || '').toLowerCase();
    let part = 0;
    if (['common','commun','couple','le couple'].includes(detenteur)) {
      part = valeur * ((forSpouse ? pctC : pctU) / 100);
    } else if (forSpouse && ['spouse','conjoint'].includes(detenteur)) {
      part = valeur;
    } else if (!forSpouse && (['user','utilisateur'].includes(detenteur) || !detenteur)) {
      part = valeur;
    }
    if (part > 0) { const cat = getAssetCategory(a.nature); map[cat] = (map[cat] || 0) + part; }
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};
```

### h) Agrégation du graphique + patrimoine net — `PatrimoineChart.tsx:29-72`
```ts
const totalPassifs = passifs.reduce((sum, p) => sum + (p.montant_du || 0), 0)
  + emprunts.reduce((sum, e) => sum + (e.capital_restant_du || 0), 0);
...
const totalActifs = chartData.filter(i => i.type === 'actif').reduce((sum, i) => sum + i.value, 0);
const patrimoineNet = totalActifs - totalPassifs;
```

### i) Projection d'emprunt — `PassifDetailsDialog.tsx:103-124`
```ts
{formatCurrency(emprunt.mensualite * emprunt.duree_restante)}                                    // total restant à rembourser
{formatCurrency((emprunt.mensualite * emprunt.duree_restante) - emprunt.capital_restant_du)}      // coût total des "intérêts"
```
⚠ Estimation linéaire naïve (mensualité × durée restante), sans amortissement réel — peut donner un résultat incohérent/négatif si `capital_restant_du` n'est pas cohérent avec `mensualite * duree_restante`.

### j) Calculs IFI/Transmission/Budget pour les sociétés (module croisé) — `useSocietesIntegration.ts`
```ts
valeurIFI = (valeurEstimee * pourcentageIFI / 100) * (pourcentageTotal / 100);
...
const dividendesEstimes = valeurEstimee * (pourcentageUtilisateur / 100) * 0.03;   // hypothèse de rendement fixe à 3%
const chargesEstimees = societe.capital_social && societe.capital_social > 0
  ? Math.max(2000, societe.capital_social * 0.01) : 2000;
```

---

## 5. Interactions avec les autres modules

- **Famille** — `useFamilyProfile`, `useMaritalStatus` (`@/hooks/useFamilyData`) utilisés dans `PatrimoineResume`, `PatrimoinePlusValues`, `PatrimoineParTeteDetail`, `PatrimoineTreeView`, `useAssetForm` pour récupérer `prenom`, `prenom_conjoint`, `statut_couple`, `regime_matrimonial`, `date_mariage` (pilotage des options détenteur, split par personne, `qualifierBien`). `PassifForm.tsx`, `EmpruntForm.tsx` et `useAssetForm.ts` appellent aussi `familyService.getFamilyProfile()/getMaritalStatus()/getFamilyLinks()` **directement**, en contournant le hook — `family_link_id` sert de référence pour `AssetIndivisaire`.
- **Sociétés** — `PatrimoineActifs.tsx` importe `societeService` et `isSocieteEligibleNature`/`natureToTypeSociete` (`@/lib/patrimoine/societeTransfer`) : lors de la sauvegarde d'un actif éligible (Droits sociaux, Parts de SCI, Parts de holding, etc.) avec `transfert_societe=true` et sans `societe_id` existant, une société est auto-créée puis liée via `assetService.updateAsset(id, { societe_id })`. `useSocietesIntegration.ts` (IFI/Transmission/Budget) est consommé par le module Sociétés, pas directement par l'UI Patrimoine, mais reste structurellement couplé (classification SCI/holding dupliquée).
- **Immobilier** — `useImmobilierAssets.ts` interroge **la même table Supabase `assets`**, filtrée sur `transfert_immobilier=true` et les natures immobilières : le module Immobilier lit un sous-ensemble des lignes `assets` de Patrimoine, il n'existe pas de table immobilier dédiée. La case "Transfert dans Immobilier" (`transfert_immobilier`) dans `AssetForm.tsx` est l'interrupteur qui contrôle cette visibilité croisée.
- **Budget** — `EmpruntForm.tsx` ("Reporter la mensualité dans le budget", champ `reporter_budget`) et `ChargeForm.tsx` ("Impact sur le budget", champ `impact_budget` sur `AssetCharge`) sont des indicateurs destinés à alimenter le Budget, mais aucun appel/import direct vers un service Budget n'a été trouvé dans les fichiers lus — le module Budget lit probablement `emprunts`/`asset_charges` directement, hors du périmètre de ce document.
- **Auth** — `useAuth()` (`@/contexts/AuthContext`) utilisé dans `IncompleteAssetsBanner.tsx` uniquement pour préfixer la clé localStorage du dismiss par `user.id`.
- **Retraite / Transmission / DMTG** — aucun import direct trouvé depuis les fichiers Patrimoine vers ces modules. `AssetIndivisaireWithAsset` et `getByFamilyLink()` dans `assetIndivisaireService.ts` semblent conçus pour être consommés par le module Transmission/Succession, mais aucun appelant n'a été identifié dans le périmètre lu.
- **Supabase** — `supabase` (`@/integrations/supabase/client`) est utilisé directement (pas d'abstraction repository) dans `assetService.ts`, `assetIndivisaireService.ts`, `passifService.ts`, `useImmobilierAssets.ts`.

---

## 6. Logique métier fiscale / patrimoniale déjà présente

### a) `qualification.ts` — moteur de qualification bien propre/commun (régime légal, communauté réduite aux acquêts)
- Détenteur contenant "indivision" → `'Indivision'`
- Pas en couple (`isInCouple` teste `statutCouple` pour "mari"/"pacs"/"concubin") → `'Bien personnel'`
- Régime "séparation de biens" → toujours `'Bien propre'`
- Régime "communauté universelle" → toujours `'Bien commun'`
- `origine_actif` contenant `Donation`/`Héritage`/`Présent d'usage`/`Acquisition à titre gratuit`/`Découverte`/`Création` → `'Bien propre'`
- Acquis avant le mariage → `'Bien propre'`
- Défaut (acquis pendant l'union, à titre onéreux) → `'Bien commun'`

Déclenché réactivement dans `useAssetForm.ts` (effet `form.watch`, lignes ~150-168) à chaque changement de `origine_actif`, `date_acquisition`, `detenteur`, `mode_detention`, sauf si l'utilisateur a manuellement surchargé `qualification_bien` (`qualification_auto=false`).

### b) `regimeFiscalPVI.ts` — plus-values immobilières (taux "au 01/01/2026")
- `PVI_IR_RATE = 0.19`, `PVI_PS_RATE = 0.172`
- Résidence principale → exonération totale (IR+PS = 0), aucune condition de durée.
- Régime général sur : immeubles locatifs nus, immeubles professionnels (hors LMP), autres immeubles de rapport, résidences secondaires, maison mobile, parking/garage/box, autres biens d'usage, parts de SCPI, terrains — branche LMNP séparée pour les locatifs meublés.
- Abattement pour durée de détention :
```ts
const abattementIR = (years) => years < 6 ? 0 : years >= 22 ? 1 : Math.min((years - 5) * 0.06, 0.96);
const abattementPS = (years) => { /* 1,65%/an de 6 à 21 ans, +1,6% à 22 ans, +9%/an de 23 à 30 ans, exonération totale à 30 ans */ };
```
- Surtaxe progressive (2%–6%) sur la plus-value IR taxable au-delà de 50 000 €, avec lissage par tranche (art. 1609 nonies G CGI) :
```ts
const surtaxe = (pv) => pv<=50000?0: pv<=60000?0.02*pv-(60000-pv)*(1/20): pv<=100000?0.02*pv: ... : 0.06*pv;
```
- Limite documentée en commentaire : impossible de distinguer "Terrain à bâtir" d'un terrain classique (aucun champ dédié) → l'exclusion de la surtaxe pour les terrains à bâtir n'est jamais appliquée.
- LMNP : la reprise d'amortissement post-2025 n'est **pas** calculée (aucun champ correspondant sur `Asset`) — signalée par une simple note texte dans l'UI plutôt que calculée.

### c) `regimeFiscalPlusValue.ts` — plus-values mobilières / valeurs (taux "au 01/01/2026")
- `PFU_RATE = 0.314` (`PFU_IR = 0.128`, `PFU_PS = 0.186`)
- Traitements différenciés par groupe :
  1. **PFU générique** (actions, obligations, bons du Trésor, titres de dette subordonnée, fonds de dette privée, CTO, matières premières, contrats à terme) → PFU flat 31,4%
  2. **PEA/PEA-PME** → PFU si détenu < 5 ans ; si ≥ 5 ans, exonéré d'IR mais PS (18,6%) toujours dus (`exonere_partiel`)
  3. **Actions gratuites (AGA)** → `informatif` uniquement (pas de calcul IR/PS)
  4. **Stock-options** → `informatif` uniquement
  5. **BSPCE** (constante `NATURE_BSPCE = 'BCSPE'`, coquille préexistante documentée dans `ASSET_NATURES`) → `informatif` uniquement
  6. **Cryptomonnaies** → PFU 31,4% ; la franchise annuelle de 305 € n'est explicitement **pas** appliquée (nécessite une agrégation multi-actifs, hors périmètre)
  7. **Private equity (FCPR/FPCI)** → PFU si < 5 ans, exonéré IR + PS dû si ≥ 5 ans
  8. **Or / métaux précieux** → double régime au choix : taxe forfaitaire 11,5% sur le prix de vente OU plus-value réelle à 37,6% avec abattement à la durée (5%/an à partir de la 3ᵉ année, exonération totale à 22 ans), les deux options affichées côte à côte
- Toutes les autres natures → `'non_determine'` (choix de conception documenté en commentaire : pas de règle devinée pour les natures non gouvernées — FIP/FCPI/club deals/produits structurés/CDS/options — volontairement régressées vers "Non déterminé" par rapport à une implémentation antérieure plus permissive).

### d) `societeTransfer.ts`
- `SOCIETE_ELIGIBLE_NATURES` : Droits sociaux, Autres droits sociaux, Entreprise individuelle, Parts de holding, Compte courant d'associé, Autres biens professionnels, Parts de SCI.
- `natureToTypeSociete()` mappe la nature vers un `type_societe` (`'Parts de SCI'→'societe-civile'`, `'Entreprise individuelle'→'entreprise-individuelle'`, `'Parts de holding'→'sas'`, défaut `'sas'`).

### e) `PatrimoinePlusValues.tsx` — orchestration fiscale
```ts
regime: computePVIRegime({ nature, plusValue, dateAcquisition })
  ?? computeFiscalRegime({ nature, plusValue, valeurEstimee, dateAcquisition })
```
Le régime PVI (immobilier) est prioritaire ; sinon repli sur le régime valeurs mobilières. Agrégats calculés : `totalCalcule` (somme des `regime.total` non nuls), `totalExonerePartiel` (plus-values où seuls les PS sont dus), `totalNonDetermine` (plus-values sans régime déterminé).

---

## Points d'attention à signaler au reviewer

1. `PatrimoineDashboard.tsx` semble orphelin de l'arbre de routes Patrimoine actuel — à confirmer avant de l'exclure du périmètre d'audit.
2. Le calcul de plus-value est dupliqué à plusieurs endroits : version canonique dans `utils.ts`, aperçu "live" dans `AssetForm.tsx` qui **omet** `frais_acquisition` — l'aperçu en saisie peut donc différer de la plus-value réellement affichée après sauvegarde.
3. La répartition par personne/catégorie est réimplémentée indépendamment dans `PatrimoineParTeteDetail.tsx` (`computeByCategory`), avec un défaut de répartition différent (100/0) de celui utilisé dans `usePatrimoineCalculations.ts` (50/50).
4. `AssetCharge.periodicite` (type TS dans `assetService.ts`) omet `'ponctuelle'`, pourtant présent dans `PERIODICITE_OPTIONS` et le schéma Zod de `ChargeForm` — incohérence de typage latente.
5. Le "coût total des intérêts" affiché dans `PassifDetailsDialog` est une estimation linéaire naïve (`mensualité × durée restante − capital restant dû`), pas un calcul d'amortissement réel.
6. `EmpruntForm` et `PassifForm` utilisent un `useState` manuel sans validation Zod, contrairement à `AssetForm` (react-hook-form + zod) — robustesse de validation inégale au sein de la section.
