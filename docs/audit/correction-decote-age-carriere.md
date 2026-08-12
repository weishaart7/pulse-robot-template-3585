# Correction — decoteSurAge() manquante dans Carriere.tsx (écart #4)

> Rapport de session. Fait suite à [audit-retraite.md §7](audit-retraite.md), écart #4 : «
> l'écran « Carrière » ignore la règle d'âge ». Périmètre : ce seul écart. Écarts #5 à #15 non
> touchés.

---

## 1. Revérification — l'écart existe-t-il encore ?

`Carriere.tsx` a été réécrit deux fois depuis l'audit initial (Session A : constante `172` →
calcul réel ; Session B : slider → sélecteur de date, sur `Trimestres.tsx` uniquement). Aucune de
ces deux sessions n'a touché au calcul de `decoteSurcote`.

Recherche sur l'état actuel du fichier (avant toute correction de cette session) :

```
grep -n "decoteSurAge\|decoteApplicable\|decoteSurTrimestres" src/components/retraite/Carriere.tsx
16:  decoteSurTrimestres,
206:    setDecoteSurcote(decoteSurTrimestres(trimValides + trimAutresRegimes, trimestresRequis));
```

**L'écart existe toujours, tel que décrit par l'audit.** `Carriere.tsx` n'importait ni
`decoteSurAge` ni `decoteApplicable` ; `decoteSurcote` (ligne 206, avant correction) était
calculée uniquement à partir de `decoteSurTrimestres(...)`. Comparaison avec
[Trimestres.tsx](../../src/components/retraite/Trimestres.tsx), qui utilise depuis toujours (et
encore aujourd'hui, Session B y a seulement changé la source de l'`age`) :

```ts
const decote = decoteApplicable(
  decoteSurTrimestres(trimestresValidesProjetes, trimestresRequis),
  decoteSurAge(ageAffiche)
);
```

La description de l'audit reste exacte : un client de 67 ans ou plus (âge du taux plein
automatique, référentiel §2.1.4) avec des trimestres incomplets se voyait appliquer la décote de
`decoteSurTrimestres()` seule dans la carte « Carrière », alors que `decoteSurAge()` l'aurait
exonérée. Pas d'improvisation nécessaire : le code de référence à reproduire existait déjà dans
`Trimestres.tsx`, exactement comme le décrit la mission.

---

## 2. Correction — reproduire la logique de `Trimestres.tsx`

### Le proxy d'âge

`Trimestres.tsx` dispose d'une date de liquidation simulée (`resultatSelection.ageAffiche`,
Session B) pour nourrir `decoteSurAge()`. `Carriere.tsx` n'a pas d'équivalent : c'est un écran de
« carrière actuelle », dont le proxy de date d'effet déjà établi en Session A est **« aujourd'hui
»** (`new Date()`, cf. l'effet qui calcule `trimestresRequis`). Par cohérence, l'âge à comparer à
l'âge du taux plein automatique est donc **l'âge actuel** du client — calculé avec `computeAge()`,
déjà utilisé ailleurs dans le module (`Trimestres.tsx`, `bareme669CGI.ts`), pas une nouvelle
fonction.

`computeAge()` attend une date de naissance ISO brute ; `Carriere.tsx` ne conservait jusqu'ici que
l'année (`anneeNaissance`) et `{annee, mois}` (`dateNaissanceDetail`, Session A). Un état
supplémentaire `dateNaissanceISO` a été ajouté pour la conserver, renseigné dans le même effet que
les deux autres.

### Le calcul

[Carriere.tsx](../../src/components/retraite/Carriere.tsx), effet `decoteSurcote` — avant/après :

```diff
- setDecoteSurcote(decoteSurTrimestres(trimValides + trimAutresRegimes, trimestresRequis));
+ const decoteTrimestres = decoteSurTrimestres(trimValides + trimAutresRegimes, trimestresRequis);
+ const decoteFinale =
+   ageActuel !== null ? decoteApplicable(decoteTrimestres, decoteSurAge(ageActuel)) : decoteTrimestres;
+ setDecoteSurcote(decoteFinale);
```

`decoteApplicable(decoteSurTrimestres, decoteSurAge)` retient le plus favorable des deux — c'est
la fonction déjà utilisée par `Trimestres.tsx`, **importée et appelée à l'identique**, aucune
logique nouvelle écrite. Le seul ajout propre à `Carriere.tsx` est le repli sur
`decoteSurTrimestres` seule tant que `ageActuel` n'est pas encore connu (chargement du profil
famille) : comportement historique préservé pendant ce court intervalle, pas une régression.

---

## 3. Cascade vers le minimum contributif (MICO)

`decoteSurcote` (state) alimente directement `pensionBaseAjustee` et
`minimumContributif()` :

