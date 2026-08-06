# Design — Répartition du cash réel par « rapport en moins prenant » (Étape 7.2-7.3, Annexe 1)

> Document de **design uniquement**. Aucune ligne de code n'a été modifiée.
> État du code au commit `HEAD` au moment de la rédaction (suite directe de
> `docs/audit-transmission-clamp-double-masse-2026-08.md`, sans aucune correction
> apportée entre-temps).
> **Chantier arrêté avant l'implémentation (fin d'Étape 1)** : une ambiguïté légale
> non tranchée par le référentiel a été identifiée, et se manifeste dans 3 des 5
> scénarios de l'audit précédent — pas un cas limite isolé. Conformément à la
> consigne de la commande, aucune supposition n'a été codée à sa place.

---

## Étape 0 — Vérification fiscale (avant tout le reste)

### Ce que fait `computeDMTG` avec `civilShares.fraction`

Confirmé par lecture de `src/lib/dmtg/beneficiary.ts::buildTaxBaseByBeneficiary` (L18-25) :
`civilShares.fraction` est bien utilisée pour répartir **l'assiette taxable réelle**
(`assetValuations.totalBaseTaxable`, construite à partir des seuls biens existants au
décès — jamais des donations, qui n'entrent que dans le rappel fiscal 15 ans via
`recall.ts`) entre les bénéficiaires :

```ts
// beneficiary.ts:19-24
civilShares.forEach(share => {
  const partBrute = assetValuations.totalBaseTaxable * share.fraction;
  perBeneficiary[share.beneficiaryId] += partBrute;
  ...
});
```

`civilShares` est construit une seule fois dans `index.ts` (`civilShares.fraction =
heir.partFinale / sumPartFinale`) et réutilisé tel quel pour DMTG **et** pour
`netBreakdown` (via `dmtgResult.perBeneficiary[...].baseApresFrais`). **C'est le même
point d'entrée bugué pour les deux volets** (civil/cash réel ET fiscal) — pas deux bugs
séparés.

### Exonération du conjoint : en amont ou en aval de cette répartition ?

En aval, et **inconditionnelle**. `src/lib/dmtg/tax.ts::computeProgressiveTax` (L11-26) :

```ts
if (lien === 'conjoint' || lien === 'pacs' || (lien === 'frere_soeur' && exonerationSuccession)) {
  return { taxe: 0, ... };
}
```

L'exonération art. 796-0 bis CGI s'applique **après** l'attribution de l'assiette,
uniquement sur la base du champ `lien`, sans jamais regarder le montant de l'assiette
qui lui a été attribuée. **Conséquence pour le conjoint : ce volet du bug n'a aucun
impact fiscal pour lui** — que son assiette calculée soit 24 625 € (valeur actuelle,
fausse) ou 100 000 € (valeur légalement correcte), ses droits DMTG sont 0 € dans les
deux cas. Le préjudice pour le conjoint reste strictement civil (moins de cash réel
reçu), pas fiscal.

### Impact pour l'enfant sur-doté

