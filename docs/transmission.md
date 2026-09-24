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
| Synthèse | [Synthese.tsx](src/components/transmission/Synthese.tsx) | Résultat consolidé du 1er décès : dévolution, part de chaque héritier, net à recevoir, fiscalité |
| Processus de calcul | [ProcessusCalcul.tsx](src/components/transmission/ProcessusCalcul.tsx) | Détail pédagogique des étapes de liquidation (masse de calcul, réserve/QD, imputation, réduction, rapport) + tableau et fiches « Détail par héritier » (succession + donations antérieures + assurance-vie, façon étude notariale) |
| 2nd décès | [Succession2ndDeces.tsx](src/components/transmission/Succession2ndDeces.tsx) | Chaînage : simule le décès du conjoint survivant à partir du patrimoine reçu au 1er décès |
| Assurance-vie | [AssuranceVie.tsx](src/components/transmission/AssuranceVie.tsx) | Contrats hors succession civile, taxation 990 I / art. 757 B séparée |
| Donations & legs | `DonationForm.tsx`, `LegsForm.tsx`, [Liberalites.tsx](src/components/transmission/Liberalites.tsx) | Saisie des libéralités consommées par le moteur de liquidation |

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
  orchestre l'ensemble, y répartit le **cash réellement disponible** par héritier (§6bis, « rapport en
  moins prenant »), puis appelle `computeDMTG` (`lib/dmtg/`) pour la fiscalité par bénéficiaire.
