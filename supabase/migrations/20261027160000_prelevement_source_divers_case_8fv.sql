-- La case « revenus exonérés non retenus pour le taux effectif » est 8FV (2042-C), et non 8VF.
ALTER TABLE public.prelevement_source_divers RENAME COLUMN case_8vf TO case_8fv;
COMMENT ON COLUMN public.prelevement_source_divers.case_8fv IS 'revenus exonérés non retenus pour le taux effectif';
