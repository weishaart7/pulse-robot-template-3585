-- Hypothèse d'évolution réelle (hors inflation) des revenus futurs : 0 (stable),
-- 1,5 % ou 3 % par an à partir de l'année suivant l'année en cours.
ALTER TABLE public.retraite_data
  ADD COLUMN evolution_revenus NUMERIC NOT NULL DEFAULT 0 CHECK (evolution_revenus IN (0, 0.015, 0.03));
