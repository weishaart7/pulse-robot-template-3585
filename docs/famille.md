# Module Famille

> Ce document reflète l'état actuel du module (issu de l'audit statique `docs/audit/audit-famille.md`,
> constats F1-F26, depuis intégrés ou soldés). Le catalogue de clauses du contrat de mariage est
> retiré pour la V1 : voir §2 et
> [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md).

## 1. Vue d'ensemble

Le module Famille est le point d'entrée du foyer : identité du client, identité du partenaire,
régime matrimonial et arbre familial. Il alimente directement les moteurs de retraite,
fiscalité (IFI, IR) et transmission (DMTG, succession légale) : c'est le socle de donnée sur
lequel reposent tous les calculs montrés au client.

**Navigation** : le panneau latéral du module affiche trois sous-sections, déclarées dans
[useFamilleSubNav.ts](../src/pages/famille/useFamilleSubNav.ts) (mécanisme commun
`useModuleSubNav`, mais chaque entrée est ici une route et non un onglet local).

| Sous-section (panneau) | Route | Composant |
|---|---|---|
| Foyer | `/dashboard/famille` | [FamilleSection.tsx](../src/pages/famille/FamilleSection.tsx) (panneau : bandeau couple / statut / composition + arbre, via [LiensFamiliauxForm.tsx](../src/pages/famille/components/LiensFamiliauxForm.tsx) `view="arbre"`) |
| ↳ Fiche client (Foyer actif) | `/dashboard/famille/client` | [ClientPage.tsx](../src/pages/famille/ClientPage.tsx) → [FicheClientForm.tsx](../src/pages/famille/components/FicheClientForm.tsx) |
| ↳ Conjoint (Foyer actif) | `/dashboard/famille/conjoint` | [ConjointPage.tsx](../src/pages/famille/ConjointPage.tsx) → [PartnerForm.tsx](../src/components/famille/PartnerForm.tsx) |
| Régime matrimonial (4 à 6 onglets selon le régime) | `/dashboard/famille/situation-matrimoniale` | [SituationMatrimonialePage.tsx](../src/pages/famille/SituationMatrimonialePage.tsx) → [RelationInfoForm.tsx](../src/components/famille/RelationInfoForm.tsx) |
| Membres | `/dashboard/famille/membres` | [MembresPage.tsx](../src/pages/famille/MembresPage.tsx) → [LiensFamiliauxForm.tsx](../src/pages/famille/components/LiensFamiliauxForm.tsx) `view="membres"` + [FamilyMemberFormDialog.tsx](../src/components/family/FamilyMemberFormDialog.tsx) + [DynamicFamilyForm.tsx](../src/components/family/DynamicFamilyForm.tsx) |

**Tables Supabase** : `family_profiles`, `marital_status`, `family_links` (+ `recompenses`,
`creances_entre_epoux`, `patrimoine_originaire`, `patrimoine_final` saisies depuis l'onglet Régime
matrimonial mais consommées par Transmission). La table `scenarios_regime` reste active côté
lecture (alerte de conseil n°16, voir §3) mais orpheline côté écriture : aucun formulaire ne
permet de l'alimenter (voir §3).

Les quatre tables du régime ont `user_id → auth.users ON DELETE CASCADE`, mais leur
`bien_concerne_id → assets` est volontairement en `ON DELETE SET NULL` (exception assumée à la règle
CASCADE du projet) : le bien n'y est qu'une référence facultative, la ligne porte ses propres
montants, et une récompense ou une créance reste due même si le bien a été vendu ou supprimé
(art. 1469 al. 3 C. civ. : bien aliéné, profit évalué au jour de l'aliénation). Supprimer un bien ne
doit donc pas effacer silencieusement ces lignes.

**Flux clés** :
- **Foyer** est un tableau de bord en lecture seule (dérivé de `family_profiles` /
  `marital_status` / `family_links`) doté d'un menu déroulant Statut (6 valeurs) toujours
  modifiable, y compris en couple. La page Foyer est un panneau de travail unique, bord à bord de la plaque de contenu (même modèle que Régime
  matrimonial) : barre d'en-tête (fil d'Ariane « Famille / Foyer » + bouton « Ajouter / Gérer les membres »
  vers la sous-section Membres), titre « Foyer » et rappel « statut · N membres », puis un bandeau en colonnes
  filetées — Client, Conjoint(e)/Partenaire (si en couple) en lignes libellé / valeur (nom, naissance, âge,
  profession) avec un lien « Voir la fiche », et une colonne Statut du couple (menu déroulant) + Composition
  (nombre de membres par branche, via `grouperMembres`) — et enfin l'arbre familial pleine largeur (l'arbre
  demande ~960 px, d'où le bandeau plutôt qu'un panneau latéral). Les cartes de l'arbre suivent le gabarit des panneaux : angles de 2 px, filet, fond blanc (couple en noir), initiales en carré coloré selon la branche, libellés de génération en texte 12 px, traits fins couleur filet. Plus de photo de profil ; le détail du
  régime n'y est pas répété, il vit dans la sous-section Régime matrimonial. La liste des membres vit dans un panneau de travail comme Foyer et Régime matrimonial (barre d'en-tête « Famille / Membres » portant le bouton « Ajouter un membre » (`AddButton`), titre 24 px et rappel) : une section filetée par branche — descendants, ascendants, collatéraux, autres — via `lib/family/groupesMembres.ts`, sur deux colonnes indépendantes à partir de `lg` (`repartirEnColonnes` : chaque branche va dans la colonne la moins remplie, les branches courtes s'empilent sans blanc ; le filet de fin de liste disparaît quand une branche suit). Chaque branche a une couleur fixe ([groupeTones.ts](../src/components/famille/groupeTones.ts) : descendants lagon, ascendants citron, collatéraux lagon foncé, autres gris), reprise par le repère du titre de section, le carré d'initiales des membres vivants (liste et arbre, via `groupeIdDuLien`) et la pastille du bloc « Composition » du Foyer ; étiquettes en `Chip` (lagon pour les avantages fiscaux) ; ligne cliquable pour modifier ; seul point d'entrée « Ajouter un membre »,
  état vide explicatif sans membre) vit dans la sous-section Membres. Les personnes décédées sont estompées
  (carte à filet pointillé, « † année ») dans l'arbre et grisées dans le tableau. Quitter un statut en
  couple (vers Célibataire, Divorcé(e), Veuf/Veuve) passe par une confirmation qui liste les enfants
  rattachés au partenaire (`spouse` / `both_parents`) ; rien n'est effacé ni réaffecté
  (`lib/family/statutTransition.ts`, politique « Option A »). Il route vers les fiches client et conjoint et, via l'arbre, vers les membres.
