# Conception — surcote parentale et majoration pour 3 enfants ou plus

> Note de conception, diagnostic uniquement. Aucun code modifié dans cette session. Fait suite
> aux écarts #6 et #7 de l'audit référentiel ([audit-retraite.md §7](audit-retraite.md)) : absence
> totale de surcote parentale et de majoration pour 3 enfants ou plus, tous régimes. Référentiel :
> `docs/retraite-base-referentiel.md` §2.3.2, §2.6, §3.7, §3.8, §4.3.1, §5.4, §6.3, §7.4, §7.6,
> §8.1, §9.5, §12.

---

## 0. Vérification factuelle — la donnée enfant existe-t-elle déjà ? (correctif au §5, point 1)

> Mission de vérification demandée après relecture du §5.1 ci-dessous, qui affirmait : « aucune
> table, aucun type, aucun champ ne capture pour un client [...] leur type de filiation ». Recherche
> exhaustive relancée sur toute l'app (pas seulement Retraite). **Constat initial partiellement
> inexact** : une table existe et est plus riche que ce que le §5.1 laissait entendre — mais elle
> reste insuffisante pour les deux mécaniques visées. Correction ci-dessous, aucun code touché.

### 0.1. La table trouvée : `family_links`

Le module Famille (`src/pages/famille/`, `src/components/family/`, `src/services/familyService.ts`)
possède une table `family_links` (migration `20250805113707_...sql`, étendue par 5 migrations
ultérieures) qui capture précisément les enfants du client via `lien_familial = 'Enfant'`. Elle est
partagée par tout le reste de l'app : le module Transmission (réserve héréditaire, quotité
disponible, `src/lib/transmission/`) et le module IFI en dépendent déjà pour connaître le nombre et
le statut des enfants — ce n'est donc pas une donnée absente de l'app, contrairement à ce que le
§5.1 affirmait en toutes lettres. Le champ `MaritalStatus.nombre_enfants_charges` cité au §5.1 existe
bien en plus, mais **`family_links` est la source structurée que le §5.1 a manquée**, pas la seule
donnée disponible.

Champs actuels pertinents pour un enregistrement `lien_familial = 'Enfant'` (`src/integrations/supabase/types.ts`, table `family_links`) :

