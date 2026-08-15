# Cartographie — Trimestres cotisés vs assimilés (préparation, décisions non tranchées)

> Diagnostic READ-ONLY réalisé le 2026-08-11. **Aucun fichier de code n'a été modifié.**
> Objectif : lister les décisions métier à trancher avant de pouvoir dériver automatiquement
> les trimestres cotisés/assimilés depuis `retraite_carriere_detail`, sans les trancher.
> Prépare deux chantiers déjà en dette technique : la surcote sur trimestres cotisés
> uniquement (`decoteSurTrimestres()`) et la majoration du minimum contributif (120 trimestres
> **cotisés** requis) — cf. [audit-retraite.md](audit-retraite.md) §5 et
> [comparatif-retraite.md](comparatif-retraite.md) §2.3/§3.
>
> Chaque option listée ci-dessous est présentée sans recommandation. Quand une information n'a
> pas été trouvée dans le code du dépôt, c'est indiqué explicitement comme telle — à ne pas
> confondre avec une règle légale inexistante : ce rapport ne prétend pas faire autorité sur le
> droit de la retraite, seulement sur ce que contient (ou non) ce dépôt.

---

## 0. Rappel du point de départ

Le modèle de données actuel :

```sql
-- supabase/migrations/20260722000000_create_retraite_carriere_detail.sql
type_activite TEXT NOT NULL CHECK (type_activite IN ('employeur', 'chomage', 'maladie', 'micro_entrepreneur'))
revenu NUMERIC
est_chiffre_affaires BOOLEAN NOT NULL DEFAULT false
```

`retraite_data.trimestres_valides` est un entier saisi manuellement (ou repris tel quel d'un
import RIS), **sans lien démontrable** avec les lignes de `retraite_carriere_detail` — confirmé
dans [comparatif-retraite.md §2.2](comparatif-retraite.md). Aucune fonction du dépôt ne dérive
aujourd'hui un nombre de trimestres (cotisés, assimilés, ou total) à partir des périodes de
carrière. Ce rapport cartographie ce qu'il faudrait décider pour combler cet écart, pas comment
le combler.

---

## 1. Classification par `type_activite`

### 1.1 Règle officielle par valeur — telle que documentée dans le référentiel externe

Le seul document disponible évoquant une répartition cotisés/assimilés est
[comparatif-retraite.md](comparatif-retraite.md), qui cite le résultat du référentiel externe
pour le cas Titouan Weishaar : **192 trimestres = 66 cotisés + 0 majoration + 170 assimilés,
capé à 4/an**. Le référentiel lui-même (`referentiel-retraite-externe.md`) n'est **pas présent
dans ce dépôt** — impossible de vérifier ici le détail de sa méthode de classification par type
d'activité, seul le résultat agrégé a été retranscrit dans le comparatif.

Correspondance à trancher entre `type_activite` et le statut cotisé/assimilé/dépend :

| `type_activite` | Statut usuel (règle générale, hors dépôt) | Source trouvée dans le dépôt |
|---|---|---|
| `employeur` | Cotisé (l'activité salariée cotisante est la définition même d'un trimestre cotisé) | **Non trouvé** — aucune règle codée. À vérifier : le libellé `employeur` couvre-t-il aussi des cas non cotisants (ex. contrat aidé, stage) ? Le champ ne le distingue pas. |
| `chomage` | Dépend — chômage indemnisé = assimilé (sous condition de plafond de trimestres assimilés/an, cumulé avec les autres catégories assimilées) ; chômage non indemnisé = assimilé sous conditions plus strictes (durée, âge) ou non validé du tout selon les cas | **Non trouvé** — aucune règle codée, aucune fonction ne traite `chomage` différemment de `maladie` ou `employeur` dans le calcul de pension actuel (`decoteSurTrimestres()` ne lit même pas `type_activite`, seulement un total `trimestresValides` opaque). |
| `maladie` | Assimilé, sous condition de perception d'indemnités journalières (IJ) au-delà d'un seuil de jours | **Non trouvé** — même constat. |
| `micro_entrepreneur` | Cotisé, mais seulement si le revenu (converti en assiette sociale) atteint le seuil de validation d'un trimestre (cf. §2) — sinon la période ne valide aucun trimestre | **Non trouvé** — `est_chiffre_affaires` existe en base mais n'est lu par aucun calcul, confirmé dans [comparatif-retraite.md §3, point 3](comparatif-retraite.md). |

