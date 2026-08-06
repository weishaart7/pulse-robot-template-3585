# Bloc 5 — Ré-audit des correctifs F19, F20, F13, F7

> Vérification de non-régression, pas un nouvel audit de fond. Objectif : confirmer qu'aucun des
> quatre correctifs déjà appliqués n'a été fragilisé par les chantiers ultérieurs sur `index.ts`,
> `successionLegale.ts` et `reserve.ts` (Blocs 1/2/3 de cette série). Voir `docs/audit/audit-famille.md`
> pour la description d'origine de chaque finding.

**Résultat global** : les 4 correctifs restent corrects. Aucune régression trouvée, aucune
correction nécessaire. Suite de tests inchangée : **387 passed | 6 todo**, avant et après ce ré-audit.

---

## F19 — Renonciation, effet dévolutif (`32c79bd`)

**Statut : toujours correct.**

`resolveRenoncantDe` (`src/utils/transmissionHelpers.ts:445`) traduit toujours `enfant_renoncant_de`
(`'user'`/`'spouse'`/`'both'`) vers l'id réel du défunt avant que `successionLegale.ts` ne compare
`child.renoncantDe === graph.decedentId` — mécanisme inchangé depuis le commit d'origine. Les deux
points de lecture ont bougé de L345/690 (à l'époque de l'audit) vers les mêmes lignes actuelles
(`successionLegale.ts:345` dans `buildSouchesEnfants`, `:690` dans `findAllLivingDescendants`) —
coïncidence de numérotation, le code entre les deux n'a pas changé de taille.

Les correctifs récents §2.6/F18 (`bbf3f77`, `de8a722`) modifient exclusivement la branche B3/B5
(répartition parents/fente successorale), atteinte uniquement quand `souchesEnfants.length === 0`.
Cette condition est évaluée de façon identique que l'absence de souche vienne d'une absence réelle
d'enfants ou d'une renonciation totale (tous les enfants renonçants, sans descendance) — aucun
couplage entre les deux mécanismes. Rejoué mentalement le scénario combiné (enfant unique renonçant
+ un seul parent survivant sans fratrie) : retombe correctement sur le partage 1/2 parent / 1/2 fente
introduit par `bbf3f77`, sans qu'aucune modification ne soit nécessaire.

Tests de régression d'origine (`transmissionHelpers.test.ts`, `successionLegale.test.ts` §"renonciation
à succession (Règle A)") toujours présents et toujours verts.

---

## F20 — Exonération DMTG frère/sœur, art. 796-0 ter CGI (`0e50d06` / `d443db1`)

**Statut : toujours correct.**

Vérifié particulièrement l'interaction avec le chantier civilShares/cashDu en cours (diff non commité
sur `src/lib/transmission/index.ts`, répartition du cash réel « en moins prenant », art. 858 C. civ.) :

- Le chantier civilShares/cashDu ne touche **pas** `src/lib/dmtg/tax.ts` (dernière modification de ce
  fichier : `0e50d06`, le correctif F20 lui-même — confirmé par `git log`).
- Il ne touche pas non plus la construction des `beneficiaries` (`index.ts:515-548`), qui continue
  d'assigner `exonerationSuccession: person?.exonerationSuccession || false` sans changement.
- Le court-circuit `taxe: 0` dans `computeProgressiveTax` (`tax.ts:15`, `lien === 'frere_soeur' &&
  exonerationSuccession`) est inconditionnel : il s'applique après le calcul de `taxableAfterAllowance`
  (lui-même dérivé de `civilShares`, dont la fraction est désormais basée sur `cashReparti` plutôt que
  sur `partFinale`), mais la valeur de cette base n'a aucune incidence sur le résultat — un frère/sœur
  exonéré paie 0€ quelle que soit l'assiette calculée. L'abattement infini de `recall.ts:28`
  (`beneficiary.exonerationSuccession ? Infinity : ...`) est également indépendant de `civilShares`.
- Le volet assurance-vie (990I, `isSiblingExonEligible`, `assurance-vie.ts:105`) n'est concerné par
  aucun des deux chantiers.

`npx vitest run src/lib/dmtg` (17 tests, dont `recall.test.ts` « exoneration_succession = true : ne
paie aucun droit » / « = false : continue de payer normalement ») : tout vert.

---

## F13 — DDV, double point d'entrée (`31d1fe7`)

**Statut : toujours correct.**

`git log` confirme qu'aucun des fichiers touchés par `31d1fe7` (`useFamilyData.ts`,
`useMatrimonialClauses.ts`, `RelationInfoForm.tsx`, `lib/family/donationDernierVivant.ts`) n'a été
modifié depuis, à une exception : `RelationInfoForm.tsx` a reçu `0c34614` (Fix Option A — payload par
statut) juste après. Relu ce commit : il touche uniquement la construction du payload
(`buildRelationInfoPayload`) pour les colonnes *non* liées à la donation ; le bloc `onSubmit` qui
extrait les 4 colonnes DDV du payload et les route vers `setDonationDernierVivant(...)` (point d'écriture
centralisé introduit par `31d1fe7`) est resté intact (`RelationInfoForm.tsx:175-198`).

`useMatrimonialClauses.ts::performSave` continue de passer `donationChange: null` pour tous les
mutateurs de clauses (`toggleClause`, etc.), forçant `setDonationDernierVivant` à relire l'état frais
en base plutôt que de réembarquer une copie locale périmée — mécanisme d'origine inchangé.

Cohérent avec §4.6.1 (3 options A/B/C de la DDV, confirmé conforme par l'audit Bloc 2) : ce chapitre
documente la modélisation binaire de la DDV (booléen + date), que ce correctif ne modifie pas — il
corrige uniquement la concurrence d'écriture entre les deux onglets, pas la sémantique des champs.

---

## F7 — Ancien combattant (`5122e87`)

**Ce que couvrait le correctif** : la case « Ancien combattant » (`ancien_combattant` /
`_conjoint`) était saisissable dans `FicheClientForm.tsx` et `PartnerForm.tsx`, avec une infobulle
promettant une demi-part fiscale (art. 195 CGI) — mais aucun moteur ne la lisait
(`lib/fiscal/calcul.ts` existe et référence bien le champ, mais n'est appelé nulle part, code mort
signalé explicitement dans le fichier). Plutôt que de câbler l'effet fiscal promis, le correctif a
**retiré la case des deux formulaires** (les deux, pas un seul, pour éviter une case orpheline côté
conjoint), sans toucher aux colonnes DB ni à `lib/fiscal/calcul.ts`, conservées pour un futur module
IRPP.

**Statut : toujours correct.**

`grep` sur `ancien_combattant`/`ancienCombattant` dans `src/` : la case reste absente des deux
formulaires, aucun autre écran ne l'a réintroduite depuis. `lib/fiscal/calcul.ts` reste sans aucun
appelant (`grep` sur son import : aucun résultat) — le code mort documenté par le correctif est
toujours mort, la situation n'a pas dérivé vers une incohérence (ex. moteur câblé sans case pour le
renseigner, ou l'inverse).

---

## Suite de tests

Avant et après ce ré-audit (aucune correction appliquée) :

```
Test Files  30 passed (30)
     Tests  387 passed | 6 todo (393)
```

Baseline conforme à la consigne (387).
