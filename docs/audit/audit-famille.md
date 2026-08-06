# Audit — Famille

> Audit statique + traçage base réalisé le 2026-07-29 sur la branche `main` (commit `2835f30`).
> **Volet navigateur non réalisé** : l'application exige une authentification Supabase et je ne
> saisis pas de mot de passe. Les points marqués `[À VÉRIFIER EN NAVIGATION]` restent ouverts.
> Aucun fichier applicatif n'a été modifié.

## Périmètre

| Sous-section | Route / point d'entrée | Composant |
|---|---|---|
| Ma famille (onglet par défaut) | `/dashboard/famille` | [FamilleSection.tsx](src/pages/famille/FamilleSection.tsx) |
| Fiche client | `/dashboard/famille` → clic carte identité (vue plein écran locale, pas de route) | [FicheClientForm.tsx](src/pages/famille/components/FicheClientForm.tsx) |
| Conjoint | `/dashboard/famille/conjoint` | [ConjointPage.tsx](src/pages/famille/ConjointPage.tsx) → [PartnerForm.tsx](src/components/famille/PartnerForm.tsx) |
| Régime matrimonial (6 onglets) | `/dashboard/famille/situation-matrimoniale` | [SituationMatrimonialePage.tsx](src/pages/famille/SituationMatrimonialePage.tsx) → [RelationInfoForm.tsx](src/components/famille/RelationInfoForm.tsx) |
| Scénarios de changement de régime | idem, en bas de page | [ScenarioRegimeSection.tsx](src/components/famille/matrimonial/ScenarioRegimeSection.tsx) |
| Liens familiaux (onglet) | `/dashboard/famille` | [LiensFamiliauxForm.tsx](src/pages/famille/components/LiensFamiliauxForm.tsx) + [FamilyMemberFormDialog.tsx](src/components/family/FamilyMemberFormDialog.tsx) + [DynamicFamilyForm.tsx](src/components/family/DynamicFamilyForm.tsx) |

