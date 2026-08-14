# Implémentation — écart #16 (double comptage RAFP) et écart #12 (décote fonction publique par millésime)

> Rapport de session. Deux écarts moyens/faibles de [docs/audit/audit-retraite.md](audit-retraite.md),
> sans interaction entre eux ni avec le travail récent sur #9. Référentiel applicable :
> [docs/referentiels/retraite-base-referentiel.md](../referentiels/retraite-base-referentiel.md).
> Écarts #10 et #13-NBI : non touchés.

---

## Partie 1 — écart #16 : double comptage RAFP à l'import RIS

### 1.1. Rappel du diagnostic (session précédente)

`RE_REGIME_SAISIE_MANUELLE` ([regimesSaisieManuelle.ts](../../src/lib/retraite/regimesSaisieManuelle.ts))
excluait `cnavpl`, `sre`, `cnracl` et leurs noms complets du panier générique `regimesPoints` /
`trimestresValides` côté `handleValidateRIS()` ([Carriere.tsx](../../src/components/retraite/Carriere.tsx)),
mais pas `rafp`. Un bloc RAFP détecté sur le RIS (parsing générique de `parseRegimesDepuisTexte()`,
sans liste blanche de noms) atterrissait donc dans `regimesPoints` et contribuait à
`totalPensionComplementaireAnnuelle`, en plus du champ manuel « Points RAFP déjà accumulés » de
`CarriereFonctionPublique.tsx` qui alimente indépendamment `pensionTotaleFonctionPublique`. Les deux
se retrouvent sommés dans `pensionTotaleConsolidee` — double comptage confirmé, pas hypothétique.

### 1.2. Correction

Même mécanisme que la correction SRE/CNRACL (#9 bis, cf.
[correction-double-comptage-fp-ris.md](correction-double-comptage-fp-ris.md)) : extension de la regex
d'exclusion.

```diff
- /cnavpl|\bsre\b|\bcnracl\b|service des retraites de l.?etat|collectivites locales/i;
+ /cnavpl|\bsre\b|\bcnracl\b|\brafp\b|service des retraites de l.?etat|collectivites locales/i;
```

`\brafp\b` (borne `\b`, comme `sre`/`cnracl`) évite de matcher un sigle de 4 lettres comme
sous-chaîne d'un mot non lié — vérifié par un test dédié (`Parafpluie` → `false`).

Aucun autre fichier de code modifié : `estRegimeSaisieManuelle()` est le seul point de filtrage, déjà
appelé par `handleValidateRIS()` pour les deux paniers (trimestres et points).

### 1.3. Tests

[regimesSaisieManuelle.test.ts](../../src/lib/retraite/regimesSaisieManuelle.test.ts) :

- **Non-régression** : `RAFP` déplacé de la liste « pas un régime à saisie manuelle » vers la liste
  « est un régime à saisie manuelle », ajout de variantes (`rafp`, libellé complet avec sigle entre
  parenthèses).
- **Garde-fou de borne** : `Parafpluie` → `false` (même principe que le test `Besreau` déjà existant
  pour `sre`).
- **Scénario de double comptage** (`describe('scénario RIS avec fonction publique (SRE) + RAFP +
  régime général')`) : reproduit exactement le filtre de `handleValidateRIS()`
  (`regimesValides.filter(r => !estRegimeSaisieManuelle(r.nom))` puis répartition par `r.type`) sur un
  jeu de quatre régimes détectés (régime général, SRE, RAFP, Agirc-Arrco). Vérifie que le panier
  trimestres ne conserve que le régime général, que le panier points ne conserve que l'Agirc-Arrco, et
  qu'aucun régime à saisie manuelle (dont RAFP) ne subsiste dans les paniers génériques — la carte
  fonction publique dédiée reste donc seule responsable du montant RAFP, sans doublon.
- **Non-régression profil sans fonction publique** : un RIS ne contenant que régime général +
  Agirc-Arrco (aucun bloc SRE/RAFP) traverse le filtre inchangé — comportement identique à avant la
  correction pour un utilisateur sans carrière fonction publique.

