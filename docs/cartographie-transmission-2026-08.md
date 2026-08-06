# Cartographie — Module Transmission vs référentiels juridiques

> **Nature de ce document** : cartographie, pas un audit approfondi. Objectif : croiser deux référentiels juridiques complets (`docs/Successions-Referentiel-Complet.md`, 21 chapitres + 4 annexes, et `docs/donations-legs-referentiel.md`, 7 parties) avec le code existant du module Transmission, pour identifier ce qui mérite un audit dédié.
> **Méthode** : les titres niveau 1 (`#`) et niveau 2 (`##`) des deux référentiels ont été extraits intégralement (Étape 1, liste complète en annexe ci-dessous). Le tableau de cartographie (Étape 5) est organisé à la granularité **chapitre/partie** ; quand des sous-thèmes (niveau 2) d'un même chapitre ont un statut réellement différent du reste, ils apparaissent en ligne séparée avec leur propre référence de ligne. Ce choix évite un tableau de ~185 lignes essentiellement redondantes tout en respectant l'esprit de l'extraction complète.
> **Recherche effectuée par 4 agents en parallèle** (lecture seule, aucune modification de code), un par tranche du référentiel successions + un pour donations/legs. Quelques affirmations critiques (correctifs récents, absences totales) ont été revérifiées manuellement après coup.

---

## Étape 1 — Liste complète des thèmes extraits

### `docs/Successions-Referentiel-Complet.md` (21 chapitres + 4 annexes, 2295 lignes)

<details>
<summary>175 titres niveau 1/2 (cliquer pour déplier)</summary>

