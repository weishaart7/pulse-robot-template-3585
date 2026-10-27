-- Colonne « personne à charge » de l'épargne retraite (cadre 6 de la 2042) : cotisations 6NU/6RU,
-- plafond 6PU, cotisations informatives 6OU/6QU — phase 6.1.
ALTER TABLE public.charges_deductibles
  ADD COLUMN case_6nu NUMERIC,
  ADD COLUMN case_6ru NUMERIC,
  ADD COLUMN case_6pu NUMERIC,
  ADD COLUMN case_6ou NUMERIC,
  ADD COLUMN case_6qu NUMERIC;
