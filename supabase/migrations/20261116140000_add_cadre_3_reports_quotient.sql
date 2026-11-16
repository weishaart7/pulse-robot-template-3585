-- Cadre 3 (lot 3) : plus-values en report (3WI/3WJ, 3WN/3XN/3WP, 3WR/3WS/3WT) et plus-values au quotient
-- (RVG/NVG/RSG, RUA/NUA/RSL). Règles vérifiées sur le simulateur officiel 2026. Ajouts nullables, non destructifs.
ALTER TABLE public.plus_values_gains_divers
  ADD COLUMN case_3wi NUMERIC,
  ADD COLUMN case_3wj NUMERIC,
  ADD COLUMN case_3wn NUMERIC,
  ADD COLUMN case_3xn NUMERIC,
  ADD COLUMN case_3wp NUMERIC,
  ADD COLUMN case_3wr NUMERIC,
  ADD COLUMN case_3ws NUMERIC,
  ADD COLUMN case_3wt NUMERIC,
  ADD COLUMN case_rvg NUMERIC,
  ADD COLUMN case_nvg NUMERIC,
  ADD COLUMN case_rsg NUMERIC,
  ADD COLUMN case_rua NUMERIC,
  ADD COLUMN case_nua NUMERIC,
  ADD COLUMN case_rsl NUMERIC;
