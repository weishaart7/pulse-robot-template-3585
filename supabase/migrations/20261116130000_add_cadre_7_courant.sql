-- Cadre 7 courant (lot 2) : garde, scolarité, syndicats, prestations compensatoires, partis, report ESUS.
-- Règles vérifiées sur le simulateur officiel 2026. Ajouts nullables, non destructifs.
ALTER TABLE public.reductions_credits_impot
  ADD COLUMN case_7ga NUMERIC,
  ADD COLUMN case_7gb NUMERIC,
  ADD COLUMN case_7gc NUMERIC,
  ADD COLUMN case_7ge NUMERIC,
  ADD COLUMN case_7gf NUMERIC,
  ADD COLUMN case_7gg NUMERIC,
  ADD COLUMN case_7ea NUMERIC,
  ADD COLUMN case_7eb NUMERIC,
  ADD COLUMN case_7ec NUMERIC,
  ADD COLUMN case_7ed NUMERIC,
  ADD COLUMN case_7ef NUMERIC,
  ADD COLUMN case_7eg NUMERIC,
  ADD COLUMN case_7ac NUMERIC,
  ADD COLUMN case_7ae NUMERIC,
  ADD COLUMN case_7wn NUMERIC,
  ADD COLUMN case_7wo NUMERIC,
  ADD COLUMN case_7wm NUMERIC,
  ADD COLUMN case_7uh NUMERIC,
  ADD COLUMN case_7dc NUMERIC;