- **Option du conjoint face aux enfants.** Sans DDV (art. 757) : 1/4 PP ou 100 % usufruit si tous
  les enfants sont communs, 1/4 PP imposé dès qu'un enfant ne l'est pas. Avec DDV (art. 1094-1) :
  les quatre options (`quart_pp`, `usufruit_total`, `quart_pp_3quarts_us`, `qd_pp`) sont ouvertes
  quelle que soit la filiation, conformément à ce que propose déjà `Optimisation.tsx`. En présence
  d'un enfant non commun et d'une option comportant de l'usufruit, un message informatif rappelle
  la faculté de conversion de l'art. 1098, non exercée d'office (les parts restent celles de
  l'option choisie). Tests : `lib/transmission/ddvEnfantNonCommun.test.ts`.
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
  décès, `addReunifiedFullOwnership` ajoute la PP reçue au patrimoine de l'Utilisateur veuf et
  `computeChainedTransmission` réunit l'usufruit hors taxation. Sans l'option (2nd décès de l'ordre
  normal), aucun survivant. Récompenses, créances et participation aux acquêts suivent déjà le sens
  du décès (`decedentRole`). Limites restantes : contrats d'assurance-vie et libéralités du conjoint
  non modélisés dans sa succession ; conjoint sans enfant renseigné non modélisable. Tests :
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
  La valeur au **partage** (art. 860, distincte du décès), elle, n'est toujours pas capturée
  séparément — limite documentée, cf. §3 (T3).
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
- **« Rapport en moins prenant » pour la répartition du cash réel** (`index.ts`, §6bis, commit `e341c98`,
  suite au diagnostic `audit-transmission-clamp-double-masse-2026-08.md` et à la conception
  `design-rapport-moins-prenant-2026-08.md`) — corrige l'absence de masse d'exercice distincte pour le
  conjoint (art. 758-5). Le diagnostic avait établi que le clamp `Math.max(0, partFinale)` suspecté
  était **mathématiquement mort** (jamais déclenché : identité algébrique `liberalitesMaintenues −
  rapportTotal ≥ 0` toujours vraie) ; le vrai bug était que `civilShares.fraction` (qui répartit à la
  fois le cash civil affiché et l'assiette fiscale DMTG — un seul point de correction pour les deux)
  était calculée sur la masse théorique totale (`partFinale`, donation antérieure comprise) plutôt que
  sur le résiduel réellement disponible. `partFinale` reste la part théorique totale ; une nouvelle
  fraction `cashReparti` exclut désormais ce qu'un héritier détient déjà via une donation rapportable
  maintenue. **Ambiguïté légale tranchée explicitement** : quand le résiduel réel ne suffit pas à
  couvrir plusieurs héritiers simultanément sous-dotés (le référentiel ne donne aucune clé pour ce cas
  précis, cf. `design-rapport-moins-prenant-2026-08.md` §1.2), le code répartit au prorata des montants
  dus par chacun et affiche un avertissement explicite (« approximation … à confirmer par le notaire »)
  plutôt que de présenter un résultat figé comme définitif — arbitrage produit assumé, pas un défaut.
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
- **Forfait mobilier (art. 764 CGI, 5 % du taxable) sans réglage pour le désactiver — limitation
  connue, non corrigée.** `dmtg/assets.ts:7` expose un paramètre `inventaireNotarieProduit` qui met le
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
  pondéré comme l'actif du même régime (cf. point suivant).
- **Pondération du passif (`getFractionPassifParDetenteur`, `utils/transmissionHelpers.ts`).**
  `Bien commun` → 50 % ; `Bien propre`/`Bien personnel`/`Indivision` → détenteur ou quote-part via
  `getPartSuccessorale` (défunt = Utilisateur) ou `getPartConjointSuccession` (défunt = conjoint) ;
  qualification absente/`À qualifier` → 100 % (prudence, jamais devinée). Appliqué au 1er décès
  (`buildPatrimonySnapshot`) comme côté conjoint (`buildSurvivingSpousePatrimony`,
  `buildSpouseOwnBasePatrimony`, qui reprenaient auparavant tout le passif brut à 100 %, dettes propres
  du 1er défunt comprises). Tests : `lib/transmission/phase4aAudit.test.ts`.
- **Assurance-vie : 990 I et 757 B (`dmtg/assurance-vie.ts`).**
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

## 3. Dette identifiée

### 🔴 Bloquant (peut fausser un calcul montré au client)


- **La valeur au jour du partage (art. 860) n'est jamais capturée séparément, donc l'indemnité de
  réduction n'est jamais réévaluée entre le décès et le partage** (finding T3, art. 924-2).
  `applyReductions` ([reserve.ts:209-306](src/lib/transmission/reserve.ts)) calcule une réduction unique
  au décès ; `computeRapport` la réintègre **brute** dans la masse à partager
  ([reserve.ts:372](src/lib/transmission/reserve.ts)), sans appliquer la formule de réévaluation
  `indemnité_partage = valeur_partage × (indemnité_décès / valeur_décès)`. Conséquence directe et
  documentée de la décision T1 (§2) : le champ unique `Liberalite.valeur` ne porte, au mieux, que la
  valeur au décès — jamais celle au partage. Sur l'exemple du référentiel (donation hors part, valeur
  décès 175 000 €, valeur partage 250 000 €, réduction 75 000 € au décès), l'indemnité réintégrée reste
  75 000 € au lieu des 107 143 € dus — écart de 32 143 € sur la masse à partager, au détriment de tous
  les héritiers autres que le débiteur de l'indemnité. *(Vérifié toujours ouvert au 2026-08-27 :
  `reserve.ts` ne contient aucune formule de réévaluation ; le commit `bf7bc00` a explicitement
  documenté ce point comme dette V2 plutôt que de le corriger.)*
