-- Add LMNP-specific columns to assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS zone_bien text DEFAULT NULL;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS pourcentage_terrain_force numeric DEFAULT NULL;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS type_location_lmnp text DEFAULT NULL;