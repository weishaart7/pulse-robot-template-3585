-- Add detenteur columns to passifs table
ALTER TABLE public.passifs 
ADD COLUMN detenteur text,
ADD COLUMN pourcentage_utilisateur numeric,
ADD COLUMN pourcentage_conjoint numeric;

-- Add detenteur columns to emprunts table
ALTER TABLE public.emprunts 
ADD COLUMN detenteur text,
ADD COLUMN pourcentage_utilisateur numeric,
ADD COLUMN pourcentage_conjoint numeric;