-- Personnes à charge, cadre 1 : pensions de source étrangère ouvrant droit au crédit égal à l'impôt
-- français (1CL/1DL, jumelles de 1AL/1BL), vérifié sur le simulateur officiel 2026 et 2027.
-- Ajouts nullables, non destructifs.
ALTER TABLE public.pensions_retraites_rentes
  ADD COLUMN case_1cl NUMERIC, ADD COLUMN case_1dl NUMERIC;
