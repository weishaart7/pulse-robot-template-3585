-- Lot 4 : 4BC saisi dans la 2042 (sans 2044) et crédits/réductions du cadre 8.
-- Règles vérifiées sur le simulateur officiel 2026. Ajouts nullables, non destructifs.
ALTER TABLE public.revenus_fonciers_2042 ADD COLUMN case_4bc NUMERIC;
ALTER TABLE public.prelevement_source_divers
  ADD COLUMN case_8tb NUMERIC,
  ADD COLUMN case_8tc NUMERIC,
  ADD COLUMN case_8wk NUMERIC,
  ADD COLUMN case_8uz NUMERIC,
  ADD COLUMN case_8cv NUMERIC,
  ADD COLUMN case_8ts NUMERIC,
  ADD COLUMN case_8tg NUMERIC,
  ADD COLUMN case_8to NUMERIC,
  ADD COLUMN case_8tp NUMERIC,
  ADD COLUMN case_8wa NUMERIC,
  ADD COLUMN case_8wc NUMERIC,
  ADD COLUMN case_8wh NUMERIC,
  ADD COLUMN case_8wr NUMERIC,
  ADD COLUMN case_8wt NUMERIC,
  ADD COLUMN case_8uy NUMERIC,
  ADD COLUMN case_8py NUMERIC,
  ADD COLUMN case_8pz NUMERIC;
