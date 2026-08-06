# Audit ciblé — Interaction clamp `Math.max(0, partFinale)` / double masse du conjoint (art. 758-5)

> Document produit en **lecture seule** le 2026-08-06, sauf un test de régression permanent
> ajouté volontairement (cf. §5) pour figer le comportement bugué observé — aucune ligne de
> `src/lib/transmission/index.ts`, `successionLegale.ts` ni `reserve.ts` n'a été modifiée.
> État du code au commit `bbf3f77` (branche `main`).
> Suite de [`docs/audit-transmission-devolution-conjoint-2026-08.md`](audit-transmission-devolution-conjoint-2026-08.md), §4.4, qui laissait ouverte la question :
> le clamp `Math.max(0, partFinale)` (`index.ts:430`) neutralise-t-il ou non, en pratique,
> l'absence de masse d'exercice distincte pour le conjoint ?

---

## Verdict

**Bug réel confirmé, avec cas chiffré à l'appui — mais pas via le mécanisme suspecté.**
Le clamp `Math.max(0, partFinale)` n'est **jamais** le vecteur du problème : il est
**mathématiquement impossible à déclencher** avec les formules actuelles (démontré ci-dessous,
§2). La réduction pour excès (Bloc 1, conforme) **ne neutralise rien** non plus : elle continue
de s'appliquer normalement mais n'empêche à aucun moment le résultat concret montré à
l'utilisateur d'être faux. Le bug se matérialise ailleurs, de façon **systématique** (pas un cas
limite) : la répartition du cash réellement disponible (`netBreakdown`, ce qui est **affiché à
l'écran** comme montant net à recevoir) utilise une fraction calculée sur `partFinale`, qui
mélange sans distinction « cash à recevoir » et « valeur déjà détenue via une donation
antérieure ». Résultat vérifié numériquement : un enfant déjà sur-doté par donation continue de
recevoir une part du résiduel réel, **au détriment direct du conjoint**, dans un scénario
patrimonial courant (donation ancienne en avancement de part, aucune réduction déclenchée).

---

## 1. Rappel du point laissé ouvert par l'audit Bloc 2 (§4.4)

L'audit précédent avait construit un scénario (1 enfant commun, donation 900 000 € en avancement
de part, résiduel 100 000 €) montrant que `massePartageable` (utilisée pour chiffrer le quart du
conjoint) était gonflée par la réintégration de la donation (rapport), sans masse d'exercice
distincte plafonnant le conjoint aux « biens dont le défunt n'a pas disposé » (art. 758-5). Il
n'avait cependant pas pu déterminer, dans le temps imparti :
- si `Math.max(0, partFinale)` (`index.ts:430`) se déclenche réellement dans un cas construit
  pour cela, et si oui, ce qu'il produit (neutralisation silencieuse d'un manque à recevoir, sans
  réattribution) ;
- si la réduction pour excès agit comme un filet de sécurité systématique, empêchant le problème
  d'atteindre concrètement un héritier.

## 2. Le clamp est mathématiquement mort — démonstration

Pour un héritier donné, `index.ts:398-430` calcule :

```
partFinale = quotePart × massePartageable × demembrementPct − rapportTotal + liberalitesMaintenues
```

où (par construction de `reserve.ts::computeRapport` et `index.ts`) :
- `rapportTotal` = somme, pour cet héritier, des `montantRapport` de ses donations **rapportables**
  (à un enfant réservataire, ni hors part, ni dispensées, ni « partage ») ;
- `liberalitesMaintenues` = somme, pour cet héritier, de **toutes** ses libéralités (donations et
  legs, rapportables ou non) de `valeur − montantRéduit`.

