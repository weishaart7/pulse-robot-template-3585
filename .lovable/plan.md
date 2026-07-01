
## Objectif

Produire un document Markdown `docs/famille-extraction.md` qui recense **tout** ce qui compose la section Famille : sous-onglets, formulaires, champs, règles conditionnelles, schéma de base de données, et interactions internes (autres modules du logiciel) et externes (Supabase, hooks partagés).

Aucun code applicatif n'est modifié — seul un fichier de documentation est créé.

## Contenu du document

Le fichier sera structuré en 8 parties :

### 1. Vue d'ensemble
- Route : `/famille` → `src/pages/famille/FamilleSection.tsx`
- 2 onglets : **Ma famille** (cartes cliquables Client / Partenaire / Relation) et **Liens familiaux**
- Vues plein écran en édition : `client`, `partner`, `relation`
- Design : cartes néomorphiques, couleurs sexe (H `#023e8a`, F `#e0aaff`), accent relation `#62706d`

### 2. Sous-section « Ma famille »
- Carte utilisateur : nom, profession, âge, tags (Handicap, nationalité non-française)
- Carte partenaire : conditionnelle (`Concubinage` / `Pacsé(e)` / `Marié(e)`), sinon case « Célibataire » ou bouton « Ajouter un partenaire »
- Carte relation : durée mariage/PACS/concubinage calculée, DDV synthétique (Oui/Non/Unilatérale)

### 3. Fiche client (`FicheClientForm.tsx`)
Deux sections navigables : **Informations générales** / **Coordonnées**. Champs listés avec type, obligatoire, valeurs possibles et règles conditionnelles (ex. `nomJeuneFille` si `Mme`/`Autre`, liste des 9 CSP, capacité juridique 4 valeurs, handicap, statut matrimonial synchronisé avec `marital_status`).

### 4. Situation matrimoniale
Deux formulaires coexistent :
- **`SituationMatrimonialeForm.tsx`** (formulaire tabulaire complet, ancien)
- **`PartnerForm.tsx`** + **`RelationInfoForm.tsx`** (nouveau flux plein écran utilisé par `FamilleSection`)

Champs partenaire (civilité, nom, nom de jeune fille, prénom, date/lieu/pays naissance, CSP + libellé profession, nationalité, capacité juridique, handicap, coordonnées).

Champs relation par statut :
- **Concubinage** : imposition distincte, historiques mariages précédents (années/mois)
- **PACS** : convention (`Séparation` / `Indivision`), date PACS
- **Mariage** : régime (5 valeurs), date, lieu, pas de contrat, donation au dernier vivant (personne + conjoint + dates), historiques mariages précédents
- **Clauses matrimoniales** via `MatrimonialRegimeOptions` (société d'acquêts, sous-clauses, sélection d'actifs, pourcentages PP/US)

### 5. Liens familiaux (`LiensFamiliauxForm.tsx` + `DynamicFamilyForm.tsx`)
- Table listant tous les membres + badge « À charge »
- Fonction `calculateAge` : jours < 30j, mois < 12 mois, sinon années
- 11 types de liens gérés dynamiquement par `useFamilyLinkLogic` (Enfant, Parent, Frère/Sœur, Oncle/Tante, Tierce personne, + Petit-enfant, Arrière petit-enfant, Grand-parent, Neveu/Nièce, Petit neveu/nièce, Cousin/Cousine — déblocage cascade selon existence de parents dans la même branche)
- Champs conditionnels : `enfant_de`, `branche_familiale` (Oncle/Tante), `enfant_adopte` (3 valeurs), `enfant_renoncant` + `enfant_renoncant_de` (Enfant), `exoneration_succession` (Frère/Sœur), `enfant_a_charge` (Enfant), `handicap`, `est_decede` + `date_deces`

### 6. Arbre familial (`FamilyTreeFlow.tsx` via `FamilyTree.tsx`)
Rendu React Flow, nœuds par membre, édition en clic → réouvre le formulaire correspondant.

### 7. Schéma Supabase
Trois tables (`family_profiles`, `marital_status`, `family_links`) avec liste exhaustive des colonnes typées telle qu'observée en base, y compris champs stockés mais non affichés dans les types TS (`imposition_distincte`, `duree_mariage_precedent_*`, `pays_naissance_conjoint`, `telephone_conjoint`, etc.). RLS par `user_id`, FK `ON DELETE CASCADE`.

### 8. Interactions
- **Internes** :
  - Hooks : `useFamilyProfile`, `useMaritalStatus`, `useFamilyLinks`, `useFamilyData`, `useFamilyLinkLogic`, `useMatrimonialClauses`, `useSecureForm`
  - Service : `src/services/familyService.ts`
  - Consommateurs de la donnée famille : `TransmissionDashboard`, `Liberalites`, `Optimisation`, `ProcessusCalcul`, module `src/lib/dmtg/*` (matrimonial, beneficiary, tax), module `src/lib/transmission/*` (successionLegale, reserve), IFI (indirectement via foyer fiscal), Budget (`parent_isole`, `nombre_enfants_charges`), Sociétés (associés = membres famille via `societe_associes`)
- **Externes** :
  - Supabase Auth (`auth.users`) + PostgREST
  - Sanitisation `src/lib/security.ts` (`sanitizeTextInput`, `isValidEmail`)
  - Composants partagés `NationalitySelect`, `SelectMenu`, `ActionHubInput`, `Calendar` (date-fns)
  - Aucun appel API tiers depuis la section Famille

## Livrable

Un unique fichier créé : `docs/famille-extraction.md` (~600–900 lignes). Aucun changement de code, de schéma DB, de types ou de dépendances.

## Hors périmètre

- Pas d'export des données réelles de l'utilisateur (uniquement structure et règles)
- Pas de refonte UI ni de correctifs même si des incohérences sont relevées (elles seront simplement mentionnées dans une section « Points d'attention » à la fin du doc)
