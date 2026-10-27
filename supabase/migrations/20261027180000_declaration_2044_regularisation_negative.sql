-- Ligne 230 de la 2044 : une régularisation négative (charges réelles supérieures aux provisions
-- déduites l'an dernier) est un supplément de charges (brochure IR 2026 p. 351).
ALTER TABLE public.declaration_2044_immeubles
  DROP CONSTRAINT IF EXISTS declaration_2044_immeubles_regularisation_provisions_check;
