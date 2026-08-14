# Implémentation — écart #10 : MICO majoré (palier 2) et écrêtement

> Rapport de session. Référentiel applicable :
> [docs/retraite-base-referentiel.md](../retraite-base-referentiel.md) §3.5.4 (palier 2) et §3.5.5
> (écrêtement). Écarts #13-NBI non touché ; logique du palier 1
> (`minimumContributif()`, écart #9, déjà correcte et testée) non modifiée.

---

## Étape 1 — Diagnostic (avant tout code)

### a. Trimestres cotisés pour le seuil de 120

**Ce que `calculTrimestres.ts` fournit tel quel : exactement ce qu'il faut, avec des exclusions déjà
natives.** `trimestresCotisesEtAssimilesDepuisCarriere()` calcule `.cotises` uniquement à partir des
périodes `employeur` et `micro_entrepreneur` (revenu ÷ seuil de validation) — les périodes `chomage`
et `maladie` alimentent exclusivement `.assimiles`, une variable séparée, jamais `.cotises`. Le
référentiel exclut du décompte des 120 les périodes assimilées, les MDA et les rachats option 1 ;
`.cotises` les exclut déjà tous les trois **par construction**, sans code supplémentaire nécessaire :

- **Assimilés (chômage/maladie)** : exclus nativement (comptés séparément dans `.assimiles`).
- **MDA (majoration de durée d'assurance)** : aucune notion de MDA n'existe dans `PeriodeCarriere`
  (seulement 4 `typeActivite` : `employeur`, `chomage`, `maladie`, `micro_entrepreneur`) — ne peut donc
  pas être comptée à tort.
- **Rachat option 1 vs option 2** : confirmé par la session #11 ([implementation-sam-exclusions.md](implementation-sam-exclusions.md))
  qu'aucune donnée de rachat n'existe nulle part dans le schéma (`retraite_carriere_detail.type_activite`
  n'a pas de valeur « rachat »). `.cotises` est donc calculé **sans aucun rachat**, ni option 1 ni
  option 2 — le référentiel voudrait inclure l'option 2 uniquement, mais faute de distinction possible,
  aucune des deux n'est comptée. **Direction prudente** : ceci ne peut que **sous-compter** le seuil de
  120 et le montant de la majoration (jamais les accorder à tort) — un utilisateur ayant réellement
  racheté des trimestres en option 2 verrait son trim_cotisés sous-évalué, potentiellement sous le
  seuil de 120 à tort. Approximation assumée, pas un blocage.
- **AVPF/AVA (plafond de 24 trimestres)** : aucune donnée AVPF/AVA n'existe non plus dans le schéma —
  ces trimestres contribuent 0 à `.cotises` (une période AVPF/AVA n'a typiquement pas de revenu
  exploitable comme cotisation au sens de `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`). Le plafond de 24 est
  donc **sans objet** ici : rien à plafonner puisque rien n'est compté. Même direction prudente
  (sous-compte, jamais sur-compte).

**Découverte non anticipée par la mission, traitée comme un caveat documenté et non comme un blocage :**
`.cotises` est calculé exclusivement à partir de `detailCarriere` (le « Détail de carrière » saisi à
l'écran), qui est une donnée DISTINCTE de `trimestresValides` (le nombre de trimestres validé depuis le
RIS, source de vérité de l'app pour le total). Le commentaire existant à
[Carriere.tsx](../../src/components/retraite/Carriere.tsx) qualifiait jusqu'ici `resultatTrimestresDetailCarriere`
de « jamais injecté dans aucun calcul de pension » — une affirmation déjà **fausse en pratique avant
cette session** : `.parAnnee.cotises` alimente déjà `trimestresCotisesAnneeReference`, utilisé par le
calcul de la surcote (écart #5). Le palier 2 du MICO ajoute un second usage du même type. Ce n'est donc
pas un nouveau précédent risqué, mais la continuation d'un usage déjà établi et déjà testé — le
commentaire obsolète a été corrigé en conséquence dans cette session (pas d'élargissement de périmètre,
simple mise à jour de la documentation pour refléter l'état réel du code).

Le risque concret de cette dépendance : si le « Détail de carrière » est incomplet ou vide (l'indicateur
de cohérence RIS ↔ carrière existant sert justement à détecter cet écart), `.cotises` sera sous-évalué
par rapport à la réalité — encore une fois dans le sens prudent (refuse ou sous-évalue le palier 2
plutôt que de l'accorder à tort). Ce n'est donc **pas un blocage** au sens de la consigne de la mission
(« s'arrêter et documenter » ne s'applique pas ici), mais un caveat à signaler clairement — ce qui est
fait ci-dessus et dans le code.

### b. Écrêtement — donnée « autres pensions perçues »

**Absente, confirmée par recherche exhaustive** (`autresPensions`, `autre_pension`, `pension.*etranger`)
dans `src/components/retraite/` et `src/lib/retraite/` : aucune occurrence avant cette session. Le
diagnostic de l'écart #9 ([implementation-mico-polypensionne.md](implementation-mico-polypensionne.md))
avait déjà noté cette limite pour le total tous régimes (trimestres) ; elle est également absente ici
côté montants de pension.

**Choix retenu, conforme à la mission** : champ déclaratif simple (montant mensuel, optionnel, défaut
0 = comportement inchangé), local à `Carriere.tsx`, non persisté — sur le modèle exact du champ « année
d'ouverture des droits » ajouté pour l'écart #12 (session précédente). Pas de nouvelle collecte
automatique, pas de table dédiée.

### c. Signature de `minimumContributif()` et point d'extension pour le palier 2

Signature actuelle, post-#9, inchangée dans cette session :

```ts
minimumContributif(trimestresValides: number, trimestresRequis: number, decote: number, trimestresTousRegimes?: number): number
```

Elle retourne un **plancher** (comparé côté appelant via `Math.max(P0, minimumContributif(...))`), pas
un delta. Le palier 2 du référentiel est structurellement différent : une **majoration additive**
(`(MICO_majoré − MICO_base) × prorata[s]`), avec une entrée supplémentaire (trimestres cotisés) sans
rapport avec la logique du palier 1.

**Choix retenu : fonction séparée (`majorationPalier2MICO()`), pas un nouveau paramètre de
`minimumContributif()`.** Arguments :

1. **Sémantique de retour incompatible** — ajouter le palier 2 en paramètre de `minimumContributif()`
   forcerait soit à changer son type de retour (plancher → plancher-ou-delta selon un flag, fragile),
   soit à faire calculer un plancher DÉJÀ majoré en interne (perdant la ligne de détail palier 1 déjà
   affichée à l'écran, cf. `docs/audit/branchement-majorations-pension-finale.md` §1.d).
2. **Risque zéro sur une fonction déjà testée** — la mission demande explicitement de ne pas modifier
   la logique du palier 1. Une fonction séparée garantit qu'aucune ligne de `minimumContributif()`
   n'est touchée ; les 8 tests existants de `describe('minimumContributif — bascule de dénominateur...')`
   restent valables tels quels, sans même être ré-exécutés pour vérification de non-régression (ils ne
   peuvent structurellement pas être affectés).
3. **Composition au niveau de l'appelant** — `Carriere.tsx` calcule déjà `micoMontant` puis le combine
   via `Math.max()` ; ajouter `majorationPalier1 = Math.max(0, micoMontant − P0)` puis
   `majorationPalier2MICO(...)` et les sommer est une composition explicite, pas une modification de
   `minimumContributif()`. Démonstration d'équivalence (aucune régression pour un profil sans palier 2
   ni écrêtement) : `P0 + majorationPalier1 = P0 + max(0, micoMontant − P0) = max(P0, micoMontant)` —
   exactement l'ancien comportement.

**Conclusion de l'étape 1 : pas de blocage.** Les trois points diagnostiqués (a, b, c) donnent chacun
soit une donnée directement exploitable (calculTrimestres.ts pour le seuil de 120), soit un manque
comblable par un simple champ déclaratif (autres pensions), soit un point d'extension clair sans risque
sur le code existant (fonction séparée). Un seul point mérite un signalement appuyé — la portée exacte
de `.cotises` pour le polypensionné Cas 2, détaillée ci-dessous à propos de l'exemple 6 — mais il
n'empêche pas d'implémenter une version correcte et defendable du palier 2 ; il limite seulement la
reproduction *littérale* d'un des trois exemples du référentiel. Passage à l'étape 2.

---

## Étape 2 — Implémentation

### d. Palier 2, mono-régime et polypensionné

Nouvelle fonction pure `majorationPalier2MICO()` ([calcul.ts](../../src/lib/retraite/calcul.ts)),
réutilisant `trimValidesRegimeGeneral` (= trim_RG_alignés) et `trimestresTousRegimes` déjà disponibles
depuis #9, plus `trimestresCotisesRegimeGeneral` (nouveau, `.cotises` de `calculTrimestres.ts`, cf. a
ci-dessus).

Logique :
- Éligibilité : `decote < 0` → 0 (même condition de taux plein que le palier 1) ; sous 120 trimestres
  cotisés → 0.
- Dénominateur D : même règle de bascule que le palier 1 (`trimestresTousRegimes` si fourni et
  strictement supérieur à `trimestresRequis`, sinon `trimestresRequis`) — dupliquée en 3 lignes plutôt
  que factorisée avec `minimumContributif()`, pour ne courir aucun risque sur cette dernière (cf. c
  ci-dessus).
- Mono-régime (ou régime général seul égal au total tous régimes) : un seul prorata,
  `trim_cotisés / D`.
- Polypensionné avec régime non aligné (`trimValidesRegimeGeneral < trimestresTousRegimes`) : second
  prorata multiplicatif, `trim_RG_alignés / trim_tous_régimes`.

**Écart de reproduction littérale, exemple 6 du référentiel — documenté, pas corrigé.** Les exemples 4
et 5 sont reproduits exactement (aux euros 2026 vs 2025 près, cf. note ci-dessous) : `130 €` et `123 €`
retombent sur la même structure de calcul avec `trim_cotisés` scopé au régime général/aligné. L'exemple
6 (polypensionné, Cas 2, dénominateur bascule à 171) affiche littéralement
`(893,65 − 747,69) × 160/171 = 137 €` — une fraction UNIQUE. Reproduire cette valeur exacte exigerait
que `trim_cotisés` (utilisé à la fois dans la bascule de dénominateur ET dans la formule à deux
facteurs) vaille 171 (= le dénominateur lui-même, annulant le premier facteur à 1) — c'est-à-dire un
total de trimestres cotisés **tous régimes confondus**, pas seulement régime général/aligné. Preuve par
élimination : aucune combinaison des seules données régime général (150, 160, 169, 171 selon les
variables) ne reproduit 137 € à moins de considérer `trim_cotisés = 171` explicitement — et rien
d'inférieur à ce total ne s'en approche à moins d'un euro (la formule à deux facteurs avec
`trim_cotisés_RG = 160` donne 127,79 € → 128 €, un écart de 9 € par rapport aux 137 € affichés, hors de
la marge d'arrondi observée sur les exemples 4 et 5, où l'écart entre valeur exacte et valeur affichée
ne dépasse jamais 0,5 €).

Or **cette donnée n'est pas calculable dans cet outil** pour un polypensionné avec fonction publique ou
CNAVPL : ni `CarriereFonctionPublique.tsx` ni `CarriereCNAVPL.tsx` ne distinguent trimestres cotisés
d'assimilés (recherche confirmée : aucune occurrence de `cotis`/`assimil` dans
`calculCNAVPL.ts`/`CarriereCNAVPL.tsx`) — seul `trimestresLiquidables`/`trimestresCNAVPL`, un total
brut, existe pour ces régimes. Implémenter `trim_cotisés` scopé au régime général/aligné uniquement
(seule donnée réellement disponible) est donc le choix **defendable et prudent** retenu : il sous-évalue
la majoration dans ce cas de figure précis (Cas 2 + polypensionné + régime non aligné), jamais ne la
sur-évalue — cohérent avec la direction prudente déjà retenue pour le point (a). Le test de l'exemple 6
(cf. ci-dessous) vérifie donc la structure réellement implémentée (dénominateur 171, double
proratisation), pas la valeur littérale de 137 €.

**Convention de reproduction des exemples 4/5/6, note commune** : le référentiel les exprime avec le
barème 2025 (747,69 €/893,65 €, supplément 145,96 €), alors que `MINIMUM_CONTRIBUTIF_MAJORE_2026` et
`MINIMUM_CONTRIBUTIF_NON_MAJORE_2026` sont les constantes 2026 de l'app. Même convention que la
reproduction de l'exemple §3.5.3 pour l'écart #9 (`calcul.test.ts`, describe « bascule de dénominateur,
palier 1 ») : les tests reproduisent la STRUCTURE de chaque exemple (mêmes trimestres, même bascule,
même double proratisation) avec un montant « attendu » recalculé à partir du supplément 2026 réel — pas
une copie des euros 2025 du référentiel.

### e. Écrêtement

Nouvelle fonction pure `ecretementMICO()` ([calcul.ts](../../src/lib/retraite/calcul.ts)), branchée
après le palier 2 : réduit — sans jamais supprimer — la majoration MICO totale (palier 1 + palier 2)
quand `P0 + majoration + autres_pensions` dépasse le plafond global annuel
(`PLAFOND_GLOBAL_PENSIONS_2026 = 16 930,68 €`, 1 410,89 €/mois × 12).

Reproduit la structure de l'exemple référentiel §3.5.5 (reprise de l'exemple 4 avec 600 €/mois d'autres
pensions, plafond 2025 pour coller exactement à l'exemple : réduction de 82,83 €, majoration ramenée de
327,69 € à 244,86 €) — celui-ci ne dépend PAS de l'ambiguïté de portée de `trim_cotisés` (c'est un test
sur la fonction d'écrêtement isolée, avec une majoration d'entrée arbitraire), donc reproduit **à
l'identique**, contrairement à l'exemple 6 du palier 2.

⚠️ Le référentiel précise que le plafond retenu est celui en vigueur à la date d'ouverture du droit au
MICO, pas celui de l'année de calcul courante — non implémenté ici (pas de notion de date d'effet du
MICO dans ce module), même simplification assumée que pour la date d'effet ailleurs dans l'app (écart
#2, dette déjà documentée dans `docs/audit/audit-retraite.md`).

**Vérification de non-régression (aucun effet en pratique pour un profil par défaut)** : avec
`autresPensionsAnnuelles = 0` (champ non renseigné, défaut), l'écrêtement ne peut structurellement pas
se déclencher à partir du calcul régime général seul — le plafond MICO majoré (10 847,16 €/an) reste
très en dessous du plafond global (16 930,68 €/an), et pour un P0 déjà supérieur à ce plafond, la
majoration MICO (palier 1 et 2) est déjà nulle, donc la réduction porte sur 0 et reste 0. L'écrêtement
ne peut donc affecter que les profils renseignant explicitement le nouveau champ « autres pensions ».

### f. Branchement écran

`Carriere.tsx` : palier 2 et écrêtement composés après le palier 1 existant, sans modifier
`minimumContributif()` ni son résultat `micoMontant` (toujours affiché tel quel, ligne « Minimum
contributif (MICO) »). Nouvelle ligne de détail « dont palier 1... palier 2... » affichée uniquement
quand `majorationPalier2 > 0` (ne charge pas l'écran pour la majorité des profils, sous le seuil de
120). Mention explicite en orange quand l'écrêtement réduit effectivement la majoration — même
convention visuelle que les autres avertissements de l'écran (ex. « régimes non inclus » pour
`regimesPointsExclusCount`).