**Décision à trancher** : faut-il un statut binaire (cotisé/assimilé) par `type_activite`, ou un
statut `'dépend'` qui déclenche une sous-règle propre à chaque catégorie (ex. seuil de revenu pour
`micro_entrepreneur`, présence d'IJ pour `maladie`) ? Les deux options sont possibles avec le
schéma actuel (aucune des deux n'est présupposée par le code existant, qui ne fait aucune
distinction).

### 1.2 Cas ambigus — le champ actuel les distingue-t-il ?

**Chômage indemnisé vs non indemnisé** : **non distingué par `type_activite`**. Dans les données
réelles du client Titouan Weishaar (`retraite_carriere_detail`), on trouve à la fois des lignes
`CHÔMAGE` et `CHÔMAGE NON INDEMNISÉ` — la distinction n'existe que dans le texte libre du champ
`employeur` (le libellé source du RIS), jamais dans `type_activite` (les deux valent `chomage`) ni
dans aucun autre champ structuré. Confirmé en lisant
[parseRIS.ts:262-273](../../src/lib/retraite/parseRIS.ts) (`classifierTypeActivite()`) : la seule
condition testée est `normalise.includes('CHOMAGE')`, sans sous-cas.

**Congé maladie avec ou sans indemnités journalières** : **non distingué**. Même mécanisme — la
ligne réelle du client contient le libellé `MALADIE, ACCIDENT DU TRAVAIL` dans `employeur`, mais
`type_activite` reste `maladie` sans indication de perception d'IJ. Aucun champ ne porte cette
information (ni montant d'IJ, ni booléen "indemnisé").

**Conséquence pour la classification automatique** : si la règle officielle distingue ces
sous-cas (ce qui est le cas en pratique pour le chômage et la maladie), une classification fondée
uniquement sur `type_activite` sera incomplète. Deux options non tranchées :
- **Option A** — parser le texte libre du champ `employeur` par heuristique (ex. détecter
  `NON INDEMNISÉ` dans le libellé), sur le modèle de ce que fait déjà
  `classifierTypeActivite()` pour distinguer `chomage`/`maladie`/`micro_entrepreneur` par mot-clé.
  Fragile : dépend de la stabilité du libellé RIS, non garantie d'un relevé à l'autre.
- **Option B** — ajouter un champ structuré dédié en base (ex. `indemnise BOOLEAN`), saisi
  manuellement ou déduit à l'import RIS si le libellé le permet. Cf. §5 pour le détail des champs
  manquants.

Aucune des deux options n'est implémentée ni recommandée ici.

---

## 2. Seuils monétaires pour valider un trimestre cotisé

### 2.1 Règle officielle (rappel, hors dépôt)

Un trimestre cotisé est validé lorsque le revenu soumis à cotisations sur une période atteint un
seuil exprimé en multiple du SMIC horaire (habituellement 150 heures de SMIC pour un trimestre,
indexé chaque année sur la revalorisation du SMIC) — **cette règle n'est pas codée dans ce
dépôt**, elle est rappelée ici uniquement comme contexte du diagnostic, sans valeur normative
propre à ce document.

### 2.2 Recherche du "coût d'acquisition d'un trimestre" dans le dépôt

**Non trouvé.** Recherche exhaustive (`grep -rniE "coût d'acquisition|smic"`) sur l'ensemble du
dépôt (code + `docs/`) : aucune occurrence, hors ce document. Le référentiel PDF mentionné dans la
demande (colonne "Coût d'acquisition") **n'est pas présent dans ce dépôt** — ni sous forme de
fichier source, ni sous forme de valeurs retranscrites dans `comparatif-retraite.md` ou
`audit-retraite.md`. Aucun seuil annuel indexé sur le SMIC n'existe dans
`src/lib/retraite/*.ts` : les seules constantes monétaires par année présentes sont
`PASS_PAR_ANNEE` ([calculSAM.ts:19-28](../../src/lib/retraite/calculSAM.ts)) et
`COEFFICIENT_REVALORISATION_CNAV` ([coefficientsRevalorisationCNAV.ts](../../src/lib/retraite/coefficientsRevalorisationCNAV.ts)),
qui servent au calcul du SAM, pas à la validation de trimestres.

À noter, pour référence croisée avec un autre chantier déjà codé dans ce dépôt : `calcul.ts`
contient un barème de **coût de rachat** de trimestre (`BAREME_RACHAT_TAUX_SEUL` /
`BAREME_RACHAT_TAUX_ET_DUREE`, [calcul.ts:161-259](../../src/lib/retraite/calcul.ts)) — c'est un
objet totalement différent (le prix pour racheter un trimestre manquant), à ne pas confondre avec
le seuil de revenu qui valide un trimestre cotisé par l'activité elle-même. Aucun chevauchement de
logique entre les deux.

### 2.3 Micro-entrepreneur — abattement forfaitaire CA → assiette sociale

`est_chiffre_affaires` existe en base (`retraite_carriere_detail.est_chiffre_affaires`,
défaut `false`) et est correctement extrait à l'import RIS
(`parserRevenu()`, [parseRIS.ts:280-288](../../src/lib/retraite/parseRIS.ts) — détecte le repère
`(1)` accolé au montant dans le texte du RIS). Il est persisté (`useCarriereDetail.ts`) et
affiché (`Carriere.tsx`, libellé "(chiffre d'affaires)" visible dans le détail de carrière), mais
**n'est lu par aucune fonction de calcul** — confirmé dans
[comparatif-retraite.md §3, point 3](comparatif-retraite.md) : `calculerSAM()` traite `revenu`
identiquement que ce soit un salaire ou un chiffre d'affaires brut, sans jamais appliquer
d'abattement.

Ce dépôt ne code aucun abattement forfaitaire par sous-type de micro-entreprise. Le sous-type lui-
même (vente BIC / prestation de service BIC / prestation de service BNC) n'existe pas comme champ
structuré : il n'apparaît que dans le texte libre du champ `employeur` (ex. libellés réels du
client : `MICRO-ENTREPRENEUR - Activité de vente BIC`, `MICRO-ENTREPRENEUR - Prestation de service
BIC`, `MICRO-ENTREPRENEUR - Prestation de service BNC`), jamais dans une colonne dédiée.

**Décisions à trancher, toutes non tranchées ici** :
- Faut-il ajouter un champ structuré pour le sous-type de micro-entreprise (vente / service BIC /
  service BNC), ou continuer à le déduire du texte libre par heuristique (fragile, comme au §1.2) ?
- Quel taux d'abattement forfaitaire appliquer par sous-type pour convertir le CA en assiette
  sociale (les taux réels diffèrent selon vente/service/BIC/BNC) ? **Aucune valeur n'est codée
  dans ce dépôt** — à faire valider avant tout codage, ces taux étant révisables et le dépôt
  n'ayant pas de mécanisme de versionnage annuel pour ce type de barème (contrairement à
  `PASS_PAR_ANNEE` qui, lui, est déjà structuré par année).
