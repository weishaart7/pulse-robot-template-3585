# Référentiel — Retraites de base et principes généraux

**Objet.** Référentiel de travail destiné à la spécification du module Retraite. Chaque section expose d'abord la règle juridique, puis sa traduction en règle de calcul exploitable.

**État du droit.** À jour au 12 août 2026. Deux réformes se superposent et doivent être distinguées dans tout moteur de calcul :

- **Loi 2023-270 du 14 avril 2023** (LFRSS 2023) : relèvement de l'âge légal vers 64 ans et accélération de la durée d'assurance, applicable aux pensions prenant effet à compter du 1er septembre 2023.
- **Article 105 de la loi 2025-1403 du 30 décembre 2025** (LFSS 2026) : décalage du calendrier pour les générations 1964 à 1968, applicable aux pensions prenant effet **à compter du 1er septembre 2026**. Décret d'application 2026-345 du 7 mai 2026 (JO du 8 mai 2026) pour les départs anticipés. Circulaire CNAV 2026-07 du 5 mars 2026, qui remplace la circulaire 2024-25 pour ces pensions.

**Conséquence structurante.** La date d'effet de la pension est un paramètre de calcul à part entière, pas seulement une date de versement. Pour une même génération, deux jeux de paramètres coexistent selon que la pension prend effet avant ou à compter du 1er septembre 2026. Voir §2.1.3.

**Sources.** Code de la sécurité sociale (CSS), Code des pensions civiles et militaires de retraite (CPCMR), circulaires CNAV, barèmes des caisses. Les documents Fidroit fournis (mars 2025) ont servi de base structurante ; les écarts constatés avec le droit en vigueur sont recensés au §12.

**Périmètre.** Retraites de base uniquement. Les régimes complémentaires (AGIRC-ARRCO, RCI, IRCANTEC, sections professionnelles CNAVPL, RAFP, CNBF complémentaire) ne sont traités que lorsqu'ils conditionnent un paramètre du régime de base.

---

## Sommaire

1. Architecture du système
2. Socle transversal
3. Régime général — salariés (CNAV)
4. Travailleurs indépendants (SSI)
5. Professions libérales (CNAVPL)
6. Avocats (CNBF)
7. Fonction publique — agents titulaires
8. Fonction publique — agents contractuels
9. Artistes-auteurs
10. Retraite mutualiste du combattant (RMC)
11. Annexe — paramètres chiffrés 2026
12. Annexe — écarts, incertitudes et points de vigilance

---

# 1. Architecture du système

## 1.1. Les trois niveaux

| Niveau | Nature | Caractère |
|---|---|---|
| Retraite de base | Répartition, régime légal | Obligatoire |
| Retraite complémentaire | Répartition, régime légal ou conventionnel | Obligatoire |
| Retraite supplémentaire | Capitalisation (PER, art. 83, PERO…) | Facultatif |

Un professionnel médical libéral peut relever de quatre niveaux : base, complémentaire, prestations complémentaires vieillesse (PCV/ASV), supplémentaire.

## 1.2. Affiliation par statut

L'affiliation dépend du statut et de l'activité, non du choix de l'assuré. Il existe environ 42 régimes obligatoires, plusieurs régimes spéciaux étant fermés aux nouveaux entrants.

| Statut | Base | Complémentaire |
|---|---|---|
| Salarié du privé, assimilé salarié (président de SAS, gérant minoritaire) | CNAV (régime général) | AGIRC-ARRCO |
| Salarié agricole | MSA (règles alignées) | AGIRC-ARRCO |
| Enseignant du privé sous contrat | CNAV | AGIRC-ARRCO + RAR |
| Agent contractuel de la fonction publique | CNAV | IRCANTEC |
| Artisan, commerçant, industriel, gérant majoritaire de SARL, libéral non réglementé | SSI (règles alignées) | RCI |
| Exploitant agricole | MSA | MSA-RCO |
| Profession libérale réglementée (art. L. 640-1 CSS) | CNAVPL | 10 sections professionnelles |
| Avocat | CNBF | CNBF |
| Artiste-auteur créateur d'œuvres originales | CNAV (branche dédiée) | IRCEC |
| Fonctionnaire civil ou militaire de l'État | SRE | RAFP |
| Fonctionnaire territorial ou hospitalier | CNRACL | RAFP |
| Régimes spéciaux (CNIEG, CRPCEN, CRP-RATP, CPR-SNCF, ENIM, CANSSM, CAVIMAC, CRPCF, CROPERA…) | Régime propre | Variable |

Les dix sections professionnelles CNAVPL : CARCDSF (chirurgiens-dentistes, sages-femmes), CARMF (médecins), CARPIMKO (auxiliaires médicaux), CARPV (vétérinaires), CAVAMAC (agents généraux d'assurance), CAVEC (experts-comptables, commissaires aux comptes), CAVOM (officiers ministériels), CAVP (pharmaciens), CIPAV (architectes, ingénieurs conseils, psychologues, ostéopathes, moniteurs de ski…), CPRN (notaires).

Cinq régimes spéciaux (IEG, CRPCEN, RATP, Banque de France, CESE) sont fermés aux embauches postérieures au 1er septembre 2023, les nouveaux entrants relevant du régime général. Les mines sont fermées depuis 2010. Le statut de cheminot est fermé depuis le 1er janvier 2020, mais le régime SNCF reste ouvert.

**Règle de calcul.** L'affiliation est déterministe, dérivable d'un couple (nature d'activité, forme juridique / statut). La pluriactivité produit une affiliation multiple simultanée, chaque régime calculant sa propre pension. Ne jamais présumer un régime unique.

## 1.3. Régimes par annuités et régimes par points

| | Régimes par annuités | Régimes par points |
|---|---|---|
| **Base** | CNAV, MSA, SSI (droits depuis 1973), SRE, CNRACL, CNBF | CNAVPL, SSI (droits antérieurs à 1973) |
| **Complémentaire** | CRPN, CAVP (hybride) | AGIRC-ARRCO, RCI, IRCANTEC, RAFP, CNBF, et l'ensemble des sections CNAVPL |

**Annuités** : `rémunération de référence × taux de liquidation × coefficient de proratisation`.
**Points** : `nombre de points × valeur de service du point × taux de liquidation`.

Point d'attention : un régime par points peut appliquer une décote fondée sur les **trimestres** (CNAVPL, RCI, CIPAV) ou sur l'**âge** seul (CAVEC, CPRN, CAVOM, CARCDSF, CAVP, CARPV, CAVAMAC). Cette distinction commande l'utilité d'un rachat de trimestres : un rachat est sans effet dans un régime dont la décote dépend de l'âge. La CARMF et la RAFP n'appliquent aucune décote.

---

# 2. Socle transversal

## 2.1. Âge légal d'ouverture des droits

### 2.1.1. Barème applicable aux pensions prenant effet à compter du 1er septembre 2026

Article L. 161-17-2 CSS modifié par l'art. 105-I de la loi 2025-1403. Circulaire CNAV 2026-07, annexe 1.

| Date de naissance | Âge légal | Durée requise (trimestres) | Âge du taux plein |
|---|---|---|---|
| Avant le 01/07/1951 | 60 ans | — | 65 ans |
| 01/07/1951 – 31/12/1951 | 60 ans 4 mois | 163 | 65 ans 4 mois |
| 1952 | 60 ans 9 mois | 164 | 65 ans 9 mois |
| 1953 | 61 ans 2 mois | 165 | 66 ans 2 mois |
| 1954 | 61 ans 7 mois | 165 | 66 ans 7 mois |
| 1955 – 1957 | 62 ans | 166 | 67 ans |
| 1958 – 1960 | 62 ans | 167 | 67 ans |
| 01/01/1961 – 31/08/1961 | 62 ans | 168 | 67 ans |
| 01/09/1961 – 31/12/1961 | 62 ans 3 mois | 169 | 67 ans |
| 1962 | 62 ans 6 mois | 169 | 67 ans |
| 1963 | 62 ans 9 mois | 170 | 67 ans |
| **1964** | **62 ans 9 mois** *(au lieu de 63 ans)* | **170** *(au lieu de 171)* | 67 ans |
| **01/01/1965 – 31/03/1965** | **62 ans 9 mois** *(au lieu de 63 ans 3 mois)* | **170** *(au lieu de 172)* | 67 ans |
| **01/04/1965 – 31/12/1965** | **63 ans** *(au lieu de 63 ans 3 mois)* | **171** *(au lieu de 172)* | 67 ans |
| **1966** | **63 ans 3 mois** *(au lieu de 63 ans 6 mois)* | 172 | 67 ans |
| **1967** | **63 ans 6 mois** *(au lieu de 63 ans 9 mois)* | 172 | 67 ans |
| **1968** | **63 ans 9 mois** *(au lieu de 64 ans)* | 172 | 67 ans |
| À partir de 1969 | 64 ans | 172 | 67 ans |

L'âge cible de 64 ans s'applique désormais à compter de la génération **1969**, et non 1968.

### 2.1.2. Barème applicable aux pensions prenant effet du 01/09/2023 au 31/08/2026

Calendrier issu de la loi 2023-270, qui reste opposable pour ces dates d'effet.

| Naissance | Âge légal | Durée requise |
|---|---|---|
| 1955 – 1957 | 62 ans | 166 |
| 1958 – 1960 | 62 ans | 167 |
| 01/01 – 31/08/1961 | 62 ans | 168 |
| 01/09 – 31/12/1961 | 62 ans 3 mois | 169 |
| 1962 | 62 ans 6 mois | 169 |
| 1963 | 62 ans 9 mois | 170 |
| 1964 | 63 ans | 171 |
| 1965 | 63 ans 3 mois | 172 |
| 1966 | 63 ans 6 mois | 172 |
| 1967 | 63 ans 9 mois | 172 |
| À partir de 1968 | 64 ans | 172 |

### 2.1.3. Règle de bascule — implémentation

```
paramètres(génération, date_effet) :
  si date_effet >= 1er septembre 2026        → barème §2.1.1
  si 1er sept. 2023 <= date_effet < 1er sept. 2026 → barème §2.1.2
  si date_effet < 1er septembre 2023         → barème antérieur (réformes 2010/2014)
```

Points de vigilance :

- La durée de 171 trimestres (né en 1964) et de 172 trimestres (né en 1965) **reste opposable** aux assurés dont la pension prend effet avant le 1er septembre 2026. Une liquidation anticipée de quelques semaines peut donc coûter un à deux trimestres de durée de référence.
- Le découpage 1965 n'est pas annuel mais **infra-annuel** (bascule au 1er avril pour l'âge et la durée). Un moteur qui raisonne uniquement par année de naissance produira des résultats faux pour cette génération.
- L'âge légal doit être appliqué en **mois exacts** à partir de la date de naissance, la date d'effet possible étant le 1er jour du mois suivant celui où l'âge est atteint (sauf naissance le 1er du mois : effet possible dès ce mois).
- Effet mécanique : les premiers assurés nés en 1964 concernés par la suspension atteignent 62 ans et 9 mois en septembre 2026, soit une date d'effet au 1er octobre 2026 au plus tôt.

### 2.1.4. Âge du taux plein automatique

Maintenu à **67 ans** pour toutes les générations nées à compter de 1955 (art. L. 351-8, 1° CSS). Construit comme « âge cible 64 ans + 3 ans » depuis la réforme 2023, alors qu'il correspondait auparavant à « âge légal + 5 ans ».

Âge du taux plein abaissé à **65 ans** pour les catégories des 1° bis à 6° de l'art. L. 351-8 : notamment assurés handicapés, aidants familiaux, parents d'enfant handicapé, anciens combattants et assimilés. Le taux plein est également acquis sans condition de durée en cas d'inaptitude au travail, de pension substituée à une pension d'invalidité (art. L. 341-15 et L. 632-1) ou substituée à l'AAH (art. L. 351-7-1 A).

## 2.2. Décote

### 2.2.1. Règle

Deux comptages, le **plus petit** est retenu (art. R. 351-27 CSS, modifié par le décret 2025-1409 du 30 décembre 2025) :

1. trimestres manquants par rapport à la durée requise de la génération (tous régimes confondus) ;
2. trimestres séparant l'âge à la date d'effet de l'âge du taux plein (67 ans, ou 65 ans pour les catégories dérogatoires) — **arrondi au trimestre supérieur**.

Coefficient : **1,25 % du taux plein par trimestre manquant**, soit −0,625 point de taux dans le régime général (50 % × 1,25 %).

```
trim_manquants_duree = max(0, duree_requise - trimestres_tous_regimes)
trim_manquants_age   = ceil(mois_jusqu_age_taux_plein / 3)
n = min(trim_manquants_duree, trim_manquants_age)
taux = 50% - (n × 0,625)
```

### 2.2.2. Taux minimum par génération (régime général)

Circulaire CNAV 2026-07, annexe 3. Le nombre maximum de trimestres d'âge manquants se réduit à mesure que l'âge légal se rapproche de 67 ans.

| Naissance | Trimestres d'âge max | Taux minimum |
|---|---|---|
| 01/01 – 31/08/1961 | 20 | 37,500 % |
| 01/09 – 31/12/1961 | 19 | 38,125 % |
| 1962 | 18 | 38,750 % |
| 1963 | 17 | 39,375 % |
| 1964 | 17 | 39,375 % |
| 01/01 – 31/03/1965 | 17 | 39,375 % |
| 01/04 – 31/12/1965 | 16 | 40,000 % |
| 1966 | 15 | 40,625 % |
| 1967 | 14 | 41,250 % |
| 1968 | 13 | 41,875 % |
| À partir de 1969 | 12 | 42,500 % |

Ces valeurs sont celles applicables aux pensions prenant effet à compter du 1er septembre 2026 ; elles diffèrent du barème antérieur pour les générations 1964 à 1968 (par exemple 40 % pour 1964 sous le calendrier 2023, contre 39,375 % désormais).

### 2.2.3. Situations excluant la décote

Le taux plein est acquis quelle que soit la durée : atteinte de 67 ans (ou 65 ans pour les catégories dérogatoires), inaptitude au travail, carrière longue, handicap, incapacité permanente, pension substituée à une pension d'invalidité ou à l'AAH, ex-travailleurs de l'amiante.

## 2.3. Surcote

### 2.3.1. Surcote pour prolongation d'activité

Art. L. 351-1-2 et D. 351-1-4 CSS. Deux conditions cumulatives : avoir dépassé l'âge légal **et** réunir la durée requise. Taux : **1,25 % par trimestre**, soit 5 % par an, sans plafond.

Point de départ de la période de référence :

- si la durée requise est atteinte **avant** l'âge légal → 1er jour du trimestre civil suivant l'atteinte de l'âge légal ;
- si la durée requise est atteinte **après** l'âge légal → 1er jour du mois suivant l'acquisition du dernier trimestre requis.

Fin de la période : dernier jour du trimestre civil précédant la date d'effet.

Trimestres ouvrant droit à surcote : uniquement ceux « à la charge de l'assuré » — cotisations obligatoires et volontaires (y compris congés et stages de formation professionnelle), tous régimes confondus, France et étranger sous convention, limités à 4 par année civile ; rachats au titre du taux **et** de la durée (option 2) situés dans la période de référence.

N'ouvrent pas droit à surcote : trimestres assimilés (maladie, chômage, invalidité, incapacité), périodes AVPF/AVA, rachats option 1 (taux seul), et l'ensemble des trimestres de majoration de durée d'assurance (enfants, congé parental, enfant handicapé, aidant, C2P).

Conséquences : un assuré qui liquide dès l'âge légal avec un excédent de trimestres n'obtient **aucune** surcote, faute d'avoir cotisé après l'âge légal. Un départ anticipé exclut la surcote, sauf reprise ultérieure en cumul emploi-retraite intégral au-delà de l'âge légal. Les trimestres cotisés après la liquidation n'ouvrent pas droit à surcote sur la pension liquidée.

### 2.3.2. Surcote parentale

Art. L. 351-1-2-1 et R. 351-2-1 CSS, créée par la réforme 2023, applicable depuis le 1er septembre 2023. Elle compense la perte d'utilité des trimestres pour enfant liée au relèvement de l'âge légal.

Conditions cumulatives :

1. détenir **au moins 1 trimestre de majoration de durée d'assurance** au titre de la maternité, de l'adoption, de l'éducation, d'un enfant handicapé ou d'un congé parental — quel que soit le régime de base qui l'octroie ;
2. réunir la durée requise **dès l'année précédant l'âge légal**, lorsque cet âge légal est **égal ou supérieur à 63 ans**.

Montant : 1,25 % par trimestre cotisé sur cette année, **plafonné à 5 %** (4 trimestres).

Conséquence d'implémentation : la condition « âge légal ≥ 63 ans » exclut les générations dont l'âge légal est inférieur. Sous le barème LFSS 2026, les générations 1964 et 1965-T1 ont un âge légal de 62 ans 9 mois : **la suspension les fait sortir du champ de la surcote parentale**, alors que le calendrier 2023 les y incluait (63 ans pour 1964). C'est un effet de bord contre-intuitif à tester explicitement.

Les trimestres de surcote parentale et de surcote classique s'additionnent dans un calcul global de majoration.

## 2.4. Validation des trimestres

### 2.4.1. Seuil de revenu

Art. R. 351-9 CSS. Depuis le 1er janvier 2014 : **150 × SMIC horaire brut** en vigueur au 1er janvier de l'année considérée, par trimestre, dans la limite de 4 par année civile.

Historique : 200 × SMIC horaire du 01/01/1972 au 31/12/2013 ; montant trimestriel de l'AVTS au 1er janvier du 01/01/1949 au 31/12/1971 ; 1 800 anciens francs de 1947 à 1948.

| Année | 1 trimestre | 4 trimestres | SMIC horaire |
|---|---|---|---|
| 2026 | 1 803 € | 7 212 € | 12,02 € |
| 2025 | 1 782 € | 7 128 € | 11,88 € |
| 2024 | 1 747,50 € | 6 990 € | 11,65 € |
| 2023 | 1 690,50 € | 6 762 € | 11,27 € |
| 2022 | 1 585,50 € | 6 342 € | 10,57 € |
| 2021 | 1 537,50 € | 6 150 € | 10,25 € |
| 2020 | 1 522,50 € | 6 090 € | 10,15 € |
| 2019 | 1 504,50 € | 6 018 € | 10,03 € |
| 2018 | 1 482 € | 5 928 € | 9,88 € |
| 2017 | 1 464 € | 5 856 € | 9,76 € |
| 2016 | 1 450,50 € | 5 802 € | 9,67 € |
| 2015 | 1 441,50 € | 5 766 € | 9,61 € |
| 2014 | 1 429,50 € | 5 718 € | 9,53 € |
| 2013 | 1 886 € | 7 544 € | 9,43 € (× 200) |
| 2012 | 1 844 € | 7 376 € | 9,22 € (× 200) |
| 2011 | 1 800 € | 7 200 € | 9,00 € (× 200) |

### 2.4.2. Règles complémentaires

- **Pas de durée minimale d'activité** : 4 trimestres peuvent être validés en quelques mois si le revenu suffit.
- **Mais plafonnement mensuel** : les cotisations sont assises sur le PMSS (art. R. 242-2), soit 4 005 € en 2026. Au maximum **2 trimestres par mois** peuvent donc être validés : atteindre 4 trimestres exige au minimum deux mois de rémunération.
- **Temps partiel** : le plafond mensuel est réduit à due proportion du temps de travail.
- **Fraction excédant le plafond** : cotisée mais non prise en compte pour la validation ni pour le SAM.
- **Dernière année d'activité** : la durée d'assurance est arrêtée au dernier jour du trimestre civil précédant la date d'effet (art. R. 351-1). Un départ en cours d'année ne permet pas de valider les 4 trimestres même si le revenu le permettrait. Un départ au 1er janvier N+1 permet de valider l'année N complète — arbitrage classique.
- **Apprentis** : depuis le 1er janvier 2014, autant de trimestres validés que de trimestres travaillés, indépendamment du niveau de rémunération (art. D. 373-3). Les mois résiduels sont totalisés et le trimestre en résultant est affecté à l'année civile de fin de contrat, un mois civil étant retenu dès 30 jours. Pour les périodes du 01/07/1972 au 31/12/2013, la rémunération d'apprenti atteignait rarement le seuil de 200 SMIC : ces années incomplètes sont rachetables à tarif réduit. Avant le 01/07/1972, la rémunération n'était pas obligatoire : régularisation de cotisations possible.
- **Plafond absolu** : 4 trimestres par année civile, tous types confondus (cotisés, assimilés, gratuits, rachetés) et tous régimes confondus. Les trimestres de majoration de durée d'assurance échappent à ce plafond car ils ne sont pas affectés à une année civile.

## 2.5. Typologie des trimestres — table de référence

C'est la table la plus sensible du module : chaque catégorie de trimestre n'entre pas dans les mêmes mécanismes. Une erreur ici propage silencieusement dans le taux, le prorata, le MICO et la surcote.

| Catégorie | Taux (décote) | Prorata durée | Seuil 120 trim. MICO majoré | Surcote | Plafond 4/an |
|---|---|---|---|---|---|
| **Cotisés** (périodes travaillées) | Oui, tous régimes | Oui, régime général + alignés | Oui | Oui | Oui |
| **Assimilés** (maladie, maternité, invalidité, AT, chômage, service national, guerre, détention provisoire, rapatriés, soins aux tuberculeux, sportifs de haut niveau) | Oui | Oui | **Non** | **Non** | Oui |
| **Majoration de durée d'assurance** (enfants, congé parental, enfant handicapé, aidant familial, dépassement de l'âge du taux plein, C2P) | Oui | Oui | **Non** | **Non** | **Non** |
| **Validés gratuitement** (AVPF, AVA) | Oui | Oui | Oui, **dans la limite globale de 24 trimestres** | **Non** | Oui |
| **Rachetés option 1** (taux seul) | Oui | **Non** | **Non** | **Non** | Oui |
| **Rachetés option 2** (taux + durée) | Oui | Oui | Oui | Oui, si situés dans la période de référence | Oui |
| **Périodes reconnues équivalentes** | Oui | **Non** | **Non** | **Non** | Oui |
| **Stages et congés de formation professionnelle** | Oui | Oui | Oui | Oui | Oui |

