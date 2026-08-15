# Audit — Fonction publique / CNAVPL jamais persistées (Carriere.tsx)

Date de l'audit : 2026-08-15.
Périmètre : audit et diagnostic uniquement, aucune modification de code dans cette session.

## 1. Constat

Dans `Carriere.tsx`, les deux blocs conditionnels « Carrière fonction publique »
(`CarriereFonctionPublique.tsx`) et « Carrière CNAVPL » (`CarriereCNAVPL.tsx`)
laissent l'utilisateur saisir un jeu complet de champs (case à cocher +
traitement indiciaire, points RAFP/CNAVPL, trimestres, décote anticipée...).
**Aucun de ces champs n'est jamais écrit en base**, ni par l'ancien bouton
« Enregistrer les modifications », ni par le nouveau système d'auto-save
(chantier précédent) : ces deux mécanismes n'ont jamais fait plus que
persister `salaire_annuel_moyen`, `trimestres_valides`, `regimes_points`,
`au_moins_un_trimestre_majoration_enfant` (table `retraite_data`) et
`detailCarriere` (table `retraite_carriere_detail`).

Conséquence pratique : dès que l'utilisateur recharge la page, change
d'onglet dans l'app puis revient, ou se reconnecte plus tard, **toute la
saisie fonction publique / CNAVPL est perdue silencieusement** — aucun
message d'erreur, aucun indicateur, la case à cocher revient simplement à
décochée et les champs à vide.

## 2. Étendue exacte du problème — champ par champ

### `CarriereFonctionPublique.tsx`

| Champ (state) | Remonté au parent ? | Écrit en Supabase ? | Preuve |
|---|---|---|---|
| `hasFonctionPublique` | Oui (prop `onHasFonctionPubliqueChange`, state `hasFonctionPublique` dans `Carriere.tsx`) | **Non** | absent de `updates` dans `handleSave`/`useAutoSave` de `Carriere.tsx` |
| `trimestresLiquidables` | Oui (prop `onTrimestresLiquidablesChange`, state `trimestresLiquidablesFP` dans `Carriere.tsx`) | **Non** | idem |
| `traitementIndiciaireBrut` | Non — `useState` 100 % local au composant | **Non** | jamais remonté, jamais dans un appel Supabase |
| `pointsRAFP` | Non — local | **Non** | idem |
| `departAnticipeCategorieActive` | Non — local | **Non** | idem |
| `ageDepartAnticipe` | Non — local | **Non** | idem |
| `ageAnnulationDecote` | Non — local | **Non** | idem |
| `departPourInvalidite` | Non — local | **Non** | idem |
| `anneeOuvertureDroits` | Non — local | **Non** | idem |

### `CarriereCNAVPL.tsx`

| Champ (state) | Remonté au parent ? | Écrit en Supabase ? | Preuve |
|---|---|---|---|
| `hasCNAVPL` | Oui (prop `onHasCNAVPLChange`, state `hasCNAVPL` dans `Carriere.tsx`) | **Non** | absent de `updates` |
| `trimestresCNAVPL` | Oui (prop `onTrimestresCNAVPLChange`, state `trimestresCNAVPL` dans `Carriere.tsx`) | **Non** | idem |
| `pointsCNAVPL` | Non — local | **Non** | idem |
| `valeurPointCNAVPL` | Non — local (pré-rempli avec une constante, modifiable) | **Non** | idem |

**Aucune exception** : recherche exhaustive (`grep`) des noms de champs
(snake_case et camelCase) sur tout `src/` et `supabase/` — aucun autre
fichier ne les lit ni ne les écrit. Ils ne sont donc écrits **nulle part**,
pas seulement absents des `updates` de `Carriere.tsx`.

## 3. Colonnes en base : elles n'existent pas

Vérification du schéma réel (`src/integrations/supabase/types.ts`, généré
depuis Supabase, et les migrations dans `supabase/migrations/`) :

- Colonnes actuelles de `retraite_data` : `salaire_annuel_moyen`,
  `trimestres_valides`, `trimestres_requis`, `epargne_per`,
  `epargne_assurance_vie`, `autres_epargnes`, `regimes_points`,
  `au_moins_un_trimestre_majoration_enfant`, + colonnes techniques
  (`id`, `user_id`, `personne`, `created_at`, `updated_at`).
- Colonnes actuelles de `retraite_carriere_detail` : `employeur`,
  `type_activite`, `date_debut`, `date_fin`, `revenu`,
  `est_chiffre_affaires`, `regimes`, + colonnes techniques.

