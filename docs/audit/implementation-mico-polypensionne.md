# Implémentation — MICO palier 1, bascule de dénominateur polypensionné (écart #9) + correction d'arrondi (écart #15)

> Rapport de session. Fait suite à [audit-retraite.md §7.3, écart #9](audit-retraite.md) et §7.4,
> écart #15. Référentiel : [docs/retraite-base-referentiel.md §3.5.3](../retraite-base-referentiel.md)
> (bascule de dénominateur) et §3.5.2/§11.3 (montant de référence). Écarts #10, #12, #13-NBI : non
> touchés.

---

## 1. Diagnostic préalable

### 1.1. `minimumContributif()` — confirmé

[calcul.ts:585-594](../../src/lib/retraite/calcul.ts) (avant cette session) : le dénominateur était
toujours `trimestresRequis`, plafonné via `Math.min(trimestresValides / trimestresRequis, 1)` —
jamais remplacé par un total tous régimes. Un seul appelant :
[Carriere.tsx:533](../../src/components/retraite/Carriere.tsx),
`minimumContributif(trimValidesRegimeGeneral, trimestresRequis, decoteSurcote)`.

### 1.2. Recherche d'une donnée « total tous régimes » existante

**Piste RIS page 2 (prioritaire) : insuffisante seule.** `handleValidateRIS()`
([Carriere.tsx:380-421](../../src/components/retraite/Carriere.tsx)) scinde les régimes détectés en
deux paniers :

- `trimestresValides` = somme des régimes de type `'trimestres'` (régime général + régimes
  **alignés**, fusion LURA) — c'est en réalité le **numérateur** correct du référentiel
  (`trim_RG_alignés`, §3.5.3), déjà juste, non modifié par cette session.
- `regimesPoints` = régimes de type `'points'` (Agirc-Arrco, RAFP…) — jamais convertis en
  trimestres. **Constat après lecture du référentiel : ce n'est pas un manque bloquant.** Les
  régimes complémentaires par points n'ont structurellement pas de trimestres (Agirc-Arrco n'en
  compte aucun) — `trim_tous_régimes` (§3.5.3) porte sur les trimestres des régimes de **base**
  (alignés et non-alignés), pas sur les points des complémentaires.

**Seconde source, déjà existante dans le même fichier (pas une nouvelle collecte) :**
`hasCNAVPL`/`trimestresCNAVPL` et `hasFonctionPublique`/`trimestresLiquidablesFP` — state React déjà
présent dans `Carriere.tsx`, déjà combiné de façon similaire à deux endroits :
- [Carriere.tsx:293-295](../../src/components/retraite/Carriere.tsx) (useEffect `decoteSurcote`) :
  `trimAutresRegimes = (FP si actif) + (CNAVPL si actif)`.
- [Carriere.tsx:970](../../src/components/retraite/Carriere.tsx) /
  [:983](../../src/components/retraite/Carriere.tsx) : `trimestresValides + (l'autre régime)`, du
  point de vue de chaque sous-carte.

Aucun de ces trois usages ne combine les **trois** régimes ensemble pour le régime général
lui-même — c'est ce que cette session ajoute (§2 ci-dessous), sans créer de nouveau champ ni de
nouvelle saisie : uniquement une nouvelle combinaison d'un state déjà collecté.

**Décision validée avec l'utilisateur avant codage** (la consigne de session pointait
spécifiquement la piste RIS et demandait de s'arrêter si elle seule ne suffisait pas) : utiliser
cette seconde source, puisqu'elle ne constitue pas une nouvelle collecte de données — seulement un
nouveau branchement d'un state déjà saisi ailleurs dans le même composant.

**Limite résiduelle, documentée, non comblée :** un régime de base non modélisé par cet outil (ex.
MSA agricole non-salarié, régime étranger) reste absent de `trimestresTousRegimes` — cohérent avec
la limite déjà connue de l'app (seuls régime général/aligné, CNAVPL, fonction publique sont
supportés). Un polypensionné dans un régime non modélisé continuerait donc à recevoir le Cas 1
(dénominateur = durée requise) au lieu du Cas 2, même si son total réel dépasse la durée requise.

**Découverte annexe, hors périmètre de #9, signalée sans être corrigée :**
`handleValidateRIS()` n'exclut du panier « trimestres » que les libellés contenant `cnavpl`
([Carriere.tsx:392](../../src/components/retraite/Carriere.tsx)) — un régime fonction publique
détecté par le RIS sous un libellé trimestres (SRE, CNRACL) ne serait **pas** exclu et gonflerait à
tort `trimestresValides`. Sans lien avec #9, non traité ici.

---

## 2. Implémentation

### 2.1. [calcul.ts](../../src/lib/retraite/calcul.ts) — `minimumContributif()`

Nouveau paramètre optionnel `trimestresTousRegimes?: number`. Bascule (référentiel §3.5.3) :

```
Cas 1 (par défaut, ou trimestresTousRegimes <= trimestresRequis) :
  dénominateur = trimestresRequis                              // inchangé

Cas 2 (trimestresTousRegimes > trimestresRequis) :
  dénominateur = trimestresTousRegimes
```