```
1     # Successions — Référentiel complet
9     ## Sommaire
41    # 1. Ouverture de la succession
43    ## 1.1. Les trois causes d'ouverture
53    ## 1.2. Lieu d'ouverture
62    ## 1.3. Pourquoi la date compte
74    # 2. Qui hérite ? La dévolution légale
78    ## 2.1. Les quatre ordres (C. civ. art. 734)
89    ## 2.2. Le degré
103   ## 2.3. Dévolution sans conjoint survivant
132   ## 2.4. La représentation successorale (C. civ. art. 751 à 755)
146   ## 2.5. Dévolution en présence d'un conjoint survivant
161   # 3. Qualités requises pour hériter
165   ## 3.1. Avoir un lien de famille ou d'alliance
173   ## 3.2. Exister à l'ouverture de la succession (C. civ. art. 725)
179   ## 3.3. Ne pas être indigne (C. civ. art. 726 à 729)
204   ## 3.4. Cas particulier — Le conjoint indigne et les avantages matrimoniaux
214   ## 3.5. Preuve de la qualité d'héritier
223   ## 3.6. Saisine, envoi en possession, délivrance de legs
231   # 4. Successions anomales et droits de retour
235   ## 4.1. Biens dévolus selon leur origine : les droits de retour
275   ## 4.2. Biens dévolus (ou non) selon leur nature
288   # 5. Les droits du conjoint survivant
290   ## 5.1. Qui est conjoint survivant ?
299   ## 5.2. Panorama des droits
315   ## 5.3. L'option 1/4 PP ou 100% usufruit (art. 757, 758-1 à 758-4)
338   ## 5.4. Vocation en propriété — la double masse (C. civ. art. 758-5)
350   ## 5.5. Vocation en usufruit
361   ## 5.6. La donation entre époux (DEE / donation au dernier vivant — DDV)
381   ## 5.7. Conversion de l'usufruit du conjoint (C. civ. art. 759 à 762)
414   ## 5.8. Le droit de jouissance temporaire du logement (C. civ. art. 763)
433   ## 5.9. Le droit viager d'usage et d'habitation (C. civ. art. 764 à 766)
456   ## 5.10. Attribution préférentielle du logement (C. civ. art. 831-2)
465   ## 5.11. Droits sur l'entreprise
469   ## 5.12. Pensions, créances et prestations
479   ## 5.13. Transfert du bail d'habitation
484   ## 5.14. Successions ouvertes avant le 1er juillet 2002 (droit ancien)
499   # 6. Réserve héréditaire et quotité disponible
501   ## 6.1. Définitions (C. civ. art. 912)
506   ## 6.2. Qui est réservataire ?
522   ## 6.3. Comptage des enfants pour le calcul (art. 913 et 913-1)
533   ## 6.4. Barème de la quotité disponible ordinaire (QDO)
555   ## 6.5. La quotité disponible spéciale entre époux (QDS — art. 1094-1)
563   ## 6.6. Combinaison QDO / QDS
573   ## 6.7. Réserve et droit international
582   # 7. L'option successorale
584   ## 7.1. Les trois branches (C. civ. art. 768)
590   ## 7.2. Régime général
600   ## 7.3. Acceptation pure et simple (art. 782 et s.)
607   ## 7.4. Acceptation à concurrence de l'actif net (art. 787 et s.)
625   ## 7.5. Renonciation (art. 804 et s.)
634   ## 7.6. Personnes protégées — tableau de synthèse
642   ## 7.7. Pactes sur succession future
655   ## 7.8. Droits des héritiers et des créanciers
664   # 8. Liquidation civile : la chaîne de calcul
666   ## 8.1. Étape 0 — Liquidation préalable du régime matrimonial
672   ## 8.2. Étape 1 — L'actif brut
681   ## 8.3. Étape 2 — Le passif
688   ## 8.4. Étape 3 — La réunion fictive (art. 922)
702   ## 8.5. Étape 4 — Détermination de la réserve et de la QD
706   ## 8.6. Étape 5 — L'imputation des libéralités
749   ## 8.7. Étape 6 — Réduction, rapport, détermination des droits
756   ## 8.8. Quand le notaire est-il obligatoire ?
770   # 9. Le rapport des libéralités
776   ## 9.1. Principe
782   ## 9.2. Débiteurs et créanciers
795   ## 9.3. Libéralités rapportables (sauf stipulation contraire)
802   ## 9.4. Avantages non rapportables
811   ## 9.5. Le rapport des dettes (art. 864 et s.)
818   ## 9.6. Valeurs à retenir
827   ## 9.7. Exécution du rapport
846   ## 9.8. Aménagements conventionnels (art. 860 al. 3)
856   ## 9.9. Exemples chiffrés de référence
887   ## 9.10. Fiscalité du rapport
896   # 10. La réduction des libéralités excessives
900   ## 10.1. L'action en réduction (art. 920 et s.)
912   ## 10.2. Ordre de réduction (art. 927)
927   ## 10.3. Modalités de la réduction
940   ## 10.4. Réévaluation de l'indemnité de réduction (art. 924-2)
951   ## 10.5. Renonciation à l'action en réduction
978   ## 10.6. Fiscalité de la réduction
987   # 11. L'action en retranchement (enfants non communs)
991   ## 11.1. Qui peut agir
995   ## 11.2. Régimes concernés
1006  ## 11.3. Ce qui n'est pas un avantage matrimonial retranchable
1011  ## 11.4. Délai
1014  ## 11.5. Fiscalité
1019  ## 11.6. Renonciation anticipée (art. 1527 al. 3)
1035  # 12. Testament et legs
1037  ## 12.1. Conditions de validité
1079  ## 12.2. Contenu
1110  ## 12.3. Le testament-partage (art. 1075 et s.)
1139  ## 12.4. Les formes de testament
1181  ## 12.5. Révocation
1195  ## 12.6. Formalités au décès
1209  ## 12.7. Le cantonnement
1215  ## 12.8. Contestation du testament
1222  # 13. Le présent d'usage
1224  ## 13.1. Définition (C. civ. art. 852)
1229  ## 13.2. Les 4 conditions cumulatives
1240  ## 13.3. Conséquences
1251  ## 13.4. Jurisprudence
1264  ## 13.5. Conseil pratique
1269  # 14. La tontine (clause d'accroissement)
1271  ## 14.1. Définition
1276  ## 14.2. Constitution
1284  ## 14.3. Nature juridique
1290  ## 14.4. Effets
1301  ## 14.5. Renonciation
1305  ## 14.6. Fiscalité au décès
1329  ## 14.7. IFI
1333  ## 14.8. La tontine financière (association tontinière)
1342  ## 14.9. Synthèse avantages / inconvénients
1353  # 15. Démembrement et évaluation des droits démembrés
1355  ## 15.1. Principe fondateur
1361  ## 15.2. Le barème fiscal (CGI art. 669)
1424  ## 15.3. L'évaluation économique
1438  ## 15.4. Quand utiliser l'une ou l'autre ?
1448  ## 15.5. Usufruit temporaire de titres de société — méthodes admises
1455  ## 15.6. Rappels utiles sur le démembrement (succession)
1464  # 16. Le quasi-usufruit
1466  ## 16.1. Définition (C. civ. art. 587)
1477  ## 16.2. Origines du quasi-usufruit légal
1488  ## 16.3. Le quasi-usufruit conventionnel
1494  ## 16.4. La convention de quasi-usufruit
1500  ## 16.5. Protection du nu-propriétaire
1516  ## 16.6. Évaluation
1521  ## 16.7. Décès du quasi-usufruitier
1554  ## 16.8. Extinction anticipée du quasi-usufruit
1566  ## 16.9. Quasi-usufruit successif
1569  ## 16.10. IFI
1576  # 17. L'indivision successorale
1578  ## 17.1. Définition et composition
1589  ## 17.2. Gestion
1600  ## 17.3. Fin de l'indivision
1603  ## 17.4. Droits des créanciers
1618  # 18. Le partage
1620  ## 18.1. Définitions
1627  ## 18.2. Types de partage
1631  ## 18.3. Capacité des parties
1641  ## 18.4. Liquidation d'une indivision — la méthode en 3 temps
1676  ## 18.5. Formes du partage
1692  ## 18.6. Formation et attribution des lots
1719  ## 18.7. Effets du partage
1731  ## 18.8. Remise en cause du partage
1744  ## 18.9. Fiscalité — droits d'enregistrement
1792  ## 18.10. Formalités
1805  # 19. Liquidation fiscale : la déclaration de succession
1807  ## 19.1. Nature et objet
1810  ## 19.2. Qui doit déposer ?
1815  ## 19.3. Dispenses de déclaration
1820  ## 19.4. Où et quand ?
1831  ## 19.5. Éléments de liquidation à ne pas oublier
1839  ## 19.6. Déclaration partielle et rectificative
1843  ## 19.7. Conséquences postérieures
1849  # 20. Frais de notaire
1854  ## 20.1. Succession
1911  ## 20.2. Testaments
1932  ## 20.3. Donation et donation-partage
1969  ## 20.4. Vente d'immeuble
2013  ## 20.5. Règles transversales
2040  # 21. Le recel successoral
2058  # Annexe 1 — Séquence de calcul complète
2143  ## Récapitulatif des DATES D'ÉVALUATION
2161  # Annexe 2 — Tableau des délais
2194  # Annexe 3 — Points de vigilance pour la modélisation
2196  ## A3.1. Pièges de calcul les plus fréquents
2211  ## A3.2. Règles d'alerte / conseil exploitables
2232  ## A3.3. Limites connues à documenter
2242  # Annexe 4 — Index des textes cités
2244  ## Code civil
2257  ## Code général des impôts
2262  ## Autres codes et textes
2274  ## Lois et décrets
2290  ## Doctrine administrative (BOFiP)
```
</details>

