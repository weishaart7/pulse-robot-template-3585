-- Revenus des professions non salariées, lot 2 : brevets BIC non professionnels, abattements jeunes
-- créateurs / artistes (RFR), indemnités de cessation des agents généraux d'assurances.
-- Codes : brochure DGFiP IR 2026, p. 176-181.
ALTER TABLE public.revenus_non_salaries
  ADD COLUMN case_5tf NUMERIC, -- déclarant 1 — BIC non pro réel : brevets taxables à 10 %
  ADD COLUMN case_5uf NUMERIC, -- déclarant 2
  ADD COLUMN case_5ql NUMERIC, -- déclarant 1 — BNC pro : jeunes créateurs, abattement de 50 % (RFR)
  ADD COLUMN case_5rl NUMERIC, -- déclarant 2
  ADD COLUMN case_5sv NUMERIC, -- déclarant 1 — BNC non pro : jeunes créateurs, abattement de 50 % (RFR)
  ADD COLUMN case_5sw NUMERIC, -- déclarant 2
  ADD COLUMN case_5qm NUMERIC, -- déclarant 1 — agents généraux d'assurances : indemnité de cessation (taxe art. 719)
  ADD COLUMN case_5rm NUMERIC; -- déclarant 2
