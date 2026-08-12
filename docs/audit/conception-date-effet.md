# Conception — date d'effet de la pension & scission infra-annuelle des générations

> Note de conception, diagnostic uniquement. Aucun code modifié dans cette session. Fait suite à
> l'audit de conformité référentiel ([docs/audit/audit-retraite.md](audit-retraite.md), §7),
> écarts **#2** (absence de « date d'effet de la pension » comme paramètre de calcul) et **#3**
> (génération 1965 non scindée au 1er avril). Référentiel : `docs/retraite-base-referentiel.md`
> §2.1.1 à §2.1.3, §12.3.

---

## 1. Cartographie des points d'entrée génération → paramètre légal

Recherche exhaustive (`grep -rn` sur `src/`) de tout ce qui dérive un âge légal, une durée
requise ou un âge du taux plein à partir d'une génération. **Sept points d'entrée distincts**,
pas un seul — confirmant l'hypothèse de départ de la mission (l'audit avait déjà relevé une
duplication Carrière/Optimisation sur `decoteSurAge`, mais le périmètre réel est plus large).

| # | Point d'entrée | Fichier | Table de bornes utilisée | Appelant(s) |
|---|---|---|---|---|
| 1 | `trimestresRequisPourGeneration(anneeNaissance)` | [calcul.ts:36-39](../../src/lib/retraite/calcul.ts) | `TRIMESTRES_REQUIS_PAR_GENERATION` (calcul.ts:27-34) — année seule | [Trimestres.tsx:145](../../src/components/retraite/Trimestres.tsx) uniquement |
| 2 | `trimestresRequis` figé | [Carriere.tsx:49](../../src/components/retraite/Carriere.tsx) | **constante `useState<number>(172)`**, aucune table | Carriere.tsx (partout dans l'écran), transmis en prop à `CarriereFonctionPublique.tsx:735` et `CarriereCNAVPL.tsx:745` |
| 3 | `ageLegalPourGeneration(anneeNaissance, moisNaissance?)` | [calcul.ts:107-133](../../src/lib/retraite/calcul.ts) | table interne dédiée (calcul.ts:107-132) — année + mois optionnel pour 1961 seulement | **aucun** — zéro appel dans un composant (vérifié par grep exhaustif sur `src/components` et `src/pages`) |
| 4 | `decoteSurAge(ageDepart, ageTauxPleinAuto = 67)` | [calcul.ts:189-195](../../src/lib/retraite/calcul.ts) | pas de table — 67 ans en dur (paramètre par défaut jamais surchargé) | [Trimestres.tsx:149,189](../../src/components/retraite/Trimestres.tsx) — **absent de Carriere.tsx** (déjà écart #4 de l'audit) |
| 5 | `decoteSurAgeFonctionPublique(ageDepart, ageAnnulationDecote = 67)` | [calculFonctionPublique.ts:58-67](../../src/lib/retraite/calculFonctionPublique.ts) | 67 ans par défaut, overridable par saisie manuelle (catégorie active) | [CarriereFonctionPublique.tsx:102](../../src/components/retraite/CarriereFonctionPublique.tsx) |
| 6 | `dureeSAMPourGeneration(anneeNaissance)` | [dureeSAMParGeneration.ts:31-34](../../src/lib/retraite/dureeSAMParGeneration.ts) | `DUREE_SAM_PAR_GENERATION` (dureeSAMParGeneration.ts:12-29) — année seule, **table indépendante des deux précédentes** | [calculSAM.ts:149](../../src/lib/retraite/calculSAM.ts), via `calculerSAM()` appelée depuis [RISImportDialog.tsx:41](../../src/components/retraite/RISImportDialog.tsx) |
| 7 | `AGE_DEPART_PAR_DEFAUT = 67` | [calculSAM.ts:42](../../src/lib/retraite/calculSAM.ts) | constante, borne la projection des années futures du SAM (`anneeDepartPrevue = anneeNaissance + 67`) | calculSAM.ts:150 |
| — | `ageTauxPlein` (texte statique) | [Carriere.tsx:53,189](../../src/components/retraite/Carriere.tsx) | aucune — chaîne littérale `"67 ans (âge automatique du taux plein)"` | affichage seul, déjà signalé (audit §5) |

**Constats transversaux :**

- **Quatre tables de bornes indépendantes** (#1, #2 implicite, #3, #6) évoluent aujourd'hui sans
  aucun lien entre elles. Une future correction de #1 ne corrige ni #2 (constante figée, pas une
  table), ni #3 (table à part), ni #6 (table à part, mais dont le contenu n'a pas besoin d'être
  synchronisé — cf. §4).
- **`ageLegalPourGeneration()` (#3) est un point d'entrée mort côté UI** : entièrement défini et
  testé, jamais appelé par un écran. Une note antérieure d'`audit-retraite.md` §5 la présentait
  comme utilisée par un indicateur de `Carriere.tsx` — vérification faite dans cette session, ce
  n'est pas le cas : l'indicateur en question ([Carriere.tsx:333-337](../../src/components/retraite/Carriere.tsx))
  s'appuie sur `trimestresCotisesEtAssimilesDepuisCarriere()`, pas sur `ageLegalPourGeneration()`.
  À corriger dans `audit-retraite.md` si confirmé lors d'une prochaine session (signalé ici pour
  mémoire, hors périmètre de correction de cette note).
- **`trimestresRequis` de l'écran « Carrière » (#2) n'est dérivé ni de la génération ni d'une
  quelconque date** — c'est une constante. Toute conception d'un modèle « bascule par date
  d'effet » qui ne corrigerait que #1 (déjà le seul point conforme au barème par génération)
  laisserait l'écran principal du module totalement hors du nouveau modèle. Ce couplage est
  détaillé en §4.
- Le **plafond d'âge du taux plein (67 ans, #4/#5/#7)** n'est actuellement jamais recalculé par
  génération : le référentiel (§2.1.4) confirme qu'il est effectivement stable à 67 ans pour
  toutes les générations à compter de 1955 (hors catégories dérogatoires à 65 ans), donc ce point
  précis n'est pas un écart — mais **le fait que la valeur soit dupliquée dans cinq endroits (#4,
  #5 par défaut, #7, plus le texte statique)** est un risque de dérive si une future réforme
  modifiait ce seuil.

---

## 2. Un concept de « date d'effet » existe-t-il déjà dans l'app ?

**Non — recherche négative.** Grep exhaustif sur `dateEffet`, `date_effet`, `dateLiquidation`,
`date_liquidation` sur tout `src/` : aucune occurrence. Il n'existe ni colonne en base, ni champ
de formulaire, ni state React portant ce concept. Rien à réutiliser ; le concept est **entièrement
à créer**.

Le plus proche substitut existant est `ageSimule` dans `Trimestres.tsx` — un slider entier
60-70 ans (pas une date). Deux limites structurelles en font un mauvais point de départ tel quel :

1. **Ce n'est pas une date de départ, c'est un âge simulé.** Une date d'effet réelle se déduit de
   `dateNaissance + ageSimule` seulement de façon approximative (au mois/jour près, l'écart
   dépend du mois de naissance exact) — insuffisant pour trancher correctement la bascule du
   01/09/2026, qui se joue potentiellement à quelques semaines près (référentiel §2.1.3, dernier
   point de vigilance : « un départ quelques semaines avant le 1er septembre 2026 peut coûter un
   à deux trimestres »).
2. **`trimestresRequisPourGeneration()` ignore aujourd'hui `ageSimule` de toute façon** : le
   barème renvoyé pour une génération donnée est le même quelle que soit la ligne du tableau
   comparatif 62-70 ans consultée dans `Trimestres.tsx` — la simulation d'âge ne fait déjà
   varier ni la durée requise ni l'âge légal en fonction de la date d'effet simulée, alors que
   c'est précisément ce que le référentiel exige.

`RISImportDialog.tsx:163` calcule aussi `anneeNaissance + resultatSAM.ageDepartHypothese` (=67
fixe) pour un affichage d'« année de départ hypothétique » — même limitation, ni date exacte ni
utilisée pour sélectionner un barème.

**Conclusion : aucune brique récupérable.** Le modèle proposé en §3 doit être construit de
zéro, mais peut s'appuyer sur une donnée déjà disponible en amont : `date_naissance` (date ISO
complète) est déjà chargée par `familyService.getFamilyProfile()` dans `Carriere.tsx:103` et
`Trimestres.tsx:72` — **le mois de naissance existe déjà à ce stade et est jeté** au moment de
l'appel (`new Date(profil.date_naissance).getFullYear()` — seule l'année est conservée avant
d'être transmise aux fonctions de barème). Ce n'est donc pas une lacune de données, mais une
troncature au niveau de l'appel.

