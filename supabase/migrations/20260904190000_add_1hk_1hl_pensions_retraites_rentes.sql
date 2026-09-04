-- "En [année] vous ne percevez plus de pensions déclarées lignes 1AO, 1AM" (case à cocher),
-- équivalent pensions de 1GK/1GL (revenus_salaires). Codes vérifiés visuellement sur la brochure
-- DGFiP (2042-C, revenus 2025, page 1, cadre 1). Purement informatif, sans montant propre.

ALTER TABLE public.pensions_retraites_rentes
  ADD COLUMN case_1hk BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN case_1hl BOOLEAN NOT NULL DEFAULT false;