Deux conditions supplémentaires sur les trimestres assimilés : l'assuré doit avoir préalablement la qualité d'assuré social du régime général (avoir déjà cotisé), sauf pour le service national et les périodes de guerre ; et le plafond de 4 par année civile s'applique strictement, même si la règle de conversion aboutirait à davantage (60 jours d'indemnisation maladie = 1 trimestre, mais 365 jours d'indemnisation plafonnent à 4 trimestres, non 6).

## 2.6. Trimestres de majoration pour enfant (MDA)

Art. L. 351-4 CSS. **8 trimestres par enfant** dans le régime général, décomposés en 4 + 4.

**4 trimestres maternité ou adoption.**
- Maternité : attribution automatique à la mère biologique, y compris pour un enfant mort-né.
- Adoption (enfant mineur, simple ou plénière) : si un seul parent figure à l'acte, il les reçoit intégralement ; sinon, répartition sur option d'un commun accord avec **minimum 2 trimestres à la mère** ; en cas de désaccord, au parent prouvant avoir assumé les démarches à titre principal ; à défaut de preuve, moitié-moitié ; à défaut d'option exprimée, attribution implicite à la mère (ou moitié-moitié pour un couple de même sexe).

**4 trimestres éducation**, à raison d'1 trimestre par année de résidence commune pendant les 4 années suivant la naissance ou l'adoption. Trois conditions :
- **durée d'assurance minimale** : 8 trimestres tous régimes de base confondus, sauf parent ayant élevé seul l'enfant pendant 4 ans ou tiers éduquant désigné par décision de justice ;
- **résidence commune** : le nombre de trimestres ne peut excéder le nombre d'années de résidence effective. En cas de divorce avec garde exclusive de plus de 2 ans, les trimestres reviennent au parent gardien ; en garde alternée, le père peut y prétendre au titre de la résidence conservée ;
- **autorité parentale** : exclusion en cas de privation ou de retrait par décision de justice durant les 4 premières années, ou par décision pénale depuis le 1er septembre 2023 après condamnation pour crime ou délit commis contre l'enfant. Les trimestres sont alors attribués à l'autre parent.

Régime des enfants nés ou adoptés **avant le 1er avril 2010** : pas de répartition possible. Les 4 trimestres éducation vont à la mère, sauf si le père prouve avoir élevé seul l'enfant — attribution en tout ou rien.

**Option et délai** : le choix de répartition (adoption et éducation) s'exprime dans les 6 mois suivant le 4e anniversaire, via le formulaire cerfa 15046. Le choix, exprès ou implicite, est **irrévocable**, sauf décès d'un parent avant la majorité de l'enfant : les trimestres éducation reviennent au parent survivant qui a élevé l'enfant.

**Cumuls** : les MDA se cumulent avec les trimestres assimilés de congé maternité ou adoption. Elles **ne se cumulent pas** avec les trimestres de majoration pour congé parental d'éducation — la caisse retient la solution la plus favorable.

## 2.7. Cessation d'activité, cumul emploi-retraite, retraite progressive

Principe (art. L. 161-22 CSS) : la liquidation suppose la cessation de l'activité professionnelle dans tous les régimes, sauf exceptions.

**Cumul emploi-retraite plafonné** : cotisations versées sans création de droits, à fonds perdus.
**Cumul emploi-retraite intégral** : depuis le 1er septembre 2023, ouvre droit à une **seconde pension de base**, elle-même plafonnée. Le SAM de cette seconde pension est calculé sur les seuls salaires mensuels ayant permis la validation d'au moins un trimestre, versés entre le début du cumul et la liquidation de la seconde pension (art. R. 351-29, III).
**Retraite progressive** : réduction du temps de travail contre versement d'une fraction de pension.

**Transmission d'entreprise** (art. L. 634-6-1, D. 634-13-1 et D. 634-13-2 CSS) : la transmission doit intervenir entre l'âge légal et l'âge du taux plein automatique (67 ans). Cumul autorisé pendant 6 mois sans tutorat, 12 mois avec tutorat rémunéré. Applicable également au RCI.

## 2.8. Transitions

**Chômage — maintien des droits.** L'allocataire ayant atteint l'âge légal sans réunir la durée requise continue d'être indemnisé jusqu'à l'obtention du taux plein, au plus tard 67 ans, quelle que soit la durée d'indemnisation restante. Conditions (décret 2019-797, art. 9) : avoir au moins 62 ans et moins de 67 ans, justifier de 100 trimestres validés tous régimes, être indemnisé depuis au moins un an, et justifier de 12 années d'affiliation à l'assurance chômage dont une année continue d'emploi, ou deux années discontinues, au cours des 5 années précédant la fin du contrat.

**Fin de l'ARE** : substitution par la pension dès l'atteinte de l'âge légal avec durée requise, en cas de départ anticipé, ou à 67 ans au plus tard. La substitution n'est pas automatique : la liquidation doit être demandée, d'où un risque de rupture de revenus si la demande est tardive.

