-- Revenus des personnes à charge, cadre 1 de la 2042 (colonnes C/D et I/J, revenus 2025).
-- Chaque case suit exactement la règle de sa jumelle déclarant (1CJ ↔ 1AJ, 1IB ↔ 1GB, 1CS ↔ 1AS…),
-- vérifié case par case sur le simulateur officiel 2026 (calc-2026.cgi). Ajouts nullables, non destructifs.

ALTER TABLE public.revenus_salaires
  ADD COLUMN case_1cj NUMERIC, ADD COLUMN case_1dj NUMERIC,
  ADD COLUMN case_1ca NUMERIC, ADD COLUMN case_1da NUMERIC,
  ADD COLUMN case_1cp NUMERIC, ADD COLUMN case_1dp NUMERIC,
  ADD COLUMN case_1cg NUMERIC, ADD COLUMN case_1dg NUMERIC,
  ADD COLUMN case_1ib NUMERIC, ADD COLUMN case_1jb NUMERIC,
  ADD COLUMN case_1if NUMERIC, ADD COLUMN case_1jf NUMERIC,
  ADD COLUMN case_1ck NUMERIC, ADD COLUMN case_1dk NUMERIC,
  ADD COLUMN case_1cd NUMERIC, ADD COLUMN case_1dd NUMERIC,
  ADD COLUMN case_1ih NUMERIC, ADD COLUMN case_1jh NUMERIC,
  ADD COLUMN case_1pd NUMERIC, ADD COLUMN case_1pe NUMERIC;

ALTER TABLE public.revenus_exoneres_taux_effectif
  ADD COLUMN case_1cc NUMERIC, ADD COLUMN case_1dc NUMERIC,
  ADD COLUMN case_1ce NUMERIC, ADD COLUMN case_1de NUMERIC,
  ADD COLUMN case_1ch NUMERIC, ADD COLUMN case_1dh NUMERIC;

ALTER TABLE public.pensions_retraites_rentes
  ADD COLUMN case_1cs NUMERIC, ADD COLUMN case_1ds NUMERIC,
  ADD COLUMN case_1ct NUMERIC, ADD COLUMN case_1dt NUMERIC,
  ADD COLUMN case_1ci NUMERIC, ADD COLUMN case_1di NUMERIC,
  ADD COLUMN case_1cz NUMERIC, ADD COLUMN case_1dz NUMERIC,
  ADD COLUMN case_1co NUMERIC, ADD COLUMN case_1do NUMERIC,
  ADD COLUMN case_1cm NUMERIC, ADD COLUMN case_1dm NUMERIC;
