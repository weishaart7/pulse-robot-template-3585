# Module Sociétés

> Audit de fond produit le 2026-08-27, **de zéro** (aucun audit préexistant pour ce module — même
> situation que `docs/immobilier.md`). Méthode : lecture intégrale des 33 fichiers du périmètre déclaré
> (pages, composants, hooks, services, moteur `lib/societes/`), plus les fichiers liés découverts en
> cours de route (`src/hooks/useSocietes*.ts`, `src/lib/patrimoine/societeTransfer.ts`,
> `src/components/patrimoine/PatrimoineActifs.tsx`, `src/constants/assetTypes.ts`), lecture du schéma
> réel en base via le MCP Supabase (`list_tables`/`execute_sql` sur le projet `npypkocowjkszxtecxzq`,
> FK, RLS, triggers interrogés directement, pas déduits des seuls types TypeScript générés), et
> `git log --oneline` sur les fichiers du périmètre pour dater les décisions. Les seules données réelles
> en base au moment de l'audit : 2 lignes `societes`, 4 actifs `assets` cochés `transfert_societe`.
> Toute valeur citée comme « en base » a été vérifiée par requête directe le 2026-08-27.

## 1. Vue d'ensemble

Le module Sociétés gère les structures détenues par l'utilisateur (holdings, SCI, sociétés
d'exploitation…) : identité juridique, quotités de détention, gouvernance, comptes, dividendes,
valorisation, participations croisées entre sociétés du foyer, stratégies d'optimisation fiscale et
transmission des parts. Il est le seul module de patrimoine à avoir un moteur métier dédié sous
`src/lib/societes/`, avec un test unitaire (`participations/graph.test.ts`) — un pas de plus vers le
pattern `lib/ifi/`/`lib/patrimoine/` demandé par `CLAUDE.md`, mais très incomplet (§2, §3).

**Écrans** (`SocietesSection.tsx`, 5 onglets + un mode formulaire plein écran) :

| Onglet | Composant | Rôle |
|---|---|---|
| Synthèse (défaut) | [SocietesSynthese.tsx](src/components/societes/SocietesSynthese.tsx) | KPI (nombre, valeur, rentabilité, trésorerie), répartition par type/régime, alertes (clôture proche, CCA important, bilan absent/ancien), IFI et valeur successorale agrégés |
| Mes sociétés | [SocietesMesSocietes.tsx](src/components/societes/SocietesMesSocietes.tsx) → [SocieteParticipationsGraph.tsx](src/components/societes/SocieteParticipationsGraph.tsx) | Graphe de détention société→société (React Flow), suppression avec avertissement d'impact sur les participations |
| Associés & gouvernance | [SocietesGouvernance.tsx](src/components/societes/gouvernance/SocietesGouvernance.tsx) | Table de capitalisation (« associés »), dividendes agrégés par bénéficiaire, pacte d'associés, comptes courants d'associés |
| Stratégies fiscales | [SocietesStrategiesFiscales.tsx](src/components/societes/strategies/SocietesStrategiesFiscales.tsx) + [SocietesStrategies.tsx](src/components/societes/SocietesStrategies.tsx) (non monté, cf. §3) | Simulateurs IS/IR, rémunération/dividendes, gain holding (régime mère-fille) |
| Transmission des parts | [SocietesTransmission.tsx](src/components/societes/transmission/SocietesTransmission.tsx) | Pacte Dutreil (éligibilité, économie DMTG), simulation OBO, renvoi vers le module Transmission |

Le formulaire société (créer/modifier) est en mode page pleine largeur avec ses propres onglets
(Synthèse à venir / Informations / Finances / Bilans / Actifs détenus), piloté par
[SocietesSection.tsx](src/pages/societes/SocietesSection.tsx). **Un second point d'entrée existe en
parallèle** : [SocieteFormPage.tsx](src/pages/societes/SocieteFormPage.tsx), une route indépendante
(`/societes/form`) avec sa propre sidebar et sa propre logique de sauvegarde — dupliquée à l'identique
en esprit mais avec un comportement différent (§2, §3).

