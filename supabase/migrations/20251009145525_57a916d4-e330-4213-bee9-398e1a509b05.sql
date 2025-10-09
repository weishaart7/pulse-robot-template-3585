-- Add new columns for rental properties management
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS meubles numeric,
ADD COLUMN IF NOT EXISTS financement_actif boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS financement_duree_mois integer,
ADD COLUMN IF NOT EXISTS financement_apport numeric,
ADD COLUMN IF NOT EXISTS financement_taux_credit numeric,
ADD COLUMN IF NOT EXISTS financement_taux_assurance numeric,
ADD COLUMN IF NOT EXISTS type_location text,
ADD COLUMN IF NOT EXISTS regime_location text;

-- Add check constraints for type_location
ALTER TABLE public.assets
ADD CONSTRAINT type_location_check CHECK (type_location IN ('Location nue', 'Location meublée non professionnelle (LMNP)', 'Location meublée professionnelle (LMP)') OR type_location IS NULL);

-- Add check constraints for regime_location
ALTER TABLE public.assets
ADD CONSTRAINT regime_location_check CHECK (regime_location IN ('Régime micro', 'Régime réel', 'Régime micro BIC', 'Régime BIC réel') OR regime_location IS NULL);