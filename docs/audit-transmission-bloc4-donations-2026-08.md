# Bloc 4 — Donations (référentiel `docs/donations-legs-referentiel.md`, Parties 1, 2, 4, 5)

> Fil rouge de la série (cartographie `docs/cartographie-transmission-2026-08.md`) : `DonationForm.tsx`
> expose des champs déclaratifs juridiquement riches (Nature, Clauses...) dont l'essentiel n'a jamais
> d'effet réel sur `transmission/index.ts` ni `reserve.ts` — seul `typeImputation` (Bloc 1, T4) et deux
> clauses (dispense de rapport, rapport forfaitaire — Bloc 1, T6) ont un effet vérifié. Ce bloc vérifie
> ce constat champ par champ plutôt que de le supposer acquis, et couvre en plus don manuel (Partie 2),
> donation-partage transgénérationnelle (Partie 4) et déclaration d'emploi/remploi (Partie 5).

**Résultat global** : le constat global de la cartographie est confirmé, avec une précision par champ
(tableau §1). Aucune anomalie n'avait de correction évidente sans arbitrage produit — un champ mort se
documente, il ne se supprime pas de sa propre initiative. **Aucune correction appliquée dans cette
session.** Suite de tests inchangée : **391 passed | 6 todo**, avant et après.

---

## 1. Champs déclaratifs de `DonationForm.tsx`, un par un

Recherche exhaustive (`grep`) de chaque champ écrit par `DonationForm.tsx` dans `reserve.ts`,
`transmission/index.ts` et `src/utils/transmissionHelpers.ts` (le point de passage obligé entre les
lignes `liberalites` en base et le moteur `computeTransmission`).