**Invalidité** : substitution de la pension de retraite à la pension d'invalidité en principe à partir de 62 ans dans les régimes alignés, avec taux plein acquis de plein droit.

## 2.9. Revalorisation, minimum vieillesse, fiscalité

**Revalorisation des pensions** : chaque 1er janvier, sur l'évolution de la moyenne annuelle des prix hors tabac sur les douze derniers indices publiés l'avant-dernier mois précédant la revalorisation (art. L. 161-23-1). **+0,9 % au 1er janvier 2026** ; +2,2 % au 1er janvier 2025.

**Revalorisation du MICO** : depuis la réforme 2023, indexée sur le **SMIC** et non sur l'inflation (art. L. 351-10 al. 4). Le plafond d'écrêtement suit également le SMIC (art. D. 173-21-4).

**ASPA** — allocation de solidarité aux personnes âgées, à distinguer strictement du MICO :

| | MICO | ASPA |
|---|---|---|
| Nature | Majoration de pension contributive | Allocation de solidarité |
| Condition de carrière | Taux plein exigé | Aucune |
| Âge | Âge de liquidation | 65 ans (ou âge légal si inaptitude) |
| Condition de ressources | Plafond global de pensions | Plafond de ressources |
| Récupération sur succession | Non | **Oui** |
| Montant 2026 | 756,29 € / 903,93 € par mois | 1 043,59 € (seul) / 1 620,18 € (couple) par mois |

Anciennes prestations du minimum vieillesse (AVTS, secours viager, allocation aux mères de famille, allocation supplémentaire FNS) : maintenues pour leurs titulaires, avec option de substitution par l'ASPA.

**Compte professionnel de prévention (C2P)** : ouvert aux salariés du privé et agents contractuels exposés à six facteurs de risque (milieu hyperbare, températures extrêmes, bruit, travail de nuit, équipes successives alternantes, travail répétitif). 1 point par trimestre d'exposition, majoré d'un point par facteur en cas de polyexposition ; nombre de points illimité depuis le 16 avril 2023. Utilisations : majoration de durée d'assurance et départ anticipé, formation professionnelle, financement d'un maintien de rémunération en temps partiel de fin de carrière.

**Fiscalité des pensions** : imposition à l'IR dans la catégorie des pensions, retraites et rentes, avec abattement de 10 % plafonné. Prélèvements sociaux : CSG (taux réduit, normal ou exonération selon le revenu fiscal de référence), CRDS, CASA, et cotisation maladie sur certaines pensions complémentaires.

---

# 3. Régime général — salariés et assimilés (CNAV)

## 3.1. Champ

Salariés du privé, assimilés salariés (président et dirigeant de SAS, gérant minoritaire ou égalitaire de SARL, gérant non associé), agents contractuels de la fonction publique, artistes-auteurs (branche dédiée), et depuis le 1er septembre 2023 les nouveaux entrants des cinq régimes spéciaux fermés. Les salariés agricoles (MSA) et les travailleurs indépendants (SSI) relèvent de régimes **alignés** : mêmes règles de calcul, gestion distincte.

Affiliation volontaire possible (art. L. 742-1 et suivants) : anciens assurés affiliés au moins 6 mois ayant cessé de remplir les conditions (demande dans les 6 mois), personnes exerçant les fonctions de tierce personne, parents au foyer sans activité s'occupant d'un enfant de moins de 20 ans, expatriés affiliés à un régime étranger.

## 3.2. Cotisations

Assiette : rémunération soumise à cotisations au sens de l'art. L. 242-1 CSS — salaires, rappels, majorations, primes, indemnités de congés payés, avantages en nature.

| Tranche | Taux global | Générateur de droits |
|---|---|---|
| 0 à 1 PASS | 15,45 % (6,90 % salarial + 8,55 % patronal) | **Oui** |
| Totalité de la rémunération | 2,42 % (0,40 % salarial + 2,02 % patronal) | **Non** |

La cotisation déplafonnée de 2,42 % est due mais ne crée aucun droit. C'est le mécanisme des cotisations « à fonds perdus », qu'il faut refléter dans toute simulation de rendement.

## 3.3. Formule de calcul

```
Pension annuelle brute = SAM × taux × (durée d'assurance / durée de référence)
                         puis application des majorations selon l'ordre du §3.7
```

- **SAM** : salaire annuel moyen des 25 meilleures années, plafonné au PASS de chaque année, revalorisé.
- **Taux** : 50 % au maximum. Décote selon §2.2.
- **Durée d'assurance** : trimestres acquis dans le régime général **et les régimes alignés uniquement** (MSA salariés agricoles, SSI). Les trimestres CNAVPL, CNBF, SRE, CNRACL sont **exclus** de ce ratio.
- **Durée de référence** : durée requise de la génération (§2.1).

Asymétrie centrale à ne pas manquer : le **taux** s'apprécie tous régimes confondus, le **prorata** au seul régime général et alignés. Une pension liquidée à taux plein n'est donc pas une pension complète. Un polypensionné réunissant 172 trimestres dont 160 au régime général obtient `SAM × 50 % × 160/172`.

Le ratio est **plafonné à 1** : la durée d'assurance n'est retenue qu'à hauteur de la durée de référence. L'excédent ne majore le prorata en aucun cas ; il ne peut produire un gain que par la surcote.

## 3.4. Salaire annuel moyen (SAM)

### 3.4.1. Revenus retenus

Sont retenus les salaires ayant supporté la retenue vieillesse (art. R. 351-29 et R. 351-9 al. 7).

Cas particuliers :
- **Indemnités journalières de maternité** : intégrées au SAM. Pour les congés débutant à compter du 1er janvier 2012, retenues à **125 %** de leur montant, majoration appliquée avant prélèvements sociaux, arrondi à l'euro le plus proche. Pour les congés antérieurs, évaluation forfaitaire par quote-part du salaire médian (140/365 pour les deux premières naissances, 298/365 pour des jumeaux), sous réserve d'affiliation au régime général dans les 12 mois précédant la naissance.
- Sont visées : IJ de congé légal de maternité, IJ pour état pathologique lié à la grossesse (2 semaines maximum), IJ du père en cas de décès de la mère du fait de l'accouchement, IJ d'adoption, allocations journalières des salariées enceintes dispensées de travail hors congé légal, IJ du congé maternité supplémentaire « distilbène ».
- **Exclus** : frais professionnels, indemnités de rupture, intéressement, participation, abondement. Actions gratuites de plans qualifiés et prime de partage de la valorisation de l'entreprise : exclues faute de retenue salariale vieillesse (analyse à confirmer, la doctrine n'étant pas formellement établie).
- **Salaires perçus à l'étranger** : exclus du SAM français, sauf affiliation volontaire à la CFE. Les périodes étrangères sont en revanche retenues pour le taux et pour le prorata, la pension étant ensuite proratisée sur la seule période française selon les règles de coordination.

Exemple de coordination européenne — né en 1968, 120 trimestres France, 48 trimestres Espagne, 172 requis :
`[SAM_France × 47,5 % × 168/172] × 120/168`

### 3.4.2. Plafonnement et revalorisation

Chaque salaire annuel est retenu dans la limite du **PASS de l'année travaillée**. Pour un temps partiel, le plafond mensuel est réduit à proportion du temps de travail. Les revenus sont arrondis à l'euro le plus proche, les montants en francs convertis.

Revalorisation par coefficients annuels (art. L. 351-11 et L. 133-10), indexés sur les prix depuis 2004. Coefficient appliqué aux revenus 2024 : **1,022**.

### 3.4.3. Nombre d'années retenues

25 meilleures années pour les assurés nés à compter de **1948** (art. R. 351-29-1). Progression historique : 10 années pour les assurés nés avant le 1er janvier 1934, puis +1 année par génération jusqu'à 24 années pour 1947.

Si l'assuré compte moins de 25 années validées, la moyenne porte sur les années existantes — un point majeur pour les carrières courtes, puisque le diviseur diminue au lieu d'être figé à 25.

Une année entre dans les 25 meilleures dès lors qu'**au moins un trimestre** y a été validé. Une année à faible rémunération (job d'été, année de transition) peut donc être retenue et abaisser le SAM si l'assuré ne dispose pas de 25 années meilleures.

### 3.4.4. Années exclues du SAM

- années n'ayant pas permis de valider au moins un trimestre : le salaire est intégralement ignoré ;
- **année de la date d'effet de la pension** : seules les années civiles d'assurance accomplies sont retenues (art. R. 351-1 et R. 351-29 ; Cass. civ. 2, 5 janvier 2023, n° 21-15.024). Les salaires de l'année de départ comptent pour la validation des trimestres mais pas pour le SAM — d'où l'intérêt d'un départ au 1er janvier ;
- années ne comportant que des périodes assimilées (maladie, invalidité, AT, chômage). Exception : les IJ de maternité, qui sont intégrées ;
- périodes validées par présomption ;
- **années comportant un rachat de trimestres**, quelle que soit l'option : l'année civile est perdue pour le SAM. Effet contre-intuitif à modéliser : un rachat peut améliorer le taux tout en dégradant le SAM.

### 3.4.5. LURA et polypensionnés

**Liquidation unique des régimes alignés**, pensions liquidées depuis le 1er juillet 2017 (art. L. 173-1-2) : pour un assuré ayant relevé du régime général, du régime des salariés agricoles et/ou de la SSI, la pension est calculée comme s'il n'avait relevé que d'un seul régime. Les rémunérations annuelles de tous ces régimes sont additionnées année par année, les 25 meilleures années étant déterminées sur l'ensemble. Les trimestres sont retenus dans la limite de 4 par année civile.

Avant le 1er juillet 2017, chaque régime proratisait son nombre d'années de référence :
`nb_années = 25 × (durée dans le régime / durée tous régimes)`, arrondi au plus proche, minimum 1, la fraction de 0,5 comptant pour 1 (art. R. 173-4-3).

**Changement de statut en cours d'année** :
- entre régimes alignés : sans incidence, les revenus s'additionnent ;
- entre régimes non alignés : les revenus de l'autre régime ne sont pas repris dans le SAM du régime général. Une année de transition tronquée peut donc entrer dans les 25 meilleures années avec un montant faible et dégrader le SAM. Le changement au 1er janvier neutralise cet effet.
- **pluriactivité simultanée** non alignée : une petite rémunération salariée accessoire à une activité libérale principale s'ajoute mécaniquement aux années retenues au régime général et peut dégrader le SAM. Arbitrage courant : facturer en honoraires plutôt qu'en salaire.

Ces effets ne se produisent que si l'assuré ne dispose pas déjà de 25 années meilleures. La règle de décision est donc conditionnelle, jamais absolue.

## 3.5. Minimum contributif (MICO)

Art. L. 351-10, L. 351-10-1, R. 351-25, D. 351-2-2 CSS. Règles applicables aux pensions liquidées depuis le 1er avril 2009.

### 3.5.1. Conditions d'éligibilité

Trois conditions cumulatives :

1. **Liquidation à taux plein** — soit par la durée requise, soit par l'âge du taux plein (67 ans, ou 65 ans pour les catégories dérogatoires), soit par un cas d'attribution de plein droit (inaptitude, substitution invalidité ou AAH).
2. **Liquidation de toutes les pensions de base et complémentaires**, tous régimes confondus, en France, à l'étranger et dans les organisations internationales. Exception : si l'assuré ne remplit pas encore les conditions d'attribution d'une pension et l'établit par tout moyen, le MICO est servi sans tenir compte de cette pension, jusqu'au dernier jour du mois précédant celui où les conditions sont réunies. Cas fréquent des régimes complémentaires dont l'âge de liquidation diffère (CAVEC, CPRN…).
3. **Plafond global de pensions** non dépassé — sinon écrêtement, non suppression.

Un assuré liquidant à taux plein **par l'âge** est éligible au MICO, mais celui-ci sera proratisé s'il ne réunit pas la durée requise. Le taux plein ouvre le droit ; il ne garantit pas le montant entier.

### 3.5.2. Les deux paliers

Les deux montants ne s'additionnent pas. La pension est portée au MICO de base, puis un supplément l'amène éventuellement au MICO majoré.

| | 2026 | 2025 | 2024 |
|---|---|---|---|
| MICO de base, mensuel | 756,29 € | 747,69 € | 733,03 € |
| MICO de base, annuel | 9 075,48 € | 8 972,30 € | 8 796,38 € |
| MICO majoré, mensuel | 903,93 € | 893,65 € | 876,13 € |
| MICO majoré, annuel | 10 847,16 € | 10 723,88 € | 10 503,61 € |
| Supplément (majoré − base), mensuel | 147,64 € | 145,96 € | 143,10 € |
| Plafond global de pensions, mensuel | 1 410,89 € | 1 394,86 € (au 01/11/2024) | 1 367,51 € |

Sources : circulaire CNAV 2025-34 du 23 décembre 2025 et instruction interministérielle DSS/3A/DB/6BRS/2025/174 du 15 décembre 2025 pour 2026.

### 3.5.3. Palier 1 — MICO de base

Trimestres pris en compte pour la proratisation : cotisés, assimilés, de majoration de durée d'assurance, rachetés options 1 et 2, périodes AVPF et AVA — acquis dans le régime général et les régimes alignés.

```
Cas 1 — mono-régime aligné, ou total tous régimes <= durée requise :
  majoration_p1 = max(0, MICO_base × (trim_RG_alignés / durée_requise) - pension_base)

Cas 2 — total tous régimes > durée requise :
  majoration_p1 = max(0, MICO_base × (trim_RG_alignés / trim_tous_régimes) - pension_base)
```

Le dénominateur bascule de la durée requise vers la durée réellement validée dès que celle-ci l'excède. C'est cette bascule qui est le plus souvent omise dans les implémentations.

