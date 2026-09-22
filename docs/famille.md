# Module Famille

> Document consolidé le 2026-08-27, fusion et mise à jour de `docs/audit/audit-famille.md`
> (audit statique du 2026-07-29). L'audit d'origine listait 26 constats (F1-F26) sur la branche
> `main` au commit `2835f30` ; la quasi-totalité a été corrigée depuis (voir commits
> `0c34614`…`b6827c2`). Mis à jour le 2026-09-01 suite à un audit fonctionnel (simplification des
> champs et navigation) : voir §3 et §4 pour le détail des retraits. Mis à jour le 2026-09-03 :
> profession en texte libre (§2), double nationalité sur les 3 fiches et champ Nationalité
> désormais saisissable sur les membres de la famille (§2, §3). Mis à jour le 2026-09-16
> (passe de simplification V1) : nettoyage de code mort, corrections de fiabilité mineures,
> retrait de l'alerte de conseil n°16 (jamais déclenchable) et de l'alerte `extraneite_regime_matrimonial`
> (branchée sur des champs déjà retirés de l'UI), retrait de deux champs dormants
> (`family_links.est_dirigeant`, `family_profiles.nom_jeune_fille`) — voir §3 et §5. Mis à jour le
> 2026-09-17 (suite) : contrôle croisé des référentiels Royal Formation sur le contrat de mariage,
> retrait de 13 clauses purement déclaratives du catalogue des clauses. Mis à jour le 2026-09-22 :
> retrait complet du catalogue de clauses du contrat de mariage restant (préciput, attribution
> intégrale, partage inégal, participation aux acquêts, clauses personnalisées) pour la V1 — seule
> la sélection du régime matrimonial lui-même est conservée, ainsi que la désignation des biens de
> la société d'acquêts et l'extension aux propres par nature, reclassées en mécanisme de
> qualification de bien plutôt qu'en clause (voir §2 et
> [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md) pour
> le détail du retrait et la marche à suivre pour une reconstruction). Mis à jour le 2026-09-22
> (suite) : habillage visuel du module aligné sur la landing page, sur le même principe que le
> module Actifs — voir §2. Ce document reflète l'état actuel du code, pas un historique daté. Volet
> navigation réelle en navigateur : vérifié en session authentifiée le 2026-09-22 pour le rendu
> visuel (Ma famille, Fiche personnelle, Conjoint, Régime matrimonial) ; remplissage de données de
> test et cohérence écran ↔ moteur toujours non réalisés.

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
| Régime matrimonial (5 onglets) | `/dashboard/famille/situation-matrimoniale` | [SituationMatrimonialePage.tsx](src/pages/famille/SituationMatrimonialePage.tsx) → [RelationInfoForm.tsx](src/components/famille/RelationInfoForm.tsx) |
| Liens familiaux (onglet) | `/dashboard/famille` | [LiensFamiliauxForm.tsx](src/pages/famille/components/LiensFamiliauxForm.tsx) + [FamilyMemberFormDialog.tsx](src/components/family/FamilyMemberFormDialog.tsx) + [DynamicFamilyForm.tsx](src/components/family/DynamicFamilyForm.tsx) |

**Tables Supabase** : `family_profiles`, `marital_status`, `family_links` (+ `recompenses`,
`creances_entre_epoux`, `patrimoine_originaire`, `patrimoine_final` saisies depuis l'onglet Régime
matrimonial mais consommées par Transmission). La table `scenarios_regime` reste active côté
lecture (alerte de conseil n°16, voir §3) mais orpheline côté écriture : aucun formulaire ne
permet de l'alimenter (voir §3).

**Flux clés** :
- **Ma famille** est un tableau de bord en lecture seule (dérivé de `family_profiles` /
  `marital_status` / `family_links`) doté d'un menu déroulant Statut (6 valeurs) toujours
  modifiable en un clic ; pour Divorcé(e)/Veuf-Veuve il affiche le statut réel et un lien vers le
  détail du régime passé. Il route vers les 3 autres écrans.
- **Fiche client** et **Conjoint** saisissent l'identité civile de chaque membre du couple, dont
  une bonne partie de champs déclaratifs (adresse, nationalité…) qui restent aujourd'hui dormants
  (§3).