- L'abattement doit-il s'appliquer avant ou après la répartition du revenu par année civile
  (`repartirRevenuParAnnee()`, cf. §3.2) ? Les deux ordres sont possibles selon que l'abattement
  est vu comme une caractéristique de la période brute ou du revenu annuel agrégé — non tranché.
- Une fois l'assiette sociale obtenue, comparée à quel seuil (annuel ? par trimestre acquis dans
  l'année, avec un seuil × nombre de trimestres visés) ? Non tranché, dépend aussi de la décision
  du §3 sur le plafond 4/an.

---

## 3. Plafond 4 trimestres/an et chevauchements

### 3.1 Chevauchements identifiés pour le client Titouan Weishaar

D'après les 29 lignes de `retraite_carriere_detail` déjà relevées dans
[comparatif-retraite.md §1](comparatif-retraite.md), plusieurs micro-entreprises apparaissent sur
des plages qui se chevauchent. Exemples visibles dans les données déjà citées dans le comparatif
et confirmées via la page Carrière :

- `01/07/2025 → 31/12/2025` : trois lignes simultanées — `MICRO-ENTREPRENEUR - Prestation de
  service BNC`, `CHÔMAGE`, `MICRO-ENTREPRENEUR - Activité de vente BIC`, `MICRO-ENTREPRENEUR -
  Prestation de service BIC`.