---

## 3. Modèle de données proposé

### 3a. Deux jeux de barème pour les générations 1964-1968

Le référentiel (§12.1) montre que l'écart entre le calendrier 2023 (§2.1.2) et le barème LFSS
2026 (§2.1.1) est **nul pour toute génération hors 1964-1968** (comparaison ligne à ligne des
deux tableaux : identiques avant 1964, identiques à partir de 1969). Il est donc inutile de
dupliquer l'intégralité du barème dans deux tables parallèles : seule la zone 1964-1968 a besoin
d'un stockage à deux valeurs.

```ts
interface AgeLegal {
  ans: number;
  mois: number;
}

interface ParametresBareme {
  ageLegal: AgeLegal;
  trimestresRequis: number;
  // ageTauxPlein volontairement absent ici : stable à 67 ans pour toutes les
  // générations concernées (§2.1.4) — inutile de le dupliquer par génération,
  // un seul point de vérité générique suffit (cf. constat transversal §1).
}

interface GenerationInstable {
  // Bornes en date de naissance exacte (année + mois), pas en année seule —
  // cf. §3b : ce même type de borne doit remplacer `anneeMax: number` pour
  // TOUTES les tables de génération du module, pas seulement celle-ci.
  naissanceMin: { annee: number; mois: number };
  naissanceMax: { annee: number; mois: number };
  calendrier2023: ParametresBareme;  // opposable si dateEffet < 01/09/2026 (§2.1.2)
  lfss2026: ParametresBareme;        // opposable si dateEffet >= 01/09/2026 (§2.1.1)
}

// Six lignes seulement : 1964, 1965-T1, 1965-T2..T4, 1966, 1967, 1968.
const GENERATIONS_ZONE_INSTABLE: GenerationInstable[] = [
  {
    naissanceMin: { annee: 1964, mois: 1 }, naissanceMax: { annee: 1964, mois: 12 },
    calendrier2023: { ageLegal: { ans: 63, mois: 0 }, trimestresRequis: 171 },
    lfss2026:       { ageLegal: { ans: 62, mois: 9 }, trimestresRequis: 170 },
  },
  {
    naissanceMin: { annee: 1965, mois: 1 }, naissanceMax: { annee: 1965, mois: 3 },
    calendrier2023: { ageLegal: { ans: 63, mois: 3 }, trimestresRequis: 172 },
    lfss2026:       { ageLegal: { ans: 62, mois: 9 }, trimestresRequis: 170 },
  },
  {
    naissanceMin: { annee: 1965, mois: 4 }, naissanceMax: { annee: 1965, mois: 12 },
    calendrier2023: { ageLegal: { ans: 63, mois: 3 }, trimestresRequis: 172 },
    lfss2026:       { ageLegal: { ans: 63, mois: 0 }, trimestresRequis: 171 },
  },
  // 1966, 1967, 1968 : même structure (valeurs référentiel §2.1.1/§2.1.2).
];
```

