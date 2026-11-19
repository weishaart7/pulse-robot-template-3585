-- Personnes à charge, cadre 1 : salaires de source étrangère ouvrant droit au crédit égal à l'impôt
-- français (1CF/1DF, jumelles de 1AF/1BF), vérifié sur le simulateur officiel 2026 et 2027.
-- Ajouts nullables, non destructifs.
ALTER TABLE public.revenus_salaires
  ADD COLUMN case_1cf NUMERIC, ADD COLUMN case_1df NUMERIC;