Nouveau champ « Autres pensions perçues, mensuel (optionnel) », local (`useState`, non persisté), placé
dans la même carte que la pension de base/décote-surcote, avant le bloc de synthèse — sur le modèle
exact du champ « année d'ouverture des droits » ajouté pour l'écart #12.

---

## Tests

[calcul.test.ts](../../src/lib/retraite/calcul.test.ts), deux nouveaux `describe` (+ un troisième pour
les constantes) :

- **`majorationPalier2MICO`** : sous le seuil de 120 (non-régression) ; `decote < 0` (même porte
  d'éligibilité que le palier 1) ; exemple 4 (mono-régime, reproduction exacte de la structure) ;
  exemple 5 (polypensionné Cas 1, double proratisation, reproduction exacte de la structure) ; exemple 6
  (polypensionné Cas 2, bascule de dénominateur à 171 vérifiée, valeur volontairement divergente de la
  lecture littérale du référentiel — cf. section d ci-dessus pour la justification complète) ; mono-régime
  au sens large (`trimestresTousRegimes` fourni mais non supérieur) ; garde-fou de plafonnement à 100 %
  du dénominateur.
- **`ecretementMICO`** : sous le plafond (non-régression, majoration inchangée) ; reproduction exacte de
  l'exemple référentiel §3.5.5 ; réduction jamais négative (dépassement massif) ; plafond par défaut
  (`PLAFOND_GLOBAL_PENSIONS_2026`) utilisé si non fourni ; autres pensions à 0 par défaut.
- **Constantes** : `MINIMUM_CONTRIBUTIF_MAJORE_2026` (10 847,16 €), `PLAFOND_GLOBAL_PENSIONS_2026`
  (16 930,68 €), `TRIMESTRES_COTISES_SEUIL_PALIER_2` (120).

Suite complète : `npx vitest run` → 44 fichiers, 626 tests passants (611 avant cette session + 15
nouveaux), aucune régression, 6 `todo` inchangés. `npx tsc --noEmit` : aucune erreur.

## Mise à jour du tableau de synthèse (audit-retraite.md)

**#10** : « MICO majoré (palier 2) et écrêtement non implémentés » → **corrigé**, avec la limite
documentée ci-dessus (exemple 6, portée de `trim_cotisés` pour le polypensionné Cas 2 avec régime non
aligné — sous-évaluation prudente, jamais sur-évaluation).
