
# Refonte de la section Sociétés

Objectif : passer la section Sociétés de 3 onglets actuels (Synthèse, Mes sociétés, Stratégies) à 5 onglets cibles avec un vrai outil conseil. **Phase 1 = tout l'UI livré, calculs simplifiés.**

## Nouvelle architecture des onglets

```text
Sociétés
├── 1. Synthèse              (refonte : KPIs + alertes + donuts)
├── 2. Mes sociétés          (fiche enrichie : + historique bilans + actifs détenus)
├── 3. Associés / Gouvernance (NOUVEAU : cap table + dividendes + CCA + pacte)
├── 4. Stratégies fiscales   (refonte : IS/IR + Rému/Dividendes + Holding)
└── 5. Transmission des parts (NOUVEAU : Dutreil + OBO + Donation)
```

## Détail par onglet

### 1. Synthèse — Tableau de bord dirigeant
- KPIs : valeur consolidée IS+IR, capital total, valeur IFI, valeur successorale (déjà partiellement en place).
- **Nouveau** : ratios consolidés (endettement = emprunts/valeur, rentabilité = résultat net/CA, trésorerie cumulée).
- **Nouveau** : 2 donuts → répartition par `type_societe` et par `regime_fiscal`.
- **Nouveau** : bloc "Alertes" automatiques
  - Clôture dans < 60 jours (depuis `jour_cloture` + `mois_cloture`).
  - CCA > 50 000 € sur une société (depuis `compte_courant_associes`).
  - Bilan absent ou > 18 mois (depuis `date_dernier_bilan`).
  - Société sans associé déclaré (lien cap table).

### 2. Mes sociétés — Fiche enrichie
La structure actuelle (Synthèse / Informations / Finances en pleine page) est conservée. Ajouts :
- **Sous-onglet "Bilans"** (nouveau) : tableau N / N-1 / N-2 / N-3 avec saisie manuelle (CA, résultat net, trésorerie, capitaux propres, dettes). Mini-graphes d'évolution (CA, résultat, trésorerie).
- **Sous-onglet "Actifs détenus"** (nouveau) : liste des biens immobiliers (via `assets.societe_id`) et participations (sociétés filles), avec lien bidirectionnel vers Immobilier / Patrimoine.

### 3. Associés / Gouvernance — Cap table (le grand absent)
4 blocs dans une page pleine, par société sélectionnée :
- **Table de capitalisation** : un associé par ligne (lien `family_links` OU nom libre OU autre société), nombre de titres, %, nature (pleine prop. / NP / UF), détention directe ou via holding.
- **Dividendes versés** : table par exercice (déjà en base `societe_dividendes`). UI compactée + agrégat par associé. Bouton "Reporter dans Budget" (existant via `revenu_disponible`).
- **Pacte d'associés** : checkbox existence, date de signature, durée, clauses clés (préemption / agrément / sortie conjointe / drag-along), alerte si > 7 ans.
- **Comptes courants d'associés** : un CCA par associé (solde, taux, échéance de remboursement). Total reporté dans la fiche société.

### 4. Stratégies fiscales — Moteur de simulation
Remplace l'onglet "Stratégies" actuel. 3 modules simulateurs (calculs basiques en phase 1) :
- **IS vs IR** : sélecteur de société, paramètres foyer (TMI depuis Fiscalité), curseur rémunération dirigeant, output côte-à-côte (impôt société + IR + cotisations).
- **Rémunération vs Dividendes** : curseur 0–100 % de répartition. Affichage coût global net (charges sociales + IR + flat tax 30 %) et net perçu par le dirigeant.
- **Optimisation holding** : si ≥ 2 sociétés, détection auto. Estimation gain régime mère-fille (exonération 95 %) et intégration fiscale (compensation déficits). Tableau "avant / après".

