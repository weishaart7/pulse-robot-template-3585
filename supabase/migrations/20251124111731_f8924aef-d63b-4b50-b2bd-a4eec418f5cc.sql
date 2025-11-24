-- Add column for partner's birth country in marital_status table
ALTER TABLE public.marital_status 
ADD COLUMN pays_naissance_conjoint text;