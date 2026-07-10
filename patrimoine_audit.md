# Audit — Section Patrimoine (état des lieux)

> Document généré en lecture seule. Aucun fichier de code n'a été modifié pour produire ce rapport.
> Reflète l'état du code au commit `e8ee193` (10/07/2026), qui a ajouté royalties, qualification juridique étendue, démembrement de propriété et fusion des formulaires Passif/Emprunt.

---

## 1. Champs de données existants

### Table `assets` (type `Asset`, `src/services/assetService.ts`)

**Socle générique**
| Champ | Signification |
|---|---|
| `id`, `user_id` | Identifiants |
| `nature` | Nature de l'actif (valeur parmi `ASSET_NATURES`), requis |
| `denomination` | Libellé/nom donné par l'utilisateur |
| `etablissement` | Établissement teneur du compte/bien |
| `mode_detention` | `Pleine propriété` \| `Usufruit` \| `Nue-propriété` |
| `valeur_estimee`, `date_estimation` | Valorisation actuelle |
| `detenteur` | `user` \| `spouse` \| `common` \| `Indivision` |
| `pourcentage_utilisateur`, `pourcentage_conjoint` | Quote-part en détention commune |
| `valeur_acquisition`, `frais_acquisition`, `date_acquisition` | Base de calcul de la plus-value |
| `origine_actif[]` | Origine (donation, héritage, acquisition à titre onéreux, etc.) — pilote la qualification juridique |
| `situation_particuliere[]` | Situations particulières déclarées |
| `attachement_emotionnel` | Score 0–10 (usage non identifié dans le périmètre lu) |
| `transfert_immobilier` | Bascule l'actif dans le module Immobilier |
| `bien_etranger` | Bien situé hors de France |
| `qualification_bien`, `qualification_auto` | Résultat de la qualification juridique (propre/commun) + flag "calculé automatiquement" vs "surchargé manuellement" |
| `transfert_societe`, `societe_id` | Bascule/lien vers le module Sociétés |
| `sous_type_per` | `Bancaire` \| `Assurantiel` (sous-type de PER) |
| `cto_multi_actifs`, `cto_nature_sous_jacent` | Distinction nature/enveloppe pour les CTO multi-actifs |
| `clause_entree_communaute` | Clause d'entrée en communauté sur une donation → force qualification "Bien commun" |
| `clause_remploi` | Clause de remploi → force "Bien propre", prioritaire même en communauté universelle |
| `created_at`, `updated_at` | Horodatage |

**Champs "immobilier étendu"** (mêmes lignes de la table `assets`, consommés par le module Immobilier, pas par la section Patrimoine) :
`typologie_bien`, `surface_m2`, `statut_bien`, `montant_immeuble`, `frais_agence`, `frais_notaire`, `frais_bancaires`, `frais_hypotheque`, `travaux_renovation`, `travaux_construction`, `meubles`, `financement_actif`, `financement_duree_mois`, `financement_apport`, `financement_taux_credit`, `financement_taux_assurance`, `type_location`, `regime_location`, `zone_bien`, `pourcentage_terrain_force`, `type_location_lmnp`.

### Table `asset_charges` (type `AssetCharge`)
`id`, `asset_id`, `type_charge` (`Charges courantes`/`Charges fiscales`), `denomination`, `debiteur` (`Époux 1`/`Époux 2`/`Couple`), `montant`, `unite` (`€`/`%`), `periodicite` (`ponctuelle`/`annuelle`/`trimestrielle`/`mensuelle`), `date_debut`, `duree_type`, `duree_fin_date`, `duree_annees`, `impact_budget` (signal destiné au module Budget), `created_at`, `updated_at`.

### Table `asset_revenus` (type `AssetRevenu`)
`id`, `asset_id`, `nature`, `montant`, `periodicite` (`Mensuelle`/`Trimestrielle`/`Annuelle`), `date_debut`, `date_fin`, `commentaire`, `impact_budget`, `created_at`, `updated_at`.

### Table `asset_indivisaires` (type `AssetIndivisaire`)
`id`, `user_id`, `asset_id`, `type_indivisaire` (`famille`/`tiers`), `family_link_id`, `nom_libre`, `pourcentage`, `created_at`, `updated_at`.