*Exemple 1* — né en 1958, liquidation à 67 ans en 2025, 160 trimestres validés (167 requis), tous au régime général, pension calculée 550 €.
`747,69 × 160/167 − 550 = 166 €` → pension portée à 716 €.

*Exemple 2* — même profil, mais 150 trimestres seulement au régime général sur 160 validés tous régimes.
`747,69 × 150/167 − 550 = 122 €` → pension portée à 672 €.

*Exemple 3* — né en 1968, 174 trimestres validés tous régimes (172 requis) dont 150 au régime général.
`747,69 × 150/174 − 550 = 95 €` → dénominateur 174, non 172.

### 3.5.4. Palier 2 — MICO majoré

Condition d'accès : **au moins 120 trimestres cotisés** dans le régime général et les régimes alignés.

Entrent dans le décompte des 120 : périodes de cotisation à l'assurance vieillesse obligatoire, rachats **option 2** uniquement, congés et stages de formation professionnelle, certaines périodes d'activité à l'étranger, trimestres AVPF et AVA **dans la limite globale de 24 trimestres** — retenus dans la limite de 4 par année civile.

N'entrent pas : périodes assimilées (chômage, maladie, invalidité, AT), trimestres de majoration de durée d'assurance (dont les 8 trimestres par enfant), périodes reconnues équivalentes, rachats option 1.

```
si trim_cotisés_RG_alignés < 120 → majoration_p2 = 0

sinon, dénominateur D = durée_requise si trim_cotisés <= durée_requise
                        sinon trim_tous_régimes

  mono-régime aligné :
    majoration_p2 = (MICO_majoré - MICO_base) × (trim_cotisés / D)

  polypensionné avec régime non aligné :
    majoration_p2 = (MICO_majoré - MICO_base) × (trim_cotisés / D)
                                             × (trim_RG_alignés / trim_tous_régimes)
```

La double proratisation du palier 2 chez le polypensionné est la règle la plus délicate du dispositif : un premier prorata sur les trimestres cotisés, un second sur la part du régime général dans le total validé (loi 2023-270, art. 18, V, al. 4).

*Exemple 4* — née en 1962, 169 trimestres validés au régime général sur 169 requis, dont 150 cotisés, pension 550 €.
- palier 1 : `747,69 × 169/169 − 550 = 197,69 €` (entier)
- palier 2 : `(893,65 − 747,69) × 150/169 = 130 €`
- pension : 877,69 €

*Exemple 5* — née en 1962, 169 trimestres tous régimes dont 160 au régime général et 150 cotisés.
- palier 1 : `747,69 × 160/169 − 550 = 158 €`
- palier 2 : `(893,65 − 747,69) × (150/169) × (160/169) = 123 €`
- pension : 831 €

*Exemple 6* — née en 1962, 171 trimestres tous régimes (169 requis), tous cotisés, dont 160 au régime général.
- palier 1 : `747,69 × 160/171 − 550 = 150 €` (dénominateur 171)
- palier 2 : `(893,65 − 747,69) × 160/171 = 137 €`
- pension : 837 €

### 3.5.5. Écrêtement

Le total des pensions de retraite **brutes personnelles** tous régimes confondus, base et complémentaire, français et étrangers, hors pensions de réversion et hors autres revenus, ne peut excéder le plafond mensuel (1 410,89 € en 2026 ; art. L. 173-2 et D. 173-21-4). En cas de dépassement, la majoration MICO est réduite à due concurrence — elle n'est pas supprimée.

Le plafond retenu est celui en vigueur **à la date d'ouverture du droit au MICO**, revalorisé ensuite comme le SMIC.

```
si (pension_base + majorations + autres_pensions) > plafond :
    réduction = total - plafond
    majoration_MICO = max(0, majoration_MICO - réduction)
```

*Exemple* — reprise de l'exemple 4 avec 600 € d'autres pensions : `600 + 877,69 = 1 477,69 > 1 394,86` → réduction de 82,83 €, majoration ramenée de 327,69 € à 244,86 €.

### 3.5.6. Historique et dispositifs voisins

- Pensions liquidées avant le 1er septembre 2023 : MICO de base 8 209,61 €/an et majoré 8 970,86 €/an au 1er janvier 2023.
- Pensions ayant pris effet avant le 1er septembre 2023 : **majoration exceptionnelle de 1 200 € bruts annuels** si liquidation à taux plein et au moins 120 trimestres cotisés (circulaire CNAV 2023-21 du 2 novembre 2023).
- Pensions liquidées entre 2005 et 2009 : condition des 120 trimestres cotisés non exigée. Avant 2005 : pas de distinction entre trimestres validés et cotisés.
- La pension n'est pas recalculée chaque année en fonction de l'évolution du MICO ; elle suit la revalorisation de droit commun.

## 3.6. Montant maximum

La pension de base ne peut excéder **50 % du PASS** de l'année de perception (arrêté du 9 octobre 1986, art. 2 a) :

- 2026 : **24 030 € par an, soit 2 002,50 € par mois**
- 2025 : 23 550 € par an, soit 1 962,50 € par mois

Ce maximum est en pratique inatteignable hors majorations : les 25 meilleures années sont plafonnées par le PASS de chaque année concernée, et la revalorisation des salaires portés au compte suit les prix tandis que le PASS suit les salaires, qui progressent plus vite. Le SAM ne peut donc rejoindre le PASS courant.

Le plafond s'entend **hors majorations** : surcote, surcote parentale et majoration pour enfants peuvent porter la pension au-delà.

## 3.7. Ordre d'application des majorations

Ordre impératif (circulaire CNAV 2018-4, §3.4 et 3.5 ; circulaire CNAV 2022-26, §3) :

```
1.  P0 = SAM × taux × (durée d'assurance / durée de référence)
2.  surcote  = P0 × 1,25 % × (trim_surcote_classique + trim_surcote_parentale)
        → assise sur P0, AVANT MICO
3.  MICO     = majoration_palier_1 + majoration_palier_2, puis écrêtement
        → comparaison au montant P0, hors surcote
4.  P1 = P0 + surcote + MICO
5.  majoration enfants = P1 × 10 % (si 3 enfants ou plus)
        → assise APRÈS MICO et surcote
6.  majoration tierce personne, le cas échéant
7.  Pension finale
```

*Exemple complet* — née en 1968, 3 enfants, pension calculée 700 €, MICO majoré applicable, 4 trimestres de surcote parentale et 8 trimestres de surcote classique :
- MICO : `893,65 − 700 = 193,65 €`
- surcote : 15 % × 700 = 105 €
- sous-total : `700 + 193,65 + 105 = 998,65 €`
- majoration enfants : `998,65 × 10 % = 99,87 €`
- **pension : 1 098,52 €**

Inverser les étapes 2 et 3 (surcote assise sur la pension après MICO) surévalue la pension ; appliquer la majoration enfants avant le MICO la sous-évalue. Deux tests de non-régression à prévoir.

## 3.8. Majoration pour 3 enfants ou plus

Art. L. 351-12 et R. 342-2 CSS. **10 %** de la pension de base, pour le père comme pour la mère. Ne se confond pas avec les MDA et se cumule avec elles. Accordée même en l'absence de taux plein.

