-- Assiette propre à la caisse libérale, au lieu du bénéfice : produits moyens
-- de l'office (CPRN section C) ou commissions brutes annuelles (CAVAMAC).
-- Remplace cprn_produits_moyens (20261022180000), vide à la migration.
ALTER TABLE public.retraite_data
  ADD COLUMN assiette_caisse_liberale NUMERIC CHECK (assiette_caisse_liberale IS NULL OR assiette_caisse_liberale >= 0);
ALTER TABLE public.retraite_data DROP COLUMN cprn_produits_moyens;
