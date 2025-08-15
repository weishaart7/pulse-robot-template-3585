-- Add new columns to family_links table for enhanced functionality
ALTER TABLE public.family_links 
ADD COLUMN civilite text,
ADD COLUMN est_decede boolean DEFAULT false,
ADD COLUMN date_deces date,
ADD COLUMN enfant_adopte text DEFAULT 'Non',
ADD COLUMN enfant_renoncant boolean DEFAULT false,
ADD COLUMN enfant_renoncant_de text,
ADD COLUMN branche_familiale text,
ADD COLUMN parent_de text,
ADD COLUMN enfant_de text,
ADD COLUMN exoneration_succession boolean DEFAULT false;

-- Remove old columns that are no longer needed
ALTER TABLE public.family_links 
DROP COLUMN IF EXISTS niveau_scolaire,
DROP COLUMN IF EXISTS a_charge,
DROP COLUMN IF EXISTS enfant_mineur;