### 5. Transmission des parts — Nouvel onglet
Distinct de la section Transmission globale.
- **Pacte Dutreil** : formulaire conditions (engagement collectif 2 ans, individuel 4 ans, fonction de direction). Calcul abattement 75 % sur valeur des parts. Comparatif donation classique vs Dutreil (DMTG).
- **OBO** : simulateur valorisation cible + structure de financement (apport / dette / earn-out) avec rentabilité projetée.
- **Donation de parts** : intégration avec module Transmission existant — pousse les valeurs vers le moteur DMTG (`lib/dmtg`).

## Détails techniques

**Nouvelles tables Supabase (migration unique)** :
- `societe_bilans` : `societe_id`, `exercice_annee`, `ca`, `resultat_net`, `tresorerie`, `capitaux_propres`, `dettes_financieres`, `date_cloture`.
- `societe_associes` : `societe_id`, `family_link_id?`, `nom_libre?`, `societe_associee_id?`, `nombre_titres`, `pourcentage`, `nature_detention` (PP/NP/UF), `detention_directe` (bool).
- `societe_pactes` : `societe_id`, `existe`, `date_signature`, `duree_annees`, `clause_preemption`, `clause_agrement`, `clause_sortie_conjointe`, `clause_drag_along`, `commentaire`.
- `societe_comptes_courants` : `societe_id`, `associe_id` (FK `societe_associes`), `solde`, `taux`, `date_remboursement?`.
- `societe_dutreil` : `societe_id`, `engagement_collectif_date`, `engagement_individuel_date`, `dirigeant_family_link_id`, `eligibilite_validee` (bool).

Toutes avec RLS standard (`auth.uid() = user_id`) + vérification ownership société.

**Suppressions / déplacements** :
- L'onglet "Stratégies" actuel (`SocietesStrategies.tsx`) est restructuré : ses 3 modules (IFI, IS vs IR, Holding) → IS/IR et Holding migrent dans onglet 4, IFI reste relié à Fiscalité.
- `SocieteFinances.tsx` reçoit le sous-onglet Bilans.

**Memory à mettre à jour** :
- Retirer la contrainte "No Pacte Dutreil" du Core (utilisateur lève la contrainte).
- Mettre à jour `mem://features/societes-module-integration-status` et `mem://features/societes-strategies-tab` pour refléter la nouvelle architecture.
- Mettre à jour `mem://architecture/societes-form-full-page-display` (ajout sous-onglets Bilans + Actifs détenus).

**Composants principaux à créer** :
- `SocietesSynthese.tsx` (refonte) — donuts, alertes, ratios.
- `societes/bilans/SocieteBilansTab.tsx` + `BilanForm.tsx`.
- `societes/actifs/SocieteActifsDetenusTab.tsx`.
- `societes/gouvernance/SocietesGouvernance.tsx` (page parente) + `CapTableSection.tsx`, `DividendesSection.tsx`, `PacteAssociesSection.tsx`, `ComptesCourantsSection.tsx`.
- `societes/strategies/SimulateurISvsIR.tsx`, `SimulateurRemuDividendes.tsx`, `SimulateurHolding.tsx`.
- `societes/transmission/SocietesTransmission.tsx` + `PacteDutreilSimulator.tsx`, `OBOSimulator.tsx`, `DonationPartsBridge.tsx`.

**Approche de livraison (Phase 1 = tout l'UI, calculs basiques)** :
1. Migration DB (5 nouvelles tables) + services.
2. Refonte navigation Sociétés : 3 → 5 onglets.
3. Synthèse enrichie (donuts + alertes + ratios).
4. Mes sociétés : sous-onglets Bilans + Actifs détenus.
5. Associés / Gouvernance complet.
6. Stratégies fiscales : 3 simulateurs avec formules simplifiées (TMI x rémunération, flat tax 30 %, mère-fille 95 %).
7. Transmission des parts : Dutreil (abattement 75 %), OBO simplifié, pont DMTG.
8. Mise à jour mémoire projet.