- `01/01/2025 → 30/04/2025` et périodes voisines : chevauchement similaire entre
  `MICRO-ENTREPRENEUR - Prestation de service BIC`, `MICRO-ENTREPRENEUR - Activité de vente BIC`,
  `MICRO-ENTREPRENEUR - Prestation de service BNC`, `CHÔMAGE`.
- `01/01/2022 → 31/08/2022` : deux lignes strictement identiques en dates pour le même employeur
  (`TITANE MOTOR`), une par régime (`L'Assurance retraite` / `Agirc-Arrco`) — chevauchement de
  nature différente (doublon régime/revenu du RIS, déjà traité comme tel par
  `estPeriodeRegimeDeBase()` dans `calculSAM.ts`, pas un vrai cumul d'activités).

**Distinction à faire, non tranchée ici** : un chevauchement de type "doublon régime" (même
période, même employeur, deux lignes une par régime — déjà filtré par `calculSAM.ts` pour le
calcul du SAM) n'a pas le même traitement qu'un chevauchement de type "cumul d'activités réelles"
(plusieurs micro-entreprises ou micro-entreprise + chômage sur la même période, qui peuvent
chacune contribuer des trimestres). Aucune fonction actuelle ne fait cette distinction pour le
comptage de trimestres — `estPeriodeRegimeDeBase()` sert uniquement au filtrage du SAM.

### 3.2 `repartirRevenuParAnnee()` — réutilisable, mais pour un objet différent

**Oui**, cette fonction existe et est directement réutilisable dans son principe :
[calculSAM.ts:60-87](../../src/lib/retraite/calculSAM.ts) (`repartirRevenuParAnnee`) répartit déjà
le revenu d'une période entre les années civiles qu'elle traverse, au prorata du nombre de jours
(pas du nombre de mois). Le mécanisme de répartition temporelle est donc déjà écrit et testé
implicitement via le calcul du SAM (aucun test unitaire dédié cependant — `calculSAM.ts` n'a pas
de fichier `*.test.ts`, confirmé absent lors de la recherche de ce rapport).

**Mais elle résout un problème différent** : elle agrège des **montants** (revenus) par année,
pas des **trimestres**. Elle ne fait aucun plafonnement (elle additionne les revenus de plusieurs
périodes qui se chevauchent sans limite), alors que le plafond 4 trimestres/an nécessite un
comptage borné, pas une simple somme. Réutiliser cette fonction pour les trimestres demanderait
au minimum :
- de définir combien de trimestres une période "vaut" avant répartition (dépend du §2 — seuil de
  revenu par trimestre, lui-même non tranché) ;
- une étape de plafonnement par année après agrégation, absente de `repartirRevenuParAnnee()`
  telle qu'elle existe aujourd'hui (elle ne fait qu'additionner, sans jamais capper) ;
- une règle d'arbitrage quand plusieurs activités simultanées dépassent ensemble 4 trimestres sur
  une même année (quel ordre de priorité entre elles ? Aucune règle codée ni recommandée ici).

**Décision à trancher** : réutiliser `repartirRevenuParAnnee()` en l'adaptant (nouvelle fonction
sœur pour les trimestres, sur le même modèle de répartition au prorata des jours), ou construire
une logique de comptage de trimestres entièrement séparée qui ne partage que le principe (pas le
code) avec le calcul du SAM ? Les deux sont possibles avec l'architecture actuelle du module
(fonctions pures indépendantes, pas de couplage imposé entre `calculSAM.ts` et un futur module
trimestres).

---

## 4. Chronologie pour la surcote

### 4.1 Règle à documenter (rappel du besoin, hors dépôt)

La règle officielle ne compte en surcote que les trimestres cotisés acquis **après** le
franchissement des deux seuils cumulatifs : l'âge légal de départ **et** la durée d'assurance
requise pour le taux plein. Tant que l'un des deux seuils n'est pas franchi, aucun trimestre
supplémentaire ne génère de surcote, même s'il est cotisé.

### 4.2 Ce qui existe dans le dépôt pour déterminer cette date

**Âge légal** : mentionné uniquement en commentaire
([calculSAM.ts:34](../../src/lib/retraite/calculSAM.ts), "64 ans, âge minimum de départ avec
décote possible") — **aucune constante ni fonction ne l'expose** dans le code exécutable. La
valeur `64` apparaît par ailleurs dans le barème de rachat de trimestres
(`BAREME_RACHAT_TAUX_SEUL[64]`, [calcul.ts:239](../../src/lib/retraite/calcul.ts)), mais c'est une
coïncidence de structure de barème par âge, sans lien avec l'âge légal de départ — à ne pas
confondre.

**Durée d'assurance requise** : disponible et fonctionnelle —
`trimestresRequisPourGeneration(anneeNaissance)`
([calcul.ts:36-39](../../src/lib/retraite/calcul.ts)), déjà utilisée dans `Trimestres.tsx` (mais
pas branchée dans `Carriere.tsx`, bug déjà documenté dans
[audit-retraite.md §2.5](audit-retraite.md) / [comparatif-retraite.md §2.5](comparatif-retraite.md)).

**Chronologie trimestre par trimestre** : **non trouvé**. Aucune donnée du dépôt n'associe une
date précise d'acquisition à chaque trimestre. `retraite_carriere_detail` a des dates de période
(`date_debut`/`date_fin`), mais pas de trimestre individualisé avec sa propre date — et
`retraite_data.trimestres_valides` est un entier agrégé sans aucune date. Pour déterminer la date
de franchissement des deux seuils, il faudrait pouvoir ordonner chronologiquement l'acquisition
des trimestres (ex. "le 172ᵉ trimestre requis est atteint le 15/03/2058"), ce qui suppose d'abord
d'avoir résolu le calcul même du nombre de trimestres par année (cf. §3) — cette chronologie ne
peut pas être construite indépendamment du reste du chantier.

**Décisions à trancher** :
- Faut-il exposer une fonction `ageLegalPourGeneration()` (sur le modèle de
  `trimestresRequisPourGeneration()`), avec sa propre trajectoire par génération (l'âge légal a
  aussi été modifié par la réforme 2023, comme la durée d'assurance) ? Non tranché, aucun barème
  par génération pour l'âge légal n'est présent dans ce dépôt à ce jour.
- Une fois les deux seuils disponibles comme fonctions, comment déterminer la date exacte de leur
  franchissement à partir de la chronologie des trimestres (suppose une répartition trimestre par
  trimestre dans le temps, pas seulement un total) ? Dépend entièrement de la résolution du §3.
- Le franchissement se fait-il au premier des deux seuils atteints, ou au dernier (formulation
  « et » dans la règle officielle suggère le dernier, mais ce n'est pas vérifié dans ce dépôt ni
  dans le référentiel externe, absent du dépôt) ?

---

## 5. Données manquantes — synthèse

Champs qui semblent nécessaires pour dériver automatiquement cotisés/assimilés et la chronologie
de surcote, mais qui n'existent nulle part aujourd'hui dans le schéma ou le code (ni colonne SQL,
ni champ TypeScript, ni fonction) :

| Donnée manquante | Où elle serait nécessaire | Existe aujourd'hui ? |
|---|---|---|
| Statut cotisé/assimilé/dépend par période | Classification §1 | Non — ni colonne, ni champ dérivé |
| Indemnisation chômage (oui/non) | Désambiguïser §1.2 | Non — seulement dans le texte libre `employeur`, non structuré |
| Perception d'IJ maladie (oui/non), et éventuellement durée | Désambiguïser §1.2 | Non — même constat |
| Sous-type micro-entrepreneur structuré (vente / service BIC / service BNC) | Abattement §2.3 | Non — seulement dans le texte libre `employeur` |
| Barème d'abattement forfaitaire CA → assiette sociale, par sous-type et par année | Conversion §2.3 | Non — aucune valeur codée, aucune structure de versionnage annuel dédiée (contrairement à `PASS_PAR_ANNEE`) |
| Seuil de revenu validant un trimestre (indexé SMIC), par année | Validation §2.1/§2.2 | Non — aucune constante, aucun barème annuel |
| Nombre de trimestres calculé/dérivé par période ou par année | Comptage plafonné §3 | Non — aucune fonction ne calcule de trimestres depuis `retraite_carriere_detail` (confirmé dans `comparatif-retraite.md §2.2`) |
| Règle d'arbitrage entre activités simultanées dépassant 4/an cumulés | Plafonnement §3.2 | Non — non traité, non tranché |
| Âge légal de départ par génération (fonction dédiée) | Chronologie surcote §4.2 | Non — seulement mentionné en commentaire, valeur `64` non exposée comme fonction/constante |
| Date d'acquisition par trimestre (ou au minimum granularité infra-annuelle) | Chronologie surcote §4.2 | Non — seul `retraite_carriere_detail` a des dates de période, `trimestres_valides` est un entier agrégé sans date |
| Référentiel externe lui-même (`referentiel-retraite-externe.md`) | Vérification croisée de toutes les règles citées ci-dessus | **Non présent dans ce dépôt** — uniquement cité par renvoi dans `comparatif-retraite.md`, dont le contenu est la seule trace exploitable ici |

---

## Synthèse — décisions à trancher avant tout codage

Cette liste ne recommande aucune option ; elle regroupe les points d'arbitrage identifiés
ci-dessus qui bloquent une implémentation automatique :

1. Statut cotisé/assimilé/dépend par `type_activite`, et granularité du "dépend" (§1.1).
2. Source de la distinction indemnisé/non-indemnisé (chômage) et avec/sans IJ (maladie) : texte
   libre heuristique vs nouveau champ structuré (§1.2, §5).
3. Structuration ou non du sous-type micro-entrepreneur, et barème d'abattement CA → assiette
   sociale à retenir, par sous-type et par année (§2.3).
4. Seuil de revenu validant un trimestre, sa source annuelle, et son articulation avec le
   barème de rachat déjà existant mais distinct (`BAREME_RACHAT_TAUX_SEUL` — objet différent,
   à ne pas fusionner sans décision explicite) (§2.2).
5. Réutilisation adaptée de `repartirRevenuParAnnee()` vs nouvelle fonction dédiée pour le
   comptage de trimestres, et règle de plafonnement/arbitrage 4/an en cas de cumul d'activités
   (§3.2).
6. Distinction chevauchement "doublon régime" (déjà géré côté SAM) vs "cumul réel d'activités"
   (non géré) pour le comptage de trimestres (§3.1).
7. Ajout ou non d'une fonction `ageLegalPourGeneration()` et de son propre barème par génération
   (§4.2).
8. Mécanique de détermination de la date de franchissement des deux seuils (âge légal + durée
   requise) à partir d'une chronologie de trimestres qui n'existe pas encore (§4.2) — dépend des
   décisions 1 à 6.
9. Localisation et vérification du référentiel externe (`referentiel-retraite-externe.md`), non
   présent dans ce dépôt, qui contient vraisemblablement des réponses à plusieurs des points
   ci-dessus (méthode de classification, taux d'abattement, seuils) mais n'a pas pu être consulté
   pour la rédaction de ce rapport.

Aucune modification de code n'a été effectuée pour la rédaction de ce rapport, conformément à la
consigne.