| Champ (état React) | Colonne DB (`liberalites`) | Lu par le calcul ? | Détail |
|---|---|---|---|
| `libelle` | `denomination` | — | Purement identifiant/affichage, jamais censé avoir d'effet. Hors périmètre de cette vérification. |
| **`nature`** | `nature` | 🔴 Non | 10 options (Donation simple, Dons familiaux de sommes d'argent, Don d'argent exonéré, Don pour résidence principale, Don sous condition de remploi, Donation-partage, Donation graduelle, Donation résiduelle, Donation-partage transgénérationnelle, Donation-partage conjonctive) — aucune n'est lue nulle part dans `transmissionHelpers.ts` ni le moteur. Seule occurrence hors écriture (formulaire) et affichage : `buildTransmissionLiberalites` ne la reprend même pas dans l'objet `Liberalite` transmis au calcul. |
| `demembrement` | `demembrement` | 🔴 Non | 3 options (Aucun / Réserve d'usufruit / Réserve d'usufruit réversible au conjoint). Aucune occurrence dans `transmissionHelpers.ts` ni le moteur — à ne pas confondre avec `demembrementViager`/`getDemembrementPct` dans `transmission/index.ts`, qui concerne le démembrement de l'**option successorale du conjoint survivant** (art. 757), un mécanisme totalement différent qui ne lit jamais ce champ. |
| `typeDonation` (`type_imputation`) | `type_imputation` | ✅ Oui | Déjà confirmé Bloc 1 T4 : gouverne l'imputation réserve/QD (`reserve.ts::imputeLiberalites`) et l'exclusion du rapport pour `'partage'`/`'hors_part'` (`reserve.ts::computeRapport`). Seul champ de tout le formulaire avec effet civil direct et complet. |
| `droitsParDonateur` | `prise_en_charge_droits` | 🔴 Non | Aucune occurrence hors écriture (formulaire) dans tout `src/`. La prise en charge des droits par le donateur a pourtant un effet fiscal réel en pratique (elle constitue elle-même un avantage taxable, CGI) — non modélisé. |
| **Clauses** (`selectedClauses`) | `clauses` (`string[]`) | 🟡 Partiel | Sur 11 options, seules 2 sont lues (`reserve.ts`, via `CLAUSE_DISPENSE_RAPPORT`/`CLAUSE_RAPPORT_FORFAITAIRE` de `types.ts`) — cf. détail §2. |
| `montantRapportForfaitaire` | `montant_rapport_forfaitaire` | ✅ Oui | Déjà confirmé Bloc 1 T6 : lu par `getMontantRapportForfaitaire` (`reserve.ts`), couplé à la clause "Rapport forfaitaire". Blocage de saisie déjà en place (`DonationForm.tsx:247-257`) si la clause est cochée sans montant positif. |
| `realiseePar` | `realise_par` | 🔴 Non | Aucune occurrence hors écriture (formulaire) dans tout `src/`. Pertinent en théorie pour l'imputation d'une donation entre époux communs (récompense, cf. Partie 2 §2.3 du référentiel) ou pour la répartition des 2 abattements fiscaux d'un don conjoint — non modélisé. |
| `statut` (`acte`/`projet`) | `statut` | ✅ Oui | **Pas mort** — confirmé actif : `transmissionHelpers.ts::buildTransmissionLiberalites(rows, assets, excludeProjets)` filtre `row.statut !== 'projet'` quand `excludeProjets = true`. Vérifié activé sur les 3 écrans de calcul réel (`Synthese.tsx`, `Succession2ndDeces.tsx`, `ProcessusCalcul.tsx` — appel `buildTransmissionLiberalites(..., true)`) et désactivé (défaut `false`) sur l'écran de gestion `Liberalites.tsx`, qui doit afficher les deux statuts. Le message d'avertissement affiché à l'utilisateur (`DonationForm.tsx:426`, "Ce projet n'entre pas dans les calculs...") est donc exact. |
| `notes` | `description` | — | Champ libre, jamais censé avoir d'effet. Hors périmètre. |
| `date` | `date_acte` | ✅ Oui (indirect) | Utilisé pour le tri chronologique des donations (`reserve.ts::imputeLiberalites`, ordre d'imputation) et la réduction ordre inverse (`applyReductions`). Effet réel, cohérent avec sa fonction. |

**Constat** : sur les champs strictement déclaratifs sans effet vérifié, `nature`, `demembrement`,
`droitsParDonateur`/`prise_en_charge_droits` et `realiseePar` rejoignent la même famille que
`donationEntreEpoux` (Bloc 1) et 9 des 11 clauses (Bloc 1 T6, confirmé exhaustivement ici) — des
champs juridiquement identifiables dans le référentiel mais purement cosmétiques dans le calcul
actuel. `statut`, en revanche, **n'est pas mort** : c'était une hypothèse à vérifier explicitement
(pas un acquis de la cartographie) et elle est infirmée.

---

## 2. Détail des 11 clauses — confirmation exhaustive

| Clause (libellé complet dans `DonationForm.tsx`) | Lue par `reserve.ts` ? |
|---|---|
| Inaliénabilité | 🔴 Non |
| Retour conventionnel | 🔴 Non |
| **Dispense de rapport** (`CLAUSE_DISPENSE_RAPPORT`) | ✅ Oui — reclasse la donation hors part successorale (`isDispenseeDeRapport`) |
| **Rapport forfaitaire** (`CLAUSE_RAPPORT_FORFAITAIRE`) | ✅ Oui — couplée à `montantRapportForfaitaire` (`getMontantRapportForfaitaire`) |
| Exclusion/inclusion dans la communauté | 🔴 Non |
| Administration spéciale | 🔴 Non |
| Obligation d'emploi | 🔴 Non |
| Gestion d'un bien démembré | 🔴 Non |
| Usufruit réservé | 🔴 Non |
| Usufruit successif | 🔴 Non |
| Délivrance à terme | 🔴 Non |

Confirme et détaille le constat global déjà posé au Bloc 1 T6 : 2 clauses sur 11 ont un effet, les 9
autres sont de la documentation contractuelle libre sans traduction dans le moteur. Rien de nouveau ici
par rapport à ce qui était déjà su — vérification exhaustive demandée, pas de nouvelle anomalie.

**Note (retour conventionnel)** : cette clause est cochable dans `DonationForm.tsx` mais sans effet — à
mettre en regard du flag DMTG `retourLegal`/`retourConventionnel` (§4 ci-dessous), qui existe côté
moteur mais n'est jamais alimenté par cette case. Les deux bouts (UI et moteur) du droit de retour
existent séparément dans le code sans être reliés.

---

## 3. Partie 2 — Don manuel vs. donation notariée : pas de gap identifié

Le référentiel distingue don manuel et donation notariée sur plusieurs points (§2.2 preuve/tradition,
§2.3 capacité/consentement spécifiques, §2.5 pacte adjoint, §2.7 régime déclaratif fiscal spécifique).
Vérification de ce qui, parmi ces différences, aurait un effet sur le **calcul** civil ou fiscal
(périmètre de Pulse — pas un outil de suivi procédural) :

- **§2.6 Rapport successoral** : "Le don manuel est, par principe, rapportable à la succession... sauf
  preuve d'une intention du donateur de gratifier hors part." — **identique** au régime de la donation
  notariée (présomption d'avancement de part, art. 843, déjà le comportement par défaut de Pulse via
  `typeDonation`). Aucune divergence de traitement civil à modéliser.
- **§2.9 Gel des valeurs** : "absence de « gel » des valeurs contrairement à la donation-partage — au
  décès, les biens donnés sont réévalués à leur valeur au jour du décès." C'est très exactement la
  distinction déjà portée par `typeImputation === 'partage'` dans `DonationForm.tsx:598-607`
  (libellé de saisie différent selon le type) et dans `reserve.ts::computeRapport` (exclusion du rapport
  pour `'partage'`, valeur figée au jour de l'acte). Don manuel et donation notariée simple sont donc
  logés à la même enseigne l'un que l'autre (tous deux hors `'partage'`) — **conforme au référentiel**,
  qui ne prévoit pas de gel pour le don manuel non plus.
- **§2.3, §2.5, §2.7** (capacité spécifique du donateur mineur/protégé, formalisme du pacte adjoint,
  régime déclaratif fiscal du don manuel — Cerfa 2735, délai d'un mois après *révélation* et non
  *réalisation*) : ce sont des conditions de validité et des obligations déclaratives, hors du périmètre
  calculatoire de Pulse (l'outil ne vérifie ni la capacité des parties, ni ne produit de déclaration
  fiscale). Cohérent avec le principe déjà appliqué ailleurs dans la série (Bloc 6 : "Pulse calcule les
  droits, pas le suivi de dépôt").

**Conclusion** : comme pour donation-partage vs. donation simple (déjà confirmé sans effet pour le
rapport au Bloc 1), Pulse traite don manuel et donation notariée de façon indifférenciée, et c'est
**sans conséquence sur le calcul** — la seule différence qui en aurait une (le gel des valeurs) est déjà
portée par un autre levier (`typeImputation`), commun aux deux formes.

---

## 4. Partie 4 — Donation-partage transgénérationnelle : non modélisée, gap civil réel

### 4.1 Ce que prévoit le référentiel (§4.9)

> "La donation reçue par le petit-enfant s'impute **sur la réserve de son parent** (la génération
> intermédiaire), et non sur la quotité disponible comme le ferait une donation ordinaire à un
> petit-enfant (C. civ. art. 847)... L'imputation se fait **par souche**."

C'est l'inverse du traitement par défaut d'une libéralité à un non-réservataire.

### 4.2 Ce que fait le moteur

`reserve.ts::imputeLiberalites` (ligne 151) :

```ts
if (childrenIds.includes(donation.beneficiaireId as string) &&
    donation.typeImputation !== "hors_part" &&
    !isDispenseeDeRapport(donation)) {
  // imputation sur la réserve personnelle du bénéficiaire, excédent sur QD
} else {
  // imputation directe sur QD
  besoinSurQD = donation.valeur;
  imputeSurQD = Math.min(donation.valeur, qdRestante);
}
```

`childrenIds` (passé depuis `transmission/index.ts:357-361`) est
`successionLegaleResult.souchesEnfantsRootIds` — les IDs **racines** des souches d'enfants, pas les IDs
des petits-enfants. Une donation à un petit-enfant, quelle que soit sa `nature` déclarée (y compris
"Donation-partage transgénérationnelle" — champ non lu, cf. §1), tombe donc systématiquement dans la
branche `else` : imputée **directement sur la quotité disponible**, exactement comme une donation
ordinaire à un tiers non réservataire. Aucun mécanisme d'imputation "par souche" sur la réserve du
parent n'existe dans le code.

### 4.3 Ampleur du gap

- **Type de champ nécessaire** : aucun champ n'identifie aujourd'hui une donation comme
  transgénérationnelle avec effet calculatoire — le seul candidat (`nature`, option "Donation-partage
  transgénérationnelle") est purement décoratif (§1).
- **Effet concret** : pour un donateur souhaitant préserver sa quotité disponible pour d'autres
  libéralités (l'intérêt pratique principal du dispositif, cité par le référentiel lui-même), Pulse
  produit aujourd'hui un résultat **plus défavorable que la réalité civile** — la QD apparaît entamée
  par la donation au petit-enfant, alors qu'en droit elle ne l'est pas (l'imputation se fait sur la
  réserve du parent intermédiaire).
- **Complexité de la correction** : non triviale — nécessite (a) un moyen de déclarer qu'une donation
  est transgénérationnelle et d'identifier la génération intermédiaire consentante concernée, (b) une
  branche d'imputation par souche distincte dans `imputeLiberalites`, (c) probablement une adaptation de
  `computeRapport` (absence de rapport, gel de valeur — déjà couvert pour `'partage'` mais à confirmer
  pour le cas transgénérationnel spécifiquement, art. 1078-8). Ce n'est pas une correction "évidente" au
  sens de la règle de cette session — **documentée, non corrigée**.

**Recommandation (arbitrage produit, pas tranché ici)** : à traiter comme un cas V1/V2 explicite plutôt
que silencieux — soit une case à cocher dédiée (avec le champ "génération intermédiaire consentante")
et la branche d'imputation par souche, soit un message d'avertissement clair si `nature` porte cette
valeur, tant que le calcul reste celui d'une donation ordinaire.

---

## 5. Partie 5 — Déclaration d'emploi/remploi : correctement modélisée, mais ailleurs que dans les donations

### 5.1 Ce que prévoit le référentiel (§5, L494-538 — non reproduit intégralement ici)

La déclaration d'emploi/remploi (art. 1406, 1434-1436 C. civ.) détermine si un bien acquis avec des
fonds propres (notamment issus d'une donation ou d'un héritage) reste propre, dans un régime
communautaire.

### 5.2 Ce que fait `qualification.ts`

Le mécanisme existe et est **correctement câblé**, mais au niveau de l'**actif** (`AssetForm.tsx`), pas
au niveau de la **donation** :

- `clauseRemploi` (case "Clause de remploi actée", `AssetForm.tsx:587`) → priorité maximale dans
  `qualifierBien` (`qualification.ts:281-292`), avant même la communauté universelle — conforme au
  référentiel ("prioritaire sur tout le reste").
- Remploi partiel / financement mixte (`apportFondsPropres` vs. `valeurAcquisition`, art. 1436) →
  `qualification.ts:426-438` : bien propre si l'apport couvre au moins la moitié du prix, commun sinon,
  avec récompense documentée dans les deux sens. Cohérent avec le texte cité en tête de fichier
  (`qualification.ts:21`, financement mixte régimes communautaires).
- Câblage confirmé de bout en bout : `AssetForm.tsx` (saisie) → `useAssetForm.ts:215`
  (`clauseRemploi: value.clause_remploi`) → `qualifierBien` (calcul). 23 tests dédiés dans
  `qualification.test.ts`, tous verts.

### 5.3 Nuance sur `DonationForm.tsx`

L'option "Don d'argent sous condition de remploi (2020)" dans le dropdown `nature` de `DonationForm.tsx`
(ligne 85) fait référence au même concept juridique, mais ce champ `nature` est celui identifié comme
**mort** au §1 — il n'a aucune connexion avec `qualification.ts`. Concrètement : cocher cette option sur
une donation n'active ni ne pré-remplit quoi que ce soit sur l'actif qui en résulterait. Le mécanisme
réel de remploi (art. 1406) est entièrement porté par le formulaire d'actif (`clause_remploi` sur
l'asset lui-même), indépendamment de toute donation en amont — ce qui est fonctionnellement correct
(l'utilisateur qualifie l'actif final, quelle que soit son origine) mais laisse cette option de `nature`
sans utilité pratique, un symptôme de plus du champ mort plutôt qu'un gap de calcul en soi.

**Conclusion** : pas d'anomalie de calcul — la Partie 5 du référentiel est correctement implémentée,
juste pas via le chemin qu'on pourrait intuiter depuis `DonationForm.tsx`.

---

## 6. Deux flags DMTG potentiellement morts

### 6.1 `retourLegal` / `retourConventionnel`

`src/lib/dmtg/types.ts:45-46` (dans `Asset.exclurePour`), lus par `src/lib/dmtg/assets.ts:20` :

```ts
} else if (asset.exclurePour.retourLegal || asset.exclurePour.retourConventionnel) {
  baseTaxable = 0;
  justifs.push("Exclu : droit de retour");
```

### 6.2 `liberaliteGraduelleResiduelle`

`src/lib/dmtg/types.ts:48`, lu par `src/lib/dmtg/assets.ts:26` (même schéma, exclusion de l'assiette
taxable).

### 6.3 Verdict

**Morts, comme `donationEntreEpoux` au Bloc 1** — mais d'une façon légèrement différente : ces deux
flags *sont* lus (contrairement à `donationEntreEpoux`, jamais lu nulle part), la logique de calcul qui
les consomme existe et fonctionne. Le problème est en amont : `exclurePour` n'est **jamais construit
qu'à `{}`** dans tout le code — recherche exhaustive :

```
src/lib/transmission/index.ts:620:      exclurePour: {}
src/lib/transmission/index.ts:637:      exclurePour: {}
src/lib/transmission/index.ts:653:      exclurePour: {}
```

Les 3 seuls points de construction d'un `Asset` (type DMTG) passent un objet vide en dur. Aucune UI ne
permet de cocher "droit de retour" ou "libéralité graduelle/résiduelle" sur un bien pour faire remonter
l'un de ces flags à `true`. Le code de calcul est donc **fonctionnellement mort par absence de
producteur**, alors que le code de consommation est vivant. Cohérent avec la clause "Retour
conventionnel" de `DonationForm.tsx` elle-même repérée comme sans effet (§2) — les deux bouts (case à
cocher côté donation, flag côté assiette DMTG) existent chacun séparément, mais rien ne les relie.

**Pas de suppression dans cette session** — conforme à la consigne. Ces deux flags sont des
**candidats à suppression ou à câblage**, pas du code à retirer d'initiative : l'arbitrage (faut-il une
UI pour les activer, ou retirer la logique de consommation) est un choix produit hors du périmètre de
cette session d'audit.

---

## 7. Rappel — ce qui manque de la scope originale du Bloc 5 (non audité ici)

Le retranchement (chapitre successions 11) était listé dans le Bloc 5 original de la cartographie mais
n'a pas été couvert par la session Bloc 5 réellement exécutée (limitée à F19/F20/F13/F7,
`docs/audit-transmission-bloc5-correctifs-2026-08.md`). La cartographie notait déjà : "reste une simple
alerte texte sans calcul réel." **Non audité dans ce Bloc 4** (hors de son périmètre) — signalé ici pour
qu'il rejoigne la liste des décisions de périmètre V1/V2, aux côtés de la donation-partage
transgénérationnelle (§4) et du forfait mobilier 5 % (Bloc 6).

---

## 8. Synthèse des findings

| # | Sujet | Statut | Action |
|---|---|---|---|
| 1 | `nature` (liberalite) | 🔴 Champ mort | Documenté, non supprimé |
| 2 | `demembrement` (liberalite) | 🔴 Champ mort | Documenté, non supprimé |
| 3 | `droitsParDonateur`/`prise_en_charge_droits` | 🔴 Champ mort | Documenté, non supprimé |
| 4 | `realiseePar`/`realise_par` | 🔴 Champ mort | Documenté, non supprimé |
| 5 | 9/11 clauses (hors dispense/forfaitaire) | 🔴 Champs morts | Confirmation exhaustive du constat Bloc 1 T6, rien de nouveau |
| 6 | `statut` (`acte`/`projet`) | ✅ Vivant | Hypothèse vérifiée et infirmée — pas un finding, mentionné pour mémoire |
| 7 | Don manuel vs. donation notariée | ✅ Sans effet à modéliser | Différence pertinente (gel des valeurs) déjà portée par `typeImputation` |
| 8 | Donation-partage transgénérationnelle | 🔴 Gap civil réel | Documenté — nécessite arbitrage produit, non corrigé |
| 9 | Déclaration d'emploi/remploi | ✅ Correctement implémentée | Dans `qualification.ts` (actif), pas dans `DonationForm.tsx` (donation) — nuance documentée |
| 10 | `retourLegal`/`retourConventionnel`/`liberaliteGraduelleResiduelle` | 🔴 Morts (par absence de producteur) | Documenté, non supprimé/câblé |
| 11 | Retranchement (chap. 11) | ⚪ Hors scope Bloc 4 | Rappelé pour la liste des décisions V1/V2 |

---

## 9. Vérification

```bash
npx vitest run
# Test Files  32 passed (32)
#      Tests  391 passed | 6 todo (397)
```

Identique avant et après (aucune modification de code dans cette session).