Tables Supabase concernées : `family_profiles`, `marital_status`, `family_links`, `scenarios_regime`
(+ `recompenses`, `creances_entre_epoux`, `patrimoine_originaire`, `patrimoine_final` saisies depuis
l'onglet Régime matrimonial mais consommées par Transmission).

---

## Sous-section 1 — Ma famille (`FamilleSection.tsx`)

- **Objectif métier** : point d'entrée du foyer — identité du client, identité du partenaire, rappel du
  régime, et arbre familial en cartes cliquables.

- **Inputs et traçage** :
  | Champ | Type | Stockage | Traçage |
  |---|---|---|---|
  | Case « Célibataire (sans partenaire) » | checkbox | `marital_status.statut_couple` = `'Célibataire'` + `parent_isole` = `false` | `statut_couple` : **actif** (lu partout). `parent_isole` : **DORMANT** — écrit en dur à `false` ici (`FamilleSection.tsx:40`), jamais saisissable, jamais lu. |

  Le reste de l'écran est en lecture seule (dérivé de `family_profiles` / `marital_status` / `family_links`).

- **Dynamiques** :
  - `hasPartner` = `statut_couple ∈ {Concubinage, Pacsé(e), Marié(e)}` → bascule entre la carte partenaire
    et le bloc « Célibataire / Ajouter un partenaire ».
  - Si `hasPartner`, une bande basse affiche `statut + année + régime` et le lien « Voir le détail → ».
  - Clic carte identité → vue Fiche client ; clic carte partenaire ou « Ajouter un partenaire » →
    `/dashboard/famille/conjoint` ; « Voir le détail → » → `/dashboard/famille/situation-matrimoniale`.

- **Bugs trouvés** :
  - **F1 — `isSingle` jamais hydraté depuis la base** (`FamilleSection.tsx:26`, `:37-42`) — *gênant, nouveau*.
    L'état local démarre toujours à `false`. Un utilisateur déjà enregistré `Célibataire` revient sur la
    page : la case est décochée et le bouton « Ajouter un partenaire » réapparaît. Le choix semble perdu.
  - **F2 — décocher la case ne fait rien** (`FamilleSection.tsx:38-42`) — *gênant, nouveau*.
    `handleToggleSingle` ne traite que la branche `if (checked)`. Décocher change l'affichage local mais
    laisse `statut_couple = 'Célibataire'` en base. Incohérence écran/base.
  - **F3 — trois points d'entrée concurrents sur `statut_couple`** — *gênant, nouveau*.
    Écrit par `FamilleSection.tsx:40`, par `FicheClientForm.tsx:245` et par `PartnerForm.tsx:132`.
    Aucun n'est la source de vérité ; `FicheClientForm` ne l'écrit que `if (formData.statutCouple)`, donc
    il est impossible d'effacer la valeur depuis la fiche client.
  - **F4 — calcul d'âge approximatif** (`FamilleSection.tsx:55-57`) — *mineur, nouveau*.
    Division par `365.25` au lieu d'une différence de dates calendaire : erreur d'un an possible autour
    de la date d'anniversaire. `DynamicFamilyForm.tsx:39-47` fait le calcul correctement — deux
    implémentations divergentes dans la même section.

- **Liens/navigation testés** : `[À VÉRIFIER EN NAVIGATION]` — les 3 cibles (`/dashboard/famille/conjoint`,
  `/dashboard/famille/situation-matrimoniale`, vue Fiche client) existent bien côté routeur
  ([App.tsx:42-44](src/App.tsx:42)).

---

## Sous-section 2 — Fiche client (`FicheClientForm.tsx`)

- **Objectif métier** : identité civile, situation juridique et coordonnées du client (table `family_profiles`).

- **Inputs et traçage** :
  | Champ UI | Colonne | Traçage réel |
  |---|---|---|
  | Statut matrimonial | `marital_status.statut_couple` | **actif** |
  | Civilité | `family_profiles.civility` | **actif** (affichage) |
  | Nom / Prénom | `nom`, `prenom` | **actif** |
  | Nom de jeune fille | `nom_jeune_fille` | **DORMANT** — écrit, jamais relu ailleurs que par ce formulaire. Absent de l'interface TS `FamilyProfile` (accès via `(data as any)`, `FicheClientForm.tsx:147`). |
  | Date de naissance | `date_naissance` | **actif** (âge, transmission) |
  | Profession | `profession` | **actif** mais cassé — voir F6 |
  | Commune / Pays de naissance | `commune_naissance`, `pays_naissance` | **DORMANT** |
  | Nationalité | `nationalite` | **DORMANT** |
  | Capacité juridique | `capacite_juridique` | **DORMANT** — 7 valeurs saisissables, aucun lecteur |
  | Personne handicapée | `personne_handicapee` | **actif** ([transmissionHelpers.ts:438](src/utils/transmissionHelpers.ts:438)) |
  | Dirigeant d'entreprise | `est_dirigeant` | **CASSÉ** — voir F5 |
  | Résidence fiscale à l'étranger | `residence_fiscale_etranger` | **CASSÉ** — voir F5 |
  | Ancien combattant | `ancien_combattant` | **DORMANT** — voir F7 |
  | Mandat de protection future (+ date) | `mandat_protection_future`, `date_mandat_protection_future` | **DORMANT** |
  | Téléphone / Email / Adresse / CP / Ville / Pays | colonnes homonymes | **DORMANT** |

- **Dynamiques** :
  - Civilité `Mme` ou `Autre` → affiche « Nom de jeune fille ».
  - « Mandat de protection future signé » coché → affiche « Date du mandat ».
  - Deux pastilles de navigation interne (Informations générales / Coordonnées).

- **Bugs trouvés** :
  - **F5 — `est_dirigeant` et `residence_fiscale_etranger` ne sont jamais enregistrés** —
    ***BLOQUANT, nouveau***. `FicheClientForm.tsx:224-225` lit `sanitizedFormData.dirigeant` et
    `sanitizedFormData.residenceFiscaleEtranger`, mais l'objet `sanitizedFormData` construit
    lignes 189-210 **ne contient pas ces deux clés**. Les deux valeurs partent à `undefined`, sont
    éliminées à la sérialisation, et la colonne n'est jamais écrite.
    Confirmé par le compilateur :
    ```
    src/pages/famille/components/FicheClientForm.tsx(224,42): error TS2339: Property 'dirigeant' does not exist…
    src/pages/famille/components/FicheClientForm.tsx(225,55): error TS2339: Property 'residenceFiscaleEtranger' does not exist…
    ```
    **Impact métier** : ces deux colonnes alimentent le moteur d'alertes
    ([useAlertesConseil.ts:51-53](src/hooks/useAlertesConseil.ts:51) →
    [regles.ts:21-22 et :190](src/lib/alertes/regles.ts:21)). Aucune alerte « dirigeant » ni
    « extranéité / résidence fiscale étrangère » ne peut donc se déclencher **à cause du client** —
    seulement à cause du conjoint, dont `PartnerForm.tsx:144-145` écrit correctement les colonnes.
    Le formulaire coche la case, l'utilisateur croit l'information prise en compte, elle disparaît.
  - **F6 — la profession est effacée à chaque enregistrement si elle vient de la liste prédéfinie** —
    *gênant, nouveau*. Le tableau `professions` (`:75-85`) et le champ de formulaire `profession`
    existent, mais **aucun `<Select>` correspondant n'est rendu** : seul `professionLibre` est affiché
    (`:486-503`). Au chargement, une profession prédéfinie est routée vers `profession` et
    `professionLibre` reçoit `''` (`:150-151`) ; à la soumission,
    `professionFinale = formData.professionLibre?.trim() || ''` (`:187`) écrase la colonne avec une
    chaîne vide. **Perte de donnée silencieuse.**
  - **F7 — case « Ancien combattant » sans effet, avec une infobulle qui promet le contraire** —
    *gênant, nouveau*. L'infobulle (`:710`) annonce « une demi-part fiscale supplémentaire à partir de
    74 ans ». `ancien_combattant` n'est lu par aucun moteur (`lib/fiscal/` ne l'utilise pas).
  - **F8 — `unescapeHtml` ne traite pas `&amp;`** (`FicheClientForm.tsx:132-138`) — *mineur, nouveau*.
    Cinq entités sont dé-échappées, `&amp;` est omis. À vérifier selon ce que fait `sanitizeTextInput` :
    risque de corruption cumulative d'un nom contenant `&` sur enregistrements successifs.
  - **F9 — `useFamilyProfile` reste bloqué en `loading`** ([useFamilyData.ts:23-24](src/hooks/useFamilyData.ts:23)) —
    *mineur, nouveau*. `if (!isAuthenticated) return;` sort avant tout `setLoading(false)`, alors que
    `useMaritalStatus` (`:96-100`) gère le cas correctement. Si l'authentification échoue, le formulaire
    reste indéfiniment sur « Chargement des données… ». Même défaut dans `useFamilyLinks` (`:169`).

