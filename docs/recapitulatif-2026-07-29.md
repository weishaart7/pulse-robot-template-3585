# Récapitulatif du projet — 2026-07-29

Sources : historique git (`main`, jusqu'à `2835f30`), `docs/audit-patrimoine-2026-07-28.md`, `docs/audit-recompenses-creances-2026-07-28.md`, lecture directe du code au 2026-07-29.

---

## 1. Ce qui a été fait récemment

### 1.1 Chantier 4 Vague 1 — Récompenses / créances entre époux (dernier chantier clos, PR #1 mergée)

- **Affichage progressif** de la partie évaluation dans les formulaires récompenses/créances (857efe0).
- **Avertissement + blocage** du mode "profit subsistant" quand les données nécessaires manquent (175eccf).
- **Champ `depense_necessaire`** ajouté + implémentation des **4 branches légales de l'art. 1469** (au lieu de 2 approximées avant) — migration `20260729120000_add_depense_necessaire_recompenses.sql` (999a24c).
- **Pré-remplissage assisté** : financement mixte (`assets.financement_mixte_apport_propre`) → suggestion automatique d'une ligne récompense, avant totalement manuel (97e4f9f).
- **Déduction de l'assurance emprunteur** dans le passif transmis à l'Utilisateur : `capital_garanti_deces` prime sur les quotités assurées, clampées `[0,100]`, montant net jamais négatif (00ba091).
- **Audit diagnostic** (sans modification de moteur) du module récompenses/créances — voir §3.

### 1.2 Chantier "emprunts → passif transmission" (clos avant, PR #1)

- Branchement des `emprunts` dans le passif transmis (auparavant seule la table `passifs` alimentait le calcul — un crédit en cours n'était déduit nulle part dans la succession/DMTG/droit de partage).
- `buildPassifLines` fusionne `passifs.montant_du` + `emprunts.capital_restant_du`, exclut les emprunts de société, sur les 4 écrans de transmission (Synthèse, Processus de calcul, 2nd décès, Assurance-vie).
- Correctifs Patrimoine associés (qualification société d'acquêts, concubinage, quote-part d'indivision).

### 1.3 Fiabilisation Transmission (avant ça)

- Droit de partage, imposition distincte, AV non dénouée (Ciot), DIP régime matrimonial.
- Correction détection AV du concubin dans l'alerte `concubin_sans_protection`.
- Correction dépassement de quotité disponible + répartition proportionnelle des legs concurrents.
- Persistance du régime matrimonial lors de la confirmation de purge des clauses incompatibles.

### 1.4 Chantier 4 Vague 3 — 15 alertes de conseil (clôturé)

- Alerte #15 : changement de régime matrimonial avant donation (schéma, formulaire, branchement).
- Champ statut acte/projet sur les donations ; exclusion des legs/donations `statut='projet'` des calculs.

### 1.5 Autres briques livrées

- Société d'acquêts autonome, avantages matrimoniaux, refonte du modèle de clauses (référentiel §12.4).
- Récompenses/créances, participation aux acquêts branchées dans le calcul de succession.
- État descriptif du patrimoine originaire/final.
- Auto-détermination du régime légal par défaut selon la date de mariage.
- **Fix du 2026-07-29** : réapplication de migrations manquantes (`residence_separee`, `origine_fonds`, DIP) + gestion d'erreur sur les détails de contrat AV (462777d).

---

## 2. Dette technique identifiée (consolidée depuis les audits + code actuel)

### 2.1 Ouverte et non corrigée

| Sujet | Détail | Source |
|---|---|---|
| **Désynchronisation base ↔ code** | `marital_status.loi_applicable_regime` / `pays_premier_domicile_matrimonial` lus/écrits par le code mais la migration `20260728110000` n'était pas enregistrée en base au moment de l'audit (28/07). **À reconfirmer** : un fix de réapplication de migrations a été fait le 29/07 (462777d) — vérifier que ces deux colonnes existent bien maintenant. | audit-patrimoine §7.1 |
| **Bug qualification société d'acquêts, détenteur "couple"** | `qualifierBien` reçoit soit le libellé d'affichage `'Le couple'` (matche le test `includes('couple')`), soit la valeur brute BDD `'common'` (ne matche pas) selon l'appelant (`useAssetForm.ts` vs `AssetDetailsDialog.tsx`). Un même bien peut être qualifié différemment selon l'écran. Correctif identifié : utiliser `isDetenteurCommon()` de `utils.ts` partout. | audit-patrimoine §7.4 |
| **Emprunts de société comptés en double dans le patrimoine personnel** | `usePatrimoineCalculations.ts:153` additionne tous les emprunts sans filtrer `societe_id` — déjà corrigé côté Transmission (`buildPassifLines`) le 28/07, **pas** côté Patrimoine. Les deux écrans peuvent afficher un passif différent pour le même patrimoine. | audit-patrimoine §7.6 |
| **Assurance emprunteur du conjoint non déduite au 2nd décès** | Corrigé pour l'Utilisateur (29/07), décision explicite de ne pas le faire pour `buildSurvivingSpousePatrimony`/`buildSpouseOwnBasePatrimony` — reste hors périmètre. | audit-patrimoine §7.6, 7.8 |
| **Récompenses : intérêts (art. 1473)** | Non implémenté — aucun calcul de capitalisation d'intérêts depuis la dissolution/liquidation. | audit-récompenses §4 |
| **Récompenses : prélèvement / insuffisance de communauté (art. 1471-1472)** | Non implémenté — pas de vérification que la masse commune peut effectivement payer les récompenses dues. | audit-récompenses §4 |
| **Récompenses : 4 cas légaux réduits à 2 branches** | La notion de "dépense nécessaire" indépendante de "dépense qualifiante" n'est pas représentable dans le schéma (`nature_depense` ne distingue que qualifiante/autre). *Point partiellement traité depuis* : le chantier du 29/07 a ajouté `depense_necessaire` — **à vérifier si les 4 branches sont désormais réellement toutes couvertes** (le commit 999a24c l'indique, mais pas encore ré-audité). | audit-récompenses §3, §6 |
| **Ratio 50% des récompenses en succession** | Ne gère pas les parts inégales ni l'attribution intégrale — trou identifié, chantier séparé. | audit-patrimoine §7.2 |
| **Clause de communauté au 2nd décès** | Approximation assumée (application post-dissolution). | audit-patrimoine §7.2 |
| **Terrains à bâtir (PVI)** | Aucun champ de distinction ; régime général + surtaxe appliqué systématiquement. | audit-patrimoine §7.2 |
| **Duplication non documentée : barème art. 669 CGI** | Codé dans `lib/patrimoine/bareme669CGI.ts` **et** `lib/transmission/index.ts::getDemembrementPct`, sans justification trouvée dans le code (contrairement aux autres duplications, toutes documentées). | audit-patrimoine §7.3 |
| **Divergence non documentée : part du conjoint** | `usePatrimoineCalculations` la calcule par complément (`1 − userFraction`), `getPartConjointSuccession` la lit directement (`pourcentage_conjoint`) — diverge dès que les deux pourcentages ne somment pas à 100. | audit-patrimoine §7.3 |
| **4 vocabulaires différents pour "qui détient"** | `assets.detenteur`, `asset_charges.debiteur`, `emprunts.contributeur_remboursement`, `assets.licitation_acquereur` utilisent chacun leurs propres valeurs (`user`/`spouse`/`common` vs `Époux 1`/`Époux 2`/`Couple` vs `utilisateur`/`conjoint`/`les_deux`...). | audit-patrimoine §7.4 |
| **Aucune contrainte CHECK en base** | `qualification_bien`, `detenteur`, `sens`, `epoux`, `nature_depense`, `mode_evaluation_conventionnel`, `regime_matrimonial`, `epoux_creancier`/`epoux_debiteur` — fermeture des listes de valeurs assurée uniquement côté UI. | audit-patrimoine §7.6 |
| **`passifService` sans contrôle d'appartenance explicite** | Contrairement à `assetService`, aucun contrôle `user_id` avant `update`/`delete` (repose uniquement sur les RLS Supabase). | audit-patrimoine §7.6 |
| **FK `user_id` manquantes** | `asset_valorisations`, `asset_demembrements`, `asset_indivisaires` : `user_id NOT NULL` mais sans FK vers `auth.users` — écart direct avec la règle `ON DELETE CASCADE` du CLAUDE.md (cascade assurée indirectement via `asset_id` seulement). | audit-patrimoine §7.6 — **contrevient à la règle permanente CLAUDE.md** |
| **Pas d'édition sur 4 tables** | `recompenses`, `creances_entre_epoux`, `patrimoine_originaire`, `patrimoine_final` : services ne supportent qu'ajout/suppression, pas de méthode `update`. | audit-patrimoine §7.6 |
| **Aucune borne sur les quotités d'assurance emprunteur** | Ni le schéma Zod ni le formulaire n'empêchent une valeur >100% ou négative d'être **persistée** (le calcul, lui, clampe désormais `[0,100]` depuis le 28/07). | audit-patrimoine §7.6 |
| **Rechargement systématique sans cache** | `useAssets` refait un `SELECT *` complet à chaque montage — requêtes redondantes si plusieurs composants d'un même écran l'utilisent. | audit-patrimoine §7.6 |
| **`analyzeForTransmission()` double `getFractionAjustee` avec une formule différente** | Peut présenter deux chiffres différents à l'utilisateur pour le même préciput (l'un pondère 50%/démembrement, l'autre non). | audit-patrimoine §7.5 |
| **Rattachement financement mixte → récompense reste déclaratif** | Même après le pré-remplissage assisté du 29/07 (à vérifier si le chantier a rendu la création automatique ou juste suggérée). | audit-récompenses §1.1 |
| **Réévaluation de l'indemnité de réduction au jour du partage (art. 924-2)** | `Liberalite.valeur` ne capture qu'une seule valeur par libéralité (jour de l'acte pour une donation-partage, jour du décès sinon — décision du 2026-08 : relabel du champ existant plutôt que refonte du schéma). La valeur au jour du PARTAGE, distincte, n'est jamais saisie séparément : la formule de réévaluation de l'indemnité de réduction (`indemnité_partage = valeur_partage × indemnité_décès / valeur_décès`, art. 924-2) n'est donc pas implémentée — `computeRapport` réintègre l'indemnité brute (valeur décès) dans la masse à partager. Dette documentée pour la V2. | audit-transmission-bloc1-liquidation-2026-08 §5.3 (T3) |
| **Deux mécanismes de quote-part pour un bien en indivision, non fusionnés (Option 3)** | Le correctif P14 (2026-08) branche `asset_indivisaires` en source de vérité pour calculer `pourcentage_utilisateur`/`pourcentage_conjoint` à la sauvegarde (`useAssetForm.ts`), mais garde les deux mécanismes de saisie séparés : `pourcentage_utilisateur`/`pourcentage_conjoint` (couple, mode "Le couple" en PACS-indivision) d'un côté, `asset_indivisaires` (tiers/famille, mode "Indivision") de l'autre — c'est une écriture cohérente à la source, pas une fusion du modèle. La fusion complète en un modèle unique de quote-part (une seule liste de quotes-parts couvrant utilisateur, conjoint et tiers) reste l'option la plus propre à terme : elle éliminerait cette duplication structurelle, résoudrait à la racine l'incohérence du message "Total des parts" de `IndivisairesSection` (qui ne peut, par construction actuelle, jamais légitimement atteindre 100% puisque l'utilisateur n'y figure pas), et unifierait le cas PACS-indivision (aujourd'hui un 3ᵉ chemin de saisie distinct, cf. `AssetForm.tsx:433-463`). Chantier plus lourd : implique une migration du modèle de données pour tous les actifs déjà qualifiés `'Le couple'` en indivision, et une réécriture des points de lecture actuels (`transmissionHelpers.ts`, `lib/transmission/index.ts`, `SocietesTransmission.tsx`, `usePatrimoineCalculations.ts`). Aucune urgence à le faire avant la V1. | audit-transmission-indivision-2026-08 §3.2 (options 1 et 3) |
| **F18 — branche familiale non dérivée automatiquement de `enfant_de` (Option 3)** | Le correctif F18 (2026-08) rend `branche_familiale` saisissable pour les grands-parents et cousins/cousines (`showBranche` étendu dans `DynamicFamilyForm.tsx`) et ajoute le lien `'Arrière grand-parent'`, aujourd'hui totalement absent, à `availableLinks` (`useFamilyLinkLogic.ts`) — correctif d'accessibilité localisé, fidèle au pattern déjà en place pour `'Oncle/Tante'`. Il ne dérive pas automatiquement la branche depuis le lien de filiation (`enfant_de`) : un grand-parent est déjà rattaché à un `Parent` précis (père ou mère du défunt) via `enfant_de`, ce qui rendrait en théorie la saisie manuelle de `branche_familiale` redondante si l'ordre de saisie des parents (ou une information de branche portée par le `Parent` lui-même) était formalisé. Cette dérivation automatique éliminerait la classe de bug entière (branche non saisie/incohérente) plutôt que de la corriger cas par cas, mais suppose de revoir aussi le rattachement des oncles/tantes (actuellement saisis avec une branche manuelle indépendante de leur propre lien de filiation) — chantier plus lourd que le correctif d'accessibilité, pas nécessaire une fois celui-ci en place. | audit-transmission-devolution-conjoint-2026-08 §6 (F18, option 3) |

### 2.2 TODOs explicites restants dans le code

| Fichier | TODO |
|---|---|
| `src/utils/transmissionHelpers.ts:1112` | `const passifs = 0; // TODO: Calculate from asset charges` |
| `src/utils/transmissionHelpers.ts:1118` | `assuranceVie: 0 // TODO: Extract from specific asset types` |
| `src/lib/security.ts:169` | `// TODO: Implement server-side logging for ALL events via Supabase function` |
| `src/pages/fiscalite/components/ifi/ListeBiensIFISection.tsx:115` | `// TODO: Implement edit functionality` (édition d'un bien IFI existant) |
| `src/components/landing/HeroCommon.tsx:46` | placeholder image à remplacer (page landing, non métier) |

### 2.3 Écart connu entre CLAUDE.md et le code (module IFI)

- La case à cocher "Appliquer l'abattement de 30% sur la résidence principale" existe toujours dans `HypothesesSection.tsx` (ligne ~87-97) alors que le CLAUDE.md indique explicitement qu'elle est **trompeuse et doit être retirée** (l'abattement est de droit, art. 973 CGI, appliqué automatiquement ailleurs dans le moteur dès que `categorie === 'residence-principale'`). Non traité.
- **Module Transmission** : le diagnostic pour savoir si le pattern `types.ts` + fonctions pures + `index.ts` (calqué sur `src/lib/dmtg/` et `src/lib/ifi/`) doit être répliqué n'a, à ma connaissance, pas encore été fait formellement — `src/lib/transmission/` existe déjà avec plusieurs fichiers (`fiscal.ts`, `reserve.ts`, `netBreakdown.ts`, `successionLegale.ts`...) mais pas de `constants.ts` ni de séparation aussi nette qu'IFI/DMTG.
- **Phase D (biens hors de France)** : aucune trace dans le code — confirmé non commencé (pas de mention "hors de France" ni de crédit d'impôt étranger trouvée dans `src/lib/ifi` ou les pages fiscalité).

---

## 3. Ce qui n'est pas encore fait / en attente

- **Vérifier l'état réel post-fix des migrations** (462777d, 29/07) : confirmer en base que `marital_status.loi_applicable_regime` et `pays_premier_domicile_matrimonial` existent bien désormais (point §2.1 à reconfirmer).
- **Retirer la case à cocher trompeuse** de `HypothesesSection.tsx` (abattement résidence principale IFI) — action documentée comme à faire dans le CLAUDE.md, jamais exécutée.
- **Corriger le bug de qualification "détenteur couple"** en société d'acquêts (`isDetenteurCommon()` à utiliser partout).
- **Aligner `usePatrimoineCalculations`** sur `buildPassifLines` pour exclure les emprunts de société (aujourd'hui fait côté Transmission seulement).
- **Diagnostic à faire** : le module `src/lib/transmission/` doit-il être réorganisé sur le pattern IFI/DMTG (mentionné comme prochaine étape possible dans le CLAUDE.md, pas encore réalisé).
- **Phase D IFI** (biens hors de France) — fonctionnalité prévue plus tard, non démarrée.
- **Intérêts sur récompenses (art. 1473)** et **règles de prélèvement/insuffisance de communauté (art. 1471-1472)** — non implémentés, portée à définir.
- **Clauses dérogatoires génériques** de contrat de mariage (au-delà du seul `mode_evaluation_conventionnel`) — non implémentées.
- **Réévaluation de l'indemnité de réduction au jour du partage** (art. 924-2) — non implémentée en V1 faute de valeur au partage distincte sur `Liberalite` ; cf. audit Bloc 1 (T3).
- **Fonction "modifier"** sur les biens IFI (`ListeBiensIFISection.tsx`) — TODO explicite, non implémentée.
- **Logging serveur RGPD-safe** pour les événements de sécurité (`security.ts`) — TODO explicite, non implémenté.
- **Contraintes CHECK en base** à ajouter sur les colonnes texte à valeurs fermées (aujourd'hui la fermeture des listes ne repose que sur l'UI).
- **FK `user_id` manquantes** sur `asset_valorisations`, `asset_demembrements`, `asset_indivisaires` — à ajouter pour se conformer à la règle permanente du CLAUDE.md.

---

## 4. Notes de méthode

- Deux audits diagnostics existent déjà dans `docs/` : [`audit-patrimoine-2026-07-28.md`](audit-patrimoine-2026-07-28.md) (fond du module Patrimoine, dette technique §7) et [`audit-recompenses-creances-2026-07-28.md`](audit-recompenses-creances-2026-07-28.md) (module récompenses/créances). Ce récapitulatif en reprend et actualise les points encore ouverts au 29/07, sans tout ré-auditer.
- Certains points marqués "à reconfirmer" ci-dessus datent de l'audit du 28/07 et ont pu être résolus par les commits du 29/07 (999a24c, 462777d) sans qu'un nouvel audit ne l'ait vérifié formellement.