### Table `asset_demembrements` (type `AssetDemembrement`, nouvelle)
`id`, `user_id`, `asset_id`, `role` (`Usufruitier`/`Nu-propriétaire`), `type_partie` (`famille`/`tiers`), `family_link_id`, `nom_libre`, `date_naissance_tiers`, `created_at`, `updated_at`.
Représente la **contrepartie** du démembrement (l'autre côté de `mode_detention`), utilisée pour appliquer le barème art. 669 CGI.

### Table `asset_valorisations` (type `AssetValorisation`, nouvelle)
`id`, `user_id`, `asset_id`, `date_valorisation`, `valeur`, `created_at`.
Historique de valorisation d'un actif dans le temps, distinct du couple `valeur_estimee`/`date_estimation` sur `assets` (qui reste la valeur "courante").

### Table `emprunts` (type `Emprunt`)
`id`, `user_id`, `nature`, `libelle`, `capital_restant_du`, `taux_interet`, `mensualite`, `duree_restante`, `detenteur`, `pourcentage_utilisateur`, `pourcentage_conjoint`, `reporter_budget`, `asset_id` (lien optionnel vers l'actif financé/garanti), `type_garantie` (`Hypothèque`/`Caution`/`Nantissement`/`Aucune`), `assure`, `quotite_assuree_utilisateur`, `quotite_assuree_conjoint`, `capital_garanti_deces`, `created_at`, `updated_at`.

### Table `passifs` (type `Passif`)
`id`, `user_id`, `nature`, `montant_du`, `detenteur`, `pourcentage_utilisateur`, `pourcentage_conjoint`, `created_at`, `updated_at`.

---

## 2. Ce qui est actuellement affiché (par écran/composant)

| Écran/composant | Informations visibles |
|---|---|
| **`PatrimoineSection.tsx`** | Shell d'onglets (Résumé / Actifs / Passifs / détail Plus-values) ; bannière `IncompleteAssetsBanner` |
| **`PatrimoineResume.tsx`** | Total actifs, total passifs, patrimoine net ; graphique (`PatrimoineChart`) ; répartition par personne (`PatrimoineParTeteDetail`) ; carte plus-values (`PlusValuesCard`) |
| **`PatrimoineTreeView.tsx`** (liste des actifs) | `nature`, `denomination`, `etablissement`, `valeur_estimee`, `detenteur` (libellé mappé), poids % du patrimoine total, plus-value calculée (`valeur_estimee` − `valeur_acquisition` − `frais_acquisition`), recherche sur `denomination`/`nature`/`etablissement` |
| **`AssetDetailsDialog.tsx`** (modale détail actif, lecture seule) | `nature`, `denomination`, `etablissement`, `mode_detention`, `valeur_estimee`, `date_estimation`, `detenteur`, `pourcentage_utilisateur`/`conjoint`, `valeur_acquisition`, `frais_acquisition`, `date_acquisition`, `origine_actif`, `situation_particuliere`, `attachement_emotionnel`, `qualification_bien` + badge/raison, `qualification_auto`, `sous_type_per`, `cto_multi_actifs`, `cto_nature_sous_jacent`, `clause_entree_communaute`, `clause_remploi` ; **+ sections liées** : historique de valorisation (`asset_valorisations`), revenus associés (`asset_revenus`, affiché uniquement pour la nature "Droits à royalties"), contrepartie de démembrement (`asset_demembrements`, si `mode_detention` = Usufruit/Nue-propriété), emprunts liés (via `emprunt.asset_id`) |
| **`AssetForm.tsx`** (création/édition, à onglets) | Mêmes champs socle que ci-dessus + `transfert_immobilier`, `bien_etranger`, `transfert_societe` ; aperçu de plus-value en direct ; sous-formulaires `IndivisairesSection` (si `detenteur = Indivision`), `DemembrementSection` (si `mode_detention` démembré), `ChargeForm` (onglet Charges) |
| **`PatrimoinePassifs.tsx`** + **`PassifDetailsDialog.tsx`** | Liste emprunts/passifs ; détail emprunt : `libelle`, `nature`, `capital_restant_du`, `taux_interet`, `mensualite`, `duree_restante`, `type_garantie`, `assure`, `quotite_assuree_utilisateur`/`conjoint`, `capital_garanti_deces`, `asset_id` (lien vers l'actif financé), projection linéaire (total restant dû, "coût des intérêts") |
| **`PassifEmpruntForm.tsx`** (formulaire unifié, remplace `PassifForm`/`EmpruntForm`) | Tous les champs `Emprunt` ci-dessus + `detenteur`, `pourcentage_utilisateur`/`conjoint`, `reporter_budget`, `montant_du` (pour un `Passif` simple) |
| **`PatrimoinePlusValues.tsx`** | Par actif : `denomination`, `nature`, `valeur_estimee`("valeurEstimee"), `valeur_acquisition`, plus-value calculée, régime fiscal déterminé (PVI ou valeurs mobilières) ; sidebar par catégorie ; agrégats (total calculé, exonéré partiel, non déterminé) |
| **`PatrimoineParTeteDetail.tsx`** | Répartition de la valeur par personne (utilisateur/conjoint) et par catégorie |
| **`PatrimoineChart.tsx`** | Camembert actifs/passifs par catégorie, patrimoine net |
| **`IncompleteAssetsBanner.tsx`** | Signale par actif l'absence de : `valeur_estimee`, `detenteur`, `mode_detention`, `date_estimation` |
| **`PatrimoineDashboard.tsx`** | Camembert + répartition par catégorie — composant présent dans `src/components/` mais dont l'appartenance à l'arbre de routes Patrimoine actuel reste à confirmer (voir §4) |

---

## 3. Ce qui est stocké mais caché (absent de l'affichage actuel de la section Patrimoine)

- **Champs "immobilier étendu" sur `assets`** — `typologie_bien`, `surface_m2`, `statut_bien`, `montant_immeuble`, `frais_agence`, `frais_notaire`, `frais_bancaires`, `frais_hypotheque`, `travaux_renovation`, `travaux_construction`, `meubles`, `financement_actif`, `financement_duree_mois`, `financement_apport`, `financement_taux_credit`, `financement_taux_assurance`, `type_location`, `regime_location`, `zone_bien`, `pourcentage_terrain_force`, `type_location_lmnp` — non affichés dans `AssetForm.tsx`/`AssetDetailsDialog.tsx` (ils vivent dans le module Immobilier, sur les mêmes lignes de table).
- **`bien_etranger`** — présent dans le schéma Zod et dans `AssetForm.tsx` (champ à cocher), mais absent de `AssetDetailsDialog.tsx` (non visible en lecture seule après enregistrement).
- **`transfert_societe` / `societe_id`** — présents dans le formulaire de saisie (`AssetForm.tsx`), mais absents de `AssetDetailsDialog.tsx`.
- **`AssetRevenu`** (`asset_revenus`) — CRUD complet et hook (`useAssetRevenus`) mais affichage conditionné à `nature === 'Droits à royalties'` dans `AssetDetailsDialog.tsx` ; pour toute autre nature, les revenus associés existants en base ne sont pas montrés dans cette section.
- **`AssetIndivisaireWithAsset.getByFamilyLink()`** et **`AssetDemembrementWithAsset.getByFamilyLink()`** — méthodes de requête jointe existent côté service, mais aucun appelant identifié dans la section Patrimoine (semblent destinées au module Transmission/Succession, non encore développé).
- **`Passif.montant_du`** — table `passifs` simple, toujours présente et listée dans `PatrimoinePassifs.tsx`, mais sans détail équivalent aux emprunts (pas de projection, pas de garantie/assurance).
- **`attachement_emotionnel`** — saisi et affiché (formulaire + détail), mais aucun calcul ni agrégat ne l'exploite ailleurs dans la section (usage isolé).

---

## 4. Structure des composants UI actuels

**Route**
- `src/App.tsx` (`/dashboard/:section`) → `src/pages/DashboardSection.tsx` → `src/pages/patrimoine/PatrimoineSection.tsx` pour `section === 'patrimoine'`. Pas de route `/patrimoine` dédiée.

**Page**
- `src/pages/patrimoine/PatrimoineSection.tsx`

**Composants — `src/components/patrimoine/`**
`PatrimoineActifs.tsx`, `PatrimoinePassifs.tsx`, `PatrimoineResume.tsx`, `PatrimoinePlusValues.tsx`, `PatrimoineParTeteDetail.tsx`, `PatrimoineChart.tsx`, `PatrimoineTreeView.tsx`, `AssetDetailsDialog.tsx`, `PassifDetailsDialog.tsx`, `PassifEmpruntForm.tsx` (remplace les anciens `PassifForm.tsx`/`EmpruntForm.tsx`, supprimés), `PlusValuesCard.tsx`, `IncompleteAssetsBanner.tsx`.

**Composant isolé (statut à confirmer)**
- `src/components/PatrimoineDashboard.tsx` — pas d'import trouvé depuis l'arbre de routes Patrimoine actuel dans ce périmètre de lecture.

**Sous-formulaires — `src/components/assets/`**
`AssetForm.tsx`, `IndivisairesSection.tsx`, `DemembrementSection.tsx` (nouveau), `ChargeForm.tsx`.

**Hooks**
`usePatrimoineCalculations.ts`, `useAssets.ts`, `useAssetForm.ts`, `usePassifEmpruntForm.ts` (nouveau, remplace la logique auparavant dans `EmpruntForm`/`PassifForm`), `useAssetRevenus.ts` (nouveau), `useAssetValorisations.ts` (nouveau), `usePassifs.ts` (`useEmprunts`, `usePassifs`), `useSocietesIntegration.ts`, `useImmobilierAssets.ts`, `useFamilyData.ts` (`useFamilyProfile`, `useMaritalStatus`, consommé transitivement).

**Schémas**
`src/schemas/assetSchema.ts`, `src/schemas/passifEmpruntSchema.ts` (nouveau, remplace les validations manuelles de `PassifForm`/`EmpruntForm`).

**Services**
`src/services/assetService.ts` (`Asset`, `AssetCharge`, `AssetRevenu`), `src/services/assetIndivisaireService.ts` (`AssetIndivisaire`), `src/services/assetDemembrementService.ts` (`AssetDemembrement`, nouveau), `src/services/assetValorisationService.ts` (`AssetValorisation`, nouveau), `src/services/passifService.ts` (`Emprunt`, `Passif`).

**Constantes**
`src/constants/assetTypes.ts` — `ASSET_NATURES`, `EMPRUNT_NATURES`, `TYPE_GARANTIE_OPTIONS` (nouveau), `PASSIF_NATURES`, `CHARGE_TYPES`, `ASSET_CATEGORIES`, `NATURE_DISPLAY_LABELS`, `NATURES_PER`, `CTO_SOUS_JACENT_OPTIONS`, `getAssetCategory()`, `NATURES_WITHOUT_ACQUISITION`.

**Logique métier — `src/lib/patrimoine/`**
`qualification.ts` (bien propre/commun, étendu aux clauses d'entrée en communauté/remploi et à la correction PACS), `bareme669CGI.ts` (nouveau, barème démembrement art. 669 CGI), `regimeFiscalPVI.ts`, `regimeFiscalPlusValue.ts`, `societeTransfer.ts`, `utils.ts`.

---

## Points signalés en cours de lecture (à confirmer, sans action prise)

1. `PatrimoineDashboard.tsx` reste sans appelant identifié depuis l'arbre de routes Patrimoine — statut code mort à reconfirmer.
2. `bien_etranger`, `transfert_societe`, `societe_id` sont saisissables (`AssetForm.tsx`) mais invisibles en relecture (`AssetDetailsDialog.tsx`) — asymétrie saisie/lecture, pas nécessairement un bug mais à noter.
3. Les revenus associés (`asset_revenus`) ne sont montrés que pour la nature "Droits à royalties" ; si d'autres natures ont des revenus enregistrés (héritage de l'existant CRUD), ils ne remontent nulle part dans l'UI actuelle de la section Patrimoine.
