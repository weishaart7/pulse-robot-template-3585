# Référentiel des alertes de conseil

> **Note (2026-07-30)** — Aucun document "référentiel §12.8" n'a été retrouvé dans ce
> dépôt (recherche exhaustive du 2026-07-30 : seules des mentions éparses "#5", "#7",
> "#8", "#13", "#15" existent en commentaires de migrations et dans
> `transmissionHelpers.ts`, sans jamais reproduire le référentiel complet — cf. §3
> ci-dessous). Ce document reconstruit une numérotation **à partir du code réel**
> (`src/lib/alertes/regles.ts`), dans l'ordre d'apparition des règles dans
> `REGLES_ALERTES_CONSEIL` au 2026-07-30.
>
> **Cette numérotation fait foi à partir de maintenant** et remplace toute
> numérotation antérieure contradictoire (notamment les numéros "référentiel §12.8"
> cités en commentaires de migration, qui ne correspondent plus à l'ordre actuel du
> fichier — cf. tableau de correspondance §3). **Elle doit être mise à jour à chaque
> ajout ou suppression de règle dans `REGLES_ALERTES_CONSEIL`.**

## 1. Règles actives

Ordre d'apparition réel dans `REGLES_ALERTES_CONSEIL` ([regles.ts](../src/lib/alertes/regles.ts)).

### 1. `pacse_sans_testament`
- **Message** : « Votre partenaire n'héritera de rien. L'exonération de droits de succession dont il bénéficie ne s'appliquera à aucun actif. »
- **Champs/tables lus** :
  - `marital_status.statut_couple`
  - `liberalites.type`, `liberalites.testament_realise`

### 2. `concubin_sans_protection`
- **Message** : « Aucune vocation successorale. Fiscalité de 60 % en cas de legs. »
- **Champs/tables lus** :
  - `marital_status.statut_couple`
  - `liberalites.type`, `liberalites.testament_realise`
  - `av_contract_details.clause_beneficiaire_structuree` (contrats liés aux `assets` de nature « épargne et assurance-vie »)

### 3. `mariage_avant_1966_sans_contrat`
- **Message** : « Régime légal applicable : communauté de meubles et acquêts. Les biens meubles détenus avant le mariage sont communs. »
- **Champs/tables lus** :
  - `marital_status.statut_couple`, `marital_status.pas_de_contrat_mariage`, `marital_status.date_mariage`

### 4. `pacs_avant_2007_sans_convention`
- **Message** : « Régime d'indivision présumée applicable. »
- **Champs/tables lus** :
  - `marital_status.statut_couple`, `marital_status.convention_pacs`, `marital_status.date_pacs`

### 5. `communaute_universelle_double_abattement`
- **Message** : « Comparer le coût fiscal global sur les deux décès avec l'option usufruit au premier décès. »
- **Champs/tables lus** :
  - `marital_status.regime_matrimonial`
  - `family_links.lien_familial`, `family_links.est_decede`
  - patrimoine net estimé — **calculé** dans `useAlertesConseil.ts` (`assets.valeur_estimee` − `passifs.montant_du` − `emprunts.capital_restant_du`), pas une colonne directe

### 6. `separation_biens_rp_indivise_remboursement_unilateral`
- **Message** : « Le remboursement peut être requalifié en contribution aux charges du mariage et ne générer aucune créance. Vérifier la clause du contrat. »
- **Champs/tables lus** :
  - `marital_status.regime_matrimonial`
  - `assets.nature`, `assets.detenteur`
  - `emprunts.asset_id`, `emprunts.contributeur_remboursement`

### 7. `parts_non_negociables_souscrites_pendant_mariage`
- **Message** : « Le conjoint peut revendiquer la qualité d'associé pour la moitié des parts (art. 1832-2). Vérifier l'existence d'une renonciation. »
- **Champs/tables lus** :
  - `marital_status.regime_matrimonial`, `marital_status.date_mariage`
  - `societes.parts_negociables`, `societes.date_souscription`

### 8. `participation_acquets_sans_etat_descriptif_signe`
- **Message** : « Le régime sera très difficile à liquider. Établir un état descriptif signé (art. 1570). »
- **Champs/tables lus** :
  - `marital_status.regime_matrimonial`
  - `patrimoine_originaire.signe`

