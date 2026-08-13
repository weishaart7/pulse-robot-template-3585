# Conception — connecter calculTrimestres.ts à la logique de surcote

> Note de conception, diagnostic uniquement. Aucun code modifié dans cette session. Fait suite à
> l'écart #5 de l'audit référentiel ([audit-retraite.md §7](audit-retraite.md)) : « Surcote non
> conforme : excédent brut de trimestres, sans vérifier âge légal dépassé ni exclure les
> trimestres assimilés ». Référentiel : `docs/retraite-base-referentiel.md` §2.3 (surcote) et
> §12.3 (points de vigilance, ordre d'application).

---

## 1. Ce que le calcul actuel vérifie — et ce qu'il ignore

### Localisation

Il n'existe **aucune fonction dédiée à la surcote**. Une seule fonction couvre à la fois la
décote et ce qui tient lieu de surcote : [`decoteSurTrimestres()`](../../src/lib/retraite/calcul.ts)
(et sa variante `decoteSurTrimestresPlafond25()` pour la fonction publique/CNAVPL) :

```ts
export function decoteSurTrimestres(trimestresValides: number, trimestresRequis: number): number {
  const difference = trimestresValides - trimestresRequis;
  if (difference < 0) {
    return Math.max(difference * 1.25, -20);   // décote, plafonnée à -20 %
  }
  if (difference > 0) {
    return difference * 1.25;                   // "surcote" — c'est cette branche qui est en cause
  }
  return 0;
}
```

Appelée via `decoteApplicable(decoteSurTrimestres(...), decoteSurAge(...))` — qui retient le
**plus favorable des deux** (`Math.max`) — dans
[Trimestres.tsx](../../src/components/retraite/Trimestres.tsx) et
[Carriere.tsx](../../src/components/retraite/Carriere.tsx) ; et directement (sans
`decoteApplicable`) dans [CarriereCNAVPL.tsx:60-65](../../src/components/retraite/CarriereCNAVPL.tsx)
via `decoteSurTrimestresPlafond25()`.

### Ce que ça vérifie aujourd'hui

Une seule chose : `trimestresValides > trimestresRequis`. Rien d'autre. La branche
« surcote » (`difference > 0`) se déclenche dès que ce simple excédent existe, sans condition
supplémentaire.

### Ce que ça ignore

Comparé au référentiel §2.3.1, trois manques distincts (pas un seul générique) :

1. **La condition d'âge.** « Avoir dépassé l'âge légal » (référentiel §2.3.1, condition
   cumulative n° 2) n'est vérifiée nulle part — `decoteSurTrimestres()` ne reçoit ni date de
   naissance, ni date d'effet, ni âge. Elle ne peut donc pas savoir si l'excédent de trimestres
   provient d'une carrière longue liquidée *avant* l'âge légal (qui n'ouvre **aucun** droit à
   surcote, référentiel §2.3.1 dernier paragraphe : « un assuré qui liquide dès l'âge légal avec
   un excédent de trimestres n'obtient aucune surcote ») ou d'une poursuite d'activité *après*
   l'âge légal (qui seule ouvre droit à surcote).
2. **La nature des trimestres.** Le référentiel (§2.3.1, §2.5) exclut explicitement de la
   surcote : trimestres assimilés (maladie, chômage, invalidité), périodes AVPF/AVA, rachats
   option 1, et toutes les majorations de durée d'assurance. `trimestresValides` est un total
   agrégé unique (saisi depuis le RIS, tous types confondus) — le code n'a structurellement aucun
   moyen de savoir si l'excédent est fait de trimestres cotisés (éligibles) ou assimilés (non
   éligibles).
3. **La fenêtre temporelle.** Même un trimestre cotisé n'ouvre droit à surcote que s'il est
   « à la charge de l'assuré » et situé dans la **période de référence** précisément délimitée par
   le référentiel (§2.3.1 : du lendemain de l'atteinte de l'âge légal — ou du mois suivant
   l'acquisition du dernier trimestre requis si celle-ci est postérieure — jusqu'au dernier jour du
   trimestre civil précédant la date d'effet). Le code actuel ne borne rien dans le temps.

**Ce qui, en revanche, est déjà correct par construction :** la condition « réunir la durée
requise » (référentiel §2.3.1, condition cumulative n° 1) est *implicitement* satisfaite dès que
`difference > 0` — on ne peut pas avoir un excédent sans avoir déjà atteint la durée requise. Et
l'absence de plafond sur la branche positive (`difference * 1.25` sans borne haute) correspond bien
au référentiel (« sans plafond »). Ces deux points n'ont donc pas besoin d'être corrigés — seuls
les trois manques ci-dessus le nécessitent.

---

## 2. Constat structurel : décote et surcote ne sont pas la même mécanique

Le code actuel traite la surcote comme le prolongement symétrique de la décote — une seule
fonction, un seul signe qui bascule selon que l'excédent est négatif ou positif. Le référentiel
ne le voit pas ainsi : §2.2 (décote) et §2.3 (surcote) sont **deux mécanismes distincts**, avec des
conditions d'éligibilité différentes (la décote se calcule sur un simple écart de trimestres/âge ;
la surcote exige un âge dépassé, un type de trimestre précis, et une fenêtre temporelle). Une
carrière peut être en décote (durée non atteinte) ou en surcote (durée atteinte + âge légal
dépassé + trimestres cotisés après cette date) — jamais les deux en même temps — mais ce ne sont
pas deux lectures d'un même nombre.

**C'est le point de conception central de cette note** : la correction de l'écart #5 n'est pas un
ajustement numérique de `decoteSurTrimestres()`, c'est la reconnaissance qu'une fonction de
surcote séparée, avec sa propre porte d'éligibilité, doit exister à côté (pas à la place) du
mécanisme de décote actuel — qui, lui, reste correct pour ce qu'il fait déjà (cf.
[correction-decote-age-carriere.md](correction-decote-age-carriere.md), qui a vérifié la
mécanique « plus petit des deux comptages » de la décote).

