# Audit — consolidation du calcul de pension Carrière ↔ Synthèse

Audit préalable, sans modification de code. Objectif : préparer la décision de faire consommer `usePensionConsolidee`/`calculerPensionConsolidee` par `Carriere.tsx`, actuellement deux pipelines parallèles (dette déjà signalée dans [pensionConsolidee.ts:4-11](src/lib/retraite/pensionConsolidee.ts) et [docs/audit/audit-retraite.md §5](docs/audit/audit-retraite.md), entrée « Pipeline de pension consolidée dupliqué — Synthese.tsx (2026-08-15) »).

Fichiers examinés : [Carriere.tsx](src/components/retraite/Carriere.tsx), [CarriereFonctionPublique.tsx](src/components/retraite/CarriereFonctionPublique.tsx), [CarriereCNAVPL.tsx](src/components/retraite/CarriereCNAVPL.tsx), [pensionConsolidee.ts](src/lib/retraite/pensionConsolidee.ts), [usePensionConsolidee.ts](src/hooks/usePensionConsolidee.ts), [hypotheseRevenuFutur.ts](src/lib/retraite/hypotheseRevenuFutur.ts), [calcul.ts](src/lib/retraite/calcul.ts).

---

## 1. Entrées consommées par chaque implémentation

| Entrée | `Carriere.tsx` (inline) | `usePensionConsolidee`/`calculerPensionConsolidee` |
|---|---|---|
| `salaireAnnuelMoyen` | State texte local `salaireAnnuelMoyen`, initialisé depuis `data.salaire_annuel_moyen` puis **édité en direct** par l'utilisateur (valeur live, avant sauvegarde) | `data.salaire_annuel_moyen` **post-sauvegarde**, éventuellement remplacé par `salaireAnnuelMoyenProjete` (SAM recalculé avec années synthétiques projetées) |
| `trimestresValides` | State texte local, live | `data.trimestres_valides` post-sauvegarde, **+ `trimestresProjetes`** (trimestres synthétiques des années manquantes) |
| `trimestresRequis` | `useState`, recalculé par effet dès que `dateNaissanceDetail` est connu (`trimestresRequisPourGeneration`) | Calculé à chaque rendu (pas de state), même fonction |
| `dateNaissance` | `family_profiles`/`marital_status` via `familyService`, chargé par un `useEffect` propre à `Carriere.tsx` | Même source, chargée indépendamment par un `useEffect` propre au hook |
| `familyLinks` | `familyService.getFamilyLinks()`, chargé par un `useEffect` propre à `Carriere.tsx` | Même appel, chargé indépendamment par le hook |
| `ageActuel` | `computeAge(dateNaissanceISO)` | Identique |
| `regimesPoints` | State local `regimesPoints`, initialisé depuis `data.regimes_points`, modifié en direct par import RIS | `data.regimes_points` post-sauvegarde |
| `detailCarriere` | State local `detailCarriere` (table `retraite_carriere_detail`), modifiable en direct | `detailCarriereSansId` via `useCarriereDetail`, indépendant |
| `auMoinsUnTrimestreMajorationEnfant` | State local, live (checkbox) | `data.au_moins_un_trimestre_majoration_enfant` post-sauvegarde |
| `autresPensionsMensuelles` | State local, **saisi mais jamais persisté** (absent de `saveRetraiteData`) | **Toujours `0`** en dur dans `usePensionConsolidee.ts:153` — ne peut pas être autre chose, le champ n'existe pas en base |
| Fonction publique (TIB, trimestres liquidables, RAFP, décote âge, MIGA, invalidité, année ouverture droits) | States locaux liftés, live, transmis à `CarriereFonctionPublique` en props ; résultat remonté via `onResultChange` | `data.traitement_indiciaire_brut` etc., post-sauvegarde |
| CNAVPL (trimestres, points, valeur du point) | States locaux liftés, live, transmis à `CarriereCNAVPL` ; résultat remonté via `onResultChange` | `data.trimestres_cnavpl` etc., post-sauvegarde |
| Hypothèse de revenu futur (mode, valeur manuelle, dernière année connue) | Saisie dans `ToggleHypotheseRevenuFutur` (au sein de `Carriere.tsx`), sauvegardée via `useHypotheseRevenuFutur` — **mais jamais consommée par le pipeline de pension de `Carriere.tsx` lui-même** | Consommée intégralement (`anneesManquantes`, `trimestresProjetesAnneesManquantes`, `periodesSynthetiquesAnneesManquantes`, `revenuAnnuelHypotheseDerniereAnneeConnue`) |

