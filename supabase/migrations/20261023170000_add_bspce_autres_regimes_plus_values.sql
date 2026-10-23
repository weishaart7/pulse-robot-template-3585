-- Plus-values et gains divers, phase 3.2 : BSPCE et autres régimes du cadre 3 de la 2042-C.
ALTER TABLE public.plus_values_gains_divers
  ADD COLUMN case_3sj NUMERIC, -- BSPCE attribués avant le 1.1.2018, activité ≥ 3 ans
  ADD COLUMN case_3tj NUMERIC, -- BSPCE du 1.1.2018 au 31.12.2024, activité ≥ 3 ans : gain avant abattement
  ADD COLUMN case_3tk NUMERIC, -- abattement fixe départ à la retraite d'un dirigeant de PME (sur 3TJ)
  ADD COLUMN case_3sk NUMERIC, -- BSPCE jusqu'au 31.12.2024, activité < 3 ans : gains taxables à 30 %
  ADD COLUMN case_3tl NUMERIC, -- BSPCE à compter du 1.1.2025 : gain de cession avant abattement
  ADD COLUMN case_3tm NUMERIC, -- abattement fixe départ à la retraite d'un dirigeant de PME (sur 3TL)
  ADD COLUMN case_3pc NUMERIC, -- gain d'exercice BSPCE à compter du 1.1.2025, activité ≥ 3 ans (12,8 %)
  ADD COLUMN case_3pe NUMERIC, -- gain d'exercice BSPCE à compter du 1.1.2025, activité < 3 ans (30 %)
  ADD COLUMN case_3vq NUMERIC, -- impatriés : plus-values exonérées (50 %)
  ADD COLUMN case_3vr NUMERIC, -- impatriés : moins-values non imputables (50 %)
  ADD COLUMN case_3vc NUMERIC, -- produits et plus-values exonérés de structures de capital-risque
  ADD COLUMN case_3ex NUMERIC; -- gain net exonéré sur retrait du plan d'épargne avenir climat (PEAC)
