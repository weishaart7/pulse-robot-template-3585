-- Add transfert_immobilier column to assets table
ALTER TABLE public.assets 
ADD COLUMN transfert_immobilier boolean DEFAULT false;

COMMENT ON COLUMN public.assets.transfert_immobilier IS 'Indique si l''actif immobilier doit apparaître dans la section Immobilier';