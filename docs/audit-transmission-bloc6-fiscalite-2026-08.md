# Bloc 6 — Chapitres 19-20 (déclaration de succession, frais de notaire)

> Périmètre déjà cadré par `docs/cartographie-transmission-2026-08.md` : le cœur fiscal
> (`dmtg/beneficiary.ts`, `dmtg/assurance-vie.ts`, `dmtg/recall.ts`) et les barèmes de frais de
> succession (`transmission/fiscal.ts::computeNotaryFees`/`computeDebours`) sont réputés robustes et
> testés, jamais confrontés ligne à ligne au texte. Objectif : confirmation, pas découverte massive.
> Hors scope (déjà tranché, non rouvert) : workflow déclaratif (dispenses, délais de dépôt — Pulse
> calcule les droits, pas le suivi de dépôt) et frais de notaire hors succession (testaments,
> donations, vente, §20.2-20.4).

**Résultat global** : le barème `computeNotaryFees` (§20.1.3, §20.1.2, §20.1.1) est correct au
centime près, vérifié valeur par valeur. Aucune régression sur le rappel fiscal 15 ans ni sur sa
séparation d'avec le rapport civil (confirmée saine). Deux lacunes réelles identifiées (forfait
mobilier 5 % côté fiscal ; écrêtement + droits/taxes annexes côté frais de notaire) — aucune n'a de
correction évidente sans arbitrage produit, donc documentées et non corrigées dans cette session.
Aucune correction appliquée. Suite de tests inchangée : **387 passed | 6 todo**, avant et après.

---

## 1. §19.5 — Éléments de liquidation (`dmtg/beneficiary.ts`)

Checklist du référentiel (L1831-1838) confrontée point par point à ce que le moteur calcule
réellement :

| Élément (référentiel) | Statut | Détail |
|---|---|---|
| Frais funéraires, forfait 1 500 € | ✅ | `beneficiary.ts:27-40`, déduit pro-rata de la part de chaque bénéficiaire. Valeur `fraisFunerairesForfait: 1500` dans `params-dmtg.json` — exacte. |
| Dons manuels / rapport fiscal (15 ans) | ✅ | Couvert par `recall.ts` (§4 ci-dessous). |
| Convention de quasi-usufruit (art. 773, 2°/774 bis) | ⚪ déjà connu | Absence déjà actée par la cartographie (chapitre 16, quasi-usufruit non codé). Pas de nouvelle observation. |
| Exonérations applicables à certains actifs | 🟡 partiel | Les exonérations fiscales par lien (conjoint, frère/sœur art. 796-0 ter) sont codées (`recall.ts`) ; les exonérations *par nature de bien* (Dutreil, GFA, résidence principale DMTG…) ne sont pas dans le périmètre de ces trois fichiers — non creusé ici, hors du triptyque audité. |
| **Forfait mobilier de 5 %** | 🔴 **absent** | Voir ci-dessous. |

### 🔴 Forfait mobilier de 5 % non implémenté

Le référentiel le liste explicitement comme un élément à ne pas oublier dans la liquidation fiscale
(« évitable par inventaire »). `grep` sur `forfait`, `mobilier`, `5 %`/`0.05` dans `src/lib/dmtg/` et
`src/lib/transmission/` : aucune occurrence. Il n'existe pas non plus de catégorie « meubles
meublants » dans les natures d'actifs (`patrimoine/qualification.ts`, `regimeFiscalPVI.ts`) qui
absorberait ce montant via une saisie manuelle équivalente à un inventaire.

**Conséquence** : pour toute succession où l'utilisateur n'a pas explicitement saisi de valeur de
mobilier comme actif, l'assiette taxable (`buildTaxBaseByBeneficiary`) est mécaniquement sous-évaluée
par rapport à la présomption légale (CGI art. 764), qui ajoute 5 % de l'actif brut successoral sauf
inventaire produit.

