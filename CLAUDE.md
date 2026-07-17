# CLAUDE.md

## Projet

Logiciel de gestion de patrimoine — outil interne (pas un produit grand public). Manipule des données patrimoniales et fiscales sensibles : montants d'actifs, identités de bénéficiaires, données de succession (DMTG), IFI, etc.

Stack : React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth). Backend = Supabase managé (projet `npypkocowjkszxtecxzq`, région eu-west-3), pas de backend custom.

## Règles permanentes

Ces règles s'appliquent à tout le code du projet, pas seulement aux zones en cours de modification.

- **RGPD strict.** Aucune donnée personnelle ou patrimoniale sensible (montants, identités de bénéficiaires, adresses, etc.) ne doit apparaître dans un log exécuté en production.
- **Pas de `console.log` actif en production.** Si un log est utile en développement, l'encadrer systématiquement avec `if (import.meta.env.DEV)`.
- **FK avec `ON DELETE CASCADE` sur toutes les tables métier.** Toute nouvelle table portant un `user_id` doit avoir une FK vers `auth.users(id) ON DELETE CASCADE`. Toute table fille (rattachée à un parent métier comme `assets` ou `societes`) doit avoir une FK vers la table parente, également en `ON DELETE CASCADE`.
- **Pas de credentials hardcodés.** URL et clés Supabase exclusivement via `import.meta.env.VITE_*`. `.env` doit rester listé dans `.gitignore`.
- **Vérification avant migration destructive.** Avant toute modification de contrainte ou suppression de données, vérifier l'absence de lignes orphelines / de violations sur les données existantes en base (pas seulement en théorie sur le schéma).

## Méthode de travail attendue

- Pour toute fonctionnalité impliquant des règles métier non triviales (fiscalité, calculs réglementaires), exposer les règles et la séquence d'intervention fichier par fichier **avant** de coder, et attendre validation explicite.
- Travailler par phases validées une à une : ne pas enchaîner une phase suivante sans résumé de la précédente et accord explicite de l'utilisateur.
- Signaler toute découverte de code mort, d'incohérence ou d'élargissement de périmètre dès qu'elle est constatée, plutôt que de l'absorber silencieusement dans le travail en cours.

## Décisions d'architecture (module IFI)

- **Calcul centralisé.** La logique de calcul IFI vit dans `src/lib/ifi/` (types + fonctions pures + constantes), sur le modèle de `src/lib/dmtg/` déjà existant dans le projet. `BaremeIFISection.tsx` et `ListeBiensIFISection.tsx` consomment ce module plutôt que de dupliquer la logique (c'était le cas avant : l'abattement résidence principale était codé en dur à deux endroits différents). **Ce pattern (`types.ts` + fonctions pures + `index.ts` qui réexporte, pas de logique métier dans les composants React) est à reproduire pour `src/lib/transmission/` si le module Transmission s'y prête** — diagnostic à faire avant de décider.
- **Abattement résidence principale non togglable.** Appliqué automatiquement dès que `categorie === 'residence-principale'`, sans condition liée aux hypothèses (l'abattement de 30% est de droit, art. 973 CGI — la case à cocher correspondante dans `HypothesesSection.tsx` est trompeuse et devra être retirée). À l'inverse, le plafonnement (`plafonnement_ifi`) reste conditionné à son hypothèse `actif` et à la présence de revenus N-1 renseignés.
- **`fraction_taxable` en pourcentage.** Ce champ est saisi et stocké comme un pourcentage 0–100 (cohérent avec l'UI existante). Le calcul applique `valeur × (fraction_taxable / 100)`, pas `valeur × fraction_taxable` au sens littéral.
- **Plafonnement sans nouvelle colonne.** Les deux valeurs du plafonnement (revenus N-1 du foyer, IR + prélèvements sociaux N) sont stockées comme deux lignes supplémentaires dans la table générique clé/valeur `ifi_hypotheses` (`type_hypothese = 'plafonnement_revenus_n1'` / `'plafonnement_ir_ps_n'`), pas comme colonnes dédiées.
- **Exonération biens professionnels binaire.** Le champ existant dans `ifi_biens_professionnels_exoneres` suffit ; pas de vérification automatique des conditions légales (seuils de détention, fonction de direction, etc.) — ces biens sont simplement exclus de l'assiette taxable si le champ est coché.
- **Abattement bois/forêts par bien, pas par catégorie.** Case à cocher dédiée (`abattement_bois_forets` sur `ifi_immeubles_non_batis`), appliquée uniquement si cochée — pas de règle automatique liée à la sélection de la catégorie "Bois, forêt ou parts de GF".
- **Biens hors de France (Phase D, à venir).** Imposés comme des biens français pour un résident fiscal français, dans la même assiette et le même barème, sans crédit d'impôt étranger dans un premier temps (fonctionnalité prévue plus tard).
