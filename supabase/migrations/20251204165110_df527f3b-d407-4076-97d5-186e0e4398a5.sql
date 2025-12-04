-- Phase 1: Add ownership percentages to societes table
ALTER TABLE public.societes 
ADD COLUMN IF NOT EXISTS pourcentage_utilisateur numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS pourcentage_conjoint numeric DEFAULT 0;

-- Phase 1: Add societe_id to assets for bidirectional link
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES public.societes(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_societe_id ON public.assets(societe_id);