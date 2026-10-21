# Module Transmission

> Document consolidé le 2026-08-27, fusion de 11 documents produits entre le 2026-07-28 et le
> 2026-08-07 : `docs/cartographie-transmission-2026-08.md` (cartographie du module contre les deux
> référentiels juridiques `Successions-Referentiel-Complet.md` et `donations-legs-referentiel.md`),
> les audits détaillés `audit-transmission-bloc1-liquidation-2026-08.md` (mécanique civile de
> liquidation), `audit-transmission-devolution-conjoint-2026-08.md` (dévolution légale et droits du
> conjoint), `audit-transmission-bloc4-donations-2026-08.md` (donations), `audit-transmission-bloc6-fiscalite-2026-08.md`
> (fiscalité de la déclaration de succession), `audit-transmission-attribution-preferentielle-2026-08.md`
> (diagnostic non implémenté), `docs/audit/archive/audit-transmission-indivision-2026-08.md` (indivision
> successorale, P14), `docs/audit/archive/audit-transmission-clamp-double-masse-2026-08.md` et
> `docs/audit/archive/design-rapport-moins-prenant-2026-08.md` (diagnostic puis conception du correctif
> double masse conjoint), `docs/audit/archive/audit-transmission-bloc5-correctifs-2026-08.md`
> (ré-audit de correctifs antérieurs F19/F20/F13/F7), et `docs/audit-recompenses-creances-2026-07-28.md`
> (récompenses/créances entre époux, saisies côté Famille/Patrimoine mais consommées ici). Un volume
> inhabituellement élevé de correctifs a été livré entre la rédaction de ces audits et ce document
> (commits du 2026-08-05 au 2026-08-07, cf. §2) : chaque bug « bloquant » a été revérifié contre le
> code au 2026-08-27 (lecture directe + `git log`) avant classement en §3. Les items déjà soldés sont
> mentionnés en §2 comme décisions/corrections historiques, pas comme dette ouverte. Mis à jour le
> 2026-09-22 : retrait complet du catalogue de clauses du contrat de mariage (préciput, attribution
> intégrale, partage inégal, participation aux acquêts, clauses personnalisées) — `TransmissionContext.clausesData`
> et `avantagesMatrimoniaux.ts` supprimés, `computeParticipationAcquets` retombe systématiquement sur
> son comportement par défaut (partage par moitié, sans exclusion des biens professionnels ni
> extension de la qualification d'acquêts). Voir
> [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md) et
> [docs/famille.md](famille.md) §2.

## 1. Vue d'ensemble

Le module Transmission simule un décès à une date de référence (par défaut aujourd'hui) et calcule,
pour un foyer donné : la dévolution légale (qui hérite et pour quelle quote-part), la liquidation
civile (réserve héréditaire, imputation et réduction des libéralités, rapport), la répartition du
cash réellement disponible, puis la fiscalité de mutation à titre gratuit (DMTG) par bénéficiaire.
C'est l'aval direct du module Patrimoine (qualification civile des biens, régime matrimonial) et du
module Famille (liens familiaux, statut du couple) — voir `docs/patrimoine.md` et `docs/famille.md`.

**Écrans principaux** (route `/dashboard/transmission`, conteneur `TransmissionSection.tsx`) :

| Écran | Composant | Rôle |
|---|---|---|
| Synthèse | [Synthese.tsx](src/components/transmission/Synthese.tsx) | Résultat consolidé du 1er décès : dévolution, part de chaque héritier, net à recevoir, fiscalité. Explications du moteur réduites à leur première phrase (`resumerExplication`), texte complet et précisions des avertissements derrière un « ? » (`FieldHelp`) |
| Processus de calcul | [ProcessusCalcul.tsx](src/components/transmission/ProcessusCalcul.tsx) | Étapes de liquidation (masse de calcul, réserve/QD, imputation, réduction, rapport) : détail chiffré et formule affichés, description et conseils derrière un « ? » (`FieldHelp`) + tableau et fiches « Détail par héritier » (succession + donations antérieures + assurance-vie, façon étude notariale) |
| 2nd décès | [Succession2ndDeces.tsx](src/components/transmission/Succession2ndDeces.tsx) | Chaînage : simule le décès du conjoint survivant à partir du patrimoine reçu au 1er décès |
| Assurance-vie | [AssuranceVie.tsx](src/components/transmission/AssuranceVie.tsx) | Contrats hors succession civile (AV et PER assurantiels des deux époux), taxation 990 I / art. 757 B séparée. La répartition par bénéficiaire et son total ne portent que sur les contrats dénoués au décès simulé de l'utilisateur, même filtre que `computeTransmission` |
| Donations & legs | `DonationForm.tsx`, `LegsForm.tsx`, [Liberalites.tsx](src/components/transmission/Liberalites.tsx) | Saisie des libéralités consommées par le moteur de liquidation |

**Habillage** : « panneau de travail » (cf. [design-system.md](design-system.md) §8) — fil d'Ariane « Transmission / onglet », onglets dans la barre latérale (`useModuleSubNav`, le paramètre `?tab=` reste lu), contenu bord à bord. Synthèse : bande d'en-tête sur le modèle d'Immobilier (transmission nette, masse de calcul, réserve, quotité disponible et coûts en `SummaryRow` ; répartition par bénéficiaire en barre segmentée et lignes), puis succession légale, coûts (tableau + barres empilées lagon / citron) et abattements en lignes filetées. Assurance-vie : valeur totale en tête, fiche contrat avec bandeau, indicateurs en bande divisée et colonnes filetées. Succession 2nd décès : ordre des décès en bascule segmentée dans un bandeau. Fenêtres Donation / Legs au format des dialogues de panneau.

**Principe d'affichage** : à l'écran, chiffres, formules et avertissements bloquants ; les explications
juridiques (fondement, exclusions, nuances) et les aides contextuelles derrière un « ? » (`FieldHelp`,
`src/components/ui/field-help.tsx`, options `side` / `contentClassName` pour les textes longs). Appliqué à
tous les onglets du module.

**Tables Supabase** : `liberalites` (donations et legs, table unique discriminée par `type`), plus en
lecture côté Famille/Patrimoine : `family_links`, `marital_status`, `assets`, `asset_indivisaires`,
`recompenses`, `creances_entre_epoux`.

**Flux clés** :
- `buildTransmissionLiberalites` ([transmissionHelpers.ts](src/utils/transmissionHelpers.ts)) est
  l'unique point de construction du `Liberalite[]` consommé par le moteur, partagé par les 3 écrans de
  calcul réel (`Synthese.tsx`, `ProcessusCalcul.tsx`, `Succession2ndDeces.tsx`, tous avec
  `excludeProjets = true` — une donation au statut `'projet'` n'entre jamais dans un calcul réel).
- `successionLegale.ts` détermine la dévolution légale (`calculateBrancheA`/`calculateBrancheB`, ordres
  1 à 4, fente successorale, option du conjoint) → `reserve.ts` calcule la réserve/QD, impute les
  libéralités, applique les réductions et le rapport → `transmission/index.ts::computeTransmission`
  orchestre l'ensemble, répartit ce que chaque héritier reçoit (`partage.ts` : droits du conjoint,
  rapport en valeur, indemnités de réduction, §2), puis appelle `computeDMTG` (`lib/dmtg/`) pour la fiscalité par bénéficiaire.
- **Option du conjoint face aux enfants.** Sans DDV (art. 757) : 1/4 PP ou 100 % usufruit si tous
  les enfants sont communs, 1/4 PP imposé dès qu'un enfant ne l'est pas. Avec DDV (art. 1094-1) :
  les quatre options (`quart_pp`, `usufruit_total`, `quart_pp_3quarts_us`, `qd_pp`) sont ouvertes
  quelle que soit la filiation, conformément à ce que propose déjà `Optimisation.tsx`. En présence
  d'un enfant non commun et d'une option comportant de l'usufruit, un message informatif rappelle
  la faculté de conversion de l'art. 1098, non exercée d'office (les parts restent celles de
  l'option choisie). Tests : `lib/transmission/ddvEnfantNonCommun.test.ts`.
- **Comparaison des options du conjoint (onglet Optimisation).** `ComparaisonOptionsConjoint.tsx`
  affiche, sous le sélecteur d'option, une colonne par option ouverte (au moins deux, sinon rien) :
  net reçu par le conjoint et par les autres héritiers au 1er décès, droits au 1er puis au 2nd décès,
  total des droits, frais de notaire cumulés, net cumulé des héritiers hors conjoint (réunion
  d'usufruit incluse). Ordre normal seulement (l'Utilisateur décède en premier), deux décès à la date
  du jour. Chaque colonne est un appel à `computeOrdreNormal(base, option)`
  ([transmissionOrdreNormal.ts](src/utils/transmissionOrdreNormal.ts)), la même fonction que l'ordre
  normal de `Succession2ndDeces.tsx` : la colonne de l'option retenue retombe exactement sur l'onglet
  2nd décès. Seules sont mises en évidence la plus faible valeur du total des droits et la plus forte du net
  des héritiers, sans recommandation (l'intérêt du conjoint relève du conseil). Une erreur de calcul
  sur une option n'affecte que sa colonne. Tests : `utils/transmissionOrdreNormal.test.ts`.
- **Sens de la DDV.** Seule la donation consentie par le défunt simulé joue dans sa succession :
  `hasDDVConsentieParDefunt(maritalStatus, 'user' | 'spouse')` lit
  `donation_dernier_vivant_personne` (consentie par l'Utilisateur) pour `buildFamilyGraph` et
  l'écran Optimisation, `donation_dernier_vivant_conjoint` (consentie par le conjoint) pour
  `buildSpouseAsDecedentFamilyGraph`. `hasDDV()` (l'une ou l'autre) ne sert plus qu'aux alertes de
  conseil, vue « couple ». Tests : `utils/transmissionHelpers.ddvSens.test.ts`.
- **Ordre inversé du 2nd décès (conjoint décédé en premier).** `Succession2ndDeces.tsx` appelle
  `buildSpouseAsDecedentFamilyGraph(..., { utilisateurSurvivant: true })` : l'Utilisateur y est
  conjoint survivant (id `familyProfile.id`), héritier s'il est marié et non séparé de corps avec
  renonciation, partenaire de PACS sinon (droit au logement art. 515-6, pas de part). Enfants
  `both_parents` communs, `spouse` non communs ; DDV du conjoint (`_conjoint`) seule prise en compte ;
  usufruit valorisé à l'âge de l'Utilisateur. Option du survivant **commune aux deux ordres**
  (`marital_status.option_conjoint`, décision V1) : si elle n'est pas ouverte dans ce sens,
  `successionLegale.ts` retombe sur 1/4 PP ; mention affichée sous le sélecteur d'ordre. Au 2nd
  décès, `buildRecuEnNature` ajoute la PP reçue au patrimoine de l'Utilisateur veuf (voir « reçu du 1er
  décès » ci-dessous) et
  `computeChainedTransmission` réunit l'usufruit hors taxation. Sans l'option (2nd décès de l'ordre
  normal), aucun survivant. Récompenses, créances et participation aux acquêts suivent déjà le sens
  du décès (`decedentRole`). Contrats d'assurance-vie / PER assurantiel : dans les deux ordres et
  aux deux décès, `Succession2ndDeces.tsx` passe à chaque `computeTransmission` les contrats du défunt
  de ce décès, résolus par `buildAVContracts` contre le graphe de CE décès (le conjoint déjà décédé y
  est absent). Limites restantes : legs du conjoint non modélisés (seules ses donations le sont) ; conjoint
  sans enfant renseigné non modélisable. Tests :
  `utils/transmissionHelpers.ordreInverse.test.ts`.
- **Droit temporaire au logement (1 an).** Message informatif, sans effet sur les parts. Conjoint
  marié successible : art. 763. Partenaire de PACS : même droit par renvoi de l'art. 515-6 al. 3
  (logement et mobilier, loyers remboursés par la succession), avec rappel qu'il n'a ni droit viager
  (art. 764) ni vocation successorale. Le graphe porte `survivantPartenairePacs` (posé par
  `buildFamilyGraph` pour un statut Pacsé(e), remis à `false` par `widowFamilyGraph`) : on ne peut
  pas déduire le PACS de `survivingSpouseId` seul, également renseigné pour un époux séparé de corps
  ayant renoncé à ses droits, qui ne reçoit aucun des deux messages. Tests :
  `lib/transmission/jouissanceTemporaireLogement.test.ts`, `utils/transmissionHelpers.pacs.test.ts`.
- Le régime matrimonial (récompenses, créances entre époux, participation aux acquêts, avantages
  matrimoniaux — saisis et calculés côté Patrimoine, cf. `docs/patrimoine.md` §2) est liquidé en amont
  et injecté dans `patrimony.biensExistants` via `deltaCivilTotal` (`index.ts`) avant tout calcul de
  masse ; la récompense est pondérée à 50 % (part successorale d'un bien commun) alors que la créance
  entre époux s'applique à 100 % sur le patrimoine propre du défunt simulé — la distinction juridique
  entre les deux mécanismes se retrouve donc jusque dans leur poids sur la succession.
- Le module ne modélise qu'un **instant T unique** (le décès simulé) : aucun suivi temporel post-décès
  (délai d'option, exercice différé de l'option du conjoint, remariage postérieur, redressement fiscal
  ultérieur) n'est dans son périmètre — décision architecturale assumée, pas un oubli isolé.

## 2. Architecture & décisions

- **Un seul champ `Liberalite.valeur` par libéralité, dont la sémantique dépend de `typeImputation`**
  ([types.ts:56-79](src/lib/transmission/types.ts)) — décision actée le 2026-08-05 (commit `bf7bc00`)
  suite au finding T1 de l'audit Bloc 1 : plutôt que de refondre le schéma (aucune donation en base au
  moment de la décision), le champ existant a été **re-sémantisé et redocumenté** au lieu d'être
  dédoublé. Pour une donation-partage (`typeImputation === 'partage'`), `valeur` porte la valeur à
  l'**acte** (art. 1078, gel légal) ; pour toute autre donation, elle porte désormais la valeur au
  **décès** (art. 922 — le libellé de `DonationForm.tsx` a été changé de « Valeur au jour de la
  donation » à « Valeur au jour du décès (estimation actuelle du bien) », avec une note explicative).
  La valeur au **partage** (art. 860) est capturée à part depuis le 2026-09-29
  (`Liberalite.valeurPartage`, cf. « Valeurs au jour du partage » ci-dessous).
- **Rapport gated par `childrenIds` de façon symétrique entre donations et legs** (`reserve.ts::computeRapport`,
  commit `c89808f`) — corrige l'ancien comportement où un conjoint ayant reçu une donation `avance_part`
  pouvait être compté à tort dans le rapport (finding T5, art. 857 : seul un enfant réservataire est
  tenu au rapport, jamais le conjoint).
- **`typeImputation` rendu obligatoire à la saisie et `computeRapport` aligné sur `imputeLiberalites`**
  (commit `7f4ffd0`) — l'ancienne incohérence (finding T4 : `imputeLiberalites` traitait `undefined`
  comme rapportable, `computeRapport` l'excluait strictement) est corrigée à la fois côté moteur
  (`typeImputation !== "hors_part"` dans les deux fonctions) et côté saisie (`DonationForm.tsx` impose
  un choix explicite, cohérent avec la présomption d'avancement de part de l'art. 843).
- **Deux clauses de donation sur 11 sont câblées au moteur** : dispense de rapport (`CLAUSE_DISPENSE_RAPPORT`,
  commit `e755432`) reclasse la donation hors part successorale (art. 860, présomption inversée) ;
  rapport forfaitaire (`CLAUSE_RAPPORT_FORFAITAIRE`, commit `7c6b382`) fixe le montant rapporté
  indépendamment de la valeur réelle (art. 860 al. 4), avec blocage de saisie si la clause est cochée
  sans montant positif. Les 9 autres clauses (inaliénabilité, retour conventionnel, exclusion de
  communauté, administration spéciale, obligation d'emploi, gestion d'un bien démembré, usufruit
  réservé/successif, délivrance à terme) restent purement déclaratives — cf. §3.
- **Partage entre héritiers (`lib/transmission/partage.ts`, phase 1 de l'audit « résultat
  notaire » du 2026-09-29).** Remplace la répartition au prorata du « rapport en moins prenant »
  (§6bis, 2026-08) et son avertissement « approximation à confirmer par le notaire ». Pour chaque
  héritier, `HeirShare` expose `dejaDetenu` (donations maintenues, jamais réclamées une 2e fois),
  `recuSuccession` (biens de la succession + indemnité de réduction, seule clé de l'assiette DMTG),
  `soulte` (> 0 reçue, < 0 due) et `indemniteReduction`. Règles :
  - **R1** : toute donation déjà détenue (hors part, donation-partage, dispense de rapport, au
    conjoint) reste au donataire en plus de sa part des biens existants.
  - **R2** : réserve individuelle décomptée enfant par enfant (`reserve.ts::imputeLiberalites`,
    art. 919-1).
  - **R3** : droits en PP du conjoint = quote-part × (biens existants, legs compris, − passif
    + donations rapportables aux enfants — jamais celles au conjoint, choix validé, ni les legs
    « sur part successorale », déjà dans les biens existants), diminués de ses
    libéralités (art. 758-6), exercés sur les biens non légués et, en présence de descendants,
    plafonnés à la QD restante (art. 758-5 al. 2) — message dans `explicationsTexte` si plafonné.
    L'usufruit porte sur les biens non légués restant après le quart en PP.
  - **R4** : rapport en valeur (art. 858, 860) — l'enfant dont la donation rapportable dépasse sa
    part doit la différence à ses cohéritiers, supposé acceptant (choix validé). Enfants
    nus-propriétaires : égalité raisonnée en pleine propriété puis valorisée au barème 669.
  - **R5** : l'indemnité de réduction due par un donataire revient aux héritiers (ligne d'actif
    DMTG `indemnite-reduction`) ; la réduction d'un legs n'est plus comptée deux fois
    (`computeRapport`).
  - Le DUH s'impute sur ce que le conjoint reçoit de la succession, la part imputée revenant aux
    autres héritiers au prorata de leur réception.
  - La soulte est intégrée au net à recevoir (phase 3, ci-dessous) ; `ProcessusCalcul.tsx`
    l'affiche aussi à l'étape 6 et dans la fiche de chaque héritier.
  Tests : `lib/transmission/partage.test.ts` (scénarios de l'audit),
  `doubleMasseConjoint.audit-2026-08.test.ts` (réécrit sur ces règles).
- **Abattement de 20 % sur la résidence principale conditionné (art. 764 bis CGI, phase 2 de
  l'audit du 2026-09-29).** `computeTransmission` ne pose `isResidencePrincipale` que si le
  conjoint ou le partenaire de PACS survit, ou si un enfant du défunt ou du conjoint est mineur au
  décès (date de naissance requise, jamais présumé mineur sans elle) ou handicapé
  (`Person.handicap`). L'occupation effective n'étant pas saisie, elle est présumée (hypothèse
  validée) et rappelée dans `explicationsTexte`, qui indique aussi l'absence d'abattement. Effet
  direct : pas d'abattement au 2nd décès sans enfant mineur ou handicapé.
- **Abattement handicap (art. 779 II CGI, phase 2).** `Person.handicap` (saisi dans Famille) est
  désormais transmis à `Beneficiary.isHandicapped` pour les héritiers et les légataires (il ne
  l'était jamais : l'abattement n'était appliqué à personne). `dmtg/recall.ts` : 159 325 € ouverts
  à tous, tiers compris, cumulés avec les abattements de parenté, en remplacement des 1 594 € de
  l'art. 788 IV. Tests : `lib/transmission/phase2NotaireAudit.test.ts`.
- **Net à recevoir sur la valeur civile reçue (`netBreakdown.ts`, phase 3 de l'audit du
  2026-09-29).** `netARecevoir = max(0, valeurRecue + capitalAVNet − droits hors 990 I − frais de
  notaire − droit de partage) + soulte`. `valeurRecue` = ce que l'héritier reçoit des biens de la
  succession (`recuSuccession` après DUH, cumulé par personne ; montant du legs pour un légataire) :
  valeur pleine, jamais l'assiette fiscale — ni −20 % résidence principale, ni forfait mobilier, ni
  primes 757 B réintégrées, ni forfait de frais funéraires (déduction fiscale seulement). Le capital
  AV n'est donc compté qu'une fois, et les droits 757 B se paient dessus (plancher appliqué après
  lui). Seule une soulte due rend le net négatif : affiché « soulte à verser » dans `Synthese.tsx`
  (exclu du graphique et des pourcentages) et `Succession2ndDeces.tsx`. Frais de notaire et droit de
  partage répartis au prorata de `valeurRecue`. `netBreakdown` reçoit une entrée par personne (et
  non plus par ligne de quote-part). `transmissionNette` ajoute les indemnités de réduction et retranche les frais funéraires (somme des `fraisFunerairesImputes`), comme `netBreakdown` par héritier : le total de l'en-tête égale la somme des parts nettes.
  « Héritage brut » de `ProcessusCalcul.tsx` = `valeurRecue`. Tests :
  `lib/transmission/phase3NotaireAudit.test.ts`.
- **Règles notariales complémentaires (phase 4 de l'audit du 2026-09-29).**
  - **Frais funéraires** : la quote-part du forfait de 1 500 € (art. 775 CGI) est retranchée du net
    (`NetPerHeirInput.fraisFuneraires`), des obsèques étant toujours payées par la succession.
  - **Charges de famille (art. 780 CGI)** : `dmtg/index.ts` réduit les droits de 610 € (ligne
    directe) ou 305 € (autres) par enfant de l'héritier au-delà du 2e, dans la limite des droits
    (`DMTGBeneficiaryResult.reductionChargesFamille`). Enfants comptés dans le graphe (liens
    `enfant_de`), vivants ou décédés avec descendance : un héritier dont les enfants ne sont pas
    saisis n'en bénéficie pas.
  - **Dutreil (art. 787 B CGI)** : titres d'une société dont `societe_dutreil.eligibilite_validee`
    est vrai (`societeDutreilService.getSocietesEligibles`, `TransmissionContext.societesDutreil`,
    rattachement par `assets.societe_id`) exonérés à 75 % dans l'assiette (`dmtg/assets.ts`), sur la
    valeur de l'actif. Transmissions depuis le 21/02/2026 (loi n° 2026-103, art. 8,
    `DATE_DUTREIL_LF2026`) : la part de la valeur des titres correspondant à des biens non affectés à
    l'activité (`societe_dutreil.part_biens_non_affectes`, %, saisie dans Sociétés → Transmission,
    `TransmissionContext.dutreilPartsNonAffectees`) est exclue de l'exonération — obligatoire (0
    accepté), sinon `BienNonQualifieError` ; engagement individuel de 6 ans (4 ans avant).
    `eligibilite_validee` est posé par la fiche Dutreil (`lib/patrimoine/dutreil.ts`, cf.
    `docs/societes.md`). Engagements
    de conservation et de direction (3 ans) présumés, signalés. Chargé par les 3 écrans de calcul,
    conservé côté conjoint par `buildSpouseRawAssets`. L'écran Assurance-vie ne transmet pas les
    sociétés Dutreil (sans effet sur la fiscalité des contrats qu'il affiche).
  - **Demi-frères et demi-sœurs (art. 752 C. civ.)** : `successionLegale.ts::partsFratrieParLignes`
    divise la part de la fratrie par moitié entre lignes paternelle et maternelle si les lits
    diffèrent (`Person.lienFratrie`, saisi dans Famille, cf. `docs/famille.md`), une ligne vide
    laissant sa moitié à l'autre ; parts égales sinon.
  - **Rappel des donations du représenté (art. 784 CGI)** : les donations de moins de 15 ans faites
    à un enfant ou frère/sœur représenté sont rappelées sur ses représentants, au prorata de leur
    part dans la souche (`index.ts`, avant `computeDMTG`).
  Tests : `lib/transmission/phase4NotaireAudit.test.ts`.
- **Contre-audit du 2026-09-29 (phase 5).**
  - **Legs sur part successorale** à un enfant (`partage.ts`) : resté dans le pot, il s'impute sur
    sa part sans être ajouté à la masse égalitaire (seules les donations rapportables le sont).
  - **Adoption simple (art. 786 CGI)** : sans exception déclarée, barème des non-parents (60 %) en
    plus de l'abattement de 1 594 € ; pas de réduction pour charges de famille en ligne directe.
  - **Abattement des représentants** (art. 779 I) : divisé au prorata de la part de chacun dans la
    souche (`Beneficiary.partDansSouche`), plus à parts égales.
  - **2nd décès** : `computeRecuAuPremierDeces` lit `recuSuccession` (legs compris, aligné sur le
    DUH), hors valeur d'usufruit et hors donations déjà détenues ; `computeChainedTransmission`
    ne réunit que `HeirShare.valeurUsufruit`.
  Tests : `lib/transmission/phase5NotaireAudit.test.ts`.
- **Libéralités en usufruit et imputation « en assiette » (2026-09-29).** Toute donation ou tout
  legs peut être consenti en usufruit viager : `liberalites.droit_transmis` (`pleine_propriete` par
  défaut | `usufruit`, migrations `20260929150000_liberalites_droit_conjoint.sql` puis
  `20260929170000_liberalites_droit_transmis.sql`), saisi par `DroitTransmisSelect` dans
  `DonationForm.tsx`/`LegsForm.tsx` pour tout bénéficiaire de la fiche Famille (date de naissance
  exigée, jamais un tiers hors fiche ; incompatible avec une réserve d'usufruit du donateur).
  `valeur` porte l'assiette (biens grevés en pleine propriété) ; `computeTransmission` résout
  `Liberalite.pctUsufruit` au barème 669 selon l'âge du bénéficiaire au décès (erreur si date
  manquante). `reserve.ts::valeurLiberalite` = assiette × usufruit : masse de calcul (art. 922),
  rapport, valeur reçue par un légataire, indemnité de réduction.
  - **QD ordinaire** : imputation et réduction « en assiette » (Cass. civ. 1, 22 juin 2022,
    référentiel §8.6.2) — chaque libéralité consomme `valeur` (PP ou assiette) sur la QD, dans
    l'ordre légal ; une libéralité réduite garde l'usufruit de l'assiette maintenue. Exemple du
    référentiel vérifié : réduction de 29 100 €.
  - **Quotité spéciale entre époux (art. 1094-1)**, en présence de descendants,
    `reserve.ts::imputeLiberalitesConjoint`, également en assiette : pleine propriété ≤ QDO
    restante (ou ≤ min(1/4 de la masse, QDO restante) si le conjoint reçoit aussi de l'usufruit) ;
    assiette de l'usufruit ≤ masse − libéralités aux autres − sa pleine propriété. Réduction : PP
    avant usufruit, legs au marc le franc puis donations de la plus récente à la plus ancienne. La
    comparaison en valeur ne sert qu'au complément des droits légaux (art. 758-6).
  - **Option issue d'une DDV** (`qd_pp`, `quart_pp_3quarts_us`, `usufruit_total` hors enfants tous
    communs) : `partage.ts` plafonne l'assiette de son usufruit (`plafondAssietteUsufruitDDV`) et sa
    PP (`qdRestante`). L'usufruit légal (art. 757) n'y est pas soumis.
  - `partage.ts` : l'usufruit du conjoint (option ou legs) grève les biens restants, les autres
    héritiers en recevant la nue-propriété ; un legs d'usufruit à un autre héritier lui vaut sa
    valeur d'usufruit. Égalité entre enfants raisonnée en valeur. `HeirShare.valeurUsufruit`
    alimente la réunion au 2nd décès (usufruit légal, DDV ou légué au conjoint).
  - Sans descendant, le conjoint réservataire (1/4) impute ses libéralités sur sa propre réserve
    avant la QD (art. 924), sans réduction à son propre profit.
  Hors périmètre : usufruit temporaire, extinction de l'usufruit d'un non-conjoint à son décès,
  conversion (art. 1098), cantonnement (art. 1094-1 al. 2). Tests :
  `lib/transmission/imputationAssiette.test.ts`, `lib/transmission/quotiteSpeciale.test.ts`.
- **Valeurs au jour du partage (art. 860, 924-2, 2026-09-29).** Deux dates, comme le code civil :
  réunion fictive, réserve, imputation, réduction et droits de succession au **décès** (art. 922) ;
  masse à partager au **partage**. Saisie facultative, sans effet quand elle est vide :
  - `liberalites.valeur_partage` (`DonationForm.tsx`, proratisée par donataire comme `montant`) : valeur
    au partage dans l'état du bien au jour de la donation (aide contextuelle : améliorations du
    donataire exclues, bien vendu → valeur à la vente, somme d'argent → nominal ou bien acquis,
    art. 860-1) ;
  - `marital_status.valeur_biens_partage` (onglet Optimisation, à côté de « Partage envisagé ») :
    valeur nette des biens existants au partage, rapportée à l'actif net au décès (`rho`).
  Moteur : `reserve.ts::coefPartage` (valeurPartage / valeur) ; `computeRapport` expose
  `montantRapportPartage` (rapport au partage, forfait inchangé, clause
  `CLAUSE_EVALUATION_DECES` → valeur au décès, Cass. civ. 1, 17 nov. 2010) ; `partage.ts` réévalue les
  indemnités de réduction des donations (`totalIndemnitesPartage`, jamais écarté par une clause),
  multiplie par `rho` biens existants, legs et parts du conjoint (quotes-parts des biens, décision
  validée), et raisonne l'égalité, les soultes et `recuSuccession` en valeurs au partage. Les droits
  du conjoint (art. 758-5) restent calculés au décès. Fiscalité : assiette au décès, seule la clé de
  répartition (`civilShares`) suit les valeurs au partage. Exemples du référentiel §9.9.2 et §9.9.4
  vérifiés (indemnité réévaluée 107 143 €, soulte 96 428,50 €). Tests :
  `lib/transmission/valeurPartage.test.ts`.
- **Fente successorale : branche familiale saisissable pour les 4 rangs** (commit `de8a722`, finding
  F18) — corrige un défaut de saisie qui pouvait conduire à une **déshérence à tort** (le message
  « l'État français hérite » s'affichait alors que des grands-parents vivants existaient, faute de
  pouvoir renseigner leur branche). `'Grand-parent'`, `'Cousin/Cousine'` et le nouveau lien `'Arrière
  grand-parent'` (absent de la liste des liens saisissables avant ce correctif) exposent désormais tous
  le champ branche, sur le même pattern que `'Oncle/Tante'`.
- **Un seul parent survivant sans fratrie hérite de la moitié, pas du quart** (commit `bbf3f77`, finding
  §2.6, art. 738-1) — corrige une confusion avec la règle voisine « parent + fratrie » du tableau de
  dévolution (art. 738).
- **Époux séparé de corps distingué dans `hasSurvivingSpouse`** (commit `c65fa6b`, art. touchant §5.1) et
  **partenaire pacsé exclu de la dévolution légale** (commit `d630e60`) — corrigent deux nuances de la
  qualité de conjoint successible identifiées par l'audit Bloc 2 : le PACS, contrairement au mariage, ne
  confère aucun droit de succession ab intestat (seul un testament le permettrait), et la séparation de
  corps ne fait pas perdre cette qualité.
- **Donation-partage transgénérationnelle imputée sur la réserve du parent intermédiaire** (commit
  `4e94ab8`, art. 1078-8) — corrige le gap civil identifié au Bloc 4 : une donation à un petit-enfant
  sous ce régime s'impute désormais par souche sur la réserve de la génération intermédiaire, plutôt que
  directement sur la quotité disponible comme une donation ordinaire à un non-réservataire.
- **Forfait mobilier de 5 % et écrêtement des émoluments immobiliers** (commits `727ed92`/`a000b21`,
  art. 764 CGI et C. com. art. A. 444-175) — corrigent les deux lacunes fiscales identifiées au Bloc 6 :
  l'assiette taxable inclut désormais une présomption de 5 % de mobilier (sauf inventaire notarié
  produit, sans effet cumulatif), et `computeNotaryFees` plafonne/plancher désormais l'émolument
  d'attestation immobilière (10 % / 90 €).
- **P14 (indivision successorale) résolu** (commit `bc4e1ac`) — `pourcentage_utilisateur` est désormais
  calculé depuis `asset_indivisaires` plutôt que figé à 50/50 pour un bien détenu `'Indivision'` avec un
  tiers ; voir aussi `docs/patrimoine.md` pour le reste du pipeline de saisie d'un actif.
- **Droits accessoires du conjoint, mentions ajoutées sans calcul complet** (commits `b6befaa` droit de
  jouissance temporaire §5.8, `915a352` DUH §5.9, `e85f0b7` conversion d'usufruit §5.7) — ces trois
  correctifs **mentionnent** le droit dans les explications textuelles du résultat, mais n'en calculent
  pas l'effet chiffré complet (barème de conversion judiciaire, valorisation du DUH à 60 % de l'usufruit
  669, etc.) — décision de périmètre intermédiaire, à documenter comme telle plutôt que comme un bug
  (cf. §4).
- **Récompenses/créances entre époux : moteur côté Patrimoine, consommation côté Transmission.** Le
  calcul lui-même (`computeMontantRecompense`/`computeMontantCreance`,
  [recompensesCreances.ts](src/lib/patrimoine/recompensesCreances.ts)) et son modèle de données sont
  décrits dans `docs/patrimoine.md` §2 — non dupliqué ici. Ce qui relève spécifiquement de la
  perspective Transmission : `index.ts` liquide le solde des deux mécanismes **avant** tout calcul de
  masse successorale (`deltaCivilTotal`), avec une pondération distincte selon la nature juridique —
  récompense à 50 % (elle affecte la masse commune, dont le défunt simulé ne détient qu'une moitié),
  créance entre époux à 100 % (elle affecte directement le patrimoine propre du défunt). Aucun des deux
  écrans de calcul (`Synthese.tsx`, `Succession2ndDeces.tsx`, `ProcessusCalcul.tsx`) n'affiche le détail
  ligne à ligne des récompenses/créances à l'utilisateur — seul l'impact net agrégé sur la succession
  est visible, la saisie/consultation détaillée se faisant exclusivement côté Famille
  (`RelationInfoForm.tsx`, onglet régime matrimonial).
- **Rappel fiscal 15 ans (`dmtg/recall.ts`) et rapport civil (`reserve.ts`) sont deux mécanismes
  indépendants, correctement séparés** — vérifié explicitement par le Bloc 6 : le rappel fiscal borne
  les donations à moins de 15 ans (CGI art. 784), le rapport civil n'a aucune limite de durée (art. 860)
  ; aucune confusion entre les deux constatée dans le code.
- **Abattement 990 I bis (20 %) "Contrat vie-génération" implémenté ; "Bons & contrats de
  capitalisation" retiré du régime hors succession 990I/757B (01-02/09/2026).** Les 4 natures de la
  famille "épargne et assurance-vie" (`Contrat d'assurance-vie`, `Contrat vie-génération`, `PEP
  assurance vie`, `Bons & contrats de capitalisation`) étaient traitées de façon strictement
  identique par `computeAssuranceVie` (`dmtg/assurance-vie.ts`) et par les 6 occurrences dupliquées
  du filtre `getAssetCategory(nature) !== 'épargne et assurance-vie'` (`transmissionHelpers.ts` ×4,
  `lib/transmission/index.ts` ×2), faute de porter `nature` sur `AVContract`/`AVContractRawRow`.
  Deux corrections ciblées : (1) `computeAssuranceVie` applique désormais un abattement
  supplémentaire de 20 % (art. 990 I bis CGI) sur le capital soumis, **avant** l'abattement de
  152 500 €, uniquement pour `nature === 'Contrat vie-génération'` et uniquement sur les primes
  avant 70 ans (jamais sur le flux 757B/primes après 70 ans, régime distinct) ; (2) "Bons & contrats
  de capitalisation" — qui n'est pas hors succession civile (art. L132-12) et intègre normalement
  l'actif successoral classique au décès, droits de succession de droit commun selon le lien de
  parenté — est désormais exclu du régime 990I/757B : nouvelle constante
  `NATURES_AV_HORS_SUCCESSION`/`isAssuranceVieHorsSuccession` (`constants/assetTypes.ts`, 3 natures
  sur 4) remplace les 6 filtres catégorie-large par un filtre nature par nature, et `buildAVContracts`
  exclut ces bons en amont (défense en profondeur, quel que soit l'appelant). Décision produit :
  `AssuranceVie.tsx` ne liste plus ces bons (`AV_NATURES` réduit aux 3 vraies natures AV) — ils
  apparaissent désormais comme n'importe quel autre actif dans Synthèse/ProcessusCalcul/2nd décès,
  taxés au barème de succession de droit commun. `AVContract`/`AVContractRawRow` portent désormais
  `nature`, propagée par les 4 écrans/hooks qui construisent des contrats AV
  (`AssuranceVie.tsx`, `Synthese.tsx`, `Succession2ndDeces.tsx`, `useAVContracts.ts` →
  `ProcessusCalcul.tsx`). **Vérifié** : 8 nouveaux tests (`dmtg/assurance-vie.test.ts`,
  `transmissionHelpers.avContracts.test.ts`) couvrant l'abattement 20 % (990I et non-régression sur
  757B) et l'exclusion des bons de capitalisation (`buildAVContracts`, `buildPatrimonySnapshot`) ; 9
  fixtures existantes adaptées pour renseigner `nature` ; suite complète (695 tests) au vert.
- **PER assurantiel hors succession.** Un PER (natures `NATURES_PER`) n'est traité comme contrat
  hors succession (art. L132-12 C. assur.) que s'il est assurantiel : `isPERAssurantiel` /
  `isContratHorsSuccession` (`constants/assetTypes.ts`) combinent nature **et** `sous_type_per`, et
  remplacent `isAssuranceVieHorsSuccession` (nature seule) partout où l'actif successoral est
  construit (`buildPatrimonySnapshot`, `buildSurvivingSpousePatrimony`, `buildSpouseRawAssets`,
  `buildSpouseOwnBasePatrimony`, `dmtgAssets` de `computeTransmission`, `buildAVContracts`). Un PER
  bancaire reste dans l'actif successoral de droit commun. « PER entreprise obligatoire » est
  toujours assurantiel (`NATURE_PER_TOUJOURS_ASSURANTIEL`). Un PER sans sous-type bloque le calcul
  (`assertPERQualifies` → `BienNonQualifieError`, renvoi « Qualifier ce bien dans Patrimoine ») :
  jamais deviné. Régime fiscal (`splitPrimesPER`) : fixé par l'**âge du titulaire au décès**
  (`referenceDate`), pas par l'âge à chaque versement — avant 70 ans, tout le capital relève du
  990 I (renvoyé en `primesAvant70 = capitalDeces`, aucune opération requise) ; à 70 ans ou plus,
  les primes versées relèvent du 757 B (versements obligatoires, sinon `AVDonneesInsuffisantesError`).
  La clause bénéficiaire d'un PER assurantiel se saisit comme celle d'une assurance-vie
  (`av_contract_details` / `av_operations`, onglet Assurance-vie qui liste désormais les PER
  assurantiels) ; le champ texte libre `assets.beneficiaire_designe` n'est plus proposé pour les PER
  et n'est lu par aucun calcul. Chargement des données de contrat : `hasDonneesContratAV`
  (`useAVContracts.ts`, `Synthese.tsx`, `Succession2ndDeces.tsx`, `AssuranceVie.tsx`).
  **PER du conjoint survivant non dénoué** : jamais réintégré dans la communauté à liquider
  (décision actée — PER en principe non rachetable, application de la doctrine Ciot discutée),
  exclu de `computeAVReintegrationCivile` ; `hasPERNonDenoueConjoint` alimente un avertissement dans
  `Synthese.tsx`. Les PER du conjoint et les contrats de retraite par rente ne sont jamais réintégrés
  (`isContratRetraiteNonRachetable`). Tests : `utils/transmissionHelpers.per.test.ts`.
- **Assurance-vie non dénouée du conjoint survivant (doctrine Ciot, §9.6.1).** Sous régime de
  communauté, un contrat détenu par le conjoint survivant et financé en deniers communs est un bien
  commun : `computeAVReintegrationCivile` réintègre **la moitié** de sa valeur de rachat (part du
  défunt) dans la masse civile, jamais dans l'assiette fiscale — même pondération 50 % que tout autre
  bien commun. Deniers propres : aucune réintégration. L'origine des fonds
  (`av_contract_details.origine_fonds`) n'a plus de valeur par défaut : `NULL` = non renseignée,
  choix obligatoire à l'enregistrement du contrat (`AVContractDetail.tsx`). Une origine absente sur
  un contrat du conjoint survivant, sous communauté, bloque le calcul (`AVDonneesInsuffisantesError`,
  renvoi vers l'onglet Assurance-vie) — jamais présumée. Les lignes antérieures à ce changement ont
  gardé la valeur `deniers_communs` appliquée par l'ancien défaut, qu'elle ait été choisie ou non.
- **Clause « conjoint » relative au souscripteur.** Dans `buildAVContracts`, le marqueur
  `familyLinkId: 'conjoint'` désigne le conjoint du souscripteur : le conjoint survivant pour un contrat
  du défunt simulé, le défunt lui-même pour un contrat détenu par le conjoint survivant (résolu via
  `getDecedentRole(family.decedentId)` et `row.detenteur`). Sans effet fiscal (un contrat du survivant
  n'est pas dénoué), mais évite d'afficher le survivant comme bénéficiaire de son propre contrat.
- **2nd décès : reçu du 1er décès dans la succession du survivant.** Ce que le survivant a reçu en
  pleine propriété au 1er décès (lignes `pleine_propriete` de `heirs`, capitaux AV/PER assurantiel nets du
  990 I) entre dans sa succession, au civil ET au fiscal, dans les deux ordres. Source unique :
  `computeRecuAuPremierDeces` (`transmissionHelpers.ts`), ventilée par `buildRecuEnNature` dans les deux
  ordres (`transmissionOrdreNormal.ts`, `Succession2ndDeces.tsx`) : avant partage, le survivant détient une
  quote-part indivise r (= reçu net / actif net du prédécédé) de chaque bien et de chaque dette du
  prédécédé. Une ligne par bien (`recu-1er-deces-{id}`, nature et caractéristiques fiscales conservées,
  valeur brute × r) entre dans les `rawAssets` du 2nd décès — abattement de 20 % sur la part de résidence
  principale reçue, forfait mobilier sur l'actif brut, frais de notaire immobiliers —, et r × dettes au
  passif (civil et `passifsParBien`) ; au civil, brut − passif égale le reçu. Excédent du reçu sur l'actif
  net des biens saisis (récompenses, créances) et capitaux décès : lignes de liquidités
  (`buildRecuAuPremierDecesRawAssets`) ; actif net non positif : repli sur une seule ligne de liquidités.
  Hypothèses : reçu conservé tel quel jusqu'au 2nd décès ; legs particulier au survivant réparti au
  prorata au lieu d'être rattaché au bien légué. L'usufruit éteint
  reste hors taxation (art. 1133 CGI, `computeChainedTransmission`).
- **Bénéficiaire prédécédé et clause caduque.** Un bénéficiaire `statut: 'decede'` a le même effet
  qu'un renonçant (`resolveEffectiveAVBeneficiaires`, `dmtg/assurance-vie.ts`) : sa part accroît aux
  bénéficiaires vivants du même rang, puis bascule au rang suivant — applicable à tous les calculs
  (remplace l'ancienne décision « décédé = accepté »). `buildAVContracts` marque décédé tout
  bénéficiaire dont le prédécès est connu du graphe : personne `estDecede`, ou marqueur `'conjoint'`
  sans conjoint survivant auquel le rattacher (2nd décès d'un chaînage). Si aucun bénéficiaire ne
  reste, la clause est caduque (`getPartCaduque`) : le capital entre dans la succession du souscripteur
  (art. L132-11 C. assur.), dans la masse civile et en ligne synthétique `ajustement-av-clause-caduque`
  de l'assiette DMTG (`computeTransmission`), jamais en 990 I / 757 B. Une clause sans aucun
  bénéficiaire saisi n'est jamais caduque (donnée manquante). Conséquence : une renonciation de tous
  les bénéficiaires, jusqu'ici sans effet, fait aussi entrer le capital dans la succession.
- **Contrats de retraite par rente** (`NATURES_RETRAITE_RENTE` : PERP, Madelin, Madelin agricole,
  article 83, Préfon, retraite mutualiste du combattant). Toujours hors succession
  (`isContratHorsSuccession`). `assets.garantie_deces` (obligatoire, jamais présumé ; absent →
  `BienNonQualifieError` via `assertPERQualifies`) : sans garantie décès, l'épargne reste acquise à
  l'assureur — ni succession ni transmission (`isRetraiteRenteSansGarantie`, pas d'`AVContract`) ;
  avec garantie décès, clause saisie comme une assurance-vie (onglet Assurance-vie), primes réparties
  avant/après 70 ans comme une AV. `assets.conditions_exoneration_990i` (primes sur 15 ans au moins,
  sortie au plus tôt à la liquidation de la retraite, art. 990 I al. 2 CGI, BOI-TCAS-AUT-60
  §150-171) → `AVContract.exonere990I` : exclu du prélèvement 990 I, le 757 B restant applicable aux
  primes versées après 70 ans (l'art. 757 B ne prévoit aucune exclusion). Proposé à « oui » par défaut
  pour Madelin et article 83. Valorisation : `valeur_estimee` du contrat en approximation du capital
  transmis (rente de réversion non valorisée séparément). La distinction avec/sans garantie décès et
  l'application du 757 B à ces contrats relèvent de la pratique, pas d'un texte cité.
- **Processus de calcul aligné sur la Synthèse.** `ProcessusCalcul.tsx` lit `option_conjoint`
  (comme `Synthese.tsx`/`Succession2ndDeces.tsx`) au lieu d'une option `quart_pp` figée ; le libellé
  « Conjoint survivant » est dérivé des droits réellement attribués par le moteur. La formule de la
  masse de calcul reprend la composition de `reserve.ts::computeMasseCalcul` : biens existants
  + `TransmissionResult.reintegrationsCiviles` (récompenses/créances, participation, AV non dénouée
  du conjoint) − passif + donations ; les legs, déjà compris dans les biens, n'y sont pas ajoutés.
- **Abattements restants (Synthèse)** : le libellé d'abattement légal compare le lien sans tenir
  compte de la casse (`family_links.lien_familial` est capitalisé : `Enfant`, `Parent`,
  `Frère/Sœur`…) ; affichage seul, le résiduel vient toujours de `dmtg.perBeneficiary`. « Consommé » = abattement utilisé par les donations des 15 ans (légal − `allowanceGeneralResidual`) + part utilisée par cette succession (assiette `baseApresFrais` + `forfaitMobilierImpute`, dans la limite du résiduel) ; « Restant » = ce qui reste après la succession. Le processus de calcul (étape 7) affiche par héritier l'assiette taxée (forfait mobilier inclus et détaillé) et le montant taxable après abattement.
- **Âge du souscripteur résolu par contrat, plus par utilisateur principal pour tous les contrats
  indistinctement (09/09/2026).** `buildAVContracts` (`transmissionHelpers.ts`) calculait jusqu'ici la
  répartition avant/après 70 ans (art. 990 I/757 B) sur la seule date de naissance de l'utilisateur
  principal — un contrat détenu exclusivement par le conjoint (`detenteur` résolu comme `'spouse'` par
  `isDetenteurSpouse`) était donc taxé sur le mauvais âge à chaque versement. Corrigé : la fonction
  résout désormais la date de naissance **par contrat**, à partir de `row.detenteur` — celle du
  conjoint (`marital_status.date_naissance_conjoint`) si le contrat lui appartient, sinon celle de
  l'utilisateur principal ; si le détenteur est le conjoint et sa date de naissance inconnue,
  `AVDonneesInsuffisantesError` est levée plutôt que de retomber sur celle de l'utilisateur (même
  garde-fou que pour l'âge de l'usufruitier dans une clause démembrée, cf. §1). Répercuté dans les 4
  écrans qui appellent `buildAVContracts` (`AssuranceVie.tsx`, `Synthese.tsx`, `Succession2ndDeces.tsx`,
  `ProcessusCalcul.tsx`) et dans le badge 990I/757B du détail de contrat (`AVContractDetail.tsx`, qui
  recevait jusqu'ici le même `subscriberAge` unique quel que soit le contrat sélectionné). **Vérifié** :
  1021 tests existants au vert (dont les 67 tests assurance-vie/golden scenarios), `typecheck` sans
  nouvelle erreur (comparé à la baseline `git stash`). Correctif UX associé côté saisie (bandeau,
  vocabulaire "Souscripteur", champ masqué pour la famille) : cf. `docs/patrimoine.md` §3 (UX7).
- **F19 (renonciation, effet dévolutif), F20 (exonération DMTG frère/sœur), F13 (DDV double point
  d'entrée) et F7 (ancien combattant, code retiré des formulaires)** — quatre correctifs plus anciens
  (`32c79bd`, `0e50d06`/`d443db1`, `31d1fe7`, `5122e87`), identifiés par un audit antérieur du module
  Famille, ré-audités formellement par le Bloc 5 (`docs/audit/archive/audit-transmission-bloc5-correctifs-2026-08.md`) :
  les 4 restent corrects, aucune régression introduite par les chantiers ultérieurs sur `index.ts`.
- **Capital net d'assurance-vie désormais intégré à la transmission nette (2026-09-22)** — jusqu'ici
  `netBreakdown.ts` documentait explicitement ce périmètre comme volontairement limité au net de
  succession, l'AV restant hors calcul (décision du 2026-07-17). `dmtg/assurance-vie.ts` expose
  maintenant le capital brut résolu par bénéficiaire (`AssuranceVieResult.perBeneficiary[].capitalBrut`),
  reporté dans `DMTGBeneficiaryResult.capitalAVNet` (= capital brut − prélèvement 990 I ; le 757 B reste
  dans `baseHorsAV`, pas retranché une 2e fois) et additionné à `netARecevoir`
  (`netBreakdown.ts::computeNetPerHeir`) ainsi qu'à `transmissionNette` (`transmission/index.ts`). Le
  droit de partage n'en tient jamais compte (l'AV n'est jamais dans l'indivision successorale, art.
  L132-12 C. assur.). **Piège corrigé au passage** : `DMTGBeneficiaryResult.droitsTotaux` inclut déjà le
  990 I — le passer tel quel à `netBreakdown` aurait soustrait ce prélèvement une 2e fois (une fois via
  les coûts de succession, une fois via `capitalAVNet`) ; `transmission/index.ts` passe désormais
  `droitsHorsAV` à `netBreakdown`. **Vérifié** : golden scenario existant mis à jour + nouveau test
  dédié (`goldenScenarios.test.ts`, scénario 3), 1006 tests au vert.
- **Exonération des dons familiaux de sommes d'argent (art. 790 G, 31 865 €) désormais réellement
  appliquée (2026-09-22)** — `dmtg/recall.ts` savait traiter `Donation.type === 'familiale_790G'` mais
  `transmission/index.ts::dmtgDonations` ne renseignait jamais ce champ quelle que soit la `nature`
  choisie dans `DonationForm.tsx` (code mort en production, aucun test ne l'exerçait). Corrigé : `nature
  === "Dons familiaux de sommes d'argent"` → `type: 'familiale_790G'` ; `transmissionHelpers.ts`
  transportait déjà `nature` en le perdant en route (ajouté à `LiberaliteRow` et à la construction de
  `Liberalite`). **2e bug trouvé au passage dans `recall.ts`** : la fraction du don excédant les 31 865 €
  exonérés ne consommait jamais l'abattement général de 100 000 € (le commentaire du code le présentait
  comme volontaire — "ne consomme pas l'abattement général" — alors que l'art. 779 CGI traite cette
  fraction comme une donation ordinaire). Corrigé pour que seule la part exonérée (≤ 31 865 €) échappe à
  l'abattement général ; l'excédent le consomme normalement. **Vérifié** : 3 nouveaux tests dédiés
  (`recall.test.ts`), résultat recoupé avec une étude notarielle réelle (donation de 42 000 € → 10 135 €
  imposables → abattement résiduel 89 865 €, conforme).
- **Forfait mobilier (art. 764 CGI) : valeur minimale des meubles meublants.** Sans inventaire, la
  valeur imposable des meubles est le maximum de leur valeur déclarée (actifs « Meubles meublants »,
  `Asset.isMeublesMeublants`) et de 5 % des autres biens taxables, meubles exclus de la base : seul
  l'excédent du forfait sur la valeur déclarée s'ajoute (`dmtg/assets.ts`, fiction fiscale jamais
  ajoutée au patrimoine réel). Sans meubles saisis : 5 % du taxable, comme avant. Tests :
  `lib/transmission/phaseBActifs.test.ts`. **Réglage d'inventaire absent — limitation connue, non
  corrigée.** `dmtg/assets.ts:7` expose un paramètre `inventaireNotarieProduit` qui met le
  forfait à 0 quand un inventaire notarié réel remplace la présomption forfaitaire, mais **aucun écran
  ne le renseigne** (`grep` sur `inventaireNotarieProduit` : uniquement lu, jamais écrit côté UI/DB) —
  toujours `false` par défaut, forfait toujours appliqué. Explique un écart résiduel constant d'environ
  5 % du taxable entre l'app et toute étude qui écarte explicitement cette option (cas réel rencontré :
  écart de 237 €/enfant sur une base ~3 000 €). Candidat pour une prochaine phase (ajouter le réglage
  côté "Hypothèses" de la succession), pas un correctif ponctuel.

- **Assiette DMTG nette du passif (art. 768 CGI).** `computeTransmission` transmet `patrimony.passifs`
  à `computeDMTG` (`DMTGContext.passif`) ; `dmtg/beneficiary.ts` répartit entre bénéficiaires
  `max(0, actif taxable − passif)` (actif taxable = après abattements par bien : RP, bois…). Le forfait
  mobilier de 5 % reste calculé sur l'actif brut, jamais réduit par le passif. Le passif lui-même est
  pondéré comme l'actif du même régime (cf. point suivant). Dette rattachée à un bien exonéré en tout
  ou partie (Dutreil, bois et forêts, biens ruraux ; pas la résidence principale, dont l'abattement est
  une règle d'évaluation) : imputée par priorité sur la valeur du bien avant exonération (art. 769 II
  CGI), seul l'excédent éventuel restant au passif général (`AssetValuationResult.
  passifImputeSurBiens`). Rattachement : `emprunts.asset_id` (« actif financé / garanti »), présumé
  désigner un prêt d'acquisition et signalé ; montants pondérés comme le passif global par
  `transmissionHelpers.ts::buildPassifsParBien` (`TransmissionContext.passifsParBien`, 1er et 2nd
  décès, ordres normal et inversé). Les `passifs` hors emprunts ne sont jamais rattachés à un bien.
- **Pondération du passif (`getFractionPassifParDetenteur`, `utils/transmissionHelpers.ts`).**
  `Bien commun` → 50 % ; `Bien propre`/`Bien personnel`/`Indivision` → détenteur ou quote-part via
  `getPartSuccessorale` (défunt = Utilisateur) ou `getPartConjointSuccession` (défunt = conjoint) ;
  qualification absente/`À qualifier` → 100 % (prudence, jamais devinée). Appliqué au 1er décès
  (`buildPatrimonySnapshot`) comme côté conjoint (`buildSurvivingSpousePatrimony`,
  `buildSpouseOwnBasePatrimony`, qui reprenaient auparavant tout le passif brut à 100 %, dettes propres
  du 1er défunt comprises). Tests : `lib/transmission/phase4aAudit.test.ts`.
- **Assurance-vie : 990 I et 757 B (`dmtg/assurance-vie.ts`).** (Primes antérieures au 13/10/1998 : cf. ci-dessous, #8.)
  - Assiette 990 I = capital décès rattaché aux primes versées avant 70 ans, au prorata des primes
    (`capitalDeces × primesAvant70 / (primesAvant70 + primesApres70)`), plus-values comprises.
    Approximation : pas de suivi de la valeur acquise versement par versement.
  - Cumul par bénéficiaire sur tous ses contrats (abattement vie-génération de 20 % appliqué contrat
    par contrat), puis **un seul** abattement et barème : 20 % jusqu'à 700 000 € de part taxable,
    31,25 % au-delà (`params-dmtg.json`, `av_990I_rates`).
  - Clause démembrée (art. 990 I al. 3) : chaque part porte un coefficient d'abattement (1 en PP,
    `usufruitPct` pour l'usufruitier, `1 − usufruitPct` pour le nu-propriétaire) ; abattement d'une
    personne = 152 500 € × min(1, Σ coefficients). La fraction d'un usufruitier exonéré (conjoint) est
    perdue, jamais reportée sur le nu-propriétaire.
  - 757 B : réintégration des primes après 70 ans (jamais les gains, jamais diminuées des rachats
    partiels — BOI-ENR-DMTG-10-10-20-20 § 190 — mais plafonnées au capital décès correspondant si le
    contrat est en moins-value), abattement global de 30 500 €
    réparti entre les seuls bénéficiaires non exonérés (conjoint/PACS, frère-sœur 796-0 ter exclus) au
    prorata de leurs primes.
- **Rappel fiscal des donations (`dmtg/recall.ts`).** Deux valeurs par donation : `montant` /
  `Liberalite.valeur` = valeur au décès (calcul civil, art. 922) ; `valeur_fiscale_acte` /
  `valeurFiscaleActe` = valeur déclarée dans l'acte (art. 784 CGI), seule base du rappel sur 15 ans.
  Absente (donation antérieure à la colonne) : repli sur `valeur` avec avertissement dans
  `explicationsTexte`. `DonationForm.tsx` rend le champ obligatoire, sauf somme d'argent,
  donation-partage ou projet non signé, où il est repris d'office du montant saisi. Exonération 790 G :
  plafond unique de 31 865 € par donataire sur la fenêtre de 15 ans, consommé chronologiquement ;
  l'excédent consomme l'abattement général. Conditions vérifiées par `index.ts` au jour du don :
  donateur < 80 ans, donataire majeur (émancipation non enregistrée), enfant/petit-enfant/
  arrière-petit-enfant ou, à défaut de descendance, neveu/nièce. Condition non remplie → don ordinaire,
  signalé ; date de naissance manquante → exonération maintenue, signalée non vérifiable.
  `DonationForm.tsx` avertit (sans bloquer) pour un donataire hors de ces liens.
  Donation avec réserve d'usufruit : l'utilisateur saisit la pleine propriété à l'acte, la valeur
  fiscale enregistrée est la nue-propriété au barème art. 669 CGI selon l'âge du donateur au jour de
  l'acte (`computeValeurNueProprieteDonation`, `lib/patrimoine/bareme669CGI.ts`) — date d'acte et date
  de naissance du donateur obligatoires. La valeur civile (`montant`) reste la pleine propriété.
  Tests : `lib/transmission/phase3Audit.test.ts`.
- **Légataires non héritiers (`index.ts` §6bis-0).** Un legs maintenu (après réduction) à une
  personne absente de `heirs` sort du résiduel réel AVANT la répartition du cash entre héritiers
  (`residuelHeritiers`) ; ramené au prorata si les legs excèdent le résiduel. Le légataire reçoit sa
  propre `civilShare` (legs / résiduel réel) et devient bénéficiaire DMTG, lien déduit du graphe :
  `survivingSpouseId` (conjoint ou PACS) → exonéré ; Petit-enfant → `petit_enfant` (ligne directe,
  abattement 1 594 €, art. 788 IV) ; Parent/Grand-parent → ascendant ; Frère/Sœur (+ 796-0 ter) ;
  Neveu/Nièce ; Oncle/Tante/Cousin → `collateral_4` ; sinon et `tiers` (une ligne `tiers-<id legs>`
  par legs) → 60 %. Exposés dans `TransmissionResult.legataires` et dans `netBreakdown` avec
  `horsIndivision` (jamais débiteurs du droit de partage, montant légué retiré de son assiette).
  Affichés dans `Synthese.tsx` et `ProcessusCalcul.tsx`. Tests : `lib/transmission/phase4bAudit.test.ts`.
- **Libéralité au conjoint / partenaire de PACS.** Le conjoint n'est pas dans `family_links` :
  `liberalites.beneficiaire_conjoint` (booléen, exclusif de `beneficiaire_id` par contrainte) le désigne,
  `buildTransmissionLiberalites` le traduit en sentinelle `'conjoint'`, résolue vers
  `family.survivingSpouseId` en tête de `computeTransmission` (sans conjoint → `'tiers'`). `LegsForm.tsx`
  et `DonationForm.tsx` proposent le conjoint (Marié(e)/Pacsé(e), libellé « Partenaire de PACS » le cas
  échéant) en tête des légataires / donataires ; `ProcessusCalcul.tsx` résout la même sentinelle pour
  rattacher une donation au conjoint à sa ligne.
- **Écran Assurance-vie : détail lu dans le moteur.** `computeAssuranceVie` expose
  `detailParBeneficiaire` (assiette/abattement/base 990 I, primes/abattement 757 B, exonération),
  repris dans `DMTGBeneficiaryResult.detailAV`. `AssuranceVie.tsx` ne fait que sommer ces valeurs ;
  les tranches 990 I affichées sont la somme des tranches de chaque bénéficiaire.
- **Liens fiscaux des héritiers hors ordres 1-2.** Grands-parents et arrière-grands-parents → `ascendant`
  (abattement 100 000 €, barème ligne directe) ; oncles/tantes et cousins germains → `collateral_4`
  (55 %, abattement 1 594 €). Tests : `lib/transmission/phase1Audit.test.ts`, `lib/dmtg/phase2Audit.test.ts`.

- **Récompenses : effet signé selon l'époux débiteur (audit du 2026-10-12, #1).** Effet sur la
  succession du défunt = (solde du survivant − solde du défunt) / 2, avec solde = doit − dû à la
  communauté (`index.ts`, `impactRecompenses`) : la communauté varie de la somme des soldes, dont le
  défunt recueille la moitié, mais il paie seul sa propre récompense. Récompense de 60 000 € due par
  l'Utilisateur : −30 000 € à son décès, +30 000 € au décès du conjoint. Tests :
  `lib/transmission/recompensesCreances.branchement.test.ts`.
- **Usufruit viager du défunt hors succession (audit du 2026-10-12, #2).** Un actif en
  `mode_detention = 'Usufruit'` vaut 0 dans toute succession (`getValeurEstimeePonderee` de
  `transmissionHelpers.ts` et de `index.ts`, donc masse civile, assiette DMTG, base du DUH, côté
  Utilisateur comme conjoint) : l'usufruit s'éteint au décès (art. 617 C. civ.), la réunion est
  exonérée (art. 1133 CGI). Le Résumé Patrimoine continue d'afficher sa valeur au barème 669. Un
  message rappelle la présomption de l'art. 751 CGI (nue-propriété détenue par un héritier
  présomptif). La nue-propriété reste évaluée au barème 669. Tests :
  `lib/transmission/auditCalculs2026-10.test.ts`.

- **Donateur des donations et libéralités au 2nd décès (audit du 2026-10-12, #3 et #4).**
  `liberalites.realise_par` (`DonationForm.tsx`, champ « Donateur » obligatoire : « Vous » =
  `epoux1`, « Votre conjoint » = `epoux2`, « Vous deux (biens communs) » = `communaute`, ce dernier
  réservé aux époux mariés) devient `Liberalite.donateur` (`buildTransmissionLiberalites`, défaut
  Utilisateur). `computeTransmission` ne retient que les libéralités du défunt simulé
  (`liberalitesDuDefunt`) : 100 % des siennes, 50 % d'une donation de biens communs (chaque époux
  donateur pour moitié — masse de calcul, rapport art. 850 C. civ., rappel fiscal art. 784 CGI ;
  valeurs au décès, à l'acte, au partage et forfait de rapport toutes pondérées), aucune de l'autre
  époux ; les legs sont toujours ceux de l'Utilisateur. Tous les écrans passent donc la liste
  complète à chaque décès (`Succession2ndDeces.tsx`, `transmissionOrdreNormal.ts` : 2nd décès de
  l'ordre normal et les deux décès de l'ordre inversé, auparavant `liberalites: []`).
  `ProcessusCalcul.tsx` affiche la même sélection. Conjoint prédécédé dans le chaînage
  (`FamilyGraph.conjointPredecede`, posé par `widowFamilyGraph` et
  `buildSpouseAsDecedentFamilyGraph` sans survivant) : legs au conjoint caduc (art. 1039 C. civ.,
  message), donation au conjoint conservée dans la masse de calcul sans héritier. Réserve
  d'usufruit d'une donation : nue-propriété évaluée à l'âge de chaque donateur pour sa part
  (`computeValeurNueProprieteDonationParDonateurs`). Nature « Donation-partage conjonctive »
  retirée (couverte par « Vous deux »). Tests : `lib/transmission/auditCalculs2026-10.test.ts`.

- **Ordres d'héritiers 2 à 4 sans conjoint (audit du 2026-10-12, #6).** `successionLegale.ts` :
  - un seul parent sans fratrie (art. 738-1) : moitié au parent, moitié aux ascendants les plus
    proches de l'autre branche, sinon tout au parent — les collatéraux ordinaires sont exclus. La
    branche du parent se lit sur son libellé (père/mère) ou sur les grands-parents rattachés à lui
    ou à l'autre parent (`Person.enfantDe`, repris de `family_links.enfant_de`) ; indéterminable
    alors que des ascendants existent → erreur explicite, jamais devinée ;
  - sinon (`applyFenteSuccessorale`) : ascendants ordinaires d'abord (art. 747-748, le plus proche
    par ligne, une ligne vide laisse sa moitié à l'autre), collatéraux ordinaires seulement à
    défaut de tout ascendant (art. 749-750, même règle), déshérence enfin. Corrige le mélange
    d'ordres entre branches (grand-mère maternelle + oncle paternel : 100 % à la grand-mère) et la
    lecture d'un « Arrière grand-parent » comme grand-parent. Tests :
    `lib/transmission/successionLegale.test.ts`.

- **Famille du conjoint distincte de celle du défunt (audit du 2026-10-12, #13).**
  `coteFamilial` (`transmissionHelpers.ts`) remonte `enfant_de` d'un ascendant ou collatéral
  (Parent, Grand-parent, Frère/Sœur, Neveu/Nièce, Oncle/Tante, Cousin…) jusqu'à 'user', 'spouse'
  ou un Enfant (`parent_de`) ; sans rattachement, côté Utilisateur. `buildFamilyGraph` et
  `buildSpouseAsDecedentFamilyGraph` posent `Person.horsFamilleDuDefunt` pour la famille de
  l'autre époux : exclue de la dévolution (`calculateSuccessionLegale`), lien fiscal « tiers »
  pour un légataire ou un bénéficiaire AV, hors du champ de l'art. 790 G. Avant : un couple marié
  sans enfant donnait 1/4 à chaque beau-parent. Tests : `lib/transmission/auditCalculs2026-10.test.ts`.

- **Assurance-vie : lien fiscal des bénéficiaires non héritiers et régimes transitoires (audit du
  2026-10-12, #7 et #8).**
  - Un bénéficiaire AV absent des héritiers reçoit le même lien fiscal qu'un légataire
    (`lienFiscalLegataire`), avec handicap, adoption simple, exonération frère/sœur et charges de
    famille : les primes 757 B sont taxées selon la parenté (petit-enfant en ligne directe, enfant
    renonçant avec 100 000 €, neveu à 55 %). Auparavant 60 % pour tous sauf conjoint et fratrie.
  - `splitPrimesAvantApres70` (BOI-TCAS-AUT-60 § 80, § 270) : primes versées avant le 13/10/1998
    exonérées (`AVContract.primesExonerees`, prorata du capital sans taxation) ; contrat souscrit
    avant le 20/11/1991 (`assets.date_acquisition`, déjà affichée « Ouvert le ») : 990 I à tout âge
    pour les primes depuis le 13/10/1998, jamais de 757 B. Date d'ouverture absente : régime des
    contrats récents présumé, signalé si le contrat a été alimenté après 70 ans.
  Tests : `lib/transmission/auditCalculs2026-10.test.ts`.

- **Neveux, dons 790 A bis et valeur des legs (audit du 2026-10-12, #9, #10, #12).**
  - Neveux venant en représentation : tarif et abattement des frères et sœurs seulement si
    plusieurs souches de la fratrie viennent à la succession (`HeritierLegal.pluraliteSouches`,
    BOI-ENR-DMTG-10-50-80 § 330 et § 390) ; souche unique → neveux de leur chef (7 967 €, 55 %).
  - Natures « Don d'argent pour résidence principale (2025) » (15/02/2025-31/12/2026) et « … sous
    condition de remploi (2020) » (15/07/2020-30/06/2021) : exonération art. 790 A bis jusqu'à
    100 000 € par donateur (`params-dmtg.json`, `don_790A_bis`), fraction exonérée non rappelée
    (BOI-ENR-DMTG-20-20-20 § 980), excédent rappelé comme un don ordinaire. Donataire hors du cercle
    du 790 G ou don hors période : don ordinaire, signalé ; emploi des fonds présumé. « Don d'argent
    exonéré » (régime non précisé) : don ordinaire, signalé.
  - Valeur d'un legs (`buildTransmissionLiberalites`, `poidsBienLegue`) selon les droits du
    testateur : usufruit 0, nue-propriété au barème 669, bien propre du conjoint 0 (art. 1021),
    indivision à sa quote-part, bien commun à 100 % (art. 1423 al. 2). Les 3 écrans de calcul
    passent les démembrements.
  Tests : `lib/transmission/auditCalculs2026-10.test.ts`.

- **Biens ruraux, groupements fonciers, bois et forêts (art. 793 et 793 bis CGI).** Régime et
  conditions saisis sur le bien (`assets.regime_exoneration_rural`, `conditions_exoneration_rural`,
  migration `20261012120000_assets_exoneration_rurale.sql`), jamais présumés : un bien non qualifié
  bloque le calcul (`BienNonQualifieError`). Forestier : 3/4 exonérés sans plafond. Agricole (GFA, GAF,
  GFV, terres à bail à long terme) : 3/4 exonérés, ramenés à 1/2 sur la part de chaque bénéficiaire
  au-delà de 600 000 € (`dmtg/beneficiary.ts`, `params-dmtg.json` › `exonerationRurale`). Le seuil de
  chaque bénéficiaire est diminué des donations de biens ruraux en régime agricole reçues du défunt
  depuis moins de 15 ans (art. 793 bis al. 2 ; `Liberalite.partRuraleAgricole`, déduite des biens
  donnés encore présents dans Patrimoine — bien supprimé : non imputé). GFR : régime dominant.
  Engagements des héritiers (gestion durable 30 ans, conservation 5 ans pour le seuil de 600 000 €,
  version en vigueur depuis la LF 2025) présumés et signalés ; seuil de 20 M€ (18 ans) non modélisé. Le forfait mobilier exclut la fraction exonérée aux
  3/4 (approximation au-delà du seuil). Tests : `lib/transmission/exonerationRurale.test.ts`.
- **Entreprise individuelle (art. 787 C CGI).** « Entreprise individuelle » et « Autres biens
  professionnels » (`NATURES_787C`) : `assets.conditions_787c` obligatoire (formulaire et calcul,
  `BienNonQualifieError`). Conditions remplies (détention de 2 ans si acquis à titre onéreux,
  conservation 4 ans par les héritiers — inchangée par la LF 2026, qui ne vise que l'art. 787 B —,
  poursuite de l'exploitation 3 ans) : 75 % exonérés (`Asset.isExonere787C`), dette rattachée imputée
  sur le bien (art. 769 II). Non remplies : pleine valeur, signalé. Une entreprise individuelle saisie
  dans Sociétés avec pacte Dutreil reste traitée par l'art. 787 B (aucune en base).
- **Bijoux, objets d'art et de collection (art. 764 II CGI).** « Bijoux et pierres précieuses »,
  « Montres », « Objets d'art et de collection » (`NATURES_PLANCHER_ASSURANCE`) :
  valeur fiscale = max(valeur estimée, 60 % de `assets.valeur_assuree` × part du défunt) — contrat
  d'assurance vol/incendie en cours conclu depuis moins de 10 ans, sauf preuve contraire. Fiscal
  seulement (masse civile inchangée) ; sans valeur assurée, valeur estimée.
- **Assurance-vie dont l'assuré n'est pas le souscripteur.** `assets.assure_tiers` (défaut false, cas
  usuel) : contrat non dénoué au décès du souscripteur, exclu de `isContratHorsSuccession` — sa valeur
  de rachat entre dans les masses civile et fiscale (part du défunt selon le régime), sans 990 I ni
  757 B, et n'est jamais un `AVContract`. Le dénouement au décès de l'assuré n'est pas modélisé.
  Tests (3 points) : `lib/transmission/phaseC1Actifs.test.ts`.
- **Avance sur contrat d'assurance-vie.** Saisie sur le contrat (`av_contract_details.avance_en_cours`,
  écran du contrat), déduite par `buildAVContracts` du capital décès versé aux bénéficiaires — assiette
  990 I nette (`AVContract.avanceDeduite`, signalé « à confirmer »). Jamais une dette de la succession :
  la nature de passif « Avances sur contrats d'assurance-vie » n'est plus proposée (0 ligne en base).
  Avance supérieure au capital (solde réclamé à la succession) non modélisée.
- **Régimes de retraite étrangers.** `assets.regime_retraite_etrangere` obligatoire (formulaire,
  `assertPERQualifies`) : `actif_successoral` (dans l'actif, droit commun), `clause_beneficiaire`
  (hors succession, `AVContract` au régime de l'assurance-vie, clause et versements dans l'écran
  Assurance-vie) ou `aucune` (hors succession, rien transmis — `isContratNonTransmis`). Jamais
  réintégré au titre de la doctrine Ciot. Application du droit français et des conventions fiscales
  signalée à vérifier.
- **Stock-options.** Retenues pour leur valeur saisie ; doctrine incertaine sur les options non levées
  (exclusion de l'actif taxable, ou valeur intrinsèque) signalée dans le calcul et la fiche — aucun
  traitement dédié (décision actée). Tests (3 points) : `utils/transmissionHelpers.phaseC2.test.ts`.
- **Prévoyance décès et contrat article 82 hors succession (art. L132-12 C. assur.).** « Temporaire
  décès », « Vie entière », « Contrat prévoyance individuelle » (`NATURES_PREVOYANCE_DECES`) et
  « Contrat article 82 » sont exclus des masses civile et fiscale (`isContratHorsSuccession`) et
  deviennent des `AVContract` (clause et primes saisies dans Transmission → Assurance-vie, comme une
  assurance-vie). Prévoyance : capital transmis = `assets.capital_garanti` (`getCapitalDecesContrat`),
  calcul bloqué s'il manque (`BienNonQualifieError`). Contrat non rachetable : assiette 990 I =
  fraction rachetable (valeur estimée d'une vie entière, 0 sinon) + versements des 12 mois précédant
  le décès effectués avant 70 ans, plafonnée au capital (`splitPrimesPrevoyance`,
  `AVContract.assiette990I`) ; 757 B sur tous les versements effectués à 70 ans ou plus ; aucun
  versement → `AVDonneesInsuffisantesError`. Retenu : la pratique des assureurs (dernière prime
  annuelle) plutôt que le quotient de mortalité de la doctrine 2018. Article 82 : régime de
  l'assurance-vie (âge à chaque versement), phase de constitution présumée et signalée. Jamais
  réintégrés au titre de la doctrine Ciot (`isContratNonReintegreCiot` ; article 82 signalé avec les
  PER). Non modélisés : échéance d'une temporaire (contrat présumé en cours), réintégration Ciot de
  la valeur de rachat d'une vie entière du conjoint, régime des contrats de prévoyance antérieurs au
  20/11/1991. Le champ texte libre « Bénéficiaire désigné » n'est plus proposé dans la fiche (colonne
  `beneficiaire_designe` conservée). Tests : `utils/transmissionHelpers.prevoyance.test.ts`.
- **Paramètres légaux vérifiés pour 2026 (`params-dmtg.json`, `fiscal.ts`).** Barèmes et abattements
  DMTG, 990 I (152 500 €, 20 % puis 31,25 % au-delà de 700 000 €), 757 B (30 500 €), barème 669, frais
  funéraires (1 500 €), charges de famille (610 € / 305 €) : inchangés par la LF 2026. Art. 790 A bis :
  dons jusqu'au 31/12/2026, sans prorogation votée. Émoluments de succession (A444-59, A444-63,
  A444-66) identiques dans la version de Légifrance en vigueur au 01/08/2026, malgré l'arrêté du
  25/02/2026. À surveiller : le PLF 2027 (790 G porté à 50 000 € pour les dons du 1er semestre 2027),
  non voté.
- **PEA / PEA-PME au décès (`index.ts`, notes `explicationsTexte`).** Le plan n'est clôturé que par le
  décès de son titulaire (`detenteur`) : note de clôture (gain exonéré d'IR, PS de 18,6 % dus, non
  déduits), que le plan soit commun ou propre. Un PEA commun dont le conjoint survivant est titulaire
  n'est pas clôturé : la moitié de sa valeur entre dans la succession (part `Bien commun`) et se règle
  au partage, note dédiée. Un PEA propre du survivant reste hors succession. Tests :
  `utils/transmissionHelpers.placements.test.ts`.
- **Actionnariat salarié non exercé (`index.ts`, note `explicationsTexte`).** Stock-options, AGA en
  période d'acquisition et BSPCE du défunt (propres par nature) : une note commune, retenus pour leur
  valeur saisie ; stock-options et BSPCE exerçables par les héritiers dans les 6 mois (gain de levée des
  stock-options exonéré d'IR, art. 80 bis I CGI) ; AGA : attribution demandable dans les 6 mois
  (art. L225-197-3 C. com.), sans conservation. Inclusion dans l'actif taxable signalée comme discutée.
  Droits propres du conjoint survivant : hors succession, pas de note. Tests :
  `utils/transmissionHelpers.placements.test.ts`.

## 3. Dette identifiée

### 🔴 Bloquant (peut fausser un calcul montré au client)


**Audit « résultat notaire » du 2026-09-29** — points reproduits sur un scénario chiffré. Les
écarts civils (répartition, droits du conjoint, réserve, rapport, réduction) sont corrigés par la
phase 1 (cf. §2, « Partage entre héritiers »), l'abattement résidence principale et l'abattement
handicap par la phase 2, le net à recevoir par la phase 3, les règles complémentaires par la phase 4 (cf. §2) :

- *(soldé 2026-09-29, phase 4 : cf. §2 « Règles notariales complémentaires »)*

**Audit des calculs du 2026-10-12** — constats reproduits sur scénarios chiffrés, à corriger par
phases (0 : constat ; 1 : #1, #2, #5 ; 2 : #3, #4 ; 3 : #6 ; 4 : #7, #8 ; 5 : #9-#12 ; #13 traité après la phase 3). Données en
base au 2026-10-12 : 2 donations (`realise_par = epoux1`), aucun bien démembré, aucune récompense
ni créance, aucun versement AV antérieur au 13/10/1998 — pas de reprise de données à prévoir.

- *#1, #2 et #5 soldés le 2026-10-12 (phase 1) : cf. §2 « Récompenses : effet signé selon l'époux
  débiteur », « Usufruit viager du défunt hors succession », et la règle R3 du partage.*
- *#3 et #4 soldés le 2026-10-12 (phase 2) : cf. §2 « Donateur des donations et libéralités au
  2nd décès ».*
- *#6 soldé le 2026-10-12 (phase 3) : cf. §2 « Ordres d'héritiers 2 à 4 sans conjoint ».*
- *#13 soldé le 2026-10-12 : cf. §2 « Famille du conjoint distincte de celle du défunt ».*
- *#7 et #8 soldés le 2026-10-12 (phase 4) : cf. §2 « Assurance-vie : lien fiscal des bénéficiaires
  non héritiers et régimes transitoires ».*
- *#9, #10 et #12 soldés le 2026-10-12 (phase 5) : cf. §2 « Neveux, dons 790 A bis et valeur des legs ».*
- **#11 (confirmé, ouvert) — rappel fiscal recalculé avec l'abattement de succession.** Selon
  BOI-ENR-DMTG-10-50-50 § 110, 120, 280 et 290, une donation antérieure consomme l'abattement
  réellement appliqué dans l'acte, et ses tranches sont la part taxée après cet abattement.
  `dmtg/recall.ts` recalcule les deux avec l'abattement de succession du bénéficiaire. Écart pour un
  petit-enfant de son chef (790 B à l'acte, 31 865 € ; 1 594 € de l'art. 788 IV au décès, que l'art.
  784 ne vise pas), un représentant (le 790 B n'entame pas les 100 000 € de l'art. 779 I reçus par
  représentation), un arrière-petit-enfant (790 D, 5 310 €) et un tiers (aucun abattement à l'acte).
  Scénarios : legs de 100 000 € à un petit-enfant ayant reçu 31 865 € en 2021 → 19 970 € calculés pour
  17 846 € dus ; représentant ayant reçu 40 000 € → 86 044 € pour ≈ 79 261 €. Aucun écart pour les
  enfants, ascendants, frères et sœurs, neveux et l'abattement handicap (même abattement à l'acte et
  au décès). L'abattement utilisé à l'acte n'est pas saisi : à déduire du lien au jour de la donation.
- **Écran de gestion des libéralités** (`Liberalites.tsx`) : affiche la valeur brute des biens légués,
  sans la pondération des droits du testateur appliquée par le calcul (#12).

**Audit complet du 2026-10-12 (2e passe)** — constats reproduits sur scénarios chiffrés (moteur
réel), non corrigés. Données en base : 2 donations à des enfants, `duh_opte` faux partout, aucun
legs, aucune récompense ni créance, aucun emprunt, aucun pacte Dutreil, mais 1 actif « Parts de GFA,
GAF, GFV et GFR » et 1 « Parts de groupements fonciers » (#17).

- **#14 DUH attribué aux autres héritiers.** `index.ts` (§5.9bis) retire la valeur du DUH de ce que
  reçoit le conjoint et l'ajoute aux autres héritiers. Or le DUH s'impute sur les droits du conjoint
  (C. civ. art. 765) : il le reçoit, et les enfants recueillent le logement grevé (DUH = 60 % de
  l'usufruit, art. 762 bis CGI). Scénario (1/4 PP, 2 enfants, RP 400 000 €, conjoint de 64 ans) :
  base de chaque enfant 344 438 € → 388 526 €, droits 50 532 € → 59 791 €, alors qu'ils devraient
  rester inchangés. Seul effet légitime : exclure la valeur du DUH (droit viager) du reçu au 2nd décès.
- **#15 Légataire particulier taxé au prorata de l'assiette globale.** Sa `civilShare` (legs / actif
  net) lui fait partager l'abattement de 20 % de la RP, l'exonération Dutreil ou les frais funéraires
  sur des biens qu'il ne reçoit pas, et lui impute une part du forfait mobilier. Scénario : legs de
  100 000 € de liquidités à un neveu, RP de 400 000 € → base 83 700 € + forfait 4 200 €, droits 43 963 €
  pour 50 618 € (hors forfait) ; l'écart est reporté sur les héritiers. L'application du forfait
  mobilier à un légataire particulier de sommes d'argent reste à faire confirmer par un notaire.
- **#16 Biens ruraux, GFA, bois et forêts jamais exonérés.** `Asset.isBoisForetOuGF` n'est jamais
  renseigné (`dmtgAssets`) : « Bois & forêts », « Parts de groupements fonciers » et « Parts de GFA,
  GAF, GFV et GFR » sont taxés à 100 %. Exonérations ignorées : art. 793-1-3° et 793-2-2° (bois et
  groupements forestiers, 3/4, engagement de gestion) ; art. 793 bis (GFA, biens ruraux à bail à long
  terme : 75 % jusqu'à 600 000 € par bénéficiaire, 50 % au-delà, LF 2025). La branche existante
  (75 % sans seuil) ne convient pas au 793 bis. Conditions non saisies : à qualifier par bien, jamais
  présumées. Scénario (GFA de 500 000 €, 1/4 PP, 2 enfants) : 17 457 € de droits par enfant, 0 € si
  l'exonération s'applique. Dossier réel concerné (#17).
- *#16 soldé le 2026-10-13 : cf. §2 « Biens ruraux, groupements fonciers, bois et forêts ».*
- **#17 Données réelles touchées par #16 (saisie à faire)** : 1 actif « Parts de GFA, GAF, GFV et GFR », 1 « Parts de
  groupements fonciers » (nature ambiguë : forestier, agricole ou immobilier — à requalifier).
- *#18 soldé le 2026-10-14 (phase B de l'audit des classes d'actifs) : cf. §2 « Dutreil ».*
- **#19 Liquidation du régime au 1er décès absente du patrimoine du survivant au 2nd.** Récompenses,
  créances entre époux, créance de participation et réintégration Ciot modifient la 1re succession,
  mais `buildSurvivingSpousePatrimony` / `buildSpouseOwnBasePatrimony` n'en portent pas la
  contrepartie (récompense de 60 000 € due par le 1er défunt : −30 000 € sur sa succession, jamais
  +30 000 € sur celle du survivant). De même, le passif du 2nd décès (`passifLinesBrut`) garde un
  emprunt déjà remboursé par l'assurance décès du 1er défunt.
- **#20 Assurance emprunteur sans assuré.** `buildPassifLines` déduit `capital_garanti_deces` quel que
  soit l'époux décédé : au décès du conjoint, un emprunt assuré sur la seule tête de l'Utilisateur est
  quand même réduit. Le formulaire (`PassifEmpruntForm.tsx`) n'a qu'un capital garanti, sans assuré.
- **#21 Communauté universelle.** Depuis le retrait des clauses (2026-09-22), une communauté
  universelle avec attribution intégrale est liquidée comme une communauté ordinaire (50 % au 1er
  décès), sans aucun avertissement dans Transmission ; le résultat affiché est alors sans rapport avec
  la réalité (rien ne passe aux enfants au 1er décès, art. 1524).


**Audit des classes d'actifs du 2026-10-14** — chaque nature d'actif confrontée à son régime
successoral. Données en base : aucun actif de prévoyance décès ni article 82.

- *N1 et N2 soldés le 2026-10-14 (phase A) : cf. §2 « Prévoyance décès et contrat article 82 hors
  succession ».*
- *N3, N4 et N5 soldés le 2026-10-14 (phase B) : cf. §2 « Forfait mobilier », « Assiette DMTG nette
  du passif » et « Biens ruraux ». N5 se limitait aux donations rurales antérieures : la conservation
  de 5 ans et l'application aux baux antérieurs à 2025 (réponse ministérielle) étaient conformes.*
- *N7, N8 et N11 soldés le 2026-10-14 (phase C1) : cf. §2 « Entreprise individuelle », « Bijoux, objets
  d'art et de collection », « Assurance-vie dont l'assuré n'est pas le souscripteur ».*
- *N6, N9 et N10 soldés le 2026-10-14 (phase C2) : cf. §2 « Stock-options », « Avance sur contrat
  d'assurance-vie », « Régimes de retraite étrangers ». L'audit des classes d'actifs est clos.*
- *Dutreil jamais appliqué en pratique (`eligibilite_validee` jamais enregistrée) : soldé le
  2026-10-14, cf. `docs/societes.md` (éligibilité Dutreil).*
- **`emprunts.asset_id` en `ON DELETE SET NULL`**, en écart avec la règle CASCADE de CLAUDE.md —
  cohérent (supprimer un bien ne doit pas supprimer l'emprunt), à acter comme exception.
- **Typage** : `ProcessusCalcul.tsx` passe des `Asset[]` (`id` optionnel) en `rawAssets`
  (`RawAssetInput.id` requis) — erreur `tsc` préexistante.
- **Typage** : `'date_echeance'` utilisé dans `VALEURS_MOBILIERES_NATURES_CHAMPS` (Produits
  structurés, Autres produits dérivés) sans figurer dans `ValeursMobilieresChamp` (erreur `tsc`).

- **9 des 11 clauses de donation restent purement déclaratives.** `nature`, `demembrement`,
  `droitsParDonateur`/`prise_en_charge_droits`, et 9 clauses sur 11
  (inaliénabilité, retour conventionnel, exclusion/inclusion de communauté, administration spéciale,
  obligation d'emploi, gestion d'un bien démembré, usufruit réservé, usufruit successif, délivrance à
  terme) sont saisis dans `DonationForm.tsx`, stockés, mais **jamais lus par le moteur**
  (`reserve.ts`/`transmission/index.ts`), confirmé exhaustivement par le Bloc 4. Un conseiller qui coche
  « Dispense de rapport » voit son choix pris en compte (§2), mais qui coche une des 9 autres clauses
  obtient un résultat civilement identique à une donation sans clause, sans aucun avertissement. (La
  réserve d'usufruit du donateur n'est pas en cause : le bien s'impute pour sa valeur en pleine
  propriété au décès, référentiel §8.6.2, ce que fait déjà le moteur.) *(Vérifié toujours ouvert.)*
- **Enfant renonçant sans descendance, tenu au rapport par stipulation expresse (art. 845), non compté
  dans N.** `buildSouchesEnfants` ([successionLegale.ts:330-384](src/lib/transmission/successionLegale.ts))
  ne couvre que 3 des 4 catégories d'enfants comptés pour le barème de réserve (vivants, décédés
  représentés, renonçants représentés) — un renonçant sans descendance mais tenu au rapport par une
  clause antérieure disparaît purement et simplement du compte N, faussant le barème de réserve/QD
  (ex. N=2 au lieu de N=3, QD passant de 1/4 à 1/3 de la masse). *(Vérifié toujours ouvert : aucun champ
  sur `Person`/`Liberalite` ne porte cette stipulation.)*
- **Attribution préférentielle du logement (art. 831-2) non implémentée — diagnostiquée, chantier arrêté
  avant codage.** Toute la chaîne de calcul de `src/lib/transmission/` est construite sur un modèle
  **value-based** de bout en bout : `Liberalite.valeur` est un nombre, jamais une référence à un bien
  précis ; `civilShares[].fraction` répartit une seule masse résiduelle tous biens confondus. Il n'existe
  aujourd'hui aucun mécanisme d'attribution d'un actif spécifique à un héritier déterminé (avec soulte
  si sa valeur dépasse sa part théorique) — une implémentation partielle qui ajouterait la valeur du
  logement au `cashDu` du conjoint sans la retirer du pool des autres, ou sans calculer la soulte due
  aux autres héritiers, produirait un résultat civilement faux (double comptage ou absence de
  compensation). *(Vérifié toujours absent : décision explicite de ne pas coder une version simplifiée,
  cf. `audit-transmission-attribution-preferentielle-2026-08.md`. Chantier à part entière, avec sa
  propre phase de conception, pas un correctif ponctuel.)*
- ~~Passif « Bien propre »/« Bien personnel » toujours déduit à 100 % quel que soit son détenteur
  réel~~ — **corrigé le 2026-08-27.** `PassifLine` porte désormais `detenteur`,
  `pourcentage_utilisateur`, `pourcentage_conjoint` ([transmissionHelpers.ts](src/utils/transmissionHelpers.ts)),
  alimentés par `buildPassifLines` depuis les colonnes déjà existantes des tables `passifs`/`emprunts`
  (aucune migration nécessaire). `buildPatrimonySnapshot` pondère un passif `Bien propre`/
  `Bien personnel`/`Indivision` via `getPartSuccessorale` (même fonction que pour les actifs) au lieu du
  fallback `?? 1`, via `getFractionPassifParDetenteur`. *(Depuis 2026-09-23 : passif
  `Bien commun` à 50 %, cf. §2 ; seule la qualification absente/`À qualifier` reste à 100 %.)*
  Vérifié sur 3 cas concrets (passif propre détenu par le conjoint → 0 € déduit du défunt simulé ;
  détenu par l'utilisateur → 100 % déduit ; indivision 30/70 → 30 % déduit) ; suite de tests
  `empruntsPassif.branchement.test.ts` toujours au vert. *(Mise à jour 2026-09-22 : le paramètre
  `partConjointInegal`/`getFractionPassifAjustee`, qui appliquait la symétrie d'une clause de partage
  inégal sur ce passif, a été retiré avec tout le catalogue de clauses — voir
  [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md). Aucun
  appelant réel ne passait de valeur non nulle pour ce paramètre, donc aucun changement de
  comportement.)*

### 🟠 À surveiller (cas limite, peu probable)
- **Réserve d'usufruit réversible au conjoint.** Au décès du donateur, l'usufruit passe au conjoint
  (exonéré : droits inchangés), mais le nu-propriétaire n'entre en jouissance qu'au décès du conjoint —
  décalage non modélisé dans le net affiché.
- **Conditions de l'exception de valorisation « à l'acte » pour une donation-partage jamais vérifiées.**
  Le référentiel autorise la valeur à l'acte pour une donation-partage (§8.4) sous deux conditions
  (accord de tous les héritiers réservataires, allotissement de tous) ; le code accepte
  `typeImputation === "partage"` sans aucun contrôle de ces conditions — par effet de bord, cela
  coïncide numériquement avec le comportement correct pour une donation-partage régulière, mais rien ne
  garantit que les conditions légales sont réellement réunies.
- **Cas d'imputation particuliers non modélisés** : donation à un petit-enfant hors régime
  transgénérationnel (art. 847 — traité correctement par effet de bord du gating générique
  non-réservataire → QD, pas par une règle explicite) ; présomption de donation déguisée pour une vente
  à un successible en ligne directe (art. 918 — le module ne modélise que des `Liberalite` explicitement
  typées, aucune requalification automatique d'une vente).
- **Donation sans date certaine** (don manuel non enregistré) : aucun champ ne la distingue d'une
  donation notariée ; la règle « imputée après toutes les autres donations » (§8.6.3) n'a donc aucun
  support de données pour être appliquée.
- **RAAR (renonciation anticipée à l'action en réduction, art. 930-1) totalement absente** — ni champ de
  saisie, ni effet dans `applyReductions`, même à supposer le champ ajouté. Pertinent pour les montages
  de transmission d'entreprise ou enfant vulnérable que le référentiel cite lui-même comme cas d'usage
  typique.
- **Droits accessoires du conjoint mentionnés en texte mais sans calcul chiffré complet** (conversion
  d'usufruit, DUH, droit de jouissance temporaire — §2) : le conseiller voit une mention narrative dans
  les explications, mais aucun montant résultant de ces mécanismes n'entre dans le calcul du net à
  recevoir. Risque de confusion si l'utilisateur interprète la mention comme un calcul déjà intégré.
- *[caduc 2026-09-22]* L'alerte texte de retranchement (art. 1527, avantages matrimoniaux au profit
  d'enfants non communs) et le catalogue de clauses dont elle dépendait (`matrimonialClauses.ts`,
  `soumisRetranchement`) ont été retirés avec tout le catalogue de clauses — voir
  [docs/regimes-matrimoniaux-clauses-v1-retire.md](regimes-matrimoniaux-clauses-v1-retire.md). Le
  chiffrage de ce mécanisme (modéliser une contestation entre le conjoint survivant et des enfants
  non communs, comparaison à la portion de l'art. 1094-1) reste une limite à traiter dans la
  reconstruction.
- **Droits et taxes annexes du frais de notaire non couverts** (enregistrement acte de notoriété 25 €,
  taxe de publicité foncière + contribution de sécurité immobilière 0,10 % pour l'attestation
  immobilière) : `computeNotaryFees` calcule l'émolument (correct au centime, vérifié valeur par valeur)
  et un poste `débours` générique explicitement illustratif, mais pas ces montants légalement fixes.
- **`hasSurvivingSpouse` toujours binaire pour les cas les plus rares** (mariage posthume, séparation de
  corps avec clause de renonciation expresse) — la séparation de corps simple est désormais distinguée
  (commit `c65fa6b`, §2), mais ces deux cas plus rares n'ont toujours aucune façon d'être saisis, ce qui
  compterait à tort le conjoint comme héritier successible dans ces situations exceptionnelles.
- **Champs DMTG `retourLegal`/`retourConventionnel`/`reversionUsufruitExoneree`/`liberaliteGraduelleResiduelle`
  fonctionnellement morts par absence de producteur.** La logique de consommation existe et fonctionne
  (`dmtg/assets.ts:19-26`), mais `exclurePour` n'est construit qu'à `{}` aux 3 seuls points de
  construction d'un `Asset` DMTG (`index.ts:620/637/653`) — aucune UI ne permet de faire remonter l'un
  de ces flags à `true`.
- **`valueDismemberedRight`/`Asset.demembrement` supprimés (17/09/2026), code mort confirmé sans aucun
  appelant.** Cette fonction et ce champ (gestion démembrement viager/temporaire dédiée à l'assiette
  DMTG générique) n'étaient invoqués nulle part — `computeDMTG` ne les référence jamais. La pondération
  démembrement d'un actif successoral se fait en réalité en amont, via `getFractionDemembrement`
  (`lib/patrimoine/demembrementFraction.ts`) appliquée avant construction de l'`Asset` DMTG (correctif
  IB1, cf. `docs/patrimoine.md`) : ce chemin-là fonctionne et est testé. `valueDismemberedRight` était
  un reliquat antérieur à ce correctif, jamais retiré ni jamais branché. Retiré avec ses tests dédiés
  (`assets.test.ts`), vérifié sans impact (0 appelant en dehors de son propre fichier et de ses tests,
  1036 tests restants inchangés).

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **Petit-neveu, petite-nièce** : `lienFiscalLegataire` les rattache aux neveux (`includes('neveu')`),
  soit 7 967 € d'abattement au lieu de 1 594 € (l'art. 779 V ne vise que les neveux et nièces) ; même
  test dans `verifier790G`/`verifier790ABis`, alors qu'un petit-neveu n'est éligible que par
  représentation.
- **Code mort fiscal** : branches Corse (art. 1135 bis, `location` toujours `'metropole'`) et
  monuments historiques (art. 795 A) jamais alimentées.
- **Forfait mobilier** : les lignes synthétiques négatives (récompense due par le défunt, créance de
  participation due) réduisent son assiette, alors qu'il se calcule avant déduction du passif.
- `fiscal.ts` cite l'art. A444-121 pour l'attestation immobilière : c'est l'art. A444-59.

- Chargement des données Transmission encore dupliqué : `Succession2ndDeces.tsx` et
  `ComparaisonOptionsConjoint.tsx` partagent `loadTransmissionData` / `buildOrdreNormalBase`
  ([transmissionOrdreNormal.ts](src/utils/transmissionOrdreNormal.ts)), mais `Synthese.tsx` et
  `ProcessusCalcul.tsx` gardent leur propre copie des requêtes et de la construction du contexte du
  1er décès, qui peut diverger.
- Distinction « dépense nécessaire » indépendante de « dépense qualifiante » réduite à 2 branches au
  lieu des 4 cas légaux de l'art. 1469 pour le calcul des récompenses (`computeMontantRecompense`,
  [recompensesCreances.ts](src/lib/patrimoine/recompensesCreances.ts) — moteur côté Patrimoine, cf.
  `docs/patrimoine.md`) ; le cas « nécessaire seule, non qualifiante » n'est pas représentable dans le
  schéma actuel.
- Intérêts sur récompenses (art. 1473) et règles de prélèvement/insuffisance de communauté (art.
  1471-1472) non implémentés — montants calculés « à la liquidation », sans capitalisation ni
  vérification que la masse commune peut effectivement désintéresser l'époux créancier.
- `assets.financement_mixte_apport_propre` ne crée pas automatiquement de ligne `recompenses`
  correspondante — étape manuelle non rappelée à l'utilisateur au moment de la saisie de l'actif.
- Rattachement automatique financement mixte → récompense : documenté comme étape manuelle dans le
  commentaire de colonne, mais rien dans l'UI ne le rappelle à l'utilisateur.
- ~~Barème art. 669 CGI dupliqué entre `lib/patrimoine/bareme669CGI.ts` et
  `lib/transmission/index.ts::getDemembrementPct`~~ — plus d'actualité (audit du 17/09/2026) :
  `getDemembrementPct` lit `DEFAULT_DMTG_PARAMS.demembrementViager`, lui-même dérivé de
  `BAREME_669_CGI` à l'exécution depuis le correctif ID1 (`docs/patrimoine.md`). Source unique
  confirmée, pas de duplication.
- Pluralité d'usufruitiers sans stipulation de part : le code retient l'âge du plus jeune usufruitier
  pour tout le bien (`bareme669CGI.ts::getTrancheBaremeForYoungest`), au lieu du partage fictif par part
  décrit au référentiel — divergence jamais confrontée en détail au texte.
- Quasi-usufruit, tontine, testament formel (validité/révocation/cantonnement), recel successoral,
  présent d'usage comme catégorie de libéralité distincte : absence totale confirmée, décision de
  périmètre déjà actée (non retenus pour un audit dédié par la cartographie).
- Indivision successorale : gestion pendant l'indivision (règles de majorité, mandataire, convention),
  droits des créanciers de l'indivision, et méthode de liquidation en 3 temps (comptes d'indivisaire,
  indemnité d'occupation, créances entre indivisaires, §18.4) — absence totale, hors du périmètre du
  correctif P14 qui portait uniquement sur le pourcentage de détention.
- `IndivisairesSection.tsx` : le message « Total des parts : devrait être 100 % » est structurellement
  trompeur, l'utilisateur lui-même n'étant jamais représenté dans la liste des co-indivisaires (le total
  correct des *autres* indivisaires est `100 % − part de l'utilisateur`, jamais 100 %).

## 4. Périmètre V1 / différé

- **V1 — en place** : dévolution légale complète (4 ordres, fente successorale sur les 4 rangs,
  représentation, option du conjoint 1/4 PP vs usufruit total, PACS et concubinage exclus de la
  dévolution légale) ; réserve/QD avec barème 1/2-2/3-3/4 ; imputation et réduction des libéralités avec
  ordre légal (legs puis donations, plus récente vers plus ancienne, réduction proportionnelle) ; rapport
  des libéralités avec exclusion correcte du conjoint et gestion des clauses dispense/rapport
  forfaitaire ; partage entre héritiers avec droits du conjoint plafonnés à la QD, rapport en valeur et
  indemnités de réduction (art. 758-5, 758-6, 858) ; indivision successorale avec tiers (pourcentage réel, P14) ; fiscalité DMTG avec forfait
  mobilier 5 %, rappel 15 ans, exonération frère/sœur, frais de notaire écrêtés.
- **Différé, décisions explicitement documentées** :
  - **Attribution préférentielle du logement et tout partage en nature** — nécessite d'introduire pour
    la première fois un concept d'attribution en nature dans un moteur entièrement value-based ;
    chantier à part entière avec sa propre phase de conception, arrêté avant codage plutôt que livré en
    version simplifiée fausse (§3).
  - **Clauses de donation autres que dispense/rapport forfaitaire** (9 sur 11) — juridiquement
    identifiables mais purement cosmétiques ; brancher chacune suppose un arbitrage produit au cas par
    cas (ex. retour conventionnel, usufruit successif).
  - **RAAR, droit de retour (père/mère, frères/sœurs), option successorale (acceptation
    à concurrence de l'actif net), droits accessoires du conjoint autres que les 3 mentions narratives
    ajoutées** — absences confirmées individuellement par les audits Bloc 1/2, non triviales à
    implémenter (suivi temporel post-décès, notion de dettes personnelles des héritiers), à trancher
    comme V1/V2 explicites.
  - **Gestion de l'indivision pendant sa durée et méthode de liquidation en 3 temps** (comptes
    d'indivisaire, indemnité d'occupation) — hors du périmètre d'un outil de simulation au moment du
    décès ; P14 (le pourcentage de détention lui-même) est en revanche corrigé.
  - **Retranchement (art. 1527)** — reste une alerte texte sans calcul, le champ `soumisRetranchement`
    reste non lu ; correction de F18/§2.6 n'a pas traité ce chapitre, resté hors périmètre du Bloc 5.
  - **Démembrement au-delà du barème 669 CGI et du DUH légal du conjoint** (audit dédié du 17/09/2026,
    contre 4 référentiels Fidroit) — confirme et complète la dette déjà actée côté Patrimoine
    (`docs/patrimoine.md` §4) : présomption de propriété de l'art. 751 du CGI (usufruit du défunt sur un
    bien dont la nue-propriété appartient à ses héritiers présomptifs, réputé pleine propriété
    successorale sauf preuve contraire) ; quasi-usufruit et dette de restitution comme passif DMTG
    déductible ; usufruit successif/réversion (usufruit « en second ») ; renonciation à usufruit
    (abdicative 125 € vs translative, DMTG) ; démembrement de titres de société (qualité d'associé
    réservée au nu-propriétaire, répartition résultat courant/exceptionnel). Aucun de ces points n'est
    codé, ni ici ni côté Patrimoine — décision de périmètre V1 cohérente entre les deux modules plutôt
    qu'un vide silencieux propre à Transmission. La conversion d'usufruit en rente/capital (art. 759-762)
    reste, elle, partiellement couverte : message informatif correct (`index.ts:670-693`) mais sans
    montant chiffré ni droit fixe de 125 €.
  - **Participation aux acquêts en cas de divorce** — `computeParticipationAcquets()`
    ([participationAcquets.ts](src/lib/patrimoine/participationAcquets.ts)) calcule la créance de
    participation (art. 1571) elle-même indépendamment de la cause de dissolution ; ce n'est pas la
    formule qui manque au divorce mais tout ce qui l'entoure côté transmission : elle n'est aujourd'hui
    consommée que par `computeTransmission`, un moteur de succession/DMTG qui simule un décès (cf. §1),
    et aucun module de simulation de divorce n'existe dans l'outil — ni pour ce régime, ni pour aucun
    autre (le moteur de récompenses/créances entre époux a la même portée, décès uniquement). Construire
    ce chantier reviendrait à créer une nouvelle surface produit (écran de liquidation « qui doit quoi à
    qui » à la date de l'ONC, sans lien avec la succession/DMTG) plutôt qu'à corriger un calcul existant
    — hors périmètre décidé d'un outil de gestion de patrimoine centré sur la transmission, pas la
    liquidation de divorce.
  - **Assurance-vie x participation aux acquêts — pas de mécanisme automatique dédié, décision actée.**
    Contrairement aux régimes de communauté (`computeAVReintegrationCivile`,
    [transmissionHelpers.ts](src/utils/transmissionHelpers.ts), doctrine Ciot §9.6.1, réintègre
    civilement un contrat non dénoué financé par des deniers communs), aucun mécanisme équivalent
    n'existe pour la PAA. Ce n'est pas un trou : un contrat d'assurance-vie peut déjà être saisi
    manuellement comme ligne de `patrimoine_originaire`/`patrimoine_final`
    (sélecteur d'actifs générique, `PatrimoineOriginaireSection.tsx`/`PatrimoineFinalSection.tsx`, aucune
    nature exclue) et sera alors pris en compte tel quel par `computeParticipationAcquets` — à condition
    que le conseiller y porte la bonne valeur selon la date de souscription (avant/pendant mariage),
    l'origine des deniers ayant financé les versements (originaires ou acquêts) et le caractère
    dénoué ou non du contrat (doctrine Fidroit, tableau croisé à 6 cas). Automatiser ce calcul en plus
    de cette saisie manuelle créerait un risque de double-comptage dans la créance de participation :
    rien dans le schéma actuel (pas de flag sur `patrimoine_originaire.bien_concerne_id`/
    `patrimoine_final.bien_concerne_id`) n'empêcherait qu'un contrat déjà repris manuellement en ligne
    de patrimoine soit également réintégré par un calcul automatique dérivé de `avContracts`. Décision :
    documentation seule (pas de nouveau code) — le chemin de saisie manuelle existant est suffisant et
    correct s'il est bien appliqué ; à revisiter uniquement si une automatisation prouve qu'elle peut
    coexister avec la saisie manuelle sans risque de doublon (ex. exclusion des assets AV du sélecteur
    dès qu'un calcul auto existe, ou détection de doublon sur `bien_concerne_id`).
  - **Clause de détermination des acquêts nets — dérogation à l'art. 1575 (dettes déductibles du
    patrimoine final), décision actée.** Le doc Fidroit (§4.7) décrit une clause limitant les dettes
    déductibles du patrimoine final aux seules dettes relatives à des biens encore présents dans ce
    patrimoine final (dérogation au principe par défaut : toute dette existant à la dissolution est
    déductible, y compris celle d'un bien déjà aliéné). L'implémenter correctement suppose de savoir,
    pour chaque dette, si le bien qu'elle finance est resté dans le patrimoine final ou a été aliéné —
    donnée qui n'existe nulle part dans le modèle PAA actuel : `patrimoine_originaire`/
    `patrimoine_final` n'ont ni notion de passif distincte de l'actif (une dette ne peut être
    représentée qu'en détournant `valeur` en négatif, sans validation ni garde-fou), ni lien
    structurel dette↔bien-financé, ni statut aliéné/conservé. Le seul lien dette↔bien qui existe dans
    le repo (`emprunts.asset_id`, module Patrimoine général) vit dans des tables totalement séparées,
    jamais croisées par `computeParticipationAcquets`. Correction : nécessiterait un chantier de
    modélisation à part entière (nouveaux champs, migration, UI de liaison dette↔bien, statut
    aliéné/conservé), pas un simple branchement de clause — décision actée de ne pas la coder
    tant que ce chantier de modélisation n'a pas sa propre conception validée, plutôt que de livrer
    une case à cocher sans effet réel ou un calcul approximatif.
  - **Droits et taxes annexes du frais de notaire** (enregistrement, taxe de publicité foncière/CSI) et
    **écrêtement complet incluant les émoluments de formalités** — l'écrêtement de l'attestation
    immobilière est corrigé, mais une décomposition complète des émoluments de formalités individuels
    reste à faire pour un écrêtement rigoureux à 100 %.
  - **Suivi temporel post-décès** (délai d'option 10 ans, présomption d'option pour l'usufruit,
    remariage postérieur, redressement IFI, procédure de déclaration) — non pertinent pour un outil qui
    ne modélise qu'un instant T, cohérent sur l'ensemble du module plutôt que traité chapitre par
    chapitre.
  - **Cantonnement de l'émolument du conjoint survivant (art. 1094-1 al. 2 C. civ.).** Repéré le
    2026-09-17 lors d'un contrôle croisé côté module Famille (référentiels Royal Formation sur les
    régimes matrimoniaux) : en présence d'une donation entre époux, le conjoint survivant peut choisir
    de cantonner son émolument sur une partie seulement des biens dont il a été disposé en sa faveur,
    le surplus profitant alors aux autres successibles (souvent les enfants) sans être traité comme une
    libéralité de sa part (fiscalité CGI art. 788 bis : biens réputés transmis à titre gratuit par le
    défunt, pas par le conjoint). Aucune trace dans le code : ni dans `ConjointOption`
    ([lib/transmission/types.ts](src/lib/transmission/types.ts), qui ne porte que le choix 1/4 PP vs
    usufruit total), ni ailleurs. Rattaché à ce module (pas à Famille) car c'est un choix exercé par le
    conjoint survivant au moment du décès simulé, comme `ConjointOption` — pas une donnée du contrat de
    mariage. Non traité à ce jour, aucune conception commencée.