---

## 3. Brancher l'âge légal — déjà résolu par la Session A, sans nouveau calcul

`ageLegalPourGeneration(dateNaissance: DateNaissance, dateEffet: Date): AgeLegalResultat`
([calcul.ts](../../src/lib/retraite/calcul.ts)) donne exactement la donnée requise par la
condition n° 2 du §2.3.1 : l'âge légal (`{ ans, mois }`) applicable à la génération et à la date
d'effet considérées, avec bascule LFSS 2026 déjà résolue et indétermination explicite pour les cas
non documentés (`{ stable: false }`) — cf.
[implementation-date-effet-moteur.md](implementation-date-effet-moteur.md). **Rien de nouveau à
calculer côté barème légal.**

Reste un pas de conversion, pas un nouveau calcul : `AgeLegalResultat` donne un âge en années et
mois, alors que la condition à tester est une comparaison de **dates** (« a dépassé l'âge légal à
la date d'effet »). La façon la plus directe de le faire, en réutilisant un idiome déjà présent
dans le module (`dateEffetSimuleeParAge()`, qui construit déjà une date à partir d'un âge et d'une
date de naissance) : une fonction miroir qui construit la date exacte de l'anniversaire légal à
partir de `{ ans, mois }` + `DateNaissance`, puis compare cette date à `dateEffet`. Concrètement :

```
dateAnniversaireLegal(dateNaissance, ageLegal: AgeLegal) → Date
  = anniversaire du mois `dateNaissance.mois + ageLegal.mois` de l'année
    `dateNaissance.annee + ageLegal.ans` (avec report d'année si mois > 12)

ageLegalDepasse(dateNaissance, dateEffet) → boolean | undefined
  = si ageLegalPourGeneration(dateNaissance, dateEffet).stable === false → undefined (indéterminé,
    ne pas fabriquer une réponse)
  = sinon → dateEffet >= dateAnniversaireLegal(dateNaissance, ageLegalPourGeneration(...).age)
```

C'est une adaptation directe d'un motif déjà écrit dans le fichier, pas une nouvelle branche de
logique métier — cohérent avec la consigne de réutiliser l'infrastructure existante plutôt que
d'en recréer une.

---

## 4. Brancher calculTrimestres.ts — ce qui existe, ce qui manque

### Ce qui existe déjà et peut être réutilisé tel quel

`trimestresCotisesEtAssimilesDepuisCarriere(periodes)` distingue déjà cotisés/assimilés, avec
plafond de 4/an combiné et **priorité aux cotisés** en cas de dépassement — exactement la
distinction que le référentiel exige pour l'éligibilité à la surcote (§2.3.1 : seuls les
trimestres cotisés comptent). Cette logique est déjà écrite, déjà testée
([calculTrimestres.test.ts](../../src/lib/retraite/calculTrimestres.test.ts)), et n'a pas besoin
d'être reproduite.

