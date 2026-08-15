# Audit — import RIS (`parseRIS.ts`) sur un relevé dense et ancien

**Date** : 2026-08-15
**Méthode** : exécution réelle du parser (fonctions de [parseRIS.ts](../../src/lib/retraite/parseRIS.ts) rejouées à l'identique, `pdfjs-dist/legacy/build/pdf.mjs`, sans worker) contre le fichier de test `exemples/Relevé carrière aout 2026.pdf` (non commité, exclu via `.gitignore` — voir note en fin de document). Comparaison analytique avec un RIS simple (aucun fixture simple disponible dans le dépôt — aucun test n'existe pour `src/lib/retraite/`, cf. [audit-retraite.md:186](audit-retraite.md)) : le raisonnement ci-dessous s'appuie sur le comportement du code, pas sur une seconde exécution empirique.

**Cas de test réel** : Sylvaine Fromentin, carrière 1989–2025, 8 pages, régimes L'Assurance retraite / Agirc-Arrco / Ircantec / RAFP / RCI, revenus en francs (1989–2001) puis en euros (2002+), 51 lignes de carrière détaillées sur 2 pages (« Détail de votre carrière »), page « Mes régimes » en mise en page à 2 colonnes.

**Portée** : audit et diagnostic uniquement. Aucune modification de code effectuée pendant cette session (contrainte de la mission). Un script de diagnostic jetable (copie temporaire des fonctions de `parseRIS.ts`, exécutée puis supprimée) a servi à observer le comportement réel — il ne fait pas partie du dépôt.

---

## Résumé exécutif

Quatre défauts distincts, dont trois partagent une cause racine commune.

| # | Symptôme signalé | Cause racine | Découle du #2 ? |
|---|---|---|---|
| 1 | Trimestres mal comptés | Barème `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE` limité à 2018–2026 (aucune année antérieure) + corruption des régimes (§2/§4) pour 2018–2020 | Partiellement — le gros de la casse (1989–2017) est indépendant du franc |
| 2 | Francs non convertis/détectés | `RE_LIGNE_DONNEES_CARRIERE` exige un `€` littéral dans le revenu ; une ligne FRF ne matche jamais ce groupe | — (cause racine elle-même) |
| 3 | SAM et trimestres restants faussés | `estPeriodeRegimeDeBase()` (calculSAM.ts + calculTrimestres.ts) exclut les périodes dont `regimes` ne contient plus "assurance retraite", or ce champ est corrompu en cascade par le bug #2 | **Oui, directement** |
| 4 | Lignes de points mal importées | `reconstruireLignes()` regroupe le texte par coordonnée Y en supposant une mise en page mono-colonne ; la page « Mes régimes » réelle est à 2 colonnes | — (cause racine distincte) |

---

## Problème 2 — Francs non convertis/détectés (cause racine à traiter en premier)

### Constat sur le fichier réel

Ligne reconstruite (page 6, « Détail de votre carrière ») :

```
17 | 01/01/1997 31/12/1997 92 251 FRF
```

Résultat produit par `parseDetailCarriereDepuisTexte()` pour cette période :

```json
{
  "employeur": "TITANE MOTOR",
  "dateDebut": "1997-01-01",
  "dateFin": "1997-12-31",
  "revenu": null,
  "regimes": ["92 251 FRF"]
}
```

`revenu` est `null` — pas seulement « non converti », **jamais capturé du tout**. Le montant en francs finit dans le champ `regimes`.

### Cause racine

