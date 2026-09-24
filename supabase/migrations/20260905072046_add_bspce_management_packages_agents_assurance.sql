-- Fiscalité : ajout de 3 cases 2042 découvertes lors d'une vérification visuelle du formulaire
-- officiel (revenus 2025), absentes du périmètre initial.
--
-- revenus_salaires : 1AQ/1BQ (agents généraux d'assurance, salaires EXONÉRÉS) — symétrique de
-- 1GG/1HG (salaires imposables, déjà en place, Phase 2.1), même bloc CERFA « Agents généraux
-- d'assurance ».
ALTER TABLE public.revenus_salaires
  ADD COLUMN case_1aq NUMERIC,
  ADD COLUMN case_1bq NUMERIC;

-- gains_actionnariat_salarie : 1AY/1BY (BSPCE, gain d'exercice taxable en salaires sur option,
-- à compter du 1.1.2025) et 1MP/1MQ (gains de cession sur titres souscrits par salariés/dirigeants,
-- « management packages », part taxable en salaires, à compter du 15.2.2025) — mêmes montants
-- déjà nets/taxables saisis par le déclarant, même famille que 1TT/1UT.
ALTER TABLE public.gains_actionnariat_salarie
  ADD COLUMN case_1ay NUMERIC,
  ADD COLUMN case_1by NUMERIC,
  ADD COLUMN case_1mp NUMERIC,
  ADD COLUMN case_1mq NUMERIC;
