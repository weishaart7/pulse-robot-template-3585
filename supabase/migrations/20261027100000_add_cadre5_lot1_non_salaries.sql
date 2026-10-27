-- Revenus des professions non salariées, lot 1 : PS sur plus-values exonérées départ à la retraite,
-- inventeurs non professionnels à 10 %, excédent de moyenne triennale BA au taux marginal, forfait
-- forestier. Codes : brochure DGFiP IR 2026, p. 164-182.
ALTER TABLE public.revenus_non_salaries
  ADD COLUMN case_5hg NUMERIC, -- déclarant 1 — plus-values à long terme exonérées départ à la retraite (PS seuls)
  ADD COLUMN case_5ig NUMERIC, -- déclarant 2
  ADD COLUMN case_5qj NUMERIC, -- déclarant 1 — BNC non pro : inventeurs, produits taxables à 10 % (PS)
  ADD COLUMN case_5rj NUMERIC, -- déclarant 2
  ADD COLUMN case_5tc NUMERIC, -- déclarant 1 — BNC non pro : inventeurs, 10 % soumis aux cotisations sociales
  ADD COLUMN case_5uc NUMERIC, -- déclarant 2
  ADD COLUMN case_5xt NUMERIC, -- déclarant 1 — BA réel : revenu imposable au taux marginal
  ADD COLUMN case_5xu NUMERIC, -- déclarant 2
  ADD COLUMN case_5hd NUMERIC, -- déclarant 1 — BA : revenu forfaitaire des coupes de bois
  ADD COLUMN case_5id NUMERIC; -- déclarant 2
