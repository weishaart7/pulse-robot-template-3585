# Implémentation — exclusions des meilleures années SAM (écart #11)

> Rapport de session. Fait suite à [audit-retraite.md §7.3, écart #11](audit-retraite.md) : le
> référentiel ([docs/retraite-base-referentiel.md §3.4.4](../retraite-base-referentiel.md)) exclut
> quatre catégories d'années du calcul des N meilleures années servant au SAM.
> Écarts #9, #10, #12, #13-NBI, #15 : non touchés.

---

## 1. Diagnostic préalable

### 1.1. Sélection actuelle

`calculerSAM()` ([calculSAM.ts](../../src/lib/retraite/calculSAM.ts)) ne filtrait, avant cette
session, que les doublons régime/revenu du RIS (`estPeriodeRegimeDeBase()`, exclusion des lignes
Agirc-Arrco-only) — confirmé par lecture du code : aucun des 4 critères du référentiel §3.4.4
n'était appliqué avant la sélection des N meilleures années (tri décroissant sur `revenuPlafonne`,
sans exclusion en amont).

### 1.2. Disponibilité des données, critère par critère

| Critère | Donnée nécessaire | Verdict |
|---|---|---|
| **1. Année sans trimestre validé** | Trimestres cotisés+assimilés par année | ✅ Disponible via `trimestresCotisesEtAssimilesDepuisCarriere()` ([calculTrimestres.ts:469](../../src/lib/retraite/calculTrimestres.ts)), qui renvoie déjà `parAnnee: {annee, cotises, assimiles}[]` |
| **2. Année de la date d'effet** | Une date d'effet réelle au point d'appel de `calculerSAM()` | ⚠️ **Absente au point d'appel actuel.** `RISImportDialog.tsx:41` appelle `calculerSAM(detailCarriere, anneeNaissance)`, sans aucun paramètre de date. [implementation-date-effet-ui.md §1](implementation-date-effet-ui.md) (Sessions A/B) classe explicitement le point d'entrée « `dureeSAMPourGeneration` — calculSAM.ts (via RISImportDialog.tsx) » en catégorie **« b. Interne »**, ligne 25 : *« pas de scénario d'âge, calcul automatique sur la carrière importée »* — et le laisse non touché (§4, §6). La seule vraie date d'effet du dépôt vit en state local de `Trimestres.tsx` (`dateLiquidation`), jamais transmise à ce composant. **Conséquence : les écarts #2/#3 de l'audit (absence de date d'effet) restent ouverts pour le flux RIS/SAM spécifiquement**, alors qu'ils sont traités pour les écrans de simulation (Trimestres.tsx) — cf. §5 ci-dessous pour la mise à jour du statut dans `audit-retraite.md` |
| **3. Année uniquement assimilée (hors IJ maternité)** | Idem critère 1 + distinction maternité | ❌ **Non implémentable de façon fiable.** `TypeActivite` ([parseRIS.ts:30](../../src/lib/retraite/parseRIS.ts)) ne connaît que `'employeur' \| 'chomage' \| 'maladie' \| 'micro_entrepreneur'` — aucune catégorie maternité. Une IJ de congé maternité présente sur un RIS retomberait soit dans `maladie` (libellé contenant « MALADIE »), soit par défaut dans `employeur` — aucun moyen fiable de l'excepter comme l'exige le référentiel |
| **4. Année de rachat de trimestres** | Marqueur « période de rachat » par année | ❌ **Aucune donnée nulle part.** Le seul « rachat » du dépôt est la simulation éphémère de [Trimestres.tsx](../../src/components/retraite/Trimestres.tsx) (sandbox, non persistée — commentaire ligne 76 : « aucune persistance »). `retraite_carriere_detail.type_activite` a un CHECK `IN ('employeur','chomage','maladie','micro_entrepreneur')` : pas de valeur « rachat » possible sans migration de schéma |

### 1.3. Décisions validées par l'utilisateur avant codage

- **Critère 1** : implémenté.
- **Critère 2** : implémenté comme paramètre optionnel `dateEffet?: Date`, non branché (aucun appelant actuel n'a de date d'effet réelle à fournir).
- **Critère 3** : **non implémenté** — le risque de sur-exclure une année de maternité l'emporte sur celui de laisser une année maladie/chômage ordinaire dans le pool (statu quo actuel). Documenté comme dette technique explicite, au même titre que le critère 4.
- **Critère 4** : non implémenté — décision produit (nouvelle catégorie `type_activite` + migration + UI de saisie) hors périmètre de cette session, à arbitrer séparément.

---

## 2. Implémentation — [calculSAM.ts](../../src/lib/retraite/calculSAM.ts)

Nouvelle fonction `anneesExclues(periodes, dateEffet?)` qui calcule, à partir de
`trimestresCotisesEtAssimilesDepuisCarriere(periodes)` et du `dateEffet` optionnel, l'ensemble des
années à retirer du pool de sélection :

- **Critère 1** : `cotises + assimiles === 0` pour l'année → exclue.
- **Critère 2** : si `dateEffet` fourni, `dateEffet.getUTCFullYear()` → exclue.

`calculerSAM()` reçoit un troisième paramètre optionnel `dateEffet?: Date`. Les années exclues sont
retirées du pool **avant** la sélection des N meilleures (`anneesEligibles = anneesDisponibles.filter(a => a.projete || !anneesExcluesSet.has(a.annee))`), pas après : une année exclue ne peut donc jamais
apparaître dans `anneesRetenues`, ni compter dans le quota des N années sélectionnées. Elle reste en
revanche visible dans `anneesDisponibles` (années réellement connues, pour l'affichage) — seule la
sélection est affectée, pas la liste des années connues elle-même.

Nouveau champ `anneesExclues: number[]` sur `ResultatSAM`, pour rendre le résultat de ce filtrage
inspectable par l'appelant (et testable directement).

### Interaction avec la projection (comportement inchangé, documenté)

Le mécanisme de projection des années manquantes (`anneesProjetees`) utilise la **dernière année
connue chronologiquement** (`anneesConnues[anneesConnues.length - 1]`) comme base, que cette année
soit exclue ou non de la sélection — ce mécanisme préexistant n'a pas été modifié : il ne fait pas
partie des 4 critères du référentiel §3.4.4, et son ajustement (par exemple, baser la projection sur
la dernière année *éligible* plutôt que la dernière année *connue*) est un changement de portée plus
large que le périmètre de cette mission. Les années projetées ne sont jamais exclues elles-mêmes
(`a.projete || !anneesExcluesSet.has(a.annee)`) : les 4 critères d'exclusion portent sur des périodes
réelles de carrière, pas sur des années fictives de projection.

---

## 3. Tests — [calculSAM.test.ts](../../src/lib/retraite/calculSAM.test.ts) (nouveau fichier, 4 tests)

| Test | Couverture |
|---|---|
| Année sans trimestre validé | Revenu sous le seuil de validation, aucune autre activité → exclue (critère 1) |
| Année uniquement assimilée | Année 100 % chômage → **non exclue**, documente le choix de ne pas implémenter le critère 3 (garde-fou de non-régression explicite) |
| Année de la date d'effet | Exclue quand `dateEffet` est fourni ; non-régression vérifiée : sans `dateEffet` (cas actuel de `RISImportDialog.tsx`), le filtre reste inactif |
| Combiné, carrière courte (< N années requises) | Deux critères sur trois ans de carrière connue (génération 1995, 25 années requises) : les deux années exclues n'apparaissent ni dans `anneesRetenues` ni ne comptent dans le quota, resté atteint via les années projetées ; le SAM se recalcule sur le pool restant |

### Résultats

```
npx tsc --noEmit -p .   → 0 erreur
npx vitest run           → 43 fichiers, 574 tests passés, 6 todo, 0 échec
```

Aucune régression sur les 570 tests déjà présents avant cette session (vérifié directement : `git
stash` du code de `calculSAM.ts` avec le nouveau fichier de test en place → 570 passés, 4 échecs
attendus sur les tests qui ciblent le nouveau comportement, 0 échec inattendu ailleurs). 570 + 4 =
574, total obtenu après implémentation.

---

## 4. Fichiers modifiés

| Fichier | Nature |
|---|---|
| [src/lib/retraite/calculSAM.ts](../../src/lib/retraite/calculSAM.ts) | Fonction `anneesExclues()`, paramètre `dateEffet?` sur `calculerSAM()`, champ `anneesExclues` sur `ResultatSAM`, filtrage du pool de sélection avant tri |
| [src/lib/retraite/calculSAM.test.ts](../../src/lib/retraite/calculSAM.test.ts) | Nouveau — 4 tests (aucun test n'existait pour ce module avant cette session) |
| [docs/audit/audit-retraite.md](audit-retraite.md) | §7.1 (ligne #11) et §7.3 (détail #11) mis à jour — statut partiel, cf. §5 ci-dessous ; §7.1 (lignes #2/#3) : mention ajoutée sur le flux RIS/SAM spécifiquement, sans rouvrir le reste de ces écarts déjà traités par les Sessions A/B |

Aucun autre fichier touché : `RISImportDialog.tsx` ne branche pas `dateEffet` (aucune date réelle
disponible à ce point d'appel, cf. §1.2) — un futur branchement fera l'objet d'un commit séparé, même
principe que `trimestresCotisesEtAssimilesDepuisCarriere()` avant son branchement.

---

## 5. Ce qui reste hors périmètre (rappel, non traité ici)

- **Critère 3 (année uniquement assimilée)** : non implémenté, dette documentée §1.3 — nécessite une
  source de données distinguant IJ maternité et maladie/chômage ordinaire avant de pouvoir être codé
  sans risque de sur-exclusion.
- **Critère 4 (année de rachat)** : non implémenté, dette documentée §1.3 — décision produit +
  migration de schéma (nouvelle catégorie `type_activite` ou champ dédié) à arbitrer séparément.
- **Branchement de `dateEffet`** : le paramètre existe et est testé, mais aucun composant ne le
  fournit — `RISImportDialog.tsx` n'a accès à aucune date d'effet réelle au moment de l'import RIS
  (elle serait normalement connue plus tard, au moment d'une simulation d'âge de départ). Brancher ce
  paramètre suppose une décision produit sur *quelle* date utiliser à ce stade du parcours (aucune
  simulation de départ n'a encore eu lieu à l'import RIS) — hors périmètre de cette session.
- **Écarts #9, #10, #12, #13-NBI, #15** : non touchés, conformément à la discipline de session.
