-- Add nom_jeune_fille column to family_profiles
ALTER TABLE public.family_profiles 
ADD COLUMN nom_jeune_fille text;

-- Add nom_jeune_fille_conjoint column to marital_status
ALTER TABLE public.marital_status 
ADD COLUMN nom_jeune_fille_conjoint text;