[parseRIS.ts:258-259](../../src/lib/retraite/parseRIS.ts#L258-L259) :

```ts
const RE_LIGNE_DONNEES_CARRIERE =
  /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s*((?:\d[\d   ]*€\s*(?:\(1\))?))?\s*(.*)$/;
```

Le groupe de capture du revenu (3e groupe) **exige un caractère `€` littéral** pour matcher. Une ligne RIS francs comme `"01/01/1997 31/12/1997 92 251 FRF"` ne contient aucun `€` : le groupe optionnel ne matche jamais, `revenuBrut` est `undefined`, et **la totalité de la fin de ligne** — `"92 251 FRF"` — tombe dans le groupe catch-all `(.*)$` prévu pour le nom du/des régime(s).

En aval, [`parseDetailCarriereDepuisTexte()`](../../src/lib/retraite/parseRIS.ts#L305-L354) traite ce texte comme si c'était une liste de régimes séparés par virgule (ligne 325-328) : `"92 251 FRF"` devient un unique « régime » nommé `"92 251 FRF"`.

Aucune regex ni logique ne mentionne `FRF`, `franc` ou un taux de conversion (`6,55957`) nulle part dans `src/lib/retraite/` — le cas francs n'est pas seulement mal converti, il est **absent du modèle mental du parser**.

### Effet immédiat sur ce dossier

Toutes les années en francs (1989, 1992, 1995, 1996–2001, soit 8 années de carrière sur 37) ont `revenu: null` dans `detailCarriere`. Le revenu réel de ces années (ex. 1997 : 92 251 FRF ≈ 14 062 €, 2001 : 148 974 FRF ≈ 22 713 €) est perdu, pas juste mal calculé.

### Effet secondaire — perte silencieuse d'une année entière

Ligne reconstruite (page 6, ligne 23) :

```
23 | DAICRISE01V03 88077569 01/01/2002 31/12/2002 10 405 €
```

Le code du document (`DAICRISE01V03 88077569`, un artefact qui apparaît ailleurs sur chaque page) s'est retrouvé regroupé par `reconstruireLignes()` sur la **même ligne Y** que la ligne de données 2002 — collision de coordonnée dans ce document dense. Résultat : la ligne ne commence plus par une date, donc :

1. Elle ne matche pas `RE_LIGNE_DONNEES_CARRIERE` (ancrée en `^`).
2. Elle matche en revanche `RE_LIGNE_CODE_DOCUMENT = /^DAICRISE/i` ([parseRIS.ts:251](../../src/lib/retraite/parseRIS.ts#L251)), qui fait partie des lignes ignorées par `estLigneChromeOuIgnorable()` ([parseRIS.ts:261-270](../../src/lib/retraite/parseRIS.ts#L261-L270)).
3. La ligne entière est donc **silencieusement écartée** (`continue` avant toute autre logique) — la période 2002 (revenu 10 405 €) n'apparaît nulle part dans `detailCarriere`.

Confirmé sur l'exécution réelle : la liste des `dateDebut` produite saute directement de `2001-01-01` à `2003-01-01`, l'année 2002 est absente.

### Proposition de correction (pour la session de remédiation)

- Étendre `RE_LIGNE_DONNEES_CARRIERE` (ou ajouter une regex dédiée testée en amont) pour reconnaître un montant suivi de `FRF` en plus de `€`, avec conversion `/ 6,55957` (taux légal de conversion irrévocable franc→euro) et arrondi à 2 décimales.
- Ne pas construire le filtre `estLigneChromeOuIgnorable()` sur un simple préfixe (`^DAICRISE`) sans vérifier qu'il n'y a pas de motif de date plus loin dans la ligne — ou, plus robuste : détecter et retirer les fragments d'artefacts de page (code document, pied de page) **avant** le regroupement par ligne plutôt qu'après, pour éviter qu'ils ne collisionnent avec une vraie ligne de données.

---

## Problème 4 — Import incorrect de plusieurs lignes de points

### Constat sur le fichier réel

Page 2 (« Mes régimes ») a une mise en page **à deux colonnes** : à gauche, la liste des régimes avec leurs totaux (trimestres/points) ; à droite, un texte descriptif (missions du régime) puis les coordonnées de contact. `reconstruireLignes()` ([parseRIS.ts:64-78](../../src/lib/retraite/parseRIS.ts#L64-L78)) regroupe tout le texte de la page par coordonnée Y arrondie, **sans notion de colonne** — les deux colonnes sont donc entrelacées ligne à ligne selon leur position verticale, produisant un texte qui n'est cohérent que si la page est mono-colonne.

Lignes reconstruites autour du bloc RCI (lignes 9-20 de la page 2) :

```
10 | L'Assurance retraite
11 | Total des trimestres
12 | Salariés, travailleurs indépendants,        ← texte descriptif (colonne droite)
13 | 117
14 | Salarié, Indépendant :
15 | contractuels de droit public et              ← texte descriptif (colonne droite)
16 | artistes-auteurs                             ← texte descriptif (colonne droite)
17 | Total des points
18 | 0
19 | Complémentaire indépendant (RCI) :
20 | L'Assurance retraite
```

Résultat produit par `parseRegimesDepuisTexte()` :

```json
{ "nom": "artistes-auteurs", "type": "points", "points": 0, "valeurPoint": 1.347, "dateValeurPoint": "01/01/2026" }
```

Le nom correct pour ce bloc de points RCI (0 point, régime L'Assurance retraite) aurait dû être `"L'Assurance retraite"` — le parser a retenu à la place un fragment de la description marketing du régime issue de la colonne de droite (« …contractuels de droit public et **artistes-auteurs** »), parce que `nomCourant` (dans [`parseRegimesDepuisTexte()`](../../src/lib/retraite/parseRIS.ts#L167-L231)) est réécrit par **chaque** ligne qui ressemble à un nom (fonction [`ressembleAUnNomDeRegime()`](../../src/lib/retraite/parseRIS.ts#L113-L134)), y compris les fragments de texte descriptif entrelacés — la dernière ligne "nom-like" avant le bloc « Total des points » gagne, sans distinction entre un vrai titre de régime et une bribe de phrase de colonne voisine.

Autre occurrence du même mécanisme, plus loin sur la même page : le nom du régime « Agirc-Arrco » se retrouve préfixé par un fragment du code document (`DAICRISE01V03 88077569 Agirc-Arrco`) — même collision de coordonnée Y que dans le problème 2, cette fois sur la page « Mes régimes ».

### Cause racine

`reconstruireLignes()` traite toute la page comme un flux de texte à une seule colonne, en s'appuyant uniquement sur la coordonnée Y (ligne 69 : `const y = Math.round(item.transform[5])`). Sur une page réellement multi-colonnes — le cas de la page « Mes régimes » d'un RIS avec plusieurs régimes actifs — deux blocs de texte sans rapport logique, mais à la même hauteur verticale, sont fusionnés dans l'ordre de lecture reconstruit, ce qui casse l'hypothèse implicite de `ressembleAUnNomDeRegime()` (une ligne "nom-like" = un vrai titre de régime).

### Proposition de correction

- Introduire une notion de colonne dans `reconstruireLignes()` (regroupement par plage de coordonnée X en plus de Y), ou
- Restreindre `ressembleAUnNomDeRegime()` à une liste de noms de régimes connus/attendus (L'Assurance retraite, Agirc-Arrco, Ircantec, RAFP, RCI, CNAVPL, SRE…) plutôt que l'heuristique actuelle « toute ligne courte qui ne commence pas par un chiffre », qui est beaucoup trop permissive une fois le texte de colonnes mélangé.

---

## Problème 3 — SAM et trimestres restants faussés (cascade du #2)

### Mécanisme confirmé par lecture du code

`calculSAM.ts` et `calculTrimestres.ts` filtrent tous deux les périodes de carrière par [`estPeriodeRegimeDeBase()`](../../src/lib/retraite/calculSAM.ts#L51-L53) (deux implémentations dupliquées, identiques) :

```ts
const RE_REGIME_ASSURANCE_RETRAITE = /assurance retraite/i;
function estPeriodeRegimeDeBase(periode: PeriodeCarriere): boolean {
  return periode.regimes.some((regime) => RE_REGIME_ASSURANCE_RETRAITE.test(regime));
}
```

Une période dont `regimes` ne contient plus le texte « assurance retraite » est purement et simplement **exclue** du revenu retenu pour le SAM ([calculSAM.ts:190](../../src/lib/retraite/calculSAM.ts#L190)) et du calcul des trimestres cotisés ([calculTrimestres.ts:472](../../src/lib/retraite/calculTrimestres.ts#L472)).

Or, sur le fichier réel, le champ `regimes` de la période TITANE MOTOR 2001 (« 148 974 FRF » — cf. problème 2) devient le **seul** contenu de `regimesCourants` à partir de cette ligne, et **reste figé ainsi pour toutes les années suivantes du même bloc employeur** ([parseRIS.ts:323-329](../../src/lib/retraite/parseRIS.ts#L323-L329)) : les lignes 2003 à 2020 sont des lignes de continuation sans texte de régime propre (`regimeBrut` vide), donc `regimesCourants` n'est jamais réécrit et conserve `["148 974 FRF"]`.

Confirmé sur l'exécution réelle — extrait de `detailCarriere` :

```json
{ "employeur": "TITANE MOTOR", "dateDebut": "2013-01-01", "revenu": 23546, "regimes": ["148 974 FRF"] },
{ "employeur": "TITANE MOTOR", "dateDebut": "2018-01-01", "revenu": 25901, "regimes": ["148 974 FRF"] },
{ "employeur": "TITANE MOTOR", "dateDebut": "2020-01-01", "revenu": 12888, "regimes": ["148 974 FRF"] }
```

Ces périodes ont un `revenu` correctement parsé (en euros, 2002+, aucun souci FRF ici), **mais `estPeriodeRegimeDeBase()` retourne `false`** parce que `regimes` ne contient plus « assurance retraite ». Conséquence : **18 années de revenu salarié réel (2003–2020, cumul de l'ordre de 380 000 €)** sont exclues à la fois du pool des meilleures années du SAM et du calcul des trimestres cotisés — pas à cause d'un problème de conversion sur ces années-là (leurs montants sont en euros, bien parsés), mais par contamination d'un champ texte corrompu une seule fois en 2001 et jamais réinitialisé.

### Confirmation que #1 et #3 découlent bien (en partie) du #2

- **#3 découle directement du #2** : sans le bug de regex francs/€ du problème 2, la ligne 2001 aurait correctement isolé son revenu et laissé `regimeBrut` vide (ligne de continuation), donc `regimesCourants` serait resté `["L'Assurance retraite", "Agirc-Arrco"]` hérité du début du bloc TITANE MOTOR (ligne 17, 1996) — les 18 années 2003–2020 n'auraient jamais été exclues.
- **#1 (trimestres mal comptés) ne découle qu'en partie du #2.** La cause dominante est indépendante : [`SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`](../../src/lib/retraite/calculTrimestres.ts#L42-L52) ne couvre que 2018–2026. Pour toute année antérieure (1989–2017, soit 29 des 37 années de la carrière testée), `seuil === undefined` ⇒ `cotisesBruts = 0` **quel que soit le revenu, converti ou non** ([calculTrimestres.ts:511-516](../../src/lib/retraite/calculTrimestres.ts#L511-L516)). Le bug francs (#2) aggrave uniquement les 3 années 2018-2020 par la contamination de `regimes` documentée ci-dessus — il n'explique pas le miscompte sur 1989-2017.

### Découverte annexe (incohérence documentation/code)

Le commentaire en tête de [calculTrimestres.ts:18-21](../../src/lib/retraite/calculTrimestres.ts#L18-L21) affirme : *« Cette fonction n'est PAS branchée dans decoteSurTrimestres() ni dans aucun écran à ce stade… »*. C'est inexact en l'état actuel du code : `calculSAM.ts` importe et appelle `trimestresCotisesEtAssimilesDepuisCarriere()` dans `anneesExclues()` ([calculSAM.ts:14](../../src/lib/retraite/calculSAM.ts#L14), [calculSAM.ts:124](../../src/lib/retraite/calculSAM.ts#L124)), et `calculerSAM()` est appelé directement par [RISImportDialog.tsx:41](../../src/components/retraite/RISImportDialog.tsx#L41) au moment de l'import RIS. La fonction est donc bien active dans l'écran d'import — via `anneesExclues()`, pas via `decoteSurTrimestres()` — et son incomplétude de barème (2018-2026 uniquement) a un effet visible dès l'import, pas seulement dans un module futur non branché. À corriger dans le commentaire, et à considérer dans la session de remédiation : l'affirmation « aucun écran » a probablement fait sous-estimer l'urgence de compléter le barème.

### Proposition de correction

- Corriger en priorité le problème 2 (regex francs) : la contamination de `regimesCourants` disparaît d'elle-même une fois la ligne FRF correctement reconnue comme ligne de données (avec un régime vide, donc pas de réécriture de `regimesCourants`).
- Indépendamment, étendre `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE` (et `COEFFICIENT_REVALORISATION_CNAV` / `PASS_PAR_ANNEE` dans `calculSAM.ts`, également limités à 2018-2025) aux années antérieures — recherche de barème SMIC/PASS historique à mener avant tout codage, cf. méthode de travail attendue (CLAUDE.md).
- Mettre à jour le commentaire de tête de `calculTrimestres.ts` pour refléter le branchement réel via `calculSAM.ts`.

---

## Problème 1 — Nombre de trimestres mal compté

Voir analyse détaillée au problème 3 : la cause dominante est la couverture incomplète de `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE` (2018-2026 seulement), pas une erreur de parsing à proprement parler. Point notable, cependant : le total de trimestres affiché directement dans `RISImportDialog.tsx` (117, éditable) provient de `regimes[].trimestres`, parsé directement depuis le texte « Total des trimestres » de la page « Mes régimes » — **et ce total-là est correct sur ce document** (117 confirmé par l'exécution réelle, aucune corruption de colonne ne l'affecte pour ce champ précis). Le miscompte ne se manifeste donc pas sur le total global affiché à l'écran d'import, mais sur toute grandeur dérivée en aval qui recalcule des trimestres à partir de `detailCarriere` (le pool du SAM notamment, cf. §3) — à vérifier concrètement selon l'écran exact où l'utilisateur a observé le problème, information non disponible dans le contexte de cette session.

---

## Note RGPD

Le fichier `exemples/Relevé carrière aout 2026.pdf` contient des données personnelles réelles (identité, numéro de sécurité sociale, historique de revenus). Il n'était initialement pas couvert par `.gitignore` — corrigé en tout début de session (entrée `/exemples/` ajoutée) avant toute manipulation. `git status` confirme que le fichier n'a jamais été indexé ni commité. Le script de diagnostic utilisé pour cette session (copie temporaire des fonctions de `parseRIS.ts`) a été supprimé du dépôt après exécution ; seuls les extraits de lignes strictement nécessaires à la démonstration des causes racines figurent dans ce document.