**Enfants avec lien de filiation** : aucune condition de résidence ni d'éducation. La filiation s'établit par la naissance (acte de naissance pour la mère, présomption de paternité pour l'enfant né ou conçu pendant le mariage), la reconnaissance, la possession d'état, l'action en justice ou l'adoption plénière. L'enfant mort-né est compté. Le parent déchu de l'autorité parentale conserve la majoration, sauf retrait prononcé depuis le 1er septembre 2023 à la suite d'une condamnation pénale pour crime ou délit commis contre un de ses enfants.

**Enfants recueillis ou élevés sans filiation** (adoption simple, enfant du conjoint, du partenaire de PACS ou du concubin) : condition cumulative d'**éducation et de charge pendant au moins 9 ans avant le 16e anniversaire**. Pour l'enfant du conjoint uniquement, la charge est présumée si la période de mariage couvre les 9 années d'éducation. À défaut, et pour le PACS ou le concubinage, la charge se prouve par tous moyens (documents CAF, allocations familiales, parts fiscales, attestations), à produire lors de la demande de liquidation.

## 3.9. Majoration pour tierce personne

Art. L. 355-1 CSS. Assurés nécessitant l'assistance constante d'un tiers pour les actes ordinaires de la vie (invalidité de 3e catégorie), titulaires d'une pension d'invalidité, d'une pension substituée à une pension d'invalidité, ou d'une pension attribuée ou révisée pour inaptitude. Les conditions doivent être réunies **avant 67 ans**.

## 3.10. Autres éléments

**Majoration de durée d'assurance pour dépassement de l'âge du taux plein** (art. L. 351-6, R. 351-7, D. 634-5) : l'assuré liquidant après l'âge du taux plein sans réunir la durée maximale au seul régime général bénéficie d'une MDA. L'âge de déclenchement (67 ans, ou 65 ans pour les catégories dérogatoires) et les modalités de calcul et de répartition sont inchangés par la LFSS 2026.

**Réversion du régime de base** : `54 % × (taux × RAM du défunt × durée d'assurance du défunt / durée de référence)`, avec taux fixé à 50 % quel que soit l'âge au décès (art. R. 353-6). Pour un droit générateur non liquidé, la **durée de référence est celle opposable à la génération du défunt à la date d'effet de la pension de réversion** : celle applicable avant le 01/09/2023, entre le 01/09/2023 et le 31/08/2026, ou à compter du 01/09/2026 selon le cas. L'art. R. 353-3 ne s'applique plus, tous les paramètres générationnels étant fixés. Exemple : pour un défunt né entre le 1er avril et le 31 décembre 1965, la durée de référence est 169, 172 ou 171 selon la date d'effet de la réversion.

---

# 4. Travailleurs indépendants (SSI)

## 4.1. Champ

Artisans, commerçants, industriels, gérants majoritaires ou égalitaires de SARL et EURL, associés de SNC, professions libérales non réglementées (hors périmètre CNAVPL). Depuis le 1er janvier 2018, tout travailleur indépendant relève soit d'une section CNAVPL, soit de la SSI (art. L. 631-1). Micro-entrepreneurs relevant du régime micro-social.

Sont également concernés : loueurs de meublés dépassant les seuils, exploitants de chambres d'hôtes et para-hôtellerie, influenceurs commerciaux (BIC) et prestataires de services numériques (BNC), à distinguer des artistes-auteurs.

## 4.2. Cotisations

**Assiette.** Réforme de l'assiette unique des travailleurs indépendants applicable aux périodes courant à compter du **1er janvier 2025** : assiette unifiée assise sur le chiffre d'affaires ou les recettes diminués des charges professionnelles, avec un abattement, et suppression de la réintégration des cotisations sociales dans l'assiette. Les périodes antérieures au 31 décembre 2024 restent régies par l'ancienne assiette.

Sont notamment réintégrés : dividendes excédant 10 % du capital social pour les gérants majoritaires, avantages en nature, rémunérations de gérance.

**Cotisations provisionnelles** calculées sur les revenus **N-2**, régularisées ensuite. Option pour une assiette estimée de l'année en cours. Modulation expérimentale en fonction du dernier revenu mensuel.

**Assiettes forfaitaires** : début d'activité (1re et 2e années), conjoint collaborateur, aidants familiaux, affiliation volontaire. **Assiette de taxation d'office** en l'absence de déclaration. **Cotisations minimales** garantissant un socle de droits.

**Micro-social** : l'assiette des cotisations est le **chiffre d'affaires brut annuel**, plus large que le bénéfice de l'entrepreneur individuel de droit commun. Un travailleur indépendant déjà affilié à la SSI ne peut pas placer une nouvelle activité sous le micro-social : le fractionnement d'activité entre droit commun et micro-social est impossible.

Jusqu'en juin 2024, les taux du micro-social **BNC** n'intégraient aucune part de retraite complémentaire. Depuis juillet 2024, une nouvelle répartition permet de cotiser au RCI. Aucun dispositif de rattrapage n'a été prévu pour les années perdues : à modéliser comme un trou de droits complémentaires, non de droits de base.

## 4.3. Formule de calcul

Deux périodes distinctes dont les résultats **s'additionnent** en une pension unique.

### 4.3.1. Droits acquis depuis le 1er janvier 1973

Alignement complet sur le régime général (art. L. 634-2) :

```
Pension = RAM × taux × (durée d'assurance / durée de référence) + majorations
```

RAM = revenu annuel moyen des 25 meilleures années, plafonné au PASS de chaque année, revalorisé par les mêmes coefficients (1,022 pour 2024). Taux plein 50 %, décote 1,25 % par trimestre manquant. Ratio limité au régime général et aux régimes alignés.

Toutes les règles des §3.4 à §3.9 s'appliquent : années exclues du RAM, LURA, MICO, maximum de 50 % du PASS, surcote, surcote parentale, majoration pour 3 enfants.

### 4.3.2. Droits acquis avant le 1er janvier 1973

Régime par points (art. L. 634-3 ; décret 73-937 du 2 octobre 1973) :

```
Pension = nombre de points × valeur du point au 1er janvier de l'année de liquidation × taux
```

Valeurs du point au 1er janvier 2025 : **14,71063 €/an pour les commerçants**, **10,6677 €/an pour les artisans** (circulaire CNAV 2024-39, §14). Taux de liquidation de 100 % en cas de taux plein, décote de 1,25 % par trimestre manquant pour les assurés nés après 1952 (entre 2,5 % et 1,375 % pour les générations 1944 à 1952). Des coefficients particuliers de minoration sur les points sont prévus à l'art. 3-II du décret 73-937.

Le nombre de points annuels correspondait au quotient des cotisations par un revenu de référence fixé annuellement.

## 4.4. Validation des trimestres

Double approche : par le revenu soumis à cotisations (150 × SMIC horaire par trimestre) ou par le montant de cotisations retraite de base versées.

| | 2026 | 2025 |
|---|---|---|
| Revenu pour 1 trimestre | 1 803 € | 1 782 € |
| Revenu pour 4 trimestres | 7 212 € | 7 128 € |
| Cotisations pour 1 trimestre | 322 € | 316 € |
| Cotisations pour 2 trimestres | 644 € | 633 € |
| Cotisations pour 4 trimestres | 1 289 € | 1 265 € |

Base : art. D. 634-1 et R. 351-9 CSS ; circulaire CNAV 2025-33 pour 2026.

**Exceptions à modéliser :**

- **Affiliation incomplète sur l'année** : le PASS est réduit au prorata (art. R. 613-17). Avec un seul mois d'affiliation, 2 trimestres au maximum peuvent être validés quel que soit le revenu, puisque le plafond mensuel limite la cotisation retenue.
- **Départ en cours d'année** : arrêt de compte au dernier jour du trimestre civil précédant la date d'effet.
- Il n'existe pas de durée minimale d'activité : 4 trimestres sont validables sur une fraction d'année si les cotisations atteignent le seuil.

**Micro-entrepreneur — point de vigilance de modélisation.** L'assiette sociale est le chiffre d'affaires brut ; le revenu porté au compte pour le calcul du RAM correspond au chiffre d'affaires **après application de l'abattement forfaitaire** du régime micro-fiscal, et non au chiffre d'affaires brut. Une simulation qui retiendrait le chiffre d'affaires brut comme revenu de référence surestimerait fortement le RAM. Inversement, retenir le bénéfice réel d'un micro-entrepreneur dont les charges sont inférieures à l'abattement sous-estimerait ses droits. La règle correcte pour le RAM est le revenu porté au compte tel qu'il résulte de l'assiette sociale du micro-social.

## 4.5. Éléments propres

**Accompagnement au départ à la retraite (ADR)** : aide financière destinée aux travailleurs indépendants aux faibles pensions lors de leur cessation d'activité, sous conditions de ressources et de durée d'affiliation, sur demande auprès de la caisse.

**Substitution invalidité** : substitution de la pension de retraite à la pension d'invalidité en principe à 62 ans, avec taux plein de plein droit.

**Retraite complémentaire RCI** : l'âge d'ouverture et l'absence d'abattement sur les points sont alignés sur l'âge légal et le taux plein du régime de base (art. 11 et 12 du règlement RCI). L'abattement sur les points est fonction du plus petit du nombre de trimestres manquants pour la durée requise et du nombre de trimestres d'âge manquants jusqu'à l'âge du taux plein, selon le barème de l'annexe 2 du règlement. Pour les générations nées à compter de 1969, l'abattement maximal passe de 22 % à **12 %** (taux de service minimal de 88 %), l'écart d'âge maximal étant réduit de 5 à 3 ans. Versement forfaitaire unique en dessous de 40 points.

---

# 5. Professions libérales (CNAVPL)

## 5.1. Champ et organisation

Professions listées à l'art. L. 640-1 CSS. Régime de base **commun par points**, piloté par la CNAVPL, avec dix sections professionnelles dotées de la personnalité juridique et financièrement autonomes (art. L. 641-1), chargées de recouvrer les cotisations et de verser les prestations, tant pour le régime de base que pour leur régime complémentaire propre.

Distinction à ne pas confondre avec l'affiliation : toutes les professions libérales, réglementées ou non, ne relèvent pas de la CNAVPL. Seules celles de l'art. L. 640-1 en relèvent ; les autres relèvent de la SSI. Les avocats relèvent de la CNBF. Beaucoup d'affiliés CNAVPL relèvent par ailleurs de la CPAM pour le risque maladie.

**Affiliation obligatoire** : professionnels libéraux exerçant à titre indépendant, présidents et directeurs généraux de SELAFA et SELAS, gérants majoritaires de SELARL selon les cas, conjoints collaborateurs, collaborateurs libéraux. Règles particulières en cas de pluriactivité.

**Date d'effet de l'affiliation et de la radiation** : 1er jour du **trimestre civil suivant** le début ou la fin d'activité (art. R. 643-1, D. 642-1) — sauf affiliés CIPAV, qui suivent les règles SSI. Conséquence directe : un début d'activité entre le 1er octobre et le 31 décembre N ne génère aucun point au titre de N, les cotisations n'étant dues qu'à compter du 1er janvier N+1.

## 5.2. Cotisations et acquisition de points

Deux tranches, chacune plafonnée en nombre de points (art. L. 642-1, D. 643-1) :

| Tranche | Assiette | Taux 2026 | Points maximum |
|---|---|---|---|
| T1 | 0 à 1 PASS | 8,73 % | 557 |
| T2 | 0 à 5 PASS | 1,87 % | 25 |

Le taux de T1 est passé de 8,23 % à **8,73 %** dans le cadre de la réforme de l'assiette sociale, appliqué lors de la régularisation des cotisations 2025.

```
points_T1 = 557 × (cotisation_T1_acquittée / cotisation_T1_maximale)
points_T2 =  25 × (cotisation_T2_acquittée / cotisation_T2_maximale)
```

avec, pour 2026 : `cotisation_T1_max = 48 060 × 8,73 % = 4 195,64 €` et `cotisation_T2_max = 240 300 × 1,87 % = 4 493,61 €`. Arrondi à la décimale la plus proche.

Le calcul est proportionnel aux **cotisations effectivement acquittées**, non au revenu : un impayé partiel réduit les points à proportion. C'est la différence structurelle avec le régime général, où le report au compte suit la rémunération.

**Historique des barèmes de points :**

| Période | Points max T1 | Points max T2 |
|---|---|---|
| Depuis le 01/01/2025 | 557 | 25 |
| 01/01/2015 – 31/12/2024 | 525 | 25 |
| 01/01/2004 – 31/12/2014 | 450 (T1 jusqu'à 85 % du PASS) | 100 (85 % PASS à 5 PASS) |
| Avant le 01/01/2004 | Conversion : 100 points par trimestre effectué | — |

Avant 2004, le régime servait une pension forfaitaire proportionnelle à la durée d'assurance et indexée sur l'AVTS. Les droits ont été convertis à raison d'un soixantième de l'ancienne allocation valant 100 points, soit 100 points par trimestre (loi 2003-775, art. 96).

**Cotisation minimale** : assiette plancher de **450 × SMIC horaire**, soit 5 409 € en 2026, pour une cotisation de **573 €**. Elle est due pour l'année entière, **sans proratisation possible**, même en cas d'activité partielle sur l'année.

**Début d'activité** : assiette forfaitaire de 19 % du PASS, soit **9 131 € en 2026**, pour une cotisation de **968 €**, applicable aux deux premières années civiles.

**Points gratuits :**
- **400 points par an** en cas d'exonération totale ou partielle de cotisations : incapacité d'exercice de plus de 6 mois, médecins retraités poursuivant leur activité ou effectuant des remplacements en zone de montagne ;
- **200 points par année civile** pour les assurés invalides ayant recouru à l'assistance d'une tierce personne ;
- **100 points** au titre du trimestre civil de l'accouchement, pour les femmes affiliées. Depuis le 1er mars 2012, ces points ne peuvent porter le total annuel au-delà de **582 points** (550 jusqu'au 31 décembre 2024).

**Rachat de trimestres** (art. L. 643-2, D. 643-5) : périodes d'études lorsque le régime libéral est le premier régime d'affiliation à l'issue de celles-ci, et années d'affiliation ayant validé moins de 4 trimestres. Option 1 (taux seul) : aucun effet sur les points, effet sur la seule décote. Option 2 (taux + points) : seule option générant des points.

**ACRE** : en l'absence de texte, la CNAVPL applique en pratique les règles SSI et maintient l'acquisition de trimestres et de points pendant l'exonération. Position confirmée par la CARPIMKO et la CAVEC, à vérifier auprès de la section concernée. Point à traiter comme une incertitude documentée, non comme une règle acquise.

## 5.3. Calcul de la pension

```
Pension = nombre de points × valeur de service du point × taux de liquidation
```

**Valeur de service du point** (art. L. 643-1), revalorisée chaque 1er janvier comme les pensions du régime général :

| Année | Valeur de service |
|---|---|
| 2026 | 0,6599 € |
| 2025 | 0,6540 € |
| 2024 | 0,6399 € |

Ne pas confondre avec la valeur d'acquisition du point, implicite dans le rapport cotisation maximale / points maximum.

**Taux de liquidation** : 100 % au maximum. Taux plein acquis à 67 ans quel que soit le nombre de trimestres, ou dès l'âge légal si la durée requise est réunie tous régimes confondus (art. L. 643-4). Décote de **1,25 % par trimestre manquant**, selon la règle du plus petit des deux comptages du §2.2.

Départs anticipés donnant lieu à taux plein sans décote : handicap (55 à 63 ans), carrière longue (58 à 63 ans), inaptitude au travail (62 ans), et autres catégories dérogatoires.

**Aucune proratisation** de type régime général : la pension est le produit direct points × valeur. Il n'y a pas de coefficient durée d'assurance / durée de référence, la carrière incomplète se traduisant mécaniquement par un nombre de points plus faible. Un moteur qui appliquerait un prorata à la CNAVPL doublerait la pénalisation.

## 5.4. Majorations

- **Surcote pour prolongation d'activité** : 1,25 % par trimestre accompli à compter du 1er septembre 2023, uniquement pour les trimestres ayant donné lieu à cotisations à la charge de l'assuré (art. L. 643-3 I al. 4, R. 643-8). Taux de 0,75 % pour certaines périodes antérieures.
- **Surcote parentale** : 1,25 % par trimestre, plafonnée à 5 %, mêmes conditions qu'au régime général — au moins un trimestre de MDA pour enfant quel que soit le régime qui l'octroie, et durée requise réunie dès l'année précédant l'âge légal lorsque celui-ci est au moins égal à 63 ans (art. L. 643-3 I al. 5 et 6).
- **Majoration pour 3 enfants ou plus** : 10 %, mêmes règles qu'au régime général (art. L. 643-1-1, renvoi à L. 351-12 et R. 342-2), applicable même sans taux plein. Ordre d'application : points × valeur, puis surcote, puis majoration de 10 %.

## 5.5. Montants minimum et maximum

**Pas de minimum de pension** dans le régime de base libéral — pas de MICO. Une prestation supplémentaire portant la pension au montant de l'**AVTS** existe dans un cas étroit (art. L. 643-1 al. 5, D. 642-9) : périodes validées inférieures à 15 années, mais total de ces périodes et de certaines périodes non cotisées atteignant 15 années. Les périodes non cotisées visées sont celles antérieures à 1949 (création de la CNAVPL) ou antérieures au rattachement de la profession à la CNAVPL — cas des professions reconnues tardivement (ostéopathes, chiropracteurs, naturopathes).

**Pas de maximum de pension**, mais un plafond d'acquisition : 582 points par an depuis le 1er janvier 2025, 550 auparavant.

L'ASPA reste accessible sous conditions de ressources à 65 ans, après liquidation de toutes les pensions.

## 5.6. Versement

Versement à trimestre échu, ou à la périodicité de la retraite complémentaire de la section (art. L. 643-8). Toutes les sections ont retenu la seconde option : versement mensuel à terme échu, simultanément avec la complémentaire. Seule la **CAVOM** verse trimestriellement à terme échu. Versement en capital unique possible sous conditions.

---

# 6. Avocats (CNBF)

## 6.1. Champ

Avocats libéraux et salariés, affiliés obligatoirement à la Caisse nationale des barreaux français pour la base, la complémentaire et l'invalidité-décès. La LPA (La Prévoyance des Avocats) intervient en prévoyance complémentaire. Le régime de base est un régime **par annuités à prestation forfaitaire**, singulier dans le paysage : la pension ne dépend pas du revenu, mais de la durée d'affiliation.

## 6.2. Cotisations au régime de base

Trois composantes (statuts CNBF ; art. L. 723-3 et suivants CSS) :

**1. Cotisation forfaitaire**, progressive selon l'ancienneté au barreau appréciée au 1er janvier, identique pour les libéraux et les salariés :

| Ancienneté | Montant 2025 |
|---|---|
| 1re année | 351 € |
| 2e année | 705 € |
| 3e année | 1 106 € |
| 4e et 5e années | 1 505 € |
| À compter de la 6e année | 1 921 € |

**2. Cotisation proportionnelle au revenu net** : taux de **3,10 %** en 2025.
- Deux premières années d'affiliation : assiette forfaitaire plafonnée à 19 % du PASS (8 949 € en 2025), soit 277 € au maximum, calculée prorata temporis en cas d'affiliation en cours d'année.
- Ensuite : 3,10 % du revenu professionnel net imposable **N-2**, plafonné à 297 549 € en 2025.

**3. Contribution équivalente aux droits de plaidoirie.** Le droit de plaidoirie (13 €) est facturé au client et reversé trimestriellement à la CNBF, au plus tard le 15 du mois suivant. Les avocats qui ne plaident pas ou peu acquittent une contribution équivalente :

```
contribution = (revenus professionnels / valeur en revenu d'un droit de plaidoirie) × 13 €
```

Valeur en revenu d'un droit de plaidoirie : 573 € en 2025. Revenus plafonnés à 297 549 €. Exemple : 115 000 € de revenus → `115 000 / 573 × 13 = 2 609 €`.

Le régime de base est financé pour un tiers par les droits de plaidoirie et cette contribution.

## 6.3. Calcul de la pension de base

```
Pension = base forfaitaire CNBF × (nombre de trimestres CNBF / durée d'assurance requise)
```

Base forfaitaire : **18 964 € en 2025**. Les trimestres CNBF sont retenus dans la limite de la durée requise selon la génération (barème commun du §2.1).

**Décote** : 1,25 % par trimestre manquant, **plafonnée à 25 %** (art. L. 653-2 et R. 653-2).

**Surcote** : la formule la plus favorable est retenue entre deux modalités —
- 0,75 % de la retraite de base par trimestre cotisé entre le 1er janvier 2004 et le 30 juin 2010, puis 1,25 % par trimestre cotisé depuis le 1er juillet 2010 ;
- ou une majoration forfaitaire au-delà de 220 trimestres CNBF : 4 763 € en 2025.

**Surcote parentale** : 1,25 % par trimestre, maximum 5 %, mêmes conditions que le régime général, applicable depuis le 1er septembre 2023 (art. L. 653-2 I al. 5).

**Majoration pour 3 enfants ou plus** : 10 %, pour les pensions prenant effet à compter du 1er septembre 2023 (art. L. 653-3).

## 6.4. Retraite complémentaire CNBF

Régime par points : `nombre de points × valeur de service du point`, avec une valeur de service de **1,0111 € en 2025**. Cotisations par tranches avec cotisations provisionnelles de début d'activité.

---

# 7. Fonction publique — agents titulaires

## 7.1. Champ

Fonctionnaires civils et militaires de l'État affiliés au **SRE** (Service des retraites de l'État) ; fonctionnaires territoriaux et hospitaliers affiliés à la **CNRACL**. Formule identique, gestion distincte. Retraite additionnelle **RAFP** par points, assise sur les primes, sans décote.

