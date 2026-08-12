# Implémentation — date d'effet dans le moteur de calcul Retraite

> Rapport de session. Fait suite à [conception-date-effet.md](conception-date-effet.md), qui
> diagnostiquait les écarts #2 et #3 de [audit-retraite.md §7](audit-retraite.md). Périmètre de
> cette session : **moteur de calcul uniquement**. Décision produit actée en amont : la date de
> liquidation deviendra la source de vérité côté UI, l'âge une valeur dérivée affichée (Option B
> de la note de conception) — mais **aucun champ de saisie de date n'est introduit ici**, cette
> session ne touche à aucune interface. Chaque point d'entrée conserve son proxy actuel de date
> d'effet (âge simulé, date du jour) ; ces proxys sont documentés ci-dessous pour préparer la
> Session B (UI).

---

## 1. Fichiers modifiés

| Fichier | Nature du changement |
|---|---|
| [src/lib/retraite/calcul.ts](../../src/lib/retraite/calcul.ts) | Cœur du changement — cf. §2 |
| [src/lib/retraite/calcul.test.ts](../../src/lib/retraite/calcul.test.ts) | Réécrit pour les nouvelles signatures ; couverture bascule + découpages infra-annuels |
| [src/components/retraite/Carriere.tsx](../../src/components/retraite/Carriere.tsx) | `trimestresRequis` : constante 172 figée → calcul réel (écart #2/#3, point d'entrée #2) |
| [src/components/retraite/Trimestres.tsx](../../src/components/retraite/Trimestres.tsx) | Date de naissance complète (année+mois) au lieu de l'année seule ; reconnexion de `ageLegalPourGeneration()` (point d'entrée #1 et #3) |

Aucun autre fichier modifié. `CarriereFonctionPublique.tsx` et `CarriereCNAVPL.tsx` reçoivent
`trimestresRequis` en prop depuis `Carriere.tsx` (lignes 770 et 780) : ils héritent de la
correction sans changement de code propre.

---

## 2. Le cœur du changement — [calcul.ts](../../src/lib/retraite/calcul.ts)

### 2a. Bornes génération → année + mois

`DateNaissance { annee, mois }` remplace `anneeNaissance: number` comme paramètre d'entrée de
`trimestresRequisPourGeneration()` et `ageLegalPourGeneration()`. Les tables de bornes
(`BAREME_STABLE_AVANT_1964`, `BAREME_INSTABLE_1964_1968`) sont indexées sur `{ annee, mois }`
(comparées via un entier absolu `annee*12+mois`), et couvrent les trois découpages infra-annuels
documentés par le référentiel pour ces bornes (§2.1.1, §12.3) :

- **1951** (1er juillet) : avant vs à partir du 01/07/1951.
- **1961** (1er septembre) : avant vs à partir du 01/09/1961.
- **1965** (1er avril) : avant vs à partir du 01/04/1965 — c'est l'écart #3 de l'audit.

**Non couvert, par choix documenté :** le quatrième découpage cité par la note de conception
(« carrière longue 1965/1966 ») n'apparaît nulle part dans le référentiel fourni au-delà d'une
mention générique (« carrière longue (58 à 63 ans) », sans barème chiffré par mois de naissance).
Aucune valeur n'est donc fabriquée pour ce cas — cf. `docs/retraite-base-referentiel.md`,
recherche exhaustive du terme « carrière longue » : trois occurrences, aucune table numérique.

**Cas particulier « avant le 01/07/1951 » :** le référentiel indique une durée requise « — »
(non chiffrée) pour cette classe. Faute de valeur documentée, et cette génération n'étant pas un
cas d'usage réaliste pour un outil utilisé en 2026 (76 ans et plus), la valeur de la tranche
suivante (163 trimestres) est retenue par défaut, avec un commentaire explicite dans le code
(`BAREME_STABLE_AVANT_1964`) — l'âge légal, lui documenté (60 ans), reste exact.

**Table `dureeSAMPourGeneration()` (dureeSAMParGeneration.ts) : non modifiée**, contrairement au
reste des « 4 tables » identifiées par le diagnostic (celle-ci en faisait partie). Le référentiel
ne documente aucun découpage infra-annuel pour la durée SAM (§3.4.3 — stable par génération
entière depuis 1948, aucune mention d'un seuil au mois près), et cette durée n'est pas affectée
par la bascule LFSS 2026 (aucune mention dans §12.1). Généraliser sa signature aurait été un
changement cosmétique sans gain réel — décision documentée ici plutôt qu'appliquée par principe.

### 2b. Second jeu de valeurs, limité à six lignes (1964-1968)

`BAREME_INSTABLE_1964_1968` stocke deux jeux (`calendrier2023` / `lfss2026`) uniquement pour les
six lignes où le référentiel §2.1.1 et §2.1.2 divergent réellement (1964, 1965 T1, 1965 T2-T4,
1966, 1967, 1968) — vérifié ligne à ligne, aucun autre écart entre les deux tables du référentiel.
`BAREME_STABLE_AVANT_1964` et `BAREME_1969_ET_APRES` n'ont qu'une valeur, valide pour les deux
jeux.

### 2c. Fonction de bascule

```ts
export type JeuBareme = 'anterieur_2023' | 'calendrier_2023' | 'lfss_2026';
export function jeuBaremeApplicable(dateEffet: Date): JeuBareme
```

Bornes : 1er septembre 2023 et 1er septembre 2026 (référentiel §2.1.3), toutes deux **incluses**
dans le jeu qui commence à cette date (testé explicitement : `2026-09-01` → `lfss_2026`,
`2026-08-31` → `calendrier_2023`).

**`anterieur_2023` : cas géré différemment par les deux fonctions publiques**, par choix
documenté dans le code :

- `trimestresRequisPourGeneration()` **replie silencieusement** sur le jeu `lfss_2026` — c'est
  exactement le comportement de cet outil *avant* cette session (il appliquait déjà ce jeu
  inconditionnellement, sans notion de date). Aucune régression pour ce cas ; correction réelle
  pour toute date d'effet à compter du 1er septembre 2023.
- `ageLegalPourGeneration()` **retourne une indétermination explicite**
  (`{ stable: false; raison }`), sur le même principe de conception que la version précédente de
  cette fonction (union discriminée pour ne jamais renvoyer un chiffre silencieusement faux) —
  reciblée sur la nouvelle cause d'indétermination réelle (barème antérieur à 2023 non documenté
  par le référentiel, §12.2 point 4) plutôt que l'ancienne (zone 1964-1968 sans date d'effet,
  désormais résolue par construction dès qu'une date d'effet est fournie).

