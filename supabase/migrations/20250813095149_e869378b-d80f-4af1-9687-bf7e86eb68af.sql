-- Add percentage columns to assets table
ALTER TABLE public.assets 
ADD COLUMN pourcentage_utilisateur numeric,
ADD COLUMN pourcentage_conjoint numeric;