-- Champs "notaire rédacteur" retirés de l'écran, non réutilisés dans l'immédiat.
-- Vérifié au préalable : aucune donnée réelle stockée (une seule ligne test, chaînes vides).
ALTER TABLE public.marital_status
  DROP COLUMN IF EXISTS nom_notaire,
  DROP COLUMN IF EXISTS adresse_notaire;