- **Fiches client et conjoint** suivent le même gabarit de panneau de travail ([FicheClientForm.tsx](../src/pages/famille/components/FicheClientForm.tsx), [PartnerForm.tsx](../src/components/famille/PartnerForm.tsx)) : barre d'en-tête « Famille / Foyer / Client » (ou « Conjoint ») portant « Retour » et « Enregistrer », titre (nom) et rappel (date de naissance, âge), puis trois sections filetées sans encadré : Identité (grille de 3 colonnes ; 4 pour le conjoint avec le nom de jeune fille), Profession & Nationalité (profession, nationalité, case « Double nationalité » alignée sur le bas des champs, deuxième nationalité placée sous la première), Situation juridique (capacité juridique, puis une ligne de cases à cocher, et la date du mandat de protection future en retrait sous les cases quand il est coché) ; la civilité se choisit dans une bascule segmentée comme le contrat de mariage. Sans statut de couple, la fiche conjoint n'affiche qu'un message renvoyant au Foyer.
- **Fiche client** et **Conjoint** saisissent l'identité civile de chaque membre du couple, dont
  une bonne partie de champs déclaratifs (adresse, nationalité…) qui restent aujourd'hui dormants
  (§3).
- **Régime matrimonial** (titre + rappel « statut depuis année · régime ») structure ses onglets (`GooeyNav` ; Général, Récompenses, Donation, Historique, plus Participation aux acquêts ou Société d'acquêts selon le régime) dans un panneau de travail unique inspiré de la maquette de référence : barre d'en-tête (fil d'Ariane « Famille / … » + bouton « Enregistrer » noir), colonne principale (titre, rappel, onglets, sections séparées par des filets) et, pour Marié(e) / Pacsé(e), un panneau « Synthèse » à droite (≥ `lg`) qui relit en direct les valeurs du formulaire en lignes libellé / valeur (statut, mariage, lieu, régime, contrat et situation en étiquettes, donations au dernier vivant, mariages précédents ; pour le PACS : date, convention, résidence) — affichage seul, aucun calcul visibles seulement si `statut_couple === 'Marié(e)'`
  (vues distinctes pour Pacsé(e)/Concubinage) : régime légal (avec, sous les régimes concernés, la
  désignation des biens de la société d'acquêts — voir §2),
  récompenses/créances, participation aux acquêts, donation au dernier vivant, historique. L'onglet « Informations générales » regroupe en un seul bloc « Mariage & régime » : date et lieu, puis la question « Contrat de mariage » (bascule Avec / Sans contrat). Sans contrat, le régime légal déduit de la date de mariage est affiché en lecture seule ; tant qu'aucun régime n'a été enregistré (`regime_matrimonial` vide), le formulaire s'ouvre sur « Sans contrat » (le `false` par défaut de `pas_de_contrat_mariage` n'étant pas un choix de l'utilisateur), sinon il reprend le choix enregistré ; avec contrat seulement, le sélecteur du régime conventionnel (classé en deux groupes, régimes communautaires puis séparatistes, `CLASSES_REGIMES_MATRIMONIAUX` dans `lib/patrimoine/regimeLegal.ts`) et ses options de qualification apparaissent. La case « Séparation de corps » révèle la date du jugement (`marital_status.date_jugement_separation_corps`, vidée si la case est décochée) et la clause de renonciation aux droits successoraux ; à compter de cette date, les biens acquis sont qualifiés comme sous séparation de biens (art. 302, voir docs/patrimoine.md). Le
  catalogue de clauses du contrat (préciput, attribution intégrale, partage inégal, clauses
  personnalisées) a été retiré en V1, voir §2. Pour
  Divorcé(e)/Veuf-Veuve, un bloc lecture seule affiche le régime de l'union dissoute (régime
  matrimonial, date/lieu, donation au dernier vivant) directement depuis les colonnes conservées en
  base — aucune édition possible, cohérent avec la politique « Option A » de
  `relationInfoPayload.ts` (rien n'est écrit ni effacé pour ces deux statuts).
- **Membres** saisit les membres de la famille (`family_links`), qui est le socle de tout
  calcul successoral (dévolution légale, représentation, abattements DMTG) et alimente aussi les
  majorations retraite pour enfants. Un clic sur une carte de l'arbre ouvre le même
  `FamilyMemberFormDialog` en modification.

## 2. Architecture & décisions

- **Centralisation des points d'écriture concurrents.** L'audit initial avait trouvé plusieurs
  colonnes écrites indépendamment par 2-3 formulaires avec des copies locales désynchronisées
  (`statut_couple`, les 4 colonnes de donation au dernier vivant). Ces cas ont été résolus par des
  points d'écriture uniques plutôt que par une synchronisation entre copies :
  - `statut_couple` : `setStatutCouple()` / `buildStatutCoupleWrite()` dans
    [lib/family/maritalStatus.ts](../src/lib/family/maritalStatus.ts).
  - Donation au dernier vivant : les 4 colonnes sont écrites par le seul `RelationInfoForm.tsx`, dans
    le même upsert que le reste du régime (`buildRelationInfoPayload`).
  - Écriture conditionnelle au statut du couple : `buildRelationInfoPayload()` /
    [lib/family/relationInfoPayload.ts](../src/lib/family/relationInfoPayload.ts) — un couple
    Pacsé(e)/Concubinage n'écrase plus les colonnes du régime matrimonial avec les valeurs par
    défaut du schéma zod.
  - Convention : ce découpage en `lib/family/` fait suite à un pattern déjà établi
    (`lib/ifi/`, `lib/fiscal/`) — la logique métier Famille est externalisée hors des composants
    de formulaire.

- **Vocabulaire de liaison famille → moteur de succession.** `useFamilyLinkLogic.ts` produit des
  valeurs `'user'` / `'spouse'` / `'both'` pour désigner qui est concerné (renonciation, filiation).
  `resolveRenoncantDe()` ([utils/transmissionHelpers.ts:447](../src/utils/transmissionHelpers.ts:447))
  traduit ces valeurs vers l'id réel du défunt (`familyProfile.id` ou `` `conjoint-${id}` ``) attendu
  par [successionLegale.ts](../src/lib/transmission/successionLegale.ts). Point pivot à connaître :
  toute nouvelle valeur de statut de renonciation doit être ajoutée des deux côtés (émission dans
  `useFamilyLinkLogic.ts`, traduction dans `resolveRenoncantDe`), sinon le silence est total (voir
  l'historique de F19 en §3).

- **Construction de l'arbre familial.** [buildFamilyGraph.ts](../src/lib/family/buildFamilyGraph.ts)
  construit les arêtes de l'arbre affiché (`FamilyTreeCards.tsx`) à partir du lien réellement saisi
  (`enfant_de`) plutôt que du premier membre trouvé du même type — correction nécessaire pour les
  familles recomposées ou à plusieurs branches (commit `b6827c2`).

- **Saisie de dates.** `SmartDateInput` ([components/family/SmartDateInput.tsx](../src/components/family/SmartDateInput.tsx))
  centralise désormais la saisie JJ/MM/AAAA pour tous les champs date du module (naissance, décès,
  mariage, PACS, donations, mandat). Avant son introduction, chaque formulaire faisait son propre
  `toISOString().split('T')[0]`, ce qui produisait un décalage d'un jour en fuseau français.
  Les dates futures sont refusées au clavier comme au calendrier (voir §3). Une date passée à un
  calcul se transmet en `yyyy-MM-dd` (`format` de date-fns), jamais via `toISOString()` : c'est
  notamment le cas du régime légal déduit de la date de mariage (`determinerRegimeLegal`), où un
  mariage du 01/02/1966 tombait sinon le 31/01 et sous l'ancien régime légal.
  Une date vidée s'enregistre en `null`, jamais en `undefined` (clé absente de la requête, que
  l'upsert ignorerait en gardant l'ancienne valeur) : dates de mariage, PACS, donation au
  dernier vivant, jugement de séparation de corps (`relationInfoPayload.ts`), naissance du
  conjoint et mandat de protection future (fiches client et conjoint). Une date de donation au
  dernier vivant ou de mandat est aussi effacée quand sa case est décochée.
  Le calendrier est le panneau commun de l'app ([date-picker-panel.tsx](../src/components/ui/date-picker-panel.tsx), voir design-system.md) à trois vues : jours (semaine du lundi, libellés français), mois (grille 3×4) et années (pages de 20 ans) ; un clic sur le mois ou l'année de l'en-tête y saute directement, puis on redescend année → mois → jour. Bornes ici : 1900 à aujourd'hui. Le panneau se ferme dès qu'un jour est choisi.

- **Rattachement des enfants et branche familiale obligatoires.** Le schéma zod de
  `FamilyMemberFormDialog.tsx` exige « Enfant de » pour un Enfant (présélectionné quand une seule
  option existe, ex. client sans partenaire → lui-même) et la branche familiale pour les liens de
  `LINKS_WITH_BRANCHE` ([lib/family/familyLinkRules.ts](../src/lib/family/familyLinkRules.ts)).
  « Branche paternelle » est écrite dans le formulaire au choix du lien (auparavant seulement
  affichée, jamais enregistrée) ; un membre existant sans branche est signalé en erreur dès
  l'ouverture en modification. `buildFamilyGraph.ts` relie un enfant sans rattachement au seul
  client, aligné sur le moteur (seul `both_parents` fait un enfant commun).
  « Enfant de » est aussi obligatoire pour les liens rattachés à un autre membre
  (`LINKS_RATTACHES_A_UN_MEMBRE` : Petit-enfant, Arrière petit-enfant, Grand-parent, Arrière
  grand-parent, Neveu/Nièce, Petit neveu/nièce, Cousin/Cousine), signalé dès l'ouverture d'un membre
  existant. Sans rattachement (saisie ancienne, ou membre de rattachement supprimé), l'arbre ne le
  relie à personne, comme le moteur de succession, et sa carte porte la mention « À rattacher » :
  plus de repli sur le premier membre du type attendu.
  Le client et le conjoint ne sont proposés en rattachement que pour les liens directs (Enfant,
  Parent, Frère/Sœur, Oncle/Tante) : Grand-parent, Arrière grand-parent, Petit-enfant, Arrière
  petit-enfant, Neveu/Nièce, Petit neveu/nièce et Cousin/Cousine ne se rattachent qu'à un autre
  membre (`useFamilyLinkLogic.ts::getParentOptions`). Un neveu rattaché au client serait sinon
  détaché de sa souche par le moteur de succession, un grand-parent rattaché au client en ferait
  un parent.

- **Cohérence de l'ascendance (R1-R5).** `verifierCoherenceAscendance()` et
  `rattachementsComplets()` ([lib/family/familyLinkRules.ts](../src/lib/family/familyLinkRules.ts))
  bloquent l'enregistrement dans `FamilyMemberFormDialog.tsx` : au plus deux Parents par
  rattachement (`enfant_de` = `user` ou `spouse`), deux Grands-parents par Parent, deux Arrière
  grands-parents par Grand-parent (le membre modifié n'est pas compté) ; un ascendant naît
  strictement avant la personne à laquelle il est rattaché, un Enfant / Petit-enfant / Arrière
  petit-enfant strictement après (y compris en sens inverse lors d'une modification). Contrôle sur
  les dates renseignées uniquement. Les rattachements déjà pleins sont grisés dans « Enfant de ».
  Pas de contrainte en base : les données saisies avant ces règles ne sont pas corrigées.

- **`parent_de` vs `enfant_de`.** `parent_de` n'est renseigné que pour un Enfant (miroir de
  `enfant_de`, lu par le moteur pour la filiation) et vaut `NULL` pour tout autre lien, y compris les
  lignes anciennes (reprise `20261018160000_famille_reprise_donnees.sql`).

- **Profession en texte libre.** `FicheClientForm.tsx` et `PartnerForm.tsx` saisissaient la
  profession via un `<Select>` à catégories CSP fermées (+ option « Autre » ouvrant un champ
  texte). Remplacé par un unique champ texte libre (`profession` / `profession_conjoint`), les
  catégories prédéfinies n'étant lues par aucun moteur. Compat. ascendante : les anciennes valeurs
  de catégorie CSP restent affichées telles quelles au chargement. Côté conjoint, la colonne
  `profession_csp_conjoint` n'est plus écrite (toutes les lignes à `NULL` depuis la reprise
  `20261018160000_famille_reprise_donnees.sql`) au profit de `profession_conjoint`.

- **Double nationalité.** `nationalite` (`family_profiles`, `family_links`) et
  `nationalite_conjoint` (`marital_status`) sont désormais complétés d'une colonne sœur
  `nationalite_2` / `nationalite_2_conjoint`, révélée par une case « Double nationalité » sur les
  3 formulaires (fiche client, conjoint, membre de la famille via `DynamicFamilyForm.tsx`) — même
  pattern que le mandat de protection future (case à cocher → champ conditionnel). Le champ
  Nationalité n'existait auparavant sur aucun formulaire membre de la famille alors que la colonne
  `family_links.nationalite` existait déjà en base (jamais câblée à l'UI) ; il est maintenant
  saisissable comme sur les fiches client/conjoint. Migrations
  `20260903082905_add_double_nationalite_family.sql` et
  `20260903083526_add_nationalite_2_family_links.sql`. Aucun moteur ne consomme ces colonnes à ce
  jour (voir « Cases dormantes » en §3).

- **Cascade de suppression atomique.** `deleteLinkWithCascade()`
  ([hooks/useFamilyData.ts](../src/hooks/useFamilyData.ts)) appelle la fonction Postgres
  `delete_family_link_cascade(p_id)` (migration `20260924083058_delete_family_link_cascade.sql`,
  `SECURITY INVOKER` donc soumise à la RLS) qui ré-initialise `enfant_de`/`parent_de` des membres
  dépendants puis supprime le membre dans une seule transaction. Confirmation utilisateur
  (`AlertDialog`) listant les dépendants avant suppression.
  Un membre encore utilisé hors de la famille ne peut pas être supprimé : libéralité (bénéficiaire
  ou génération intermédiaire), indivision, démembrement, clause bénéficiaire d'assurance-vie
  (`familyLinkId` dans `clause_beneficiaire_structuree`, sans FK). La fonction
  `family_link_usages(p_id)` (`SECURITY INVOKER`, migration
  `20261018120000_family_link_usages.sql`) liste ces usages ; la confirmation les affiche à la place
  du bouton « Supprimer », en rappelant de cocher « Décédé » plutôt que de supprimer une personne
  décédée, et `delete_family_link_cascade` refuse la suppression (`MEMBRE_UTILISE`) même si
  l'interface est contournée. Sans ce garde-fou, les FK `ON DELETE SET NULL` vidaient la référence
  sans prévenir (donation sans bénéficiaire, quote-part sans titulaire).

- **Changement de lien d'un membre ayant des rattachés.** Modifier le lien d'un membre auquel
  d'autres sont rattachés (`enfant_de` = son id : petits-enfants d'un Enfant, grands-parents d'un
  Parent, neveux d'un Frère/Sœur…) passe par une confirmation qui les liste
  (`FamilyMemberFormDialog.tsx`). Une fois confirmé, leur rattachement est réinitialisé
  (`familyService.resetRattachements`) avant la modification du membre, via
  `updateLink(id, data, reinitialiser)`. Les deux écritures ne sont pas transactionnelles : en cas
  d'échec de la seconde, les rattachés restent réinitialisés et le cache est relu en base.

- **Cache partagé des données Famille (React Query).** `useFamilyProfile`, `useMaritalStatus` et
  `useFamilyLinks` lisent un cache React Query commun (clés `['family', 'profile'|'marital'|'links',
  userId]`, `staleTime` 30 s, pas de rechargement au retour sur l'onglet pour ne pas réinitialiser
  un formulaire en cours). Chaque écriture passant par ces hooks met à jour le cache pour tous les
  composants abonnés (~20, Famille, Transmission, Patrimoine, Budget…). Une écriture de membre ne
  touche plus `marital_status` : la resynchronisation de `nombre_enfants_charges` (colonne lue par
  aucun moteur) a été retirée, comme l'écriture de `parent_isole: false` au passage à Célibataire
  (la fiscalité lit `foyer_fiscal.parent_isole`).
  Limite connue : `Optimisation.tsx` (Transmission) écrit directement dans `marital_status`
  (`option_conjoint`, `partage_envisage`, `duh_opte`) sans passer par le hook — le cache peut rester
  périmé jusqu'à 30 s sur ces trois colonnes.

- **Notifications d'enregistrement.** Les hooks de `useFamilyData.ts` sont la seule source des
  notifications de succès et d'erreur d'écriture ; les formulaires n'en émettent plus (évite les
  doubles toasts) et restent ouverts en cas d'échec. `FicheClientForm.tsx` enregistre directement
  via `useFamilyProfile().saveData` (plus de `useSecureForm`, qui ajoutait une seconde notification
  au message technique brut, ni d'encodage HTML des textes) et ne ferme la fiche qu'en cas de
  succès. Toute écriture déclenchée depuis l'écran (statut du couple, ajout / suppression d'une
  récompense, créance ou ligne de patrimoine originaire / final) intercepte l'échec après la
  notification du hook : pas d'erreur non interceptée en console.

- **Types.** `FamilyProfile`, `MaritalStatus` et `FamilyLink` ([familyService.ts](../src/services/familyService.ts))
  sont dérivés des types générés (`Partial<Row<…>>`, `lien_familial` et `nom` requis pour un membre) :
  plus de copie manuelle des colonnes, qui gardait des champs supprimés et des commentaires
  obsolètes. Régénérer `integrations/supabase/types.ts` après toute migration Famille.

- **Valeurs fermées garanties en base** (migration `20261018150000_famille_checks_valeurs.sql`) :
  CHECK sur `family_links.lien_familial`, `branche_familiale`, `enfant_renoncant_de`, `enfant_de` et
  `parent_de` (`user` / `spouse` / `both_parents` ou uuid d'un membre), et sur
  `marital_status.statut_couple`, `regime_matrimonial`, `convention_pacs`. Vide = `NULL`, jamais `''`
  (`FamilyMemberFormDialog.tsx` convertit les champs vides) ; les 3 lignes à `''` ont été normalisées.
  Ajouter une valeur (nouveau lien, nouveau régime) impose de modifier la contrainte.

- **Âge.** [lib/family/age.ts](../src/lib/family/age.ts) (`ageEnAnnees`, `formatAgeCourt`) est le
  seul calcul d'âge du module (différence calendaire).

- **Affichage de l'arbre et du formulaire membre.** [FamilyTreeCards.tsx](../src/components/famille/FamilyTreeCards.tsx)
  dispose l'arbre en deux branches centrées sur le couple : famille du client à gauche, famille du
  conjoint à droite, descendance (enfants, petits-enfants…) centrée dessous. Le côté se déduit du
  lien (`Parent` selon `enfant_de`, les
  autres héritent du nœud auquel ils sont reliés) ; dans chaque branche, les liens directs sont
  au plus près de l'axe. Traits généalogiques : parents reliés entre eux, un trait descend de leur
  milieu vers une barre d'où partent les enfants ; un enfant rattaché à un seul parent rejoint la
  fratrie de ce parent. Cartes : couple en encre, autres en taupe, défunts détourés ; pastille
  braise pour « À charge » ou « Handicap ». Sur téléphone, le défilement s'ouvre centré sur le
  couple. Purement visuel : `buildFamilyGraph` et les liens lus par la succession ne changent pas.
  Générations (`GENERATION_BY_RELATION`) : neveux et nièces sur la ligne des enfants,
  petits-neveux sur celle des petits-enfants. Les liens d'alliance (beaux-parents,
  beaux-frères/belles-sœurs) n'existent pas : ils n'étaient pas saisissables et ont été retirés
  de l'arbre et des groupes de membres.
  Chaque ligne de l'arbre est libellée d'après
  les liens qu'elle contient (ex. « Parents / Oncles et tantes », « Vous / Frères et sœurs »). Le
  tableau affiche le nom complet en une colonne. Le formulaire membre est découpé en blocs
  Rattachement / Identité / Situation / Succession. La page régime est titrée selon le statut
  (Régime matrimonial, PACS, Concubinage, Mariage dissous, Mariage (veuvage)).

- **Exonération des frères et sœurs (art. 796-0 ter CGI).** Trois conditions cumulatives saisies
  séparément sur un Frère/Sœur : seul (célibataire, veuf, divorcé ou séparé de corps —
  `exo_frere_soeur_seul`), plus de 50 ans (calculé depuis `date_naissance`, 50 ans révolus à la
  date du jour prise comme date de décès simulée) ou infirmité l'empêchant de subvenir à ses besoins
  (`exo_frere_soeur_infirmite`, case dédiée distincte du handicap), domicile commun continu depuis
  5 ans (`exo_frere_soeur_cohabitation_5_ans`). `evaluerExonerationFrereSoeur()`
  ([familyLinkRules.ts](../src/lib/family/familyLinkRules.ts)) en dérive `exoneration_succession`
  à l'enregistrement — colonne toujours lue telle quelle par le moteur DMTG (`tax.ts`,
  `assurance-vie.ts`) ; le formulaire affiche le résultat et les conditions manquantes. Limite : la
  condition d'âge est figée à la date d'enregistrement (un frère qui passe 50 ans n'est exonéré
  qu'au prochain enregistrement de sa fiche). Migration
  `20260924084418_add_conditions_exoneration_frere_soeur.sql`.

- **Champs d'un membre selon le lien.** [lib/family/familyLinkRules.ts](../src/lib/family/familyLinkRules.ts)
  centralise quels champs s'appliquent à quel lien (rattachement, branche, adoption, champs enfant,
  exonération) ; `DynamicFamilyForm.tsx` s'en sert pour l'affichage et
  `sanitizeMemberForLink()` remet à zéro, à l'enregistrement, les champs sans objet (lien changé en
  cours de saisie, case décochée). Contrôles de saisie du schéma : date de décès obligatoire et
  postérieure à la naissance si « Décédé », « Renonce à la succession de » obligatoire si
  renonçant.

- **« A un conjoint » : deux règles distinctes, selon la question posée.**
  - Répartition par personne (détenteur/débiteur dans Patrimoine, Sociétés, Emprunts, Budget) :
    `hasConjoint()` ([lib/family/maritalStatus.ts](../src/lib/family/maritalStatus.ts)) — statut en couple
    (marié, pacsé, concubinage) **et** prénom du conjoint renseigné, pour ne jamais proposer une personne
    sans nom.
  - Statut seul, volontairement : Famille (`FamilleSection`, `useFamilyLinkLogic`, `buildFamilyGraph` —
    c'est ce statut qui ouvre la saisie du conjoint) et Retraite (`checkIsInCouple`).
  - Liste unique des statuts en couple : `COUPLE_STATUSES` / `isCoupleStatus()` dans
    `lib/family/maritalStatus.ts`, importée par `hasConjoint`, `statutTransition`, `FamilleSection`,
    `PartnerForm`, `useFamilyLinkLogic`, `buildFamilyGraph` et `AVContractDetail` (seuls libellés
    `Marié(e)`, `Pacsé(e)`, `Concubinage` ; les anciens `MARIE` / `PACS`… absents de la base ont été retirés). Transmission ne
    retient que marié/pacsé : règle successorale, le concubin n'étant pas héritier.

- **RGPD.** Tous les `console.error` du périmètre Famille sont encadrés par
  `import.meta.env.DEV` (commits `57adc88`, `cb79f15`, `34eb276`), conformément à la règle
  permanente du projet.

- **Contrôle croisé « Mariage : Principes généraux » (2026-09-17).** Comparaison du référentiel
  juridique du régime primaire (Fidroit) au code existant : la qualification propre/commun
  (`lib/patrimoine/qualification.ts`) couvre déjà les règles citées (biens propres par nature
  art. 1404, remploi et financement mixte art. 1435-1436, communauté de meubles et acquêts
  art. 1498, communauté universelle art. 1526, PACS art. 515-5/515-5-2), et la contribution aux
  charges du mariage (art. 214) est déjà couverte pour le cas du remboursement unilatéral d'un
  emprunt sur bien indivis (alerte de conseil `#6`, voir
  [docs/alertes-conseil-referentiel.md](alertes-conseil-referentiel.md)). Aucun écart trouvé.
  Le reste du document (formalités du mariage, nullité, protection du logement familial art. 215,
  autonomie bancaire art. 221, indépendance professionnelle art. 223) relève du fonctionnement du
  couple pendant le mariage, sans impact sur une valorisation ou une dévolution patrimoniale :
  non modélisé, à raison.

- **Contrôle croisé « PACS » et « Concubinage » (2026-09-17), créances entre partenaires de PACS
  ajoutées.** Comparaison aux référentiels Fidroit PACS et Concubinage : régime par défaut (séparation
  depuis 2007, indivision avant), exclusions art. 515-5-2, fiscalité des donations/successions
  (abattement 80 724 €, exonération succession, case 9GL de l'IFI) déjà couverts sans écart. Écart
  trouvé et comblé : l'art. 515-7 dernier alinéa renvoie les créances entre partenaires de PACS
  (financement inégal d'un bien, quelle que soit la convention — séparation ou indivision) aux mêmes
  règles de valorisation que les créances entre époux (art. 1469 sur renvoi, nominal ou profit
  subsistant). [`CreancesEntreEpouxSection.tsx`](../src/components/famille/matrimonial/CreancesEntreEpouxSection.tsx)
  était déjà générique côté données (table `creances_entre_epoux`, colonnes `epoux_creancier`/
  `epoux_debiteur` sans lien au statut du couple, moteur de calcul aval — `ProcessusCalcul.tsx`,
  `Synthese.tsx`, `Succession2ndDeces.tsx`, `AssuranceVie.tsx` — déjà branché sans filtrage par
  régime) : seul l'habillage (titre, libellés, base légale citée) dépendait du mariage. Une prop
  `contexte` (`'mariage' | 'pacs'`) adapte désormais ces libellés, et le composant est affiché dans
  le bloc PACS de `RelationInfoForm.tsx` sans condition sur la convention choisie (comme pour le
  mariage, où les créances s'appliquent quel que soit le régime). Concubinage : aucun écart, le
  remboursement au nominal sans mécanisme de créance (art. 1469 non applicable, confirmé par le
  document) reste hors périmètre — cohérent, aucune fonctionnalité de créance n'existe pour ce statut.

- **Retrait complet du catalogue de clauses du contrat de mariage (2026-09-22).** Après le retrait
  des 13 clauses purement déclaratives le 2026-09-17, le reste du catalogue (préciput, attribution
  intégrale, partage inégal, partage inégal des acquêts, extension de la qualification d'acquêts,
  exclusion des biens professionnels du calcul de la créance de participation, clauses
  personnalisées) a été retiré à son tour pour la V1 : UI de saisie (`MatrimonialRegimeOptions.tsx`,
  `ClauseItem.tsx`, `ClausesPersonnaliseesSection.tsx`), hooks (`useMatrimonialClauses.ts`,
  `useCustomMatrimonialClauses.ts`), constantes (`matrimonialClauses.ts`, `customClause.ts`) et
  moteur de calcul dédié (`avantagesMatrimoniaux.ts`, `analyseClausesTransmission.ts`,
  `regimeChangeClauses.ts`, `TransmissionContext.clausesData`) supprimés.
  `computeParticipationAcquets` retombe donc systématiquement sur son comportement par défaut
  (partage par moitié de la créance, sans exclusion des biens professionnels ni extension de la
  qualification d'acquêts) — voir [docs/transmission.md](transmission.md) §4. Détail complet du
  catalogue retiré et marche à suivre pour une reconstruction :
  [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md). Les clés
  de l'ancien catalogue encore présentes dans `clauses_contrat` ont été purgées (reprise
  `20261018160000_famille_reprise_donnees.sql`, seule `societe_acquets` conservée). La
  colonne `marital_status.clauses_personnalisees` a été supprimée (aucune ligne active en base au
  moment du retrait) ; `marital_status.clauses_contrat` est conservée, réservée aux deux clés
  ci-dessous.

- **Biens acquis à deux sous régime séparatiste (art. 1538).** Sous séparation de biens et
  participation aux acquêts, un bien détenu par « Le couple » est qualifié en indivision (quote-part
  saisie sur l'actif, 50/50 par défaut) et non plus forcé en bien propre ; le moteur de succession
  le prend en compte via la quote-part (`getPartSuccessorale`). Aucun dossier concerné en base au
  2026-10-16 (seuls deux foyers, en communauté réduite aux acquêts). Migration
  `20261016090000_marital_status_date_jugement_separation_corps.sql` pour la date du jugement de
  séparation de corps.

- **Société d'acquêts : gardée comme mécanisme de qualification, pas comme clause.** Cette entrée
  de l'ancien catalogue n'est pas un simple avantage matrimonial optionnel :
  `qualification.ts::qualifierBien` en a structurellement besoin, c'est le seul mécanisme désignant
  les biens de la société d'acquêts sous `separation_societe_acquets`. Elle reste donc éditable, dans le nouveau composant minimal
  [SocieteAcquetsSection.tsx](../src/components/famille/matrimonial/SocieteAcquetsSection.tsx)
  (monté dans la section « Régime matrimonial » de `RelationInfoForm.tsx`, réutilise
  `AssetSelectionModal.tsx`), et stockées avec le même format qu'avant dans
  `marital_status.clauses_contrat.societe_acquets`. La colonne est typée comme en base (`Json`) ;
  on la lit et l'écrit uniquement via `lirePerimetreDesClauses()` / `clausesAvecPerimetre()`
  ([lib/patrimoine/societeAcquets.ts](../src/lib/patrimoine/societeAcquets.ts)), qui conservent les
  autres clés éventuelles. L'ancienne option « extension de la communauté
  aux biens propres par nature » a été supprimée (UI et moteur) : la stipulation contraire de
  l'art. 1526 ne concerne que la communauté universelle et n'est pas utilisée en pratique ; un bien
  propre par nature (art. 1404) reste toujours propre en régime communautaire. La clé
  `clauses_contrat.extension_propres_par_nature` éventuellement présente en base est ignorée.

- **Onglet « Société d'acquêts ».** Affiché seulement sous ce régime avec contrat (même principe que
  l'onglet Participation aux acquêts) : section Périmètre et section Composition (biens communs
  qui en résultent, motif et valeur, total — `compositionSocieteAcquets()` dans
  `lib/patrimoine/requalification.ts`, qualification recalculée, ou manuelle si l'actif est en mode
  manuel). L'onglet Général n'en garde qu'une ligne de résumé (périmètre · nombre de biens · valeur)
  avec un lien vers l'onglet. Composant :
  [SocieteAcquetsSection.tsx](../src/components/famille/matrimonial/SocieteAcquetsSection.tsx)
  (ex-`QualificationRegimeOptions.tsx`).
  Tant que le régime, le contrat ou la date de mariage sont modifiés sans être enregistrés, le
  périmètre se règle en brouillon (aucune écriture ni requalification, composition calculée sur les
  valeurs du formulaire) ; « Enregistrer » écrit régime et périmètre ensemble
  (`clauses_contrat.societe_acquets` dans le même upsert) et propose une seule confirmation de
  requalification. Hors brouillon, chaque changement du périmètre est enregistré aussitôt.
- **Périmètre de la société d'acquêts.** Le contrat fixe librement le contenu de la société
  (art. 1387, 1497) : on le décrit par règles plutôt que bien par bien
  ([lib/patrimoine/societeAcquets.ts](../src/lib/patrimoine/societeAcquets.ts)) — « Tous les acquêts »
  ou des catégories (logement de la famille, résidences secondaires, tous les immeubles, tous les
  meubles, valeurs mobilières), complétées de biens ajoutés ou exclus nommément. Stockage dans
  `clauses_contrat.societe_acquets` (`selectedAssets` = ajoutés, `excludedAssets` = exclus,
  `options.tousAcquets` / `options.categories` ; l'ancienne case `options.residencePrincipale` vaut la
  catégorie « logement de la famille » et reste écrite). Ordre de qualification dans `qualifierBien` :
  propre par nature / remploi → bien reçu à titre gratuit (hors société) → exclu nommément → ajouté
  nommément (commun, vaut apport d'un bien antérieur) → acquis avant le mariage (hors société) →
  acquêt couvert par le périmètre (commun) → sinon indivision si détenu par les deux, propre sinon.
  Chaque changement du périmètre est enregistré aussitôt ; s'il modifie la qualification de biens
  existants en qualification automatique, une confirmation les liste puis les requalifie en lot
  ([lib/patrimoine/requalification.ts](../src/lib/patrimoine/requalification.ts) ; un bien devenu
  commun passe au détenteur « Le couple » 50/50, comme dans le formulaire). La requalification
  corrige aussi au passage les qualifications périmées (ex. biens restés « Bien commun » d'un ancien
  régime). Le bouton « Enregistrer » du régime matrimonial fait la même vérification après écriture (régime, dates de mariage / PACS / jugement de séparation de corps) et propose la même confirmation (`RequalificationDialog.tsx`, écriture par `services/requalificationService.ts`) ; refuser garde le régime enregistré et les biens tels quels. Un bien détenu par « Le couple » qui deviendrait propre n'est jamais requalifié automatiquement (l'époux propriétaire n'est pas déductible) : il reste à reprendre sur sa fiche.

- **Habillage : design system du simulateur** ([design-system.md](design-system.md)). Plus de
  scope `.famille-form` : les pages suivent le gabarit « panneau de travail » (voir design-system.md
  §6). [SectionHeader.tsx](../src/components/family/SectionHeader.tsx) (titre 14,5 px à repère
  coloré) est repris dans `FicheClientForm.tsx`, `PartnerForm.tsx`, `RelationInfoForm.tsx`, la
  liste des membres et le module Patrimoine. Le bouton « Ajouter un membre » est une pilule encre, comme le reste de l'app.
  Aucun champ, schéma de validation ni
  logique métier n'est modifié par cet habillage.

- **Lit des frères et sœurs (`family_links.lien_fratrie`, 2026-09-29).** Pour un lien
  `Frère/Sœur` uniquement : `germain` (mêmes père et mère, défaut), `consanguin` (même père) ou
  `uterin` (même mère), contrainte CHECK, `NULL` = germain (les liens antérieurs gardent ainsi le
  partage à parts égales). Saisi dans `DynamicFamilyForm.tsx` (« Lien de fratrie »), écrit par
  `FamilyMemberFormDialog.tsx` (remis à `NULL` pour tout autre lien), lu par `buildFamilyGraph`
  (`Person.lienFratrie`) pour le partage par lignes de l'art. 752 C. civ. (cf.
  `docs/transmission.md` §2). Migration `20260929120000_family_links_lien_fratrie.sql`.

## 3. Dette identifiée

Classement par risque. Chaque ligne indique si l'item est toujours ouvert (vérifié dans le code au
2026-08-27) ou a été corrigé depuis l'audit initial (mention `[soldé]`, gardée pour traçabilité).

### 🔴 Bloquant (peut fausser un calcul montré au client)

Aucun constat bloquant ouvert à ce jour. Les trois constats bloquants de l'audit initial sont
soldés :
- *[soldé]* Renonciation à succession sans effet (`renoncantDe` comparé à un UUID) — résolu par
  `resolveRenoncantDe()`.
- *[soldé]* `est_dirigeant` / `residence_fiscale_etranger` du client jamais enregistrés — la case
  « Dirigeant d'entreprise » a été retirée de `FicheClientForm.tsx` avec ses 2 règles d'alerte
  associées (commit `37b37f5`) plutôt que réparée : à surveiller si la fonctionnalité est
  réintroduite un jour côté client.
- *[soldé]* `branche_familiale` : trois vocabulaires incompatibles UI/moteurs — le champ est
  maintenant saisissable pour les liens qui en ont besoin (`Grand-parent`, `Cousin/Cousine`,
  `Arrière grand-parent`, en plus de `Oncle/Tante`), aligné avec les valeurs lues par
  `transmissionHelpers.ts` et `Optimisation.tsx` (commit `de8a722`).
- *[soldé 2026-10-18]* Profit subsistant (art. 1469 al. 3) selon la nature de la dépense —
  `computeProfitSubsistant()` ([lib/patrimoine/recompensesCreances.ts](../src/lib/patrimoine/recompensesCreances.ts)) :
  acquisition et conservation au prorata (`valeurApres × dépense / valeurAvant`) ; amélioration =
  part financée de la plus-value procurée, `(valeur actuelle − valeur actuelle sans les travaux) ×
  dépense / coût total des travaux` (Cass. 1re civ., 22 févr. 2017, n° 16-12.951 ; 23 mai 2024,
  n° 22-18.911 : industrie personnelle exclue). Le coût total (main-d'œuvre comprise) vaut par défaut
  la dépense faite ; sans valeur « sans travaux », la valeur nominale s'applique. Exemple : travaux
  de 40 000 € sur un bien à 200 000 € valant 260 000 € (230 000 € sans les travaux) : 30 000 €. Le
  prorata appliqué à toutes les natures le 2026-09-17 donnait 52 000 € (hausse du marché imputée aux
  travaux), l'ancien delta 60 000 €. Même règle pour les créances entre époux / partenaires
  (`computeMontantCreance`). Colonnes `valeur_bien_sans_travaux` et `cout_total_travaux` sur
  `recompenses` et `creances_entre_epoux` (migration `20261018130000_recompenses_creances_amelioration.sql`),
  saisies dans les deux formulaires quand la nature est « Amélioration ».
- *[soldé 2026-10-18]* Montants négatifs acceptés pour les récompenses et créances entre époux :
  contrôle dans les deux formulaires (dépense > 0, valeurs ≥ 0) et contraintes CHECK
  `recompenses_montants_positifs` / `creances_entre_epoux_montants_positifs` (migration
  `20261018140000_recompenses_creances_montants_positifs.sql`). `patrimoine_originaire` /
  `patrimoine_final` restent sans contrainte : une valeur négative y est la seule façon de saisir une
  dette (pas de champ actif / passif), additionnée telle quelle par `participationAcquets.ts`.
- *[soldé 2026-10-18]* Dates du régime incohérentes — `verifierDatesRegime()`
  ([lib/family/datesRegime.ts](../src/lib/family/datesRegime.ts)) bloque l'enregistrement d'un mariage
  quand le jugement de séparation de corps n'est pas postérieur au mariage, ou quand une donation au
  dernier vivant précède le mariage alors qu'il n'y a pas de contrat (une donation antérieure n'est
  possible que par contrat de mariage, art. 1093 ; sinon art. 1096). Contrôle limité au statut
  Marié(e), pour qu'une colonne conservée d'un ancien statut ne bloque pas un PACS.
- *[soldé 2026-10-18]* « Renonce à la succession de » proposait le conjoint (ou les deux) pour un
  enfant du seul client — `renonciationsPossibles(enfant_de)` (`familyLinkRules.ts`) limite les choix
  au(x) parent(s) réel(s) : client seul → client, conjoint seul → conjoint, enfant commun → client,
  conjoint ou les deux. Une valeur incohérente déjà saisie est signalée à l'ouverture et bloque
  l'enregistrement. Aucun enfant renonçant en base au moment du correctif.
- *[soldé 2026-10-18]* Enfant sans `parent_de` compté dans les deux successions — au 2nd décès,
  `buildSpouseAsDecedentFamilyGraph` (`utils/transmissionHelpers.ts`) retenait tout enfant dont
  `parent_de !== 'user'`. Seuls `spouse` et `both_parents` en font désormais un enfant du conjoint :
  `parent_de` absent vaut enfant du seul client, comme au 1er décès et dans l'arbre. Cas latent
  (champ obligatoire, aucune ligne concernée en base).
- *[soldé 2026-10-18]* Case « dépense nécessaire » sans effet — `buildRecompensesCalcInput`
  (`utils/transmissionHelpers.ts`) ne transmettait pas `recompenses.depense_necessaire` : le plancher
  de l'art. 1469 al. 2 (récompense au moins égale à la dépense faite) ne jouait jamais dans la
  transmission. Champ désormais transmis ; aucune récompense en base au moment du correctif.

- *[soldé 2026-09-24]* Statut du couple non modifiable une fois en couple (menu masqué, aucun autre
  formulaire ne l'exposait) — voir §1.
- *[soldé 2026-09-24]* Enfant sans « Enfant de » dessiné comme enfant commun dans l'arbre mais
  traité comme enfant du seul client par le moteur — champ obligatoire, arbre aligné (§2).
- *[soldé 2026-09-24, donnée à reprendre]* Branche familiale affichée « paternelle » mais enregistrée
  vide : `successionLegale.ts` excluait le membre de la fente. Correctif de saisie en place ; 1
  Grand-parent sans branche restait en base au 2026-09-24, à corriger manuellement via l'écran
  (pas de reprise SQL, la branche réelle n'étant pas déductible).

### 🟠 À surveiller (cas limite, peu probable)

- *[caduc 2026-09-22]* Deux constats du 2026-09-17 sur le préciput (absence de contrôle de
  suffisance de l'actif net commun, art. 1519 C. civ.) et l'attribution intégrale/partage inégal
  (absence du droit de reprise des apports, art. 1525 al. 2 C. civ.) portaient sur `getFractionAjustee()`
  (`avantagesMatrimoniaux.ts`), supprimé avec tout le catalogue de clauses ce jour — voir §2 et
  [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md). Les
  deux points restent pertinents pour une reconstruction en V2 (le document d'extraction les
  reprend), mais n'ont plus d'objet dans le code actuel.
- *[soldé 2026-09-16]* Dates de décès/naissance futures acceptées au clavier — `SmartDateInput.tsx`
  valide désormais `date <= new Date()` (comparaison de date complète) au lieu de comparer
  seulement l'année, cohérent avec le sélecteur calendrier.
- **`imposition_distincte` (art. 6-4a CGI) retirée de l'écran, colonne conservée.** Suite à l'audit
  fonctionnel Famille, la case a été retirée de `RelationInfoForm.tsx` (régimes Marié comme PACS) :
  le champ n'était lu par aucun moteur fiscal (seulement écrit via `relationInfoPayload.ts`) et
  encombrait l'écran pour une donnée sans effet. La colonne `marital_status.imposition_distincte`
  et le champ dans le schéma zod du formulaire sont conservés — la valeur existante en base
  continue d'être chargée et réenregistrée telle quelle (upsert partiel) — en vue d'une
  réintroduction lors du développement du module Fiscalité.
- **`<Select defaultValue>` non contrôlés** restants dans `DynamicFamilyForm.tsx` (civilité, adoption,
  motif d'adoption) et `FamilyMemberFormDialog.tsx` (lien familial) — « Enfant de », branche
  familiale et « Renonce à la succession de » sont désormais contrôlés. Fonctionne parce que le
  `Dialog` démonte son contenu à la fermeture.
- *[soldé 2026-09-16]* `loi_applicable_regime` / `pays_premier_domicile_matrimonial` — l'alerte
  `extraneite_regime_matrimonial` qui les lisait encore a été retirée du moteur (elle ne pouvait
  plus se déclencher pour un nouveau dossier depuis le retrait des champs de saisie). Colonnes
  conservées en base, plus aucun code ne les lit — voir
  [docs/idees-de-cote.md](idees-de-cote.md).
- *[soldé 2026-09-16]* `scenarios_regime` : table orpheline côté écriture — la règle d'alerte de
  conseil n°16 (`changement_regime_proche_donation`) qui ne pouvait jamais se déclencher a été
  retirée du moteur plutôt que de construire l'écran de saisie manquant (hors périmètre V1). Table,
  service (`scenarioRegimeService.ts`) et hook (`useScenariosRegime.ts`) conservés tels quels,
  simplement débranchés — voir [docs/idees-de-cote.md](idees-de-cote.md).

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- *[caduc 2026-09-22]* Constat du 2026-09-17 sur la clause `mise_en_communaute`
  (risque de saisie erronée d'une récompense sur un bien apporté dès l'origine du contrat) : la
  clause a été retirée avec tout le catalogue — voir §2.
- *[soldé 2026-09-16]* Calcul d'âge divergent — `FamilleSection.tsx` calcule désormais l'âge par
  différence calendaire (même méthode que `DynamicFamilyForm.tsx`) au lieu d'une division
  approximative `/ 365.25`.
- *[soldé 2026-09-16]* `loading` bloqué en cas d'échec d'authentification — `useFamilyProfile` et
  `useFamilyLinks` (`hooks/useFamilyData.ts`) appellent désormais `setLoading(false)` avant de
  sortir quand `!isAuthenticated`, alignés sur `useMaritalStatus`.
- *[soldé 2026-09-16]* `FIELD_TO_SECTION` incomplet dans `RelationInfoForm.tsx` — `conventionPacs`
  et `datePacs` y figurent désormais (section `informations-generales`).
- *[soldé 2026-09-16]* Argument mort dans `calculateAge` (`LiensFamiliauxForm.tsx`) — le paramètre
  `date_deces`, jamais atteint (appel gardé par `member.est_decede ? '-' : …`), a été retiré de la
  signature.
- *[soldé 2026-09-16]* Code mort — `FamilyTreeTimeline.tsx`
  (161 lignes, plus aucun import) supprimé.

### Cases dormantes restantes

Champs saisissables dans l'interface et toujours sans lecteur métier au 2026-09-16 :
`family_profiles.nationalite` (+ `.nationalite_2` depuis le 2026-09-03), `.profession` (texte libre
depuis le 2026-09-03, catégorie CSP jamais lue), `.capacite_juridique`,
`.mandat_protection_future` (+ date) ; les colonnes homologues `_conjoint` sur
`marital_status` (`.profession_csp_conjoint` n'est plus écrite, voir §2) ; sur `family_links` :
`personne_a_charge`, `adoption_simple_motif`, `civilite` (seul lecteur potentiel était le
composant mort `FamilyTreeTimeline`, supprimé le 2026-09-16), `nationalite` (+ `.nationalite_2`
depuis le 2026-09-03 — saisissable via `DynamicFamilyForm.tsx` depuis cette date, mais toujours non
lue par un moteur).

*Retirés le 2026-09-16 (simplification V1, plutôt que documentés comme dormants) :*
`family_links.est_dirigeant` (jamais exposé dans un formulaire, colonne supprimée) et
`family_profiles.nom_jeune_fille` (champ de saisie fonctionnel mais sans lecteur, colonne
supprimée après vérification qu'aucune ligne en base n'était renseignée) — voir
[docs/idees-de-cote.md](idees-de-cote.md) pour la condition de réactivation. Ne pas confondre avec
`family_profiles.est_dirigeant` (déjà retiré de l'UI, colonne conservée, voir 🔴 ci-dessus) ni
`marital_status.nom_jeune_fille_conjoint` (encore saisissable via `PartnerForm.tsx`, hors périmètre
de ce retrait).

Champs déjà soldés depuis l'audit initial (retirés de l'UI ou branchés à un moteur) :
`ancien_combattant` (+ `_conjoint`, case retirée, commit `5122e87`), `exoneration_succession`
(branché au moteur DMTG, `lib/dmtg/recall.ts`).

Colonnes supprimées le 2026-10-18 (minimisation RGPD, migration
`20261018170000_famille_drop_colonnes_dormantes.sql`) après leur retrait de l'interface par l'audit
fonctionnel du 2026-09-01, et après vérification qu'aucun code, vue ni fonction ne les lisait — les
valeurs restantes (coordonnées d'un profil) sont définitivement effacées :
`family_profiles.commune_naissance`, `.pays_naissance`, `.telephone`, `.email`, `.adresse_postale`,
`.code_postal`, `.ville`, `.pays` ; sur `marital_status` : `lieu_naissance_conjoint`,
`pays_naissance_conjoint`, `telephone_conjoint`, `email_conjoint`, `adresse_conjoint`,
`code_postal_conjoint`, `ville_conjoint`, `pays_conjoint`, ainsi que `parent_isole` et
`nombre_enfants_charges` (lus par aucun moteur, la fiscalité lit `foyer_fiscal`) ; sur `family_links` :
`mesure_protection_juridique`, `mandat_protection_future` (+ date) — ces deux derniers restent
saisissables côté client / conjoint sur `family_profiles` / `marital_status`.
`marital_status.imposition_distincte` est conservée (retirée de `RelationInfoForm.tsx`, en attente du
moteur IR, voir 🟠 ci-dessus).

## 4. Périmètre V1 / différé

- **V1 — en place** : identité client/conjoint, statut du couple, régime matrimonial (onglets selon le régime,
  sans le catalogue de clauses du contrat retiré le 2026-09-22 — voir §2), désignation des biens de
  la société d'acquêts, récompenses/créances, participation aux
  acquêts, donation au dernier vivant, créances entre partenaires de PACS (art. 515-7 dernier al.,
  voir §2), arbre des liens familiaux avec cascade de suppression, branchement complet au moteur de
  succession légale (renonciation, représentation, branches familiales) et aux abattements DMTG
  (handicap, adoption, exonération frère/sœur).
- **Différé / non implémenté, sans date documentée** :
  - Catalogue de clauses du contrat de mariage (préciput, attribution intégrale, partage inégal,
    exclusion des biens professionnels, extension de la qualification d'acquêts, clauses
    personnalisées) : retiré le 2026-09-22 pour la V1, reconstruction documentée dans
    [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md).
  - Les champs restants listés en « cases dormantes » (§3) : nationalité, capacité juridique,
    mandat de protection future (client/conjoint uniquement, cf. retraits ci-dessus pour les autres
    membres). Ces champs sont dans le schéma et l'UI de saisie mais aucun moteur (fiscalité,
    transmission, alertes) n'a encore été câblé dessus — décision implicite de saisie anticipée sans
    consommation, pas un choix documenté de report.
  - Coordonnées (téléphone, email, adresse) et commune/pays de naissance : retirées de l'UI le
    2026-09-01 puis colonnes supprimées le 2026-10-18 (minimisation RGPD, voir §3) ; une
    réintroduction demanderait une nouvelle migration.
  - `imposition_distincte` (art. 6-4a CGI) : retirée de l'écran de saisie (voir §3), en attente
    d'être réintroduite avec le moteur IR lors du développement du module Fiscalité.
  - Volet navigation réelle en navigateur : rendu visuel vérifié en session authentifiée (Ma
    famille, Fiche personnelle, Conjoint, Régime matrimonial) ; remplissage de données de test et
    cohérence écran ↔ moteur toujours non réalisés.