Pour toute libéralité rapportable **sans forfait**, `computeRapport` calcule
`montantRapport = donation.valeur − reductionTotal` — **exactement** la même formule que
`liberalitesMaintenues` dans `index.ts` (`lib.valeur − reduction`). Les deux termes s'annulent
donc **exactement**, réduction ou pas. Pour une libéralité **avec rapport forfaitaire**, la
vérification algébrique (§2.1 ci-dessous) montre que `liberalitesMaintenues ≥ rapportTotal` reste
vraie. Pour toute libéralité **non rapportable** (hors part, dispensée, « partage », ou à un
non-réservataire), elle contribue à `liberalitesMaintenues` sans jamais être soustraite via
`rapportTotal` — contribution strictement positive.

**Conséquence : `liberalitesMaintenues(héritier) − rapportTotal(héritier) ≥ 0` est une identité
algébrique, valable pour toute combinaison de libéralités, réductions, et héritiers.** Comme
`quotePart × massePartageable × demembrementPct ≥ 0` également (quoteParts toujours positives ou
nulles dans `successionLegale.ts`, `massePartageable ≥ 0` tant que `biensExistants ≥ passifs`),
**`partFinale` ne peut jamais être négatif** dans le fonctionnement normal du module. `Math.max(0,
partFinale)` est du code mort — un garde-fou qui protège contre un cas que les formules en amont
rendent structurellement impossible.

### 2.1 Vérification empirique (5 scénarios, cf. §4)

Cinq scénarios variés (1 enfant / 2 enfants / 3 enfants, avec et sans conjoint, option ouverte et
fermée, avec et sans réduction déclenchée, donation proche du plafond réserve+QD sans le
dépasser, donation dépassant largement le plafond) ont été rejoués avec un test jetable
instrumentant `computeTransmission` pour afficher, pour chaque héritier, la valeur de `partFinale`
avant clamp. **Dans les 5 scénarios, aucun héritier n'atteint jamais 0 par l'effet du clamp** —
confirmant la démonstration algébrique. Le test jetable a été supprimé après vérification
(conforme à la consigne de la commande).

## 3. Où le bug se matérialise réellement : la répartition du cash réel (`netBreakdown`)

`index.ts` construit `civilShares[].fraction = heir.partFinale / sumPartFinale` (ligne ~448),
utilisée ensuite par `computeDMTG` pour répartir l'assiette fiscale **réelle** (`dmtgAssets`,
construite uniquement à partir des biens existants au décès — jamais des donations, qui n'entrent
que dans le rappel fiscal 15 ans) entre héritiers, puis par `computeNetPerHeir`
(`netBreakdown.ts`) pour produire `netARecevoir` — **le montant effectivement affiché à
l'utilisateur** dans `Synthese.tsx` (vérifié : `Synthese.tsx:398-406` utilise explicitement
`netBreakdown.heirs[].netARecevoir`, pas `heir.partFinale` directement, précisément pour éviter
d'afficher une part civile brute — mais la fraction qui alimente ce calcul reste, elle, dérivée de
`partFinale`).

**Le problème** : `sumPartFinale` vaut systématiquement `massePartageable` (démontré §2, vérifié
empiriquement dans les 5 scénarios, cf. §4 — toujours égal à la masse de calcul complète, jamais
au résiduel réel), alors que l'assiette réellement partagée (`dmtgAssets`) ne contient que les
biens existants au décès (le résiduel). Un héritier qui a déjà reçu une donation continue donc de
capter une **fraction** du résiduel réel proportionnelle à sa part théorique **totale** (donation
comprise), au lieu d'être exclu du résiduel dès que sa donation dépasse déjà sa part théorique
(principe du rapport « en moins prenant », art. 858 C. civ. : le donataire sur-doté ne prend
simplement plus rien sur le reste, il ne « partage » pas le reste au prorata de sa part théorique
brute).

## 4. Scénarios testés

