-- Revenus d'activité et de remplacement de source étrangère soumis aux contributions sociales
-- (cadre 8 de la 2042-C, revenus 2025) — phase 8.2.
ALTER TABLE public.prelevement_source_divers
  ADD COLUMN case_8tq NUMERIC,
  ADD COLUMN case_8tr NUMERIC,
  ADD COLUMN case_8sc NUMERIC,
  ADD COLUMN case_8sw NUMERIC,
  ADD COLUMN case_8sx NUMERIC,
  ADD COLUMN case_8tw NUMERIC,
  ADD COLUMN case_8tv NUMERIC,
  ADD COLUMN case_8qv NUMERIC,
  ADD COLUMN case_8th NUMERIC,
  ADD COLUMN case_8qh NUMERIC,
  ADD COLUMN case_8tx NUMERIC,
  ADD COLUMN case_8qx NUMERIC,
  ADD COLUMN case_8sa NUMERIC,
  ADD COLUMN case_8sd NUMERIC,
  ADD COLUMN case_8sb NUMERIC;

COMMENT ON COLUMN public.prelevement_source_divers.case_8tq IS 'revenus non salariaux de source étrangère, CSG 9,2 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8tr IS 'salaires de source étrangère, CSG 9,2 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8sc IS 'allocations de préretraite, CSG 9,2 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8sw IS 'allocations de chômage, CSG 6,2 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8sx IS 'allocations de chômage, CSG 3,8 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8tw IS 'indemnités journalières de maladie, maternité, accident du travail, CSG 6,2 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8tv IS 'pensions de retraite et d''invalidité, CSG 8,3 %, déclarant 1';
COMMENT ON COLUMN public.prelevement_source_divers.case_8qv IS 'pensions de retraite et d''invalidité, CSG 8,3 %, déclarant 2';
COMMENT ON COLUMN public.prelevement_source_divers.case_8th IS 'pensions de retraite et d''invalidité, CSG 6,6 %, déclarant 1';
COMMENT ON COLUMN public.prelevement_source_divers.case_8qh IS 'pensions de retraite et d''invalidité, CSG 6,6 %, déclarant 2';
COMMENT ON COLUMN public.prelevement_source_divers.case_8tx IS 'pensions de retraite et d''invalidité, CSG 3,8 %, déclarant 1';
COMMENT ON COLUMN public.prelevement_source_divers.case_8qx IS 'pensions de retraite et d''invalidité, CSG 3,8 %, déclarant 2';
COMMENT ON COLUMN public.prelevement_source_divers.case_8sa IS 'pensions en capital soumises à imposition forfaitaire, CSG 8,3 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8sd IS 'pensions en capital soumises à imposition forfaitaire, CSG 6,6 %';
COMMENT ON COLUMN public.prelevement_source_divers.case_8sb IS 'pensions en capital soumises à imposition forfaitaire, CSG 3,8 %';
