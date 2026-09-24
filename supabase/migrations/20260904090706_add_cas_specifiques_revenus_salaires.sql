-- Cas spécifiques (Fiscalité, Phase 2.4, cadre 1 de la 2042 : traitements et salaires).
-- Indemnités pour préjudice moral, salariés impatriés, sommes exonérées du CET — codes vérifiés
-- visuellement sur la brochure officielle DGFiP (2042-C, revenus 2023, voir docs/fiscalite.md).
-- Ajoutées à revenus_salaires (et non à gains_actionnariat_salarie) par symétrie avec 1GG/1HG
-- (agents généraux d'assurance, Phase 2.1) : même cadre 1 "Salaires" du CERFA, sans rapport avec
-- les stock-options/actions gratuites.

ALTER TABLE public.revenus_salaires
  ADD COLUMN case_1pm NUMERIC,
  ADD COLUMN case_1qm NUMERIC,
  ADD COLUMN case_1dy NUMERIC,
  ADD COLUMN case_1ey NUMERIC,
  ADD COLUMN case_1sm NUMERIC,
  ADD COLUMN case_1dn NUMERIC;
