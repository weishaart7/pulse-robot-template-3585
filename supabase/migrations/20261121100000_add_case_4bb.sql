-- 4BB saisi dans la 2042 sans 2044 : déficit foncier imputable sur les revenus fonciers futurs (sans effet sur l'impôt de l'année).
-- Ajout nullable, non destructif.
ALTER TABLE public.revenus_fonciers_2042 ADD COLUMN case_4bb NUMERIC;
