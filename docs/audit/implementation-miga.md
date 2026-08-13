# Implémentation — minimum garanti (MIGA) fonction publique, barème par palier

> Suite de l'audit Retraite (`docs/audit/audit-retraite.md`, écart MIGA) : la formule linéaire
> précédente sous-évaluait nettement le minimum garanti pour les carrières de 15 ans et plus.
> Référentiel : `docs/retraite-base-referentiel.md` §7.5 (art. L. 17 CPCMR). Écart #6 (surcote
> parentale) et écarts #9 à #15 : hors périmètre, non touchés.

---

## 1. Formule remplacée

**Ancienne formule** (`src/lib/retraite/calculFonctionPublique.ts`, avant cette session) :

```ts
const MINIMUM_GARANTI_PLAFOND_ANNUEL = 1366.35 * 12;
minimumGaranti(trimestresLiquidables, trimestresRequis) =
  MINIMUM_GARANTI_PLAFOND_ANNUEL × min(trimestresLiquidables / trimestresRequis, 1)
```

Une simple règle de trois linéaire entre 0 et 100 % de la valeur de référence — qui n'a jamais été
la formule légale. Le référentiel (§7.5) décrit un barème à **quatre paliers**, non linéaire à
partir de 15 ans de services :

| Palier | Formule |
|---|---|
| Moins de 15 ans, hors invalidité | `valeur de référence × trimestres de services / trimestres requis` |
| Moins de 15 ans, invalidité | Par année : `1/15 × 57,5 % × valeur de référence` |
| 15 à 39 ans | `57,5 % + 2,5 pts/an (15→30 ans) + 0,5 pt/an (30→40 ans)`, en % de la valeur de référence |
| 40 ans et plus | `100 %` de la valeur de référence |

**Nouvelle implémentation** : `minimumGaranti()` réécrite dans
[`src/lib/retraite/calculFonctionPublique.ts`](../../src/lib/retraite/calculFonctionPublique.ts),
signature étendue :

```ts
minimumGaranti(
  trimestresServicesEffectifs: number,
  trimestresRequis: number,
  valeurReference: number,
  estInvalidite = false
): number
```

Points d'implémentation notables :

- **Calcul continu en trimestres**, pas arrondi à l'année inférieure : le palier 15-39 ans applique
  les points par fraction d'année (`trimestresServicesEffectifs / 4`), pas seulement aux
  anniversaires entiers — évite un effet de seuil artificiel qui sous-évaluerait le minimum pour
  tout trimestre entamé au-delà d'un multiple de 4 (testé explicitement, cf. §6).
- **`valeurReference` sans valeur par défaut interne** : contrairement à l'ancienne constante codée
  en dur dans la fonction, elle est désormais systématiquement fournie par l'appelant (cf. §3).
- **`trimestresRequis` n'intervient que dans le palier « moins de 15 ans, hors invalidité »** — les
  trois autres paliers (invalidité, 15-39 ans, 40 ans et plus) ne dépendent que de la durée de
  services et de la valeur de référence, jamais de la durée requise de la génération. Testé
  explicitement pour éviter qu'un futur appelant présume à tort que `trimestresRequis` influence
  systématiquement le résultat.

---

## 2. Écart trouvé dans le référentiel — vérifié, corrigé, pas absorbé silencieusement

Avant d'écrire les tests demandés par la mission (reproduire les trois exemples chiffrés du
référentiel), un contrôle arithmétique de ces exemples avec la valeur de référence 2025 confirmée
(1 248,33 €) a révélé une incohérence **interne au référentiel lui-même** :

| Exemple | Calcul littéral avec 1 248,33 € | Résultat affiché (avant correction) |
|---|---|---|
| 13 ans, 168 trimestres requis | `1 248,33 × 52 / 168 = 386,39 €` | 389,48 € |
| 13 ans, invalidité | `(57,5 % × 1 248,33 / 15) × 13 = 622,08 €` | 627,06 € |
| 35 ans | `1 248,33 × 97,5 % = 1 217,12 €` | 1 217,12 € (exact) |

Les deux premiers exemples affichaient un résultat ~0,80 % plus élevé que le calcul exact — un
écart qui se reconstitue précisément avec une valeur de référence ≈ 1 258,33 € (les deux chiffres
ne diffèrent que par deux chiffres transposés), absente du texte de prose du référentiel, qui lui
confirme bien 1 248,33 € pour 2025. Le troisième exemple, en revanche, se recalcule exactement.

