-- Ventilation interne de 8TK (pas de case officielle) : revenus du patrimoine dont les PS sont neutralisés
ALTER TABLE public.prelevement_source_divers
  ADD COLUMN case_8tk186 NUMERIC,
  ADD COLUMN case_8tk172 NUMERIC;

COMMENT ON COLUMN public.prelevement_source_divers.case_8tk186 IS 'dont 8TK : revenus du patrimoine soumis aux PS à 18,6 % (ventilation interne)';
COMMENT ON COLUMN public.prelevement_source_divers.case_8tk172 IS 'dont 8TK : revenus du patrimoine soumis aux PS à 17,2 %, hors foncier (ventilation interne)';
