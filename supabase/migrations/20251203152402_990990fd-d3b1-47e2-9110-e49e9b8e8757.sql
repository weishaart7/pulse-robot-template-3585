-- Add periodicity and date columns to revenus table
ALTER TABLE public.revenus
ADD COLUMN IF NOT EXISTS periodicite text DEFAULT 'mensuel',
ADD COLUMN IF NOT EXISTS date_debut date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS date_fin date,
ADD COLUMN IF NOT EXISTS jour_fixe integer;

-- Add periodicity and date columns to charges table
ALTER TABLE public.charges
ADD COLUMN IF NOT EXISTS periodicite text DEFAULT 'mensuel',
ADD COLUMN IF NOT EXISTS date_debut date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS date_fin date,
ADD COLUMN IF NOT EXISTS jour_fixe integer;

-- Add comments for documentation
COMMENT ON COLUMN public.revenus.periodicite IS 'Périodicité du revenu: mensuel, trimestriel, semestriel, annuel, ponctuel';
COMMENT ON COLUMN public.revenus.date_debut IS 'Date de début du revenu';
COMMENT ON COLUMN public.revenus.date_fin IS 'Date de fin du revenu (optionnel)';
COMMENT ON COLUMN public.revenus.jour_fixe IS 'Jour fixe du mois (1-31) ou jour de l année (1-366)';

COMMENT ON COLUMN public.charges.periodicite IS 'Périodicité de la charge: mensuel, trimestriel, semestriel, annuel, ponctuel';
COMMENT ON COLUMN public.charges.date_debut IS 'Date de début de la charge';
COMMENT ON COLUMN public.charges.date_fin IS 'Date de fin de la charge (optionnel)';
COMMENT ON COLUMN public.charges.jour_fixe IS 'Jour fixe du mois (1-31) ou jour de l année (1-366)';