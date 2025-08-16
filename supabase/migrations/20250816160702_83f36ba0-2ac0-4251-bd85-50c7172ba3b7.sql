-- Ajouter les nouveaux champs pour la situation matrimoniale refonte
ALTER TABLE public.marital_status 
ADD COLUMN civilite_conjoint text,
ADD COLUMN lieu_naissance_conjoint text,
ADD COLUMN profession_csp_conjoint text,
ADD COLUMN personne_handicapee_conjoint boolean DEFAULT false,
ADD COLUMN convention_pacs text,
ADD COLUMN regime_matrimonial text;