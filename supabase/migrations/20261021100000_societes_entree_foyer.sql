-- Entrée du foyer dans la société : origine des parts, montant (apports ou prix, prix de revient)
-- et remploi de fonds propres. Recopiés sur l'actif « parts » lié (lib/societes/partsFoyer.ts).
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS origine_entree text;
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS montant_entree numeric;
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS remploi_entree boolean NOT NULL DEFAULT false;
-- Qualification des parts calculée (true) ou fixée à la main (false), comme assets.qualification_auto.
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS qualification_auto boolean NOT NULL DEFAULT true;
