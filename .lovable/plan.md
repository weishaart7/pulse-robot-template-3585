
## Livrable

Fichier `/mnt/documents/regimes-matrimoniaux-extraction.md`, sur le même modèle que les extractions précédentes (Famille, Patrimoine, Immobilier, Sociétés, Budget, Retraite, Fiscalité, Transmission).

## Plan du document

### 1. Périmètre et point d'entrée
- Sous-section rattachée à la section **Famille** → carte « Informations relatives au mariage / PACS / concubinage » (`FamilleSection.tsx`) qui ouvre la vue pleine page `SituationMatrimonialePage.tsx` → composant central `RelationInfoForm.tsx` (571 lignes).
- Route : `/dashboard/famille/situation-matrimoniale`.
- Conditions d'affichage : statut couple ≠ Célibataire. Trois branches distinctes : `Marié(e)`, `Pacsé(e)`, `Concubinage`.
- Écosystème : `MatrimonialRegimeOptions.tsx`, `ClausesPersonnaliseesSection.tsx`, `ClauseItem.tsx`, `PercentageInputs.tsx`, `AssetSelectionModal.tsx`, hooks `useMatrimonialClauses`, `useCustomMatrimonialClauses`, `useMaritalStatus`, moteur `src/lib/dmtg/matrimonial.ts`, constants `src/constants/matrimonialClauses.ts`, types `src/types/matrimonial.ts` et `src/types/customClause.ts`.

### 2. Architecture UI par statut

**Marié(e)** — 4 pills (`Informations générales`, `Clauses du contrat`, `Donation au dernier vivant`, `Historique matrimonial`).