### 9. `exclusion_biens_professionnels_sans_maintien_divorce`
- **Message** : « Clause révoquée de plein droit au divorce (Cass. 1re civ., 18 déc. 2019). Ajouter une stipulation expresse. »
- **Champs/tables lus** :
  - `marital_status.clauses_contrat` (clé `exclusion_biens_professionnels.enabled` / `.options.maintienDivorce`)

### 10. `extraneite_residence_fiscale_etranger`
- **Message** : « La loi applicable au régime matrimonial doit être vérifiée (§ 4.4). »
- **Champs/tables lus** :
  - `family_profiles.residence_fiscale_etranger`
  - `marital_status.residence_fiscale_etranger_conjoint`

### 11. `extraneite_regime_matrimonial`
- **Message** : « Élément d'extranéité déclaré sur le régime matrimonial : la loi applicable doit être vérifiée (§ 4.4, § 12.1). Orienter vers un notaire si besoin — non automatisé dans cet outil. »
- **Champs/tables lus** :
  - `marital_status.pays_premier_domicile_matrimonial`, `marital_status.loi_applicable_regime`

### 12. `enfants_non_communs_sans_ddv`
- **Message** : « Le conjoint ne pourra prétendre qu'à 1/4 en pleine propriété (art. 757). Une donation au dernier vivant lui ouvrirait l'option de l'usufruit total. »
- **Champs/tables lus** :
  - `family_links.lien_familial`, `family_links.parent_de` (via `hasNonCommonChildren`)
  - `marital_status.donation_dernier_vivant_personne`, `marital_status.donation_dernier_vivant_conjoint` (via `hasDDV`)

### 13. `enfants_non_communs_communaute_universelle`
- **Message** : « Risque d'action en retranchement (art. 1527 al. 2). Envisager une renonciation anticipée (art. 1527 al. 3). »
- **Champs/tables lus** :
  - `family_links.lien_familial`, `family_links.parent_de` (via `hasNonCommonChildren`)
  - `marital_status.regime_matrimonial`
  - `marital_status.clauses_contrat` (clé `attribution_integrale.enabled`)

### 14. `changement_regime_proche_donation`
- **Message** (variable selon si la motivation civile est déjà renseignée) : « Un changement de régime matrimonial (réalisé ou envisagé) et une donation sont séparés de moins de 3 ans : risque de requalification en abus de droit (art. L. 64 LPF). Documentez la motivation civile du changement de régime, indépendante de toute optimisation fiscale. » (ou, si déjà renseignée : « Vérifiez que la motivation civile déjà renseignée reste pertinente et documentée. »)
- **Champs/tables lus** :
  - `liberalites.type`, `liberalites.date_acte`
  - `scenarios_regime.date`, `scenarios_regime.motivation_civile`

## 2. Règles abandonnées (hors numérotation actuelle)

Deux règles ont existé puis ont été retirées le 2026-07-30 (décision actée : la
détection « dirigeant d'entreprise » n'apportait aucune valeur ajoutée, faute de
détection automatique via société existante). Elles n'apparaissent plus dans
`REGLES_ALERTES_CONSEIL` et ne portent donc plus de numéro, mais sont documentées ici
pour la traçabilité :

- `dirigeant_regime_communautaire` — « Les dettes professionnelles engagent la masse commune (art. 1413). Vérifier les cautionnements (art. 1415). »
- `dirigeant_societe_acquets_residence_principale` — « Le logement devient le gage des créanciers professionnels (art. 1413). Arbitrage à documenter. »

Les colonnes `family_profiles.est_dirigeant`, `marital_status.est_dirigeant_conjoint`
et `family_links.est_dirigeant` restent en base, orphelines, sans mention "référentiel
§12.8" trouvée dans leurs migrations — elles ne concernent donc pas la table de
correspondance ci-dessous.

## 3. Correspondance avec les anciennes références externes

Anciennes références numériques trouvées dans le dépôt (recherche exhaustive
`grep -rniE "alerte.{0,40}#[0-9]+"`), et la règle actuelle à laquelle chacune
correspond réellement — déterminée par le contenu (champ ajouté, message), jamais par
supposition de correspondance numérique :

