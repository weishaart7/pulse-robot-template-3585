-- Rentes viagères à titre onéreux (même cadre 1 "Pensions, retraites, rentes" du CERFA, page 119) :
-- montant perçu par le foyer, ventilé par tranche d'âge d'entrée en jouissance de la rente
-- (pas par déclarant). Codes vérifiés sur la brochure DGFiP (2042-K, revenus 2025, page 119).

ALTER TABLE public.pensions_retraites_rentes
  ADD COLUMN case_1aw NUMERIC,
  ADD COLUMN case_1bw NUMERIC,
  ADD COLUMN case_1cw NUMERIC,
  ADD COLUMN case_1dw NUMERIC,
  ADD COLUMN case_1ar NUMERIC,
  ADD COLUMN case_1br NUMERIC,
  ADD COLUMN case_1cr NUMERIC,
  ADD COLUMN case_1dr NUMERIC;
