-- Revenus des professions non salariées, phase 5.2 : régimes réels BIC/BNC, LMNP au réel,
-- bénéfices agricoles (micro et réel), plus-values professionnelles. Codes : brochure DGFiP IR 2026,
-- « La 2042 C PRO et ses références » et chapitre « Revenus non salariés » (p. 161-182).
ALTER TABLE public.revenus_non_salaries
  ADD COLUMN case_5xb NUMERIC, -- déclarant 1 — BA micro : recettes brutes (abattement 87 %)
  ADD COLUMN case_5yb NUMERIC, -- déclarant 2
  ADD COLUMN case_5xa NUMERIC, -- déclarant 1 — BA micro : revenus nets exonérés (régimes zonés)
  ADD COLUMN case_5ya NUMERIC, -- déclarant 2
  ADD COLUMN case_5hw NUMERIC, -- déclarant 1 — BA micro : plus-values nettes à court terme
  ADD COLUMN case_5iw NUMERIC, -- déclarant 2
  ADD COLUMN case_5xo NUMERIC, -- déclarant 1 — BA micro : moins-values nettes à court terme
  ADD COLUMN case_5yo NUMERIC, -- déclarant 2
  ADD COLUMN case_5hx NUMERIC, -- déclarant 1 — BA micro : plus-values nettes à long terme
  ADD COLUMN case_5ix NUMERIC, -- déclarant 2
  ADD COLUMN case_5xn NUMERIC, -- déclarant 1 — BA micro : moins-values nettes à long terme
  ADD COLUMN case_5yn NUMERIC, -- déclarant 2
  ADD COLUMN case_5hb NUMERIC, -- déclarant 1 — BA réel : revenus exonérés (régimes zonés)
  ADD COLUMN case_5ib NUMERIC, -- déclarant 2
  ADD COLUMN case_5hc NUMERIC, -- déclarant 1 — BA réel : revenus imposables
  ADD COLUMN case_5ic NUMERIC, -- déclarant 2
  ADD COLUMN case_5ak NUMERIC, -- déclarant 1 — BA réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français
  ADD COLUMN case_5bk NUMERIC, -- déclarant 2
  ADD COLUMN case_5ha NUMERIC, -- déclarant 1 — BA réel : produits de brevets taxables à 10 %
  ADD COLUMN case_5ia NUMERIC, -- déclarant 2
  ADD COLUMN case_5hf NUMERIC, -- déclarant 1 — BA réel : déficits
  ADD COLUMN case_5if NUMERIC, -- déclarant 2
  ADD COLUMN case_5he NUMERIC, -- déclarant 1 — BA réel : plus-values nettes à long terme
  ADD COLUMN case_5ie NUMERIC, -- déclarant 2
  ADD COLUMN case_5kn NUMERIC, -- déclarant 1 — BIC pro micro : revenus nets exonérés (régimes zonés)
  ADD COLUMN case_5ln NUMERIC, -- déclarant 2
  ADD COLUMN case_5kx NUMERIC, -- déclarant 1 — BIC pro micro : plus-values nettes à court terme
  ADD COLUMN case_5lx NUMERIC, -- déclarant 2
  ADD COLUMN case_5kj NUMERIC, -- déclarant 1 — BIC pro micro : moins-values nettes à court terme
  ADD COLUMN case_5lj NUMERIC, -- déclarant 2
  ADD COLUMN case_5kq NUMERIC, -- déclarant 1 — BIC pro micro : plus-values nettes à long terme
  ADD COLUMN case_5lq NUMERIC, -- déclarant 2
  ADD COLUMN case_5kr NUMERIC, -- déclarant 1 — BIC pro micro : moins-values nettes à long terme
  ADD COLUMN case_5lr NUMERIC, -- déclarant 2
  ADD COLUMN case_5kb NUMERIC, -- déclarant 1 — BIC pro réel : revenus exonérés (régimes zonés)
  ADD COLUMN case_5lb NUMERIC, -- déclarant 2
  ADD COLUMN case_5kc NUMERIC, -- déclarant 1 — BIC pro réel : revenus imposables
  ADD COLUMN case_5lc NUMERIC, -- déclarant 2
  ADD COLUMN case_5df NUMERIC, -- déclarant 1 — BIC pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français
  ADD COLUMN case_5ef NUMERIC, -- déclarant 2
  ADD COLUMN case_5ui NUMERIC, -- déclarant 1 — BIC pro réel : produits de brevets taxables à 10 %
  ADD COLUMN case_5vi NUMERIC, -- déclarant 2
  ADD COLUMN case_5kf NUMERIC, -- déclarant 1 — BIC pro réel : déficits
  ADD COLUMN case_5lf NUMERIC, -- déclarant 2
  ADD COLUMN case_5ke NUMERIC, -- déclarant 1 — BIC pro réel : plus-values nettes à long terme
  ADD COLUMN case_5le NUMERIC, -- déclarant 2
  ADD COLUMN case_5nn NUMERIC, -- déclarant 1 — BIC non pro micro : revenus nets exonérés (régimes zonés)
  ADD COLUMN case_5on NUMERIC, -- déclarant 2
  ADD COLUMN case_5nx NUMERIC, -- déclarant 1 — BIC non pro micro : plus-values nettes à court terme
  ADD COLUMN case_5ox NUMERIC, -- déclarant 2
  ADD COLUMN case_5iu NUMERIC, -- déclarant 1 — BIC non pro micro : moins-values nettes à court terme
  ADD COLUMN case_5rz NUMERIC, -- déclarant 2
  ADD COLUMN case_5nq NUMERIC, -- déclarant 1 — BIC non pro micro : plus-values nettes à long terme
  ADD COLUMN case_5oq NUMERIC, -- déclarant 2
  ADD COLUMN case_5nr NUMERIC, -- déclarant 1 — BIC non pro micro : moins-values nettes à long terme
  ADD COLUMN case_5or NUMERIC, -- déclarant 2
  ADD COLUMN case_5nb NUMERIC, -- déclarant 1 — BIC non pro réel : revenus exonérés (régimes zonés)
  ADD COLUMN case_5ob NUMERIC, -- déclarant 2
  ADD COLUMN case_5nc NUMERIC, -- déclarant 1 — BIC non pro réel : revenus imposables
  ADD COLUMN case_5oc NUMERIC, -- déclarant 2
  ADD COLUMN case_5ur NUMERIC, -- déclarant 1 — BIC non pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français
  ADD COLUMN case_5vr NUMERIC, -- déclarant 2
  ADD COLUMN case_5nf NUMERIC, -- déclarant 1 — BIC non pro réel : déficits
  ADD COLUMN case_5of NUMERIC, -- déclarant 2
  ADD COLUMN case_5ne NUMERIC, -- déclarant 1 — BIC non pro réel : plus-values nettes à long terme
  ADD COLUMN case_5oe NUMERIC, -- déclarant 2
  ADD COLUMN case_5na NUMERIC, -- déclarant 1 — LMNP réel : revenus imposables
  ADD COLUMN case_5oa NUMERIC, -- déclarant 2
  ADD COLUMN case_5ey NUMERIC, -- déclarant 1 — LMNP réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français
  ADD COLUMN case_5fy NUMERIC, -- déclarant 2
  ADD COLUMN case_5nm NUMERIC, -- déclarant 1 — LMNP réel : revenus soumis aux cotisations sociales
  ADD COLUMN case_5om NUMERIC, -- déclarant 2
  ADD COLUMN case_5ny NUMERIC, -- déclarant 1 — LMNP réel : déficits
  ADD COLUMN case_5oy NUMERIC, -- déclarant 2
  ADD COLUMN case_5we NUMERIC, -- déclarant 1 — LMNP réel : déficits relevant des organismes de sécurité sociale
  ADD COLUMN case_5xe NUMERIC, -- déclarant 2
  ADD COLUMN case_5hp NUMERIC, -- déclarant 1 — BNC pro micro : revenus nets exonérés (régimes zonés)
  ADD COLUMN case_5ip NUMERIC, -- déclarant 2
  ADD COLUMN case_5hv NUMERIC, -- déclarant 1 — BNC pro micro : plus-values nettes à court terme
  ADD COLUMN case_5iv NUMERIC, -- déclarant 2
  ADD COLUMN case_5kz NUMERIC, -- déclarant 1 — BNC pro micro : moins-values nettes à court terme
  ADD COLUMN case_5lz NUMERIC, -- déclarant 2
  ADD COLUMN case_5hr NUMERIC, -- déclarant 1 — BNC pro micro : plus-values nettes à long terme
  ADD COLUMN case_5ir NUMERIC, -- déclarant 2
  ADD COLUMN case_5hs NUMERIC, -- déclarant 1 — BNC pro micro : moins-values nettes à long terme
  ADD COLUMN case_5is NUMERIC, -- déclarant 2
  ADD COLUMN case_5qb NUMERIC, -- déclarant 1 — BNC pro réel : revenus exonérés (régimes zonés)
  ADD COLUMN case_5rb NUMERIC, -- déclarant 2
  ADD COLUMN case_5qc NUMERIC, -- déclarant 1 — BNC pro réel : revenus imposables
  ADD COLUMN case_5rc NUMERIC, -- déclarant 2
  ADD COLUMN case_5xj NUMERIC, -- déclarant 1 — BNC pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français
  ADD COLUMN case_5yj NUMERIC, -- déclarant 2
  ADD COLUMN case_5qa NUMERIC, -- déclarant 1 — BNC pro réel : produits de brevets taxables à 10 %
  ADD COLUMN case_5ra NUMERIC, -- déclarant 2
  ADD COLUMN case_5qe NUMERIC, -- déclarant 1 — BNC pro réel : déficits
  ADD COLUMN case_5re NUMERIC, -- déclarant 2
  ADD COLUMN case_5qd NUMERIC, -- déclarant 1 — BNC pro réel : plus-values nettes à long terme
  ADD COLUMN case_5rd NUMERIC, -- déclarant 2
  ADD COLUMN case_5th NUMERIC, -- déclarant 1 — BNC non pro micro : revenus nets exonérés (régimes zonés)
  ADD COLUMN case_5uh NUMERIC, -- déclarant 2
  ADD COLUMN case_5ky NUMERIC, -- déclarant 1 — BNC non pro micro : plus-values nettes à court terme
  ADD COLUMN case_5ly NUMERIC, -- déclarant 2
  ADD COLUMN case_5ju NUMERIC, -- déclarant 1 — BNC non pro micro : moins-values nettes à court terme
  ADD COLUMN case_5ld NUMERIC, -- déclarant 2
  ADD COLUMN case_5kv NUMERIC, -- déclarant 1 — BNC non pro micro : plus-values nettes à long terme
  ADD COLUMN case_5lv NUMERIC, -- déclarant 2
  ADD COLUMN case_5kw NUMERIC, -- déclarant 1 — BNC non pro micro : moins-values nettes à long terme
  ADD COLUMN case_5lw NUMERIC, -- déclarant 2
  ADD COLUMN case_5hk NUMERIC, -- déclarant 1 — BNC non pro réel : revenus exonérés (régimes zonés)
  ADD COLUMN case_5jk NUMERIC, -- déclarant 2
  ADD COLUMN case_5jg NUMERIC, -- déclarant 1 — BNC non pro réel : revenus imposables
  ADD COLUMN case_5rf NUMERIC, -- déclarant 2
  ADD COLUMN case_5xs NUMERIC, -- déclarant 1 — BNC non pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français
  ADD COLUMN case_5ys NUMERIC, -- déclarant 2
  ADD COLUMN case_5jj NUMERIC, -- déclarant 1 — BNC non pro réel : déficits
  ADD COLUMN case_5rg NUMERIC, -- déclarant 2
  ADD COLUMN case_5so NUMERIC, -- déclarant 1 — BNC non pro réel : plus-values nettes à long terme
  ADD COLUMN case_5nt NUMERIC, -- déclarant 2
  ADD COLUMN case_5qf NUMERIC, -- foyer — BA : déficits antérieurs non encore déduits, 2019
  ADD COLUMN case_5qg NUMERIC, -- foyer — BA : déficits antérieurs, 2020
  ADD COLUMN case_5qn NUMERIC, -- foyer — BA : déficits antérieurs, 2021
  ADD COLUMN case_5qo NUMERIC, -- foyer — BA : déficits antérieurs, 2022
  ADD COLUMN case_5qp NUMERIC, -- foyer — BA : déficits antérieurs, 2023
  ADD COLUMN case_5qq NUMERIC, -- foyer — BA : déficits antérieurs, 2024
  ADD COLUMN case_5rn NUMERIC, -- foyer — BIC non pro : déficits antérieurs non encore déduits, 2019
  ADD COLUMN case_5ro NUMERIC, -- foyer — BIC non pro : déficits antérieurs, 2020
  ADD COLUMN case_5rp NUMERIC, -- foyer — BIC non pro : déficits antérieurs, 2021
  ADD COLUMN case_5rq NUMERIC, -- foyer — BIC non pro : déficits antérieurs, 2022
  ADD COLUMN case_5rr NUMERIC, -- foyer — BIC non pro : déficits antérieurs, 2023
  ADD COLUMN case_5rw NUMERIC, -- foyer — BIC non pro : déficits antérieurs, 2024
  ADD COLUMN case_5ga NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2015
  ADD COLUMN case_5gb NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2016
  ADD COLUMN case_5gc NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2017
  ADD COLUMN case_5gd NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2018
  ADD COLUMN case_5ge NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2019
  ADD COLUMN case_5gf NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2020
  ADD COLUMN case_5gg NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2021
  ADD COLUMN case_5gh NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2022
  ADD COLUMN case_5gi NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2023
  ADD COLUMN case_5gj NUMERIC, -- foyer — LMNP : déficits antérieurs non encore déduits, 2024
  ADD COLUMN case_5ht NUMERIC, -- foyer — BNC non pro : déficits antérieurs non encore déduits, 2019
  ADD COLUMN case_5it NUMERIC, -- foyer — BNC non pro : déficits antérieurs, 2020
  ADD COLUMN case_5jt NUMERIC, -- foyer — BNC non pro : déficits antérieurs, 2021
  ADD COLUMN case_5kt NUMERIC, -- foyer — BNC non pro : déficits antérieurs, 2022
  ADD COLUMN case_5lt NUMERIC, -- foyer — BNC non pro : déficits antérieurs, 2023
  ADD COLUMN case_5mt NUMERIC; -- foyer — BNC non pro : déficits antérieurs, 2024
