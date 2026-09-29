# Audit du module Retraite — règles de calcul et logique patrimoniale

> Audit statique du 2026-09-29 : lecture intégrale du moteur (`src/lib/retraite/`), des écrans
> (`src/components/retraite/`), des hooks associés et de `docs/retraite.md`. Les barèmes 2026 ont été
> recoupés avec des sources publiques (liens en §7). `npx vitest run src/lib/retraite` : 309 tests,
> tous verts. **Aucun code modifié** : ce document classe les constats et propose une séquence de
> corrections et d'évolutions, à valider phase par phase.

## 1. Résumé

Le **socle du régime de base est solide** : le barème par génération (y compris la bascule LFSS 2026
au 01/09/2026), la décote et la surcote, le SAM, le MICO à deux paliers avec écrêtement et les
seuils de validation des trimestres sont conformes. Le travail des audits précédents a porté ses
fruits sur ce périmètre.

Les défauts restants sont ailleurs, et certains faussent le **montant total** montré au client :

1. **Les complémentaires sont figées au jour du RIS**, alors que la base est projetée jusqu'à l'âge
   légal. Pour un cadre de 45 ans, l'Agirc-Arrco (souvent 40 à 60 % de sa retraite) est fortement
   sous-estimée. Aucune minoration Agirc-Arrco n'est appliquée en cas de départ décoté.
2. **Le MIGA est accordé sans condition de taux plein**, ce que SRE et CNRACL confirment comme une
   erreur. Sa valeur de référence semble en plus décalée d'environ 9 % par rapport aux montants
   publiés pour 2026.
3. **Le simulateur de rachat surestime le gain en option « taux seul »**, qui améliore à tort la
   proratisation. Le barème de coût, lui, est conforme au texte officiel ; sa non-monotonie est
   réelle et mérite une alerte de conseil (R4).
4. **L'onglet Optimisation simule des départs avant l'âge légal** et ignore les trimestres et les
   pensions FP/CNAVPL.

Côté conseil, le module répond aujourd'hui à la question « combien de pension brute à l'âge
légal ? ». Un module de référence doit répondre à « **quand partir, avec quel revenu net, comment
combler l'écart, et comment protéger le conjoint** ». Il manque pour cela : le net fiscal et social,
la réversion, les carrières longues, la projection de l'épargne retraite, le calcul de l'âge optimal
et le lien avec les modules Budget, Fiscalité et Transmission (§5).

## 2. Barèmes vérifiés — conformes

| Paramètre | Code | Statut |
|---|---|---|
| Âge légal / durée requise 1951-1969+, découpages 1951/1961/1965 | `calcul.ts:124-193` | ✅ conforme, y compris la zone 1964-1968 de la LFSS 2026 (62a9m/170 pour 1964 ; bascule pour les pensions prenant effet à compter du 01/09/2026) |
| Décote de 1,25 %/trimestre plafonnée à 20 trimestres, plus favorable entre durée et âge (67 ans) | `calcul.ts:617-672` | ✅ |
| Surcote de 1,25 %/trimestre cotisé après l'âge légal et la durée requise | `calcul.ts:428-507` | ✅ |
| MICO 2026 : 756,29 € / 903,93 € par mois | `calcul.ts:686, 730` | ✅ |
| Plafond d'écrêtement MICO 2026 : 1 410,89 €/mois | `calcul.ts:746` | ✅ |
| PASS 2026 : 48 060 € ; revalorisation des salaires 2025 : 0,9 % (coef. 1,009) | `calculSAM.ts:122`, `coefficientsRevalorisationCNAV.ts:132` | ✅ |
| SAM sur 25 ans, plafonnement au PASS **avant** revalorisation | `calculSAM.ts:348-356` | ✅ |
| Seuil de validation 150 × SMIC horaire (depuis 2014) | `calculTrimestres.ts:71+` | ✅ |
| Majoration pour 3 enfants : 10 % (RG/CNAVPL), 10 % + 5 %/enfant plafonnés (FP) | `calcul.ts:917`, `calculFonctionPublique.ts` | ✅ |
| Point CNAVPL 2026 : 0,6599 € ; point RAFP 2026 : 0,05671 € | `CarriereCNAVPL.tsx:20`, `pensionConsolidee.ts:58` | ✅ (la valeur RAFP est dupliquée dans deux fichiers) |
| Barème du MIGA par durée (57,5 % à 15 ans, +2,5 pts jusqu'à 30 ans, +0,5 pt jusqu'à 40 ans) | `calculFonctionPublique.ts` | ✅ pour la formule, ❌ pour la condition d'accès et la valeur (§3) |