- **Liens/navigation testés** : `[À VÉRIFIER EN NAVIGATION]` — bouton « Retour » (retour à l'onglet
  Ma famille) et pastilles de section internes.

---

## Sous-section 3 — Conjoint (`PartnerForm.tsx`)

- **Objectif métier** : identité et coordonnées du partenaire, stockées à plat dans `marital_status`
  (colonnes suffixées `_conjoint`).

- **Inputs et traçage** :
  | Champ | Colonne | Traçage |
  |---|---|---|
  | Statut du couple | `statut_couple` | **actif** |
  | Civilité / Nom / Nom de jeune fille / Prénom | `civilite_conjoint`, `nom_conjoint`, `nom_jeune_fille_conjoint`, `prenom_conjoint` | **actif** (affichage foyer, arbre) |
  | Date de naissance | `date_naissance_conjoint` | **actif** |
  | Lieu / Pays de naissance | `lieu_naissance_conjoint`, `pays_naissance_conjoint` | **DORMANT** |
  | Profession CSP / libellé | `profession_csp_conjoint`, `profession_conjoint` | **DORMANT** |
  | Nationalité | `nationalite_conjoint` | **DORMANT** |
  | Capacité juridique | `capacite_juridique_conjoint` | **DORMANT** |
  | Personne handicapée | `personne_handicapee_conjoint` | **actif** ([transmissionHelpers.ts:594](src/utils/transmissionHelpers.ts:594)) |
  | Dirigeant | `est_dirigeant_conjoint` | **actif** (alertes) |
  | Résidence fiscale étranger | `residence_fiscale_etranger_conjoint` | **actif** (alertes) |
  | Ancien combattant | `ancien_combattant_conjoint` | **DORMANT** |
  | Mandat protection future (+ date) | `mandat_protection_future_conjoint`, `date_…` | **DORMANT** |
  | Téléphone / Email / Adresse / CP / Ville / Pays | colonnes `_conjoint` | **DORMANT** |

- **Dynamiques** : `showPartnerFields` conditionné à `statut_couple ∈ {Concubinage, Pacsé(e), Marié(e)}`
  (`PartnerForm.tsx:181-182`) ; civilité `Mme`/`Autre` → nom de jeune fille ; deux pastilles de section.

- **Bugs trouvés** :
  - **F10 — décalage d'un jour sur la date de naissance du conjoint** (`PartnerForm.tsx:137`) —
    *gênant, nouveau*. `formData.dateNaissancePartenaire?.toISOString().split('T')[0]` : la `Date` est
    à minuit **local** ; en France (UTC+1/+2) `toISOString()` renvoie la veille à 22h/23h UTC, donc le
    `split('T')[0]` retient **J-1**. La date enregistrée recule d'un jour au premier enregistrement.
    Incohérence interne notable : douze lignes plus bas, `date_mandat_protection_future_conjoint`
    (`:149`) utilise `format(date, 'yyyy-MM-dd')`, qui est la forme correcte — et
    `FicheClientForm.tsx:217` fait pareil pour le client. Seul le conjoint est affecté.
  - **F3 (rappel)** — `PartnerForm` est le troisième écrivain de `statut_couple`.

- **Liens/navigation testés** : `[À VÉRIFIER EN NAVIGATION]` — bouton « Retour » →
  `/dashboard/famille` (`ConjointPage.tsx:12`).

---

## Sous-section 4 — Régime matrimonial (`RelationInfoForm.tsx`)

- **Objectif métier** : régime matrimonial, clauses du contrat, récompenses/créances, participation aux
  acquêts, donation au dernier vivant et historique matrimonial — le socle civil de la Transmission.