**Point structurel** : `Carriere.tsx` calcule sa pension à partir de son **propre state React live** (avant tout aller-retour Supabase), alors que `usePensionConsolidee` relit systématiquement les données **déjà persistées** via `useRetraiteData`/`useCarriereDetail`/`familyService`, chargées par un jeu d'effets totalement indépendant. Les deux ne partagent aucune donnée en mémoire.

---

## 2. Écarts recensés

### 2.1 Projection de revenu futur (déjà identifié comme le sujet de la session precédente)

`usePensionConsolidee` substitue, quand l'hypothèse est applicable (`projectionApplicable`), `salaireAnnuelMoyenProjete` à `salaireAnnuelMoyen` et ajoute `trimestresProjetes` à `trimestresValides` **avant** de les passer à `calculerPensionConsolidee`. Cette substitution est ensuite répercutée partout où `entree.trimestresValides` est utilisé à l'intérieur de la fonction : taux de proratisation, décote/surcote régime général, `trimestresTousRegimes` (donc aussi la décote FP et CNAVPL, qui reçoivent `trimestresValides + ...` en `trimestresAutresRegimes`), MICO (palier 1, éligibilité), `dureeRequiseAtteinte`, `ageTauxPleinAffiche`.

`Carriere.tsx` calcule tout son pipeline à partir de `trimValidesRegimeGeneral = parseInt(trimestresValides) || 0` (le state brut, non projeté) — l'hypothèse de revenu futur, bien que saisie sur cet écran, n'entre dans aucun des calculs affichés sur `Carriere.tsx` lui-même.

**Classification : différence de scope assumée, documentée** (implémentation add-on de la session précédente, décision explicite de ne pas toucher `Carriere.tsx`). Pas un bug — mais c'est la source de divergence la plus visible et la plus fréquente en pratique dès qu'un client a des années manquantes avant l'âge légal.

### 2.2 Source des données : state live (Carrière) vs données persistées (Synthèse)

Toute la ligne « live vs persisté » du tableau §1 est un écart de fond, distinct de la projection. Deux sous-cas :

- **Décalage temporaire pendant la frappe** : tant que le `useAutoSave` (débounce) de `Carriere.tsx` n'a pas flushé, Synthèse affiche encore les anciennes valeurs. Se résorbe seul après le délai de debounce — comportement attendu de toute UI à sauvegarde différée, pas spécifique à ce couple de fichiers.
- **`autresPensionsMensuelles`** : cas different, **structurel et permanent**, pas seulement temporaire — ce champ n'est jamais écrit dans `retraite_data` (absent de l'objet passé à `saveRetraiteData`, cf. [Carriere.tsx:498-517](src/components/retraite/Carriere.tsx)). Un conseiller qui renseigne ce champ pour un client polypensionné voit l'écrêtement du MICO appliqué correctement sur `Carriere.tsx`, mais **jamais** sur `Synthèse` (`usePensionConsolidee.ts` passe `autresPensionsMensuelles: 0` en dur, faute de colonne existante). Le montant consolidé de Synthèse peut donc être **surestimé** par rapport à la réalité chaque fois que ce champ est renseigné et que l'écrêtement aurait dû réduire la majoration MICO.