**Vérification demandée à l'utilisateur avant de trancher** (conformément à la méthode de travail
attendue pour toute règle métier non triviale) : recherche externe croisée pour identifier si
389,48 € et 627,06 € correspondaient à une source légale réelle plutôt qu'à une coquille du
référentiel interne.

- Un article externe indépendant (matmut.fr) confirme la **valeur 389,48 €** pour un cas « 13 ans /
  52 trimestres » — mais cet article utilise lui-même une formule dont l'arithmétique ne se
  reconstitue pas exactement non plus avec sa propre valeur de référence citée (`1 366,35 × 56 /
  169 = 449,44 €` affiché, alors que le calcul exact donne ≈ 452,76 €) : un écart comparable, qui
  suggère que ce type d'erreur d'arrondi/de transcription est courant dans le contenu web
  généraliste sur ce sujet, pas une confirmation fiable d'une source légale opposable.
- Aucune source officielle (SRE, CNRACL, Légifrance art. L17) consultée ne fournit d'exemple chiffré
  précis pour une durée de services inférieure à 15 ans permettant de trancher entre les deux
  valeurs — seule la **formule** (ratio trimestres de services / trimestres requis) est confirmée
  de façon concordante par toutes les sources croisées.

**Décision retenue** (« au plus proche de la réalité », par la formule plutôt que par un chiffre
copié) : implémenter la formule littérale avec la valeur de référence 2025 confirmée (1 248,33 €),
et corriger les deux exemples erronés du référentiel plutôt que de figer une coquille dans le code
ou dans les tests. Correction appliquée dans
[`docs/retraite-base-referentiel.md`](../retraite-base-referentiel.md) §7.5, avec renvoi vers cette
note. Le troisième exemple (35 ans, déjà exact) reste inchangé.

---

## 3. Valeur de référence — paramétrée, pas codée en dur

```ts
export const VALEUR_REFERENCE_MIGA_MENSUELLE_2025 = 1248.33; // confirmée par le référentiel
export const VALEUR_REFERENCE_MIGA_ANNUELLE_2025 = VALEUR_REFERENCE_MIGA_MENSUELLE_2025 * 12;
```

Conformément à la mission : la valeur 2026 (≈ 1 366,35 €) **n'a pas été codée en dur**. Le
référentiel la qualifie lui-même de « à vérifier auprès du SRE » — la recherche externe menée pour
le §2 ci-dessus n'a pas non plus permis de la confirmer par une source suffisamment fiable et datée
pour ce projet. `minimumGaranti()` prend `valeurReference` en paramètre obligatoire (aucune valeur
par défaut interne) : le jour où une source opposable confirme la valeur 2026, il suffira d'ajouter
une nouvelle constante `VALEUR_REFERENCE_MIGA_ANNUELLE_2026` et de mettre à jour l'appelant
(`CarriereFonctionPublique.tsx`), sans toucher à `minimumGaranti()` elle-même.

`CarriereFonctionPublique.tsx` affiche désormais une note explicite sous le minimum garanti calculé
(« valeur de référence 2025 [...] la valeur 2026 n'est pas encore confirmée ») pour que l'incertitude
soit visible côté utilisateur, pas seulement dans le code.

---

## 4. Cohérence avec `majorationEnfantsFonctionPublique()` (écart #7)

Vérification demandée par la mission : l'enchaînement déjà documenté dans
[`implementation-majoration-enfants.md`](implementation-majoration-enfants.md) — *base → décote/
surcote → minimum garanti → majoration enfants (plafonnée au dernier traitement)* — reste **valide
sans modification** après ce changement de formule MIGA.

Raison structurelle : `majorationEnfantsFonctionPublique()` et
`pensionFonctionPubliqueAvecMajorationEnfants()` ne connaissent jamais la formule interne du minimum
garanti — elles reçoivent `pensionPorteeAuMinimumGaranti`, un montant déjà résolu par l'appelant via
`pensionFonctionPubliqueFinale(pensionCalculee, minimumGaranti(...))`. Que `minimumGaranti()`
retourne un montant issu de l'ancienne formule linéaire ou du nouveau barème par palier ne change
rien à la signature ni au comportement de la majoration : seul le **montant** injecté change, pas
l'enchaînement. Confirmé par test de non-régression réutilisant le même schéma que celui déjà écrit
pour l'écart #7 (`calculFonctionPublique.test.ts`, describe *Ordre d'application fonction publique*),
mis à jour uniquement pour passer `VALEUR_REFERENCE_MIGA_ANNUELLE_2025` à `minimumGaranti()`.