Ce choix asymétrique est assumé : `trimestresRequisPourGeneration()` est consommée par des calculs
en aval (proratisation, décote) où retourner `undefined` propagerait une erreur dans toute la
chaîne pour un cas très marginal en pratique ; `ageLegalPourGeneration()` n'a aujourd'hui aucun
consommateur numérique en aval (cf. §3), donc rien n'est perdu à rester strictement honnête sur
l'absence de donnée.

### 2d. Utilitaires de date

- `dateNaissanceDepuisISO(dateISO: string): DateNaissance` — parse une date `"YYYY-MM-DD"` par
  découpage de chaîne, **pas** via `new Date(...).getMonth()`. Ce dernier interprète une date-only
  string comme minuit UTC, puis la relit en heure locale : un fuseau horaire en décalage négatif
  peut faire retomber le résultat sur le mois civil précédent — silencieusement faux pile sur les
  bornes qui comptent ici (1er avril 1965, 1er septembre 1961...). C'est le point 4 de la mission
  (« arrêter la troncature du mois de naissance ») : la troncature n'était pas seulement une perte
  d'information (année seule), elle exposait aussi ce risque de décalage si elle avait été
  supprimée naïvement avec `new Date(...).getMonth()`.
- `dateEffetSimuleeParAge(dateNaissance, age): Date` — anniversaire de l'année
  `dateNaissance.annee + age`, proxy documenté au §3 pour les écrans qui simulent un âge plutôt
  qu'une date.

