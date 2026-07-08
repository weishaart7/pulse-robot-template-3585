-- Clauses personnalisées du contrat de mariage : texte libre, distinct du catalogue
-- de clauses préétabli (clauses_contrat). Aucun calcul automatique associé.
ALTER TABLE public.marital_status
  ADD COLUMN IF NOT EXISTS clauses_personnalisees jsonb NOT NULL DEFAULT '[]'::jsonb;
