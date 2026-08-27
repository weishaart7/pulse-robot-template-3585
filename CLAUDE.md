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

## Documentation vivante

À la fin de chaque session touchant un module, mets à jour `docs/{module}.md` en conséquence, en réécrivant les sections concernées (pas d'historique daté, le fichier reflète toujours l'état actuel).