**Pas de correction dans cette session** : appliquer un forfait automatique suppose un arbitrage
produit (l'ajouter par défaut risquerait de compter deux fois le mobilier pour les utilisateurs qui
saisissent déjà des actifs mobiliers ligne à ligne ; ne pas l'ajouter laisse une sous-évaluation
silencieuse pour ceux qui ne le font pas). Nécessite une décision explicite : forfait automatique
optionnel (case à cocher, sur le modèle de l'abattement résidence principale IFI) vs. rappel dans
l'UI que l'utilisateur doit couvrir ce poste lui-même.

---

## 2. §19.7 — Conséquences postérieures

Référentiel : redressement IFI du défunt déclenché par le dépôt, obligation pour les héritiers de
revoir leur propre déclaration IFI l'année suivante (L1844-1845).

`grep` sur `delai_reprise`, `prescription`, `redressement`, `reprise fiscale` dans `src/lib` : aucun
résultat. Confirmé non modélisé — cohérent avec le constat déjà posé par l'audit Bloc 2
(`docs/audit-transmission-devolution-conjoint-2026-08.md` §4.1.2/§4.3.2) : l'outil ne simule qu'un
instant T (le décès), sans suivi temporel post-décès. Même famille de limite architecturale, pas un
nouveau finding — non redétaillé ici comme demandé.

---

## 3. Chapitre 20 — Barème `computeNotaryFees` vérifié valeur par valeur

Les barèmes du référentiel (C. com. art. A. 444-63 et A. 444-121) sont donnés **TTC** ; le code
travaille en **HT** puis applique la TVA à 20 % globalement (`fiscal.ts:87`). Vérification :
taux HT du code × 1,2 = taux TTC du référentiel, sur les 4 tranches des deux barèmes.

| Tranche | HT code (déclaration) | ×1,2 | TTC référentiel §20.1.3 | Écart |
|---|---|---|---|---|
| 0-6 500 € | 1,548 % | 1,8576 % | 1,8576 % | aucun |
| 6 500-17 000 € | 0,851 % | 1,0212 % | 1,0212 % | aucun |
| 17 000-30 000 € | 0,580 % | 0,696 % | 0,696 % | aucun |
| > 30 000 € | 0,426 % | 0,5112 % | 0,5112 % | aucun |

| Tranche | HT code (attestation) | ×1,2 | TTC référentiel §20.1.2 | Écart |
|---|---|---|---|---|
| 0-6 500 € | 1,935 % | 2,322 % | 2,322 % | aucun |
| 6 500-17 000 € | 1,064 % | 1,2768 % | 1,2768 % | aucun |
| 17 000-30 000 € | 0,726 % | 0,8712 % | 0,8712 % | aucun |
| > 30 000 € | 0,532 % | 0,6384 % | 0,6384 % | aucun |

Forfait acte de notoriété : `FORFAIT_NOTORIETE_HT = 56.60` × 1,2 = 67,92 € TTC — exact (§20.1.1 :
« Émolument : 67,92 € TTC »).

Rejoué l'exemple chiffré du référentiel (§20.1.2 : appartement 500 000 € → 3 398,73 € TTC) avec le
calcul par tranches marginal du code (`calculateTaxFromBareme`, logique différente en forme de la
formule « taux × assiette + à ajouter » du référentiel mais mathématiquement équivalente pour un
barème par tranches) : 6 500×1,935 % + 10 500×1,064 % + 13 000×0,726 % + 470 000×0,532 % = 2 832,275 €
HT, ×1,2 = **3 398,73 € TTC**. Concordance exacte.

**Assiette** : `computeNotaryFees(patrimony.biensExistants, valeurImmobiliere)` (`index.ts:699`) est
appelée avec l'actif brut (`biensExistants`, avant déduction du passif) — conforme à §20.1.3
(« Assiette = ACTIF BRUT de la succession, sans déduction du passif »). `valeurImmobiliere` est la
somme des `valeurVenale` des actifs de nature `immobilier`, cohérent avec « valeur réelle » (§20.1.3).

**Conclusion** : aucune erreur de recopie du barème. L'hypothèse de départ de la commande (« un
barème mal recopié ») ne se vérifie pas ici.

### 🟡 Non couvert par `computeNotaryFees` (droits et taxes, hors émoluments)

Le référentiel définit « frais de notaire = émoluments + débours + droits et taxes » (L1851). Le code
calcule les émoluments (barème + TVA) et un poste `débours` générique, paramétrable, explicitement
illustratif (`fiscal.ts:102-109`, commentaire déjà présent : « il n'existe pas de barème légal pour
les débours »). Les **droits et taxes légalement fixes** cités par le référentiel ne sont calculés
nulle part :
- enregistrement de l'acte de notoriété : 25 € (§20.1.1) ;
- taxe de publicité foncière de l'attestation immobilière : 125 € + contribution de sécurité
  immobilière 0,10 % de la valeur des immeubles transmis (§20.1.2).

Ce n'est pas un « barème mal recopié » (l'émolument lui-même est correct) mais un poste de coût
distinct, absent. Pas de correction dans cette session : ces montants légalement fixes pourraient soit
être ajoutés à `computeNotaryFees` (changement de signature/résultat), soit rester à la charge de
l'utilisateur via le champ `débours` existant en l'élargissant conventionnellement — arbitrage produit
à trancher avant toute modification.

### 🟡 §20.5 — Écrêtement (mutations immobilières) non implémenté

