# Idées de côté — Pulse

Ce fichier recense les fonctionnalités **volontairement non construites** pour l'instant : rien n'est cassé, on choisit juste de ne pas les développer maintenant. À distinguer de la dette technique (documentée séparément dans les audits Transmission), qui elle correspond à du code existant mais imparfait.

Format par entrée : quoi / pourquoi pas maintenant / condition de réactivation.

---

## Pays du premier domicile matrimonial / Loi applicable au régime matrimonial

- **Quoi** : deux champs dans Famille → Régime matrimonial, retirés de l'affichage. Mise à jour 2026-09-16 (simplification V1) : l'alerte de conseil `extraneite_regime_matrimonial` qui les lisait a également été retirée (les deux colonnes `marital_status.loi_applicable_regime` / `pays_premier_domicile_matrimonial` restent en base, plus aucun code ne les lit ni ne les écrit).
- **Pourquoi pas maintenant** : n'ont d'utilité que pour les couples mariés à l'étranger ou avec patrimoine dans plusieurs pays. Clientèle actuelle quasiment sans dimension internationale.
- **Condition de réactivation** : un dossier client concret avec une dimension internationale (mariage à l'étranger, conjoint étranger, patrimoine à l'étranger) le justifie — réintroduire le champ de saisie *et* l'alerte ensemble.

---

## Scénarios de changement de régime matrimonial

- **Quoi** : carte masquée dans l'écran Régime matrimonial (code conservé, condition d'affichage réversible). Masquage géré par le flag `SHOW_SCENARIOS_REGIME = false` — pour réactiver, repasser ce flag à `true`.
- **Pourquoi pas maintenant** : simuler un changement de régime dans le dossier de référence n'a pas de sens tant qu'il n'existe pas de dossier "sandbox" séparé pour poser des hypothèses sans toucher au dossier réel du client.
- **Condition de réactivation** : construction du dossier sandbox (comparaison dossier initial / dossier hypothèses).

---

## Alerte de conseil n°16 — changement de régime avant donation (abus de droit L. 64 LPF)

- **Quoi** : règle `changement_regime_proche_donation` retirée du moteur d'alertes
  (`src/lib/alertes/regles.ts`) le 2026-09-16. Elle ne s'était jamais déclenchée en pratique :
  la table `scenarios_regime` qu'elle lit n'a jamais eu de formulaire pour l'alimenter
  (`createScenarioRegime()` non appelée depuis aucun écran). Le service
  (`scenarioRegimeService.ts`) et le hook (`useScenariosRegime.ts`) sont conservés tels quels,
  simplement débranchés du moteur d'alertes.
- **Pourquoi pas maintenant** : construire l'écran de saisie manquant est une fonctionnalité
  nouvelle, hors périmètre d'une passe de simplification V1.
- **Condition de réactivation** : ajouter un écran de saisie des changements de régime
  matrimonial (réalisés ou envisagés) sur la fiche client, puis rebrancher la règle depuis
  l'historique git (dernière version avant retrait : commit du 2026-09-16, "simplification V1
  module Famille").

## Champs `family_links.est_dirigeant` et `family_profiles.nom_jeune_fille`

- **Quoi** : deux champs retirés le 2026-09-16 (simplification V1). `est_dirigeant` sur
  `family_links` n'avait jamais été exposé dans un formulaire (colonne écrite par aucun code
  applicatif, valeur toujours `false`/défaut en base) ; colonne supprimée. `nom_jeune_fille` sur
  `family_profiles` avait un champ de saisie fonctionnel dans `FicheClientForm.tsx` mais aucun
  moteur ne le lisait ; colonne supprimée après vérification qu'aucune ligne en base n'était
  renseignée.
- **Pourquoi pas maintenant** : aucun moteur (fiscalité, transmission, alertes) n'en a besoin
  aujourd'hui.
- **Condition de réactivation** : `est_dirigeant` sur `family_links` — si un moteur a besoin de
  savoir qu'un membre de la famille (au-delà du client/conjoint, déjà couverts par
  `family_profiles`/`marital_status`) dirige une entreprise. `nom_jeune_fille` — si un document
  généré (courrier, acte) a besoin du nom de naissance du client.

## 13 clauses de contrat de mariage purement déclaratives

- **Quoi** : retirées le 2026-09-17 (simplification V1, module Famille) du catalogue
  [matrimonialClauses.ts](../src/constants/matrimonialClauses.ts) et du type `ClauseType`
  ([types/matrimonial.ts](../src/types/matrimonial.ts)) : `administration_conjointe`,
  `apport_franc_et_quitte`, `separation_de_dettes`, `apport_plafonne`, `dissolution_alternative`,
  `simplification_preuve`, `evaluation_biens`, `attribution_preferentielle`,
  `modification_recompenses`, `exclusion_certains_biens`, `exclusion_reprise`, `renonciation`,
  `indexation`. Toutes avaient `assietteImpactee: 'aucune'` (ou une absence de ligne
  référentielle pour les trois dernières, marquées « À regarder ») : aucun moteur de calcul ne
  les lisait, elles ne faisaient que documenter l'acte sans effet chiffré sur la qualification
  des biens, la succession ou la transmission. `useMatrimonialClauses.ts` étant entièrement
  générique (piloté par `CLAUSES_BY_REGIME`), aucun composant n'avait de logique spécifique à
  retirer. Si des valeurs existent déjà en base sous ces clés dans `marital_status.clauses_contrat`
  (JSON), elles restent stockées mais ne s'affichent plus (même pattern que les autres retraits
  d'UI du module, upsert partiel).
- **Pourquoi pas maintenant** : ces cases alourdissaient l'écran de saisie (jusqu'à 15 clauses
  par régime) pour un client sans jamais influer sur un montant montré au conseiller — risque
  d'induire en erreur (cocher une clause en pensant qu'elle change un calcul). Croisement avec
  les référentiels Royal Formation (contrat de mariage, clauses) du 2026-09-17 : aucune de ces
  clauses n'avait de calcul identifiable à construire à court terme, certaines n'ayant même pas
  de ligne dans le référentiel juridique déjà cité par le code.
- **Condition de réactivation** : au cas par cas, si un dossier client réel nécessite de
  documenter l'une de ces clauses (ex. rédaction d'acte), ou si un moteur de calcul est construit
  pour l'une d'entre elles (ex. `modification_recompenses` ↔ moteur de récompenses, déjà repéré
  comme piste dans `docs/famille.md` §3). Réintroduire la clause depuis l'historique git (dernière
  version avant retrait : commit du 2026-09-17, « simplification V1 module Famille »).

<!-- Nouvelle entrée : copier le format ci-dessus -->