Les agents titulaires et stagiaires dont la durée hebdomadaire de service est inférieure à 28 heures relèvent de l'IRCANTEC, non de la CNRACL (§8).

## 7.2. Formule de calcul

```
Pension = traitement indiciaire brut des 6 derniers mois × taux de liquidation
taux de liquidation = 75 % × (trimestres liquidables / trimestres requis)
puis décote ou surcote, puis minimum garanti, puis majorations, puis plafond
```

### 7.2.1. Traitement de référence

Traitement indiciaire brut mensuel des **6 derniers mois d'activité**, **hors primes et indemnités** (art. L. 15 I CPCMR). En cas de changement d'échelon moins de 6 mois avant le départ, l'indice précédent est retenu. Un agent à temps partiel voit sa pension calculée sur son traitement **à temps plein**.

Le délai de 6 mois n'est pas opposable en cas de fin d'activité ou de décès imputable au service : le dernier traitement soumis à retenue est retenu.

Traitement brut mensuel = indice majoré × valeur mensuelle du point d'indice. Valeur du point : **4,92278 €** depuis le 1er juillet 2023 (arrêté du 25 juillet 2023), **gelée en 2026** en l'absence de revalorisation générale.

Les primes représentent en moyenne près d'un quart de la rémunération brute et sont exclues de la pension principale : elles n'alimentent que la RAFP, dans la limite de 20 % du traitement. C'est la principale source d'écart entre le dernier net perçu et la pension.

### 7.2.2. Trimestres liquidables et trimestres d'assurance

Distinction structurante :

| | Trimestres liquidables | Durée d'assurance |
|---|---|---|
| Périmètre | Services accomplis comme fonctionnaire, plus bonifications | Tous régimes confondus |
| Usage | Numérateur du taux de liquidation | Appréciation du taux plein, décote et surcote |
| Temps partiel | Retenus pour leur **durée réelle**, sauf surcotisation sur le traitement à temps plein | Retenus **intégralement** |

La durée est décomptée en années, mois et jours, arrêtée en trimestres, **toute fraction égale ou supérieure à 45 jours comptant pour un trimestre**.

Depuis le 1er septembre 2023, sont retenus comme du temps plein pour les trimestres liquidables : temps partiel de droit pour élever un enfant, temps partiel dans le cadre du congé de présence parentale, temps partiel accordé dans des cas exceptionnels, temps partiel dans le cadre du congé de proche aidant, temps partiel thérapeutique (art. L. 11 1° CPCMR).

Les **bonifications** peuvent porter les trimestres liquidables au-delà de la durée requise, et donc le taux au-delà de 75 %, dans la limite de **80 %**.

Exemple : né en janvier 1961, 168 trimestres requis. Si les 168 trimestres sont liquidables → 75 %. Avec 10 ans à 80 %, soit 160 trimestres liquidables → `75 / 168 × 160 = 71,43 %`. Avec 168 trimestres liquidables et 4 trimestres de bonification → `75 / 168 × 172 = 76,78 %`.

### 7.2.3. Durée requise par catégorie

**Catégorie sédentaire** (art. L. 13 I CPCMR) : barème identique au régime général — 166 (1956-1957), 167 (1958-1960), 168 (01/01–31/08/1961), 169 (01/09/1961–1962), 170 (1963), 171 (1964), 172 à partir de 1965 sous le calendrier 2023. Le décret 2026-345 adapte ces valeurs pour les pensions prenant effet à compter du 1er septembre 2026, dans les mêmes termes que le régime général (§2.1.1) : le décret vise expressément les régimes de la fonction publique.

**Catégorie active** : 166 (1960), 167 (1961-1963), 168 (1964-1965 et 01/01–31/08/1966), 169 (01/09–31/12/1966 et 1967), 170 (1968), 171 à partir de 1969.

**Catégorie super-active** : 166 (1965), 167 (1966-1968), 168 (1969-1970 et 01/01–31/08/1971), 169 (01/09–31/12/1971 et 1972), 170 (1973), 171 à partir de 1974.

Les fonctionnaires bénéficiant d'un départ avant 60 ans se voient appliquer la durée exigée pour ceux qui atteignent 60 ans l'année de leur ouverture de droit.

## 7.3. Décote

Même mécanique du plus petit des deux comptages (art. L. 14 I CPCMR) : écart entre l'âge à la date d'attribution et l'âge d'annulation de la décote, ou trimestres manquants tous régimes par rapport à la durée requise.

**Taux de décote selon l'année d'ouverture des droits** — et non selon l'année de liquidation :

| Année d'ouverture des droits | Taux par trimestre |
|---|---|
| 2011 | 0,75 % |
| 2012 | 0,875 % |
| 2013 | 1 % |
| 2014 | 1,125 % |
| 2015 et au-delà | 1,25 % |

Un fonctionnaire remplissant la condition d'âge en 2014 conserve le taux de 1,125 % même s'il liquide en 2015. Règle de millésime figé à implémenter distinctement de la date d'effet.

**Âge d'annulation de la décote** : 67 ans en catégorie sédentaire (66 ans 6 mois pour 1956, 66 ans 9 mois pour 1957), **62 ans en catégorie active**, **57 ans en catégorie super-active** (art. L. 14 bis).

**Exclusions de décote** : mise à la retraite pour invalidité ; incapacité permanente d'au moins 50 % ; agent de 65 ans au moins ayant élevé à son domicile un enfant de moins de 20 ans atteint d'une invalidité d'au moins 80 % pendant au moins 30 mois ; agent de 65 ans au moins ayant été salarié ou aidant familial pendant au moins 30 mois de son enfant bénéficiaire de la PCH (art. D. 13) ; carrière longue. Les fonctionnaires de catégorie active radiés par atteinte de la limite d'âge sans droit au départ anticipé ne subissent aucune décote, de même que les ingénieurs du contrôle de la navigation aérienne ayant atteint 59 ans (correction rédactionnelle par la LF 2024, art. 261).

Exemple : né en 1960, départ à 62 ans avec 161 trimestres, dernier traitement 3 000 €.
`75 % × 3 000 = 2 250` → `2 250 × 161/167 = 2 169` → 20 trimestres d'âge manquants contre 6 de durée, on retient 6 → `2 169 − (6 × 1,25 % × 2 169) = 2 006,32 €`.

## 7.4. Surcote

1,25 % par trimestre depuis le 1er janvier 2009, au titre des trimestres accomplis à compter du 1er janvier 2004 au-delà de l'âge légal et de la durée requise tous régimes (art. L. 14 III CPCMR).

Sont exclues du calcul de la surcote les bonifications de durée de services et les majorations de durée d'assurance, **à l'exception de celles accordées au titre des enfants et du handicap**.

**Surcote parentale de 5 %** dans les mêmes conditions que le régime général, étendue aux bénéficiaires d'un congé parental. Particularité de la fonction publique : elle **ne se cumule pas** avec la surcote de droit commun. À la différence du régime général, où les deux surcotes s'additionnent, il faut ici retenir l'une ou l'autre.

## 7.5. Minimum garanti (MIGA)

Art. L. 17 CPCMR. Deux calculs sont effectués à la liquidation — pension de droit commun et minimum garanti — et **le plus élevé** est retenu.

Le MIGA est assis sur le traitement indiciaire brut au 1er janvier 2004 de l'**indice majoré 227**, revalorisé comme les pensions. Valeur de référence : **1 248,33 €** dans les données 2025 ; environ **1 366,35 € en 2026** (valeur à vérifier auprès du SRE, la revalorisation étant fonction des pensions).

| Durée de services | Montant du minimum garanti |
|---|---|
| Moins de 15 ans (hors invalidité) | Par année de services : (valeur de référence × nb trimestres de services) / trimestres requis pour le taux plein |
| Moins de 15 ans pour invalidité | Par année : 1/15e de 57,5 % de la valeur de référence |
| De 15 à 39 ans | 57,5 % de la valeur de référence pour les 15 premières années, **+2,5 points par année de 15 à 30 ans**, **+0,5 point par année de 30 à 40 ans** |
| 40 ans et plus | 100 % de la valeur de référence |

Exemples avec la valeur 2025 (corrigés le 2026-08-13, cf. `docs/audit/implementation-miga.md` §2 — les
deux premiers exemples ci-dessous contenaient une erreur d'arithmétique dans une version antérieure de
ce document : ils affichaient 389,48 € et 627,06 €, des résultats qui ne se reconstituent qu'avec une
valeur de référence ≈ 1 258,33 €, absente par ailleurs de ce document, plutôt qu'avec 1 248,33 € comme
indiqué en prose ci-dessus) :
- 13 ans de services, 168 trimestres requis : `(1 248,33 × 52) / 168 = 386,39 €`
- 13 ans pour invalidité : `(717,79 / 15) × 13 = 622,08 €` où 717,79 = 57,5 % de 1 248,33
- 35 ans de services : `57,5 % + (15 × 2,5) + (5 × 0,5) = 97,5 %` → `1 248,33 × 97,5 % = 1 217,12 €` (inchangé, déjà exact)

Les formules antérieures au 1er janvier 2014 diffèrent et dépendent de la date de mise en paiement : indices et taux évoluant année par année de 2003 (60 % de l'indice 216) à 2013 (57,5 % de l'indice 227), avec des bonifications intégrées au décompte dans des limites décroissantes de 5 ans (départ 2004) à 1 an (départ 2008 et suivants). Avant 2004, référence à l'indice 216 avec distinction à 25 ans de services.

**Articulation MICO / MIGA pour les polypensionnés** : la LFSS 2024 (art. 93) prévoit que les périodes d'affiliation des aidants et parents au foyer sont retenues pour apprécier l'éligibilité aux deux dispositifs, et que des décrets doivent fixer les conditions dans lesquelles les périodes d'affiliation des fonctionnaires sont retenues pour apprécier la durée requise pour le MICO et le MIGA — l'objectif étant d'éviter le cumul des deux majorations. Vérifier la publication de ces décrets avant d'implémenter un cumul ou une exclusion.

## 7.6. Majorations et maximum

**Majoration pour enfants** : **10 % pour 3 enfants**, **+5 % par enfant supplémentaire**. Conditions : avoir élevé les enfants pendant au moins 9 ans avant leur 16e anniversaire (ou 20e s'ils ouvraient droit aux majorations familiales), condition non applicable aux enfants décédés par fait de guerre. Enfants concernés : légitimes, naturels dont la filiation est établie, adoptifs de l'agent ou de son conjoint, sous tutelle avec garde effective et permanente, recueillis au foyer avec charge effective et permanente.

La majoration s'applique le cas échéant sur la pension **portée au minimum garanti**. Le total pension + majoration ne peut excéder le **dernier traitement de base**.

**Maximum** : 75 % du dernier traitement brut hors primes, porté à **80 %** par le jeu des bonifications.

**Revalorisation** : chaque 1er janvier selon l'évolution des prix hors tabac, avec ajustement éventuel l'année suivante.

## 7.7. Prestations supplémentaires

**Supplément de pension NBI** : les agents ayant perçu la nouvelle bonification indiciaire bénéficient d'un supplément de pension calculé sur les points de NBI détenus et leur durée de perception. Formule complète et sources ci-dessous, §7.7.1 — ajoutée le 2026-08-15 en vue d'une future session de conception (écart #13-NBI, sur le modèle de #6).

### 7.7.1. Supplément de pension NBI — formule sourcée

> Recherche effectuée le 2026-08-15. Source primaire directement citée verbatim depuis Légifrance ;
> sources secondaires (portails officiels et syndicaux) corroborant la même structure de calcul.
> Cf. `docs/audit/audit-retraite.md` écart #13-NBI pour le détail complet de la recherche, y compris
> le point non résolu signalé en fin de section.

**Texte source (Décret n° 2003-1306 du 26 décembre 2003 relatif au régime de retraite des
fonctionnaires affiliés à la CNRACL, article 28)**, cité verbatim depuis Légifrance
([lien](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006400895)) :

> « Le fonctionnaire [...] admis à faire valoir ses droits à la retraite à compter du 1er août 1990 et
> titulaire d'une pension servie en application de l'article 7, ayant perçu au cours de sa carrière la
> nouvelle bonification indiciaire a droit à un supplément de pension s'ajoutant à la pension liquidée
> en application des dispositions du présent décret.
>
> Les conditions d'obtention et de réversion de ce supplément sont identiques à celles de la pension
> elle-même.
>
> Ce supplément de pension est égal à la moyenne annuelle de la somme perçue au titre de la nouvelle
> bonification indiciaire, multipliée, d'une part, par la durée de perception exprimée en trimestres
> liquidables selon les modalités prévues par l'article 16, et d'autre part par le rapport défini au
> dernier alinéa du I de ce même article. Pour le calcul de la moyenne annuelle, la somme perçue au
> titre de la nouvelle bonification indiciaire est revalorisée dans les conditions prévues à
> l'article 19. Le supplément de pension est revalorisé dans les conditions prévues à l'article 19. »

**« Le rapport défini au dernier alinéa du I » de l'article 16 du même décret** (« Taux maximum de
pension ») : le nombre de trimestres nécessaires pour obtenir le pourcentage maximum de la pension
(75 %) est celui prévu à l'art. L. 161-17-3 du code de la sécurité sociale (= la durée requise pour le
taux plein, déjà modélisée dans cet outil via `trimestresRequisPourGeneration()`). « Chaque trimestre
est rémunéré en appliquant le pourcentage maximum [...] au nombre de trimestres [requis] » — le
« rapport » est donc **75 % ÷ durée requise pour le taux plein**, le même taux d'annuité par trimestre
que celui de la pension de base (référentiel §7.2).