- **Régime matrimonial** structure 5 onglets visibles seulement si `statut_couple === 'Marié(e)'`
  (vues distinctes pour Pacsé(e)/Concubinage) : régime légal (avec, sous les régimes concernés, la
  désignation des biens de la société d'acquêts et l'extension aux propres par nature — voir §2),
  récompenses/créances, participation aux acquêts, donation au dernier vivant, historique. Le
  catalogue de clauses du contrat (préciput, attribution intégrale, partage inégal, clauses
  personnalisées) a été retiré en V1, voir §2. Pour
  Divorcé(e)/Veuf-Veuve, un bloc lecture seule affiche le régime de l'union dissoute (régime
  matrimonial, date/lieu, donation au dernier vivant) directement depuis les colonnes conservées en
  base — aucune édition possible, cohérent avec la politique « Option A » de
  `relationInfoPayload.ts` (rien n'est écrit ni effacé pour ces deux statuts).
- **Liens familiaux** saisit les membres de la famille (`family_links`), qui est le socle de tout
  calcul successoral (dévolution légale, représentation, abattements DMTG) et alimente aussi les
  majorations retraite pour enfants. Un membre peut aussi être ajouté directement depuis l'arbre
  familial de la carte « Ma famille » (bouton « + » en génération 0 de `FamilyTreeCards.tsx`), qui
  ouvre le même `FamilyMemberFormDialog` que l'onglet Liens familiaux — aucune logique dupliquée.

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

- **Profession en texte libre.** `FicheClientForm.tsx` et `PartnerForm.tsx` saisissaient la
  profession via un `<Select>` à catégories CSP fermées (+ option « Autre » ouvrant un champ
  texte). Remplacé par un unique champ texte libre (`profession` / `profession_conjoint`), les
  catégories prédéfinies n'étant lues par aucun moteur. Compat. ascendante : les anciennes valeurs
  de catégorie CSP restent affichées telles quelles au chargement. Côté conjoint, la colonne
  `profession_csp_conjoint` n'est plus alimentée (conservée en base, vidée à chaque sauvegarde) au
  profit de `profession_conjoint`, lu en priorité au chargement avec repli sur l'ancienne colonne.

- **Double nationalité.** `nationalite` (`family_profiles`, `family_links`) et
  `nationalite_conjoint` (`marital_status`) sont désormais complétés d'une colonne sœur
  `nationalite_2` / `nationalite_2_conjoint`, révélée par une case « Double nationalité » sur les
  3 formulaires (fiche client, conjoint, membre de la famille via `DynamicFamilyForm.tsx`) — même
  pattern que le mandat de protection future (case à cocher → champ conditionnel). Le champ
  Nationalité n'existait auparavant sur aucun formulaire membre de la famille alors que la colonne
  `family_links.nationalite` existait déjà en base (jamais câblée à l'UI) ; il est maintenant
  saisissable comme sur les fiches client/conjoint. Migrations
  `20260903000000_add_double_nationalite_family.sql` et
  `20260903010000_add_nationalite_2_family_links.sql`. Aucun moteur ne consomme ces colonnes à ce
  jour (voir « Cases dormantes » en §3).

- **Cascade de suppression applicative.** `deleteLinkWithCascade()`
  ([hooks/useFamilyData.ts:291](src/hooks/useFamilyData.ts:291)) gère la suppression d'un membre en
  ré-initialisant les liens `enfant_de` pointant vers l'id supprimé, avec confirmation utilisateur
  (`AlertDialog`) listant les dépendants avant suppression.

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
  [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md). La
  colonne `marital_status.clauses_personnalisees` a été supprimée (aucune ligne active en base au
  moment du retrait) ; `marital_status.clauses_contrat` est conservée, réservée aux deux clés
  ci-dessous.

- **Société d'acquêts et extension aux propres par nature : gardées comme mécanisme de
  qualification, pas comme clause (2026-09-22).** Ces deux entrées de l'ancien catalogue ne sont pas
  de simples avantages matrimoniaux optionnels : `qualification.ts::qualifierBien` en a
  structurellement besoin pour déterminer si un bien est propre ou commun — seul mécanisme
  désignant les biens de la société d'acquêts sous `separation_societe_acquets`, seul mécanisme
  faisant tomber un bien propre par nature (art. 1404) en commun sous un régime communautaire
  (art. 1526). Elles restent donc éditables, dans le nouveau composant minimal
  [QualificationRegimeOptions.tsx](../src/components/famille/matrimonial/QualificationRegimeOptions.tsx)
  (monté dans la section « Régime matrimonial » de `RelationInfoForm.tsx`, réutilise
  `AssetSelectionModal.tsx`), et stockées avec le même format qu'avant dans
  `marital_status.clauses_contrat.societe_acquets` / `.extension_propres_par_nature`.

- **Habillage aligné sur la landing page (2026-09-22).** Le module reprenait un langage visuel
  propre (teal `#006064`, lime `#9bf00d`, `font-playfair` appliqué au cas par cas), sans rapport
  avec la landing page ni avec le module Actifs, déjà aligné dessus (voir
  [docs/patrimoine.md](patrimoine.md) §3, `.actifs-form`/`ActifFormFrame.tsx`). Même recette
  reprise ici, scopée à la classe `.famille-form` (`index.css`) pour ne pas toucher aux tokens du
  dashboard : encre `#0d1b1e` (remplace `--primary`/`--ring`), cartes blanches à 22 px cerclées
  d'un filet fin + halo `#f7f7f7`, titres en Instrument Sans (`.ff-display`). Le cadre commun
  [FamilleFormFrame.tsx](../src/components/famille/FamilleFormFrame.tsx) existe (sur le modèle
  d'`ActifFormFrame.tsx`) mais n'est pour l'instant utilisé par aucune page — chaque page applique
  directement la classe et les styles de carte, l'en-tête (photo + titre) étant propre à chaque
  écran. [SectionHeader.tsx](../src/components/family/SectionHeader.tsx) (badge icône + libellé
  mono capitales) est repris tel quel dans `FicheClientForm.tsx`, `PartnerForm.tsx` et
  `RelationInfoForm.tsx`, qui dupliquaient auparavant ce bloc en dur. Exception assumée, à la
  demande explicite : le bouton « Ajouter un membre » (`FamilleSection.tsx`) et les pills
  « Voir le détail » (statut de couple, régime matrimonial) conservent leur teal/lime d'origine —
  seuls éléments du module encore hors de cette charte. Aucun champ, schéma de validation ni
  logique métier n'est modifié par cet habillage.

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
- *[soldé 2026-09-17]* Profit subsistant (art. 1469 al. 3) incorrect pour les dépenses de
  conservation/amélioration — `computeProfitSubsistant()`
  ([lib/patrimoine/recompensesCreances.ts](../src/lib/patrimoine/recompensesCreances.ts)) appliquait
  la formule au prorata (`valeurApres × depenseFaite / valeurAvant`) uniquement à la nature
  `acquisition`, et un simple delta (`valeurApres - valeurAvant`) à `conservation`/`amelioration` —
  ce qui suppose à tort que 100 % de la plus-value constatée résulte de la dépense. Exemple : travaux
  de 40 000 € sur un bien à 200 000 € valant 260 000 € à la liquidation — l'ancien calcul donnait
  60 000 €, la formule au prorata (identique quelle que soit la nature de la dépense, conforme à
  l'art. 1469 al. 3) donne 52 000 €. Les deux mêmes formules alimentaient aussi les créances entre
  époux/partenaires de PACS (`computeMontantCreance`, même fichier).

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
- **`<Select defaultValue>` non contrôlés** dans `DynamicFamilyForm.tsx` (lignes 116, 144, 172,
  242, 372, 434, 474) et `FamilyMemberFormDialog.tsx:226`. Fonctionne aujourd'hui parce que le
  `Dialog` démonte son contenu à la fermeture ; un changement de ce comportement (ex. dialog
  persistant) casserait silencieusement le pré-remplissage en édition.
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
- *[soldé 2026-09-16]* Code mort — [FamilyTreeTimeline.tsx](src/components/FamilyTreeTimeline.tsx)
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

Champs retirés de l'UI de saisie par l'audit fonctionnel Famille du 2026-09-01 (colonnes
conservées, aucune migration, valeurs existantes non affectées grâce à l'upsert partiel de
`familyService.ts`) :
`family_profiles.commune_naissance`, `.pays_naissance`, `.telephone`, `.email`,
`.adresse_postale`, `.code_postal`, `.ville`, `.pays` (onglet « Coordonnées » retiré de
`FicheClientForm.tsx`) ; les colonnes homologues `_conjoint` sur `marital_status`
(`lieu_naissance_conjoint`, `pays_naissance_conjoint`, `telephone_conjoint`, `email_conjoint`,
`adresse_conjoint`, `code_postal_conjoint`, `ville_conjoint`, `pays_conjoint`, retirées de
`PartnerForm.tsx`) ; `marital_status.imposition_distincte` (+ homologue implicite PACS, retirée de
`RelationInfoForm.tsx`, voir 🟠 ci-dessus) ; sur `family_links` : `mesure_protection_juridique`,
`mandat_protection_future` (+ date), retirées de `DynamicFamilyForm.tsx` (ces deux derniers champs
restent saisissables côté client/conjoint sur `family_profiles`/`marital_status`, seule la
duplication sur les autres membres de la famille a été retirée).

## 4. Périmètre V1 / différé

- **V1 — en place** : identité client/conjoint, statut du couple, régime matrimonial (5 onglets,
  sans le catalogue de clauses du contrat retiré le 2026-09-22 — voir §2), désignation des biens de
  la société d'acquêts et extension aux propres par nature, récompenses/créances, participation aux
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
  - Coordonnées (téléphone, email, adresse) et commune/pays de naissance : retirées de l'UI de
    saisie par l'audit fonctionnel du 2026-09-01 (champs jugés non pertinents pour l'outil, jamais
    consommés par un moteur) — colonnes conservées en base, sans plan de réintroduction documenté.
  - `imposition_distincte` (art. 6-4a CGI) : retirée de l'écran de saisie (voir §3), en attente
    d'être réintroduite avec le moteur IR lors du développement du module Fiscalité.
  - Volet navigation réelle en navigateur (remplissage de données de test, vérification des liens/
    boutons, cohérence écran ↔ moteur) : jamais réalisé côté audit, bloqué sur l'authentification
    Supabase — aucune régression connue mais aucune preuve visuelle non plus.
