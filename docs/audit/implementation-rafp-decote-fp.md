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

`npx vitest run src/lib/retraite/regimesSaisieManuelle.test.ts` → 21 tests passants. Suite complète
(`npx vitest run`) et `npx tsc --noEmit` : voir section « Commun aux deux parties » en fin de rapport,
mise à jour après la Partie 2.
