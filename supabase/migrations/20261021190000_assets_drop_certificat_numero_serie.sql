-- Champs retirés du formulaire d'actif (certificat d'authenticité / expertise, numéro de série
-- des montres). Vérifié avant suppression : aucune ligne renseignée en base.
ALTER TABLE public.assets DROP COLUMN IF EXISTS certificat_expertise;
ALTER TABLE public.assets DROP COLUMN IF EXISTS certificat_expertise_reference;
ALTER TABLE public.assets DROP COLUMN IF EXISTS numero_serie;