---

## 3. Les 7 points d'entrée — état après cette session et proxy de date d'effet

Repris de [conception-date-effet.md §1](conception-date-effet.md). Pour chaque point d'entrée
concerné par la bascule, la donnée qui sert **aujourd'hui** de proxy pour la date d'effet est
documentée ci-dessous — sans modification (aucun nouveau champ), conformément à la consigne.
C'est l'information dont la Session B aura besoin pour savoir où brancher un vrai champ de date.

| # | Point d'entrée | État après cette session | Proxy de date d'effet utilisé |
|---|---|---|---|
| 1 | `trimestresRequisPourGeneration` — [Trimestres.tsx](../../src/components/retraite/Trimestres.tsx) (`simulerPourAge`) | **Corrigé** | `dateEffetSimuleeParAge(dateNaissance, age)` — anniversaire de l'âge simulé (slider ou ligne du tableau comparatif 62-70 ans). **Chaque âge simulé peut désormais retomber d'un côté ou de l'autre de la bascule du 01/09/2026** pour un utilisateur né en zone instable (1964-1968) — vérifié par test (§4). |
| 2 | `trimestresRequis` — [Carriere.tsx](../../src/components/retraite/Carriere.tsx) (ex-constante 172) | **Corrigé** | `new Date()` — date du jour. Cet écran n'a pas de simulation d'âge (c'est une photo de carrière actuelle, pas un simulateur) ; « date du jour » est le proxy le plus honnête sans ajouter de champ. |
| 3 | `ageLegalPourGeneration` | **Reconnectée** | Même proxy que #1 (calculée dans le même `simulerPourAge()`, à partir du même `dateEffetSimuleeParAge`). Le résultat est inclus dans l'objet retourné par `simulerPourAge()` mais **n'est affiché sur aucun écran** — aucune interface ne montre l'âge légal aujourd'hui (confirmé dans la note de conception). C'est le point de branchement prêt pour la Session B. |
| 4 | `decoteSurAge` — Trimestres.tsx | Inchangé | Non concerné : ne consulte aucune table de génération (comparaison d'âge contre 67 ans fixe, référentiel §2.1.4 confirme ce seuil stable pour toutes les générations couvertes). |
| 5 | `decoteSurAgeFonctionPublique` — CarriereFonctionPublique.tsx | Inchangé | Non concerné : âge saisi manuellement par l'utilisateur (catégorie active), pas dérivé d'une génération. |
| 6 | `dureeSAMPourGeneration` — calculSAM.ts (via RISImportDialog.tsx) | Inchangé (justifié §2a) | Non concerné : pas de bascule LFSS 2026 documentée pour la durée SAM. |
| 7 | `AGE_DEPART_PAR_DEFAUT = 67` — calculSAM.ts | Inchangé | Non concerné : hypothèse de projection des années futures du SAM, pas un lookup de barème par génération. |
| — | Texte statique `ageTauxPlein` — Carriere.tsx | **Volontairement non touché** | Hors périmètre : modification d'affichage, interdite par la consigne de cette session. Toujours signalé comme dette (audit §5, point 7). |

**Couplage avec l'architecture déjà connue :** `CarriereFonctionPublique.tsx` et
`CarriereCNAVPL.tsx` recevaient déjà (et reçoivent toujours) `trimestresRequis` en prop depuis
`Carriere.tsx` — en corrigeant la source (#2), ces deux sous-cartes affichent désormais aussi la
valeur correcte, sans changement de code propre. C'est exactement le couplage anticipé par la note
de conception (§4.2) : corriger #2/#3 sans corriger la constante figée de `Carriere.tsx` aurait
laissé le module incohérent entre écrans.

---

## 4. Tests

`src/lib/retraite/calcul.test.ts` réécrit intégralement pour les nouvelles signatures.
Nouvelles couvertures, en plus de ce qui existait déjà (`minimumContributif`) :

- **`jeuBaremeApplicable`** : bornes exactes du 01/09/2023 et du 01/09/2026, des deux côtés
  (veille incluse dans le jeu précédent, jour J inclus dans le jeu suivant).
- **`dateNaissanceDepuisISO`** / **`dateEffetSimuleeParAge`** : parsing sans décalage de fuseau,
  construction de date d'effet simulée.
- **`trimestresRequisPourGeneration`** :
  - découpage 1951 (avant/à partir du 01/07) ;
  - découpage 1961 (avant/à partir du 01/09) — déjà couvert indirectement avant cette session,
    désormais explicite ;
  - découpage 1965 (avant/à partir du 01/04) — **écart #3**, y compris un test dédié « un départ
    quelques semaines avant le 01/09/2026 change le résultat » (référentiel §12.3) ;
  - bascule 1964-1968, les deux jeux, pour chacune des six lignes ;
  - generations stables 1957-1961 (régression de l'écart #1, conservée) ;
  - repli documenté pour `dateEffet` antérieure au 01/09/2023 (zone instable et génération
    stable).
- **`ageLegalPourGeneration`** : mêmes générations, désormais **toujours déterminées** dès qu'une
  date d'effet à compter du 01/09/2023 est fournie (avant cette session, 1964-1968 était
  toujours indéterminée par construction, sans notion de date d'effet) ; indétermination explicite
  conservée pour `anterieur_2023`.

### Résultats

```
npx tsc --noEmit -p .      → 0 erreur
npx vitest run              → 39 fichiers, 463 tests passés, 6 todo, 0 échec
```

Aucune régression sur les 424 tests préexistants (hors le fichier `calcul.test.ts` lui-même,
passé de 20 à 39 tests). Vérification statique complète (`tsc --noEmit`) : aucun appelant obsolète
des anciennes signatures `trimestresRequisPourGeneration(number)` /
`ageLegalPourGeneration(number, number?)` n'a été laissé dans le projet.

**Non vérifié dans cette session :** rendu visuel des écrans `Carriere.tsx` / `Trimestres.tsx`
dans le navigateur — l'application est protégée par authentification et aucune session ouverte
n'était disponible pour cette vérification. Le serveur de développement démarre sans erreur
(`preview_logs` : aucune erreur), et le contrôle de type (`tsc --noEmit`) couvre la cohérence des
appels entre fichiers, mais un contrôle visuel humain de l'écran « Carrière » (nouvelle valeur de
trimestres requis affichée) reste recommandé avant mise en production.

---

## 5. Ce qui reste hors périmètre (rappel, pour éviter toute confusion avec la Session B)

- Aucun champ de saisie de date de liquidation n'a été ajouté — les proxys du §3 restent en place.
- Le texte statique « 67 ans (âge automatique du taux plein) » de `Carriere.tsx` n'a pas été
  rendu dynamique (dette déjà connue, audit §5 point 7 — distincte des écarts #2/#3 traités ici).
- La table `dureeSAMPourGeneration()` n'a pas été touchée (justifié §2a).
- Le découpage « carrière longue 1965/1966 » n'est pas modélisé, faute de barème chiffré dans le
  référentiel fourni (cf. §2a).
- `decoteSurAge()` / `decoteSurAgeFonctionPublique()` (âge du taux plein automatique, 67 ans) et
  la variabilité de ce seuil pour les générations antérieures à 1955 (référentiel §2.1.1, colonne
  « âge du taux plein » — 65 à 66a7m pour les générations 1951-1954) ne sont **pas** modélisées :
  hors périmètre des écarts #2/#3 (qui portent sur l'âge légal et la durée requise, pas l'âge du
  taux plein), non demandé par cette mission, et sans impact pratique aujourd'hui (référentiel
  §2.1.4 : stable à 67 ans pour toutes les générations à compter de 1955).