**Tables Supabase** : `societes` (dénomination, quotités, qualification civile, valeur/pourcentage IFI,
identité SIRENE, régime fiscal, 6 champs comptables « snapshot »), et 8 tables filles toutes en
`societe_id → societes(id) ON DELETE CASCADE` : `societe_dividendes`, `societe_valorisations`,
`societe_bilans`, `societe_associes`, `societe_pactes`, `societe_comptes_courants`, `societe_dutreil`,
`societe_participations` (+ `societe_mere_id`/`societe_fille_id`, également `CASCADE`). `societes.user_id
→ auth.users(id) ON DELETE CASCADE` confirmé en base — conforme à `CLAUDE.md`.

**Flux clés** :
- Une société est créée manuellement (recherche SIRENE optionnelle) avec qualification civile et
  détenteur saisis **à la main** (§2, §3 — friction Patrimoine↔Sociétés n°1, toujours ouverte).
- Cocher « Transférer vers la liste d'actifs » à la création crée un actif Patrimoine en parallèle —
  **sans lien retour** (`societe_id`) et **sans `qualification_bien`** (§2, §3 — friction n°2, toujours
  ouverte, et pire que documenté dans `docs/patrimoine.md`).
- Symétriquement, cocher « Transfert dans Sociétés » sur un actif Patrimoine crée une société
  automatiquement (`src/lib/patrimoine/societeTransfer.ts` + `PatrimoineActifs.tsx`) — cette société créée
  n'a, elle non plus, ni `qualification_bien` ni `detenteur` au moment de sa création.
- Les participations société → société (graphe de détention) sont une table dédiée
  (`societe_participations`), avec anti-cycle et anti-cross-user **appliqués côté base** par trigger
  (`check_societe_participation_integrity`), en plus du garde-fou côté client (`lib/societes/participations`).
- L'IS, l'IFI et le rendement de dividendes sont chacun calculés à **plusieurs endroits
  indépendants**, avec des résultats potentiellement différents pour la même société (§3).

## 2. Architecture & décisions

- **Moteur `src/lib/societes/`, mais partiel.** [impotSocietes.ts](src/lib/societes/impotSocietes.ts)
  (13 lignes) est la seule fonction pure de calcul fiscal du module ; le reste de la logique de graphe
  vit dans `lib/societes/participations/` (`graph.ts`, `layout.ts`, `types.ts`) et
  `buildSocieteParticipationGraph.ts`. Contrairement à `lib/patrimoine/`, il n'existe **aucune** fonction
  pure pour l'IFI, la valeur successorale de la société ou le régime mère-fille : ces calculs sont
  dispersés dans des hooks (`useSocietesIntegration.ts`) et des composants (§3).

- **Graphe de participations, bien conçu et le seul point du module réellement testé.**
  [graph.ts](src/lib/societes/participations/graph.ts) calcule les chemins de détention indirecte par
  DFS avec garde-fou anti-cycle en mémoire (`path.includes`), agrège plusieurs chemins vers une même
  cible sans double-compte (vérifié par `graph.test.ts`, 7 cas dont chemins multiples et
  sur-déclaration > 100 %), et **ne plafonne jamais artificiellement à 100 %** — un choix documenté
  (`depasse100` signale sans corriger). `computeNodeDepths` ([layout.ts](src/lib/societes/participations/layout.ts))
  fait un BFS multi-sources pour la position verticale du graphe React Flow. Le trigger Postgres
  `check_societe_participation_integrity` (vérifié en base) referme la boucle : il refuse en base un
  lien qui créerait un cycle ou traverserait deux utilisateurs différents, en plus du DFS anti-cycle
  côté client — défense en profondeur réelle, pas seulement déclarée en commentaire.