**Classification : le premier sous-cas n'est pas un bug (latence de sauvegarde normale). Le second est un bug de sous-implémentation** — la donnée existe, est saisie, produit un effet correct sur un écran, et est silencieusement ignorée sur l'autre, sans qu'aucun message n'avertisse l'utilisateur. Indépendant de la fusion des deux pipelines de calcul : consolider `Carriere.tsx` sur `calculerPensionConsolidee` ne corrige PAS ce point tant que `autres_pensions_mensuelles` n'est pas une colonne persistée — les deux écrans continueraient de diverger sur ce champ précis si rien d'autre n'est fait.

### 2.3 Reste du pipeline régime général : formules, arrondis, ordre d'application

Comparaison ligne à ligne de `calculerPensionConsolidee` (§ régime général, lignes 246-347) et du bloc inline de `Carriere.tsx` (lignes ~404-819) :

- Taux de proratisation (`tauxProratisation`), pension de base (`pensionBase`), décote (`decoteSurTrimestres` + `decoteSurAge` via `decoteApplicable`), MICO paliers 1 et 2 (`minimumContributif`, `majorationPalier2MICO`, `ecretementMICO`), surcote classique et parentale (`surcotePourTrimestresCotises`, `surcoteParentale`, `surcoteTotale(..., true)`), majoration 3 enfants (`majorationTroisEnfants`) : **mêmes fonctions, même ordre d'application, mêmes arguments** (à la substitution projetée près du §2.1). Aucun écart de formule ou d'arrondi trouvé.
- `ageTauxPleinAffiche` (texte binaire, ni l'un ni l'autre ne calcule un vrai âge légal affiché) : logique identique — seule la valeur de `trimestresValides` en entrée diffère (§2.1).
- Année de référence de la surcote (`anneeReferenceSurcote`, `trimestresCotisesAnneeReference` dérivés de `resultatTrimestresDetailCarriere.parAnnee`) : identique dans les deux, dérivée du même `detailCarriere` **non projeté** dans les deux cas (les périodes synthétiques de projection ne sont utilisées par `usePensionConsolidee` que pour le calcul du SAM projeté, jamais injectées dans `detailCarriere` lui-même) — pas de divergence ici.

**Classification : aucun écart** sur cette portion — le pipeline régime général est une copie fidèle, à jour l'un de l'autre au moment de cet audit.

### 2.4 Fonction publique et CNAVPL

