-- Cadre 4 saisi sans 2044 (revenus 2025) : 4BA direct (parts de sociétés immobilières
-- seulement, brochure IR 2026 p. 157) et déficits antérieurs imputés sur le micro-foncier
-- (CGI art. 32, brochure p. 158). Ignorés dès qu'une 2044 est ouverte pour l'année.
ALTER TABLE public.revenus_fonciers_2042
  ADD COLUMN case_4ba NUMERIC CHECK (case_4ba >= 0), -- réel sans 2044 : revenus de parts de sociétés immobilières
  ADD COLUMN case_4bd NUMERIC CHECK (case_4bd >= 0); -- déficits fonciers antérieurs non encore imputés (saisie manuelle)
