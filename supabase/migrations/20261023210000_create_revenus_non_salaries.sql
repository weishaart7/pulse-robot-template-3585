-- Revenus des professions non salariées (2042-C-PRO, revenus 2025) — phase 5.1, régimes micro.
-- Codes vérifiés sur la brochure DGFiP IR 2026 (« La 2042 C PRO et ses références », p. 163-182).
-- Colonne « personne à charge » hors périmètre, comme au cadre 1. Hors périmètre (phase 5.2) :
-- régimes réels BIC/BNC, bénéfices agricoles, plus-values professionnelles, revenus exonérés zonés.
CREATE TABLE public.revenus_non_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  case_5ta NUMERIC, -- déclarant 1 — micro-entrepreneur VFL : ventes, chiffre d'affaires brut
  case_5ua NUMERIC, -- déclarant 2
  case_5tb NUMERIC, -- déclarant 1 — micro-entrepreneur VFL : prestations de services et locations meublées
  case_5ub NUMERIC, -- déclarant 2
  case_5te NUMERIC, -- déclarant 1 — micro-entrepreneur VFL : revenus non commerciaux, recettes brutes
  case_5ue NUMERIC, -- déclarant 2
  case_5ko NUMERIC, -- déclarant 1 — micro-BIC professionnel : ventes de marchandises et assimilées
  case_5lo NUMERIC, -- déclarant 2
  case_5kp NUMERIC, -- déclarant 1 — micro-BIC professionnel : prestations de services et locations meublées
  case_5lp NUMERIC, -- déclarant 2
  case_5no NUMERIC, -- déclarant 1 — micro-BIC non professionnel : ventes de marchandises et assimilées
  case_5oo NUMERIC, -- déclarant 2
  case_5np NUMERIC, -- déclarant 1 — micro-BIC non professionnel : prestations de services
  case_5op NUMERIC, -- déclarant 2
  case_5ng NUMERIC, -- déclarant 1 — LMNP micro-BIC : chambres d'hôtes et meublés de tourisme classés
  case_5og NUMERIC, -- déclarant 2
  case_5nh NUMERIC, -- déclarant 1 — LMNP micro-BIC : meublés de tourisme non classés
  case_5oh NUMERIC, -- déclarant 2
  case_5ni NUMERIC, -- déclarant 1 — LMNP micro-BIC : autres locations meublées
  case_5oi NUMERIC, -- déclarant 2
  case_5nj NUMERIC, -- déclarant 1 — LMNP soumises aux cotisations sociales : chambres d'hôtes et meublés de tourisme classés
  case_5oj NUMERIC, -- déclarant 2
  case_5nk NUMERIC, -- déclarant 1 — LMNP soumises aux cotisations sociales : meublés de tourisme non classés
  case_5ok NUMERIC, -- déclarant 2
  case_5nl NUMERIC, -- déclarant 1 — LMNP soumises aux cotisations sociales : autres locations meublées
  case_5ol NUMERIC, -- déclarant 2
  case_5hq NUMERIC, -- déclarant 1 — micro-BNC professionnel : recettes brutes
  case_5iq NUMERIC, -- déclarant 2
  case_5ku NUMERIC, -- déclarant 1 — micro-BNC non professionnel : recettes brutes
  case_5lu NUMERIC, -- déclarant 2
  case_5hy NUMERIC, -- déclarant 1 — BA, BIC, BNC à imposer aux prélèvements sociaux : revenus nets
  case_5iy NUMERIC, -- déclarant 2

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.revenus_non_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenus non salaries" ON public.revenus_non_salaries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenus non salaries" ON public.revenus_non_salaries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenus non salaries" ON public.revenus_non_salaries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenus non salaries" ON public.revenus_non_salaries
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_revenus_non_salaries_updated_at
  BEFORE UPDATE ON public.revenus_non_salaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