### `docs/donations-legs-referentiel.md` (7 parties, 650 lignes)

```
1    # Donations & Legs — Référentiel complet
10   ## Sommaire
23   ## Repères chiffrés 2026
55   ## Partie 1 — Donation : principes généraux
198  ## Partie 2 — Don manuel
313  ## Partie 3 — Donation entre époux (DEE) / Donation au dernier vivant (DDV)
388  ## Partie 4 — Donation-partage et donation-partage transgénérationnelle
494  ## Partie 5 — Déclaration d'emploi ou de remploi
539  ## Partie 6 — Legs (universel / à titre universel / à titre particulier)
588  ## Partie 7 — Libéralités résiduelles et graduelles
```

---

## Étape 3 — Audits déjà produits (inventaire)

| Document | Périmètre | Pertinence pour cette cartographie |
|---|---|---|
| `docs/audit/audit-famille.md` | Écrans Famille (`FicheClientForm`, `PartnerForm`, `RelationInfoForm`, liens familiaux) | Bugs civils pertinents : F19 (renonciation), F18 (branche familiale/fente), F13 (DDV double entrée), F20 (exonération frère/sœur). **F19, F20, F13 et F7 (ancien combattant) sont corrigés depuis** par des commits récents (`32c79bd`, `0e50d06`+`d443db1`, `31d1fe7`, `5122e87`) — vérifié dans le code actuel pour ce document, mais aucun de ces fixes n'a été **ré-audité formellement**. |
| `docs/audit/audit-patrimoine.md` | Écrans Patrimoine (Résumé, Actifs, Passifs, Plus-values) | P14 (bloquant) : `asset_indivisaires.pourcentage` jamais lu par le moteur de succession — pertinent ch. 17 indivision. |
| `docs/audit-patrimoine-2026-07-28.md` | Moteur `src/lib/patrimoine/` en profondeur (qualification, avantages matrimoniaux, récompenses, participation aux acquêts, barème 669) | Dette technique la plus détaillée du projet ; duplication barème 669 (ch. 15), approximations documentées (terrains à bâtir, clause de communauté au 2nd décès, attribution intégrale). |
| `docs/audit-recompenses-creances-2026-07-28.md` | Récompenses (art. 1468-1478) et créances entre époux (art. 1479, 1543) | Intérêts (art. 1473) et prélèvement/insuffisance de communauté (art. 1471-1472) non implémentés — hors périmètre strict des deux référentiels de cette cartographie (régime matrimonial, pas succession/donation), cité pour mémoire. |
| `docs/alertes-conseil-referentiel.md` | 15 règles d'alerte actives (`src/lib/alertes/regles.ts`) | Couvre des signaux narratifs (texte d'alerte) sur DDV, retranchement, enfants non communs — jamais un calcul réel des mécanismes correspondants. |
| `docs/recapitulatif-2026-07-29.md` | Consolidation dette technique + reste à faire, tous modules | Confirme qu'aucun diagnostic formel n'a encore été fait sur la réorganisation de `src/lib/transmission/` (pattern IFI/DMTG). |
| `docs/Golden_Scenarios_Transmission.md` | 5 scénarios de bout en bout (dévolution + DMTG) | Valide `successionLegale.ts` + `dmtg/` sur des cas concrets, mais scénarios simples (communauté légale, séparation de biens, fratrie) — ne couvre aucun des sujets 🟡/🔴 identifiés ci-dessous. |