| # | Paramètres | Réduction déclenchée ? | Clamp déclenché ? | `netARecevoir` conjoint | `netARecevoir` enfant sur-doté | Verdict |
|---|---|---|---|---|---|---|
| S1 | 1 enfant commun, don 900 000 € avance de part (2010), résiduel 100 000 €, option `quart_pp` | Non (900k < réserve 500k + QD 500k) | Non | **24 439 €** (25 % du résiduel réel) | **73 316 €** (75 % du résiduel réel) | 🔴 Écart réel : enfant déjà sur-doté de 150 000 € au-delà de sa part théorique (900k reçus vs 750k dus) continue de capter 73k de cash réel ; conjoint sous-doté (24k reçus, alors que le résiduel entier — 100k — devrait lui revenir en priorité, encore insuffisant pour ses 250k théoriques) |
| S2 | Option **fermée** (1 enfant non commun présent → 1/4 PP obligatoire), don 900 000 € à l'enfant commun, résiduel 100 000 € | Oui (233 333 € réduits) | Non | 24 439 € | 36 659 € (enfant commun, ×2 car 2 enfants) | 🔴 Même écart, réduction comprise : elle corrige la valeur théorique (`partFinale`) mais **pas** la fraction utilisée pour le cash réel — voir §3 |
| S3 | 3 enfants communs, don 490 000 € à 1 enfant (sous le plafond réserve+QD : 247 500+247 500=495 000 > 490 000), résiduel 500 000 € | Non | Non | 24 % du résiduel réel (part théorique inchangée) | 24,75 % chacun (dont l'enfant donataire) | 🔴 Écart plus modéré en proportion (donation plus petite relativement au résiduel) mais même mécanisme ; confirme que la présence de plusieurs enfants ne neutralise pas le problème, contrairement à l'hypothèse initiale sur la réduction plus fréquente avec plusieurs enfants |
| S4 | 2 enfants communs, don 950 000 € à 1 enfant, résiduel 50 000 € | Oui (283 333 € réduits) | Non | 12 003 € (25 %) | 18 004 € (37,5 %) chacun des 2 enfants | 🔴 Réduction déclenchée et pourtant écart de répartition du cash réel strictement identique en proportion à S1/S2 — **preuve directe que la réduction n'est pas un filet de sécurité pour ce problème précis** |
| S5 | 2 enfants sans conjoint, don 990 000 € à 1 enfant, résiduel 10 000 € | Oui (323 333 € réduits) | Non | — (pas de conjoint) | 50 % chacun | Cas sans conjoint : signalé pour compléter la matrice, hors du périmètre strict de la commande (art. 758-5 conjoint uniquement) |

Détail du calcul S1 (scénario repris de l'audit Bloc 2, §4.4) :
- `masseCalcul` = 1 000 000 € (résiduel 100 000 € + donation rapportée 900 000 €) ; réserve
  500 000 € ; QD 500 000 €.
- `partFinale` théorique : conjoint 250 000 € (25 % × 1 000 000), enfant 750 000 € (75 % ×
  1 000 000 − 900 000 rapport + 900 000 libéralité maintenue = 750 000, cf. mécanisme non-double-
  comptabilisation déjà confirmé conforme par l'audit Bloc 1 §4.5).
- Aucune réduction (900 000 ≤ réserve + QD = 1 000 000).
- `sumPartFinale` = 1 000 000 € — **jamais** le résiduel réel de 100 000 €.
- `civilShares.fraction` : conjoint 25 %, enfant 75 %.
- Assiette DMTG réelle (`dmtgAssets`) = 100 000 € (résiduel uniquement).
- **`netARecevoir` affiché** : conjoint 24 439 € ; enfant 73 316 €.
- **Ce qui devrait légalement se produire** : l'enfant a déjà reçu 900 000 €, largement au-delà de
  sa part théorique de 750 000 € (excédent de 150 000 €) — il ne devrait plus recevoir **aucun**
  centime du résiduel réel (rapport en moins prenant). Le conjoint devrait recevoir la totalité du
  résiduel réel (100 000 €), ce qui resterait **encore** insuffisant pour couvrir ses 250 000 €
  théoriques (cas « conjoint exhérédé de fait » du référentiel, art. 758-5). Écart réel entre ce
  que le conjoint devrait recevoir au minimum (100 000 €) et ce qu'il reçoit effectivement
  (24 439 €) : **75 561 €**, transférés à tort vers un enfant déjà sur-doté.

Ce scénario n'est pas un cas limite artificiel : une donation ancienne en avancement de part à un
enfant, restant sous le plafond réserve + QD (donc parfaitement licite, aucune réduction), suivie
d'un patrimoine résiduel modeste au décès, est une configuration courante en clientèle
patrimoniale (transmission progressive du vivant, puis décès avec un actif résiduel réduit).

## 5. Test de régression ajouté (comportement actuel figé, non corrigé)

Conformément à la consigne de la commande, un test de régression **permanent** a été ajouté :
[`src/lib/transmission/doubleMasseConjoint.audit-2026-08.test.ts`](../src/lib/transmission/doubleMasseConjoint.audit-2026-08.test.ts).
Il rejoue le scénario S1 et fige les valeurs actuelles (`netARecevoir` conjoint = 24 439 €, enfant
= 73 316 €) avec un commentaire explicite indiquant qu'il s'agit d'un comportement **bugué**, pour
qu'une correction future soit un changement délibéré et visible dans la suite de tests, pas une
régression silencieuse. **Aucune correction n'a été apportée au code source.**

## 6. Options de correction (affinées par rapport à l'audit Bloc 2 §4.4)

L'audit Bloc 2 proposait 3 options génériques ; à la lumière de ce qui précède, elles se
précisent :

1. **Masse d'exercice dédiée pour le conjoint** — calculer séparément une masse « biens dont le
   défunt n'a pas disposé » (résiduel réel, hors réintégration fictive de donations) et y
   plafonner le montant réellement versé au conjoint. Ne règle qu'une partie du problème : ne
   corrige pas la sur-attribution symétrique vers l'enfant sur-doté (les autres héritiers ne sont
   pas concernés par l'art. 758-5, qui ne vise que le conjoint).
2. **Garantie de soulte générale (rapport en moins prenant)** — **option désormais démontrée comme
   la plus pertinente** : calculer, pour chaque héritier, la part du résiduel réel qui lui revient
   en tenant compte de ce qu'il détient déjà (donations non rapportées en nature), en excluant du
   partage du résiduel tout héritier dont les libéralités déjà perçues égalent ou dépassent sa part
   théorique totale — et en réattribuant le solde aux héritiers sous-dotés (dont le conjoint en
   priorité si applicable). Traite la cause racine (la fraction `civilShares` mal construite),
   pas seulement le symptôme conjoint. Recoupe directement les findings T1/T4/T5 du Bloc 1,
   comme déjà noté par l'audit Bloc 2.
3. **Documenter la limite sans corriger à court terme** — écarté comme option principale par ce
   document : le problème n'est pas un cas limite rare nécessitant seulement une mention en petits
   caractères, il se produit dans toute succession comportant une donation en avancement de part
   suivie d'un actif résiduel modeste au décès — une configuration ordinaire, pas exceptionnelle.
   Reste pertinent en complément (avertissement UI) le temps qu'une correction structurelle soit
   développée.

## 7. Ce qui n'a pas été étendu (hors périmètre de cette commande)

Conformément à la consigne, cette investigation ne réexamine pas §4.1.1, §4.2 ni les autres
findings du Bloc 2. Le cas « sans conjoint » (S5, 2 enfants) a été testé uniquement pour compléter
la matrice de variation demandée (nombre d'enfants), sans qu'un jugement séparé soit porté sur son
statut — le mécanisme identifié (fraction `civilShares` dérivée d'une masse fictive plutôt que du
résiduel réel) affecte structurellement toute succession avec des donations rapportables
maintenues, conjoint ou non ; seul l'angle art. 758-5 (spécifique au conjoint) était dans le
périmètre de cette commande.
