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
> (`family_links.est_dirigeant`, `family_profiles.nom_jeune_fille`) — voir §3 et §5. Ce document
> reflète l'état actuel du code, pas un historique daté. Volet navigation réelle en navigateur
> toujours non réalisé (authentification requise).

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
- **Régime matrimonial** structure 6 onglets visibles seulement si `statut_couple === 'Marié(e)'`
  (vues distinctes pour Pacsé(e)/Concubinage) : régime légal, clauses du contrat,
  récompenses/créances, participation aux acquêts, donation au dernier vivant, historique. Pour
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

- **Partage inégal de la créance de participation aux acquêts (art. 1581 C. civ.).** La clause
  `partage_inegal_acquets` était jusqu'ici purement déclarative : le % saisi n'alimentait qu'une
  note informative, `computeParticipationAcquets` restait figé sur un partage par moitié.
  Câblée dans [lib/patrimoine/participationAcquets.ts](src/lib/patrimoine/participationAcquets.ts)
  (`partCreancierPct`, défaut 50, 100 = attribution de la totalité des acquêts de l'un à l'autre).
  Même pattern de propagation que `exclusion_biens_professionnels` : le %, résolu par chacun des 4
  appelants (`ProcessusCalcul.tsx`, `Synthese.tsx`, `Succession2ndDeces.tsx`, `AssuranceVie.tsx`)
  depuis `clausesData['partage_inegal_acquets']`, transite en scalaire via
  `TransmissionContext.participationAcquets.partageInegalPct` — jamais `clausesData` en entier
  (même raison de risque de double pondération, voir le commentaire sur ce champ dans
  `lib/transmission/index.ts`). Champ de saisie du taux (`PartConjointInput`, `hasPercentages`
  dans `matrimonialClauses.ts`) désormais affiché pour cette clause dans `ClauseItem.tsx`, au même
  titre que `partage_inegal`. Décès uniquement, comme le reste du moteur de participation aux
  acquêts (voir [docs/transmission.md](transmission.md) §4).

- **Clause d'extension de la qualification d'acquêts (art. 1570, aménagement conventionnel).**
  Nouvelle clause `extension_qualification_acquets` du catalogue PAA (booléenne, sans taux — à
  distinguer de `partage_inegal_acquets` ci-dessus). Transfère l'intégralité du patrimoine
  originaire propre des époux au profit de l'indivision : câblée dans
  [lib/patrimoine/participationAcquets.ts](src/lib/patrimoine/participationAcquets.ts)
  (`extensionQualificationAcquets`), le patrimoine originaire n'est alors plus déduit du calcul —
  l'acquêt net de chaque époux devient égal à son patrimoine final dans son intégralité. Même
  pattern de propagation scalaire que les deux clauses précédentes (résolue par les 4 appelants
  depuis `clausesData['extension_qualification_acquets']`, jamais `clausesData` en entier). Pas de
  champ de saisie dédié (`hasPercentages` non défini) : une simple case à cocher, comme
  `exclusion_biens_professionnels`.

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

- **Préciput : aucun contrôle de suffisance de l'actif net commun ni de caducité (art. 1519 C. civ.).**
  `getFractionAjustee()` ([lib/patrimoine/avantagesMatrimoniaux.ts](../src/lib/patrimoine/avantagesMatrimoniaux.ts))
  traite le préciput comme une simple réaffectation de fraction sur le bien désigné, sans jamais
  vérifier que l'actif net commun (après passif et récompenses/reprises) suffit à l'honorer. En droit,
  les créanciers de la communauté priment et le préciput devient caduc (en tout ou partie) si l'actif
  net commun est insuffisant une fois le passif et les récompenses réglés. Cas limite (communauté peu
  fournie ou fort passif/récompenses face à un préciput important) — silencieux, aucun garde-fou ni
  message d'alerte. Identifié le 2026-09-17, non corrigé.
- **Droit de reprise des apports et capitaux (art. 1525 al. 2 C. civ.) absent.** Avec une attribution
  intégrale ou un partage inégal de la communauté, les héritiers de l'époux prédécédé peuvent, sauf
  stipulation contraire expresse, reprendre les apports et capitaux propres par nature du défunt
  (biens qui, sous le régime légal, lui seraient restés propres) avant application de la clause.
  `getFractionAjustee()` applique l'attribution intégrale/le partage inégal directement, sans jamais
  soustraire ces apports/capitaux au préalable. À ne pas confondre avec la clause `reprise_apports`
  existante (clause alsacienne, `matrimonialClauses.ts`), qui concerne un mécanisme différent
  (reprise au divorce, hors périmètre V1). Identifié le 2026-09-17, non corrigé.
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

- **Apport à la communauté / dispense de récompense : catalogue déclaratif déconnecté du moteur de
  récompenses.** Les clauses `mise_en_communaute` et `modification_recompenses`
  (`matrimonialClauses.ts`) ne sont référencées ni dans `recompensesCreances.ts` ni dans
  `qualification.ts` — `RecompensesSection.tsx` ne lit ni l'une ni l'autre. Rien n'empêche donc de
  saisir à tort une récompense sur un bien apporté dès l'origine du contrat de mariage, cas où aucune
  récompense n'est due (Cass. civ. 1, 3 oct. 2019, n°18-20430 : aucun mouvement de valeur entre masses
  ne s'est produit). Risque de saisie erronée par l'utilisateur plutôt qu'un calcul faux en soi — le
  module Récompenses reste un registre déclaratif assumé (voir §2). Identifié le 2026-09-17, non
  corrigé.
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

- **V1 — en place** : identité client/conjoint, statut du couple, régime matrimonial (6 onglets),
  clauses du contrat, récompenses/créances, participation aux acquêts, donation au dernier vivant,
  créances entre partenaires de PACS (art. 515-7 dernier al., voir §2), arbre des liens familiaux
  avec cascade de suppression, branchement complet au moteur de succession légale (renonciation,
  représentation, branches familiales) et aux abattements DMTG (handicap, adoption, exonération
  frère/sœur).
- **Différé / non implémenté, sans date documentée** :
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
