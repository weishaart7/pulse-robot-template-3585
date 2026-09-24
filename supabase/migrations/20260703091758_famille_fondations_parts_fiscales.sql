-- Phase 1 : fondations données pour le futur calcul du nombre de parts fiscales.

-- 1. Séparer la charge civile (enfant_a_charge existant) de la charge fiscale.
ALTER TABLE public.family_links ADD COLUMN IF NOT EXISTS fiscalement_a_charge boolean DEFAULT false;

-- Backfill : comportement actuel inchangé par défaut (charge fiscale = charge civile existante).
UPDATE public.family_links SET fiscalement_a_charge = enfant_a_charge WHERE fiscalement_a_charge IS DISTINCT FROM enfant_a_charge;

-- 2. Champ "Ancien combattant" (demi-part fiscale supplémentaire, consommé en Phase 2).
ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS ancien_combattant boolean DEFAULT false;
ALTER TABLE public.marital_status ADD COLUMN IF NOT EXISTS ancien_combattant_conjoint boolean DEFAULT false;
