-- Cadre 3 de la 2042-C : plus-values de cession de titres d'OPC monétaires dont le report a expiré (art. 150-0 B quater CGI).
ALTER TABLE public.plus_values_gains_divers
  ADD COLUMN case_3sz NUMERIC; -- plus-values d'OPC monétaires, report d'imposition expiré en 2025