```ts
const pensionBaseAjustee = Math.max(
  pensionBaseBrute * (1 + decoteSurcote / 100),
  minimumContributif(trimValidesRegimeGeneral, trimestresRequis, decoteSurcote)
);
```

Dans [calcul.ts](../../src/lib/retraite/calcul.ts), `minimumContributif()` :

```ts
export function minimumContributif(trimestresValides, trimestresRequis, decote) {
  if (decote < 0) {
    return 0;
  }
  return MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 * Math.min(trimestresValides / trimestresRequis, 1);
}
```

Confirme exactement la cascade décrite par l'audit : tant que `decoteSurcote` était calculée sans
tenir compte de l'âge, un client de 67 ans et plus avec des trimestres incomplets recevait
`decote < 0` (via `decoteSurTrimestres` seule) et se voyait donc **exclu à tort du MICO**, alors
que le référentiel (§3.5.1, condition 1) n'exige que l'atteinte de l'âge du taux plein — pas la
durée — pour y être éligible. Aucune modification de `minimumContributif()` n'était nécessaire :
la fonction applique déjà correctement sa condition d'éligibilité ; c'est la valeur
`decoteSurcote` reçue en entrée qui était fausse. La correction du §2 se propage donc
automatiquement, sans changement à `calcul.ts`.

---

## 4. Fichier modifié

Un seul fichier de code : [src/components/retraite/Carriere.tsx](../../src/components/retraite/Carriere.tsx).

- Import de `decoteSurAge`, `decoteApplicable` (déjà exportées par `calcul.ts`, Session A/B —
  aucune nouvelle fonction), et de `computeAge` (déjà utilisée ailleurs dans le module).
- Nouvel état `dateNaissanceISO` (date de naissance brute, nécessaire à `computeAge()`).
- Nouvelle valeur dérivée `ageActuel = computeAge(dateNaissanceISO)`.
- Effet `decoteSurcote` : combine `decoteSurTrimestres()` et `decoteSurAge()` via
  `decoteApplicable()`, comme `Trimestres.tsx`.

`CarriereFonctionPublique.tsx` et `CarriereCNAVPL.tsx` reçoivent `trimestresRequis` en prop
(inchangé) mais gèrent leur propre décote indépendamment (`decoteSurAgeFonctionPublique()`, point
d'entrée #5 de la Session B — hors périmètre, non concerné par cet écart) : aucun changement
nécessaire de leur côté.

---

## 5. Tests

Ajoutés à `src/lib/retraite/calcul.test.ts` (nouveau `describe`, 4 tests) — reproduisent
exactement le calcul désormais effectué par `Carriere.tsx` (`decoteApplicable(decoteSurTrimestres(...),
decoteSurAge(...))`, puis `minimumContributif()` sur le résultat), scénario demandé par la mission
(67 ans et plus, trimestres incomplets) :

| Scénario | Décote | MICO |
|---|---|---|
| **Avant correction** (bug reproduit) — `decoteSurTrimestres` seule, 140/172 trimestres | **-20 %** | **0** (exclu à tort) |
| **Après correction**, 67 ans | **0 %** (l'âge l'emporte) | `MICO × 140/172 > 0` |
| **Après correction**, 68 ans (au-delà, pas seulement à l'âge pile) | **0 %** | `> 0` |
| **Après correction**, 66 ans (avant l'âge du taux plein) | **-5 %** (le plus favorable des deux reste négatif) | **0** (comportement normal, pas une régression) |

Le dernier cas vérifie que la correction ne change rien pour un départ **avant** l'âge du taux
plein : la décote sur trimestres (ou la moins sévère des deux) continue de s'appliquer
normalement, seul le cas 67 ans et plus était concerné par le bug.

### Résultats

```
npx tsc --noEmit -p .      → 0 erreur
npx vitest run              → 39 fichiers, 472 tests passés, 6 todo, 0 échec
```

`calcul.test.ts` : 44 → 48 tests. Aucune régression sur les 468 tests déjà présents après la
Session B.

**Non vérifié dans cette session** (limite déjà documentée en Sessions A et B) : rendu visuel de
`Carriere.tsx` dans le navigateur — application derrière authentification, aucune infrastructure
de test de composant dans ce dépôt. `preview_logs` du serveur de développement : aucune erreur.

---

## 6. Hors périmètre (rappel)

- Écarts #5 à #15 de l'audit — non touchés.
- Le texte statique `ageTauxPlein` de `Carriere.tsx` (« 67 ans (âge automatique du taux plein) »)
  n'a pas été rendu dynamique — c'est un écart d'affichage distinct (audit architecture §5, point
  7), pas l'écart #4 traité ici, qui portait sur le *calcul* de `decoteSurcote`, pas sur ce
  libellé.
- `decoteSurAgeFonctionPublique()` (CarriereFonctionPublique.tsx) — point d'entrée séparé (#5,
  classé « Interne » en Session B), non concerné par cet écart.