- **9 des 11 clauses de donation restent purement déclaratives.** `nature`, `demembrement`,
  `droitsParDonateur`/`prise_en_charge_droits`, `realiseePar`/`realise_par`, et 9 clauses sur 11
  (inaliénabilité, retour conventionnel, exclusion/inclusion de communauté, administration spéciale,
  obligation d'emploi, gestion d'un bien démembré, usufruit réservé, usufruit successif, délivrance à
  terme) sont saisis dans `DonationForm.tsx`, stockés, mais **jamais lus par le moteur**
  (`reserve.ts`/`transmission/index.ts`), confirmé exhaustivement par le Bloc 4. Un conseiller qui coche
  « Dispense de rapport » voit son choix pris en compte (§2), mais qui coche une des 9 autres clauses —
  notamment un usufruit réservé sur une donation, qui devrait s'imputer « en assiette » et non en pleine
  propriété — obtient un résultat civilement identique à une donation sans clause, sans aucun
  avertissement. *(Vérifié toujours ouvert.)*
- **Imputation « en assiette » d'une libéralité en usufruit hors part jamais modélisée** (référentiel
  §8.6.2, exemple chiffré à 29 100 € d'écart entre les deux méthodes). Le champ `demembrement` de
  `DonationForm.tsx` (Aucun / Réserve d'usufruit / Réserve d'usufruit réversible) est stocké mais absent
  de `LiberaliteRow` ([transmissionHelpers.ts:29-38](src/utils/transmissionHelpers.ts)) — jamais transmis
  au calcul. Toute libéralité est donc traitée comme une valeur en pleine propriété, quel que soit le
  démembrement réel déclaré. *(Vérifié toujours ouvert.)*
- **QDS entre époux (art. 1094-1) et combinaison QDO/QDS absentes.** `computeReserveAndQD`
  (`reserve.ts`) ne calcule qu'une quotité disponible ordinaire unique ; toute libéralité au conjoint,
  y compris une donation de la totalité en usufruit qui devrait échapper à toute réduction (QDS
  couvrant l'intégralité de l'usufruit), est imputée comme n'importe quelle autre libéralité sur la QDO
  — un résultat civilement faux dans ce cas précis (réduction déclenchée à tort). *(Vérifié toujours
  ouvert : aucune branche liée au bénéficiaire conjoint dans `computeReserveAndQD`/`imputeLiberalites`.)*
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
- **Double masse du conjoint : ambiguïté résolue par une approximation proportionnelle, pas une règle
  légale explicite** (§2) — quand plusieurs héritiers sont simultanément sous-dotés, le référentiel ne
  fournit aucune clé de répartition ; le code applique un prorata aux montants dus avec avertissement
  explicite. Comportement assumé et documenté, mais reste une approximation à confirmer par le notaire
  dans ce cas précis, pas un résultat légalement figé.
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
  forfaitaire ; répartition du cash réel par « rapport en moins prenant » (art. 858, masse d'exercice du
  conjoint) ; indivision successorale avec tiers (pourcentage réel, P14) ; fiscalité DMTG avec forfait
  mobilier 5 %, rappel 15 ans, exonération frère/sœur, frais de notaire écrêtés.
- **Différé, décisions explicitement documentées** :
  - **Attribution préférentielle du logement et tout partage en nature** — nécessite d'introduire pour
    la première fois un concept d'attribution en nature dans un moteur entièrement value-based ;
    chantier à part entière avec sa propre phase de conception, arrêté avant codage plutôt que livré en
    version simplifiée fausse (§3).
  - **Réévaluation de l'indemnité de réduction au partage (art. 924-2, T3)** — suppose de capturer une
    troisième valeur par libéralité (au partage, distincte de l'acte et du décès) et, plus largement, de
    faire évoluer `PatrimonySnapshot` d'un instant T unique vers deux dates distinctes ; documenté comme
    dette V2 explicite dans le code lui-même (commit `bf7bc00`), pas silencieusement absorbé.
  - **Clauses de donation autres que dispense/rapport forfaitaire** (9 sur 11) — juridiquement
    identifiables mais purement cosmétiques ; brancher chacune suppose un arbitrage produit au cas par
    cas (ex. usufruit réservé nécessite l'imputation « en assiette », elle-même non modélisée).
  - **RAAR, QDS entre époux, droit de retour (père/mère, frères/sœurs), option successorale (acceptation
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