**Confirmé, dans le sens `mauvais pour lui` (sur-taxation), pas neutre.** Dans le
scénario S1 de l'audit précédent, l'enfant se voit attribuer une assiette taxable de
73 875 € (75 % du résiduel réel de 100 000 €) alors qu'il ne reçoit légalement plus
rien de ce résiduel (déjà sur-doté de 150 000 € par sa donation). Il paierait des droits
de succession sur une base qu'il ne perçoit en réalité pas. **Dans le cas testé
spécifiquement, cet impact reste sans conséquence en euros** : l'abattement enfant
(100 000 €, art. 779 CGI) couvre entièrement les 73 875 € — droits calculés = 0 €. Mais
le mécanisme est réel et se traduirait par une **vraie sur-taxation** dès qu'un
scénario combine un résiduel plus important et/ou un enfant ayant déjà consommé une
partie de son abattement (donations antérieures d'un autre montant, rappel 15 ans) —
non testé ici, hors périmètre de cette vérification ciblée.

**Effet secondaire pour le Trésor** (noté pour mémoire, hors sujet de cette commande) :
un enfant sous-doté (situation inverse, non rencontrée dans les 5 scénarios testés)
recevrait symétriquement une assiette taxable trop faible — perte fiscale pour le
Trésor. Non creusé davantage.

### Conclusion Étape 0

**Un seul point de correction à faire, pas deux.** Puisque `civilShares.fraction` est
la source commune du volet civil (`netBreakdown`/cash réel) et du volet fiscal
(assiette DMTG), corriger le calcul de `civilShares.fraction` dans `index.ts` (comme
prévu à l'Étape 1) **corrige mécaniquement les deux en même temps** — pas besoin d'un
second correctif séparé dans `computeDMTG`. Le conjoint n'a aucun enjeu fiscal
(exonération inconditionnelle en aval) ; l'enjeu fiscal réel concerne l'enfant sur-doté,
et sera résolu par le même correctif sans intervention supplémentaire dans
`dmtg/`.

---

## Étape 1 — Design de la correction

### Algorithme (rappel de la commande, vérifié ci-dessous scénario par scénario)

Pour chaque héritier `h` (calculé après `partFinale`, sans y toucher) :
1. `dejaDetenu(h)` = somme de ses donations **rapportables** maintenues (celles qui
   entrent dans `rapportTotal(h)`, cf. `reserve.ts::computeRapport` — pas les hors
   part, jamais concernées par le rapport).
2. `cashDu(h) = max(0, partFinale(h) − dejaDetenu(h))`.
3. Si `Σ cashDu ≤ résiduel réel` (assiette DMTG réelle, i.e. `dmtgAssets` nets) :
   chaque héritier reçoit `cashDu(h)`. Solde éventuel → cf. §1.1 ci-dessous (mécanisme
   existant identifié).
4. Si `Σ cashDu > résiduel réel` (conjoint exhérédé de fait, art. 758-5) : **le
   référentiel ne donne pas de clé de répartition explicite entre plusieurs héritiers
   simultanément sous-dotés** — cf. §1.2, ambiguïté bloquante.

### §1.1 — Mécanisme existant pour un résiduel excédentaire (cas Σ cashDu < résiduel)

Recherche effectuée dans `index.ts`/`netBreakdown.ts` : **aucun mécanisme dédié
n'existe aujourd'hui** pour un résiduel réel strictement supérieur à la somme des parts
théoriques (`Σ cashDu`). Ce cas ne s'est produit dans aucun des 5 scénarios testés
(l'audit précédent avait justement construit des scénarios où la donation maintenue
dépasse ou approche la part théorique, donc `Σ cashDu` reste structurellement ≤
`massePartageable`, et le résiduel réel est toujours une fraction de cette masse). Il
peut néanmoins survenir légitimement dans un dossier sans donation antérieure
significative (le cas « normal », majoritaire en pratique) — dans ce cas,
`Σ cashDu = Σ partFinale = massePartageable`, et si aucune libéralité rapportable
n'existe, `massePartageable = résiduel réel` exactement (aucun rapport à ajouter) :
**Σ cashDu = résiduel réel, pas de solde**. Le cas « résiduel strictement excédentaire »
ne peut en réalité se produire QUE si `massePartageable > résiduel réel`
structurellement (donc seulement en présence de rapports/réductions) ET que la
distribution des donations soit telle qu'aucun héritier ne soit sous-doté — situation
mathématiquement possible mais non rencontrée dans les scénarios testés ; à valider
séparément si elle se présente en pratique, non bloquant pour ce chantier.

### §1.2 — Ambiguïté bloquante : plusieurs héritiers simultanément sous-dotés

**Recherche effectuée** : relecture intégrale de l'Étape 7 de l'Annexe 1 (L2126-2131),
du §9.7 « Exécution du rapport » (L827-844, art. 858-863), et du §5.3 sur la double
masse du conjoint (L2106-2115). Aucun de ces passages ne traite le cas où **plusieurs
héritiers** ont simultanément un `cashDu` positif dont la somme dépasse le résiduel
réel disponible. Le référentiel :
- Prévoit l'indemnité de rapport (soulte, art. 858, §9.7 L830) comme réponse au
  dépassement — mais cette soulte est une somme que l'héritier **sur-doté** doit en
  principe verser à la succession (« en principe exigible au partage ») pour reconstituer
  la masse. **Ce mécanisme, s'il était intégralement modélisé, ferait disparaître le
  déficit de résiduel dans les 5 scénarios testés** (démonstration algébrique ci-dessous,
  §1.3) — mais il suppose que l'héritier sur-doté dispose de liquidités personnelles
  hors succession pour payer cette soulte, ce que l'outil ne modélise pas (aucun champ
  de patrimoine personnel des héritiers). **Explicitement écarté du périmètre de ce
  chantier** : le résultat attendu donné par la commande pour S1 (« conjoint
  100 000 €, enfant 0 € ») confirme que la soulte n'est PAS censée être collectée et
  redistribuée dans cette itération — seul le résiduel réel de la succession est
  redistribué, jamais des fonds personnels supposés de l'héritier sur-doté.
- Ne dit rien, en revanche, sur la clé de répartition du résiduel **entre plusieurs
  héritiers différents, tous légitimement sous-dotés**, quand ce résiduel ne suffit
  pas à tous les couvrir (sans faire intervenir de soulte externe). Aucune mention de
  priorité (conjoint avant descendants, ou l'inverse), ni de proportionnalité, ni
  d'ordre de paiement, pour ce cas précis.

### §1.3 — Démonstration : sans collecte de soulte, `Σ cashDu = résiduel réel` exactement quand un seul héritier est sous-doté, mais peut concerner plusieurs héritiers simultanément

Démontré dans l'audit précédent : `Σ partFinale = massePartageable` toujours, et
`Σ dejaDetenu(h) = Σ rapportTotal(h)` exactement (rapport et valeur maintenue
coïncident terme à terme pour toute libéralité rapportable, réduction ou non — identité
algébrique déjà établie). Donc `Σ (partFinale(h) − dejaDetenu(h))`, **sans clamp**, vaut
exactement `massePartageable − Σ rapports = résiduel réel` (+ `totalReduit`, l'indemnité
de réduction déjà réintégrée dans `massePartageable` — traitée comme faisant partie du
résiduel réel disponible, cohérent avec le mécanisme Bloc 1 déjà jugé conforme).
**Cette identité est vraie globalement**, mais dès qu'**au moins deux héritiers** ont
chacun un terme positif (`cashDu(h) > 0`) alors qu'**au moins un autre** a un terme
négatif clampé à 0 (sur-doté), le clamp fait disparaître la compensation négative sans
la redistribuer — c'est exactement le mécanisme qui produit `Σ cashDu > résiduel réel`
**et**, simultanément, un besoin de répartir ce résiduel entre plusieurs demandeurs
légitimes.

### §1.4 — Vérification contre les 5 scénarios de l'audit précédent

| # | Héritiers avec `cashDu > 0` (montant) | `Σ cashDu` | Résiduel réel | Ambigu ? |
|---|---|---|---|---|
| **S1** | conjoint seul (250 000 €) | 250 000 € | 100 000 € | **Non** — un seul demandeur : `min(250000, 100000)` = **100 000 € au conjoint, 0 € à l'enfant** ✅ conforme au résultat attendu par la commande |
| **S2** | conjoint (250 000 €) **et** enfantNonCommun (375 000 €) | 625 000 € | 100 000 € | **Oui** — 2 héritiers simultanément sous-dotés, résiduel insuffisant pour l'un ou l'autre seul, aucune clé de partage trouvée dans le référentiel |
| **S3** | conjoint (247 500 €), e2 (247 500 €) **et** e3 (247 500 €) | 742 500 € | 500 000 € | **Oui** — 3 héritiers simultanément sous-dotés (résiduel couvrant grossièrement 2 des 3 parts, ou une répartition proportionnelle : aucune règle trouvée) |
| **S4** | conjoint (250 000 €) **et** e2 (375 000 €) | 625 000 € | 50 000 € | **Oui** — même ambiguïté que S2, avec réduction déclenchée en amont (ne change rien à l'ambiguïté) |
| **S5** | e2 seul (500 000 €), pas de conjoint dans ce scénario | 500 000 € | 10 000 € | **Non** — un seul demandeur : `min(500000, 10000)` = **10 000 € à e2, 0 € à e1** |

**Constat déterminant** : l'ambiguïté n'est pas un cas limite artificiel — elle apparaît
dans **3 des 5 scénarios de l'audit précédent** (S2, S3, S4), dès qu'il y a plus d'un
enfant non-donataire (ou un enfant non commun) en plus du conjoint. C'est en réalité la
configuration la plus courante en clientèle patrimoniale (plusieurs enfants, un seul
ayant reçu une donation antérieure) — pas un cas rare à traiter en dette technique
mineure.

---

## Décision : arrêt à ce stade, pas d'implémentation

Conformément à la consigne de la commande (« si tu ne trouves pas de règle explicite,
NE CHOISIS PAS une clé arbitrairement : arrête-toi ») et à la règle générale du projet
(« exposer les règles... avant de coder, et attendre validation explicite » pour toute
règle métier non triviale), **aucun code n'a été modifié**. `index.ts`, `netBreakdown.ts`
et `dmtg/` restent inchangés. Le test figé
`src/lib/transmission/doubleMasseConjoint.audit-2026-08.test.ts` reste en l'état : il
documente toujours le comportement actuel (bugué), pas un correctif.

### Ce qui est prêt à implémenter dès arbitrage obtenu

- Le point de correction unique (`civilShares.fraction` dans `index.ts`, cf. Étape 0)
  est identifié et suffit à corriger civil ET fiscal en un seul endroit.
- L'algorithme des étapes 1-2 (calcul de `dejaDetenu`/`cashDu` par héritier) est
  entièrement spécifié et vérifié sans ambiguïté.
- Le cas à un seul héritier sous-doté (§1.4, S1/S5) est non ambigu et immédiatement
  implémentable et testable — mais il serait incohérent de livrer un correctif partiel
  qui fonctionne uniquement quand un seul héritier est concerné et se comporte de
  façon non spécifiée (arbitraire, quel que soit le choix de repli technique) dans le
  cas majoritaire (plusieurs héritiers sous-dotés) sans validation explicite de ce choix.

### Question à trancher pour débloquer l'implémentation

Quand le résiduel réel ne suffit pas à couvrir tous les `cashDu` positifs de plusieurs
héritiers simultanément (ex. S2 : conjoint dû 250 000 €, enfant non commun dû
375 000 €, résiduel 100 000 €), comment répartir ce résiduel entre eux ? Options
identifiées, à arbitrer (aucune ne s'appuie sur une règle explicite du référentiel
lu) :
1. **Proportionnel aux `cashDu` respectifs** (ex. S2 : conjoint 100 000 × 250/625 =
   40 000 €, enfant non commun 100 000 × 375/625 = 60 000 €) — simple, mais
   arbitraire du point de vue légal.
2. **Priorité au conjoint** (protection légale spécifique art. 758-5, qui ne
   concerne QUE le conjoint) jusqu'à couverture de son `cashDu`, solde au(x) autre(s)
   héritier(s) sous-doté(s) — cohérent avec le fait que l'art. 758-5 est la seule
   disposition du référentiel qui nomme explicitement une masse d'exercice protégée,
   mais rien ne dit que cette priorité doit jouer AU DÉTRIMENT d'un autre héritier
   également sous-doté (l'article vise le conjoint face au disposant, pas le
   conjoint face aux autres héritiers non sur-dotés).
3. **Hors périmètre outil / documentation UI uniquement** : afficher un avertissement
   quand `Σ cashDu > résiduel réel` avec plusieurs héritiers concernés, sans tenter de
   calculer une répartition automatique (renvoyer au notaire pour arbitrage réel) —
   évite de coder une hypothèse non fondée, au prix de ne pas afficher de chiffre net
   par héritier dans ce cas précis.

Ce point nécessite un arbitrage (métier/juridique) avant que l'implémentation
(Étape 2) puisse reprendre.
