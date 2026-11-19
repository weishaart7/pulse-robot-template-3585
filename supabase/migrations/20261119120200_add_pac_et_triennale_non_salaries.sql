-- Cadre 5 (2042-C-PRO), vérifié sur le simulateur officiel 2026 et 2027. Ajouts nullables, non destructifs.
-- Personnes à charge : revenus de source étrangère ouvrant droit au crédit égal à l'impôt français
-- (5CK BA, 5FF BIC pro, 5WR BIC non pro, 5GY LMNP, 5ZJ BNC pro, 5ZS BNC non pro), moins-values nettes à
-- court terme (5SZ micro-BIC non pro, 5MD micro-BNC non pro) et déficits (5PF BIC non pro, 5PY LMNP,
-- 5SG BNC non pro).
-- Micro-BA : recettes des deux années précédentes pour la moyenne triennale (5XM/5YT/5ZT année N-1,
-- 5YM/5YU/5ZU année N-2, colonnes déclarant 1 / déclarant 2 / personnes à charge).
ALTER TABLE public.revenus_non_salaries
  ADD COLUMN case_5ck NUMERIC, ADD COLUMN case_5ff NUMERIC, ADD COLUMN case_5wr NUMERIC,
  ADD COLUMN case_5gy NUMERIC, ADD COLUMN case_5zj NUMERIC, ADD COLUMN case_5zs NUMERIC,
  ADD COLUMN case_5sz NUMERIC, ADD COLUMN case_5md NUMERIC,
  ADD COLUMN case_5pf NUMERIC, ADD COLUMN case_5py NUMERIC, ADD COLUMN case_5sg NUMERIC,
  ADD COLUMN case_5xm NUMERIC, ADD COLUMN case_5yt NUMERIC, ADD COLUMN case_5zt NUMERIC,
  ADD COLUMN case_5ym NUMERIC, ADD COLUMN case_5yu NUMERIC, ADD COLUMN case_5zu NUMERIC;