`estRegimeSaisieManuelle()` reste une simple fonction pure testée en isolation (pas de test au niveau
composant `Carriere.tsx`, comme pour la correction SRE/CNRACL — `handleValidateRIS()` n'est pas
exportée et n'a pas de harnais de test dédié dans ce dépôt).

### 1.4. Portée

Corrige uniquement le double comptage RAFP. Ne touche pas au filtrage trimestres (déjà corrigé pour
SRE/CNRACL), ni au calcul de `pensionComplementaireAnnuelle()` lui-même, ni à la carte fonction
publique.

### 1.5. Vérification

`npx vitest run src/lib/retraite/regimesSaisieManuelle.test.ts` → 21 tests passants. Suite complète et
`npx tsc --noEmit` : voir section « Commun aux deux parties » en fin de rapport.

---

## Partie 2 — écart #12 : décote fonction publique figée à 1,25 %/trimestre

### 2.1. Diagnostic préalable

**Donnée « année d'ouverture des droits » : absente avant cette session.** Recherche exhaustive
(`anneeOuverture`, `annee_ouverture`, `ouverture des droits`) dans `src/lib/retraite/` et
`src/components/retraite/` : aucune occurrence avant cette session. `decoteSurAgeFonctionPublique()`
([calculFonctionPublique.ts:58-67](../../src/lib/retraite/calculFonctionPublique.ts) avant correction)
appliquait `1.25` en dur, sans paramètre ni commentaire signalant l'hypothèse de millésime — confirmé
par lecture directe, cohérent avec le constat de l'écart #12 dans l'audit.

Le référentiel (§7.3) traite l'année d'ouverture des droits comme une donnée distincte de la date
d'effet de la pension (elle-même déjà un paramètre non trivial ailleurs dans ce dépôt, cf. écart #2) —
pas une donnée que cet outil peut déduire de manière fiable à partir de la date de naissance ou du
détail de carrière sans risque de se tromper sur des cas limites (carrières mixtes, changements de
statut). Décision, conforme à la mission : **champ déclaratif simple**, pas de sous-système de calcul.

### 2.2. Implémentation

**`src/lib/retraite/calculFonctionPublique.ts`** :

- Nouvelle fonction pure `tauxDecoteParTrimestreFonctionPublique(anneeOuvertureDroits?: number): number`
  — barème à 5 paliers (référentiel §7.3) :

  | Année d'ouverture des droits | Taux par trimestre |
  |---|---|
  | ≤ 2011 (repli) | 0,75 % |
  | 2012 | 0,875 % |
  | 2013 | 1 % |
  | 2014 | 1,125 % |
  | 2015 et au-delà | 1,25 % |

  `undefined` (champ non renseigné) → `1,25 %`, soit le comportement historique de la fonction avant
  cette session : aucune régression pour un utilisateur qui ne renseigne pas ce champ.

- `decoteSurAgeFonctionPublique()` gagne un troisième paramètre optionnel `tauxParTrimestre = 1.25`
  (même défaut), remplaçant le `1.25` en dur dans le calcul (`ecartTrimestres * tauxParTrimestre`).
  Signature élargie, pas de nouvelle fonction parallèle — tous les appelants existants (aucun en
  dehors de `CarriereFonctionPublique.tsx`) restent compatibles sans modification s'ils n'ont pas
  besoin du barème.

**`src/components/retraite/CarriereFonctionPublique.tsx`** :

- Nouveau state local `anneeOuvertureDroits` (string, champ texte optionnel) — local au composant, sur
  le modèle des autres champs de saisie fonction publique déjà locaux (TIB, points RAFP, âges de
  départ anticipé), pas remonté au parent : cette donnée n'est utile qu'au calcul de décote de ce
  régime, contrairement à `trimestresLiquidables` qui alimente aussi le total tous régimes du parent.
- `anneeOuvertureDroitsNum` : `undefined` si le champ est vide, sinon `parseInt`. Une saisie invalide
  (non numérique) donne `NaN`, qui traverse `tauxDecoteParTrimestreFonctionPublique()` sans matcher
  aucun palier explicite (toutes les comparaisons `NaN <= 2011` etc. sont `false`) et retombe sur le
  même défaut `1,25 %` que `undefined` — pas de valeur aberrante silencieuse.
- Nouveau champ de saisie dans le formulaire, sous le TIB/trimestres/points RAFP et au-dessus du bloc
  « départ anticipé catégorie active » : libellé « Année d'ouverture des droits (optionnel) », avec
  aide contextuelle rappelant la distinction avec l'année de liquidation et le comportement par
  défaut.
- `decoteSurAgeFonctionPublique(ageDepartAnticipeNum, ageAnnulationDecoteNum, tauxDecoteParTrimestre)`
  — le taux calculé est passé explicitement, plus de valeur en dur au niveau de l'appelant.

### 2.3. Découverte annexe — âge d'annulation de la décote par catégorie (point 4 de la mission)

Vérifié, **pas un écart** : `ageAnnulationDecote` est déjà un champ de saisie libre dans
`CarriereFonctionPublique.tsx` ([CarriereFonctionPublique.tsx](../../src/components/retraite/CarriereFonctionPublique.tsx),
input « Âge d'annulation de la décote », placeholder `62`), transmis tel quel à
`decoteSurAgeFonctionPublique()` sans valeur unique supposée dans le flux réellement utilisé (le
paramètre par défaut `= 67` de la fonction n'intervient que si l'appelant omet l'argument, ce que
`CarriereFonctionPublique.tsx` ne fait jamais dans le chemin `decoteAgeUtilisable`). Le code ne suppose
donc pas un âge d'annulation unique : un conseiller peut déjà saisir 67 (sédentaire), 62 (active) ou 57
(super-active) selon le corps de l'agent — la mention « Aucune table de corps n'est encodée dans cet
outil » déjà affichée à l'écran couvre explicitement ce cas. Aucune correction nécessaire.

### 2.4. Tests

[calculFonctionPublique.test.ts](../../src/lib/retraite/calculFonctionPublique.test.ts), deux nouveaux
`describe` :

- **`tauxDecoteParTrimestreFonctionPublique`** : un cas par palier du barème (2011 → 0,75 %, 2012 →
  0,875 %, 2013 → 1 %, 2014 → 1,125 %, 2015 → 1,25 %), une année postérieure à 2015 (2026, reste à
  1,25 %), une année antérieure à 2011 (2005, repli à 0,75 %), et le cas non renseigné
  (`undefined`/appel sans argument → 1,25 % par défaut).
- **`decoteSurAgeFonctionPublique` avec barème** : un agent ayant ouvert ses droits en 2014 conserve
  1,125 %/trimestre indépendamment de la date de liquidation (le paramètre `tauxParTrimestre` est
  calculé une seule fois à partir de l'année d'ouverture, jamais recalculé à partir d'une date
  d'effet) ; non-régression du comportement par défaut (sans année renseignée, résultat identique à
  avant cette session) ; plafond à -25 % toujours respecté quel que soit le taux appliqué ; aucune
  décote si l'âge de départ atteint ou dépasse l'âge d'annulation, quel que soit le taux.

### 2.5. Portée

Corrige le millésime de décote fonction publique. Ne touche pas au MIGA (déjà réglé, écart #14), à la
surcote/majoration enfants (déjà branchées), ni à l'âge d'annulation par catégorie (déjà correctement
paramétrable, cf. §2.3 ci-dessus — pas un écart).

---

## Commun aux deux parties

- Suite de tests complète : `npx vitest run` → 44 fichiers, 611 tests passants (599 avant cette
  session, +21 pour la Partie 1 (RAFP) et +9 (nets) pour la Partie 2 (décote fonction publique), 2
  describe imbriqués comptant respectivement 9 et 9 assertions supplémentaires), aucune régression, 6
  `todo` inchangés (hors périmètre).
- `npx tsc --noEmit` : aucune erreur.
- Aucune migration de base de données : le champ ajouté (année d'ouverture des droits) est un state
  React local, non persisté — cohérent avec le reste de `CarriereFonctionPublique.tsx` (TIB, points
  RAFP, âges de départ anticipé sont déjà purement locaux, cf. dette technique déjà documentée dans
  `audit-retraite.md` §1, « Données saisies mais jamais persistées »). Pas d'élargissement de ce
  périmètre dans cette session : la persistance de ces champs reste une question ouverte préexistante,
  pas introduite ici.
- Écarts #10 et #13-NBI : non touchés, comme demandé.

## Mise à jour du tableau de synthèse (audit-retraite.md)

Reporté dans `docs/audit/audit-retraite.md` (§7.1 et détail correspondant) :

- **#12** : « Décote fonction publique figée à 1,25 %/trimestre » → **corrigé**, barème par palier
  branché via un champ déclaratif « année d'ouverture des droits », défaut 1,25 % préservé en
  l'absence de saisie.
- **#16** : « Double comptage RAFP possible à l'import RIS » → **corrigé**, RAFP exclu du panier
  `regimesPoints` au même titre que SRE/CNRACL/CNAVPL.
