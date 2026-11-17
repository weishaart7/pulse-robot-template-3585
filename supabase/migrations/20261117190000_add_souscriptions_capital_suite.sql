-- Fin du bloc entreprises de la 2042-RICI (revenus 2025) : reports SFS et ESUS, reports au titre du
-- plafonnement global, presse, objets MH, DFCI, reprise de société. Voir calculerSouscriptionsCapital.ts.
ALTER TABLE public.reductions_credits_impot
  ADD COLUMN IF NOT EXISTS case_7bs NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7bt NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7bu NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7bw NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7ek NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7cy NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7dy NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7ey NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7fy NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7gy NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7mx NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7my NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7nz NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7uc NUMERIC,
  ADD COLUMN IF NOT EXISTS case_7fh NUMERIC;