**Formule complète reconstituée** :

```
supplément_NBI = moyenne_annuelle_NBI_revalorisée
                 × trimestres_liquidables_pendant_lesquels_la_NBI_a_été_perçue
                 × (75% / durée_requise_taux_plein)
```

Où :
- `moyenne_annuelle_NBI_revalorisée` : moyenne annuelle des sommes réellement perçues au titre de la
  NBI sur la période où l'agent l'a détenue, chaque année étant revalorisée « dans les conditions
  prévues à l'article 19 » — soit la même revalorisation que la pension elle-même (art. 19 du décret
  n'a pas été consulté dans cette session, mais l'article 28 le cite explicitement à deux reprises :
  pour la moyenne ET pour le supplément final).
- `trimestres_liquidables_pendant_lesquels_la_NBI_a_été_perçue` : PAS la durée totale de carrière, mais
  seulement les trimestres liquidables (comptés selon les mêmes modalités que la pension générale, art.
  16) correspondant aux périodes où la NBI était effectivement perçue.
- `75% / durée_requise_taux_plein` : structurellement identique au taux d'annuité par trimestre de la
  pension de base (référentiel §7.2, §7.2.3) — la formule du supplément NBI est donc l'analogue exact
  de la formule de la pension de base, appliquée à la « moyenne annuelle NBI » comme s'il s'agissait
  d'un traitement de référence, et aux trimestres de perception NBI comme s'il s'agissait des
  trimestres liquidables.
- **Aucun seuil minimal de perception** : le texte de l'article 28 n'en pose aucun — toute perception de
  la NBI, même brève, ouvre droit au supplément, proportionnellement à sa durée. Confirmé par lecture
  directe du texte intégral (pas une déduction par absence de mention dans une source secondaire).
- **Conditions d'obtention et de réversion** : identiques à celles de la pension principale (pas de
  condition supplémentaire propre au supplément NBI).