| Champ | Type | Rôle actuel |
|---|---|---|
| `date_naissance` | date, nullable | Date de naissance de l'enfant |
| `enfant_de` / `parent_de` | text (`'user'` \| `'spouse'` \| `'both_parents'`) | Filiation déclarée — vers l'utilisateur, le conjoint, ou les deux |
| `enfant_adopte` | text, enum `'Non'` \| `'Adoption simple'` \| `'Adoption plénière'` (`DynamicFamilyForm.tsx:23`) | Distingue explicitement adoption simple vs plénière |
| `adoption_simple_abattement_plein` + `adoption_simple_motif` | boolean + text | Dérogation DMTG succession (art. 786 CGI) — sans rapport avec la retraite, motifs orientés fiscalité (`enfant_du_conjoint` notamment, `DynamicFamilyForm.tsx:25`) |
| `enfant_a_charge` | boolean, nullable | Charge déclarée, sans date de début ni de fin |
| `fiscalement_a_charge` | boolean, nullable | Rattachement au foyer fiscal (IR), sans rapport avec la retraite |
| `personne_a_charge` | boolean | Champ générique, tous types de liens confondus |
| `handicap` | boolean, nullable | Utilisé pour DMTG/IFI, pertinent aussi pour la retraite (majoration enfant handicapé, hors périmètre #6/#7) |
| `enfant_mineur` | boolean, nullable | Dérivable de `date_naissance`, champ redondant |
| `enfant_renoncant` / `enfant_renoncant_de` | boolean + text | Renonciation à succession — sans rapport avec la retraite |
| `est_decede` / `date_deces` | boolean + date | Pertinent pour un enfant mort-né (§2.6, §3.8 : compté quand même) mais la sémantique actuelle (« est décédé ») ne distingue pas explicitement un enfant mort-né d'un enfant décédé après |

### 0.2. Comparaison avec ce que §2.6 (MDA) et §3.8 (majoration 3 enfants) exigent réellement

**Ce qui est déjà couvert :**
- La **filiation de base** (l'enfant existe, sa date de naissance, son rattachement à l'un ou
  l'autre parent ou aux deux) : couverte par `date_naissance` + `enfant_de`.
- La **distinction adoption simple / adoption plénière** que §3.8 utilise pour trancher entre les
  deux régimes de filiation (filiation simple suffisante vs 9 ans de charge requis) : couverte par
  l'enum `enfant_adopte`, à la granularité exacte requise par le texte.
- Un enfant né avant/après le 1er avril 2010 (§2.6, régime transitoire des MDA) : dérivable
  directement de `date_naissance`, aucun champ dédié nécessaire.

**Ce qui manque, pour chacune des deux mécaniques :**

*Majoration pour 3 enfants (§3.8)* — le cas « filiation » (biologique, reconnu, possession d'état,
adoption plénière) est couvert par les champs ci-dessus. Le cas « enfants recueillis sans filiation »
est **partiellement non représentable** :
- Il n'existe **aucun moyen de déclarer un enfant du conjoint/partenaire/concubin sans lien de
  filiation** : `lien_familial` ne propose que la valeur `'Enfant'` pour cette relation (pas de
  « Beau-enfant » ou équivalent) — `enfant_adopte = 'Non'` sur un lien `'Enfant'` signifie
  aujourd'hui « enfant biologique », pas « enfant recueilli sans filiation ». Le seul indice existant
  est le motif texte `enfant_du_conjoint` dans `adoption_simple_motif`, mais ce champ n'est rempli
  que si `adoption_simple_abattement_plein` est coché — un cas particulier de succession, pas une
  déclaration générale de la situation de l'enfant.
- Il n'existe **aucun champ de durée de charge/éducation** (les « 9 ans avant le 16e anniversaire »)
  ni de date de début de prise en charge : `enfant_a_charge` est un booléen instantané, sans
  historique.
- Il n'existe **aucune donnée sur la période de mariage** reliée à l'enfant pour actionner la
  présomption de charge « enfant du conjoint, mariage couvrant les 9 ans » — `marital_status`
  contient bien `date_mariage`, mais rien ne relie aujourd'hui cette date à un enregistrement
  `family_links` particulier pour vérifier la couverture des 9 ans.

*Surcote parentale / MDA (§2.6)* — la donnée manquante est plus structurelle : le référentiel décrit
un système d'**attribution de trimestres par enfant, réparti entre les deux parents**, avec option,
irrévocabilité, délai (6 mois après le 4e anniversaire), cas de désaccord, garde exclusive/alternée,
retrait d'autorité parentale. **Rien de tout cela n'existe :**
- `enfant_de` ne code que la filiation déclarative (qui sont les parents), pas la **répartition des
  trimestres MDA** entre eux (un champ de filiation n'est pas un champ d'attribution de droits).
- Aucun champ **garde exclusive / garde alternée**, ni durée de résidence commune en années.
- Aucun champ **autorité parentale** (retrait, déchéance, date).
- Aucun champ **option de répartition** (cerfa 15046), sa date, son caractère exprès ou implicite.

### 0.3. Conclusion de la vérification

**Donnée présente mais incomplète — pas absente comme l'affirmait le §5.1, et pas non plus
suffisante comme le laisserait entendre une lecture rapide de `family_links`.** Trois niveaux
distincts :

1. **Filiation de base et distinction adoption simple/plénière** : déjà suffisantes en l'état
   (`date_naissance`, `enfant_de`, `enfant_adopte`). Aucune extension nécessaire pour cette partie.
2. **Majoration 3 enfants, branche « recueilli sans filiation »** : extension nécessaire — au
   minimum un moyen de déclarer la relation « enfant du conjoint/partenaire/concubin sans filiation »
   indépendamment de la case succession, plus une donnée de durée de charge (9 ans avant 16 ans) ou
   à défaut une date de début de prise en charge permettant de la calculer.
3. **Surcote parentale (condition MDA)** : absente presque intégralement — c'est un sous-système à
   part entière (répartition, option, garde, autorité parentale), pas une extension de deux ou trois
   champs. Le §5.1 et le §6.3 du présent document restent donc valides sur ce point précis : leur
   erreur portait sur la table `family_links` elle-même (déclarée totalement absente à tort), pas
   sur la conclusion « MDA non modélisées », qui elle est confirmée par cette vérification.

**Correctif à apporter au §5.1** (non modifié ci-dessous pour préserver l'historique de la note) :
remplacer « aucune table, aucun type, aucun champ ne capture [...] » par « `family_links` capture la
filiation de base et la distinction adoption simple/plénière, mais ni la branche "recueilli sans
filiation" du §3.8, ni aucune donnée du système MDA du §2.6 ».

---

## 1. Cartographie régime par régime

### 1.1. Tableau de synthèse

| Régime | Surcote parentale | Majoration pour enfants | Cumul des deux surcotes | Minimum comparé avant majoration enfants |
|---|---|---|---|---|
| **Régime général (CNAV)** | 1,25 %/trimestre, plafond 5 % (§2.3.2) | 10 % flat, filiation ou 9 ans de charge (§3.8) | **Oui — s'additionnent** (§2.3.2 dernier §, §12.3) | MICO (§3.5) |
| **SSI** | Identique régime général (§4.3.1 : « toutes les règles des §3.4 à §3.9 s'appliquent ») | Identique régime général | Oui (héritage intégral) | MICO |
| **Agents contractuels (IRCANTEC/base CNAV)** | Identique régime général (§8.1 : « l'intégralité des règles du §3 s'applique ») | Identique régime général | Oui (héritage intégral) | MICO |
| **Artistes-auteurs** | Identique régime général (§9.5 : « suit les règles du régime général ») | Identique régime général | Oui (héritage intégral) | MICO |
| **CNAVPL** | 1,25 %/trimestre, plafond 5 %, « mêmes conditions qu'au régime général » (§5.4) | 10 %, « mêmes règles qu'au régime général » (§5.4) | **Non précisé explicitement** — cf. §2 ci-dessous | Aucun (§5.5 : « pas de MICO ») |
| **CNBF (avocats)** | 1,25 %/trimestre, plafond 5 %, « mêmes conditions que le régime général » (§6.3) | 10 %, à compter du 01/09/2023 (§6.3) | **Non précisé explicitement** — cf. §2 ci-dessous | Aucun mentionné |
| **Fonction publique (SRE/CNRACL)** | 5 %, « mêmes conditions que le régime général », étendue au congé parental (§7.4) | **10 % pour 3 enfants + 5 %/enfant supplémentaire**, condition générale 9 ans de charge avant 16 ans (§7.6) | **Non — l'assuré retient l'une OU l'autre** (§7.4, §12.3) | MIGA (§7.5) |

### 1.2. Conditions d'éligibilité détaillées

**Surcote parentale (référentiel §2.3.2)** — deux conditions cumulatives, décrites une seule fois
au régime général et reprises « mêmes conditions » par CNAVPL, CNBF, fonction publique :

1. Détenir **au moins 1 trimestre de MDA** (majoration de durée d'assurance, §2.6) au titre de la
   maternité, de l'adoption, de l'éducation, d'un enfant handicapé, ou d'un congé parental — « quel
   que soit le régime de base qui l'octroie » (donc un trimestre MDA acquis dans un régime différent
   du régime liquidé compte quand même).
2. Réunir la durée requise **dès l'année précédant l'âge légal**, condition qui ne s'applique que
   si l'âge légal de la génération est **égal ou supérieur à 63 ans**.

La condition 1 est elle-même conditionnée par la mécanique du §2.6 (MDA) — pas une simple case à
cocher « a des enfants ». Le référentiel y décrit une attribution par enfant qui peut se répartir
entre les deux parents (options, délais, irrévocabilité, cas de désaccord, garde alternée, enfants
nés avant/après le 1er avril 2010) : savoir si *ce* parent a bien reçu au moins 1 des 8 trimestres
possibles par enfant est un sous-problème à part entière, pas une déduction automatique du nombre
d'enfants.

**Majoration pour 3 enfants ou plus** — deux logiques de filiation distinctes au régime général
(§3.8), reprises telles quelles par SSI/CNAVPL/CNBF/agents contractuels/artistes-auteurs :

- **Enfants avec lien de filiation** (naissance, reconnaissance, possession d'état, adoption
  plénière) : **aucune condition de résidence ni d'éducation** — la seule filiation suffit.
- **Enfants recueillis sans filiation** (adoption simple, enfant du conjoint/partenaire/concubin) :
  condition cumulative d'éducation et de charge pendant **au moins 9 ans avant le 16e anniversaire**
  (présomption pour l'enfant du conjoint si le mariage couvre la période, preuve par tous moyens
  sinon).

La fonction publique (§7.6) ne reprend **pas** cette distinction à deux vitesses : elle énonce une
condition unique de « 9 ans de charge avant le 16e anniversaire » pour **tous** les enfants
concernés (légitimes, naturels, adoptifs, sous tutelle, recueillis) — sans réserver l'allègement
« filiation simple, sans condition » aux enfants biologiques/adoptés comme le fait le régime
général. **Incertitude à signaler** (cf. §6) : le référentiel ne précise pas si cette formulation
plus stricte est une vraie divergence de droit (la fonction publique exigeant réellement 9 ans de
charge même pour un enfant biologique) ou une simplification rédactionnelle du référentiel qui
aurait fusionné les deux cas — à vérifier avant toute implémentation, pas à trancher ici.

---

## 2. Divergences entre régimes — cumul des deux surcotes

### La divergence explicite : régime général (cumul) vs fonction publique (exclusif)

- **Régime général et tous les régimes qui en héritent** (SSI, agents contractuels,
  artistes-auteurs) : « les trimestres de surcote parentale et de surcote classique s'additionnent
  dans un calcul global de majoration » (§2.3.2, confirmé §12.3 : « Régime général : surcote
  classique et surcote parentale s'additionnent »).
- **Fonction publique** : « elle ne se cumule pas avec la surcote de droit commun... il faut ici
  retenir l'une ou l'autre » (§7.4, confirmé §12.3 : « Fonction publique : elles ne se cumulent
  pas »). Le référentiel ne précise pas explicitement la règle de choix (la plus favorable des
  deux, supposément — cohérent avec la logique générale du droit de la sécurité sociale, mais pas
  une phrase citée telle quelle dans le référentiel pour ce point précis).

### Autres divergences recherchées, régime par régime

- **CNAVPL et CNBF** : le référentiel décrit la surcote parentale et la majoration pour 3 enfants
  comme deux mécanismes séparés (chacun avec son propre paragraphe), mais **ne dit jamais
  explicitement si les deux surcotes (classique et parentale) s'additionnent ou s'excluent** pour
  ces deux régimes — ni dans un sens ni dans l'autre. La formule « mêmes conditions qu'au régime
  général » porte sur les *conditions d'éligibilité* de la surcote parentale (âge, MDA), pas
  nécessairement sur sa règle de cumul avec la surcote classique. **Ne pas présumer par analogie**
  que CNAVPL/CNBF suivent le régime général sur ce point précis — c'est plausible, mais non
  confirmé par une phrase du référentiel, à la différence de la divergence FP qui, elle, est
  explicite. Signalé comme incertitude au §6, pas tranché.
- **Ordre d'application** (traité en détail au §3) : ce n'est pas une divergence de cumul, mais la
  présence ou l'absence d'une étape « minimum » (MICO/MIGA) selon le régime — présenté séparément
  car souvent confondu avec une règle de cumul alors que c'est une question distincte (voir §3).
- **Aucune autre divergence de ce type** (cumul vs exclusion) n'a été trouvée dans les sections
  régime par régime du référentiel au-delà de ces deux points.

**Conséquence pour le modèle** : un modèle commun à tous les régimes ne peut pas coder en dur une
règle de cumul unique. Il faut au minimum un paramètre « cumulable » par régime, avec deux valeurs
confirmées (régime général et apparentés : `true` ; fonction publique : `false`) et deux valeurs
non confirmées (CNAVPL, CNBF) à traiter comme une hypothèse explicite plutôt qu'une certitude
silencieuse — cf. §6.

---

## 3. Ordre d'application — confirmé identique en structure, pas en étapes disponibles

### Régime général (référentiel §3.7, cité intégralement)

```
1. P0 = SAM × taux × (durée d'assurance / durée de référence)
2. surcote  = P0 × 1,25 % × (trim_surcote_classique + trim_surcote_parentale)   [AVANT MICO]
3. MICO     = majoration_palier_1 + majoration_palier_2, puis écrêtement       [comparé à P0, hors surcote]
4. P1 = P0 + surcote + MICO
5. majoration enfants = P1 × 10 % (si 3 enfants ou plus)                       [APRÈS MICO et surcote]
6. majoration tierce personne
7. Pension finale
```

### Fonction publique (référentiel §7.2, cité intégralement)

```
Pension = TIB × taux de liquidation
puis décote OU surcote, puis minimum garanti (MIGA), puis majorations, puis plafond
```

### CNAVPL (référentiel §5.4, cité intégralement)

> « Ordre d'application : points × valeur, puis surcote, puis majoration de 10 %. »

### Analyse — la mission posait la question à raison, mais la réponse est : même ordre, pas un ordre différent

En alignant les trois formulations dans le même sens (base → surcote(s) → étage minimum si
applicable → majoration enfants), **la séquence est identique dans les trois cas** :

| Étape | Régime général | Fonction publique | CNAVPL |
|---|---|---|---|
| 1. Pension de base | P0 | TIB × taux liquidation | points × valeur |
| 2. Surcote(s) | classique + parentale, additionnées | classique OU parentale (§2) | classique (+ parentale ? cf. §2) |
| 3. Minimum | MICO | MIGA | **absent** (§5.5 : pas de MICO) |
| 4. Majoration enfants | 10 % sur P1 | 10 %/+5 % sur pension portée au MIGA | 10 % |

**Ce que le référentiel appelle un ordre « légèrement différent » pour CNAVPL n'est pas une
réorganisation des étapes — c'est l'absence de l'étape 3 (aucun MICO à ce régime, confirmé §5.5),
pas une inversion.** La formulation de la mission qui anticipait une divergence d'ordre est donc
en partie infirmée par la lecture précise du référentiel : ce qui varie réellement, régime par
régime, c'est *la liste des étages disponibles* (MICO pour régime général/SSI/contractuels/
artistes-auteurs, MIGA pour la fonction publique, aucun pour CNAVPL — et le référentiel ne
mentionne aucun minimum pour CNBF non plus, §6.3), pas *l'ordre relatif* entre pension de base,
surcote(s) et majoration enfants, qui reste base → surcote(s) → [minimum si applicable] →
majoration enfants sur tous les régimes documentés.

---

## 4. L'effet de bord LFSS 2026 (générations 1964 et 1965-T1) — géré nativement, sans règle ad hoc

Le référentiel (§2.3.2, §12.3) signale que sous le barème LFSS 2026, les générations 1964 et
1965-T1 ont un âge légal de **62 ans 9 mois** — sous le seuil de 63 ans qui conditionne l'éligibilité
à la surcote parentale (condition 2, §2.3.2) — alors que sous le calendrier 2023, ces mêmes
générations avaient un âge légal de 63 ans (1964) ou 63 ans 3 mois (1965), et étaient donc
éligibles.

**Vérification faite sur l'infrastructure Session A/écart #5** : ce cas ne nécessite aucune règle
spéciale. La condition « âge légal ≥ 63 ans » se lit directement sur le champ `ans` de la valeur
déjà renvoyée par `ageLegalPourGeneration(dateNaissance, dateEffet)` :

```
resultat = ageLegalPourGeneration(dateNaissance, dateEffet)
si resultat.stable === false → indéterminé, ne rien affirmer (même logique que ageLegalAtteint())
sinon → eligibleConditionAge2 = resultat.age.ans >= 63
```

`ageLegalPourGeneration()` bascule déjà correctement entre `calendrier_2023` (63 ans / 63 ans 3
mois → éligible) et `lfss_2026` (62 ans 9 mois → non éligible) selon `dateEffet`, via
`jeuBaremeApplicable()` — c'est exactement le mécanisme construit en Session A pour résoudre les
écarts #2/#3, et déjà réutilisé tel quel pour l'écart #5 (`ageLegalAtteint()`, créée cette même
session). Aucun nouveau calcul de barème, aucune donnée supplémentaire : l'effet de bord se
résout par construction dès lors que la comparaison se fait sur `resultat.age.ans`, pas sur une
valeur d'âge légal codée en dur quelque part. **Confirmé, pas seulement supposé.**

Point de vigilance qui *reste* à traiter le jour de l'implémentation (pas résolu par
l'infrastructure existante) : la condition 2 exige aussi que la durée requise soit « réunie dès
l'année précédant l'âge légal » — une condition chronologique (savoir si la durée était acquise à
une date précise, une année avant l'anniversaire légal), qui retombe dans le même trou que la
dette déjà documentée pour l'écart #5 (chronologie infra-annuelle non résolue par
`calculTrimestres.ts`, cf. [implementation-surcote.md §4](implementation-surcote.md)). Signalé au
§6, pas ad hoc.

---

## 5. Où brancher ces deux mécaniques — proposition sans code

### Constat préalable : deux problèmes de nature différente, à ne pas traiter comme un seul chantier

1. **Un problème de données, absent de tout l'app aujourd'hui.** Recherche exhaustive : aucune
   table, aucun type, aucun champ ne capture pour un client « nombre d'enfants ouvrant droit à
   majoration », leur type de filiation, ni les trimestres MDA attribués. Le seul champ approchant
   est `MaritalStatus.nombre_enfants_charges` (`familyService.ts`) — un simple compteur à visée
   fiscale (parts fiscales), sans date de naissance, sans distinction filiation/adoption/garde,
   donc **insuffisant en l'état** pour les deux conditions de filiation du §3.8 (filiation simple
   vs 9 ans de charge) et totalement muet sur les trimestres MDA du §2.6. Le module Transmission a
   un type `enfants` plus riche (`FamilySituationSummary`) mais orienté succession (nom, vivant,
   branche) — pas de date de naissance ni de filiation/adoption, pas réutilisable tel quel non
   plus. **Ce point précède toute question de « où mettre la fonction de calcul »** : sans données
   de base, aucune fonction, aussi bien conçue soit-elle, ne peut produire un résultat.
2. **Un problème de calcul**, une fois les données disponibles — celui pour lequel la mission
   demande une proposition d'architecture.

### Proposition pour le problème de calcul (une fois les données disponibles)

**Fonctions dédiées séparées, sur le modèle de `surcotePourTrimestresCotises()`, pas une extension
d'une fonction existante ni une fonction unique multi-régimes.** Trois raisons, toutes déjà mises
en évidence par la cartographie du §1-§2 :

- Le **taux** diffère (5 % plafonné vs 10 %/+5 % dégressif pour la fonction publique) — une
  extension de `decoteSurTrimestres()` ou de `surcotePourTrimestresCotises()` obligerait à faire
  porter un paramètre de taux variable à une fonction dont le rôle actuel (surcote classique) reste
  volontairement simple et à taux fixe.
- La **règle de cumul** diffère par régime (§2) — une fonction unique devrait recevoir un
  paramètre « cumulable » en plus du reste, ce qui mélange deux préoccupations distinctes
  (calcul du montant vs règle d'assemblage) dans une seule signature.
- Le **plafond de la majoration enfants** varie lui aussi structurellement (10 % fixe au régime
  général, dégressif +5 %/enfant à la fonction publique, plafonné au dernier traitement) — pas une
  simple constante à passer en paramètre.

Concrètement, sur le modèle déjà posé cette session pour l'écart #5 :

- `surcoteParentale(trimestresMDAEligibles: number, ageLegalAtteintFlag, dureeRequiseAtteinte): number`
  — porte d'éligibilité explicite identique à `surcotePourTrimestresCotises()` (même structure de
  signature), plafonnée à 5 % contrairement à sa sœur classique (différence de contrat à documenter
  dans la fonction, pas une simple constante partagée).
- `majorationTroisEnfants(nombreEnfantsEligibles: number): number` (régime général et régimes
  héritant, 10 % flat, seuil à 3) — fonction pure triviale une fois `nombreEnfantsEligibles`
  disponible (lui-même dépendant du problème de données du point 1).
- `majorationEnfantsFonctionPublique(nombreEnfantsEligibles: number): number` (10 % + 5 %/enfant
  au-delà de 3) — **fonction séparée**, pas un paramètre optionnel de la précédente, car le taux
  n'est pas juste « différent » mais dégressif par palier, et le plafonnement au dernier traitement
  ne s'applique qu'ici.
- Une fonction de cumul explicite `surcoteTotale(surcoteClassique, surcoteParentale, cumulable: boolean): number`
  — matérialise la divergence du §2 comme un paramètre nommé plutôt qu'un `if` caché dans un
  composant, cohérent avec la façon dont `decoteApplicable()` matérialise déjà la règle « plus
  petit des deux comptages » comme une fonction dédiée plutôt qu'un calcul en ligne.

Ces fonctions resteraient, comme `surcotePourTrimestresCotises()` cette session, **sans appelant
depuis un composant** tant que le problème de données (point 1) n'est pas résolu — un choix
d'architecture délibéré déjà pratiqué en Session A (`ageLegalPourGeneration()`) et cette session
(`surcotePourTrimestresCotises()`) : créer et tester l'unité de calcul avant qu'elle ait un
consommateur réel, plutôt que fabriquer un branchement prématuré sur des données inexistantes.

---

## 6. Points restés incertains — signalés, pas tranchés

1. **Cumul surcote classique/parentale pour CNAVPL et CNBF** : non confirmé par une phrase
   explicite du référentiel (§2 ci-dessus) — ne pas présumer l'alignement sur le régime général par
   défaut sans le signaler comme hypothèse.
2. **Condition de filiation à la fonction publique** : le référentiel énonce une condition unique
   de 9 ans de charge pour tous les enfants (§7.6), sans reprendre la distinction filiation
   simple/9 ans du régime général (§3.8) — divergence de droit réelle ou simplification
   rédactionnelle du référentiel, à vérifier avant toute implémentation.
3. **Trimestres MDA (§2.6)** : système d'attribution par enfant à part entière (options,
   irrévocabilité, désaccords, garde alternée, enfants nés avant/après le 1er avril 2010) — la
   condition 1 de la surcote parentale en dépend entièrement, et rien dans ce dépôt ne la modélise
   aujourd'hui. Hors périmètre du calcul de surcote lui-même : c'est un sous-système à concevoir
   séparément, pas un paramètre simple.
4. **Chronologie « durée requise réunie dès l'année précédant l'âge légal »** (condition 2 de la
   surcote parentale) : même blocage que la dette déjà documentée pour l'écart #5
   ([implementation-surcote.md](implementation-surcote.md)) — non résolu ici, pas un oubli.
5. **Règle de choix fonction publique** (surcote classique OU parentale) : le référentiel affirme
   le non-cumul mais ne formule pas explicitement « la plus favorable des deux » pour ce point
   précis — supposition raisonnable par cohérence avec le reste du droit de la sécurité sociale,
   mais pas une citation directe du référentiel à ce sujet.
6. **Absence de données structurées sur les enfants du client** (§5, point 1) : bloquant pour toute
   implémentation, quelle que soit la qualité de l'architecture de calcul proposée — un choix de
   modèle de données (champ déclaratif simple vs entité enfant structurée façon module Transmission)
   est une décision produit qui dépasse le périmètre de cette note de conception.

---

## 7. Piste alternative — lire les trimestres MDA déjà tranchés sur le RIS plutôt que modéliser un sous-système de répartition

> Vérification factuelle uniquement, aucun code touché ni commit dans cette session. Objectif :
> déterminer si le pipeline de lecture RIS existant (`src/lib/retraite/parseRIS.ts`), déjà utilisé
> pour `trimestres_valides` (indicateur de cohérence de `Carriere.tsx`), capture — ou pourrait
> capturer — le nombre de trimestres de majoration pour enfant déjà tranché par la CNAV, ce qui
> court-circuiterait le besoin de modéliser tout le sous-système de répartition MDA décrit au §6.3
> (options, garde, autorité parentale, irrévocabilité).

### 7.1. Ce que le parseur RIS lit aujourd'hui

Lecture intégrale de `parseRIS.ts` (442 lignes). Le pipeline ne traite que **deux zones** d'un RIS :

1. **Page 2 uniquement** (« Mes régimes ») — `parseRIS()` appelle explicitement
   `pdf.getPage(2)` (ligne 428), sans boucler sur les pages suivantes pour cette section. Pour
   chaque régime détecté sur cette page, `parseRegimesDepuisTexte()` capture exactement deux
   étiquettes : `"Total des trimestres"` (`RE_LIGNE_TRIMESTRES`) et `"Total des points"`
   (`RE_LIGNE_POINTS`), plus la `"Valeur du point au [date] : [montant] €"` associée. **Un seul
   nombre agrégé par régime** — aucune ventilation par nature de trimestre (cotisé / assimilé /
   majoré) n'est lue à cet endroit, et aucune regex du fichier ne cherche un libellé du type
   « majoration », « enfant » ou « MDA » : une recherche texte sur ces trois termes dans tout
   `parseRIS.ts` ne retourne aucun résultat.
2. **Toutes les pages, section « Détail de votre carrière »** — `extraireDetailCarriere()` (page-
   agnostique, localisée par titre) capture des lignes structurées en
   `(date début, date fin, revenu, régime(s))` par employeur/activité (`RE_LIGNE_DONNEES_CARRIERE`).
   Là non plus, aucune colonne « nature du trimestre » : le champ `regimes: string[]` contient des
   noms de régimes (ex. « Salarié, Indépendant »), pas une catégorie de trimestre.

**Conclusion du point 1 de la mission : non, le parseur ne capture pas cette ligne aujourd'hui, ni
explicitement ni implicitement — aucune structure de données existante (page 2 ou détail carrière)
ne pourrait exposer un nombre de trimestres MDA même sans le brancher, puisque rien de tel n'est lu.**
`calculTrimestres.ts` (le module qui dérive cotisés/assimilés depuis le détail carrière, cf.
[implementation-surcote.md](implementation-surcote.md)) confirme la même absence : sa ventilation
cotisé/assimilé provient du `typeActivite` de chaque période (employeur/chômage/maladie/micro-
entrepreneur), pas d'une lecture de ligne « majoration », et ne modélise aucune notion de trimestre
enfant.

### 7.2. Vérification sur un spécimen réel — non réalisable dans ce dépôt

Aucun spécimen de RIS, anonymisé ou non, n'est présent dans le dépôt : ni fixture de test (le fichier
`parseRIS.ts` n'a d'ailleurs **aucun fichier de test associé**, `parseRIS.test.ts` n'existe pas), ni
PDF, ni extrait de texte figé en dur dans le code. C'est cohérent avec les règles RGPD du projet — un
RIS réel est un document nominatif contenant des données de carrière et de revenus, à ne jamais
committer — mais cela signifie concrètement que **le point 2 de la mission ne peut pas être vérifié
depuis ce dépôt**. Les commentaires du code laissent des traces d'un relevé réel ayant servi de
référence lors du développement (`parseRIS.ts`, commentaires des sections « Détail de carrière » et
`extraireDetailCarriere()` : « avant vérification sur un relevé réel », « l'exemple analysé »,
« à vérifier dès qu'un relevé [...] sera disponible ») — mais ce spécimen
n'a jamais été conservé dans le dépôt, et rien n'indique qu'il couvrait un profil avec enfants (donc
même ce relevé de référence, s'il était encore accessible au développeur, ne garantirait pas
d'avoir déjà vu la ligne recherchée).

**Recherche externe non menée pour ce point** : contrairement à la vérification de l'écart MIGA
(`implementation-miga.md` §2), cette mission demande explicitement une vérification interne au dépôt
(specimens disponibles dans le repo ou les fixtures de test), pas une recherche documentaire externe
sur le format RIS en général — aucune n'a donc été effectuée ici. Ce que la connaissance générale du
format suggère, sans confirmation empirique et à traiter comme une hypothèse non vérifiée seulement
utile pour orienter la suite : la page « Mes régimes » d'un RIS imprimable expose un total de
trimestres déjà agrégé (majorations MDA incluses dans ce total pour le régime général), sans le
ventiler par nature — la répartition fine (cotisé/assimilé/majoré, et a fortiori l'attribution par
enfant) relève plutôt du détail carrière consultable en ligne sur le compte CNAV, pas nécessairement
de l'export PDF RIS standard. Cette hypothèse est cohérente avec le fait que `parseRIS()` ne lit que
la page 2 pour les régimes (pas de boucle sur des pages 3/4/5 qui pourraient contenir une annexe plus
détaillée) — mais reste une supposition non vérifiée, pas un fait établi.

### 7.3. Conclusion

**Donnée absente du pipeline actuel, et son existence sur le document RIS lui-même reste à vérifier
empiriquement — retour à l'option B/C (§5-§6), pas de piste C (lecture RIS) validée à ce stade.**

Plus précisément, pour ne pas mélanger les deux causes possibles d'absence :

- **Ce n'est pas un simple manque de branchement.** Il ne s'agit pas d'une donnée déjà capturée par
  le parseur mais non exposée à l'UI ou aux calculs (contrairement, par exemple, à ce qu'on a trouvé
  pour `family_links` au §0 — une table présente mais sous-exploitée). Ici, rien dans la structure
  de données retournée par `parseRIS()` (`ParseRISResult`, `RegimeDetecte`, `PeriodeCarriere`) n'a
  de champ, même vide ou non renseigné, qui pourrait accueillir un nombre de trimestres MDA : il n'y
  a pas de ventilation par nature de trimestre du tout, à aucun niveau.
- **Ce n'est pas non plus confirmé absent du document source.** Sans spécimen à disposition (ni dans
  ce dépôt, ni via une recherche externe hors périmètre de cette mission), impossible de trancher
  entre « la ligne existe sur le RIS mais sur une page/section que le parseur ne lit pas
  aujourd'hui » (extension du parseur suffisante) et « la ligne n'existe pas sur le RIS lui-même,
  seulement sur le détail carrière en ligne CNAV, hors caractère PDF exportable » (piste RIS
  définitivement écartée, retour à un sous-système de répartition ou une saisie déclarative).

**Prochaine étape si cette piste doit être creusée davantage** (non entreprise ici, hors périmètre
« vérification uniquement ») : obtenir un RIS réel anonymisé (données d'identité et montants de
revenus neutralisés, structure et libellés conservés) d'un profil avec enfants, l'examiner page par
page — pas seulement la page 2 — à la recherche d'un libellé « majoration », « enfant » ou « MDA »,
avant de décider entre extension du parseur (piste C) ou retour au sous-système de répartition/
saisie déclarative (§5-§6). Tant que cette vérification empirique n'est pas faite, la piste RIS ne
doit pas être présumée plus simple que le sous-système de répartition — elle pourrait tout aussi
bien s'avérer non disponible sur le document source, auquel cas le sous-système de répartition (ou
une saisie déclarative simplifiée) resterait la seule option.
