# Implémentation — date de liquidation comme source de vérité (UI)

> Rapport de session. Fait suite à [implementation-date-effet-moteur.md](implementation-date-effet-moteur.md)
> (Session A — moteur) et à [conception-date-effet.md](conception-date-effet.md) (Option 2 : la
> date de liquidation devient la source de vérité côté UI, l'âge une valeur dérivée affichée).
> Périmètre de cette session : remplacer le contrôle de saisie d'âge simulé par un sélecteur de
> date, **uniquement** là où un tel contrôle existe. Écarts #4 à #15 de l'audit
> ([audit-retraite.md §7](audit-retraite.md)) non touchés.

---

## 1. Classement des 7 points d'entrée — avant tout changement de code

Repris de [implementation-date-effet-moteur.md §3](implementation-date-effet-moteur.md). Critère
de classement : le point d'entrée est-il piloté par le slider `ageSimule` (le contrôle de saisie
que cette mission retire), directement ou par transitivité (même valeur `age` en paramètre) ?

| # | Point d'entrée | Catégorie | Justification |
|---|---|---|---|
| 1 | `trimestresRequisPourGeneration` — Trimestres.tsx (`simulerPourAge`) | **a. UI-facing** | Recevait directement `ageSimule` (scénario sélectionné) en paramètre `age`. |
| 2 | `trimestresRequis` — Carriere.tsx | **b. Interne** | Proxy = date du jour, aucun contrôle de saisie d'âge sur cet écran (confirmé Session A) — inchangé par construction. |
| 3 | `ageLegalPourGeneration` (reconnexion) | **a. UI-facing** | Calculée dans le même `simulerPourAge()` que #1, avec le même `age`. |
| 4 | `decoteSurAge` — Trimestres.tsx | **a. UI-facing** | Reçoit directement `ageSimule` en paramètre (deux appels : scénario sélectionné et scénario « avec rachat ») — ne consulte aucune table de génération, mais dépend bien du contrôle retiré. |
| 5 | `decoteSurAgeFonctionPublique` — CarriereFonctionPublique.tsx | **b. Interne** | Reçoit un âge saisi manuellement dans un champ dédié à cet écran (catégorie active), sans rapport avec `ageSimule` — aucun changement d'écran nécessaire pour cette mission. |
| 6 | `dureeSAMPourGeneration` — calculSAM.ts (via RISImportDialog.tsx) | **b. Interne** | Pas de scénario d'âge, calcul automatique sur la carrière importée. |
| 7 | `AGE_DEPART_PAR_DEFAUT = 67` — calculSAM.ts | **b. Interne** | Constante de projection, aucune interaction utilisateur. |
| — | Texte statique `ageTauxPlein` — Carriere.tsx | **b. Interne** | Affichage statique, aucun contrôle — hors périmètre de toute façon (écart #7 de l'audit architecture, non traité ici). |

**Conclusion du classement : un seul écran est concerné — [Trimestres.tsx](../../src/components/retraite/Trimestres.tsx).**
Les points #1, #3 et #4 y sont tous les trois pilotés par le même state `ageSimule` (directement
ou via le même paramètre `age` de `simulerPourAge()`) : un seul contrôle à remplacer suffit à
corriger les trois simultanément, puisqu'ils partagent la même source. Aucun autre fichier ne
contient de contrôle de saisie d'âge lié à la génération/bascule de barème.

---

## 2. Vérification préalable — usages de `ageSimule` hors du point identifié

Recherche exhaustive (`grep -rn "ageSimule" src`) avant toute suppression : **10 occurrences,
toutes dans `Trimestres.tsx`** (state, effet d'initialisation, lecture dans les calculs, affichage
JSX). Aucune autre référence dans le reste de l'application — ni export, ni prop transmise à un
composant enfant, ni consommation par un hook partagé. Le slider et son state ont donc pu être
retirés intégralement sans risque de casser autre chose hors du périmètre.

---

## 3. Écran modifié — [Trimestres.tsx](../../src/components/retraite/Trimestres.tsx)

### Avant

```tsx
<Slider id="age-simule" min={60} max={70} step={1} value={[ageSimule]}
        onValueChange={(value) => setAgeSimule(value[0])} />
```

`ageSimule` (un `number`, 60 à 70) était directement la source de vérité : `simulerPourAge(age)`
convertissait cet âge en date d'effet approximative (`dateEffetSimuleeParAge`, anniversaire du
mois de naissance) avant d'appeler le moteur — perdant toute précision infra-mensuelle sur la date
réellement simulée.

### Après

```tsx
<Input id="date-liquidation" type="date"
       value={dateLiquidation || dateLiquidationEffet.toISOString().slice(0, 10)}
       min={dateLiquidationMin} max={dateLiquidationMax}
       onChange={(e) => setDateLiquidation(e.target.value)} />
```

Contrôle natif `<input type="date">`, même convention que le reste du module (déjà utilisée par
[PeriodeCarriereEditDialog.tsx](../../src/components/retraite/PeriodeCarriereEditDialog.tsx) pour
les dates de période de carrière) — pas de nouveau composant introduit. Bornes `min`/`max`
calculées depuis la date de naissance (anniversaires de 60 et 70 ans), reprenant les limites de
l'ancien slider.

`dateLiquidation` (chaîne ISO) est désormais la **source de vérité** du scénario. L'âge affiché
(`resultatSelection.ageAffiche`, ex-`ageSimule` dans le rendu) est **dérivé** :

