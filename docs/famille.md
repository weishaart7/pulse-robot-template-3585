# Module Famille

> Document consolidé le 2026-08-27, fusion et mise à jour de `docs/audit/audit-famille.md`
> (audit statique du 2026-07-29). L'audit d'origine listait 26 constats (F1-F26) sur la branche
> `main` au commit `2835f30` ; la quasi-totalité a été corrigée depuis (voir commits
> `0c34614`…`b6827c2`). Ce document reflète l'état du code au 2026-08-27, pas l'état de juillet.
> Volet navigation réelle en navigateur toujours non réalisé (authentification requise).

## 1. Vue d'ensemble

Le module Famille est le point d'entrée du foyer : identité du client, identité du partenaire,
régime matrimonial et arbre familial. Il alimente directement les moteurs de retraite,
fiscalité (IFI, IR) et transmission (DMTG, succession légale) : c'est le socle de donnée sur
lequel reposent tous les calculs montrés au client.

**Écrans principaux** (route → composant) :

| Sous-section | Route | Composant |
|---|---|---|
| Ma famille (onglet par défaut) | `/dashboard/famille` | [FamilleSection.tsx](src/pages/famille/FamilleSection.tsx) |
| Fiche client | vue plein écran locale (pas de route) | [FicheClientForm.tsx](src/pages/famille/components/FicheClientForm.tsx) |
| Conjoint | `/dashboard/famille/conjoint` | [ConjointPage.tsx](src/pages/famille/ConjointPage.tsx) → [PartnerForm.tsx](src/components/famille/PartnerForm.tsx) |
| Régime matrimonial (6 onglets) | `/dashboard/famille/situation-matrimoniale` | [SituationMatrimonialePage.tsx](src/pages/famille/SituationMatrimonialePage.tsx) → [RelationInfoForm.tsx](src/components/famille/RelationInfoForm.tsx) |
| Liens familiaux (onglet) | `/dashboard/famille` | [LiensFamiliauxForm.tsx](src/pages/famille/components/LiensFamiliauxForm.tsx) + [FamilyMemberFormDialog.tsx](src/components/family/FamilyMemberFormDialog.tsx) + [DynamicFamilyForm.tsx](src/components/family/DynamicFamilyForm.tsx) |

**Tables Supabase** : `family_profiles`, `marital_status`, `family_links` (+ `recompenses`,
`creances_entre_epoux`, `patrimoine_originaire`, `patrimoine_final` saisies depuis l'onglet Régime
matrimonial mais consommées par Transmission). La table `scenarios_regime` a été retirée (voir §3).

**Flux clés** :
- **Ma famille** est un tableau de bord en lecture seule (dérivé de `family_profiles` /
  `marital_status` / `family_links`) avec une seule case active (« Célibataire ») ; il route vers
  les 3 autres écrans.
- **Fiche client** et **Conjoint** saisissent l'identité civile de chaque membre du couple, dont
  une bonne partie de champs déclaratifs (adresse, nationalité…) qui restent aujourd'hui dormants
  (§3).
- **Régime matrimonial** structure 6 onglets visibles seulement si `statut_couple === 'Marié(e)'`
  (vues distinctes pour Pacsé(e)/Concubinage) : régime légal, clauses du contrat,
  récompenses/créances, participation aux acquêts, donation au dernier vivant, historique.
- **Liens familiaux** saisit les membres de la famille (`family_links`), qui est le socle de tout
  calcul successoral (dévolution légale, représentation, abattements DMTG) et alimente aussi les
  majorations retraite pour enfants.

## 2. Architecture & décisions

- **Centralisation des points d'écriture concurrents.** L'audit initial avait trouvé plusieurs
  colonnes écrites indépendamment par 2-3 formulaires avec des copies locales désynchronisées
  (`statut_couple`, les 4 colonnes de donation au dernier vivant). Ces cas ont été résolus par des
  points d'écriture uniques plutôt que par une synchronisation entre copies :
  - `statut_couple` : `setStatutCouple()` / `buildStatutCoupleWrite()` dans
    [lib/family/maritalStatus.ts](src/lib/family/maritalStatus.ts).
  - Donation au dernier vivant : `setDonationDernierVivant()` dans
    [lib/family/donationDernierVivant.ts](src/lib/family/donationDernierVivant.ts), qui relit
    l'état frais en base avant d'écrire plutôt que de réembarquer une copie locale périmée.
  - Écriture conditionnelle au statut du couple : `buildRelationInfoPayload()` /
    [lib/family/relationInfoPayload.ts](src/lib/family/relationInfoPayload.ts) — un couple
    Pacsé(e)/Concubinage n'écrase plus les colonnes du régime matrimonial avec les valeurs par
    défaut du schéma zod.
  - Convention : ce découpage en `lib/family/` fait suite à un pattern déjà établi
    (`lib/ifi/`, `lib/fiscal/`) — la logique métier Famille est externalisée hors des composants
    de formulaire.