---

## 5. La comparaison « le plus élevé des deux » — déjà implémentée, vérifiée

Mission point 2 : cette logique existait déjà, `pensionFonctionPubliqueFinale(pensionCalculee,
minimumGaranti)` retourne `Math.max(pensionCalculee, minimumGaranti)` — aucune nouvelle fonction
nécessaire. Un test dédié a été ajouté (`Comparaison pension de droit commun / MIGA`,
`calculFonctionPublique.test.ts`) pour le cas explicitement demandé par la mission : carrière
complète et traitement élevé où la pension de droit commun dépasse largement le MIGA — le droit
commun est bien retenu, pas le minimum garanti.

---

## 6. Tests — récapitulatif

| Describe | Tests | Couverture |
|---|---|---|
| `minimumGaranti — barème par palier` | 11 | Les trois exemples du référentiel (deux corrigés, cf. §2), dépendance à `trimestresRequis` limitée au palier < 15 ans, cas invalidité, bornes exactes à 15 et 30 ans, calcul continu en trimestres (pas d'effet de seuil), 40 ans pile et au-delà de 40 ans (plafonné) |
| `Comparaison pension de droit commun / MIGA` | 1 | Cas explicitement demandé par la mission : pension de droit commun > MIGA |
| `majorationEnfantsFonctionPublique` (déjà existant, inchangé) | 7 | Non affecté par ce changement |
| `Ordre d'application fonction publique...` (mis à jour) | 3 | Enchaînement base → décote → MIGA → majoration, avec la nouvelle formule MIGA |
| `Plafonnement au dernier traitement` (déjà existant, inchangé) | 2 | Non affecté par ce changement |

Suite complète : **529 tests passés, 6 todo (pré-existants, non liés à cette session), 0
régression** (`npx vitest run`). `npx tsc --noEmit` : aucune erreur. `npx vite build` : build de
production réussi sans erreur.

---

## 7. Dette technique documentée, non codée

Conformément à la mission, ces deux points sont **documentés ici, pas implémentés** :

### 7.1. Formules MIGA antérieures au 1er janvier 2014

Le référentiel (§7.5) signale que les formules antérieures à 2014 diffèrent et dépendent de la date
de mise en paiement (indices et taux évoluant année par année de 2003 à 2013, bonifications
intégrées dans des limites décroissantes, référence à l'indice 216 avant 2004 avec distinction à
25 ans de services). **Non pertinent pour une simulation prospective** (un utilisateur de cet outil
liquide sa pension dans le futur, jamais avant 2014) — non implémenté, à dessein, pas un oubli.

### 7.2. Articulation MICO/MIGA pour les polypensionnés

Le référentiel (§7.5, §12) signale que la LFSS 2024 (art. 93) prévoit des décrets devant fixer les
conditions dans lesquelles les périodes d'affiliation des fonctionnaires sont retenues pour
apprécier la durée requise pour le MICO et le MIGA, dans un objectif d'éviter le cumul des deux
majorations — mais que ces décrets **ne sont pas publiés à ce jour** selon le référentiel.
**Non implémenté** : aucun cumul ni exclusion codée entre MICO (régime général) et MIGA (fonction
publique) pour un profil polypensionné. Un futur branchement qui calculerait les deux minimums
indépendamment pour un même assuré fonctionnaire + régime général ne doit pas présumer qu'ils
s'additionnent ni qu'ils s'excluent — à vérifier auprès d'une source vérifiant la publication de ces
décrets avant toute implémentation de cumul ou d'exclusion.

---

## 8. Hors périmètre (rappel, non touché)

- **Écart #6 (surcote parentale)** : en attente d'une décision produit préalable, non prise à ce
  stade.
- **Écarts #9 à #15** : non touchés.
- **Écart #7 (majoration enfants)** : déjà implémenté (session précédente), seule la cohérence de
  l'enchaînement avec le nouveau MIGA a été revérifiée (§4), aucun changement de code sur la
  majoration elle-même.