- **Structure** : 6 pastilles affichées uniquement si `statut_couple === 'Marié(e)'`
  (`:349-361`) ; la pastille « Participation aux acquêts » n'apparaît que sous ce régime.
  Vues distinctes pour `Pacsé(e)` et `Concubinage`.

- **Inputs et traçage** :
  | Champ | Colonne | Traçage |
  |---|---|---|
  | Date du mariage | `date_mariage` | **actif** (`determinerRegimeLegal`) — mais voir F11 |
  | Lieu du mariage | `lieu_mariage` | **DORMANT** |
  | Régime matrimonial | `regime_matrimonial` | **actif** (Transmission, Patrimoine, clauses) |
  | Pas de contrat de mariage | `pas_de_contrat_mariage` | **actif** (alertes) |
  | Résidence séparée | `residence_separee` | **semi-dormant** — ne sert qu'à activer la case suivante dans ce même formulaire |
  | Imposition distincte | `imposition_distincte` | **DORMANT** — aucun moteur fiscal ne la lit, alors que l'option art. 6-4a CGI a un impact IR majeur |
  | Pays du premier domicile matrimonial | `pays_premier_domicile_matrimonial` | **actif** (alertes DIP) |
  | Loi applicable au régime | `loi_applicable_regime` | **actif** (alertes DIP) |
  | Donation au dernier vivant (client / conjoint) | `donation_dernier_vivant_personne` / `_conjoint` | **actif** (Transmission, Optimisation) |
  | Date des donations | `date_donation_personne` / `_conjoint` | **actif** (clauses) — voir F11 |
  | Mariage précédent (client / conjoint) | `mariage_precedent_personne` / `_conjoint` | **DORMANT** |
  | Durées des mariages précédents (4 colonnes) | `duree_mariage_precedent_*` | **DORMANT** |
  | Convention de PACS | `convention_pacs` | **actif** (qualification des biens, alertes) |
  | Date du PACS | `date_pacs` | **actif** (affichage) — voir F11 |

- **Dynamiques** :
  - « Pas de contrat de mariage » coché → `useEffect` (`:303-311`) force le régime légal calculé depuis
    la date de mariage, et le `<Select>` du régime est désactivé.
  - Changement de régime rendant une clause active incompatible → `AlertDialog` de confirmation
    (`:821-846`), qui désactive les clauses concernées puis persiste dans le même upsert.
  - Régime communautaire ou séparation avec société d'acquêts → affiche `RecompensesSection`
    (`:562`) ; `CreancesEntreEpouxSection` est toujours affichée.
  - Régime = participation aux acquêts → pastille + sections Patrimoine originaire / final.
  - « Imposition distincte » grisée sauf si régime séparatiste **et** résidence séparée.
  - Erreur de validation → bascule automatique sur l'onglet fautif (`onError`, `:205-220`).

- **Bugs trouvés** :
  - **F11 — décalage d'un jour sur 4 dates** (`RelationInfoForm.tsx:178, 180, 188, 190`) —
    *gênant, nouveau*. Même défaut `toISOString().split('T')[0]` que F10, appliqué à `date_pacs`,
    `date_mariage`, `date_donation_personne`, `date_donation_conjoint`. **`date_mariage` est
    aggravante** : elle pilote `determinerRegimeLegal` (bascule au 01/02/1966) — un mariage saisi au
    01/02/1966 est stocké au 31/01/1966 et bascule sur le mauvais régime légal.
  - **F12 — l'enregistrement écrase des colonnes hors du statut courant** (`:176-197`) —
    *gênant, nouveau*. `onSubmit` écrit systématiquement **tous** les champs, quel que soit
    `relationStatus`. Un couple `Pacsé(e)` se voit écrire
    `regime_matrimonial = 'Communauté réduite aux acquêts…'` (la valeur par défaut du schéma zod),
    et un couple `Marié(e)` se voit écrire `convention_pacs`. En `Concubinage`, le formulaire n'affiche
    aucun champ mais le bouton « Enregistrer » écrit quand même l'intégralité des valeurs par défaut.
    Ces colonnes sont ensuite lues sans re-vérifier `statut_couple`
    (ex. [useAssetForm.ts:104](src/hooks/useAssetForm.ts:104), [usePassifEmpruntForm.ts:78](src/hooks/usePassifEmpruntForm.ts:78)).
  - **F13 — double point d'entrée sur les donations au dernier vivant** — *gênant, nouveau*.
    `donation_dernier_vivant_personne/_conjoint` et `date_donation_personne/_conjoint` sont écrits par
    l'onglet « Donation » (`RelationInfoForm.tsx:187-190`) **et** par l'onglet « Clauses du contrat »
    ([useMatrimonialClauses.ts:73-75](src/hooks/useMatrimonialClauses.ts:73)). Un formulaire chargé
    avant une modification faite dans l'autre onglet réécrira l'ancienne valeur au moment du
    « Enregistrer ». Le commentaire `RelationInfoForm.tsx:114-118` reconnaît déjà une désynchronisation
    « possible mais acceptée » sur `clauses_contrat` — **dette partiellement connue**, mais le risque
    sur les colonnes de donation n'est pas documenté.
  - **F14 — `FIELD_TO_SECTION` incomplet** (`:84-103`) — *mineur, nouveau*. `conventionPacs` et
    `datePacs` n'y figurent pas : une erreur sur ces champs produit le message générique sans
    redirection vers l'onglet fautif.

