# Successions — Référentiel complet

> **Source** : consolidation de 20 fiches Doc Expert (Fidroit / Fidnet) — état du droit **au 29 mars 2025**.
> **Usage** : document de travail interne, destiné à alimenter la spécification fonctionnelle du module Transmission.
> **Convention de lecture** : les références légales sont données entre parenthèses. Les blocs `⚙️ Modélisation` signalent les points structurants pour un moteur de calcul. Les blocs `⚠️` signalent les pièges classiques.

---

## Sommaire

| # | Chapitre |
|---|---|
| 1 | [Ouverture de la succession](#1-ouverture-de-la-succession) |
| 2 | [Qui hérite ? La dévolution légale](#2-qui-hérite--la-dévolution-légale) |
| 3 | [Qualités requises pour hériter](#3-qualités-requises-pour-hériter) |
| 4 | [Successions anomales et droits de retour](#4-successions-anomales-et-droits-de-retour) |
| 5 | [Les droits du conjoint survivant](#5-les-droits-du-conjoint-survivant) |
| 6 | [Réserve héréditaire et quotité disponible](#6-réserve-héréditaire-et-quotité-disponible) |
| 7 | [L'option successorale](#7-loption-successorale) |
| 8 | [Liquidation civile : la chaîne de calcul](#8-liquidation-civile--la-chaîne-de-calcul) |
| 9 | [Le rapport des libéralités](#9-le-rapport-des-libéralités) |
| 10 | [La réduction des libéralités excessives](#10-la-réduction-des-libéralités-excessives) |
| 11 | [L'action en retranchement](#11-laction-en-retranchement-enfants-non-communs) |
| 12 | [Testament et legs](#12-testament-et-legs) |
| 13 | [Le présent d'usage](#13-le-présent-dusage) |
| 14 | [La tontine](#14-la-tontine-clause-daccroissement) |
| 15 | [Démembrement et évaluation des droits](#15-démembrement-et-évaluation-des-droits-démembrés) |
| 16 | [Le quasi-usufruit](#16-le-quasi-usufruit) |
| 17 | [Indivision successorale](#17-lindivision-successorale) |
| 18 | [Le partage](#18-le-partage) |
| 19 | [Liquidation fiscale : la déclaration de succession](#19-liquidation-fiscale--la-déclaration-de-succession) |
| 20 | [Frais de notaire](#20-frais-de-notaire) |
| 21 | [Le recel successoral](#21-le-recel-successoral) |
| A | [Annexe 1 — Séquence de calcul complète](#annexe-1--séquence-de-calcul-complète) |
| B | [Annexe 2 — Tableau des délais](#annexe-2--tableau-des-délais) |
| C | [Annexe 3 — Points de vigilance pour la V1](#annexe-3--points-de-vigilance-pour-la-modélisation) |
| D | [Annexe 4 — Index des textes](#annexe-4--index-des-textes-cités) |

---

# 1. Ouverture de la succession

## 1.1. Les trois causes d'ouverture

| Cause | Mécanisme | Date d'ouverture retenue |
|---|---|---|
| **Décès** (mort certaine) | Constaté par certificat médical puis acte de décès (déclaration sous 24 h, C. civ. art. 78) | Date du décès |
| **Disparition** | Corps non retrouvé, circonstances de nature à mettre la vie en danger. Jugement déclaratif de décès (TJ du lieu de disparition) | Date **fixée par le jugement** |
| **Absence** | Personne dont on est sans nouvelles. Deux phases : présomption d'absence (jugement du juge des contentieux de la protection) puis déclaration d'absence | Date de **transcription du jugement déclaratif d'absence** |

**Absence — chronologie** : jugement de présomption d'absence → **10 ans** plus tard, déclaration d'absence possible. Sans jugement préalable de présomption : **20 ans** sans nouvelles. Tant que la personne n'est que *présumée absente*, elle **hérite** (C. civ. art. 725 et 112).

## 1.2. Lieu d'ouverture

« Les successions s'ouvrent par la mort, **au dernier domicile du défunt** » (C. civ. art. 720) — et non au lieu du décès.

Conséquences pratiques :
- juridiction compétente pour les actions (réduction, partage judiciaire, pétition d'hérédité) ;
- service de l'enregistrement compétent pour la déclaration de succession ;
- en droit international : la loi applicable est celle de la **résidence habituelle** du défunt au moment du décès (Règl. UE n° 650/2012, art. 21).

## 1.3. Pourquoi la date compte

C'est à la date d'ouverture que l'on apprécie :
- si un héritier réunit les qualités légales pour hériter (existence, absence d'indignité) ;
- la loi applicable en cas de réforme intermédiaire ;
- **la valeur des biens pour la réunion fictive** et le calcul de la réserve ;
- le point de départ des délais (option, réduction, déclaration fiscale).

⚠️ **Comourants** (C. civ. art. 725-1) : si deux personnes ayant vocation à se succéder périssent dans un même événement et que l'ordre des décès ne peut être établi, **chaque succession est liquidée sans que l'autre y soit appelée**. Les descendants du comourant peuvent toutefois le représenter là où la représentation est admise.

---

# 2. Qui hérite ? La dévolution légale

Méthode en trois temps : **① l'ordre → ② le degré → ③ les correctifs** (représentation, fente).

## 2.1. Les quatre ordres (C. civ. art. 734)

| Ordre | Composition |
|---|---|
| **1** | Descendants (enfants, petits-enfants, etc. — à l'infini) |
| **2** | Ascendants privilégiés (père, mère) **et** collatéraux privilégiés (frères, sœurs et leurs descendants) |
| **3** | Ascendants ordinaires (grands-parents, arrière-grands-parents…) |
| **4** | Collatéraux ordinaires (oncles, tantes, cousins…) — **limite : 6ᵉ degré** (art. 740 et 749) |

**Un héritier d'un ordre exclut tous ceux des ordres suivants** (sauf jeu de la fente et des successions anomales).

## 2.2. Le degré

Le degré ne joue **qu'à l'intérieur d'un ordre** (C. civ. art. 741 et 744). Le calcul se fait en remontant à l'auteur commun :

| Lien | Degrés |
|---|---|
| Père ↔ fils | 1 |
| Grand-père ↔ petit-fils | 2 |
| Frère ↔ sœur | 2 |
| Oncle ↔ neveu | 3 |
| Cousins germains | 4 |

⚠️ Le degré est **subsidiaire** par rapport à l'ordre : une petite-fille (2ᵉ degré, ordre 1) prime la mère du défunt (1ᵉʳ degré, ordre 2).

## 2.3. Dévolution **sans conjoint survivant**

### Ordre 1 — Descendants
Partage **par parts égales et par tête** (ou par souche en cas de représentation). Aucune distinction entre enfants légitimes, naturels, adultérins, légitimés ou adoptés (plénière). ⚠️ L'**adopté simple** n'est pas réservataire dans la succession des *ascendants* de l'adoptant.

### Ordre 2 — Ascendants et collatéraux privilégiés

| Configuration | Répartition |
|---|---|
| Père + mère, **pas** de frères/sœurs | 1/2 + 1/2 (art. 736) |
| Père + mère + frères/sœurs | Père 1/4, mère 1/4, F/S **1/2** (art. 738) |
| Un seul parent + frères/sœurs | Parent **1/4**, F/S **3/4** (art. 738) |
| Aucun parent, frères/sœurs seuls | Totalité aux F/S (art. 737) |
| Un seul parent, **ni** postérité **ni** F/S, mais ascendants dans l'autre branche | 1/2 au parent, 1/2 à l'autre branche (art. 738-1) — *fente* |

Les demi-frères et demi-sœurs ont **les mêmes droits** que les frères et sœurs germains.

### Ordres 3 et 4 — La fente successorale (C. civ. art. 746 à 750)

La succession se divise **par moitié entre branche paternelle et branche maternelle**, quel que soit le nombre de personnes dans chaque branche. Dans chaque branche, le plus proche en degré prime.

- S'applique en l'absence de descendants, de conjoint successible et de collatéraux privilégiés.
- À défaut d'ascendant dans une branche, l'autre branche recueille tout.
- La présence des père/mère dans une seule branche exclut les collatéraux ordinaires de l'autre branche.

### Succession vacante / en déshérence
- **Déshérence** : aucun héritier jusqu'au 6ᵉ degré, ni conjoint, ni légataire universel, ou renonciation de tous. L'État se fait envoyer en possession (C. civ. art. 811 à 811-3). Prend fin si un héritier accepte.
- **Vacante** : succession non réclamée. Le transfert au service du Domaine peut être demandé par tout créancier, tout administrateur de fait, toute personne intéressée, le ministère public **ou le notaire** (loi 18 nov. 2016). L'État encaisse les revenus et doit les restituer aux héritiers se manifestant ultérieurement.

## 2.4. La représentation successorale (C. civ. art. 751 à 755)

Fiction permettant à un héritier de venir à la succession **à la place de son auteur prédécédé, renonçant ou indigne**.

| Ordre | Représentation |
|---|---|
| Descendants | **Oui, à l'infini** |
| Collatéraux privilégiés (neveux/nièces) | Oui |
| Ascendants | Non |
| Collatéraux ordinaires | Non |

⚙️ **Modélisation — règle de calcul de la réserve en cas de représentation** : la réserve globale se calcule sur le **nombre de souches (= nombre d'enfants)**, jamais sur le nombre de représentants.
> Ex. : M. X avait 2 filles prédécédées. A laisse 1 enfant, B laisse 2 enfants. Réserve globale = **2/3** (2 enfants). L'enfant de A reçoit 1/3 ; les 2 enfants de B se partagent 1/3.

## 2.5. Dévolution **en présence d'un conjoint survivant**

| Le défunt laisse… | Conjoint survivant | Autres |
|---|---|---|
| Des descendants **tous communs** | **1/4 PP** **ou** **100 % en usufruit** (au choix) | Le reste (art. 757) |
| Au moins un descendant **non commun** | **1/4 PP** — pas d'option | Le reste (art. 757) |
| Pas de descendant, **père et mère** vivants | **1/2 PP** | 1/4 chaque parent (art. 757-1) |
| Pas de descendant, **un seul** parent | **3/4 PP** | 1/4 au parent survivant (art. 757-1) |
| Pas de descendant ni parent, mais frères/sœurs ou leurs descendants | **Totalité PP** | Rien — sauf **droit de retour légal** des F/S (art. 757-2 et 757-3) |
| Uniquement des ascendants ou collatéraux ordinaires | **Totalité PP** | Rien (art. 757-2) |

⚠️ **PACS et concubinage** : le partenaire pacsé et le concubin **ne sont jamais héritiers**. Ils ne reçoivent que par legs ou donation. Différence purement fiscale : le partenaire pacsé légataire est **exonéré** de droits de succession ; le concubin est taxé comme un tiers (abattement 1 594 €, taux 60 %).

---

# 3. Qualités requises pour hériter

Trois conditions cumulatives.

## 3.1. Avoir un lien de famille ou d'alliance

Seuls les parents par le sang (ou par adoption) et le conjoint survivant sont successibles. Vocabulaire :
- **Ligne directe** : personnes qui descendent les unes des autres.
- **Ligne collatérale** : personnes descendant d'un auteur commun.
- **Branche** : maternelle / paternelle (notion utile uniquement pour ascendants et collatéraux ordinaires).
- **Souche** : une personne et ses propres descendants — unité de division en cas de représentation.

## 3.2. Exister à l'ouverture de la succession (C. civ. art. 725)

- L'héritier doit être vivant au décès.
- **Enfant simplement conçu** : héritier s'il naît **vivant et viable**. Présomption légale de conception : entre le 300ᵉ et le 180ᵉ jour avant la naissance (C. civ. art. 311).
- **Personne présumée absente** : hérite (le jugement déclaratif n'ayant pas été rendu). Après déclaration d'absence, elle est exclue.

## 3.3. Ne pas être indigne (C. civ. art. 726 à 729)

### Indignité **de plein droit** (art. 726)
Condamnation à une **peine criminelle**, comme auteur ou complice, pour :
- avoir volontairement donné ou tenté de donner la mort au défunt ;
- avoir volontairement porté des coups / commis des violences ayant entraîné la mort sans intention de la donner.

### Indignité **facultative** (art. 727) — prononcée par le juge
- peine **correctionnelle** pour meurtre / tentative / violences ayant entraîné la mort ;
- peine criminelle ou correctionnelle pour tortures, actes de barbarie, violences volontaires, viol ou agression sexuelle envers le défunt ;
- témoignage mensonger contre le défunt dans une procédure criminelle ;
- abstention volontaire d'empêcher un crime ou délit contre l'intégrité corporelle du défunt ayant entraîné la mort ;
- dénonciation calomnieuse contre le défunt (peine criminelle encourue) ;
- cas d'indignité de plein droit lorsque les poursuites n'ont pas pu être menées à leur terme.

**Procédure** : demande d'un autre héritier (ou du ministère public à défaut d'héritier), dans les **6 mois du décès** si la condamnation est antérieure, ou dans les **6 mois de la décision** si elle est postérieure (art. 727-1).

### Effets
L'indigne devient étranger à la succession **rétroactivement au jour du décès** : restitution des biens appréhendés **et des revenus perçus**, ou indemnité si les biens sont perdus (même fortuitement). Les actes passés avec des tiers de bonne foi sont anéantis, sauf exceptions.

### Limites
- **Représentation de l'indigne** (art. 729-1) : ses enfants peuvent le représenter. En contrepartie, le parent indigne perd le droit de jouissance légale sur ces biens. Au décès de l'indigne, le représentant doit **rapporter** les biens reçus à cette succession (pour égaliser avec les enfants nés après la 1ʳᵉ succession).
- **Pardon du défunt** (art. 728) : déclaration expresse de volonté postérieure aux faits, ou libéralité universelle / à titre universel consentie en connaissance de cause.
- L'indignité **n'exclut que de la succession *ab intestat*** : l'indigne peut conserver un legs ou une donation (seule l'action en révocation pour ingratitude peut les remettre en cause).

## 3.4. Cas particulier — Le conjoint indigne et les avantages matrimoniaux

**Réforme majeure** (loi n° 2024-494 du 31 mai 2024, en vigueur au **2 juin 2024**) :
- **Avant** : le conjoint déclaré indigne perdait ses droits successoraux **mais conservait les avantages matrimoniaux** (apport à communauté, préciput, attribution intégrale…).
- **Depuis** : l'indignité prive également le conjoint de l'application des avantages matrimoniaux qui lui sont favorables. Lorsqu'un apport à communauté avait été réalisé par la victime, cet apport **ouvre droit à récompense due par la communauté** (C. civ. art. 1399-5).

La déchéance peut être **de plein droit** (art. 1399-1) ou **facultative**, à la demande d'un héritier, de l'époux victime ou du ministère public.

⚙️ **Modélisation** : traiter l'indignité comme un flag héritier avec deux conséquences distinctes — (a) exclusion successorale, (b) neutralisation des avantages matrimoniaux + récompense, cette seconde branche n'étant applicable qu'aux successions réglées depuis le 2 juin 2024.

## 3.5. Preuve de la qualité d'héritier

| Instrument | Émis par | Usage / limites |
|---|---|---|
| **Acte de notoriété** (art. 730-1) | Notaire **exclusivement** (les TI ne sont plus compétents depuis le 22 déc. 2007) | Instrument de droit commun |
| **Certificat d'hérédité** | Mairie (domicile du demandeur, dernier domicile ou lieu du décès) | Successions simples, faible actif. **Le maire n'est jamais obligé de le délivrer** (simple pratique administrative). Exclu si testament, contrat de mariage, immeuble, nationalité étrangère… |
| **Attestation signée par tous les héritiers** (CMF art. L. 312-1-4) | Héritiers en ligne directe | Opérations bancaires si comptes **< 5 910 €**. Doit attester : absence de testament et d'autres héritiers, absence de contrat de mariage, autorisation donnée au porteur, absence de litige, **absence de bien immobilier** |
| **Pétition d'hérédité** | Action en justice (TJ du lieu d'ouverture) | Après règlement, pour l'héritier ou légataire omis |

## 3.6. Saisine, envoi en possession, délivrance de legs

- **Saisine** (art. 724) : les héritiers légaux, réservataires ou non, sont saisis de plein droit des biens, droits et actions du défunt. Ils peuvent agir sans partage préalable et sans le concours des autres indivisaires.
- **Légataire universel** : depuis les successions ouvertes au **1ᵉʳ novembre 2017**, il est saisi de plein droit **en l'absence d'héritier réservataire**, quelle que soit la forme du testament (loi 18 nov. 2016). Le notaire dresse un procès-verbal de dépôt et description du testament olographe, le transmet au greffe ; l'envoi en possession judiciaire ne subsiste qu'en cas d'**opposition d'un tiers** dans le mois.
- **Délivrance de legs** (art. 1011 et 1014) : le légataire particulier doit la demander — aux héritiers réservataires s'il y en a, à défaut aux légataires universels, à défaut aux héritiers non réservataires. Obligatoire **même si le légataire était déjà en possession du bien** (Cass. civ. 1, 21 juin 2023, n° 21-20396). Action personnelle, prescription **5 ans** (art. 2224), courant du décès.

---

# 4. Successions anomales et droits de retour

Principe général : **unité de la succession** — tous les biens forment une masse unique, quelles que soient leur nature et leur origine. Exceptions ci-après.

## 4.1. Biens dévolus selon leur **origine** : les droits de retour

### 4.1.1. Droit de retour légal des **père et mère** (C. civ. art. 738-2)

| Aspect | Règle |
|---|---|
| Conditions | Bien donné par le père/mère au défunt + prédécès du donataire + **absence de descendance** du donataire |
| Exécution | **En nature** ; à défaut (bien sorti du patrimoine), **en valeur dans la limite de l'actif successoral** |
| Plafond | Restitution limitée à **1/4 de l'actif net partageable** par ascendant donateur *(controverse doctrinale : 1/4 de la valeur du bien, ou le bien dans la limite du quart de la succession)* |
| Imputation | En priorité sur les droits successoraux du parent qui hérite par ailleurs |
| Caractère | **Ordre public** — le défunt ne peut pas l'écarter par testament |
| Fiscalité | **Exonéré de DMTG**. Ouvre droit à **restitution des droits de donation** acquittés lors de la donation résolue, jusqu'au 31/12 de la 2ᵉ année suivant le décès (CGI art. 763 bis et 791 ter al. 2) |

### 4.1.2. Droit de retour légal des **frères et sœurs** (C. civ. art. 757-3)

| Aspect | Règle |
|---|---|
| Conditions | Décès sans descendance **et** sans père ni mère. Biens reçus des **ascendants** (pas seulement des père et mère) par succession ou donation, **retrouvés en nature** |
| Quotité | **Moitié** aux frères et sœurs (ou leurs descendants), eux-mêmes descendants du parent à l'origine de la transmission |
| Retour en valeur | **Non** — pas de retour si le bien n'est plus en nature |
| Caractère | **Pas d'ordre public** : le défunt peut en priver ses F/S par legs à un tiers ou legs universel au conjoint (RM Poignant, JOAN 11 juill. 2006) |
| Articulation | Ne fait **pas obstacle** au droit viager au logement du conjoint (art. 764) (RM Brunel, 14 nov. 2006) |
| Fiscalité | **Taxable aux DMTG** |

### 4.1.3. Adoption simple (C. civ. art. 366)
Décès de l'adopté sans descendant ni conjoint :
- les biens **donnés par l'adoptant** lui reviennent (ou à ses descendants) — en nature uniquement ;
- les biens reçus à titre gratuit **des père et mère biologiques** retournent à ceux-ci ou à leurs descendants ;
- le **surplus** se divise **par moitié** entre famille d'origine et famille adoptive.
- Fiscalité : **taxable aux DMTG**.
- ⚠️ Contournement pratique : le retour ne s'opérant qu'en nature, l'apport du bien donné à une société le neutralise.

### 4.1.4. Droit de retour **conventionnel** (C. civ. art. 951)
Stipulé dans l'acte de donation. Appartient **au donateur seul** (ni à ses héritiers, ni à un tiers). Le bien revient libre de toutes charges et hypothèques.
- Fiscalité : **exonéré** pour les père et mère ; **taxable** pour les F/S et en matière d'adoption simple.
- En cas de **nouvelle donation** du bien dans les **5 ans** du retour : les droits acquittés lors de la 1ʳᵉ donation s'imputent sur ceux de la 2ᵉ (CGI art. 791 ter al. 1). À défaut : restitution des droits (al. 2).
- ⚠️ La renonciation au droit de retour **conventionnel** n'emporte **pas** renonciation au droit de retour **légal**.
- ⚠️ Les bénéficiaires du droit de retour **légal** ne peuvent pas y renoncer avant l'ouverture de la succession (pacte sur succession future — Cass. civ. 1, 21 oct. 2015).
- Le droit de retour s'applique aussi en cas de **renonciation à succession des descendants du donataire** (Cass. civ. 1, 23 mai 2012).

## 4.2. Biens dévolus (ou non) selon leur **nature**

| Bien / droit | Traitement |
|---|---|
| **Droits viagers** (rentes viagères, usufruit, droit d'usage) | S'éteignent au décès — hors succession. ⚠️ Les *usufruits successifs* ne sont pas la survie d'un usufruit mais **deux usufruits distincts**, le second naissant à l'extinction du premier |
| **Baux ruraux** (C. rural art. L. 411-34) | Dévolution anomale : continuation au profit du conjoint, partenaire de PACS, ascendants et descendants **participant à l'exploitation** (ou y ayant participé les 5 années précédentes). Résiliation possible dans les 6 mois |
| **Droits d'auteur** (CPI art. L. 123-1 et L. 123-6) | Transmis pour **70 ans** post mortem. Usufruit spécial du conjoint survivant sur le droit d'exploitation, **cumulable** avec l'usufruit de l'art. 757 (l'usufruit 757 se calcule abstraction faite des droits d'auteur). Renonciation possible à l'un sans l'autre. **Réductible** s'il excède la QD (exception : il ne peut pas amputer la réserve). S'éteint en cas de **remariage** |
| **Souvenirs de famille** | Hors dévolution et hors partage. Partage amiable ; à défaut, dépôt judiciaire chez le membre de la famille le plus apte (pas nécessairement un héritier), à charge de conservation et d'accès |
| **Concessions funéraires** | Droit de jouissance du domaine public, **hors succession**, incessible à titre onéreux, mais transmissible par donation ou legs à un membre de la famille. Transmission aux héritiers en **indivision perpétuelle** avec obligation d'entretien égalitaire ; renonciation possible par acte notarié (RM Husson, JO Sénat 2 mars 2023) |
| **Assurance-vie** | Stipulation pour autrui : la valeur de rachat est **hors succession** civile. Régimes fiscaux distincts (CGI art. 990 I et 757 B) |

---

# 5. Les droits du conjoint survivant

## 5.1. Qui est conjoint survivant ?

« Est conjoint successible le conjoint survivant **non divorcé** » (C. civ. art. 732).

**A la qualité de conjoint successible** : l'époux en instance de divorce ; l'époux séparé de corps (RM Perrut, JOAN 5 mai 2009).
**N'hérite pas** : le conjoint posthume (mariage conclu après le décès) ; le conjoint divorcé ; l'époux séparé de corps **si** la convention de séparation par consentement mutuel contient une clause de renonciation aux droits successoraux ; le conjoint dont le mariage a été annulé (sauf annulation postérieure au décès sans effet rétroactif).

Le remariage postérieur au décès **ne fait perdre aucun droit** acquis au jour du décès.

## 5.2. Panorama des droits

1. **Droits successoraux légaux** (art. 757 et s.) — voir § 2.5.
2. **Droits conventionnels** : donation entre époux / testament (QDS).
3. **Droit de jouissance temporaire** du logement (1 an) — **ordre public**.
4. **Droit viager d'usage et d'habitation** — optionnel, écartable par testament authentique.
5. **Attribution préférentielle** du logement — de droit.
6. **Usufruit spécial** sur les droits d'auteur.
7. **Pension**, créance d'aliments, pension de réversion, créance du conjoint collaborateur.

⚠️ **Tous les droits successoraux du conjoint sont supplétifs de volonté**, à deux exceptions près : le **droit temporaire d'un an** au logement et la **réserve d'1/4** en l'absence de descendant. Le défunt peut donc quasiment déshériter son conjoint par testament.

⚠️ Le conjoint **ne peut pas cumuler** les droits légaux des art. 757 / 757-3 avec les libéralités consenties en application de l'art. 1094 (CA Aix-en-Provence, 16 nov. 2016, n° 15-05989).

⚠️ **Ordre des opérations** : en régime communautaire, on liquide d'abord le **régime matrimonial** (le conjoint reçoit sa moitié de communauté), puis la succession.

## 5.3. L'option 1/4 PP ou 100 % usufruit (art. 757, 758-1 à 758-4)

### Existence de l'option
- **Option ouverte** si tous les enfants sont communs.
- **Option fermée** (1/4 PP obligatoire) en présence d'au moins un enfant non commun, ou en concours avec les père et mère (1/2, 3/4).
- ⚠️ En cas d'**adoption simple de l'enfant du conjoint**, il semble que l'option soit retrouvée (l'adopté simple a, dans la famille de l'adoptant, les mêmes droits successoraux que les autres enfants).

### Régime de l'option
| Point | Règle |
|---|---|
| Forme | Aucune forme requise ; se prouve par tous moyens (art. 758-2) |
| Délai | **10 ans** à défaut d'interpellation ; **3 mois** si un héritier invite le conjoint à opter par écrit (art. 758-3) |
| Caractère | **Personnel** (art. 758-1) : les créanciers ne peuvent ni contraindre ni opter à sa place |
| Présomption d'usufruit | Le conjoint est **réputé avoir opté pour l'usufruit** (a) s'il n'a pas répondu dans les 3 mois, (b) **s'il décède avant d'avoir opté** (art. 758-4) |
| Cession | Tant qu'il n'a pas opté, le conjoint ne peut pas céder ses droits |

### Arbitrage 1/4 PP vs usufruit total

| | Avantages | Inconvénients |
|---|---|---|
| **1/4 en PP** | Indépendance totale ; maîtrise des biens ; **condition d'accès à l'attribution préférentielle** (art. 831-2) | Assiette réduite |
| **Usufruit total** | Assiette large ; perception de tous les revenus ; quasi-usufruit automatique sur les liquidités | Cogestion avec les nus-propriétaires ; pas d'attribution préférentielle ; assiette **réduite par les donations et legs antérieurs** |

## 5.4. Vocation en **propriété** — la double masse (C. civ. art. 758-5)

⚙️ **Modélisation — mécanisme à deux masses distinctes :**

**① Masse de calcul** — sert à *chiffrer* le quart :
> biens existants au décès − dettes + **réunion fictive** des donations (pour vérifier que les libéralités n'excèdent pas la QD).

**② Masse d'exercice** — sert à *prélever* effectivement :
> le conjoint ne peut exercer son droit **que sur les biens dont le défunt n'a pas disposé par donation ou testament**.

⚠️ Conséquence : le conjoint peut être **exhérédé de fait** si le défunt a disposé de tout son patrimoine par libéralités. En présence d'enfants communs il lui reste alors l'option pour l'usufruit des biens existants.

## 5.5. Vocation en **usufruit**

- Porte sur la **totalité des biens existants** au décès (art. 757).
- **Ne porte pas** sur les biens légués ni sur les biens donnés (en avancement de part **ou** hors part).
- ⚠️ **Porte sur la réserve des descendants** — exception au principe selon lequel la réserve est délivrée libre de charges (avant 2001, l'usufruit légal du quart avait pour seule assiette la QD).

**Exemple de référence** (2 enfants communs) :
> Biens existants 1 400 ; legs hors part 100 ; réserve = (1 400 + 100) × 2/3 = 1 000 ; QD = 500. L'usufruit ne porte pas sur les 100 légués.

> Biens existants 1 400 ; donation **hors part** à A de 1 000. Réserve = 2 400 × 2/3 = 1 600 (800 chacun) ; QD = 800. La donation s'impute sur la QD (800) et l'excédent (200) est réductible → indemnité de réduction de 200 due par A à B. **L'usufruit du conjoint porte sur 1 200 et non sur 1 400.**

## 5.6. La donation entre époux (DEE / donation au dernier vivant — DDV)

Donation de **biens à venir** (C. civ. art. 1094-1). Trois options maximales offertes au survivant :

| Option | Contenu |
|---|---|
| **A** | La **pleine propriété de la quotité disponible ordinaire** (variable selon le nombre d'enfants) |
| **B** | **1/4 en pleine propriété + 3/4 en usufruit** |
| **C** | La **totalité en usufruit** |

Points clés :
- Le choix est généralement laissé au conjoint **au moment du décès** ; le défunt peut toutefois imposer une option par clause.
- Si le conjoint meurt sans avoir opté, **ses héritiers choisissent**.
- Particulièrement pertinente en présence d'**enfants non communs** : elle permet d'aller au-delà du seul quart en PP légal.
- Ouvre la **faculté de cantonnement** (souplesse).
- ⚠️ **Assimilée à un legs** pour l'ordre de réduction (voir § 10). Nuance : la DDV consentie **dans le contrat de mariage** est traitée comme une **donation** faite au jour du contrat.
- Peut avoir un impact sur la déclaration **IFI**.
- Émolument fixe : **113,20 € HT / 135,84 € TTC**.
- ⚠️ Toutes les donations entre époux (entre vifs **et** DDV) s'imputent dans la QDS, celle-ci étant un **plafond global** à ne pas dépasser.

## 5.7. Conversion de l'usufruit du conjoint (C. civ. art. 759 à 762)

### 5.7.1. En rente viagère

| Point | Règle |
|---|---|
| Demandeur | Le conjoint usufruitier **ou** les héritiers nus-propriétaires (art. 759) |
| Voie | Amiable ou **judiciaire** |
| Assiette | Tout usufruit résultant de **la loi, d'un testament ou d'une donation de biens à venir**. Peut ne porter que sur certains biens |
| **Exclusions** | Usufruit né d'une **convention matrimoniale** (préciput en usufruit, attribution intégrale en usufruit…) et usufruit né d'une **donation entre vifs** |
| Délai | Demande judiciaire recevable **jusqu'au partage définitif** (art. 760 al. 1) |
| Fixation | Le juge détermine le montant de la rente (**équivalente à l'usufruit estimé au moment de la conversion, d'après le revenu net et non le capital**), les sûretés dues par les cohéritiers, et l'indexation (art. 760 al. 2). Pouvoir souverain d'appréciation (Cass. civ. 1, 9 sept. 2015, n° 14-15957) |
| **Limite impérative** | Le juge **ne peut pas** ordonner, contre la volonté du conjoint, la conversion de l'usufruit portant sur le **logement occupé à titre de résidence principale** et le mobilier le garnissant (art. 760 al. 3) |
| Renonciation | La faculté de conversion **n'est pas susceptible de renonciation** et le défunt ne peut pas en priver les héritiers (art. 759-1). *Question non tranchée : le conjoint est-il visé par « les héritiers » ?* |

### 5.7.2. En capital (art. 761)
- **Accord de toutes les parties requis** — pas de voie judiciaire.
- Analyse : rachat de l'usufruit par le nu-propriétaire ; prix librement négocié.

### 5.7.3. Fiscalité de la conversion

| Situation | Traitement |
|---|---|
| Conversion en rente ou en capital (art. 759 à 762) | **Droit fixe des actes innomés : 125 €** (BOI-ENR-DMTG-10-50-10 § 140 ; BOI-ENR-DMTG-20-10-10 § 190) |
| Position alternative (conversion en toute propriété) | Analysée comme un échange usufruit/nue-propriété, mais **admise comme opération de partage taxée à 2,5 %** (BOI-ENR-DMTOI-10-10-10 § 190) |
| Conversion **rétroactive au décès** (art. 762) | Les DMTD sont assis sur la valeur du capital ou de la rente, **déduite de l'actif recueilli en toute propriété par les héritiers**. Déclaration rectificative sous **6 mois** de la conversion si elle est postérieure au dépôt |
| ⚠️ Conversion en capital d'un usufruit à durée fixe | Peut relever de **CGI art. 13, 5-1°** → taxation à l'IR dans la catégorie des revenus correspondants (revenus fonciers p. ex.) chez l'usufruitier |

⚠️ **La rétroactivité ne peut être stipulée que par les parties** — le juge ne peut pas l'ordonner.

### 5.7.4. Conversion et partage
Les conversions produisent les effets d'un partage : **rescision pour lésion de plus du quart**, garantie des copartageants (art. 884 à 886), privilège immobilier (art. 2374-3°), et mêmes règles de capacité que pour un partage.

## 5.8. Le droit de **jouissance temporaire** du logement (C. civ. art. 763)

| Caractère | Conséquence |
|---|---|
| **Effet direct du mariage**, non successoral | **Ne s'impute pas** sur la part du conjoint — il vient **en plus** |
| **Droit personnel** | Le conjoint doit habiter lui-même ; pas de location possible |
| **Automatique** | Aucune formalité ni manifestation de volonté |
| **Gratuit** | Aucune redevance. Si les époux étaient **locataires**, les loyers sont remboursés au conjoint par la succession au fur et à mesure (le notaire prélève une provision) |
| **Ordre public** | Le défunt ne peut pas en priver son conjoint. Survit à la **renonciation à la succession** et n'emporte pas acceptation tacite |
| Durée | **1 an** |

**Assiette** : logement **effectif** (occupé au jour du décès) et **principal**, appartenant aux époux ou dépendant totalement de la succession — c'est-à-dire : logement loué ; logement commun ; logement propre du défunt ; logement indivis entre époux (régime séparatiste) ; logement personnel du défunt ; **et depuis le 1ᵉʳ janvier 2007**, logement indivis entre le défunt et un tiers.

**Exclusions** : résidence secondaire ; logement indivis défunt/tiers **avant** 2007 ; logement détenu **via une SCI** (sauf bail conclu entre la société et les époux) ; logement dont le défunt n'était qu'**usufruitier**.

**Fiscalité** : non soumis aux DMTD. **Non déductible du passif** (art. 768 CGI) — sauf exécution en espèces : les loyers effectivement remboursés sont déductibles de l'actif.

⚠️ Le droit temporaire n'empêche pas le legs du logement : le legs s'exécutera simplement **après l'année**.

## 5.9. Le droit **viager** d'usage et d'habitation (C. civ. art. 764 à 766)

| Caractère | Conséquence |
|---|---|
| **Nature successorale** | **S'impute sur la part successorale** du conjoint. Si sa valeur est inférieure à sa part → il complète sur d'autres biens ; si elle est supérieure → **il ne doit rien** aux autres héritiers |
| **Personnel** | Obligation d'habiter ; **exception** : location possible (bail d'habitation uniquement) si le logement n'est plus adapté à ses besoins et si le bail dégage les ressources nécessaires pour se reloger |
| **Optionnel** | **1 an** à compter du décès pour manifester sa volonté. Manifestation possiblement tacite, mais **le seul maintien dans les lieux ne suffit pas** (Cass. civ. 1, 2 mars 2022, n° 20-16674) |
| **Non d'ordre public** | Écartable, mais **uniquement par testament authentique** (deux notaires, ou un notaire + deux témoins) — Cass. civ. 1, 15 déc. 2010 |

**Assiette** : mêmes conditions que le droit temporaire, **sauf** qu'il ne s'applique **pas au logement loué**. Exclu également : logement en SCI (sauf bail/convention d'occupation) ; logement dont le défunt s'était réservé l'usufruit après cession de la nue-propriété.

⚠️ **Conseil pratique** : même si le conjoint a opté pour l'usufruit total, il reste **recommandé** d'opter aussi pour le droit viager — car la découverte ultérieure d'un enfant caché ferait tomber l'usufruit légal (ramené au quart en PP). Le risque n'existe pas si l'usufruit provient d'une DDV.

### Fiscalité du DUH
- **Valeur = 60 % de la valeur de l'usufruit** calculée selon le barème de l'art. 669 du CGI (CGI art. 762 bis ; BOI-ENR-DMTG-10-40-10-50 § 90).
- ⚙️ **Âge à retenir** : celui du conjoint **au terme du droit temporaire, soit un an après le décès**.
- Ce n'est **pas un supplément** : il s'impute sur la vocation successorale.
- **Option et déclaration** : si l'option précède la déclaration, les droits sont liquidés en conséquence. À défaut de manifestation au jour du dépôt (6 mois), le conjoint est **réputé fiscalement ne pas avoir opté**. Manifestation postérieure (entre 6 et 12 mois) → déclaration complémentaire ; complément ou restitution (LPF art. R. 196-1).
- **Conversion** du DUH en rente ou capital : possible par convention (accord du JAF si héritier mineur), taxée au **droit fixe de 125 €**. Pas de rétroactivité possible → **sans incidence sur la liquidation des DMTD**.

### Extinction du DUH (C. civ. art. 625)
Décès du titulaire ; arrivée du terme ; acquisition de la propriété ; **non-usage pendant 30 ans** ; perte totale de la chose ; renonciation (art. 766, éventuellement contre capital ou rente) ; **déchéance pour abus de jouissance** (dégradations, défaut d'entretien — art. 618, liste non limitative).

## 5.10. Attribution préférentielle du logement (C. civ. art. 831-2)

**De droit** pour le conjoint survivant si deux conditions sont réunies :
1. il a **déjà un droit de propriété** sur le logement (communauté, indivision, quart en PP, legs partiel) ;
2. le logement constituait sa **résidence principale au jour du décès**.

⚠️ Ne concerne **pas** le logement détenu via une SCI (c'est la société qui est propriétaire) — les juges doivent toutefois rechercher si l'attribution préférentielle des **parts de SCI** dépendant de la communauté est possible.
⚠️ Le refus de l'attribution préférentielle n'emporte ni renonciation au droit viager, ni renonciation à la succession.

## 5.11. Droits sur l'entreprise

Pas de droit particulier : l'entreprise est un bien comme un autre. Le conjoint peut demander l'**attribution préférentielle** (art. 831), mais elle **n'est pas de droit** (contrairement au logement). Conditions : droit de propriété préexistant **et** participation effective à l'exploitation (une participation de pur fait ou salariée suffit — Cass. 27 oct. 1993).

## 5.12. Pensions, créances et prestations

| Droit | Régime |
|---|---|
| **Pension du conjoint dans le besoin** (art. 767) | Prélevée sur la succession, supportée par tous les héritiers puis les légataires particuliers au prorata. Délai : **1 an** du décès (ou 1 an à compter de l'arrêt des prestations fournies par les héritiers ; prorogé jusqu'à l'achèvement du partage en cas d'indivision). **Non soumise aux DMTD** (créancier, non héritier). Pas de condition de liquidité des biens issus de la succession (Cass. civ. 1, 30 janv. 2019, n° 18-13526) |
| **Créance d'aliments des ascendants ordinaires** (art. 758) | Ouverte lorsque le conjoint recueille la **totalité ou les 3/4** en PP, aux ascendants **autres que père et mère** dans le besoin. Mêmes délais et modalités. **Non déductible du passif** (CGI art. 768) |
| **Pension de réversion** | Droit dérivé ; règles et taux très contrastés selon les régimes. ⚠️ Le régime matrimonial influe indirectement : les revenus de **biens communs** ne comptent pas dans les ressources personnelles du survivant. Depuis 2019, **non due** si le conjoint a été condamné pour crime ou délit envers l'assuré (le juge peut écarter cette peine — LFSS 2021) |
| **Créance du conjoint collaborateur** | Participation ≥ **10 ans** à l'entreprise artisanale ou commerciale, sans être salarié ni associé aux résultats → créance = **3 × SMIC annuel** au jour du décès, **plafonnée à 25 % de l'actif successoral** |
| **Jouissance légale sur les biens du mineur** | Enfant < 16 ans non émancipé : **inventaire obligatoire**, à défaut de quoi le conjoint ne peut pas jouir des biens. Actes d'administration seuls ; actes de disposition → JAF. Ne porte pas sur les biens donnés/légués avec clause d'exclusion de la jouissance légale |

## 5.13. Transfert du bail d'habitation

Cotitularité automatique du bail (C. civ. art. 1751 ; loi 6 juill. 1989 art. 14), **même si le bail est antérieur au mariage et au seul nom du défunt**. Le conjoint dispose d'un droit exclusif sauf renonciation expresse.
- ⚠️ Logement lié aux fonctions professionnelles : cotitularité **uniquement** en présence d'une prise à bail effective (Cass. civ. 3, 6 avr. 2023, n° 21-17.888). Un simple **logement de fonction** (avantage en nature) ne confère qu'un titre d'occupation → **pas de transfert**.

## 5.14. Successions ouvertes avant le 1ᵉʳ juillet 2002 (droit ancien)

| Configuration | Droits du conjoint |
|---|---|
| Descendants (légitimes/naturels) | **Usufruit du quart** |
| Frères et sœurs, leurs descendants, ascendants, enfants naturels conçus pendant le mariage | **Usufruit de la moitié** |
| Aucun parent au degré successible, ou seulement collatéraux autres que F/S | **Totalité en PP** |
| Aucun parent dans une ligne | **Moitié en PP** |

Le conjoint n'héritait **jamais en PP en présence de descendants** (sauf concours avec enfant adultérin) et n'était **réservataire dans aucun cas**.
QDS ancienne : art. 1094 et 1094-1 anciens (dont nue-propriété de la réserve des ascendants) ; art. 1097 ancien (enfants adultérins) ; art. 1098 ancien (faculté de substitution de l'usufruit par les enfants d'un premier lit).
Ancien art. 1481 : droit à la nourriture, au logement et aux frais de deuil pendant **9 mois**, à la charge de la communauté.

---

# 6. Réserve héréditaire et quotité disponible

## 6.1. Définitions (C. civ. art. 912)

- **Réserve héréditaire** : part des biens et droits successoraux dont la loi assure la dévolution **libre de charges** à certains héritiers dits réservataires, **s'ils sont appelés à la succession et s'ils l'acceptent**. Ordre public.
- **Quotité disponible** : part dont le défunt peut librement disposer par libéralités.

## 6.2. Qui est réservataire ?

| Héritier | Réservataire ? |
|---|---|
| **Descendants** venant à la succession | **Oui** (art. 913) — quel que soit leur degré |
| **Conjoint survivant**, en l'absence de tout descendant | **Oui, 1/4 en PP** (art. 914-1) |
| Ascendants | **Non** depuis le 1ᵉʳ janvier 2007 (compensé par le droit de retour légal) |
| Tous les autres | Non |

Précisions :
- **Aucun réservataire n'a de réserve personnelle** : tous se partagent une **réserve globale**.
- Pour les descendants, **qualité de réservataire = qualité d'héritier** : on ne peut être l'un sans l'autre. Un petit-fils dont le père est vivant n'est pas réservataire.
- **Adopté simple** : pas réservataire dans la succession des **ascendants** de l'adoptant.
- **Enfant incestueux** dont la filiation ne peut être légalement établie : non réservataire.
- **Conjoint** : réservataire même si le divorce est en cours (ONC, séparation de corps).

## 6.3. Comptage des enfants pour le calcul (art. 913 et 913-1)

⚙️ **Modélisation — le compteur N d'enfants inclut** :
- les enfants **vivants** venant à la succession ;
- les enfants **décédés s'ils sont représentés** ;
- les enfants **renonçants s'ils sont représentés** ;
- les enfants **renonçants ayant bénéficié d'une libéralité stipulée rapportable même en cas de renonciation**.

**Exclus** : l'enfant renonçant non représenté et non tenu au rapport.
**Inclus** : l'héritier ayant consenti une **RAAR** (renonciation anticipée à l'action en réduction) reste comptabilisé.

## 6.4. Barème de la quotité disponible ordinaire (QDO)

### Réservataires = descendants (art. 913)

| Nb enfants | Réserve globale | Réserve individuelle | Quotité disponible |
|---|---|---|---|
| 1 | 1/2 | 1/2 | **1/2** |
| 2 | 2/3 | 1/3 | **1/3** |
| 3 | 3/4 | 1/4 | **1/4** |
| 4 | 3/4 | 3/16 | 1/4 |
| 5 | 3/4 | 3/20 | 1/4 |
| 6 | 3/4 | 3/24 | 1/4 |
| 7 | 3/4 | 3/28 | 1/4 |
| 8 | 3/4 | 3/32 | 1/4 |
| 9 | 3/4 | 3/36 | 1/4 |
| 10 | 3/4 | 3/40 | 1/4 |

> Formule générale à partir de 3 enfants : réserve globale **3/4**, réserve individuelle = **3 / (4 × N)**, QD = **1/4**.

### Réservataire = conjoint survivant (absence de descendant)
Réserve **1/4**, QD **3/4**.

## 6.5. La quotité disponible spéciale entre époux (QDS — art. 1094-1)

Trois options maximales (voir § 5.6) : **QDO en PP** / **totalité en usufruit** / **1/4 PP + 3/4 US**.

Spécificité fondamentale : la QDS permet au conjoint de recevoir **l'usufruit de la réserve des enfants** — ce que ne permettrait aucune autre libéralité. Le partenaire pacsé **en est exclu**.

⚠️ **Art. 917 du Code civil** (libéralité en usufruit excédant la QD) : les réservataires peuvent au choix **exécuter la disposition** ou **faire l'abandon de la propriété de la quotité disponible**. **Cet article n'est PAS applicable aux libéralités au profit du conjoint**, qui bénéficie de la QDS et peut donc recevoir l'usufruit de la totalité sans réduction (art. 1094-1).

## 6.6. Combinaison QDO / QDS

Problème : si le défunt gratifie à la fois son conjoint (jusqu'à la QDS) et un tiers (jusqu'à la QDO), la réserve serait fortement entamée. D'où un **cumul partiel** :

⚙️ **Règles de combinaison** :
1. Chaque gratifié ne peut recevoir que **dans la limite de la quotité qui lui est propre** (conjoint → QDS ; non-héritier → QDO).
2. **Plafond global** : le total des libéralités ne doit pas dépasser **la quotité disponible augmentée de l'usufruit du reste** (usufruit de la réserve, attribué au conjoint).
3. **Imputation d'une libéralité en propriété** : sur le disponible ordinaire ; l'excédent s'impute sur **l'usufruit des réservataires**.
4. **Imputation d'une libéralité en usufruit** : d'abord sur la **QDS**.

## 6.7. Réserve et droit international

- La jurisprudence considère que la réserve héréditaire **ne constitue pas un principe d'ordre public international** français (CA Paris 11 mai 2016 ; Cass. civ. 1, 27 sept. 2017, n° 16-17198 et n° 16-13151 ; CEDH 15 fév. 2024, req. n° 14157/18 — exception écartée notamment car les requérants n'étaient pas en situation de précarité économique).
- Mais si la **règle de conflit désigne la loi française** (immeubles situés en France, C. civ. art. 3 al. 2), la réserve, **d'ordre public interne**, s'applique et ne peut être écartée par un testament établi selon la loi du domicile (Cass. civ. 1, 4 juill. 2018, n° 17-16515).
- **Prélèvement compensatoire** (loi n° 2021-1109 du 24 août 2021, art. 24 → C. civ. art. 913) : lorsque la loi étrangère applicable ne connaît pas de réserve, les enfants peuvent prélever sur les biens situés en France une part égale à leur réserve française, **si** le défunt est ressortissant ou réside habituellement dans un État membre de l'UE, **ou** si l'un des enfants l'est. Non réservé aux héritiers français.
- Double nationalité + *professio juris* étrangère : le mécanisme de réserve s'applique si au moins un réservataire est ressortissant européen (RM Habib, 21 nov. 2023, n° 7936).

---

# 7. L'option successorale

## 7.1. Les trois branches (C. civ. art. 768)

1. **Acceptation pure et simple**
2. **Acceptation à concurrence de l'actif net** (ex-« bénéfice d'inventaire »)
3. **Renonciation**

## 7.2. Régime général

| Point | Règle |
|---|---|
| **Indivisibilité** | On ne peut pas accepter certains actifs et pas d'autres (art. 769). ⚠️ Mais la personne à la fois **héritière et légataire** dispose de **deux droits d'option distincts** |
| **Délai** | **10 ans** à compter de l'ouverture (30 ans avant 2007). À l'expiration, l'héritier est **réputé renonçant** (art. 780) |
| **Rétroactivité** | L'option rétroagit au jour de l'ouverture (art. 776) |
| **Antériorité prohibée** | Toute option exercée avant l'ouverture est nulle (pacte sur succession future — art. 770) |
| **Titulaires** | Tout héritier présomptif n'ayant ni recelé ni dissimulé un héritier ; les héritiers de l'héritier décédé sans avoir opté (**à défaut d'accord entre eux, la loi impose l'acceptation à concurrence de l'actif net**) ; les créanciers personnels de l'héritier inactif (art. 779, effet limité à leur créance) |

## 7.3. Acceptation pure et simple (art. 782 et s.)

- Expresse (écrit) ou **tacite** : acte que l'héritier n'a le droit de faire qu'en cette qualité — acte de disposition (vente d'un immeuble), acte d'administration (perception de fruits), demande de partage, démolition/construction/réparations non urgentes, prise de possession.
- ⚠️ **Ne valent pas acceptation tacite** : la simple gestion des suites du bail dont le défunt était titulaire (présence à l'état des lieux, échanges avec le bailleur) — Cass. civ. 1, 19 sept. 2018, n° 17-24632.
- Effet : tenu des dettes **sur ses biens personnels**, sous deux réserves (legs de somme d'argent ; décision judiciaire pour certaines dettes révélées après l'acceptation).
- **Remise en cause** possible en cas de vice du consentement ou de **découverte d'un testament inconnu absorbant ou diminuant de moitié la succession**.

## 7.4. Acceptation à concurrence de l'actif net (art. 787 et s.)

**Effets** (art. 791) :
- évite la **confusion** des patrimoines ;
- conserve les droits que l'héritier avait antérieurement sur les biens du défunt ;
- limite l'obligation aux dettes **à concurrence de la valeur des biens recueillis**.

**Procédure** :
1. Déclaration au **greffe du tribunal judiciaire** du lieu d'ouverture, ou **devant notaire** (qui en adresse copie au TJ dans le mois — CPC art. 1334 al. 2).
2. **Publicité nationale** dans un journal d'annonces légales, dans le mois de la déclaration.
3. **Inventaire** dans le délai imparti — ⚠️ à défaut dans les **2 mois**, l'héritier est réputé **acceptant pur et simple** (art. 790). L'inventaire est soumis à la même publicité.

**Déchéance rétroactive** (art. 800) : recel ou omission sciemment et de mauvaise foi de biens dans l'inventaire ; vente de biens successoraux sans respecter les formalités (autorisation de justice pour les immeubles ; enchères publiques pour les meubles corporels). La séparation des patrimoines demeure toutefois dans les rapports avec les créanciers de la succession (art. 801).

**Cohabitation d'options différentes** (art. 792-2) : jusqu'au partage, **les règles applicables aux acceptants à concurrence de l'actif net s'imposent à tous**. Les créanciers peuvent provoquer le partage en cas de difficultés de recouvrement.

⚠️ Coût élevé → à réserver aux cas de **doute réel sur l'étendue du passif**.

## 7.5. Renonciation (art. 804 et s.)

- **Ne se présume pas** : déclaration expresse. Opposabilité aux tiers : dépôt au greffe du TJ du lieu d'ouverture ou devant notaire (copie au TJ dans le mois). Le légataire universel ou à titre universel renonce **par simple lettre** (sauf délivrance obtenue en justice).
- **Effets** (art. 805) : l'héritier renonçant **n'a jamais été héritier**. Sa part revient à ses descendants **par représentation** ; à défaut, à ses cohéritiers de même ordre ; à défaut, aux héritiers de rang subséquent.
- ⚠️ **Pas de cantonnement possible** dans une succession (option indivisible) — contrairement aux legs et donations entre époux.
- ⚠️ Une **renonciation en faveur d'une personne déterminée** est assimilée à une **acceptation suivie d'une donation** : les droits de succession sont dus par le bénéficiaire.
- ⚠️ Le renonçant reste tenu au **rapport** si (a) le donateur l'a expressément prévu dans l'acte, ou (b) il laisse des descendants qui le représentent (art. 845).
- **Rétractation** possible si **aucun autre héritier n'a accepté** (ou si l'État n'a pas été envoyé en possession) **et** dans les **10 ans** du décès (art. 807 et 780).

## 7.6. Personnes protégées — tableau de synthèse

| Situation | Acceptation pure et simple | Acceptation à concurrence de l'actif net | Renonciation |
|---|---|---|---|
| **Mineur non émancipé** | Autorisation du **JAF** (art. 387-1) | Administrateur légal seul ; autorisation du JAF si désaccord entre les deux parents (art. 387) | Autorisation du **JAF** (art. 387-1) |
| **Curatelle** | Personne protégée **assistée du curateur** (art. 467) | Personne protégée **seule** (art. 467) | Personne protégée assistée du curateur (art. 467) |
| **Tutelle** | Autorisation du juge (ou conseil de famille) (art. 507-1) | **Décision du seul tuteur** (art. 507-1) | Autorisation du juge (ou conseil de famille) (art. 507-1) |

## 7.7. Pactes sur succession future

**Principe : prohibition** (art. 722). Un pacte sur succession future accorde un droit sur une succession non ouverte, en modifiant les règles de dévolution. Deux formes : pacte sur sa propre succession ; pacte sur la succession d'autrui.

**Distinction clé** : le pacte *post mortem* (licite) porte sur des **droits actuels** mais ne prend effet qu'au décès.

**Exceptions licites** :
- donation de biens à venir figurant dans le contrat de mariage ou faite entre époux pendant le mariage (**DDV**) ;
- **clause commerciale** (clause du contrat de mariage autorisant un époux à acquérir dans la succession de son conjoint un bien personnel à ce dernier) ;
- **donation-partage** ;
- **renonciation anticipée à l'action en réduction (RAAR)** ;
- clauses statutaires désignant le repreneur des parts d'un associé décédé (statuts, testament de l'associé).

## 7.8. Droits des héritiers et des créanciers

- Les héritiers sont **saisis de plein droit** (art. 724) et peuvent agir seuls contre le tiers détenteur d'un bien soustrait à l'actif (Cass. civ. 1, 7 oct. 2015, n° 14-19912).
- ⚠️ **Pas de solidarité des dettes** entre héritiers : chacun n'est redevable qu'à hauteur de sa part successorale ; le créancier doit réclamer à chacun sa quote-part.
- Un créancier de la succession peut saisir un héritier **qui n'a pas encore opté**, sauf s'il a déjà renoncé (Cass. civ. 1, 19 sept. 2019, n° 18-18433).
- ⚠️ En revanche, **les héritiers sont solidaires pour le paiement des droits de succession** (fiscal).

---

# 8. Liquidation civile : la chaîne de calcul

## 8.1. Étape 0 — Liquidation préalable du régime matrimonial

Avant toute liquidation successorale, si le défunt était marié : liquider le régime matrimonial (règles du régime légal, ou stipulations du contrat de mariage / de l'acte de changement de régime). Détermination des masses, des récompenses, et des droits de chacun.

⚠️ **Avis à retenir sur les plus-values** : la plus-value des biens **entrant en succession est purgée**. En revanche, la plus-value des biens attribués au conjoint survivant **à la suite de la liquidation du régime matrimonial** ne l'est pas.

## 8.2. Étape 1 — L'actif brut

Ensemble des biens et droits dont le défunt était propriétaire ou titulaire **au jour du décès**, pour leur **valeur à cette date** :
immeubles, mobilier, avoirs financiers, valeurs mobilières, épargne, assurances, placements, biens ou droits placés dans un trust, liquidités, créances, **indemnité d'occupation due par un indivisaire**, droit à réparation pour dommages.

La nature des biens dépend du statut matrimonial (d'où l'étape 0).

⚠️ Fiscalement, l'**inventaire** permet d'échapper au **forfait mobilier de 5 %**.

## 8.3. Étape 2 — Le passif

Composition : dettes contractées par le défunt (cotisations sociales impayées, capital restant dû d'un emprunt, reconnaissances de dettes, impôts…) **et** dettes nées du fait du décès.

⚠️ Non déductibles : le droit temporaire au logement (sauf remboursement effectif de loyers), la créance d'aliments de l'art. 758.
⚠️ Si les dettes excèdent l'actif existant, **le solde n'est pas négatif mais égal à zéro** pour la formation de la masse de calcul.

## 8.4. Étape 3 — La réunion fictive (art. 922)

> **Masse de calcul de la réserve = (biens existants au décès − dettes) + toutes les donations réunies fictivement**

⚙️ **Toutes les donations, sans exception**, sont réunies fictivement, peu importe :
- que le donataire soit héritier ou étranger à la succession (**y compris le renonçant**) ;
- que la donation soit **en avancement de part ou hors part** ;
- qu'il s'agisse d'une donation notariée, d'un **don manuel**, d'une **donation-partage**, etc.

**Valeur retenue pour la réunion fictive** : valeur **au jour du décès**, selon **l'état au jour de la libéralité**, déduction faite des dettes ou charges dont les biens sont grevés (art. 922).
> Traduction : les plus-values **non imputables au donataire** profitent à la succession ; celles dues à son activité lui profitent exclusivement. Idem pour les moins-values.

⚠️ **Exception donation-partage** : sous conditions (notamment accord de tous les héritiers réservataires et allotissement de tous), les biens sont retenus pour leur **valeur au jour de la donation-partage**. À défaut de donation-partage, les valeurs sont **nécessairement réévaluées**.

## 8.5. Étape 4 — Détermination de la réserve et de la QD

Application des barèmes du § 6.4 à la masse de calcul.

## 8.6. Étape 5 — L'imputation des libéralités

⚙️ **Règles de principe** :
> ① La libéralité s'impute d'abord **sur la réserve**, puis sur la **quotité disponible**. L'excédent est **réductible**.
> ② Les **donations s'imputent toujours avant les legs**.
> ③ La **DDV est assimilée à un legs**.
> ④ Les libéralités entre époux relèvent d'un traitement spécifique du fait de la **QDS**.

### 8.6.1. Présomptions de qualification (art. 843)

| Libéralité | Au profit d'un héritier réservataire | Au profit d'un non-héritier |
|---|---|---|
| **Donation** | Présumée **en avancement de part successorale** (rapportable) | Nécessairement **hors part** |
| **Legs** | Présumé **hors part successorale** | Nécessairement **hors part** |

Ces présomptions sont **simples** : le disposant peut prévoir l'inverse dans l'acte.
*Ancienne terminologie : « avancement d'hoirie » = avancement de part ; « préciput et hors part » = hors part successorale.*

### 8.6.2. Supports d'imputation

| Cas | Imputation | Texte |
|---|---|---|
| Réservataire, **en avancement de part** | Sur **sa part de réserve** ; le surplus sur la **QD** ; l'excédent est réductible | art. 919-1 |
| Réservataire, **hors part** | Sur la **QD** ; le surplus est réductible | art. 919-2 |
| **Non-réservataire** (tiers, légataire) | Sur la **QD** ; le surplus est réductible | art. 919-2 |
| Bien donné **en nue-propriété** (défunt usufruitier) | S'impute pour sa **valeur en pleine propriété** | — |
| Libéralité **en usufruit hors part** | **Imputation « en assiette »** : on compare la valeur de la libéralité en usufruit avec **la valeur de la QD en usufruit** — et non en valeur PP après conversion | Cass. civ. 1, 22 juin 2022, n° 20-23.215 |
| Donation à un **petit-enfant** (parent vivant) | S'impute sur la **QD**, même s'il devient successible ; son parent n'a pas à la rapporter — art. 847. Vaut même si un enfant a préféré que la gratification aille à ses propres enfants (Cass. civ. 1, 6 mars 2019, n° 18-13236) | art. 847 |
| Donation-partage **transgénérationnelle** au petit-enfant | S'impute sur **la part de réserve de son parent** | art. 1078-8 |
| **Vente à un successible en ligne directe** en viager, à fonds perdu, ou avec réserve d'usufruit | **Présumée donation hors part** et imputée sur la QD, **sauf consentement des autres successibles** | art. 918 |

⚠️ **Exemple d'imputation « en assiette »** (important, car les deux méthodes divergent) :
> Legs de l'usufruit d'une maison : 240 000 € en PP, **144 000 € en usufruit** (60 %, légataire de 45 ans). Patrimoine 383 000 €, un enfant unique → QD = 191 500 €.
> - **En assiette (méthode retenue)** : usufruit de la QD = 191 500 × 60 % = **114 900 €**. Le legs (144 000 €) excède de **29 100 €** → indemnité de réduction.
> - **En valeur (méthode écartée)** : 144 000 € < 191 500 € → pas de réduction.

⚠️ Exclusions de la présomption de l'art. 918 : vente à une **société** ayant pour associé un successible (Cass. civ. 1, 30 sept. 2009, n° 08-17411) ; vente avec réserve du seul **droit d'usage et d'habitation** (Cass. civ. 1, 5 fév. 2002, n° 99-19875) ; vente d'un grand-parent à son petit-enfant du vivant du parent (la qualité de successible s'apprécie **au jour de l'acte**, Cass. civ. 1, 17 mars 1982, n° 81-12119). Le consentement des cohéritiers **n'a pas à être exprès** (Cass. civ. 1, 22 janv. 2022, n° 20-14155 : cessions quasi concomitantes aux 4 enfants).

### 8.6.3. Ordre d'imputation
1. **Donations d'abord**, de la **plus ancienne à la plus récente**.
2. **Legs ensuite**, imputés **concomitamment** sauf clause testamentaire d'imputation prioritaire.
3. ⚠️ La donation **n'ayant pas date certaine** (don manuel non enregistré, donation indirecte) s'impute **après toutes les autres donations et avant les legs** (Cass. civ. 1, 12 nov. 1998, n° 96-19814).

## 8.7. Étape 6 — Réduction, rapport, détermination des droits

Voir chapitres 9 et 10, puis :
> **Masse à partager = actif net + indemnités de rapport s'imputant sur la quotité disponible**

Deux correctifs à l'égalité des lots : l'**attribution préférentielle** et la **conversion de l'usufruit du conjoint**.

## 8.8. Quand le notaire est-il obligatoire ?

**Non nécessaire** si : pas de testament, ni donation, ni contrat de mariage, ni bien immobilier, et défunt + héritiers de nationalité française → certificat d'hérédité suffisant.

**Obligatoire** dès qu'il y a (source : Frais de notaire — Succession) :
- au moins un **bien immobilier** ;
- un montant de succession **≥ 5 000 €** ;
- un **testament** ou une **donation entre époux** ;
- une **donation** ou **donation-partage** consentie du vivant du défunt.

**Actes principaux** : acte de notoriété · acte d'option du conjoint · attestation de propriété immobilière · déclaration de succession. **Actes complémentaires** : dépôt de testament, inventaire (et clôture), dépôt d'ordonnance d'envoi en possession, délivrance de legs, actes de liquidation et de partage.

---

# 9. Le rapport des libéralités

**Finalité** : assurer **l'égalité entre héritiers de même rang** (C. civ. art. 843 à 863). ⚠️ **Ce n'est pas d'ordre public** — le disposant peut y déroger.

**Moment** : le rapport a lieu **au moment du partage** (alors que la réserve se calcule au jour du décès).

## 9.1. Principe

> **Masse à partager = biens existants + biens donnés en avancement de part successorale** (sauf donation-partage)

Chaque héritier reçoit sa quote-part de ce total, **diminuée de ce qu'il a déjà reçu**.

## 9.2. Débiteurs et créanciers

| Personne | Doit le rapport ? |
|---|---|
| **Héritiers** *ab intestat* (tous, quelle que soit leur qualité — y compris frères et sœurs) | **Oui** (art. 857) |
| **Légataires** | Non — et l'héritier ne doit **jamais** le rapport à un légataire (art. 857) |
| **Conjoint survivant** | **Non** (seul de son rang). Il **bénéficie indirectement** du rapport des autres, qui augmente la masse de calcul de ses droits (art. 758-5) |
| **Héritier renonçant** | Non par principe (devenu tiers) — **sauf** (a) stipulation expresse dans l'acte de donation, (b) s'il laisse des descendants qui le représentent. Le rapport se fait alors **en valeur** ; l'excédent par rapport aux droits qu'il aurait eus donne lieu à indemnisation (art. 845) |
| **Donataire non héritier présomptif au jour de la donation** devenu successible ensuite | **Non**, sauf stipulation expresse. Ex. : donation au petit-enfant du vivant de son parent, même si celui-ci décède ensuite |

⚠️ Le rapport n'est dû **que s'il y a plusieurs héritiers**, même s'ils ont tous été gratifiés.
⚠️ En présence d'enfants du défunt, ceux-ci excluent les petits-enfants du rapport (Cass. civ. 1, 8 mars 2017, n° 16-10384).

## 9.3. Libéralités rapportables (sauf stipulation contraire)

- Donation notariée (hors donation-partage)
- **Don manuel** — qu'il soit déclaré ou non à l'administration, **y compris les « dons familiaux de sommes d'argent »**
- Donation indirecte, donation déguisée
- Legs stipulé rapportable

## 9.4. Avantages **non** rapportables

- Donation **expressément dispensée de rapport** (hors part successorale)
  > ⚠️ La dispense peut être **tacite** dans des circonstances de fait spécifiques (Cass. civ. 1 : sommes issues d'un contrat d'assurance-vie réparties inégalement entre les enfants avec lettre manuscrite explicitant l'intention)
- **Donation-partage**
- **Présents d'usage** (art. 852 — voir ch. 13)
- Frais de nourriture, entretien, éducation, apprentissage, frais ordinaires d'équipement, frais de noces (art. 852)
- **Fruits et revenus des biens donnés** avant l'ouverture de la succession (art. 856) — ⚠️ mais ils **sont dus à compter de l'ouverture de la succession et jusqu'au partage** (d'où l'intérêt de partager rapidement)

## 9.5. Le rapport des dettes (art. 864 et s.)

L'héritier (ou toute personne participant au partage) débiteur du défunt ou de l'indivision paie **par compensation avec sa part**. La dette figure à **l'actif** successoral (créance de la succession).
⚠️ Seules les dettes **non prescrites** au jour de l'ouverture peuvent être rapportées.
Avantage : les cohéritiers sont protégés contre l'insolvabilité du débiteur.
Charge de la preuve : il incombe au copartageant de prouver le remboursement ou l'extinction de l'obligation (C. civ. art. 1353 ; Cass. civ. 12 fév. 2020, n° 18-23573).

## 9.6. Valeurs à retenir

> **Valeur au jour du PARTAGE, selon l'état au jour de la libéralité, déduction faite des dettes et charges.**

⚠️ **Différence fondamentale avec la réunion fictive** (valeur au jour du **décès**). C'est la source la plus fréquente d'erreur de modélisation.

⚠️ **La charge grevant une donation n'est pas réévaluée** au jour du partage : son montant est déterminé **au jour de son exécution** (Cass. civ. 1, 16 nov. 2022, n° 21-11837).
⚠️ Un bien donné cesse d'être grevé du bail dont il faisait l'objet par l'effet de la donation (Cass. civ. 1, 21 oct. 2015, n° 14-24926).

## 9.7. Exécution du rapport

### Principe : le rapport **en valeur**, « en moins prenant » (art. 858)
Le donataire **conserve le bien** et prend d'autant **moins de biens** dans la succession. En cas de dépassement, il verse une **indemnité de rapport** (soulte), en principe exigible au partage (date d'exigibilité reportable dans l'acte de partage).

⚠️ **Une donation peut être à la fois rapportable et réductible.** Dans ce cas, on effectue d'abord la réduction, puis le rapport (voir l'exemple récapitulatif § 9.9.3).

### Exception : le rapport **en nature**
Trois cas :
1. **La donation le prévoit** (art. 858) — ⚠️ les aliénations et droits réels consentis par le donataire s'éteignent par l'effet du rapport, sauf consentement du donateur. Le tiers acquéreur devrait donc restituer le bien !
2. **Le donataire le demande au moment du partage** (art. 859), à condition que le bien lui appartienne encore et soit libre de toute charge/occupation non existante à l'époque de la donation.
3. **Le donataire a renoncé à la succession** alors que l'acte prévoyait le rapport même en cas de renonciation (art. 845 et 858).

**Effets du rapport en nature** :
- Améliorations du fait du donataire → indemnité **égale à la plus-value procurée** (et non au remboursement des dépenses) — art. 861 ;
- Dépenses **nécessaires** de conservation → remboursées ;
- Dépenses d'**entretien** → **non remboursables** (charge des fruits) ;
- Dégradations/détériorations du fait ou de la faute du donataire → **indemnité due** (art. 863).

## 9.8. Aménagements conventionnels (art. 860 al. 3)

### Clause de **rapport forfaitaire** (art. 860 al. 4)
Rapport imposé pour un montant forfaitaire fixé dans l'acte (généralement la valeur au jour de la donation).
⚙️ **Si la valeur réelle au décès excède le forfait, la différence constitue un avantage hors part successorale imputable sur la QD.**
> Ex. : maison donnée 100 000 €, rapport forfaitaire de 100 000 €, valeur au partage 120 000 € → imputer **100 000 € sur la réserve** d'Aurélien et **20 000 € sur la QD**.

### Clause modifiant la **date d'évaluation**
Le donateur peut imposer l'évaluation au jour du **décès** plutôt qu'au partage (Cass. civ. 1, 17 nov. 2010, n° 09-13213).

## 9.9. Exemples chiffrés de référence

### 9.9.1. Rapport simple
> Marie, 3 enfants. Donation en avancement de part à Aurélien : 180 000 € → valeur 200 000 € au décès et au partage. Patrimoine successoral : 700 000 €.
> - Masse de calcul : 900 000 € ; réserve globale 3/4 = 675 000 € ; réserve individuelle = QD = **225 000 €**.
> - Imputation : 200 000 € sur la réserve d'Aurélien (225 000 €) → **pas de réduction**.

### 9.9.2. Indemnité de rapport due
> Même cas, appartement valant **500 000 €** au partage.
> - Masse de calcul : 1 200 000 € ; réserve globale 900 000 € ; réserve individuelle = QD = 300 000 €.
> - Imputation : 300 000 € sur la réserve, 200 000 € sur la QD (non dépassée) → **pas de réduction**.
> - Masse à partager : 1 200 000 € ; part de chacun : **400 000 €**.
> - Aurélien reçoit son rapport (500 000 €) > 400 000 € → **indemnité de rapport de 100 000 €**. Il ne reçoit rien dans la succession et verse 100 000 €.

### 9.9.3. Rapport + réduction combinés
> Marie, 2 enfants. Donation en avancement de part à Aurélien : maison valant **900 000 €** au décès et au partage. Patrimoine successoral : 300 000 €.
> - Masse de calcul : 1 200 000 € ; réserve globale 2/3 = 800 000 € ; réserve individuelle = QD = **400 000 €**.
> - Imputation : 400 000 € sur la réserve d'Aurélien + 400 000 € sur la QD → **excédent de 100 000 € réductible**.
> - Masse à partager : 900 000 (rapport) + 300 000 = **1 200 000 €** ; part de chacun : 600 000 €.
> - Aurélien : rapport 900 000 € → **indemnité de rapport de 300 000 €**.
> - Blandine : 300 000 € (biens existants) + 300 000 € (indemnité) = **600 000 €**.
> ⚙️ **Règle à retenir** : seul le montant du **rapport** figure dans la masse à partager, car il **recouvre déjà** le montant de l'indemnité de réduction.

### 9.9.4. Rapport + réduction avec libéralité hors part
> Marie, 2 enfants. Donation à Aurélien **en avancement de part** : 180 000 € → 300 000 € au décès, 350 000 € au partage. Donation à Blandine **hors part** : 150 000 € → 175 000 € au décès, 250 000 € au partage. Biens existants : 125 000 € au décès, 50 000 € au partage.
> - Masse de calcul : 300 000 + 175 000 + 125 000 = **600 000 €** ; réserve globale 400 000 € ; réserve individuelle = QD = **200 000 €**.
> - Imputation (de la plus ancienne à la plus récente) : Aurélien 200 000 € sur sa réserve + 100 000 € sur la QD ; Blandine (hors part) s'impute sur le reliquat de QD (100 000 €) → excédent **75 000 €** réductible.
> - **Réévaluation de l'indemnité de réduction au jour du partage** : 250 000 × 75 000 / 175 000 = **107 143 €**.
> - Masse à partager : 50 000 + 350 000 + 107 143 = **507 143 €** ; part de chacun : 253 571,50 €.
> - Aurélien : rapport 350 000 € → **indemnité de rapport de 96 428,50 €**.

## 9.10. Fiscalité du rapport

- Le **rapport civil n'est pas taxé** en lui-même.
- Mais la **déclaration fiscale de succession doit en tenir compte**, **même si les donations ont plus de 15 ans** et ne sont pas rappelées fiscalement.
- Mécanisme : on **ajoute** le montant du rapport à l'actif net taxable pour obtenir la part successorale de chaque héritier, puis on **déduit** le rapport de la part taxable de l'héritier qui en est redevable.
- ⚠️ Ce sont les **valeurs retenues pour le rapport** qui s'appliquent (et non celles au jour du partage, pour la liquidation fiscale).

---

# 10. La réduction des libéralités excessives

**Finalité** : protéger la **réserve héréditaire** (C. civ. art. 918 à 930-5).

## 10.1. L'action en réduction (art. 920 et s.)

| Point | Règle |
|---|---|
| **Titulaires** | Les héritiers réservataires ; **le cessionnaire** de droits successifs en qualité d'ayant cause (Cass. civ. 1, 25 oct. 2017, n° 16-20156) |
| **Caractère** | **Facultative** — les réservataires peuvent ne pas l'exercer |
| **Forme** | Aucun formalisme ; saisine du juge seulement en cas de litige (Cass. civ. 1, 10 janv. 2018, n° 16-27894) |
| **Prescription** (art. 921) | **5 ans** à compter de l'ouverture de la succession **OU** **2 ans** à compter de la connaissance de l'atteinte — dans une **limite absolue de 10 ans** depuis le décès |
| **Information** | Depuis le **1ᵉʳ novembre 2021**, obligation du notaire d'informer les réservataires de leur droit d'agir en réduction |

⚙️ **Lecture du délai** : les deux délais se combinent, le second **proroge** le premier. Un héritier informé 1 an après l'ouverture dispose quand même des 5 ans depuis le décès.

## 10.2. Ordre de réduction (art. 927)

⚙️ **Séquence impérative** :

> **① On réduit d'abord LES LEGS**
> — tous **simultanément et proportionnellement**, sans distinction entre legs universels et legs particuliers.
> — ⚠️ **Les donations entre époux (DDV) sont assimilées à des legs** et réduites **concurremment** avec eux.
> — **Exception** : le legs déclaré par le testateur devoir être acquitté **par préférence** n'est réduit qu'**après** les autres (clause d'imputation prioritaire — art. 927).
>
> **② Si la réserve n'est toujours pas reconstituée, on réduit LES DONATIONS**
> — dans l'ordre **de la plus RÉCENTE à la plus ANCIENNE**.
> — *(Corollaire : on les impute de la plus ancienne à la plus récente. Plus une donation est ancienne, moins elle risque d'être réduite.)*

⚠️ **Cas de la DDV** : consentie **pendant le mariage** → traitée comme un **legs**. Consentie **dans le contrat de mariage** → traitée comme une **donation** consentie au jour du contrat.

## 10.3. Modalités de la réduction

### Principe : réduction **en valeur** (art. 924)
Le gratifié verse une **indemnité de réduction** à concurrence de la portion excessive (ou prend moins de biens dans la succession, si possible). Cass. civ. 1, 22 mars 2017, n° 16-15484.

### Exception : règlement **en nature** (art. 924-4)
Possible lorsque le bien appartient encore au gratifié, **libre de toute charge supplémentaire** à celles existant lors de la libéralité et de toute occupation dont il n'aurait pas fait l'objet à cette date.

⚠️ Si le bien a été aliéné : consentement des réservataires requis, soit par anticipation dans la donation d'origine (le plus prudent), soit postérieurement (dans l'acte de vente) — art. 924-4 al. 2.

### Cas de la charge grevant la réserve
La réserve doit être délivrée **libre de toute charge**, exempte de restrictions ou conditions (art. 912) — sauf l'usufruit du conjoint. Une charge portant sur la réserve est **elle aussi réduite**, ce qui peut aller jusqu'à la suppression totale de la charge.

## 10.4. Réévaluation de l'indemnité de réduction (art. 924-2)

⚙️ **Double date** :
> - L'indemnité est **déterminée au jour du DÉCÈS** ;
> - Elle doit être **RÉÉVALUÉE au jour du PARTAGE**, en fonction de l'évolution de valeur de la libéralité réduite entre le décès et le partage — car elle est ajoutée à la masse à partager.

Formule pratique (tirée de l'exemple § 9.9.4) :
> `Indemnité réévaluée = Valeur au partage × (Indemnité au décès / Valeur au décès)`

À défaut de partage, l'indemnité est évaluée **au jour de sa liquidation en vue du paiement** (Cass. civ. 1, 22 juin 2022, n° 21-10570 ; voir aussi Cass. civ. 1, 4 nov. 2020, n° 19-10179).

## 10.5. Renonciation à l'action en réduction

### 10.5.1. Après le décès
Renonciation **expresse ou tacite**, sans formalisme particulier.
⚠️ **Ce n'est pas une renonciation à la succession.**
Si elle porte sur des droits immobiliers, publicité au service de la publicité foncière (D. 4 janv. 1955 art. 28).

### 10.5.2. Renonciation ANTICIPÉE — la RAAR (art. 929 à 930-5)

Exception à la prohibition des pactes sur succession future. L'héritier s'engage à ne pas remettre en cause une libéralité qui entamerait sa réserve.

| Point | Règle |
|---|---|
| **Qui** | Héritier **présomptif ET réservataire au moment de la signature** : enfant, ou conjoint (réservataire à défaut de descendants) |
| **Capacité** | Celle requise pour **donner** (art. 930-1) |
| **Mineur** | **Impossible**, émancipé ou non (art. 903 et 930-1) |
| **Forme** | **Acte authentique spécifique reçu par DEUX notaires** (art. 930 al. 1). ⚠️ Ne peut **pas** figurer dans un autre acte (donation…) |
| **Mentions** | Identité du ou des bénéficiaires ; mention des conséquences juridiques futures ; signature du futur défunt et de chaque renonçant (signature séparée) |
| **Engagement** | Le renonçant est engagé **à compter de l'acceptation par le disposant** (dans l'acte ou par acte séparé) — art. 929 |
| **Contrepartie** | Le disposant peut prévoir une contrepartie ou des conditions (art. 929 al. 3), sans que la RAAR soit une libéralité du renonçant (art. 930-1 al. 2) |
| **Nullité** | Formalités non respectées, ou vice du consentement (erreur, dol, violence) — art. 930 al. 2 |
| **Portée** | **Opposable aux représentants** du renonçant. Le renonçant **conserve la qualité d'héritier** et son option successorale ; il **reste comptabilisé** dans le nombre d'enfants |
| **Fiscalité** | **Pas une libéralité → pas de DMTG** (CGI art. 756 bis ; BOI-ENR-DMTG-10-20-50-20 § 10) |
| **Coût** | Enregistrement dans le mois : **droit fixe 125 €**. Émolument fixe : **153,85 € HT / 184,62 € TTC** (+ honoraires libres de consultation avec convention écrite) |

**Cas d'usage** : protection d'un **enfant handicapé ou vulnérable** ; transmission d'entreprise ; stabilisation d'une libéralité importante.

## 10.6. Fiscalité de la réduction

- L'**indemnité de réduction est un actif successoral taxable** aux droits de succession (elle compose ou complète la réserve) — Doc. adm. DGI 7 G 2322 § 3.
- Les **droits d'enregistrement** perçus sur la partie réduite d'une libéralité sont **restitués** (BOI-ENR-DG-70-20 § 70).
- Dans le partage, l'indemnité de réduction entre dans la **masse à partager** → soumise au **droit de partage de 2,5 %** (BOI-ENR-PTG-10-10 § 160).
- ⚠️ Si les réservataires **décident de ne pas exercer** l'action, l'administration **doit se conformer à leur volonté** et ne peut pas opérer la réduction pour le calcul des droits (BOI-ENR-DMTG-10-10-10-10 § 220).

---

# 11. L'action en retranchement (enfants non communs)

**Définition** : sous-catégorie de l'action en réduction (art. 920 et s.), permettant aux enfants **non communs** de faire réduire les **avantages matrimoniaux** excessifs conférés au conjoint survivant (art. 1527). Elle s'exerce **en valeur** (Cass. civ. 1, 7 déc. 2016, n° 16-12216).

## 11.1. Qui peut agir

**Tout enfant non commun au défunt et au conjoint survivant** — ⚠️ pas seulement les enfants d'un précédent mariage. Sont également concernés les enfants **représentés** (petits-enfants).

## 11.2. Régimes concernés

Un **avantage matrimonial** confère à un époux, **sur un bien commun**, plus que ce que le régime légal lui accorderait. Il ne porte **que sur les biens communs** (jamais sur les propres ni les personnels). Régimes visés :
- communauté de meubles et acquêts ;
- communauté réduite aux acquêts ;
- communauté universelle ;
- attribution intégrale ;
- **séparation de biens avec société d'acquêts**.

⚠️ Preuve requise du préjudice pour l'enfant non commun (Cass. civ. 1, 27 mars 2007, n° 06-12295).

## 11.3. Ce qui n'est **pas** un avantage matrimonial retranchable

- **Faculté de prélèvement moyennant indemnité** (art. 1511 et s.) — le conjoint indemnise la succession ; s'analyse en une opération de partage (Cass. civ. 1, 19 nov. 1991, n° 90-14216) ;
- **Faculté d'attribution ou d'acquisition** (art. 1390 et s.) — l'attribution s'impute sur la part successorale du survivant.

## 11.4. Délai
M�me régime que l'action en réduction (art. 921 dernier alinéa) : **5 ans** du décès **OU** **2 ans** de la connaissance, **maximum 10 ans**.

## 11.5. Fiscalité
- La part reçue par le conjoint au titre de l'avantage matrimonial **n'est pas taxée aux DMTG**.
- La part **retranchée** qui échoit aux enfants ayant intenté l'action **est taxable** entre leurs mains aux droits de succession de droit commun.
- ⚠️ Position ancienne de l'administration (taxation du seul fait de la présence d'enfants non communs, même en cas de renonciation à agir) **écartée** par Cass. civ. 1, 6 mai 1997, n° 95-13804.

## 11.6. Renonciation anticipée (art. 1527 al. 3)

Les enfants non communs peuvent renoncer **avant le décès du conjoint survivant**, dans les formes des art. 929 à 930-1 (celles de la RAAR).

⚠️ **Différence majeure avec la RAAR** : la renonciation est **TEMPORAIRE**. L'action est simplement irrecevable **du vivant de l'époux survivant** ; elle **redevient possible à son décès**, contre ses héritiers.

**Garanties offertes au renonçant** (art. 1527 al. 3) :
- droit d'exiger un **inventaire des meubles** et un **état des immeubles** formant l'assiette de l'avantage matrimonial, **même si le prémourant en avait dispensé** le conjoint ;
- **privilège de plein droit sur les meubles** (art. 2374-3°), inscriptible sur les immeubles recueillis.

**Date** : l'art. 1527 n'évoque que la renonciation avant le décès du beau-parent, mais le renvoi à l'art. 929 (succession non ouverte, acceptation par celui dont on a vocation à hériter) conduit à considérer que la renonciation ne peut intervenir **qu'avant le décès du propre parent** de l'enfant non commun.

**Fiscalité** : par analogie avec l'art. 756 bis du CGI, **pas de DMTG**.

---

# 12. Testament et legs

## 12.1. Conditions de validité

### 12.1.1. Un écrit
Obligatoire. Peu importe le rédacteur matériel : seule compte la volonté exprimée et réfléchie du testateur. ⚠️ **Un testament verbal est nul**, même devant témoins ou enregistré.

- **Dépôt chez un notaire** : obligatoire **après le décès** pour tout testament olographe découvert. Le notaire dresse un procès-verbal d'ouverture, d'état et de circonstances du dépôt.
- **Fichier central des dispositions de dernières volontés (FCDDV)** : inscription **obligatoire** pour le testament authentique, **facultative** pour les autres (inscrits sauf opposition du testateur). ⚠️ Le notaire chargé d'une succession **doit** le consulter, à peine d'engager sa responsabilité professionnelle.
- **Perte du testament** : le légataire présumé doit prouver (a) qu'un testament régulier a été rédigé, (b) que la perte ou la destruction résulte d'un **cas de force majeure**. ⚠️ Une **photocopie ne suffit pas** (CA Lyon, 7 nov. 2023, n° 21/08185).

### 12.1.2. Un testateur unique
Le **testament conjonctif est nul** (art. 968) — même entre époux ou partenaires de PACS, afin de préserver la libre révocabilité. Restent valables les testaments **distincts**, contenus dans deux textes séparés, même faits l'un en fonction de l'autre.

### 12.1.3. Capacité de disposer

| Situation | Règle |
|---|---|
| Mineur **< 16 ans** non émancipé | **Aucune** disposition à titre gratuit (art. 903) |
| Mineur **> 16 ans** non émancipé | Peut disposer de **la moitié** de ses biens (art. 904) |
| Mineur **émancipé** | Testament libre |
| Tutelle | Testament antérieur à l'ouverture de la tutelle reste valable, **sauf** si la cause déterminante a disparu depuis (art. 476 al. 3 et 4) |

**Consentement** (art. 901) : « Pour faire une libéralité, il faut être **sain d'esprit**. La libéralité est nulle lorsque le consentement a été vicié par l'erreur, le dol ou la violence. » L'action en nullité pour insanité d'esprit ne peut être introduite par les héritiers **qu'à compter du décès**.

### 12.1.4. Capacité de **recevoir** (acceptation d'un legs)

| Bénéficiaire | Legs **sans** charge | Legs **avec** charges |
|---|---|---|
| Mineur non émancipé | Administrateur légal (un seul parent suffit) | Administrateur légal ; ⚠️ **accord des deux parents** requis en leur présence, à défaut autorisation du juge |
| **Curatelle** | Personne protégée **seule** | Personne protégée **assistée du curateur** (art. 467) |
| **Tutelle** | **Tuteur seul** (art. 504) | Autorisation du juge ou du conseil de famille (art. 505) |
| **Mandat de protection future** | Mandataire seul (art. 493 al. 1) | SSP → autorisation du juge (art. 493 al. 2) ; **acte notarié → mandataire seul** (art. 490 al. 1) |
| **Habilitation familiale** | Personne habilitée seule (art. 494-6 al. 3) | Autorisation du juge (art. 494-6 al. 5) |

⚠️ Pour recevoir, il faut au minimum **être conçu au moment du décès** du testateur (art. 906 al. 1) et **naître viable**.

**Incapacités fondées sur la présomption de captation** : médecins, officiers de santé, pharmaciens ayant prodigué des soins pendant la maladie dont le testateur est décédé (et professions assimilées). Interdiction applicable aux testaments conclus à compter de l'entrée en vigueur du texte (QPC 12 mars 2021, n° 2020-888 ; Cass. civ. 1, 23 mars 2022, n° 20-17663).

**Legs à une association / fondation** : seules certaines peuvent recevoir legs et donations (toutes peuvent recevoir des dons manuels) — associations reconnues d'utilité publique notamment (loi 1901 art. 6 et 11). ⚠️ **Désignation précise obligatoire** : une association insuffisamment déterminée ne peut revendiquer la libéralité, même si son objet correspond aux volontés (CA Bordeaux, 20 fév. 2012). La substitution d'une confédération à l'association désignée a été rejetée malgré un lien d'affiliation (Cass. civ. 1, 14 avr. 2021, n° 19-19.306). *Conseil : désigner en second la Fondation de France pour éviter la déshérence.*

### 12.1.5. Sanction des vices de forme
**Nullité absolue** ; toute personne intéressée peut agir. Certaines irrégularités échappent à la sanction (ex. : une reconnaissance d'enfant naturel faite dans un testament conjonctif authentique reste valable, la reconnaissance devant seulement être faite par acte authentique).

## 12.2. Contenu

### 12.2.1. Les legs
Trois catégories : **legs universel**, **legs à titre universel**, **legs à titre particulier**.
Nouveauté : le testateur peut désormais **imposer aux héritiers de vendre certains biens** de la succession — **même s'ils composent la réserve** — pour se partager le prix de cession.

⚠️ Prévoir un **légataire de second rang** au cas où le légataire universel prédécéderait.

### 12.2.2. Exhérédation
Clause d'exhérédation valable sous 3 conditions :
- porter **uniquement sur la quotité disponible** ;
- ne pas empêcher l'héritier réservataire de recevoir sa réserve ;
- (clause conditionnelle) elle prive de tout ou partie de la succession l'héritier n'accomplissant pas la condition imposée ; elle est acquise après le décès.

⚠️ Est **réputée non écrite** la clause pénale privant du bénéfice de la succession l'héritier qui saisit le tribunal : atteinte excessive au droit absolu de tout indivisaire de demander le partage (Cass. civ. 1, 13 avr. 2016, n° 15-13312).

### 12.2.3. Dispositions extra-patrimoniales
Reconnaissance d'enfant, sort du corps, don d'organes, souhaits éducatifs, devenir des animaux… **Un testament ne contenant que des dispositions extrapatrimoniales est valable.**

### 12.2.4. L'exécuteur testamentaire

| Point | Règle |
|---|---|
| Désignation | Par testament ou par acte séparé (manuscrit, daté, signé). Plusieurs exécuteurs possibles, avec tâches distinctes ou de rang subsidiaire |
| **Durée** | **2 ans maximum** depuis le 1ᵉʳ janvier 2007 ; **prorogeable d'un an** par le juge |
| Acceptation | Libre de refuser, mais **tenu d'accomplir la mission une fois acceptée**. Désignation personnelle : **non transmissible** à un tiers |
| Missions | Veiller à l'exécution des volontés ; mesures conservatoires ; inventaire. **Exécuteur simplement désigné** : mission de surveillance et de conseil, sans pouvoir d'appréhender, conserver ou administrer les biens. **Exécuteur mandataire** : agit au nom du défunt |
| Rémunération | **Aucune**. Possible libéralité à titre particulier (« legs du diamant »). Charges et frais à la charge de la succession |
| Responsabilité | Celle d'un **mandataire à titre gratuit** |
| Fin | Terme prévu ; exécution complète ; destitution judiciaire pour motifs graves. **Reddition de comptes dans les 6 mois** de la fin de mission (obligation transmise à ses héritiers s'il décède). Pouvoirs **non transmissibles à cause de mort** |

## 12.3. Le testament-partage (art. 1075 et s.)

| Point | Règle |
|---|---|
| **Forme** | L'une des trois formes testamentaires (olographe, authentique, mystique). ⚠️ Deux époux ne peuvent pas le faire dans un même acte (prohibition du testament conjonctif) |
| **Bénéficiaires** | Héritiers présomptifs ; descendants de degrés différents, présomptifs ou non (**testament-partage transgénérationnel**) — art. 1075 et 1075-1. ⚠️ Ne peut pas bénéficier à un tiers (contrairement à la donation-partage d'entreprise, art. 1075-2) |
| **Biens** | Biens présents et à venir, tout ou partie. Les biens non compris sont dévolus et partagés selon les règles *ab intestat* (art. 1075-5) |
| **Donations antérieures** | Les donations **en avancement de part** peuvent y être incorporées. ⚠️ **Pas** les donations **hors part** (irrévocabilité ; pas de dérogation équivalente aux art. 1078-1 et 1078-2 applicables à la donation-partage) |
| **Biens communs** | Le legs ne peut excéder la part de communauté (art. 1423). Le légataire ne peut réclamer le bien en nature que s'il tombe, par l'effet du partage, dans le lot des héritiers du testateur — sinon en valeur. Un testament-partage sur des **biens indivis** reste possible (Cass. civ. 10 mai 2007, n° 05-11583) |
| **Allotissement** | Obligatoire, mais **tous les héritiers présomptifs n'ont pas à être allotis**. Peut être **inégalitaire** dans la limite de la réserve (il gratifie autant qu'il partage) |

**Effets**
- *Du vivant du testateur* : **aucun effet**, révocable à tout moment. Le prédécès d'un copartagé rend caduques les dispositions le concernant, **sauf** s'il laisse des descendants (qui recueillent sa part).
- *Au décès* (art. 1079) : les copartagés sont lotis **en qualité d'héritiers, non de légataires**. Le testament-partage produit les **effets d'un partage** → ⚠️ **le copartagé ne peut pas décliner son lot pour réclamer un partage ordinaire**.

**Fiscalité** : droits de succession **+ droit de partage de 2,5 %**.

### Comparatif legs / testament-partage

| | Legs | Testament-partage |
|---|---|---|
| Renonciation | Le légataire peut renoncer et **redevenir héritier** *ab intestat* | La renonciation vaut **renonciation à la succession** |
| Solidarité fiscale | Les légataires **ne sont pas** solidaires du paiement des droits | Les copartagés sont héritiers → **solidaires** |
| Coût | — | Droit de partage **2,5 %** en sus |

**Avantages / inconvénients du testament-partage**
- ✓ Organise et **impose** la répartition ; évite l'indivision successorale et les conflits ; choisit les biens attribués à chacun.
- ✗ Pas de dessaisissement immédiat (contrairement à la donation-partage) ; pas de figement des valeurs ; les enfants ne peuvent pas consentir à ce que leurs propres enfants soient allotis à leur place ; gratification limitée à la QD.

## 12.4. Les formes de testament

### 12.4.1. Olographe (la plus utilisée)
**Trois conditions cumulatives** : écrit **en entier de la main** du testateur · **daté** · **signé** de sa main. Recommandé : numéroter et parapher chaque feuille.

- **L'écriture** : intégralement manuscrite, pour prévenir la falsification et l'erreur et garantir la réflexion (Cass. civ. 1, 14 janv. 2015, n° 13-28256). ⚠️ « Testament de l'illettré » (recopie d'un modèle préparé par un tiers) : **valable si le testateur sait lire**, nul pour vice de forme sinon.
- **La signature** : fonction d'identification et surtout **d'approbation** — marque le caractère définitif de la volonté. Jurisprudence souple sur la forme. ⚠️ Le paraphe et la signature doivent établir un lien avec le testament (CA Paris, 25 janv. 2024).
- **La date** : complète (jour, mois, année), exacte et manuscrite. Elle permet de vérifier la capacité au jour de la rédaction. ⚠️ Un testament non daté **peut être validé** par les juges au moyen d'éléments intrinsèques et extrinsèques (sanité d'esprit sur une période déterminée) — méthode également appliquée lorsque la date est inscrite par un tiers (Cass. civ. 23 mai 2024, n° 22-17127).
- **Conservation** : seule la production de **l'original** permet l'exécution (sauf destruction par cas fortuit/force majeure, prouvable par tous moyens). Le notaire dépositaire est tenu au **secret professionnel** : l'existence d'un testament ne peut être révélée du vivant du testateur.

| Avantages | Inconvénients |
|---|---|
| Peu coûteux (≈ moitié des honoraires d'un testament authentique) ; simple ; souple ; **totalement secret** ; facile à révoquer | Risque de **falsification, destruction, perte** ; contestation d'origine possible ; difficultés d'interprétation |

### 12.4.2. Authentique (art. 971 et 972)
Dicté à **un notaire en présence de deux témoins**, ou à **deux notaires**. Les témoins doivent comprendre le français et être majeurs ; ne peuvent l'être ni les légataires (à quelque titre que ce soit) ni leurs parents ou alliés jusqu'au 4ᵉ degré.

**Cinq étapes, à peine de nullité** :
1. **La dictée** — par la parole (le testateur peut lire un écrit). Seule la partie testamentaire proprement dite doit être dictée, en présence constante des témoins (Cass. civ. 1, 1ᵉʳ fév. 2012 ; 4 mars 2015).
2. **L'écriture** — par le notaire ou un clerc, manuscrite ou dactylographiée.
3. **La lecture** au testateur.
4. **La mention expresse** de l'accomplissement de ces formalités.
5. **La signature** du testateur, du notaire et des témoins.

**Situations particulières** (loi n° 2015-177 du 16 fév. 2015) : recours à un **interprète** si le testateur ne peut s'exprimer en français — sauf si le notaire et, selon le cas, l'autre notaire ou les témoins comprennent sa langue.

| Avantages | Inconvénients |
|---|---|
| Conservation assurée (rang des minutes) ; validité contrôlée par le notaire ; **grande force probante** (foi jusqu'à inscription de faux) ; pas d'envoi en possession ; pas de coût complémentaire au décès | Coût immédiat ; **perte du secret** (deux témoins, sauf deux notaires) ; lourdeur du formalisme |

⚠️ **Le testament authentique est le seul moyen d'écarter le droit viager au logement du conjoint.**

### 12.4.3. Mystique (art. 976 et 977) — rare
Deux phases :
- **Rédaction** (hors présence du notaire) : écrit par le testateur ou un tiers ; **pas de date obligatoire** mais **signature obligatoire** du testateur.
- **Suscription** : présentation au notaire et à deux témoins du document **clos, scellé et cacheté** ; le testateur déclare qui l'a écrit, qu'il s'agit de son testament signé par lui, et indique le mode d'écriture ; procès-verbal de suscription.

Convient à ceux qui ne savent ou ne peuvent écrire (mais doivent savoir signer) et qui craignent les indiscrétions. ⚠️ Le notaire **ne peut pas s'assurer de la validité** des dispositions.

### 12.4.4. Testaments privilégiés (art. 981 et s.)
Formes autorisées dans des circonstances exceptionnelles rendant le recours au notaire impossible : militaire ou marin isolé, personne située sur une île coupée du continent, etc. Validité **temporaire** — il est recommandé de refaire un testament de forme traditionnelle dès que possible.

## 12.5. Révocation

**Principe** (art. 895) : le testateur peut **toujours** révoquer ou modifier son testament, sans motif.

- **Portée** (art. 1035) : globale ou **partielle**. Art. 1036 : lorsqu'un testament n'annule pas expressément les précédents, **seules les dispositions contraires ou incompatibles sont annulées**. ⚠️ Source majeure de contentieux et de difficulté pour le liquidateur → recommander une **clause de révocation expresse des dispositions antérieures**.
- **Révocation expresse** : par un nouveau testament (**aucun parallélisme des formes requis** — un olographe peut révoquer un authentique) ou par acte notarié ordinaire portant déclaration de changement de volonté.
- **Révocation tacite** — causes **exhaustives** (Cass. civ. 1, 8 juill. 2015) :
  1. rédaction d'un nouveau testament aux dispositions incompatibles ;
  2. **aliénation du bien légué** (concerne les legs de biens certains, non ceux portant sur une catégorie de biens — Cass. civ. 1, 11 juill. 2006) ;
  3. **destruction volontaire** du testament par le testateur.
  ⚠️ Une **donation ne révoque pas** un testament.
- **Révocation judiciaire** (après décès, à la demande des héritiers) : vices du consentement (art. 901, preuve par tous moyens : contrainte, abus de faiblesse), incapacité, atteinte à la réserve (→ action en réduction).
- **Rétractation de la révocation** : annule rétroactivement la révocation ; le testament d'origine s'applique de nouveau — **uniquement si le testateur a clairement modifié sa volonté en ce sens** (Cass. civ. 1, 17 mai 2017, n° 16-17123).

## 12.6. Formalités au décès

| Cas | Dépôt / publicité au greffe | Envoi en possession | Délivrance de legs |
|---|---|---|---|
| **Légataire universel**, testament **olographe**, avec réservataire(s) | Oui (art. 1007) | Non | **Oui**, par le(s) réservataire(s) (art. 1004) * |
| **Légataire universel**, testament **olographe**, sans réservataire | Oui (art. 1007) | Saisine de plein droit depuis le 1ᵉʳ nov. 2017 (art. 1008 avant) | **Non** (art. 1006) |
| **Légataire universel**, testament **authentique** | Non | Non | Selon présence de réservataires |
| **Légataire à titre universel ou particulier**, testament olographe | Oui (art. 1007) | — | **Oui** — par le(s) réservataire(s), ou à défaut par le(s) légataire(s) universel(s) ou héritier(s) (art. 1011 et 1014) * |
| **Légataire à titre universel ou particulier**, testament authentique | Non | — | Oui |

\* Si le légataire n'est pas héritier saisi.

**Enregistrement** : les testaments reçus par notaire doivent être enregistrés dans les **3 mois du décès** — droit de **125 €** (loi n° 2020-1721 du 29 déc. 2020, art. 156). *(Formalité supprimée par la LF 2020, rétablie par la LF 2021.)*

## 12.7. Le cantonnement

Instauré par la **loi du 23 juin 2006** : le légataire peut **cantonner son legs** (le limiter à une partie des biens légués), **sauf volonté contraire du testateur**, lorsque la succession a été acceptée par au moins un héritier désigné par la loi.

⚠️ **Limite** : le conjoint légataire **ne peut pas modifier la nature de ses droits** — il ne peut pas ramener à un usufruit des droits qui lui étaient offerts en pleine propriété.

## 12.8. Contestation du testament

- Le légataire (autre qu'universel), en l'absence de réservataires et ayant obtenu une ordonnance d'envoi en possession, doit prouver **la véracité de l'écriture et de la signature** contre l'héritier.
- ⚠️ Point de départ de la prescription de l'action en revendication des biens : **jamais antérieur au jour du prononcé de la nullité du testament** (Cass. civ. 1, 13 juill. 2022, n° 2020738).

---

# 13. Le présent d'usage

## 13.1. Définition (C. civ. art. 852)

> « Les frais de nourriture, d'entretien, d'éducation, d'apprentissage, les frais ordinaires d'équipement, ceux de noces et **les présents d'usage** ne doivent pas être rapportés, sauf volonté contraire du disposant.
> Le caractère de présent d'usage s'apprécie **à la date où il est consenti** et **compte tenu de la fortune du disposant**. »

## 13.2. Les 4 conditions cumulatives

1. **Tradition** : remise manuelle de la chose, « de la main à la main ».
2. **Bien meuble uniquement** : mobilier, véhicule, bijoux, objets d'art, espèces, chèques, virements, bons de caisse, valeurs mobilières, actions de sociétés…
3. **Occasion / usage** : événement particulier de la vie (anniversaire, mariage, naissance, réussite d'un examen, Noël…).
4. **Valeur non excessive** : **aucun seuil légal, ni pourcentage**. Le présent ne doit pas être excessif au regard de la situation financière, du train de vie, du patrimoine, des ressources et des habitudes du donateur — en clair, il **ne doit pas « appauvrir » le donateur**.

⚙️ **Appréciation à la date du présent** — pas au décès. Et **relative** : ce qui est un présent d'usage pour l'un ne l'est pas pour l'autre.

⚠️ Si une seule condition manque, la qualification bascule en **don manuel**, avec toutes ses conséquences.

## 13.3. Conséquences

| | Présent d'usage | Don manuel |
|---|---|---|
| Rapport à la succession | **Non** (sauf volonté contraire) | Oui |
| Réduction | **Non** — exclu de la masse de calcul de la réserve et de la QD | Oui |
| DMTG | **Non soumis** | Oui |
| **Rappel fiscal des donations** au décès | **Non soumis** | Oui (15 ans) |

La qualification fiscale s'appuie sur la **qualification de droit privé**. Le caractère de présent d'usage est généralement reconnu aux cadeaux faits aux **enfants mineurs** par des membres et amis de la famille (RM Chartier, 17 janv. 2006 ; rescrit du 3 avr. 2013 ; BOI-ENR-DMTG-20-10-20-10 § 250 et 260 — appréciation au vu de **l'ensemble des circonstances de fait**, sous le contrôle souverain des juges du fond).

## 13.4. Jurisprudence

**Reconnus** :
- Chèques offerts par une mère à ses enfants pour Noël : 200 000 F pour un patrimoine de 8 200 000 F (**≈ 2,4 %**) — CA Paris, 11 avr. 2002, n° 2001/03791 ;
- Remise de huit aquarelles à l'occasion d'un mariage ;
- Bague offerte par un mari à son épouse à la naissance de leur fille (Cass. civ. 1, 19 nov. 2014, n° 13-26632).

**Non reconnus** :
- Chèque émis **deux mois après** l'anniversaire, d'un montant trop important au regard du patrimoine (CA Nîmes, 19 avr. 2011, n° 10/00067) ;
- Qualification retenue « sans préciser à l'occasion de quel événement et selon quel usage » (Cass. civ. 1, 25 sept. 2013, n° 12-17.556) ;
- Simples retraits (2 200 € et 1 300 €) non remis à l'occasion d'un événement ou usage particulier (Cass. civ. 1, 11 mai 2023) ;
- Chèque sans écrit attestant du motif, avec décalage temporel (CA Paris, 22 avr. 2024, n° 2212420).

## 13.5. Conseil pratique
**Se ménager la preuve au moment de l'événement** : relevé bancaire daté, ordre de virement à la date du mariage, facture, courrier d'accompagnement. La requalification en don manuel a des conséquences lourdes : rapport, réduction éventuelle, droits de donation et rappel fiscal.

---

# 14. La tontine (clause d'accroissement)

## 14.1. Définition
Pacte conclu **lors de l'acquisition** d'un bien entre au moins deux personnes, par lequel **seul le survivant de tous** sera considéré comme propriétaire de la totalité du bien **depuis la date d'acquisition**. Chaque acquéreur conserve la jouissance du bien sa vie durant.

⚠️ **Aucune disposition légale** ne régit la tontine en droit civil : régime issu de la doctrine et de la jurisprudence.

## 14.2. Constitution

- **Forme** : stipulée **dans l'acte d'acquisition** du bien. Elle **ne peut pas** constituer un pacte autonome, distinct et postérieur à l'acquisition.
- ⚠️ **Palliatif** : à défaut, constituer une **société** dont les statuts contiennent une tontine portant sur les parts sociales.
- **Personnes** : couples (époux, partenaires, concubins) le plus souvent, mais aussi frères et sœurs ou toute autre personne.
- **Époux communautaires** : la tontine, n'emportant pas aliénation au sens de l'art. 1424, **ne requiert pas le consentement du conjoint**. Si la tontine a été conclue avant le mariage (concubins), le mariage ultérieur ne la remet pas en cause.
- **Époux séparatistes** : acquisition conjointe avec tontine parfaitement valable (Cass. civ. 1, 3 fév. 1959 ; Cass. mixte 27 nov. 1970 ; Cass. civ. 1, 9 fév. 1994).

## 14.3. Nature juridique
- **Contrat aléatoire** : double condition résolutoire et suspensive → **ce n'est pas une libéralité**, donc **non rapportable** et **échappant à la réserve** (Cass. civ. 1, 14 déc. 2004).
- **Contrat à titre onéreux** (C. civ. art. 1104 al. 2).
- ⚠️ **Mais fiscalement taxée comme un acte à titre gratuit** (sauf exceptions, voir § 14.6).
- ⚠️ **En l'absence d'aléa**, la dépossession est réputée avoir eu lieu au moment de la signature de l'acte, non au décès (CADF/AC n° 4/2021, aff. n° 2021-08) → risque d'abus de droit.

## 14.4. Effets

| Période | Effets |
|---|---|
| **Du vivant des parties** | **Pas d'indivision** — il n'y aura jamais qu'un seul titulaire du droit de propriété. Chaque acquéreur n'est qu'un **propriétaire conditionnel**. Droits concurrents d'usage et d'administration ; **indemnité due** au cotitulaire par celui qui a la jouissance exclusive (Cass. civ. 3, 17 déc. 2013) |
| **Au décès** | L'achat est réputé fait au profit du dernier vivant ; le prémourant est **censé n'avoir jamais été propriétaire**. ⚙️ Point de départ de l'abattement pour durée de détention (PVI) : **la date d'acquisition initiale**, pour le prix payé en commun (BOI-RFPI-PVI-20-20 § 50) |

⚠️ **Impossibilité absolue de partage** : la tontine implique renonciation à toute demande en partage. Si les parties se brouillent et que l'une refuse de vendre, **la situation est bloquée jusqu'au décès de l'une d'elles**. C'est le principal inconvénient.

⚠️ **Insaisissabilité** : tant que la condition suspensive de survie n'est pas réalisée, le bien ne peut pas être saisi par les créanciers personnels d'un acquéreur (Cass. civ. 1, 18 nov. 1997 ; BOI-REC-FORCE-40-10 § 260).

## 14.5. Renonciation
Les parties peuvent renoncer à la tontine, **réduisant leurs rapports à une acquisition en indivision** — en général pour vendre le bien.
Fiscalité : **droit fixe des actes innommés**. Publicité foncière requise pour un immeuble.

## 14.6. Fiscalité au décès

### Principe : **droits de succession**
Transfert de propriété au bénéfice du survivant → taxé aux DMTD selon le lien de parenté. **Déclaration de succession obligatoire.**

> **Exemple de coût pour deux concubins** (bien de ~100 000 €) : abattement 1 594 €, taux 60 % → droits considérables (illustration source : total 34 088 €, soit **plus du tiers de la valeur du bien**).

⚠️ L'emprunt ayant financé l'acquisition en tontine **n'a pas la nature de passif successoral déductible** (art. 768 CGI ; Cass. com. 8 nov. 2005).

### Exceptions : **droits de vente**

| Cas | Régime |
|---|---|
| Tontines conclues **avant le 5 septembre 1979** (succession ouverte après la LF 1980) | Droits de vente (D. adm. 7 G-2121 n° 24) |
| Tontines **non prévues dans un contrat d'acquisition en commun** (notamment statuts de société) | Droits de vente — analysée comme une **cession de parts aux associés survivants** (RM Rufenacht, JOAN 8 sept. 1979 ; CA Chambéry, 18 nov. 2003) |
| **Habitation principale de valeur globale < 76 000 €** (CGI art. 754 al. 2) | Droits de vente — 4 conditions : bien acquis par **deux personnes seulement**, immeuble, affecté à l'**habitation principale** commune, valeur globale **< 76 000 €** |

### Publicité
Attestation immobilière au décès, publiée au service de la publicité foncière — sauf si l'origine de propriété visait déjà la formalité donnée à l'acquisition commune et faisait état du décès des autres coacquéreurs.
Cas particulier : acquisition sous TVA résiliée par la condition résolutoire (régime antérieur à la réforme de la TVA immobilière, a priori transposable).

### Libéralité déguisée
⚠️ Si l'acquisition en tontine a été **entièrement financée par un seul** des acquéreurs, il y a **don manuel préalable** → application des DMTG (ou des droits de mutation à titre onéreux selon le cas). Révélation généralement du fait de l'administration.

## 14.7. IFI
Biens, droits réels immobiliers ou titres de sociétés à prépondérance immobilière acquis en tontine : imposables **chez chaque tontinier proportionnellement aux sommes investies**, compte tenu du nombre de survivants.
*(Sous ISF, les sommes investies dans une tontine financière étaient exclues de la base imposable, étant bloquées jusqu'à la dissolution de l'association.)*

## 14.8. La tontine **financière** (association tontinière)

- Régie par C. ass. art. R. 322-139 à R. 322-159 — **n'est pas un contrat d'assurance-vie**.
- **Minimum 200 adhérents** (art. R. 322-145) ; un adhérent peut appartenir à plusieurs associations.
- Investissement en commun sur une durée déterminée à l'avance (**généralement 10 à 20 ans**) ; sortie **uniquement à la liquidation** de l'association.
- Au terme, les épargnants **survivants** se partagent l'actif (cotisations + revenus + plus/moins-values).
- ⚠️ **En cas de décès avant le terme, les cotisations profitent aux autres épargnants** — sauf souscription d'une **assurance décès** ou d'une **contre-assurance** (coût significatif ; répartition au prorata des sommes versées — art. R. 322-152).
- **Fiscalité** : au terme, régime des contrats d'assurance-vie / bons ou contrats de capitalisation (CGI art. 125-0 A). En cas de décès, si les capitaux ne relèvent pas de l'actif successoral, application des art. **990 I** ou **757 B** du CGI (BOI-TCAS-ASSUR-10-40-30-10 § 120).

## 14.9. Synthèse avantages / inconvénients

| Avantages | Inconvénients |
|---|---|
| Simple à mettre en place (clause dans l'acte) | **Blocage total** en cas de mésentente : ni partage, ni vente unilatérale |
| Bien insaisissable par les créanciers personnels | **Fiscalité très lourde** entre non-parents (60 %) |
| Échappe à la réserve héréditaire et aux règles des libéralités | Aléa requis, à peine de requalification |
| Protection efficace du concubin / partenaire | Peu d'intérêt pour des époux communautaires (les avantages matrimoniaux sont plus adaptés) |

---

# 15. Démembrement et évaluation des droits démembrés

## 15.1. Principe fondateur

> **Pleine propriété = Usufruit + Nue-propriété**

Deux méthodes de valorisation coexistent : **fiscale** (barème art. 669 CGI) et **économique** (actualisation des flux).

## 15.2. Le barème fiscal (CGI art. 669)

### 15.2.1. Usufruit viager

| Âge de l'usufruitier | Usufruit | Nue-propriété |
|---|---|---|
| Moins de 21 ans | **90 %** | 10 % |
| De 21 à 30 ans | **80 %** | 20 % |
| De 31 à 40 ans | **70 %** | 30 % |
| De 41 à 50 ans | **60 %** | 40 % |
| De 51 à 60 ans | **50 %** | 50 % |
| De 61 à 70 ans | **40 %** | 60 % |
| De 71 à 80 ans | **30 %** | 70 % |
| De 81 à 90 ans | **20 %** | 80 % |
| À partir de 91 ans | **10 %** | 90 % |

*(BOI-ENR-DMTG-10-40-10-50 § 30)*

⚙️ **Règle d'application** : on retient l'âge **révolu**, sans proratisation.
> 40 ans et 3 mois → **70 %** · 61 ans et 9 mois → **40 %**

⚙️ **Pluralité d'usufruitiers sur un même bien, sans stipulation de part** : on partage fictivement le bien en autant de parts qu'il y a d'usufruitiers, puis on applique le barème à chaque part (BOI-ENR-DMTG-10-40-10-50 § 50).
> Ex. : M. (75 ans) et Mme (64 ans) donnent la NP d'un bien commun de 600 000 €.
> — M. : US = 300 000 × 30 % = **90 000 €** ; NP = **210 000 €**
> — Mme : US = 300 000 × 40 % = **120 000 €** ; NP = **180 000 €**

⚙️ **Usufruit viager constitué au profit d'une personne morale** pour la durée de vie d'une personne physique : application de **l'art. 669, I** (âge de la personne physique), et **non** de l'art. 683 ni du taux de 23 % par décennie (CA Paris 13 sept. 2016, n° 13/13840 ; Cass. com. 26 sept. 2018, n° 16-26.503). Cette solution, rendue en matière de cession, est transposable à d'autres mutations (apport pur et simple, apport à titre onéreux).

### 15.2.2. Usufruit à durée fixe (temporaire) — CGI art. 669, II

> **23 % de la pleine propriété par période de 10 ans**, sans fraction et sans égard à l'âge de l'usufruitier.

⚠️ **Plafond impératif** : la valeur ne peut jamais excéder celle d'un usufruit **viager** calculé selon l'âge de l'usufruitier.
> Ex. : usufruit de 30 ans (23 % × 3 = 69 %) au profit d'une personne de 42 ans → plafonné à **60 %** (BOI-ENR-DMTG-10-40-10-50 § 70).

### 15.2.3. Droits d'usage et d'habitation (CGI art. 762 bis)

> **DUH = 60 % de la valeur de l'usufruit** déterminée selon l'art. 669.

S'applique à **tous** les droits d'usage et d'habitation, légaux ou conventionnels, et à toutes les mutations à titre gratuit (RM Dassault, Sénat 6 déc. 2007, n° 344). ⚠️ La jurisprudence retient parfois cette méthode y compris pour une évaluation économique (ex. prestation compensatoire : CA Douai, 27 nov. 2014).

### 15.2.4. Ancien barème (CGI ancien art. 762) — antérieur au 1ᵉʳ janvier 2004

| Usufruitier de moins de | Usufruit | Nue-propriété |
|---|---|---|
| 20 ans révolus | 7/10 | 3/10 |
| 30 ans révolus | 6/10 | 4/10 |
| 40 ans révolus | 5/10 | 5/10 |
| 50 ans révolus | 4/10 | 6/10 |
| 60 ans révolus | 3/10 | 7/10 |
| 70 ans révolus | 2/10 | 8/10 |
| Plus de 70 ans révolus | 1/10 | 9/10 |

Usufruit à durée fixe (ancien) : **2/10 par période de 10 ans**, sans fraction.
*(Jusqu'en 1901, l'usufruit était forfaitairement évalué à la moitié de la pleine propriété.)*

### 15.2.5. ⚠️ Cas particulier — Plafonnement à 100 %

Situation : nue-propriété **donnée avant le 1ᵉʳ janvier 2004** (barème 762) + renonciation à usufruit ou transmission de l'usufruit au conjoint **après le 1ᵉʳ janvier 2004** (barème 669).

L'addition des deux quotités taxables peut dépasser 100 % de la pleine propriété. Dans ce cas, **la quotité retenue lors de la renonciation à usufruit doit être plafonnée** pour que la somme n'excède pas 100 %.
> RM Biancheri, JOAN 28 mars 2006, n° 38802 · RM Bobe, JOAN 13 mars 2007, n° 111457 (le plafonnement porte sur la **quotité taxable résultant du barème**, quelle que soit la valeur vénale) · RM Lachaud, JOAN 26 oct. 2006, n° 102775 (applicable dès le 1ᵉʳ janvier 2004, avec possibilité de demandes en restitution).

## 15.3. L'évaluation économique

> **Valeur économique de l'usufruit = Σ Rₙ / (1+i)ⁿ**
> où **R** = revenu **net des charges usufructuaires**, **i** = taux de rendement du bien, **n** = durée théorique de l'usufruit.
> **Valeur de la nue-propriété = valeur de la pleine propriété − valeur de l'usufruit**

**Deux déterminants** :
1. **La durée**
   - *Usufruit à durée fixe* : connue. Si le bénéficiaire est une **personne morale** : durée certaine, **maximum 30 ans**. Si c'est une **personne physique**, l'usufruit prend fin à son décès même si le terme n'est pas échu.
   - *Usufruit viager* : durée estimée par l'**espérance de vie** (tables de mortalité). ⚙️ En cas d'usufruit **partagé/réversible** entre deux personnes, retenir **l'espérance de vie la plus élevée** des deux.
2. **Le flux de revenus nets** : déduction faite des charges usufructuaires (réparations, entretien, assurances dommages, charges de copropriété, impôts fonciers, provision annuelle pour travaux…).

**Exemple d'ordre de grandeur** : usufruitier d'espérance de vie 30 ans, bien de 100 000 € produisant 4 % net → **usufruit ≈ 69 000 €** (contre 30–40 % au barème fiscal selon l'âge). ⚠️ **L'écart entre valeur fiscale et valeur économique peut être considérable.**

## 15.4. Quand utiliser l'une ou l'autre ?

| Le barème fiscal (art. 669) est **OBLIGATOIRE** | L'évaluation est **LIBRE** (fiscale ou économique) |
|---|---|
| Droits d'enregistrement (vente, donation, apport en société, échange, **partage**) portant sur des droits démembrés | **Plus-values** mobilières et immobilières |
| Taxe de publicité foncière | **Matière civile** : conversion de l'usufruit du conjoint en capital, indemnité d'occupation… |
| **IFI** — ⚠️ **sauf** lorsqu'un droit démembré est **détenu par une société** : évaluation à la **valeur vénale** impérative | **Comptabilité** : inscriptions, amortissements, provisions pour dépréciation |

⚠️ L'art. 669 du CGI **ne s'applique pas en matière d'impôt sur le revenu** (CAA Bordeaux, 9 janv. 2025, n° 22BX02902 ; CAA Nantes, 1ᵉʳ avr. 2021, n° 19NT01569).

## 15.5. Usufruit temporaire de titres de société — méthodes admises

1. **Méthode par comparaison** : transactions similaires sur les titres de la même société, à défaut de sociétés comparables (CAA Nantes, 26 nov. 2020, n° 19NT03876).
2. **Méthode d'actualisation des flux (DCF)**, à défaut : actualisation des distributions prévisionnelles. Intérêt : offrir **le même TRI à l'usufruitier et au nu-propriétaire** (CE 24 oct. 2018, n° 412322). Exemple de taux d'actualisation retenu : **9,31 %** pour des titres de société détenant un hôtel-restaurant (CAA Nantes, 26 nov. 2020).

⚠️ **Risque de requalification en cas de mauvaise évaluation.** La cession d'usufruit à durée fixe a perdu de son intérêt depuis la création de **l'art. 13-5 du CGI** (taxation du prix de première cession d'un usufruit temporaire à l'IR dans la catégorie du revenu procuré).

## 15.6. Rappels utiles sur le démembrement (succession)

- **Présomption de l'art. 751 du CGI** : les biens dont le défunt avait l'usufruit et dont la nue-propriété appartient à un héritier présomptif (ou à un donataire/légataire) sont réputés faire partie de la succession **en pleine propriété**, sauf preuve contraire (démembrement régulier, acte ayant date certaine de plus de 3 mois, etc.).
- **Extinction de l'usufruit** : par le décès de l'usufruitier (reconstitution de la pleine propriété **en franchise de droits**), l'arrivée du terme, la renonciation, la vente du bien démembré, la conversion en rente/capital, l'apport conjoint des droits démembrés à une société, la consolidation.
- **Extinctions contentieuses** : abus de jouissance, licitation, **non-usage pendant 30 ans**.
- **IFI (depuis le 1ᵉʳ janvier 2018)** : imposition du **seul usufruitier** sur la valeur en pleine propriété. **Exceptions** (imposition séparée US/NP au barème 669) notamment en cas de démembrement d'origine légale (usufruit du conjoint survivant art. 757), de donation/legs d'usufruit à certaines personnes morales, et de vente de la nue-propriété à un tiers non héritier présomptif.

---

# 16. Le quasi-usufruit

## 16.1. Définition (C. civ. art. 587)

Usufruit portant sur des biens **consomptibles au premier usage** (argent, grains, liqueurs, marchandises, denrées, liquidités, comptes bancaires).

> « L'usufruitier a le droit de s'en servir, mais à la charge de rendre, à la fin de l'usufruit, soit des choses de même quantité et qualité, soit leur valeur estimée à la date de la restitution. »

⚙️ **Le critère est la CONSOMPTIBILITÉ, pas la fongibilité.**
Le quasi-usufruitier a la **propriété** de la chose (« quasi-propriété », ou plutôt propriété temporaire), et est **débiteur d'une créance de restitution** envers le nu-propriétaire.

⚠️ Le quasi-usufruit peut être **légal** ou **conventionnel** — mais **jamais judiciaire** (Cass. civ. 2, 11 oct. 1989).

## 16.2. Origines du quasi-usufruit **légal**

| Origine | Mécanisme |
|---|---|
| **Ouverture d'une succession** | Le conjoint optant pour l'usufruit total devient automatiquement quasi-usufruitier sur les **liquidités** de la succession |
| **Indemnité d'assurance** après destruction du bien démembré | Si le contrat assure la pleine propriété, l'indemnité est soumise en totalité au quasi-usufruit (CA Paris, 11 juill. 1973). ⚠️ Écarté si l'usufruit est légal (conjoint survivant) → remploi en démembrement |
| **Indemnité d'expropriation** (C. expr. art. L. 13-7) | Une seule indemnité fixée ; les droits s'exercent sur son montant → **quasi-usufruit automatique** (contrairement à une vente amiable, où le principe est la répartition du prix) |
| **Indemnité d'éviction** (non-renouvellement d'un bail commercial démembré) | Versée à l'usufruitier, qui devient quasi-usufruitier |
| **Remboursement d'une créance démembrée** (compte courant d'associé…) | La somme versée est soumise à quasi-usufruit (Cass. civ. 1, 4 oct. 1989 ; Cass. com. 11 oct. 2023, n° 21-12.732) |
| **Clause bénéficiaire démembrée** d'assurance-vie | L'usufruitier dispose du capital versé ; la dette de restitution est déductible de son actif successoral (BOI-ENR-DMTG-10-40-20-20 § 275) |

## 16.3. Le quasi-usufruit **conventionnel**

Extension conventionnelle du quasi-usufruit à des biens simplement **fongibles** (non consomptibles), ou au **prix de vente amiable** d'un bien démembré (au lieu de la répartition de principe).

⚙️ **Bonne pratique de rédaction** : prévoir dans l'acte de donation avec réserve d'usufruit que le prix de cession sera soit remployé en démembrement sur un autre bien, soit réparti, soit soumis à quasi-usufruit — **au choix des parties le jour de la vente**.

## 16.4. La convention de quasi-usufruit

Deux objectifs : **améliorer** un quasi-usufruit légal (organiser les modalités, garanties, indexation) ou **constituer** un quasi-usufruit là où il n'existerait pas légalement.

⚠️ **Impératif fiscal** : la convention doit être **rédigée avant le décès** du quasi-usufruitier et avoir **date certaine** — acte authentique **ou** acte sous seing privé **enregistré**. C'est la seule preuve admise par les services fiscaux.

## 16.5. Protection du nu-propriétaire

Le nu-propriétaire n'est qu'un **créancier chirographaire** : risque majeur de non-remboursement si la succession du quasi-usufruitier est insolvable. Outils de protection :

1. **Inventaire** des biens soumis au quasi-usufruit (art. 600) — sert à établir l'assiette **et le montant de la créance** ; peut être intégré à la convention.
2. **Caution** ou garantie équivalente (art. 601), gage/nantissement (art. 2318), garantie bancaire.
3. **Emploi des sommes** (art. 602) : à défaut de caution, les sommes sont placées, les denrées vendues et le prix placé, les immeubles donnés à ferme ou mis sous séquestre. ⚙️ Effet : le quasi-usufruit se transforme aussitôt en **usufruit ordinaire**.
4. **Conversion de l'usufruit du conjoint en rente viagère** (art. 759 et 760).
5. **Revalorisation de la créance** :
   - ⚠️ **Par principe, la créance légale n'est PAS revalorisée** : nominalisme monétaire (C. civ. art. 1895) → la dette est égale à la somme initiale.
   - **Clause d'indexation** conventionnelle.
   - **Dette de valeur** : la somme à restituer est corrélée à la valeur d'un bien précis. Mécanisme cohérent avec les règles successorales du rapport (art. 860) et de la réduction (art. 922).
6. **Assurance-vie** souscrite par le quasi-usufruitier avec le nu-propriétaire pour bénéficiaire — désignation présumée à titre gratuit à défaut de stipulation. Peut servir à acquitter la créance de restitution.

⚠️ **Exception** : l'acte constitutif de l'usufruit ou la déclaration d'option peut **dispenser** l'usufruitier d'inventaire, de caution et d'emploi.

## 16.6. Évaluation

- **Fiscalement** : « le quasi-usufruit ne peut être distingué d'un simple usufruit » (RM Douay, 30 juill. 2001, n° 54977) → **barème de l'art. 669 du CGI**.
- **Économiquement** : bien que le quasi-usufruitier ait les prérogatives d'un plein propriétaire, il est débiteur d'une restitution → la valeur économique du quasi-usufruit est **égale à celle de l'usufruit**.

## 16.7. Décès du quasi-usufruitier

### Côté ACTIF
Les biens soumis au quasi-usufruit (ou acquis en remploi) **entrent à l'actif de succession du quasi-usufruitier**, civilement et fiscalement, puisqu'il en avait la propriété (art. 587).

### Côté PASSIF — la créance de restitution
**Civilement** : dette de la succession. ⚠️ Si le nu-propriétaire créancier est aussi héritier du quasi-usufruitier, il intervient **à double titre** (héritier + créancier) — BOI-ENR-DMTG-10-40-20-20 § 60.

**Fiscalement** : principe de déductibilité (CGI art. 768), sous réserve de **deux obstacles**.

### Obstacle 1 — La présomption de fictivité (CGI art. 773, 2°)
S'applique aux dettes consenties par le défunt **à l'un de ses héritiers**. Vise les **dettes conventionnelles**, **pas les dettes d'origine légale**. Neutralisée si la convention a **date certaine** avant le décès (acte authentique ou SSP enregistré).

### Obstacle 2 — L'article 774 bis du CGI (LF 2024)

⚠️ **Applicable aux successions ouvertes à compter du 29 décembre 2023 — la date de création du quasi-usufruit est SANS INCIDENCE.** Aucune tolérance pour les créances antérieures.

⚙️ **Trois catégories de dettes** :

| Catégorie | Champ | Régime |
|---|---|---|
| **① Non déductibles, sans preuve contraire possible** | Dette de restitution portant sur une **somme d'argent dont le défunt s'était réservé l'usufruit**. Deux conditions cumulatives : (a) donation de la nue-propriété avec rétention de l'usufruit, (b) portant sur une **somme d'argent** | **Jamais déductible** |
| **② Non déductibles, SAUF preuve contraire** | Quasi-usufruits **nés en cours d'usufruit** : dette contractée sur le **prix de cession** d'un bien dont le défunt s'était réservé l'usufruit ; et, par extension administrative, « **toute autre opération assimilable** » par laquelle le bien est liquidé en somme d'argent avec report de l'usufruit (remboursement de créance, **rachat d'un contrat de capitalisation**…) | Déductible si le contribuable **prouve que la dette n'a pas été contractée dans un but principalement fiscal** |
| **③ Déductibles** | Dettes non visées par le dispositif (notamment les quasi-usufruits **successoraux légaux**) | Déductibles dans les conditions ordinaires |

**Précisions importantes** :
- **Notion de « somme d'argent »** : interprétation **stricte** par l'administration, par référence aux dons de sommes d'argent de l'art. **790 G** du CGI — chèque, virement, mandat, remise d'espèces. ⚙️ **Sont donc exclus de la catégorie ① : cryptomonnaies, comptes courants d'associés, autres créances.**
- **Notion de « réserve d'usufruit »** : civilement, suppose que le défunt était plein propriétaire avant de céder la nue-propriété. ⚠️ Le BOFiP indique que « les circonstances de constitution de l'usufruit que le défunt s'est réservé sont sans incidence », ce qui suggère une interprétation **élargie** à tout usufruit **constitué** à l'initiative du défunt.
- ⚠️ **Critique doctrinale** : les commentaires ne distinguent pas entre quasi-usufruits **voulus** (conventionnels) et **subis** (imposés par la loi : remboursement d'une créance démembrée arrivée à terme, par exemple). Ces derniers se trouvent pourtant soumis à la preuve contraire.
- CGI art. 774 bis · BOI-ENR-DMTG-10-40-20-20 § 210.

⚙️ **Conséquence pratique majeure** : les **donations de la nue-propriété d'une somme d'argent avec réserve d'usufruit sont désormais à proscrire** (valides civilement, mais dette de restitution jamais déductible).

## 16.8. Extinction anticipée du quasi-usufruit

Face au risque de non-déductibilité, il peut être opportun de mettre fin au quasi-usufruit avant son terme. Cinq voies :

| Voie | Mécanisme | Fiscalité |
|---|---|---|
| **① Répartition des sommes** | Suppose que la somme n'ait pas été dépensée. On détermine la valeur économique de l'US et de la NP, puis chacun reçoit sa part **en pleine propriété** | Extinction du démembrement |
| **② Conversion en rente viagère ou en capital** | Le quasi-usufruitier rembourse la créance ; le nu-propriétaire lui verse une rente ou un capital égal à la valeur économique de l'usufruit | Voir § 5.7.3 |
| **③ Renonciation au quasi-usufruit** | Remboursement de la totalité de la somme au nu-propriétaire | ⚠️ **Mutation à titre gratuit taxable aux droits de donation**, assiette = **quasi-usufruit résiduel évalué au barème 669** |
| **④ Transformation en usufruit ordinaire** | Convention de **subrogation réelle** ; suppose que la somme n'ait pas été dépensée. Aboutit à un démembrement classique (usufruit + nue-propriété) | Neutralité recherchée |
| **⑤ Remboursement anticipé de la dette** | En numéraire, ou par **dation en paiement** (remise de biens ou droits) | ⚠️ La dation est traitée comme une **cession à titre onéreux** → DMTO et, le cas échéant, **impôt de plus-value sur la nue-propriété** |

## 16.9. Quasi-usufruit successif
Statut **débattu**, civilement et fiscalement. Au décès du quasi-usufruitier de premier rang, la dette de restitution semble **non exigible** (le quasi-usufruitier de second rang ayant une créance) → **non déductible** de la succession du premier (CGI art. 768). Au décès du second quasi-usufruitier, la créance serait déductible dans les conditions ordinaires.

## 16.10. IFI
Les dettes de quasi-usufruit **ne sont plus déductibles** de l'assiette IFI, **sauf** si elles se rapportent à des **actifs immobiliers imposables** (CGI art. 974). *(Sous ISF, positions divergentes entre l'administration et la jurisprudence.)*

⚙️ **Rappel de coordination** : la convention de quasi-usufruit enregistrée doit être **remise au notaire** chargé du règlement de la succession pour pouvoir être déduite au passif dans la déclaration de succession.

---

# 17. L'indivision successorale

## 17.1. Définition et composition
Période s'écoulant entre le décès et le partage, lorsqu'une pluralité d'héritiers titulaires de droits identiques vient à la succession. « Héritiers » au sens large : famille du défunt **et** légataires universels ou à titre universel.

⚠️ **Ne sont PAS en indivision** les enfants communs et le conjoint survivant ayant opté pour la **totalité en usufruit** (démembrement ≠ indivision).

**Biens compris dans l'indivision** :
- le patrimoine laissé par le défunt, **excepté ses créances et dettes, le caveau et les souvenirs de famille** ;
- les biens rapportés **en nature** à la succession.

**Composition évolutive** : les revenus produits s'ajoutent à la masse indivise (sauf accord contraire des indivisaires).

## 17.2. Gestion

Chaque héritier détient un droit privatif sur une **fraction abstraite** des biens : la **quote-part** (de même nature que celle des autres : propriété, nue-propriété ou usufruit selon les cas).

- **Régime légal** (art. 815 et s.) : **unanimité**, sauf actes conservatoires et certains actes d'administration ou de disposition pouvant être pris à la **majorité des 2/3 des droits indivis**.
- **Convention d'indivision** : contrat signé par tous, à durée limitée ou non, organisant la gestion et fixant les droits de chacun.
- **Mandataire** : désignation possible pour administrer l'indivision. Le défunt a pu, de son vivant, désigner un **mandataire à effet posthume** (art. 812 et s.).

⚠️ Un indivisaire ne peut pas décider seul de vendre un immeuble indivis — il peut seulement vendre **sa part**.
⚠️ Les biens indivis ne peuvent être saisis que par les **créanciers de la succession**.

## 17.3. Fin de l'indivision
**« Nul n'est tenu de rester dans l'indivision »** (art. 815). Sortie possible à tout moment (sauf convention d'indivision ou décision judiciaire de maintien), par vente ou par partage — total ou partiel.

## 17.4. Droits des créanciers

### Créanciers de la succession — **ordre de remboursement**
1. Créanciers munis de **sûretés**, selon le rang de leur sûreté ;
2. Créanciers de **2ᵉ rang**, dans l'ordre de leur déclaration de créance (les plus anciennes d'abord) ;
3. **Légataires de sommes d'argent**.

⚠️ En acceptation à concurrence de l'actif net, les créanciers ne peuvent pas poursuivre le patrimoine personnel des héritiers. Si l'actif est insuffisant, les créanciers déclarés non remplis de leurs droits peuvent se retourner contre les **légataires**.

### Créanciers personnels des héritiers
- Peuvent **accepter la succession au nom et place** de l'héritier inactif, si son inertie leur cause un préjudice personnel — effet limité au créancier et à hauteur de sa créance (art. 779).
- **Ne peuvent pas se faire rembourser sur les biens indivis** ⚠️ (frein pratique à la constitution de sûretés pour un prêt bancaire). En contrepartie, ils peuvent **provoquer le partage** ; pour s'y opposer, l'héritier doit prouver un préjudice personnel **et** une fraude à ses droits.

---

# 18. Le partage

## 18.1. Définitions

- **Partage** (C. civ. art. 816 à 892) : opération par laquelle les copartageants mettent fin à l'indivision en s'attribuant des biens divis. Suppose une indivision préalable.
  ⚠️ **On ne met pas fin à un démembrement de propriété par un partage** : nu-propriétaire et usufruitier ne sont pas en indivision.
- **Licitation** : vente (amiable, aux enchères ou judiciaire) d'un bien indivis **dans sa globalité**, lorsque le bien n'est pas partageable en nature ou qu'aucun indivisaire n'en veut. ⚠️ La licitation **au profit d'un indivisaire ne fait pas nécessairement cesser l'indivision** (ex. : rachat par un indivisaire de la part d'un autre alors qu'ils sont trois).
- **Cession de droits successifs** (art. 1696 à 1698) : cession par un héritier de **l'intégralité de ses droits (actifs et passifs)** dans la masse successorale, à un cohéritier ou à un tiers.

## 18.2. Types de partage
- **Pur et simple** : tous les lots sont d'égale valeur.
- **Avec soulte** (art. 826 al. 4) : celui qui reçoit un lot supérieur à ses droits verse une somme d'argent. ⚠️ **Variation de la soulte** (art. 828) : si la valeur des biens augmente ou diminue de **plus du quart** (à la hausse comme à la baisse) depuis le partage, **la soulte varie dans les mêmes proportions** — sauf exclusion conventionnelle. En cas de vente du bien, les sommes restant dues deviennent exigibles.

## 18.3. Capacité des parties
La présence d'un mineur ou d'un majeur protégé **ne fait pas obstacle** au partage amiable (art. 836 al. 2).

| Situation | Règle |
|---|---|
| **Mineur sous administration légale** | Les administrateurs légaux autorisent le partage et approuvent l'état liquidatif. Administrateur ad hoc si opposition d'intérêts |
| **Mineur sous tutelle** | Autorisation du **conseil de famille** (ou du juge) pour le partage **et** l'approbation de l'état liquidatif (art. 507) |
| **Majeur sous tutelle** | Partage amiable **sans autorisation** si aucun conflit d'intérêts, mais l'**état liquidatif** doit être approuvé par le conseil de famille ou le juge (art. 507) |
| **Majeur sous curatelle** | **Assistance du curateur** (art. 467) |

## 18.4. Liquidation d'une indivision — la méthode en 3 temps

⚙️ **Méthode consacrée** (Cass. 1ʳᵉ civ., 22 nov. 2023, n° 21-25.251) :

### Temps 1 — Les comptes individuels de chaque indivisaire

**Dettes envers l'indivision** (minorent le compte individuel) :
- **Indemnité d'occupation** pour l'usage privatif du bien indivis — due en raison de la **jouissance privative** (privation des autres), ⚙️ la **valeur locative** du bien devant impérativement être prise en compte par les juges (Cass. civ. 1, 19 sept. 2007, n° 06-14712) ;
- **Perception exclusive des revenus** générés par le bien indivis (art. 815-10 al. 2) ;
- **Avance en capital** consentie par l'indivision (art. 815-11 al. 4) — ⚙️ ce n'est **pas un partage partiel** mais une avance soumise au rapport, **à la valeur nominale** à défaut de convention (Cass. civ. 1, 6 mai 1997, n° 94-15510) ;
- **Détérioration** du bien par son fait ou sa faute (art. 815-13 al. 2).

**Créances contre l'indivision** (majorent le compte individuel) :
- **Remboursement des échéances d'emprunt** ayant permis l'acquisition (**intérêts et primes d'assurance emprunteur inclus**), ainsi que les frais d'acquisition (CA Nîmes, 20 déc. 2023, n° 21-02498) ;
- **Dépenses d'amélioration et de conservation** financées sur deniers personnels (art. 815-13) — ⚙️ évaluation selon le régime « **dépense faite ou profit subsistant** » (le profit subsistant intègre la plus-value) ;
- **Charges** payées sur fonds personnels (taxe foncière, redevance assainissement…) ;
- **Rémunération pour la gestion** du bien indivis exercée dans l'intérêt de l'indivision — fixée à l'amiable ou à défaut par décision de justice.

### Temps 2 — Le compte général de l'indivision
> **Actif brut indivis** = valeur vénale du bien indivis **+** dettes des indivisaires envers l'indivision
> **Passif indivis** = créances des indivisaires contre l'indivision **+** dettes contractées directement par l'indivision (dont le **capital restant dû** de l'emprunt)
> **Actif net à partager** = Actif brut indivis − Passif indivis

### Temps 3 — Les comptes entre indivisaires
1. **Répartition** de l'actif net selon la **quote-part indivise** de chacun ;
2. **Ajout des créances entre indivisaires** (ex. : apport personnel supérieur à la quotité acquise → créance contre le coïndivisaire, à hauteur du dépassement). ⚠️ **Entre concubins**, la créance **n'est pas réévaluée** au jour de la liquidation ;
3. **Ajout du solde du compte individuel**.

**Exemple complet (source)** : bien 220 000 €, emprunt restant dû 50 000 €, quotités A 40 % / B 60 %.
> Actif brut : 220 000 + 30 000 (loyers perçus par A seul) = **250 000 €**
> Passif : 50 000 (emprunt) + 40 000 + 70 000 (créances des indivisaires) = **160 000 €**
> Actif net : **90 000 €** → A théoriquement 36 000 €, B 54 000 €
> Après créances et soldes individuels : A **42 000 €**, B **128 000 €**
> Contrôle : 220 000 − 50 000 = 170 000 = 42 000 + 128 000 ✓

## 18.5. Formes du partage

### Amiable
Convention libre — **aucun formalisme**, verbal ou écrit. ⚠️ **Acte notarié obligatoire** si le partage porte sur des immeubles ou droits immobiliers soumis à publicité foncière.
Possibilité de **partage global** portant sur plusieurs indivisions existant entre les mêmes personnes (art. 839).

### Judiciaire (art. 840 à 842)
**Conditions** : refus d'un indivisaire ; contestations sur la manière de procéder ; partage amiable non autorisé/approuvé (indivisaire présumé absent, hors d'état de manifester sa volonté…).

**Tribunal compétent** :
- **Partage successoral** : TJ du **lieu d'ouverture de la succession** (dernier domicile du défunt) — art. 841 et 720 ;
- **Partage suite à séparation** (mariage, PACS, concubinage) : **juge aux affaires familiales** (COJ art. L. 213-3).

**Procédure** : assignation en partage comportant une **description sommaire du patrimoine**, l'indication des démarches entreprises pour un partage amiable, et les intentions du demandeur sur la répartition (CPC art. 1360).
⚠️ Les parties peuvent **à tout moment revenir au partage amiable** (art. 842).

## 18.6. Formation et attribution des lots

### Accord des parties (principe)
Les héritiers évaluent les biens selon le procédé de leur choix. ⚠️ Ils doivent veiller à ce qu'aucun ne reçoive un lot **inférieur de plus d'1/4** à ses droits (risque d'action en complément de part).

### Attribution préférentielle

**Champ** : indivisions de nature **familiale** — successorale, post-communautaire, post-sociale, ou entre époux séparés de biens.
⚠️ Ne peut être demandée que pour l'acquisition de droits **en pleine propriété ou en nue-propriété**.
⚠️ **N'est pas de droit en principe** ; un testament peut y faire échec (Cass. civ. 1, 13 fév. 2019, n° 18-14580). *Exception : elle est de droit pour le conjoint survivant sur le logement — art. 831-2.*

**Bénéficiaires** : héritier en PP ou en NP ; héritier à vocation universelle ou à titre universel (testament, donation entre époux) ; **conjoint survivant** ; **partenaire de PACS** (pour le logement, si autorisé). ⚠️ **En cas de concurrence, c'est le conjoint survivant qui recueille le bien.**

**Biens concernés** (liste principale) :
- **Entreprises** individuelles ou sociétés à activité commerciale, industrielle, libérale, agricole ou artisanale — condition : **l'attributaire doit participer ou avoir participé effectivement à l'exploitation** ;
- **Logement** et mobilier le garnissant ;
- Exploitation agricole ; local professionnel ; parts sociales…
- Cas particulier issu de la **loi n° 2018-1244 du 27 déc. 2018, art. 4** : possession continue, paisible et publique depuis **plus de 10 ans** au moment de l'introduction de la demande de partage en justice.

**Procédure** : demande aux copartageants ; à défaut d'accord, saisine du TJ (art. 831-2-3 ; CPC art. 1381). Possible **conjointement** par plusieurs successibles souhaitant conserver ensemble le bien. Pour une indivision successorale : **de l'ouverture de la succession jusqu'à la clôture des opérations de partage**.

**Effets** : ⚠️ **ne réalise pas le transfert de propriété** — elle ne concerne que la composition et l'attribution des lots. Le bénéficiaire ne devient propriétaire exclusif **qu'au jour du partage définitif** (art. 834 al. 1).

### Tirage au sort (art. 826 al. 3)
Dispositif **subsidiaire**, en l'absence d'attribution préférentielle et à défaut d'entente. Permet d'attribuer les lots, **mais pas d'en déterminer la composition**.
⚠️ À défaut d'accord, le juge **ne peut pas choisir** la part à attribuer à tel ou tel héritier.

## 18.7. Effets du partage

### Effet **déclaratif**
Chaque copartageant est censé être propriétaire des biens attribués **depuis l'origine de l'indivision** (ouverture de la succession, dissolution de la communauté, date d'acquisition). **La période d'indivision est fictivement effacée.**

### Garantie des lots (art. 884 à 886)
Garantit les copartageants contre les troubles ou évictions ayant une cause **antérieure au partage** ; les autres doivent indemniser. Évaluation **au jour du partage** (art. 885). ⚠️ **Prescription : 2 ans** à compter de l'éviction ou de la découverte du trouble (art. 886).

### Paiement des dettes
Les créanciers de la soulte n'ont d'autre recours que le **privilège spécial du copartageant** ou les garanties propres au partage.
⚠️ Dans un partage judiciaire, les créanciers personnels peuvent former **tierce opposition** au jugement autorisant le partage.

## 18.8. Remise en cause du partage

| Action | Conditions | Prescription |
|---|---|---|
| **Annulation pour vice du consentement** (art. 887) | **Erreur** portant sur l'existence ou la quotité des droits, ou sur la propriété des biens compris dans la masse ; **dol** ; **violence** | **5 ans** à compter du partage |
| **Annulation pour omission d'un héritier** (art. 887-1) | L'héritier omis peut demander sa part en **valeur ou en nature**, ce qui évite l'annulation | **5 ans** à compter du partage |
| **Complément de part** (art. 889) | **Lésion de plus du quart** : lot inférieur de plus d'1/4 aux droits dans la masse. Vaut en cas de **sous-évaluation** d'un bien (Cass. civ. 1, 7 fév. 2018, n° 17-12480) | **2 ans** à compter du partage |
| **Pétition d'hérédité** | Héritier omis, hors annulation | **30 ans** du décès |

**Alternative à l'annulation** (art. 887 al. 3) : le tribunal peut ordonner un **partage complémentaire ou rectificatif** lorsque les conséquences du vice peuvent être réparées autrement.
⚠️ L'annulation du partage est **rétroactive** : tout se passe comme s'il n'avait jamais eu lieu ; un nouveau partage intervient.
Renonciation possible à l'action en complément de part, après le partage (Cass. civ. 1, 12 janv. 1994).

## 18.9. Fiscalité — droits d'enregistrement

### 18.9.1. Partages purs et simples : le **droit de partage**

**Conditions d'exigibilité** (4) : existence d'un **acte** · existence d'une **indivision** · **véritable partage** · biens partagés.
⚠️ Intégrer dans un acte (une convention de divorce, p. ex.) une clause de répartition du prix **rend le droit de partage exigible au moment de la vente**.

**Taux** :

| Situation | Taux |
|---|---|
| **Principe** (depuis le 1ᵉʳ janvier 2012) | **2,50 %** |
| Partages consécutifs à une **séparation de corps, un divorce ou une rupture de PACS** (depuis le 1ᵉʳ janvier 2022) | **1,10 %** (CGI art. 746 ; loi 28 déc. 2019 art. 108) |
| Rappel : avant le 1ᵉʳ janvier 2012 | 1,10 % |
| Couples ayant présenté au juge une convention de divorce antérieure au 30 juillet 2011 | **1,10 %** figé |

**Assiette** : **actif net partagé** = actif brut cumulé des biens **français et étrangers**, déduction faite du passif grevant la masse indivise. ⚠️ Les biens étrangers sont retenus car le partage n'est pas considéré comme une mutation en droit français.

**Partage partiel** : le droit n'est exigible que sur la valeur de la fraction partagée. ⚠️ **Mais** si un indivisaire sort **définitivement** de l'indivision par des attributions représentant sa part dans la masse alors que les autres restent indivis, le droit est dû comme si le partage portait sur **l'ensemble des biens** (règle non applicable aux partages de sociétés — BOI-ENR-PTG-10-10 § 200).

### 18.9.2. Partages avec soulte

Le régime (droits de vente **ou** droits de partage) est commun à la soulte et à la plus-value, et dépend de **l'origine de l'indivision** et de la **qualité de l'attributaire**.

| Origine de l'indivision | Attributaire | Régime |
|---|---|---|
| **Succession, communauté conjugale, indivision entre époux ou partenaires de PACS, indivision issue d'une donation-partage** | Membre originaire de l'indivision, son conjoint, un ascendant, un descendant, ou un ayant droit à titre universel | **Droit de partage** — la soulte **n'est pas déduite** de l'actif net partagé (BOI-ENR-PTG-10-20 § 280) |
| **Toute autre** (indivisions conventionnelles, partages de sociétés) ou attributaire hors du cercle ci-dessus | — | **Droits de vente** sur la soulte, **ET** soulte **déduite** de l'actif net pour le calcul du droit de partage (BOI-ENR-PTG-10-20 § 50) |

### 18.9.3. Licitations

| Cas | Régime |
|---|---|
| **Régime normal** | **Droits de vente** sur les parts acquises (BOI-ENR-PTG-20-20 § 1) — ⚠️ **le concubin qui acquiert la part de l'autre supporte les droits de vente classiques** (RM Elimas, JOAN 27 fév. 2018, n° 1602) |
| **Régime spécial → droit de partage** | Biens dépendant d'une indivision **successorale**, **entre époux ou partenaires de PACS** (acquis avant ou pendant l'union), ou issue d'une **donation-partage**, au profit d'un **membre originaire** de l'indivision, de son conjoint, partenaire, ascendant, descendant ou ayant droit à titre universel |
| Régime temporaire | CGI art. 750 bis C — jusqu'au **31 décembre 2038** (loi n° 2018-1244 modifiée par loi n° 2024-322 du 9 avril 2024) |

### 18.9.4. Cessions de droits successifs

| Cessionnaire | Régime |
|---|---|
| Membre originaire de l'indivision, conjoint, partenaire pacsé, ascendant, descendant, ayant droit à titre universel | **Droit de partage** (CGI art. 750, II ; BOI-ENR-PTG-30-10 § 1) |
| Tout autre | **Droits de vente** (BOI-ENR-PTG-30-20 § 1) |

### 18.9.5. Plus-values
- **PVI** : voir régimes spécifiques (exonérations et calcul du partage).
- **PVM** : imposables **dans la limite des soultes** pour les partages de titres relevant du **régime normal**. ⚠️ **Exonérés** les partages portant sur des biens provenant d'une **succession**, d'une **communauté conjugale**, d'une indivision entre partenaires de PACS ou entre concubins. Différence de traitement fondée sur l'origine de l'indivision jugée **conforme à la Constitution** (Cons. const., déc. n° 2018-719 QPC, 13 juill. 2018).

## 18.10. Formalités

| Type de partage | Formalité | Délai |
|---|---|---|
| **Exclusivement immobilier ou mixte** | Formalité **fusionnée** au service de la publicité foncière du lieu de situation des immeubles | **2 mois** de la date de l'acte |
| **Exclusivement mobilier** | Enregistrement au SIE | **1 mois** de la date de l'acte |

Immeubles situés dans le ressort de plusieurs services : dépôt chez l'un d'eux (choisi par le requérant) où sont acquittés les droits, puis publicité dans chacun des services concernés.

**Partage successoral** : les cohéritiers bénéficiaires d'une soulte doivent inscrire leur **privilège de copartageant** au service de la publicité foncière. Le notaire arrête son compte de frais et établit un **compte complémentaire** soumis à l'approbation des héritiers, clôturant la liquidation et le partage.

---

# 19. Liquidation fiscale : la déclaration de succession

## 19.1. Nature et objet
Document remis à l'administration fiscale (Cerfa **2705**, **2705-S**, **2706**) faisant état du patrimoine du défunt, de la part revenant à chaque héritier/légataire et des droits dus (CGI art. 800). ⚠️ **Vocation purement fiscale** — elle ne règle pas la succession civilement.

## 19.2. Qui doit déposer ?
- **Héritiers** : **solidaires** pour le paiement des droits → **un seul peut déposer au nom de tous** (ou déclaration unique signée par tous).
- **Légataires** : **ni solidaires entre eux, ni avec les héritiers** → **déclaration personnelle obligatoire** (BOI-ENR-DMTG-10-60-20 § 1).
- En pratique, le notaire s'en charge lorsqu'il est saisi.

## 19.3. Dispenses de déclaration
- **Héritiers en ligne directe, conjoint survivant, partenaire de PACS** : dispense lorsque l'actif brut successoral est inférieur au seuil légal (**50 000 €**, sous réserve qu'aucune donation antérieure non enregistrée ni non déclarée n'ait été consentie par le défunt).
  *Rappel : pour les successions ouvertes avant le 1ᵉʳ janvier 2006, le seuil était de 10 000 €.*
- **Autres héritiers, légataires, donataires** : actif brut inférieur à **3 000 €**.

## 19.4. Où et quand ?

| Domicile du défunt | Délai | Service compétent |
|---|---|---|
| **France** | **6 mois** du décès | SIE du ressort du domicile du défunt |
| **Étranger** | **1 an** | SIE des non-résidents |

*(CGI art. 641 et 656 ; BOI-ENR-DMTG-10-60-50)*

⚠️ **Sanctions du retard** : intérêt de retard **+ majoration de 10 %**, à partir du **1ᵉʳ jour du 7ᵉ ou du 13ᵉ mois** suivant le décès (CGI art. 1728 ; RM Renaud-Garabedian, Sénat 2 juin 2022, n° 26887).

## 19.5. Éléments de liquidation à ne pas oublier
- **Convention de quasi-usufruit** enregistrée → à transmettre au notaire pour déduction au passif (sous réserve des art. 773, 2° et **774 bis** — voir § 16.7) ;
- **Dons manuels** réalisés ;
- **Rapport** civil (à intégrer même si les donations ont plus de 15 ans) ;
- **Forfait mobilier de 5 %** (évitable par inventaire) ;
- **Frais funéraires** : déduction forfaitaire de **1 500 €** ;
- Exonérations applicables à certains actifs.

## 19.6. Déclaration partielle et rectificative
Une déclaration complémentaire ou rectificative peut être déposée (bien omis, bien vendu pour un montant très différent de celui déclaré) — versement du complément de droits ou demande de restitution.
Les **assurances-vie** peuvent faire l'objet d'une **déclaration partielle de succession**, sans que ce soit obligatoire : elles peuvent aussi figurer dans la déclaration principale lorsque les bénéficiaires sont héritiers ou légataires.

## 19.7. Conséquences postérieures
⚠️ Le dépôt peut déclencher un **redressement IFI du défunt** (l'administration « découvre » la composition du patrimoine à cette occasion).
⚠️ Les héritiers doivent penser à leur **propre déclaration IFI** l'année suivante, du fait de l'augmentation de leur patrimoine.

---

# 20. Frais de notaire

> **« Frais de notaire » = émoluments (rémunération réglementée) + débours + droits et taxes.**
> Textes : décret n° 2016-230 du 26 fév. 2016 ; décret n° 2020-179 et arrêté du 28 fév. 2020 ; arrêté du 28 avril 2020. **Tarifs en vigueur depuis le 1ᵉʳ janvier 2021.**

## 20.1. Succession

### 20.1.1. Acte de notoriété
**Émolument : 67,92 € TTC** (C. com. art. A. 444-66) · **Enregistrement : 25 €**

Émoluments de formalités associés :
| Formalité | Montant TTC |
|---|---|
| Demande d'acte d'état civil | 13,488 € |
| Copie authentique | 1,356 € / page |
| Copie sur papier libre | 0,456 € / page |
| Notification à l'état civil | 18,108 € |
| Consultation du FCDDV | 13,584 € d'honoraires + 12,192 € (sans inscription) ou 24,384 € (avec inscription) |

### 20.1.2. Attestation de propriété immobilière

**Barème (assiette = valeur des droits immobiliers transmis)** :

| Tranche | Taux TTC | À ajouter |
|---|---|---|
| 0 à 6 500 € | 2,322 % | — |
| 6 500 € à 17 000 € | 1,2768 % | + 67,938 € |
| 17 000 € à 30 000 € | 0,8712 % | + 136,890 € |
| Au-delà de 30 000 € | **0,6384 %** | **+ 206,730 €** |

**Taxes annexes** : enregistrement (publicité foncière) **125 €** (CGI art. 680) · **contribution de sécurité immobilière : 0,10 %** de la valeur des immeubles transmis.

> **Exemple** : appartement de 500 000 € → émoluments = 500 000 × 0,6384 % + 206,73 = **3 398,73 €** ; taxe fixe 125 € ; CSI 500 €.

⚠️ **L'attestation n'est pas nécessaire** si un acte de partage est établi et publié **dans les 10 mois du décès** (D. n° 55-22 du 4 janv. 1955, art. 29 al. 4).

### 20.1.3. Déclaration de succession

⚙️ **Assiette = ACTIF BRUT de la succession, sans déduction du passif.**

Règles d'assiette détaillées :
- Époux marié sous un régime **communautaire** ou avec **société d'acquêts** : base = actif brut de la communauté (ou de la société d'acquêts) **+ biens propres du défunt** ;
- **Biens exonérés** (résidence principale, parts de GFA, Dutreil…) : retenus pour leur **valeur réelle** ;
- **Aucun passif** n'impacte l'assiette ;
- **Meubles** : si prisée donnant lieu à émolument, aucun émolument sur la fraction correspondante ; en revanche, le **forfait de 5 %** est inclus dans la base ;
- **Récompenses** : un solde créditeur **au profit de la masse commune** s'ajoute à celle-ci ; un solde créditeur **au profit de l'époux** n'est pas un actif taxable (il est déduit de la masse) ;
- Intègre les **donations en avancement de part** ainsi que la **portion de libéralités hors part sujette à réduction** ;
- **Assurance-vie** :
  - **CGI art. 990 I** → **hors** émolument. Le notaire ne perçoit une rémunération fixée conventionnellement que s'il est mandaté par les bénéficiaires pour récupérer les capitaux ;
  - **CGI art. 757 B** → les primes **excédant 30 500 €** sont **ajoutées à l'assiette** (la part ≤ 30 500 € reste hors assiette). L'assiette de l'émolument coïncide avec celle de l'impôt (Cass. com., 4 oct. 2011, n° 10-20218).

**Barème** (C. com. art. A. 444-63) :

| Tranche | Taux TTC | À ajouter |
|---|---|---|
| 0 à 6 500 € | 1,8576 % | — |
| 6 500 € à 17 000 € | 1,0212 % | + 54,366 € |
| 17 000 € à 30 000 € | 0,696 % | + 109,650 € |
| Au-delà de 30 000 € | **0,5112 %** | **+ 165,090 €** |

**Émoluments de formalités** : attestation de créancier 9,048 € TTC · 0,456 €/page (inventaire des dettes, double de la déclaration, copies) · demande de remise de pénalités 45,276 € · demande de crédit de paiement (fractionné/différé) 45,276 € TTC si garantie hypothécaire, **90,552 €** dans les autres cas.

## 20.2. Testaments

| Prestation | Montant |
|---|---|
| **Testament authentique** (du vivant) | **113,19 € HT / 135,83 € TTC** |
| Testament olographe (du vivant) | Pas d'émolument d'acte ; **honoraires libres** au titre du conseil |
| **Acte de dépôt et description** d'un testament olographe | 26,41 € HT / 31,692 € TTC (+ 26,41 € HT / 31,692 € TTC d'émolument de garde avant le décès) |
| Acte de dépôt de l'ordonnance d'envoi en possession | 26,41 € HT / 31,692 € TTC |
| **Enregistrement** des testaments reçus par notaire | **125 €** — dans les **3 mois** du décès |

**Délivrance de legs** :

| Tranche | Taux TTC | À ajouter |
|---|---|---|
| 0 à 6 500 € | 2,322 % | — |
| 6 500 € à 17 000 € | 1,27682 % | + 67,938 € |
| 17 000 € à 30 000 € | 0,8712 % | + 136,890 € |
| Au-delà de 30 000 € | **0,6384 %** | **+ 206,730 €** |

**Formalités** : inscription au FCDDV 12,192 € · demande d'état civil 11,24 € HT / 13,488 € TTC · notification de l'acte de dépôt au greffe 18,87 € HT / 22,644 € TTC · publicité foncière (délivrance de droits immobiliers) 339,58 € HT / **407,496 € TTC**.

## 20.3. Donation et donation-partage

### Assiette
- **Pluralité de donateurs** : un émolument **distinct** par donateur, sur la valeur qu'il transmet. **Le nombre de donataires est sans effet.**
- **Réserve d'usufruit par le donateur** : émolument calculé sur la valeur en **pleine propriété**.
- **Donation de la nue-propriété d'un bien dont l'usufruit appartient à un tiers** : émolument sur la **seule nue-propriété**.
- **Donation-partage** (conjonctive ou non) : valeur en pleine propriété des biens donnés **y compris les biens réincorporés** ; les émoluments sont dus tant sur les biens donnés que sur les biens réincorporés et partagés (C. com. art. A. 444-68, 2°).

### Barème — donation entre vifs acceptée **et** donation-partage
*(C. com. art. A. 444-67, 1° — l'article mentionne les taux HT)*

| Assiette | Taux TTC | À ajouter |
|---|---|---|
| 0 à 6 500 € | 5,8044 % | — |
| 6 500 € à 17 000 € | 2,394 % | + 221,676 € |
| 17 000 € à 60 000 € | 1,596 % | + 357,336 € |
| Au-delà de 60 000 € | **1,1976 %** | **+ 596,376 €** |

> **Ex. 1** — Donation de la NP d'un appartement valant 500 000 € en PP : 500 000 × 1,1976 % + 596,376 = **6 584,38 €**
> **Ex. 2** — Donation-partage de 600 000 € au profit de 3 enfants : 600 000 × 1,1976 % + 596,376 = **7 781,98 €**

### Barème réduit — créances, espèces, valeurs mobilières **cotées**
Applicable notamment aux donations de sommes d'argent, de contrats de capitalisation et **de bitcoins**.
*(C. com. art. A. 444-67, 4°)*

| Assiette | Taux TTC | À ajouter |
|---|---|---|
| 0 à 6 500 € | 2,7864 % | — |
| 6 500 € à 17 000 € | 1,1496 % | + 106,392 € |
| 17 000 € à 60 000 € | 0,7668 % | + 171,468 € |
| Au-delà de 60 000 € | **0,5748 %** | **+ 286,668 €** |

> **Ex. 3** — Don de 31 865 € : 31 865 × 0,7668 % + 171,468 = **415,80 €**
> **Ex. 4** — Donation-partage de 31 865 € à chacun de 3 enfants : (31 865 × 3) × 0,5748 % + 286,668 = **836,15 €**

**Donation entre époux (au dernier vivant) pendant le mariage** : émolument fixe **113,20 € HT / 135,84 € TTC**.

## 20.4. Vente d'immeuble

### Barème de droit commun (vente ou cession de gré à gré)

| Tranche | Taux HT | À ajouter HT | Taux TTC | À ajouter TTC |
|---|---|---|---|---|
| 0 à 6 500 € | 3,870 % | — | 4,644 % | — |
| 6 500 € à 17 000 € | 1,596 % | 147,810 € | 1,9152 % | 177,372 € |
| 17 000 € à 60 000 € | 1,064 % | 238,250 € | 1,2768 % | 285,900 € |
| Au-delà de 60 000 € | **0,799 %** | **397,250 €** | **0,9588 %** | **476,700 €** |

**Assiette** (C. com. art. A. 444-54) : capital énoncé dans l'acte, **augmenté de la valeur des charges** (sommes que les parties s'engagent à payer en sus du prix et prestations en nature), ou l'évaluation retenue pour la liquidation des droits et taxes si elle est supérieure. ⚠️ Calcul sur le montant **TTC** lorsque la TVA est due.

### Tarifs réduits — première vente d'un local d'habitation (VEFA ou achevé), hors HLM

| Nombre d'unités principales d'habitation | Taux TTC > 60 000 € | À ajouter TTC |
|---|---|---|
| **> 10 et < 25** | 0,7668 % | 381,426 € |
| **≥ 25 et < 100** | 0,6384 % | 318,108 € |
| **≥ 100 et < 250** | 0,4788 % | 238,710 € |
| **≥ 250 et < 500** | 0,3828 % | 191,394 € |
| **≥ 500** | 0,3192 % | 159,312 € |

*(Barèmes complets à 4 tranches disponibles dans la fiche source ; la tranche > 60 000 € est la plus opérante en pratique.)*

### Démembrement
- **Acquisition démembrée par deux personnes** : un émolument **distinct** pour l'acquéreur de l'usufruit et pour l'acquéreur de la nue-propriété.
- **Vente avec réserve d'usufruit ou de DUH viager** par le vendeur : émolument calculé sur le **prix exprimé dans l'acte**.

### Émoluments de formalités (vente)

| Formalité | HT | TTC |
|---|---|---|
| Forfait publication au fichier immobilier | 339,58 € | **407,496 €** |
| Purge du droit de préemption | 37,73 € | 45,276 € |
| Déclaration de plus-value | 56,60 € | 67,920 € |
| Rédaction d'imprimés de TVA | 18,87 € | 22,644 € |
| Notification au syndic de copropriété | 15,09 € | 18,108 € |
| Purge du droit de rétractation de l'acquéreur | 15,09 € | 18,108 € |
| Copie (notification du droit de rétractation) | 0,38 €/page | 0,456 €/page |
| Obtention documents copropriété / urbanisme / dossier de construction | 56,60 € chacun | 67,920 € chacun |
| Vérification casier judiciaire — personnes physiques ou morale ≤ 5 associés | 37,73 € | 45,276 € |
| Vérification casier judiciaire — personne morale > 5 associés | 75,46 € | 90,552 € |

## 20.5. Règles transversales

### Écrêtement (mutations immobilières) — C. com. art. A. 444-175
> La rémunération totale du notaire (émoluments proportionnels **et** de formalités confondus) ne peut **excéder 10 % de la valeur du bien**, sans pouvoir être **inférieure à 90 €**.

### Émolument minimal (hors mutations immobilières) — C. com. art. A. 444-58
Pour les actes portant sur des biens ou droits d'une valeur **< 500 €** : émolument fixe = taux proportionnel de la **1ʳᵉ tranche** du type d'acte, appliqué à **500 €**.

### Remises — C. com. art. A. 444-174

| Seuil | Remise maximale | Portée |
|---|---|---|
| Prix ou évaluation **> 100 000 €** | **20 %** | Uniquement sur la fraction des émoluments correspondant à la fraction du prix **supérieure à 100 000 €**. Toutes prestations tarifées (ventes, crédits, actes de famille, déclarations de succession…) |
| Prix ou évaluation **≥ 10 000 000 €** | **40 %** | Uniquement sur les tranches d'assiette > 10 M€ **et** pour certains actes limitativement énumérés (voir ci-dessous) |

*Rappel : jusqu'au 31 décembre 2020, la remise était de 10 % au-delà de 150 000 €.*

**Actes éligibles à la remise de 40 %** : mutation ou financement d'un bien à usage **non résidentiel** ; prestations de la sous-catégorie « actes relatifs principalement aux biens immobiliers et fonciers » (tableau 5, annexe 4-7 du décret n° 2016-230), qui inclut aussi l'habitation ; apports d'immeuble, fusions-absorptions emportant transfert de propriété immobilière, financements assortis de sûretés hypothécaires (n° 115 à 119) ; opérations sur **logements sociaux** ou en vue du développement du parc social ; **mutations à titre gratuit bénéficiant des exonérations Dutreil (CGI art. 787 B et 787 C)** ; actes sur biens mixtes (professionnels + habitation) — la limite s'appliquant alors à la portion correspondant à la superficie non résidentielle ou résidentielle sociale, et aux seuls biens exonérés.

⚠️ **Les remises ne s'appliquent pas** si les prestations sont effectuées **sur mandat judiciaire**.
⚠️ Au-delà d'un **seuil d'émoluments de 200 000 €**, le taux de remise peut être **librement convenu** avec le client (émoluments appréciés après application des remises précédentes).

### Outre-mer
Majoration des émoluments par coefficient (C. com. art. A. 444-53 et R. 444-12-1). Taux de TVA différents de la métropole.

---

# 21. Le recel successoral

**Définition** (C. civ. art. 778) : fait pour un héritier de **dissimuler volontairement l'existence d'un autre héritier** ou de **détourner frauduleusement à son profit certains biens** du défunt, dans le but de rompre l'égalité du partage (Cass. civ. 1, 11 oct. 2017).

**Deux éléments à prouver** :
1. **Élément intentionnel** : la volonté de rompre l'égalité du partage ;
2. **Élément matériel** : manœuvres de l'héritier (dissimulation de biens, de donations, d'un cohéritier…).

**Sanctions** : l'héritier receleur est réputé **acceptant pur et simple**, perd toute vocation sur les biens recelés et doit les restituer (avec les fruits et revenus), sans pouvoir prétendre à aucune part sur ceux-ci.

⚠️ **Droit au repentir** : possible, mais il doit être **spontané**, c'est-à-dire **antérieur aux poursuites et à la découverte du recel** par les autres héritiers (Cass. civ. 1, 17 janv. 2006, n° 04-17675).

⚠️ Le recel prive également l'héritier du **droit d'option** (art. 768 : le droit d'option est ouvert à l'héritier « qui n'a ni détourné, ni recelé des biens de la succession, ni dissimulé l'existence d'un héritier »).

⚠️ Si la succession a **déjà été partagée**, la demande de rapport d'une libéralité et l'application de la sanction de recel supposent une **action judiciaire en nullité du partage, en complément de part ou en partage complémentaire** (Cass. civ. 1, 6 nov. 2019, n° 18-24.332 ; 2 sept. 2020, n° 19-15.955).

---

# Annexe 1 — Séquence de calcul complète

⚙️ **Pseudo-algorithme de liquidation d'une succession**

```
ÉTAPE 0 — PRÉREQUIS
  0.1  Vérifier l'ouverture (décès / disparition / absence) et fixer la DATE D'OUVERTURE
  0.2  Identifier les héritiers : ordre → degré → correctifs (représentation, fente)
  0.3  Filtrer : existence, indignité, renonciation
  0.4  Recenser les dispositions : testament(s), DDV, donations antérieures, contrat de mariage
  0.5  SI marié → LIQUIDER LE RÉGIME MATRIMONIAL (récompenses, avantages matrimoniaux)

ÉTAPE 1 — MASSE DE CALCUL DE LA RÉSERVE          [valeurs au JOUR DU DÉCÈS]
  1.1  Actif brut (biens existants, valeur au décès)
  1.2  − Passif déductible
  1.3  SI (1.1 − 1.2) < 0 ALORS retenir 0
  1.4  + RÉUNION FICTIVE de TOUTES les donations
         valeur au décès × état au jour de la libéralité − charges
         exception : donation-partage → valeur au jour de l'acte (si conditions)
  = MASSE DE CALCUL

ÉTAPE 2 — RÉSERVE ET QUOTITÉ DISPONIBLE
  2.1  Compter N = enfants vivants + représentés + renonçants représentés
                  + renonçants tenus au rapport malgré renonciation
  2.2  SI N ≥ 1 : réserve globale = [1/2 ; 2/3 ; 3/4] ; QD = [1/2 ; 1/3 ; 1/4]
       SI N = 0 ET conjoint : réserve = 1/4 ; QD = 3/4
       SI N = 0 ET pas de conjoint : QD = 100 %
  2.3  SI libéralité au conjoint → calculer aussi la QDS (1094-1) et combiner (§ 6.6)

ÉTAPE 3 — IMPUTATION                              [ordre impératif]
  3.1  DONATIONS, de la PLUS ANCIENNE à la PLUS RÉCENTE
         (donation sans date certaine → après toutes les autres donations)
  3.2  LEGS, de manière concomitante (sauf clause d'imputation prioritaire)
  Pour chaque libéralité :
       réservataire + avancement de part → réserve individuelle, puis QD
       réservataire + hors part          → QD
       non-réservataire                  → QD
       usufruit hors part                → imputation "en assiette" (US vs US de la QD)
       NP donnée par un usufruitier      → imputer la valeur en PLEINE PROPRIÉTÉ

ÉTAPE 4 — RÉDUCTION                               [si excédent]
  4.1  Réduire les LEGS d'abord, simultanément et proportionnellement
         (DDV pendant mariage = legs ; DDV dans contrat de mariage = donation)
  4.2  Puis les DONATIONS, de la PLUS RÉCENTE à la PLUS ANCIENNE
  4.3  Indemnité de réduction déterminée AU DÉCÈS
  4.4  RÉÉVALUER au jour du partage :
         indemnité_partage = valeur_partage × (indemnité_décès / valeur_décès)

ÉTAPE 5 — DROITS DU CONJOINT SURVIVANT
  5.1  Déterminer si option ouverte (tous enfants communs ?)
  5.2  SI usufruit : assiette = biens existants − biens légués − biens donnés
  5.3  SI 1/4 PP : double masse
         masse de CALCUL (art. 758-5) → chiffrer le quart
         masse d'EXERCICE            → biens non donnés ni légués
  5.4  Ajouter, hors imputation : droit temporaire au logement (1 an)
       Imputer sur sa part : droit viager d'usage et d'habitation (60 % de l'US 669,
       âge = décès + 1 an)

ÉTAPE 6 — MASSE À PARTAGER                       [valeurs au JOUR DU PARTAGE]
  6.1  Actif net (valeur au partage)
  6.2  + RAPPORT des donations en avancement de part
         valeur au PARTAGE × état au jour de la libéralité
         (sauf clause de rapport forfaitaire ou clause modifiant la date)
  6.3  + Indemnités de réduction réévaluées
  = MASSE À PARTAGER
  ⚠ Si une donation est à la fois rapportable ET réductible,
     seul le montant du RAPPORT figure dans la masse (il recouvre la réduction)

ÉTAPE 7 — ATTRIBUTION
  7.1  Part théorique de chaque héritier = masse à partager × quote-part
  7.2  Déduire ce que chacun a déjà reçu (rapport en moins prenant)
  7.3  Si dépassement → INDEMNITÉ DE RAPPORT (soulte)
  7.4  Correctifs : attribution préférentielle, conversion de l'usufruit du conjoint
  7.5  Tirage au sort à défaut d'accord

ÉTAPE 8 — LIQUIDATION FISCALE
  8.1  Actif brut fiscal (dont forfait mobilier 5 % sauf inventaire)
  8.2  − Passif déductible (dont frais funéraires 1 500 €)
         ⚠ filtrer les dettes non déductibles : art. 773-2° et 774 bis
  8.3  Intégrer le rapport civil (valeurs du rapport), même > 15 ans
  8.4  Rappel fiscal des donations (15 ans)
  8.5  Abattements → barème → droits par héritier
  8.6  Dépôt : 6 mois (12 mois si domicile à l'étranger)
```

## Récapitulatif des DATES D'ÉVALUATION

⚙️ **Le point le plus critique à modéliser correctement.**

| Opération | Valeur retenue | État du bien | Texte |
|---|---|---|---|
| **Réunion fictive** (réserve) | **Jour du DÉCÈS** | Jour de la libéralité | art. 922 |
| **Rapport** | **Jour du PARTAGE** | Jour de la libéralité | art. 860 |
| **Indemnité de réduction** | Déterminée au **DÉCÈS**, **réévaluée au PARTAGE** | — | art. 924-2 |
| **Actif successoral** (fiscal et civil) | Jour du décès | — | — |
| **Masse à partager** | Jour du partage | — | — |
| **Donation-partage** (réunion fictive) | **Jour de l'acte** (si conditions réunies) | — | art. 1078 |
| **Rapport forfaitaire** | Montant fixé dans l'acte ; l'excédent = avantage hors part | — | art. 860 al. 4 |
| **DUH du conjoint** (barème 669) | Âge à **décès + 1 an** | — | CGI art. 762 bis |
| **Charge grevant une donation** | Jour de son **exécution** (non réévaluée) | — | Cass. 16 nov. 2022 |

---

# Annexe 2 — Tableau des délais

| Délai | Point de départ | Objet |
|---|---|---|
| **24 heures** | Décès | Déclaration de décès à l'état civil |
| **1 mois** | Date de l'acte | Enregistrement d'un partage exclusivement mobilier ; enregistrement de la RAAR ; transmission au TJ de la déclaration d'option reçue par notaire |
| **2 mois** | Date de l'acte | Formalité fusionnée (partage immobilier ou mixte) |
| **2 mois** | Déclaration d'acceptation à concurrence de l'actif net | Dépôt de l'inventaire — ⚠️ à défaut, acceptation pure et simple |
| **3 mois** | Interpellation écrite par un héritier | Délai d'option du conjoint (à défaut : réputé avoir opté pour l'usufruit) |
| **3 mois** | Décès | Enregistrement des testaments reçus par notaire (125 €) |
| **6 mois** | Décès | **Déclaration de succession** (domicile en France) |
| **6 mois** | Décès | Demande de déclaration d'indignité facultative (ou 6 mois de la condamnation si postérieure) |
| **6 mois** | Conversion rétroactive de l'usufruit | Déclaration complémentaire |
| **6 mois** | Fin de mission | Reddition de comptes de l'exécuteur testamentaire |
| **10 mois** | Décès | Publication d'un acte de partage dispensant de l'attestation de propriété |
| **1 an** | Décès | Droit de jouissance temporaire du logement ; **option pour le droit viager** ; demande de pension du conjoint dans le besoin ; créance d'aliments des ascendants |
| **1 an** | Décès | Déclaration de succession si domicile du défunt à l'étranger |
| **2 ans** | Désignation | Durée de la mission de l'exécuteur testamentaire (+1 an prorogeable) |
| **2 ans** | Partage | Action en **complément de part** (lésion > 1/4) |
| **2 ans** | Éviction / découverte du trouble | Action en **garantie des lots** |
| **2 ans** | Connaissance de l'atteinte | Action en réduction / retranchement (voie alternative) |
| **5 ans** | Ouverture de la succession | Action en **réduction** / **retranchement** (voie principale) |
| **5 ans** | Décès | Action en **délivrance de legs** (art. 2224) |
| **5 ans** | Partage | Action en **annulation** du partage (vice du consentement, omission d'héritier) |
| **5 ans** | Retour du bien au donateur | Imputation des droits de la 1ʳᵉ donation sur la 2ᵉ (CGI art. 791 ter) |
| **10 ans** | Ouverture de la succession | **Option successorale** ; rétractation d'une renonciation ; délai maximal absolu de l'action en réduction ; option du conjoint à défaut d'interpellation |
| **15 ans** | Donation | Rappel fiscal des donations |
| **30 ans** | Non-usage | Extinction de l'usufruit / du DUH |
| **30 ans** | Décès | **Pétition d'hérédité** |
| **70 ans** | Décès de l'auteur | Durée des droits d'exploitation transmis (CPI) |

---

# Annexe 3 — Points de vigilance pour la modélisation

## A3.1. Pièges de calcul les plus fréquents

1. **Double date d'évaluation** — réunion fictive au **décès**, rapport au **partage**. Deux jeux de valeurs distincts doivent coexister dans le modèle de données pour chaque libéralité.
2. **Imputation « en assiette » des libéralités en usufruit** — comparer usufruit contre usufruit de la QD, jamais la valeur PP. Divergence de résultat majeure (voir § 8.6.2).
3. **Ordre inverse imputation / réduction des donations** — imputation de la plus **ancienne** à la plus **récente** ; réduction de la plus **récente** à la plus **ancienne**.
4. **Legs réduits avant les donations**, tous proportionnellement, DDV incluse.
5. **Comptage N des enfants** — inclut les renonçants représentés et les renonçants tenus au rapport ; exclut les autres renonçants.
6. **Assiette de l'usufruit du conjoint** ≠ actif successoral — retrancher les biens légués **et** les biens donnés.
7. **Double masse de l'art. 758-5** — le quart en PP se *calcule* sur une masse et s'*exerce* sur une autre.
8. **Rapport + réduction cumulés** — ne faire figurer dans la masse à partager que le **rapport**, qui recouvre déjà l'indemnité de réduction.
9. **Masse négative** — si passif > actif, la masse de calcul est ramenée à **zéro**, jamais négative.
10. **Droit viager au logement** : âge à retenir = **décès + 1 an**, et valeur = **60 % de l'usufruit 669**.
11. **Émolument de déclaration de succession** : assiette = actif **brut**, **sans aucun passif**, mais avec la fraction des primes d'assurance-vie relevant du 757 B au-delà de 30 500 €.
12. **Récompenses** : un solde créditeur au profit de la communauté s'ajoute à l'assiette des émoluments ; au profit de l'époux, il en est déduit.

## A3.2. Règles d'alerte / conseil exploitables

| Situation détectée | Alerte à générer |
|---|---|
| Enfant non commun **+** régime communautaire ou société d'acquêts **+** avantage matrimonial | Risque d'**action en retranchement** (§ 11) — proposer une renonciation anticipée art. 1527 al. 3 |
| Donation de la **nue-propriété d'une somme d'argent** avec réserve d'usufruit | **Dette de restitution jamais déductible** (CGI art. 774 bis ①) — schéma à proscrire |
| Quasi-usufruit né **du prix de cession** d'un bien démembré | Déductibilité **sous condition de preuve** (774 bis ②) — documenter l'absence de but principalement fiscal |
| Convention de quasi-usufruit **sans date certaine** | Non déductible (présomption de fictivité, CGI art. 773, 2°) — faire enregistrer |
| Conjoint optant pour l'usufruit **et** patrimoine largement donné du vivant | Usufruit de faible assiette — envisager la **DDV** ou le quart en PP |
| Conjoint souhaitant l'**attribution préférentielle** du logement | Vérifier qu'il a un droit de propriété préexistant → **le quart en PP** peut être nécessaire |
| Conjoint ayant opté pour l'usufruit total | Recommander **malgré tout** l'option pour le **droit viager** (risque d'enfant caché) |
| Volonté d'écarter le droit viager au logement | **Testament authentique obligatoire** |
| Enfant handicapé ou vulnérable / transmission d'entreprise | Envisager une **RAAR** des autres enfants |
| Concubins acquérant en commun | Comparer **tontine** (fiscalité 60 %, blocage) vs indivision vs SCI |
| Tontine sur habitation principale | Vérifier le seuil de **76 000 €** et les 4 conditions (droits de vente au lieu des DMTG) |
| Bien détenu via une **SCI** | Ni droit temporaire, ni droit viager, ni attribution préférentielle sur le logement — **sauf bail conclu avec la société** |
| Enfant renonçant ayant reçu une donation | Vérifier la clause de rapport en cas de renonciation, sinon rupture d'égalité |
| Donations « sans date certaine » (dons manuels non enregistrés) | Imputation **après** toutes les autres donations → risque accru de réduction |
| Cadeaux importants récurrents | Constituer la **preuve du présent d'usage** (date, événement, proportion) |
| Vente en viager / avec réserve d'usufruit à un enfant | Présomption de donation hors part (art. 918) → faire **intervenir tous les enfants à l'acte** |

## A3.3. Limites connues à documenter

- **Réserve et droit international** : le prélèvement compensatoire de l'art. 913 al. 3 suppose des conditions de rattachement UE difficiles à modéliser.
- **Droit de retour des père et mère** : incertitude doctrinale sur l'assiette du plafond (1/4 de la valeur du bien vs bien dans la limite du quart de la succession).
- **Quasi-usufruit successif** : régime civil et fiscal débattu, pas de position stabilisée.
- **Faculté de conversion et « héritiers » de l'art. 759-1** : question non tranchée sur l'inclusion du conjoint.
- **Art. 774 bis** : périmètre de la notion de « réserve d'usufruit » potentiellement élargi par le BOFiP au-delà de la définition civile.

---

# Annexe 4 — Index des textes cités

## Code civil
**Ouverture** : 78 · 92 · 112 · 113 · 118 · 122 · 129 · 130 · 720 · 722 · 724 · 725 · 725-1 · 726 à 729-1 · 730-1
**Dévolution** : 732 · 734 · 736 · 737 · 738 · 738-1 · 738-2 · 740 · 741 · 742 · 744 · 746 à 750 · 749 · 751 à 755 · 757 · 757-1 · 757-2 · 757-3 · 758 · 758-1 à 758-5 · 759 à 762 · 763 à 766 · 767 · 811 à 811-3
**Option** : 768 · 769 · 770 · 776 · 778 · 779 · 780 · 782 et s. · 787 et s. · 788 · 790 · 791 · 792-2 · 800 · 801 · 804 et s. · 805 · 807
**Indivision et partage** : 812 et s. · 815 et s. · 815-8 · 815-10 · 815-11 · 815-13 · 816 à 892 · 826 · 828 · 831 · 831-2 · 834 · 836 · 839 · 840 à 842 · 841 · 884 à 886 · 887 · 887-1 · 889
**Rapport** : 843 à 863 · 845 · 847 · 852 · 856 · 857 · 858 · 859 · 860 · 861 · 863 · 864 et s.
**Réserve et réduction** : 901 · 903 · 904 · 906 · 912 · 913 · 913-1 · 914-1 · 917 · 918 · 919-1 · 919-2 · 920 · 921 · 922 · 924 · 924-2 · 924-4 · 927 · 929 à 930-5
**Testament** : 895 · 968 · 971 · 972 · 976 · 977 · 981 et s. · 1004 · 1006 · 1007 · 1008 · 1011 · 1014 · 1035 · 1036
**Libéralités-partages** : 1075 · 1075-1 · 1075-2 · 1075-5 · 1078 · 1078-1 · 1078-2 · 1078-8 · 1079
**Régimes matrimoniaux** : 1104 · 1390 et s. · 1399-1 · 1399-5 · 1399-6 · 1423 · 1424 · 1481 (anc.) · 1094 (anc.) · 1094-1 · 1097 (anc.) · 1098 (anc.) · 1511 et s. · 1527
**Démembrement** : 587 · 600 · 601 · 602 · 607 · 618 · 625
**Divers** : 311 · 366 · 382-1 · 387 · 387-1 · 467 · 476 · 490 · 493 · 494-6 · 504 · 505 · 507 · 507-1 · 951 · 1353 · 1696 à 1698 · 1751 · 1895 · 2224 · 2318 · 2374-3°

## Code général des impôts
**Évaluation** : 669 · 762 (anc.) · 762 bis · 683
**Successions et donations** : 750 · 750 bis C · 754 · 756 bis · 757 B · 763 bis · 768 · 773, 2° · **774 bis** · 787 B · 787 C · 790 G · 791 ter · 795, 11° · 800 · 641 · 656 · 680 · 746 à 748 · 990 I · 1728
**Autres** : 13, 5° · 125-0 A · 974

## Autres codes et textes
- **Code de commerce** : A. 444-53 · A. 444-54 · A. 444-56 · A. 444-58 · A. 444-63 · A. 444-66 · A. 444-67 · A. 444-68 · A. 444-169 à 173 · A. 444-174 · A. 444-175 · R. 444-12-1
- **CPC** : 1334 · 1358 à 1381
- **COJ** : L. 213-3
- **CMF** : L. 312-1-4
- **CPI** : L. 121-2 · L. 123-1 · L. 123-6
- **Code rural** : L. 411-34
- **Code des assurances** : R. 322-139 à R. 322-159 (dont R. 322-145, R. 322-152)
- **Code de l'expropriation** : L. 13-7 · L. 311-2
- **CGCT** : L. 2223-13 et s.
- **Règlement (UE) n° 650/2012**, art. 21 et 22

## Lois et décrets
- Loi n° 2001-1135 du 3 déc. 2001 (droits du conjoint survivant)
- Loi n° 2006-728 du 23 juin 2006 (réforme des successions — en vigueur au 1ᵉʳ janv. 2007)
- Décret n° 55-22 du 4 janv. 1955 (publicité foncière), art. 28 et 29
- Décret n° 2016-230 et arrêté du 26 fév. 2016 (tarifs)
- Loi n° 2016-1547 du 18 nov. 2016 (modernisation de la justice) + décret n° 2016-1907 du 28 déc. 2016
- Loi n° 2015-177 du 16 fév. 2015 (testament authentique — interprète)
- Loi n° 2018-1244 du 27 déc. 2018 (art. 4) modifiée par loi n° 2024-322 du 9 avril 2024
- Décret n° 2020-179 et arrêtés des 28 fév. et 28 avril 2020 (tarifs, entrée en vigueur reportée au 1ᵉʳ janv. 2021)
- Loi n° 2020-936 du 30 juill. 2020 (violences conjugales), art. 8
- Loi n° 2020-1721 du 29 déc. 2020 (LF 2021), art. 156
- Loi n° 2019-1479 du 28 déc. 2019 (LF 2020), art. 108 (droit de partage)
- Loi n° 2021-1109 du 24 août 2021, art. 24 (prélèvement compensatoire)
- **LF 2024** → CGI art. 774 bis (successions ouvertes à compter du 29 déc. 2023)
- **Loi n° 2024-494 du 31 mai 2024** (justice patrimoniale, violences conjugales — en vigueur au 2 juin 2024)

## Doctrine administrative (BOFiP)
BOI-ENR-DMTG-10-10-10-10 · BOI-ENR-DMTG-10-20-50-20 · BOI-ENR-DMTG-10-40-10-50 · BOI-ENR-DMTG-10-40-20-20 · BOI-ENR-DMTG-10-50-10 · BOI-ENR-DMTG-10-50-20 · BOI-ENR-DMTG-10-50-50 · BOI-ENR-DMTG-10-60-20 · BOI-ENR-DMTG-10-60-50 · BOI-ENR-DMTG-20-10-10 · BOI-ENR-DMTG-20-10-20-10 · BOI-ENR-DMTOI-10-10-10 · BOI-ENR-DMTOM-40-10-20 · BOI-ENR-DG-70-20 · BOI-ENR-PTG-10-10 · BOI-ENR-PTG-10-20 · BOI-ENR-PTG-10-30 · BOI-ENR-PTG-20-20 · BOI-ENR-PTG-30-10 · BOI-ENR-PTG-30-20 · BOI-RFPI-PVI-20-20 · BOI-REC-FORCE-40-10 · BOI-TCAS-ASSUR-10-40-30-10

---

*Document de travail — consolidation de sources documentaires arrêtées au 29 mars 2025. Les barèmes, seuils et taux doivent être revérifiés avant toute mise en production, en particulier ceux susceptibles d'évoluer en loi de finances.*