- **Vocabulaire de liaison famille → moteur de succession.** `useFamilyLinkLogic.ts` produit des
  valeurs `'user'` / `'spouse'` / `'both'` pour désigner qui est concerné (renonciation, filiation).
  `resolveRenoncantDe()` ([utils/transmissionHelpers.ts:447](src/utils/transmissionHelpers.ts:447))
  traduit ces valeurs vers l'id réel du défunt (`familyProfile.id` ou `` `conjoint-${id}` ``) attendu
  par [successionLegale.ts](src/lib/transmission/successionLegale.ts). Point pivot à connaître :
  toute nouvelle valeur de statut de renonciation doit être ajoutée des deux côtés (émission dans
  `useFamilyLinkLogic.ts`, traduction dans `resolveRenoncantDe`), sinon le silence est total (voir
  l'historique de F19 en §3).

- **Construction de l'arbre familial.** [buildFamilyGraph.ts](src/lib/family/buildFamilyGraph.ts)
  construit les arêtes de l'arbre affiché (`FamilyTreeCards.tsx`) à partir du lien réellement saisi
  (`enfant_de`) plutôt que du premier membre trouvé du même type — correction nécessaire pour les
  familles recomposées ou à plusieurs branches (commit `b6827c2`).

- **Saisie de dates.** `SmartDateInput` ([components/family/SmartDateInput.tsx](src/components/family/SmartDateInput.tsx))
  centralise désormais la saisie JJ/MM/AAAA pour tous les champs date du module (naissance, décès,
  mariage, PACS, donations, mandat). Avant son introduction, chaque formulaire faisait son propre
  `toISOString().split('T')[0]`, ce qui produisait un décalage d'un jour en fuseau français
  (voir §3, F24 encore ouvert sur la validation clavier de ce composant).

- **`parent_de` vs `enfant_de`.** Les deux colonnes portent des sémantiques opposées dans le
  schéma, mais ne sont écrites de façon cohérente que pour `lien_familial === 'Enfant'`
  (`FamilyMemberFormDialog.tsx:172` : `parent_de` vaut `null` sinon). Ne pas supposer que
  `parent_de` est toujours le miroir de `enfant_de`.

- **Cascade de suppression applicative.** `deleteLinkWithCascade()`
  ([hooks/useFamilyData.ts:291](src/hooks/useFamilyData.ts:291)) gère la suppression d'un membre en
  ré-initialisant les liens `enfant_de` pointant vers l'id supprimé, avec confirmation utilisateur
  (`AlertDialog`) listant les dépendants avant suppression.

- **RGPD.** Tous les `console.error` du périmètre Famille sont encadrés par
  `import.meta.env.DEV` (commits `57adc88`, `cb79f15`, `34eb276`), conformément à la règle
  permanente du projet.

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

### 🟠 À surveiller (cas limite, peu probable)

- **Dates de décès/naissance futures acceptées au clavier.** `SmartDateInput.tsx:56-58` ne valide
  que `year <= new Date().getFullYear()` sur la saisie clavier (le 31/12 de l'année en cours passe
  même s'il est dans le futur), alors que le sélecteur calendrier bloque correctement
  (`SmartDateInput.tsx:85`). Affecte maintenant tous les champs date du module puisqu'ils partagent
  ce composant.
- **`imposition_distincte` (art. 6-4a CGI) toujours dormante côté calcul.** La visibilité du champ
  a été affinée (masqué hors séparation de biens/participation aux acquêts + résidence séparée,
  commit `5bd803b`), mais la valeur n'est toujours lue par aucun moteur fiscal — seulement écrite
  via `relationInfoPayload.ts`. Aucun calcul actuel n'est faussé par cette absence (rien ne la lit),
  mais l'option reste sans effet malgré sa saisie.
- **`<Select defaultValue>` non contrôlés** dans `DynamicFamilyForm.tsx` (lignes 116, 144, 172,
  242, 372, 434, 474) et `FamilyMemberFormDialog.tsx:226`. Fonctionne aujourd'hui parce que le
  `Dialog` démonte son contenu à la fermeture ; un changement de ce comportement (ex. dialog
  persistant) casserait silencieusement le pré-remplissage en édition.
- **`loi_applicable_regime` / `pays_premier_domicile_matrimonial` : colonnes désormais mortes des
  deux côtés.** Retirées de l'UI de saisie (`RelationInfoForm.tsx`, commit `b76ee6f`, décision
  volontaire — alerte jugée redondante avec la résidence fiscale à l'étranger) mais **toujours
  lues** par `useAlertesConseil.ts:60-61`. Ce n'est pas un bug fonctionnel immédiat (aucun dossier
  n'avait de valeur sur ces colonnes selon le commit), mais c'est une incohérence de code qui
  mériterait un nettoyage du côté lecteur.

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **Calcul d'âge divergent.** `FamilleSection.tsx:59` calcule l'âge par division `/ 365.25`
  (imprécision possible d'un an autour de l'anniversaire), alors que `DynamicFamilyForm.tsx:39`
  calcule correctement par différence calendaire — deux implémentations différentes dans la même
  section.
- **`loading` bloqué en cas d'échec d'authentification.** Dans
  [hooks/useFamilyData.ts](src/hooks/useFamilyData.ts), `useFamilyProfile` (ligne 28) et
  `useFamilyLinks` (ligne 203) font `if (!isAuthenticated) return;` avant tout `setLoading(false)` :
  si l'authentification échoue, l'écran reste indéfiniment sur « Chargement… ». Le hook
  `useMaritalStatus` du même fichier gère déjà correctement ce cas (ligne ~105-106).
- **`FIELD_TO_SECTION` incomplet** dans `RelationInfoForm.tsx:81-95` : `conventionPacs` et
  `datePacs` n'y figurent pas — une erreur de validation sur ces deux champs ne redirige pas vers
  l'onglet fautif.
- **Argument mort dans `calculateAge`.** `LiensFamiliauxForm.tsx:152` appelle
  `calculateAge(member.date_naissance, member.date_deces)` mais l'appel est gardé par
  `member.est_decede ? '-' : …`, donc l'argument `date_deces` n'est jamais exploité par la fonction.
- **Code mort restant.** [FamilyTreeTimeline.tsx](src/components/FamilyTreeTimeline.tsx)
  (161 lignes) n'a plus aucun import ailleurs dans le projet. `FamilyTree.tsx`, `FamilyTreeFlow.tsx`
  et `PartnerInfoCard.tsx` (~336 lignes cumulées) ont déjà été supprimés (commits `57adc88`,
  `b6827c2`).

### Cases dormantes restantes

Champs saisissables dans l'interface et toujours sans lecteur métier au 2026-08-27 :
`family_profiles.commune_naissance`, `.pays_naissance`, `.nationalite`, `.capacite_juridique`,
`.mandat_protection_future` (+ date), `.telephone`, `.email`, `.adresse_postale`, `.code_postal`,
`.ville`, `.pays`, `.nom_jeune_fille` (accès uniquement via `(data as any)`, absent de l'interface
TS `FamilyProfile`) ; les colonnes homologues `_conjoint` sur `marital_status`, ainsi que
`marital_status.imposition_distincte` (impact fiscal réel, voir 🟠 ci-dessus) ; sur `family_links` :
`mesure_protection_juridique`, `personne_a_charge`, `est_dirigeant`, `mandat_protection_future`
(+ date), `adoption_simple_motif`, `civilite` (seul lecteur potentiel = composant mort
`FamilyTreeTimeline`), `nationalite` (jamais saisie ni lue).

Champs déjà soldés depuis l'audit initial (retirés de l'UI ou branchés à un moteur) :
`ancien_combattant` (+ `_conjoint`, case retirée, commit `5122e87`), `exoneration_succession`
(branché au moteur DMTG, `lib/dmtg/recall.ts`), la table `scenarios_regime` (UI et service
retirés, commits `6f07b2b`/`ebcba21`).

## 4. Périmètre V1 / différé

- **V1 — en place** : identité client/conjoint, statut du couple, régime matrimonial (6 onglets),
  clauses du contrat, récompenses/créances, participation aux acquêts, donation au dernier vivant,
  arbre des liens familiaux avec cascade de suppression, branchement complet au moteur de
  succession légale (renonciation, représentation, branches familiales) et aux abattements DMTG
  (handicap, adoption, exonération frère/sœur).
- **Différé / non implémenté, sans date documentée** :
  - La quasi-totalité des champs listés en « cases dormantes » (§3) : coordonnées, nationalité,
    capacité juridique, mesures de protection juridique, mandat de protection future. Ces champs
    sont dans le schéma et l'UI de saisie mais aucun moteur (fiscalité, transmission, alertes) n'a
    encore été câblé dessus — décision implicite de saisie anticipée sans consommation, pas un choix
    documenté de report.
  - `imposition_distincte` (art. 6-4a CGI) : saisi et affiné en visibilité, mais le moteur IR ne le
    consomme pas encore — c'est l'écart le plus coûteux métier de cette liste puisqu'il a un impact
    direct sur l'impôt sur le revenu simulé.
  - Volet navigation réelle en navigateur (remplissage de données de test, vérification des liens/
    boutons, cohérence écran ↔ moteur) : jamais réalisé côté audit, bloqué sur l'authentification
    Supabase — aucune régression connue mais aucune preuve visuelle non plus.