- **`buildSocieteParticipationGraph.ts` calcule un signal différent du graphe indirect** :
  `pourcentageEntrantDirect` (somme des participations **directes** entrantes d'une société, tous
  chemins confondus) sert uniquement à détecter visuellement une incohérence de saisie simple
  (plusieurs mères déclarant ensemble > 100 % d'une même fille, badge rouge sur le nœud) — ce n'est
  **pas** le calcul de détention économique effective en cascade (`computeTotalParticipation`), qui
  n'est utilisé nulle part dans l'UI du graphe (seule `graph.test.ts` l'exerce). Le graphe affiché à
  l'utilisateur ne montre donc que les pourcentages directs, jamais un pourcentage de détention
  économique consolidée — écart entre un moteur de calcul plus riche que ce que l'écran en restitue.

- **Trois implémentations indépendantes du lien Patrimoine ↔ Sociétés**, non harmonisées :
  1. **Actif → Société** ([PatrimoineActifs.tsx:26-52](src/components/patrimoine/PatrimoineActifs.tsx)),
     `syncSocieteFromAsset` : si `transfert_societe` est coché sur un actif éligible
     (`isSocieteEligibleNature`, [societeTransfer.ts](src/lib/patrimoine/societeTransfer.ts)) et qu'aucun
     `societe_id` n'existe déjà, crée une société et **relie l'actif** (`societe_id`). Ne transmet ni
     `qualification_bien` ni `detenteur` à la société créée.
  2. **Société → Actif, chemin `SocieteFormPage.tsx`** ([SocieteFormPage.tsx:63-79](src/pages/societes/SocieteFormPage.tsx)) :
     à la création d'une société avec « Transférer vers la liste d'actifs » coché, crée un actif via
     `useAssets().createAsset` avec seulement `nature`, `denomination`, `valeur_estimee`,
     `date_estimation`, `detenteur: 'user'` (**valeur figée, ignore le détenteur choisi dans le
     formulaire**), `mode_detention: 'Pleine propriété'`. **Aucun `societe_id`** n'est renseigné sur cet
     actif : le lien retour n'existe pas.
  3. **Société → Actif, chemin `SocietesSection.tsx`** ([SocietesSection.tsx:96-103](src/pages/societes/SocietesSection.tsx)) :
     même déclencheur, mais via `assetService.createAsset` directement, avec `nature`, `denomination`,
     `valeur_estimee`, `etablissement` — **pas de `detenteur` du tout** (ni `'user'` ni celui du
     formulaire) et, là aussi, **aucun `societe_id`**.
  Les trois chemins ont chacun leur propre logique de mapping des champs, aucun ne délègue à
  `lib/societes/formMapping.ts`, et seul le chemin (1) referme la boucle avec un lien base de données
  exploitable. Les chemins (2) et (3) créent un actif Patrimoine **orphelin** (jamais retrouvable
  depuis la fiche société, jamais resynchronisé par `syncQualificationToLinkedAsset`, cf. ci-dessous)
  à chaque société créée avec la case cochée — deux sociétés dans les données réelles ont ce
  comportement (cf. §3).

- **Synchronisation qualification société → actif, unidirectionnelle et seulement sur `update`.**
  [societeService.ts:51-82](src/services/societeService.ts) — `syncQualificationToLinkedAsset` pousse
  `qualification_bien`/`detenteur`/`pourcentage_utilisateur`/`pourcentage_conjoint` de la société vers
  l'actif lié (`assets.societe_id = societe.id`) à chaque `societeService.update()`, mais **jamais à la
  création** (`societeService.create()` ne l'appelle pas) et jamais dans l'autre sens. N'agit que si
  exactement un actif est lié ; ignore silencieusement (avec `console.warn` en DEV) s'il y en a
  plusieurs. Combiné à la duplication ci-dessus, un actif créé sans `societe_id` (chemins 2 et 3) ne
  sera **jamais** synchronisé, quel que soit le nombre de sauvegardes ultérieures de la société.

- **Deux sources de données comptables distinctes et non synchronisées pour une même société** :
  les 6 champs « snapshot » sur `societes` (`chiffre_affaires`, `resultat_net`, `tresorerie_disponible`,
  `compte_courant_associes`, `reserves`, `date_dernier_bilan`, saisis onglet Finances via
  [SocieteFinancesComptables.tsx](src/components/societes/finances/SocieteFinancesComptables.tsx)) et la
  table `societe_bilans` (historique par exercice, saisi onglet Bilans via
  [SocietesBilans.tsx](src/components/societes/bilans/SocietesBilans.tsx)). Rien ne les relie ni ne les
  recopie l'un vers l'autre (§3).

- **RLS complète et vérifiée en base** sur `societes` et les 8 tables filles : chacune a des policies
  `auth.uid() = user_id` par opération, `societes.user_id` a bien sa FK `ON DELETE CASCADE` vers
  `auth.users`. Défense en profondeur applicative (filtre `user_id` en plus des RLS) **inégale** :
  `societeParticipationService`, `societeExtendedService`, `societeValorisationService`,
  `societeDividendeService` l'ont (durcis par le commit `ea3a695` du 2026-08-27, même audit que
  Patrimoine) ; **`societeService.ts` (le service central du module — `getAll`, `getById`, `update`,
  `delete`) ne l'a pas** : aucun de ces quatre appels n'ajoute `.eq('user_id', ...)`, à la différence de
  `assetService` sur le même périmètre. Le risque réel reste faible (RLS correctes), mais c'est une
  incohérence de méthode au sein du module lui-même, pas seulement par rapport à Immobilier.
  [SocieteFinancesEmprunts.tsx](src/components/societes/finances/SocieteFinancesEmprunts.tsx) et
  [SocieteActifsDetenus.tsx](src/components/societes/actifs/SocieteActifsDetenus.tsx) interrogent
  directement `supabase.from('emprunts'|'assets')` sans passer par un service, également sans filtre
  applicatif — même schéma que `useImmobilierPropertyForm.ts` documenté dans `docs/immobilier.md`.

- **`societe_associes` (table de capitalisation) porte un mécanisme de détention société→société
  concurrent de `societe_participations`, mais mort.** Le schéma prévoit `societe_associee_id` (une
  société peut être elle-même un « associé » d'une autre) et `family_link_id` (rattachement à un membre
  de la famille), mais [SocietesGouvernance.tsx](src/components/societes/gouvernance/SocietesGouvernance.tsx:157-179)
  n'expose dans son formulaire que `nom_libre`, `nombre_titres`, `pourcentage`, `nature_detention`,
  `detention_directe` — ni `societe_associee_id` ni `family_link_id` ne sont jamais renseignables ni
  affichés (le libellé de repli « Lié famille », ligne 140, s'affiche pour n'importe quel associé sans
  `nom_libre`, quel que soit le membre de famille réellement rattaché, puisque ce rattachement n'est
  jamais fait). Confirmé en base : `societe_associes` est vide (0 ligne). Le graphe de détention
  société→société actif dans l'UI est donc exclusivement `societe_participations` — `societe_associes`
  et son champ `societe_associee_id` forment un second modèle de la même idée, non câblé, sans FK
  déclarée sur `societe_associee_id`/`family_link_id`/`associe_id`/`dirigeant_family_link_id`
  (contrairement à `societe_id`, systématiquement `CASCADE`).

- **`impotSocietes.ts` a été écrit pour unifier un calcul dupliqué, mais l'ancien site n'a jamais été
  rebranché.** Le commentaire en tête du fichier ([impotSocietes.ts:1-4](src/lib/societes/impotSocietes.ts))
  indique explicitement que la fonction reprend la formule de `SocieteFinancesImpactFiscal.tsx`
  « jusqu'ici dupliquée de façon incohérente ailleurs ». `git log` confirme que `impotSocietes.ts` et son
  seul appelant actuel ([SocietesStrategiesFiscales.tsx](src/components/societes/strategies/SocietesStrategiesFiscales.tsx))
  ont été ajoutés ensemble dans le même commit — mais `SocieteFinancesImpactFiscal.tsx` (préexistant)
  n'a pas été modifié pour importer `computeImpotSocietes` : il recalcule l'IS avec la même formule
  recopiée en dur ([SocieteFinancesImpactFiscal.tsx:41-48](src/components/societes/finances/SocieteFinancesImpactFiscal.tsx)).
  Le refactor visé par le commentaire est donc resté à mi-chemin (§3).

- **`SocietesStrategies.tsx` : composant complet, jamais monté.** `grep` sur `src/` ne trouve aucun
  import de `SocietesStrategies` en dehors de sa propre définition ;
  [SocietesSection.tsx](src/pages/societes/SocietesSection.tsx) route l'onglet « Stratégies fiscales »
  exclusivement vers `SocietesStrategiesFiscales` (fichier différent, dans `strategies/`). Les deux
  composants ne se recoupent pas totalement en contenu (`SocietesStrategies` a un onglet IFI et un
  onglet Holding informatif absents de `SocietesStrategiesFiscales`) — ce n'est pas un doublon strict
  mais une fonctionnalité développée (onglet IFI dédié, liste des holdings) puis rendue inaccessible.

## 3. Dette identifiée

> Session de correction du 2026-08-27 : les 6 bloquants 🔴 listés dans une version antérieure de cette
> section ont été traités (voir détail ci-dessous). Deux d'entre eux touchaient une règle fiscale non
> triviale et ont été arbitrés explicitement avant codage (taux réduit IS PME, régime mère-fille) ; un
> troisième touchait un composant partagé avec Patrimoine/Immobilier (`AssetForm.tsx`) et a été corrigé
> sur arbitrage explicite plutôt que différé. Découverte annexe traitée dans la foulée (hors liste
> initiale, cf. note en fin de sous-section) : la comparaison `regime_fiscal === 'IS'/'IR'` de
> `SocieteFinancesImpactFiscal.tsx` ne correspondait à aucune valeur réellement stockée en base
> (toujours le libellé complet `"Impôt sur les sociétés"`/`"Impôt sur le revenu"`), rendant la carte IS
> invisible en production — corrigée pour rendre les autres corrections de cette section observables.

### 🔴 Bloquant — traité

- **Taux réduit IS PME appliqué sans aucune vérification d'éligibilité — corrigé, taux normal par
  défaut.** `impotSocietes.ts::computeImpotSocietes(resultat, chiffreAffaires, eligiblePME)` : le taux
  normal (25 %) s'applique par défaut. Le taux réduit PME ne s'applique que si les 2 conditions sont
  réunies : CA < 10 M€ (vérifié automatiquement, champ déjà présent) **et** la case « Éligible au taux
  réduit IS PME » cochée explicitement sur la fiche société (capital libéré et détention ≥ 75 % par des
  personnes physiques — non modélisables automatiquement, aucun champ en base pour ces 2 conditions ;
  nouveau champ `societes.eligible_taux_reduit_pme boolean not null default false`, migration
  `20260827000000_add_eligible_taux_reduit_pme_societes.sql`). La case seule ne suffit pas : cochée avec
  un CA ≥ 10 M€, le taux normal s'applique quand même (garde-fou). Les simulateurs génériques de
  `SocietesStrategiesFiscales.tsx` (IS vs IR, holding), qui ne portent pas sur une société réelle et n'ont
  donc ni CA ni case à vérifier, conservent l'ancien comportement (taux réduit supposé) via l'appel sans
  paramètre CA.
- **Duplication du calcul d'IS — corrigée.** `SocieteFinancesImpactFiscal.tsx` appelle désormais
  `computeImpotSocietes(resultat_net, chiffre_affaires)` au lieu de recalculer l'IS en dur ; les deux
  écrans (fiche société, onglet Stratégies fiscales) partagent la même implémentation.
- **Double calcul divergent de la valeur IFI — corrigé.** `SocieteFinancesImpactFiscal.tsx` et
  `useSocietesIntegration.ts::useSocietesIFI` appliquent désormais la même règle : `valeur_ifi` (si
  saisie manuellement) ou `valeur_estimee × pourcentage_ifi / 100` sert de valeur taxable à l'échelle de
  la société, **toujours** multipliée ensuite par la quotité de détention du foyer
  (`pourcentage_utilisateur + pourcentage_conjoint`). Nécessitait aussi de faire remonter
  `pourcentage_utilisateur`/`pourcentage_conjoint` jusqu'à `SocieteFinancesImpactFiscal.tsx`, absents du
  `formData` construit par [SocietesSection.tsx:203-220](src/pages/societes/SocietesSection.tsx) avant ce
  correctif (la carte IFI de la fiche société aurait sinon affiché 0 € pour toute société une fois la
  pondération ajoutée).
- **KPI de la Synthèse ignorant `societe_bilans` — corrigé.** `SocietesSynthese.tsx` charge désormais le
  dernier exercice de `societe_bilans` par société (`societeBilanService.listAllForUser`, nouvelle
  méthode) et l'utilise en repli pour `caTotal`/`resultatTotal`/`tresoTotale` quand le snapshot
  `societes` correspondant est vide. `ccaTotal` reste lu uniquement depuis le snapshot : `societe_bilans`
  ne porte pas de colonne CCA équivalente.
- **Régime mère-fille déclenché sans participation réelle — corrigé.**
  `SocietesStrategiesFiscales.tsx` (simulateur Holding) exige désormais au moins une ligne
  `societe_participations` avec `pourcentage ≥ 5` entre deux sociétés de l'utilisateur pour afficher un
  gain estimé ; l'hypothèse de dividendes (3 % de la valeur estimée) ne porte plus que sur les filiales
  effectivement identifiées comme telles. Conservation des titres ≥ 2 ans et option formelle restent non
  vérifiées (pas de champ en base) — signalé par un texte « simulation simplifiée ». Le taux de 12 % sur
  plus-values de titres de participation reste hors calcul, uniquement descriptif dans
  `SocietesStrategies.tsx` (non monté, cf. §2) — inchangé, non couvert par ce bloquant.
- **Double transfert Immobilier + Sociétés sans exclusion mutuelle — corrigé.**
  [AssetForm.tsx:241-296](src/components/assets/AssetForm.tsx) : cocher l'une des deux cases
  (« Transfert dans Immobilier » / « Transfert dans Sociétés ») décoche désormais automatiquement
  l'autre, avec une mention explicite dans chaque description quand les deux cases coexistent pour la
  nature choisie. Correction faite dans `AssetForm.tsx`, composant partagé avec Patrimoine/Immobilier,
  sur arbitrage explicite (plutôt que différée à un audit croisé séparé). **Les 4 lignes déjà en base
  avec double transfert (`transfert_societe = true` ET `transfert_immobilier = true`) n'ont pas été
  corrigées rétroactivement** — cette correction empêche le cas de se reproduire, elle ne nettoie pas les
  données existantes (hors périmètre d'une correction ciblée ; à traiter si besoin comme une migration de
  données distincte, avec vérification préalable des lignes orphelines par société comme l'exige
  `CLAUDE.md`).

### Découverte annexe traitée

- **`SocieteFinancesImpactFiscal.tsx` comparait `regime_fiscal` à `'IS'`/`'IR'`, valeurs qui n'existent
  jamais en base.** `regime_fiscal` stocke toujours le libellé complet (`"Impôt sur les sociétés"` /
  `"Impôt sur le revenu"`, confirmé en base et dans `SocieteForm.tsx`). Les sections « IS estimé » et
  « IR » de la carte Impact fiscal ne s'affichaient donc **jamais** en production, quel que soit le
  régime réel de la société — ce qui rendait les deux premiers bloquants ci-dessus invisibles à l'écran
  malgré un calcul sous-jacent correct. Comparaison corrigée pour utiliser les libellés réels.

### 🟠 À surveiller (cas limite, peu probable)

- **Friction Patrimoine↔Sociétés n°1 confirmée toujours ouverte : la qualification civile d'une société
  est purement manuelle.** `SocieteForm.tsx` réutilise `QUALIFICATION_OPTIONS` de
  `lib/patrimoine/qualification.ts` ([SocieteForm.tsx:12,676-712](src/components/societes/SocieteForm.tsx))
  mais n'appelle jamais `qualifierBien()` : l'utilisateur choisit une valeur dans une liste, sans lien
  avec le régime matrimonial ou l'origine des fonds ayant financé les parts. Contrairement aux actifs
  Patrimoine (recalcul automatique tant que `qualification_auto = true`), une société ne se
  requalifie jamais automatiquement si le régime matrimonial change en amont (module Famille).
- **Friction Patrimoine↔Sociétés n°2 confirmée toujours ouverte, et aggravée par l'absence de lien
  retour (§2).** Un actif créé depuis le formulaire société (chemins 2 et 3, `SocieteFormPage.tsx` /
  `SocietesSection.tsx`) n'a pas de `qualification_bien` — `getPartSuccessorale()` lèvera
  `BienNonQualifieError` dès qu'un module aval (Transmission, ou `SocietesTransmission.tsx` lui-même
  pour la société d'origine) tentera de calculer sa part successorale, tant que l'utilisateur n'aura pas
  ouvert et complété manuellement cet actif dans Patrimoine. `SocietesTransmission.tsx` gère cette
  erreur proprement côté société (bandeau explicite avec message d'action, pas de crash — bon point,
  cf. §2/ligne 120-125), mais l'actif orphelin lui-même n'a aucun signal équivalent dans l'UI Patrimoine
  au-delà du bandeau générique `IncompleteAssetsBanner` (documenté limité dans `docs/patrimoine.md`).
- **Simulateurs IS/IR et rémunération/dividendes de `SocietesStrategiesFiscales.tsx` avec des
  approximations non documentées à l'écran.** `totalIR = computeIR(resultat * 0.9) + resultat * 0.17`
  ([SocietesStrategiesFiscales.tsx:46](src/components/societes/strategies/SocietesStrategiesFiscales.tsx))
  et `chargesSociales = remu * 0.45` (ligne 53) sont des coefficients forfaitaires (charges sociales
  TNS/assimilé, CSG/CRDS) sans source citée ni avertissement « simulation simplifiée » — à la différence
  du bloc IS/IR de `SocietesStrategies.tsx` (non monté, cf. §2) qui, lui, affiche explicitement ce
  disclaimer. Un utilisateur consultant uniquement l'onglet actif (`SocietesStrategiesFiscales`) n'a
  aucun signal que ces simulations sont volontairement approximatives.
- **`societe_associes` (table de capitalisation) et `societe_participations` (graphe) peuvent diverger
  silencieusement pour représenter la même réalité.** Rien n'empêche de déclarer, pour une société,
  100 % de parts dans la table de capitalisation (`societe_associes`, badge « Total : 100 % » dans
  Gouvernance) tout en ayant une participation entrante différente dans `societe_participations` (graphe
  affiché dans Mes sociétés) — les deux tables ne sont pas croisées ni comparées.
- **`societeService.ts` (service central du module) sans filtre `user_id` applicatif**, à la différence
  des quatre autres services du module durcis par le commit `ea3a695` du même jour. RLS toujours en
  place et vérifiées correctes en base — risque réel faible, incohérence de méthode au sein même du
  module.
- **`impotSocietes.ts`, `formMapping.ts`, `buildSocieteParticipationGraph.ts` et `layout.ts` ne sont
  couverts par aucun test**, alors qu'ils portent une partie du calcul fiscal (IS) et de la conversion
  de données financières (mapping bidirectionnel `societes` ↔ formulaire). Seul
  `participations/graph.ts` a une suite de tests (`graph.test.ts`, 7 cas).

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **Code mort : `SocietesStrategies.tsx`**, composant complet (onglet IFI détaillé + liste des holdings)
  jamais monté, cf. §2.
- **`SocieteActifsDetenus.tsx` classe mal les biens immobiliers détenus par une société**, faute de
  synchronisation avec la nomenclature réelle : la liste locale hardcodée
  ([SocieteActifsDetenus.tsx:23](src/components/societes/actifs/SocieteActifsDetenus.tsx)) utilise
  `'Résidence secondaire'` (singulier) alors que la nature réellement enregistrée en base est
  `'Résidences secondaires'` (pluriel, cf. `assetTypes.ts:4`) — confirmé sur l'actif réel « SCI Les
  Libéllules » (nature `Résidences secondaires`, `societe_id` renseigné), qui apparaît dans la carte
  « Autres actifs détenus » au lieu de « Biens immobiliers détenus ». Sans impact sur les totaux (le
  bien reste compté), uniquement sur le classement affiché.
- **Deux déclarations indépendantes du type `SocieteFormData`** : une dans
  `src/components/societes/SocieteForm.tsx` (locale), une dans `src/lib/societes/formMapping.ts`
  (exportée, censée être la référence depuis sa création — cf. commentaire en tête du fichier). Elles
  sont actuellement identiques champ à champ, mais rien ne les synchronise si l'une évolue.
- **`SocieteFinancesEmprunts.tsx` et `SocieteActifsDetenus.tsx` interrogent Supabase directement**
  (`supabase.from('emprunts'|'assets')`) sans passer par un service applicatif dédié, à la différence du
  reste du module — même écart architectural que documenté pour Immobilier.
- **Libellé de repli « Lié famille » dans la table de capitalisation** (`SocietesGouvernance.tsx:140`)
  s'affiche pour tout associé sans `nom_libre`, indépendamment du membre de famille réel, puisque
  `family_link_id` n'est jamais renseignable dans le formulaire — texte trompeur pour un champ mort
  (cf. §2).
- Warning avisé par le linter Supabase (« Public/Signed-In Can See Object in GraphQL Schema ») sur
  les 8 tables du module : bruit générique lié à l'introspection GraphQL (les RLS restent la protection
  réelle et sont vérifiées correctes), pas une vulnérabilité propre à ce module — non actionnable
  isolément.

## 4. Périmètre V1 / différé

- **V1 — en place** : CRUD société avec recherche SIRENE, quotités de détention et qualification civile
  manuelle, graphe de participations société→société avec anti-cycle base + client, table de
  capitalisation (associés), pacte d'associés, comptes courants d'associés, historique de bilans,
  historique de valorisation, dividendes avec agrégation par bénéficiaire, liaison d'emprunts existants,
  simulateurs IS/IR/holding/Dutreil/OBO à visée pédagogique, transfert bidirectionnel (partiel, cf. §2)
  avec Patrimoine.
- **Différé, déductible du code** :
  - **Éligibilité au taux réduit IS PME** (CA < 10 M€, capital libéré, détention ≥ 75 % par des
    personnes physiques) : le CA est vérifié automatiquement depuis le 2026-08-27, et capital libéré +
    détention par personnes physiques sont couverts par une confirmation explicite de l'utilisateur (case
    à cocher `eligible_taux_reduit_pme`, non cochée par défaut — §3), pas par une vérification
    automatique des deux conditions elles-mêmes (aucun champ dédié en base pour les modéliser
    individuellement).
  - **Régime mère-fille** : le déclenchement du simulateur exige depuis le 2026-08-27 une participation
    réelle ≥ 5 % via `societe_participations` (§3) ; conservation des titres ≥ 2 ans et option formelle
    restent non vérifiées. La **quote-part de 12 % sur plus-values de titres** reste hors calcul, texte
    informatif uniquement dans `SocietesStrategies.tsx` (non monté, §2).
  - **Cotisations sociales TNS et CSG/CRDS réelles** : approximées par des coefficients forfaitaires
    (0,45 / 0,17 / 0,9) dans les simulateurs, sans barème ni source citée.
  - **Distinction Holding animatrice / passive au niveau du calcul IFI détaillé** : le module la
    modélise (`isHoldingAnimatrice`, exonération totale) mais sans vérifier les critères réels
    d'animation (prestations de services aux filiales, immixtion dans la gestion).
  - **`societe_associes.societe_associee_id`/`family_link_id`** : champs de schéma prévus pour relier un
    associé à une autre société de l'utilisateur ou à un membre de la famille, jamais exposés dans le
    formulaire de gouvernance — chantier commencé au niveau du schéma, non poursuivi côté UI (§2).
  - **Onglet « Synthèse » du formulaire société** (`formTab === 'synthese'`) : affiche littéralement
    « Synthèse de la société (à venir) » ([SocietesSection.tsx:187-190](src/pages/societes/SocietesSection.tsx)) —
    gap assumé et signalé par le message lui-même.
- **Hors périmètre de cet audit, signalé comme travail de suivi** : un audit croisé Patrimoine ↔
  Transmission ↔ Sociétés dédié à la duplication des trois chemins de synchronisation actif/société
  (§2) — au minimum, unifier la création d'actif depuis le formulaire société sur le même mécanisme que
  `syncSocieteFromAsset` (lien retour systématique + report de qualification dès la création, pas
  seulement à la première mise à jour).
