# Implémentation — écart #13-NBI : supplément de pension NBI

> Rapport de session. Fait suite à la recherche de formule de la session précédente
> ([docs/retraite-base-referentiel.md §7.7.1](../retraite-base-referentiel.md)), qui avait sourcé la
> formule du supplément NBI depuis le Décret n° 2003-1306 du 26 décembre 2003 (art. 28, régime
> CNRACL), avec une réserve explicite sur son application au SRE (fonction publique d'État), non
> vérifiée directement dans le code des pensions civiles et militaires de retraite.

---

## 1. Diagnostic préalable — SRE/CNRACL dans le module fonction publique de Pulse

**Confirmé : traitement générique unique, aucune distinction structurelle.** Recherche dans
`src/lib/retraite/calculFonctionPublique.ts`, `src/components/retraite/CarriereFonctionPublique.tsx`
et les props/state associés :

- `hasFonctionPublique` (`useState<boolean>` dans `Carriere.tsx`) est un unique booléen générique — pas
  de champ `versant`, `regime`, ni aucune valeur permettant de distinguer SRE de CNRACL.
- Aucune fonction de `calculFonctionPublique.ts` ne prend de paramètre de régime : `decoteSurAgeFonctionPublique()`,
  `minimumGaranti()`, `majorationEnfantsFonctionPublique()` s'appliquent identiquement, quel que soit le
  versant.
- Les seules mentions de « SRE » et « CNRACL » dans ce module sont des références en commentaire ou en
  texte d'aide à l'écran (ex. « à vérifier auprès de la CNRACL ou du SRE » pour les âges de catégorie
  active) — jamais une donnée structurée.
- La détection RIS de l'écart #16 (`regimesSaisieManuelle.ts`) ne fait que reconnaître les libellés SRE/
  CNRACL pour les **exclure** du panier trimestres générique — elle n'alimente aucune variable de
  régime réutilisable ailleurs, et ne s'applique qu'au flux d'import RIS, pas à la saisie manuelle de la
  carte fonction publique.

**Conséquence directement anticipée par la mission** : la réserve CNRACL/SRE de la formule NBI n'est pas
un détail technique local (un paramètre optionnel à ajouter dans un coin) — elle touche une absence
structurelle du modèle de données de l'app. L'implémenter en la branchant sur `hasFonctionPublique` sans
plus de précision reviendrait à l'appliquer silencieusement aux deux versants, y compris le SRE pour
lequel la formule exacte n'est pas confirmée par un texte cité avec certitude.

**Décision soumise à l'utilisateur avant de coder** (conformément à la consigne de la mission : « décision
produit, pas technique »). Trois options ont été posées : (1) appliquer partout avec avertissement, (2)
restreindre à la CNRACL via un nouveau champ versant/régime, (3) implémenter la fonction pure sans la
brancher à l'écran, en attendant que ce choix de modélisation soit tranché plus largement.

**Réponse retenue** (2026-08-15) : option 3, avec une nuance importante apportée par l'utilisateur — la
recherche complémentaire qu'il a versée au dossier (sources officielles Service-Public.gouv.fr F32515,
Code des pensions civiles et militaires de retraite, Service des Retraites de l'État, jurisprudence
Conseil d'État CETATEXT000008016431) établit que **le droit à un supplément de pension NBI existe
également côté SRE** — ce n'est donc pas un droit propre à la CNRACL. Ce qui reste non confirmé n'est
pas l'existence du droit côté État, mais la **formule de liquidation exacte** applicable au SRE (le
texte du Décret n° 2003-1306 art. 28 reste, lui, spécifique à la CNRACL). Conclusion opérationnelle
retenue : implémenter `supplementNBI()` comme fonction pure, conçue sans paramètre de régime (la formule
n'a qu'une seule version disponible, celle sourcée pour la CNRACL), avec la réserve portée explicitement
dans le code — mais **différer le branchement à l'écran** tant que le modèle de données de Pulse ne
permet pas d'identifier le régime du client. C'est donc un problème de modélisation de l'app, pas
d'absence de droit NBI côté SRE.

## 2. Sens exact de « moyenne_annuelle_NBI_revalorisée »

Relecture du texte source déjà cité (Décret n° 2003-1306, art. 28) : « Ce supplément de pension est égal
à la moyenne annuelle de **la somme perçue** au titre de la nouvelle bonification indiciaire [...] Pour
le calcul de la moyenne annuelle, **la somme perçue** au titre de la nouvelle bonification indiciaire
est revalorisée dans les conditions prévues à l'article 19. »

**Réponse : un montant en euros, pas un nombre de points.** Le texte parle explicitement de « la somme
perçue », c'est-à-dire le montant réellement versé chaque année au titre de la NBI (déjà la conversion
points × valeur du point, faite en amont par l'employeur au moment du versement), ensuite moyenné sur la
période de perception et revalorisé comme la pension elle-même (art. 19). Ce n'est PAS un nombre de
points d'indice à convertir dans cette fonction — à la différence des points RAFP
(`pensionComplementaireAnnuelle()`), où la conversion points → euros est faite par l'outil via une
valeur de service. Ici, la revalorisation elle-même n'est pas non plus recalculée par cet outil : le
conseiller saisit directement la moyenne annuelle déjà revalorisée, telle qu'elle apparaîtrait sur un
relevé de carrière ou un décompte de liquidation réel — champ déclaratif, comme (b) ci-dessous.

## 3. Champs déclaratifs proposés (non implémentés à l'écran — cf. §1)

Sur le modèle des champs #6 (surcote parentale) et #12 (année d'ouverture des droits) : saisie
déclarative simple par le conseiller, pas de calcul automatique, pas de collecte de nouvelles données
structurées (fonctions ouvrant droit à la NBI, historique de points).