**Aucune colonne n'existe** pour `has_fonction_publique`,
`trimestres_liquidables_fp`, `traitement_indiciaire_brut`, `points_rafp`,
`depart_anticipe_categorie_active`, `age_depart_anticipe`,
`age_annulation_decote`, `depart_pour_invalidite`,
`annee_ouverture_droits`, `has_cnavpl`, `trimestres_cnavpl`,
`points_cnavpl`, ni `valeur_point_cnavpl`, que ce soit dans `retraite_data`,
`retraite_carriere_detail` ou une autre table. Ce n'est donc pas un simple
oubli d'écriture sur une colonne existante : **la persistance n'a jamais été
conçue** pour ces deux blocs, seul le calcul l'a été.

## 4. Impact sur les calculs en aval — preuves concrètes

### Impact confirmé : le total consolidé de `Carriere.tsx` retombe silencieusement à zéro après rechargement

`Carriere.tsx` calcule un total consolidé tous régimes
(`pensionTotaleConsolidee = pensionTotaleRegimeGeneral + pensionTotaleFonctionPublique + pensionTotaleCNAVPL`),
affiché dans la carte « Total consolidé tous régimes ». `pensionTotaleFonctionPublique`
et `pensionTotaleCNAVPL` dépendent directement de `hasFonctionPublique` /
`hasCNAVPL` (`Carriere.tsx:648-651` avant l'audit) :

```ts
const pensionTotaleFonctionPublique = hasFonctionPublique
  ? resultatFonctionPublique.pensionFinale + resultatFonctionPublique.rafpAnnuelle
  : 0;
const pensionTotaleCNAVPL = hasCNAVPL ? resultatCNAVPL.pensionFinale : 0;
```

Comme `hasFonctionPublique`/`hasCNAVPL` repartent systématiquement à
`false` au chargement (ils ne sont initialisés qu'à `useState(false)`,
jamais réhydratés depuis une source persistée), **tout rechargement de
l'écran fait disparaître silencieusement la contribution fonction
publique/CNAVPL du total affiché** — sans que rien à l'écran ne signale
qu'une donnée a été perdue : le total redevient simplement celui d'un
profil « régime général seul », comme si le client n'avait jamais eu de
carrière polypensionnée.

Ce n'est donc pas juste « les champs sont vides » : c'est un **chiffre de
pension totale affiché à l'utilisateur qui change silencieusement de valeur
(à la baisse) au fil des sessions**, pour un même client, sans action
délibérée de l'utilisateur ni avertissement.

### Autre écran (Optimisation / `Trimestres.tsx`) : non affecté par régression, limitation déjà documentée

`Trimestres.tsx` (onglet Optimisation, simulation d'âge de départ) recalcule
sa propre pension de base à partir de `retraite_data` +
`retraite_carriere_detail`, mais n'a **jamais** intégré fonction
publique/CNAVPL dans son calcul — c'est un choix déjà documenté comme dette
technique existante (commentaire `Trimestres.tsx:242-246`, renvoyant à
`docs/audit/branchement-surcote-optimisation.md §1.4`), indépendant du bug
de persistance. Cet écran n'aggrave donc pas l'impact : il n'a jamais promis
d'inclure ces régimes, contrairement à `Carriere.tsx`.

### Synthèse retraite (`Synthese.tsx`) : pas d'impact, écran non implémenté

`Synthese.tsx` est un stub statique (21 lignes, aucune logique, texte
« Cette section sera bientôt disponible ») — il ne lit aucune donnée de
pension et n'est donc pas concerné par ce bug.

### Conclusion sur l'impact métier

Le seul calcul réellement faussé par la perte de données est le **total
consolidé affiché dans `Carriere.tsx` lui-même**, dès que l'utilisateur (ou
un autre conseiller sur le même dossier) recharge la page après une
première saisie fonction publique/CNAVPL. Le biais est systématiquement à
la **sous-estimation** de la pension totale du client (jamais à la
surestimation), ce qui est moins dangereux qu'une survalorisation mais reste
un chiffre erroné présenté sans avertissement dans un contexte de conseil
patrimonial.

## 5. Depuis quand ce problème existe

- Bloc fonction publique introduit par le commit `15b7700`
  (« feat(retraite): moteur de calcul de pension, simulation d'âge, rachat de
  trimestres et fonction publique », 2026-07-15). Le `handleSave` de
  `Carriere.tsx` dans ce commit ne contient déjà que
  `salaire_annuel_moyen`, `trimestres_valides`, `regimes_points` — les
  champs fonction publique n'y ont jamais figuré, dès l'introduction de la
  fonctionnalité.
- Bloc CNAVPL introduit par le commit `5aa2337`
  (« feat(retraite): ajoute le module CNAVPL et généralise la décote à 3
  régimes », 2026-07-16), avec le même constat : `handleSave` inchangé sur ce
  point dans ce commit.
- Ce n'est donc **pas une régression** du chantier auto-save précédent (qui
  n'a fait que reproduire fidèlement le périmètre de l'ancien
  `handleSave`) : le problème est présent **depuis la création même de ces
  deux fonctionnalités**, soit environ un mois avant cet audit (2026-07-15 /
  2026-07-16 → 2026-08-15).

