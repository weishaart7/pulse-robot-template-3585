-- Droit d'usage et d'habitation (DUH, C. civ. art. 764-766, référentiel §5.9)
-- : option successorale du conjoint survivant, optionnelle (1 an pour se
-- manifester, jamais tacite) — d'où ce booléen explicite plutôt qu'un calcul
-- automatique par défaut (cf. lib/transmission/index.ts, bloc "5.9bis").
ALTER TABLE public.marital_status
  ADD COLUMN duh_opte boolean NOT NULL DEFAULT false;
