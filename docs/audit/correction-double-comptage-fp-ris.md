# Correction — double comptage fonction publique via l'import RIS

> Rapport de session. Fait suite à la découverte annexe signalée en clôturant l'écart #9
> ([implementation-mico-polypensionne.md §1.2](implementation-mico-polypensionne.md)) :
> `handleValidateRIS()` n'excluait du panier « trimestres » (régime général) que les libellés
> contenant `cnavpl` — pas ceux de la fonction publique (SRE, CNRACL). Écarts #10, #12, #13-NBI :
> non touchés.

---

## 1. Diagnostic

### 1.1. Mécanisme de `handleValidateRIS()` avant cette session

[Carriere.tsx:380-421](../../src/components/retraite/Carriere.tsx) (avant correction) :

- La distinction « trimestres » vs « points » se fait sur le champ `RegimeDetecte.type`
  (`'trimestres' | 'points'`), produit par `parseRegimesDepuisTexte()`
  ([parseRIS.ts:167](../../src/lib/retraite/parseRIS.ts)) selon que le bloc régime du RIS affiche
  « Total des trimestres » ou « Total des points ».
- Le filtre d'exclusion s'appliquait sur `RegimeDetecte.nom`
  (`regimesValides.filter(r => !/cnavpl/i.test(r.nom))`) — `nom` est le libellé de régime tel
  qu'extrait du texte du RIS (la ligne « nom de régime » précédant le bloc métrique, ou le sigle
  entre parenthèses si cette ligne dépasse 60 caractères, cf.
  [`ressembleAUnNomDeRegime()`](../../src/lib/retraite/parseRIS.ts)) — pas un libellé normalisé ni
  un champ structuré dédié.
- Seul `cnavpl` était filtré. Aucun libellé fonction publique.

### 1.2. Libellés réels des régimes fonction publique

Aucun spécimen RIS réel contenant un bloc fonction publique n'est disponible dans ce dépôt (RGPD,
cf. contrainte déjà posée à la session #6). Noms officiels retenus depuis
[docs/retraite-base-referentiel.md](../retraite-base-referentiel.md) (§8, table des régimes de
base, ligne « Fonctionnaire civil ou militaire de l'État | SRE | RAFP » et « Fonctionnaire
territorial ou hospitalier | CNRACL | RAFP », et §7.1 : « SRE (Service des retraites de l'État) » /
« CNRACL ») :

- **SRE** — Service des Retraites de l'État (fonctionnaires civils et militaires de l'État).
- **CNRACL** — Caisse Nationale de Retraite des Agents des Collectivités Locales (fonction publique
  territoriale et hospitalière). Aucun libellé distinct « fonction publique territoriale » /
  « fonction publique hospitalière » trouvé dans le référentiel — CNRACL couvre les deux.
- Aucun autre régime de base fonction publique pertinent identifié pour ce dépôt (le référentiel ne
  liste que ces deux caisses pour la fonction publique, §7.1, §8).

### 1.3. Le double comptage est-il réel ou seulement théorique ?

**Réel, confirmé par lecture directe du code.** `hasFonctionPublique` / `trimestresLiquidablesFP`
([Carriere.tsx:92-93](../../src/components/retraite/Carriere.tsx)) sont des `useState` locaux,
modifiés uniquement via les callbacks `onHasFonctionPubliqueChange` /
`onTrimestresLiquidablesChange` transmis à `CarriereFonctionPublique.tsx` — jamais par
`handleValidateRIS()` ni par aucune autre donnée issue du RIS. La fonction publique est, comme
CNAVPL et RAFP, une saisie **manuelle**, indépendante de l'import RIS.

Condition nécessaire du double comptage donc remplie : un utilisateur qui importe un RIS contenant
un bloc SRE/CNRACL de type « trimestres » **et** renseigne la carte « Fonction publique » (le
parcours normal pour ce régime, jamais auto-rempli) verrait ses trimestres fonction publique comptés
deux fois — une fois à tort dans `trimestresValides` (régime général), une fois via
`trimestresLiquidablesFP`.

**Périmètre de l'impact**, tous dérivés de `trimestresValides` : taux de proratisation
([Carriere.tsx:248](../../src/components/retraite/Carriere.tsx)), décote/surcote
([Carriere.tsx:292-295](../../src/components/retraite/Carriere.tsx)), numérateur et dénominateur du
MICO (`trimValidesRegimeGeneral` et `trimestresTousRegimes`, écart #9), l'indicateur « trimestres
manquants » à l'écran, et les props `trimestresAutresRegimes` transmises à `CarriereCNAVPL.tsx` /
`CarriereFonctionPublique.tsx` pour leurs propres calculs de décote.

### 1.4. Découverte annexe, hors périmètre — signalée, non corrigée

Le même risque existe pour **RAFP**, régime complémentaire par points de la fonction publique :
`pointsRAFP` ([CarriereFonctionPublique.tsx:97](../../src/components/retraite/CarriereFonctionPublique.tsx))
est également une saisie manuelle indépendante du RIS. Si un bloc « RAFP » apparaît sur le RIS comme
régime de type `'points'`, il n'était (et n'est toujours) pas exclu du panier `regimesPoints` — un
double comptage analogue, mais sur les **points**, pas les trimestres, donc hors du périmètre de
cette mission (formulée explicitement sur le panier « trimestres »). Non traité ici.

---

## 2. Correction

### 2.1. Nouveau module — [regimesSaisieManuelle.ts](../../src/lib/retraite/regimesSaisieManuelle.ts)

