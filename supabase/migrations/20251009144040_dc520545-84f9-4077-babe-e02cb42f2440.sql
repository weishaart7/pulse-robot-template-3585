-- Add new columns for real estate property details
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS typologie_bien text,
ADD COLUMN IF NOT EXISTS surface_m2 numeric,
ADD COLUMN IF NOT EXISTS statut_bien text,
ADD COLUMN IF NOT EXISTS montant_immeuble numeric,
ADD COLUMN IF NOT EXISTS frais_agence numeric,
ADD COLUMN IF NOT EXISTS frais_notaire numeric,
ADD COLUMN IF NOT EXISTS frais_bancaires numeric,
ADD COLUMN IF NOT EXISTS frais_hypotheque numeric,
ADD COLUMN IF NOT EXISTS travaux_renovation numeric,
ADD COLUMN IF NOT EXISTS travaux_construction numeric;

-- Add check constraints for typologie_bien
ALTER TABLE public.assets
ADD CONSTRAINT check_typologie_bien 
CHECK (typologie_bien IS NULL OR typologie_bien IN ('Appartement', 'Maison'));

-- Add check constraints for statut_bien
ALTER TABLE public.assets
ADD CONSTRAINT check_statut_bien 
CHECK (statut_bien IS NULL OR statut_bien IN ('Usage personnel', 'En rénovation', 'En vente'));

COMMENT ON COLUMN public.assets.typologie_bien IS 'Type of real estate property: Appartement or Maison';
COMMENT ON COLUMN public.assets.surface_m2 IS 'Surface area in square meters';
COMMENT ON COLUMN public.assets.statut_bien IS 'Status of the property: Usage personnel, En rénovation, En vente';
COMMENT ON COLUMN public.assets.montant_immeuble IS 'Property amount excluding agency and notary fees';
COMMENT ON COLUMN public.assets.frais_agence IS 'Agency fees';
COMMENT ON COLUMN public.assets.frais_notaire IS 'Notary fees';
COMMENT ON COLUMN public.assets.frais_bancaires IS 'Bank or broker fees';
COMMENT ON COLUMN public.assets.frais_hypotheque IS 'Mortgage or guarantee fees';
COMMENT ON COLUMN public.assets.travaux_renovation IS 'Renovation work costs';
COMMENT ON COLUMN public.assets.travaux_construction IS 'Construction work costs';