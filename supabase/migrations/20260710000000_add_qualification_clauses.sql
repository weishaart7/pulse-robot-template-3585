-- Clauses influençant la qualification juridique automatique d'un bien
-- (bien propre/commun) sans changer les champs existants d'origine/date.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS clause_entree_communaute boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS clause_remploi boolean DEFAULT false;
