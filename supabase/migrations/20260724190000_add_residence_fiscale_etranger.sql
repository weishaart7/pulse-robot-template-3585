-- Champ déclaratif requis pour l'alerte de conseil #13 (référentiel §12.8) :
-- élément d'extranéité détecté (résidence fiscale à l'étranger). Un simple
-- booléen suffit (le message d'alerte ne varie pas selon le pays) — pas
-- besoin de stocker le pays lui-même. Même pattern que est_dirigeant : le
-- champ sur family_profiles (client) et son miroir sur marital_status
-- (conjoint, qui n'a pas de ligne family_links).
ALTER TABLE public.family_profiles ADD COLUMN residence_fiscale_etranger boolean DEFAULT false;
ALTER TABLE public.marital_status ADD COLUMN residence_fiscale_etranger_conjoint boolean DEFAULT false;