`calculerResultatFonctionPublique`/`calculerResultatCNAVPL` (pensionConsolidee.ts) reproduisent fonction pour fonction la logique inline de `CarriereFonctionPublique.tsx`/`CarriereCNAVPL.tsx` (décote plafonnée à -25 %, MIGA, décote d'âge catégorie active, surcote exclusive pour la FP/cumulative pour le CNAVPL via le 3ᵉ argument de `surcoteTotale`, majoration enfants). **Aucun écart de formule trouvé.** Seule différence : `trimestresAutresRegimes` passé à ces fonctions inclut, côté `usePensionConsolidee`, le `trimestresValides` **projeté** — même mécanisme que §2.1, pas un écart indépendant.

### 2.5 Chargement dupliqué de données identiques (family links, date de naissance)

`Carriere.tsx` et `usePensionConsolidee` chargent chacun, indépendamment, `familyService.getFamilyLinks()` et la date de naissance. Pas un écart de résultat (même source, même fonction de lecture) mais un **doublon d'appels réseau** pour un même écran (`RetraiteSection.tsx` monte `Carriere` et, via `Synthese`, `usePensionConsolidee`) — inefficacité, pas un bug de calcul. À noter pour la consolidation : une fusion propre éliminerait ce doublon.

### 2.6 Tableau de synthèse des écarts

| # | Écart | Bug ou scope assumé ? | Sens de l'impact si Carrière adoptait `calculerPensionConsolidee` |
|---|---|---|---|
| 1 | Projection revenu futur non appliquée sur Carrière | Scope assumé, documenté | Pension affichée sur Carrière **augmenterait** (ou resterait stable si aucune année manquante / pas d'hypothèse saisie) |
| 2 | Live vs persisté (latence de sauvegarde) | Non-bug, comportement UI normal | Neutre à terme (les deux convergent après le débounce) — disparaîtrait si Carrière calculait directement sur son propre state live, comme aujourd'hui |
| 3 | `autresPensionsMensuelles` non persisté | **Bug de sous-implémentation** (silencieux) | Aucun changement — persiste indépendamment de la fusion, tant que la colonne n'existe pas |
| 4 | Pipeline régime général (formules/arrondis/ordre) | Aucun écart | — |
| 5 | Fonction publique / CNAVPL (formules) | Aucun écart | — |
| 6 | Double chargement family links/date de naissance | Inefficacité, pas un écart de résultat | Résolu par une fusion propre (un seul chargement) |

---

## 3. Risque de la consolidation — quels chiffres changeraient, dans quel sens

**Chiffres affichés sur `Carriere.tsx` qui changeraient** : uniquement pour les clients ayant une hypothèse de revenu futur active (mode « dernière année connue » avec au moins une année de RIS exploitable, ou saisie manuelle) **et** au moins une année manquante entre aujourd'hui et l'âge légal réel (généré par `anneesManquantes`). Pour tous les autres clients (pas d'hypothèse renseignée, ou déjà à l'âge légal), le résultat serait **strictement identique** — le pipeline sous-jacent est le même (§2.3, §2.4).

Pour les clients concernés, le changement irait **uniquement à la hausse** :
- `trimestresValides` augmente (ajout de `trimestresProjetes`, toujours ≥ 0) → taux de proratisation, éligibilité MICO/taux-plein, éligibilité surcote potentiellement améliorés.
- `salaireAnnuelMoyen` peut changer dans les deux sens en théorie (le SAM recalculé remplace les meilleures années si les années projetées sont plus favorables que celles actuellement retenues) mais en pratique, l'hypothèse de revenu futur vise à **compléter** des années à 0, donc le SAM projeté est structurellement `≥` au SAM non projeté (on ne retire jamais une bonne année réelle, on ajoute des années qui ne peuvent que remplacer des zéros ou de moins bonnes années dans le calcul des meilleures années).
- Aucun mécanisme dans la projection ne peut faire *baisser* la pension affichée par rapport à la version actuelle de Carrière.

**Cas où le calcul de `Carriere.tsx` serait, à l'inverse, plus complet que `calculerPensionConsolidee`** : **aucun trouvé**. `autresPensionsMensuelles` (§2.2) est bien pris en compte côté Carrière et pas côté Synthèse, mais ce n'est pas un avantage du *pipeline de calcul* de Carrière — c'est un défaut du *chargement de données* côté Synthèse (le champ n'est simplement jamais transmis). Si `Carriere.tsx` se mettait à appeler `calculerPensionConsolidee` en lui passant lui-même la valeur actuelle de son state `autresPensionsMensuelles` (ce qu'il peut faire puisque `calculerPensionConsolidee` accepte ce paramètre), ce point ne régresserait pas sur Carrière — il resterait simplement toujours absent côté Synthèse tant que la colonne n'existe pas. **Donc la fusion ne doit pas se faire dans l'autre sens** : `calculerPensionConsolidee` reste la bonne référence, à condition que `Carriere.tsx` continue de lui fournir sa valeur live d'`autresPensionsMensuelles` plutôt que la valeur figée à `0` qu'utilise `usePensionConsolidee`.

**Risque principal pour un conseiller avec des dossiers en cours** : un client déjà suivi, sans hypothèse de revenu futur renseignée, ne verrait **aucun changement de montant** après la fusion. Un client avec une hypothèse active verrait un montant de pension **plus élevé** sur l'onglet Carrière du jour au lendemain, sans action de sa part — à traiter comme un changement de comportement visible, pas juste un refactoring interne, et à communiquer en amont plutôt qu'à découvrir en production.

---

## 4. Plan de consolidation proposé (à valider, non codé)

**Objectif final** : un seul point de calcul (`calculerPensionConsolidee`), consommé à la fois par `Carriere.tsx` et par `usePensionConsolidee.ts`/Synthèse.

**Étape 0 — pré-requis, avant tout changement de calcul** : décider si `autresPensionsMensuelles` doit devenir un champ persisté (migration ajoutant une colonne à `retraite_data`, avec FK déjà couverte par la table existante). Sans cette étape, la fusion fige un comportement où ce champ reste local à Carrière et absent de Synthèse — acceptable comme choix transitoire, mais à trancher explicitement plutôt que de le découvrir après coup. *Cette étape est un choix produit, pas seulement technique — à valider avec l'utilisateur avant de coder quoi que ce soit.*

**Étape 1 — remplacer le state dérivé de `Carriere.tsx` par un appel à `calculerPensionConsolidee` sur son propre state live**, sans changer la source des données d'entrée (donc sans encore brancher la projection de revenu futur sur l'écran Carrière) :
- Construire l'objet `EntreePensionConsolidee` à partir des states déjà existants de `Carriere.tsx` (`salaireAnnuelMoyen`, `trimestresValides`, `detailCarriere`, `familyLinks`, `auMoinsUnTrimestreMajorationEnfant`, `autresPensionsMensuelles`, objets `fonctionPublique`/`cnavpl` reconstruits depuis les states liftés) — pas de nouvel appel réseau, juste un remplacement du pipeline de calcul par la fonction pure.
- Supprimer les `useEffect` de calcul devenus redondants (`pensionBaseBrute`, `decoteSurcote`, `ageTauxPlein`) au profit d'un seul appel à `calculerPensionConsolidee` (ou d'un `useMemo` équivalent).
- **Non-régression attendue à cette étape** : résultat strictement identique à l'ancien pipeline pour tout client sans projection (§3) — bon jalon de vérification manuelle avant de passer à l'étape 2.

