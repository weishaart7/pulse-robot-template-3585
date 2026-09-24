-- Ajouter les colonnes manquantes à la table family_profiles
ALTER TABLE public.family_profiles 
ADD COLUMN IF NOT EXISTS code_postal text,
ADD COLUMN IF NOT EXISTS ville text,
ADD COLUMN IF NOT EXISTS pays text,
ADD COLUMN IF NOT EXISTS capacite_juridique text DEFAULT 'normale';