**Constat général** : aucun des deux référentiels fournis (successions, donations/legs) n'a jamais servi de base à un audit dédié. Les audits existants portent sur le code par écran (Famille, Patrimoine) ou par mécanisme isolé (récompenses/créances), jamais chapitre par chapitre contre ces textes. D'où la proportion très majoritaire de 🟡 dans le tableau ci-dessous, y compris pour du code réputé solide.

---

## Étape 5 — Tableau de cartographie

### Successions — Chapitres 1 à 7

| Référentiel | Thème | Fichier(s) code | Statut | Note courte |
|---|---|---|---|---|
| L41-72, §1 | Ouverture de la succession (causes, lieu, date, comourants) | — | ⚪ | Aucune notion de date/lieu d'ouverture, comourance, absence/disparition modélisée ; seul un booléen `estDecede` existe. |
| L74-101, §2.1-2.2 | Les 4 ordres et le degré | `successionLegale.ts` (`calculateBrancheB`) | 🟡 | Ordres 1 à 4 codés implicitement dans la cascade B1→B5, jamais confrontés à ce chapitre. |
| L103-118, §2.3 (ordres 1-2) | Dévolution sans conjoint | `successionLegale.ts` (`calculateBrancheB`, `buildSouchesFratrie`) | 🟡 | Tableaux de répartition (art. 736-738) reproduits fidèlement, jamais audités contre ce référentiel. |
| L120-130, §2.3 (fente + déshérence) | Fente successorale ordres 3-4 ; déshérence/vacance | `successionLegale.ts` (`applyFenteSuccessorale` L558-647) ; déshérence : aucun fichier | 🔴 / ⚪ | Fente codée mais `branche_familiale` porte un vocabulaire incohérent UI/moteur (F18, `audit-famille.md`) ; déshérence/vacance non codées. |
| L132-144, §2.4 | Représentation successorale | `successionLegale.ts` (`buildSouchesEnfants`, `collectRepresentantsRecursive`) | 🟡 | Représentation à l'infini correctement codée (réserve par souche), jamais confrontée à ce référentiel. |
| L132-144 (F19) | Effet de la renonciation sur la représentation | `transmissionHelpers.ts` (`resolveRenoncantDe`), `successionLegale.ts` L345/690 | 🔴→corrigé | F19 (`audit-famille.md`) signalait un test toujours faux ; **corrigé par le commit `32c79bd`**, vérifié dans le code actuel — plus dormant, mais pas encore ré-audité. |
| L146-158, §2.5 | Dévolution en présence du conjoint | `successionLegale.ts` (`calculateBrancheA` L79-220) | 🟡 | Tous les cas du tableau art. 757-757-3 codés ; pas de distinction conjoint séparé de corps / instance de divorce. |
| L161-228, §3.1-3.2, 3.5-3.6 | Lien de famille requis, existence à l'ouverture, preuve/saisine/délivrance | — | ⚪ | Non modélisé (enfant conçu, absence, actes administratifs) — hors périmètre naturel d'un moteur de calcul. |
| L179-212, §3.3-3.4 | Indignité et effets sur avantages matrimoniaux | — | ⚪ | Aucun flag d'indignité dans le code — décision de périmètre à prendre. |
| L179-212 (rattaché) | Exonération DMTG frère/sœur (art. 796-0 ter CGI) | `dmtg/tax.ts`, `dmtg/recall.ts`, `dmtg/assurance-vie.ts`, `types.ts` (`isSiblingExonEligible`) | 🔴→corrigé | F20 (`audit-famille.md`) : champ sans effet ; **corrigé par `0e50d06`/`d443db1`**, relié au calcul DMTG et 990I avec tests — vérifié, pas encore ré-audité formellement. |
| L231-286, §4.1-4.2 | Droits de retour, biens hors dévolution | — (assurance-vie hors succession : `dmtg/assurance-vie.ts`) | ⚪ / 🟡 | Droits de retour (père/mère, frères/sœurs) non codés. AV hors succession bien codée mais jamais confrontée à ce chapitre précis ; autres biens spécifiques (baux ruraux, souvenirs de famille) non codés. |
| L288-297, §5.1 | Qui est conjoint successible | `successionLegale.ts` (`hasSurvivingSpouse`) | 🟡 | Booléen binaire seulement ; nuances (séparation de corps, mariage posthume) non distinguées. |
| L299-359, §5.2-5.5 | Option 1/4 PP vs usufruit, double masse, vocation usufruit | `successionLegale.ts` (`calculateBrancheA`, `optionConjoint`) | 🟡 | Option conjoint codée fidèlement ; mécanisme des deux masses distinctes (masse de calcul vs masse d'exercice, art. 758-5) non modélisé séparément. |
| L361-379, §5.6 | Donation entre époux / DDV | `successionLegale.ts`, `transmissionHelpers.ts` (`hasDDV`), `RelationInfoForm.tsx` | 🔴→corrigé | F13 (double point d'entrée) **corrigé par `31d1fe7`** (écriture centralisée) — vérifié, pas encore ré-audité contre ce chapitre. |
| L381-495, §5.7-5.14 | Conversion usufruit, DUH, attribution préférentielle, droits entreprise, pensions, bail, droit ancien | — | ⚪ | Aucun de ces droits accessoires du conjoint n'est codé (grep négatif confirmé) — décision de périmètre à prendre pour chacun. |
| L499-521, §6.1-6.2 | Réserve/QD — définitions, réservataires | `reserve.ts` (`computeReserveAndQD`) | 🟡 | Descendants et conjoint (à défaut) seuls réservataires, conforme au droit post-2007 ; jamais confronté à ce chapitre. |
| L522-550, §6.3-6.4 | Comptage des enfants (souches), barème QDO | `reserve.ts`, `successionLegale.ts` (`nbSouchesEnfants`) | 🟡 | Barème 1/2, 2/3, 3/4 reproduit exactement ; cas particulier de l'enfant renonçant tenu au rapport (réservataire malgré tout, L527-528) non géré. |
| L555-579, §6.5-6.7 | QDS entre époux, combinaison QDO/QDS, réserve en droit international | — | ⚪ | Aucune règle de combinaison QDO/QDS (art. 917) ni de mécanisme DIP (prélèvement compensatoire) — recherche négative confirmée. |
| L582-632, §7.1-7.5 | Les 3 branches de l'option, régime général, acceptation pure/à concurrence de l'actif net, renonciation | `successionLegale.ts` (effet dévolutif de la renonciation seulement) | 🟡 / ⚪ | Seul l'effet dévolutif de la renonciation est modélisé (et corrigé, cf. F19 ci-dessus) ; délai de 10 ans, rétroactivité, indivisibilité de l'option, distinction acceptation pure/à concurrence de l'actif net : non codés. |
| L634-660, §7.6-7.8 | Protection des mineurs/majeurs, pactes sur succession future, solidarité des dettes | — | ⚪ | Non codé — hors périmètre naturel d'un outil de calcul patrimonial. |

### Successions — Chapitres 8 à 14

| Référentiel | Thème | Fichier(s) code | Statut | Note courte |
|---|---|---|---|---|
| L664-768, ch. 8 | Masse de calcul, réunion fictive (art. 922), imputation | `reserve.ts` (`computeMasseCalcul`, `imputeLiberalites`) | 🟡 | Chaîne étape 0→6 partiellement codée, jamais confrontée point par point à ce référentiel. |
| L700, L732-742 | Cas particuliers d'imputation (donation-partage figée, usufruit en assiette, petit-enfant art. 847, vente art. 918) | `reserve.ts` (`typeImputation`), `types.ts` (`Liberalite.valeur` unique) | ⚪ | Un seul champ `valeur` par libéralité : imputation "en assiette" de l'usufruit, cas petit-enfant, présomption art. 918 non modélisés. |
| L770-894, ch. 9 | Rapport des libéralités (principe, débiteurs, exécution) | `reserve.ts` (`computeRapport`) | 🟡 | Rapport codé et testé pour avance_part/hors_part/partage ; jamais confronté à ce chapitre. |
| L818-825, L940-949 | Double date de valorisation : décès (réunion fictive/réduction) vs partage (rapport, réévaluation indemnité art. 924-2) | `types.ts` (`Liberalite.valeur`) | ⚪ | Le référentiel qualifie explicitement cette confusion de "source la plus fréquente d'erreur de modélisation" (L822) ; le code n'a qu'une seule valeur saisie, sans réévaluation au partage — **point non couvert par un audit existant, à vérifier en priorité**. |
| L846-854, §9.8 | Aménagements conventionnels (clause de rapport forfaitaire, dispense) | `DonationForm.tsx` (`clausesOptions`), `liberaliteService.ts` (`clauses: string[]`) | ⚪ | Clauses saisies et stockées mais **jamais lues par `reserve.ts`** — cases à cocher sans effet sur le calcul. |
| L887-892, §9.10 | Fiscalité du rapport | `transmission/index.ts` (`rapportResult`) | 🟡 | Rapport civil alimente `partFinale` ; pas de traitement fiscal DMTG distinct documenté. |
| L896-984, ch. 10 | Réduction (action, ordre, modalités, réévaluation, RAAR) | `reserve.ts` (`applyReductions`) | 🟡 / ⚪ | Ordre légal (legs puis donations récentes→anciennes) codé et testé ; réévaluation au partage absente (cf. ligne ci-dessus) ; RAAR (§10.5.2) totalement absente. |
| L987-1033, ch. 11 | Retranchement (art. 1527, enfants non communs) | `alertes/regles.ts` (règle `enfants_non_communs_communaute_universelle`) | 🔴 | Simple alerte texte, aucun calcul réel (délai, montant, régimes visés). Le champ `soumisRetranchement` (`matrimonialClauses.ts`) semble être du code mort — jamais lu. |
| L1035-1220, ch. 12 | Testament et legs (validité, formes, révocation, cantonnement, contestation) | `LegsForm.tsx` (`testamentRealise` booléen), `alertes/regles.ts` | ⚪ | Un seul champ déclaratif ; aucune logique de forme/validité/révocation — confirmé absent par grep sur "testament". |
| L1222-1267, ch. 13 | Présent d'usage (art. 852) | `assetSchema.ts` (option d'origine d'actif) | ⚪ | "Présent d'usage" existe seulement comme origine de bien (qualification propre/commun), pas comme catégorie de libéralité dans le module Transmission. |
| L1269-1351, ch. 14 | Tontine / clause d'accroissement | — | ⚪ | Absence totale confirmée par grep (aucune occurrence de "tontine" dans `src/`). |

### Successions — Chapitres 15 à 21 + Annexes

| Référentiel | Thème | Fichier(s) code | Statut | Note courte |
|---|---|---|---|---|
| L1361-1422, §15.2 | Barème fiscal art. 669 CGI | `patrimoine/bareme669CGI.ts`, `transmission/index.ts::getDemembrementPct` | 🔴 | Barème dupliqué dans 2 fichiers sans justification documentée (`audit-patrimoine-2026-07-28.md` §7.3) ; plafonnement à 100% (§15.2.5) absent des deux. |
| L1382-1385, §15.2.1 | Pluralité d'usufruitiers sans stipulation de part | `bareme669CGI.ts::getTrancheBaremeForYoungest` | 🟡 | Le code retient l'âge du plus jeune usufruitier pour tout le bien, au lieu du partage fictif par part décrit au référentiel — divergence jamais confrontée à ce texte. |
| L1424-1461, §15.3-15.6 | Évaluation économique, usufruit temporaire de titres, présomption art. 751, extinctions | — | ⚪ | Non codé — seule la méthode fiscale barème 669 existe. |
| L1464-1573, ch. 16 | Quasi-usufruit (légal/conventionnel, créance de restitution, IFI) | — | ⚪ | Absence totale confirmée par grep. Le passif successoral est un montant agrégé unique (`patrimony.passifs`), sans distinction de nature de dette. |
| L1576-1601, §17.1-17.3 | Indivision successorale (définition, gestion, sortie) | `patrimoine/succession.ts::getPartSuccessorale`, `asset_indivisaires` | 🔴 | P14 (`audit-patrimoine.md`, bloquant) : les pourcentages saisis ne sont jamais lus, retombe sur 50/50 par défaut. |
| L1603-1615, §17.4 | Droits des créanciers de l'indivision | — | ⚪ | Non modélisé — hors périmètre naturel. |
| L1618-1742, ch. 18 (hors droit de partage) | Types de partage, capacité, liquidation en 3 temps, formation de lots, attribution préférentielle, remise en cause | `assetSchema.ts` (`licitation_acquereur`, déclaratif) | ⚪ | Aucune formation de lots ni attribution préférentielle successorale calculée ; champ licitation purement déclaratif (affiché, pas utilisé). |
| L1744-1762, §18.9.1 | Droit de partage (taux 2,5%/1,10%) | `transmission/netBreakdown.ts` (`partageEnvisage`) | 🟡 | Codé et testé (`netBreakdown.test.ts`) mais jamais confronté formellement à ce chapitre ; soulte/licitation/cession de droits successifs (§18.9.2-5) non couverts. |
| L1805-1846, ch. 19 | Déclaration de succession (dispenses, délais, éléments de liquidation, rappel 15 ans) | `dmtg/beneficiary.ts`, `dmtg/assurance-vie.ts`, `dmtg/recall.ts` | 🟡 | Cœur fiscal robuste et testé, jamais confronté ligne à ligne à ce chapitre ; dispenses de déclaration et délais de dépôt non modélisés (Pulse calcule les droits, ne gère pas le workflow déclaratif — hors scope assumé). |
| L1849-2037, ch. 20 | Frais de notaire (succession, testaments, donations, vente, écrêtement) | `transmission/fiscal.ts` (`computeNotaryFees`, `computeDebours`) | 🟡 | Barèmes succession codés et testés ; testaments/donations/vente hors périmètre transmission (assumé). |
| L2040-2055, ch. 21 | Recel successoral (art. 778) | — | ⚪ | Absence totale confirmée par grep. |
| L2058-2157, Annexe 1 | Séquence de calcul complète, dates d'évaluation | `reserve.ts`, `transmission/index.ts` | 🟡 | Séquence proche du pseudo-algorithme mais jamais vérifiée étape par étape. **Point précis relevé** : `computeMasseCalcul` n'écrête pas `(actif − passif)` à 0 avant d'ajouter la réunion fictive si négatif, alors que l'Annexe 3 (piège n°9, L2206) le prescrit explicitement. |
| L2161-2190, Annexe 2 | Tableau des délais | — | ⚪ | Non applicable telle quelle : Pulse est un moteur de calcul instantané, pas un outil de suivi d'échéances. |
| L2194-2238, Annexe 3 | Points de vigilance pour la modélisation | `reserve.ts`, `alertes/regles.ts` | 🟡 | Plusieurs pièges gérés (ordre imputation/réduction) mais pas tous (masse négative non clampée, cf. Annexe 1) ; côté alertes, aucune des alertes liées quasi-usufruit/tontine (chapitres eux-mêmes non codés). |
| L2242-2291, Annexe 4 | Index des textes cités | — | ⚪ | Index documentaire transversal, non applicable comme thème de code. |

### Donations & Legs — 7 parties

| Référentiel | Thème | Fichier(s) code | Statut | Note courte |
|---|---|---|---|---|
| L23-51, Repères chiffrés | Abattements/barème DMTG, dons familiaux 790 G, exonération 790 A bis | `dmtg/params-dmtg.json`, `dmtg/recall.ts` | 🟡 | Abattements/rappel 15 ans actifs, jamais confrontés précisément à ce référentiel (à vérifier : distinction 790 G / 790 A bis). |
| L57-131, §1.1-1.3 | Validité civile de la donation (forme, capacité, incapacités de recevoir) | — | ⚪ | Aucune vérification de capacité/forme — l'app enregistre un fait acquis sans le valider juridiquement. |
| L133-142, §1.4 | Typologie civile (à terme, alternative, facultative, rémunératoire, déguisée, indirecte) | `DonationForm.tsx` (dropdown "Nature") | ⚪ | Aucun des 6 types n'y figure ; le champ n'est de toute façon jamais lu par le moteur de calcul. |
| L158-162, §1.6 | Avance de part / hors part successorale | `types.ts` (`typeImputation`), `reserve.ts` | 🟡 | Bien codé et effectivement consommé par le rapport ; cohérent à première lecture, jamais audité formellement. |
| L164-187, §1.7-1.8 | Irrévocabilité, droit de retour légal/conventionnel | `dmtg/types.ts` (`exclurePour.retourLegal`/`retourConventionnel`) | 🟡 | Flag d'exclusion DMTG existe côté moteur mais aucune UI ne l'alimente actuellement — à vérifier avant audit (possible code mort, comme la ligne suivante). |
| L198-308, Partie 2 | Don manuel (distinction présent d'usage, tradition, biens exclus, fiscalité déclarative) | `DonationForm.tsx` | ⚪ | Aucune distinction don manuel/notarié — une donation est un montant + date + bénéficiaire, sans branchement sur les règles spécifiques (formulaire 2735, nominalisme monétaire). |
| L313-383, Partie 3 | DEE/DDV | `lib/family/donationDernierVivant.ts`, `RelationInfoForm.tsx`, `useMatrimonialClauses.ts`, `alertes/regles.ts` | 🔴→corrigé | F13 corrigé (`31d1fe7`, écriture centralisée) — vérifié. Seule l'existence binaire de la DDV est modélisée (booléen + date), pas les 3 quotités de l'art. 1094-1 ni la substitution art. 1098 (l'alerte le signale elle-même comme non déductible) — jamais confronté en profondeur. |
| L388-489, Partie 4 | Donation-partage et transgénérationnelle (typologie, gel de valeur, absence de rapport) | `DonationForm.tsx` (labels), `reserve.ts` (`typeImputation="partage"`) | 🟡 | Absence de rapport correctement codée ; labels de typologie purement déclaratifs (non lus par le calcul) ; gel de valeur au jour de l'acte non distinctement implémenté. |
| L494-536, Partie 5 | Déclaration d'emploi ou de remploi (art. 1436) | `patrimoine/qualification.ts`, `assetSchema.ts` (`clause_remploi`) | 🟡 | Plus avancé qu'anticipé : flag "clause de remploi actée" + seuil de financement mixte ≥50% (art. 1436) codés dans le module Patrimoine (pas Transmission) ; les 3 formes de déclaration (§5.3) non distinguées. Module situé hors du périmètre initial de recherche (`src/lib/patrimoine/`, pas `src/lib/transmission/`) — signalé pour traçabilité. |
| L539-584, Partie 6 | Typologie des legs (universel / titre universel / titre particulier) | `LegsForm.tsx` (dropdown "Nature") | ⚪ | Labels existent mais purement déclaratifs ; tout legs traité uniformément via `typeImputation`. |
| L588-624, Partie 7 | Libéralités résiduelles et graduelles (fiscalité en 2 temps, art. 784 C) | `dmtg/types.ts` (`exclurePour.liberaliteGraduelleResiduelle`), `dmtg/assets.ts` | ⚪ | Mécanisme fiscal en 2 temps non implémenté. Le flag d'exclusion existe côté moteur mais **n'est alimenté par aucun formulaire** (vérifié : absent de `assetSchema.ts`/`AssetForm.tsx`) — probable code mort. |

---

## Regroupement des thèmes 🟡 / 🔴 — candidats pour de futurs audits détaillés

Découpage proposé en 6 blocs par proximité fonctionnelle. **Aucun audit n'est lancé** — c'est une proposition de séquencement pour de futures sessions dédiées, à valider.

**Bloc 1 — Mécanique civile de liquidation (réserve, rapport, réduction, imputation)**
Chapitres successions 6, 8, 9, 10, Annexes 1 et 3. Cœur du moteur (`reserve.ts`, `types.ts::Liberalite`). Point le plus sensible identifié : la confusion valeur-au-décès / valeur-au-partage (un seul champ `valeur` par libéralité, alors que le référentiel la qualifie de piège de modélisation le plus fréquent) et la masse de calcul non clampée à 0 avant réunion fictive. Comprend aussi les clauses de donation (dispense/rapport forfaitaire) saisies mais jamais lues par le calcul.

**Bloc 2 — Dévolution légale et droits du conjoint survivant**
Chapitres successions 2, 4, 5, 7. `successionLegale.ts`. Comprend la fente successorale (vocabulaire `branche_familiale` incohérent, F18 non corrigé), l'absence de la double masse du conjoint (art. 758-5), et l'absence des droits accessoires (conversion d'usufruit, DUH, attribution préférentielle du logement).

**Bloc 3 — Démembrement, indivision et sortie d'indivision**
Chapitres successions 15, 17, 18 (hors droit de partage déjà couvert Bloc 1/6). `bareme669CGI.ts`, `transmission/index.ts::getDemembrementPct`, `succession.ts::getPartSuccessorale`. Comprend la duplication non documentée du barème 669, la divergence sur la règle de pluralité d'usufruitiers, et P14 (indivision successorale, déjà classé bloquant par un audit antérieur — probablement le point le plus prioritaire du lot).

**Bloc 4 — Donations : typologie civile, don manuel, donation-partage, déclaration d'emploi**
Parties 1, 2, 4, 5 du référentiel donations. `DonationForm.tsx`, `qualification.ts` (remploi). Fil rouge commun : des dropdowns "Nature"/"Clauses" juridiquement riches mais purement déclaratifs, jamais lus par `src/lib/transmission/index.ts` ou `reserve.ts` — seul `typeImputation` a un effet réel. Inclut la vérification de deux flags DMTG potentiellement morts (`retourLegal`/`retourConventionnel`, `liberaliteGraduelleResiduelle`).

**Bloc 5 — DDV, exonération frère/sœur, retranchement (correctifs récents à ré-auditer)**
Chapitre successions 5 (§5.6), 11, Partie 3 donations. Trois sujets où des bugs identifiés par `audit-famille.md` ont été corrigés par des commits récents (`32c79bd`, `0e50d06`/`d443db1`, `31d1fe7`) mais **jamais ré-audités formellement** contre le référentiel légal — priorité différente du reste (vérifier un correctif plutôt que défricher un point neuf). Le retranchement (ch. 11) reste une simple alerte texte sans calcul réel.

**Bloc 6 — Frais et fiscalité de la déclaration de succession (déjà robuste, jamais confronté au texte)**
Chapitres successions 19, 20. `dmtg/` (beneficiary.ts, assurance-vie.ts, recall.ts), `transmission/fiscal.ts`. Code réputé solide et testé (Golden Scenarios) mais jamais vérifié ligne à ligne contre ces deux chapitres précis — audit probablement le plus rapide du lot (confirmation plutôt que découverte).

**Non retenus pour un audit dédié** (décision de périmètre plutôt qu'audit) : ouverture de la succession (ch. 1), qualités pour hériter hors indignité (ch. 3), quasi-usufruit (ch. 16), tontine (ch. 14), présent d'usage (ch. 13), testament formel (ch. 12), recel successoral (ch. 21), Annexe 2 — tous ⚪, code totalement absent, la question à trancher est "V1/V2/hors scope", pas "auditer ce qui existe".