Le référentiel (C. com. art. A. 444-175, L2015-2016) plafonne la rémunération du notaire sur les
mutations immobilières à 10 % de la valeur du bien, avec un plancher de 90 €. `computeNotaryFees` ne
borne `emolumentsAttestationHT` ni vers le haut ni vers le bas — pour un bien immobilier de faible
valeur, l'émolument calculé par le barème dégressif peut se retrouver sous 90 € (le plancher légal ne
s'applique pas), et pour un bien de valeur très faible avec une assiette globale élevée par ailleurs,
un dépassement du plafond de 10 % n'est pas non plus détecté.

Pas de correction dans cette session : le texte plafonne « émoluments proportionnels **et de
formalités confondus** » pour l'acte concerné — or les émoluments de formalités (copies, publicité
foncière, etc., listés en tableau au §20.1.1) ne sont pas du tout modélisés individuellement dans le
code (seul un forfait notoriété global existe). Appliquer un écrêtement correct suppose de déjà avoir
cette décomposition, ce qui dépasse une correction ponctuelle — à traiter avec le point précédent
(droits et taxes) dans un même chantier « frais de notaire, deuxième passe ».

---

## 4. Rappel fiscal 15 ans (`dmtg/recall.ts`) vs. rapport civil (`reserve.ts`)

Le référentiel distingue explicitement les deux mécanismes en une seule phrase (§19.5, L1834) :
« Rapport civil (à intégrer même si les donations ont plus de 15 ans) » — sous-entendu, à l'inverse du
rappel *fiscal*, qui lui est borné à 15 ans (CGI art. 784).

- **Côté fiscal** (`recall.ts`) : `filterDonations15Years` calcule une borne `deathDate - 15 ans` et ne
  conserve que les donations `donation.date > limit15Years` (strictement postérieures) — une donation
  faite exactement 15 ans avant le décès est exclue du rappel, conforme à « moins de 15 ans ».
  `computeRecallAndAllowances` consomme ensuite l'abattement disponible dans l'ordre chronologique sur
  ce sous-ensemble borné, gère séparément les dons 790G (abattement propre, ne consomme pas
  l'abattement général) — cohérent avec §Repères chiffrés déjà noté 🟡 dans la cartographie
  (« distinction 790G / 790A bis » — non re-vérifiée ici, hors triptyque de cette commande).
- **Côté civil** (`reserve.ts::computeRapport` et fonctions voisines) : `grep` sur `15`/`quinze` dans
  ce fichier ne retourne que des occurrences sans rapport avec un délai (art. 860, 857…) — **aucune
  borne temporelle n'y est appliquée**. Toute donation rapportable au sens civil (avancement de part,
  non dispensée de rapport) entre dans `massePartageable` quelle que soit son ancienneté.

**Confirmé sain** : pas de confusion entre les deux régimes. Le rappel fiscal 15 ans et le rapport
civil sans limite de durée sont deux mécanismes indépendants, chacun implémenté avec la bonne portée
temporelle. C'était le risque explicitement redouté par la commande (mentions éparses dans les Blocs 1
et 2 sans vérification dédiée) — il ne se matérialise pas.

---

## Suite de tests

Avant et après cet audit (aucune correction appliquée) :

```
Test Files  30 passed (30)
     Tests  387 passed | 6 todo (393)
```

Baseline conforme à la consigne (387).

---

## Récapitulatif

| Point | Statut | Action |
|---|---|---|
| §19.5 frais funéraires 1 500 € | ✅ conforme | Aucune |
| §19.5 rappel fiscal 15 ans (dons manuels) | ✅ conforme | Aucune |
| §19.5 quasi-usufruit | ⚪ déjà connu (ch. 16) | Aucune — non redétaillé |
| §19.5 forfait mobilier 5 % | 🔴 absent | **Documenté, non corrigé** — arbitrage produit requis |
| §19.7 conséquences postérieures (reprise IFI) | ⚪ non modélisé | Aucune — même limite que Bloc 2, confirmée |
| §20.1.3 barème déclaration de succession | ✅ exact au centime | Aucune |
| §20.1.2 barème attestation immobilière | ✅ exact au centime | Aucune |
| §20.1.1 forfait acte de notoriété | ✅ exact | Aucune |
| §20.1 assiette (actif brut, sans passif) | ✅ conforme | Aucune |
| Droits et taxes annexes (enregistrement, CSI) | 🟡 non couvert | **Documenté, non corrigé** — arbitrage produit requis |
| §20.5 écrêtement (plafond 10 %, plancher 90 €) | 🟡 non implémenté | **Documenté, non corrigé** — dépend de la décomposition des formalités |
| Rappel fiscal 15 ans vs. rapport civil | ✅ correctement séparés | Aucune |