### Ce qui manque : la granularité annuelle n'est pas exposée

La fonction **calcule** déjà un total cotisé/assimilé **par année civile** en interne (boucle
`for (const annee of annees) { ... cotisesAnnee ... assimilesAnnee ... }`,
[calculTrimestres.ts:490-511](../../src/lib/retraite/calculTrimestres.ts)) — mais ne retourne que
la somme sur toute la carrière (`{ cotises, assimiles, total }`). Pour borner la surcote à la
période de référence (§2.3.1), il faut savoir *quelles années* ont produit des trimestres cotisés,
pas seulement combien au total.

**Proposition, additive et non cassante** : exposer le détail déjà calculé, sans changer le calcul
lui-même — ajouter un champ à `ResultatTrimestresCotisesEtAssimiles` :

```ts
export interface ResultatTrimestresCotisesEtAssimiles {
  cotises: number;
  assimiles: number;
  total: number;
  parAnnee: { annee: number; cotises: number; assimiles: number }[]; // nouveau — même
                                                                       // granularité que la boucle
                                                                       // interne existante
}
```

Rien à recalculer : les valeurs `cotisesAnnee`/`assimilesAnnee` existent déjà à l'intérieur de la
boucle, il s'agit de les collecter au lieu de ne garder que leur somme. Tous les appels existants
(`.total`, `.cotises`, `.assimiles` — dans `Carriere.tsx` et les tests) restent valides sans
modification : c'est une extension du type de retour, pas une rupture.

### Comment cette granularité annuelle servirait la surcote

Une fois `parAnnee` disponible, un calcul de surcote pourrait sommer les trimestres cotisés des
années **entièrement comprises** dans la période de référence (entre l'année de l'anniversaire
légal — §3 ci-dessus — et l'année de la date d'effet), en excluant les deux années limites tant
que leur contenu n'est pas daté plus finement (cf. §5, incertitude n° 1). C'est une approximation
délibérée — mais elle mobilise une donnée déjà produite par le code existant, pas une nouvelle
construction, et le plafond de 4/an par année reste correct par construction (déjà appliqué en
amont dans `trimestresCotisesEtAssimilesDepuisCarriere()`, avec la priorité cotisés déjà
documentée) — aucune logique de plafonnement à réécrire.

---

## 5. Points restés incertains — signalés, pas tranchés

Conformément à la consigne, ces points ne sont pas résolus ici.

1. **Chronologie infra-annuelle des deux années limites de la période de référence.** Si
   l'anniversaire légal ou la date d'effet tombe au milieu d'une année civile qui contient
   elle-même un mélange de trimestres cotisés et assimilés (ex. un client qui travaille jusqu'en
   mars puis passe au chômage le reste de l'année, l'anniversaire légal tombant en juin), rien
   dans `calculTrimestres.ts` ne permet de savoir lesquels de ces trimestres tombent avant ou après
   le pivot — la fonction ne date que par année civile, pas par trimestre daté. C'est exactement la
   limite déjà documentée dans le fichier et dans `audit-retraite.md` (« Chronologie complète de
   surcote... non implémentée... changement de nature du module »). La granularité `parAnnee`
   proposée au §4 résout le cas où les années limites sont « propres » (entièrement avant ou après
   le pivot) mais pas le cas mixte à l'intérieur d'une même année limite.

2. **Cas mixte cotisé/assimilé/micro-entrepreneur dans une année limite.** Même limite que le
   point précédent, précisée pour le cas explicitement cité par la mission : une année limite où
   coexistent des trimestres `employeur`, `micro_entrepreneur` et `chomage`/`maladie` ne peut pas
   être décomposée dans l'ordre chronologique réel par le code actuel — seule la répartition
   *quantitative* (combien de cotisés vs assimilés, avec la priorité déjà en place) est connue,
   pas la répartition *temporelle* à l'intérieur de l'année.

3. **Détermination du sous-cas de démarrage de la période de référence.** Le référentiel (§2.3.1)
   distingue deux règles de démarrage selon que la durée requise a été atteinte avant ou après
   l'âge légal — ce qui suppose de connaître la **date exacte** d'acquisition du dernier trimestre
   requis. C'est un sous-problème du point 1 (même blocage de chronologie) : sans date précise
   d'acquisition, impossible de choisir la bonne règle sans un choix arbitraire non documenté par
   le référentiel pour ce cas.