- **Liens/navigation testés** : `[À VÉRIFIER EN NAVIGATION]` — bouton « Retour », 6 pastilles,
  `AlertDialog` de changement de régime.

### 4 bis — Scénarios de changement de régime (`ScenarioRegimeSection.tsx`)

- **Objectif métier** : documenter un changement de régime réalisé ou envisagé, notamment au regard du
  risque d'abus de droit (art. L. 64 LPF).
- **Inputs** : `type` (`realise`/`envisage`), `regime_cible`, `date`, `motivation_civile` → table
  `scenarios_regime` via `scenarioRegimeService`.
- **Bugs trouvés** :
  - **F15 — table `scenarios_regime` entièrement dormante** — *gênant, nouveau*. Écrite et relue
    uniquement par sa propre liste d'affichage ; **aucun moteur** (transmission, alertes, fiscalité) ne
    la consomme (`grep` sur la table : seules 4 occurrences, toutes dans `scenarioRegimeService.ts`).
    Le libellé de l'écran met explicitement en avant le risque d'abus de droit — l'utilisateur croit
    alimenter une détection qui n'existe pas.
  - **F16 — suppression sans confirmation** (bouton `Trash2`) — *mineur, nouveau*. Action
    irréversible, aucun garde-fou.

---

## Sous-section 5 — Liens familiaux (`LiensFamiliauxForm` + `FamilyMemberFormDialog` + `DynamicFamilyForm`)

- **Objectif métier** : saisir les membres de la famille (`family_links`), socle de tout le calcul
  successoral (dévolution légale, représentation, abattements DMTG).

- **Inputs et traçage** :
  | Champ | Colonne | Traçage |
  |---|---|---|
  | Lien familial | `lien_familial` | **actif** (moteur succession) |
  | « Enfant de » / « Parent de » | `enfant_de` **et** `parent_de` (même valeur, `FamilyMemberFormDialog.tsx:158-159`) | **actif** — voir F17 |
  | Branche familiale | `branche_familiale` | **CASSÉ** — voir F18 |
  | Civilité | `civilite` | **DORMANT** (seul lecteur = `FamilyTreeTimeline`, composant mort — voir F22) |
  | Nom / Prénom / Date de naissance | `nom`, `prenom`, `date_naissance` | **actif** |
  | Décédé + date de décès | `est_decede`, `date_deces` | **actif** (représentation) |
  | Mesure de protection juridique | `mesure_protection_juridique` | **DORMANT** |
  | Personne handicapée | `handicap` | **actif** (abattement DMTG) |
  | Personne à charge | `personne_a_charge` | **DORMANT** |
  | Dirigeant d'entreprise | `est_dirigeant` | **DORMANT** (le moteur d'alertes ne lit que le profil et le conjoint) |
  | Mandat de protection future (+ date) | `mandat_protection_future`, `date_…` | **DORMANT** |
  | Enfant à charge (civil) | `enfant_a_charge` | **semi-dormant** — badge d'affichage uniquement |
  | Fiscalement à charge | `fiscalement_a_charge` | **actif** ([lib/fiscal/calcul.ts:10-11](src/lib/fiscal/calcul.ts:10)) |
  | Enfant adopté | `enfant_adopte` | **actif** (DMTG) |
  | Abattement plein malgré adoption simple | `adoption_simple_abattement_plein` | **actif** (DMTG) |
  | Motif de l'exception | `adoption_simple_motif` | **DORMANT** |
  | Enfant renonçant | `enfant_renoncant` | **actif** mais neutralisé — voir F19 |
  | Renonce à la succession de | `enfant_renoncant_de` | **CASSÉ** — voir F19 |
  | Exonération succession (frère/sœur) | `exoneration_succession` | **DORMANT** — voir F20 |
  | *(colonne DB `nationalite`)* | `nationalite` | **DORMANT total** — déclarée dans `FamilyService`, jamais saisie ni lue |

