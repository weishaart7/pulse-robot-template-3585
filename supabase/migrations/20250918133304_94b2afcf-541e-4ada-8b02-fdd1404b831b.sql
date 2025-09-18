-- Ajouter le champ etablissement à la table assets
ALTER TABLE public.assets 
ADD COLUMN etablissement TEXT;