4. **Fin de période au trimestre civil près.** Le référentiel borne la fin de la période de
   référence au dernier jour du trimestre civil précédant la date d'effet, pas à l'année civile.
   Une implémentation au niveau annuel (§4) resterait une approximation à ce titre, à signaler
   explicitement si elle est un jour codée — pas un problème à résoudre dans cette note.

5. **Rachats option 2 (taux et durée) situés dans la période de référence** ouvrent aussi droit à
   surcote (référentiel §2.3.1). Le simulateur de rachat de `Trimestres.tsx` connaît déjà l'option
   choisie (`optionRachat: 'tauxSeul' | 'tauxEtDuree'`) mais reste, par sa propre documentation,
   « un sandbox éphémère, aucune persistance » : les trimestres rachetés n'existent nulle part dans
   `retraite_carriere_detail`. Il n'y a donc rien à connecter côté carrière enregistrée pour ce cas
   aujourd'hui — signalé pour mémoire, pas un manque à combler dans le cadre de cette conception.

6. **Ordre d'application et interaction avec le MICO (référentiel §3.7, §12.3).** Cette note
   propose de séparer la surcote de la décote (§2) et de déterminer un nombre correct de
   trimestres de surcote éligibles (§3-4) — mais ne redessine pas *où* ce montant s'insère dans le
   calcul global de pension. Aujourd'hui, décote et « surcote » sont conflatées dans une seule
   variable multipliée sur `pensionBaseBrute` avant la comparaison `Math.max(..., minimumContributif(...))`
   ([Carriere.tsx](../../src/components/retraite/Carriere.tsx)) — alors que le référentiel exige un
   montant de surcote calculé séparément, additionné **après** détermination du MICO (`P1 = P0 +
   surcote + MICO`, §3.7). C'est un chantier distinct, déjà repéré par l'audit référentiel comme
   écarts liés à la structure du MICO (majoré, écrêtement, ordre d'application) — volontairement
   hors périmètre de cette note, qui se limite à préparer un nombre de trimestres de surcote
   correct, pas à refaire l'assemblage final de la pension.

7. **Surcote parentale (référentiel §2.3.2, écart #6 de l'audit).** Explicitement hors périmètre
   de cette mission (écart distinct). Note pour une future session : le référentiel précise que
   « les trimestres de surcote parentale et de surcote classique s'additionnent » (régime général)
   — la séparation proposée ici (une fonction de surcote dédiée, distincte de la décote) est un
   prérequis structurel pour pouvoir un jour additionner proprement les deux, mais cette note ne
   conçoit pas la surcote parentale elle-même.

---

## 6. Résumé de la proposition

- Ne pas modifier `decoteSurTrimestres()` pour qu'elle « fasse aussi » la surcote : créer une
  fonction de surcote séparée, avec sa propre porte d'éligibilité (âge légal dépassé, trimestres
  cotisés uniquement) — la décote et la surcote sont deux mécanismes distincts du référentiel, pas
  deux lectures d'un même excédent.
- Âge légal : déjà résolu par `ageLegalPourGeneration()` (Session A) — seule manque une petite
  fonction de conversion `{ans, mois}` → date exacte, sur le modèle de `dateEffetSimuleeParAge()`
  déjà présente. Pas de nouveau calcul de barème.
- Trimestres cotisés : déjà résolus par `trimestresCotisesEtAssimilesDepuisCarriere()` — il manque
  seulement d'exposer la granularité annuelle déjà calculée en interne (`parAnnee`), extension
  additive et non cassante du type de retour existant.
- La chronologie infra-annuelle exacte (années limites mixtes, date précise d'acquisition du
  dernier trimestre requis, fin de période au trimestre civil près) reste un point non résolu,
  cohérent avec la dette déjà documentée dans le fichier et dans `audit-retraite.md` — une
  granularité annuelle couvre le cas majoritaire (années « propres ») sans le résoudre entièrement.
- L'insertion du montant de surcote dans l'assemblage final de la pension (ordre d'application,
  interaction MICO) et la surcote parentale restent des chantiers séparés, déjà identifiés par
  ailleurs dans l'audit — non traités ici.