**Sources secondaires corroborant la même structure** (sans formule légale citée, donc non retenues
comme source primaire, mais cohérentes avec le texte ci-dessus) :
- [Service-public.gouv.fr — Estimer le montant du supplément de pension NBI](https://www.service-public.gouv.fr/particuliers/vosdroits/R71903)
  (portail officiel, formule reformulée en langage courant identique à l'article 28 ; cite Code général
  de la fonction publique art. L712-7 à L712-13 et Loi n° 91-73 du 18 janvier 1991, art. 27 — cette
  dernière étant la loi d'habilitation d'origine, commune aux trois versants de la fonction publique).
- [CNRACL — Nouvelle bonification indiciaire (NBI)](https://www.cnracl.retraites.fr/actif/ma-carriere-mes-droits/nouvelle-bonification-indiciaire-nbi)
  (cite Loi n° 91-73 du 18/01/1991, Décret n° 91-613 du 28/06/1991, Décret n° 2007-173 du 07/02/2007 —
  sans formule chiffrée).
- Sources syndicales (UNSA Développement durable — agents de l'État ; emploi-collectivites.fr) :
  reformulent la même formule (« moyenne de la NBI perçue × durée de perception en trimestres
  liquidables × taux de rémunération/pourcentage de la pension par trimestre »), sans texte légal
  propre cité.

**⚠️ Point non résolu, à vérifier avant toute implémentation** : le texte source ci-dessus (Décret
n° 2003-1306, art. 28) régit spécifiquement la **CNRACL** (fonction publique territoriale et
hospitalière). Aucune disposition équivalente n'a été localisée et vérifiée directement dans le **code
des pensions civiles et militaires de retraite** (fonction publique d'État, SRE) au cours de cette
session — la recherche de l'article correspondant (probablement un L. ou R. article du CPCMR) n'a pas
abouti à un texte consultable et cité avec certitude. Les sources secondaires (service-public.gouv.fr,
qui couvre les trois versants ; CNRACL elle-même, dont le simulateur est présenté comme valable « si
vous êtes fonctionnaire de l'État ») suggèrent fortement que la MÊME formule s'applique au SRE, ce qui
serait cohérent avec le traitement déjà unifié CNRACL/SRE de `calculFonctionPublique.ts` dans cet
outil — mais ce point reste une corroboration indirecte, pas une vérification directe du texte
réglementaire applicable au SRE. À confirmer en priorité au début d'une future session de conception,
avant de coder quoi que ce soit pour le versant État.

**Surpension** : majoration applicable aux pensions des agents résidant dans certaines collectivités d'outre-mer, régime modifié depuis le 1er janvier 2009.

**Bonifications** : bonifications pour droits familiaux (enfants nés avant 2004, accouchement pendant les études), bonifications de dépaysement, campagne, services aériens et sous-marins. Les bonifications pour enfants et pour handicap sont les seules retenues pour le calcul de la surcote.

---

# 8. Fonction publique — agents contractuels

## 8.1. Architecture

Les agents contractuels relèvent du **régime général (CNAV)** pour leur retraite de base — l'intégralité des règles du §3 s'applique — et de l'**IRCANTEC** pour leur retraite complémentaire, régime par points géré par la Caisse des dépôts.

L'IRCANTEC s'est substituée le 1er janvier 1971 à l'IPACTE (agents non titulaires cadres, créé en 1951) et à l'IGRANTE (non-cadres, créé en 1960).

## 8.2. Affiliés à l'IRCANTEC

Agents contractuels de l'État et des collectivités publiques ; agents titulaires ne relevant pas de la CNRACL, notamment ceux dont la durée hebdomadaire de service est inférieure à 28 heures ; agents titulaires sans droit à pension ; agents de certains établissements publics ; élus locaux.

**Critère de rattachement** : la nature **de droit public du contrat de travail**, et non la nature juridique de l'employeur (loi du 20 janvier 2014, décret 2016-904 du 1er juillet 2016), applicable depuis le 1er janvier 2017. Exception pour les contrats aidés, où le critère reste la nature de l'employeur : employeur public → IRCANTEC, employeur privé → AGIRC-ARRCO. Les affiliations en cours au 1er janvier 2017 sont maintenues jusqu'à la rupture du contrat, même non conformes au nouveau critère.

Les élus locaux cotisent pendant toute la durée de leur mandat, même au-delà de 65 ans.

## 8.3. Assiette et taux

Assiette : rémunération globale brute, **primes comprises**, à l'exclusion des prestations à caractère familial et des indemnités pour frais. Deux tranches : tranche A jusqu'au PASS, tranche B de 1 à 8 PASS.

Particularités : pour les élus locaux, assiette égale aux indemnités perçues. Pour les agents exerçant hors de France métropolitaine, la rémunération retenue est celle d'un agent occupant à Paris un poste de niveau hiérarchique et de qualification équivalents.

**Médecins hospitaliers** — assiette différenciée selon le statut :
- **totalité** de la rémunération globale brute : assistants des hôpitaux, étudiants hospitaliers, praticiens adjoints contractuels à temps plein, praticiens hospitaliers à temps plein sans activité libérale, praticiens hospitaliers universitaires sans activité libérale ;
- **deux tiers** de la rémunération globale brute : attachés des hôpitaux et attachés associés, assistants associés, internes, pharmaciens hospitaliers à temps partiel, praticiens adjoints contractuels à temps partiel, praticiens hospitaliers à temps partiel, praticiens hospitaliers à temps plein avec activité libérale, praticiens hospitaliers universitaires avec activité libérale.

Sont compris dans la rémunération globale brute : émoluments hospitaliers, indemnité différentielle des praticiens attachés, indemnité de sujétion, indemnité RTT, indemnité forfaitaire de travail additionnel, indemnités de garde. Les étudiants et internes cotisent sur les deux tiers de leurs émoluments forfaitaires mensuels à l'exclusion de toute autre indemnité ; les étudiants hospitaliers sur leur indemnité hors gardes.

---

# 9. Artistes-auteurs

## 9.1. Champ

Artistes-auteurs créateurs d'œuvres originales, relevant d'une **branche du régime général** — et non d'un régime autonome. Cinq branches (décret 2020-1095 du 28 août 2020) : arts graphiques et plastiques ; écrivains ; auteurs et compositeurs de musique ; cinéma et télévision ; photographie.

Lorsqu'un auteur exerce dans plusieurs branches, sa catégorie professionnelle est celle de l'activité lui ayant procuré la majorité de ses revenus d'auteur l'année précédente.

À distinguer des artistes non créateurs d'œuvres originales, affiliés à la CIPAV, et des créateurs de contenus relevant de la SSI (influence commerciale au sens de la loi 2023-451 du 9 juin 2023, community management, rédaction web).

## 9.2. Interlocuteurs

Sécurité sociale des artistes-auteurs (rapprochement de l'Agessa et de la Maison des artistes, entériné en mai 2022) pour l'affiliation, le conseil et l'action sociale ; **URSSAF Limousin** pour le recouvrement depuis le 1er janvier 2019 ; assurance maladie pour les prestations en nature et en espèces ; Assurance retraite pour la retraite de base ; CAF pour les prestations familiales.

## 9.3. Assiette sociale

```
assiette sociale = bénéfice (ou recettes après abattement si micro-fiscal) × 1,15
```

La majoration de 15 % est structurante et propre au régime. Déclaration à l'URSSAF entre le 1er juillet et le 30 juin.

**Précompte** : avance de cotisations versée par le diffuseur lors du paiement de la facture, calculée sur le **montant de la facture** et non sur l'assiette sociale — d'où un trop-payé systématique régularisé une fois les revenus connus. Les artistes-auteurs déclarant en BNC bénéficient d'une dispense automatique de précompte, à fournir aux clients.

## 9.4. Validation des trimestres

Fondée sur l'assiette sociale, non sur le chiffre d'affaires :

| Assiette sociale | Trimestres |
|---|---|
| > 150 × SMIC horaire | 1 |
| > 300 × SMIC horaire | 2 |
| > 450 × SMIC horaire | 3 |
| > 600 × SMIC horaire | 4 |

Plafond de 4 trimestres par an, même au-delà de 600 SMIC horaire. Des trimestres assimilés peuvent s'y ajouter (maternité, maladie).

**Pluriactivité :**
- artistique + salariée au régime général : les assiettes se **cumulent**, dans la limite du PASS et de 4 trimestres par an ;
- artistique + travailleur indépendant : droits calculés **séparément**, sans cumul des revenus, dans chacun des deux régimes ;
- artistique + régime spécial : idem, calcul séparé.

## 9.5. Pension

La pension de base suit les règles du régime général (§3), l'assiette sociale majorée de 15 % constituant le revenu porté au compte. Retraite complémentaire assurée par l'**IRCEC**, par points.

---

# 10. Retraite mutualiste du combattant (RMC)

## 10.1. Nature

Contrat de **retraite supplémentaire individuel** (art. L. 222-2 du Code de la mutualité) — troisième niveau, par capitalisation. Il ne s'agit pas d'un régime de base et le dispositif n'entre pas dans la logique trimestres/points. Sa place dans un module retraite relève de l'optimisation patrimoniale, non du calcul de droits.

## 10.2. Bénéficiaires

Titulaires de la Carte du combattant ou du Titre de reconnaissance de la nation (TRN) ; victimes de guerre : veufs, veuves, orphelins et ascendants de civils ou militaires morts pour la France à titre militaire. **Aucune limite d'âge ni condition de santé.** Justification par les cartes et documents ad hoc, ou à défaut par la preuve du dépôt du dossier.

## 10.3. Cotisations

Durée minimale de cotisation dégressive selon l'âge de souscription :

| Âge à la souscription | Durée minimale |
|---|---|
| 50 ans et moins | 10 ans |
| 51 ans | 9 ans |
| 52 ans | 8 ans |
| 53 ans | 7 ans |
| 54 ans | 6 ans |
| 55 ans | 5 ans |
| 56 ans et plus | 4 ans |

Montant minimum fixé à la souscription, modulable ensuite selon le contrat.

## 10.4. Rente et majoration de l'État

Rente viagère servie à partir du 50e anniversaire, avec possibilité de report jusqu'à un âge limite contractuel. Elle est **majorée par l'État de 12,5 % à 60 %**, le niveau dépendant de la date de souscription et du délai entre celle-ci et la délivrance de la carte ou du TRN. S'y ajoutent des participations annuelles aux excédents.

**Deux modes de constitution**, choisis à l'adhésion et modifiables pour les versements futurs si les conditions générales le permettent :
- **capital aliéné** : cotisations versées à fonds perdus, aucune somme payable au décès, rente sensiblement plus élevée. Techniquement une rente à titre onéreux, calculée sur la table réglementaire par génération non genrée de 2005 ou sur la table d'expérience certifiée de la mutuelle ;
- **capital réservé** : capital décès (ou rente) versé aux bénéficiaires désignés quelle que soit la date du décès, y compris après le service de la rente. Rachat de la provision mathématique possible avant ou après le service de la rente. À la liquidation, possibilité d'aliéner tout ou partie du capital réservé pour majorer la rente.

## 10.5. Régime fiscal

Les versements sont déductibles du revenu global sous conditions, y compris après le début du service de la rente, tant qu'ils restent affectés à la constitution d'une rente inférieure ou égale au montant de la rente majorée. Les versements excédentaires générant une « rente ordinaire » au-delà du plafond ne sont pas déductibles (BOI-IR-BASE-20-60-30, §380 et 400).

---

# 11. Annexe — paramètres chiffrés 2026

Ces valeurs sont à isoler dans une table de paramètres millésimée, révisable annuellement sans modification du moteur de calcul.

## 11.1. Plafonds et assiettes

| Paramètre | 2026 | 2025 | Source |
|---|---|---|---|
| PASS | 48 060 € | 47 100 € | Arrêté du 22 décembre 2025 |
| PMSS | 4 005 € | 3 925 € | idem |
| Plafond horaire (gratification de stage) | 30 € | — | idem |
| SMIC horaire brut au 1er janvier | 12,02 € | 11,88 € | — |
| SMIC mensuel brut | 1 823,03 € | 1 801,80 € | — |
| Revalorisation du PASS | +2,0 % | +1,6 % | BOSS du 21 octobre 2025 |

## 11.2. Validation des trimestres

| Paramètre | 2026 |
|---|---|
| Revenu — 1 trimestre (150 × SMIC) | 1 803 € |
| Revenu — 2 trimestres | 3 606 € |
| Revenu — 3 trimestres | 5 409 € |
| Revenu — 4 trimestres | 7 212 € |
| Cotisations TNS — 1 trimestre | 322 € |
| Cotisations TNS — 2 trimestres | 644 € |
| Cotisations TNS — 4 trimestres | 1 289 € |

## 11.3. Régime général

| Paramètre | 2026 | 2025 |
|---|---|---|
| Taux plein | 50 % | 50 % |
| Décote par trimestre | 1,25 % (−0,625 pt) | idem |
| Surcote par trimestre | 1,25 % | idem |
| Surcote parentale, plafond | 5 % | idem |
| Majoration 3 enfants et plus | 10 % | idem |
| Pension maximale (50 % PASS), an | 24 030 € | 23 550 € |
| Pension maximale, mois | 2 002,50 € | 1 962,50 € |
| MICO de base, mois | 756,29 € | 747,69 € |
| MICO majoré, mois | 903,93 € | 893,65 € |
| Supplément MICO majoré, mois | 147,64 € | 145,96 € |
| Plafond d'écrêtement MICO, mois | 1 410,89 € | 1 394,86 € |
| Revalorisation des pensions au 1er janvier | +0,9 % | +2,2 % |
| Coefficient de revalorisation des salaires 2024 | — | 1,022 |

## 11.4. Solidarité

| Paramètre | 2026 |
|---|---|
| ASPA, personne seule, mois | 1 043,59 € |
| ASPA, couple, mois | 1 620,18 € |

## 11.5. SSI

| Paramètre | 2025 |
|---|---|
| Valeur du point, droits antérieurs à 1973 — commerçants | 14,71063 €/an |
| Valeur du point, droits antérieurs à 1973 — artisans | 10,6677 €/an |
| Abattement maximal sur points RCI, générations ≥ 1969 | 12 % |

## 11.6. CNAVPL

| Paramètre | 2026 | 2025 |
|---|---|---|
| Valeur de service du point | 0,6599 € | 0,6540 € |
| Taux tranche 1 (0 à 1 PASS) | 8,73 % | 8,73 % |
| Taux tranche 2 (0 à 5 PASS) | 1,87 % | 1,87 % |
| Points maximum tranche 1 | 557 | 557 |
| Points maximum tranche 2 | 25 | 25 |
| Cotisation maximale tranche 1 | 4 195,64 € | 4 111,83 € |
| Cotisation maximale tranche 2 | 4 493,61 € | 4 403,85 € |
| Assiette minimale (450 × SMIC) | 5 409 € | 5 346 € |
| Cotisation minimale | 573 € | — |
| Assiette forfaitaire de début d'activité (19 % PASS) | 9 131 € | 8 949 € |
| Cotisation de début d'activité | 968 € | — |
| Plafond annuel de points | 582 | 582 |
| Points gratuits — exonération | 400/an | idem |
| Points gratuits — invalidité avec tierce personne | 200/an | idem |
| Points gratuits — accouchement | 100 par trimestre civil | idem |

## 11.7. CNBF

| Paramètre | 2025 |
|---|---|
| Base forfaitaire de la retraite de base | 18 964 €/an |
| Valeur de service du point complémentaire | 1,0111 € |
| Taux de la cotisation proportionnelle | 3,10 % |
| Plafond de la cotisation proportionnelle | 297 549 € |
| Droit de plaidoirie | 13 € |
| Valeur en revenu d'un droit de plaidoirie | 573 € |
| Majoration forfaitaire au-delà de 220 trimestres | 4 763 € |
| Décote, plafond | 25 % |

## 11.8. Fonction publique

| Paramètre | 2026 |
|---|---|
| Valeur mensuelle du point d'indice | 4,92278 € (gelée depuis le 01/07/2023) |
| Taux maximal de liquidation | 75 %, 80 % avec bonifications |
| Décote par trimestre (droits ouverts depuis 2015) | 1,25 % |
| Minimum garanti, indice majoré 227, référence mensuelle | ≈ 1 366,35 € (à vérifier auprès du SRE) |
| Majoration enfants | 10 % pour 3 enfants, +5 % par enfant suivant |

---

# 12. Annexe — écarts, incertitudes et points de vigilance

## 12.1. Écarts entre les sources fournies (mars 2025) et le droit en vigueur

| Point | Source Fidroit | Droit en vigueur | Portée |
|---|---|---|---|
| Âge légal et durée requise, générations 1964-1968 | Calendrier loi 2023-270 (63 ans / 171 trim. pour 1964 ; 64 ans / 172 pour 1968) | Barème LFSS 2026 pour les pensions prenant effet à compter du 01/09/2026 (§2.1.1) | **Majeure** — recalcul de tous les scénarios de ces générations |
| Génération 1965 | Traitée comme une génération entière | Découpage au 1er avril 2026 pour l'âge et la durée ; découpage au 1er décembre pour certains départs anticipés | **Majeure** — un raisonnement par année de naissance est faux |
| Âge cible de 64 ans | Génération 1968 | Génération **1969** | Majeure |
| Taux minimum de pension | 40 % pour 1964, 40,625 % pour 1965 | 39,375 % pour 1964 et 1965-T1, 40 % pour 1965-T2 | Moyenne |
| Montants MICO | 747,69 € / 893,65 € (2025) | 756,29 € / 903,93 € (2026) | Moyenne |
| Plafond d'écrêtement MICO | 1 394,86 € | 1 410,89 € | Moyenne |
| Pension maximale mensuelle du régime général | **1 059,75 €** annoncé pour 2025 | 1 962,50 € en 2025 (50 % de 23 550 €), 2 002,50 € en 2026 | **Erreur de la source** — la valeur mensuelle est incohérente avec la valeur annuelle affichée dans le même paragraphe |
| Valeur de service du point CNAVPL | 0,6540 € | 0,6599 € | Faible |
| Taux CNAVPL tranche 1 | 8,73 % annoncé « à compter de 2025 » | Confirmé, appliqué lors de la régularisation des cotisations 2025 | Faible |
| Référence à la « circulaire CNAV 2024-40 du 23 décembre **2025** » | Millésime incohérent | Circulaire 2024-40 du 23 décembre **2024** | Faible — vigilance sur les références citées |
| Exemple MICO palier 2 avec les montants « (876 − 733) » | Montants 2024 utilisés dans un exemple 2025 | Incohérence interne de la source | Faible |

## 12.2. Incertitudes juridiques à documenter, non à trancher

1. **Décrets d'articulation MICO / MIGA** (LFSS 2024, art. 93) : deux décrets doivent fixer les conditions dans lesquelles les périodes d'affiliation des fonctionnaires, magistrats et militaires sont retenues pour apprécier la durée requise pour chacun des deux minima, afin d'éviter un double bénéfice. Vérifier la publication avant d'implémenter une règle de cumul ou d'exclusion pour les polypensionnés public/privé.
2. **ACRE et acquisition de points CNAVPL** : aucun texte ne règle expressément la question. La pratique des sections aligne le traitement sur celui des TNS (maintien de l'acquisition), mais la règle n'est pas opposable. À traiter comme une hypothèse paramétrable, avec avertissement à l'utilisateur.
3. **Actions gratuites et prime de partage de la valorisation de l'entreprise** : exclusion du SAM déduite de l'absence de retenue salariale vieillesse, sans doctrine formelle.
4. **Pérennité du gel LFSS 2026** : l'âge légal est gelé à 62 ans 9 mois jusqu'en janvier 2028 pour les générations concernées ; une nouvelle loi doit intervenir avant fin 2027 pour maintenir ce gel au-delà. Toute projection portant sur 2028 et au-delà repose sur un cadre juridique non stabilisé, ce qui doit être signalé dans les restitutions.
5. **Minimum garanti 2026** : la valeur de référence de l'indice majoré 227 revalorisée doit être confirmée auprès du SRE ; les valeurs circulant dans la presse spécialisée ne sont pas des sources opposables.

## 12.3. Points de vigilance d'implémentation

**Modélisation temporelle**
- La date d'effet de la pension est un paramètre de calcul, pas une donnée de restitution. Trois jeux de paramètres coexistent (avant 01/09/2023, 01/09/2023–31/08/2026, à compter du 01/09/2026).
- La génération doit être modélisée en date de naissance exacte, jamais en année seule : quatre générations connaissent des découpages infra-annuels (1951, 1961, 1965, et 1965/1966 pour les carrières longues).
- Le taux de décote de la fonction publique dépend de l'**année d'ouverture des droits**, distincte de la date d'effet.

**Trimestres**
- Maintenir cinq compteurs distincts et non interchangeables : cotisés, assimilés, majoration de durée d'assurance, validés gratuitement (AVPF/AVA), rachetés par option. La table du §2.5 conditionne quatre mécanismes différents.
- Le plafond de 4 trimestres par année civile s'applique à tous sauf aux MDA.
- Le compteur « tous régimes » et le compteur « régime général et alignés » ne se confondent jamais : le premier détermine le taux, le second le prorata et le MICO.
- Les trimestres cotisés du seuil de 120 du MICO majoré excluent les assimilés et les MDA et intègrent l'AVPF/AVA dans la limite de 24.

**MICO**
- Deux paliers non additifs, chacun avec sa propre proratisation.
- Bascule du dénominateur : durée requise si la durée validée lui est inférieure ou égale, durée validée si elle l'excède.
- Double proratisation du palier 2 pour les polypensionnés avec régime non aligné.
- Écrêtement calculé sur le total des pensions personnelles brutes tous régimes, hors réversion.
- Indexation sur le SMIC, non sur l'inflation.

**Ordre d'application**
- Surcote assise sur la pension **avant** MICO ; majoration enfants assise sur la pension **après** MICO et surcote. Prévoir des tests de non-régression sur cet ordre.
- Régime général : surcote classique et surcote parentale s'additionnent. Fonction publique : elles ne se cumulent pas.

**Par régime**
- CNAVPL : aucun coefficient de proratisation. Appliquer un prorata reviendrait à pénaliser deux fois une carrière incomplète.
- CNBF : pension de base indépendante du revenu, fondée sur une base forfaitaire et la durée d'affiliation.
- Fonction publique : distinguer trimestres liquidables (numérateur du taux) et durée d'assurance tous régimes (décote et surcote), avec traitement différencié du temps partiel.
- SSI : additionner deux pensions calculées selon deux logiques (annuités depuis 1973, points avant 1973) pour les carrières longues des générations concernées.
- Micro-entrepreneur : le revenu porté au compte pour le RAM est l'assiette sociale après abattement, non le chiffre d'affaires brut.
- Artistes-auteurs : assiette sociale = bénéfice majoré de 15 %, seuils de validation exprimés en multiples de 150 SMIC horaire sur cette assiette.

**Effets de bord à tester explicitement**
- Un rachat de trimestres améliore le taux mais fait perdre l'année civile concernée pour le SAM.
- Une année à faible revenu peut dégrader le SAM si l'assuré ne dispose pas de 25 années meilleures ; l'effet disparaît au-delà.
- Un assuré liquidant dès l'âge légal avec un excédent de trimestres n'obtient aucune surcote.
- Sous le barème LFSS 2026, les générations 1964 et 1965-T1 perdent l'accès à la surcote parentale, leur âge légal repassant sous 63 ans.
- Un départ quelques semaines avant le 1er septembre 2026 peut coûter un à deux trimestres de durée de référence pour les générations 1964 et 1965.
- Un départ au 1er janvier permet de valider l'année précédente complète et de la retenir dans le SAM.