```ts
const ageAffiche = computeAge(dateNaissance, dateEffet) ?? ageActuelConfirme;
```

— calculé à chaque scénario via `computeAge()` (déjà utilisé ailleurs dans l'app pour l'âge
actuel), non modifiable directement par l'utilisateur. Il reste affiché à côté du sélecteur de
date (« 61 ans » par exemple), et dans tous les libellés qui le mentionnaient déjà (pension à
« X ans », rachat de trimestres, mise en évidence de la ligne correspondante dans le tableau
comparatif).

`simulerPourDateEffet(dateEffet: Date)` remplace `simulerPourAge(age: number)` comme fonction de
calcul principale, appelée directement avec la date choisie — plus de conversion âge→date
intermédiaire pour le scénario sélectionné. `simulerPourAge()` est **conservée** comme fine
enveloppe (`simulerPourDateEffet(dateEffetSimuleeParAge(dateNaissance, age))`), uniquement pour le
tableau comparatif non interactif (62 à 70 ans) — cf. §1, ce tableau n'est pas un contrôle de
saisie et reste donc un point d'entrée « interne », intentionnellement inchangé.

### Ce qui n'a pas changé sur cet écran

- La carte « Rachat de trimestres » (régime, option, revenu, nombre de trimestres) — aucun de ces
  champs n'est lié à la génération/bascule de barème.
- Le tableau comparatif par âge (62-70 ans) — cf. ci-dessus, reste piloté par âge en interne.
- Les cartes « Trimestres validés projetés / requis / décote-surcote » et le total consolidé —
  seule leur source (date au lieu d'âge) a changé, pas leur présentation.

---

## 4. Fichiers modifiés

| Fichier | Nature |
|---|---|
| [src/lib/retraite/calcul.ts](../../src/lib/retraite/calcul.ts) | Ajout de `dateDepuisISO()` (parsing ISO générique, même précaution anti-fuseau-horaire que `dateNaissanceDepuisISO()`) ; docstring de `dateEffetSimuleeParAge()` mise à jour (ne sert plus qu'au tableau comparatif non interactif) |
| [src/lib/retraite/calcul.test.ts](../../src/lib/retraite/calcul.test.ts) | Nouveaux tests — cf. §5 |
| [src/components/retraite/Trimestres.tsx](../../src/components/retraite/Trimestres.tsx) | Slider → sélecteur de date ; `ageSimule` retiré ; `simulerPourDateEffet()` ; âge dérivé partout où `ageSimule` était utilisé |

Aucun autre fichier : `Carriere.tsx`, `CarriereFonctionPublique.tsx`, `CarriereCNAVPL.tsx`,
`RISImportDialog.tsx`, `calculSAM.ts` non touchés (points d'entrée classés « Interne », §1).

---

## 5. Tests

`calcul.test.ts` : 4 tests → 5 nouveaux (44 tests au total dans ce fichier, contre 39 avant cette
session) :

- **`dateDepuisISO`** : parsing sans décalage de fuseau (même précaution que
  `dateNaissanceDepuisISO`), et reproduction des bornes de bascule déjà couvertes en Session A.
- **Scénario explicitement demandé par la mission** (« deux dates proches de part et d'autre de la
  bascule doivent produire un âge légal différent même à âge simulé identique ») — génération 1965
  T2 (née le 15/04/1965, zone instable), deux dates de liquidation à un mois d'écart (15/08/2026 et
  15/09/2026) :
  - les deux produisent le **même âge affiché** (61 ans, vérifié via `computeAge()` — l'âge ne
    change qu'à l'anniversaire, indépendamment du mois choisi dans l'année) ;
  - mais un **âge légal différent** (63 ans et 3 mois vs 63 ans pile) et un **nombre de trimestres
    requis différent** (172 vs 171) — la preuve concrète que le sélecteur de date capture une
    information que l'ancien slider d'âge ne pouvait structurellement pas représenter.

### Résultats

```
npx tsc --noEmit -p .      → 0 erreur
npx vitest run              → 39 fichiers, 468 tests passés, 6 todo, 0 échec
```

Aucune régression sur les 463 tests déjà présents après la Session A.

**Non vérifié dans cette session** (même limite que la Session A) : rendu visuel de
`Trimestres.tsx` dans le navigateur — application protégée par authentification, aucune session
ouverte disponible. Serveur de développement démarré sans erreur (`preview_logs` : aucune erreur).
Aucune infrastructure de test de composant (`@testing-library/react`, environnement `jsdom`)
n'existe dans ce dépôt pour vérifier le rendu du nouveau contrôle autrement — limite déjà
documentée dans `audit-retraite.md`. Un contrôle visuel humain du nouveau sélecteur de date
(alignement, calendrier natif du navigateur, bornes min/max) reste recommandé avant mise en
production.

---

## 6. Hors périmètre (rappel)

- Points d'entrée #2, #5, #6, #7 et le texte statique `ageTauxPlein` (catégorie « Interne », §1) —
  non touchés, conformément à la consigne.
- Écarts #4 à #15 de l'audit référentiel — non touchés.
- Aucun champ supplémentaire ajouté au-delà du remplacement demandé (pas d'affichage de l'âge
  légal lui-même sur cet écran — resultatSelection.ageLegal reste calculé mais non affiché, comme
  en Session A ; l'ajouter serait un élargissement de périmètre non demandé par cette mission).