- **Dynamiques** :
  - La liste des liens disponibles s'enrichit en cascade (`useFamilyLinkLogic.ts`) : « Petit-enfant »
    n'apparaît qu'après au moins un « Enfant », « Grand-parent » après un « Parent », etc.
  - `showParentField` / `showAdoption` / `showRenunciation` / `showBranche` / `showExoneration`
    conditionnent l'affichage selon le lien choisi (`DynamicFamilyForm.tsx:79-83`).
  - Date de naissance < 18 ans sur un « Enfant » → coche automatiquement `enfant_a_charge` et
    `fiscalement_a_charge`, sauf si l'utilisateur les a déjà modifiées manuellement (`:61-77`).
  - `enfant_adopte = 'Adoption simple'` → case abattement plein → motif de l'exception.
  - `est_decede` → date de décès ; `mandat_protection_future` → date du mandat.
  - Ajout/modification/suppression d'un membre resynchronise `marital_status.nombre_enfants_charges`
    ([useFamilyData.ts:7-15](src/hooks/useFamilyData.ts:7)).

- **Bugs trouvés** :
  - **F19 — la renonciation à succession n'est JAMAIS prise en compte par le moteur** —
    ***BLOQUANT, nouveau***. Chaîne complète :
    1. Le `<Select>` « Renonce à la succession de » écrit `'user'`, `'spouse'` ou `'both'`
       ([useFamilyLinkLogic.ts:213-219](src/hooks/useFamilyLinkLogic.ts:213)).
    2. Ces valeurs sont recopiées telles quelles dans `renoncantDe`
       ([transmissionHelpers.ts:491](src/utils/transmissionHelpers.ts:491) et `:620`).
    3. Le moteur teste `child.renoncantDe === graph.decedentId`
       ([successionLegale.ts:345](src/lib/transmission/successionLegale.ts:345) et `:690`).
    4. Or `graph.decedentId` vaut `familyProfile.id` (un **UUID**) ou `` `conjoint-${familyProfile.id}` ``
       ([transmissionHelpers.ts:431](src/utils/transmissionHelpers.ts:431) et `:587`).

    La comparaison `'user' === '<uuid>'` est **toujours fausse**. `renonceACetteSuccession` reste donc
    systématiquement `false` : un enfant renonçant est traité comme héritier acceptant, et sa souche
    n'est jamais représentée par ses propres descendants. La case et le select sont saisis, stockés,
    et sans effet. Les tests unitaires existants n'attrapent pas le défaut car ils injectent
    directement des `renoncantDe` valides, jamais ceux que l'UI produit.
  - **F18 — trois vocabulaires incompatibles sur `branche_familiale`** — ***bloquant, nouveau***.
    - L'UI n'écrit que `'Branche paternelle'` / `'Branche maternelle'` (`DynamicFamilyForm.tsx:28`) et
      **uniquement pour le lien « Oncle/Tante »** (`:82`).
    - [transmissionHelpers.ts:1070](src/utils/transmissionHelpers.ts:1070) teste
      `child.branche_familiale === 'Précédent lit'` — valeur **jamais produite** par l'UI.
    - [Optimisation.tsx:45](src/components/transmission/Optimisation.tsx:45) teste
      `e.branche_familiale === 'commune'` — valeur **jamais produite** non plus.

    Les deux consommateurs lisent la colonne **sur des enfants**, pour lesquels le champ n'est jamais
    affiché. Conséquence : la distinction « enfant d'un précédent lit » / « enfant commun » est
    inatteignable depuis l'interface, et les deux moteurs retombent sur leur branche par défaut par
    accident plutôt que par conception.
  - **F20 — case « Exonération de droits de succession » sans effet fiscal** — *gênant, nouveau*.
    `exoneration_succession` (frère/sœur vivant sous le même toit, art. 796-0 ter CGI) n'est lue que
    pour afficher un badge dans le tableau ([LiensFamiliauxForm.tsx:128](src/pages/famille/components/LiensFamiliauxForm.tsx:128)).
    Le moteur DMTG l'ignore : les droits sont calculés comme si l'exonération n'existait pas.
  - **F21 — suppression d'un membre sans confirmation**
    ([LiensFamiliauxForm.tsx:149](src/pages/famille/components/LiensFamiliauxForm.tsx:149)) —
    *gênant, nouveau*. Un clic dans le menu « … » supprime définitivement le membre. Aucun
    `AlertDialog`, alors que le composant est disponible et utilisé ailleurs dans la section.
    Effet de bord : la suppression recalcule `nombre_enfants_charges` et peut casser des liens
    `enfant_de` pointant vers l'id supprimé (pas de nettoyage en cascade côté applicatif).
  - **F17 — `parent_de` duplique `enfant_de`** (`FamilyMemberFormDialog.tsx:158-159`) —
    *mineur, nouveau*. Les deux colonnes reçoivent la même valeur. Le comportement est correct
    aujourd'hui (pour un « Enfant », `enfant_de` vaut bien `'user'`/`'spouse'`/`'both_parents'`), mais
    les deux colonnes portent des sémantiques opposées et divergeront à la première évolution.
    À noter : pour les descendants (« Petit-enfant »…), `enfant_de` contient un **UUID** — donc
    `parent_de` aussi, ce qui n'a aucun sens sémantique et n'est neutralisé que parce que le moteur
    ne lit `parent_de` que pour `lien_familial === 'Enfant'`.
  - **F23 — colonne « Âge » : l'argument `date_deces` est mort**
    ([LiensFamiliauxForm.tsx:116](src/pages/famille/components/LiensFamiliauxForm.tsx:116)) —
    *mineur, nouveau*. `calculateAge(member.date_naissance, member.date_deces)` sait calculer l'âge au
    décès, mais l'appel est gardé par `member.est_decede ? '-' : …`, donc le second argument n'est
    jamais utilisé.
  - **F24 — dates de décès futures acceptées** (`DynamicFamilyForm.tsx:402`) — *mineur, nouveau*.
    La validation de saisie clavier n'impose que `year <= annéeCourante` : le 31/12 de l'année en cours
    passe même s'il est dans le futur. Le sélecteur calendrier, lui, bloque correctement (`:431`).
  - **F25 — `<Select defaultValue>` au lieu de `value`** (`FamilyMemberFormDialog.tsx:206`,
    `DynamicFamilyForm.tsx:117, 145, 173, 316, 663, 725, 775`) — *mineur, nouveau*. Composants
    non contrôlés : fonctionne aujourd'hui parce que le `Dialog` démonte son contenu à la fermeture,
    mais tout changement de ce comportement casserait silencieusement le pré-remplissage en édition.

