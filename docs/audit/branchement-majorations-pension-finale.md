# Branchement des surcotes et majorations sur la pension finale affichée

> Suite des écarts #5 (surcote classique), #6 (surcote parentale) et #7 (majoration enfants), tous
> implémentés et testés mais jamais consommés par l'écran. Référentiel :
> `docs/retraite-base-referentiel.md` §12.3 (ordre d'application) et §3.7 (formule détaillée régime
> général). Écarts #9 à #15 : hors périmètre, non touchés.

---

## 1. Diagnostic — avant tout code

### 1.a. Où la pension finale est assemblée, régime par régime

Trois assembleurs distincts, un par composant régime affiché sur l'écran Carrière :

| Régime | Composant | Variable finale | Étage MICO/MIGA |
|---|---|---|---|
| Régime général (+ SSI/agents contractuels/artistes-auteurs, non distingués dans l'UI) | [`Carriere.tsx`](../../src/components/retraite/Carriere.tsx) | `pensionBaseAjustee` (ligne ~434) | Oui — `minimumContributif()`, déjà branché mais **jamais affiché comme ligne détaillée** (calcul.ts importé, valeur utilisée dans le `Math.max`, aucun libellé « Minimum contributif » dans le JSX — à la différence de la fonction publique, cf. 1.d) |
| Fonction publique | [`CarriereFonctionPublique.tsx`](../../src/components/retraite/CarriereFonctionPublique.tsx) | `pensionFinale` (ligne ~115) | Oui — `minimumGaranti()` + `pensionFonctionPubliqueFinale()`, déjà affiché (« Minimum garanti : X / an ») |
| CNAVPL | [`CarriereCNAVPL.tsx`](../../src/components/retraite/CarriereCNAVPL.tsx) | `pensionFinale` (ligne ~65) | **Aucun** — confirmé par le référentiel §5.5, comportement actuel correct sur ce point, à ne pas introduire |

`Trimestres.tsx` (onglet Optimisation, simulateur de rachat de trimestres) utilise également
`decoteSurTrimestres()` pour son propre affichage « Décote / surcote applicable » et ses calculs de
point mort. **Explicitement hors périmètre** de cette mission (qui porte sur « la pension finale
montrée au conseiller », c'est-à-dire l'écran Carrière, pas le simulateur de rachat) — signalé ici
pour mémoire (incohérence non résolue, pas absorbée silencieusement), mais non modifié dans cette
session.

### 1.b. La branche « surcote » fautive — confirmée présente dans les trois assembleurs

Les trois composants utilisent une fonction de décote **symétrique** (`decoteSurTrimestres()` pour
le régime général, `decoteSurTrimestresPlafond25()` pour la fonction publique et CNAVPL) dont la
branche positive (`difference > 0 → difference × 1,25`, sans plafond ni porte d'éligibilité) est
directement appliquée à la pension comme si c'était une surcote légitime :

- **Régime général** (`Carriere.tsx`) : `decoteSurcote` (état, calculé par un `useEffect`) alimente
  directement `pensionBaseBrute * (1 + decoteSurcote / 100)` — si `decoteSurcote > 0` (carrière
  complète ou excédentaire), cette valeur EST la branche fautive.
- **Fonction publique** (`CarriereFonctionPublique.tsx`) : `decoteTrimestres` (même mécanique,
  plafond -25 %) alimente `pensionBaseFonctionPublique(tib, taux, decote)`.
- **CNAVPL** (`CarriereCNAVPL.tsx`) : `decoteOuSurcote` alimente directement
  `pensionBaseCNAVPL(pointsNum, valeurPointNum, decoteOuSurcote)`.

**Confirmé : oui, la branche fautive est consommée dans les trois cas.** Conformément à la mission,
elle doit être retirée (pas additionnée à `surcoteTotale()`, ce qui compterait la majoration deux
fois) — remplacée par : décote seule (partie ≤ 0, comportement inchangé) + `surcoteTotale()` ajoutée
séparément, dans l'ordre confirmé par le référentiel (§12.3 : « surcote assise sur la pension avant
MICO » — comprendre : *calculée* sur P0, mais *ajoutée* après la comparaison avec le MICO, cf. le
scénario de non-régression déjà écrit pour l'écart #5 dans `calcul.test.ts`, qui pose exactement
cette distinction).

### 1.c. Disponibilité des données requises

**Explicitement demandées par la mission :**

- **Case à cocher surcote parentale (#6)** : `au_moins_un_trimestre_majoration_enfant`, chargée dans
  l'état `auMoinsUnTrimestreMajorationEnfant` de `Carriere.tsx` (déjà fait lors de la session
  précédente). **Déjà disponible dans le composant parent, mais pas transmise aux composants enfants**
  (`CarriereFonctionPublique.tsx`, `CarriereCNAVPL.tsx`) — aucune prop actuelle ne la porte. Un
  nouvel accès n'est pas nécessaire (la donnée est déjà chargée une fois, au niveau du parent), mais
  un nouveau **fil de props** l'est.
- **Nombre d'enfants avec filiation, via `family_links` (#7)** : **absent**. `Carriere.tsx`
  n'appelle aujourd'hui que `familyService.getFamilyProfile()` (date de naissance du client) —
  jamais `familyService.getFamilyLinks()`. Un nouvel accès aux données est requis : un appel
  `getFamilyLinks()` supplémentaire, en parallèle du chargement du profil déjà en place.

  **Correctif au passage** (incohérence trouvée dans `docs/audit/implementation-majoration-enfants.md`,
  signalée ici plutôt qu'absorbée silencieusement) : ce document affirmait au §0 et au §4 que le cas
  courant de la majoration 3 enfants couvre « filiation directe et adoption simple/plénière » — mais
  son propre §4 (dette technique), correctement, classe l'**adoption simple** dans la branche
  « enfant recueilli sans filiation » (condition des 9 ans, non implémentée), pas dans le cas
  courant. Le référentiel §3.8 est sans ambiguïté : seule l'**adoption plénière** relève de la
  filiation sans condition ; l'adoption simple relève de l'autre branche. Le filtre implémenté dans
  cette session retient donc `lien_familial === 'Enfant' && enfant_adopte !== 'Adoption simple'`
  (c'est-à-dire filiation directe **ou** adoption plénière, jamais adoption simple) — pas
  « adoption simple/plénière » comme le résumé introductif de ce document le laissait entendre à
  tort.

**Non demandée explicitement par la mission, mais bloquante — trouvée pendant le diagnostic :**

- **`trimestresCotisesAnneeReference`** (le nombre de trimestres cotisés sur l'année précédant l'âge
  légal, requis par `surcotePourTrimestresCotises()` et `surcoteParentale()`) : calculable pour le
  **régime général uniquement**, via `parAnnee` de `trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere)`
  (déjà chargé, écart #5) combiné à `ageLegalPourGeneration()` + `dateAnniversaireLegal()` (Session A)
  pour déterminer l'année exacte visée — aucune approximation nécessaire, la génération déjà résolue
  suffit à identifier l'année précisément.

  **Pour la fonction publique et CNAVPL, cette donnée n'existe pas dans le modèle actuel.** Ces deux
  régimes ne connaissent que des trimestres agrégés sur toute la carrière (`trimestresLiquidables`,
  `trimestresCNAVPL` — de simples nombres saisis à la main), sans détail par année civile comparable
  à `detailCarriere` du régime général. **Décision retenue pour cette session** : brancher
  `surcotePourTrimestresCotises()`/`surcoteParentale()` avec `trimestresCotisesAnneeReference = 0`
  pour ces deux régimes — ce n'est pas une valeur inventée, c'est la traduction honnête de « aucune
  donnée par année disponible » via le contrat déjà existant de ces fonctions (0 trimestre cotisé
  connu → 0 % de surcote, sans fabriquer de chiffre). La porte d'éligibilité (âge légal,
  déclaration parentale) reste correctement évaluée et affichée, seul le montant reste nul faute de
  donnée. Documenté comme dette technique (§4) plutôt que silencieusement laissé de côté.

### 1.d. Détail déjà affiché à l'écran — état des lieux avant extension

- **Fonction publique** : `minimumGarantiValue` déjà affiché (« Minimum garanti : X / an », sous la
  pension). Modèle à reproduire pour les nouvelles lignes.
- **Régime général** : **aucune ligne dédiée au MICO** aujourd'hui, contrairement à ce que la mission
  supposait implicitement (« comme c'est le cas pour le MICO/MIGA »). Le montant du MICO est
  calculé et entre dans le `Math.max()`, mais n'apparaît nulle part à l'écran. Décision retenue pour
  cette session : ajouter cette ligne manquante en même temps que les nouvelles (surcote, majoration
  enfants), pour que le détail du régime général suive enfin le même niveau de transparence que la
  fonction publique — cohérent avec l'esprit de la mission (« étendre ce même détail »), pas une
  extension de périmètre non demandée : sans cette ligne, les nouvelles lignes de surcote/majoration
  s'ajouteraient à un écran qui n'explique déjà pas son propre plancher.
- **CNAVPL** : aucun détail multi-lignes aujourd'hui (une seule ligne « décote/surcote » synthétique).
  Même traitement : ajout des nouvelles lignes, sans MICO (absent par construction, §5.5).

### 1.e. Conclusion du diagnostic

1. La branche fautive est bien consommée dans les trois assembleurs — à retirer partout (pas
   additionner).
2. Les deux données explicitement citées par la mission sont l'une déjà chargée (case à cocher, à
   faire descendre en props), l'autre absente et à charger (`family_links`).
3. Une troisième donnée, non citée par la mission mais nécessaire à `surcotePourTrimestresCotises()`/
   `surcoteParentale()`, est disponible pour le régime général et **absente du modèle de données**
   pour la fonction publique et CNAVPL — branchée avec une valeur honnête de 0 pour ces deux régimes,
   documentée en dette technique.
4. Le régime général n'affiche aujourd'hui aucun détail MICO — corrigé au passage, dans le même
   mouvement que l'ajout des nouvelles lignes, pas une extension de périmètre séparée.

Aucune modification de code n'a eu lieu avant la rédaction de cette section.

---

## 2. Implémentation

*(Complétée au fil des commits suivants — voir §3 pour le détail par sous-tâche et §4 pour la
synthèse des tests.)*