| Ancienne réf. | Source | Contenu de la source | Règle actuelle | Base de la correspondance |
|---|---|---|---|---|
| `#5` (référentiel §12.8) | [`20260724160000_add_contributeur_remboursement_emprunts.sql`](../supabase/migrations/20260724160000_add_contributeur_remboursement_emprunts.sql) | Colonne `emprunts.contributeur_remboursement` — « en séparation de biens, si un seul époux rembourse un emprunt lié à un bien indivis, ce remboursement peut être requalifié en contribution aux charges du mariage » | **6** `separation_biens_rp_indivise_remboursement_unilateral` | Champ ajouté = champ lu par la règle 6 ; formulation quasi identique au message affiché |
| `#7` (référentiel §12.8) | [`20260724170000_add_parts_negociables_date_souscription_societes.sql`](../supabase/migrations/20260724170000_add_parts_negociables_date_souscription_societes.sql) | Colonnes `societes.parts_negociables` / `date_souscription` — « le conjoint peut revendiquer la qualité d'associé, art. 1832-2 » | **7** `parts_non_negociables_souscrites_pendant_mariage` | Champs ajoutés = champs lus par la règle 7 ; art. 1832-2 cité dans le message affiché |
| `#8` (référentiel §12.8) | [`20260724180000_add_signe_date_signature_patrimoine_originaire.sql`](../supabase/migrations/20260724180000_add_signe_date_signature_patrimoine_originaire.sql) | Colonnes `patrimoine_originaire.signe` / `date_signature` — « participation aux acquêts sans état descriptif du patrimoine originaire signé (art. 1570) » | **8** `participation_acquets_sans_etat_descriptif_signe` | Champ ajouté = champ lu par la règle 8 ; art. 1570 cité dans le message affiché |
| `#13` (référentiel §12.8) | [`20260724190000_add_residence_fiscale_etranger.sql`](../supabase/migrations/20260724190000_add_residence_fiscale_etranger.sql) | Colonnes `family_profiles.residence_fiscale_etranger` / `marital_status.residence_fiscale_etranger_conjoint` — « élément d'extranéité détecté (résidence fiscale à l'étranger) » | **10** `extraneite_residence_fiscale_etranger` | Champs ajoutés = champs lus par la règle 10 |
| `#15` (sans tag §12.8 explicite, même famille de numérotation — cf. [`docs/recapitulatif-2026-07-29.md`](recapitulatif-2026-07-29.md) « Alerte #15 ») | [`20260726120000_create_scenarios_regime.sql`](../supabase/migrations/20260726120000_create_scenarios_regime.sql) + [`20260726120100_add_statut_liberalites.sql`](../supabase/migrations/20260726120100_add_statut_liberalites.sql) | « support de l'alerte #15 (changement de régime avant donation, risque d'abus de droit L. 64 LPF) » / « une donation en projet ne doit pas être traitée comme un acte réalisé » | **14** `changement_regime_proche_donation` | Table `scenarios_regime` + colonne `liberalites.statut` = données lues par la règle 14 ; art. L. 64 LPF cité dans le message affiché |

**Repère complémentaire (non numéroté §12.8)** : le commentaire `// Simplification
assumée (cf. Vague 0, alertes #1/#2)` dans [regles.ts:19](../src/lib/alertes/regles.ts#L19)
est un renvoi interne (numérotation de chantier « Vague 0 », pas le référentiel
§12.8) à la fonction `hasTestamentRealise`, utilisée par les règles **1**
(`pacse_sans_testament`) et **2** (`concubin_sans_protection`) — cohérent avec la
numérotation actuelle.

Le commentaire de [`transmissionHelpers.ts:411`](../src/utils/transmissionHelpers.ts#L411)
(« pour les besoins des alertes de conseil (§12.8, art. 1094-1) ») documente la
fonction `hasNonCommonChildren`, partagée par les règles **12**
(`enfants_non_communs_sans_ddv`) et **13**
(`enfants_non_communs_communaute_universelle`). L'article 1094-1 CC (quotité
disponible entre époux / option du conjoint survivant) correspond plus précisément au
contenu de la règle **12**, qui traite explicitement de la donation au dernier vivant.

## 4. Références externes non résolues

Aucune. Les 5 références numériques externes trouvées dans le dépôt (`#5`, `#7`,
`#8`, `#13`, `#15`) ont chacune pu être rattachées à une règle actuelle sur la base du
contenu (champ de base ajouté par la migration ↔ champ lu par la règle, et/ou article
de loi cité en commentaire ↔ article cité dans le message affiché). Aucune
correspondance n'a été forcée sur la seule base du numéro.