**Étape 2 — brancher la projection de revenu futur sur l'écran Carrière** (le changement de comportement visible identifié au §3) :
- Une fois l'étape 1 validée en non-régression, réutiliser la même logique de projection que `usePensionConsolidee.ts` (extraction possible dans un helper partagé plutôt que dupliquée une deuxième fois) pour construire `salaireAnnuelMoyen`/`trimestresValides` projetés à partir de `useHypotheseRevenuFutur`, déjà présent sur l'écran.
- **Communiquer ce changement à l'utilisateur avant déploiement** (§3) : les montants affichés sur des dossiers existants avec hypothèse active vont augmenter.

**Étape 3 — dédupliquer les chargements de données** (family links, date de naissance) entre `Carriere.tsx` et `usePensionConsolidee` — écarter ce chantier avant les étapes 1-2 déstabiliserait deux choses à la fois (source de données ET pipeline de calcul) dans le même commit, ce qui rendrait la non-régression plus difficile à vérifier.

**Points de vigilance transverses**
- Écrire des tests de non-régression *avant* l'étape 1 (aucun test n'existe aujourd'hui sur le module retraite, cf. [audit-retraite.md §4](docs/audit/audit-retraite.md)) : au minimum, un scénario réel (cas Titouan Weishaar, déjà utilisé ailleurs dans les audits du module) capturé avec l'ancien pipeline de Carrière, comparé au nouveau après l'étape 1 sans hypothèse active — objectif zéro écart.
- Le doublon `ageTauxPleinAffiche` (texte binaire) reste un problème indépendant, déjà documenté ([audit-retraite.md:204](docs/audit/audit-retraite.md)) — la fusion n'a pas vocation à le résoudre, seulement à ne pas l'aggraver.
- Ne pas fusionner dans l'autre sens (faire consommer par Synthèse le pipeline de Carrière) : aucun élément de cet audit ne justifie ce sens, `calculerPensionConsolidee` est la version la plus complète (§3).