Pour toute génération hors de cette liste, un seul barème stable suffit (les tables actuelles
`TRIMESTRES_REQUIS_PAR_GENERATION` / la logique de `ageLegalPourGeneration` en dehors de leur
branche 1964-1968), sans notion de date d'effet à consulter.

### 3b. Représenter la date de naissance exacte — au-delà du seul cas 1965

Le référentiel (§12.3) signale **quatre** générations à découpage infra-annuel : 1951, 1961,
1965, et « 1965/1966 pour les carrières longues ». Concevoir un modèle qui ne corrige que 1965
laisserait 1951 et 1961 dans le même état qu'aujourd'hui (`trimestresRequisPourGeneration`
ignore déjà sciemment la coupure de 1961, documentée comme simplification assumée — calcul.ts
lignes 21-25 — et ne couvre pas du tout 1951, absent de la table actuelle qui commence
implicitement plus tard).

**Recommandation : ne pas traiter 1965 comme un cas spécial.** Remplacer partout la primitive de
borne `{ anneeMax: number }` par une primitive `{ naissanceMax: { annee: number; mois: number } }`
(mois par défaut 12 = fin d'année, pour les générations sans coupure connue), et remplacer le
paramètre d'entrée `anneeNaissance: number` par `dateNaissance: { annee: number; mois: number }`
(ou un `Date`/ISO string complet) dans **toutes** les fonctions de barème par génération (#1, #3,
et — si un jour un besoin apparaît — #6). Un seul mécanisme de lookup générique couvre alors 1951,
1961, 1965, et pourra couvrir 1965/1966-carrière-longue le jour où ce barème sera documenté (le
référentiel actuel le mentionne comme point de vigilance au §12.3 mais ne détaille pas les
valeurs numériques correspondantes dans les sections lues — **incertitude à lever avant
implémentation de ce sous-cas précis**, pas un simple oubli de conception).

Coût de cette généralisation : **nul en disponibilité de donnée** (cf. §2 — le mois de naissance
est déjà chargé, seulement tronqué à l'appel), mais implique de changer la signature de
`trimestresRequisPourGeneration()` et `ageLegalPourGeneration()` — impact détaillé en §4.

### 3c. Règle de bascule

```ts
type JeuBareme = 'anterieur_2023' | 'calendrier_2023' | 'lfss_2026';

const BASCULE_CALENDRIER_2023 = new Date('2023-09-01T00:00:00Z');
const BASCULE_LFSS_2026 = new Date('2026-09-01T00:00:00Z');

function jeuBaremeApplicable(dateEffet: Date): JeuBareme {
  if (dateEffet >= BASCULE_LFSS_2026) return 'lfss_2026';
  if (dateEffet >= BASCULE_CALENDRIER_2023) return 'calendrier_2023';
  return 'anterieur_2023'; // hors périmètre actuel : le référentiel ne détaille pas
                            // ce barème (« réformes 2010/2014 »), donc pas de table
                            // à fournir tant que ce cas n'est pas documenté — prévoir
                            // un signal explicite (erreur ou avertissement) plutôt
                            // qu'une valeur devinée si ce jeu est sélectionné.
}

function parametresBareme(dateNaissance: DateNaissance, dateEffet: Date): ParametresBareme {
  const jeu = jeuBaremeApplicable(dateEffet);
  const zoneInstable = GENERATIONS_ZONE_INSTABLE.find((g) => dansIntervalle(dateNaissance, g));
  if (zoneInstable) {
    if (jeu === 'anterieur_2023') throw new BaremeNonCouvertError(...); // ou retour explicite « indéterminé »
    return jeu === 'lfss_2026' ? zoneInstable.lfss2026 : zoneInstable.calendrier2023;
  }
  return BAREME_STABLE_PAR_GENERATION.find(...); // table à borne unique, hors zone 1964-1968
}
```

**Où obtenir `dateEffet` ?** Deux options, à trancher avec l'équipe — hors périmètre de cette
note diagnostique :

- **Option A (minimale)** : dériver `dateEffet` de `dateNaissance + ageSimule` (le slider déjà
  présent dans `Trimestres.tsx`). Coût nul en UI, mais imprécis au mois près — insuffisant pour
  le cas explicitement cité par le référentiel (« quelques semaines avant le 1er septembre
  2026 »). Ne permettrait pas non plus à `Carriere.tsx` (qui n'a aucune notion d'âge simulé, cf.
  #2 en §1) de bénéficier du modèle sans changement d'écran.
- **Option B (recommandée)** : introduire une hypothèse explicite « date de départ envisagée »
  (sélecteur de date), commune à `Carriere.tsx` et `Trimestres.tsx`, sur le modèle de ce qui
  existe déjà pour d'autres hypothèses du module (ex. `ifi_hypotheses` en clé/valeur pour l'IFI,
  cf. CLAUDE.md). Correction complète, mais implique un changement d'écran (formulaire) —
  changement de périmètre à valider avec l'utilisateur avant toute implémentation, cette note
  reste au milieu du gué (modèle de données, pas de décision UI).

---

## 4. Risques de régression et écrans consommateurs

### 4.1. Tests existants à revoir

| Fichier de test | Risque |
|---|---|
| `calcul.test.ts` — `describe('trimestresRequisPourGeneration', ...)` (ajouté lors de la correction de l'écart #1, générations 1957-1961) | **Faible** : ces générations sont hors zone instable 1964-1968, donc un éventuel changement de signature (`anneeNaissance: number` → `dateNaissance: {annee, mois}`) ne change pas les valeurs attendues, mais **cassera à la compilation** si la signature change sans mise à jour des appels de test (`trimestresRequisPourGeneration(1957)` devrait devenir `trimestresRequisPourGeneration({ annee: 1957, mois: 6 })` ou équivalent). |
| `calcul.test.ts` — `describe('ageLegalPourGeneration', ...)` | **Moyen** : ces tests couvrent déjà la zone instable via l'union discriminée `{stable: false}`. Si le nouveau modèle rend cette zone déterminée (bascule par date d'effet), ces tests devront être réécrits entièrement — pas seulement mis à jour, le contrat de la fonction change de nature (elle ne renverrait plus jamais `stable: false` si un `dateEffet` est toujours fourni). |
| `calcul.test.ts` — `describe('minimumContributif', ...)` | **Nul** : consomme `trimestresRequis` comme un nombre déjà résolu, agnostique de la façon dont il a été calculé en amont. |

### 4.2. Écrans consommateurs à modifier

- **`Trimestres.tsx`** (seul appelant actuel de `trimestresRequisPourGeneration`) : changement de
  signature direct. Question produit non tranchée par cette note : le tableau comparatif 62-70
  ans doit-il faire varier le barème **ligne par ligne** (chaque âge simulé correspond à une
  année de départ potentiellement différente, donc à un jeu de barème potentiellement différent
  pour un utilisateur né en 1964-1968) ? C'est ce qu'exige le référentiel à la lettre, mais c'est
  un changement de comportement visible, pas seulement un refactor interne.
- **`Carriere.tsx`** : ne peut pas rester sur son `useState<number>(172)` figé (#2 en §1) une
  fois le modèle de bascule introduit — sinon l'écran principal du module resterait le seul à
  ignorer à la fois la génération réelle de l'utilisateur *et* la date d'effet. **Corriger #2/#3
  proprement recouvre donc mécaniquement l'écart déjà identifié dans `audit-retraite.md` §5
  (« Incohérence de trimestres requis » entre Carrière et Optimisation)** — les deux ne peuvent
  pas être traités indépendamment sans laisser le module dans un état incohérent entre écrans.
- **`CarriereFonctionPublique.tsx` / `CarriereCNAVPL.tsx`** : héritent de `trimestresRequis` en
  prop depuis `Carriere.tsx` (lignes 735 et 745) — mécaniquement impactés par la correction du
  point précédent, sans changement propre à ces fichiers.
- **`RISImportDialog.tsx`** : utilise `anneeNaissance` (année seule) pour appeler `calculerSAM()`
  → `dureeSAMPourGeneration()`. **Hors périmètre des écarts #2/#3** : la durée SAM (25 meilleures
  années) n'est pas concernée par la réforme LFSS 2026 d'après les sections lues du référentiel
  (§3.4.3 — stable depuis la génération 1948, aucune bascule 1964-1968 mentionnée). Aucune
  modification nécessaire ici pour ces deux écarts précis ; à ne pas confondre avec #1/#2/#3.
- **`calculSAM.ts`** (`AGE_DEPART_PAR_DEFAUT = 67`) : indépendant de la bascule de barème (c'est
  une hypothèse de projection des années futures, pas un paramètre légal), donc pas un
  consommateur direct à corriger pour #2/#3. Question de cohérence à se poser *ensuite*,
  séparément : une fois qu'une vraie hypothèse « date de départ envisagée » existe dans l'app
  (§3c, Option B), faut-il que la projection du SAM s'aligne dessus plutôt que sur sa propre
  constante 67 ans ? Signalé pour mémoire, hors périmètre de cette note.

### 4.3. Risque de conception à trancher avant tout code

`ageLegalPourGeneration()` (#3 en §1) a été conçue spécifiquement pour renvoyer une
**indétermination explicite** (`{ stable: false; raison: string }`) sur la zone 1964-1968, au
motif que la valeur réelle dépend d'un paramètre non modélisé à l'époque (cf. sa docstring,
calcul.ts:46-64). Le modèle proposé en §3 **supprime cette indétermination** dès lors qu'un
`dateEffet` est disponible : la valeur redevient déterminée par construction. Deux fonctions ne
peuvent pas coexister éternellement avec des contrats contradictoires sur la même zone de
générations — il faudra soit remplacer `ageLegalPourGeneration()` par la nouvelle fonction
`parametresBareme()`, soit la faire déléguer à elle en interne. À trancher explicitement (pas
seulement un détail d'implémentation) car cette fonction n'a aujourd'hui aucun appelant (§1) :
c'est le bon moment pour la remplacer plutôt que de maintenir deux mécanismes en parallèle.

---

## 5. Résumé

- **7 points d'entrée** distincts consomment aujourd'hui une génération pour produire un
  paramètre légal, avec **4 tables de bornes non synchronisées** — dont une (`Carriere.tsx`, écran
  principal) qui n'est même pas une fonction de la génération mais une constante figée à 172.
- **Aucun concept de date d'effet n'existe dans l'app** — à créer entièrement ; le seul candidat
  proche (`ageSimule`, un âge simulé en années entières) est structurellement insuffisant pour
  trancher la bascule au mois près exigée par le référentiel.
- Le mois de naissance nécessaire pour scinder 1965 (et 1951, 1961, potentiellement
  1965/1966-carrière-longue une fois documenté) **est déjà chargé en mémoire** à chaque appel
  actuel (`date_naissance` complet) — c'est une troncature locale à corriger, pas une lacune de
  donnée à combler.
- Le modèle proposé (§3) généralise la borne « année seule » en borne « année + mois » pour
  couvrir les quatre cas infra-annuels du référentiel avec un seul mécanisme, et n'a besoin de
  stocker deux jeux de valeurs que sur les six lignes de la zone 1964-1968 réellement concernées
  par la bascule LFSS 2026.
- Corriger #2/#3 sans aussi corriger `Carriere.tsx` (constante 172 figée, écart déjà connu de
  l'audit architecture) laisserait le module dans un état incohérent entre écrans — les deux
  chantiers sont couplés, pas indépendants.
- Une décision produit (Option A vs B, §3c) est nécessaire avant tout code : d'où viendra la
  date d'effet simulée par l'utilisateur.