`trimestresValides` (régime général + régimes alignés) reste le numérateur dans les deux cas — seul
le dénominateur change. Le Cas 1 n'a subi aucune modification de comportement : le paramètre est
simplement ignoré tant qu'il est absent ou inférieur/égal à `trimestresRequis`.

### 2.2. [Carriere.tsx](../../src/components/retraite/Carriere.tsx) — branchement

Nouvelle constante `trimestresTousRegimes = trimValidesRegimeGeneral + (FP si actif) + (CNAVPL si
actif)`, passée à `minimumContributif()`. Même combinaison que le useEffect `decoteSurcote` existant
(§1.2), réutilisée telle quelle plutôt que dupliquée sous une forme légèrement différente.

### 2.3. Écart #15 — [calcul.ts:574](../../src/lib/retraite/calcul.ts)

`MINIMUM_CONTRIBUTIF_NON_MAJORE_2026` : `9075.50` → `9075.48` (756,29 €/mois × 12 = 9 075,48 €
exactement, référentiel §3.5.2 et §11.3).

---

## 3. Tests

### 3.1. [calcul.test.ts](../../src/lib/retraite/calcul.test.ts) — nouveau describe `minimumContributif — bascule de dénominateur, palier 1`

| Test | Couverture |
|---|---|
| Cas 1 (non-régression) | Mono-pensionné sous la durée requise ; `trimestresTousRegimes` fourni mais sous le seuil → dénominateur reste `trimestresRequis` dans les deux cas |
| Cas 2 | Reproduit l'exemple exact du référentiel §3.5.3 (174 trimestres tous régimes, 172 requis) : dénominateur 174, pas 172 — et vérifie que le résultat diverge réellement de l'ancien comportement (pas un cas dégénéré) |
| Cas 2, ratio plafonné | Total tous régimes égal au régime général seul → MICO plein, comportement du plafond `Math.min(…, 1)` préservé |
| Écart #15 | `MINIMUM_CONTRIBUTIF_NON_MAJORE_2026` vaut désormais `9075.48` |

### 3.2. Mise à jour des tests existants (non-régression, valeurs recalculées)

Le changement de `MINIMUM_CONTRIBUTIF_NON_MAJORE_2026` (−0,02 €) déplace mécaniquement plusieurs
valeurs attendues déjà codées en dur dans `calcul.test.ts` (scénarios MICO/surcote/majoration déjà
établis pour les écarts #5, #6, #7). Six assertions recalculées à la valeur exacte (`9075.48` au lieu
de `9075.50`, propagée à travers les totaux qui l'incluent) — aucune n'a changé de comportement
attendu, seule la valeur numérique de référence a bougé de 0,02 €.

### Résultats

```
npx tsc --noEmit -p .   → 0 erreur
npx vitest run           → 43 fichiers, 578 tests passés, 6 todo, 0 échec
```

Aucune régression sur les 574 tests déjà présents avant cette session (vérifiés par exécution
préalable sans les changements de code, cf. commit précédent — 574 tests, dont les nouveaux tests
`calculSAM.test.ts` de la session précédente).

---

## 4. Fichiers modifiés

| Fichier | Nature |
|---|---|
| [src/lib/retraite/calcul.ts](../../src/lib/retraite/calcul.ts) | Paramètre `trimestresTousRegimes?` sur `minimumContributif()`, bascule Cas 1/Cas 2 ; correction `MINIMUM_CONTRIBUTIF_NON_MAJORE_2026` (écart #15) |
| [src/components/retraite/Carriere.tsx](../../src/components/retraite/Carriere.tsx) | Nouvelle constante `trimestresTousRegimes`, branchée sur l'appel à `minimumContributif()` |
| [src/lib/retraite/calcul.test.ts](../../src/lib/retraite/calcul.test.ts) | 4 nouveaux tests (Cas 1, Cas 2, Cas 2 plafonné, écart #15) ; 6 assertions existantes recalculées suite au changement de constante |
| [docs/audit/implementation-mico-polypensionne.md](implementation-mico-polypensionne.md) | Ce rapport |

Aucun autre fichier touché : `CarriereCNAVPL.tsx` et `CarriereFonctionPublique.tsx` ne calculent pas
de MICO (dispositif propre au régime général) — leurs props `trimestresAutresRegimes` existantes
(§1.2) ne sont pas concernées par ce changement.

---

## 5. Ce qui reste hors périmètre (rappel, non traité ici)

- **Régimes de base non modélisés par l'app** (agricole non-salarié, étranger…) : absents de
  `trimestresTousRegimes`, cf. limite résiduelle §1.2 — dette documentée, pas une régression de
  cette session.
- **Palier 2 (MICO majoré, écart #10)** : non touché, y compris sa propre double proratisation
  (référentiel §3.5.4) qui reprend `trim_tous_régimes` — hors périmètre de cette session.
- **Incohérence CNAVPL détectée par libellé texte** (§1.2, découverte annexe) : signalée, non
  corrigée.
- **Écarts #10, #12, #13-NBI** : non touchés, conformément à la discipline de session.