## 3. Anomalies de calcul

### 🔴 Bloquant : fausse un montant présenté au client

**R1. Complémentaires figées, sans projection ni minoration.** ✅ Corrigé le 2026-09-29 (phase 2).
`pensionConsolidee.ts:387-390` (et `Trimestres.tsx`) calcule `points × valeurPoint` avec les points
lus dans le RIS, qui correspondent aux droits acquis au jour du relevé.
- La base est projetée jusqu'à la date d'effet (`calculerProjectionRevenuFutur`), mais pas les
  complémentaires. Le total mélange donc deux horizons différents.
- Aucune acquisition future de points Agirc-Arrco n'est calculée (salaire × taux d'acquisition ÷
  prix d'achat, T1 jusqu'au PASS et T2 de 1 à 8 PASS). Autre difficulté : le revenu du RIS est
  plafonné au PASS, alors que les points T2 dépendent du salaire complet. Il faut donc saisir le
  salaire brut total.
- Aucun **coefficient de minoration Agirc-Arrco** n'est appliqué en cas de départ sans taux plein au
  régime de base (abattement définitif, jusqu'à 57 % selon les sources). L'onglet Optimisation
  surestime donc le total pour un départ anticipé.
- Pas de majoration familiale Agirc-Arrco (10 % pour 3 enfants, plafonnée).
- *Scénario* : cadre né en 1980, 9 000 points au RIS, 60 k€ brut/an. Il acquiert encore environ
  18 ans de points, mais la pension affichée ne compte que les 9 000 points actuels.

**R2. MIGA accordé sans condition de taux plein, avec une valeur de référence douteuse.** ✅ Corrigé le 2026-09-29 (valeur SRE 2026 : 16 396,19 €/an ; approximation services effectifs validée).
`calculFonctionPublique.ts` `minimumGaranti()`, appelé par `pensionConsolidee.ts:169`.
- SRE et CNRACL confirment que le minimum garanti n'est ouvert qu'avec la durée requise **ou** à
  l'âge d'annulation de la décote, sauf en cas d'invalidité. Le point était ouvert au §3 de
  `docs/retraite.md` « en attente de source ». La source est désormais disponible, la règle est à
  implémenter.
- Valeur de référence : le code retient 1 248,33 €/mois (« 2025 »). Les sources 2026 donnent
  **1 366,35 €/mois pour 40 ans de services**. L'écart (≈ 9 %) dépasse une simple revalorisation
  annuelle : il faut vérifier la valeur 2025 elle-même sur une source primaire (SRE).
- Le MIGA se calcule sur les **services effectifs**, alors que le code lui passe les trimestres
  liquidables (bonifications comprises). Il est donc légèrement surestimé.

**R3. Rachat « taux seul » : gain de pension surestimé.** ✅ Corrigé le 2026-09-29.
`Trimestres.tsx` (bloc `tauxAvecRachat`) : les trimestres rachetés entrent **dans la proratisation
et dans la décote quelle que soit l'option**. En option 1 (« taux seul »), le rachat ne réduit que
la décote et n'augmente pas la durée d'assurance du régime général. Le gain affiché et le point mort
sont donc faux dans le sens favorable au rachat.

**R4. Barème de coût du rachat — ✅ conforme, reclassé (vérifié le 2026-09-29 sur les sources
primaires).**
`calcul.ts:1117-1123` applique `revenu × pourcentage` sur la tranche 75-100 % du PASS.
- Les 47 lignes × 6 colonnes du code sont identiques à l'annexe de la [circulaire Cnav n° 2026-04
  du 05/02/2026](https://legislation.lassuranceretraite.fr/Pdf/circulaire_cnav_2026_04_05022026.pdf).
- La formule est celle de l'[arrêté du 21/10/2012](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000026843859),
  qui reste applicable faute de nouveau barème : la colonne intermédiaire est « en pourcentage du
  salaire ou revenu annuel », sans part fixe.
- **La non-monotonie est donc réelle, pas un bug.** Les forfaits ont été calculés en 2013 comme
  pourcentage × seuils du PASS 2013 : à 40 ans, 7,43 % × 27 774 € ≈ 2 065 € et 7,43 % × 37 032 € ≈
  2 753 €. Le barème était alors continu. Depuis, les forfaits sont gelés alors que les seuils
  suivent le PASS, ce qui crée les sauts observés (à 40 ans : 3 566 € pour 48 000 € de revenu,
  2 753 € pour 48 100 €).
- **Opportunité de conseil** : alerter quand le revenu moyen de 3 ans se situe dans la tranche
  intermédiaire. Le client paie alors plus que s'il dépassait le PASS ; un décalage de l'année de la
  demande peut changer la tranche.
- Restent à corriger en phase 0 :
  - la source citée dans le code (moneyvox.fr, à remplacer par la circulaire et l'arrêté) ;
  - la règle des 67 ans et plus (montant à 62 ans diminué de 2,5 % par année révolue, pour certains
    rachats alignés), non modélisée ; le code renvoie `undefined`, ce qui reste correct pour le
    versement pour la retraite (VPLR) classique, limité aux moins de 67 ans.

**R5. Départs simulés avant l'âge légal.** ✅ Corrigé le 2026-09-29.
`Trimestres.tsx` : le sélecteur de date va de 60 à 70 ans (`AGE_MIN = 60`) et le tableau
comparatif commence à 62 ans. Aucun garde-fou ne compare la date à l'âge légal.
- Pour une personne née en 1970 (âge légal 64 ans), l'écran affiche une pension décotée à 62 et
  63 ans, alors que ces départs sont juridiquement impossibles hors carrière longue, handicap ou
  incapacité.

**R6. Onglet Optimisation : polypensionnés mal traités.** ✅ Corrigé le 2026-09-29.
`Trimestres.tsx`, fonction `simulerPourDateEffet` :
- La décote et la condition de durée de la surcote utilisent les seuls trimestres du régime
  général, et non le total tous régimes. Pour un salarié devenu fonctionnaire ou libéral, la décote
  est surestimée.
- Les pensions FP, RAFP et CNAVPL sont absentes du total.
- L'écran donne donc un résultat différent de Carrière/Synthèse pour le même départ à l'âge légal.

### 🟠 À traiter : écart probable ou limite significative

**R7. Revenus MSA salariés et SSI (ex-RSI) exclus du SAM.**
`calculSAM.ts:157` et `calculTrimestres.ts:304` ne retiennent que les périodes dont le régime
contient « assurance retraite ».
- Or, depuis la LURA, le SAM est unique pour RG + MSA salariés + SSI. De plus, les trimestres de
  ces régimes sont déjà sommés dans `trimestresValides` (`Carriere.tsx:485`).
- Risque : SAM sous-estimé pour un ex-artisan ou un ancien salarié agricole.
- À confirmer sur un RIS réel anonymisé : le libellé des lignes SSI d'avant 2020 est à vérifier.

**R8. Montants bruts, en euros constants, sans le dire.**
- Tous les montants sont **bruts** : ni CSG/CRDS/CASA, ni cotisation maladie de 1 % sur les
  complémentaires, ni impôt sur le revenu.
- Les montants projetés sont en euros constants 2026 (dernier PASS, MICO 2026), mais aucun libellé
  ne le signale.
- Le module Fiscalité dispose déjà de `calculerPrelevementsSociauxPensionsRetraitesRentes` et du
  moteur d'IR. Ils ne sont pas branchés sur Retraite.

**R9. RAFP toujours versée en rente.** ✅ Corrigé le 2026-09-29 (phase 2).
En dessous de 5 125 points, la RAFP est versée en capital. Le coefficient de majoration lié à l'âge
de liquidation n'est pas non plus appliqué.

**R10. Proratisation FP plafonnée à 75 %.**
`tauxProratisation()` plafonne à 1. En FP, les bonifications peuvent porter le taux jusqu'à 80 %.
C'est une sous-estimation marginale.

**R11. Aucun dispositif de départ anticipé.**
Carrière longue (y compris ses paramètres LFSS 2026), handicap, incapacité permanente, catégories
actives hors saisie manuelle : rien de tout cela n'existe. La carrière longue concerne pourtant une
part notable des départs.

Déjà documentés dans `docs/retraite.md` §3 et toujours ouverts : surcote FP/CNAVPL non calculée,
SAM figé à l'import, calculs FP/CNAVPL dupliqués entre les cartes et le moteur, branche « enfant
recueilli », année de rachat dans le SAM.

### 🟡 Mineur

- `coefficientsRevalorisationCNAV.ts:3-5` : l'en-tête annonce « revalorisation puis
  plafonnement », ce qui contredit `calculSAM.ts` (qui applique le bon ordre). C'est un commentaire
  périmé.
- `decoteSurTrimestresPlafond25()` est du code mort (déjà connu).
- `VALEUR_SERVICE_POINT_RAFP_2026` est dupliquée (`pensionConsolidee.ts:58`,
  `CarriereFonctionPublique.tsx:40`). Les barèmes sont dispersés dans le code et aucune date de
  péremption n'est contrôlée.

## 4. Ce qui manque pour une vraie étude retraite (règles non modélisées)

| Domaine | Règle à couvrir | Priorité |
|---|---|---|
| Complémentaires | Projection des points Agirc-Arrco (T1/T2, 8 PASS), minoration, majoration enfants ; RCI, Ircantec, sections CNAVPL (CIPAV, CARMF…) | 🔴 |
| Réversion | RG : 54 %, sous condition de ressources, dès 55 ans. Agirc-Arrco : 60 %, sans condition de ressources, perdue en cas de remariage. FP : 50 %, sans condition d'âge ni de ressources. Partage entre ex-conjoints au prorata des durées de mariage | 🔴 |
| Net | Taux de CSG selon le RFR (0 / 3,8 / 6,6 / 8,3 %), CRDS, CASA, maladie 1 % ; IR avec abattement de 10 % plafonné, par foyer | 🔴 |
| Départs anticipés | Carrière longue, handicap, incapacité, catégories actives FP | 🟠 |
| Transitions | Retraite progressive, cumul emploi-retraite (plafonné ou intégral, nouveaux droits depuis la réforme 2023) | 🟠 |
| Trimestres gratuits | Détection des trous du RIS (service militaire, chômage non indemnisé, AVPF, maternité, stages) = régularisations gratuites à faire avant tout rachat | 🟠 |
| Rachat | Déductibilité (coût net = coût × (1 − TMI)), effet sur la minoration Agirc-Arrco, rachat inutile si le MICO s'applique | 🟠 |

## 5. Logique patrimoniale et décisionnelle : ce qui ferait la différence

Les outils du marché (simulateurs Info-Retraite/M@rel, logiciels CGP) calculent tous des droits.
Peu relient **droits, fiscalité, patrimoine et famille** dans un même raisonnement. C'est
précisément l'avantage de KAIROS, qui dispose déjà des modules Budget, Fiscalité, Patrimoine,
Famille et Transmission.

**5.1 Un revenu net réel, par personne et pour le foyer.**
Il s'agit de passer de la pension brute au **revenu disponible net d'impôt** du foyer à la date de
départ :
- pensions nettes de prélèvements sociaux ;
- IR recalculé avec le moteur Fiscalité (quotient familial du couple, abattement de 10 % sur
  pensions) ;
- revenus du patrimoine (loyers, dividendes, rachats d'assurance-vie).

Indicateur clé : **taux de remplacement net/net** par rapport au dernier revenu d'activité.

**5.2 L'écart de revenu et son financement.**
- Budget cible à la retraite (module Budget, avec les charges qui disparaissent : crédits soldés,
  frais professionnels) comparé au revenu net → **déficit mensuel**.
- Capital nécessaire pour le combler (rente sur l'espérance de vie ou consommation du capital sur un
  horizon donné) comparé à l'épargne retraite **projetée** : PER, assurance-vie, Madelin, PERO/art.
  83, PERCOL. Aujourd'hui, `EpargneRetraite.tsx` ne fait qu'additionner des encours.
- Sortie optimale de chaque enveloppe, fiscalité comprise :
  - PER en capital : versements déduits imposés au barème, gains au PFU ;
  - PER en rente : RVTG ;
  - assurance-vie : rachats avec abattement de 4 600 / 9 200 € après 8 ans ;
  - rente viagère à titre onéreux : fraction imposable selon l'âge.
- Séquencement des retraits pour lisser la TMI.

**5.3 L'âge de départ optimal, calculé et non seulement comparé.**
Pour chaque date possible (au trimestre, entre l'âge d'ouverture des droits et 70 ans) :
- revenu net annuel, puis **valeur actualisée des flux nets sur l'espérance de vie** (tables INSEE
  par génération et par sexe) ;
- **point mort** de chaque trimestre travaillé en plus (salaire net perdu contre surcote gagnée) ;
- effet de seuil du taux plein ;
- effet de la minoration Agirc-Arrco.

Présentation : une recommandation argumentée plutôt qu'un simple tableau 62-70 ans.

**5.4 L'arbitrage « combler la décote ».**
Pour le même objectif, comparer :
1. travailler plus longtemps ;
2. racheter des trimestres, avec un coût net après déduction à la TMI ;
3. verser sur un PER, avec un avantage fiscal et un capital transmissible ;
4. accepter la décote et compléter par l'épargne.

Le rachat détruit un capital transmissible, contrairement au PER : le module Transmission peut
chiffrer cet effet.

**5.5 Le couple et la protection du survivant.**
- Coordination des dates de départ des deux conjoints : fiscalité commune, année de décalage.
- **Réversion croisée** : revenu du survivant, dans chaque ordre de décès.
- Branchement direct sur la comparaison des options du conjoint survivant déjà présente dans
  Transmission (commit `ce6bab0`). La réversion, les rentes de PER réversibles et les clauses
  d'assurance-vie forment un tout.
- Alerte en cas de PACS ou de concubinage, qui n'ouvrent **aucune** réversion : forte valeur de
  conseil (lien avec `docs/alertes-conseil-referentiel.md`).

**5.6 Les alertes de conseil automatiques.**
Exemples :
- trimestres manquants régularisables gratuitement ;
- taux plein atteint : chaque trimestre supplémentaire rapporte une surcote ;
- départ anticipé = minoration Agirc-Arrco ;
- PER non optimisé (plafond de déduction disponible, mutualisation dans le couple) ;
- MICO écrêté : racheter serait inutile ;
- pas de réversion (PACS) ;
- RIS de plus de 2 ans : réimporter ;
- barème périmé.

**5.7 Scénarios et sensibilité.**
- Risque réglementaire : la suspension LFSS 2026 est temporaire.
- Revalorisation inférieure à l'inflation, sous-indexation Agirc-Arrco, évolution de salaire.
- Présentation en trois colonnes (prudent / central / favorable) plutôt qu'un chiffre unique.

## 6. Feuille de route proposée (une phase à la fois, validation entre chaque)

| Phase | Contenu | Fichiers principaux |
|---|---|---|
| **0. Corrections** | R2 (condition de taux plein et valeur du MIGA, services effectifs), R3, R5, R6, commentaire périmé, dédoublonnage RAFP, source du barème de rachat (R4) | `calculFonctionPublique.ts`, `Trimestres.tsx`, `calcul.ts` |
| **1. Barèmes versionnés** ✅ 2026-09-29 | Sortir tous les paramètres dans un `params-retraite.json` daté par date d'effet (sur le modèle de `params-dmtg.json`), avec contrôle de péremption ; scénarios de référence (sur le modèle de `Golden_Scenarios_Transmission.md`) confrontés à M@rel | `src/lib/retraite/`, `docs/` |
| **2. Complémentaires** ✅ 2026-09-29 | Moteur Agirc-Arrco (projection, minoration, majoration), RAFP capital/rente, sections CNAVPL ; saisie du salaire brut complet | nouveau `calculAgircArrco.ts`, `pensionConsolidee.ts` |
| **3. Net** | Branchement des moteurs Fiscalité (PS et IR), taux de remplacement, libellé en euros constants | `pensionConsolidee.ts`, `src/lib/fiscalite/` |
| **4. Réversion et couple** | Moteur de réversion multi-régimes, revenu du survivant, lien Transmission, alertes PACS | nouveau `reversion.ts` |
| **5. Départs anticipés et transitions** | Carrières longues (LFSS 2026), handicap, retraite progressive, cumul emploi-retraite | `calcul.ts` |
| **6. Moteur de décision** | Âge optimal (valeur actualisée, points morts), arbitrage rachat/PER/travail, écart Budget, projection et sortie de l'épargne retraite, scénarios de sensibilité, rapport PDF enrichi | nouveau `decision.ts`, `Synthese.tsx`, `EpargneRetraite.tsx` |

Chaque phase touchant à une règle fiscale ou réglementaire commencera par un exposé des règles et de
la séquence d'intervention, à valider avant de coder (CLAUDE.md).

## 7. Points à trancher et sources

**Décisions attendues :**
1. ✅ Classement et ordre des phases validés (2026-09-29).
2. ✅ R4 tranché : barème conforme (circulaire Cnav 2026-04 et arrêté du 21/10/2012).
3. R7 : aucun RIS réel disponible. À traiter en phase 1 par un scénario de référence construit à la
   main, et par une recherche des libellés MSA/SSI dans la documentation Info-Retraite.

**Sources consultées :**
- [SRE — le minimum garanti](https://retraitesdeletat.gouv.fr/actif/le-calcul-de-ma-retraite/le-minimum-garanti)
- [CNRACL — minimum garanti](https://www.cnracl.retraites.fr/actif/ma-future-retraite/montant-de-ma-pension/minimum-garanti)
- [Minimum garanti 2026 (droit-finances)](https://droit-finances.commentcamarche.com/salaries/guide-salaries/1655-fonction-publique-minimum-garanti/)
- [MICO 2026 (quelles-aides.fr)](https://www.quelles-aides.fr/retraite/retraite-base/minimum-contributif-retraite/)
- [solidarites.gouv.fr — ce qui change au 1er janvier 2026](https://solidarites.gouv.fr/ce-qui-change-au-1er-janvier-2026-dans-le-champ-des-solidarites)
- [solidarites.gouv.fr — LFSS 2026](https://solidarites.gouv.fr/loi-de-financement-de-la-securite-sociale-2026-les-mesures-phares)
- [Barème rachat 2026 (un-calcul.fr)](https://un-calcul.fr/simulateur-rachat-trimestres-2026/)
- [Barème rachat 2026 (Meilleurtaux)](https://placement.meilleurtaux.com/retraite/actualites/2026-fevrier/rachat-de-trimestres-le-bareme-2013-reste-valable-en-2026.html)
- [Agirc-Arrco 2026 (expert-ccac)](https://www.expert-ccac.fr/paie-charges-sociales/agirc-arrco-montants-2026)
- [Minoration Agirc-Arrco (adcf.org)](https://www.adcf.org/retraite-agirc-arrco-57-ans-coefficient-minoration/)
- [RAFP — valeur du point 2026](https://www.rafp.fr/actualites/rafp-revalorise-valeur-du-point-pour-2026)
- [CNAVPL 2026 (altis-conseil)](https://altis-conseil.fr/retraite-base-professions-liberales-cnavpl/)