- **Liens/navigation testés** : `[À VÉRIFIER EN NAVIGATION]` — dialogue Ajouter/Modifier, menu « … »,
  bloc « Actifs codétenus » et son `AssetDetailsDialog`.

---

## Transverse

- **F22 — code mort** — *mineur, nouveau*. Aucun import externe pour :
  - [FamilyTree.tsx](src/components/FamilyTree.tsx) (25 l.) — n'est importé nulle part
  - [FamilyTreeFlow.tsx](src/components/FamilyTreeFlow.tsx) (219 l.) — importé uniquement par `FamilyTree`
  - [FamilyTreeTimeline.tsx](src/components/FamilyTreeTimeline.tsx) (161 l.) — aucun import
  - [PartnerInfoCard.tsx](src/components/famille/PartnerInfoCard.tsx) (89 l.) — aucun import

  Soit ~494 lignes. Le commentaire de [buildFamilyGraph.ts:48](src/lib/family/buildFamilyGraph.ts:48)
  décrit encore `FamilyTreeFlow` comme un consommateur actif — documentation périmée.

- **F26 — le typecheck ne tourne sur rien** — *gênant, nouveau*. `tsconfig.json` racine a
  `"files": []` + `references`, donc `npx tsc --noEmit` **sort en succès sans rien compiler**.
  `package.json` n'expose aucun script `typecheck` ; `npm run lint` ne fait qu'ESLint.
  `npx tsc -p tsconfig.app.json --noEmit` remonte **108 lignes d'erreurs**, dont F5 ci-dessus.
  C'est la cause racine qui a laissé passer un bug bloquant.
  (`strict: false`, `strictNullChecks: false`, `noImplicitAny: false` réduisent en outre fortement la
  couverture du peu qui serait vérifié.)

---

## Synthèse

### Bugs bloquants
| # | Résumé | Fichiers |
|---|---|---|
| **F19** | La renonciation d'un enfant à la succession n'a aucun effet : `renoncantDe` (`'user'`/`'spouse'`/`'both'`) est comparé à un UUID, test toujours faux. | `useFamilyLinkLogic.ts:213`, `transmissionHelpers.ts:491,620`, `successionLegale.ts:345,690` |
| **F5** | `est_dirigeant` et `residence_fiscale_etranger` du client ne sont jamais enregistrés (clés absentes de `sanitizedFormData`). Neutralise 2 règles d'alerte côté client. | `FicheClientForm.tsx:189-210,224-225` |
| **F18** | `branche_familiale` : trois vocabulaires incompatibles entre l'UI et ses deux consommateurs ; le champ n'est de toute façon jamais saisissable pour un enfant. | `DynamicFamilyForm.tsx:28,82`, `transmissionHelpers.ts:1070`, `Optimisation.tsx:45` |