`estRegimeSaisieManuelle(nom: string): boolean` — prédicat pur, extrait dans un fichier séparé de
`parseRIS.ts` plutôt que d'y être ajouté directement : `parseRIS.ts` charge `pdfjs-dist` au niveau
module (`GlobalWorkerOptions.workerSrc = ...`), qui échoue en environnement de test `node` (pas de
`DOMMatrix`) — cf. `vitest.config.ts`, `environment: "node"`. Un fichier séparé, sans dépendance
pdf.js, reste testable unitairement sans changer la configuration globale des tests (qui
affecterait les 44 fichiers de test existants).

Motif : `/cnavpl|\bsre\b|\bcnracl\b|service des retraites de l.?etat|collectivites locales/i`,
appliqué à `nom` normalisé (accents retirés). Mêmes principes que le filtre `cnavpl` préexistant
(comparaison insensible à la casse sur le libellé brut du RIS) — **pas** une nouvelle logique
parallèle, juste le même mécanisme étendu à deux libellés supplémentaires. Les sigles courts (SRE,
CNRACL) sont bornés par `\b` : sans cette borne, `sre` (3 lettres) matcherait n'importe quelle
sous-chaîne contenant ces lettres consécutives dans un nom de régime imprévu — risque absent pour
`cnavpl`, assez long et distinctif pour ne pas en avoir besoin. Les noms complets sont ajoutés en
repli, sans borne, déjà suffisamment longs pour ne pas produire de faux positif.

### 2.2. [Carriere.tsx](../../src/components/retraite/Carriere.tsx) — branchement

`handleValidateRIS()` : `regimesHorsCNAVPL` renommé `regimesHorsSaisieManuelle`, filtré via
`!estRegimeSaisieManuelle(r.nom)` au lieu de `!/cnavpl/i.test(r.nom)`. Utilisé pour les deux paniers
génériques (`trimestresValides` et `regimesPoints`), comme avant.

### 2.3. Effet sur l'écart #9 (vérifié, §5 de la mission)

Aucune modification requise dans `minimumContributif()` ni dans le calcul de `trimestresTousRegimes`
([Carriere.tsx](../../src/components/retraite/Carriere.tsx), écart #9) : les deux dépendent de
`trimValidesRegimeGeneral = parseInt(trimestresValides)`, qui reflète désormais automatiquement la
correction dès le prochain import RIS — `trimestresValides` n'inclut plus les trimestres SRE/CNRACL,
donc ni le numérateur (`trimValidesRegimeGeneral`) ni le dénominateur
(`trimestresTousRegimes = trimValidesRegimeGeneral + CNAVPL + FP`) ne recomptent la fonction
publique deux fois — un seul point de correction (la source, `handleValidateRIS`) suffit, la
correction se propage à tous les consommateurs de `trimestresValides` sans changement
supplémentaire.

---

## 3. Tests — [regimesSaisieManuelle.test.ts](../../src/lib/retraite/regimesSaisieManuelle.test.ts) (nouveau fichier, 14 tests)

| Test | Couverture |
|---|---|
| `CNAVPL`, `SRE`, `CNRACL`, noms complets (avec/sans accent), casse variable | Exclus (`true`) |
| `L'Assurance retraite`, `MSA Salariés`, `SSI`, `Agirc-Arrco`, `RAFP` | Non exclus (`false`) — non-régression, y compris RAFP (§1.4 : hors périmètre, panier points) |
| Mot construit contenant « sre » en sous-chaîne (`Besreau`) | Non exclu — verrouille le comportement de la borne `\b`, sans laquelle ce test échouerait |

### Résultats

```
npx tsc --noEmit -p .   → 0 erreur
npx vitest run           → 44 fichiers, 592 tests passés, 6 todo, 0 échec
```

Aucune régression sur les 578 tests déjà présents avant cette session.

**Non vérifié** : rendu visuel de l'import RIS dans le navigateur (application protégée par
authentification, même limite déjà documentée dans `audit-retraite.md`) — aucun spécimen RIS réel
fonction publique disponible pour un test d'intégration de toute façon (RGPD, §1.2).

---

## 4. Fichiers modifiés

| Fichier | Nature |
|---|---|
| [src/lib/retraite/regimesSaisieManuelle.ts](../../src/lib/retraite/regimesSaisieManuelle.ts) | Nouveau — `estRegimeSaisieManuelle()`, motif étendu à SRE/CNRACL |
| [src/lib/retraite/regimesSaisieManuelle.test.ts](../../src/lib/retraite/regimesSaisieManuelle.test.ts) | Nouveau — 14 tests |
| [src/components/retraite/Carriere.tsx](../../src/components/retraite/Carriere.tsx) | `handleValidateRIS()` : filtre étendu, `regimesHorsCNAVPL` renommé `regimesHorsSaisieManuelle` |
| [docs/audit/correction-double-comptage-fp-ris.md](correction-double-comptage-fp-ris.md) | Ce rapport |

`parseRIS.ts` non modifié — la fonction d'exclusion vit désormais dans son propre module plutôt que
d'y être ajoutée (cf. §2.1).

---

## 5. Ce qui reste hors périmètre (rappel, non traité ici)

- **RAFP, panier points** (§1.4) : même risque de double comptage, sur les points plutôt que les
  trimestres — hors périmètre de cette mission, signalé pour une session future.
- **Écarts #10, #12, #13-NBI** : non touchés, conformément à la discipline de session.