| Champ proposé | Type | Libellé proposé | Aide contextuelle proposée |
|---|---|---|---|
| `moyenneAnnuelleNBI` | montant (€), texte/nombre | « Moyenne annuelle NBI perçue, revalorisée (€) » | « Moyenne annuelle des sommes perçues au titre de la NBI sur la période de perception, déjà revalorisée — voir le relevé de carrière ou le décompte de liquidation du client. » |
| `trimestresPerceptionNBI` | nombre entier | « Trimestres liquidables de perception NBI » | « Nombre de trimestres liquidables pendant lesquels le client a effectivement perçu la NBI (pas la durée totale de carrière). » |

Ces deux champs correspondent exactement aux deux premiers paramètres de `supplementNBI()`
implémentée ci-dessous (§4) — leur définition technique (nom, type, libellé) est donc déjà fixée par la
signature de la fonction ; seule leur matérialisation en `useState`/`<Input>` dans
`CarriereFonctionPublique.tsx` est différée, avec le reste du branchement (§1).

## 4. `supplementNBI()` — implémentation

Fonction pure ajoutée dans [calculFonctionPublique.ts](../../src/lib/retraite/calculFonctionPublique.ts),
sur le modèle de `surcoteParentale()`/`majorationTroisEnfants()` (calcul.ts) et
`majorationEnfantsFonctionPublique()` (déjà dans ce fichier) :

```ts
supplementNBI(
  moyenneAnnuelleNBIRevalorisee: number,
  trimestresLiquidablesPerceptionNBI: number,
  dureeRequiseTauxPlein: number
): number
```

- 0 trimestre (ou négatif, saisie incohérente) → supplément nul, par construction arithmétique — pas un
  seuil ajouté (le texte source n'en pose aucun, cf. référentiel §7.7.1).
- `dureeRequiseTauxPlein` : même durée requise que la pension de base (pas une valeur propre au
  supplément).
- Garde-fou défensif : le ratio `trimestres / dureeRequise` est plafonné à 1 (`Math.min`), même
  principe que `tauxProratisation()` dans calcul.ts — protège contre une saisie de durée de perception
  NBI supérieure à la durée requise du taux plein, un cas non traité explicitement par le texte source.
- **La réserve CNRACL/SRE est portée dans le code lui-même** (docstring complète, cf. le fichier), pas
  seulement dans ce rapport ou dans le référentiel — tout futur lecteur du code tombe dessus avant de
  brancher la fonction.

**Pas de message visible à l'écran** : conséquence directe de la décision §1 (fonction non branchée).
Quand le branchement sera fait, l'avertissement CNRACL/SRE devra être porté à l'écran (mission point 4) —
non fait ici puisqu'il n'y a pas encore d'écran consommant cette fonction.

## 5. Branchement dans l'ordre §12.3 — différé

La mission demandait de brancher après la majoration enfants, avant le plafond au dernier traitement
(`pensionFonctionPubliqueAvecMajorationEnfants()`). **Non fait dans cette session**, par décision
explicite de l'utilisateur (§1) : `pensionFonctionPubliqueAvecMajorationEnfants()` n'est pas modifiée.
Pour mémoire, une fois le choix de modélisation SRE/CNRACL tranché, l'ordre resterait : base → décote/
surcote → minimum garanti → majoration enfants (plafonnée au dernier traitement) → **supplément NBI**,
ajouté après ce plafond (le supplément NBI n'est pas soumis au plafond du dernier traitement — le texte
source n'en fait pas mention, à la différence de la majoration enfants).

## 6. Tests

[calculFonctionPublique.test.ts](../../src/lib/retraite/calculFonctionPublique.test.ts), nouveau
`describe supplementNBI` :

- **Cas CNRACL** : reproduit exactement la formule du texte source (800 €/an × 40 trimestres ×
  (75 % / 172) = 139,53 €).
- **0 trimestre de perception** : supplément nul (non-éligibilité).
- **Trimestres négatifs** (saisie incohérente) : supplément nul, jamais négatif.
- **Aucun seuil minimal** : 1 seul trimestre de perception ouvre déjà droit à un supplément non nul.
- **Cas limite du plafond 75 %/durée_requise** : trimestres de perception = durée requise → ratio
  exactement 1, supplément = moyenne × 75 % ; trimestres au-delà de la durée requise → aucun effet
  supplémentaire (garde-fou testé explicitement).
- **Proportionnalité** : deux fois plus de trimestres (sous le plafond) → deux fois le supplément.

## 7. Vérifications

Suite complète : `npx vitest run` → 44 fichiers, 633 tests passants (626 avant cette session + 7
nouveaux), aucune régression, 6 `todo` inchangés. `npx tsc --noEmit` : aucune erreur. Aucun code
touché en dehors de `calculFonctionPublique.ts`/`.test.ts` (pas de modification de `Carriere.tsx` ni de
`CarriereFonctionPublique.tsx`, conformément à la décision §1).

## 8. État de l'écart #13-NBI à l'issue de cette session

Ni « clos » ni « bloqué » : **fonction implémentée et testée, en attente de branchement.** Reste à faire,
hors périmètre de cette session :

1. Trancher le modèle de données SRE/CNRACL (nouveau champ `versant`/`regime`, ou décision assumée de
   ne pas le modéliser et d'appliquer `supplementNBI()` avec un avertissement visible).
2. Ajouter les deux champs déclaratifs (§3) à `CarriereFonctionPublique.tsx`.
3. Brancher `supplementNBI()` dans l'ordre §12.3 (§5 ci-dessus), avec l'avertissement CNRACL/SRE porté à
   l'écran si le point 1 retient l'application aux deux versants.
