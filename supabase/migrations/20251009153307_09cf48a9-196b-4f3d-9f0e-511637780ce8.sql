-- Update check constraint for regime_location to include new values
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_regime_location_check;

ALTER TABLE public.assets 
ADD CONSTRAINT assets_regime_location_check 
CHECK (regime_location IN ('Micro-foncier', 'Réel', 'Micro-BIC', 'BIC'));