### Estimation du nombre de dossiers concernés

Impossible à chiffrer précisément a posteriori : comme aucune colonne n'a
jamais existé pour ces champs, **il n'existe aucune trace en base** des
dossiers où un conseiller aurait coché « J'ai eu une carrière dans la
fonction publique » ou « J'ai une carrière en CNAVPL » — la donnée a été
perdue sans laisser de trace exploitable. Seule piste possible : interroger
les conseillers ayant utilisé le module Retraite depuis le 15/16 juillet
2026 sur les dossiers de clients polypensionnés (fonction publique ou
profession libérale non réglementée) pour lesquels ils auraient renseigné
ces blocs, et leur signaler que la saisie n'a pas pu être conservée.

## 6. Cause racine

Les deux fonctionnalités (fonction publique, CNAVPL) ont été livrées avec
un **moteur de calcul complet et une UI fonctionnelle**, mais leur
persistance n'a jamais été branchée : ni nouvelle(s) colonne(s) créée(s) en
base, ni ajout dans le `updates` de `handleSave` (devenu `useAutoSave`).
Le calcul en mémoire (state React) fonctionne parfaitement le temps de la
session, ce qui masque le problème à l'utilisateur tant qu'il ne quitte pas
l'écran — c'est probablement ce qui l'a rendu invisible en test manuel rapide.

## 7. Proposition de correction (à valider avant la session suivante)

Correction en deux temps, dans l'esprit du pattern déjà en place pour les
autres champs de `retraite_data` :

1. **Migration Supabase** — ajouter les colonnes manquantes à
   `retraite_data` (cohérent avec l'existant : cette table est déjà le
   stockage clé/valeur simple par `personne` pour tout ce qui est propre au
   régime général) :
   - `has_fonction_publique boolean not null default false`
   - `trimestres_liquidables_fp integer`
   - `traitement_indiciaire_brut numeric`
   - `points_rafp numeric`
   - `depart_anticipe_categorie_active boolean not null default false`
   - `age_depart_anticipe numeric`
   - `age_annulation_decote numeric`
   - `depart_pour_invalidite boolean not null default false`
   - `annee_ouverture_droits integer`
   - `has_cnavpl boolean not null default false`
   - `trimestres_cnavpl integer`
   - `points_cnavpl numeric`
   - `valeur_point_cnavpl numeric`

   Vérifier au préalable l'absence de contrainte à violer (table déjà
   `ON DELETE CASCADE` vers `auth.users`, RLS déjà en place — s'assurer que
   les nouvelles colonnes héritent des mêmes politiques, pas de nouvelle
   policy à écrire si RLS est définie au niveau table).

2. **Code** :
   - Lifter `traitementIndiciaireBrut`, `pointsRAFP`,
     `departAnticipeCategorieActive`, `ageDepartAnticipe`,
     `ageAnnulationDecote`, `departPourInvalidite`, `anneeOuvertureDroits`
     depuis `CarriereFonctionPublique.tsx` vers `Carriere.tsx` (même
     pattern que `hasFonctionPublique`/`trimestresLiquidables` déjà remontés),
     et `pointsCNAVPL`/`valeurPointCNAVPL` depuis `CarriereCNAVPL.tsx`.
   - Étendre `RetraiteData` (interface, `useRetraiteData.ts`) avec les
     nouveaux champs.
   - Charger ces champs au montage (même bloc `useEffect` que les champs
     existants) et les ajouter aux `updates` de la fonction de sauvegarde
     dans `Carriere.tsx` — ils profiteront alors automatiquement du système
     `useAutoSave` déjà en place, sans logique supplémentaire à écrire côté
     déclenchement.
   - Étendre les dépendances du `useAutoSave` dans `Carriere.tsx` avec ces
     nouveaux champs (même règle que pour `regimesPoints`/`detailCarriere` :
     comparaison par valeur, pas par référence, si un champ objet/array
     s'y ajoute — ici tous les nouveaux champs sont des primitives, donc
     pas de piège de ce type).

Cette proposition n'a pas été implémentée dans cette session (audit
uniquement, conformément à la consigne).
