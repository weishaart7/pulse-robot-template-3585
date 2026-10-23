# CLAUDE.md

## Projet

Outil interne de gestion de patrimoine (données patrimoniales et fiscales sensibles : montants, bénéficiaires, successions/DMTG, IFI, 2042…).

Stack : React + Vite + TS, Tailwind, shadcn/ui, Supabase managé (projet `npypkocowjkszxtecxzq`, eu-west-3), pas de backend custom.

Carte du code (par module : budget, famille, fiscalite, immobilier, patrimoine, retraite, societes, transmission, alertes) :
- `src/pages/{module}` → écrans · `src/components/{module}` → UI · `src/lib/{module}` → règles métier / calculs purs · `src/services/*Service.ts` → accès Supabase
- `supabase/migrations/` → schéma (source de vérité) · `src/integrations/supabase/types.ts` → types générés
- Tests Vitest colocalisés (`*.test.ts`). Commandes : `npm run typecheck`, `npm test`, `npm run lint`.

## Économie de contexte

- **Ne jamais lire en entier** : `src/integrations/supabase/types.ts` (~4 500 l.), les `docs/*.md` (souvent 50–185 Ko), les référentiels (`docs/*-referentiel*.md`, `Successions-Referentiel-Complet.md`). Les cibler par `grep` puis lecture par plage (`offset/limit`).
- Ignorer `node_modules/`, `dist/`, lockfiles, `supabase/migrations/` anciennes (lire seulement les migrations de la table concernée).
- `exemples/` contient des données clients réelles : ne lire que sur demande explicite, jamais recopier dans le code, les tests ou le chat.
- Avant une session sur un module, lire `docs/{module}.md` par sections pertinentes plutôt que tout le fichier.

## Règles permanentes (tout le code)

- **RGPD** : aucune donnée personnelle/patrimoniale dans un log de prod. Tout `console.*` encadré par `if (import.meta.env.DEV)`.
- **FK `ON DELETE CASCADE`** : toute table avec `user_id` → `auth.users(id)` ; toute table fille → sa table parente métier.
- **Pas de credentials hardcodés** : Supabase uniquement via `import.meta.env.VITE_*` ; `.env` reste gitignoré.
- **Migration destructive** : vérifier d'abord en base réelle (MCP Supabase `execute_sql`) l'absence d'orphelins/violations.

## Méthode de travail

- Règles métier non triviales (fiscalité, calculs réglementaires) : exposer règles + séquence fichier par fichier **avant** de coder, attendre validation.
- Phases validées une à une, avec résumé et accord explicite avant la suivante.
- Signaler immédiatement code mort, incohérence ou élargissement de périmètre.
- Audits et analyses : réponse dans le chat, pas de nouveau fichier dans `docs/`.

## Documentation vivante

En fin de session touchant un module, mettre à jour `docs/{module}.md` en réécrivant uniquement les sections concernées (édition ciblée, pas de réécriture complète ; pas d'historique daté).