- **Informations générales** : Date & lieu du mariage, sélection du régime (5 valeurs), cases « Pas de contrat de mariage » (force communauté réduite aux acquêts) et « Imposition distincte ».
- **Clauses du contrat** : catalogue de clauses par régime (`MatrimonialRegimeOptions`) + section libre « Clauses personnalisées ». Désactivé si `pasDeContrat` = true.
- **Donation au dernier vivant** : 2 cartes (donation consentie par l'utilisateur / reçue du conjoint) avec case + date d'acte.
- **Historique matrimonial** : mariages précédents (utilisateur + conjoint) avec durée en années/mois.

**Pacsé(e)** — 1 carte : Convention (`Régime de la séparation des biens` / `Indivision`), date PACS, imposition distincte.

**Concubinage** — 1 carte de texte informatif, aucun champ.

### 3. Catalogue exhaustif des régimes et clauses

Tableau régime → clé interne → liste des clauses, tirées de `src/constants/matrimonialClauses.ts`. Pour chaque clause : libellé, capacités (`hasAssets` / `hasPercentages` / `hasOptions` / `hasSubClauses`), `impactTransmission` (`neutre` / `exclut_succession` / `avantage_matrimonial` / `reduit_masse`), description quand disponible.

- **Communauté réduite aux acquêts** (`communaute_reduite`) — 9 clauses : mise en communauté, reprise des apports (« clause alsacienne »), préciput (avec options PP/usufruit), attribution intégrale, partage inégal, stipulation de bien propre, modification des récompenses, prélèvement des biens communs, prélèvement moyennant indemnisation.
- **Communauté de meubles et acquêts** (`communaute_meubles`) — 9 clauses : préciput, mise en communauté, reprise des apports, attribution intégrale, partage inégal, exclusion d'un bien de la communauté, stipulation de bien propre, prélèvement des biens communs, clause commerciale.
- **Communauté universelle** (`communaute_universelle`) — 4 clauses : attribution intégrale au survivant, préciput, exclusion de certains biens, reprise des apports.
- **Séparation de biens** (`separation_biens`) — 6 clauses : société d'acquêts (avec sous-clauses), aménagement de la contribution aux charges, aménagement de l'indivision, maintien dans l'indivision, exclusion de reprise, clause commerciale.
- **Participation aux acquêts** (`participation_acquets`) — 10 clauses : société d'acquêts, évaluation des biens, simplification de la preuve, exclusion des biens professionnels du calcul, plafonnement de la créance, attribution préférentielle, partage inégal des acquêts, renonciation, indexation, clause commerciale.
- **Sous-clauses de la société d'acquêts** (`SOCIETE_ACQUETS_SUB_CLAUSES`) : partage inégal (PP/usufruit), attribution intégrale (PP/usufruit), préciput. Le préciput sous-clause est masqué hors régime `participation_acquets`.
- **Clauses impactant la transmission** (`CLAUSES_IMPACTING_TRANSMISSION`) : liste exhaustive utilisée par le moteur (`attribution_integrale`, `attribution_integrale_survivant`, `attribution_integrale_sub`, `preciput`, `preciput_sub`, `partage_inegal`, `partage_inegal_sub`, `partage_inegal_acquets`, `societe_acquets`).

### 4. Clauses personnalisées

Modèle `ClausePersonnalisee` (`src/types/customClause.ts`) : texte libre + tags (11 valeurs préconfigurées : bien professionnel, attribution préférentielle, indemnité/décote, condition suspensive, dérogation à la réserve héréditaire, affecte des parts de société, affecte un contrat d'assurance-vie, affecte un bien immobilier précis, exclusion d'un bien de la communauté, reprise des apports en cas de divorce, condition liée à la présence d'enfants) + biens visés + bénéficiaire libre + paramètres chiffrés. Stockage JSON dans `marital_status.clauses_personnalisees`. Aucun calcul automatique (documentation d'acte notarié).

### 5. Modèle de données Supabase

Table `marital_status`. Champs listés depuis `familyService.ts` :
- Mariage : `date_mariage`, `lieu_mariage`, `regime_matrimonial`, `pas_de_contrat_mariage`.
- PACS : `date_pacs`, `lieu_pacs`, `convention_pacs`.
- Fiscalité : `imposition_distincte`, `parent_isole`, `nombre_enfants_charges`.
- Historique : `mariage_precedent_personne` + `mariage_precedent_conjoint` + durée années/mois pour chacun.
- Donation : `donation_dernier_vivant_personne` / `donation_dernier_vivant_conjoint` + `date_donation_personne` / `date_donation_conjoint`.
- Clauses : `clauses_contrat` (JSON `ClausesData`), `clauses_personnalisees` (JSON `ClausePersonnalisee[]`).
- Transmission : `partage_envisage` (droit de partage 2,5 %, art. 746 CGI).

Format `ClauseState` : `{ enabled, selectedAssets?, partPleineProprietee?, partUsufruit?, options?: { pleineProprietee, usufruit } }`.

### 6. Règles métier et calculs

**Qualification automatique des biens** (`src/lib/patrimoine/qualification.ts`, cascade `qualifierBien`) :
1. Indivision détectée → `Indivision`.
2. Hors couple → `Bien personnel`.
3. Clause de remploi → toujours `Bien propre` (prioritaire, même en communauté universelle).
4. Séparation de biens → toujours `Bien propre`.
5. Communauté universelle → toujours `Bien commun`.
6. Origine gratuite (donation/héritage/présent) → `Bien propre`, sauf clause d'entrée en communauté sur une donation.
7. Date d'acquisition antérieure au mariage → `Bien propre`.
8. PACS : convention `Indivision` → `Bien commun`, sinon `Bien propre`.
9. Par défaut communauté réduite → `Bien commun`.

**Liquidation matrimoniale DMTG** (`src/lib/dmtg/matrimonial.ts::computeMatrimonialLiquidation`) :
- Régime `communauté` :
  - Attribution intégrale active → `demiBoniPourSuccession = 0`, tout le boni commun exclu de la succession (avantage matrimonial exonéré).
  - Partage inégal (`partConjoint = partPleineProprietee / 100`) → `demiBoniPourSuccession = boniCommun × (1 − partConjoint)`, avantage conjoint = `boniCommun × partConjoint − boniCommun/2`.
  - Sinon partage 50/50 → `demiBoniPourSuccession = boniCommun / 2`.
- Régimes `séparation` / `participation` : pas de communauté ; signalement si société d'acquêts.
- Préciput : `valeur` sommée dans `totalExcluParClauses` (hors succession).
- Sortie : `demiBoniPourSuccession` (entier) + `notes[]`.

**Conversion clauses → avantages** (`convertClausesToAvantages`) : parcours des clauses actives, mapping par mot-clé du nom (`attribution_integrale`, `preciput`, `partage_inegal`) vers `type` + valorisation par somme des `selectedAssets` via `assetValues`.

**Analyse pour transmission** (`useMatrimonialClauses::analyzeForTransmission`) : parcours des `CLAUSES_IMPACTING_TRANSMISSION`, calcul du total exclu de la succession, notes utilisateur, résumé `regimeSimplified` (`communauté` / `séparation` / `participation` / `autre` via `getSimplifiedRegime`).

**PercentageInputs** : contrainte `partPP + partUsufruit = 100` — validation visuelle (rouge si ≠ 100), auto-complément par symétrie sur saisie.

### 7. Effets de bord et automatismes UI

- `pasDeContrat = true` → force `regimeMatrimonial = 'Communauté réduite aux acquêts (option sans contrat de mariage)'` et désactive l'onglet Clauses (message « Pas de contrat de mariage sélectionné »).
- `mariagePrecedent* = false` → reset années/mois à `null`.
- Décocher une clause → efface `selectedAssets`, `partPleineProprietee`, `partUsufruit`, `options` (documenté en commentaire dans `toggleClause`).
- Cocher une clause avec pourcentages → initialise à 50/50.
- Sauvegarde immédiate à chaque toggle/update (pas de bouton « Enregistrer » pour les clauses).
- Sauvegarde globale par bouton `Enregistrer` pour les champs `RelationInfoForm` hors clauses.
- Toast systématique à chaque save (succès / erreur).

### 8. Interactions cross-modules

- **Patrimoine (qualification)** : `useAssetForm` et `AssetDetailsDialog` consomment `maritalStatus.regime_matrimonial` pour qualifier automatiquement chaque actif (auto-toggle activable, priorité clause de remploi).
- **Transmission (DMTG)** : `computeMatrimonialLiquidation` est câblé mais **volontairement non appelé** actuellement depuis `computeDMTG` (mécanisme B, commentaire dans `src/lib/dmtg/index.ts` et `src/lib/transmission/index.ts` — `regimeMatrimonial` passé à `undefined`). La qualification bien-par-bien remplace la liquidation macro.
- **Utilitaires transmission** (`src/utils/transmissionHelpers.ts`) : `regime_matrimonial` sert à indexer les mariages entre personnes, `donation_dernier_vivant_*` à détecter la présence d'une DDV pour ajuster les scénarios successoraux.
- **Optimisation transmission** : présence DDV utilisée pour proposer/comparer les options du conjoint survivant.
- **Historique** : durée du mariage précédent utilisée pour retraite/prestations compensatoires (non branché aujourd'hui, champ collecté seulement).

### 9. Points d'attention / dette technique

1. **`computeMatrimonialLiquidation` non branché** : moteur complet mais court-circuité depuis 2026-07-17 par choix d'architecture (qualification par bien). Risque de dérive silencieuse si la doc n'est pas maintenue.
2. **Duplication attribution intégrale** : deux clés distinctes (`attribution_integrale` en communauté réduite/meubles, `attribution_integrale_survivant` en universelle) pour un mécanisme identique — mapping par `includes('attribution_integrale')` fonctionne mais fragile.
3. **Sous-clauses préciput** : `preciput_sub` filtré hors `participation_acquets` par une condition inline dans `MatrimonialRegimeOptions` — logique métier hors du fichier de constantes.
4. **Clauses personnalisées 100 % descriptives** : aucun impact sur DMTG/IFI/Patrimoine → risque de faux sentiment de couverture (mention à faire dans la fiche notariale).
5. **PACS convention Indivision assimilée à bien commun** : simplification (documentée dans le code) qui aligne mécaniquement les partenaires PACS sur un couple marié communauté.
6. **`saveClausesData` sans debounce** : chaque toggle déclenche un `saveData` immédiat + toast. À forte fréquence, spam de notifications.
7. **`impositionDistincte` collecté sur PACS et Mariage** mais non répercuté sur les autres modules (fiscalité, retraite) — dead-field applicatif.
8. **Historique matrimonial** : champs stockés, non consommés côté fiscalité successorale (usufruit du conjoint, réversion, etc.).
9. **`clauses_contrat` typé `any`** (`familyService.ts`), pas de validation Zod à la lecture — parsing tolérant mais non typé.
10. **`partage_envisage`** (droit de partage 2,5 %, art. 746 CGI) : commentaire de code présent mais **aucun champ UI dans `RelationInfoForm`** pour le saisir — piloté ailleurs, à confirmer.
11. **AVERTISSEMENT UX** : la sauvegarde des clauses est autonome (toast) alors que le bouton « Enregistrer » global concerne uniquement les autres champs — dualité peu explicite pour l'utilisateur.
12. **`useMatrimonialClauses` recharge `assets` complet** pour valoriser les biens sélectionnés — coût acceptable, mais couplage fort avec la section Patrimoine.

## Méthode
Rédaction directe du Markdown dans `/mnt/documents/regimes-matrimoniaux-extraction.md`, aucune modification de code applicatif.
