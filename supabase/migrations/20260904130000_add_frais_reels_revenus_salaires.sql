-- Frais réels (Fiscalité, Phase 2.2, cadre 1 de la 2042 : traitements et salaires).
-- Code officiel 1AK/1BK, vérifié contre la brochure DGFiP (2042-K, revenus 2024) — voir docs/fiscalite.md.
-- Colonnes C/D (personnes à charge) hors périmètre, comme le reste de revenus_salaires.

ALTER TABLE public.revenus_salaires
  ADD COLUMN case_1ak NUMERIC,
  ADD COLUMN case_1bk NUMERIC;