### Bugs gênants
| # | Résumé |
|---|---|
| F6 | La profession est effacée à chaque enregistrement si elle provient de la liste prédéfinie (`<Select>` jamais rendu). |
| F10 / F11 | Décalage systématique de −1 jour sur 5 dates (`date_naissance_conjoint`, `date_pacs`, `date_mariage`, 2 dates de donation) via `toISOString()`. `date_mariage` pilote le régime légal. |
| F12 | L'enregistrement du régime écrit toutes les colonnes quel que soit le statut du couple (pollution `regime_matrimonial` / `convention_pacs`). |
| F13 | Double point d'entrée concurrent sur les donations au dernier vivant (onglet Donation vs onglet Clauses). |
| F20 | Case « Exonération de droits de succession » (frère/sœur) sans effet sur le calcul DMTG. |
| F7 | Case « Ancien combattant » sans effet, avec infobulle annonçant une demi-part fiscale. |
| F21 | Suppression d'un membre de la famille sans confirmation, sans nettoyage des `enfant_de` orphelins. |
| F1 / F2 / F3 | Case « Célibataire » non hydratée, décochage sans effet, trois écrivains concurrents de `statut_couple`. |
| F15 | Table `scenarios_regime` entièrement dormante alors que l'écran met en avant l'abus de droit (art. L. 64 LPF). |
| F26 | Le typecheck ne compile aucun fichier ; 108 erreurs TS latentes, dont F5. |

### Bugs mineurs
F4 (calcul d'âge à `365.25`, divergent de `DynamicFamilyForm`), F8 (`&amp;` non dé-échappé),
F9 (`loading` bloqué dans `useFamilyProfile`/`useFamilyLinks`), F14 (`FIELD_TO_SECTION` incomplet),
F16 (suppression de scénario sans confirmation), F17 (`parent_de` duplique `enfant_de`),
F22 (~494 lignes de code mort + commentaire périmé), F23 (argument `date_deces` mort),
F24 (dates de décès futures acceptées), F25 (`<Select defaultValue>` non contrôlés).

### Cases dormantes (nouvelles)
Champs saisissables dans l'interface **et jamais lus par aucun moteur ni affichage** :

- **`family_profiles`** : `nom_jeune_fille`, `commune_naissance`, `pays_naissance`, `nationalite`,
  `capacite_juridique`, `ancien_combattant`, `mandat_protection_future`,
  `date_mandat_protection_future`, `telephone`, `email`, `adresse_postale`, `code_postal`, `ville`,
  `pays`.
- **`marital_status`** : `lieu_naissance_conjoint`, `pays_naissance_conjoint`,
  `profession_csp_conjoint`, `profession_conjoint`, `nationalite_conjoint`,
  `capacite_juridique_conjoint`, `ancien_combattant_conjoint`,
  `mandat_protection_future_conjoint`, `date_mandat_protection_future_conjoint`,
  `telephone_conjoint`, `email_conjoint`, `adresse_conjoint`, `code_postal_conjoint`,
  `ville_conjoint`, `pays_conjoint`, `lieu_mariage`, **`imposition_distincte`**,
  `mariage_precedent_personne`, `mariage_precedent_conjoint`, `duree_mariage_precedent_*` (4).
- **`family_links`** : `mesure_protection_juridique`, `personne_a_charge`, `est_dirigeant`,
  `mandat_protection_future`, `date_mandat_protection_future`, `adoption_simple_motif`,
  **`exoneration_succession`** (badge uniquement), `enfant_a_charge` (badge uniquement),
  `civilite` (seul lecteur = composant mort).
- **Table entière** : `scenarios_regime`.
- **Colonnes DB jamais atteintes par aucune UI** : `marital_status.lieu_pacs`,
  `marital_status.parent_isole` (écrite en dur à `false`), `family_links.nationalite`,
  `marital_status.nombre_enfants_charges` (écrite automatiquement, jamais lue).

Les plus coûteuses métier : **`imposition_distincte`** (art. 6-4a CGI, impact IR direct),
**`exoneration_succession`** (art. 796-0 ter CGI, impact DMTG direct), **`ancien_combattant`**
(demi-part promise par l'infobulle), et la table **`scenarios_regime`**.

### Dette déjà connue confirmée
- **Aucun `TODO` / `FIXME` / `HACK`** dans tout le périmètre Famille — l'intégralité des constats
  ci-dessus est nouvelle.
- Seule dette documentée retrouvée : le commentaire `RelationInfoForm.tsx:114-118` qui assume une
  « désynchronisation possible mais acceptée » entre l'instance locale de `clauses_contrat` et
  l'onglet « Clauses du contrat » — F13 montre que le même risque porte aussi, non documenté, sur
  les colonnes `donation_dernier_vivant_*` / `date_donation_*`.
- `CLAUDE.md` mentionne le pattern `src/lib/ifi/` à reproduire pour `src/lib/transmission/` :
  côté Famille, la logique métier est effectivement déjà externalisée (`lib/family/`,
  `lib/fiscal/`, `lib/patrimoine/regimeLegal.ts`) — sauf `useFamilyLinkLogic.ts`, qui porte le
  vocabulaire de liaison (`'user'`/`'spouse'`/`'both'`) à l'origine de F19 sans le partager avec
  `lib/transmission/`.

### Reste à faire
Volet **navigation réelle** (remplissage de données de test, vérification des liens/boutons,
console et réseau, cohérence écran vs moteur) : bloqué sur l'authentification.
